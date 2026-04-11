// ============================================
// SYNC.JS - Cloud Sync, Backup/Restore, Time
// ============================================

// === SYNC INDICATOR ===
function updateSyncIndicator(st, tx) {
  var el = document.getElementById('syncIndicator');
  var ic = document.getElementById('syncIcon');
  var t = document.getElementById('syncText');
  if (!el || !ic || !t) return;

  el.className = 'sync-indicator ' + st;
  ic.textContent = { syncing: '🔄', synced: '☁', error: '⚠', offline: '📡' }[st] || '☁';
  t.textContent = tx || st;
}

var syncTimer = null;

function scheduleSync() {
  pendingSync = true;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(function () { pushToCloud(); }, 3000);
}

function getLocalTimestamp() {
  return parseInt(localStorage.getItem(SYNC_TIMESTAMP_KEY) || '0');
}

function setLocalTimestamp() {
  var ts = Date.now();
  localStorage.setItem(SYNC_TIMESTAMP_KEY, String(ts));
  return ts;
}

// === BUILD PAYLOAD ===
function buildPayload() {
  var c = getCustomization();
  var im = getImages();
  var sb = getSavedBgs();

  return {
    Customers: getData('customers'),
    Bills: getData('bills'),
    Settings: [getSettings()],
    Customization: [{
      theme: c.theme || 'light',
      backgroundPreset: c.backgroundPreset || '',
      activePreset: c.activePreset,
      companyName: c.companyName || '',
      companyAddress: c.companyAddress || '',
      companyPhone: c.companyPhone || '',
      companyEmail: c.companyEmail || '',
      subscriptionContract: c.subscriptionContract || ''
    }],
    Images: [{
      companyLogo: im.companyLogo || '',
      backgroundImage: im.backgroundImage || '',
      qrCode: im.qrCode || '',
      savedBackgrounds: JSON.stringify(sb)
    }],
    Meta: [{
      timestamp: Date.now(),
      masterPassword: localStorage.getItem(MASTER_PASSWORD_KEY) || DEFAULT_MASTER_PASSWORD,
      tempPassword: localStorage.getItem(TEMP_PASSWORD_KEY) || '',
      tempPasswordExpiry: localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '',
      suggestions: localStorage.getItem(SUGGESTIONS_KEY) || '[]',
      incomeStatement: localStorage.getItem(INCOME_STATEMENT_KEY) || '{}',
      balanceSheet: localStorage.getItem(BALANCE_SHEET_KEY) || '{}'
    }]
  };
}

// === SAFE JSON FETCH ===
function safeFetchJSON(url, options) {
  return fetch(url, options).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text().then(function (text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON response');
      }
    });
  });
}

// === PUSH TO CLOUD ===
function pushToCloud() {
  if (isSyncing || !navigator.onLine) {
    if (!navigator.onLine) updateSyncIndicator('offline');
    return Promise.resolve();
  }

  isSyncing = true;
  pendingSync = false;
  updateSyncIndicator('syncing', 'Uploading...');

  var p = buildPayload();
  setLocalTimestamp();

  return safeFetchJSON(API_URL + '?action=writeAll', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(p)
  })
    .then(function (d) {
      if (d.success) {
        lastSyncTime = Date.now();
        localStorage.setItem(LAST_SYNC_KEY, String(lastSyncTime));
        updateSyncIndicator('synced', 'Synced just now');
      } else {
        updateSyncIndicator('error', 'Failed');
      }
      isSyncing = false;
    })
    .catch(function (err) {
      console.error('Push failed:', err.message);
      updateSyncIndicator('error', 'Error');
      isSyncing = false;
    });
}

