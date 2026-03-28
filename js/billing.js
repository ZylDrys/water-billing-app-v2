// ============================================
// BILLING.JS - Bill Creation & Payment
// ============================================

// === LOAD LAST READING ===
function loadLastReading() {
  var cid = parseInt(document.getElementById('billCustomer').value);
  if (!cid) {
    document.getElementById('prevReading').value = 0;
    return;
  }
  var bl = getData('bills').filter(function (b) { return b.customerId === cid });
  if (bl.length > 0) {
    document.getElementById('prevReading').value = bl.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    })[0].presReading;
  } else {
    document.getElementById('prevReading').value = 0;
  }
  calculateTotal();
}

// === CALCULATE TOTAL ===
function calculateTotal() {
  var s = getSettings();
  var prev = parseFloat(document.getElementById('prevReading').value) || 0;
  var pres = parseFloat(document.getElementById('presReading').value) || 0;
  var used = Math.max(0, pres - prev);
  var computed = used * s.pricePerCubic;
  var base = Math.max(computed, s.minCharge);
  var penalty = 0;
  var hasPenalty = document.getElementById('applyPenalty').checked;

  if (hasPenalty && s.penaltyRate > 0) {
    penalty = base * (s.penaltyRate / 100);
  }

  var total = applyRounding(base + penalty);
  var sym = getCurrencySymbol();

  document.getElementById('brkUsed').textContent = used + ' m³';
  document.getElementById('brkRate').textContent = sym + (s.pricePerCubic).toFixed(2) + '/m³';
  document.getElementById('brkComputed').textContent = formatMoney(computed);
  document.getElementById('brkMin').textContent = formatMoney(s.minCharge);

  var pRow = document.getElementById('brkPenaltyRow');
  if (hasPenalty && s.penaltyRate > 0) {
    pRow.style.display = 'flex';
    document.getElementById('brkPenaltyRate').textContent = s.penaltyRate;
    document.getElementById('brkPenalty').textContent = formatMoney(penalty);
  } else {
    pRow.style.display = 'none';
  }

  document.getElementById('brkTotal').textContent = formatMoney(total);
  document.getElementById('displayTotal').textContent = s.roundOff ? Math.round(total) : total.toFixed(2);
}

