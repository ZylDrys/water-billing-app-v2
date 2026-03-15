// Billing.js

export const Billing = (() => {

    function getBills() {
        return Storage.getBills();
    }


    function saveBills(bills) {
        Storage.saveBills(bills);
    }


    function calculateTotal(prevReading, presReading) {

        const settings = Storage.getSettings();

        const usage = presReading - prevReading;

        if (usage <= 0) {
            return settings.minCharge;
        }

        return usage * settings.pricePerCubic;

    }


    function createBill(customerId, prevReading, presReading, date) {

        if (!customerId) {
            UI.alertMessage("Please select a customer");
            return;
        }

        if (presReading === undefined || presReading === null) {
            UI.alertMessage("Please enter present reading");
            return;
        }

        if (presReading < prevReading) {
            UI.alertMessage("Present reading cannot be less than previous reading");
            return;
        }


        const bills = getBills();

        const totalUsed = presReading - prevReading;

        const totalDue = calculateTotal(prevReading, presReading);


        const bill = {

            id: Date.now(),
            customerId,
            prevReading,
            presReading,
            totalUsed,
            totalDue,
            date: date || new Date().toISOString()

        };


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
