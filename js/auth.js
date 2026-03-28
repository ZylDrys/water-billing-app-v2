// ============================================
// AUTH.JS - Authentication & Password Management
// ============================================

// === PROMPT MODAL ===
function showPromptModal(title, isPw) {
  return new Promise(function (resolve) {
    var m = document.getElementById('promptModal'),
      inp = document.getElementById('promptInput'),
      tEl = document.getElementById('promptTitle'),
      tog = document.getElementById('togglePromptPassword'),
      conf = document.getElementById('promptConfirm'),
      canc = document.getElementById('promptCancel');

    tEl.textContent = title;
    inp.value = '';
    inp.type = isPw ? 'password' : 'text';
    tog.style.display = isPw ? 'inline' : 'none';
    tog.textContent = '👁';
    m.style.display = 'flex';
    inp.focus();

    function cl() {
      m.style.display = 'none';
      conf.removeEventListener('click', oC);
      canc.removeEventListener('click', oX);
      inp.removeEventListener('keydown', oK);
      tog.removeEventListener('click', oT);
    }
    function oC() { var v = inp.value.trim(); cl(); resolve(v || null) }
    function oX() { cl(); resolve(null) }
    function oK(e) { if (e.key === 'Enter') oC(); if (e.key === 'Escape') oX() }
    function oT() {
      inp.type = inp.type === 'password' ? 'text' : 'password';
      tog.textContent = inp.type === 'password' ? '👁' : '🙈';
    }

    conf.addEventListener('click', oC);
    canc.addEventListener('click', oX);
    inp.addEventListener('keydown', oK);
    tog.addEventListener('click', oT);
  });
}

// === TEMP PASSWORD DURATION MODAL ===
function showTempDurationModal() {
  return new Promise(function (resolve) {
    var m = document.getElementById('tempDurationModal');
    var valInp = document.getElementById('tempDurationValue');
    var unitSel = document.getElementById('tempDurationUnit');
    var conf = document.getElementById('tempDurationConfirm');
    var canc = document.getElementById('tempDurationCancel');

    valInp.value = '30';
    unitSel.value = 'days';
    m.style.display = 'flex';

    function cl() {
      m.style.display = 'none';
      conf.removeEventListener('click', oC);
      canc.removeEventListener('click', oX);
    }
    function oC() {
      var val = parseInt(valInp.value) || 30;
      var unit = unitSel.value;
      var ms = 0;
      if (unit === 'days') ms = val * 24 * 60 * 60 * 1000;
      else if (unit === 'months') ms = val * 30 * 24 * 60 * 60 * 1000;
      else if (unit === 'year') ms = val * 365 * 24 * 60 * 60 * 1000;
      cl();
      resolve(ms);
    }
    function oX() { cl(); resolve(null) }

    conf.addEventListener('click', oC);
    canc.addEventListener('click', oX);
  });
}

// === PASSWORD VALIDATION ===
function isValidAdminAccessSync(pw) {
  if (pw === getMasterPassword()) return true;
  var s = getSettings();
  return s.adminPassword && pw === s.adminPassword;
}

function isValidAdminAccess(pw) {
  if (isValidAdminAccessSync(pw)) return Promise.resolve(true);
  var tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  var ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
  if (tp && pw === tp) {
    return getCurrentTime().then(function (tr) {
      if (tr.source === 'tampered') return 'tampered';
      if (tr.time === null) return 'no-sync';
      if (tr.time < ex) return { valid: true, source: tr.source, daysLeft: Math.ceil((ex - tr.time) / 86400000) };
      localStorage.removeItem(TEMP_PASSWORD_KEY);
      localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
      scheduleSync();
      return 'expired';
    });
  }
  return Promise.resolve(false);
}

function checkLogin(pw) { return isValidAdminAccess(pw) }

// === LOGIN MODAL ===
function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginMessage').textContent = '';
  document.getElementById('loginPassword').focus();
}

function hideLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}

