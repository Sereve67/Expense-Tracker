// Utility functions in case they're not defined in main.js
function showLoader() {
    const loaderElement = document.createElement('div');
    
    // Inline styles for loader
    loaderElement.style.display = 'flex';
    loaderElement.style.justifyContent = 'center';
    loaderElement.style.alignItems = 'center';
    loaderElement.style.height = '100px';
    loaderElement.style.margin = '40px auto';
    
    // Creating the spinner
    const spinner = document.createElement('div');
    spinner.style.border = '4px solid #f3f3f3';
    spinner.style.borderTop = '4px solid #3b82f6';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.animation = 'spin 1s linear infinite';
    
    // Add keyframes for rotation animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    loaderElement.id = 'vendor-loader';
    loaderElement.appendChild(spinner);
    
    const contentElement = document.getElementById('content');
    if (contentElement) {
        contentElement.innerHTML = '';
        contentElement.appendChild(loaderElement);
    }
}

function hideLoader() {
    const loader = document.getElementById('vendor-loader');
    if (loader) {
        loader.remove();
    }
}

// Show modal function if not defined in main.js
function showModal(content) {
    // Create our own modal implementation without checking for window.showModal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'modalOverlay';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '1000';
    modalOverlay.style.opacity = '0';
    modalOverlay.style.transition = 'opacity 0.3s ease-out';
    
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    modalContainer.style.backgroundColor = 'white';
    modalContainer.style.borderRadius = '8px';
    modalContainer.style.padding = '20px';
    modalContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    modalContainer.style.transform = 'translateY(-50px)';
    modalContainer.style.transition = 'transform 0.3s ease-out';
    modalContainer.style.maxWidth = '90%';
    modalContainer.style.maxHeight = '90%';
    modalContainer.style.overflow = 'auto';
    modalContainer.innerHTML = content;
    
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);
    
    // Animation
    setTimeout(() => {
        modalOverlay.style.opacity = '1';
        modalContainer.style.transform = 'translateY(0)';
    }, 10);
}

// Close modal function
function closeModal() {
    // Direct implementation without checking for window.closeModal
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.style.opacity = '0';
        const modalContainer = modalOverlay.querySelector('.modal-container');
        if (modalContainer) {
            modalContainer.style.transform = 'translateY(-50px)';
        }
        
        setTimeout(() => {
            modalOverlay.remove();
        }, 300);
    }
}

// Notification function if not defined in main.js
function showNotification(message, type = 'success') {
    // Direct implementation with inline styles
    const notification = document.createElement('div');
    
    // Base styles for all notifications
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    notification.style.transform = 'translateY(-20px)';
    notification.style.opacity = '0';
    notification.style.transition = 'all 0.3s ease-out';
    notification.style.zIndex = '2000';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.fontWeight = '500';
    
    // Type-specific styles
    if (type === 'success') {
        notification.style.backgroundColor = '#10b981';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#ef4444';
        notification.style.color = 'white';
    } else if (type === 'info') {
        notification.style.backgroundColor = '#3b82f6';
        notification.style.color = 'white';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#f59e0b';
        notification.style.color = 'white';
    }
    
    // Add icon
    const icon = document.createElement('span');
    icon.style.marginRight = '8px';
    
    if (type === 'success') {
        icon.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'error') {
        icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
    } else if (type === 'info') {
        icon.innerHTML = '<i class="fas fa-info-circle"></i>';
    } else if (type === 'warning') {
        icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    }
    
    notification.appendChild(icon);
    
    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);
    
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateY(-20px)';
        notification.style.opacity = '0';
        
        // Remove from DOM after animation
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Vendor Management Functions
async function loadVendors() {
    try {
        showLoader();
        const response = await fetch('/api/vendors');
        if (!response.ok) {
            throw new Error('Failed to fetch vendors');
        }
        const data = await response.json();
        
        const vendorsContent = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
            <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="font-size: 1.5rem; font-weight: bold; color: #333;">Vendors</h2>
                <button onclick="showVendorModal()" style="background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; border: none; cursor: pointer;">
                    <i class="fas fa-plus" style="margin-right: 8px;"></i>Add Vendor
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${data.vendors.map(vendor => `
                <div style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 16px; transition: box-shadow 0.3s ease; border: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <h3 style="font-size: 1.125rem; font-weight: 600; color: #333; margin-bottom: 4px;">${vendor.Vendor_Name}</h3>
                            <p style="color: #666; font-size: 0.875rem; margin-top: 4px;">${vendor.Contact_Info || 'No contact info'}</p>
                            <p style="color: #888; font-size: 0.75rem; margin-top: 12px;">Transactions: ${vendor.TransactionCount || 0}</p>
                        </div>
                        <div>
                            <button onclick="editVendor(${vendor.Vendor_Id})" style="color: #3b82f6; background: none; border: none; cursor: pointer; margin-right: 8px; font-size: 16px;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteVendor(${vendor.Vendor_Id})" style="color: #ef4444; background: none; border: none; cursor: pointer; font-size: 16px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        `;
        
        document.getElementById('content').innerHTML = vendorsContent;
        hideLoader();
    } catch (error) {
        console.error('Error loading vendors:', error);
        hideLoader();
        showNotification('Failed to load vendors', 'error');
    }
}

function showVendorModal() {
    const modalContent = `
    <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h2 class="text-xl font-bold mb-4" style="color: #333; font-size: 1.5rem; margin-bottom: 1rem;">Add New Vendor</h2>
        <form id="addVendorForm" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #4b5563;">Vendor Name</label>
                <input type="text" id="vendorName" class="form-input" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 0.375rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #4b5563;">Contact Information</label>
                <input type="text" id="vendorContact" class="form-input" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 0.375rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            </div>
            <div class="flex justify-end space-x-2" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
                <button type="button" onclick="closeModal()" style="padding: 0.5rem 1rem; background-color: #e5e7eb; color: #4b5563; border-radius: 0.375rem; font-weight: 500; cursor: pointer; border: none;">Cancel</button>
                <button type="submit" style="padding: 0.5rem 1rem; background-color: #3b82f6; color: white; border-radius: 0.375rem; font-weight: 500; cursor: pointer; border: none;">Add Vendor</button>
            </div>
        </form>
    </div>
    `;
    
    showModal(modalContent);
    
    document.getElementById('addVendorForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const vendorData = {
                name: document.getElementById('vendorName').value,
                contact_info: document.getElementById('vendorContact').value
            };
            
            const response = await fetch('/api/vendor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vendorData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                closeModal();
                showNotification('Vendor added successfully', 'success');
                await loadVendors(); // Refresh the vendor list
            } else {
                showNotification(result.message || 'Failed to add vendor', 'error');
            }
        } catch (error) {
            console.error('Error adding vendor:', error);
            showNotification('Failed to add vendor. Please try again.', 'error');
        }
    });
}

