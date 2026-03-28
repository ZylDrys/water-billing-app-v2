// ============================================
// ANALYSIS.JS — Reports, Charts & Analytics
// ============================================

// ─── CONSTANTS ─────────────────────────────
var MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// ─── HELPERS ───────────────────────────────

/**
 * Safely get a DOM element by ID (logs warning if missing)
 */
function getAnalysisEl(id) {
  var el = document.getElementById(id);
  if (!el) {
    console.warn('[analysis.js] Element #' + id + ' not found');
  }
  return el;
}

/**
 * Escape HTML to prevent XSS in innerHTML
 */
function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}

/**
 * Parse a date string safely — returns null if invalid
 */
function safeParseDate(dateStr) {
  if (!dateStr) return null;
  var d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Safe Math.max that handles empty arrays
 */
function safeMax(arr) {
  if (!arr || !arr.length) return 0;
  return Math.max.apply(null, arr);
}


// ═══════════════════════════════════════════
// PERIOD CONTROLS
// ═══════════════════════════════════════════

function setAnalysisPeriod(period, btn) {
  analysisPeriod = period;

  document.querySelectorAll('#periodTabs button').forEach(function (b) {
    b.classList.remove('active');
  });

  if (btn) {
    btn.classList.add('active');
  }

  renderAnalysis();
}

function changeAnalysisPeriod(direction) {
  switch (analysisPeriod) {
    case 'monthly':
      analysisMonth += direction;
      if (analysisMonth > 11) { analysisMonth = 0; analysisYear++; }
      else if (analysisMonth < 0) { analysisMonth = 11; analysisYear--; }
      break;

    case 'quarterly':
      analysisQuarter += direction;
      if (analysisQuarter > 3) { analysisQuarter = 0; analysisYear++; }
      else if (analysisQuarter < 0) { analysisQuarter = 3; analysisYear--; }
      break;

    case 'semiannual':
      analysisSemiAnnual += direction;
      if (analysisSemiAnnual > 1) { analysisSemiAnnual = 0; analysisYear++; }
      else if (analysisSemiAnnual < 0) { analysisSemiAnnual = 1; analysisYear--; }
      break;

    default: // yearly
      analysisYear += direction;
      break;
  }

  renderAnalysis();
}

/**
 * Called when a bar in the yearly chart is clicked —
 * drills down into that specific month.
 * FIX: Replaces broken inline onclick that always activated the first tab.
 */
function selectMonthFromYearlyChart(monthIndex) {
  analysisMonth = monthIndex;
  analysisPeriod = 'monthly';

  // Remove active from all tabs
  var tabs = document.querySelectorAll('#periodTabs button');
  tabs.forEach(function (b) {
    b.classList.remove('active');
  });

  // Activate the "Monthly" tab — match by data-period or text content
  var activated = false;
  tabs.forEach(function (b) {
    if (activated) return;
    var byAttr = b.getAttribute('data-period') === 'monthly';
    var byText = b.textContent.trim().toLowerCase() === 'monthly';
    if (byAttr || byText) {
      b.classList.add('active');
      activated = true;
    }
  });

  // Fallback: activate first tab if no match found
  if (!activated && tabs.length) {
    tabs[0].classList.add('active');
  }

  renderAnalysis();
}


// ═══════════════════════════════════════════
// PERIOD FILTER & LABEL
// ═══════════════════════════════════════════

function getAnalysisFilter() {
  var startMonth, endMonth;

  switch (analysisPeriod) {
    case 'monthly':
      startMonth = analysisMonth;
      endMonth = analysisMonth;
      break;

    case 'quarterly':
      startMonth = analysisQuarter * 3;
      endMonth = startMonth + 2;
      break;

    case 'semiannual':
      startMonth = analysisSemiAnnual * 6;
      endMonth = startMonth + 5;
      break;

    default: // yearly
      startMonth = 0;
      endMonth = 11;
      break;
  }

  return {
    startMonth: startMonth,
    endMonth: endMonth,
    year: analysisYear
  };
}

function getAnalysisPeriodLabel() {
  switch (analysisPeriod) {
    case 'monthly':
      return new Date(analysisYear, analysisMonth)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    case 'quarterly':
      return 'Q' + (analysisQuarter + 1) + ' ' + analysisYear;

    case 'semiannual':
      return (analysisSemiAnnual === 0 ? '1st Half' : '2nd Half') + ' ' + analysisYear;

    default:
      return 'Year ' + analysisYear;
  }
}


// ═══════════════════════════════════════════
// DATA PROCESSING
// ═══════════════════════════════════════════

/**
 * Filter bills array to only those within the given period.
 * FIX: validates date before comparing.
 */
function filterBillsByPeriod(bills, filter) {
  return bills.filter(function (b) {
    var d = safeParseDate(b.date);
    if (!d) return false;
    return d.getFullYear() === filter.year &&
           d.getMonth() >= filter.startMonth &&
           d.getMonth() <= filter.endMonth;
  });
}

/**
 * Compute aggregate totals from a set of bills.
 * FIX: every numeric property uses `|| 0` to prevent NaN.
 */
function calculateAnalysisTotals(bills) {
  var totals = {
    revenue: 0,
    collected: 0,
    outstanding: 0,
    usage: 0,
    penalty: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
    billCount: bills.length,
    collectionRate: 0
  };

  bills.forEach(function (b) {
    totals.revenue  += (b.totalDue || 0);
    totals.collected += (b.amountPaid || 0);
    totals.usage    += (b.totalUsed || 0);
    totals.penalty  += (b.penaltyAmount || 0);

    var status = (b.paymentStatus || 'unpaid').toLowerCase();
    switch (status) {
      case 'paid':    totals.paidCount++;    break;
      case 'partial': totals.partialCount++; break;
      default:        totals.unpaidCount++;  break;
    }
  });

  totals.outstanding = totals.revenue - totals.collected;
  totals.collectionRate = totals.revenue > 0
    ? Math.round((totals.collected / totals.revenue) * 100)
    : 0;

  return totals;
}

/**
 * Build chart data structure for the selected period.
 * Monthly → one key per day. Otherwise → one key per month.
 * FIX: uses hasOwnProperty to guard against out-of-range data.
 */
function buildChartData(bills, filter) {
  var data   = {};
  var labels = [];
  var keys, i;

  if (analysisPeriod === 'monthly') {
    // One bar per day
    var daysInMonth = new Date(filter.year, filter.endMonth + 1, 0).getDate();
    for (i = 1; i <= daysInMonth; i++) {
      data[i] = 0;
      labels.push(String(i));
    }
    bills.forEach(function (b) {
      var d = safeParseDate(b.date);
      if (!d) return;
      var day = d.getDate();
      if (data.hasOwnProperty(day)) {
        data[day] += (b.totalDue || 0);
      }
    });
  } else {
    // One bar per month in the range
    for (i = filter.startMonth; i <= filter.endMonth; i++) {
      data[i] = 0;
      labels.push(MONTH_NAMES_SHORT[i]);
    }
    bills.forEach(function (b) {
      var d = safeParseDate(b.date);
      if (!d) return;
      var month = d.getMonth();
      if (data.hasOwnProperty(month)) {
        data[month] += (b.totalDue || 0);
      }
    });
  }

  return { data: data, labels: labels };
}

/**
 * Build a per-customer breakdown sorted by revenue descending.
 */
function buildCustomerBreakdown(bills, customers) {
  var map = {};

  bills.forEach(function (b) {
    var id = b.customerId;
    if (!map[id]) {
      var cust = customers.find(function (c) { return c.id === id; });
      map[id] = {
        name: cust ? cust.name : 'Unknown',
        due: 0,
        paid: 0,
        usage: 0,
        count: 0,
        penalty: 0
      };
    }
    map[id].due     += (b.totalDue || 0);
    map[id].paid    += (b.amountPaid || 0);
    map[id].usage   += (b.totalUsed || 0);
    map[id].count++;
    map[id].penalty += (b.penaltyAmount || 0);
  });

  return Object.values(map).sort(function (a, b) {
    return b.due - a.due;
  });
}


// ═══════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════

function renderStatCards(totals) {
  var el = getAnalysisEl('analysisStats');
  if (!el) return;

  var crColor = totals.collectionRate >= 80 ? '#28a745'
              : totals.collectionRate >= 50 ? '#ffc107'
              : '#dc3545';

  el.innerHTML =
    '<div class="stat-card">' +
      '<div class="stat-value">' + formatMoney(totals.revenue) + '</div>' +
      '<div class="stat-label">Billed</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-value" style="color:#28a745">' + formatMoney(totals.collected) + '</div>' +
      '<div class="stat-label">Collected</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-value" style="color:#dc3545">' + formatMoney(totals.outstanding) + '</div>' +
      '<div class="stat-label">Outstanding</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-value">' + totals.billCount + '</div>' +
      '<div class="stat-label">Bills</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-value">' + totals.usage.toFixed(1) + '</div>' +
      '<div class="stat-label">m³ Used</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-value" style="color:' + crColor + '">' + totals.collectionRate + '%</div>' +
      '<div class="stat-label">Collection</div>' +
    '</div>';
}

function renderChartBars(chartInfo) {
  var el = getAnalysisEl('chartBars');
  if (!el) return;

  var data   = chartInfo.data;
  var labels = chartInfo.labels;
  var keys   = Object.keys(data);
  var values = keys.map(function (k) { return data[k]; });
  var maxVal = safeMax(values) || 1;       // FIX: safe max, fallback to 1

  var html = '';

  keys.forEach(function (key, i) {
    var val       = data[key];
    var barHeight = val > 0 ? Math.max(6, (val / maxVal) * 120) : 0;
    var barColor  = val > 0 ? 'var(--bg-accent)' : 'var(--bg-card-border)';

    html += '<div class="chart-bar-wrapper">';
    if (val > 0) {
      html += '<div class="chart-bar-value">' + formatMoney(val) + '</div>';
    }
    html +=   '<div class="chart-bar"' +
              ' style="height:' + barHeight + 'px;background:' + barColor + '"' +
              ' title="' + labels[i] + ': ' + formatMoney(val) + '">' +
              '</div>' +
              '<div class="chart-bar-label">' + labels[i] + '</div>' +
            '</div>';
  });

  el.innerHTML = html;
}

function renderCustomerBreakdownTable(breakdown) {
  var el = getAnalysisEl('analysisCustomerBreakdown');
  if (!el) return;

  var html = '<h3>📋 Breakdown</h3>';

  if (!breakdown.length) {
    html += '<p style="text-align:center;color:var(--text-muted);padding:15px">No data</p>';
  } else {
    html += '<table><thead><tr>' +
              '<th>Customer</th><th>Bills</th><th>m³</th><th>Due</th><th>Paid</th>' +
            '</tr></thead><tbody>';

    breakdown.forEach(function (row) {
      html += '<tr>' +
        '<td>' + escapeHtml(row.name) + '</td>' +          // FIX: escaped
        '<td>' + row.count + '</td>' +
        '<td>' + row.usage.toFixed(1) + '</td>' +
        '<td>' + formatMoney(row.due) + '</td>' +
        '<td>' + formatMoney(row.paid) + '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
  }

  el.innerHTML = html;
}

function renderPaymentSummary(totals) {
  var el = getAnalysisEl('analysisPaymentSummary');
  if (!el) return;

  el.innerHTML =
    '<h3>💳 Payment</h3>' +
    '<div class="analysis-summary">' +
      '<div><div class="label">✅ Paid</div><div class="value">'    + totals.paidCount    + '</div></div>' +
      '<div><div class="label">⚠ Partial</div><div class="value">' + totals.partialCount + '</div></div>' +
      '<div><div class="label">❌ Unpaid</div><div class="value">'  + totals.unpaidCount  + '</div></div>' +
      '<div><div class="label">📊 Rate</div><div class="value">'   + totals.collectionRate + '%</div></div>' +
    '</div>';
}


// ═══════════════════════════════════════════
// YEARLY OVERVIEW CHART
// ═══════════════════════════════════════════

function renderYearlyChart(allBills) {
  var el = getAnalysisEl('yearlyChartBars');
  if (!el) return;

  var filter   = getAnalysisFilter();
  var monthTotals = [];

  // Aggregate every month of the analysis year
  for (var m = 0; m < 12; m++) {
    var monthRevenue = 0;
    allBills.forEach(function (b) {
      var d = safeParseDate(b.date);
      if (!d) return;
      if (d.getFullYear() === analysisYear && d.getMonth() === m) {
        monthRevenue += (b.totalDue || 0);
      }
    });
    monthTotals.push({ label: MONTH_NAMES_SHORT[m], revenue: monthRevenue });
  }

  var maxVal = safeMax(monthTotals.map(function (x) { return x.revenue; })) || 1;

  var html = '';

  monthTotals.forEach(function (item, i) {
    var barHeight = item.revenue > 0 ? Math.max(6, (item.revenue / maxVal) * 120) : 0;
    var isActive  = i >= filter.startMonth && i <= filter.endMonth;
    var barColor  = isActive ? 'var(--bg-accent)' : 'rgba(0,123,255,.25)';

    // FIX: use named function instead of broken inline onclick
    html += '<div class="chart-bar-wrapper" ' +
                 'onclick="selectMonthFromYearlyChart(' + i + ')" ' +
                 'style="cursor:pointer">';

    if (item.revenue > 0) {
      html += '<div class="chart-bar-value">' + formatMoney(item.revenue) + '</div>';
    }

    html +=   '<div class="chart-bar" style="height:' + barHeight + 'px;background:' + barColor + '"></div>' +
              '<div class="chart-bar-label"' +
                (isActive ? ' style="font-weight:700;color:var(--bg-accent)"' : '') +
              '>' + item.label + '</div>' +
            '</div>';
  });

  el.innerHTML = html;
}


// ═══════════════════════════════════════════
// MAIN RENDER (orchestrator)
// ═══════════════════════════════════════════

function renderAnalysis() {
  var bills     = getData('bills')     || [];
  var customers = getData('customers') || [];
  var filter    = getAnalysisFilter();

  // Period label
  var labelEl = getAnalysisEl('analysisPeriodLabel');
  if (labelEl) {
    labelEl.textContent = getAnalysisPeriodLabel();
  }

  // Filter bills to selected period
  var filtered = filterBillsByPeriod(bills, filter);

  // Calculate totals
  var totals = calculateAnalysisTotals(filtered);

  // Render sections
  renderStatCards(totals);

  var chartInfo = buildChartData(filtered, filter);
  renderChartBars(chartInfo);

  var breakdown = buildCustomerBreakdown(filtered, customers);
  renderCustomerBreakdownTable(breakdown);

  renderPaymentSummary(totals);

  // Yearly overview always uses ALL bills (not filtered)
  renderYearlyChart(bills);
}


// ═══════════════════════════════════════════
// EXPORT ANALYSIS TO EXCEL
// ═══════════════════════════════════════════

function exportAnalysisToExcel() {
  // FIX: guard for missing XLSX library
  if (typeof XLSX === 'undefined') {
    alert('Export library (XLSX) is not loaded. Please check your connection and try again.');
    return;
  }

  var bills     = getData('bills')     || [];
  var customers = getData('customers') || [];
  var filter    = getAnalysisFilter();
  var label     = getAnalysisPeriodLabel();

  var filtered = filterBillsByPeriod(bills, filter);

  if (!filtered.length) {
    alert('No data to export for ' + label);
    return;
  }

  var sym = getCurrencySymbol();

  // Header rows
  var rows = [
    ['Analysis Report: ' + label],
    ['Generated: ' + new Date().toLocaleString()],
    [''],
    ['Customer', 'Date', 'm³ Used', 'Due (' + sym + ')', 'Paid (' + sym + ')', 'Penalty (' + sym + ')', 'Status']
  ];

  // Data rows
  var totalRevenue   = 0;
  var totalCollected = 0;

  filtered.forEach(function (b) {
    var cust = customers.find(function (c) { return c.id === b.customerId; });
    var due  = b.totalDue    || 0;
    var paid = b.amountPaid  || 0;

    totalRevenue   += due;
    totalCollected += paid;

    rows.push([
      cust ? cust.name : 'Unknown',
      b.date || '',
      b.totalUsed      || 0,
      due,
      paid,
      b.penaltyAmount  || 0,
      b.paymentStatus  || 'unpaid'
    ]);
  });

  // FIX: division by zero
  var collectionRate = totalRevenue > 0
    ? Math.round((totalCollected / totalRevenue) * 100) + '%'
    : '0%';

  // Summary row
  rows.push(
    [''],
    ['TOTAL', '', '', totalRevenue, totalCollected, '', collectionRate]
  );

  // Build and download
  try {
    var ws = XLSX.utils.aoa_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analysis');

    var filename = 'analysis-' + label.replace(/\s+/g, '-').toLowerCase() + '.xlsx';
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('[analysis.js] Export failed:', err);
    alert('Export failed. Please try again.');
  }
}
