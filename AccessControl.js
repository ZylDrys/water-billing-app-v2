// AccessControl.js

import { UI } from './UI.js';
import { Storage } from './Storage.js';

export const AccessControl = (() => {

    const DEFAULT_MASTER_PASSWORD = "admin123";
    const MASTER_PASSWORD_KEY = "waterBillingMasterPassword";
    const TEMP_PASSWORD_KEY = "waterBillingTempPassword";


    function getMasterPassword() {

        const stored = localStorage.getItem(MASTER_PASSWORD_KEY);

        return stored || DEFAULT_MASTER_PASSWORD;

    }


    function isMasterPasswordSet() {

        return !!localStorage.getItem(MASTER_PASSWORD_KEY);

    }


    function verifyMasterPassword(input) {

        if (input === getMasterPassword()) {

            UI.showAdminSection();
            UI.alertMessage("Master password verified!");

            return true;

        }

        UI.alertMessage("Incorrect master password!");

        return false;

    }


    function setMasterPassword(password) {

        if (!password) return;

        localStorage.setItem(MASTER_PASSWORD_KEY, password);

        UI.showAdminSection();

    }


    function removeMasterPassword() {

        localStorage.removeItem(MASTER_PASSWORD_KEY);

        UI.hideAdminSection();

    }


    function setTempPassword(password) {

        if (!password) return;

        localStorage.setItem(TEMP_PASSWORD_KEY, password);

    }


    function removeTempPassword() {

        localStorage.removeItem(TEMP_PASSWORD_KEY);

    }


    function restoreDefaults() {

        Storage.clearAll();

        localStorage.removeItem(MASTER_PASSWORD_KEY);
        localStorage.removeItem(TEMP_PASSWORD_KEY);

        UI.hideAdminSection();

        UI.setCurrency("PHP");

        const inputs = document.querySelectorAll("input");

        inputs.forEach(input => input.value = "");

        UI.alertMessage("System restored to default settings.");

        location.reload();

    }


    function bindRestoreButton() {

        const restoreBtn = document.getElementById("restoreDefaults");

        if (restoreBtn) {
            restoreBtn.addEventListener("click", restoreDefaults);
        }

    }


    function bindMasterPasswordButton() {

        const btn = document.getElementById("confirmMasterPasswordBtn");
        const input = document.getElementById("masterPassword");

        if (!btn || !input) return;

        btn.addEventListener("click", () => {

            verifyMasterPassword(input.value);

        });

    }


    function checkAppAccess() {

        const tempPwd = localStorage.getItem(TEMP_PASSWORD_KEY);

        const pwd = prompt("Enter master or temporary password:");

        if (pwd !== getMasterPassword() && pwd !== tempPwd) {

            alert("Access denied!");

            document.body.innerHTML =
                "<h2 style='text-align:center;color:red;margin-top:50px;'>Access Denied</h2>";

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
        bindMasterPasswordButton,
        checkAppAccess

    };

})();
