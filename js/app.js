// ============================================
// APP.JS - Initialization & Event Wiring
// ============================================

var eventListenersAttached = false;
var syncIntervalsStarted = false;

// === SAFE GET ELEMENT ===
function safeGetElement(id) {
  return document.getElementById(id);
}

// === SAFE ADD LISTENER ===
function safeAddListener(id, event, handler) {
  var el = safeGetElement(id);
  if (el) el.addEventListener(event, handler);
}

// === EVENT LISTENERS ===
function setupEventListeners() {
  if (eventListenersAttached) return;
  eventListenersAttached = true;

  // === LOGIN ===
  safeAddListener('toggleLoginPassword', 'click', function () {
    var p = safeGetElement('loginPassword');
    if (!p) return;
    p.type = p.type === 'password' ? 'text' : 'password';
    this.textContent = p.type === 'password' ? '👁' : '🙈';
  });

  safeAddListener('loginBtn', 'click', function () {
    var pwEl = safeGetElement('loginPassword');
    if (!pwEl) return;
    var pw = pwEl.value.trim();
    if (!pw) return;

    var msg = safeGetElement('loginMessage');
    if (msg) {
      msg.textContent = '⏳ Verifying...';
      msg.style.color = '#666';
    }

    checkLogin(pw).then(function (r) {
      if (r === true) {
        hideLoginModal();
      } else if (r && r.valid) {
        hideLoginModal();
        alert('✅ Temp access (' + r.daysLeft + ' day(s) left)');
      } else if (r === 'tampered') {
        if (msg) { msg.style.color = 'red'; msg.textContent = '⚠ Clock tampered detected'; }
      } else if (r === 'no-sync') {
        if (msg) { msg.style.color = 'orange'; msg.textContent = '⚠ Time not synced. Use admin/master password'; }
      } else if (r === 'expired') {
        if (msg) { msg.style.color = 'red'; msg.textContent = '⏰ Temp password expired'; }
        pwEl.value = '';
        if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
      } else {
        if (msg) { msg.style.color = 'red'; msg.textContent = '❌ Wrong password'; }
        pwEl.value = '';
        pwEl.focus();
      }
    });
  });

  safeAddListener('loginPassword', 'keydown', function (e) {
    if (e.key === 'Enter') {
      var btn = safeGetElement('loginBtn');
      if (btn) btn.click();
    }
  });

  // === SETTINGS ===
  safeAddListener('eyeIcon', 'click', function () {
    var p = safeGetElement('adminPassword');
    if (!p) return;
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  safeAddListener('eyeIconMaster', 'click', function () {
    var p = safeGetElement('masterPassword');
    if (!p) return;
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  safeAddListener('adminPassword', 'keydown', function (e) {
    if (e.key === 'Enter' && typeof saveSettings === 'function') saveSettings();
  });

  safeAddListener('masterPassword', 'keydown', function (e) {
    if (e.key === 'Enter' && typeof confirmMasterPassword === 'function') confirmMasterPassword();
  });

  // === CUSTOMERS ===
  safeAddListener('newCustomerName', 'keydown', function (e) {
    if (e.key === 'Enter' && typeof addCustomer === 'function') addCustomer();
  });

  // === SEARCH BOXES (prevent form submit on Enter) ===
  ['customerSearch', 'billCustomerSearch', 'historySearch'].forEach(function (id) {
    safeAddListener(id, 'keydown', function (e) {
      if (e.key === 'Enter') e.preventDefault();
    });
  });

  // === ONLINE/OFFLINE ===
  window.addEventListener('online', function () {
    isOnline = true;
    updateSyncIndicator('syncing', 'Reconnected...');
    if (typeof pushToCloud === 'function') pushToCloud();
  });

  window.addEventListener('offline', function () {
    isOnline = false;
    updateSyncIndicator('offline', 'No connection');
  });
}

// === DATA MIGRATION ===
function migrateData() {
  // Migrate old image data from customization to images
  try {
    var c = getCustomization();
    var im = getImages();
    var changed = false;

    if (c.companyLogo && !im.companyLogo) {
      im.companyLogo = c.companyLogo;
      changed = true;
    }
    if (c.backgroundImage && !im.backgroundImage) {
      im.backgroundImage = c.backgroundImage;
      changed = true;
    }

    if (changed) {
      saveImages(im);
      delete c.companyLogo;
      delete c.backgroundImage;
      localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(c));
    }
  } catch (e) {
    console.error('Image migration error:', e.message);
  }

  // Migrate old bill data
  try {
    var bl = getData('bills');
    var billsChanged = false;

    bl.forEach(function (b) {
      if (b.paymentStatus === undefined) {
        b.paymentStatus = 'unpaid';
        b.amountPaid = 0;
        b.paymentDate = '';
        b.penaltyAmount = 0;
        b.penaltyRate = 0;
        billsChanged = true;
      }
      if (b.penaltyAmount === undefined) {
        b.penaltyAmount = 0;
        b.penaltyRate = 0;
        billsChanged = true;
      }
      if (b.ref === undefined) {
        // Don't add ref to old bills — they work fine without
        // Only new bills get refs
      }
    });

    if (billsChanged) saveDataLocal('bills', bl);
  } catch (e) {
    console.error('Bill migration error:', e.message);
  }
}

// === START SYNC INTERVALS ===
function startSyncIntervals() {
  if (syncIntervalsStarted) return;
  syncIntervalsStarted = true;

  // Background time sync every 5 minutes
  setInterval(function () {
    if (typeof backgroundTimeSync === 'function') backgroundTimeSync();
  }, 3e5);

  // Push pending changes
  setInterval(function () {
    if (navigator.onLine && !isSyncing && pendingSync) {
      if (typeof pushToCloud === 'function') pushToCloud();
    }
  }, SYNC_INTERVAL);

  // Update sync indicator text
  setInterval(function () {
    if (isSyncing) return;

    var ls = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0');
    if (!ls) return;

    var age = Date.now() - ls;
    var text;

    if (age < 6e4) text = 'Synced just now';
    else if (age < 36e5) text = 'Synced ' + Math.floor(age / 6e4) + 'm ago';
    else text = 'Synced ' + Math.floor(age / 36e5) + 'h ago';

    updateSyncIndicator('synced', text);
  }, 3e4);
}

// === SHOW LOADING STATE ===
function showLoadingState() {
  var container = document.querySelector('.container');
  if (!container) return;

  var existing = document.getElementById('loadingOverlay');
  if (existing) return;

  var overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted)';
  overlay.innerHTML = '<div style="font-size:32px;margin-bottom:10px">💧</div>' +
    '<div style="font-size:14px">Loading...</div>';

  container.appendChild(overlay);
}

function hideLoadingState() {
  var overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.remove();
}

// === MAIN INIT ===
document.addEventListener('DOMContentLoaded', function () {

  // Step 1: Show loading
  showLoadingState();

  // Step 2: Migrate old data
  try {
    migrateData();
  } catch (e) {
    console.error('Migration failed:', e.message);
  }

  // Step 3: Update dev mode UI
  try {
    updateDevModeUI();
  } catch (e) {
    console.error('Dev mode UI failed:', e.message);
  }

  // Step 4: Show login
  if (typeof showLoginModal === 'function') showLoginModal();

  // Step 5: Setup auto capitalize (event delegation)
  if (typeof setupAutoCapitalize === 'function') setupAutoCapitalize();

  // Step 6: Setup event listeners
  setupEventListeners();

  // Step 7: Setup scroll to top
  if (typeof initScrollToTop === 'function') initScrollToTop();

  // Step 8: Set default bill date
  var billDate = safeGetElement('billDate');
  if (billDate) billDate.value = new Date().toISOString().split('T')[0];

  // Step 9: Pull from cloud and initialize
  var pullPromise;
  if (typeof pullFromCloud === 'function') {
    pullPromise = pullFromCloud();
  } else {
    pullPromise = Promise.resolve(false);
  }

  pullPromise.then(function (pulled) {
    // Hide loading
    hideLoadingState();

    // Load UI components
    if (typeof loadCustomerDropdowns === 'function') loadCustomerDropdowns();
    if (typeof updateCurrencyDisplay === 'function') updateCurrencyDisplay();
    if (typeof applyVisuals === 'function') applyVisuals();

    // Show menu
    showSection('menuSection');

    // Start timer
    if (typeof initTimer === 'function') initTimer();

    // Update badges
    if (typeof updateMenuBadges === 'function') updateMenuBadges();

    // Show ready if no data pulled and no customers
    if (!pulled && !getData('customers').length) {
      updateSyncIndicator('synced', 'Ready');
    }

    // Start background sync
    if (typeof backgroundTimeSync === 'function') backgroundTimeSync();

    // Start intervals
    startSyncIntervals();

  }).catch(function (err) {
    // Even if pull fails, still load the app
    console.error('Init pull failed:', err.message);
    hideLoadingState();

    if (typeof loadCustomerDropdowns === 'function') loadCustomerDropdowns();
    if (typeof updateCurrencyDisplay === 'function') updateCurrencyDisplay();
    if (typeof applyVisuals === 'function') applyVisuals();

    showSection('menuSection');
    if (typeof initTimer === 'function') initTimer();
    if (typeof updateMenuBadges === 'function') updateMenuBadges();
    updateSyncIndicator('error', 'Offline start');

    startSyncIntervals();
  });
});
