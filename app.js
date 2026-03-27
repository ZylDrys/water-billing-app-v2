// ==========================================
// WATER BILLING SYSTEM - MAIN APPLICATION JS
// ==========================================

// === GLOBALS & CONSTANTS ===
const API_URL = 'https://script.google.com/macros/s/AKfycby0f2jnqyoAjVt6Mtj1gAVKErmbfBHeF8Ik0gF1S30VeO6ftnfAzELVsxL9OLd2P2kt/exec';
const SYNC_INTERVAL = 60000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CLOCK_DRIFT_TOLERANCE = 2 * 60 * 1000;

// Storage Keys
const DEV_MODE_KEY = 'devModeEnabled';
const MASTER_PASSWORD_KEY = 'masterPassword';
const DEFAULT_MASTER_PASSWORD = 'admin123';
const TEMP_PASSWORD_KEY = 'tempPassword';
const TEMP_PASSWORD_EXPIRY_KEY = 'tempPasswordExpiry';
const TIME_SYNC_INTERNET_KEY = 'timeSync_internet';
const TIME_SYNC_DEVICE_KEY = 'timeSync_device';
const TIMER_VISIBLE_KEY = 'timerVisible';
const CUSTOMIZE_KEY = 'water_customize_v2';
const IMAGES_KEY = 'water_images_v2';
const SAVED_BGS_KEY = 'water_saved_bgs';
const LAST_SYNC_KEY = 'water_lastSync';
const SYNC_TIMESTAMP_KEY = 'water_syncTimestamp';

const STORAGE = { 
  customers: 'water_customers_v2', 
  bills: 'water_bills_v2', 
  settings: 'water_settings_v2',
  finance: 'water_finance_v2',
  suggestions: 'water_suggestions_v2'
};

const DEFAULT_SETTINGS = { 
  pricePerCubic: 1.50, 
  minCharge: 5.00, 
  currency: 'USD', 
  adminPassword: 'admin123', 
  penaltyRate: 0, 
  roundOff: false,
  subscriptionContract: ''
};

// State Variables
let isSyncing = false;
let lastSyncTime = 0;
let isOnline = navigator.onLine;
let pendingSync = false;
let syncTimer = null;
let timerVisible = localStorage.getItem(TIMER_VISIBLE_KEY) !== 'false';

// Analysis Variables
let analysisYear = new Date().getFullYear();
let analysisMonth = new Date().getMonth();
let analysisQuarter = Math.floor(new Date().getMonth() / 3);
let analysisSemiAnnual = new Date().getMonth() < 6 ? 0 : 1;
let analysisPeriod = 'monthly';
let importMode = 'simple';
let lastFilteredBills = [];


// === DEV MODE & ANTI-INSPECT ===
function isDevMode() { return localStorage.getItem(DEV_MODE_KEY) === 'true'; }

function toggleDevMode() {
  const current = isDevMode();
  localStorage.setItem(DEV_MODE_KEY, String(!current));
  alert((!current ? '✅ Developer Mode ENABLED\nF12 and DevTools now accessible.' : '❌ Developer Mode DISABLED\nF12 and DevTools blocked.') + '\nPage will reload.');
  location.reload();
}

function updateDevModeUI() {
  const btn = document.getElementById('devModeToggleBtn');
  const ind = document.getElementById('devModeIndicator');
  if (btn) {
    if (isDevMode()) { 
      btn.textContent = 'Disable Developer Mode'; 
      btn.style.background = 'var(--bg-danger)'; 
    } else { 
      btn.textContent = 'Enable Developer Mode'; 
      btn.style.background = '#17a2b8'; 
    }
  }
  if (ind) {
    if (isDevMode()) ind.classList.add('active'); 
    else ind.classList.remove('active');
  }
}

// Anti-Inspect protection
(function () {
  if (localStorage.getItem('devModeEnabled') === 'true') return;
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'F12') e.preventDefault();
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) e.preventDefault();
    if (e.ctrlKey && ['U', 'S'].includes(e.key.toUpperCase())) e.preventDefault();
  });
  document.addEventListener('dragstart', e => e.preventDefault());
})();


// === THEMES & PRESETS ===
const THEMES = { 
  light: { name: 'Light', icon: '☀', body: '#f5f7fa', container: '#fff', accent: '#007bff', accentHover: '#0056b3', success: '#28a745', text: '#333', textSec: '#666', border: '#ccc', input: '#fff', tableEven: '#f9f9f9', cardBorder: '#eee', warning: '#ffc107', warnText: '#333', shadow: 'rgba(0,0,0,.1)' },
  dark: { name: 'Dark', icon: '🌙', body: '#1a1a2e', container: '#16213e', accent: '#0f3460', accentHover: '#1a4a8a', success: '#28a745', text: '#e0e0e0', textSec: '#aaa', border: '#333355', input: '#1a2340', tableEven: '#1c2a4a', cardBorder: '#2a2a4a', warning: '#ffc107', warnText: '#333', shadow: 'rgba(0,0,0,.3)' },
  ocean: { name: 'Ocean', icon: '🌊', body: '#e3f2fd', container: '#fff', accent: '#0277bd', accentHover: '#015d94', success: '#00897b', text: '#263238', textSec: '#546e7a', border: '#b0bec5', input: '#f5fbff', tableEven: '#e1f0fa', cardBorder: '#cfe2f0', warning: '#ffb300', warnText: '#333', shadow: 'rgba(2,119,189,.1)' },
  forest: { name: 'Forest', icon: '🌲', body: '#e8f5e9', container: '#fff', accent: '#2e7d32', accentHover: '#1b5e20', success: '#388e3c', text: '#1b5e20', textSec: '#4a7c4f', border: '#a5d6a7', input: '#f5fdf5', tableEven: '#e0f2e1', cardBorder: '#c8e6c9', warning: '#ff8f00', warnText: '#333', shadow: 'rgba(46,125,50,.1)' },
  sunset: { name: 'Sunset', icon: '🌇', body: '#fff3e0', container: '#fff', accent: '#e65100', accentHover: '#bf360c', success: '#ef6c00', text: '#3e2723', textSec: '#6d4c41', border: '#ffcc80', input: '#fffdf5', tableEven: '#fff0db', cardBorder: '#ffe0b2', warning: '#ff6f00', warnText: '#fff', shadow: 'rgba(230,81,0,.1)' },
  rose: { name: 'Rose', icon: '🌹', body: '#fce4ec', container: '#fff', accent: '#c2185b', accentHover: '#ad1457', success: '#e91e63', text: '#880e4f', textSec: '#ad1457', border: '#f48fb1', input: '#fff5f8', tableEven: '#fce4ec', cardBorder: '#f8bbd0', warning: '#ff6f00', warnText: '#fff', shadow: 'rgba(194,24,91,.1)' },
  lavender: { name: 'Lavender', icon: '🌸', body: '#ede7f6', container: '#fff', accent: '#7b1fa2', accentHover: '#6a1b9a', success: '#9c27b0', text: '#4a148c', textSec: '#7b1fa2', border: '#ce93d8', input: '#faf5ff', tableEven: '#f3e5f5', cardBorder: '#e1bee7', warning: '#ff8f00', warnText: '#333', shadow: 'rgba(123,31,162,.1)' },
  midnight: { name: 'Midnight', icon: '🌌', body: '#0d1117', container: '#161b22', accent: '#58a6ff', accentHover: '#79b8ff', success: '#3fb950', text: '#c9d1d9', textSec: '#8b949e', border: '#30363d', input: '#0d1117', tableEven: '#1c2230', cardBorder: '#21262d', warning: '#d29922', warnText: '#fff', shadow: 'rgba(0,0,0,.4)' },
  sand: { name: 'Sand', icon: '🏖', body: '#fdf6ec', container: '#fffdf7', accent: '#8d6e63', accentHover: '#6d4c41', success: '#a1887f', text: '#4e342e', textSec: '#795548', border: '#d7ccc8', input: '#fffdf7', tableEven: '#efebe9', cardBorder: '#d7ccc8', warning: '#ff8f00', warnText: '#333', shadow: 'rgba(141,110,99,.1)' },
  slate: { name: 'Slate', icon: '⛰', body: '#eceff1', container: '#fff', accent: '#546e7a', accentHover: '#37474f', success: '#607d8b', text: '#263238', textSec: '#546e7a', border: '#b0bec5', input: '#f5f7f8', tableEven: '#eceff1', cardBorder: '#cfd8dc', warning: '#ffb300', warnText: '#333', shadow: 'rgba(84,110,122,.1)' },
  cherry: { name: 'Cherry', icon: '🍒', body: '#ffebee', container: '#fff', accent: '#d32f2f', accentHover: '#b71c1c', success: '#e53935', text: '#b71c1c', textSec: '#c62828', border: '#ef9a9a', input: '#fff5f5', tableEven: '#ffebee', cardBorder: '#ffcdd2', warning: '#ff6f00', warnText: '#fff', shadow: 'rgba(211,47,47,.1)' },
  teal: { name: 'Teal', icon: '💎', body: '#e0f2f1', container: '#fff', accent: '#00796b', accentHover: '#00695c', success: '#00897b', text: '#004d40', textSec: '#00695c', border: '#80cbc4', input: '#f0fffe', tableEven: '#e0f2f1', cardBorder: '#b2dfdb', warning: '#ff8f00', warnText: '#333', shadow: 'rgba(0,121,107,.1)' }
};

const PRESETS = [
  { name: 'Clean Office', theme: 'light', gradient: 'none' },
  { name: 'Night Mode', theme: 'dark', gradient: 'linear-gradient(135deg, #0d1117, #1a1a2e, #16213e)' },
  { name: 'Ocean Breeze', theme: 'ocean', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { name: 'Forest Path', theme: 'forest', gradient: 'linear-gradient(135deg, #134e5e, #71b280)' },
  { name: 'Sunset Glow', theme: 'sunset', gradient: 'linear-gradient(135deg, #f093fb, #f5576c, #ffd452)' },
  { name: 'Rose Garden', theme: 'rose', gradient: 'linear-gradient(135deg, #ee9ca7, #ffdde1)' },
  { name: 'Lavender Dream', theme: 'lavender', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
  { name: 'Midnight Sky', theme: 'midnight', gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { name: 'Beach Sand', theme: 'sand', gradient: 'linear-gradient(135deg, #f5af19, #f12711)' },
  { name: 'Slate Mountain', theme: 'slate', gradient: 'linear-gradient(135deg, #bdc3c7, #2c3e50)' },
  { name: 'Cherry Bloom', theme: 'cherry', gradient: 'linear-gradient(135deg, #f85032, #e73827)' },
  { name: 'Teal Lagoon', theme: 'teal', gradient: 'linear-gradient(135deg, #43cea2, #185a9d)' }
];


// === DATA HELPERS ===
function getData(key) {
  try { return JSON.parse(localStorage.getItem(STORAGE[key]) || '[]'); } 
  catch(e) { return []; }
}
function saveDataLocal(key, data) { localStorage.setItem(STORAGE[key], JSON.stringify(data)); }
function saveData(key, data) { saveDataLocal(key, data); scheduleSync(); }

function getSettings() {
  try {
    let s = JSON.parse(localStorage.getItem(STORAGE.settings) || '{}');
    return Object.assign({}, DEFAULT_SETTINGS, s);
  } catch(e) { return Object.assign({}, DEFAULT_SETTINGS); }
}
function saveSettingsData(s) { 
  localStorage.setItem(STORAGE.settings, JSON.stringify(s)); 
  scheduleSync(); 
}

function getMasterPassword() { return localStorage.getItem(MASTER_PASSWORD_KEY) || DEFAULT_MASTER_PASSWORD; }
function getCustomization() { try { return JSON.parse(localStorage.getItem(CUSTOMIZE_KEY)) || {}; } catch(e) { return {}; } }
function saveCustomizationData(d) { localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(d)); scheduleSync(); }
function getImages() { try { return JSON.parse(localStorage.getItem(IMAGES_KEY)) || {}; } catch(e) { return {}; } }
function saveImages(d) { localStorage.setItem(IMAGES_KEY, JSON.stringify(d)); }
function getSavedBgs() { try { return JSON.parse(localStorage.getItem(SAVED_BGS_KEY)) || []; } catch(e) { return []; } }
function saveSavedBgs(a) { localStorage.setItem(SAVED_BGS_KEY, JSON.stringify(a)); }

function formatMoney(amount) {
  const s = getSettings();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: s.currency === 'PHP' ? 'PHP' : s.currency === 'EUR' ? 'EUR' : 'USD',
    minimumFractionDigits: s.roundOff ? 0 : 2,
    maximumFractionDigits: s.roundOff ? 0 : 2
  }).format(s.roundOff ? Math.round(amount) : amount);
}

