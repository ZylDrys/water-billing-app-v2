// AccessControl.js
import { UI } from './UI.js';
import { Storage } from './storage.js';

export const AccessControl = (() => {
    const DEFAULT_MASTER_PASSWORD = 'admin123';
    const MASTER_PASSWORD_KEY = 'waterBillingMasterPassword';
    const TEMP_PASSWORD_KEY = 'waterBillingTempPassword';

    function getMasterPassword() {
        const stored = Storage.getItem(MASTER_PASSWORD_KEY);
        return stored || DEFAULT_MASTER_PASSWORD;
    }

    function isMasterPasswordSet() {
        return !!Storage.getItem(MASTER_PASSWORD_KEY);
    }

    function verifyMasterPassword(input) {
        if (input === getMasterPassword()) {
            UI.showAdminSection();
            UI.alertMessage('Master password verified!');
            return true;
        } else {
            UI.alertMessage('Incorrect master password!');
            return false;
        }
    }

    function setMasterPassword(password) {
        Storage.setItem(MASTER_PASSWORD_KEY, password);
        UI.showAdminSection();
    }

    function removeMasterPassword() {
        Storage.removeItem(MASTER_PASSWORD_KEY);
        UI.hideAdminSection();
    }

    function setTempPassword(password) {
        Storage.setItem(TEMP_PASSWORD_KEY, password);
    }

    function removeTempPassword() {
        Storage.removeItem(TEMP_PASSWORD_KEY);
    }

    function restoreDefaults() {
        // Remove all stored settings
        Storage.clear();
        UI.hideAdminSection();

        // Reset currency to default
        UI.setCurrency('₱');

        // Clear all input fields
        const allInputs = document.querySelectorAll('input');
        allInputs.forEach(input => input.value = '');

        UI.alertMessage('All settings have been restored to default.');
    }

    function bindRestoreButton() {
        const restoreBtn = document.getElementById('restoreDefaults');
        if (restoreBtn) restoreBtn.addEventListener('click', restoreDefaults);
    }

    function checkAppAccess() {
        const pwd = prompt("Enter master or temporary password to access the app:");
        const tempPwd = Storage.getItem(TEMP_PASSWORD_KEY);
        if (pwd !== getMasterPassword() && pwd !== tempPwd) {
            alert("Access denied! Reload to try again.");
            document.body.innerHTML = "<h2 style='text-align:center;color:red;margin-top:50px;'>Access Denied</h2>";
        }
    }

    return {
        getMasterPassword,
        isMasterPasswordSet,
        verifyMasterPassword,
        setMasterPassword,
        removeMasterPassword,
        setTempPassword,
        removeTempPassword,
        restoreDefaults,
        bindRestoreButton,
        checkAppAccess
    };
})();
