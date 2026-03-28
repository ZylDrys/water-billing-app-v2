// ============================================
// AUTH.JS - Authentication & Password Management
// ============================================

// === PROMPT MODAL ===
function showPromptModal(title, isPw) {
  return new Promise(function (resolve) {
    var m = document.getElementById('promptModal');
    var inp = document.getElementById('promptInput');
    var tEl = document.getElementById('promptTitle');
    var tog = document.getElementById('togglePromptPassword');
    var conf = document.getElementById('promptConfirm');
    var canc = document.getElementById('promptCancel');

    if (!m || !inp || !tEl || !conf || !canc) {
      resolve(null);
      return;
    }

    tEl.textContent = title;
    inp.value = '';
    inp.type = isPw ? 'password' : 'text';
    if (tog) {
      tog.style.display = isPw ? 'inline' : 'none';
      tog.textContent = '👁';
    }
    m.style.display = 'flex';

    // Focus after display
    setTimeout(function () { inp.focus(); }, 100);

    // Remove old listeners by cloning
    var newConf = conf.cloneNode(true);
    var newCanc = canc.cloneNode(true);
    conf.parentNode.replaceChild(newConf, conf);
    canc.parentNode.replaceChild(newCanc, canc);

    function cleanup() {
      m.style.display = 'none';
      inp.removeEventListener('keydown', onKey);
      if (tog) tog.removeEventListener('click', onToggle);
    }

    function onConfirm() {
      var v = inp.value.trim();
      cleanup();
      resolve(v || null);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    function onKey(e) {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    }

    function onToggle() {
      inp.type = inp.type === 'password' ? 'text' : 'password';
      tog.textContent = inp.type === 'password' ? '👁' : '🙈';
    }

    newConf.addEventListener('click', onConfirm);
    newCanc.addEventListener('click', onCancel);
    inp.addEventListener('keydown', onKey);
    if (tog) tog.addEventListener('click', onToggle);
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

    if (!m || !valInp || !unitSel || !conf || !canc) {
      resolve(null);
      return;
    }

    valInp.value = '30';
    unitSel.value = 'days';
    m.style.display = 'flex';

    // Focus after display
    setTimeout(function () { valInp.focus(); valInp.select(); }, 100);

    // Remove old listeners by cloning
    var newConf = conf.cloneNode(true);
    var newCanc = canc.cloneNode(true);
    conf.parentNode.replaceChild(newConf, conf);
    canc.parentNode.replaceChild(newCanc, canc);

    function cleanup() {
      m.style.display = 'none';
      valInp.removeEventListener('keydown', onKey);
    }

    function onConfirm() {
      var val = parseInt(valInp.value);
      var unit = unitSel.value;

      // Validate input
      if (isNaN(val) || val <= 0) {
        alert('Please enter a positive number');
        valInp.focus();
        valInp.select();
        return;
      }

      var ms = 0;
      if (unit === 'days') ms = val * 24 * 60 * 60 * 1000;
      else if (unit === 'months') ms = val * 30 * 24 * 60 * 60 * 1000;
      else if (unit === 'year') ms = val * 365 * 24 * 60 * 60 * 1000;

      cleanup();
      resolve(ms);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    function onKey(e) {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    }

    newConf.addEventListener('click', onConfirm);
    newCanc.addEventListener('click', onCancel);
    valInp.addEventListener('keydown', onKey);
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

      if (tr.time < ex) {
        return {
          valid: true,
          source: tr.source,
          daysLeft: Math.ceil((ex - tr.time) / 86400000)
        };
      }

      // Expired — clean up
      localStorage.removeItem(TEMP_PASSWORD_KEY);
      localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
      scheduleSync();
      return 'expired';
    });
  }

  return Promise.resolve(false);
}

function checkLogin(pw) {
  return isValidAdminAccess(pw);
}

// === LOGIN MODAL ===
function showLoginModal() {
  var modal = document.getElementById('loginModal');
  var pwInput = document.getElementById('loginPassword');
  var msg = document.getElementById('loginMessage');

  if (!modal || !pwInput) return;

  modal.style.display = 'flex';
  pwInput.value = '';
  if (msg) msg.textContent = '';

  setTimeout(function () { pwInput.focus(); }, 100);
}

function hideLoginModal() {
  var modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'none';
}

// === MASTER PASSWORD ACTIONS ===
function showMasterPasswordSections() {
  var actions = document.getElementById('masterPasswordActions');
  var tempContainer = document.getElementById('temporaryPasswordButtonContainer');
  var qrSection = document.getElementById('qrPaymentSection');

  if (actions) actions.style.display = 'block';
  if (tempContainer) tempContainer.style.display = 'block';
  if (qrSection) qrSection.style.display = 'block';
}

function hideMasterPasswordSections() {
  var actions = document.getElementById('masterPasswordActions');
  var tempContainer = document.getElementById('temporaryPasswordButtonContainer');
  var qrSection = document.getElementById('qrPaymentSection');

  if (actions) actions.style.display = 'none';
  if (tempContainer) tempContainer.style.display = 'none';
  if (qrSection) qrSection.style.display = 'none';
}

function confirmMasterPassword() {
  var inp = document.getElementById('masterPassword');
  if (!inp) return;

  var value = inp.value.trim();

  if (value === getMasterPassword()) {
    showMasterPasswordSections();
    if (typeof loadQrSection === 'function') loadQrSection();
    updateDevModeUI();
    alert('✅ Access granted');
  } else {
    hideMasterPasswordSections();
    alert('❌ Incorrect master password');
  }
}

function changeMasterPassword() {
  return showPromptModal('Current master password:', true).then(function (c) {
    if (!c) return;
    if (c !== getMasterPassword()) {
      alert('❌ Incorrect current password');
      return;
    }

    return showPromptModal('New master password (min 4 characters):', true).then(function (n) {
      if (!n) return;

      if (n.length < 4) {
        alert('⚠ Password must be at least 4 characters');
        return;
      }

      localStorage.setItem(MASTER_PASSWORD_KEY, n);
      scheduleSync();
      alert('✅ Master password changed!');
      hideMasterPasswordSections();
      showSection('menuSection');
    });
  });
}

function showDefaultMasterPassword() {
  alert('Default master password: ' + DEFAULT_MASTER_PASSWORD);
}

function restoreDefaultMasterPassword() {
  if (!confirm('Restore master password to default?')) return;
  localStorage.removeItem(MASTER_PASSWORD_KEY);
  scheduleSync();
  alert('✅ Master password restored to default');
}

// === TEMP PASSWORD ===
function createTempPasswordPrompt() {
  return getCurrentTime().then(function (tr) {
    if (tr.source === 'tampered' || tr.time === null) {
      alert('❌ Cannot create temp password — time sync issue.\nConnect to internet and try again.');
      return;
    }

    return showPromptModal('Enter temp password (min 4 characters):', true).then(function (tp) {
      if (!tp) return;

      if (tp.length < 4) {
        alert('⚠ Password must be at least 4 characters');
        return;
      }

      return showTempDurationModal().then(function (durationMs) {
        if (!durationMs) return;

        var ex = tr.time + durationMs;
        localStorage.setItem(TEMP_PASSWORD_KEY, tp);
        localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(ex));
        scheduleSync();

        var days = Math.round(durationMs / (24 * 60 * 60 * 1000));
        alert('✅ Temp password created!\nExpires: ' + new Date(ex).toLocaleDateString() + ' (' + days + ' days)');
        if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
      });
    });
  });
}

