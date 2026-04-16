from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
from dateutil.relativedelta import relativedelta  # For date calculations
import os
import re

app = Flask(__name__)

# Configure secret key for session
app.secret_key = os.urandom(24)

# Configure MySQL connection
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'  # Replace with your MySQL username
app.config['MYSQL_PASSWORD'] = 'mysql'  # Replace with your MySQL password
app.config['MYSQL_DB'] = 'finance_tracker'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

# Initialize MySQL
mysql = MySQL(app)

# Login decorator to check if user is logged in
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes for HTML pages
@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET'])
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/signup', methods=['GET'])
def signup():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('name', None)
    session.pop('email', None)
    flash('You have been logged out', 'success')
    return redirect(url_for('login'))

# API Routes
@app.route('/api/register', methods=['POST'])
def register_api():
    try:
        # Get user details from request
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        # Validate input data
        if not name or not email or not password:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Validate email format
        if not re.match(r'[^@]+@[^@]+\.[^@]+', email):
            return jsonify({'success': False, 'message': 'Invalid email format'}), 400
        
        # Check if email already exists
        cursor = mysql.connection.cursor()
        cursor.execute('SELECT * FROM user WHERE Email = %s', (email,))
        user = cursor.fetchone()
        
        if user:
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        
        # Hash the password
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        
        # Insert new user
        cursor.execute('INSERT INTO user (Name, Email, Password) VALUES (%s, %s, %s)', 
                      (name, email, hashed_password))
        mysql.connection.commit()
        
        # Get the new user's ID
        user_id = cursor.lastrowid
        
        # Add default categories
        default_categories = [
            ('Housing', 'Expense'), ('Food', 'Expense'), ('Transportation', 'Expense'),
            ('Entertainment', 'Expense'), ('Utilities', 'Expense'), ('Salary', 'Income'),
            ('Investment', 'Income'), ('Gift', 'Income')
        ]
        
        for cat_name, cat_type in default_categories:
            cursor.execute('INSERT INTO category (Category_Name, Type, User_Id) VALUES (%s, %s, %s)',
                          (cat_name, cat_type, user_id))
        
        # Add default vendor
        cursor.execute('INSERT INTO vendor (Vendor_Name, Contact_Info) VALUES (%s, %s)',
                      ('General', 'Default vendor for all transactions'))
        
        # Add default account
        cursor.execute('INSERT INTO account (Account_Name, Account_Type, Balance, User_Id) VALUES (%s, %s, %s, %s)',
                      ('Cash', 'Cash', 0, user_id))
        
        mysql.connection.commit()
        
        return jsonify({'success': True, 'message': 'User registered successfully'}), 201
    
    except Exception as e:
        print(f"Registration error: {str(e)}")  # For debugging
        return jsonify({'success': False, 'message': 'Failed to register user'}), 500
    
    finally:
        if 'cursor' in locals():
            cursor.close()

