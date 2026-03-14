// AccessControl.js
const AccessControl = (() => {
    const DEFAULT_MASTER_PASSWORD = "admin123"; // default master password
    const TEMP_PASSWORD_KEY = "tempPassword";
    const SETTINGS_KEY = "waterBillingSettings";

    function getSettings() {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) return JSON.parse(stored);
        return { pricePerCubic: 10, minCharge: 50, currency: 'PHP' };
    }

    function saveSettingsToStorage(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function saveSettings() {
        const adminPwd = document.getElementById("adminPassword").value;
        if (!adminPwd || adminPwd !== getMasterPassword()) {
            alert("Incorrect master/admin password!");
            return;
        }

        const price = parseFloat(document.getElementById("adminPricePerCubic").value);
        const minCharge = parseFloat(document.getElementById("adminMinCharge").value);

        const settings = getSettings();
        if (!isNaN(price)) settings.pricePerCubic = price;
        if (!isNaN(minCharge)) settings.minCharge = minCharge;

        saveSettingsToStorage(settings);
        alert("Settings saved successfully!");
        UI.updateCurrencySymbol();
    }

    function createTempPasswordPrompt() {
        const tempPwd = prompt("Enter temporary password to set:");
        if (!tempPwd) return;
        localStorage.setItem(TEMP_PASSWORD_KEY, tempPwd);
        alert("Temporary password saved!");
    }

    function deleteTempPassword() {
        localStorage.removeItem(TEMP_PASSWORD_KEY);
        alert("Temporary password deleted!");
    }

    function restoreDefaults() {
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(TEMP_PASSWORD_KEY);
        alert("Settings restored to default!");
        UI.updateCurrencySymbol();
    }

    function getMasterPassword() {
        const stored = localStorage.getItem("masterPassword");
        return stored || DEFAULT_MASTER_PASSWORD;
    }

    function confirmMasterPassword() {
        const input = document.getElementById("masterPassword").value;
        if (input === getMasterPassword()) {
            alert("Master password confirmed!");
            document.getElementById("masterPasswordActions").style.display = "block";
        } else {
            alert("Incorrect master password!");
            document.getElementById("masterPasswordActions").style.display = "none";
        }
    }

    function changeMasterPassword() {
        const current = prompt("Enter current master password:");
        if (current !== getMasterPassword()) {
            alert("Incorrect current master password!");
            return;
        }
        const newPwd = prompt("Enter new master password:");
        if (!newPwd) return;
        localStorage.setItem("masterPassword", newPwd);
        alert("Master password changed successfully!");
    }

    function showDefaultMasterPassword() {
        alert(`Default master password is: ${DEFAULT_MASTER_PASSWORD}`);
    }

    function restoreDefaultMasterPassword() {
        localStorage.removeItem("masterPassword");
        alert("Master password restored to default!");
    }

    function checkAppAccess() {
        const pwd = prompt("Enter master or temporary password to access the app:");
        const tempPwd = localStorage.getItem(TEMP_PASSWORD_KEY);
        if (pwd !== getMasterPassword() && pwd !== tempPwd) {
            alert("Access denied! Reload to try again.");
            document.body.innerHTML = "<h2 style='text-align:center;color:red;margin-top:50px;'>Access Denied</h2>";
        }
    }

    return {
        saveSettings,
        createTempPasswordPrompt,
        deleteTempPassword,
        restoreDefaults,
        confirmMasterPassword,
        changeMasterPassword,
        showDefaultMasterPassword,
        restoreDefaultMasterPassword,
        checkAppAccess
    };
})();
