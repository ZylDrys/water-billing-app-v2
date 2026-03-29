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

// === SUGGESTION BOX (dual-copy system) ===
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

  var entry = {
    id: Date.now(),
    text: text,
    date: new Date().toISOString()
  };

  // Save user copy (they can delete this)
  var userSuggestions = JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]');
  userSuggestions.unshift(entry);
  if (userSuggestions.length > MAX_SUGGESTIONS) userSuggestions = userSuggestions.slice(0, MAX_SUGGESTIONS);
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(userSuggestions));

  // Save dev copy (permanent, only dev can delete)
  var devSuggestions = JSON.parse(localStorage.getItem(DEV_SUGGESTIONS_KEY) || '[]');
  devSuggestions.unshift({
    id: entry.id,
    text: entry.text,
    date: entry.date,
    reply: '',
    replyDate: '',
    read: false
  });
  if (devSuggestions.length > 200) devSuggestions = devSuggestions.slice(0, 200);
  localStorage.setItem(DEV_SUGGESTIONS_KEY, JSON.stringify(devSuggestions));

  if (typeof scheduleSync === 'function') scheduleSync();

  textEl.value = '';
  alert('✅ Suggestion submitted! Thank you.');
  renderSuggestionHistory();
}

function deleteSuggestion(id) {
  if (!confirm('Delete this suggestion?')) return;

  // Only delete from user copy
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
  var devSuggestions = JSON.parse(localStorage.getItem(DEV_SUGGESTIONS_KEY) || '[]');

  if (!suggestions.length) {
    el.innerHTML = '<p style="font-size:11px;color:#999;text-align:center;padding:8px">No suggestions yet. Your feedback helps improve the app!</p>';
    return;
  }

  var countText = '<div style="font-size:11px;font-weight:700;margin-bottom:5px;color:#666">Your Suggestions (' + suggestions.length + '):</div>';

  el.innerHTML = countText + suggestions.slice(0, 15).map(function (s) {
    // Check if dev replied
    var devEntry = devSuggestions.find(function (d) { return d.id === s.id; });
    var replyHtml = '';
    if (devEntry && devEntry.reply) {
      replyHtml = '<div style="margin-top:4px;padding:4px 8px;background:rgba(0,123,255,.08);border-radius:4px;font-size:10px">' +
        '<strong style="color:#007bff">Developer Reply:</strong> ' + devEntry.reply +
        '<br><small style="color:#999">' + (devEntry.replyDate ? new Date(devEntry.replyDate).toLocaleDateString() : '') + '</small>' +
        '</div>';
    }

    return '<div style="padding:6px;margin:3px 0;background:#f8f9fa;border-radius:4px;font-size:11px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">' +
      '<span style="flex:1;word-break:break-word">' + s.text + '</span>' +
      '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">' +
      '<small style="color:#999;white-space:nowrap">' + new Date(s.date).toLocaleDateString() + '</small>' +
      '<button onclick="deleteSuggestion(' + s.id + ')" style="width:auto;padding:2px 6px;font-size:9px;background:var(--bg-danger);margin:0;min-width:20px" title="Delete">✕</button>' +
      '</div></div>' +
      replyHtml +
      '</div>';
  }).join('') +
    (suggestions.length > 15
      ? '<div style="text-align:center;font-size:10px;color:#999;margin-top:4px">...and ' + (suggestions.length - 15) + ' more</div>'
      : '');
}

// === DEV SUGGESTION INBOX (master password area) ===
function renderDevSuggestionInbox() {
  var el = document.getElementById('devSuggestionInbox');
  if (!el) return;

  var devSuggestions = JSON.parse(localStorage.getItem(DEV_SUGGESTIONS_KEY) || '[]');

  if (!devSuggestions.length) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:10px">No suggestions received yet.</p>';
    return;
  }

  var unreadCount = devSuggestions.filter(function (s) { return !s.read; }).length;

  el.innerHTML = '<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-secondary)">' +
    '📬 ' + devSuggestions.length + ' suggestion(s)' +
    (unreadCount > 0 ? ' • <span style="color:#dc3545">' + unreadCount + ' new</span>' : '') +
    '</div>' +
    devSuggestions.map(function (s) {
      var bgColor = s.read ? '#f8f9fa' : 'rgba(0,123,255,.05)';
      var borderLeft = s.read ? '3px solid #eee' : '3px solid #007bff';

      return '<div style="padding:8px;margin:4px 0;background:' + bgColor + ';border-radius:4px;border-left:' + borderLeft + '">' +
        '<div style="font-size:12px;word-break:break-word">' + s.text + '</div>' +
        '<small style="color:#999">' + new Date(s.date).toLocaleDateString() + '</small>' +
        (s.reply
          ? '<div style="margin-top:4px;padding:4px 8px;background:rgba(40,167,69,.08);border-radius:4px;font-size:11px">' +
            '<strong style="color:#28a745">Your Reply:</strong> ' + s.reply +
            '</div>'
          : '') +
        '<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">' +
        (!s.read ? '<button onclick="markDevSuggestionRead(' + s.id + ')" style="width:auto;padding:3px 8px;font-size:10px;background:#17a2b8;margin:0">✅ Mark Read</button>' : '') +
        '<button onclick="replyToDevSuggestion(' + s.id + ')" style="width:auto;padding:3px 8px;font-size:10px;background:#007bff;margin:0">💬 Reply</button>' +
        '<button onclick="deleteDevSuggestion(' + s.id + ')" style="width:auto;padding:3px 8px;font-size:10px;background:var(--bg-danger);margin:0">🗑</button>' +
        '</div></div>';
    }).join('');
}

