// UI.js

export const UI = (() => {

    let currency = "₱";

    function init() {
        bindEvents();
        loadSettings();
        updateCurrencySymbol();
    }

    function bindEvents() {
    // Toggle password visibility
        const adminPassword = document.getElementById('adminPassword');
        const eyeIcon = document.getElementById('eyeIcon');
        if (adminPassword && eyeIcon) {
            eyeIcon.addEventListener('click', () => {
                adminPassword.type = adminPassword.type === 'password' ? 'text' : 'password';
            });
            
            adminPassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    AccessControl.verifyMasterPassword(adminPassword.value);
                }
            });
        }

    // Section navigation buttons
        const navButtons = document.querySelectorAll('button[data-section]');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.getAttribute('data-section');
                showSection(section);
            });
        });

    // Currency buttons
    const currencyButtons = document.querySelectorAll('button[data-currency]');
    currencyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const curr = btn.getAttribute('data-currency');
            setCurrency(curr);
        });
    });
}

    function loadSettings() {

        const settings = Storage.getSettings();
        currency = settings.currency || "₱";

    }


    function setCurrency(newCurrency) {

        currency = newCurrency;

        const settings = Storage.getSettings();
        settings.currency = newCurrency;

        Storage.saveSettings(settings);

        updateCurrencySymbol();

    }


    function updateCurrencySymbol() {

        const settings = Storage.getSettings();

        const symbol =
            settings.currency === "PHP" ? "₱" :
            settings.currency === "USD" ? "$" :
            settings.currency === "EUR" ? "€" :
            settings.currency;

        const display = document.getElementById("displayCurrencySymbol");

        if (display) display.textContent = symbol;

    }


    function showSection(sectionId) {

        const sections = document.querySelectorAll(".section");

        sections.forEach(sec => sec.classList.remove("active"));

        const target = document.getElementById(sectionId);

        if (target) target.classList.add("active");

    }


    function alertMessage(msg) {

        alert(msg);

    }


    function showAdminSection() {

        const adminSec = document.getElementById("adminSection");

        if (adminSec) adminSec.style.display = "block";

    }


    function hideAdminSection() {

        const adminSec = document.getElementById("adminSection");

        if (adminSec) adminSec.style.display = "none";

    }


    return {

        init,
        setCurrency,
        updateCurrencySymbol,
        showSection,
        alertMessage,
        showAdminSection,
        hideAdminSection

    };

})();