// === SETTINGS SECURITY ===
function confirmMasterPassword() {
  var inp = document.getElementById('masterPassword').value.trim();
  if (inp === getMasterPassword()) {
    document.getElementById('masterPasswordActions').style.display = 'block';
    document.getElementById('temporaryPasswordButtonContainer').style.display = 'block';
    document.getElementById('qrPaymentSection').style.display = 'block';
    loadQrSection();
    updateDevModeUI();
    alert('Access granted');
  } else {
    alert('Incorrect');
  }
}

function changeMasterPassword() {
  return showPromptModal('Current master password:', true).then(function (c) {
    if (!c) return;
    if (c !== getMasterPassword()) { alert('Incorrect'); return }
    return showPromptModal('New master password:', true).then(function (n) {
      if (!n) { alert('Cannot be empty'); return }
      localStorage.setItem(MASTER_PASSWORD_KEY, n);
      scheduleSync();
      alert('Changed!');
      document.getElementById('masterPasswordActions').style.display = 'none';
      document.getElementById('temporaryPasswordButtonContainer').style.display = 'none';
      document.getElementById('qrPaymentSection').style.display = 'none';
      showSection('menuSection');
    });
  });
}

function showDefaultMasterPassword() { alert('Default: ' + DEFAULT_MASTER_PASSWORD) }

function restoreDefaultMasterPassword() {
  if (!confirm('Restore?')) return;
  localStorage.removeItem(MASTER_PASSWORD_KEY);
  scheduleSync();
  alert('Restored');
}

// === TEMP PASSWORD ===
function createTempPasswordPrompt() {
  return getCurrentTime().then(function (tr) {
    if (tr.source === 'tampered' || tr.time === null) { alert('❌ Time issue.'); return }
    return showPromptModal('Enter temp password:', true).then(function (tp) {
      if (!tp) return;
      return showTempDurationModal().then(function (durationMs) {
        if (!durationMs) return;
        var ex = tr.time + durationMs;
        localStorage.setItem(TEMP_PASSWORD_KEY, tp);
        localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(ex));
        scheduleSync();
        var days = Math.round(durationMs / (24 * 60 * 60 * 1000));
        alert('✅ Created!\nExpires: ' + new Date(ex).toLocaleDateString() + ' (' + days + ' days)');
        updateTimerDisplay();
      });
    });
  });
}

function deleteTempPassword() {
  if (!confirm('Delete?')) return;
  localStorage.removeItem(TEMP_PASSWORD_KEY);
  localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
  scheduleSync();
  alert('Deleted.');
  updateTimerDisplay();
}

function addTimeToTempPassword() {
  var tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  var ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
  if (!tp || !ex) { alert('No temp password exists.'); return }
  showTempDurationModal().then(function (ms) {
    if (!ms) return;
    var newEx = ex + ms;
    localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(newEx));
    scheduleSync();
    var days = Math.round(ms / (24 * 60 * 60 * 1000));
    alert('✅ Added ' + days + ' days.\nNew expiry: ' + new Date(newEx).toLocaleDateString());
    updateTimerDisplay();
  });
}

function subtractTimeFromTempPassword() {
  var tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  var ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
  if (!tp || !ex) { alert('No temp password exists.'); return }
  showTempDurationModal().then(function (ms) {
    if (!ms) return;
    var now = getCurrentTimeSync();
    var newEx = ex - ms;
    if (now && newEx <= now) {
      localStorage.removeItem(TEMP_PASSWORD_KEY);
      localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
      scheduleSync();
      alert('⚠ Password expired after subtracting time.');
      updateTimerDisplay();
      return;
    }
    localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(newEx));
    scheduleSync();
    var days = Math.round(ms / (24 * 60 * 60 * 1000));
    alert('✅ Subtracted ' + days + ' days.\nNew expiry: ' + new Date(newEx).toLocaleDateString());
    updateTimerDisplay();
  });
}

