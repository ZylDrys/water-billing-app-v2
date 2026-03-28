// ============================================
// AUTH.JS — Authentication & Password Management
// ============================================

// ─── CONSTANTS ─────────────────────────────
var MS_PER_DAY   = 86400000;    // 24 * 60 * 60 * 1000
var MS_PER_MONTH = 2592000000;  // 30 days
var MS_PER_YEAR  = 31536000000; // 365 days


// ─── HELPERS ───────────────────────────────

/**
 * Safely get a DOM element by ID
 */
function authGetEl(id) {
  var el = document.getElementById(id);
  if (!el) {
    console.warn('[auth.js] Element #' + id + ' not found');
  }
  return el;
}

/**
 * Safely write to localStorage (can throw if full)
 */
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.error('[auth.js] localStorage write failed for key "' + key + '":', err);
    return false;
  }
}

/**
 * Safely remove from localStorage
 */
function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[auth.js] localStorage remove failed for key "' + key + '":', err);
  }
}

/**
 * Convert duration value + unit to milliseconds.
 * FIX: handles both 'year' and 'years' to prevent silent 0ms bug.
 */
function durationToMs(value, unit) {
  var val = parseInt(value, 10) || 0;
  if (val <= 0) return 0;

  switch (unit) {
    case 'days':               return val * MS_PER_DAY;
    case 'months':             return val * MS_PER_MONTH;
    case 'year':  // fallthrough — FIX: accept both forms
    case 'years':              return val * MS_PER_YEAR;
    default:
      console.warn('[auth.js] Unknown duration unit: ' + unit);
      return val * MS_PER_DAY; // default to days
  }
}

/**
 * Format milliseconds as a human-readable day count
 */
function msToDaysLabel(ms) {
  return Math.round(ms / MS_PER_DAY);
}


// ═══════════════════════════════════════════
// PROMPT MODAL (generic password/text input)
// ═══════════════════════════════════════════

function showPromptModal(title, isPassword) {
  return new Promise(function (resolve) {
    var modal     = authGetEl('promptModal');
    var input     = authGetEl('promptInput');
    var titleEl   = authGetEl('promptTitle');
    var toggleBtn = authGetEl('togglePromptPassword');
    var confirmBtn = authGetEl('promptConfirm');
    var cancelBtn  = authGetEl('promptCancel');

    // If any critical element is missing, resolve null immediately
    if (!modal || !input || !confirmBtn || !cancelBtn) {
      console.error('[auth.js] Prompt modal elements missing');
      resolve(null);
      return;
    }

    // Setup
    if (titleEl) titleEl.textContent = title || '';
    input.value = '';
    input.type = isPassword ? 'password' : 'text';

    if (toggleBtn) {
      toggleBtn.style.display = isPassword ? 'inline' : 'none';
      toggleBtn.textContent = '👁';
    }

    modal.style.display = 'flex';
    input.focus();

    // Cleanup function — removes all listeners
    function cleanup() {
      modal.style.display = 'none';
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKeydown);
      if (toggleBtn) toggleBtn.removeEventListener('click', onToggle);
    }

    function onConfirm() {
      var value = input.value.trim();
      cleanup();
      resolve(value || null);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    function onKeydown(e) {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    }

    function onToggle() {
      input.type = input.type === 'password' ? 'text' : 'password';
      toggleBtn.textContent = input.type === 'password' ? '👁' : '🙈';
    }

    // Bind listeners
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKeydown);
    if (toggleBtn) toggleBtn.addEventListener('click', onToggle);

    // Store cleanup reference on modal for external cleanup if needed
    modal._promptCleanup = cleanup;
  });
}


// ═══════════════════════════════════════════
// TEMP PASSWORD DURATION MODAL
// ═══════════════════════════════════════════

