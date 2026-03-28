// ============================================
// ANALYSIS.JS - Reports, Charts & Analytics
// ============================================

// === PERIOD CONTROLS ===
function setAnalysisPeriod(p, btn) {
  analysisPeriod = p;
  document.querySelectorAll('#periodTabs button').forEach(function (b) {
    b.classList.remove('active');
  });
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

  // Bounds check: reasonable year range
  if (analysisYear < 2000) analysisYear = 2000;
  if (analysisYear > 2100) analysisYear = 2100;

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

// === SAFE PERCENTAGE ===
function safePercent(part, total) {
  if (!total || total === 0) return 0;
  return Math.round(part / total * 100);
}

// === FORMAT SHORT MONEY (for chart labels) ===
function formatShortMoney(val) {
  var sym = getCurrencySymbol();
  if (val >= 1000000) return sym + (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return sym + (val / 1000).toFixed(1) + 'K';
  return sym + Math.round(val);
}

// === BUILD STATS CARDS ===
function buildAnalysisStats(tr, tc, filtered, tu, cr) {
  var crColor = cr >= 80 ? '#28a745' : cr >= 50 ? '#ffc107' : '#dc3545';

  return '<div class="stat-card"><div class="stat-value">' + formatMoney(tr) + '</div><div class="stat-label">Billed</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:#28a745">' + formatMoney(tc) + '</div><div class="stat-label">Collected</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:#dc3545">' + formatMoney(tr - tc) + '</div><div class="stat-label">Outstanding</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + filtered.length + '</div><div class="stat-label">Bills</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + tu.toFixed(1) + '</div><div class="stat-label">m³ Used</div></div>' +
    '<div class="stat-card"><div class="stat-value" style="color:' + crColor + '">' + cr + '%</div><div class="stat-label">Collection</div></div>';
}

// === BUILD CHART BARS ===
function buildChartBars(chartData, chartLabels) {
  var vals = Object.values(chartData);
  var mx = Math.max.apply(null, vals) || 1;
  var keys = Object.keys(chartData);
  var html = '';

  keys.forEach(function (k, i) {
    var v = chartData[k];
    var h = v > 0 ? Math.max(6, (v / mx) * 120) : 0;
    var bgColor = v > 0 ? 'var(--bg-accent)' : 'var(--bg-card-border)';

    html += '<div class="chart-bar-wrapper">' +
      (v > 0 ? '<div class="chart-bar-value">' + formatShortMoney(v) + '</div>' : '') +
      '<div class="chart-bar" style="height:' + h + 'px;background:' + bgColor + '" title="' + chartLabels[i] + ': ' + formatMoney(v) + '"></div>' +
      '<div class="chart-bar-label">' + chartLabels[i] + '</div></div>';
  });

  return html;
}

// === BUILD CUSTOMER BREAKDOWN ===
function buildCustomerBreakdown(filtered, custs) {
  var cd = {};

  filtered.forEach(function (b) {
    if (!cd[b.customerId]) {
      cd[b.customerId] = { name: '', due: 0, paid: 0, usage: 0, count: 0, penalty: 0 };
    }
    var c = custs.find(function (x) { return x.id === b.customerId; });
    cd[b.customerId].name = c ? c.name : 'Unknown';
    cd[b.customerId].due += b.totalDue;
    cd[b.customerId].paid += (b.amountPaid || 0);
    cd[b.customerId].usage += b.totalUsed;
    cd[b.customerId].count++;
    cd[b.customerId].penalty += (b.penaltyAmount || 0);
  });

  var ca = Object.values(cd).sort(function (a, b) { return b.due - a.due; });

  var html = '<h3>📋 Customer Breakdown</h3>';

  if (!ca.length) {
    html += '<p style="text-align:center;color:var(--text-muted);padding:15px">No data for this period</p>';
    return html;
  }

  // Responsive table wrapper
  html += '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">' +
    '<table><thead><tr>' +
    '<th>Customer</th><th>Bills</th><th>m³</th><th>Due</th><th>Paid</th>' +
    '</tr></thead><tbody>';

  ca.forEach(function (x) {
    html += '<tr>' +
      '<td>' + x.name + '</td>' +
      '<td>' + x.count + '</td>' +
      '<td>' + x.usage.toFixed(1) + '</td>' +
      '<td>' + formatMoney(x.due) + '</td>' +
      '<td>' + formatMoney(x.paid) + '</td>' +
      '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

// === BUILD PAYMENT SUMMARY ===
function buildPaymentSummary(pc, prc, uc, cr) {
  return '<h3>💳 Payment Summary</h3>' +
    '<div class="analysis-summary">' +
    '<div><div class="label">✅ Paid</div><div class="value">' + pc + '</div></div>' +
    '<div><div class="label">⚠ Partial</div><div class="value">' + prc + '</div></div>' +
    '<div><div class="label">❌ Unpaid</div><div class="value">' + uc + '</div></div>' +
    '<div><div class="label">📊 Rate</div><div class="value">' + cr + '%</div></div>' +
    '</div>';
}

// === MAIN RENDER ===
function renderAnalysis() {
  var bills = getData('bills');
  var custs = getData('customers');
  var af = getAnalysisFilter();

  // Update period label
  var labelEl = document.getElementById('analysisPeriodLabel');
  if (labelEl) labelEl.textContent = getAnalysisPeriodLabel();

  // Filter bills for period
  var filtered = bills.filter(function (b) {
    var d = new Date(b.date);
    return d.getFullYear() === af.year &&
      d.getMonth() >= af.startMonth &&
      d.getMonth() <= af.endMonth;
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

  var cr = safePercent(tc, tr);

  // Render stats
  var statsEl = document.getElementById('analysisStats');
  if (statsEl) statsEl.innerHTML = buildAnalysisStats(tr, tc, filtered, tu, cr);

  // Build chart data
  var chartData = {};
  var chartLabels = [];

  if (analysisPeriod === 'monthly') {
    var dim = new Date(af.year, af.endMonth + 1, 0).getDate();
    for (var i = 1; i <= dim; i++) {
      chartData[i] = 0;
      chartLabels.push(String(i));
    }
    filtered.forEach(function (b) {
      var day = new Date(b.date).getDate();
      if (chartData[day] !== undefined) chartData[day] += b.totalDue;
    });
  } else {
    var mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var m = af.startMonth; m <= af.endMonth; m++) {
      chartData[m] = 0;
      chartLabels.push(mn[m]);
    }
    filtered.forEach(function (b) {
      var mo = new Date(b.date).getMonth();
      if (chartData[mo] !== undefined) chartData[mo] += b.totalDue;
    });
  }

  // Render chart
  var chartEl = document.getElementById('chartBars');
  if (chartEl) chartEl.innerHTML = buildChartBars(chartData, chartLabels);

  // Render customer breakdown
  var breakdownEl = document.getElementById('analysisCustomerBreakdown');
  if (breakdownEl) breakdownEl.innerHTML = buildCustomerBreakdown(filtered, custs);

  // Render payment summary
  var paymentEl = document.getElementById('analysisPaymentSummary');
  if (paymentEl) paymentEl.innerHTML = buildPaymentSummary(pc, prc, uc, cr);

  // Yearly chart
  renderYearlyChart(bills);
}

// === YEARLY OVERVIEW CHART ===
function renderYearlyChart(allBills) {
  var mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var monthlyTotals = [];

  for (var m = 0; m < 12; m++) {
    var monthBills = allBills.filter(function (b) {
      var d = new Date(b.date);
      return d.getFullYear() === analysisYear && d.getMonth() === m;
    });
    var revenue = 0;
    monthBills.forEach(function (b) { revenue += b.totalDue; });
    monthlyTotals.push({ month: mn[m], revenue: revenue, index: m });
  }

  var mx = Math.max.apply(null, monthlyTotals.map(function (x) { return x.revenue; })) || 1;
  var af = getAnalysisFilter();
  var html = '';

  monthlyTotals.forEach(function (x) {
    var ht = x.revenue > 0 ? Math.max(6, (x.revenue / mx) * 120) : 0;
    var isActive = x.index >= af.startMonth && x.index <= af.endMonth;
    var barBg = isActive ? 'var(--bg-accent)' : 'rgba(0,123,255,.25)';
    var labelStyle = isActive ? 'font-weight:700;color:var(--bg-accent)' : '';

    html += '<div class="chart-bar-wrapper" onclick="jumpToMonth(' + x.index + ')" style="cursor:pointer">' +
      (x.revenue > 0 ? '<div class="chart-bar-value">' + formatShortMoney(x.revenue) + '</div>' : '') +
      '<div class="chart-bar" style="height:' + ht + 'px;background:' + barBg + '" title="' + x.month + ' ' + analysisYear + ': ' + formatMoney(x.revenue) + '"></div>' +
      '<div class="chart-bar-label" style="' + labelStyle + '">' + x.month + '</div></div>';
  });

  var yearlyEl = document.getElementById('yearlyChartBars');
  if (yearlyEl) yearlyEl.innerHTML = html;
}

// === JUMP TO MONTH (from yearly chart click) ===
function jumpToMonth(monthIndex) {
  analysisMonth = monthIndex;
  analysisPeriod = 'monthly';

  // Update period tab buttons
  document.querySelectorAll('#periodTabs button').forEach(function (b) {
    b.classList.remove('active');
  });
  var firstTab = document.querySelector('#periodTabs button');
  if (firstTab) firstTab.classList.add('active');

  renderAnalysis();
}

// === EXPORT ANALYSIS ===
function exportAnalysisToExcel() {
  var bills = getData('bills');
  var custs = getData('customers');
  var af = getAnalysisFilter();

  var fb = bills.filter(function (b) {
    var d = new Date(b.date);
    return d.getFullYear() === af.year &&
      d.getMonth() >= af.startMonth &&
      d.getMonth() <= af.endMonth;
  });

  if (!fb.length) {
    alert('No data for this period');
    return;
  }

  var sym = getCurrencySymbol();
  var label = getAnalysisPeriodLabel();

  var data = [
    ['Analysis Report: ' + label],
    ['Generated: ' + new Date().toLocaleDateString()],
    [''],
    ['Customer', 'Date', 'Ref', 'm³', 'Due (' + sym + ')', 'Paid (' + sym + ')', 'Penalty', 'Status']
  ];

  fb.forEach(function (b) {
    var c = custs.find(function (x) { return x.id === b.customerId; });
    data.push([
      c ? c.name : 'Unknown',
      b.date,
      b.ref || '',
      b.totalUsed,
      b.totalDue,
      b.amountPaid || 0,
      b.penaltyAmount || 0,
      b.paymentStatus || 'unpaid'
    ]);
  });

  // Summary
  var tr = 0, tc = 0;
  fb.forEach(function (b) {
    tr += b.totalDue;
    tc += (b.amountPaid || 0);
  });

  data.push([]);
  data.push(['SUMMARY']);
  data.push(['Total Billed', '', '', '', tr]);
  data.push(['Total Collected', '', '', '', '', tc]);
  data.push(['Outstanding', '', '', '', tr - tc]);
  data.push(['Collection Rate', '', '', '', safePercent(tc, tr) + '%']);
  data.push(['Total Bills', '', '', '', fb.length]);

  var ws = XLSX.utils.aoa_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analysis');
  XLSX.writeFile(wb, 'analysis-' + label.replace(/\s/g, '-') + '.xlsx');
}