// === RESTORE DEFAULTS ===
function restoreDefaults() {
  if (!confirm('⚠ Reset ALL data?\nMaster password preserved.')) return;
  if (!confirm('⚠ FINAL WARNING! Proceed?')) return;

  var mp = localStorage.getItem(MASTER_PASSWORD_KEY);
  var si = localStorage.getItem(TIME_SYNC_INTERNET_KEY);
  var sd = localStorage.getItem(TIME_SYNC_DEVICE_KEY);

  localStorage.removeItem(STORAGE.settings);
  localStorage.removeItem(STORAGE.customers);
  localStorage.removeItem(STORAGE.bills);
  localStorage.removeItem(TEMP_PASSWORD_KEY);
  localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
  localStorage.removeItem(CUSTOMIZE_KEY);
  localStorage.removeItem(IMAGES_KEY);
  localStorage.removeItem(SAVED_BGS_KEY);
  localStorage.removeItem(DEV_MODE_KEY);
  localStorage.removeItem('water_suggestions');
  localStorage.removeItem('water_income_statement');
  localStorage.removeItem('water_balance_sheet');

  if (mp) localStorage.setItem(MASTER_PASSWORD_KEY, mp);
  if (si) localStorage.setItem(TIME_SYNC_INTERNET_KEY, si);
  if (sd) localStorage.setItem(TIME_SYNC_DEVICE_KEY, sd);

  var ts = setLocalTimestamp();
  updateSyncIndicator('syncing', 'Resetting...');

  fetch(API_URL + '?action=clearAll', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: '{}'
  })
    .then(function (r) { return r.json() })
    .then(function () {
      var fp = {
        Customers: [],
        Bills: [],
        Settings: [Object.assign({}, DEFAULT_SETTINGS)],
        Customization: [{ theme: 'light', backgroundPreset: '', activePreset: '', companyName: '', companyAddress: '', companyPhone: '', companyEmail: '' }],
        Images: [{ companyLogo: '', backgroundImage: '', savedBackgrounds: '[]' }],
        Meta: [{ timestamp: ts, masterPassword: mp || DEFAULT_MASTER_PASSWORD, tempPassword: '', tempPasswordExpiry: '' }]
      };
      return fetch(API_URL + '?action=writeAll', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(fp)
      });
    })
    .then(function (r) { return r.json() })
    .then(function () { alert('✅ All cleared.'); location.reload() })
    .catch(function () { alert('⚠ Local cleared. Cloud will sync later.'); location.reload() });
}

// === PASSWORD FIELD CLEAR ===
function clearPasswordFields() {
  document.querySelectorAll('input[type="password"][data-clear-on-confirm="true"]').forEach(function (f) { f.value = '' });
}

function confirmWithClear(fn) {
  return function () {
    var a = arguments, r = fn.apply(this, a);
    if (r && typeof r.then === 'function') return r.then(function (v) { clearPasswordFields(); return v });
    clearPasswordFields();
    return r;
  };
}

// Apply clear wrappers
confirmMasterPassword = confirmWithClear(confirmMasterPassword);

// === SETTINGS SAVE (no admin password auth required) ===
function saveSettings() {
  var s = getSettings();
  s.pricePerCubic = parseFloat(document.getElementById('adminPricePerCubic').value) || DEFAULT_SETTINGS.pricePerCubic;
  s.minCharge = parseFloat(document.getElementById('adminMinCharge').value) || DEFAULT_SETTINGS.minCharge;
  s.penaltyRate = parseFloat(document.getElementById('adminPenaltyRate').value) || 0;
  s.roundOff = document.getElementById('adminRoundOff').checked;

  // Store the password value if entered (for login purposes)
  var pw = document.getElementById('adminPassword').value.trim();
  if (pw) s.adminPassword = pw;

  saveSettingsData(s);
  alert('✅ Saved!');
  return Promise.resolve();
}

// Apply clear wrapper to saveSettings
saveSettings = confirmWithClear(saveSettings);

function loadSettings() {
  var s = getSettings();
  document.getElementById('adminPricePerCubic').value = s.pricePerCubic;
  document.getElementById('adminMinCharge').value = s.minCharge;
  document.getElementById('adminPenaltyRate').value = s.penaltyRate || 0;
  document.getElementById('adminRoundOff').checked = !!s.roundOff;
  document.getElementById('adminPassword').value = '';
}

function setCurrency(c) {
  var s = getSettings();
  s.currency = c;
  saveSettingsData(s);
  updateCurrencyDisplay();
  alert('Currency → ' + c);
}

function updateCurrencyDisplay() {
  document.getElementById('displayCurrencySymbol').textContent = getCurrencySymbol();
}
