// ============================================
// CUSTOMERS.JS - Customer Management & Import
// ============================================

// === NORMALIZE NAME ===
function normalizeName(name) {
  if (!name) return '';
  // Remove extra spaces, trim
  return name.replace(/\s+/g, ' ').trim();
}

// === ADD CUSTOMER ===
function addCustomer() {
  var raw = document.getElementById('newCustomerName').value;
  var n = autoCapitalize(normalizeName(raw));

  if (!n) return alert('Please enter a customer name');
  if (n.length < 2) return alert('Name must be at least 2 characters');

  var c = getData('customers');
  var exists = c.find(function (x) {
    return x.name.toLowerCase() === n.toLowerCase();
  });

  if (exists) return alert('Customer "' + exists.name + '" already exists');

  c.push({
    id: Date.now(),
    name: n,
    createdAt: new Date().toISOString()
  });

  saveData('customers', c);
  document.getElementById('newCustomerName').value = '';
  loadCustomersList();
  loadCustomerDropdowns();
  alert('✅ Customer "' + n + '" added!');
}

// === DELETE SINGLE CUSTOMER ===
function deleteCustomer(id) {
  var custs = getData('customers');
  var cust = custs.find(function (c) { return c.id === id; });
  if (!cust) return;

  var billCount = getData('bills').filter(function (b) { return b.customerId === id; }).length;
  var msg = 'Delete "' + cust.name + '"?';
  if (billCount > 0) msg += '\nThis will also delete ' + billCount + ' bill(s).';

  if (!confirm(msg)) return;

  saveData('customers', custs.filter(function (c) { return c.id !== id; }));
  saveData('bills', getData('bills').filter(function (b) { return b.customerId !== id; }));
  loadCustomersList();
  loadCustomerDropdowns();
}

// === LOAD & RENDER CUSTOMERS LIST ===
function loadCustomersList(sb, or) {
  sb = sb || 'name';
  or = or || 'asc';

  var customers = getData('customers');
  var allBills = getData('bills'); // Fetch once, not inside loop
  var el = document.getElementById('customerSearch');
  var st = el ? el.value.toLowerCase() : '';

  // Filter by search
  if (st) {
    customers = customers.filter(function (x) {
      return x.name.toLowerCase().indexOf(st) !== -1;
    });
  }

  // Sort
  customers.sort(function (a, b) {
    if (sb === 'name') {
      return or === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    return or === 'asc'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt);
  });

  var ct = document.getElementById('customersList');
  if (!ct) return;

  // Show count
  var totalCount = getData('customers').length;
  var filteredCount = customers.length;
  var countText = st
    ? filteredCount + ' of ' + totalCount + ' customers'
    : totalCount + ' customer(s)';

  if (!customers.length) {
    ct.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted)">' +
      (st ? 'No customers matching "' + st + '"' : 'No customers yet. Add one above!') +
      '</p>';
    return;
  }

  var headerHtml = '<div style="text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:8px">📋 ' + countText + '</div>';

  ct.innerHTML = headerHtml + customers.map(function (x) {
    var custBills = allBills.filter(function (b) { return b.customerId === x.id; });
    var unpaidCount = custBills.filter(function (b) {
      return (b.paymentStatus || 'unpaid') !== 'paid';
    }).length;

    return '<div style="padding:15px;border:1px solid var(--bg-card-border);margin:10px 0;border-radius:8px;background:var(--bg-container)">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<input type="checkbox" class="customer-cb" value="' + x.id + '">' +
      '<strong style="font-size:16px;">' + x.name + '</strong>' +
      (unpaidCount > 0 ? ' <span class="payment-badge unpaid">' + unpaidCount + ' unpaid</span>' : '') +
      '</div>' +
      '<small style="color:var(--text-secondary);display:block;margin-top:5px;">Added: ' +
      new Date(x.createdAt).toLocaleDateString() + ' • Bills: ' + custBills.length + '</small>' +
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button onclick="viewCustomerHistory(' + x.id + ')" style="padding:8px 12px;font-size:12px;width:auto;flex:1;min-width:80px">View</button>' +
      '<button onclick="deleteCustomer(' + x.id + ')" style="padding:8px 12px;font-size:12px;background:var(--bg-danger);width:auto;flex:1;min-width:80px">Delete</button>' +
      '</div></div>';
  }).join('');

  var sa = document.getElementById('selectAllCustomers');
  if (sa) sa.checked = false;
}