function markDevSuggestionRead(id) {
  var devSuggestions = JSON.parse(localStorage.getItem(DEV_SUGGESTIONS_KEY) || '[]');
  var entry = devSuggestions.find(function (s) { return s.id === id; });
  if (entry) {
    entry.read = true;
    localStorage.setItem(DEV_SUGGESTIONS_KEY, JSON.stringify(devSuggestions));
    if (typeof scheduleSync === 'function') scheduleSync();
    renderDevSuggestionInbox();
  }
}

function replyToDevSuggestion(id) {
  showPromptModal('Your reply:', false).then(function (reply) {
    if (!reply) return;

    var devSuggestions = JSON.parse(localStorage.getItem(DEV_SUGGESTIONS_KEY) || '[]');
    var entry = devSuggestions.find(function (s) { return s.id === id; });
    if (entry) {
      entry.reply = reply;
      entry.replyDate = new Date().toISOString();
      entry.read = true;
      localStorage.setItem(DEV_SUGGESTIONS_KEY, JSON.stringify(devSuggestions));
      if (typeof scheduleSync === 'function') scheduleSync();
      renderDevSuggestionInbox();
      alert('✅ Reply saved! User will see it in their suggestion history.');
    }
  });
}

function deleteDevSuggestion(id) {
  if (!confirm('Delete this suggestion from your inbox?')) return;

  var devSuggestions = JSON.parse(localStorage.getItem(DEV_SUGGESTIONS_KEY) || '[]');
  devSuggestions = devSuggestions.filter(function (s) { return s.id !== id; });
  localStorage.setItem(DEV_SUGGESTIONS_KEY, JSON.stringify(devSuggestions));
  if (typeof scheduleSync === 'function') scheduleSync();
  renderDevSuggestionInbox();
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

// === MULTI-QR CODE SYSTEM ===
function getDevQrCodes() {
  try {
    return JSON.parse(localStorage.getItem(DEV_QR_CODES_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveDevQrCodes(codes) {
  localStorage.setItem(DEV_QR_CODES_KEY, JSON.stringify(codes));
  if (typeof scheduleSync === 'function') scheduleSync();
}

function addDevQrCode() {
  var nameEl = document.getElementById('devQrName');
  var fileEl = document.getElementById('devQrUpload');
  if (!nameEl || !fileEl) return;

  var name = autoCapitalize(nameEl.value.trim());
  if (!name) { alert('Enter payment method name'); nameEl.focus(); return; }

  var f = fileEl.files[0];
  if (!f) { alert('Select a QR code image'); return; }

  if (typeof validateImageFile === 'function' && !validateImageFile(f)) {
    fileEl.value = '';
    return;
  }

  resizeImage(f, 500, 500, 0.9).then(function (d) {
    var codes = getDevQrCodes();

    if (codes.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) {
      if (!confirm('A QR for "' + name + '" already exists. Replace it?')) return;
      codes = codes.filter(function (c) { return c.name.toLowerCase() !== name.toLowerCase(); });
    }

    codes.push({
      id: Date.now(),
      name: name,
      image: d,
      date: new Date().toISOString()
    });

    saveDevQrCodes(codes);
    nameEl.value = '';
    fileEl.value = '';
    renderDevQrCodesList();
    alert('✅ QR for "' + name + '" added!');
  }).catch(function (err) {
    alert('❌ Error: ' + (err.message || 'Upload failed'));
  });
}

function deleteDevQrCode(id) {
  if (!confirm('Delete this payment QR?')) return;
  saveDevQrCodes(getDevQrCodes().filter(function (c) { return c.id !== id; }));
  renderDevQrCodesList();
}

function renderDevQrCodesList() {
  var el = document.getElementById('devQrCodesList');
  if (!el) return;

  var codes = getDevQrCodes();

  if (!codes.length) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:10px">No payment QR codes yet. Add one below.</p>';
    return;
  }

  el.innerHTML = codes.map(function (c) {
    return '<div style="padding:10px;border:1px solid var(--bg-card-border);border-radius:8px;margin:6px 0;display:flex;align-items:center;gap:10px">' +
      '<img src="' + c.image + '" style="width:60px;height:60px;border-radius:6px;object-fit:contain;background:var(--bg-table-even)">' +
      '<div style="flex:1">' +
      '<strong>' + c.name + '</strong>' +
      '<br><small style="color:var(--text-muted)">' + new Date(c.date).toLocaleDateString() + '</small>' +
      '</div>' +
      '<button onclick="deleteDevQrCode(' + c.id + ')" style="width:auto;padding:4px 8px;font-size:10px;background:var(--bg-danger);margin:0">✕</button>' +
      '</div>';
  }).join('') +
    '<div style="text-align:right;font-size:11px;color:var(--text-muted);margin-top:4px">' + codes.length + ' payment method(s)</div>';
}

function saveDevContract() {
  var contractEl = document.getElementById('subscriptionContract');
  if (!contractEl) return;

  var c = getCustomization();
  c.subscriptionContract = contractEl.value;
  saveCustomizationData(c);
  alert('✅ Contract saved!');
}

function loadQrSection() {
  renderDevQrCodesList();
  renderDevSuggestionInbox();

  var c = getCustomization();
  var contractEl = document.getElementById('subscriptionContract');
  if (contractEl) contractEl.value = c.subscriptionContract || '';
}

// === DEV PAYMENT FLOW (for users) ===
function startDevPaymentFlow() {
  var codes = getDevQrCodes();
  var c = getCustomization();

  if (!codes.length) {
    alert('No payment methods available yet. Contact the developer.');
    return;
  }

  var contract = c.subscriptionContract || '';

  if (contract) {
    // Show contract first
    var contractDiv = document.getElementById('devPaymentContractText');
    if (contractDiv) contractDiv.textContent = contract;
    var modal = document.getElementById('devPaymentContractModal');
    if (modal) modal.style.display = 'flex';
  } else {
    // Skip contract, go directly to QR
    showDevPaymentQr();
  }
}

function showDevPaymentQr() {
  // Hide contract modal if open
  var contractModal = document.getElementById('devPaymentContractModal');
  if (contractModal) contractModal.style.display = 'none';

  var codes = getDevQrCodes();
  if (!codes.length) return;

  var selectorDiv = document.getElementById('devPaymentQrSelector');
  var imgDiv = document.getElementById('devPaymentQrImage');
  var modal = document.getElementById('devPaymentQrModal');
  if (!modal || !selectorDiv || !imgDiv) return;

  // Build payment method buttons
  if (codes.length === 1) {
    selectorDiv.innerHTML = '<div style="font-size:14px;font-weight:700;color:var(--text-primary)">' + codes[0].name + '</div>';
    imgDiv.innerHTML = '<img src="' + codes[0].image + '" style="max-width:100%;max-height:250px;border-radius:8px">';
  } else {
    selectorDiv.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Select payment method:</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">' +
      codes.map(function (c, i) {
        return '<button onclick="selectDevPaymentQr(' + i + ')" ' +
          'id="devQrBtn' + i + '" ' +
          'style="width:auto;padding:6px 12px;font-size:12px;margin:0;background:' + (i === 0 ? 'var(--bg-accent)' : 'var(--bg-table-even)') + ';color:' + (i === 0 ? '#fff' : 'var(--text-secondary)') + '">' +
          c.name + '</button>';
      }).join('') +
      '</div>';
    imgDiv.innerHTML = '<img src="' + codes[0].image + '" style="max-width:100%;max-height:250px;border-radius:8px">';
  }

  modal.style.display = 'flex';
}

function selectDevPaymentQr(index) {
  var codes = getDevQrCodes();
  if (index < 0 || index >= codes.length) return;

  var imgDiv = document.getElementById('devPaymentQrImage');
  if (imgDiv) {
    imgDiv.innerHTML = '<img src="' + codes[index].image + '" style="max-width:100%;max-height:250px;border-radius:8px">';
  }

  // Update button styles
  codes.forEach(function (c, i) {
    var btn = document.getElementById('devQrBtn' + i);
    if (btn) {
      btn.style.background = i === index ? 'var(--bg-accent)' : 'var(--bg-table-even)';
      btn.style.color = i === index ? '#fff' : 'var(--text-secondary)';
    }
  });
}

// === LEGACY QR SUPPORT (backward compatible) ===
function handleQrUpload(e) {
  var f = e.target.files[0];
  if (!f) return;
  if (typeof validateImageFile === 'function' && !validateImageFile(f)) {
    e.target.value = '';
    return;
  }
  resizeImage(f, 500, 500, 0.9).then(function (d) {
    var im = getImages();
    im.qrCode = d;
    saveImages(im);
    if (typeof scheduleSync === 'function') scheduleSync();
    var preview = document.getElementById('qrPreview');
    if (preview) preview.innerHTML = '<img src="' + d + '">';
  }).catch(function (err) {
    alert('❌ Error uploading QR: ' + (err.message || 'Unknown error'));
  });
}

function removeQrCode() {
  var im = getImages();
  if (!im.qrCode) { alert('No QR code to remove'); return; }
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
  saveDevContract();
}

function showQrForPayment() {
  startDevPaymentFlow();
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
