// Customers.js
const Customers = (() => {
    const STORAGE_KEY = "waterCustomers";

    function getCustomers() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveCustomers(customers) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    }

    function addCustomer(name) {
        if (!name || name.trim() === "") {
            UI.alertMessage("Please enter customer name");
            return;
        }

        const customers = getCustomers();
        if (customers.find(c => c.name.toLowerCase() === name.toLowerCase())) {
            UI.alertMessage("Customer already exists!");
            return;
        }

        const newCustomer = {
            id: Date.now(),
            name: name.trim(),
            createdAt: new Date().toISOString()
        };

        customers.push(newCustomer);
        saveCustomers(customers);

        UI.alertMessage("Customer added successfully");
        return newCustomer;
    }

    function deleteCustomer(customerId) {
        if (!customerId) return;

        const confirmDelete = confirm("Delete this customer and all their bills?");
        if (!confirmDelete) return;

        const customers = getCustomers().filter(c => c.id !== customerId);
        saveCustomers(customers);

        // Delete associated bills
        const bills = Billing.getBills().filter(b => b.customerId !== customerId);
        Billing.saveBills(bills);

        UI.alertMessage("Customer and their bills deleted successfully");
    }

    function getCustomerById(id) {
        return getCustomers().find(c => c.id === id);
    }

    return {
        getCustomers,
        saveCustomers,
        addCustomer,
        deleteCustomer,
        getCustomerById
    };
})();