// === CUSTOMER LIST HELPERS ===
function sortCustomers(b, o) { loadCustomersList(b, o); }
function filterCustomers() { loadCustomersList(); }

function viewCustomerHistory(id) {
  showSection('historySection');
  var filter = document.getElementById('historyFilter');
  if (filter) {
    filter.value = id;
    loadFilteredHistory();
  }
}

function loadCustomerDropdowns() {
  var c = getData('customers');
  var opts = c.map(function (x) {
    return '<option value="' + x.id + '">' + x.name + '</option>';
  }).join('');

  var billSel = document.getElementById('billCustomer');
  if (billSel) billSel.innerHTML = '<option value="">-- Select Customer --</option>' + opts;

  var histFilter = document.getElementById('historyFilter');
  if (histFilter) histFilter.innerHTML = '<option value="all">All Customers</option>' + opts;
}

function filterBillCustomers() {
  var searchEl = document.getElementById('billCustomerSearch');
  var st = searchEl ? searchEl.value.toLowerCase() : '';
  var c = getData('customers');
  var sel = document.getElementById('billCustomer');
  if (!sel) return;

  sel.innerHTML = '<option value="">-- Select Customer --</option>';

  var matchCount = 0;
  c.forEach(function (x) {
    if (!st || x.name.toLowerCase().indexOf(st) !== -1) {
      var o = document.createElement('option');
      o.value = x.id;
      o.textContent = x.name;
      sel.appendChild(o);
      matchCount++;
    }
  });

  // Auto-select if only one match
  if (matchCount === 1 && st) {
    sel.selectedIndex = 1;
    loadLastReading();
  }
}

// === BULK ACTIONS ===
function toggleSelectAllCustomers() {
  var selectAll = document.getElementById('selectAllCustomers');
  if (!selectAll) return;
  var isChecked = selectAll.checked;
  document.querySelectorAll('.customer-cb').forEach(function (cb) {
    cb.checked = isChecked;
  });
}

function getSelectedCustomerIds() {
  var ids = [];
  document.querySelectorAll('.customer-cb:checked').forEach(function (cb) {
    ids.push(parseInt(cb.value));
  });
  return ids;
}

function bulkDeleteCustomers() {
  var ids = getSelectedCustomerIds();
  if (!ids.length) return alert('No customers selected');

  // Count bills that will be deleted
  var bills = getData('bills');
  var billCount = bills.filter(function (b) {
    return ids.indexOf(b.customerId) !== -1;
  }).length;

  var msg = 'Delete ' + ids.length + ' selected customer(s)?';
  if (billCount > 0) msg += '\nThis will also delete ' + billCount + ' bill(s).';

  if (!confirm(msg)) return;

  var c = getData('customers').filter(function (x) {
    return ids.indexOf(x.id) === -1;
  });
  var b = bills.filter(function (x) {
    return ids.indexOf(x.customerId) === -1;
  });

  saveData('customers', c);
  saveData('bills', b);
  alert('✅ Deleted ' + ids.length + ' customer(s) and ' + billCount + ' bill(s)');

  loadCustomersList();
  loadCustomerDropdowns();

  var sa = document.getElementById('selectAllCustomers');
  if (sa) sa.checked = false;
}

