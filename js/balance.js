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

  var name = autoCapitalize(document.getElementById(nameId).value.trim());
  var amt = parseFloat(document.getElementById(amtId).value);

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
    amount: amt
  };

  if (type === 'asset') data.assets.push(entry);
  else if (type === 'liability') data.liabilities.push(entry);
  else data.equity.push(entry);

  saveBalanceSheetData(data);
  document.getElementById(nameId).value = '';
  document.getElementById(amtId).value = '';
  renderBalanceSheet();
}

// === DELETE ENTRY ===
function deleteBsEntry(type, id) {
  if (!confirm('Delete?')) return;

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

// === RENDER LIST HELPER ===
function renderBsList(items, type, elId) {
  var el = document.getElementById(elId);
  if (!el) return;

  if (!items || !items.length) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px">None</p>';
    return;
  }

  el.innerHTML = items.map(function (x) {
    return '<div style="padding:8px;border:1px solid var(--bg-card-border);border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center">' +
      '<strong>' + x.name + '</strong>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span>' + formatMoney(x.amount) + '</span>' +
      '<button onclick="deleteBsEntry(\'' + type + '\',' + x.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:var(--bg-danger);margin:0">✕</button>' +
      '</div></div>';
  }).join('');
}

// === RENDER BALANCE SHEET ===
function renderBalanceSheet() {
  var data = getBalanceSheetData();
  var assets = data.assets || [];
  var liabilities = data.liabilities || [];
  var equity = data.equity || [];

  // Render each section
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
  if (sm) {
    sm.innerHTML = '<div style="padding:15px;background:var(--bg-table-even);border-radius:8px;border:1px solid var(--bg-card-border)">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
      '<span>Total Assets:</span><strong>' + formatMoney(ta) + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
      '<span>Total Liabilities:</span><strong style="color:#dc3545">' + formatMoney(tl) + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
      '<span>Total Equity:</span><strong style="color:#28a745">' + formatMoney(te) + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:2px solid var(--bg-card-border)">' +
      '<span style="font-weight:900">L + E:</span><strong>' + formatMoney(lePlusE) + '</strong></div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:5px">' +
      (isBalanced ? '✅ Balanced' : '⚠ Difference: ' + formatMoney(diff)) +
      '</div></div>';
  }
}

// === TAB SWITCHING ===
function setBsPeriod(tab, btn) {
  document.querySelectorAll('#bsPeriodTabs button').forEach(function (b) { b.classList.remove('active') });
  if (btn) btn.classList.add('active');

  var bsTab = document.getElementById('bsTab');
  var isTab = document.getElementById('isTab');

  if (bsTab) bsTab.style.display = tab === 'bs' ? 'block' : 'none';
  if (isTab) isTab.style.display = tab === 'is' ? 'block' : 'none';
}

// === EXPORT ===
function exportBalanceSheet() {
  var data = getBalanceSheetData();

  var rows = [
    ['Balance Sheet'],
    ['Generated: ' + new Date().toLocaleDateString()],
    [''],
    ['ASSETS']
  ];

  var ta = 0;
  (data.assets || []).forEach(function (x) {
    rows.push([x.name, x.amount]);
    ta += x.amount;
  });
  rows.push(['Total Assets', ta]);

  rows.push(['']);
  rows.push(['LIABILITIES']);

  var tl = 0;
  (data.liabilities || []).forEach(function (x) {
    rows.push([x.name, x.amount]);
    tl += x.amount;
  });
  rows.push(['Total Liabilities', tl]);

  rows.push(['']);
  rows.push(['EQUITY']);

  var te = 0;
  (data.equity || []).forEach(function (x) {
    rows.push([x.name, x.amount]);
    te += x.amount;
  });
  rows.push(['Total Equity', te]);

  rows.push(['']);
  rows.push(['Liabilities + Equity', tl + te]);
  rows.push(['Assets', ta]);
  rows.push(['Difference', ta - (tl + te)]);

  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
  XLSX.writeFile(wb, 'balance-sheet-' + new Date().toISOString().split('T')[0] + '.xlsx');
}