function showTempDurationModal() {
  return new Promise(function (resolve) {
    var modal      = authGetEl('tempDurationModal');
    var valueInput = authGetEl('tempDurationValue');
    var unitSelect = authGetEl('tempDurationUnit');
    var confirmBtn = authGetEl('tempDurationConfirm');
    var cancelBtn  = authGetEl('tempDurationCancel');

    if (!modal || !valueInput || !unitSelect || !confirmBtn || !cancelBtn) {
      console.error('[auth.js] Temp duration modal elements missing');
      resolve(null);
      return;
    }

    // Defaults
    valueInput.value = '30';
    unitSelect.value = 'days';
    modal.style.display = 'flex';
    valueInput.focus();

    function cleanup() {
      modal.style.display = 'none';
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      valueInput.removeEventListener('keydown', onKeydown);   // FIX: was missing
    }

    function onConfirm() {
      var ms = durationToMs(valueInput.value, unitSelect.value);
      cleanup();
      resolve(ms || null);  // resolve null if 0ms
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    // FIX: Enter/Escape keyboard support was completely missing
    function onKeydown(e) {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    valueInput.addEventListener('keydown', onKeydown);

    modal._durationCleanup = cleanup;
  });
}


// ═══════════════════════════════════════════
// PASSWORD VALIDATION
// ═══════════════════════════════════════════

/**
 * Synchronous check: admin or master password
 */
function isValidAdminAccessSync(pw) {
  if (typeof getMasterPassword === 'function' && pw === getMasterPassword()) {
    return true;
  }
  if (typeof getSettings === 'function') {
    var settings = getSettings();
    return settings.adminPassword && pw === settings.adminPassword;
  }
  return false;
}

/**
 * Async check: admin, master, or temp password.
 * Returns a promise resolving to:
 *   true          — full access (admin/master)
 *   {valid, source, daysLeft} — temp access
 *   'tampered'    — clock manipulation detected
 *   'no-sync'     — can't verify time
 *   'expired'     — temp password expired
 *   false         — wrong password
 */
function isValidAdminAccess(pw) {
  // Check admin/master first (synchronous)
  if (isValidAdminAccessSync(pw)) {
    return Promise.resolve(true);
  }

  // Check temp password (async — needs time verification)
  var tempKey    = (typeof TEMP_PASSWORD_KEY !== 'undefined') ? TEMP_PASSWORD_KEY : 'tempPassword';
  var expiryKey  = (typeof TEMP_PASSWORD_EXPIRY_KEY !== 'undefined') ? TEMP_PASSWORD_EXPIRY_KEY : 'tempPasswordExpiry';

  var tempPw = localStorage.getItem(tempKey);
  var expiry = parseInt(localStorage.getItem(expiryKey) || '0', 10);

  if (!tempPw || pw !== tempPw) {
    return Promise.resolve(false);
  }

  // Temp password matches — verify it hasn't expired
  if (typeof getCurrentTime !== 'function') {
    return Promise.resolve('no-sync');
  }

  return getCurrentTime()
    .then(function (timeResult) {
      if (timeResult.source === 'tampered') return 'tampered';
      if (timeResult.time === null) return 'no-sync';

      if (timeResult.time < expiry) {
        // Still valid
        var daysLeft = Math.ceil((expiry - timeResult.time) / MS_PER_DAY);
        return {
          valid: true,
          source: timeResult.source,
          daysLeft: daysLeft
        };
      }

      // Expired — clean up
      safeRemoveItem(tempKey);
      safeRemoveItem(expiryKey);
      if (typeof scheduleSync === 'function') scheduleSync();
      return 'expired';
    })
    .catch(function (err) {
      console.error('[auth.js] Time check failed:', err);
      return 'no-sync';
    });
}

/**
 * Main login check — delegates to isValidAdminAccess
 */
function checkLogin(pw) {
  return isValidAdminAccess(pw);
}


// ═══════════════════════════════════════════
// LOGIN MODAL
// ═══════════════════════════════════════════

function showLoginModal() {
  var modal    = authGetEl('loginModal');
  var pwField  = authGetEl('loginPassword');
  var msgField = authGetEl('loginMessage');

  if (modal) modal.style.display = 'flex';
  if (pwField) pwField.value = '';
  if (msgField) msgField.textContent = '';
  if (pwField) pwField.focus();
}

function hideLoginModal() {
  var modal = authGetEl('loginModal');
  if (modal) modal.style.display = 'none';
}


// ═══════════════════════════════════════════
// MASTER PASSWORD MANAGEMENT
// ═══════════════════════════════════════════

function confirmMasterPassword() {
  var input = authGetEl('masterPassword');
  if (!input) return;

  var pw = input.value.trim();

  if (typeof getMasterPassword !== 'function' || pw !== getMasterPassword()) {
    alert('Incorrect');
    return;
  }

  // Show protected sections
  var sections = [
    'masterPasswordActions',
    'temporaryPasswordButtonContainer',
    'qrPaymentSection'
  ];

  sections.forEach(function (id) {
    var el = authGetEl(id);
    if (el) el.style.display = 'block';
  });

  if (typeof loadQrSection === 'function') loadQrSection();
  if (typeof updateDevModeUI === 'function') updateDevModeUI();

  alert('Access granted');
}

function changeMasterPassword() {
  return showPromptModal('Current master password:', true)
    .then(function (current) {
      if (!current) return;

      if (typeof getMasterPassword !== 'function' || current !== getMasterPassword()) {
        alert('Incorrect');
        return;
      }

      return showPromptModal('New master password:', true)
        .then(function (newPw) {
          if (!newPw) {
            alert('Cannot be empty');
            return;
          }

          var masterKey = (typeof MASTER_PASSWORD_KEY !== 'undefined')
            ? MASTER_PASSWORD_KEY : 'masterPassword';

          safeSetItem(masterKey, newPw);
          if (typeof scheduleSync === 'function') scheduleSync();
          alert('Changed!');

          // Hide protected sections
          var sections = [
            'masterPasswordActions',
            'temporaryPasswordButtonContainer',
            'qrPaymentSection'
          ];

          sections.forEach(function (id) {
            var el = authGetEl(id);
            if (el) el.style.display = 'none';
          });

          if (typeof showSection === 'function') showSection('menuSection');
        });
    })
    .catch(function (err) {
      console.error('[auth.js] changeMasterPassword failed:', err);
      alert('Error changing password. Please try again.');
    });
}

function showDefaultMasterPassword() {
  var defaultPw = (typeof DEFAULT_MASTER_PASSWORD !== 'undefined')
    ? DEFAULT_MASTER_PASSWORD : '(not set)';
  alert('Default: ' + defaultPw);
}

function restoreDefaultMasterPassword() {
  if (!confirm('Restore default master password?')) return;

  var masterKey = (typeof MASTER_PASSWORD_KEY !== 'undefined')
    ? MASTER_PASSWORD_KEY : 'masterPassword';

  safeRemoveItem(masterKey);
  if (typeof scheduleSync === 'function') scheduleSync();
  alert('Restored to default');
}


// ═══════════════════════════════════════════
// TEMPORARY PASSWORD MANAGEMENT
// ═══════════════════════════════════════════

function createTempPasswordPrompt() {
  if (typeof getCurrentTime !== 'function') {
    alert('❌ Time verification not available.');
    return Promise.resolve();
  }

  return getCurrentTime()
    .then(function (timeResult) {
      if (timeResult.source === 'tampered' || timeResult.time === null) {
        alert('❌ Cannot create temp password: time verification issue.');
        return;
      }

      return showPromptModal('Enter temp password:', true)
        .then(function (tempPw) {
          if (!tempPw) return;

          return showTempDurationModal()
            .then(function (durationMs) {
              if (!durationMs) return;

              var expiry = timeResult.time + durationMs;
              var tempKey   = (typeof TEMP_PASSWORD_KEY !== 'undefined') ? TEMP_PASSWORD_KEY : 'tempPassword';
              var expiryKey = (typeof TEMP_PASSWORD_EXPIRY_KEY !== 'undefined') ? TEMP_PASSWORD_EXPIRY_KEY : 'tempPasswordExpiry';

              safeSetItem(tempKey, tempPw);
              safeSetItem(expiryKey, String(expiry));
              if (typeof scheduleSync === 'function') scheduleSync();

              var days = msToDaysLabel(durationMs);
              alert('✅ Created!\nExpires: ' + new Date(expiry).toLocaleDateString() + ' (' + days + ' days)');

              if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
            });
        });
    })
    .catch(function (err) {
      console.error('[auth.js] createTempPasswordPrompt failed:', err);
      alert('❌ Failed to create temp password.');
    });
}

function deleteTempPassword() {
  if (!confirm('Delete temporary password?')) return;

  var tempKey   = (typeof TEMP_PASSWORD_KEY !== 'undefined') ? TEMP_PASSWORD_KEY : 'tempPassword';
  var expiryKey = (typeof TEMP_PASSWORD_EXPIRY_KEY !== 'undefined') ? TEMP_PASSWORD_EXPIRY_KEY : 'tempPasswordExpiry';

  safeRemoveItem(tempKey);
  safeRemoveItem(expiryKey);
  if (typeof scheduleSync === 'function') scheduleSync();
  alert('Deleted.');

  if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
}

function addTimeToTempPassword() {
  var tempKey   = (typeof TEMP_PASSWORD_KEY !== 'undefined') ? TEMP_PASSWORD_KEY : 'tempPassword';
  var expiryKey = (typeof TEMP_PASSWORD_EXPIRY_KEY !== 'undefined') ? TEMP_PASSWORD_EXPIRY_KEY : 'tempPasswordExpiry';

  var tempPw = localStorage.getItem(tempKey);
  var expiry = parseInt(localStorage.getItem(expiryKey) || '0', 10);

  if (!tempPw || !expiry) {
    alert('No temp password exists.');
    return;
  }

  showTempDurationModal()
    .then(function (ms) {
      if (!ms) return;

      var newExpiry = expiry + ms;
      safeSetItem(expiryKey, String(newExpiry));
      if (typeof scheduleSync === 'function') scheduleSync();

      var days = msToDaysLabel(ms);
      alert('✅ Added ' + days + ' days.\nNew expiry: ' + new Date(newExpiry).toLocaleDateString());

      if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
    })
    .catch(function (err) {
      console.error('[auth.js] addTimeToTempPassword failed:', err);
      alert('❌ Failed to add time.');
    });
}

function subtractTimeFromTempPassword() {
  var tempKey   = (typeof TEMP_PASSWORD_KEY !== 'undefined') ? TEMP_PASSWORD_KEY : 'tempPassword';
  var expiryKey = (typeof TEMP_PASSWORD_EXPIRY_KEY !== 'undefined') ? TEMP_PASSWORD_EXPIRY_KEY : 'tempPasswordExpiry';

  var tempPw = localStorage.getItem(tempKey);
  var expiry = parseInt(localStorage.getItem(expiryKey) || '0', 10);

  if (!tempPw || !expiry) {
    alert('No temp password exists.');
    return;
  }

  showTempDurationModal()
    .then(function (ms) {
      if (!ms) return;

      // FIX: guard for getCurrentTimeSync returning null
      var now = (typeof getCurrentTimeSync === 'function') ? getCurrentTimeSync() : Date.now();
      if (!now) now = Date.now();

      var newExpiry = expiry - ms;

      if (newExpiry <= now) {
        // Subtracting makes it expire immediately
        safeRemoveItem(tempKey);
        safeRemoveItem(expiryKey);
        if (typeof scheduleSync === 'function') scheduleSync();
        alert('⚠ Password expired after subtracting time.');
      } else {
        safeSetItem(expiryKey, String(newExpiry));
        if (typeof scheduleSync === 'function') scheduleSync();

        var days = msToDaysLabel(ms);
        alert('✅ Subtracted ' + days + ' days.\nNew expiry: ' + new Date(newExpiry).toLocaleDateString());
      }

      if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
    })
    .catch(function (err) {
      console.error('[auth.js] subtractTimeFromTempPassword failed:', err);
      alert('❌ Failed to subtract time.');
    });
}


// ═══════════════════════════════════════════
// RESTORE DEFAULTS (FACTORY RESET)
// ═══════════════════════════════════════════

function restoreDefaults() {
  if (!confirm('⚠ Reset ALL data?\nMaster password will be preserved.')) return;
  if (!confirm('⚠ FINAL WARNING! This cannot be undone. Proceed?')) return;

  // Preserve critical keys
  var masterKey    = (typeof MASTER_PASSWORD_KEY !== 'undefined') ? MASTER_PASSWORD_KEY : 'masterPassword';
  var timeSyncInet = (typeof TIME_SYNC_INTERNET_KEY !== 'undefined') ? TIME_SYNC_INTERNET_KEY : 'timeSyncInternet';
  var timeSyncDev  = (typeof TIME_SYNC_DEVICE_KEY !== 'undefined') ? TIME_SYNC_DEVICE_KEY : 'timeSyncDevice';
  var tempKey      = (typeof TEMP_PASSWORD_KEY !== 'undefined') ? TEMP_PASSWORD_KEY : 'tempPassword';
  var expiryKey    = (typeof TEMP_PASSWORD_EXPIRY_KEY !== 'undefined') ? TEMP_PASSWORD_EXPIRY_KEY : 'tempPasswordExpiry';
  var customizeKey = (typeof CUSTOMIZE_KEY !== 'undefined') ? CUSTOMIZE_KEY : 'customization';
  var imagesKey    = (typeof IMAGES_KEY !== 'undefined') ? IMAGES_KEY : 'images';
  var savedBgsKey  = (typeof SAVED_BGS_KEY !== 'undefined') ? SAVED_BGS_KEY : 'savedBackgrounds';
  var devModeKey   = (typeof DEV_MODE_KEY !== 'undefined') ? DEV_MODE_KEY : 'devMode';

  var savedMasterPw = localStorage.getItem(masterKey);
  var savedSyncInet = localStorage.getItem(timeSyncInet);
  var savedSyncDev  = localStorage.getItem(timeSyncDev);

  // Clear local storage keys
  var keysToRemove = [
    tempKey, expiryKey, customizeKey, imagesKey, savedBgsKey, devModeKey,
    'water_suggestions', 'water_income_statement', 'water_balance_sheet'
  ];

  // Add STORAGE keys if available
  if (typeof STORAGE !== 'undefined') {
    if (STORAGE.settings)  keysToRemove.push(STORAGE.settings);
    if (STORAGE.customers) keysToRemove.push(STORAGE.customers);
    if (STORAGE.bills)     keysToRemove.push(STORAGE.bills);
  }

  keysToRemove.forEach(function (key) {
    safeRemoveItem(key);
  });

  // Restore preserved keys
  if (savedMasterPw) safeSetItem(masterKey, savedMasterPw);
  if (savedSyncInet) safeSetItem(timeSyncInet, savedSyncInet);
  if (savedSyncDev)  safeSetItem(timeSyncDev, savedSyncDev);

  // Get timestamp for cloud sync
  var timestamp = (typeof setLocalTimestamp === 'function') ? setLocalTimestamp() : Date.now();

  if (typeof updateSyncIndicator === 'function') {
    updateSyncIndicator('syncing', 'Resetting...');
  }

  // FIX: guard for API_URL
  if (typeof API_URL === 'undefined' || !API_URL) {
    alert('✅ Local data cleared. No cloud connection configured.');
    location.reload();
    return;
  }

  var defaultSettings = (typeof DEFAULT_SETTINGS !== 'undefined')
    ? Object.assign({}, DEFAULT_SETTINGS)
    : {};

  var defaultMasterPw = (typeof DEFAULT_MASTER_PASSWORD !== 'undefined')
    ? DEFAULT_MASTER_PASSWORD
    : '';

  // Step 1: Clear cloud
  fetch(API_URL + '?action=clearAll', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: '{}'
  })
    .then(function (response) {
      // FIX: check response status before parsing
      if (!response.ok) {
        throw new Error('clearAll failed: ' + response.status);
      }
      return response.json();
    })
    .then(function () {
      // Step 2: Write fresh data to cloud
      var freshData = {
        Customers: [],
        Bills: [],
        Settings: [defaultSettings],
        Customization: [{
          theme: 'light',
          backgroundPreset: '',
          activePreset: '',
          companyName: '',
          companyAddress: '',
          companyPhone: '',
          companyEmail: ''
        }],
        Images: [{
          companyLogo: '',
          backgroundImage: '',
          savedBackgrounds: '[]'
        }],
        Meta: [{
          timestamp: timestamp,
          masterPassword: savedMasterPw || defaultMasterPw,
          tempPassword: '',
          tempPasswordExpiry: ''
        }]
      };

      return fetch(API_URL + '?action=writeAll', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(freshData)
      });
    })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('writeAll failed: ' + response.status);
      }
      return response.json();
    })
    .then(function () {
      alert('✅ All data cleared successfully.');
      location.reload();
    })
    .catch(function (err) {
      console.error('[auth.js] Cloud reset failed:', err);
      alert('⚠ Local data cleared. Cloud sync will complete later.');
      location.reload();
    });
}


