// adminAccess.js

// Key for localStorage
const ADMIN_TIMER_KEY = 'water_admin_access';

// 30 days in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Check if admin access is still valid (within 30 days)
 * @returns {boolean}
 */
function isAdminAccessValid() {
    const lastAccess = parseInt(localStorage.getItem(ADMIN_TIMER_KEY) || '0');
    if (!lastAccess) return false;

    const now = Date.now();
    return (now - lastAccess) < THIRTY_DAYS_MS;
}

/**
 * Record current timestamp as admin access
 */
function recordAdminAccess() {
    localStorage.setItem(ADMIN_TIMER_KEY, Date.now());
}

/**
 * Wrap saveSettings to check 30-day access
 * Pass the original saveSettings function
 */
function saveSettingsWithTimer(originalSaveSettings) {
    return function() {
        if (!isAdminAccessValid()) {
            const password = document.getElementById('adminPassword').value;
            const correctPassword = getSettings().adminPassword;

            if (password !== correctPassword) {
                alert('❌ Incorrect password or access expired!');
                return;
            }

            recordAdminAccess();
        }

        originalSaveSettings(); // Call original saveSettings
    };
}

/**
 * Auto-check access when loading settings
 * Call this inside loadSettings()
 */
function checkAdminAccessOnLoad() {
    if (!isAdminAccessValid()) {
        document.getElementById('adminPassword').value = '';
        alert('Admin access expired. Please enter password.');
    } else {
        // Optional: indicate access is valid
        document.getElementById('adminPassword').value = 'Access valid';
    }
}