// === PULL FROM CLOUD ===
function pullFromCloud() {
  if (!navigator.onLine) {
    updateSyncIndicator('offline');
    return Promise.resolve(false);
  }

  updateSyncIndicator('syncing', 'Loading...');

  return safeFetchJSON(API_URL + '?action=readAll')
    .then(function (d) {
      if (!d.success || !d.data) throw new Error('Invalid data');

      var cl = d.data;
      var lt = getLocalTimestamp();
      var ct = 0;

      // Process Meta
      if (cl.Meta && cl.Meta.length > 0) {
        var m = cl.Meta[0];
        ct = parseInt(m.timestamp || '0');

        if (m.masterPassword) {
          localStorage.setItem(MASTER_PASSWORD_KEY, m.masterPassword);
        }

        if (m.tempPassword) {
          localStorage.setItem(TEMP_PASSWORD_KEY, m.tempPassword);
          localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, m.tempPasswordExpiry || '0');
        } else if (ct > lt) {
          localStorage.removeItem(TEMP_PASSWORD_KEY);
          localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
        }

        // Restore suggestions, income statement, balance sheet
        if (m.suggestions) {
          try {
            var parsedSugg = JSON.parse(m.suggestions);
            if (Array.isArray(parsedSugg)) {
              localStorage.setItem(SUGGESTIONS_KEY, m.suggestions);
            }
          } catch (e) { /* ignore parse errors */ }
        }

        if (m.incomeStatement) {
          try {
            JSON.parse(m.incomeStatement); // validate
            localStorage.setItem(INCOME_STATEMENT_KEY, m.incomeStatement);
          } catch (e) { /* ignore */ }
        }

        if (m.balanceSheet) {
          try {
            JSON.parse(m.balanceSheet); // validate
            localStorage.setItem(BALANCE_SHEET_KEY, m.balanceSheet);
          } catch (e) { /* ignore */ }
        }
      }

      var le = getData('customers').length === 0 && getData('bills').length === 0;
      var cn = ct > lt;
      var uc = le || cn;

      if (uc) {
        // Update customers and bills
        if (cl.Customers) saveDataLocal('customers', cl.Customers);
        if (cl.Bills) saveDataLocal('bills', cl.Bills);

        // Update settings
        if (cl.Settings && cl.Settings.length > 0) {
          localStorage.setItem(STORAGE.settings, JSON.stringify(cl.Settings[0]));
        }

        // Update customization
        if (cl.Customization && cl.Customization.length > 0) {
          var lc = getCustomization();
          var cc = cl.Customization[0];
          localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify({
            theme: cc.theme || lc.theme || 'light',
            backgroundPreset: cc.backgroundPreset || lc.backgroundPreset || '',
            activePreset: cc.activePreset !== undefined ? cc.activePreset : lc.activePreset,
            companyName: cc.companyName || lc.companyName || '',
            companyAddress: cc.companyAddress || lc.companyAddress || '',
            companyPhone: cc.companyPhone || lc.companyPhone || '',
            companyEmail: cc.companyEmail || lc.companyEmail || '',
            subscriptionContract: cc.subscriptionContract || lc.subscriptionContract || ''
          }));
        }

        // Update images
        if (cl.Images && cl.Images.length > 0) {
          var ci = cl.Images[0];
          var li = getImages();
          saveImages({
            companyLogo: ci.companyLogo || li.companyLogo || '',
            backgroundImage: ci.backgroundImage || li.backgroundImage || '',
            qrCode: ci.qrCode || li.qrCode || ''
          });

          // Merge saved backgrounds
          if (ci.savedBackgrounds) {
            try {
              var csb = JSON.parse(ci.savedBackgrounds);
              if (Array.isArray(csb)) {
                var ls = getSavedBgs();
                var mg = ls.slice();
                csb.forEach(function (c) {
                  if (!mg.some(function (l) { return l.data === c.data; })) {
                    mg.push(c);
                  }
                });
                saveSavedBgs(mg);
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }

        setLocalTimestamp();
      } else if (!le && !cn) {
        scheduleSync();
      }

      lastSyncTime = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, String(lastSyncTime));
      updateSyncIndicator('synced');
      return true;
    })
    .catch(function (err) {
      console.error('Pull failed:', err.message);
      updateSyncIndicator('error', 'Connection failed');
      return false;
    });
}

// === MANUAL SYNC ===
function manualSync() {
  if (isSyncing) return;

  pushToCloud()
    .then(function () { return pullFromCloud(); })
    .then(function () {
      // Refresh all visible sections
      loadCustomerDropdowns();
      loadCustomersList();
      applyVisuals();
      updateCurrencyDisplay();
      updateTimerDisplay();
      updateMenuBadges();

      // Refresh active section
      var a = document.querySelector('.section.active');
      if (a) {
        if (a.id === 'historySection') loadFilteredHistory();
        if (a.id === 'customizeSection') loadCustomizationForm();
        if (a.id === 'analysisSection') renderAnalysis();
        if (a.id === 'incomeStatementSection') renderIncomeStatement();
        if (a.id === 'balanceSheetSection') renderBalanceSheet();
      }
    });
}

// === BACKUP TO FILE ===
function backupToFile() {
  var d = {
    version: 5,
    date: new Date().toISOString(),
    customers: getData('customers'),
    bills: getData('bills'),
    settings: getSettings(),
    customization: getCustomization(),
    images: getImages(),
    savedBackgrounds: getSavedBgs(),
    masterPassword: localStorage.getItem(MASTER_PASSWORD_KEY),
    tempPassword: localStorage.getItem(TEMP_PASSWORD_KEY),
    tempPasswordExpiry: localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY),
    suggestions: JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]'),
    incomeStatement: JSON.parse(localStorage.getItem(INCOME_STATEMENT_KEY) || '{}'),
    balanceSheet: JSON.parse(localStorage.getItem(BALANCE_SHEET_KEY) || '{}')
  };

  var b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  var u = URL.createObjectURL(b);
  var a = document.createElement('a');
  a.href = u;
  a.download = 'water-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(u);
  alert('✅ Backup downloaded!');
}

// === RESTORE FROM FILE ===
function restoreFromFile() {
  document.getElementById('restoreFileInput').click();
}