@app.route('/api/login', methods=['POST'])
def login_api():
    try:
        # Get login details from request
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        # Validate input data
        if not email or not password:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Check if user exists and password is correct
        cursor = mysql.connection.cursor()
        cursor.execute('SELECT * FROM user WHERE Email = %s', (email,))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['Password'], password):
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        # Create session
        session['user_id'] = user['User_Id']
        session['name'] = user['Name']
        session['email'] = user['Email']
        
        return jsonify({'success': True, 'message': 'Login successful'}), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")  # For debugging
        return jsonify({'success': False, 'message': 'Failed to login'}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()

@app.route('/api/user')
@login_required
def user_api():
    return jsonify({
        'id': session['user_id'],
        'name': session['name'],
        'email': session['email']
    })

@app.route('/api/logout')
@login_required
def logout_api():
    session.clear()
    return jsonify({'success': True, 'message': 'Logout successful'}), 200

@app.route('/api/dashboard')
@login_required
def dashboard_api():
    user_id = session['user_id']
    cursor = mysql.connection.cursor()
    
    try:
        # Get account balances
        cursor.execute('''
            SELECT Account_Name, Balance
            FROM account
            WHERE User_Id = %s
        ''', (user_id,))
        accounts = cursor.fetchall()
        
        # Get monthly summary
        cursor.execute('''
            SELECT 
                SUM(CASE WHEN Transaction_Type = 'Income' THEN Amount ELSE 0 END) as income,
                SUM(CASE WHEN Transaction_Type = 'Expense' THEN Amount ELSE 0 END) as expense
            FROM transaction
            WHERE User_Id = %s AND Date >= %s AND Date < %s
        ''', (user_id, datetime.now().replace(day=1), datetime.now().replace(day=1) + relativedelta(months=1)))
        monthly_summary = cursor.fetchone()
        
        # Get recent transactions
        cursor.execute('''
            SELECT t.Transaction_Id, t.Date, t.Description, t.Amount, t.Transaction_Type,
                   a.Account_Name, c.Category_Name, v.Vendor_Name
            FROM transaction t
            JOIN account a ON t.Account_Id = a.Account_Id
            JOIN category c ON t.Category_Id = c.Category_Id
            LEFT JOIN vendor v ON t.Vendor_Id = v.Vendor_Id
            WHERE t.User_Id = %s
            ORDER BY t.Date DESC
            LIMIT 5
        ''', (user_id,))
        recent_transactions = cursor.fetchall()
        
        # Format dates for JSON serialization
        for transaction in recent_transactions:
            transaction['Date'] = transaction['Date'].strftime('%Y-%m-%d')
        
        return jsonify({
            'accounts': accounts,
            'monthly_summary': {
                'income': float(monthly_summary['income'] or 0),
                'expense': float(monthly_summary['expense'] or 0),
                'net': float((monthly_summary['income'] or 0) - (monthly_summary['expense'] or 0))
            },
            'recent_transactions': recent_transactions,
            'months_data': [],  # Add this line to avoid undefined error
            'categories': []  # Add this line to avoid undefined error
        })
    
    except Exception as e:
        print(f"Dashboard error: {str(e)}")  # For debugging
        return jsonify({'success': False, 'message': 'Failed to load dashboard data.'}), 500
    
    finally:
        cursor.close()

@app.route('/api/accounts')
@login_required
def accounts_api():
    user_id = session['user_id']
    cursor = mysql.connection.cursor()
    
    try:
        cursor.execute('''
            SELECT *
            FROM account
            WHERE User_Id = %s
        ''', (user_id,))
        
        accounts = cursor.fetchall()
        return jsonify({'accounts': accounts})
    
    except Exception as e:
        print(f"Accounts error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to load accounts.'}), 500
    
    finally:
        cursor.close()

@app.route('/api/categories')
@login_required
def categories_api():
    cursor = None
    try:
        cursor = mysql.connection.cursor()
        
        # First check if user has any categories
        cursor.execute('''
            SELECT COUNT(*) as count 
            FROM category 
            WHERE User_Id = %s
        ''', (session['user_id'],))
        
        count = cursor.fetchone()['count']
        
        if (count == 0):
            # Create default categories if user has none
            default_categories = [
                ('Housing', 'Expense'), ('Food', 'Expense'), 
                ('Transportation', 'Expense'), ('Entertainment', 'Expense'),
                ('Utilities', 'Expense'), ('Salary', 'Income'),
                ('Investment', 'Income'), ('Gift', 'Income')
            ]
            
            for cat_name, cat_type in default_categories:
                cursor.execute('''
                    INSERT INTO category (Category_Name, Type, User_Id)
                    VALUES (%s, %s, %s)
                ''', (cat_name, cat_type, session['user_id']))
            
            mysql.connection.commit()
        
        # Now fetch all categories with their transaction counts and totals
        cursor.execute('''
            SELECT 
                c.Category_Id,
                c.Category_Name,
                c.Type,
                COUNT(t.Transaction_Id) as TransactionCount,
                COALESCE(SUM(CASE WHEN t.Transaction_Type = 'Expense' THEN t.Amount ELSE 0 END), 0) as TotalExpense,
                COALESCE(SUM(CASE WHEN t.Transaction_Type = 'Income' THEN t.Amount ELSE 0 END), 0) as TotalIncome
            FROM category c
            LEFT JOIN transaction t ON c.Category_Id = t.Category_Id
            WHERE c.User_Id = %s
            GROUP BY c.Category_Id, c.Category_Name, c.Type
            ORDER BY c.Category_Name
        ''', (session['user_id'],))
        
        categories = []
        for row in cursor.fetchall():
            categories.append({
                'Category_Id': row['Category_Id'],
                'Category_Name': row['Category_Name'],
                'Type': row['Type'],
                'TransactionCount': row['TransactionCount'],
                'TotalExpense': float(row['TotalExpense']),
                'TotalIncome': float(row['TotalIncome'])
            })
        
        return jsonify({
            'success': True,
            'categories': categories
        })

    except Exception as e:
        print(f"Categories API error: {str(e)}")
        mysql.connection.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch categories',
            'error': str(e)
        }), 500
    
    finally:
        if cursor:
            cursor.close()

