// ============================================
// CUSTOMERS.JS - Customer Management & Import
// ============================================

// === ADD CUSTOMER ===
function addCustomer() {
  var n = autoCapitalize(document.getElementById('newCustomerName').value.trim());
  if (!n) return alert('Enter name');

  var c = getData('customers');
  if (c.find(function (x) { return x.name.toLowerCase() === n.toLowerCase() })) {
    return alert('Exists!');
  }

  c.push({ id: Date.now(), name: n, createdAt: new Date().toISOString() });
  saveData('customers', c);

  document.getElementById('newCustomerName').value = '';
  loadCustomersList();
  loadCustomerDropdowns();
  alert('✅ Added!');
}

// === DELETE SINGLE CUSTOMER ===
function deleteCustomer(id) {
  if (!confirm('Delete customer + bills?')) return;
  saveData('customers', getData('customers').filter(function (c) { return c.id !== id }));
  saveData('bills', getData('bills').filter(function (b) { return b.customerId !== id }));
  loadCustomersList();
  loadCustomerDropdowns();
}

// === LOAD & RENDER CUSTOMERS LIST ===
function loadCustomersList(sb, or) {
  sb = sb || 'name';
  or = or || 'asc';
  
  var c = getData('customers');
  var el = document.getElementById('customerSearch');
  var st = el ? el.value.toLowerCase() : '';

  if (st) {
    c = c.filter(function (x) { return x.name.toLowerCase().indexOf(st) !== -1 });
  }

  c.sort(function (a, b) {
    if (sb === 'name') return or === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    return or === 'asc' ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt);
  });

  var ct = document.getElementById('customersList');
  if (!c.length) {
    ct.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted)">No customers.</p>';
    return;
  }

  ct.innerHTML = c.map(function (x) {
    var bl = getData('bills').filter(function (b) { return b.customerId === x.id });
    var up = bl.filter(function (b) { return (b.paymentStatus || 'unpaid') !== 'paid' }).length;
    
    return '<div style="padding:15px;border:1px solid var(--bg-card-border);margin:10px 0;border-radius:8px;background:var(--bg-container)">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<input type="checkbox" class="customer-cb" value="' + x.id + '">' +
      '<strong style="font-size:16px;">' + x.name + '</strong>' +
      (up > 0 ? ' <span class="payment-badge unpaid">' + up + ' unpaid</span>' : '') +
      '</div>' +
      '<small style="color:var(--text-secondary);display:block;margin-top:5px;">Added: ' + new Date(x.createdAt).toLocaleDateString() + ' • Bills: ' + bl.length + '</small>' +
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button onclick="viewCustomerHistory(' + x.id + ')" style="padding:8px 12px;font-size:12px;width:auto;flex:1;min-width:80px">View</button>' +
      '<button onclick="deleteCustomer(' + x.id + ')" style="padding:8px 12px;font-size:12px;background:var(--bg-danger);width:auto;flex:1;min-width:80px">Delete</button>' +
      '</div></div>';
  }).join('');

  var sa = document.getElementById('selectAllCustomers');
  if (sa) sa.checked = false;
}

// === CUSTOMER LIST HELPERS ===
function sortCustomers(b, o) { loadCustomersList(b, o) }
function filterCustomers() { loadCustomersList() }

function viewCustomerHistory(id) {
  showSection('historySection');
  document.getElementById('historyFilter').value = id;
  loadFilteredHistory();
}

function loadCustomerDropdowns() {
  var c = getData('customers');
  var opts = c.map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>' }).join('');
  document.getElementById('billCustomer').innerHTML = '<option value="">-- Select --</option>' + opts;
  document.getElementById('historyFilter').innerHTML = '<option value="all">All Customers</option>' + opts;
}

function filterBillCustomers() {
  var st = document.getElementById('billCustomerSearch').value.toLowerCase();
  var c = getData('customers');
  var sel = document.getElementById('billCustomer');
  sel.innerHTML = '<option value="">-- Select --</option>';
  c.forEach(function (x) {
    if (x.name.toLowerCase().indexOf(st) !== -1) {
      var o = document.createElement('option');
      o.value = x.id;
      o.textContent = x.name;
      sel.appendChild(o);
    }
  });
}

