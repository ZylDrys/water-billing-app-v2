// ============================================
// CUSTOMIZE.JS - Themes, Backgrounds & Branding
// ============================================

// === APPLY THEME ===
function applyTheme(id) {
  var t = THEMES[id] || THEMES.light;
  var r = document.documentElement.style;

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

// === APPLY VISUALS ===
function applyVisuals() {
  var c = getCustomization(), im = getImages();
  applyTheme(c.theme || 'light');

  if (im.backgroundImage) {
    document.body.style.backgroundImage = 'url(' + im.backgroundImage + ')';
  } else if (c.backgroundPreset && c.backgroundPreset !== 'none') {
    document.body.style.backgroundImage = c.backgroundPreset;
  } else {
    document.body.style.backgroundImage = 'none';
  }

  renderThemeGrid();
  renderPresetGrid();
  renderSavedBgs();
}

// === THEME GRID ===
function renderThemeGrid() {
  var g = document.getElementById('themeGrid');
  if (!g) return;
  var c = getCustomization();

  g.innerHTML = Object.keys(THEMES).map(function (id) {
    var t = THEMES[id];
    var isActive = (c.theme || 'light') === id;

    return '<div class="theme-swatch ' + (isActive ? 'active' : '') + '" ' +
      'onclick="previewTheme(\'' + id + '\')" ' +
      'style="background:' + t.container + ';border-color:' + (isActive ? t.accent : 'transparent') + '">' +
      '<span>' + t.icon + '</span>' +
      '<small style="color:' + t.text + '">' + t.name + '</small>' +
      '<div style="position:absolute;bottom:0;left:0;right:0;height:6px;background:' + t.accent + ';border-radius:0 0 9px 9px"></div>' +
      '</div>';
  }).join('');
}

// === PRESET GRID ===
function renderPresetGrid() {
  var g = document.getElementById('presetGrid');
  if (!g) return;
  var c = getCustomization();

  g.innerHTML = PRESETS.map(function (p, i) {
    var bg = p.gradient === 'none' ? THEMES[p.theme].body : p.gradient;
    return '<div class="preset-card ' + (c.activePreset === i ? 'active' : '') + '" ' +
      'onclick="applyPreset(' + i + ')" ' +
      'style="background:' + bg + '">' + p.name + '</div>';
  }).join('');
}

// === PREVIEW & APPLY THEME ===
function previewTheme(id) {
  applyTheme(id);
  var c = getCustomization();
  c.theme = id;
  c.activePreset = undefined;
  saveCustomizationData(c);
  renderThemeGrid();
  renderPresetGrid();
}

// === APPLY PRESET ===
function applyPreset(i) {
  var p = PRESETS[i];
  var c = getCustomization();
  c.theme = p.theme;
  c.activePreset = i;
  c.backgroundPreset = p.gradient;

  var im = getImages();
  im.backgroundImage = '';
  saveImages(im);
  saveCustomizationData(c);
  applyVisuals();

  var bp = document.getElementById('bgPreview');
  if (bp) {
    bp.style.backgroundImage = p.gradient !== 'none' ? p.gradient : 'none';
    bp.textContent = p.gradient !== 'none' ? '' : 'No background set';
  }
}

// === SAVED BACKGROUNDS ===
function saveCurrentBgAsPreset() {
  var im = getImages();
  if (!im.backgroundImage) { alert('No background.'); return }

  var s = getSavedBgs();
  if (s.some(function (b) { return b.data === im.backgroundImage })) {
    alert('Already saved.');
    return;
  }

  s.push({ id: Date.now(), name: 'BG ' + (s.length + 1), data: im.backgroundImage });
  saveSavedBgs(s);
  scheduleSync();
  renderSavedBgs();
  alert('✅ Saved!');
}

function renderSavedBgs() {
  var g = document.getElementById('savedBgGrid');
  if (!g) return;
  var s = getSavedBgs(), im = getImages();

  if (!s.length) {
    g.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:13px">No saved backgrounds</p>';
    return;
  }

  g.innerHTML = s.map(function (b) {
    return '<div class="saved-bg-item ' + (im.backgroundImage === b.data ? 'active' : '') + '" ' +
      'style="background-image:url(' + b.data + ')" ' +
      'onclick="applySavedBg(' + b.id + ')">' +
      '<button class="delete-bg" onclick="event.stopPropagation();deleteSavedBg(' + b.id + ')">✕</button>' +
      '</div>';
  }).join('');
}

function applySavedBg(id) {
  var s = getSavedBgs();
  var b = s.find(function (x) { return x.id === id });
  if (!b) return;

  var im = getImages();
  im.backgroundImage = b.data;
  saveImages(im);

  var c = getCustomization();
  c.backgroundPreset = '';
  c.activePreset = undefined;
  saveCustomizationData(c);

  document.body.style.backgroundImage = 'url(' + b.data + ')';
  var bp = document.getElementById('bgPreview');
  if (bp) {
    bp.style.backgroundImage = 'url(' + b.data + ')';
    bp.textContent = '';
  }

  renderSavedBgs();
  renderPresetGrid();
  scheduleSync();
}

function deleteSavedBg(id) {
  if (!confirm('Delete?')) return;
  saveSavedBgs(getSavedBgs().filter(function (b) { return b.id !== id }));
  scheduleSync();
  renderSavedBgs();
}

// === LOGO UPLOAD ===
function handleLogoUpload(e) {
  var f = e.target.files[0];
  if (!f) return;

  var p = document.getElementById('logoProgress');
  var b = document.getElementById('logoProgressBar');
  p.classList.add('active');
  b.style.width = '30%';

  resizeImage(f, 200, 200, .85).then(function (d) {
    b.style.width = '80%';
    var im = getImages();
    im.companyLogo = d;
    saveImages(im);
    scheduleSync();
    document.getElementById('logoPreview').innerHTML = '<img src="' + d + '">';
    b.style.width = '100%';
    setTimeout(function () { p.classList.remove('active'); b.style.width = '0' }, 500);
  }).catch(function () {
    alert('Error');
    p.classList.remove('active');
  });
}

function removeLogo() {
  var im = getImages();
  im.companyLogo = '';
  saveImages(im);
  scheduleSync();
  document.getElementById('logoPreview').innerHTML = '<span style="font-size:32px;color:var(--text-muted)">📷</span>';
  document.getElementById('logoUpload').value = '';
}

// === BACKGROUND UPLOAD ===
function handleBgUpload(e) {
  var f = e.target.files[0];
  if (!f) return;

  var p = document.getElementById('bgProgress');
  var b = document.getElementById('bgProgressBar');
  p.classList.add('active');
  b.style.width = '20%';

  resizeImage(f, 1920, 1080, .7).then(function (d) {
    b.style.width = '70%';
    var im = getImages();
    im.backgroundImage = d;
    saveImages(im);

    var c = getCustomization();
    c.backgroundPreset = '';
    c.activePreset = undefined;
    saveCustomizationData(c);

    document.body.style.backgroundImage = 'url(' + d + ')';
    var bp = document.getElementById('bgPreview');
    bp.style.backgroundImage = 'url(' + d + ')';
    bp.textContent = '';
    renderPresetGrid();

    b.style.width = '100%';
    scheduleSync();
    setTimeout(function () { p.classList.remove('active'); b.style.width = '0' }, 500);
  }).catch(function () {
    alert('Error');
    p.classList.remove('active');
  });
}

function removeBackground() {
  var im = getImages();
  im.backgroundImage = '';
  saveImages(im);

  var c = getCustomization();
  c.backgroundPreset = '';
  c.activePreset = undefined;
  saveCustomizationData(c);

  document.body.style.backgroundImage = 'none';
  var bp = document.getElementById('bgPreview');
  bp.style.backgroundImage = 'none';
  bp.textContent = 'No background set';
  document.getElementById('bgUpload').value = '';

  renderPresetGrid();
  renderSavedBgs();
  scheduleSync();
}

// === LOAD FORM ===
function loadCustomizationForm() {
  var c = getCustomization(), im = getImages();

  document.getElementById('companyName').value = c.companyName || '';
  document.getElementById('companyAddress').value = c.companyAddress || '';
  document.getElementById('companyPhone').value = c.companyPhone || '';
  document.getElementById('companyEmail').value = c.companyEmail || '';

  // Logo preview
  if (im.companyLogo) {
    document.getElementById('logoPreview').innerHTML = '<img src="' + im.companyLogo + '">';
  } else {
    document.getElementById('logoPreview').innerHTML = '<span style="font-size:32px;color:var(--text-muted)">📷</span>';
  }

  // Background preview
  var bp = document.getElementById('bgPreview');
  if (im.backgroundImage) {
    bp.style.backgroundImage = 'url(' + im.backgroundImage + ')';
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

// === SAVE CUSTOMIZATION ===
function saveCustomization() {
  var c = getCustomization();
  c.companyName = autoCapitalize(document.getElementById('companyName').value.trim());
  c.companyAddress = autoCapitalize(document.getElementById('companyAddress').value.trim());
  c.companyPhone = document.getElementById('companyPhone').value.trim();
  c.companyEmail = document.getElementById('companyEmail').value.trim();
  saveCustomizationData(c);
  alert('✅ Saved!');
}
