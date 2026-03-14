// Billing.js
const Billing = (() => {
    const STORAGE_KEY = "waterBills";

    function getBills() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveBills(bills) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    }

    function calculateTotal(prevReading, currReading) {
        const settings = UI.getSettings();
        const usage = currReading - prevReading;
        if (usage <= 0) return settings.minCharge;
        return usage * settings.pricePerCubic;
    }

    function createBill(customerId, prevReading, currReading, date) {
        if (!customerId) {
            UI.alertMessage("Please select a customer");
            return;
        }
        if (currReading === undefined || currReading === null) {
            UI.alertMessage("Please enter present reading");
            return;
        }

        const totalDue = calculateTotal(prevReading, currReading);
        const bill = {
            id: Date.now(),
            customerId,
            prevReading,
            currReading,
            totalUsed: Math.max(0, currReading - prevReading),
            totalDue,
            date: date || new Date().toISOString()
        };

        const bills = getBills();
        bills.push(bill);
        saveBills(bills);

        return bill;
    }

    function deleteBill(billId) {
        let bills = getBills();
        bills = bills.filter(b => b.id !== billId);
        saveBills(bills);
        UI.alertMessage("Bill deleted successfully");
    }

    function getBillsByCustomer(customerId) {
        return getBills().filter(b => b.customerId === customerId);
    }

    return {
        getBills,
        saveBills,
        createBill,
        deleteBill,
        calculateTotal,
        getBillsByCustomer
    };
})();
