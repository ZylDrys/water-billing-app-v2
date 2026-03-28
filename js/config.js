//config.js
// ============================================
// CONFIG.JS - Global Variables & Data Helpers
// ============================================

// === DEV MODE ===
var DEV_MODE_KEY = 'devModeEnabled';
function isDevMode() { return localStorage.getItem(DEV_MODE_KEY) === 'true'; }
function toggleDevMode() {
  var current = isDevMode();
  localStorage.setItem(DEV_MODE_KEY, String(!current));
  alert((!current ? '✅ Developer Mode ENABLED\nF12 and DevTools now accessible.' : '🛠 Developer Mode DISABLED\nF12 and DevTools blocked.') + '\nPage will reload.');
  location.reload();
}
function updateDevModeUI() {
  var btn = document.getElementById('devModeToggleBtn');
  var ind = document.getElementById('devModeIndicator');
  if (btn) {
    if (isDevMode()) { btn.textContent = '🛠 Disable Developer Mode'; btn.style.background = 'var(--bg-danger)'; }
    else { btn.textContent = '🛠 Enable Developer Mode'; btn.style.background = '#17a2b8'; }
  }
  if (ind) { if (isDevMode()) ind.classList.add('active'); else ind.classList.remove('active'); }
}

// === ANTI-INSPECT ===
(function () {
  if (localStorage.getItem('devModeEnabled') === 'true') return;
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'F12') e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) e.preventDefault();
  });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
})();

// === GLOBALS ===
var API_URL = 'https://script.google.com/macros/s/AKfycby0f2jnqyoAjVt6Mtj1gAVKErmbfBHeF8Ik0gF1S30VeO6ftnfAzELVsxL9OLd2P2kt/exec';
var SYNC_INTERVAL = 60000, isSyncing = false, lastSyncTime = 0, isOnline = navigator.onLine, pendingSync = false;
var MASTER_PASSWORD_KEY = 'masterPassword', DEFAULT_MASTER_PASSWORD = 'admin123';
var TEMP_PASSWORD_KEY = 'tempPassword', TEMP_PASSWORD_EXPIRY_KEY = 'tempPasswordExpiry';
var TIME_SYNC_INTERNET_KEY = 'timeSync_internet', TIME_SYNC_DEVICE_KEY = 'timeSync_device';
var TIMER_VISIBLE_KEY = 'timerVisible';
var CUSTOMIZE_KEY = 'water_customize_v2', IMAGES_KEY = 'water_images_v2', SAVED_BGS_KEY = 'water_saved_bgs';
var LAST_SYNC_KEY = 'water_lastSync', SYNC_TIMESTAMP_KEY = 'water_syncTimestamp';
var THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000, CLOCK_DRIFT_TOLERANCE = 2 * 60 * 1000;
var STORAGE = { customers: 'water_customers_v2', bills: 'water_bills_v2', settings: 'water_settings_v2' };
var DEFAULT_SETTINGS = { pricePerCubic: 1.50, minCharge: 5.00, currency: 'USD', adminPassword: 'admin123', penaltyRate: 0, roundOff: false };
var analysisYear = new Date().getFullYear(), analysisMonth = new Date().getMonth();
var analysisQuarter = Math.floor(new Date().getMonth() / 3);
var analysisSemiAnnual = new Date().getMonth() < 6 ? 0 : 1;
var analysisPeriod = 'monthly';
var importMode = 'simple';

