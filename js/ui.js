// ============================================
// UI.JS - Navigation, Timer, Scroll, QR, Suggestions
// ============================================

// === NAVIGATION ===
function showSection(id) {
  document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active') });
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);

  if (id === 'newBillSection') { loadCustomerDropdowns(); clearBillForm(); }
  else if (id === 'historySection') { loadCustomerDropdowns(); loadFilteredHistory(); }
  else if (id === 'customersSection') loadCustomersList();
  else if (id === 'settingsSection') { loadSettings(); updateDevModeUI(); }
  else if (id === 'customizeSection') loadCustomizationForm();
  else if (id === 'analysisSection') renderAnalysis();
  else if (id === 'incomeStatementSection') renderIncomeStatement();
  else if (id === 'balanceSheetSection') renderBalanceSheet();
  else if (id === 'menuSection') updateMenuBadges();
}

// === MENU BADGES ===
function updateMenuBadges() {
  var bills = getData('bills');
  var unpaid = bills.filter(function (b) { return (b.paymentStatus || 'unpaid') !== 'paid' }).length;
  var card = document.getElementById('menuCustomerCard');
  if (!card) return;

  var existing = card.querySelector('.menu-badge');
  if (existing) existing.remove();

  if (unpaid > 0) {
    var badge = document.createElement('div');
    badge.className = 'menu-badge danger';
    badge.textContent = unpaid + ' unpaid';
    card.appendChild(badge);
  }
}

// === TIMER WIDGET ===
var timerVisible = localStorage.getItem(TIMER_VISIBLE_KEY) !== 'false';

function initTimer() {
  var d = document.getElementById('timerDisplay');
  var t = document.getElementById('timerToggle');

  if (!timerVisible) {
    d.classList.add('hidden');
    t.textContent = '⏱';
  } else {
    d.classList.remove('hidden');
    t.textContent = '✕';
  }

  t.addEventListener('click', function () {
    timerVisible = !timerVisible;
    localStorage.setItem(TIMER_VISIBLE_KEY, String(timerVisible));
    if (timerVisible) {
      d.classList.remove('hidden');
      t.textContent = '✕';
    } else {
      d.classList.add('hidden');
      t.textContent = '⏱';
    }
  });

  updateTimerDisplay();
  setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  var el = document.getElementById('timerCountdown');
  var sub = document.getElementById('timerSubtext');
  var tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  var ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');

  // No temp password
  if (!tp || !ex) {
    el.textContent = 'No temp password';
    el.className = 'timer-countdown inactive';
    sub.textContent = '';
    return;
  }

  // Check time sync
  var now = getCurrentTimeSync();
  if (now === null) {
    el.textContent = 'Sync required';
    el.className = 'timer-countdown inactive';
    sub.textContent = 'Connect to internet';
    return;
  }

  var rem = ex - now;

  // Expired
  if (rem <= 0) {
    el.textContent = 'EXPIRED';
    el.className = 'timer-countdown critical';
    sub.textContent = '';
    localStorage.removeItem(TEMP_PASSWORD_KEY);
    localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
    scheduleSync();
    return;
  }

  // Calculate time remaining
  var d = Math.floor(rem / 864e5);
  var h = Math.floor(rem % 864e5 / 36e5);
  var m = Math.floor(rem % 36e5 / 6e4);
  var s = Math.floor(rem % 6e4 / 1e3);
  var pad = function (n) { return String(n).padStart(2, '0') };

  el.textContent = pad(d) + 'd ' + pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
  el.className = 'timer-countdown ' + (d >= 7 ? 'active' : d >= 3 ? 'warning' : 'critical');

  // Sync status
  var sa = Date.now() - parseInt(localStorage.getItem(TIME_SYNC_DEVICE_KEY) || '0');
  sub.textContent = sa < 36e5 ? '🔄 Synced' : '🕐 ' + Math.floor(sa / 36e5) + 'h ago';
}

