// ============================================
// APP.JS — Initialization & Event Wiring
// ============================================

// ─── CONSTANTS ─────────────────────────────
var FIVE_MINUTES_MS  = 300000;   // 5 min — background time sync
var THIRTY_SECONDS_MS = 30000;   // 30s  — sync indicator refresh
var ONE_MINUTE_MS    = 60000;    // 1 min
var ONE_HOUR_MS      = 3600000;  // 1 hour


// ─── HELPERS ───────────────────────────────

/**
 * Safely get a DOM element by ID.
 * Returns null (instead of crashing) if not found.
 */
function safeGetEl(id) {
  var el = document.getElementById(id);
  if (!el) {
    console.warn('[app.js] Element #' + id + ' not found');
  }
  return el;
}

/**
 * Safely add an event listener to an element by ID.
 * Prevents entire setupEventListeners() from crashing
 * if one element is missing.
 */
function safeAddEvent(id, event, handler) {
  var el = safeGetEl(id);
  if (el) {
    el.addEventListener(event, handler);
    return true;
  }
  return false;
}

/**
 * Get today's date as YYYY-MM-DD using LOCAL timezone.
 * FIX: toISOString() uses UTC which can return wrong date.
 */
function getLocalDateString() {
  var now = new Date();
  var year  = now.getFullYear();
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var day   = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}


// ═══════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════