async function editVendor(vendorId) {
    try {
        // Fetch vendor details
        const response = await fetch(`/api/vendors/${vendorId}`);
        const data = await response.json();
        const vendor = data.vendor;
        
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        
        const modalContent = `
        <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
            <h2 class="text-xl font-bold mb-4" style="color: #333; font-size: 1.5rem; margin-bottom: 1rem;">Edit Vendor</h2>
            <form id="editVendorForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #4b5563;">Vendor Name</label>
                    <input type="text" id="editVendorName" class="form-input" 
                    value="${vendor.Vendor_Name}" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 0.375rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #4b5563;">Contact Information</label>
                    <input type="text" id="editVendorContact" class="form-input"
                    value="${vendor.Contact_Info || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 0.375rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div class="flex justify-end space-x-2" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
                    <button type="button" onclick="closeModal()" style="padding: 0.5rem 1rem; background-color: #e5e7eb; color: #4b5563; border-radius: 0.375rem; font-weight: 500; cursor: pointer; border: none;">Cancel</button>
                    <button type="submit" style="padding: 0.5rem 1rem; background-color: #3b82f6; color: white; border-radius: 0.375rem; font-weight: 500; cursor: pointer; border: none;">Update Vendor</button>
                </div>
            </form>
        </div>
        `;
        
        showModal(modalContent);
        
        document.getElementById('editVendorForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const vendorData = {
                    name: document.getElementById('editVendorName').value,
                    contact_info: document.getElementById('editVendorContact').value
                };
                
                const updateResponse = await fetch(`/api/vendors/${vendorId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(vendorData)
                });
                
                const result = await updateResponse.json();
                
                if (updateResponse.ok) {
                    closeModal();
                    showNotification('Vendor updated successfully', 'success');
                    await loadVendors(); // Refresh the vendor list
                } else {
                    showNotification(result.message || 'Failed to update vendor', 'error');
                }
            } catch (error) {
                console.error('Error updating vendor:', error);
                showNotification('Failed to update vendor. Please try again.', 'error');
            }
        });
    } catch (error) {
        console.error('Error editing vendor:', error);
        showNotification('Failed to load vendor details', 'error');
    }
}

async function deleteVendor(vendorId) {
    try {
        if (!confirm('Are you sure you want to delete this vendor?')) {
            return;
        }
        
        const response = await fetch(`/api/vendors/${vendorId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete vendor');
        }
        
        showNotification('Vendor deleted successfully', 'success');
        await loadVendors(); // Refresh the vendor list
    } catch (error) {
        console.error('Error deleting vendor:', error);
        showNotification(error.message || 'Failed to delete vendor', 'error');
    }
}

// Make functions available globally
window.loadVendors = loadVendors;
window.showVendorModal = showVendorModal;
window.editVendor = editVendor;
window.deleteVendor = deleteVendor; 