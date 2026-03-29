// ============================================
// UI.JS - Navigation, Timer, Scroll, QR, Suggestions
// ============================================

// === NAVIGATION ===
function showSection(id) {
  document.querySelectorAll('.section').forEach(function (s) {
    s.classList.remove('active');
  });

  var el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);

  // Load section-specific data
  if (id === 'newBillSection') {
    if (typeof loadCustomerDropdowns === 'function') loadCustomerDropdowns();
    if (typeof clearBillForm === 'function') clearBillForm();
  } else if (id === 'historySection') {
    if (typeof loadCustomerDropdowns === 'function') loadCustomerDropdowns();
    if (typeof loadFilteredHistory === 'function') loadFilteredHistory();
  } else if (id === 'customersSection') {
    if (typeof loadCustomersList === 'function') loadCustomersList();
  } else if (id === 'settingsSection') {
    if (typeof loadSettings === 'function') loadSettings();
    if (typeof updateDevModeUI === 'function') updateDevModeUI();
  } else if (id === 'customizeSection') {
    if (typeof loadCustomizationForm === 'function') loadCustomizationForm();
  } else if (id === 'analysisSection') {
    if (typeof renderAnalysis === 'function') renderAnalysis();
  } else if (id === 'incomeStatementSection') {
    if (typeof renderIncomeStatement === 'function') renderIncomeStatement();
  } else if (id === 'balanceSheetSection') {
    if (typeof renderBalanceSheet === 'function') renderBalanceSheet();
  } else if (id === 'menuSection') {
    if (typeof updateMenuBadges === 'function') updateMenuBadges();
  }
}

// === MENU BADGES ===
function updateMenuBadges() {
  var bills = getData('bills');
  var unpaid = bills.filter(function (b) {
    return (b.paymentStatus || 'unpaid') !== 'paid';
  }).length;

  var card = document.getElementById('menuCustomerCard');
  if (!card) return;

  // Remove existing badge
  var existing = card.querySelector('.menu-badge');
  if (existing) existing.remove();

  // Add badge if unpaid bills exist
  if (unpaid > 0) {
    var badge = document.createElement('div');
    badge.className = 'menu-badge danger';
    badge.textContent = unpaid + ' unpaid';
    card.appendChild(badge);
  }
}

// === TIMER WIDGET ===
var timerVisible = localStorage.getItem(TIMER_VISIBLE_KEY) !== 'false';
var timerInitialized = false;

function initTimer() {
  if (timerInitialized) return; // Prevent duplicate initialization
  timerInitialized = true;

  var d = document.getElementById('timerDisplay');
  var t = document.getElementById('timerToggle');
  if (!d || !t) return;

  // Set initial state
  if (!timerVisible) {
    d.classList.add('hidden');
    t.textContent = '⏱';
  } else {
    d.classList.remove('hidden');
    t.textContent = '✕';
  }

  // Toggle handler
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

  // Start countdown
  updateTimerDisplay();
  setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  var el = document.getElementById('timerCountdown');
  var sub = document.getElementById('timerSubtext');
  if (!el || !sub) return;

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
    if (typeof scheduleSync === 'function') scheduleSync();
    return;
  }

  // Calculate time remaining
  var days = Math.floor(rem / 864e5);
  var hours = Math.floor(rem % 864e5 / 36e5);
  var mins = Math.floor(rem % 36e5 / 6e4);
  var secs = Math.floor(rem % 6e4 / 1e3);
  var pad = function (n) { return String(n).padStart(2, '0'); };

  el.textContent = pad(days) + 'd ' + pad(hours) + 'h ' + pad(mins) + 'm ' + pad(secs) + 's';

  // Color based on remaining time
  if (days >= 7) el.className = 'timer-countdown active';
  else if (days >= 3) el.className = 'timer-countdown warning';
  else el.className = 'timer-countdown critical';

  // Subtext: expiry date + sync status
  var expiryDate = new Date(ex).toLocaleDateString();
  var syncAge = Date.now() - parseInt(localStorage.getItem(TIME_SYNC_DEVICE_KEY) || '0');
  var syncText = syncAge < 36e5 ? '🔄 Synced' : '🕐 ' + Math.floor(syncAge / 36e5) + 'h ago';

  sub.textContent = 'Expires: ' + expiryDate + ' • ' + syncText;
}

// === SUGGESTION BOX ===
var MAX_SUGGESTION_LENGTH = 500;
var MAX_SUGGESTIONS = 50;

function openSuggestionBox() {
  var modal = document.getElementById('suggestionModal');
  var textEl = document.getElementById('suggestionText');
  if (!modal) return;

  modal.style.display = 'flex';
  if (textEl) {
    textEl.value = '';
    setTimeout(function () { textEl.focus(); }, 100);
  }
  renderSuggestionHistory();
}

function closeSuggestionBox() {
  var modal = document.getElementById('suggestionModal');
  if (modal) modal.style.display = 'none';
}

function submitSuggestion() {
  var textEl = document.getElementById('suggestionText');
  if (!textEl) return;

  var text = textEl.value.trim();

  if (!text) {
    alert('Please type a suggestion');
    textEl.focus();
    return;
  }

  if (text.length > MAX_SUGGESTION_LENGTH) {
    alert('Suggestion too long. Maximum ' + MAX_SUGGESTION_LENGTH + ' characters.\nCurrent: ' + text.length);
    return;
  }

  var suggestions = JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]');

  suggestions.unshift({
    id: Date.now(),
    text: text,
    date: new Date().toISOString()
  });

  // Keep max limit
  if (suggestions.length > MAX_SUGGESTIONS) {
    suggestions = suggestions.slice(0, MAX_SUGGESTIONS);
  }

  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
  if (typeof scheduleSync === 'function') scheduleSync();

  textEl.value = '';
  alert('✅ Suggestion submitted! Thank you.');
  renderSuggestionHistory();
}

