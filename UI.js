// UI.js
const UI = (() => {
    function showSection(sectionId) {
        const sections = document.querySelectorAll(".section");
        sections.forEach(sec => sec.style.display = "none");
        const target = document.getElementById(sectionId);
        if (target) target.style.display = "block";
    }

    function updateCurrencySymbol() {
        const settings = JSON.parse(localStorage.getItem("waterBillingSettings")) || { currency: "PHP" };
        const elements = document.querySelectorAll(".currencySymbol");
        elements.forEach(el => el.textContent = settings.currency);
    }

    function printBill(customer) {
        const billWindow = window.open("", "_blank");
        billWindow.document.write("<html><head><title>Water Bill</title></head><body>");
        billWindow.document.write(`<h2>Water Bill for ${customer.name}</h2>`);
        billWindow.document.write(`<p>Previous Reading: ${customer.previousReading}</p>`);
        billWindow.document.write(`<p>Current Reading: ${customer.currentReading}</p>`);
        billWindow.document.write(`<p>Consumption: ${customer.consumption} cubic meters</p>`);
        billWindow.document.write(`<p>Total Due: ${customer.totalDue} ${getSettings().currency}</p>`);
        billWindow.document.write("</body></html>");
        billWindow.document.close();
        billWindow.print();
    }

    function getSettings() {
        const stored = localStorage.getItem("waterBillingSettings");
        return stored ? JSON.parse(stored) : { pricePerCubic: 10, minCharge: 50, currency: "PHP" };
    }

    function alertMessage(msg) {
        alert(msg);
    }

    return {
        showSection,
        updateCurrencySymbol,
        printBill,
        alertMessage
    };
})();