function deleteTempPassword() {
  var tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  if (!tp) {
    alert('No temp password to delete');
    return;
  }

  if (!confirm('Delete temporary password?')) return;

  localStorage.removeItem(TEMP_PASSWORD_KEY);
  localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
  scheduleSync();
  alert('✅ Temp password deleted');
  if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
}

function addTimeToTempPassword() {
  var tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  var ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');

  if (!tp || !ex) {
    alert('No temp password exists. Create one first.');
    return;
  }

  return showTempDurationModal().then(function (ms) {
    if (!ms) return;

    var newEx = ex + ms;
    localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(newEx));
    scheduleSync();

    var days = Math.round(ms / (24 * 60 * 60 * 1000));
    alert('✅ Added ' + days + ' day(s)\nNew expiry: ' + new Date(newEx).toLocaleDateString());
    if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
  });
}

function subtractTimeFromTempPassword() {
  var tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  var ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');

  if (!tp || !ex) {
    alert('No temp password exists.');
    return;
  }

  return showTempDurationModal().then(function (ms) {
    if (!ms) return;

    var now = getCurrentTimeSync();
    var newEx = ex - ms;

    if (now && newEx <= now) {
      localStorage.removeItem(TEMP_PASSWORD_KEY);
      localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
      scheduleSync();
      alert('⚠ Temp password expired after subtracting time');
      if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
      return;
    }

    localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(newEx));
    scheduleSync();

    var days = Math.round(ms / (24 * 60 * 60 * 1000));
    alert('✅ Subtracted ' + days + ' day(s)\nNew expiry: ' + new Date(newEx).toLocaleDateString());
    if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
  });
}