function deleteSuggestion(id) {
  if (!confirm('Delete this suggestion?')) return;

  var suggestions = JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]');
  suggestions = suggestions.filter(function (s) { return s.id !== id; });
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
  if (typeof scheduleSync === 'function') scheduleSync();
  renderSuggestionHistory();
}

function renderSuggestionHistory() {
  var el = document.getElementById('suggestionHistory');
  if (!el) return;

  var suggestions = JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]');

  if (!suggestions.length) {
    el.innerHTML = '<p style="font-size:11px;color:#999;text-align:center;padding:8px">No suggestions yet. Your feedback helps improve the app!</p>';
    return;
  }

  var countText = '<div style="font-size:11px;font-weight:700;margin-bottom:5px;color:#666">' +
    'Previous Suggestions (' + suggestions.length + '):</div>';

  el.innerHTML = countText + suggestions.slice(0, 15).map(function (s) {
    return '<div style="padding:6px;margin:3px 0;background:#f8f9fa;border-radius:4px;font-size:11px;display:flex;justify-content:space-between;align-items:flex-start;gap:6px">' +
      '<span style="flex:1;word-break:break-word">' + s.text + '</span>' +
      '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">' +
      '<small style="color:#999;white-space:nowrap">' + new Date(s.date).toLocaleDateString() + '</small>' +
      '<button onclick="deleteSuggestion(' + s.id + ')" style="width:auto;padding:2px 6px;font-size:9px;background:var(--bg-danger);margin:0;min-width:20px" title="Delete">✕</button>' +
      '</div></div>';
  }).join('') +
    (suggestions.length > 15
      ? '<div style="text-align:center;font-size:10px;color:#999;margin-top:4px">...and ' + (suggestions.length - 15) + ' more</div>'
      : '');
}

// === QR CODE ===
function handleQrUpload(e) {
  var f = e.target.files[0];
  if (!f) return;

  // Validate file
  if (typeof validateImageFile === 'function' && !validateImageFile(f)) {
    e.target.value = '';
    return;
  }

  resizeImage(f, 500, 500, 0.9)
    .then(function (d) {
      var im = getImages();
      im.qrCode = d;
      saveImages(im);
      if (typeof scheduleSync === 'function') scheduleSync();

      var preview = document.getElementById('qrPreview');
      if (preview) preview.innerHTML = '<img src="' + d + '">';
    })
    .catch(function (err) {
      alert('❌ Error uploading QR: ' + (err.message || 'Unknown error'));
    });
}

function removeQrCode() {
  var im = getImages();
  if (!im.qrCode) {
    alert('No QR code to remove');
    return;
  }

  if (!confirm('Remove QR code?')) return;

  im.qrCode = '';
  saveImages(im);
  if (typeof scheduleSync === 'function') scheduleSync();

  var preview = document.getElementById('qrPreview');
  if (preview) preview.innerHTML = '<span style="font-size:32px;color:var(--text-muted)">📷</span>';

  var upload = document.getElementById('qrUpload');
  if (upload) upload.value = '';
}

function saveQrAndContract() {
  var contractEl = document.getElementById('subscriptionContract');
  if (!contractEl) return;

  var c = getCustomization();
  c.subscriptionContract = contractEl.value;
  saveCustomizationData(c);
  alert('✅ QR & Contract saved!');
}

function showQrForPayment() {
  var modal = document.getElementById('qrDisplayModal');
  var imgDiv = document.getElementById('qrDisplayImage');
  var contractDiv = document.getElementById('qrDisplayContract');
  if (!modal) return;

  var im = getImages();
  var c = getCustomization();

  if (imgDiv) {
    if (im.qrCode) {
      imgDiv.innerHTML = '<img src="' + im.qrCode + '" style="max-width:100%;max-height:250px;border-radius:8px">';
    } else {
      imgDiv.innerHTML = '<p style="color:#999;padding:20px">No QR code uploaded yet.<br><small>Upload one in Settings → Master Password → Payment QR Code</small></p>';
    }
  }

  if (contractDiv) {
    contractDiv.textContent = c.subscriptionContract || '';
  }

  modal.style.display = 'flex';
}

function loadQrSection() {
  var im = getImages();
  var c = getCustomization();

  var preview = document.getElementById('qrPreview');
  if (preview) {
    if (im.qrCode) {
      preview.innerHTML = '<img src="' + im.qrCode + '">';
    } else {
      preview.innerHTML = '<span style="font-size:32px;color:var(--text-muted)">📷</span>';
    }
  }

  var contractEl = document.getElementById('subscriptionContract');
  if (contractEl) {
    contractEl.value = c.subscriptionContract || '';
  }
}

// === SCROLL TO TOP ===
function initScrollToTop() {
  var lastScrollCheck = 0;
  var SCROLL_THROTTLE = 100; // ms

  window.addEventListener('scroll', function () {
    var now = Date.now();
    if (now - lastScrollCheck < SCROLL_THROTTLE) return;
    lastScrollCheck = now;

    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    var btn = document.getElementById('scrollTopBtn');
    if (btn) {
      if (scrollTop > 200) btn.classList.add('visible');
      else btn.classList.remove('visible');
    }
  }, { passive: true });
}
