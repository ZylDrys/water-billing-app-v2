// accessControl.js

const MASTER_PASSWORD = 'admin123';
const TEMP_PASSWORD_KEY = 'tempPassword';
const TEMP_PASSWORD_EXPIRY_KEY = 'tempPasswordExpiry';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// --- Login Check ---
function checkAppAccess() {
    const access = prompt('Enter password to access the app:');
    if (!isValidPassword(access)) {
        alert('❌ Access denied. Password invalid or expired!');
        document.body.innerHTML = '<h2 style="text-align:center; margin-top:50px;">Access Denied</h2>';
        throw new Error('Access denied');
    }
}

// --- Validate Password ---
function isValidPassword(password) {
    if (password === MASTER_PASSWORD) return true;

    const temp = localStorage.getItem(TEMP_PASSWORD_KEY);
    const expiry = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
    const now = Date.now();

    return temp && password === temp && now < expiry;
}

// --- Create Temporary Password (Master Only) ---
function createTempPassword(newPassword) {
    const current = prompt('Enter master password to create temporary password:');
    if (current !== MASTER_PASSWORD) {
        alert('❌ Incorrect master password!');
        return;
    }
    if (!newPassword) {
        alert('❌ Temporary password cannot be empty!');
        return;
    }

    localStorage.setItem(TEMP_PASSWORD_KEY, newPassword);
    localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, Date.now() + THIRTY_DAYS_MS);
    alert('✅ Temporary password created! Valid for 30 days.');
}

// --- Utility: check remaining days for temp password ---
function getTempPasswordDaysLeft() {
    const expiry = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
    const now = Date.now();
    if (expiry <= now) return 0;
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

// --- Show temporary password button if master password entered ---
function showTempPasswordButtonIfMaster(password) {
    if (password === MASTER_PASSWORD) {
        const container = document.getElementById('temporaryPasswordButtonContainer');
        if (container) container.style.display = 'block';
    }
}

// --- Prompt wrapper for creating temp password ---
function createTempPasswordPrompt() {
    const newPassword = prompt('Enter new temporary password (valid 30 days):');
    if (newPassword) createTempPassword(newPassword);
}

// Toggle visibility for admin password input
document.getElementById('eyeIcon').addEventListener('click', function() {
    const passwordField = document.getElementById('adminPassword');
    const type = passwordField.type === 'password' ? 'text' : 'password';
    passwordField.type = type;  // Toggle between text and password type
    
// Change the icon to represent the state (open or closed)
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

// --- Event listener for Enter key on customer search input ---
document.getElementById('customerSearch')?.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        filterCustomers();
    }
});

// --- Event listener for Enter key on new customer name input ---
document.getElementById('newCustomerName')?.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        addCustomer();
    }
});

// --- Event listener for Enter key on admin password input ---
document.getElementById('adminPassword')?.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        saveSettings(); // Save settings when pressing enter on admin password
    }
});

// --- Event listener for Enter key on temporary password input ---
document.getElementById('tempPassword')?.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        createTempPasswordPrompt();
    }
});

// --- Save Settings (without navigating back to menu) ---
function saveSettings() {
    const price = parseFloat(document.getElementById('adminPricePerCubic').value);
    const minCharge = parseFloat(document.getElementById('adminMinCharge').value);
    const adminPassword = document.getElementById('adminPassword').value;
    
    if (!price || !minCharge || !adminPassword) {
        alert('❌ Please fill in all fields');
        return;
    }

    // Save settings without redirecting to main menu
    const settings = getSettings();
    settings.pricePerCubic = price;
    settings.minCharge = minCharge;
    settings.adminPassword = adminPassword;
    saveSettingsData(settings);

    alert('✅ Settings saved successfully!');
}

// --- Add Customer Function ---
function addCustomer() {
    const name = document.getElementById('newCustomerName').value.trim();
    if (!name) {
        alert('❌ Please enter customer name');
        return;
    }

    // Save customer data
    const customers = getData('customers');
    customers.push({
        id: Date.now(),
        name: name,
        createdAt: new Date().toISOString()
    });
    saveData('customers', customers);
    
    // Clear the input field after saving
    document.getElementById('newCustomerName').value = '';
    loadCustomersList(); // Reload customers list
}

// --- Show Temporary Password Button (Master Only) ---
function showTempPasswordButtonIfMaster(password) {
    if (password === MASTER_PASSWORD) {
        const container = document.getElementById('temporaryPasswordButtonContainer');
        if (container) container.style.display = 'block';
    }
}

// Current master password stored in localStorage
const MASTER_PASSWORD_KEY = 'masterPassword';
const DEFAULT_MASTER_PASSWORD = 'admin123';

// Get current master password
function getMasterPassword() {
    return localStorage.getItem(MASTER_PASSWORD_KEY) || DEFAULT_MASTER_PASSWORD;
}

// Change master password
function changeMasterPassword() {
    const current = prompt("Enter current master password:");
    if(current !== getMasterPassword()) {
        alert("❌ Incorrect current master password!");
        return;
    }

    const newPwd = prompt("Enter new master password:");
    if(!newPwd) {
        alert("❌ Password cannot be empty!");
        return;
    }

    localStorage.setItem(MASTER_PASSWORD_KEY, newPwd);
    alert("✅ Master password updated successfully!");
}

// Restore default master password
function restoreDefaultMasterPassword() {
    localStorage.setItem(MASTER_PASSWORD_KEY, DEFAULT_MASTER_PASSWORD);
    alert("✅ Master password restored to default!");
}

// Show default master password
function showDefaultMasterPassword() {
    alert("Default master password: " + DEFAULT_MASTER_PASSWORD);
}

// Master password login validation
function confirmMasterPassword() {
    const input = document.getElementById("masterPassword").value.trim();
    if(input === getMasterPassword()) {
        document.getElementById("temporaryPasswordButtonContainer").style.display = "block";
        document.getElementById("changeMasterPasswordButton").style.display = "inline-block";
        document.getElementById("showDefaultMasterPasswordButton").style.display = "inline-block";
        alert("Master access granted");
    } else {
        alert("❌ Incorrect master password");
    }
}