function getCurrencyFormatter() { return { format: v => formatMoney(v) }; }
function getCurrencySymbol() {
  const s = getSettings();
  return s.currency === 'PHP' ? '₱' : s.currency === 'EUR' ? '€' : '$';
}
function applyRounding(amount) {
  const s = getSettings();
  return s.roundOff ? Math.round(amount) : amount;
}


// === CLOUD SYNC & TIME ===
function updateSyncIndicator(state, text) {
  const el = document.getElementById('syncIndicator');
  const ic = document.getElementById('syncIcon');
  const txt = document.getElementById('syncText');
  if (!el) return;
  el.className = 'sync-indicator ' + state;
  ic.textContent = { syncing: '🔄', synced: '☁', error: '⚠', offline: '🔌' }[state] || '☁';
  txt.textContent = text || state;
}

function scheduleSync() {
  pendingSync = true;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => pushToCloud(), 3000);
}

function getLocalTimestamp() { return parseInt(localStorage.getItem(SYNC_TIMESTAMP_KEY) || '0'); }
function setLocalTimestamp() {
  const ts = Date.now();
  localStorage.setItem(SYNC_TIMESTAMP_KEY, String(ts));
  return ts;
}

function buildPayload() {
  const c = getCustomization();
  const im = getImages();
  const sb = getSavedBgs();
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
      companyEmail: c.companyEmail || ''
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
      tempPasswordExpiry: localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || ''
    }]
  };
}

async function pushToCloud() {
  if (isSyncing || !navigator.onLine) {
    if (!navigator.onLine) updateSyncIndicator('offline', 'Offline');
    return;
  }
  isSyncing = true;
  pendingSync = false;
  updateSyncIndicator('syncing', 'Uploading...');
  
  try {
    const payload = buildPayload();
    setLocalTimestamp();
    const res = await fetch(API_URL + '?action=writeAll', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      lastSyncTime = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, String(lastSyncTime));
      updateSyncIndicator('synced', 'Synced just now');
    } else {
      updateSyncIndicator('error', 'Failed');
    }
  } catch(e) {
    updateSyncIndicator('error', 'Error');
  } finally {
    isSyncing = false;
  }
}

async function pullFromCloud() {
  if (!navigator.onLine) { updateSyncIndicator('offline', 'Offline'); return false; }
  updateSyncIndicator('syncing', 'Loading...');
  
  try {
    const res = await fetch(API_URL + '?action=readAll');
    const d = await res.json();
    if (!d.success || !d.data) throw new Error('Invalid');
    
    const cl = d.data;
    const lt = getLocalTimestamp();
    let ct = 0;
    
    if (cl.Meta && cl.Meta.length > 0) {
      const m = cl.Meta[0];
      ct = parseInt(m.timestamp || '0');
      if (m.masterPassword) localStorage.setItem(MASTER_PASSWORD_KEY, m.masterPassword);
      if (m.tempPassword) {
        localStorage.setItem(TEMP_PASSWORD_KEY, m.tempPassword);
        localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, m.tempPasswordExpiry || '0');
      } else if (ct > lt) {
        localStorage.removeItem(TEMP_PASSWORD_KEY);
        localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
      }
    }
    
    const localEmpty = getData('customers').length === 0 && getData('bills').length === 0;
    const cloudNewer = ct > lt;
    
    if (localEmpty || cloudNewer) {
      if (cl.Customers) saveDataLocal('customers', cl.Customers);
      if (cl.Bills) saveDataLocal('bills', cl.Bills);
      if (cl.Settings && cl.Settings.length > 0) localStorage.setItem(STORAGE.settings, JSON.stringify(cl.Settings[0]));
      
      if (cl.Customization && cl.Customization.length > 0) {
        const lc = getCustomization();
        const cc = cl.Customization[0];
        localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify({
          theme: cc.theme || lc.theme || 'light',
          backgroundPreset: cc.backgroundPreset || lc.backgroundPreset || '',
          activePreset: cc.activePreset !== undefined ? cc.activePreset : lc.activePreset,
          companyName: cc.companyName || lc.companyName || '',
          companyAddress: cc.companyAddress || lc.companyAddress || '',
          companyPhone: cc.companyPhone || lc.companyPhone || '',
          companyEmail: cc.companyEmail || lc.companyEmail || ''
        }));
      }
      
      if (cl.Images && cl.Images.length > 0) {
        const ci = cl.Images[0];
        const li = getImages();
        saveImages({
          companyLogo: ci.companyLogo || li.companyLogo || '',
          backgroundImage: ci.backgroundImage || li.backgroundImage || '',
          qrCode: ci.qrCode || li.qrCode || ''
        });
        
        if (ci.savedBackgrounds) {
          try {
            const csb = JSON.parse(ci.savedBackgrounds);
            if (Array.isArray(csb)) saveSavedBgs(csb);
          } catch(e) {}
        }
      }
      setLocalTimestamp();
    } else if (!localEmpty && !cloudNewer) {
      scheduleSync();
    }
    
    lastSyncTime = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, String(lastSyncTime));
    updateSyncIndicator('synced', 'Synced just now');
    return true;
  } catch(e) {
    updateSyncIndicator('error', 'Connection failed');
    return false;
  }
}

function manualSync() {
  if (isSyncing) return;
  pushToCloud().then(() => pullFromCloud()).then(() => {
    loadCustomerDropdowns();
    loadCustomersList();
    applyVisuals();
    updateCurrencyDisplay();
    updateTimerDisplay();
    updateMenuBadges();
    
    const activeSection = document.querySelector('.section.active');
    if (activeSection) {
      if (activeSection.id === 'historySection') loadFilteredHistory();
      if (activeSection.id === 'customizeSection') loadCustomizationForm();
      if (activeSection.id === 'analysisSection') renderAnalysis();
    }
  });
}


// === BACKUP / RESTORE ===
function backupToFile() {
  const data = {
    version: 4,
    date: new Date().toISOString(),
    customers: getData('customers'),
    bills: getData('bills'),
    settings: getSettings(),
    finance: getData('finance'),
    customization: getCustomization(),
    images: getImages(),
    savedBackgrounds: getSavedBgs(),
    masterPassword: localStorage.getItem(MASTER_PASSWORD_KEY),
    tempPassword: localStorage.getItem(TEMP_PASSWORD_KEY),
    tempPasswordExpiry: localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY)
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'water-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  alert('✅ Downloaded!');
}

function restoreFromFile() { document.getElementById('restoreFileInput').click(); }

function handleRestoreFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d.customers && !d.bills) { alert('Invalid file format'); return; }
      if (!confirm('⚠ Replace ALL existing data with this backup?')) return;
      
      if (d.customers) saveDataLocal('customers', d.customers);
      if (d.bills) saveDataLocal('bills', d.bills);
      if (d.settings) localStorage.setItem(STORAGE.settings, JSON.stringify(d.settings));
      if (d.finance) saveDataLocal('finance', d.finance);
      if (d.customization) localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(d.customization));
      if (d.images) saveImages(d.images);
      if (d.savedBackgrounds) saveSavedBgs(d.savedBackgrounds);
      if (d.masterPassword) localStorage.setItem(MASTER_PASSWORD_KEY, d.masterPassword);
      if (d.tempPassword) {
        localStorage.setItem(TEMP_PASSWORD_KEY, d.tempPassword);
        if (d.tempPasswordExpiry) localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, d.tempPasswordExpiry);
      }
      
      setLocalTimestamp();
      alert('✅ Data Restored!');
      pushToCloud().then(() => location.reload()).catch(() => location.reload());
    } catch(err) {
      alert('Error reading backup file: ' + err.message);
    }
  };
  reader.readAsText(f);
  e.target.value = '';
}


// === UTILS ===
function resizeImage(file, maxWidth, maxHeight, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// === PROMPT MODALS ===
function showPromptModal(title, isPw) {
  return new Promise(resolve => {
    const m = document.getElementById('promptModal');
    const inp = document.getElementById('promptInput');
    const titleEl = document.getElementById('promptTitle');
    const tog = document.getElementById('togglePromptPassword');
    const confBtn = document.getElementById('promptConfirm');
    const cancBtn = document.getElementById('promptCancel');
    
    titleEl.textContent = title;
    inp.value = '';
    inp.type = isPw ? 'password' : 'text';
    tog.style.display = isPw ? 'inline' : 'none';
    tog.textContent = '👁';
    m.style.display = 'flex';
    inp.focus();
    
    const cleanup = () => {
      m.style.display = 'none';
      confBtn.removeEventListener('click', onConfirm);
      cancBtn.removeEventListener('click', onCancel);
      inp.removeEventListener('keydown', onKey);
      tog.removeEventListener('click', onToggle);
    };
    
    const onConfirm = () => { const v = inp.value.trim(); cleanup(); resolve(v || null); };
    const onCancel = () => { cleanup(); resolve(null); };
    const onKey = e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel(); };
    const onToggle = () => {
      inp.type = inp.type === 'password' ? 'text' : 'password';
      tog.textContent = inp.type === 'password' ? '👁' : '🔒';
    };
    
    confBtn.addEventListener('click', onConfirm);
    cancBtn.addEventListener('click', onCancel);
    inp.addEventListener('keydown', onKey);
    tog.addEventListener('click', onToggle);
  });
}


// === TIME LOGIC ===
async function getInternetTime() {
  const apis = [
    { url: 'https://timeapi.io/api/time/current/zone?timeZone=UTC', parse: d => new Date(d.dateTime + 'Z').getTime() },
    { url: 'https://worldtimeapi.org/api/ip', parse: d => new Date(d.utc_datetime).getTime() }
  ];
  
  for (const api of apis) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 5000);
      const res = await fetch(api.url, { signal: c.signal });
      clearTimeout(t);
      if (res.ok) {
        const d = await res.json();
        const v = api.parse(d);
        if (v && !isNaN(v)) return v;
      }
    } catch(e) { continue; }
  }
  return null;
}

function saveTimeSync(t) {
  localStorage.setItem(TIME_SYNC_INTERNET_KEY, String(t));
  localStorage.setItem(TIME_SYNC_DEVICE_KEY, String(Date.now()));
}

async function getCurrentTime() {
  const it = await getInternetTime();
  if (it !== null) { saveTimeSync(it); return { time: it, source: 'internet' }; }
  
  const li = parseInt(localStorage.getItem(TIME_SYNC_INTERNET_KEY) || '0');
  const ld = parseInt(localStorage.getItem(TIME_SYNC_DEVICE_KEY) || '0');
  if (!li || !ld) return { time: null, source: 'none' };
  
  const elapsed = Date.now() - ld;
  if (elapsed < -CLOCK_DRIFT_TOLERANCE) return { time: null, source: 'tampered' };
  
  return { time: li + Math.max(0, elapsed), source: 'offline' };
}

