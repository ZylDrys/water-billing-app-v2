// ============================================
// INCOME.JS - Income Statement (Income vs Expense)
// ============================================

// === DATA HELPERS ===
function getIncomeStatementData() {
  try {
    return JSON.parse(localStorage.getItem(INCOME_STATEMENT_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveIncomeStatementData(d) {
  localStorage.setItem(INCOME_STATEMENT_KEY, JSON.stringify(d));
  if (typeof scheduleSync === 'function') scheduleSync();
}

// === ADD ENTRY ===
function addIsEntry2(type) {
  var nameId = type === 'income' ? 'isIncomeName2' : 'isExpenseName2';
  var amtId = type === 'income' ? 'isIncomeAmount2' : 'isExpenseAmount2';

  var nameEl = document.getElementById(nameId);
  var amtEl = document.getElementById(amtId);
  if (!nameEl || !amtEl) return;

  var name = autoCapitalize(nameEl.value.trim());
  var amt = parseFloat(amtEl.value);

  if (!name) {
    alert('Please enter a ' + (type === 'income' ? 'income source' : 'expense') + ' name');
    nameEl.focus();
    return;
  }

  if (name.length < 2) {
    alert('Name must be at least 2 characters');
    nameEl.focus();
    return;
  }

  if (isNaN(amt) || amt <= 0) {
    alert('Please enter a valid positive amount');
    amtEl.focus();
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
  var data = getIncomeStatementData();
  var list = type === 'income' ? (data.income || []) : (data.expenses || []);
  var entry = list.find(function (x) { return x.id === id; });
  var entryName = entry ? entry.name : 'this entry';

  if (!confirm('Delete "' + entryName + '"?')) return;

  if (type === 'income') {
    data.income = list.filter(function (x) { return x.id !== id; });
  } else {
    data.expenses = (data.expenses || []).filter(function (x) { return x.id !== id; });
  }

  saveIncomeStatementData(data);
  renderIncomeStatement();
}

// === EDIT ENTRY ===
function editIsEntry2(type, id) {
  var data = getIncomeStatementData();
  var list = type === 'income' ? (data.income || []) : (data.expenses || []);
  var entry = list.find(function (x) { return x.id === id; });
  if (!entry) return;

  showPromptModal('New amount for "' + entry.name + '":', false).then(function (v) {
    if (!v) return;
    var newAmt = parseFloat(v);

    if (isNaN(newAmt) || newAmt <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    entry.amount = newAmt;
    saveIncomeStatementData(data);
    renderIncomeStatement();
  });
}

// === BUILD ENTRY CARD ===
function buildIsEntryCard(entry, type, color) {
  var dateStr = entry.date ? new Date(entry.date).toLocaleDateString() : '';

  return '<div style="padding:8px;border:1px solid var(--bg-card-border);border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center">' +
    '<div>' +
    '<strong>' + entry.name + '</strong>' +
    (dateStr ? '<br><small style="color:var(--text-muted)">' + dateStr + '</small>' : '') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px">' +
    '<strong style="color:' + color + '">' + formatMoney(entry.amount) + '</strong>' +
    '<button onclick="editIsEntry2(\'' + type + '\',' + entry.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:#17a2b8;margin:0" title="Edit amount">✏</button>' +
    '<button onclick="deleteIsEntry2(\'' + type + '\',' + entry.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:var(--bg-danger);margin:0" title="Delete">✕</button>' +
    '</div></div>';
}

// === CALCULATE BILL REVENUE ===
function calculateBillRevenue() {
  var bills = getData('bills');
  var revenue = 0;
  bills.forEach(function (b) {
    revenue += (b.amountPaid || 0);
  });
  return revenue;
}

// === RENDER ===
function renderIncomeStatement() {
  var data = getIncomeStatementData();
  var incomes = data.income || [];
  var expenses = data.expenses || [];

  // Auto-include bill revenue
  var billRevenue = calculateBillRevenue();

  // Calculate totals
  var manualIncome = 0;
  incomes.forEach(function (x) { manualIncome += x.amount; });
  var totalIncome = billRevenue + manualIncome;

  var totalExpense = 0;
  expenses.forEach(function (x) { totalExpense += x.amount; });

  var net = totalIncome - totalExpense;
  var margin = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  // === Render income list ===
  var il = document.getElementById('isIncomeList2');
  if (il) {
    var incomeHtml = '';

    // Auto bill collections card
    incomeHtml += '<div style="padding:8px;background:rgba(40,167,69,.08);border-radius:6px;margin-bottom:5px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<div><div style="font-size:11px;color:#28a745;font-weight:600">💰 Bill Collections (auto)</div>' +
      '<small style="color:var(--text-muted)">From all paid/partial bills</small></div>' +
      '<strong style="color:#28a745">' + formatMoney(billRevenue) + '</strong>' +
      '</div></div>';

    // Manual income entries
    if (incomes.length) {
      incomeHtml += incomes.map(function (x) {
        return buildIsEntryCard(x, 'income', '#28a745');
      }).join('');
    }

    // Count
    incomeHtml += '<div style="text-align:right;font-size:11px;color:var(--text-muted);margin-top:4px">' +
      (incomes.length ? incomes.length + ' manual source(s)' : 'No manual income added') +
      '</div>';

    il.innerHTML = incomeHtml;
  }

  // === Render expenses list ===
  var el = document.getElementById('isExpensesList2');
  if (el) {
    if (expenses.length) {
      el.innerHTML = expenses.map(function (x) {
        return buildIsEntryCard(x, 'expense', '#dc3545');
      }).join('') +
        '<div style="text-align:right;font-size:11px;color:var(--text-muted);margin-top:4px">' +
        expenses.length + ' expense(s)' +
        '</div>';
    } else {
      el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:10px">' +
        'No expenses recorded yet.<br><small>Add expenses like electricity, maintenance, salary, etc.</small></p>';
    }
  }

  // === Render summary ===
  var sm = document.getElementById('isSummary2');
  if (sm) {
    var netLabel = net >= 0 ? 'Net Profit' : 'Net Loss';
    var netColor = net >= 0 ? '#28a745' : '#dc3545';
    var netIcon = net >= 0 ? '📈' : '📉';

    sm.innerHTML = '<div style="padding:15px;background:var(--bg-table-even);border-radius:8px;border:1px solid var(--bg-card-border)">' +

      // Total Income row
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
      '<span>💰 Total Income:</span>' +
      '<strong style="color:#28a745">' + formatMoney(totalIncome) + '</strong></div>' +

      // Income breakdown
      '<div style="font-size:11px;color:var(--text-muted);margin:-4px 0 8px 20px">' +
      'Bills: ' + formatMoney(billRevenue) +
      (manualIncome > 0 ? ' + Manual: ' + formatMoney(manualIncome) : '') +
      '</div>' +

      // Total Expense row
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
      '<span>📉 Total Expenses:</span>' +
      '<strong style="color:#dc3545">' + formatMoney(totalExpense) + '</strong></div>' +

      // Net result
      '<div style="display:flex;justify-content:space-between;padding-top:10px;border-top:2px solid var(--bg-card-border);align-items:center">' +
      '<span style="font-weight:900">' + netIcon + ' ' + netLabel + ':</span>' +
      '<div style="text-align:right">' +
      '<strong style="color:' + netColor + ';font-size:18px">' + formatMoney(Math.abs(net)) + '</strong>' +
      (totalIncome > 0
        ? '<br><small style="color:' + netColor + '">' + margin + '% margin</small>'
        : '') +
      '</div></div>' +

      // Visual indicator
      '<div style="margin-top:10px;padding:6px;border-radius:4px;text-align:center;font-size:12px;' +
      (net >= 0
        ? 'background:rgba(40,167,69,.08);color:#28a745">✅ Business is profitable'
        : 'background:rgba(220,53,69,.08);color:#dc3545">⚠ Expenses exceed income') +
      '</div></div>';
  }
}

// === EXPORT ===
function exportIncomeStatement() {
  var data = getIncomeStatementData();
  var billRevenue = calculateBillRevenue();

  // Build rows
  var rows = [
    ['Income Statement'],
    ['Generated: ' + new Date().toLocaleDateString()],
    [''],
    ['INCOME'],
    ['Source', 'Date', 'Amount']
  ];

  // Bill collections
  rows.push(['Bill Collections (auto)', '', billRevenue]);
  var totalIncome = billRevenue;

  // Manual income
  (data.income || []).forEach(function (x) {
    rows.push([x.name, x.date ? x.date.split('T')[0] : '', x.amount]);
    totalIncome += x.amount;
  });
  rows.push(['', '', '']);
  rows.push(['Total Income', '', totalIncome]);

  // Expenses
  rows.push(['']);
  rows.push(['EXPENSES']);
  rows.push(['Name', 'Date', 'Amount']);

  var totalExpense = 0;
  (data.expenses || []).forEach(function (x) {
    rows.push([x.name, x.date ? x.date.split('T')[0] : '', x.amount]);
    totalExpense += x.amount;
  });
  rows.push(['', '', '']);
  rows.push(['Total Expenses', '', totalExpense]);

  // Summary
  var net = totalIncome - totalExpense;
  var margin = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  rows.push(['']);
  rows.push(['SUMMARY']);
  rows.push(['Total Income', '', totalIncome]);
  rows.push(['Total Expenses', '', totalExpense]);
  rows.push(['Net ' + (net >= 0 ? 'Profit' : 'Loss'), '', net]);
  rows.push(['Profit Margin', '', margin + '%']);

  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');
  XLSX.writeFile(wb, 'income-statement-' + new Date().toISOString().split('T')[0] + '.xlsx');
}