// === THEMES ===
var THEMES = {
  light:{name:'Light',icon:'☀',body:'#f5f7fa',container:'#fff',accent:'#007bff',accentHover:'#0056b3',success:'#28a745',text:'#333',textSec:'#666',border:'#ccc',input:'#fff',tableEven:'#f9f9f9',cardBorder:'#eee',warning:'#ffc107',warnText:'#333',shadow:'rgba(0,0,0,.1)'},
  dark:{name:'Dark',icon:'🌙',body:'#1a1a2e',container:'#16213e',accent:'#0f3460',accentHover:'#1a4a8a',success:'#28a745',text:'#e0e0e0',textSec:'#aaa',border:'#333355',input:'#1a2340',tableEven:'#1c2a4a',cardBorder:'#2a2a4a',warning:'#ffc107',warnText:'#333',shadow:'rgba(0,0,0,.3)'},
  ocean:{name:'Ocean',icon:'🌊',body:'#e3f2fd',container:'#fff',accent:'#0277bd',accentHover:'#015d94',success:'#00897b',text:'#263238',textSec:'#546e7a',border:'#b0bec5',input:'#f5fbff',tableEven:'#e1f0fa',cardBorder:'#cfe2f0',warning:'#ffb300',warnText:'#333',shadow:'rgba(2,119,189,.1)'},
  forest:{name:'Forest',icon:'🌲',body:'#e8f5e9',container:'#fff',accent:'#2e7d32',accentHover:'#1b5e20',success:'#388e3c',text:'#1b5e20',textSec:'#4a7c4f',border:'#a5d6a7',input:'#f5fdf5',tableEven:'#e0f2e1',cardBorder:'#c8e6c9',warning:'#ff8f00',warnText:'#333',shadow:'rgba(46,125,50,.1)'},
  sunset:{name:'Sunset',icon:'🌅',body:'#fff3e0',container:'#fff',accent:'#e65100',accentHover:'#bf360c',success:'#ef6c00',text:'#3e2723',textSec:'#6d4c41',border:'#ffcc80',input:'#fffdf5',tableEven:'#fff0db',cardBorder:'#ffe0b2',warning:'#ff6f00',warnText:'#fff',shadow:'rgba(230,81,0,.1)'},
  rose:{name:'Rose',icon:'🌹',body:'#fce4ec',container:'#fff',accent:'#c2185b',accentHover:'#ad1457',success:'#e91e63',text:'#880e4f',textSec:'#ad1457',border:'#f48fb1',input:'#fff5f8',tableEven:'#fce4ec',cardBorder:'#f8bbd0',warning:'#ff6f00',warnText:'#fff',shadow:'rgba(194,24,91,.1)'},
  lavender:{name:'Lavender',icon:'💜',body:'#ede7f6',container:'#fff',accent:'#7b1fa2',accentHover:'#6a1b9a',success:'#9c27b0',text:'#4a148c',textSec:'#7b1fa2',border:'#ce93d8',input:'#faf5ff',tableEven:'#f3e5f5',cardBorder:'#e1bee7',warning:'#ff8f00',warnText:'#333',shadow:'rgba(123,31,162,.1)'},
  midnight:{name:'Midnight',icon:'🌃',body:'#0d1117',container:'#161b22',accent:'#58a6ff',accentHover:'#79b8ff',success:'#3fb950',text:'#c9d1d9',textSec:'#8b949e',border:'#30363d',input:'#0d1117',tableEven:'#1c2230',cardBorder:'#21262d',warning:'#d29922',warnText:'#fff',shadow:'rgba(0,0,0,.4)'},
  sand:{name:'Sand',icon:'🏖',body:'#fdf6ec',container:'#fffdf7',accent:'#8d6e63',accentHover:'#6d4c41',success:'#a1887f',text:'#4e342e',textSec:'#795548',border:'#d7ccc8',input:'#fffdf7',tableEven:'#efebe9',cardBorder:'#d7ccc8',warning:'#ff8f00',warnText:'#333',shadow:'rgba(141,110,99,.1)'},
  slate:{name:'Slate',icon:'🪨',body:'#eceff1',container:'#fff',accent:'#546e7a',accentHover:'#37474f',success:'#607d8b',text:'#263238',textSec:'#546e7a',border:'#b0bec5',input:'#f5f7f8',tableEven:'#eceff1',cardBorder:'#cfd8dc',warning:'#ffb300',warnText:'#333',shadow:'rgba(84,110,122,.1)'},
  cherry:{name:'Cherry',icon:'🍒',body:'#ffebee',container:'#fff',accent:'#d32f2f',accentHover:'#b71c1c',success:'#e53935',text:'#b71c1c',textSec:'#c62828',border:'#ef9a9a',input:'#fff5f5',tableEven:'#ffebee',cardBorder:'#ffcdd2',warning:'#ff6f00',warnText:'#fff',shadow:'rgba(211,47,47,.1)'},
  teal:{name:'Teal',icon:'🌿',body:'#e0f2f1',container:'#fff',accent:'#00796b',accentHover:'#00695c',success:'#00897b',text:'#004d40',textSec:'#00695c',border:'#80cbc4',input:'#f0fffe',tableEven:'#e0f2f1',cardBorder:'#b2dfdb',warning:'#ff8f00',warnText:'#333',shadow:'rgba(0,121,107,.1)'}
};