function handleRestoreFile(e) {
  var f = e.target.files[0];
  if (!f) return;

  var r = new FileReader();
  r.onload = function (ev) {
    try {
      var d = JSON.parse(ev.target.result);

      if (!d.customers && !d.bills) {
        alert('❌ Invalid backup file');
        return;
      }
      if (!confirm('⚠ Replace ALL data with this backup?')) return;

      // Restore core data
      if (d.customers) saveDataLocal('customers', d.customers);
      if (d.bills) saveDataLocal('bills', d.bills);
      if (d.settings) localStorage.setItem(STORAGE.settings, JSON.stringify(d.settings));

      // Restore customization & images
      if (d.customization) {
        var c = d.customization;
        var im = d.images || {};

        // Migrate old format
        if (c.companyLogo && !im.companyLogo) im.companyLogo = c.companyLogo;
        if (c.backgroundImage && !im.backgroundImage) im.backgroundImage = c.backgroundImage;
        delete c.companyLogo;
        delete c.backgroundImage;

        localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(c));
        saveImages(im);
      }
      if (d.images) saveImages(d.images);
      if (d.savedBackgrounds) saveSavedBgs(d.savedBackgrounds);

      // Restore passwords
      if (d.masterPassword) localStorage.setItem(MASTER_PASSWORD_KEY, d.masterPassword);
      if (d.tempPassword) {
        localStorage.setItem(TEMP_PASSWORD_KEY, d.tempPassword);
        if (d.tempPasswordExpiry) {
          localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, d.tempPasswordExpiry);
        }
      }

      // Restore additional data using constants
      if (d.suggestions) {
        localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(d.suggestions));
      }
      if (d.incomeStatement) {
        localStorage.setItem(INCOME_STATEMENT_KEY, JSON.stringify(d.incomeStatement));
      }
      if (d.balanceSheet) {
        localStorage.setItem(BALANCE_SHEET_KEY, JSON.stringify(d.balanceSheet));
      }

      setLocalTimestamp();
      alert('✅ Data restored successfully!');
      pushToCloud()
        .then(function () { location.reload(); })
        .catch(function () { location.reload(); });

    } catch (err) {
      alert('❌ Error restoring: ' + err.message);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

// === TIME SYNC ===
function getInternetTime() {
  var apis = [
    {
      url: 'https://timeapi.io/api/time/current/zone?timeZone=UTC',
      parse: function (d) { return new Date(d.dateTime + 'Z').getTime(); }
    },
    {
      url: 'https://worldtimeapi.org/api/ip',
      parse: function (d) { return new Date(d.utc_datetime).getTime(); }
    }
  ];

  return apis.reduce(function (p, api) {
    return p.then(function (r) {
      if (r !== null) return r;

      var c = new AbortController();
      var t = setTimeout(function () { c.abort(); }, 5000);

      return fetch(api.url, { signal: c.signal })
        .then(function (res) {
          clearTimeout(t);
          if (!res.ok) return null;
          return res.json().then(function (d) {
            var v = api.parse(d);
            return (v && !isNaN(v)) ? v : null;
          });
        })
        .catch(function () {
          clearTimeout(t);
          return null;
        });
    });
  }, Promise.resolve(null)).then(function (r) {
    if (r !== null) return r;

    // Fallback: cloudflare date header
    return fetch('https://www.cloudflare.com/cdn-cgi/trace', { method: 'HEAD' })
      .then(function (res) {
        var dh = res.headers.get('date');
        if (dh) {
          var t = new Date(dh).getTime();
          if (!isNaN(t)) return t;
        }
        return null;
      })
      .catch(function () { return null; });
  });
}

function saveTimeSync(t) {
  localStorage.setItem(TIME_SYNC_INTERNET_KEY, String(t));
  localStorage.setItem(TIME_SYNC_DEVICE_KEY, String(Date.now()));
}

function getCurrentTime() {
  return getInternetTime().then(function (it) {
    if (it !== null) {
      saveTimeSync(it);
      return { time: it, source: 'internet' };
    }

    var li = parseInt(localStorage.getItem(TIME_SYNC_INTERNET_KEY) || '0');
    var ld = parseInt(localStorage.getItem(TIME_SYNC_DEVICE_KEY) || '0');

    if (!li || !ld) return { time: null, source: 'none' };

    var el = Date.now() - ld;
    if (el < -CLOCK_DRIFT_TOLERANCE) return { time: null, source: 'tampered' };

    var est = li + Math.max(0, el);
    return { time: est, source: 'offline' };
  });
}

function getCurrentTimeSync() {
  var li = parseInt(localStorage.getItem(TIME_SYNC_INTERNET_KEY) || '0');
  var ld = parseInt(localStorage.getItem(TIME_SYNC_DEVICE_KEY) || '0');

  if (!li || !ld) return null;

  var el = Date.now() - ld;
  if (el < -CLOCK_DRIFT_TOLERANCE) return null;

  return li + Math.max(0, el);
}

function backgroundTimeSync() {
  return getInternetTime().then(function (t) {
    if (t !== null) saveTimeSync(t);
  });
}