function setupEventListeners() {

  // --- Login: toggle password visibility ---
  safeAddEvent('toggleLoginPassword', 'click', function () {
    var p = safeGetEl('loginPassword');
    if (!p) return;
    p.type = p.type === 'password' ? 'text' : 'password';
    this.textContent = p.type === 'password' ? '👁' : '🙈';
  });

  // --- Settings: toggle admin password visibility ---
  safeAddEvent('eyeIcon', 'click', function () {
    var p = safeGetEl('adminPassword');
    if (!p) return;
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  // --- Settings: toggle master password visibility ---
  safeAddEvent('eyeIconMaster', 'click', function () {
    var p = safeGetEl('masterPassword');
    if (!p) return;
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  // --- Login button ---
  safeAddEvent('loginBtn', 'click', handleLogin);

  // --- Enter key shortcuts ---
  safeAddEvent('loginPassword', 'keydown', function (e) {
    if (e.key === 'Enter') {
      var btn = safeGetEl('loginBtn');
      if (btn) btn.click();
    }
  });

  safeAddEvent('adminPassword', 'keydown', function (e) {
    if (e.key === 'Enter') {
      if (typeof saveSettings === 'function') saveSettings();
    }
  });

  safeAddEvent('masterPassword', 'keydown', function (e) {
    if (e.key === 'Enter') {
      if (typeof confirmMasterPassword === 'function') confirmMasterPassword();
    }
  });

  safeAddEvent('newCustomerName', 'keydown', function (e) {
    if (e.key === 'Enter') {
      if (typeof addCustomer === 'function') addCustomer();
    }
  });

  // --- Prevent search boxes from submitting forms ---
  var searchBoxIds = ['customerSearch', 'billCustomerSearch', 'historySearch'];
  searchBoxIds.forEach(function (id) {
    safeAddEvent(id, 'keydown', function (e) {
      if (e.key === 'Enter') e.preventDefault();
    });
  });

  // --- Online/Offline detection ---
  window.addEventListener('online', function () {
    isOnline = true;
    if (typeof updateSyncIndicator === 'function') {
      updateSyncIndicator('syncing', 'Reconnected...');
    }
    if (typeof pushToCloud === 'function') {
      pushToCloud();
    }
  });

  window.addEventListener('offline', function () {
    isOnline = false;
    if (typeof updateSyncIndicator === 'function') {
      updateSyncIndicator('offline');
    }
  });
}


// ═══════════════════════════════════════════
// LOGIN HANDLER
// ═══════════════════════════════════════════

function handleLogin() {
  var passwordField = safeGetEl('loginPassword');
  var msg = safeGetEl('loginMessage');
  if (!passwordField || !msg) return;

  var pw = passwordField.value.trim();
  if (!pw) return;

  msg.textContent = '⏳ Verifying...';
  msg.style.color = '#666';

  // FIX: guard for checkLogin not being loaded yet
  if (typeof checkLogin !== 'function') {
    msg.style.color = 'red';
    msg.textContent = '❌ Auth module not loaded';
    return;
  }

  checkLogin(pw)
    .then(function (result) {
      if (result === true) {
        // Full access
        hideLoginModal();

      } else if (result && result.valid) {
        // Temp password access
        hideLoginModal();
        alert('✅ Temp access (' + result.daysLeft + 'd left)');

      } else if (result === 'tampered') {
        msg.style.color = 'red';
        msg.textContent = '⚠ Clock tampered';

      } else if (result === 'no-sync') {
        msg.style.color = 'orange';
        msg.textContent = '⚠ Use admin/master pw';

      } else if (result === 'expired') {
        msg.style.color = 'red';
        msg.textContent = '⏰ Expired';
        passwordField.value = '';
        if (typeof updateTimerDisplay === 'function') {
          updateTimerDisplay();
        }

      } else {
        // Wrong password
        msg.style.color = 'red';
        msg.textContent = '❌ Wrong password';
        passwordField.value = '';
        passwordField.focus();
      }
    })
    .catch(function (err) {
      // FIX: handle promise rejection
      console.error('[app.js] Login check failed:', err);
      msg.style.color = 'red';
      msg.textContent = '❌ Login error. Try again.';
    });
}


// ═══════════════════════════════════════════
// DATA MIGRATION
// ═══════════════════════════════════════════

function migrateData() {
  migrateImageData();
  migrateBillData();
}

/**
 * Migrate old image data from customization storage to images storage.
 */
function migrateImageData() {
  try {
    if (typeof getCustomization !== 'function' || typeof getImages !== 'function') return;

    var customization = getCustomization();
    var images = getImages();
    var changed = false;

    if (customization.companyLogo && !images.companyLogo) {
      images.companyLogo = customization.companyLogo;
      changed = true;
    }

    if (customization.backgroundImage && !images.backgroundImage) {
      images.backgroundImage = customization.backgroundImage;
      changed = true;
    }

    if (changed) {
      if (typeof saveImages === 'function') {
        saveImages(images);
      }

      delete customization.companyLogo;
      delete customization.backgroundImage;

      // FIX: try/catch for localStorage (can throw if full)
      try {
        localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(customization));
      } catch (storageErr) {
        console.error('[app.js] Failed to save migrated customization:', storageErr);
      }
    }
  } catch (err) {
    console.error('[app.js] Image migration failed:', err);
  }
}

/**
 * Migrate old bill records that lack newer fields.
 * FIX: getData could return null → added || [] fallback.
 */
function migrateBillData() {
  try {
    var bills = getData('bills') || [];
    var changed = false;

    bills.forEach(function (bill) {
      // Add payment tracking fields if missing
      if (bill.paymentStatus === undefined) {
        bill.paymentStatus = 'unpaid';
        bill.amountPaid    = 0;
        bill.paymentDate   = '';
        bill.penaltyAmount = 0;
        bill.penaltyRate   = 0;
        changed = true;
      }

      // Add penalty fields if missing (partial migration)
      if (bill.penaltyAmount === undefined) {
        bill.penaltyAmount = 0;
        bill.penaltyRate   = 0;
        changed = true;
      }
    });

    if (changed && typeof saveDataLocal === 'function') {
      saveDataLocal('bills', bills);
    }
  } catch (err) {
    console.error('[app.js] Bill migration failed:', err);
  }
}


// ═══════════════════════════════════════════
// SYNC INTERVALS
// ═══════════════════════════════════════════

function startSyncIntervals() {
  // Background time sync every 5 minutes
  if (typeof backgroundTimeSync === 'function') {
    setInterval(backgroundTimeSync, FIVE_MINUTES_MS);
  }

  // Push pending changes periodically
  var syncInterval = (typeof SYNC_INTERVAL !== 'undefined') ? SYNC_INTERVAL : FIVE_MINUTES_MS;

  setInterval(function () {
    // FIX: use navigator.onLine consistently (not mixed with isOnline)
    if (navigator.onLine && !isSyncing && pendingSync) {
      if (typeof pushToCloud === 'function') {
        pushToCloud();
      }
    }
  }, syncInterval);

  // Update sync indicator text periodically
  setInterval(updateSyncIndicatorText, THIRTY_SECONDS_MS);
}

/**
 * Update the sync indicator with relative time since last sync.
 * FIX: also handles offline state.
 */
function updateSyncIndicatorText() {
  if (typeof updateSyncIndicator !== 'function') return;

  // FIX: check offline state too
  if (!navigator.onLine) {
    updateSyncIndicator('offline');
    return;
  }

  if (isSyncing) return;

  try {
    var lastSyncKey = (typeof LAST_SYNC_KEY !== 'undefined') ? LAST_SYNC_KEY : 'lastSync';
    var lastSync = parseInt(localStorage.getItem(lastSyncKey) || '0', 10);

    if (!lastSync) return;

    var elapsed = Date.now() - lastSync;

    if (elapsed < ONE_MINUTE_MS) {
      updateSyncIndicator('synced', 'Synced just now');
    } else if (elapsed < ONE_HOUR_MS) {
      updateSyncIndicator('synced', 'Synced ' + Math.floor(elapsed / ONE_MINUTE_MS) + 'm ago');
    } else {
      updateSyncIndicator('synced', 'Synced ' + Math.floor(elapsed / ONE_HOUR_MS) + 'h ago');
    }
  } catch (err) {
    console.warn('[app.js] Failed to read last sync time:', err);
  }
}


// ═══════════════════════════════════════════
// INITIALIZATION — POST CLOUD PULL
// ═══════════════════════════════════════════

/**
 * Called after cloud data is loaded (or fails).
 * Initializes all UI components.
 */
function initializeApp(pullSucceeded) {
  try {
    // Load UI components
    if (typeof loadCustomerDropdowns === 'function') loadCustomerDropdowns();
    if (typeof updateCurrencyDisplay === 'function') updateCurrencyDisplay();
    if (typeof applyVisuals === 'function')          applyVisuals();
  } catch (err) {
    console.error('[app.js] Failed to load UI components:', err);
  }

  // Show main menu
  try {
    if (typeof showSection === 'function') showSection('menuSection');
  } catch (err) {
    console.error('[app.js] Failed to show menu section:', err);
  }

  // Start countdown timer
  try {
    if (typeof initTimer === 'function') initTimer();
  } catch (err) {
    console.error('[app.js] Failed to init timer:', err);
  }

  // Update menu badges
  try {
    if (typeof updateMenuBadges === 'function') updateMenuBadges();
  } catch (err) {
    console.error('[app.js] Failed to update badges:', err);
  }

  // Show "Ready" if no data and pull didn't succeed
  if (!pullSucceeded) {
    var customers = (typeof getData === 'function') ? getData('customers') : null;
    if (!customers || !customers.length) {
      if (typeof updateSyncIndicator === 'function') {
        updateSyncIndicator('synced', 'Ready');
      }
    }
  }

  // Background time sync (initial)
  try {
    if (typeof backgroundTimeSync === 'function') backgroundTimeSync();
  } catch (err) {
    console.error('[app.js] Failed initial time sync:', err);
  }

  // Start periodic sync intervals
  startSyncIntervals();
}


// ═══════════════════════════════════════════
// MAIN INIT (DOMContentLoaded)
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {

  // Step 1: Migrate old data formats
  migrateData();

  // Step 2: Update dev mode UI
  try {
    if (typeof updateDevModeUI === 'function') updateDevModeUI();
  } catch (err) {
    console.error('[app.js] updateDevModeUI failed:', err);
  }

  // Step 3: Show login modal
  try {
    if (typeof showLoginModal === 'function') showLoginModal();
  } catch (err) {
    console.error('[app.js] showLoginModal failed:', err);
  }

  // Step 4: Setup auto-capitalize on text inputs
  try {
    if (typeof setupAutoCapitalize === 'function') setupAutoCapitalize();
  } catch (err) {
    console.error('[app.js] setupAutoCapitalize failed:', err);
  }

  // Step 5: Setup all event listeners
  setupEventListeners();

  // Step 6: Setup scroll-to-top button
  try {
    if (typeof initScrollToTop === 'function') initScrollToTop();
  } catch (err) {
    console.error('[app.js] initScrollToTop failed:', err);
  }

  // Step 7: Set default bill date (using LOCAL timezone)
  var billDateEl = safeGetEl('billDate');
  if (billDateEl) {
    billDateEl.value = getLocalDateString();    // FIX: was toISOString (UTC)
  }

  // Step 8: Pull from cloud, then initialize everything
  if (typeof pullFromCloud === 'function') {
    pullFromCloud()
      .then(function (pulled) {
        initializeApp(pulled);
      })
      .catch(function (err) {
        // FIX: app still initializes even if cloud pull fails
        console.error('[app.js] Cloud pull failed:', err);
        initializeApp(false);
      });
  } else {
    // No sync module — initialize immediately
    console.warn('[app.js] pullFromCloud not available, initializing without cloud');
    initializeApp(false);
  }
});
