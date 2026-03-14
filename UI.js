// UI.js
export const UI = (() => {
    let currency = '₱';

    // Cache DOM elements
    const dom = {
        adminPassword: document.getElementById('adminPassword'),
        eyeIcon: document.getElementById('eyeIcon'),
        menuSection: document.getElementById('menuSection')
    };

    function init() {
        bindEvents();
        renderUI();
    }

    function bindEvents() {
        // Toggle password visibility
        if (dom.adminPassword && dom.eyeIcon) {
            dom.eyeIcon.addEventListener('click', togglePasswordVisibility);

            // Enter key triggers master password verification
            dom.adminPassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    AccessControl.verifyMasterPassword(dom.adminPassword.value);
                }
            });
        }
    }

    function renderUI() {
        updateCurrencySymbol();
        if (AccessControl.isMasterPasswordSet()) {
            showAdminSection();
        }
    }

    function togglePasswordVisibility() {
        if (!dom.adminPassword) return;
        dom.adminPassword.type = dom.adminPassword.type === 'password' ? 'text' : 'password';
    }

    function setCurrency(newCurrency) {
        currency = newCurrency;
        updateCurrencySymbol();
        Storage.setItem('currency', currency);
    }

    function updateCurrencySymbol() {
        const elements = document.querySelectorAll('.currencySymbol, .currencyBtn');
        elements.forEach(el => el.textContent = currency);
    }

    function showSection(sectionId) {
        const sections = document.querySelectorAll(".section");
        sections.forEach(sec => sec.style.display = "none");
        const target = document.getElementById(sectionId);
        if (target) target.style.display = "block";
    }

    function printBill(customer) {
        const billWindow = window.open("", "_blank");
        billWindow.document.write("<html><head><title>Water Bill</title></head><body>");
        billWindow.document.write(`<h2>Water Bill for ${customer.name}</h2>`);
        billWindow.document.write(`<p>Previous Reading: ${customer.previousReading}</p>`);
        billWindow.document.write(`<p>Current Reading: ${customer.currentReading}</p>`);
        billWindow.document.write(`<p>Consumption: ${customer.consumption} cubic meters</p>`);
        billWindow.document.write(`<p>Total Due: ${customer.totalDue} ${currency}</p>`);
        billWindow.document.write("</body></html>");
        billWindow.document.close();
        billWindow.print();
    }

    function alertMessage(msg) {
        alert(msg);
    }

    function showAdminSection() {
        const adminSec = document.getElementById('adminSection');
        if (adminSec) adminSec.style.display = 'block';
    }

    function hideAdminSection() {
        const adminSec = document.getElementById('adminSection');
        if (adminSec) adminSec.style.display = 'none';
    }

    return {
        init,
        setCurrency,
        updateCurrencySymbol,
        showSection,
        printBill,
        alertMessage,
        showAdminSection,
        hideAdminSection
    };
})();
