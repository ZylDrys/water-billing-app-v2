// ============================================
// BALANCE.JS - Balance Sheet Management
// ============================================

// === DATA HELPERS ===
function getBalanceSheetData() {
  try {
    return JSON.parse(localStorage.getItem('water_balance_sheet') || '{}');
  } catch (e) {
    return {};
  }
}

function saveBalanceSheetData(d) {
  localStorage.setItem('water_balance_sheet', JSON.stringify(d));
  scheduleSync();
}

// === ADD ENTRY ===
function addBsEntry(type) {
  var nameId, amtId;

  if (type === 'asset') {
    nameId = 'bsAssetName';
    amtId = 'bsAssetAmount';
  } else if (type === 'liability') {
    nameId = 'bsLiabilityName';
    amtId = 'bsLiabilityAmount';
  } else {
    nameId = 'bsEquityName';
    amtId = 'bsEquityAmount';
  }

  var nameEl = document.getElementById(nameId);
  var amtEl = document.getElementById(amtId);

  if (!nameEl || !amtEl) return;

  var name = autoCapitalize(nameEl.value.trim());
  var amt = parseFloat(amtEl.value);

  if (!name || isNaN(amt) || amt <= 0) {
    alert('Enter valid name and amount');
    return;
  }

  var data = getBalanceSheetData();
  if (!data.assets) data.assets = [];
  if (!data.liabilities) data.liabilities = [];
  if (!data.equity) data.equity = [];

  var entry = {
    id: Date.now(),
    name: name,
    amount: amt,
    date: new Date().toISOString()
  };

  if (type === 'asset') data.assets.push(entry);
  else if (type === 'liability') data.liabilities.push(entry);
  else data.equity.push(entry);

  saveBalanceSheetData(data);
  nameEl.value = '';
  amtEl.value = '';
  renderBalanceSheet();
}

// === DELETE ENTRY ===
function deleteBsEntry(type, id) {
  if (!confirm('Delete this entry?')) return;

  var data = getBalanceSheetData();

  if (type === 'asset') {
    data.assets = (data.assets || []).filter(function (x) { return x.id !== id });
  } else if (type === 'liability') {
    data.liabilities = (data.liabilities || []).filter(function (x) { return x.id !== id });
  } else {
    data.equity = (data.equity || []).filter(function (x) { return x.id !== id });
  }

  saveBalanceSheetData(data);
  renderBalanceSheet();
}

// === EDIT ENTRY ===
function editBsEntry(type, id) {
  var data = getBalanceSheetData();
  var list;

  if (type === 'asset') list = data.assets || [];
  else if (type === 'liability') list = data.liabilities || [];
  else list = data.equity || [];

  var entry = list.find(function (x) { return x.id === id });
  if (!entry) return;

  showPromptModal('New amount for "' + entry.name + '":', false).then(function (v) {
    if (!v) return;
    var newAmt = parseFloat(v);
    if (isNaN(newAmt) || newAmt <= 0) { alert('Invalid amount'); return; }

    entry.amount = newAmt;
    saveBalanceSheetData(data);
    renderBalanceSheet();
  });
}

// === RENDER LIST HELPER ===
function renderBsList(items, type, elId) {
  var el = document.getElementById(elId);
  if (!el) return;

  if (!items || !items.length) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px">None added yet</p>';
    return;
  }

  el.innerHTML = items.map(function (x) {
    var dateStr = x.date ? new Date(x.date).toLocaleDateString() : '';

    return '<div style="padding:8px;border:1px solid var(--bg-card-border);border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center">' +
      '<div>' +
      '<strong>' + x.name + '</strong>' +
      (dateStr ? '<br><small style="color:var(--text-muted)">' + dateStr + '</small>' : '') +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
      '<span style="font-weight:600">' + formatMoney(x.amount) + '</span>' +
      '<button onclick="editBsEntry(\'' + type + '\',' + x.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:#17a2b8;margin:0" title="Edit">✏</button>' +
      '<button onclick="deleteBsEntry(\'' + type + '\',' + x.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:var(--bg-danger);margin:0" title="Delete">✕</button>' +
      '</div></div>';
  }).join('');
}

