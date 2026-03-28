// ============================================
// ANALYSIS.JS - Reports, Charts & Analytics
// ============================================

// === PERIOD CONTROLS ===
function setAnalysisPeriod(p, btn) {
  analysisPeriod = p;
  document.querySelectorAll('#periodTabs button').forEach(function (b) { b.classList.remove('active') });
  if (btn) btn.classList.add('active');
  renderAnalysis();
}

function changeAnalysisPeriod(d) {
  if (analysisPeriod === 'monthly') {
    analysisMonth += d;
    if (analysisMonth > 11) { analysisMonth = 0; analysisYear++; }
    if (analysisMonth < 0) { analysisMonth = 11; analysisYear--; }
  } else if (analysisPeriod === 'quarterly') {
    analysisQuarter += d;
    if (analysisQuarter > 3) { analysisQuarter = 0; analysisYear++; }
    if (analysisQuarter < 0) { analysisQuarter = 3; analysisYear--; }
  } else if (analysisPeriod === 'semiannual') {
    analysisSemiAnnual += d;
    if (analysisSemiAnnual > 1) { analysisSemiAnnual = 0; analysisYear++; }
    if (analysisSemiAnnual < 0) { analysisSemiAnnual = 1; analysisYear--; }
  } else {
    analysisYear += d;
  }
  renderAnalysis();
}

// === PERIOD FILTER & LABEL ===
function getAnalysisFilter() {
  var startMonth, endMonth;
  if (analysisPeriod === 'monthly') {
    startMonth = analysisMonth;
    endMonth = analysisMonth;
  } else if (analysisPeriod === 'quarterly') {
    startMonth = analysisQuarter * 3;
    endMonth = startMonth + 2;
  } else if (analysisPeriod === 'semiannual') {
    startMonth = analysisSemiAnnual * 6;
    endMonth = startMonth + 5;
  } else {
    startMonth = 0;
    endMonth = 11;
  }
  return { startMonth: startMonth, endMonth: endMonth, year: analysisYear };
}