@app.route('/api/vendors')
@login_required
def vendors_api():
    cursor = mysql.connection.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                v.Vendor_Id, 
                v.Vendor_Name, 
                v.Contact_Info,
                COUNT(t.Transaction_Id) as TransactionCount,
                COALESCE(SUM(t.Amount), 0) as TotalAmount
            FROM vendor v
            LEFT JOIN transaction t ON v.Vendor_Id = t.Vendor_Id
            GROUP BY v.Vendor_Id, v.Vendor_Name, v.Contact_Info
            ORDER BY v.Vendor_Name
        ''')
        
        vendors = cursor.fetchall()
        return jsonify({'vendors': vendors})
    
    except Exception as e:
        print(f"Vendor error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to load vendors'}), 500
    
    finally:
        cursor.close()

@app.route('/api/transactions')
@login_required
def get_transactions():
    cursor = mysql.connection.cursor()
    try:
        cursor.execute('''
            SELECT 
                t.*,
                a.Account_Name,
                c.Category_Name,
                v.Vendor_Name
            FROM transaction t
            JOIN account a ON t.Account_Id = a.Account_Id
            JOIN category c ON t.Category_Id = c.Category_Id
            LEFT JOIN vendor v ON t.Vendor_Id = v.Vendor_Id
            WHERE t.User_Id = %s
            ORDER BY t.Date DESC
        ''', (session['user_id'],))
        
        transactions = cursor.fetchall()
        return jsonify({'transactions': transactions})
    
    except Exception as e:
        print(f"Transactions error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to load transactions'}), 500
    
    finally:
        cursor.close()

@app.route('/api/transaction/<int:id>', methods=['PUT'])
@login_required
def update_transaction(id):
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        cursor = mysql.connection.cursor()
        cursor.execute('''
            UPDATE transaction 
            SET Account_Id = %s, Category_Id = %s, Vendor_Id = %s,
                Amount = %s, Description = %s, Transaction_Type = %s, Date = %s
            WHERE Transaction_Id = %s AND User_Id = %s
        ''', (
            data['account_id'],
            data['category_id'],
            data['vendor_id'],
            data['amount'],
            data['description'],
            data['type'],
            data['date'],
            id,
            user_id
        ))
        
        mysql.connection.commit()
        return jsonify({'success': True, 'message': 'Transaction updated successfully'})
        
    except Exception as e:
        print(f"Update transaction error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update transaction'}), 500
    
    finally:
        cursor.close()

@app.route('/api/transaction/<int:id>', methods=['DELETE'])
@login_required
def delete_transaction(id):
    try:
        user_id = session['user_id']
        
        cursor = mysql.connection.cursor()
        cursor.execute('DELETE FROM transaction WHERE Transaction_Id = %s AND User_Id = %s',
                      (id, user_id))
        
        mysql.connection.commit()
        return jsonify({'success': True, 'message': 'Transaction deleted successfully'})
        
    except Exception as e:
        print(f"Delete transaction error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete transaction'}), 500
    
    finally:
        cursor.close()

@app.route('/api/account', methods=['POST'])
@login_required
def add_account():
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        cursor = mysql.connection.cursor()
        cursor.execute('''
            INSERT INTO account 
            (Account_Name, Account_Type, Balance, User_Id)
            VALUES (%s, %s, %s, %s)
        ''', (
            data['name'],
            data['type'],
            data['balance'],
            user_id
        ))
        
        mysql.connection.commit()
        return jsonify({'success': True, 'message': 'Account added successfully'}), 201
        
    except Exception as e:
        print(f"Add account error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to add account'}), 500
    
    finally:
        cursor.close()

@app.route('/api/account/<int:id>', methods=['PUT'])
@login_required
def update_account(id):
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        cursor = mysql.connection.cursor()
        cursor.execute('''
            UPDATE account 
            SET Account_Name = %s, Account_Type = %s, Balance = %s
            WHERE Account_Id = %s AND User_Id = %s
        ''', (
            data['name'],
            data['type'],
            data['balance'],
            id,
            user_id
        ))
        
        mysql.connection.commit()
        return jsonify({'success': True, 'message': 'Account updated successfully'})
        
    except Exception as e:
        print(f"Update account error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update account'}), 500
    
    finally:
        cursor.close()
        
@app.route('/api/category', methods=['POST'])
@login_required
def add_category():
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        category_name = data.get('category_name')
        category_type = data.get('type')
        user_id = session['user_id']

        if not category_name or not category_type:
            return jsonify({
                'success': False,
                'message': 'Category name and type are required'
            }), 400

        # Validate category type
        if category_type not in ['Income', 'Expense']:
            return jsonify({
                'success': False,
                'message': 'Invalid category type. Must be either Income or Expense'
            }), 400

        cursor = mysql.connection.cursor()
        
        # Check if category already exists for this user
        cursor.execute('''
            SELECT * FROM category 
            WHERE LOWER(Category_Name) = LOWER(%s) AND User_Id = %s
        ''', (category_name, user_id))
        
        if cursor.fetchone():
            return jsonify({
                'success': False,
                'message': f'Category "{category_name}" already exists'
            }), 400

        # Insert new category
        cursor.execute('''
            INSERT INTO category (Category_Name, Type, User_Id)
            VALUES (%s, %s, %s)
        ''', (category_name, category_type, user_id))
        
        mysql.connection.commit()
        
        return jsonify({
            'success': True,
            'message': f'Category "{category_name}" added successfully'
        }), 201

    except Exception as e:
        print(f"Error adding category: {str(e)}")
        if cursor:
            mysql.connection.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to add category. Please try again.',
            'error': str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

@app.route('/api/category/<int:category_id>', methods=['PUT', 'DELETE'])
@login_required
def manage_category(category_id):
    cursor = None
    try:
        user_id = session['user_id']
        cursor = mysql.connection.cursor()

        # Check if category exists and belongs to user
        cursor.execute('''
            SELECT * FROM category 
            WHERE Category_Id = %s AND User_Id = %s
        ''', (category_id, user_id))
        
        category = cursor.fetchone()
        if not category:
            return jsonify({
                'success': False,
                'message': 'Category not found or access denied'
            }), 404

        if request.method == 'DELETE':
            # Check if category has transactions
            cursor.execute('SELECT COUNT(*) as count FROM transaction WHERE Category_Id = %s', (category_id,))
            result = cursor.fetchone()
            if result['count'] > 0:
                return jsonify({
                    'success': False,
                    'message': 'Cannot delete category with existing transactions'
                }), 400

            cursor.execute('DELETE FROM category WHERE Category_Id = %s', (category_id,))
            mysql.connection.commit()
            return jsonify({
                'success': True,
                'message': 'Category deleted successfully'
            })

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400

            category_name = data.get('category_name')
            category_type = data.get('type')

            if not category_name or not category_type:
                return jsonify({
                    'success': False,
                    'message': 'Category name and type are required'
                }), 400

            # Check if new name already exists for another category
            cursor.execute('''
                SELECT * FROM category 
                WHERE LOWER(Category_Name) = LOWER(%s) AND User_Id = %s AND Category_Id != %s
            ''', (category_name, user_id, category_id))
            
            if cursor.fetchone():
                return jsonify({
                    'success': False,
                    'message': f'Category "{category_name}" already exists'
                }), 400

            cursor.execute('''
                UPDATE category 
                SET Category_Name = %s, Type = %s
                WHERE Category_Id = %s
            ''', (category_name, category_type, category_id))
            
            mysql.connection.commit()
            return jsonify({
                'success': True,
                'message': 'Category updated successfully'
            })

    except Exception as e:
        print(f"Error managing category: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to manage category',
            'error': str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

@app.route('/api/transaction', methods=['POST'])
@login_required
def add_transaction():
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        required_fields = ['date', 'description', 'type', 'amount', 'account_id', 'category_id']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400

        cursor = mysql.connection.cursor()
        
        # Get vendor_id or use default vendor if not provided
        vendor_id = data.get('vendor_id')
        if not vendor_id:
            # Get default vendor
            cursor.execute('SELECT Vendor_Id FROM vendor WHERE Vendor_Name = %s', ('General',))
            default_vendor = cursor.fetchone()
            if default_vendor:
                vendor_id = default_vendor['Vendor_Id']
            else:
                # Create default vendor if it doesn't exist
                cursor.execute('INSERT INTO vendor (Vendor_Name, Contact_Info) VALUES (%s, %s)',
                              ('General', 'Default vendor for all transactions'))
                mysql.connection.commit()
                vendor_id = cursor.lastrowid
        
        # Validate account belongs to user
        cursor.execute('SELECT * FROM account WHERE Account_Id = %s AND User_Id = %s', 
                      (data['account_id'], session['user_id']))
        if not cursor.fetchone():
            return jsonify({
                'success': False,
                'message': 'Invalid account'
            }), 400

        # Validate category belongs to user
        cursor.execute('SELECT * FROM category WHERE Category_Id = %s AND User_Id = %s', 
                      (data['category_id'], session['user_id']))
        if not cursor.fetchone():
            return jsonify({
                'success': False,
                'message': 'Invalid category'
            }), 400

        # Insert transaction
        cursor.execute('''
            INSERT INTO transaction 
            (Date, Description, Transaction_Type, Amount, Account_Id, Category_Id, Vendor_Id, User_Id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            data['date'],
            data['description'],
            data['type'],
            data['amount'],
            data['account_id'],
            data['category_id'],
            vendor_id,
            session['user_id']
        ))

        transaction_id = cursor.lastrowid

        # Update account balance
        if data['type'] == 'Income':
            cursor.execute('''
                UPDATE account 
                SET Balance = Balance + %s 
                WHERE Account_Id = %s
            ''', (data['amount'], data['account_id']))
        else:
            cursor.execute('''
                UPDATE account 
                SET Balance = Balance - %s 
                WHERE Account_Id = %s
            ''', (data['amount'], data['account_id']))

        mysql.connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Transaction added successfully',
            'transaction_id': transaction_id
        })

    except Exception as e:
        print(f"Error adding transaction: {str(e)}")
        if cursor:
            mysql.connection.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to add transaction. Please try again.',
            'error': str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