// ═══════════════════════════════════════════
// PASSWORD FIELD AUTO-CLEAR
// ═══════════════════════════════════════════

/**
 * Clear all password inputs marked with data-clear-on-confirm
 */
function clearPasswordFields() {
  try {
    document.querySelectorAll('input[type="password"][data-clear-on-confirm="true"]')
      .forEach(function (field) {
        field.value = '';
      });
  } catch (err) {
    console.warn('[auth.js] clearPasswordFields failed:', err);
  }
}

/**
 * Wrap a function so password fields are cleared after execution.
 * FIX: prevents double-wrapping if file loads twice.
 */
function confirmWithClear(fn) {
  if (fn._wrapped) return fn;

  var wrapped = function () {
    var args = arguments;
    var result = fn.apply(this, args);

    if (result && typeof result.then === 'function') {
      // Promise-based function
      return result.then(function (val) {
        clearPasswordFields();
        return val;
      }).catch(function (err) {
        clearPasswordFields();
        throw err;     // Re-throw so callers can handle
      });
    }

    // Synchronous function
    clearPasswordFields();
    return result;
  };

  wrapped._wrapped = true;
  return wrapped;
}

// Apply clear wrappers
confirmMasterPassword = confirmWithClear(confirmMasterPassword);


// ═══════════════════════════════════════════
// SETTINGS (no admin password required)
// ═══════════════════════════════════════════