// === RESTORE DEFAULTS ===
function restoreDefaults() {
  if (!confirm('⚠ Reset ALL data?\nMaster password will be preserved.')) return;
  if (!confirm('⚠ FINAL WARNING!\nThis cannot be undone. Proceed?')) return;

  // Preserve critical data
  var mp = localStorage.getItem(MASTER_PASSWORD_KEY);
  var si = localStorage.getItem(TIME_SYNC_INTERNET_KEY);
  var sd = localStorage.getItem(TIME_SYNC_DEVICE_KEY);

  // Clear all app data
  localStorage.removeItem(STORAGE.settings);
  localStorage.removeItem(STORAGE.customers);
  localStorage.removeItem(STORAGE.bills);
  localStorage.removeItem(TEMP_PASSWORD_KEY);
  localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
  localStorage.removeItem(CUSTOMIZE_KEY);
  localStorage.removeItem(IMAGES_KEY);
  localStorage.removeItem(SAVED_BGS_KEY);
  localStorage.removeItem(DEV_MODE_KEY);
  localStorage.removeItem(SUGGESTIONS_KEY);
  localStorage.removeItem(INCOME_STATEMENT_KEY);
  localStorage.removeItem(BALANCE_SHEET_KEY);

  // Restore preserved data
  if (mp) localStorage.setItem(MASTER_PASSWORD_KEY, mp);
  if (si) localStorage.setItem(TIME_SYNC_INTERNET_KEY, si);
  if (sd) localStorage.setItem(TIME_SYNC_DEVICE_KEY, sd);

  var ts = setLocalTimestamp();
  updateSyncIndicator('syncing', 'Resetting...');

  safeFetchJSON(API_URL + '?action=clearAll', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: '{}'
  })
    .then(function () {
      var fp = {
        Customers: [],
        Bills: [],
        Settings: [Object.assign({}, DEFAULT_SETTINGS)],
        Customization: [{
          theme: 'light', backgroundPreset: '', activePreset: '',
          companyName: '', companyAddress: '', companyPhone: '',
          companyEmail: '', subscriptionContract: ''
        }],
        Images: [{
          companyLogo: '', backgroundImage: '', qrCode: '',
          savedBackgrounds: '[]'
        }],
        Meta: [{
          timestamp: ts,
          masterPassword: mp || DEFAULT_MASTER_PASSWORD,
          tempPassword: '', tempPasswordExpiry: '',
          suggestions: '[]', incomeStatement: '{}', balanceSheet: '{}'
        }]
      };
      return safeFetchJSON(API_URL + '?action=writeAll', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(fp)
      });
    })
    .then(function () {
      alert('✅ All data cleared successfully');
      location.reload();
    })
    .catch(function () {
      alert('⚠ Local data cleared. Cloud will sync when online.');
      location.reload();
    });
}

// === PASSWORD FIELD CLEAR ===
function clearPasswordFields() {
  document.querySelectorAll('input[type="password"][data-clear-on-confirm="true"]').forEach(function (f) {
    f.value = '';
  });
}

function confirmWithClear(fn) {
  return function () {
    var args = arguments;
    var result = fn.apply(this, args);

    if (result && typeof result.then === 'function') {
      return result.then(function (v) {
        clearPasswordFields();
        return v;
      });
    }

    clearPasswordFields();
    return result;
  };
}

// Apply clear wrappers
confirmMasterPassword = confirmWithClear(confirmMasterPassword);

// === SETTINGS ===
function saveSettings() {
  var s = getSettings();

  var priceVal = parseFloat(document.getElementById('adminPricePerCubic').value);
  var minVal = parseFloat(document.getElementById('adminMinCharge').value);
  var penaltyVal = parseFloat(document.getElementById('adminPenaltyRate').value);

  // Validate values
  if (isNaN(priceVal) || priceVal < 0) {
    alert('⚠ Price per cubic meter must be a positive number');
    return Promise.resolve();
  }
  if (isNaN(minVal) || minVal < 0) {
    alert('⚠ Minimum charge must be a positive number');
    return Promise.resolve();
  }
  if (isNaN(penaltyVal) || penaltyVal < 0 || penaltyVal > 100) {
    alert('⚠ Penalty rate must be between 0 and 100');
    return Promise.resolve();
  }

  s.pricePerCubic = priceVal || DEFAULT_SETTINGS.pricePerCubic;
  s.minCharge = minVal || DEFAULT_SETTINGS.minCharge;
  s.penaltyRate = penaltyVal || 0;
  s.roundOff = document.getElementById('adminRoundOff').checked;

  // Store password if entered
  var pw = document.getElementById('adminPassword').value.trim();
  if (pw) {
    if (pw.length < 4) {
      alert('⚠ Password must be at least 4 characters');
      return Promise.resolve();
    }
    s.adminPassword = pw;
  }

  saveSettingsData(s);
  alert('✅ Settings saved!');
  return Promise.resolve();
}

// Apply clear wrapper to saveSettings
saveSettings = confirmWithClear(saveSettings);

function loadSettings() {
  var s = getSettings();
  var el;

  el = document.getElementById('adminPricePerCubic');
  if (el) el.value = s.pricePerCubic;

  el = document.getElementById('adminMinCharge');
  if (el) el.value = s.minCharge;

  el = document.getElementById('adminPenaltyRate');
  if (el) el.value = s.penaltyRate || 0;

  el = document.getElementById('adminRoundOff');
  if (el) el.checked = !!s.roundOff;

  el = document.getElementById('adminPassword');
  if (el) el.value = '';

  // Always hide master password sections on load
  hideMasterPasswordSections();
}

function setCurrency(c) {
  var s = getSettings();
  s.currency = c;
  saveSettingsData(s);
  if (typeof updateCurrencyDisplay === 'function') updateCurrencyDisplay();
  alert('✅ Currency changed to ' + c);
}

function updateCurrencyDisplay() {
  var el = document.getElementById('displayCurrencySymbol');
  if (el) el.textContent = getCurrencySymbol();
}
