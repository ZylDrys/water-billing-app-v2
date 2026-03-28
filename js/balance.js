// ============================================
// BALANCE.JS - Balance Sheet Management
// ============================================

// === DATA HELPERS ===
function getBalanceSheetData() {
  try {
    return JSON.parse(localStorage.getItem(BALANCE_SHEET_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveBalanceSheetData(d) {
  localStorage.setItem(BALANCE_SHEET_KEY, JSON.stringify(d));
  if (typeof scheduleSync === 'function') scheduleSync();
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

  var typeLabel = type === 'asset' ? 'asset' : type === 'liability' ? 'liability' : 'equity';

  if (!name) {
    alert('Please enter a ' + typeLabel + ' name');
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
  var data = getBalanceSheetData();
  var list;

  if (type === 'asset') list = data.assets || [];
  else if (type === 'liability') list = data.liabilities || [];
  else list = data.equity || [];

  var entry = list.find(function (x) { return x.id === id; });
  var entryName = entry ? entry.name : 'this entry';
  var entryAmount = entry ? ' (' + formatMoney(entry.amount) + ')' : '';

  if (!confirm('Delete "' + entryName + '"' + entryAmount + '?')) return;

  if (type === 'asset') {
    data.assets = list.filter(function (x) { return x.id !== id; });
  } else if (type === 'liability') {
    data.liabilities = (data.liabilities || []).filter(function (x) { return x.id !== id; });
  } else {
    data.equity = (data.equity || []).filter(function (x) { return x.id !== id; });
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

  var entry = list.find(function (x) { return x.id === id; });
  if (!entry) return;

  showPromptModal('New amount for "' + entry.name + '" (current: ' + formatMoney(entry.amount) + '):', false).then(function (v) {
    if (!v) return;
    var newAmt = parseFloat(v);

    if (isNaN(newAmt) || newAmt <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    entry.amount = newAmt;
    saveBalanceSheetData(data);
    renderBalanceSheet();
  });
}

// === BUILD ENTRY CARD ===
function buildBsEntryCard(entry, type) {
  var dateStr = entry.date ? new Date(entry.date).toLocaleDateString() : '';

  return '<div style="padding:8px;border:1px solid var(--bg-card-border);border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center">' +
    '<div>' +
    '<strong>' + entry.name + '</strong>' +
    (dateStr ? '<br><small style="color:var(--text-muted)">' + dateStr + '</small>' : '') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px">' +
    '<span style="font-weight:600">' + formatMoney(entry.amount) + '</span>' +
    '<button onclick="editBsEntry(\'' + type + '\',' + entry.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:#17a2b8;margin:0" title="Edit amount">✏</button>' +
    '<button onclick="deleteBsEntry(\'' + type + '\',' + entry.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:var(--bg-danger);margin:0" title="Delete">✕</button>' +
    '</div></div>';
}

// === RENDER LIST ===
function renderBsList(items, type, elId, emptyHint) {
  var el = document.getElementById(elId);
  if (!el) return;

  if (!items || !items.length) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:10px">' +
      'No ' + type + 's added yet.' +
      (emptyHint ? '<br><small>' + emptyHint + '</small>' : '') +
      '</p>';
    return;
  }

  // Calculate section total
  var sectionTotal = 0;
  items.forEach(function (x) { sectionTotal += x.amount; });

  el.innerHTML = items.map(function (x) {
    return buildBsEntryCard(x, type);
  }).join('') +
    '<div style="text-align:right;font-size:11px;color:var(--text-muted);margin-top:4px">' +
    items.length + ' item(s) • Total: ' + formatMoney(sectionTotal) +
    '</div>';
}

// === RENDER BALANCE SHEET ===
function renderBalanceSheet() {
  var data = getBalanceSheetData();
  var assets = data.assets || [];
  var liabilities = data.liabilities || [];
  var equity = data.equity || [];

  // Render each section with helpful hints
  renderBsList(assets, 'asset', 'bsAssetsList', 'e.g. Cash, Equipment, Land, Vehicles');
  renderBsList(liabilities, 'liability', 'bsLiabilitiesList', 'e.g. Loans, Accounts Payable');
  renderBsList(equity, 'equity', 'bsEquityList', 'e.g. Owner\'s Capital, Retained Earnings');

  // Calculate totals
  var ta = 0, tl = 0, te = 0;
  assets.forEach(function (x) { ta += x.amount; });
  liabilities.forEach(function (x) { tl += x.amount; });
  equity.forEach(function (x) { te += x.amount; });

  var lePlusE = tl + te;
  var diff = ta - lePlusE;
  var isBalanced = Math.abs(diff) < 0.01;

  // Render summary
  var sm = document.getElementById('bsSummary');
  if (!sm) return;

  sm.innerHTML = '<div style="padding:15px;background:var(--bg-table-even);border-radius:8px;border:1px solid var(--bg-card-border)">' +

    // Total Assets
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
    '<span>📊 Total Assets (' + assets.length + '):</span>' +
    '<strong>' + formatMoney(ta) + '</strong>' +
    '</div>' +

    // Total Liabilities
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
    '<span>📉 Total Liabilities (' + liabilities.length + '):</span>' +
    '<strong style="color:#dc3545">' + formatMoney(tl) + '</strong>' +
    '</div>' +

    // Total Equity
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
    '<span>🏦 Total Equity (' + equity.length + '):</span>' +
    '<strong style="color:#28a745">' + formatMoney(te) + '</strong>' +
    '</div>' +

    // L + E total
    '<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:2px solid var(--bg-card-border)">' +
    '<span style="font-weight:900">Liabilities + Equity:</span>' +
    '<strong>' + formatMoney(lePlusE) + '</strong>' +
    '</div>' +

    // Balance check
    '<div style="margin-top:10px;padding:8px;border-radius:4px;text-align:center;font-size:12px;' +
    (isBalanced
      ? 'background:rgba(40,167,69,.08);color:#28a745">' +
        '✅ Balanced — Assets (' + formatMoney(ta) + ') = Liabilities + Equity (' + formatMoney(lePlusE) + ')'
      : 'background:rgba(220,53,69,.08);color:#dc3545">' +
        '⚠ Not Balanced — Difference: ' + formatMoney(Math.abs(diff)) +
        '<br><small>Assets: ' + formatMoney(ta) + ' vs L+E: ' + formatMoney(lePlusE) + '</small>') +
    '</div>' +

    // Accounting equation reminder
    '<div style="text-align:center;font-size:10px;color:var(--text-muted);margin-top:8px">' +
    'Assets = Liabilities + Equity' +
    '</div></div>';
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
  rows.push(['Total Assets (' + (data.assets || []).length + ' items)', ta, '']);

  rows.push(['']);
  rows.push(['LIABILITIES']);
  rows.push(['Name', 'Amount', 'Date Added']);

  var tl = 0;
  (data.liabilities || []).forEach(function (x) {
    rows.push([x.name, x.amount, x.date ? x.date.split('T')[0] : '']);
    tl += x.amount;
  });
  rows.push(['Total Liabilities (' + (data.liabilities || []).length + ' items)', tl, '']);

  rows.push(['']);
  rows.push(['EQUITY']);
  rows.push(['Name', 'Amount', 'Date Added']);

  var te = 0;
  (data.equity || []).forEach(function (x) {
    rows.push([x.name, x.amount, x.date ? x.date.split('T')[0] : '']);
    te += x.amount;
  });
  rows.push(['Total Equity (' + (data.equity || []).length + ' items)', te, '']);

  // Summary section
  rows.push(['']);
  rows.push(['SUMMARY']);
  rows.push(['Total Assets', ta]);
  rows.push(['Total Liabilities', tl]);
  rows.push(['Total Equity', te]);
  rows.push(['Liabilities + Equity', tl + te]);
  rows.push(['Difference', ta - (tl + te)]);
  rows.push(['Status', Math.abs(ta - (tl + te)) < 0.01 ? 'BALANCED' : 'NOT BALANCED']);

  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
  XLSX.writeFile(wb, 'balance-sheet-' + new Date().toISOString().split('T')[0] + '.xlsx');
}
