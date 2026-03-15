// Storage.js

export const Storage = (() => {

    const BILLS_KEY = "waterBillingApp_bills";
    const CUSTOMERS_KEY = "waterBillingApp_customers";
    const SETTINGS_KEY = "waterBillingApp_settings";


    /* Safe JSON parser */
    function safeParse(data, fallback) {
        try {
            return JSON.parse(data);
        } catch (error) {
            console.warn("Storage parse error:", error);
            return fallback;
        }
    }


    /* Bills */
    function getBills() {
        const data = localStorage.getItem(BILLS_KEY);
        return data ? safeParse(data, []) : [];
    }

    function saveBills(bills) {
        localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
    }


    /* Customers */
    function getCustomers() {
        const data = localStorage.getItem(CUSTOMERS_KEY);
        return data ? safeParse(data, []) : [];
    }

    function saveCustomers(customers) {
        localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    }


    /* Settings */
    function getSettings() {

        const defaultSettings = {
            currency: "₱",
            pricePerCubic: 10,
            minCharge: 50
        };

        const data = localStorage.getItem(SETTINGS_KEY);

        return data ? { ...defaultSettings, ...safeParse(data, {}) } : defaultSettings;
    }

    function saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }


    /* Clear everything */
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