// === RENDER BALANCE SHEET ===
function renderBalanceSheet() {
  var data = getBalanceSheetData();
  var assets = data.assets || [];
  var liabilities = data.liabilities || [];
  var equity = data.equity || [];

  // Render each section list
  renderBsList(assets, 'asset', 'bsAssetsList');
  renderBsList(liabilities, 'liability', 'bsLiabilitiesList');
  renderBsList(equity, 'equity', 'bsEquityList');

  // Calculate totals
  var ta = 0, tl = 0, te = 0;
  assets.forEach(function (x) { ta += x.amount });
  liabilities.forEach(function (x) { tl += x.amount });
  equity.forEach(function (x) { te += x.amount });

  var lePlusE = tl + te;
  var diff = ta - lePlusE;
  var isBalanced = Math.abs(diff) < 0.01;

  // Render summary
  var sm = document.getElementById('bsSummary');
  if (!sm) return;

  sm.innerHTML =
    '<div style="padding:15px;background:var(--bg-table-even);border-radius:8px;border:1px solid var(--bg-card-border)">' +

    // Total Assets
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
    '<span>Total Assets:</span>' +
    '<strong>' + formatMoney(ta) + '</strong>' +
    '</div>' +

    // Total Liabilities
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
    '<span>Total Liabilities:</span>' +
    '<strong style="color:#dc3545">' + formatMoney(tl) + '</strong>' +
    '</div>' +

    // Total Equity
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
    '<span>Total Equity:</span>' +
    '<strong style="color:#28a745">' + formatMoney(te) + '</strong>' +
    '</div>' +

    // L + E total
    '<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:2px solid var(--bg-card-border)">' +
    '<span style="font-weight:900">Liabilities + Equity:</span>' +
    '<strong>' + formatMoney(lePlusE) + '</strong>' +
    '</div>' +

    // Balance check
    '<div style="font-size:12px;margin-top:8px;padding:6px;border-radius:4px;text-align:center;' +
    (isBalanced
      ? 'background:rgba(40,167,69,.08);color:#28a745">' +
        '✅ Balanced — Assets equal Liabilities + Equity'
      : 'background:rgba(220,53,69,.08);color:#dc3545">' +
        '⚠ Not Balanced — Difference: ' + formatMoney(diff)) +
    '</div>' +

    '</div>';
}

// === EXPORT ===
function exportBalanceSheet() {
  var data = getBalanceSheetData();

  var rows = [
    ['Balance Sheet'],
    ['Generated: ' + new Date().toLocaleDateString()],
    [''],
    ['ASSETS'],
    ['Name', 'Amount', 'Date Added']
  ];

  var ta = 0;
  (data.assets || []).forEach(function (x) {
    rows.push([x.name, x.amount, x.date ? x.date.split('T')[0] : '']);
    ta += x.amount;
  });
  rows.push(['Total Assets', ta, '']);

  rows.push(['']);
  rows.push(['LIABILITIES']);
  rows.push(['Name', 'Amount', 'Date Added']);

  var tl = 0;
  (data.liabilities || []).forEach(function (x) {
    rows.push([x.name, x.amount, x.date ? x.date.split('T')[0] : '']);
    tl += x.amount;
  });
  rows.push(['Total Liabilities', tl, '']);

  rows.push(['']);
  rows.push(['EQUITY']);
  rows.push(['Name', 'Amount', 'Date Added']);

  var te = 0;
  (data.equity || []).forEach(function (x) {
    rows.push([x.name, x.amount, x.date ? x.date.split('T')[0] : '']);
    te += x.amount;
  });
  rows.push(['Total Equity', te, '']);

  rows.push(['']);
  rows.push(['SUMMARY']);
  rows.push(['Total Assets', ta]);
  rows.push(['Total Liabilities + Equity', tl + te]);
  rows.push(['Difference', ta - (tl + te)]);
  rows.push(['Status', Math.abs(ta - (tl + te)) < 0.01 ? 'BALANCED' : 'NOT BALANCED']);

  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
  XLSX.writeFile(wb, 'balance-sheet-' + new Date().toISOString().split('T')[0] + '.xlsx');
}
