// ============================================
// CUSTOMIZE.JS - Themes, Backgrounds & Branding
// ============================================

// === CONSTANTS ===
var MAX_SAVED_BACKGROUNDS = 20;

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

  var metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = t.accent;
}

// === APPLY VISUALS ===
function applyVisuals() {
  var c = getCustomization();
  var im = getImages();

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
  var currentTheme = c.theme || 'light';

  g.innerHTML = Object.keys(THEMES).map(function (id) {
    var t = THEMES[id];
    var isActive = currentTheme === id;

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
    var isActive = c.activePreset === i;

    return '<div class="preset-card ' + (isActive ? 'active' : '') + '" ' +
      'onclick="applyPreset(' + i + ')" ' +
      'style="background:' + bg + '">' + p.name + '</div>';
  }).join('');
}

// === PREVIEW & APPLY THEME ===
function previewTheme(id) {
  if (!THEMES[id]) return;

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
  if (i < 0 || i >= PRESETS.length) return;

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
  if (!im.backgroundImage) {
    alert('No background image to save');
    return;
  }

  var s = getSavedBgs();

  // Check for duplicates
  if (s.some(function (b) { return b.data === im.backgroundImage; })) {
    alert('This background is already saved');
    return;
  }

  // Check limit
  if (s.length >= MAX_SAVED_BACKGROUNDS) {
    alert('Maximum ' + MAX_SAVED_BACKGROUNDS + ' saved backgrounds allowed.\nPlease delete one first.');
    return;
  }

  s.push({
    id: Date.now(),
    name: 'BG ' + (s.length + 1),
    data: im.backgroundImage
  });

  saveSavedBgs(s);
  if (typeof scheduleSync === 'function') scheduleSync();
  renderSavedBgs();
  alert('✅ Background saved!');
}

function renderSavedBgs() {
  var g = document.getElementById('savedBgGrid');
  if (!g) return;

  var s = getSavedBgs();
  var im = getImages();

  if (!s.length) {
    g.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:13px">No saved backgrounds</p>';
    return;
  }

  g.innerHTML = s.map(function (b) {
    var isActive = im.backgroundImage === b.data;
    return '<div class="saved-bg-item ' + (isActive ? 'active' : '') + '" ' +
      'style="background-image:url(' + b.data + ')" ' +
      'onclick="applySavedBg(\'' + b.id + '\')">' +
      '<button class="delete-bg" onclick="event.stopPropagation();deleteSavedBg(\'' + b.id + '\')">✕</button>' +
      '</div>';
  }).join('');
}

function applySavedBg(id) {
  id = parseInt(id) || id;
  var s = getSavedBgs();
  var b = s.find(function (x) { return x.id == id; });
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
  if (typeof scheduleSync === 'function') scheduleSync();
}

function deleteSavedBg(id) {
  id = parseInt(id) || id;
  if (!confirm('Delete this saved background?')) return;

  saveSavedBgs(getSavedBgs().filter(function (b) { return b.id != id; }));
  if (typeof scheduleSync === 'function') scheduleSync();
  renderSavedBgs();
}

// === VALIDATE IMAGE FILE ===
function validateImageFile(file) {
  if (!file) return false;

  var validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (validTypes.indexOf(file.type) === -1) {
    alert('⚠ Please select a valid image file (JPEG, PNG, GIF, WebP)');
    return false;
  }

  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    alert('⚠ File too large. Maximum ' + MAX_IMAGE_SIZE_MB + 'MB allowed.');
    return false;
  }

  return true;
}

// === RESET PROGRESS BAR ===
function resetProgressBar(progressId, barId) {
  var p = document.getElementById(progressId);
  var b = document.getElementById(barId);
  if (p) p.classList.remove('active');
  if (b) b.style.width = '0';
}

// === LOGO UPLOAD ===
function handleLogoUpload(e) {
  var f = e.target.files[0];
  if (!f) return;

  if (!validateImageFile(f)) {
    e.target.value = '';
    return;
  }

  var p = document.getElementById('logoProgress');
  var b = document.getElementById('logoProgressBar');
  if (p) p.classList.add('active');
  if (b) b.style.width = '30%';

  resizeImage(f, 200, 200, 0.85)
    .then(function (d) {
      if (b) b.style.width = '80%';

      var im = getImages();
      im.companyLogo = d;
      saveImages(im);
      if (typeof scheduleSync === 'function') scheduleSync();

      var preview = document.getElementById('logoPreview');
      if (preview) preview.innerHTML = '<img src="' + d + '">';

      if (b) b.style.width = '100%';
      setTimeout(function () { resetProgressBar('logoProgress', 'logoProgressBar'); }, 500);
    })
    .catch(function (err) {
      alert('❌ Error uploading logo: ' + (err.message || 'Unknown error'));
      resetProgressBar('logoProgress', 'logoProgressBar');
    });
}