function getCurrentTimeSync() {
  const li = parseInt(localStorage.getItem(TIME_SYNC_INTERNET_KEY) || '0');
  const ld = parseInt(localStorage.getItem(TIME_SYNC_DEVICE_KEY) || '0');
  if (!li || !ld) return null;
  const elapsed = Date.now() - ld;
  if (elapsed < -CLOCK_DRIFT_TOLERANCE) return null;
  return li + Math.max(0, elapsed);
}

function backgroundTimeSync() {
  getInternetTime().then(t => { if (t !== null) saveTimeSync(t); });
}


// === AUTHENTICATION ===
function isValidAdminAccessSync(pw) {
  if (pw === getMasterPassword()) return true;
  const s = getSettings();
  return s.adminPassword && pw === s.adminPassword;
}

async function checkLogin(pw) {
  if (isValidAdminAccessSync(pw)) return true;
  
  const tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  const ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
  
  if (tp && pw === tp) {
    const tr = await getCurrentTime();
    if (tr.source === 'tampered') return 'tampered';
    if (tr.time === null) return 'no-sync';
    if (tr.time < ex) {
      return { valid: true, source: tr.source, daysLeft: Math.ceil((ex - tr.time) / 86400000) };
    }
    localStorage.removeItem(TEMP_PASSWORD_KEY);
    localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
    scheduleSync();
    return 'expired';
  }
  return false;
}

function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginMessage').textContent = '';
  setTimeout(() => document.getElementById('loginPassword').focus(), 100);
}
function hideLoginModal() { document.getElementById('loginModal').style.display = 'none'; }


// === NAVIGATION & UI ===
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  
  if (id === 'newBillSection') { loadCustomerDropdowns(); clearBillForm(); }
  else if (id === 'historySection') { loadCustomerDropdowns(); loadFilteredHistory(); }
  else if (id === 'customersSection') loadCustomersList();
  else if (id === 'settingsSection') { loadSettings(); updateDevModeUI(); }
  else if (id === 'customizeSection') loadCustomizationForm();
  else if (id === 'analysisSection') renderAnalysis();
  else if (id === 'menuSection') updateMenuBadges();
}

function updateMenuBadges() {
  const bills = getData('bills');
  const unpaid = bills.filter(b => (b.paymentStatus || 'unpaid') !== 'paid').length;
  const card = document.getElementById('menuCustomerCard');
  if(!card) return;
  const existing = card.querySelector('.menu-badge');
  if (existing) existing.remove();
  
  if (unpaid > 0) {
    const badge = document.createElement('div');
    badge.className = 'menu-badge danger';
    badge.textContent = unpaid + ' unpaid';
    card.appendChild(badge);
  }
}

function clearPasswordFields() {
  document.querySelectorAll('input[type="password"][data-clear-on-confirm="true"]').forEach(f => f.value = '');
}


// === CUSTOMIZATION (THEMES) ===
function applyTheme(id) {
  const t = THEMES[id] || THEMES.light;
  const r = document.documentElement.style;
  r.setProperty('--bg-body', t.body);
  r.setProperty('--bg-container', t.container);
  r.setProperty('--bg-accent', t.accent);
  r.setProperty('--bg-accent-hover', t.accentHover);
  r.setProperty('--bg-success', t.success);
  r.setProperty('--bg-warning', t.warning);
  r.setProperty('--bg-danger', '#dc3545');
  r.setProperty('--bg-input', t.input);
  r.setProperty('--bg-table-even', t.tableEven);
  r.setProperty('--bg-card-border', t.cardBorder);
  r.setProperty('--text-primary', t.text);
  r.setProperty('--text-secondary', t.textSec);
  r.setProperty('--text-muted', t.textSec);
  r.setProperty('--text-on-accent', '#fff');
  r.setProperty('--text-on-warning', t.warnText);
  r.setProperty('--border-color', t.border);
  r.setProperty('--border-focus', t.accent);
  r.setProperty('--shadow-color', t.shadow);
  document.querySelector('meta[name="theme-color"]').content = t.accent;
}

function applyVisuals() {
  const c = getCustomization();
  const im = getImages();
  applyTheme(c.theme || 'light');
  
  if (im.backgroundImage) {
    document.body.style.backgroundImage = `url(${im.backgroundImage})`;
  } else if (c.backgroundPreset && c.backgroundPreset !== 'none') {
    document.body.style.backgroundImage = c.backgroundPreset;
  } else {
    document.body.style.backgroundImage = 'none';
  }
  renderThemeGrid();
  renderPresetGrid();
  renderSavedBgs();
}

function renderThemeGrid() {
  const g = document.getElementById('themeGrid');
  if (!g) return;
  const c = getCustomization();
  g.innerHTML = Object.keys(THEMES).map(id => {
    const t = THEMES[id];
    const active = (c.theme || 'light') === id;
    return `<div class="theme-swatch ${active ? 'active' : ''}" onclick="previewTheme('${id}')" style="background:${t.container};border-color:${active ? t.accent : 'transparent'}">
      <span>${t.icon}</span><small style="color:${t.text}">${t.name}</small>
      <div style="position:absolute;bottom:0;left:0;right:0;height:6px;background:${t.accent};border-radius:0 0 9px 9px"></div>
    </div>`;
  }).join('');
}

function renderPresetGrid() {
  const g = document.getElementById('presetGrid');
  if (!g) return;
  const c = getCustomization();
  g.innerHTML = PRESETS.map((p, i) => {
    const bg = p.gradient === 'none' ? THEMES[p.theme].body : p.gradient;
    return `<div class="preset-card ${c.activePreset === i ? 'active' : ''}" onclick="applyPreset(${i})" style="background:${bg}">${p.name}</div>`;
  }).join('');
}

function renderSavedBgs() {
  const g = document.getElementById('savedBgGrid');
  if (!g) return;
  const s = getSavedBgs();
  const im = getImages();
  if (!s.length) {
    g.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:13px">No saved backgrounds</p>';
    return;
  }
  g.innerHTML = s.map(b => `<div class="saved-bg-item ${im.backgroundImage === b.data ? 'active' : ''}" style="background-image:url(${b.data})" onclick="applySavedBg(${b.id})">
    <button class="delete-bg" onclick="event.stopPropagation();deleteSavedBg(${b.id})">✕</button>
  </div>`).join('');
}

function previewTheme(id) {
  applyTheme(id);
  const c = getCustomization();
  c.theme = id;
  c.activePreset = undefined;
  saveCustomizationData(c);
  renderThemeGrid();
  renderPresetGrid();
}

function applyPreset(i) {
  const p = PRESETS[i];
  const c = getCustomization();
  c.theme = p.theme;
  c.activePreset = i;
  c.backgroundPreset = p.gradient;
  
  const im = getImages();
  im.backgroundImage = '';
  saveImages(im);
  saveCustomizationData(c);
  applyVisuals();
  
  const bp = document.getElementById('bgPreview');
  if (bp) {
    bp.style.backgroundImage = p.gradient !== 'none' ? p.gradient : 'none';
    bp.textContent = p.gradient !== 'none' ? '' : 'No background set';
  }
}

function saveCurrentBgAsPreset() {
  const im = getImages();
  if (!im.backgroundImage) return alert('No custom background uploaded.');
  const s = getSavedBgs();
  if (s.some(b => b.data === im.backgroundImage)) return alert('Already saved.');
  s.push({ id: Date.now(), name: 'BG ' + (s.length + 1), data: im.backgroundImage });
  saveSavedBgs(s);
  scheduleSync();
  renderSavedBgs();
  alert('✅ Saved!');
}

function applySavedBg(id) {
  const s = getSavedBgs();
  const b = s.find(x => x.id === id);
  if (!b) return;
  
  const im = getImages();
  im.backgroundImage = b.data;
  saveImages(im);
  
  const c = getCustomization();
  c.backgroundPreset = '';
  c.activePreset = undefined;
  saveCustomizationData(c);
  
  document.body.style.backgroundImage = `url(${b.data})`;
  const bp = document.getElementById('bgPreview');
  if (bp) {
    bp.style.backgroundImage = `url(${b.data})`;
    bp.textContent = '';
  }
  renderSavedBgs();
  renderPresetGrid();
  scheduleSync();
}

function deleteSavedBg(id) {
  if (!confirm('Delete this background?')) return;
  saveSavedBgs(getSavedBgs().filter(b => b.id !== id));
  scheduleSync();
  renderSavedBgs();
}

function handleLogoUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  const p = document.getElementById('logoProgress');
  const b = document.getElementById('logoProgressBar');
  p.classList.add('active');
  b.style.width = '30%';
  
  resizeImage(f, 200, 200, 0.85).then(d => {
    b.style.width = '80%';
    const im = getImages();
    im.companyLogo = d;
    saveImages(im);
    scheduleSync();
    document.getElementById('logoPreview').innerHTML = `<img src="${d}">`;
    b.style.width = '100%';
    setTimeout(() => { p.classList.remove('active'); b.style.width = '0'; }, 500);
  }).catch(() => { alert('Error processing image'); p.classList.remove('active'); });
}

function removeLogo() {
  const im = getImages();
  im.companyLogo = '';
  saveImages(im);
  scheduleSync();
  document.getElementById('logoPreview').innerHTML = '<span style="font-size:32px;color:var(--text-muted)">🖼</span>';
  document.getElementById('logoUpload').value = '';
}

function handleBgUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  const p = document.getElementById('bgProgress');
  const b = document.getElementById('bgProgressBar');
  p.classList.add('active');
  b.style.width = '20%';
  
  resizeImage(f, 1920, 1080, 0.7).then(d => {
    b.style.width = '70%';
    const im = getImages();
    im.backgroundImage = d;
    saveImages(im);
    
    const c = getCustomization();
    c.backgroundPreset = '';
    c.activePreset = undefined;
    saveCustomizationData(c);
    
    document.body.style.backgroundImage = `url(${d})`;
    const bp = document.getElementById('bgPreview');
    bp.style.backgroundImage = `url(${d})`;
    bp.textContent = '';
    
    renderPresetGrid();
    b.style.width = '100%';
    scheduleSync();
    setTimeout(() => { p.classList.remove('active'); b.style.width = '0'; }, 500);
  }).catch(() => { alert('Error processing image'); p.classList.remove('active'); });
}

function removeBackground() {
  const im = getImages();
  im.backgroundImage = '';
  saveImages(im);
  
  const c = getCustomization();
  c.backgroundPreset = '';
  c.activePreset = undefined;
  saveCustomizationData(c);
  
  document.body.style.backgroundImage = 'none';
  const bp = document.getElementById('bgPreview');
  bp.style.backgroundImage = 'none';
  bp.textContent = 'No background set';
  document.getElementById('bgUpload').value = '';
  
  renderPresetGrid();
  renderSavedBgs();
  scheduleSync();
}

function loadCustomizationForm() {
  const c = getCustomization();
  const im = getImages();
  
  document.getElementById('companyName').value = c.companyName || '';
  document.getElementById('companyAddress').value = c.companyAddress || '';
  document.getElementById('companyPhone').value = c.companyPhone || '';
  document.getElementById('companyEmail').value = c.companyEmail || '';
  
  const preview = document.getElementById('logoPreview');
  if (im.companyLogo) preview.innerHTML = `<img src="${im.companyLogo}">`;
  else preview.innerHTML = '<span style="font-size:32px;color:var(--text-muted)">🖼</span>';
  
  const bp = document.getElementById('bgPreview');
  if (im.backgroundImage) {
    bp.style.backgroundImage = `url(${im.backgroundImage})`;
    bp.textContent = '';
  } else if (c.backgroundPreset && c.backgroundPreset !== 'none') {
    bp.style.backgroundImage = c.backgroundPreset;
    bp.textContent = '';
  } else {
    bp.style.backgroundImage = 'none';
    bp.textContent = 'No background set';
  }
  
  renderThemeGrid();
  renderPresetGrid();
  renderSavedBgs();
}

