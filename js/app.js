// ============================================
// APP.JS - Initialization & Event Wiring
// ============================================

// === EVENT LISTENERS ===
function setupEventListeners() {

  // Login toggle password
  document.getElementById('toggleLoginPassword').addEventListener('click', function () {
    var p = document.getElementById('loginPassword');
    p.type = p.type === 'password' ? 'text' : 'password';
    this.textContent = p.type === 'password' ? '👁' : '🙈';
  });

  // Settings password toggle
  document.getElementById('eyeIcon').addEventListener('click', function () {
    var p = document.getElementById('adminPassword');
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  // Master password toggle
  document.getElementById('eyeIconMaster').addEventListener('click', function () {
    var p = document.getElementById('masterPassword');
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  // Login button
  document.getElementById('loginBtn').addEventListener('click', function () {
    var pw = document.getElementById('loginPassword').value.trim();
    if (!pw) return;
    var msg = document.getElementById('loginMessage');
    msg.textContent = '⏳ Verifying...';
    msg.style.color = '#666';

    checkLogin(pw).then(function (r) {
      if (r === true) {
        hideLoginModal();
      } else if (r && r.valid) {
        hideLoginModal();
        alert('✅ Temp access (' + r.daysLeft + 'd left)');
      } else if (r === 'tampered') {
        msg.style.color = 'red';
        msg.textContent = '⚠ Clock tampered';
      } else if (r === 'no-sync') {
        msg.style.color = 'orange';
        msg.textContent = '⚠ Use admin/master pw';
      } else if (r === 'expired') {
        msg.style.color = 'red';
        msg.textContent = '⏰ Expired';
        document.getElementById('loginPassword').value = '';
        updateTimerDisplay();
      } else {
        msg.style.color = 'red';
        msg.textContent = '❌ Wrong password';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').focus();
      }
    });
  });

  // Login enter key
  document.getElementById('loginPassword').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });

  // Settings enter key
  document.getElementById('adminPassword').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveSettings();
  });

  // Master password enter key
  document.getElementById('masterPassword').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') confirmMasterPassword();
  });

  // Customer name enter key
  document.getElementById('newCustomerName').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addCustomer();
  });

  // Prevent search boxes from submitting
  ['customerSearch', 'billCustomerSearch', 'historySearch'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') e.preventDefault();
      });
    }
  });

  // Online/offline events
  window.addEventListener('online', function () {
    isOnline = true;
    updateSyncIndicator('syncing', 'Reconnected...');
    pushToCloud();
  });

  window.addEventListener('offline', function () {
    isOnline = false;
    updateSyncIndicator('offline');
  });
}

// === DATA MIGRATION ===
function migrateData() {
  // Migrate old image data from customization to images
  (function () {
    var c = getCustomization(), im = getImages(), ch = false;
    if (c.companyLogo && !im.companyLogo) { im.companyLogo = c.companyLogo; ch = true; }
    if (c.backgroundImage && !im.backgroundImage) { im.backgroundImage = c.backgroundImage; ch = true; }
    if (ch) {
      saveImages(im);
      delete c.companyLogo;
      delete c.backgroundImage;
      localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(c));
    }
  })();

  // Migrate old bill data
  (function () {
    var bl = getData('bills'), ch = false;
    bl.forEach(function (b) {
      if (b.paymentStatus === undefined) {
        b.paymentStatus = 'unpaid';
        b.amountPaid = 0;
        b.paymentDate = '';
        b.penaltyAmount = 0;
        b.penaltyRate = 0;
        ch = true;
      }
      if (b.penaltyAmount === undefined) {
        b.penaltyAmount = 0;
        b.penaltyRate = 0;
        ch = true;
      }
    });
    if (ch) saveDataLocal('bills', bl);
  })();
}

// === START SYNC INTERVALS ===
function startSyncIntervals() {
  // Background time sync every 5 minutes
  setInterval(backgroundTimeSync, 3e5);

  // Push pending changes
  setInterval(function () {
    if (navigator.onLine && !isSyncing && pendingSync) pushToCloud();
  }, SYNC_INTERVAL);

  // Update sync indicator text
  setInterval(function () {
    if (!isSyncing) {
      var ls = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0');
      if (ls) {
        var a = Date.now() - ls;
        if (a < 6e4) updateSyncIndicator('synced', 'Synced just now');
        else if (a < 36e5) updateSyncIndicator('synced', 'Synced ' + Math.floor(a / 6e4) + 'm ago');
        else updateSyncIndicator('synced', 'Synced ' + Math.floor(a / 36e5) + 'h ago');
      }
    }
  }, 3e4);
}

// === MAIN INIT ===
document.addEventListener('DOMContentLoaded', function () {

  // Step 1: Migrate old data
  migrateData();

  // Step 2: Update dev mode UI
  updateDevModeUI();

  // Step 3: Show login
  showLoginModal();

  // Step 4: Setup auto capitalize
  setupAutoCapitalize();

  // Step 5: Setup event listeners
  setupEventListeners();

  // Step 6: Setup scroll to top
  initScrollToTop();

  // Step 7: Set default bill date
  document.getElementById('billDate').value = new Date().toISOString().split('T')[0];

  // Step 8: Pull from cloud and initialize
  pullFromCloud().then(function (p) {

    // Load UI components
    loadCustomerDropdowns();
    updateCurrencyDisplay();
    applyVisuals();

    // Show menu
    showSection('menuSection');

    // Start timer
    initTimer();

    // Update badges
    updateMenuBadges();

    // Show ready if no data
    if (!p && !getData('customers').length) {
      updateSyncIndicator('synced', 'Ready');
    }

    // Start background sync
    backgroundTimeSync();

    // Start intervals
    startSyncIntervals();
  });
});
