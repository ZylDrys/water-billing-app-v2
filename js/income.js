// ============================================
// INCOME.JS - Income Statement (Income vs Expense)
// ============================================

// === DATA HELPERS ===
function getIncomeStatementData() {
  try {
    return JSON.parse(localStorage.getItem('water_income_statement') || '{}');
  } catch (e) {
    return {};
  }
}

function saveIncomeStatementData(d) {
  localStorage.setItem('water_income_statement', JSON.stringify(d));
  scheduleSync();
}

// === ADD ENTRY ===
function addIsEntry2(type) {
  var nameEl = document.getElementById(type === 'income' ? 'isIncomeName2' : 'isExpenseName2');
  var amtEl = document.getElementById(type === 'income' ? 'isIncomeAmount2' : 'isExpenseAmount2');

  var name = autoCapitalize(nameEl.value.trim());
  var amt = parseFloat(amtEl.value);

  if (!name || isNaN(amt) || amt <= 0) {
    alert('Enter valid name and amount');
    return;
  }

  var data = getIncomeStatementData();
  if (!data.income) data.income = [];
  if (!data.expenses) data.expenses = [];

  var entry = {
    id: Date.now(),
    name: name,
    amount: amt,
    date: new Date().toISOString()
  };

  if (type === 'income') {
    data.income.push(entry);
  } else {
    data.expenses.push(entry);
  }

  saveIncomeStatementData(data);
  nameEl.value = '';
  amtEl.value = '';
  renderIncomeStatement();
}

// === DELETE ENTRY ===
function deleteIsEntry2(type, id) {
  if (!confirm('Delete?')) return;

  var data = getIncomeStatementData();
  if (type === 'income') {
    data.income = (data.income || []).filter(function (x) { return x.id !== id });
  } else {
    data.expenses = (data.expenses || []).filter(function (x) { return x.id !== id });
  }

  saveIncomeStatementData(data);
  renderIncomeStatement();
}

// === RENDER ===
function renderIncomeStatement() {
  var data = getIncomeStatementData();
  var incomes = data.income || [];
  var expenses = data.expenses || [];

  // Auto-include bill revenue
  var bills = getData('bills');
  var billRevenue = 0;
  bills.forEach(function (b) { billRevenue += (b.amountPaid || 0) });

  // Calculate totals
  var totalIncome = billRevenue;
  incomes.forEach(function (x) { totalIncome += x.amount });
  var totalExpense = 0;
  expenses.forEach(function (x) { totalExpense += x.amount });
  var net = totalIncome - totalExpense;

  // Render income list
  var il = document.getElementById('isIncomeList2');
  if (il) {
    var ih = '<div style="padding:8px;background:rgba(40,167,69,.08);border-radius:6px;margin-bottom:5px">' +
      '<div style="font-size:11px;color:#28a745">💰 Bill Collections (auto)</div>' +
      '<div style="font-weight:700">' + formatMoney(billRevenue) + '</div></div>';

    if (incomes.length) {
      ih += incomes.map(function (x) {
        return '<div style="padding:8px;border:1px solid var(--bg-card-border);border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center">' +
          '<div><strong>' + x.name + '</strong><br><small style="color:var(--text-muted)">' + new Date(x.date).toLocaleDateString() + '</small></div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
          '<strong style="color:#28a745">' + formatMoney(x.amount) + '</strong>' +
          '<button onclick="deleteIsEntry2(\'income\',' + x.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:var(--bg-danger);margin:0">✕</button>' +
          '</div></div>';
      }).join('');
    }
    il.innerHTML = ih;
  }

  // Render expenses list
  var el = document.getElementById('isExpensesList2');
  if (el) {
    if (expenses.length) {
      el.innerHTML = expenses.map(function (x) {
        return '<div style="padding:8px;border:1px solid var(--bg-card-border);border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center">' +
          '<div><strong>' + x.name + '</strong><br><small style="color:var(--text-muted)">' + new Date(x.date).toLocaleDateString() + '</small></div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
          '<strong style="color:#dc3545">' + formatMoney(x.amount) + '</strong>' +
          '<button onclick="deleteIsEntry2(\'expense\',' + x.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:var(--bg-danger);margin:0">✕</button>' +
          '</div></div>';
      }).join('');
    } else {
      el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px">No expenses</p>';
    }
  }

  // Render summary
  var sm = document.getElementById('isSummary2');
  if (sm) {
    var netLabel = net >= 0 ? 'Profit' : 'Loss';
    var netColor = net >= 0 ? '#28a745' : '#dc3545';

    sm.innerHTML = '<div style="padding:15px;background:var(--bg-table-even);border-radius:8px;border:1px solid var(--bg-card-border)">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
      '<span>Total Income:</span><strong style="color:#28a745">' + formatMoney(totalIncome) + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
      '<span>Total Expenses:</span><strong style="color:#dc3545">' + formatMoney(totalExpense) + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:2px solid var(--bg-card-border)">' +
      '<span style="font-weight:900">Net ' + netLabel + ':</span>' +
      '<strong style="color:' + netColor + ';font-size:18px">' + formatMoney(Math.abs(net)) + '</strong></div></div>';
  }
}

// === EXPORT ===
function exportIncomeStatement() {
  var data = getIncomeStatementData();
  var bills = getData('bills');

  // Calculate bill revenue
  var billRevenue = 0;
  bills.forEach(function (b) { billRevenue += (b.amountPaid || 0) });

  // Build rows
  var rows = [
    ['Income Statement'],
    ['Generated: ' + new Date().toLocaleDateString()],
    [''],
    ['INCOME'],
    ['Bill Collections (auto)', '', billRevenue]
  ];

  var totalIncome = billRevenue;
  (data.income || []).forEach(function (x) {
    rows.push([x.name, x.date ? x.date.split('T')[0] : '', x.amount]);
    totalIncome += x.amount;
  });
  rows.push(['Total Income', '', totalIncome]);

  rows.push(['']);
  rows.push(['EXPENSES']);

  var totalExpense = 0;
  (data.expenses || []).forEach(function (x) {
    rows.push([x.name, x.date ? x.date.split('T')[0] : '', x.amount]);
    totalExpense += x.amount;
  });
  rows.push(['Total Expenses', '', totalExpense]);

  rows.push(['']);
  var net = totalIncome - totalExpense;
  rows.push(['NET ' + (net >= 0 ? 'PROFIT' : 'LOSS'), '', net]);

  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');
  XLSX.writeFile(wb, 'income-statement-' + new Date().toISOString().split('T')[0] + '.xlsx');
}
