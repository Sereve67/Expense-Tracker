document.addEventListener('DOMContentLoaded', function() {
    // Format currency function
    window.formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Global notification function
    window.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add icon based on type
        const icon = document.createElement('i');
        icon.className = `fas ${type === 'success' ? 'fa-check-circle' : 
                              type === 'error' ? 'fa-exclamation-circle' : 
                              'fa-info-circle'}`;
        
        const textDiv = document.createElement('div');
        textDiv.textContent = message;
        
        notification.appendChild(icon);
        notification.appendChild(textDiv);
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateY(-100%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };

    // Menu toggle functionality
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            sidebar.style.animation = sidebar.classList.contains('active') ? 
                'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-out';
        });
    }

    // Close menu when clicking overlay
    overlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        sidebar.style.animation = 'slideOut 0.3s ease-out';
    });

    // Close menu when window is resized above mobile breakpoint
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });

    // Get user info and update UI with animation
    async function getUserInfo() {
        try {
            const response = await fetch('/api/user');
            if (!response.ok) throw new Error('Failed to fetch user data');
            const userData = await response.json();
            const userNameElement = document.getElementById('userName');
            const userInitialsElement = document.getElementById('userInitials');
            
            if (userNameElement && userInitialsElement) {
                userNameElement.style.opacity = '0';
                userInitialsElement.style.opacity = '0';
                
                userNameElement.textContent = userData.name;
                userInitialsElement.textContent = userData.name.charAt(0).toUpperCase();
                
                // Fade in animation
                setTimeout(() => {
                    userNameElement.style.transition = 'opacity 0.5s ease-in';
                    userInitialsElement.style.transition = 'opacity 0.5s ease-in';
                    userNameElement.style.opacity = '1';
                    userInitialsElement.style.opacity = '1';
                }, 100);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            showNotification('Error loading user data', 'error');
        }
    }
    getUserInfo();

    // Initialize page based on current hash
    const currentPath = window.location.hash.slice(1) || 'dashboard';
    loadContent(currentPath);

    // Handle navigation with smooth transitions
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = e.target.getAttribute('href').slice(1);
            
            // Add exit animation to current content
            const contentDiv = document.getElementById('content');
            contentDiv.style.animation = 'fadeOut 0.3s ease-out';
            
            setTimeout(() => {
                loadContent(path);
                contentDiv.style.animation = 'fadeIn 0.3s ease-in';
            }, 300);
        });
    });

    // Enhanced logout functionality
    async function logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (response.ok) {
                showNotification('Logging out...', 'info');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            showNotification('Failed to logout. Please try again.', 'error');
        }
    }

    // Attach logout handlers
    const logoutButton = document.getElementById('logoutButton');
    const dropdownLogout = document.getElementById('dropdownLogout');
    
    if (logoutButton) logoutButton.addEventListener('click', logout);
    if (dropdownLogout) dropdownLogout.addEventListener('click', logout);

    // Add Transaction Form
    window.loadAddTransactionForm = async function() {
        try {
            // Fetch accounts, categories, and vendors first
            const [accountsRes, categoriesRes, vendorsRes] = await Promise.all([
                fetch('/api/accounts'),
                fetch('/api/categories'),
                fetch('/api/vendors')
            ]);

            // Check if any request failed
            if (!accountsRes.ok || !categoriesRes.ok || !vendorsRes.ok) {
                throw new Error('Failed to fetch required data');
            }

            const [accountsData, categoriesData, vendorsData] = await Promise.all([
                accountsRes.json(),
                categoriesRes.json(),
                vendorsRes.json()
            ]);

            // Validate the data
            if (!accountsData.accounts || !Array.isArray(accountsData.accounts)) {
                throw new Error('Invalid accounts data');
            }
            if (!categoriesData.success || !Array.isArray(categoriesData.categories)) {
                throw new Error('Invalid categories data');
            }
            if (!vendorsData.vendors || !Array.isArray(vendorsData.vendors)) {
                throw new Error('Invalid vendors data');
            }

            const contentDiv = document.getElementById('content');
            contentDiv.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                    <div class="flex items-center mb-6">
                        <button onclick="loadDashboard()" class="text-blue-600 hover:text-blue-800 mr-4">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <h2 class="text-2xl font-semibold">Add Transaction</h2>
                    </div>
                    <form id="addTransactionForm" class="space-y-4">
                        <div class="form-group">
                            <label for="transactionDate" class="form-label">Date</label>
                            <input type="date" id="transactionDate" name="date" class="form-input" 
                                value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label for="transactionDescription" class="form-label">Description</label>
                            <input type="text" id="transactionDescription" name="description" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="transactionType" class="form-label">Type</label>
                            <select id="transactionType" name="type" class="form-input" required>
                                <option value="Expense">Expense</option>
                                <option value="Income">Income</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="transactionAmount" class="form-label">Amount</label>
                            <input type="number" id="transactionAmount" name="amount" class="form-input" 
                                step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="transactionAccount" class="form-label">Account</label>
                            <select id="transactionAccount" name="account_id" class="form-input" required>
                                ${accountsData.accounts.map(acc => `
                                    <option value="${acc.Account_Id}">${acc.Account_Name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="transactionCategory" class="form-label">Category</label>
                            <select id="transactionCategory" name="category_id" class="form-input" required>
                                ${categoriesData.categories.map(cat => `
                                    <option value="${cat.Category_Id}">${cat.Category_Name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="transactionVendor" class="form-label">Vendor</label>
                            <select id="transactionVendor" name="vendor_id" class="form-input" required>
                                ${vendorsData.vendors.map(ven => `
                                    <option value="${ven.Vendor_Id}">${ven.Vendor_Name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary w-full">
                            Add Transaction
                        </button>
                    </form>
                </div>
            `;

            const form = document.getElementById('addTransactionForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const transactionData = {
                    date: formData.get('date'),
                    description: formData.get('description'),
                    type: formData.get('type'),
                    amount: parseFloat(formData.get('amount')),
                    account_id: parseInt(formData.get('account_id')),
                    category_id: parseInt(formData.get('category_id')),
                    vendor_id: parseInt(formData.get('vendor_id'))
                };

                // Validate required fields
                if (!transactionData.date || !transactionData.description || !transactionData.type || 
                    !transactionData.amount || !transactionData.account_id || 
                    !transactionData.category_id || !transactionData.vendor_id) {
                    showNotification('Please fill in all required fields', 'error');
                    return;
                }

                try {
                    const response = await fetch('/api/transaction', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(transactionData),
                        credentials: 'same-origin'
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.message || 'Failed to add transaction');
                    }

                    showNotification('Transaction added successfully!', 'success');
                    setTimeout(() => loadDashboard(), 1000);
                } catch (error) {
                    console.error('Error adding transaction:', error);
                    showNotification(error.message, 'error');
                }
            });
        } catch (error) {
            console.error('Error loading form:', error);
            showNotification(error.message, 'error');
            
            // Show a user-friendly error message in the content div
            const contentDiv = document.getElementById('content');
            contentDiv.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                    <div class="text-center">
                        <i class="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i>
                        <h2 class="text-2xl font-semibold mb-2">Error Loading Form</h2>
                        <p class="text-gray-600 mb-4">${error.message}</p>
                        <button onclick="loadAddTransactionForm()" class="btn btn-primary">
                            <i class="fas fa-sync-alt mr-2"></i>Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    };

    // Add Category Form
    window.loadAddCategoryForm = function() {
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                <div class="flex items-center mb-6">
                    <button onclick="loadCategories()" class="text-blue-600 hover:text-blue-800 mr-4">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 class="text-2xl font-semibold">Add Category</h2>
                </div>
                <form id="addCategoryForm" class="space-y-6">
                    <div class="form-group">
                        <label for="categoryName" class="form-label">Category Name</label>
                        <input type="text" id="categoryName" name="categoryName" class="form-input" 
                               placeholder="Enter category name" required>
                    </div>
                    <div class="form-group">
                        <label for="categoryType" class="form-label">Type</label>
                        <select id="categoryType" name="categoryType" class="form-input" required>
                            <option value="">Select type</option>
                            <option value="Expense">Expense</option>
                            <option value="Income">Income</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary w-full">
                        <i class="fas fa-plus mr-2"></i>Add Category
                    </button>
                </form>
            </div>
        `;

        const form = document.getElementById('addCategoryForm');
        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                
                const categoryData = {
                    category_name: form.categoryName.value.trim(),
                    type: form.categoryType.value
                };
                
                if (!categoryData.category_name || !categoryData.type) {
                    showNotification('Please fill in all required fields', 'error');
                    return;
                }
                
                try {
                    const response = await fetch('/api/category', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(categoryData),
                        credentials: 'same-origin'
                    });
                    
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.message || 'Failed to add category');
                    }

                    showNotification(data.message, 'success');
                    setTimeout(() => loadCategories(), 1000);
                } catch (error) {
                    console.error('Error adding category:', error);
                    showNotification(error.message, 'error');
                }
            });
        }
    };
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }

    @keyframes slideIn {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
    }

    @keyframes slideOut {
        from { transform: translateX(0); }
        to { transform: translateX(-100%); }
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .loader {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 20px auto;
    }

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 5px;
        background: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transform: translateY(-100%);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .notification.success {
        background: #4CAF50;
        color: white;
    }

    .notification.error {
        background: #f44336;
        color: white;
    }

    .notification.info {
        background: #2196F3;
        color: white;
    }

    .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
    }

    .btn {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-weight: 500;
        transition: all 0.2s;
    }

    .btn-primary {
        background-color: #3b82f6;
        color: white;
    }

    .btn-primary:hover {
        background-color: #2563eb;
    }

    .form-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
    }

    .form-input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        transition: border-color 0.2s;
    }

    .form-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
`;
document.head.appendChild(style);

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white 
        animate__animated animate__fadeInRight ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    notification.innerHTML = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('animate__fadeInRight');
        notification.classList.add('animate__fadeOutRight');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Active navigation handling
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Profile dropdown
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        profileDropdown.addEventListener('click', () => {
            window.location.href = '/profile';
        });
    }

    // Add button handling
    const addButton = document.getElementById('addButton');
    if (addButton) {
        addButton.addEventListener('click', () => {
            const currentPage = document.querySelector('.nav-link.active')
                                      ?.getAttribute('data-page');
            switch(currentPage) {
                case 'transactions':
                    showTransactionModal();
                    break;
                case 'accounts':
                    showAccountModal();
                    break;
                case 'categories':
                    showCategoryModal();
                    break;
                case 'vendors':
                    showVendorModal();
                    break;
            }
        });
    }
});

// Update page title when content changes
function updatePageTitle(path) {
    const title = path.charAt(0).toUpperCase() + path.slice(1);
    document.getElementById('pageTitle').textContent = title;
}

async function loadContent(path) {
    // Show loader
    document.getElementById('content').innerHTML = '<div class="loader"></div>';
    
    // Update page title
    updatePageTitle(path);
    
    // Update current navigation highlight
    document.querySelectorAll('.sidebar a').forEach(link => {
        if (link.getAttribute('href') === `#${path}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    try {
        switch (path) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'transactions':
                await loadTransactions();
                break;
            case 'accounts':
                await loadAccounts();
                break;
            case 'categories':
                await loadCategories();
                break;
            case 'vendors':
                // Use the external loadVendors function from vendor.js
                if (typeof window.loadVendors === 'function') {
                    await window.loadVendors();
                } else {
                    showNotification('Vendor functionality is not available', 'error');
                }
                break;
            case 'add-transaction':
                window.loadAddTransactionForm();
                break;
            case 'profile':
                await loadProfile();
                break;
            default:
                await loadDashboard();
        }
    } catch (error) {
        console.error(`Error loading ${path}:`, error);
        document.getElementById('content').innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Something went wrong</h2>
                <p>${error.message || 'Failed to load content'}</p>
                <button class="btn btn-primary" onclick="loadDashboard()">Go to Dashboard</button>
            </div>
        `;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();

        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 animate-fade-in">
                <div class="stat-card">
                    <h3 class="text-lg font-semibold mb-2 text-gray-700">Total Balance</h3>
                    <p class="text-2xl font-bold text-blue-600">${formatCurrency(data.monthly_summary.net)}</p>
                </div>
                <div class="stat-card">
                    <h3 class="text-lg font-semibold mb-2 text-gray-700">Monthly Income</h3>
                    <p class="text-2xl font-bold text-green-600">${formatCurrency(data.monthly_summary.income)}</p>
                </div>
                <div class="stat-card">
                    <h3 class="text-lg font-semibold mb-2 text-gray-700">Monthly Expenses</h3>
                    <p class="text-2xl font-bold text-red-600">${formatCurrency(data.monthly_summary.expense)}</p>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold text-gray-800">Recent Transactions</h3>
                    <button onclick="loadContent('add-transaction')" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Transaction
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th class="px-6 py-3 bg-gray-50 text-left">Date</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Description</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Category</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Amount</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.recent_transactions.map(tx => `
                                <tr class="border-b hover:bg-gray-50 transition-colors">
                                    <td class="px-6 py-4">${new Date(tx.Date).toLocaleDateString()}</td>
                                    <td class="px-6 py-4">${tx.Description}</td>
                                    <td class="px-6 py-4">${tx.Category_Name}</td>
                                    <td class="px-6 py-4 ${tx.Transaction_Type === 'Income' ? 'text-green-600' : 'text-red-600'}">
                                        ${formatCurrency(tx.Amount)}
                                    </td>
                                    <td class="px-6 py-4">
                                        <button onclick="editTransaction(${tx.Transaction_Id})" 
                                                class="text-blue-600 hover:text-blue-800 mr-2">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="deleteTransaction(${tx.Transaction_Id})"
                                                class="text-red-600 hover:text-red-800">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

// Transactions
async function loadTransactions() {
    const content = document.getElementById('content');
    try {
        const response = await fetch('/api/transactions');
        const data = await response.json();

        content.innerHTML = `
            <div class="max-w-6xl mx-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Transactions</h2>
                    <button onclick="showAddTransactionModal()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Transaction
                    </button>
                </div>

                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Account
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${data.transactions.map(tx => `
                                    <tr class="hover:bg-gray-50 transition-colors">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${new Date(tx.Date).toLocaleDateString()}
                                        </td>
                                        <td class="px-6 py-4 text-sm text-gray-900">
                                            ${tx.Description}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm ${tx.Transaction_Type === 'Income' ? 'text-green-600' : 'text-red-600'}">
                                            ${formatCurrency(tx.Amount)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${tx.Transaction_Type}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${tx.Account_Name}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <button onclick="editTransaction(${tx.Transaction_Id})" 
                                                    class="text-blue-600 hover:text-blue-800 mr-3">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="deleteTransaction(${tx.Transaction_Id})" 
                                                    class="text-red-600 hover:text-red-800">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        showNotification('Failed to load transactions', 'error');
    }
}

// Accounts
async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts');
        const data = await response.json();

        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-semibold mb-4">Accounts</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th class="px-6 py-3 bg-gray-50 text-left">Account Name</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Type</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.accounts.map(account => `
                                <tr class="border-b">
                                    <td class="px-6 py-4">${account.Account_Name}</td>
                                    <td class="px-6 py-4">${account.Account_Type}</td>
                                    <td class="px-6 py-4">$${account.Balance.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <button id="addAccountButton" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
                    Add Account
                </button>
            </div>
        `;

        // Add Account Form Handler
        document.getElementById('addAccountButton').addEventListener('click', () => {
            loadAddAccountForm();
        });
    } catch (error) {
        console.error('Error loading accounts:', error);
        throw error;
    }
}

// Add Account Form
async function loadAddAccountForm() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-semibold mb-4">Add Account</h2>
            <form id="addAccountForm">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Account Name</label>
                    <input type="text" id="accountName" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Account Type</label>
                    <select id="accountType" class="w-full p-2 border rounded" required>
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                        <option value="Credit Card">Credit Card</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Initial Balance</label>
                    <input type="number" id="accountBalance" class="w-full p-2 border rounded" required>
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">
                    Add Account
                </button>
            </form>
        </div>
    `;

    document.getElementById('addAccountForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const accountName = document.getElementById('accountName').value;
        const accountType = document.getElementById('accountType').value;
        const accountBalance = parseFloat(document.getElementById('accountBalance').value);

        try {
            const response = await fetch('/api/account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: accountName,
                    type: accountType,
                    balance: accountBalance,
                }),
            });

            if (response.ok) {
                alert('Account added successfully!');
                loadAccounts(); // Reload accounts list
            } else {
                alert('Failed to add account. Please try again.');
            }
        } catch (error) {
            console.error('Error adding account:', error);
            alert('An error occurred. Please try again.');
        }
    });
}

// Categories
async function loadCategories() {
    try {
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                <div class="text-center">
                    <div class="loader"></div>
                    <p class="mt-4">Loading categories...</p>
                </div>
            </div>
        `;

        const response = await fetch('/api/categories', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            credentials: 'same-origin'
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch categories');
        }
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load categories');
        }

        if (!Array.isArray(data.categories)) {
            throw new Error('Invalid categories data received');
        }

        contentDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold">Categories</h2>
                    <button id="addCategoryButton" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Category
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <!-- Income Categories -->
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h3 class="text-lg font-semibold text-green-700 mb-4">Income Categories</h3>
                        <div class="space-y-4">
                            ${data.categories
                                .filter(cat => cat.Type === 'Income')
                                .map(category => `
                                    <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center">
                                            <h4 class="font-medium">${category.Category_Name}</h4>
                                            <span class="text-green-600">${formatCurrency(category.TotalIncome || 0)}</span>
                                        </div>
                                        <div class="text-sm text-gray-500 mt-2">
                                            ${category.TransactionCount || 0} transactions
                                        </div>
                                        <div class="flex gap-2 mt-3">
                                            <button onclick="editCategory(${category.Category_Id})" 
                                                    class="text-blue-600 hover:text-blue-800">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="deleteCategory(${category.Category_Id})"
                                                    class="text-red-600 hover:text-red-800">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('') || `
                                    <div class="text-center text-gray-500 py-4">
                                        No income categories found
                                    </div>
                                `}
                        </div>
                    </div>

                    <!-- Expense Categories -->
                    <div class="bg-red-50 p-4 rounded-lg">
                        <h3 class="text-lg font-semibold text-red-700 mb-4">Expense Categories</h3>
                        <div class="space-y-4">
                            ${data.categories
                                .filter(cat => cat.Type === 'Expense')
                                .map(category => `
                                    <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center">
                                            <h4 class="font-medium">${category.Category_Name}</h4>
                                            <span class="text-red-600">${formatCurrency(category.TotalExpense || 0)}</span>
                                        </div>
                                        <div class="text-sm text-gray-500 mt-2">
                                            ${category.TransactionCount || 0} transactions
                                        </div>
                                        <div class="flex gap-2 mt-3">
                                            <button onclick="editCategory(${category.Category_Id})" 
                                                    class="text-blue-600 hover:text-blue-800">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="deleteCategory(${category.Category_Id})"
                                                    class="text-red-600 hover:text-red-800">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('') || `
                                    <div class="text-center text-gray-500 py-4">
                                        No expense categories found
                                    </div>
                                `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add Category Button Handler
        document.getElementById('addCategoryButton').addEventListener('click', () => {
            loadAddCategoryForm();
        });

    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification(error.message, 'error');
        
        // Show a user-friendly error message in the content div
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                <div class="text-center">
                    <i class="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i>
                    <h2 class="text-2xl font-semibold mb-2">Error Loading Categories</h2>
                    <p class="text-gray-600 mb-4">${error.message}</p>
                    <button onclick="loadCategories()" class="btn btn-primary">
                        <i class="fas fa-sync-alt mr-2"></i>Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

// Edit Category
window.editCategory = async function(categoryId) {
    try {
        const response = await fetch(`/api/categories`);
        const data = await response.json();
        const category = data.categories.find(c => c.Category_Id === categoryId);

        if (!category) {
            throw new Error('Category not found');
        }

        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                <div class="flex items-center mb-6">
                    <button onclick="loadCategories()" class="text-blue-600 hover:text-blue-800 mr-4">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 class="text-2xl font-semibold">Edit Category</h2>
                </div>
                <form id="editCategoryForm" class="space-y-6">
                    <div class="form-group">
                        <label for="categoryName" class="form-label">Category Name</label>
                        <input type="text" id="categoryName" name="categoryName" class="form-input" 
                               value="${category.Category_Name}" required>
                    </div>
                    <div class="form-group">
                        <label for="categoryType" class="form-label">Type</label>
                        <select id="categoryType" name="categoryType" class="form-input" required>
                            <option value="Expense" ${category.Type === 'Expense' ? 'selected' : ''}>Expense</option>
                            <option value="Income" ${category.Type === 'Income' ? 'selected' : ''}>Income</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary w-full">
                        <i class="fas fa-save mr-2"></i>Save Changes
                    </button>
                </form>
            </div>
        `;

        const form = document.getElementById('editCategoryForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(`/api/category/${categoryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        category_name: form.categoryName.value.trim(),
                        type: form.categoryType.value
                    }),
                    credentials: 'same-origin'
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to update category');
                }

                showNotification(data.message, 'success');
                setTimeout(() => loadCategories(), 1000);
            } catch (error) {
                console.error('Error updating category:', error);
                showNotification(error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error loading category:', error);
        showNotification(error.message, 'error');
    }
};

// Delete Category
window.deleteCategory = async function(categoryId) {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/category/${categoryId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete category');
        }

        showNotification(data.message, 'success');
        await loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification(error.message, 'error');
    }
};

// Modal Helper Functions
function showModal({ title, content, onConfirm }) {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl w-full max-w-md animate__animated animate__fadeInDown">
                <div class="px-6 py-4 border-b">
                    <h3 class="text-xl font-semibold">${title}</h3>
                </div>
                <div class="px-6 py-4">
                    ${content}
                </div>
                <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                    <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="confirmModal()" class="btn btn-primary">Save</button>
                </div>
            </div>
        </div>
    `;
    
    modalContainer.classList.remove('hidden');
    window._modalConfirmCallback = onConfirm;
}

function closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.classList.add('hidden');
    modalContainer.innerHTML = '';
    window._modalConfirmCallback = null;
}

async function confirmModal() {
    if (window._modalConfirmCallback) {
        await window._modalConfirmCallback();
        closeModal();
    }
}

// Add profile handling
async function loadProfile() {
  const contentDiv = document.getElementById('content');
  
  try {
    const response = await fetch('/api/user');
    const userData = await response.json();

    contentDiv.innerHTML = `
      <div class="card animate__animated animate__fadeIn">
        <h2 class="text-2xl font-semibold mb-6">Profile Settings</h2>
        
        <form id="profileForm" class="space-y-6">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" id="profileName" class="form-input" 
                   value="${userData.name}" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="profileEmail" class="form-input" 
                   value="${userData.email}" readonly>
          </div>
          
          <div class="form-group">
            <label class="form-label">Change Password</label>
            <input type="password" id="newPassword" class="form-input" 
                   placeholder="Enter new password">
          </div>

          <button type="submit" class="btn btn-primary w-full">
            <i class="fas fa-save mr-2"></i>Save Changes
          </button>
        </form>
      </div>
    `;

    // Handle form submission
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        name: document.getElementById('profileName').value,
        password: document.getElementById('newPassword').value || undefined
      };

      try {
        const response = await fetch('/api/user/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok) {
          showNotification('Profile updated successfully', 'success');
          if (formData.name !== userData.name) {
            // Update displayed name
            document.getElementById('userName').textContent = formData.name;
            document.getElementById('userInitials').textContent = 
              formData.name.charAt(0).toUpperCase();
          }
        } else {
          throw new Error(data.message);
        }

      } catch (error) {
        showNotification(error.message, 'error');
      }
    });

  } catch (error) {
    showNotification('Failed to load profile', 'error');
  }
}

async function handleApiError(response) {
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.message || 'An error occurred. Please try again.';
        throw new Error(message);
    }
    return response.json();
}

// Update content loader with default path
document.addEventListener('DOMContentLoaded', function() {
    // Load initial content
    loadContent('dashboard');

    // Update navigation handlers
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = e.currentTarget.getAttribute('href').replace('#', '');
            
            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Load content
            loadContent(path);
        });
    });
});

// Update loadDashboard to handle missing chart data
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();

        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 animate-fade-in">
                <div class="stat-card">
                    <h3 class="text-lg font-semibold mb-2 text-gray-700">Total Balance</h3>
                    <p class="text-2xl font-bold text-blue-600">${formatCurrency(data.monthly_summary.net)}</p>
                </div>
                <div class="stat-card">
                    <h3 class="text-lg font-semibold mb-2 text-gray-700">Monthly Income</h3>
                    <p class="text-2xl font-bold text-green-600">${formatCurrency(data.monthly_summary.income)}</p>
                </div>
                <div class="stat-card">
                    <h3 class="text-lg font-semibold mb-2 text-gray-700">Monthly Expenses</h3>
                    <p class="text-2xl font-bold text-red-600">${formatCurrency(data.monthly_summary.expense)}</p>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold text-gray-800">Recent Transactions</h3>
                    <button onclick="loadContent('add-transaction')" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Transaction
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th class="px-6 py-3 bg-gray-50 text-left">Date</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Description</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Category</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Amount</th>
                                <th class="px-6 py-3 bg-gray-50 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.recent_transactions.map(tx => `
                                <tr class="border-b hover:bg-gray-50 transition-colors">
                                    <td class="px-6 py-4">${new Date(tx.Date).toLocaleDateString()}</td>
                                    <td class="px-6 py-4">${tx.Description}</td>
                                    <td class="px-6 py-4">${tx.Category_Name}</td>
                                    <td class="px-6 py-4 ${tx.Transaction_Type === 'Income' ? 'text-green-600' : 'text-red-600'}">
                                        ${formatCurrency(tx.Amount)}
                                    </td>
                                    <td class="px-6 py-4">
                                        <button onclick="editTransaction(${tx.Transaction_Id})" 
                                                class="text-blue-600 hover:text-blue-800 mr-2">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="deleteTransaction(${tx.Transaction_Id})"
                                                class="text-red-600 hover:text-red-800">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

async function showAddTransactionModal() {
    try {
        // Fetch accounts and categories for the form
        const [accountsResponse, categoriesResponse] = await Promise.all([
            fetch('/api/accounts'),
            fetch('/api/categories')
        ]);

        const accounts = await accountsResponse.json();
        const categories = await categoriesResponse.json();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay animate__animated animate__fadeIn';
        modal.innerHTML = `
            <div class="modal-content bg-white rounded-lg shadow-xl max-w-md mx-auto">
                <div class="px-6 py-4 border-b">
                    <h3 class="text-xl font-semibold">Add Transaction</h3>
                </div>
                
                <form id="addTransactionForm" class="px-6 py-4">
                    <div class="space-y-4">
                        <div class="form-group">
                            <label class="form-label">Date</label>
                            <input type="date" id="transactionDate" class="form-input" 
                                   value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <input type="text" id="transactionDescription" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Amount</label>
                            <input type="number" id="transactionAmount" class="form-input" 
                                   step="0.01" min="0" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Type</label>
                            <select id="transactionType" class="form-input" required>
                                <option value="Income">Income</option>
                                <option value="Expense">Expense</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Account</label>
                            <select id="transactionAccount" class="form-input" required>
                                ${accounts.accounts.map(account => `
                                    <option value="${account.Account_Id}">${account.Account_Name}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select id="transactionCategory" class="form-input" required>
                                ${categories.categories.map(category => `
                                    <option value="${category.Category_Id}">${category.Category_Name}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </form>
                
                <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                    <button type="button" class="btn btn-secondary" 
                            onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                    <button type="submit" form="addTransactionForm" class="btn btn-primary">
                        Add Transaction
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                date: document.getElementById('transactionDate').value,
                description: document.getElementById('transactionDescription').value,
                amount: parseFloat(document.getElementById('transactionAmount').value),
                type: document.getElementById('transactionType').value,
                account_id: parseInt(document.getElementById('transactionAccount').value),
                category_id: parseInt(document.getElementById('transactionCategory').value)
            };

            try {
                const response = await fetch('/api/transactions/create', {  // Updated endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    showNotification('Transaction added successfully', 'success');
                    modal.remove();
                    await loadTransactions(); // Refresh the transaction list
                } else {
                    throw new Error(result.message || 'Failed to add transaction');
                }
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    } catch (error) {
        showNotification('Failed to load form data', 'error');
    }
}