// History.js
const History = (() => {

    function loadHistory(sortBy = "date", order = "desc", customerFilter = "all", searchTerm = "") {
        let bills = Billing.getBills();
        const customers = Customers.getCustomers();

        // Filter by customer
        if (customerFilter !== "all") {
            bills = bills.filter(b => b.customerId === parseInt(customerFilter));
        }

        // Apply search
        if (searchTerm) {
            bills = bills.filter(bill => {
                const customer = customers.find(c => c.id === bill.customerId);
                const customerName = customer ? customer.name.toLowerCase() : "";
                const dateStr = new Date(bill.date).toLocaleDateString().toLowerCase();
                return customerName.includes(searchTerm.toLowerCase()) || dateStr.includes(searchTerm.toLowerCase());
            });
        }

        // Apply sorting
        bills.sort((a, b) => {
            if (sortBy === "date") {
                return order === "asc"
                    ? new Date(a.date) - new Date(b.date)
                    : new Date(b.date) - new Date(a.date);
            } else if (sortBy === "amount") {
                return order === "asc" ? a.totalDue - b.totalDue : b.totalDue - a.totalDue;
            }
            return 0;
        });

        return bills;
    }

    function renderHistory(containerId, bills) {
        const container = document.getElementById(containerId);
        const customers = Customers.getCustomers();
        const settings = Storage.getSettings();

        if (!container) return;

        if (bills.length === 0) {
            container.innerHTML =
                '<p style="padding:20px; text-align:center; color:#666;">No bills found.</p>';
            return;
        }

        container.innerHTML = bills
            .map(bill => {
                const customer = customers.find(c => c.id === bill.customerId);
                const customerName = customer ? customer.name : "Unknown";
                const formattedAmount = UI.formatMoney(bill.totalDue, settings.currency);

                return `
                <div style="padding:15px; border:1px solid #eee; margin:10px 0; border-radius:8px;">
                    <strong>${customerName}</strong> • ${new Date(bill.date).toLocaleDateString()}<br>
                    Prev: ${bill.prevReading} → Pres: ${bill.presReading} = ${bill.totalUsed} m³<br>
                    <strong>Total Due: ${formattedAmount}</strong><br>
                    <div style="margin-top:10px;">
                        <button onclick="Billing.printBillById(${bill.id})" style="padding:5px 10px; font-size:12px;">🖨️ Print</button>
                        <button onclick="Billing.deleteBill(${bill.id}); History.refresh('${containerId}')" style="padding:5px 10px; font-size:12px; background:#dc3545;">🗑️ Delete</button>
                    </div>
                </div>`;
            })
            .join("");
    }

    function refresh(containerId) {
        const searchTerm = document.getElementById("historySearch")?.value || "";
        const customerFilter = document.getElementById("historyFilter")?.value || "all";
        const bills = loadHistory("date", "desc", customerFilter, searchTerm);
        renderHistory(containerId, bills);
    }

    return {
        loadHistory,
        renderHistory,
        refresh
    };
})();