function saveCustomization() {
  const c = getCustomization();
  c.companyName = document.getElementById('companyName').value.trim();
  c.companyAddress = document.getElementById('companyAddress').value.trim();
  c.companyPhone = document.getElementById('companyPhone').value.trim();
  c.companyEmail = document.getElementById('companyEmail').value.trim();
  saveCustomizationData(c);
  alert('✅ Customization Saved!');
}


// === SETTINGS & ADMIN AUTH ===
function loadSettings() {
  const s = getSettings();
  document.getElementById('adminPricePerCubic').value = s.pricePerCubic;
  document.getElementById('adminMinCharge').value = s.minCharge;
  document.getElementById('adminPenaltyRate').value = s.penaltyRate || 0;
  document.getElementById('adminRoundOff').checked = !!s.roundOff;
  document.getElementById('adminPassword').value = '';
  
  // Also load contract for QR section
  const c = document.getElementById('subscriptionContract');
  if (c) c.value = s.subscriptionContract || '';
  
  // Load QR preview
  const im = getImages();
  const qrp = document.getElementById('qrPreview');
  if (qrp) {
    if (im.qrCode) qrp.innerHTML = `<img src="${im.qrCode}">`;
    else qrp.innerHTML = '<span style="font-size:32px;color:var(--text-muted);">🔳</span>';
  }
}

function setCurrency(c) {
  const s = getSettings();
  s.currency = c;
  saveSettingsData(s);
  updateCurrencyDisplay();
  alert(`Currency set to ${c}`);
}

function updateCurrencyDisplay() {
  const el = document.getElementById('displayCurrencySymbol');
  if (el) el.textContent = getCurrencySymbol();
}

async function saveSettings() {
  const pw = document.getElementById('adminPassword').value;
  const res = await checkLogin(pw);
  
  if (res === 'tampered' || res === 'no-sync') { alert('⚠ Time issue detected.'); clearPasswordFields(); return; }
  if (res !== true && !(res && res.valid)) { alert('Invalid admin password'); clearPasswordFields(); return; }
  
  const s = getSettings();
  s.pricePerCubic = parseFloat(document.getElementById('adminPricePerCubic').value) || DEFAULT_SETTINGS.pricePerCubic;
  s.minCharge = parseFloat(document.getElementById('adminMinCharge').value) || DEFAULT_SETTINGS.minCharge;
  s.penaltyRate = parseFloat(document.getElementById('adminPenaltyRate').value) || 0;
  s.roundOff = document.getElementById('adminRoundOff').checked;
  saveSettingsData(s);
  clearPasswordFields();
  alert('✅ Settings Saved!');
}

function confirmMasterPassword() {
  const inp = document.getElementById('masterPassword').value.trim();
  if (inp === getMasterPassword()) {
    document.getElementById('masterPasswordActions').style.display = 'block';
    document.getElementById('temporaryPasswordButtonContainer').style.display = 'block';
    document.getElementById('qrPaymentSection').style.display = 'block';
    updateDevModeUI();
    clearPasswordFields();
    alert('Access granted to extra settings');
  } else {
    alert('Incorrect Master Password');
    clearPasswordFields();
  }
}

async function changeMasterPassword() {
  const c = await showPromptModal('Current master password:', true);
  if (!c) return;
  if (c !== getMasterPassword()) return alert('Incorrect password');
  
  const n = await showPromptModal('New master password:', true);
  if (!n) return alert('Password cannot be empty');
  
  localStorage.setItem(MASTER_PASSWORD_KEY, n);
  scheduleSync();
  alert('✅ Master Password Changed!');
  document.getElementById('masterPasswordActions').style.display = 'none';
  document.getElementById('temporaryPasswordButtonContainer').style.display = 'none';
  document.getElementById('qrPaymentSection').style.display = 'none';
  showSection('menuSection');
}

function showDefaultMasterPassword() { alert('Default is: ' + DEFAULT_MASTER_PASSWORD); }

function restoreDefaultMasterPassword() {
  if (!confirm('Restore default master password?')) return;
  localStorage.removeItem(MASTER_PASSWORD_KEY);
  scheduleSync();
  alert('Restored to default');
}

async function createTempPasswordPrompt() {
  const tr = await getCurrentTime();
  if (tr.source === 'tampered' || tr.time === null) return alert('❌ Time issue detected. Connect to internet first.');
  
  const tp = await showPromptModal('Enter temporary password:', true);
  if (!tp) return;
  
  const ex = tr.time + THIRTY_DAYS_MS;
  localStorage.setItem(TEMP_PASSWORD_KEY, tp);
  localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(ex));
  scheduleSync();
  alert('✅ Temp password created!\nExpires: ' + new Date(ex).toLocaleDateString());
  updateTimerDisplay();
}

function deleteTempPassword() {
  if (!confirm('Delete temporary password?')) return;
  localStorage.removeItem(TEMP_PASSWORD_KEY);
  localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
  scheduleSync();
  alert('Temp password removed.');
  updateTimerDisplay();
}

function addTimeToTempPassword() {
  let ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
  if (!ex) return alert('No temp password exists.');
  ex += 86400000; // +1 day
  localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(ex));
  scheduleSync();
  updateTimerDisplay();
  alert('✅ Added 1 day to temp password.');
}

function subtractTimeFromTempPassword() {
  let ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
  if (!ex) return alert('No temp password exists.');
  ex -= 86400000; // -1 day
  localStorage.setItem(TEMP_PASSWORD_EXPIRY_KEY, String(ex));
  scheduleSync();
  updateTimerDisplay();
  alert('✅ Subtracted 1 day from temp password.');
}

function restoreDefaults() {
  if (!confirm('⚠ Reset ALL app data?\nMaster password will be preserved.')) return;
  if (!confirm('⚠ FINAL WARNING! Proceed?')) return;
  
  const mp = localStorage.getItem(MASTER_PASSWORD_KEY);
  const si = localStorage.getItem(TIME_SYNC_INTERNET_KEY);
  const sd = localStorage.getItem(TIME_SYNC_DEVICE_KEY);
  
  localStorage.clear();
  
  if (mp) localStorage.setItem(MASTER_PASSWORD_KEY, mp);
  if (si) localStorage.setItem(TIME_SYNC_INTERNET_KEY, si);
  if (sd) localStorage.setItem(TIME_SYNC_DEVICE_KEY, sd);
  
  const ts = setLocalTimestamp();
  updateSyncIndicator('syncing', 'Resetting Cloud...');
  
  fetch(API_URL + '?action=clearAll', { method: 'POST', body: '{}' })
    .then(() => {
      const p = buildPayload();
      return fetch(API_URL + '?action=writeAll', { method: 'POST', body: JSON.stringify(p) });
    })
    .then(() => { alert('✅ Factory reset complete.'); location.reload(); })
    .catch(() => { alert('⚠ Local cleared. Cloud will sync later.'); location.reload(); });
}


// === ADDITIONAL SETTINGS: QR & SUGGESTIONS ===
function handleQrUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  resizeImage(f, 300, 300, 0.9).then(d => {
    const im = getImages();
    im.qrCode = d;
    saveImages(im);
    document.getElementById('qrPreview').innerHTML = `<img src="${d}">`;
    alert('✅ QR Uploaded temporarily (click save)');
  });
}

function removeQrCode() {
  const im = getImages();
  im.qrCode = '';
  saveImages(im);
  document.getElementById('qrPreview').innerHTML = '<span style="font-size:32px;color:var(--text-muted);">🔳</span>';
  document.getElementById('qrUpload').value = '';
}

function saveQrAndContract() {
  const text = document.getElementById('subscriptionContract').value;
  const s = getSettings();
  s.subscriptionContract = text;
  saveSettingsData(s);
  scheduleSync();
  alert('✅ QR & Contract Info Saved!');
}

function openSuggestionBox() {
  document.getElementById('suggestionModal').style.display = 'flex';
  document.getElementById('suggestionText').value = '';
  
  // Render history
  const hist = getData('suggestions');
  const histEl = document.getElementById('suggestionHistory');
  if (hist.length > 0) {
    histEl.innerHTML = hist.map(s => `<div style="font-size:11px;background:#f9f9f9;padding:6px;margin-bottom:4px;border-radius:4px;">${s.text} <small style="color:#aaa;">(${new Date(s.date).toLocaleDateString()})</small></div>`).join('');
  } else {
    histEl.innerHTML = '';
  }
}

function closeSuggestionBox() { document.getElementById('suggestionModal').style.display = 'none'; }

function submitSuggestion() {
  const txt = document.getElementById('suggestionText').value.trim();
  if (!txt) return;
  const hist = getData('suggestions');
  hist.push({ date: Date.now(), text: txt });
  saveData('suggestions', hist);
  alert('✅ Suggestion recorded!');
  closeSuggestionBox();
}


// === CUSTOMERS LOGIC ===
function addCustomer() {
  const nameInp = document.getElementById('newCustomerName');
  const n = nameInp.value.trim();
  if (!n) return alert('Enter customer name');
  
  const c = getData('customers');
  if (c.find(x => x.name.toLowerCase() === n.toLowerCase())) return alert('Customer already exists!');
  
  c.push({ id: Date.now(), name: n, createdAt: new Date().toISOString() });
  saveData('customers', c);
  nameInp.value = '';
  loadCustomersList();
  loadCustomerDropdowns();
  alert('✅ Added!');
}

function deleteCustomer(id) {
  if (!confirm('Delete customer AND all their bills?')) return;
  saveData('customers', getData('customers').filter(c => c.id !== id));
  saveData('bills', getData('bills').filter(b => b.customerId !== id));
  loadCustomersList();
  loadCustomerDropdowns();
}

function loadCustomersList(sortBy = 'name', order = 'asc') {
  let c = getData('customers');
  const el = document.getElementById('customerSearch');
  const term = el ? el.value.toLowerCase() : '';
  
  if (term) c = c.filter(x => x.name.toLowerCase().includes(term));
  
  c.sort((a, b) => {
    if (sortBy === 'name') return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    const d1 = new Date(a.createdAt).getTime(), d2 = new Date(b.createdAt).getTime();
    return order === 'asc' ? d1 - d2 : d2 - d1;
  });
  
  const listEl = document.getElementById('customersList');
  if (!c.length) {
    listEl.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted)">No customers found.</p>';
    return;
  }
  
  const bills = getData('bills');
  listEl.innerHTML = c.map(x => {
    const custBills = bills.filter(b => b.customerId === x.id);
    const unpaid = custBills.filter(b => (b.paymentStatus || 'unpaid') !== 'paid').length;
    
    return `<div style="padding:15px;border:1px solid var(--bg-card-border);margin:10px 0;border-radius:8px;background:var(--bg-container)">
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" class="customer-cb" value="${x.id}">
        <strong style="font-size:16px;">${x.name}</strong>
        ${unpaid > 0 ? `<span class="payment-badge unpaid">${unpaid} unpaid</span>` : ''}
      </div>
      <small style="color:var(--text-secondary);display:block;margin-top:5px;">Added: ${new Date(x.createdAt).toLocaleDateString()} • Bills: ${custBills.length}</small>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="viewCustomerHistory(${x.id})" style="padding:8px 12px;font-size:12px;flex:1;min-width:80px">View</button>
        <button onclick="deleteCustomer(${x.id})" style="padding:8px 12px;font-size:12px;background:var(--bg-danger);flex:1;min-width:80px">Delete</button>
      </div>
    </div>`;
  }).join('');
  
  const sa = document.getElementById('selectAllCustomers');
  if (sa) sa.checked = false;
}

function sortCustomers(b, o) { loadCustomersList(b, o); }
function filterCustomers() { loadCustomersList(); }

function viewCustomerHistory(id) {
  showSection('historySection');
  document.getElementById('historyFilter').value = id;
  loadFilteredHistory();
}