// === IMPORT / EXPORT ===
function setImportMode(mode, btn) {
  importMode = mode;
  document.querySelectorAll('#importModeSelector button').forEach(function (b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');

  var simpleInfo = document.getElementById('importSimpleInfo');
  var fullInfo = document.getElementById('importFullInfo');
  if (simpleInfo) simpleInfo.style.display = mode === 'simple' ? 'block' : 'none';
  if (fullInfo) fullInfo.style.display = mode === 'full' ? 'block' : 'none';
}

function downloadCustomerTemplate() {
  var data;
  if (importMode === 'full') {
    data = [
      ['Name', 'Date', 'Previous', 'Present', 'Total Used', 'Total Due', 'Amount Paid', 'Status'],
      ['Juan Dela Cruz', '2025-01-15', 100, 120, 20, 300, 300, 'paid'],
      ['Maria Santos', '2025-01-15', 50, 75, 25, 375, 0, 'unpaid']
    ];
  } else {
    data = [['Customer Name'], ['Juan Dela Cruz'], ['Maria Santos']];
  }

  var ws = XLSX.utils.aoa_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, 'import-template-' + importMode + '.xlsx');
}

// === VALIDATE DATE STRING ===
function isValidDate(dateStr) {
  if (!dateStr) return false;
  var d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

function handleImportCustomers(e) {
  var f = e.target.files[0];
  if (!f) return;

  var r = new FileReader();
  r.onload = function (ev) {
    try {
      var d = new Uint8Array(ev.target.result);
      var wb = XLSX.read(d, { type: 'array' });
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

      if (!rows || rows.length < 2) {
        alert('❌ File is empty or has no data rows');
        e.target.value = '';
        return;
      }

      var custs = getData('customers');
      var bills = getData('bills');
      var existing = custs.map(function (c) { return c.name.toLowerCase(); });
      var added = 0, skipped = 0, billsAdded = 0, errors = 0;
      var baseId = Date.now();

      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (!row || !row[0]) continue;

        var name = autoCapitalize(normalizeName(String(row[0])));
        if (!name || name.length < 2) { skipped++; continue; }

        var custId;
        var existIdx = existing.indexOf(name.toLowerCase());

        if (existIdx === -1) {
          // Use baseId + offset to guarantee unique IDs
          custId = baseId + (i * 2);
          custs.push({
            id: custId,
            name: name,
            createdAt: new Date().toISOString()
          });
          existing.push(name.toLowerCase());
          added++;
        } else {
          custId = custs.find(function (c) {
            return c.name.toLowerCase() === name.toLowerCase();
          }).id;
          if (importMode === 'simple') { skipped++; continue; }
        }

        // Full import: create bills
        if (importMode === 'full' && row.length >= 4) {
          var s = getSettings();
          var date = row[1] ? String(row[1]) : '';
          var prev = parseFloat(row[2]) || 0;
          var pres = parseFloat(row[3]) || 0;

          // Validate and fix date
          if (!isValidDate(date)) {
            date = new Date().toISOString().split('T')[0];
          }

          // Validate readings
          if (pres < prev) {
            errors++;
            continue; // Skip invalid reading
          }

          var used = row[4] !== undefined ? parseFloat(row[4]) : Math.max(0, pres - prev);
          var totalDue = row[5] !== undefined ? parseFloat(row[5]) : Math.max(used * s.pricePerCubic, s.minCharge);
          var amtPaid = parseFloat(row[6]) || 0;
          var status = row[7] ? String(row[7]).toLowerCase().trim() : 'unpaid';

          if (['paid', 'unpaid', 'partial'].indexOf(status) === -1) status = 'unpaid';
          totalDue = applyRounding(totalDue);

          // Use baseId + offset for unique bill IDs
          bills.push({
            id: baseId + (i * 2) + 1,
            ref: 'IMP-' + String(i).padStart(4, '0'),
            customerId: custId,
            date: date,
            prevReading: prev,
            presReading: pres,
            totalUsed: used,
            pricePerCubic: s.pricePerCubic,
            totalDue: totalDue,
            amountPaid: amtPaid,
            paymentStatus: status,
            paymentDate: status !== 'unpaid' ? new Date(date).toISOString() : '',
            penaltyAmount: 0,
            penaltyRate: 0,
            createdAt: new Date().toISOString()
          });
          billsAdded++;
        }
      }

      saveData('customers', custs);
      if (billsAdded > 0) saveData('bills', bills);

      loadCustomersList();
      loadCustomerDropdowns();

      var msg = '✅ Import Complete!\n\n';
      msg += '• Customers added: ' + added + '\n';
      msg += '• Skipped (duplicates): ' + skipped + '\n';
      if (importMode === 'full') {
        msg += '• Bills created: ' + billsAdded + '\n';
        if (errors > 0) msg += '• Errors (skipped): ' + errors + '\n';
      }
      msg += '• Total customers: ' + custs.length;
      alert(msg);

    } catch (err) {
      alert('❌ Import error: ' + err.message);
    }
    e.target.value = '';
  };
  r.readAsArrayBuffer(f);
}