function removeLogo() {
  var im = getImages();
  if (!im.companyLogo) {
    alert('No logo to remove');
    return;
  }

  if (!confirm('Remove company logo?')) return;

  im.companyLogo = '';
  saveImages(im);
  if (typeof scheduleSync === 'function') scheduleSync();

  var preview = document.getElementById('logoPreview');
  if (preview) preview.innerHTML = '<span style="font-size:32px;color:var(--text-muted)">📷</span>';

  var upload = document.getElementById('logoUpload');
  if (upload) upload.value = '';
}

// === BACKGROUND UPLOAD ===
function handleBgUpload(e) {
  var f = e.target.files[0];
  if (!f) return;

  if (!validateImageFile(f)) {
    e.target.value = '';
    return;
  }

  var p = document.getElementById('bgProgress');
  var b = document.getElementById('bgProgressBar');
  if (p) p.classList.add('active');
  if (b) b.style.width = '20%';

  resizeImage(f, 1920, 1080, 0.7)
    .then(function (d) {
      if (b) b.style.width = '70%';

      var im = getImages();
      im.backgroundImage = d;
      saveImages(im);

      var c = getCustomization();
      c.backgroundPreset = '';
      c.activePreset = undefined;
      saveCustomizationData(c);

      document.body.style.backgroundImage = 'url(' + d + ')';

      var bp = document.getElementById('bgPreview');
      if (bp) {
        bp.style.backgroundImage = 'url(' + d + ')';
        bp.textContent = '';
      }

      renderPresetGrid();

      if (b) b.style.width = '100%';
      if (typeof scheduleSync === 'function') scheduleSync();
      setTimeout(function () { resetProgressBar('bgProgress', 'bgProgressBar'); }, 500);
    })
    .catch(function (err) {
      alert('❌ Error uploading background: ' + (err.message || 'Unknown error'));
      resetProgressBar('bgProgress', 'bgProgressBar');
    });
}

function removeBackground() {
  var im = getImages();
  if (!im.backgroundImage) {
    var c = getCustomization();
    if (!c.backgroundPreset || c.backgroundPreset === 'none') {
      alert('No background to remove');
      return;
    }
  }

  if (!confirm('Remove background?')) return;

  im = getImages();
  im.backgroundImage = '';
  saveImages(im);

  var c = getCustomization();
  c.backgroundPreset = '';
  c.activePreset = undefined;
  saveCustomizationData(c);

  document.body.style.backgroundImage = 'none';

  var bp = document.getElementById('bgPreview');
  if (bp) {
    bp.style.backgroundImage = 'none';
    bp.textContent = 'No background set';
  }

  var upload = document.getElementById('bgUpload');
  if (upload) upload.value = '';

  renderPresetGrid();
  renderSavedBgs();
  if (typeof scheduleSync === 'function') scheduleSync();
}

// === LOAD CUSTOMIZATION FORM ===
function loadCustomizationForm() {
  var c = getCustomization();
  var im = getImages();

  // Company fields
  var el;
  el = document.getElementById('companyName');
  if (el) el.value = c.companyName || '';

  el = document.getElementById('companyAddress');
  if (el) el.value = c.companyAddress || '';

  el = document.getElementById('companyPhone');
  if (el) el.value = c.companyPhone || '';

  el = document.getElementById('companyEmail');
  if (el) el.value = c.companyEmail || '';

  // Logo preview
  var logoPreview = document.getElementById('logoPreview');
  if (logoPreview) {
    if (im.companyLogo) {
      logoPreview.innerHTML = '<img src="' + im.companyLogo + '">';
    } else {
      logoPreview.innerHTML = '<span style="font-size:32px;color:var(--text-muted)">📷</span>';
    }
  }

  // Background preview
  var bp = document.getElementById('bgPreview');
  if (bp) {
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
  }

  renderThemeGrid();
  renderPresetGrid();
  renderSavedBgs();
}

// === SAVE CUSTOMIZATION ===
function saveCustomization() {
  var c = getCustomization();

  var nameEl = document.getElementById('companyName');
  var addrEl = document.getElementById('companyAddress');
  var phoneEl = document.getElementById('companyPhone');
  var emailEl = document.getElementById('companyEmail');

  c.companyName = nameEl ? autoCapitalize(nameEl.value.trim()) : c.companyName || '';
  c.companyAddress = addrEl ? autoCapitalize(addrEl.value.trim()) : c.companyAddress || '';
  c.companyPhone = phoneEl ? phoneEl.value.trim() : c.companyPhone || '';
  c.companyEmail = emailEl ? emailEl.value.trim() : c.companyEmail || '';

  // Validate email format if provided
  if (c.companyEmail && c.companyEmail.indexOf('@') === -1) {
    alert('⚠ Please enter a valid email address');
    if (emailEl) emailEl.focus();
    return;
  }

  saveCustomizationData(c);
  alert('✅ Branding saved!');
}