@app.route('/api/vendor', methods=['POST'])
@login_required
def add_vendor():
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        vendor_name = data.get('name')
        contact_info = data.get('contact_info', '')

        if not vendor_name:
            return jsonify({
                'success': False,
                'message': 'Vendor name is required'
            }), 400

        cursor = mysql.connection.cursor()
        
        # Check if vendor already exists
        cursor.execute('''
            SELECT * FROM vendor 
            WHERE LOWER(Vendor_Name) = LOWER(%s)
        ''', (vendor_name,))
        
        if cursor.fetchone():
            return jsonify({
                'success': False,
                'message': f'Vendor "{vendor_name}" already exists'
            }), 400

        # Insert new vendor
        cursor.execute('''
            INSERT INTO vendor (Vendor_Name, Contact_Info)
            VALUES (%s, %s)
        ''', (vendor_name, contact_info))
        
        mysql.connection.commit()
        
        # Get the new vendor's ID and data
        vendor_id = cursor.lastrowid
        
        cursor.execute('SELECT * FROM vendor WHERE Vendor_Id = %s', (vendor_id,))
        new_vendor = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'message': f'Vendor "{vendor_name}" added successfully',
            'vendor': new_vendor
        }), 201

    except Exception as e:
        print(f"Error adding vendor: {str(e)}")
        if cursor:
            mysql.connection.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to add vendor. Please try again.',
            'error': str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

