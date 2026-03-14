// Storage.js
const Storage = (() => {
    const BILLS_KEY = "waterBillingApp_bills";
    const CUSTOMERS_KEY = "waterBillingApp_customers";
    const SETTINGS_KEY = "waterBillingApp_settings";

    // Bills
    function getBills() {
        const data = localStorage.getItem(BILLS_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveBills(bills) {
        localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
    }

    // Customers
    function getCustomers() {
        const data = localStorage.getItem(CUSTOMERS_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveCustomers(customers) {
        localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    }

    // Settings
    function getSettings() {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? JSON.parse(data) : { currency: "₱" };
    }

    function saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    // Clear all data (optional)
    function clearAll() {
        localStorage.removeItem(BILLS_KEY);
        localStorage.removeItem(CUSTOMERS_KEY);
        localStorage.removeItem(SETTINGS_KEY);
    }

    return {
        getBills,
        saveBills,
        getCustomers,
        saveCustomers,
        getSettings,
        saveSettings,
        clearAll
    };
})();