var PRESETS = [
  {name:'Clean Office',theme:'light',gradient:'none'},
  {name:'Night Mode',theme:'dark',gradient:'linear-gradient(135deg,#0d1117,#1a1a2e,#16213e)'},
  {name:'Ocean Breeze',theme:'ocean',gradient:'linear-gradient(135deg,#667eea,#764ba2)'},
  {name:'Forest Path',theme:'forest',gradient:'linear-gradient(135deg,#134e5e,#71b280)'},
  {name:'Sunset Glow',theme:'sunset',gradient:'linear-gradient(135deg,#f093fb,#f5576c,#ffd452)'},
  {name:'Rose Garden',theme:'rose',gradient:'linear-gradient(135deg,#ee9ca7,#ffdde1)'},
  {name:'Lavender Dream',theme:'lavender',gradient:'linear-gradient(135deg,#a18cd1,#fbc2eb)'},
  {name:'Midnight Sky',theme:'midnight',gradient:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)'},
  {name:'Beach Sand',theme:'sand',gradient:'linear-gradient(135deg,#f5af19,#f12711)'},
  {name:'Slate Mountain',theme:'slate',gradient:'linear-gradient(135deg,#bdc3c7,#2c3e50)'},
  {name:'Cherry Bloom',theme:'cherry',gradient:'linear-gradient(135deg,#f85032,#e73827)'},
  {name:'Teal Lagoon',theme:'teal',gradient:'linear-gradient(135deg,#43cea2,#185a9d)'}
];

// === DATA HELPERS ===
function getData(k) { try { return JSON.parse(localStorage.getItem(STORAGE[k]) || '[]') } catch (e) { return [] } }
function saveDataLocal(k, d) { localStorage.setItem(STORAGE[k], JSON.stringify(d)) }
function saveData(k, d) { saveDataLocal(k, d); scheduleSync() }
function getSettings() { try { var s = JSON.parse(localStorage.getItem(STORAGE.settings)); return Object.assign({}, DEFAULT_SETTINGS, s) } catch (e) { return Object.assign({}, DEFAULT_SETTINGS) } }
function saveSettingsData(s) { localStorage.setItem(STORAGE.settings, JSON.stringify(s)); scheduleSync() }
function getMasterPassword() { return localStorage.getItem(MASTER_PASSWORD_KEY) || DEFAULT_MASTER_PASSWORD }
function getCustomization() { try { return JSON.parse(localStorage.getItem(CUSTOMIZE_KEY)) || {} } catch (e) { return {} } }
function saveCustomizationData(d) { localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(d)); scheduleSync() }
function getImages() { try { return JSON.parse(localStorage.getItem(IMAGES_KEY)) || {} } catch (e) { return {} } }
function saveImages(d) { localStorage.setItem(IMAGES_KEY, JSON.stringify(d)) }
function getSavedBgs() { try { return JSON.parse(localStorage.getItem(SAVED_BGS_KEY)) || [] } catch (e) { return [] } }
function saveSavedBgs(a) { localStorage.setItem(SAVED_BGS_KEY, JSON.stringify(a)) }

function formatMoney(a) {
  var s = getSettings();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: s.currency === 'PHP' ? 'PHP' : s.currency === 'EUR' ? 'EUR' : 'USD',
    minimumFractionDigits: s.roundOff ? 0 : 2,
    maximumFractionDigits: s.roundOff ? 0 : 2
  }).format(s.roundOff ? Math.round(a) : a)
}
function getCurrencyFormatter() { return { format: function (v) { return formatMoney(v) } } }
function getCurrencySymbol() { var s = getSettings(); return s.currency === 'PHP' ? '₱' : s.currency === 'EUR' ? '€' : '$' }
function applyRounding(amount) { var s = getSettings(); return s.roundOff ? Math.round(amount) : amount }

// === AUTO CAPITALIZE ===
function autoCapitalize(val) {
  if (!val) return val;
  return val.charAt(0).toUpperCase() + val.slice(1);
}
function setupAutoCapitalize() {
  document.querySelectorAll('input[type="text"], textarea').forEach(function (el) {
    if (el.type === 'password' || el.type === 'email' || el.classList.contains('search-box')) return;
    if (el.id === 'adminPassword' || el.id === 'masterPassword' || el.id === 'loginPassword') return;
    el.addEventListener('blur', function () {
      if (this.value && this.value.length > 0) {
        this.value = autoCapitalize(this.value);
      }
    });
  });
}

// === IMAGE RESIZE ===
function resizeImage(f, mW, mH, q) {
  q = q || .8;
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function (e) {
      var i = new Image();
      i.onload = function () {
        var w = i.width, h = i.height;
        if (w > mW) { h = h * mW / w; w = mW }
        if (h > mH) { w = w * mH / h; h = mH }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(i, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', q))
      };
      i.onerror = rej; i.src = e.target.result
    };
    r.onerror = rej; r.readAsDataURL(f)
  })
}