// === CLEAR BILL FORM ===
function clearBillForm() {
  document.getElementById('billCustomer').value = '';
  document.getElementById('prevReading').value = 0;
  document.getElementById('presReading').value = '';
  document.getElementById('applyPenalty').checked = false;
  document.getElementById('displayTotal').textContent = '0.00';
  document.getElementById('billDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('brkPenaltyRow').style.display = 'none';
  calculateTotal();
}

// === SAVE BILL ===
function saveBill(print) {
  var cid = parseInt(document.getElementById('billCustomer').value);
  if (!cid) return alert('Select customer');

  var pres = parseFloat(document.getElementById('presReading').value);
  if (isNaN(pres)) return alert('Enter reading');

  var s = getSettings();
  var prev = parseFloat(document.getElementById('prevReading').value) || 0;
  var used = Math.max(0, pres - prev);
  var computed = used * s.pricePerCubic;
  var base = Math.max(computed, s.minCharge);
  var penalty = 0;
  var hasPenalty = document.getElementById('applyPenalty').checked;

  if (hasPenalty && s.penaltyRate > 0) {
    penalty = base * (s.penaltyRate / 100);
  }

  var total = applyRounding(base + penalty);

  var bill = {
    id: Date.now(),
    customerId: cid,
    date: document.getElementById('billDate').value,
    prevReading: prev,
    presReading: pres,
    totalUsed: used,
    pricePerCubic: s.pricePerCubic,
    totalDue: total,
    amountPaid: 0,
    paymentStatus: 'unpaid',
    paymentDate: '',
    penaltyAmount: penalty,
    penaltyRate: hasPenalty ? s.penaltyRate : 0,
    createdAt: new Date().toISOString()
  };

  var bl = getData('bills');
  bl.push(bill);
  saveData('bills', bl);

  if (print) printBill(bill);
  else alert('✅ Saved!');

  clearBillForm();
}

// === PAYMENT ACTIONS ===
function markAsPaid(id) {
  var bl = getData('bills');
  var b = bl.find(function (x) { return x.id === id });
  if (!b) return;
  b.paymentStatus = 'paid';
  b.amountPaid = b.totalDue;
  b.paymentDate = new Date().toISOString();
  saveData('bills', bl);
  loadFilteredHistory();
}

function markAsPartial(id) {
  showPromptModal('Amount paid:', false).then(function (v) {
    if (!v) return;
    var a = parseFloat(v);
    if (isNaN(a) || a <= 0) { alert('Invalid'); return }

    var bl = getData('bills');
    var b = bl.find(function (x) { return x.id === id });
    if (!b) return;

    b.amountPaid = (b.amountPaid || 0) + a;
    if (b.amountPaid >= b.totalDue) {
      b.paymentStatus = 'paid';
      b.amountPaid = b.totalDue;
    } else {
      b.paymentStatus = 'partial';
    }
    b.paymentDate = new Date().toISOString();
    saveData('bills', bl);
    loadFilteredHistory();
  });
}

function markAsUnpaid(id) {
  var bl = getData('bills');
  var b = bl.find(function (x) { return x.id === id });
  if (!b) return;
  b.paymentStatus = 'unpaid';
  b.amountPaid = 0;
  b.paymentDate = '';
  saveData('bills', bl);
  loadFilteredHistory();
}

// === RECEIPT HEADER ===
function buildReceiptHeader() {
  var c = getCustomization(), im = getImages(), h = '';
  if (im.companyLogo) {
    h += '<div style="text-align:center;margin-bottom:8px"><img src="' + im.companyLogo + '" style="max-width:80px;max-height:80px;border-radius:8px"></div>';
  }
  h += '<div style="text-align:center;font-size:18px;font-weight:900;margin-bottom:2px">' + (c.companyName || '💧 WATER BILL') + '</div>';
  if (c.companyAddress) {
    h += '<div style="text-align:center;font-size:11px;color:#555">' + c.companyAddress + '</div>';
  }
  var ct = [c.companyPhone, c.companyEmail].filter(Boolean).join(' • ');
  if (ct) {
    h += '<div style="text-align:center;font-size:10px;color:#666">' + ct + '</div>';
  }
  return h;
}

// === PRINT BILL (removed 'paid' section) ===
function printBill(bill) {
  var cs = getData('customers');
  var c = cs.find(function (x) { return x.id === bill.customerId });
  var cn = c ? c.name : '?';
  var s = getSettings();
  var cf = getCurrencyFormatter();

  var html = '<div style="font-family:\'Segoe UI\',Arial,sans-serif;padding:12px;width:80mm;color:#222">' +
    buildReceiptHeader() +
    '<div style="text-align:center;margin:8px 0;padding:6px;background:#f0f0f0;border-radius:4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px">Official Billing</div>' +
    '<hr style="border:none;border-top:1px solid #ddd;margin:8px 0">' +
    
    // Customer & Date
    '<table style="width:100%;font-size:12px;border-collapse:collapse;border:none">' +
    '<tr><td style="padding:3px 0;color:#666;border:none">Customer</td><td style="text-align:right;font-weight:700;border:none">' + cn + '</td></tr>' +
    '<tr><td style="padding:3px 0;color:#666;border:none">Date</td><td style="text-align:right;border:none">' + new Date(bill.date).toLocaleDateString() + '</td></tr>' +
    '</table>' +
    '<hr style="border:none;border-top:1px solid #ddd;margin:8px 0">' +
    
    // Readings
    '<table style="width:100%;font-size:12px;border-collapse:collapse;border:none">' +
    '<tr style="background:#f8f8f8"><td style="padding:5px 8px;border:none">Previous</td><td style="text-align:right;font-weight:600;border:none">' + bill.prevReading + ' m³</td></tr>' +
    '<tr><td style="padding:5px 8px;border:none">Present</td><td style="text-align:right;font-weight:600;border:none">' + bill.presReading + ' m³</td></tr>' +
    '<tr style="background:#f8f8f8"><td style="padding:5px 8px;font-weight:700;border:none">Used</td><td style="text-align:right;font-weight:700;border:none">' + bill.totalUsed + ' m³</td></tr>' +
    '</table>' +
    '<hr style="border:none;border-top:1px solid #ddd;margin:8px 0">' +
    
    // Charges
    '<table style="width:100%;font-size:12px;border-collapse:collapse;border:none">' +
    '<tr><td style="padding:4px 0;color:#555;border:none">Rate/m³</td><td style="text-align:right;border:none">' + cf.format(s.pricePerCubic) + '</td></tr>' +
    '<tr><td style="padding:4px 0;color:#555;border:none">Computed</td><td style="text-align:right;border:none">' + cf.format(bill.totalUsed * s.pricePerCubic) + '</td></tr>' +
    '<tr><td style="padding:4px 0;color:#555;border:none">Min Charge</td><td style="text-align:right;border:none">' + cf.format(s.minCharge) + '</td></tr>' +
    (bill.penaltyAmount > 0 ? '<tr><td style="padding:4px 0;color:#dc3545;border:none">Penalty (' + (bill.penaltyRate || 0) + '%)</td><td style="text-align:right;color:#dc3545;border:none">' + cf.format(bill.penaltyAmount) + '</td></tr>' : '') +
    '</table>' +
    
    // Total Due
    '<div style="margin:12px 0;padding:12px;background:#1a1a1a;color:#fff;border-radius:6px;text-align:center">' +
    '<div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:.7;margin-bottom:4px">Total Due</div>' +
    '<div style="font-size:22px;font-weight:900">' + cf.format(bill.totalDue) + '</div>' +
    '</div>' +
    
    // Footer
    '<hr style="border:none;border-top:1px dashed #ccc;margin:8px 0">' +
    '<div style="text-align:center;font-size:10px;color:#999;line-height:1.6">Thank you!<br>' + new Date().toLocaleString() + '</div>' +
    '</div>';

  document.getElementById('printReceipt').innerHTML = html;
  window.print();
  document.getElementById('printReceipt').innerHTML = '';
}

// === EXPORT ALL BILLS ===
function exportToExcel() {
  var bl = getData('bills'), cs = getData('customers');
  if (!bl.length) { alert('No bills'); return }

  var sym = getCurrencySymbol();
  var data = [['Customer', 'Date', 'Prev', 'Present', 'Used (m³)', 'Rate', 'Penalty', 'Total (' + sym + ')', 'Paid', 'Status']];
  
  bl.forEach(function (b) {
    var c = cs.find(function (x) { return x.id === b.customerId });
    data.push([
      c ? c.name : '?', b.date, b.prevReading, b.presReading,
      b.totalUsed, b.pricePerCubic, b.penaltyAmount || 0,
      b.totalDue, b.amountPaid || 0, b.paymentStatus || 'unpaid'
    ]);
  });

  var ws = XLSX.utils.aoa_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bills');
  XLSX.writeFile(wb, 'water-bills-' + new Date().toISOString().split('T')[0] + '.xlsx');
}

// === EXPORT BY PERIOD ===
function showExportOptions() { document.getElementById('exportModal').style.display = 'flex' }
function closeExportModal() { document.getElementById('exportModal').style.display = 'none' }

function exportByPeriod(period) {
  closeExportModal();
  var bl = getData('bills'), cs = getData('customers');
  var now = new Date(), y = now.getFullYear(), m = now.getMonth();
  var filtered;

  if (period === 'month') {
    filtered = bl.filter(function (b) { var d = new Date(b.date); return d.getFullYear() === y && d.getMonth() === m });
  } else if (period === 'quarter') {
    var qs = Math.floor(m / 3) * 3;
    filtered = bl.filter(function (b) { var d = new Date(b.date); return d.getFullYear() === y && d.getMonth() >= qs && d.getMonth() <= qs + 2 });
  } else if (period === 'semi') {
    var ss = m < 6 ? 0 : 6;
    filtered = bl.filter(function (b) { var d = new Date(b.date); return d.getFullYear() === y && d.getMonth() >= ss && d.getMonth() <= ss + 5 });
  } else if (period === 'year') {
    filtered = bl.filter(function (b) { return new Date(b.date).getFullYear() === y });
  } else {
    filtered = bl;
  }

  if (!filtered.length) { alert('No data for this period'); return }

  var sym = getCurrencySymbol();
  var data = [['Customer', 'Date', 'Prev', 'Present', 'Used (m³)', 'Rate', 'Penalty', 'Total (' + sym + ')', 'Paid', 'Status']];
  
  filtered.forEach(function (b) {
    var c = cs.find(function (x) { return x.id === b.customerId });
    data.push([
      c ? c.name : '?', b.date, b.prevReading, b.presReading,
      b.totalUsed, b.pricePerCubic, b.penaltyAmount || 0,
      b.totalDue, b.amountPaid || 0, b.paymentStatus || 'unpaid'
    ]);
  });

  var ws = XLSX.utils.aoa_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bills');
  XLSX.writeFile(wb, 'water-bills-' + period + '-' + new Date().toISOString().split('T')[0] + '.xlsx');
}
