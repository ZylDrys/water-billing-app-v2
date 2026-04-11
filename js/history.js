// ============================================
// HISTORY.JS - Bill History & Bulk Actions
// ============================================

var lastFilteredBills = [];

// === BUILD SINGLE BILL CARD ===
function buildBillCard(b, cs) {
  var c = cs.find(function (x) { return x.id === b.customerId; });
  var custName = c ? c.name : 'Unknown';
  var s = b.paymentStatus || 'unpaid';

  // Status badge
  var badge;
  if (s === 'paid') {
    badge = '<span class="payment-badge paid">✅ Paid</span>';
  } else if (s === 'partial') {
    badge = '<span class="payment-badge partial">⚠ ' + formatMoney(b.amountPaid || 0) + '</span>';
  } else {
    badge = '<span class="payment-badge unpaid">❌ Unpaid</span>';
  }

  // Payment action buttons
  var pb = '';
  if (s === 'unpaid') {
    pb = '<button onclick="markAsPaid(' + b.id + ')" style="padding:6px;font-size:11px;width:auto;flex:1;min-width:50px;background:var(--bg-success)" title="Mark as Paid">✅</button>' +
      '<button onclick="markAsPartial(' + b.id + ')" style="padding:6px;font-size:11px;width:auto;flex:1;min-width:50px;background:var(--bg-warning);color:#333" title="Partial Payment">⚠</button>';
  } else if (s === 'partial') {
    var remaining = b.totalDue - (b.amountPaid || 0);
    pb = '<button onclick="markAsPaid(' + b.id + ')" style="padding:6px;font-size:11px;width:auto;flex:1;min-width:50px;background:var(--bg-success)" title="Mark as Fully Paid">✅</button>' +
      '<button onclick="markAsPartial(' + b.id + ')" style="padding:6px;font-size:11px;width:auto;flex:1;min-width:50px;background:var(--bg-warning);color:#333" title="Add Payment (Remaining: ' + formatMoney(remaining) + ')">➕</button>';
  } else {
    pb = '<button onclick="markAsUnpaid(' + b.id + ')" style="padding:6px;font-size:11px;width:auto;flex:1;min-width:50px;background:#6c757d" title="Mark as Unpaid">↩</button>';
  }

  // Border color
  var borderColor = s === 'paid' ? '#28a745' : s === 'partial' ? '#ffc107' : '#dc3545';

  return '<div style="padding:12px;border:1px solid var(--bg-card-border);margin:8px 0;border-radius:8px;background:var(--bg-container);border-left:4px solid ' + borderColor + '">' +

    // Header row: checkbox, name, badge
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:4px">' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<input type="checkbox" class="history-cb" value="' + b.id + '">' +
    '<strong style="font-size:14px">' + custName + '</strong>' +
    '</div>' + badge + '</div>' +

    // Details row: ref, date, readings
    '<div style="font-size:12px;color:var(--text-secondary);margin:4px 0">' +
    (b.ref ? '<span style="font-family:monospace;font-size:10px;color:var(--text-muted)">' + b.ref + '</span> • ' : '') +
    new Date(b.date).toLocaleDateString() + ' • ' +
    b.prevReading + '→' + b.presReading + ' = ' + b.totalUsed + ' m³' +
    '</div>' +

    // Amount
    '<strong>' + formatMoney(b.totalDue) + '</strong>' +
    (b.penaltyAmount > 0
      ? ' <small style="color:#dc3545">(+' + formatMoney(b.penaltyAmount) + ' penalty)</small>'
      : '') +

    // Partial payment remaining info
    (s === 'partial'
      ? '<div style="font-size:11px;color:#856404;margin-top:2px">Remaining: ' + formatMoney(b.totalDue - (b.amountPaid || 0)) + '</div>'
      : '') +

    // Action buttons
    '<div style="margin-top:8px;display:flex;gap:5px;flex-wrap:wrap">' + pb +
    '<button onclick="printBillById(' + b.id + ')" style="padding:6px;font-size:11px;width:auto;flex:1;min-width:40px" title="Print">🖨</button>' +
    '<button onclick="deleteBill(' + b.id + ')" style="padding:6px;font-size:11px;background:var(--bg-danger);width:auto;flex:1;min-width:40px" title="Delete">🗑</button>' +
    '</div></div>';
}

// === BUILD SUMMARY BAR ===
function buildHistorySummary(totalDue, totalPaid, unpaidCount) {
  return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">' +
    '<div style="padding:8px;background:rgba(0,123,255,.08);border-radius:6px">' +
    '<div style="font-size:11px;color:var(--text-muted)">Due</div>' +
    '<div style="font-weight:700">' + formatMoney(totalDue) + '</div></div>' +
    '<div style="padding:8px;background:rgba(40,167,69,.08);border-radius:6px">' +
    '<div style="font-size:11px;color:var(--text-muted)">Collected</div>' +
    '<div style="font-weight:700;color:#28a745">' + formatMoney(totalPaid) + '</div></div>' +
    '<div style="padding:8px;background:rgba(220,53,69,.08);border-radius:6px">' +
    '<div style="font-size:11px;color:var(--text-muted)">Outstanding</div>' +
    '<div style="font-weight:700;color:#dc3545">' + formatMoney(totalDue - totalPaid) + '</div></div></div>';
}