@app.route('/api/vendors/<int:vendor_id>', methods=['PUT'])
@login_required
def update_vendor(vendor_id):
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        vendor_name = data.get('name')
        contact_info = data.get('contact_info', data.get('contact', ''))

        if not vendor_name:
            return jsonify({
                'success': False,
                'message': 'Vendor name is required'
            }), 400

        cursor = mysql.connection.cursor()
        
        # Check if vendor exists
        cursor.execute('SELECT * FROM vendor WHERE Vendor_Id = %s', (vendor_id,))
        if not cursor.fetchone():
            return jsonify({
                'success': False,
                'message': 'Vendor not found'
            }), 404
            
        # Check if new name already exists for another vendor
        cursor.execute('''
            SELECT * FROM vendor 
            WHERE LOWER(Vendor_Name) = LOWER(%s) AND Vendor_Id != %s
        ''', (vendor_name, vendor_id))
        
        if cursor.fetchone():
            return jsonify({
                'success': False,
                'message': f'Another vendor with name "{vendor_name}" already exists'
            }), 400
        
        cursor.execute('''
            UPDATE vendor 
            SET Vendor_Name = %s, Contact_Info = %s 
            WHERE Vendor_Id = %s
        ''', (vendor_name, contact_info, vendor_id))
        
        mysql.connection.commit()
        
        # Get updated vendor data
        cursor.execute('SELECT * FROM vendor WHERE Vendor_Id = %s', (vendor_id,))
        updated_vendor = cursor.fetchone()
        
        return jsonify({
            'success': True, 
            'message': 'Vendor updated successfully',
            'vendor': updated_vendor
        })
    
    except Exception as e:
        print(f"Update vendor error: {str(e)}")
        if cursor:
            mysql.connection.rollback()
        return jsonify({
            'success': False, 
            'message': f'Failed to update vendor: {str(e)}'
        }), 500
    
    finally:
        if cursor:
            cursor.close()