function saveSettings() {
  if (typeof getSettings !== 'function' || typeof saveSettingsData !== 'function') {
    alert('❌ Settings module not loaded.');
    return Promise.resolve();
  }

  var settings = getSettings();

  // Read form values with null-safe element access
  var priceEl   = authGetEl('adminPricePerCubic');
  var minEl     = authGetEl('adminMinCharge');
  var penaltyEl = authGetEl('adminPenaltyRate');
  var roundEl   = authGetEl('adminRoundOff');
  var pwEl      = authGetEl('adminPassword');

  var defaults = (typeof DEFAULT_SETTINGS !== 'undefined') ? DEFAULT_SETTINGS : {};

  settings.pricePerCubic = priceEl
    ? (parseFloat(priceEl.value) || defaults.pricePerCubic || 0)
    : settings.pricePerCubic;

  settings.minCharge = minEl
    ? (parseFloat(minEl.value) || defaults.minCharge || 0)
    : settings.minCharge;

  settings.penaltyRate = penaltyEl
    ? (parseFloat(penaltyEl.value) || 0)
    : (settings.penaltyRate || 0);

  settings.roundOff = roundEl
    ? roundEl.checked
    : !!settings.roundOff;

  // Update admin password if entered
  if (pwEl) {
    var pw = pwEl.value.trim();
    if (pw) settings.adminPassword = pw;
  }

  saveSettingsData(settings);
  alert('✅ Saved!');
  return Promise.resolve();
}