// === BULK ACTIONS ===
function toggleSelectAllCustomers() {
  var isChecked = document.getElementById('selectAllCustomers').checked;
  document.querySelectorAll('.customer-cb').forEach(function (cb) { cb.checked = isChecked });
}

function getSelectedCustomerIds() {
  var ids = [];
  document.querySelectorAll('.customer-cb:checked').forEach(function (cb) { ids.push(parseInt(cb.value)) });
  return ids;
}

function bulkDeleteCustomers() {
  var ids = getSelectedCustomerIds();
  if (!ids.length) return alert('No customers selected.');
  if (!confirm('Delete ' + ids.length + ' selected customers and their bills?')) return;

  var c = getData('customers').filter(function (x) { return ids.indexOf(x.id) === -1 });
  var b = getData('bills').filter(function (x) { return ids.indexOf(x.customerId) === -1 });

  saveData('customers', c);
  saveData('bills', b);
  alert('✅ Deleted ' + ids.length + ' customers.');
  
  loadCustomersList();
  loadCustomerDropdowns();
  document.getElementById('selectAllCustomers').checked = false;
}

// === IMPORT / EXPORT ===
function setImportMode(mode, btn) {
  importMode = mode;
  document.querySelectorAll('#importModeSelector button').forEach(function (b) { b.classList.remove('active') });
  if (btn) btn.classList.add('active');
  document.getElementById('importSimpleInfo').style.display = mode === 'simple' ? 'block' : 'none';
  document.getElementById('importFullInfo').style.display = mode === 'full' ? 'block' : 'none';
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

function handleImportCustomers(e) {
  var f = e.target.files[0];
  if (!f) return;
  var r = new FileReader();
  
  r.onload = function (ev) {
    try {
      var d = new Uint8Array(ev.target.result);
      var wb = XLSX.read(d, { type: 'array' });
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      
      if (!rows || rows.length < 2) { alert('❌ Empty'); e.target.value = ''; return; }
      
      var custs = getData('customers');
      var bills = getData('bills');
      var existing = custs.map(function (c) { return c.name.toLowerCase() });
      var added = 0, skipped = 0, billsAdded = 0;

      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (!row || !row[0]) continue;
        
        var name = autoCapitalize(String(row[0]).trim());
        if (!name) { skipped++; continue; }
        
        var custId;
        var existIdx = existing.indexOf(name.toLowerCase());
        
        if (existIdx === -1) {
          custId = Date.now() + i;
          custs.push({ id: custId, name: name, createdAt: new Date().toISOString() });
          existing.push(name.toLowerCase());
          added++;
        } else {
          custId = custs.find(function (c) { return c.name.toLowerCase() === name.toLowerCase() }).id;
          if (importMode === 'simple') { skipped++; continue; }
        }

        if (importMode === 'full' && row.length >= 4) {
          var s = getSettings();
          var date = row[1] ? String(row[1]) : '';
          var prev = parseFloat(row[2]) || 0;
          var pres = parseFloat(row[3]) || 0;
          var used = row[4] !== undefined ? parseFloat(row[4]) : Math.max(0, pres - prev);
          var totalDue = row[5] !== undefined ? parseFloat(row[5]) : Math.max(used * s.pricePerCubic, s.minCharge);
          var amtPaid = parseFloat(row[6]) || 0;
          var status = row[7] ? String(row[7]).toLowerCase() : 'unpaid';

          if (!date) {
            var today = new Date();
            date = today.toISOString().split('T')[0];
          }
          if (['paid', 'unpaid', 'partial'].indexOf(status) === -1) status = 'unpaid';
          totalDue = applyRounding(totalDue);

          bills.push({
            id: Date.now() + i + 1000,
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
            createdAt: new Date().toISOString()
          });
          billsAdded++;
        }
      }

      saveData('customers', custs);
      if (billsAdded > 0) saveData('bills', bills);
      
      loadCustomersList();
      loadCustomerDropdowns();
      
      var msg = '✅ Import Complete!\n\nCustomers added: ' + added + '\nSkipped: ' + skipped;
      if (importMode === 'full') msg += '\nBills created: ' + billsAdded;
      msg += '\nTotal customers: ' + custs.length;
      alert(msg);
      
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
    e.target.value = '';
  };
  r.readAsArrayBuffer(f);
}