function getAnalysisPeriodLabel() {
  if (analysisPeriod === 'monthly') {
    return new Date(analysisYear, analysisMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (analysisPeriod === 'quarterly') return 'Q' + (analysisQuarter + 1) + ' ' + analysisYear;
  if (analysisPeriod === 'semiannual') return (analysisSemiAnnual === 0 ? '1st Half' : '2nd Half') + ' ' + analysisYear;
  return 'Year ' + analysisYear;
}

// === MAIN RENDER ===
function renderAnalysis() {
  var bills = getData('bills');
  var custs = getData('customers');
  var af = getAnalysisFilter();

  document.getElementById('analysisPeriodLabel').textContent = getAnalysisPeriodLabel();

  // Filter bills for period
  var filtered = bills.filter(function (b) {
    var d = new Date(b.date);
    return d.getFullYear() === af.year && d.getMonth() >= af.startMonth && d.getMonth() <= af.endMonth;
  });

  // Calculate totals
  var tr = 0, tc = 0, tu = 0, pc = 0, uc = 0, prc = 0;
  filtered.forEach(function (b) {
    tr += b.totalDue;
    tc += (b.amountPaid || 0);
    tu += b.totalUsed;
    var s = b.paymentStatus || 'unpaid';
    if (s === 'paid') pc++;
    else if (s === 'partial') prc++;
    else uc++;
  });
  var cr = tr > 0 ? Math.round(tc / tr * 100) : 0;

  // Stats cards
  document.getElementById('analysisStats').innerHTML =
    '<div class="stat-card"><div class="stat-value">' + formatMoney(tr) + '</div><div class="stat-label">Billed</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:#28a745">' + formatMoney(tc) + '</div><div class="stat-label">Collected</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:#dc3545">' + formatMoney(tr - tc) + '</div><div class="stat-label">Outstanding</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + filtered.length + '</div><div class="stat-label">Bills</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + tu.toFixed(1) + '</div><div class="stat-label">m³ Used</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:' + (cr >= 80 ? '#28a745' : cr >= 50 ? '#ffc107' : '#dc3545') + '">' + cr + '%</div><div class="stat-label">Collection</div></div>';

  // Build chart data
  var chartData = {}, chartLabels = [];

  if (analysisPeriod === 'monthly') {
    var dim = new Date(af.year, af.endMonth + 1, 0).getDate();
    for (var i = 1; i <= dim; i++) {
      chartData[i] = 0;
      chartLabels.push(String(i));
    }
    filtered.forEach(function (b) {
      var day = new Date(b.date).getDate();
      chartData[day] += b.totalDue;
    });
  } else {
    var mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var m = af.startMonth; m <= af.endMonth; m++) {
      chartData[m] = 0;
      chartLabels.push(mn[m]);
    }
    filtered.forEach(function (b) {
      var mo = new Date(b.date).getMonth();
      chartData[mo] += b.totalDue;
    });
  }

  // Render chart bars
  var vals = Object.values(chartData);
  var mx = Math.max.apply(null, vals) || 1;
  var ch = '';
  var keys = Object.keys(chartData);

  keys.forEach(function (k, i) {
    var v = chartData[k];
    var h = v > 0 ? Math.max(6, (v / mx) * 120) : 0;
    ch += '<div class="chart-bar-wrapper">' +
      (v > 0 ? '<div class="chart-bar-value">' + formatMoney(v) + '</div>' : '') +
      '<div class="chart-bar" style="height:' + h + 'px;background:' + (v > 0 ? 'var(--bg-accent)' : 'var(--bg-card-border)') + '" title="' + chartLabels[i] + ': ' + formatMoney(v) + '"></div>' +
      '<div class="chart-bar-label">' + chartLabels[i] + '</div></div>';
  });

  document.getElementById('chartBars').innerHTML = ch;

  // Customer breakdown
  var cd = {};
  filtered.forEach(function (b) {
    if (!cd[b.customerId]) cd[b.customerId] = { name: '', due: 0, paid: 0, usage: 0, count: 0, penalty: 0 };
    var c = custs.find(function (x) { return x.id === b.customerId });
    cd[b.customerId].name = c ? c.name : '?';
    cd[b.customerId].due += b.totalDue;
    cd[b.customerId].paid += (b.amountPaid || 0);
    cd[b.customerId].usage += b.totalUsed;
    cd[b.customerId].count++;
    cd[b.customerId].penalty += (b.penaltyAmount || 0);
  });

  var ca = Object.values(cd).sort(function (a, b) { return b.due - a.due });

  var bh = '<h3>📋 Breakdown</h3>';
  if (!ca.length) {
    bh += '<p style="text-align:center;color:var(--text-muted);padding:15px">No data</p>';
  } else {
    bh += '<table><thead><tr><th>Customer</th><th>Bills</th><th>m³</th><th>Due</th><th>Paid</th></tr></thead><tbody>';
    ca.forEach(function (x) {
      bh += '<tr><td>' + x.name + '</td><td>' + x.count + '</td><td>' + x.usage.toFixed(1) + '</td><td>' + formatMoney(x.due) + '</td><td>' + formatMoney(x.paid) + '</td></tr>';
    });
    bh += '</tbody></table>';
  }
  document.getElementById('analysisCustomerBreakdown').innerHTML = bh;

  // Payment summary
  document.getElementById('analysisPaymentSummary').innerHTML =
    '<h3>💳 Payment</h3>' +
    '<div class="analysis-summary">' +
    '<div><div class="label">✅ Paid</div><div class="value">' + pc + '</div></div>' +
    '<div><div class="label">⚠ Partial</div><div class="value">' + prc + '</div></div>' +
    '<div><div class="label">❌ Unpaid</div><div class="value">' + uc + '</div></div>' +
    '<div><div class="label">📊 Rate</div><div class="value">' + cr + '%</div></div>' +
    '</div>';

  // Yearly chart
  renderYearlyChart(bills);
}

// === YEARLY OVERVIEW CHART ===
function renderYearlyChart(all) {
  var mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var mt = [];

  for (var m = 0; m < 12; m++) {
    var mb = all.filter(function (b) {
      var d = new Date(b.date);
      return d.getFullYear() === analysisYear && d.getMonth() === m;
    });
    var r = 0;
    mb.forEach(function (b) { r += b.totalDue });
    mt.push({ m: mn[m], r: r });
  }

  var mx = Math.max.apply(null, mt.map(function (x) { return x.r })) || 1;
  var af = getAnalysisFilter();
  var h = '';

  mt.forEach(function (x, i) {
    var ht = x.r > 0 ? Math.max(6, (x.r / mx) * 120) : 0;
    var isAct = i >= af.startMonth && i <= af.endMonth;

    h += '<div class="chart-bar-wrapper" ' +
      'onclick="analysisMonth=' + i + ';analysisPeriod=\'monthly\';' +
      'document.querySelectorAll(\'#periodTabs button\').forEach(function(b){b.classList.remove(\'active\')});' +
      'document.querySelector(\'#periodTabs button\').classList.add(\'active\');' +
      'renderAnalysis()" style="cursor:pointer">' +
      (x.r > 0 ? '<div class="chart-bar-value">' + formatMoney(x.r) + '</div>' : '') +
      '<div class="chart-bar" style="height:' + ht + 'px;background:' + (isAct ? 'var(--bg-accent)' : 'rgba(0,123,255,.25)') + '"></div>' +
      '<div class="chart-bar-label" style="' + (isAct ? 'font-weight:700;color:var(--bg-accent)' : '') + '">' + x.m + '</div></div>';
  });

  document.getElementById('yearlyChartBars').innerHTML = h;
}

// === EXPORT ANALYSIS ===
function exportAnalysisToExcel() {
  var bills = getData('bills');
  var custs = getData('customers');
  var af = getAnalysisFilter();

  var fb = bills.filter(function (b) {
    var d = new Date(b.date);
    return d.getFullYear() === af.year && d.getMonth() >= af.startMonth && d.getMonth() <= af.endMonth;
  });

  if (!fb.length) { alert('No data'); return; }

  var sym = getCurrencySymbol();
  var label = getAnalysisPeriodLabel();

  var data = [
    ['Analysis: ' + label],
    [''],
    ['Customer', 'Date', 'm³', 'Due (' + sym + ')', 'Paid (' + sym + ')', 'Penalty', 'Status']
  ];

  fb.forEach(function (b) {
    var c = custs.find(function (x) { return x.id === b.customerId });
    data.push([
      c ? c.name : '?', b.date, b.totalUsed, b.totalDue,
      b.amountPaid || 0, b.penaltyAmount || 0, b.paymentStatus || 'unpaid'
    ]);
  });

  var tr = 0, tc = 0;
  fb.forEach(function (b) { tr += b.totalDue; tc += (b.amountPaid || 0) });
  data.push([''], ['TOTAL', '', '', tr, tc, '', Math.round(tc / tr * 100) + '%']);

  var ws = XLSX.utils.aoa_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analysis');
  XLSX.writeFile(wb, 'analysis-' + label.replace(/\s/g, '-') + '.xlsx');
}