function loadCustomerDropdowns() {
  const c = getData('customers');
  const opts = c.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
  
  const bSel = document.getElementById('billCustomer');
  if (bSel) bSel.innerHTML = '<option value="">-- Select --</option>' + opts;
  
  const hSel = document.getElementById('historyFilter');
  if (hSel) hSel.innerHTML = '<option value="all">All Customers</option>' + opts;
}

function filterBillCustomers() {
  const term = document.getElementById('billCustomerSearch').value.toLowerCase();
  const c = getData('customers');
  const sel = document.getElementById('billCustomer');
  sel.innerHTML = '<option value="">-- Select --</option>';
  
  c.forEach(x => {
    if (x.name.toLowerCase().includes(term)) {
      const o = document.createElement('option');
      o.value = x.id;
      o.textContent = x.name;
      sel.appendChild(o);
    }
  });
}

function toggleSelectAllCustomers() {
  const chk = document.getElementById('selectAllCustomers').checked;
  document.querySelectorAll('.customer-cb').forEach(cb => cb.checked = chk);
}

function getSelectedCustomerIds() {
  return Array.from(document.querySelectorAll('.customer-cb:checked')).map(cb => parseInt(cb.value));
}

function bulkDeleteCustomers() {
  const ids = getSelectedCustomerIds();
  if (!ids.length) return alert('No customers selected.');
  if (!confirm(`Delete ${ids.length} selected customers and their bills?`)) return;
  
  const c = getData('customers').filter(x => !ids.includes(x.id));
  const b = getData('bills').filter(x => !ids.includes(x.customerId));
  saveData('customers', c);
  saveData('bills', b);
  
  alert(`✅ Deleted ${ids.length} customers.`);
  loadCustomersList();
  loadCustomerDropdowns();
  document.getElementById('selectAllCustomers').checked = false;
}


// === IMPORT CUSTOMERS EXCEL ===
function setImportMode(mode, btn) {
  importMode = mode;
  document.querySelectorAll('#importModeSelector button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('importSimpleInfo').style.display = mode === 'simple' ? 'block' : 'none';
  document.getElementById('importFullInfo').style.display = mode === 'full' ? 'block' : 'none';
}

function downloadCustomerTemplate() {
  let data;
  if (importMode === 'full') {
    data = [
      ['Name','Date','Previous','Present','Total Used','Total Due','Amount Paid','Status'],
      ['Juan Dela Cruz','2025-01-15',100,120,20,300,300,'paid'],
      ['Maria Santos','2025-01-15',50,75,25,375,0,'unpaid']
    ];
  } else {
    data = [['Customer Name'], ['Juan Dela Cruz'], ['Maria Santos']];
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, `import-template-${importMode}.xlsx`);
}

function handleImportCustomers(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      
      if (!rows || rows.length < 2) { alert('❌ File seems empty'); e.target.value = ''; return; }
      
      let custs = getData('customers');
      let bills = getData('bills');
      const existing = custs.map(c => c.name.toLowerCase());
      
      let added = 0, skipped = 0, billsAdded = 0;
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        
        const name = String(row[0]).trim();
        if (!name) { skipped++; continue; }
        
        let custId;
        const existIdx = existing.indexOf(name.toLowerCase());
        
        if (existIdx === -1) {
          custId = Date.now() + i;
          custs.push({ id: custId, name, createdAt: new Date().toISOString() });
          existing.push(name.toLowerCase());
          added++;
        } else {
          custId = custs.find(c => c.name.toLowerCase() === name.toLowerCase()).id;
          if (importMode === 'simple') { skipped++; continue; }
        }
        
        if (importMode === 'full' && row.length >= 4) {
          const s = getSettings();
          let date = row[1] ? String(row[1]) : '';
          const prev = parseFloat(row[2]) || 0;
          const pres = parseFloat(row[3]) || 0;
          const used = row[4] !== undefined ? parseFloat(row[4]) : Math.max(0, pres - prev);
          let totalDue = row[5] !== undefined ? parseFloat(row[5]) : Math.max(used * s.pricePerCubic, s.minCharge);
          const amtPaid = parseFloat(row[6]) || 0;
          let status = row[7] ? String(row[7]).toLowerCase() : 'unpaid';
          
          if (!date) date = new Date().toISOString().split('T')[0];
          if (!['paid', 'unpaid', 'partial'].includes(status)) status = 'unpaid';
          totalDue = applyRounding(totalDue);
          
          bills.push({
            id: Date.now() + i + 1000,
            customerId: custId,
            date, prevReading: prev, presReading: pres,
            totalUsed: used, pricePerCubic: s.pricePerCubic,
            totalDue, amountPaid: amtPaid,
            paymentStatus: status,
            paymentDate: status !== 'unpaid' ? new Date(date).toISOString() : '',
            penaltyAmount: 0,
            createdAt: new Date().toISOString()
          });
          billsAdded++;
        }
      }
      
      saveData('customers', custs);
      if (billsAdded > 0) saveData('bills', bills);
      
      loadCustomersList();
      loadCustomerDropdowns();
      
      let msg = `✅ Import Complete!\n\nCustomers added: ${added}\nSkipped (exists/empty): ${skipped}`;
      if (importMode === 'full') msg += `\nBills created: ${billsAdded}`;
      msg += `\nTotal customers now: ${custs.length}`;
      alert(msg);
      
    } catch(err) {
      alert('❌ Error: ' + err.message);
    }
    e.target.value = '';
  };
  r.readAsArrayBuffer(f);
}


// === BILLING LOGIC ===
function loadLastReading() {
  const cid = parseInt(document.getElementById('billCustomer').value);
  if (!cid) { document.getElementById('prevReading').value = 0; return; }
  
  const bl = getData('bills').filter(b => b.customerId === cid);
  if (bl.length > 0) {
    const sorted = bl.sort((a, b) => new Date(b.date) - new Date(a.date));
    document.getElementById('prevReading').value = sorted[0].presReading;
  } else {
    document.getElementById('prevReading').value = 0;
  }
  calculateTotal();
}

function calculateTotal() {
  const s = getSettings();
  const prev = parseFloat(document.getElementById('prevReading').value) || 0;
  const pres = parseFloat(document.getElementById('presReading').value) || 0;
  
  const used = Math.max(0, pres - prev);
  const computed = used * s.pricePerCubic;
  const base = Math.max(computed, s.minCharge);
  
  let penalty = 0;
  const hasPenalty = document.getElementById('applyPenalty').checked;
  if (hasPenalty && s.penaltyRate > 0) {
    penalty = base * (s.penaltyRate / 100);
  }
  
  const total = applyRounding(base + penalty);
  const sym = getCurrencySymbol();
  
  document.getElementById('brkUsed').textContent = used + ' m³';
  document.getElementById('brkRate').textContent = `${sym}${(s.pricePerCubic).toFixed(2)}/m³`;
  document.getElementById('brkComputed').textContent = formatMoney(computed);
  document.getElementById('brkMin').textContent = formatMoney(s.minCharge);
  
  const pRow = document.getElementById('brkPenaltyRow');
  if (hasPenalty && s.penaltyRate > 0) {
    pRow.style.display = 'flex';
    document.getElementById('brkPenaltyRate').textContent = s.penaltyRate;
    document.getElementById('brkPenalty').textContent = formatMoney(penalty);
  } else {
    pRow.style.display = 'none';
  }
  
  document.getElementById('brkTotal').textContent = formatMoney(total);
  document.getElementById('displayTotal').textContent = s.roundOff ? Math.round(total) : total.toFixed(2);
}