// === SUGGESTION BOX ===
function openSuggestionBox() {
  document.getElementById('suggestionModal').style.display = 'flex';
  document.getElementById('suggestionText').value = '';
  renderSuggestionHistory();
}

function closeSuggestionBox() {
  document.getElementById('suggestionModal').style.display = 'none';
}

function submitSuggestion() {
  var text = document.getElementById('suggestionText').value.trim();
  if (!text) { alert('Please type a suggestion.'); return; }

  var suggestions = JSON.parse(localStorage.getItem('water_suggestions') || '[]');
  suggestions.unshift({
    id: Date.now(),
    text: text,
    date: new Date().toISOString()
  });

  // Keep max 50
  if (suggestions.length > 50) suggestions = suggestions.slice(0, 50);

  localStorage.setItem('water_suggestions', JSON.stringify(suggestions));
  scheduleSync();

  document.getElementById('suggestionText').value = '';
  alert('✅ Suggestion submitted! Thank you.');
  renderSuggestionHistory();
}

function renderSuggestionHistory() {
  var el = document.getElementById('suggestionHistory');
  if (!el) return;

  var suggestions = JSON.parse(localStorage.getItem('water_suggestions') || '[]');

  if (!suggestions.length) {
    el.innerHTML = '<p style="font-size:11px;color:#999;text-align:center">No suggestions yet</p>';
    return;
  }

  el.innerHTML = '<div style="font-size:11px;font-weight:700;margin-bottom:5px;color:#666">Previous Suggestions:</div>' +
    suggestions.slice(0, 10).map(function (s) {
      return '<div style="padding:6px;margin:3px 0;background:#f8f9fa;border-radius:4px;font-size:11px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<span style="flex:1">' + s.text + '</span>' +
        '<small style="color:#999;white-space:nowrap">' + new Date(s.date).toLocaleDateString() + '</small>' +
        '</div>';
    }).join('');
}

// === QR CODE ===
function handleQrUpload(e) {
  var f = e.target.files[0];
  if (!f) return;

  resizeImage(f, 500, 500, .9).then(function (d) {
    var im = getImages();
    im.qrCode = d;
    saveImages(im);
    scheduleSync();
    document.getElementById('qrPreview').innerHTML = '<img src="' + d + '">';
  }).catch(function () {
    alert('Error uploading QR');
  });
}

function removeQrCode() {
  var im = getImages();
  im.qrCode = '';
  saveImages(im);
  scheduleSync();
  document.getElementById('qrPreview').innerHTML = '<span style="font-size:32px;color:var(--text-muted)">📷</span>';
  document.getElementById('qrUpload').value = '';
}

function saveQrAndContract() {
  var c = getCustomization();
  c.subscriptionContract = document.getElementById('subscriptionContract').value;
  saveCustomizationData(c);
  alert('✅ QR & Contract saved!');
}

function showQrForPayment() {
  var im = getImages();
  var c = getCustomization();
  var modal = document.getElementById('qrDisplayModal');
  var imgDiv = document.getElementById('qrDisplayImage');
  var contractDiv = document.getElementById('qrDisplayContract');

  if (im.qrCode) {
    imgDiv.innerHTML = '<img src="' + im.qrCode + '" style="max-width:100%;max-height:250px;border-radius:8px">';
  } else {
    imgDiv.innerHTML = '<p style="color:#999">No QR code uploaded yet</p>';
  }

  contractDiv.textContent = c.subscriptionContract || '';
  modal.style.display = 'flex';
}

function loadQrSection() {
  var im = getImages();
  var c = getCustomization();

  if (im.qrCode) {
    document.getElementById('qrPreview').innerHTML = '<img src="' + im.qrCode + '">';
  }
  document.getElementById('subscriptionContract').value = c.subscriptionContract || '';
}

// === SCROLL TO TOP ===
function initScrollToTop() {
  window.addEventListener('scroll', function () {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    var btn = document.getElementById('scrollTopBtn');
    if (btn) {
      if (scrollTop > 200) btn.classList.add('visible');
      else btn.classList.remove('visible');
    }
  }, { passive: true });
}