// === LOAD & RENDER HISTORY ===
function loadFilteredHistory(sb, or) {
  sb = sb || 'date';
  or = or || 'desc';

  var bl = getData('bills');
  var cs = getData('customers');

  // Filter by customer
  var filterEl = document.getElementById('historyFilter');
  var f = filterEl ? filterEl.value : 'all';
  if (f !== 'all') {
    bl = bl.filter(function (b) { return b.customerId === parseInt(f); });
  }

  // Filter by payment status
  var payFilterEl = document.getElementById('historyPaymentFilter');
  var pf = payFilterEl ? payFilterEl.value : 'all';
  if (pf !== 'all') {
    bl = bl.filter(function (b) { return (b.paymentStatus || 'unpaid') === pf; });
  }

  // Search filter
  var searchEl = document.getElementById('historySearch');
  var st = searchEl ? searchEl.value.toLowerCase() : '';
  if (st) {
    bl = bl.filter(function (b) {
      var c = cs.find(function (x) { return x.id === b.customerId; });
      var nameMatch = (c ? c.name.toLowerCase() : '').indexOf(st) !== -1;
      var dateMatch = new Date(b.date).toLocaleDateString().toLowerCase().indexOf(st) !== -1;
      var refMatch = (b.ref || '').toLowerCase().indexOf(st) !== -1;
      return nameMatch || dateMatch || refMatch;
    });
  }

  // Sort
  bl.sort(function (a, b) {
    if (sb === 'date') {
      return or === 'asc'
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date);
    }
    return or === 'asc' ? a.totalDue - b.totalDue : b.totalDue - a.totalDue;
  });

  lastFilteredBills = bl;

  // Calculate totals
  var td = 0, tp = 0, uc = 0;
  bl.forEach(function (b) {
    td += b.totalDue;
    tp += (b.amountPaid || 0);
    if ((b.paymentStatus || 'unpaid') !== 'paid') uc++;
  });

  // Render summary
  var summaryEl = document.getElementById('historySummary');
  if (summaryEl) {
    summaryEl.innerHTML = buildHistorySummary(td, tp, uc);
  }

  // Render list
  var ct = document.getElementById('historyList');
  if (!ct) return;

  if (!bl.length) {
    ct.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted)">' +
      (st ? 'No bills matching "' + st + '"' : 'No bills found') +
      '</p>';
    return;
  }

  // Show count
  var countHtml = '<div style="text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:8px">📋 ' +
    bl.length + ' bill(s)' +
    (uc > 0 ? ' • <span style="color:#dc3545">' + uc + ' unpaid</span>' : '') +
    '</div>';

  ct.innerHTML = countHtml + bl.map(function (b) {
    return buildBillCard(b, cs);
  }).join('');

  // Reset select all
  var sah = document.getElementById('selectAllHistory');
  if (sah) sah.checked = false;
}

// === HISTORY HELPERS ===
function sortHistory(b, o) { loadFilteredHistory(b, o); }
function filterHistory() { loadFilteredHistory(); }

function deleteBill(id) {
  var bills = getData('bills');
  var b = bills.find(function (x) { return x.id === id; });
  if (!b) return;

  var cs = getData('customers');
  var c = cs.find(function (x) { return x.id === b.customerId; });
  var custName = c ? c.name : 'Unknown';

  if (!confirm('Delete bill for "' + custName + '"?\n' +
    'Date: ' + new Date(b.date).toLocaleDateString() + '\n' +
    'Amount: ' + formatMoney(b.totalDue) +
    (b.ref ? '\nRef: ' + b.ref : ''))) return;

  saveData('bills', bills.filter(function (x) { return x.id !== id; }));
  loadFilteredHistory();
}

function printBillById(id) {
  var b = getData('bills').find(function (x) { return x.id === id; });
  if (b) printBill(b);
}

// === SELECT ALL ===
function toggleSelectAllHistory() {
  var selectAll = document.getElementById('selectAllHistory');
  if (!selectAll) return;
  var isChecked = selectAll.checked;
  document.querySelectorAll('.history-cb').forEach(function (cb) {
    cb.checked = isChecked;
  });
}

function getSelectedHistoryIds() {
  var ids = [];
  document.querySelectorAll('.history-cb:checked').forEach(function (cb) {
    ids.push(parseInt(cb.value));
  });
  return ids;
}

