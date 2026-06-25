/**
 * library-images.js — family image archive in Bibliotek (upload once, reuse on activities).
 */
(function () {
  'use strict';

  var images = [];
  var pickerCallback = null;
  var _visualMode = 'emoji';

  function isPhotoMode() {
    return _visualMode === 'photo';
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function cropBeforeUpload(file) {
    if (!file) return null;
    if (window.LibraryImageCrop && typeof LibraryImageCrop.open === 'function') {
      return LibraryImageCrop.open(file);
    }
    return file;
  }

  async function compressUploadFile(file) {
    if (!file) return file;
    var type = (file.type || '').toLowerCase();
    if (type === 'image/heic' || type === 'image/heif' || /\.heic$/i.test(file.name || '') || /\.heif$/i.test(file.name || '')) {
      return file;
    }
    if (!type.startsWith('image/') || type === 'image/svg+xml') return file;

    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var maxDim = 1920;
        var w = img.naturalWidth || img.width || 1;
        var h = img.naturalHeight || img.height || 1;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, cw, ch);
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(file); return; }
          var base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
          resolve(new File([blob], base + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.88);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  async function postUpload(fd, retry) {
    if (window.Auth && Auth.ensureCsrfToken) {
      if (retry) localStorage.removeItem(Auth.CSRF_KEY);
      await Auth.ensureCsrfToken();
    }
    var headers = {};
    if (window.Auth && Auth.getCsrfToken) {
      var csrf = Auth.getCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    return fetch('/api/upload/image', {
      method: 'POST',
      headers: headers,
      body: fd,
      credentials: 'include',
    });
  }

  async function uploadFile(file) {
    if (!file) throw new Error('Ingen fil vald');
    file = await compressUploadFile(file);
    var fd = new FormData();
    fd.append('image', file, file.name || 'photo.jpg');

    var res = await postUpload(fd, false);
    if (res.status === 403) {
      var errBody = await res.clone().json().catch(function () { return {}; });
      if (errBody.code === 'CSRF_MISSING' || errBody.code === 'CSRF_INVALID') {
        res = await postUpload(fd, true);
      }
    }

    var data = {};
    try {
      data = await res.json();
    } catch (_) {
      throw new Error('Uppladdning misslyckades (servern svarade inte korrekt)');
    }
    if (!res.ok) throw new Error(data.error || 'Uppladdning misslyckades');
    if (!data.url) throw new Error('Servern returnerade ingen bild-URL');
    return data.url;
  }

  async function loadImages() {
    if (!window.apiFetch) return [];
    var res = await apiFetch('/api/family/images');
    if (!res.ok) return [];
    images = await res.json();
    return images;
  }

  function renderGrid() {
    var grid = document.getElementById('familyImageGrid');
    if (!grid) return;
    if (!images.length) {
      grid.innerHTML = '<p class="text-sm text-text-soft col-span-full py-4 text-center">Inga bilder ännu — ladda upp t.ex. tandborste, säng eller skolbyggnad.</p>';
      return;
    }
    grid.innerHTML = images.map(function (img) {
      var label = img.label ? esc(img.label) : 'Bild';
      return (
        '<div class="family-image-card" data-image-id="' + img.id + '">' +
          '<img src="' + esc(img.image_url) + '" alt="' + label + '" class="family-image-card__img" loading="lazy">' +
          '<div class="family-image-card__meta">' +
            '<span class="family-image-card__label">' + label + '</span>' +
            '<button type="button" class="family-image-card__delete" data-delete-id="' + img.id + '" title="Ta bort">✕</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    grid.querySelectorAll('[data-delete-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteImage(btn.getAttribute('data-delete-id'));
      });
    });
  }

  async function addImage(file, label) {
    var url = await uploadFile(file);
    var res = await apiFetch('/api/family/images', {
      method: 'POST',
      body: JSON.stringify({ label: label || null, image_url: url }),
    });
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.error || 'Kunde inte spara i bildarkivet');
    }
    var row = await res.json();
    images.push(row);
    renderGrid();
    renderPickerGrid();
    return row;
  }

  async function deleteImage(id) {
    if (!confirm('Ta bort bilden från bildarkivet? Aktiviteter som använder den får emoji (⭐) istället.')) return;
    var res = await apiFetch('/api/family/images/' + id, { method: 'DELETE' });
    if (!res.ok) {
      showToast('Kunde inte ta bort bilden', true);
      return;
    }
    images = images.filter(function (i) { return i.id !== id; });
    renderGrid();
    renderPickerGrid();
    if (typeof window.loadActivities === 'function') {
      await window.loadActivities();
    }
    showToast('Bilden borttagen');
  }

  function renderPickerGrid() {
    var grid = document.getElementById('activityImagePickerGrid');
    if (!grid) return;
    if (!images.length) {
      grid.innerHTML = '<p class="text-xs text-text-soft col-span-full">Ladda upp bilder i bildarkivet nedan, eller välj en fil här.</p>';
      return;
    }
    grid.innerHTML = images.map(function (img) {
      return (
        '<button type="button" class="activity-image-pick" data-pick-url="' + esc(img.image_url) + '" title="' + esc(img.label || 'Välj bild') + '">' +
          '<img src="' + esc(img.image_url) + '" alt="" loading="lazy">' +
        '</button>'
      );
    }).join('');

    grid.querySelectorAll('.activity-image-pick').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectActivityImage(btn.getAttribute('data-pick-url'));
      });
    });
  }

  function updateBarnvyPreview(url) {
    var wrap = document.getElementById('activityImagePreviewWrap');
    var preview = document.getElementById('activityImageBarnvyPreview');
    var recropBtn = document.getElementById('activityImageRecropBtn');
    if (wrap) wrap.classList.toggle('hidden', !url);
    if (preview) {
      if (url) {
        preview.src = url;
      } else {
        preview.removeAttribute('src');
      }
    }
    if (recropBtn) recropBtn.classList.toggle('hidden', !url);
  }

  function selectActivityImage(url) {
    var hidden = document.getElementById('activityImageUrl');
    if (hidden) hidden.value = url || '';
    updateBarnvyPreview(url);
    document.querySelectorAll('.activity-image-pick').forEach(function (btn) {
      btn.classList.toggle('ring-2', btn.getAttribute('data-pick-url') === url);
      btn.classList.toggle('ring-gold', btn.getAttribute('data-pick-url') === url);
    });
    if (typeof pickerCallback === 'function') pickerCallback(url);
  }

  function clearActivityImage() {
    selectActivityImage('');
  }

  async function recropSelectedImage() {
    var urlEl = document.getElementById('activityImageUrl');
    var current = urlEl && urlEl.value ? urlEl.value : '';
    if (!current || !window.LibraryImageCrop) return;
    var recropBtn = document.getElementById('activityImageRecropBtn');
    if (recropBtn) {
      recropBtn.disabled = true;
      recropBtn.textContent = 'Öppnar…';
    }
    var cropped;
    try {
      cropped = await LibraryImageCrop.openFromUrl(current);
    } catch (err) {
      showToast(err.message || 'Kunde inte öppna beskärningen', true);
      cropped = null;
    } finally {
      if (recropBtn) {
        recropBtn.disabled = false;
        recropBtn.textContent = '✂️ Beskär om';
      }
    }
    if (!cropped) return;
    try {
      var newUrl = await uploadFile(cropped);
      var res = await apiFetch('/api/family/images', {
        method: 'POST',
        body: JSON.stringify({ label: null, image_url: newUrl }),
      });
      if (!res.ok) {
        var err = await res.json().catch(function () { return {}; });
        throw new Error(err.error || 'Kunde inte spara i bildarkivet');
      }
      var row = await res.json();
      images.push(row);
      renderGrid();
      renderPickerGrid();
      selectActivityImage(row.image_url);
      showToast('Bilden uppdaterad');
    } catch (err) {
      showToast(err.message || 'Kunde inte spara beskärningen', true);
    }
  }

  function setVisualMode(mode) {
    _visualMode = mode === 'photo' ? 'photo' : 'emoji';
    var emojiBlock = document.getElementById('activityEmojiBlock');
    var photoBlock = document.getElementById('activityPhotoBlock');
    var btnEmoji = document.getElementById('activityVisualEmojiBtn');
    var btnPhoto = document.getElementById('activityVisualPhotoBtn');
    var isPhoto = _visualMode === 'photo';
    if (emojiBlock) emojiBlock.classList.toggle('hidden', isPhoto);
    if (photoBlock) photoBlock.classList.toggle('hidden', !isPhoto);
    if (btnEmoji) btnEmoji.classList.toggle('activity-visual-tab--active', !isPhoto);
    if (btnPhoto) btnPhoto.classList.toggle('activity-visual-tab--active', isPhoto);
  }

  function initActivityImagePicker(act) {
    return loadImages().then(function () {
      var imageUrl = act && act.image_url ? act.image_url : '';
      var isNew = !act || !act.id;
      if (imageUrl) {
        setVisualMode('photo');
      } else if (isNew && images.length > 0) {
        setVisualMode('photo');
        if (images.length === 1) selectActivityImage(images[0].image_url);
      } else {
        setVisualMode('emoji');
      }
      selectActivityImage(imageUrl);
      renderPickerGrid();
    });
  }

  async function handleArchiveUpload(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var labelEl = document.getElementById('familyImageLabel');
    var label = labelEl && labelEl.value ? labelEl.value.trim() : '';
    var btn = document.getElementById('familyImageUploadBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Laddar upp…'; }
    try {
      file = await cropBeforeUpload(file);
      if (!file) return;
      await addImage(file, label);
      if (labelEl) labelEl.value = '';
      showToast('Bild tillagd i bildarkivet');
    } catch (err) {
      showToast(err.message || 'Uppladdning misslyckades', true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📷 Ladda upp bild'; }
      input.value = '';
    }
  }

  async function handlePickerUpload(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    try {
      file = await cropBeforeUpload(file);
      if (!file) return;
      var row = await addImage(file, '');
      selectActivityImage(row.image_url);
      setVisualMode('photo');
      showToast('Bild uppladdad');
    } catch (err) {
      showToast(err.message || 'Uppladdning misslyckades', true);
    } finally {
      input.value = '';
    }
  }

  async function init() {
    if (window.LibraryImageCrop && typeof LibraryImageCrop.init === 'function') {
      LibraryImageCrop.init();
    }
    await loadImages();
    renderGrid();

    var uploadInput = document.getElementById('familyImageFile');
    if (uploadInput) {
      uploadInput.addEventListener('change', function () { handleArchiveUpload(uploadInput); });
    }
    var pickerInput = document.getElementById('activityImageFile');
    if (pickerInput) {
      pickerInput.addEventListener('change', function () { handlePickerUpload(pickerInput); });
    }
    var clearBtn = document.getElementById('activityImageClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearActivityImage);
    var recropBtn = document.getElementById('activityImageRecropBtn');
    if (recropBtn) {
      recropBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        recropSelectedImage();
      });
    }
    var emojiBtn = document.getElementById('activityVisualEmojiBtn');
    var photoBtn = document.getElementById('activityVisualPhotoBtn');
    if (emojiBtn) emojiBtn.addEventListener('click', function () { setVisualMode('emoji'); clearActivityImage(); });
    if (photoBtn) photoBtn.addEventListener('click', function () { setVisualMode('photo'); });
  }

  window.LibraryImages = {
    init: init,
    loadImages: loadImages,
    renderGrid: renderGrid,
    initActivityImagePicker: initActivityImagePicker,
    isPhotoMode: isPhotoMode,
    getSelectedUrl: function () {
      var el = document.getElementById('activityImageUrl');
      return el && el.value ? el.value : null;
    },
    clearActivityImage: clearActivityImage,
    setVisualMode: setVisualMode,
  };
})();