function clearBillForm() {
  document.getElementById('billCustomer').value = '';
  document.getElementById('prevReading').value = 0;
  document.getElementById('presReading').value = '';
  document.getElementById('applyPenalty').checked = false;
  document.getElementById('displayTotal').textContent = '0.00';
  document.getElementById('billDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('brkPenaltyRow').style.display = 'none';
  calculateTotal();
}

function saveBill(print) {
  const cid = parseInt(document.getElementById('billCustomer').value);
  if (!cid) return alert('Select a customer');
  
  const pres = parseFloat(document.getElementById('presReading').value);
  if (isNaN(pres)) return alert('Enter a valid present reading');
  
  const s = getSettings();
  const prev = parseFloat(document.getElementById('prevReading').value) || 0;
  const used = Math.max(0, pres - prev);
  const computed = used * s.pricePerCubic;
  const base = Math.max(computed, s.minCharge);
  
  let penalty = 0;
  const hasPenalty = document.getElementById('applyPenalty').checked;
  if (hasPenalty && s.penaltyRate > 0) penalty = base * (s.penaltyRate / 100);
  
  const total = applyRounding(base + penalty);
  
  const bill = {
    id: Date.now(),
    customerId: cid,
    date: document.getElementById('billDate').value,
    prevReading: prev,
    presReading: pres,
    totalUsed: used,
    pricePerCubic: s.pricePerCubic,
    totalDue: total,
    amountPaid: 0,
    paymentStatus: 'unpaid',
    paymentDate: '',
    penaltyAmount: penalty,
    penaltyRate: hasPenalty ? s.penaltyRate : 0,
    createdAt: new Date().toISOString()
  };
  
  const bl = getData('bills');
  bl.push(bill);
  saveData('bills', bl);
  
  if (print) printBill(bill);
  else alert('✅ Bill Saved!');
  
  clearBillForm();
}


// === PAYMENTS & HISTORY ===
function markAsPaid(id) {
  const bl = getData('bills');
  const b = bl.find(x => x.id === id);
  if (!b) return;
  b.paymentStatus = 'paid';
  b.amountPaid = b.totalDue;
  b.paymentDate = new Date().toISOString();
  saveData('bills', bl);
  loadFilteredHistory();
}

function markAsPartial(id) {
  showPromptModal('Amount paid:', false).then(v => {
    if (!v) return;
    const a = parseFloat(v);
    if (isNaN(a) || a <= 0) return alert('Invalid amount');
    
    const bl = getData('bills');
    const b = bl.find(x => x.id === id);
    if (!b) return;
    
    b.amountPaid = (b.amountPaid || 0) + a;
    if (b.amountPaid >= b.totalDue) {
      b.paymentStatus = 'paid';
      b.amountPaid = b.totalDue;
    } else {
      b.paymentStatus = 'partial';
    }
    b.paymentDate = new Date().toISOString();
    saveData('bills', bl);
    loadFilteredHistory();
  });
}

function markAsUnpaid(id) {
  const bl = getData('bills');
  const b = bl.find(x => x.id === id);
  if (!b) return;
  b.paymentStatus = 'unpaid';
  b.amountPaid = 0;
  b.paymentDate = '';
  saveData('bills', bl);
  loadFilteredHistory();
}

function loadFilteredHistory(sb = 'date', order = 'desc') {
  let bl = getData('bills');
  const cs = getData('customers');
  
  const cFilt = document.getElementById('historyFilter').value;
  if (cFilt !== 'all') bl = bl.filter(b => b.customerId === parseInt(cFilt));
  
  const pFilt = document.getElementById('historyPaymentFilter').value;
  if (pFilt !== 'all') bl = bl.filter(b => (b.paymentStatus || 'unpaid') === pFilt);
  
  const el = document.getElementById('historySearch');
  const term = el ? el.value.toLowerCase() : '';
  if (term) {
    bl = bl.filter(b => {
      const c = cs.find(x => x.id === b.customerId);
      const nameMatch = c ? c.name.toLowerCase().includes(term) : false;
      const dateMatch = new Date(b.date).toLocaleDateString().toLowerCase().includes(term);
      return nameMatch || dateMatch;
    });
  }
  
  bl.sort((a, b) => {
    if (sb === 'date') {
      return order === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
    }
    return order === 'asc' ? a.totalDue - b.totalDue : b.totalDue - a.totalDue;
  });
  
  lastFilteredBills = bl;
  
  let td = 0, tp = 0, uc = 0;
  bl.forEach(b => {
    td += b.totalDue;
    tp += (b.amountPaid || 0);
    if ((b.paymentStatus || 'unpaid') !== 'paid') uc++;
  });
  
  document.getElementById('historySummary').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
      <div style="padding:8px;background:rgba(0,123,255,.08);border-radius:6px">
        <div style="font-size:11px;color:var(--text-muted)">Due</div>
        <div style="font-weight:700">${formatMoney(td)}</div>
      </div>
      <div style="padding:8px;background:rgba(40,167,69,.08);border-radius:6px">
        <div style="font-size:11px;color:var(--text-muted)">Collected</div>
        <div style="font-weight:700;color:#28a745">${formatMoney(tp)}</div>
      </div>
      <div style="padding:8px;background:rgba(220,53,69,.08);border-radius:6px">
        <div style="font-size:11px;color:var(--text-muted)">Outstanding</div>
        <div style="font-weight:700;color:#dc3545">${formatMoney(td - tp)}</div>
      </div>
    </div>`;
    
  const ct = document.getElementById('historyList');
  if (!bl.length) { ct.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted)">No bills.</p>'; return; }
  
  ct.innerHTML = bl.map(b => {
    const c = cs.find(x => x.id === b.customerId);
    const s = b.paymentStatus || 'unpaid';
    
    let badge = '', pb = '';
    if (s === 'paid') badge = '<span class="payment-badge paid">✅ Paid</span>';
    else if (s === 'partial') badge = `<span class="payment-badge partial">⚠ ${formatMoney(b.amountPaid || 0)}</span>`;
    else badge = '<span class="payment-badge unpaid">❌ Unpaid</span>';
    
    if (s === 'unpaid') {
      pb = `<button onclick="markAsPaid(${b.id})" style="padding:6px;font-size:11px;flex:1;background:var(--bg-success)">✅</button>
            <button onclick="markAsPartial(${b.id})" style="padding:6px;font-size:11px;flex:1;background:var(--bg-warning);color:#333">⚠</button>`;
    } else if (s === 'partial') {
      pb = `<button onclick="markAsPaid(${b.id})" style="padding:6px;font-size:11px;flex:1;background:var(--bg-success)">✅</button>
            <button onclick="markAsPartial(${b.id})" style="padding:6px;font-size:11px;flex:1;background:var(--bg-warning);color:#333">➕</button>`;
    } else {
      pb = `<button onclick="markAsUnpaid(${b.id})" style="padding:6px;font-size:11px;flex:1;background:#6c757d">↩</button>`;
    }
    
    const borderCol = s === 'paid' ? '#28a745' : (s === 'partial' ? '#ffc107' : '#dc3545');
    
    return `
    <div style="padding:12px;border:1px solid var(--bg-card-border);margin:8px 0;border-radius:8px;background:var(--bg-container);border-left:4px solid ${borderCol}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" class="history-cb" value="${b.id}">
          <strong style="font-size:14px">${c ? c.name : '?'}</strong>
        </div>
        ${badge}
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin:4px 0">
        ${new Date(b.date).toLocaleDateString()} • ${b.prevReading}→${b.presReading} = ${b.totalUsed} m³
      </div>
      <strong>${formatMoney(b.totalDue)}</strong>
      ${b.penaltyAmount > 0 ? ` <small style="color:#dc3545">(+${formatMoney(b.penaltyAmount)} penalty)</small>` : ''}
      <div style="margin-top:8px;display:flex;gap:5px;">
        ${pb}
        <button onclick="printBillById(${b.id})" style="padding:6px;font-size:11px;flex:1;">🖨</button>
        <button onclick="deleteBill(${b.id})" style="padding:6px;font-size:11px;background:var(--bg-danger);flex:1;">🗑</button>
      </div>
    </div>`;
  }).join('');
  
  const sah = document.getElementById('selectAllHistory');
  if (sah) sah.checked = false;
}

function sortHistory(b, o) { loadFilteredHistory(b, o); }
function filterHistory() { loadFilteredHistory(); }

function deleteBill(id) {
  if (!confirm('Delete this bill?')) return;
  saveData('bills', getData('bills').filter(b => b.id !== id));
  loadFilteredHistory();
}

function printBillById(id) {
  const b = getData('bills').find(x => x.id === id);
  if (b) printBill(b);
}

function toggleSelectAllHistory() {
  const chk = document.getElementById('selectAllHistory').checked;
  document.querySelectorAll('.history-cb').forEach(cb => cb.checked = chk);
}

function getSelectedHistoryIds() {
  return Array.from(document.querySelectorAll('.history-cb:checked')).map(cb => parseInt(cb.value));
}

function bulkMarkHistory(status) {
  const ids = getSelectedHistoryIds();
  if (!ids.length) return alert('No bills selected.');
  if (!confirm(`Mark ${ids.length} selected bills as ${status}?`)) return;
  
  const bl = getData('bills');
  bl.forEach(b => {
    if (ids.includes(b.id)) {
      b.paymentStatus = status;
      if (status === 'paid') { b.amountPaid = b.totalDue; b.paymentDate = new Date().toISOString(); }
      else if (status === 'unpaid') { b.amountPaid = 0; b.paymentDate = ''; }
    }
  });
  saveData('bills', bl);
  loadFilteredHistory();
}

function bulkDeleteHistory() {
  const ids = getSelectedHistoryIds();
  if (!ids.length) return alert('No bills selected.');
  if (!confirm(`Delete ${ids.length} selected bills?`)) return;
  
  saveData('bills', getData('bills').filter(b => !ids.includes(b.id)));
  alert(`✅ Deleted ${ids.length} bills.`);
  loadFilteredHistory();
}

function bulkPrintHistory() {
  const ids = getSelectedHistoryIds();
  if (!ids.length) return alert('No bills selected.');
  
  const blToPrint = lastFilteredBills.filter(b => ids.includes(b.id));
  const cs = getData('customers');
  const cf = getCurrencyFormatter();
  let ts = 0, tc = 0;
  
  const rows = blToPrint.map((b, i) => {
    const c = cs.find(x => x.id === b.customerId);
    ts += b.totalDue;
    tc += (b.amountPaid || 0);
    const s = b.paymentStatus || 'unpaid';
    return `
      <tr style="${i % 2 === 0 ? 'background:#f8f8f8' : ''}">
        <td style="padding:4px;font-size:11px;border:none">${i + 1}</td>
        <td style="padding:4px;font-size:11px;border:none">${c ? c.name : '?'}</td>
        <td style="padding:4px;font-size:11px;border:none">${new Date(b.date).toLocaleDateString()}</td>
        <td style="padding:4px;font-size:11px;text-align:right;border:none">${b.totalUsed}</td>
        <td style="padding:4px;font-size:11px;text-align:right;border:none">${cf.format(b.totalDue)}</td>
        <td style="padding:4px;font-size:11px;text-align:center;border:none">${s === 'paid' ? '✅' : (s === 'partial' ? '⚠' : '❌')}</td>
      </tr>`;
  }).join('');
  
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;padding:12px;width:80mm;color:#222">
      ${buildReceiptHeader()}
      <div style="text-align:center;margin:10px 0;padding:6px;background:#f0f0f0;border-radius:4px;font-size:14px;font-weight:700;text-transform:uppercase">Report</div>
      <table style="width:100%;border-collapse:collapse;border:none;margin:8px 0">
        <thead>
          <tr style="background:#333;color:#fff">
            <th style="padding:4px;font-size:10px;border:none">#</th>
            <th style="padding:4px;font-size:10px;border:none">Name</th>
            <th style="padding:4px;font-size:10px;border:none">Date</th>
            <th style="padding:4px;font-size:10px;text-align:right;border:none">m³</th>
            <th style="padding:4px;font-size:10px;text-align:right;border:none">Due</th>
            <th style="padding:4px;font-size:10px;border:none">St</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin:10px 0;padding:10px;background:#1a1a1a;color:#fff;border-radius:6px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>Billed:</span><strong>${cf.format(ts)}</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>Collected:</span><strong style="color:#28a745">${cf.format(tc)}</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900"><span>Outstanding:</span><span style="color:#ff6b6b">${cf.format(ts - tc)}</span></div>
      </div>
    </div>`;
    
  const printEl = document.getElementById('printReceipt');
  printEl.innerHTML = html;
  window.print();
  printEl.innerHTML = '';
}


// === ANALYSIS & CHARTS ===
function setAnalysisPeriod(p, btn) {
  analysisPeriod = p;
  document.querySelectorAll('#periodTabs button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAnalysis();
}

function changeAnalysisPeriod(d) {
  if (analysisPeriod === 'monthly') {
    analysisMonth += d;
    if (analysisMonth > 11) { analysisMonth = 0; analysisYear++; }
    if (analysisMonth < 0) { analysisMonth = 11; analysisYear--; }
  } else if (analysisPeriod === 'quarterly') {
    analysisQuarter += d;
    if (analysisQuarter > 3) { analysisQuarter = 0; analysisYear++; }
    if (analysisQuarter < 0) { analysisQuarter = 3; analysisYear--; }
  } else if (analysisPeriod === 'semiannual') {
    analysisSemiAnnual += d;
    if (analysisSemiAnnual > 1) { analysisSemiAnnual = 0; analysisYear++; }
    if (analysisSemiAnnual < 0) { analysisSemiAnnual = 1; analysisYear--; }
  } else {
    analysisYear += d;
  }
  renderAnalysis();
}

function getAnalysisFilter() {
  let startMonth, endMonth;
  if (analysisPeriod === 'monthly') {
    startMonth = analysisMonth; endMonth = analysisMonth;
  } else if (analysisPeriod === 'quarterly') {
    startMonth = analysisQuarter * 3; endMonth = startMonth + 2;
  } else if (analysisPeriod === 'semiannual') {
    startMonth = analysisSemiAnnual * 6; endMonth = startMonth + 5;
  } else {
    startMonth = 0; endMonth = 11;
  }
  return { startMonth, endMonth, year: analysisYear };
}

function getAnalysisPeriodLabel() {
  if (analysisPeriod === 'monthly') return new Date(analysisYear, analysisMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  if (analysisPeriod === 'quarterly') return `Q${analysisQuarter + 1} ${analysisYear}`;
  if (analysisPeriod === 'semiannual') return `${analysisSemiAnnual === 0 ? '1st Half' : '2nd Half'} ${analysisYear}`;
  return `Year ${analysisYear}`;
}

function renderAnalysis() {
  const bills = getData('bills');
  const custs = getData('customers');
  const af = getAnalysisFilter();
  
  document.getElementById('analysisPeriodLabel').textContent = getAnalysisPeriodLabel();
  
  const filtered = bills.filter(b => {
    const d = new Date(b.date);
    return d.getFullYear() === af.year && d.getMonth() >= af.startMonth && d.getMonth() <= af.endMonth;
  });
  
  let tr = 0, tc = 0, tu = 0, pc = 0, uc = 0, prc = 0;
  filtered.forEach(b => {
    tr += b.totalDue;
    tc += (b.amountPaid || 0);
    tu += b.totalUsed;
    const s = b.paymentStatus || 'unpaid';
    if (s === 'paid') pc++;
    else if (s === 'partial') prc++;
    else uc++;
  });
  
  const cr = tr > 0 ? Math.round((tc / tr) * 100) : 0;
  
  document.getElementById('analysisStats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${formatMoney(tr)}</div><div class="stat-label">Billed</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#28a745">${formatMoney(tc)}</div><div class="stat-label">Collected</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#dc3545">${formatMoney(tr - tc)}</div><div class="stat-label">Outstanding</div></div>
    <div class="stat-card"><div class="stat-value">${filtered.length}</div><div class="stat-label">Bills</div></div>
    <div class="stat-card"><div class="stat-value">${tu.toFixed(1)}</div><div class="stat-label">m³ Used</div></div>
    <div class="stat-card"><div class="stat-value" style="color:${cr >= 80 ? '#28a745' : (cr >= 50 ? '#ffc107' : '#dc3545')}">${cr}%</div><div class="stat-label">Collection</div></div>
  `;
  
  let chartData = {}, chartLabels = [];
  if (analysisPeriod === 'monthly') {
    const dim = new Date(af.year, af.endMonth + 1, 0).getDate();
    for (let i = 1; i <= dim; i++) { chartData[i] = 0; chartLabels.push(String(i)); }
    filtered.forEach(b => chartData[new Date(b.date).getDate()] += b.totalDue);
  } else {
    const mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = af.startMonth; m <= af.endMonth; m++) { chartData[m] = 0; chartLabels.push(mn[m]); }
    filtered.forEach(b => chartData[new Date(b.date).getMonth()] += b.totalDue);
  }
  
  const vals = Object.values(chartData);
  const mx = Math.max(...vals) || 1;
  let ch = '';
  
  Object.keys(chartData).forEach((k, i) => {
    const v = chartData[k];
    const h = v > 0 ? Math.max(6, (v / mx) * 120) : 0;
    ch += `
      <div class="chart-bar-wrapper">
        ${v > 0 ? `<div class="chart-bar-value">${formatMoney(v)}</div>` : ''}
        <div class="chart-bar" style="height:${h}px;background:${v > 0 ? 'var(--bg-accent)' : 'var(--bg-card-border)'}" title="${chartLabels[i]}: ${formatMoney(v)}"></div>
        <div class="chart-bar-label">${chartLabels[i]}</div>
      </div>`;
  });
  document.getElementById('chartBars').innerHTML = ch;
  
  const cd = {};
  filtered.forEach(b => {
    if (!cd[b.customerId]) cd[b.customerId] = { name: '', due: 0, paid: 0, usage: 0, count: 0, penalty: 0 };
    const c = custs.find(x => x.id === b.customerId);
    const obj = cd[b.customerId];
    obj.name = c ? c.name : '?';
    obj.due += b.totalDue;
    obj.paid += (b.amountPaid || 0);
    obj.usage += b.totalUsed;
    obj.count++;
    obj.penalty += (b.penaltyAmount || 0);
  });
  
  const ca = Object.values(cd).sort((a, b) => b.due - a.due);
  let bh = '<h3>Breakdown</h3>';
  
  if (!ca.length) {
    bh += '<p style="text-align:center;color:var(--text-muted);padding:15px">No data</p>';
  } else {
    bh += `<table><thead><tr><th>Customer</th><th>Bills</th><th>m³</th><th>Due</th><th>Paid</th></tr></thead><tbody>`;
    ca.forEach(x => {
      bh += `<tr><td>${x.name}</td><td>${x.count}</td><td>${x.usage.toFixed(1)}</td><td>${formatMoney(x.due)}</td><td>${formatMoney(x.paid)}</td></tr>`;
    });
    bh += `</tbody></table>`;
  }
  document.getElementById('analysisCustomerBreakdown').innerHTML = bh;
  
  document.getElementById('analysisPaymentSummary').innerHTML = `
    <h3>Payment</h3>
    <div class="analysis-summary">
      <div><div class="label">✅ Paid</div><div class="value">${pc}</div></div>
      <div><div class="label">⚠ Partial</div><div class="value">${prc}</div></div>
      <div><div class="label">❌ Unpaid</div><div class="value">${uc}</div></div>
      <div><div class="label">Rate</div><div class="value">${cr}%</div></div>
    </div>`;
    
  renderYearlyChart(bills);
}

function renderYearlyChart(all) {
  const mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mt = [];
  
  for (let m = 0; m < 12; m++) {
    const mb = all.filter(b => { const d = new Date(b.date); return d.getFullYear() === analysisYear && d.getMonth() === m; });
    let r = 0;
    mb.forEach(b => r += b.totalDue);
    mt.push({ m: mn[m], r });
  }
  
  const mx = Math.max(...mt.map(x => x.r)) || 1;
  const af = getAnalysisFilter();
  let h = '';
  
  mt.forEach((x, i) => {
    const ht = x.r > 0 ? Math.max(6, (x.r / mx) * 120) : 0;
    const isAct = i >= af.startMonth && i <= af.endMonth;
    h += `
      <div class="chart-bar-wrapper" onclick="analysisMonth=${i};analysisPeriod='monthly';document.querySelectorAll('#periodTabs button').forEach(b=>b.classList.remove('active'));document.querySelector('#periodTabs button').classList.add('active');renderAnalysis()" style="cursor:pointer">
        ${x.r > 0 ? `<div class="chart-bar-value">${formatMoney(x.r)}</div>` : ''}
        <div class="chart-bar" style="height:${ht}px;background:${isAct ? 'var(--bg-accent)' : 'rgba(0,123,255,.25)'}"></div>
        <div class="chart-bar-label" style="${isAct ? 'font-weight:700;color:var(--bg-accent)' : ''}">${x.m}</div>
      </div>`;
  });
  document.getElementById('yearlyChartBars').innerHTML = h;
}


// === EXPORT & BALANCE SHEET MISSING FUNCS ===

function showExportOptions() { document.getElementById('exportModal').style.display = 'flex'; }
function closeExportModal() { document.getElementById('exportModal').style.display = 'none'; }

function exportByPeriod(period) {
  let bills = getData('bills');
  const custs = getData('customers');
  
  if (period !== 'all') {
    const now = new Date();
    bills = bills.filter(b => {
      const d = new Date(b.date);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
      if (period === 'semi') return (d.getMonth() < 6 ? 0 : 1) === (now.getMonth() < 6 ? 0 : 1) && d.getFullYear() === now.getFullYear();
      if (period === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }
  
  if (!bills.length) return alert('No data to export for this period.');
  
  const sym = getCurrencySymbol();
  const data = [['Customer', 'Date', 'm³', `Due (${sym})`, `Paid (${sym})`, 'Penalty', 'Status']];
  
  let tr = 0, tc = 0;
  bills.forEach(b => {
    const c = custs.find(x => x.id === b.customerId);
    tr += b.totalDue;
    tc += (b.amountPaid || 0);
    data.push([
      c ? c.name : '?', b.date, b.totalUsed, b.totalDue, b.amountPaid || 0, b.penaltyAmount || 0, b.paymentStatus || 'unpaid'
    ]);
  });
  
  data.push(['', 'TOTAL', '', tr, tc, '', Math.round(tc / tr * 100) + '%']);
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Exports');
  XLSX.writeFile(wb, `water-export-${period}-${new Date().toISOString().split('T')[0]}.xlsx`);
  closeExportModal();
}

function exportAnalysisToExcel() {
  const bills = getData('bills');
  const custs = getData('customers');
  const af = getAnalysisFilter();
  
  const fb = bills.filter(b => {
    const d = new Date(b.date);
    return d.getFullYear() === af.year && d.getMonth() >= af.startMonth && d.getMonth() <= af.endMonth;
  });
  
  if (!fb.length) return alert('No data in this period.');
  
  const sym = getCurrencySymbol();
  const label = getAnalysisPeriodLabel();
  const data = [
    [`Analysis: ${label}`], [''],
    ['Customer', 'Date', 'm³', `Due (${sym})`, `Paid (${sym})`, 'Penalty', 'Status']
  ];
  
  let tr = 0, tc = 0;
  fb.forEach(b => {
    const c = custs.find(x => x.id === b.customerId);
    tr += b.totalDue;
    tc += (b.amountPaid || 0);
    data.push([c ? c.name : '?', b.date, b.totalUsed, b.totalDue, b.amountPaid || 0, b.penaltyAmount || 0, b.paymentStatus || 'unpaid']);
  });
  data.push(['', 'TOTAL', '', tr, tc, '', Math.round((tc / tr) * 100) + '%']);
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analysis');
  XLSX.writeFile(wb, `analysis-${label.replace(/\s/g, '-')}.xlsx`);
}

// Balance Sheet logic
let currentBsTab = 'bs';
function setBsPeriod(tab, btn) {
  currentBsTab = tab;
  document.querySelectorAll('#bsPeriodTabs button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('bsTab').style.display = tab === 'bs' ? 'block' : 'none';
  document.getElementById('isTab').style.display = tab === 'is' ? 'block' : 'none';
  renderFinance();
}

function getFinance() {
  const f = getData('finance');
  if (!f || Array.isArray(f)) return { assets: [], liabilities: [], equity: [], income: [], expenses: [] };
  return f;
}

function addBsEntry(type) {
  const capType = type.charAt(0).toUpperCase() + type.slice(1);
  const nameInp = document.getElementById(`bs${capType}Name`);
  const amtInp = document.getElementById(`bs${capType}Amount`);
  
  const name = nameInp.value.trim();
  const amount = parseFloat(amtInp.value);
  if (!name || isNaN(amount)) return alert('Enter valid name and amount');
  
  const f = getFinance();
  if (!f[type + 's']) f[type + 's'] = [];
  f[type + 's'].push({ id: Date.now(), name, amount });
  saveData('finance', f);
  
  nameInp.value = '';
  amtInp.value = '';
  renderFinance();
}

function addIsEntry(type) {
  const capType = type.charAt(0).toUpperCase() + type.slice(1);
  const nameInp = document.getElementById(`is${capType}Name`);
  const amtInp = document.getElementById(`is${capType}Amount`);
  
  const name = nameInp.value.trim();
  const amount = parseFloat(amtInp.value);
  if (!name || isNaN(amount)) return alert('Enter valid name and amount');
  
  const key = type === 'income' ? 'income' : 'expenses';
  const f = getFinance();
  if (!f[key]) f[key] = [];
  f[key].push({ id: Date.now(), name, amount });
  saveData('finance', f);
  
  nameInp.value = '';
  amtInp.value = '';
  renderFinance();
}

function deleteFinanceEntry(cat, id) {
  const f = getFinance();
  if (f[cat]) f[cat] = f[cat].filter(x => x.id !== id);
  saveData('finance', f);
  renderFinance();
}

function renderFinance() {
  const f = getFinance();
  const cf = getCurrencyFormatter();
  
  const renderList = (cat, elId) => {
    const list = f[cat] || [];
    let html = list.map(x => `<div style="display:flex;justify-content:space-between;padding:4px;border-bottom:1px solid #eee;font-size:13px"><span>${x.name}</span><span>${cf.format(x.amount)} <span style="cursor:pointer;color:red;margin-left:8px" onclick="deleteFinanceEntry('${cat}', ${x.id})">✕</span></span></div>`).join('');
    document.getElementById(elId).innerHTML = html || '<div style="font-size:12px;color:#aaa">No entries</div>';
    return list.reduce((sum, x) => sum + x.amount, 0);
  };
  
  if (currentBsTab === 'bs') {
    const a = renderList('assets', 'bsAssetsList');
    const l = renderList('liabilities', 'bsLiabilitiesList');
    const e = renderList('equity', 'bsEquityList');
    document.getElementById('bsSummary').innerHTML = `<div style="font-weight:bold;margin-top:10px">Total Assets: ${cf.format(a)}<br>Total Liabilities & Equity: ${cf.format(l + e)}</div>`;
  } else {
    const i = renderList('income', 'isIncomeList');
    const e = renderList('expenses', 'isExpensesList');
    document.getElementById('isSummary').innerHTML = `<div style="font-weight:bold;margin-top:10px;color:${i - e >= 0 ? '#28a745' : '#dc3545'}">Net Income: ${cf.format(i - e)}</div>`;
  }
}

function exportBalanceSheet() {
  const f = getFinance();
  const data = [['Type', 'Name', 'Amount']];
  
  ['assets', 'liabilities', 'equity', 'income', 'expenses'].forEach(cat => {
    (f[cat] || []).forEach(item => {
      data.push([cat.toUpperCase(), item.name, item.amount]);
    });
  });
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Finance');
  XLSX.writeFile(wb, `finance-${new Date().toISOString().split('T')[0]}.xlsx`);
}


// === RECEIPTS / PRINT ===
function buildReceiptHeader() {
  const c = getCustomization();
  const im = getImages();
  let h = '';
  if (im.companyLogo) h += `<div style="text-align:center;margin-bottom:8px"><img src="${im.companyLogo}" style="max-width:80px;max-height:80px;border-radius:8px"></div>`;
  h += `<div style="text-align:center;font-size:18px;font-weight:900;margin-bottom:2px">${c.companyName || 'WATER BILL'}</div>`;
  if (c.companyAddress) h += `<div style="text-align:center;font-size:11px;color:#555">${c.companyAddress}</div>`;
  const ct = [c.companyPhone, c.companyEmail].filter(Boolean).join(' • ');
  if (ct) h += `<div style="text-align:center;font-size:10px;color:#666">${ct}</div>`;
  return h;
}

function printBill(bill) {
  const cs = getData('customers');
  const c = cs.find(x => x.id === bill.customerId);
  const cn = c ? c.name : '?';
  const s = getSettings();
  const cf = getCurrencyFormatter();
  const st = bill.paymentStatus || 'unpaid';
  const stC = st === 'paid' ? '#28a745' : (st === 'partial' ? '#ffc107' : '#dc3545');
  
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;padding:12px;width:80mm;color:#222">
      ${buildReceiptHeader()}
      <div style="text-align:center;margin:8px 0;padding:6px;background:#f0f0f0;border-radius:4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px">Official Billing</div>
      
      <hr style="border:none;border-top:1px solid #ddd;margin:8px 0">
      <table style="width:100%;font-size:12px;border-collapse:collapse;border:none">
        <tr><td style="padding:3px 0;color:#666;border:none">Customer</td><td style="text-align:right;font-weight:700;border:none">${cn}</td></tr>
        <tr><td style="padding:3px 0;color:#666;border:none">Date</td><td style="text-align:right;border:none">${new Date(bill.date).toLocaleDateString()}</td></tr>
      </table>
      
      <hr style="border:none;border-top:1px solid #ddd;margin:8px 0">
      <table style="width:100%;font-size:12px;border-collapse:collapse;border:none">
        <tr style="background:#f8f8f8"><td style="padding:5px 8px;border:none">Previous</td><td style="text-align:right;font-weight:600;border:none">${bill.prevReading} m³</td></tr>
        <tr><td style="padding:5px 8px;border:none">Present</td><td style="text-align:right;font-weight:600;border:none">${bill.presReading} m³</td></tr>
        <tr style="background:#f8f8f8"><td style="padding:5px 8px;font-weight:700;border:none">Used</td><td style="text-align:right;font-weight:700;border:none">${bill.totalUsed} m³</td></tr>
      </table>
      
      <hr style="border:none;border-top:1px solid #ddd;margin:8px 0">
      <table style="width:100%;font-size:12px;border-collapse:collapse;border:none">
        <tr><td style="padding:4px 0;color:#555;border:none">Rate/m³</td><td style="text-align:right;border:none">${cf.format(s.pricePerCubic)}</td></tr>
        <tr><td style="padding:4px 0;color:#555;border:none">Computed</td><td style="text-align:right;border:none">${cf.format(bill.totalUsed * s.pricePerCubic)}</td></tr>
        <tr><td style="padding:4px 0;color:#555;border:none">Min Charge</td><td style="text-align:right;border:none">${cf.format(s.minCharge)}</td></tr>
        ${bill.penaltyAmount > 0 ? `<tr><td style="padding:4px 0;color:#dc3545;border:none">Penalty (${bill.penaltyRate || 0}%)</td><td style="text-align:right;color:#dc3545;border:none">${cf.format(bill.penaltyAmount)}</td></tr>` : ''}
      </table>
      
      <div style="margin:12px 0;padding:12px;background:#1a1a1a;color:#fff;border-radius:6px;text-align:center">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:.7;margin-bottom:4px">Total Due</div>
        <div style="font-size:22px;font-weight:900">${cf.format(bill.totalDue)}</div>
      </div>
      
      ${st !== 'unpaid' ? `
        <div style="text-align:center;padding:8px;border:2px solid ${stC};border-radius:6px;margin:8px 0">
          <div style="font-size:11px;color:#666">Paid</div>
          <div style="font-size:16px;font-weight:700;color:${stC}">${cf.format(bill.amountPaid || 0)}</div>
          ${st === 'partial' ? `<div style="font-size:11px;color:#dc3545">Remaining: ${cf.format(bill.totalDue - (bill.amountPaid || 0))}</div>` : ''}
        </div>` : ''}
      
      <hr style="border:none;border-top:1px dashed #ccc;margin:8px 0">
      <div style="text-align:center;font-size:10px;color:#999;line-height:1.6">Thank you!<br>${new Date().toLocaleString()}</div>
    </div>`;
    
  document.getElementById('printReceipt').innerHTML = html;
  window.print();
  document.getElementById('printReceipt').innerHTML = '';
}


// === TIMER WIDGET ===
function initTimer() {
  const d = document.getElementById('timerDisplay');
  const t = document.getElementById('timerToggle');
  if (!timerVisible) {
    d.classList.add('hidden');
    t.textContent = '⏱';
  } else {
    d.classList.remove('hidden');
    t.textContent = '✕';
  }
  
  t.addEventListener('click', () => {
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
  
  updateTimerDisplay();
  setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timerCountdown');
  const sub = document.getElementById('timerSubtext');
  const tp = localStorage.getItem(TEMP_PASSWORD_KEY);
  const ex = parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY) || '0');
  
  if (!tp || !ex) {
    el.textContent = 'No temp password';
    el.className = 'timer-countdown inactive';
    sub.textContent = '';
    return;
  }
  
  const now = getCurrentTimeSync();
  if (now === null) {
    el.textContent = 'Sync required';
    el.className = 'timer-countdown inactive';
    sub.textContent = 'Connect to internet';
    return;
  }
  
  const rem = ex - now;
  if (rem <= 0) {
    el.textContent = 'EXPIRED';
    el.className = 'timer-countdown critical';
    sub.textContent = '';
    localStorage.removeItem(TEMP_PASSWORD_KEY);
    localStorage.removeItem(TEMP_PASSWORD_EXPIRY_KEY);
    scheduleSync();
    return;
  }
  
  const d = Math.floor(rem / 864e5);
  const h = Math.floor((rem % 864e5) / 36e5);
  const m = Math.floor((rem % 36e5) / 6e4);
  const s = Math.floor((rem % 6e4) / 1e3);
  const pad = n => String(n).padStart(2, '0');
  
  el.textContent = `${pad(d)}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  el.className = 'timer-countdown ' + (d >= 7 ? 'active' : d >= 3 ? 'warning' : 'critical');
  
  const sa = Date.now() - parseInt(localStorage.getItem(TIME_SYNC_DEVICE_KEY) || '0');
  sub.textContent = sa < 36e5 ? 'Synced' : `${Math.floor(sa / 36e5)}h ago`;
}


// === EVENT LISTENERS ===
document.addEventListener('DOMContentLoaded', () => {
  
  // Login & Password toggles
  document.getElementById('toggleLoginPassword').addEventListener('click', function() {
    const p = document.getElementById('loginPassword');
    p.type = p.type === 'password' ? 'text' : 'password';
    this.textContent = p.type === 'password' ? '👁' : '🔒';
  });
  
  document.getElementById('eyeIcon').addEventListener('click', function() {
    const p = document.getElementById('adminPassword');
    p.type = p.type === 'password' ? 'text' : 'password';
    this.textContent = p.type === 'password' ? '👁' : '🔒';
  });
  
  document.getElementById('eyeIconMaster').addEventListener('click', function() {
    const p = document.getElementById('masterPassword');
    p.type = p.type === 'password' ? 'text' : 'password';
    this.textContent = p.type === 'password' ? '👁' : '🔒';
  });
  
  document.getElementById('loginBtn').addEventListener('click', () => {
    const pw = document.getElementById('loginPassword').value.trim();
    if (!pw) return;
    const msg = document.getElementById('loginMessage');
    msg.textContent = '⏳ Verifying...';
    msg.style.color = '#666';
    
    checkLogin(pw).then(r => {
      if (r === true) { hideLoginModal(); }
      else if (r && r.valid) { hideLoginModal(); alert(`✅ Temp access (${r.daysLeft}d left)`); }
      else if (r === 'tampered') { msg.style.color = 'red'; msg.textContent = '⚠ Clock tampered'; }
      else if (r === 'no-sync') { msg.style.color = 'orange'; msg.textContent = '⚠ Use admin/master pw'; }
      else if (r === 'expired') { msg.style.color = 'red'; msg.textContent = '⏰ Expired'; document.getElementById('loginPassword').value = ''; updateTimerDisplay(); }
      else { msg.style.color = 'red'; msg.textContent = '❌ Wrong password'; document.getElementById('loginPassword').value = ''; document.getElementById('loginPassword').focus(); }
    });
  });
  
  document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginBtn').click(); });
  document.getElementById('adminPassword').addEventListener('keydown', e => { if (e.key === 'Enter') saveSettings(); });
  document.getElementById('masterPassword').addEventListener('keydown', e => { if (e.key === 'Enter') confirmMasterPassword(); });
  document.getElementById('newCustomerName').addEventListener('keydown', e => { if (e.key === 'Enter') addCustomer(); });
  
  ['customerSearch', 'billCustomerSearch', 'historySearch'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  });
  
  window.addEventListener('online', () => { isOnline = true; updateSyncIndicator('syncing', 'Reconnected...'); pushToCloud(); });
  window.addEventListener('offline', () => { isOnline = false; updateSyncIndicator('offline', 'Offline'); });
  
  // Scroll to top
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const btn = document.getElementById('scrollTopBtn');
    if (btn) {
      if (scrollTop > 200) btn.classList.add('visible');
      else btn.classList.remove('visible');
    }
  }, { passive: true });
  
  
  // INIT EXECUTION
  // Clean up legacy custom images schema
  (function() {
    const c = getCustomization();
    const im = getImages();
    let ch = false;
    if (c.companyLogo && !im.companyLogo) { im.companyLogo = c.companyLogo; ch = true; }
    if (c.backgroundImage && !im.backgroundImage) { im.backgroundImage = c.backgroundImage; ch = true; }
    if (ch) {
      saveImages(im);
      delete c.companyLogo;
      delete c.backgroundImage;
      localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(c));
    }
  })();
  
  // Clean up bills without penalty fields
  (function() {
    const bl = getData('bills');
    let ch = false;
    bl.forEach(b => {
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
  
  updateDevModeUI();
  showLoginModal();
  document.getElementById('billDate').value = new Date().toISOString().split('T')[0];
  
  pullFromCloud().then(success => {
    loadCustomerDropdowns();
    updateCurrencyDisplay();
    applyVisuals();
    showSection('menuSection');
    initTimer();
    updateMenuBadges();
    renderFinance(); // Load balance sheet init
    
    if (!success && !getData('customers').length) {
      updateSyncIndicator('synced', 'Ready');
    }
    
    backgroundTimeSync();
    setInterval(backgroundTimeSync, 3e5); // 5 mins
    setInterval(() => { if (navigator.onLine && !isSyncing && pendingSync) pushToCloud(); }, SYNC_INTERVAL);
    
    setInterval(() => {
      if (!isSyncing) {
        const ls = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0');
        if (ls) {
          const a = Date.now() - ls;
          updateSyncIndicator('synced', a < 60000 ? 'Synced just now' : (a < 3600000 ? `Synced ${Math.floor(a/60000)}m ago` : `Synced ${Math.floor(a/3600000)}h ago`));
        }
      }
    }, 30000); // UI update every 30s
  });
  
});