// === BULK MARK STATUS ===
function bulkMarkHistory(status) {
  var ids = getSelectedHistoryIds();
  if (!ids.length) return alert('No bills selected');

  var statusLabel = status === 'paid' ? 'paid' : 'unpaid';
  if (!confirm('Mark ' + ids.length + ' bill(s) as ' + statusLabel + '?')) return;

  var bl = getData('bills');
  var changed = 0;

  bl.forEach(function (b) {
    if (ids.indexOf(b.id) !== -1) {
      b.paymentStatus = status;
      if (status === 'paid') {
        b.amountPaid = b.totalDue;
        b.paymentDate = new Date().toISOString();
      } else if (status === 'unpaid') {
        b.amountPaid = 0;
        b.paymentDate = '';
      }
      changed++;
    }
  });

  saveData('bills', bl);
  alert('✅ ' + changed + ' bill(s) marked as ' + statusLabel);
  loadFilteredHistory();
}

// === BULK DELETE ===
function bulkDeleteHistory() {
  var ids = getSelectedHistoryIds();
  if (!ids.length) return alert('No bills selected');
  if (!confirm('Delete ' + ids.length + ' selected bill(s)?')) return;
  if (!confirm('⚠ This cannot be undone. Proceed?')) return;

  var bl = getData('bills');
  var originalCount = bl.length;
  bl = bl.filter(function (b) { return ids.indexOf(b.id) === -1; });
  var deletedCount = originalCount - bl.length;

  saveData('bills', bl);
  alert('✅ Deleted ' + deletedCount + ' bill(s)');
  loadFilteredHistory();
}

// === BULK PRINT ===
function bulkPrintHistory() {
  var ids = getSelectedHistoryIds();
  if (!ids.length) return alert('No bills selected');

  var blToPrint = lastFilteredBills.filter(function (b) {
    return ids.indexOf(b.id) !== -1;
  });

  if (!blToPrint.length) return alert('No matching bills to print');

  var cs = getData('customers');
  var cf = getCurrencyFormatter();
  var ts = 0, tc = 0;

  // Get filter context for report header
  var filterEl = document.getElementById('historyFilter');
  var filterVal = filterEl ? filterEl.value : 'all';
  var filterLabel = 'All Customers';
  if (filterVal !== 'all') {
    var filterCust = cs.find(function (x) { return x.id === parseInt(filterVal); });
    if (filterCust) filterLabel = filterCust.name;
  }

  var rows = blToPrint.map(function (b, i) {
    var c = cs.find(function (x) { return x.id === b.customerId; });
    ts += b.totalDue;
    tc += (b.amountPaid || 0);
    var s = b.paymentStatus || 'unpaid';

    return '<tr' + (i % 2 === 0 ? ' style="background:#f8f8f8"' : '') + '>' +
      '<td style="padding:4px;font-size:11px;border:none">' + (i + 1) + '</td>' +
      '<td style="padding:4px;font-size:11px;border:none">' + (c ? c.name : '?') + '</td>' +
      '<td style="padding:4px;font-size:11px;border:none">' + new Date(b.date).toLocaleDateString() + '</td>' +
      '<td style="padding:4px;font-size:11px;text-align:right;border:none">' + b.totalUsed + '</td>' +
      '<td style="padding:4px;font-size:11px;text-align:right;border:none">' + cf.format(b.totalDue) + '</td>' +
      '<td style="padding:4px;font-size:11px;text-align:center;border:none">' +
      (s === 'paid' ? '✅' : s === 'partial' ? '⚠' : '❌') + '</td>' +
      '</tr>';
  }).join('');

  var html = '<div style="font-family:\'Segoe UI\',Arial,sans-serif;padding:12px;width:80mm;color:#222">' +
    buildReceiptHeader() +

    // Report title with context
    '<div style="text-align:center;margin:10px 0;padding:6px;background:#f0f0f0;border-radius:4px;font-size:14px;font-weight:700;text-transform:uppercase">Billing Report</div>' +
    '<div style="text-align:center;font-size:10px;color:#666;margin-bottom:8px">' +
    filterLabel + ' • ' + blToPrint.length + ' bill(s) • ' + new Date().toLocaleDateString() +
    '</div>' +

    // Table
    '<table style="width:100%;border-collapse:collapse;border:none;margin:8px 0">' +
    '<thead><tr style="background:#333;color:#fff">' +
    '<th style="padding:4px;font-size:10px;border:none">#</th>' +
    '<th style="padding:4px;font-size:10px;border:none">Name</th>' +
    '<th style="padding:4px;font-size:10px;border:none">Date</th>' +
    '<th style="padding:4px;font-size:10px;text-align:right;border:none">m³</th>' +
    '<th style="padding:4px;font-size:10px;text-align:right;border:none">Due</th>' +
    '<th style="padding:4px;font-size:10px;border:none">St</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +

    // Summary
    '<div style="margin:10px 0;padding:10px;background:#1a1a1a;color:#fff;border-radius:6px">' +
    '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">' +
    '<span>Billed:</span><strong>' + cf.format(ts) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">' +
    '<span>Collected:</span><strong style="color:#28a745">' + cf.format(tc) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900">' +
    '<span>Outstanding:</span><span style="color:#ff6b6b">' + cf.format(ts - tc) + '</span></div>' +
    '</div></div>';

  var receiptEl = document.getElementById('printReceipt');
  if (receiptEl) {
    receiptEl.innerHTML = html;
    window.print();
    receiptEl.innerHTML = '';
  }
}