// Apply clear wrapper to saveSettings
saveSettings = confirmWithClear(saveSettings);

function loadSettings() {
  if (typeof getSettings !== 'function') return;

  var settings = getSettings();

  var priceEl   = authGetEl('adminPricePerCubic');
  var minEl     = authGetEl('adminMinCharge');
  var penaltyEl = authGetEl('adminPenaltyRate');
  var roundEl   = authGetEl('adminRoundOff');
  var pwEl      = authGetEl('adminPassword');

  if (priceEl)   priceEl.value   = settings.pricePerCubic;
  if (minEl)     minEl.value     = settings.minCharge;
  if (penaltyEl) penaltyEl.value = settings.penaltyRate || 0;
  if (roundEl)   roundEl.checked = !!settings.roundOff;
  if (pwEl)      pwEl.value      = '';
}

function setCurrency(currency) {
  if (typeof getSettings !== 'function' || typeof saveSettingsData !== 'function') return;

  var settings = getSettings();
  settings.currency = currency;
  saveSettingsData(settings);

  updateCurrencyDisplay();
  alert('Currency → ' + currency);
}

function updateCurrencyDisplay() {
  var el = authGetEl('displayCurrencySymbol');
  if (!el) return;

  if (typeof getCurrencySymbol === 'function') {
    el.textContent = getCurrencySymbol();
  }
}