@app.route('/api/vendors/<int:vendor_id>', methods=['DELETE'])
@login_required
def delete_vendor(vendor_id):
    cursor = mysql.connection.cursor()
    try:
        # Check if vendor has transactions
        cursor.execute('SELECT COUNT(*) as count FROM transaction WHERE Vendor_Id = %s', (vendor_id,))
        if cursor.fetchone()['count'] > 0:
            return jsonify({
                'success': False,
                'message': 'Cannot delete vendor with existing transactions'
            }), 400
        
        cursor.execute('DELETE FROM vendor WHERE Vendor_Id = %s', (vendor_id,))
        mysql.connection.commit()
        
        return jsonify({'success': True, 'message': 'Vendor deleted successfully'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    
    finally:
        cursor.close()

@app.route('/api/user/update', methods=['PUT'])
@login_required
def update_user():
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        cursor = mysql.connection.cursor()
        
        # Update name
        if 'name' in data:
            cursor.execute('UPDATE user SET Name = %s WHERE User_Id = %s',
                         (data['name'], user_id))
            session['name'] = data['name']
            
        # Update password if provided
        if 'password' in data and data['password']:
            hashed_password = generate_password_hash(data['password'], 
                                                  method='pbkdf2:sha256')
            cursor.execute('UPDATE user SET Password = %s WHERE User_Id = %s',
                         (hashed_password, user_id))
            
        mysql.connection.commit()
        return jsonify({
            'success': True, 
            'message': 'Profile updated successfully'
        })
        
    except Exception as e:
        print(f"Update user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update profile'
        }), 500
        
    finally:
        cursor.close()

@app.route('/api/vendors', methods=['GET'])
@login_required
def get_vendors():
    return vendors_api()

@app.route('/api/vendors/<int:vendor_id>', methods=['GET'])
@login_required
def get_vendor(vendor_id):
    cursor = mysql.connection.cursor()
    try:
        # Get vendor details
        cursor.execute('SELECT * FROM vendor WHERE Vendor_Id = %s', (vendor_id,))
        vendor = cursor.fetchone()
        
        if not vendor:
            return jsonify({'success': False, 'message': 'Vendor not found'}), 404
        
        # Get vendor transactions
        cursor.execute('''
            SELECT t.Transaction_Id, t.Date, t.Description, t.Amount, t.Transaction_Type,
                   a.Account_Name, c.Category_Name
            FROM transaction t
            JOIN account a ON t.Account_Id = a.Account_Id
            JOIN category c ON t.Category_Id = c.Category_Id
            WHERE t.Vendor_Id = %s
            ORDER BY t.Date DESC
            LIMIT 10
        ''', (vendor_id,))
        
        transactions = cursor.fetchall()
        
        # Format dates for JSON serialization
        for transaction in transactions:
            if 'Date' in transaction and transaction['Date']:
                transaction['Date'] = transaction['Date'].strftime('%Y-%m-%d')
        
        return jsonify({
            'success': True,
            'vendor': vendor,
            'transactions': transactions
        })
    
    except Exception as e:
        print(f"Get vendor error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500
    
    finally:
        cursor.close()

if __name__ == '__main__':
    app.run(debug=True)