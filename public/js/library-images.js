/**
 * library-images.js — family image archive in Bibliotek (upload once, reuse on activities).
 */
(function () {
  'use strict';

  function lpt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  let images = [];
  const pickerCallback = null;
  let _visualMode = 'emoji';

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
    const type = (file.type || '').toLowerCase();
    if (type === 'image/heic' || type === 'image/heif' || /\.heic$/i.test(file.name || '') || /\.heif$/i.test(file.name || '')) {
      return file;
    }
    if (!type.startsWith('image/') || type === 'image/svg+xml') return file;

    return new Promise(function (resolve) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        const maxDim = 1920;
        const w = img.naturalWidth || img.width || 1;
        const h = img.naturalHeight || img.height || 1;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, cw, ch);
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(file); return; }
          const base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
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
    const headers = {};
    if (window.Auth && Auth.getCsrfToken) {
      const csrf = Auth.getCsrfToken();
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
    const fd = new FormData();
    fd.append('image', file, file.name || 'photo.jpg');

    let res = await postUpload(fd, false);
    if (res.status === 403) {
      const errBody = await res.clone().json().catch(function () { return {}; });
      if (errBody.code === 'CSRF_MISSING' || errBody.code === 'CSRF_INVALID') {
        res = await postUpload(fd, true);
      }
    }

    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      throw new Error(lpt('library.images.uploadBadResponse'));
    }
    if (!res.ok) throw new Error(data.error || lpt('library.images.uploadFailed'));
    if (!data.url) throw new Error(lpt('library.images.uploadNoUrl'));
    return data.url;
  }

  async function loadImages() {
    if (!window.apiFetch) return [];
    const res = await apiFetch('/api/family/images');
    if (!res.ok) return [];
    images = await res.json();
    return images;
  }

  function renderGrid() {
    const grid = document.getElementById('familyImageGrid');
    if (!grid) return;
    if (!images.length) {
      grid.innerHTML = '<p class="text-sm text-text-soft col-span-full py-4 text-center">' + esc(lpt('library.images.emptyArchive')) + '</p>';
      return;
    }
    grid.innerHTML = images.map(function (img) {
      const label = img.label ? esc(img.label) : esc(lpt('library.images.defaultLabel'));
      return (
        '<div class="family-image-card" data-image-id="' + img.id + '">' +
          '<img src="' + esc(img.image_url) + '" alt="' + label + '" class="family-image-card__img" loading="lazy">' +
          '<div class="family-image-card__meta">' +
            '<span class="family-image-card__label">' + label + '</span>' +
            '<button type="button" class="family-image-card__delete" data-delete-id="' + img.id + '" title="' + esc(lpt('library.images.deleteTitle')) + '">✕</button>' +
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
    const url = await uploadFile(file);
    const res = await apiFetch('/api/family/images', {
      method: 'POST',
      body: JSON.stringify({ label: label || null, image_url: url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(function () { return {}; });
      throw new Error(err.error || lpt('library.images.saveFailed'));
    }
    const row = await res.json();
    images.push(row);
    renderGrid();
    renderPickerGrid();
    return row;
  }

  async function deleteImage(id) {
    if (!confirm(lpt('library.images.deleteConfirm'))) return;
    const res = await apiFetch('/api/family/images/' + id, { method: 'DELETE' });
    if (!res.ok) {
      showToast(lpt('library.images.deleteFailed'), true);
      return;
    }
    images = images.filter(function (i) { return i.id !== id; });
    renderGrid();
    renderPickerGrid();
    if (typeof window.loadActivities === 'function') {
      await window.loadActivities();
    }
    showToast(lpt('library.images.deleted'));
  }

  function renderPickerGrid() {
    const grid = document.getElementById('activityImagePickerGrid');
    if (!grid) return;
    if (!images.length) {
      grid.innerHTML = '<p class="text-xs text-text-soft col-span-full">' + esc(lpt('library.images.pickerEmpty')) + '</p>';
      return;
    }
    grid.innerHTML = images.map(function (img) {
      return (
        '<button type="button" class="activity-image-pick" data-pick-url="' + esc(img.image_url) + '" title="' + esc(img.label || lpt('library.images.pickTitle')) + '">' +
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
    const wrap = document.getElementById('activityImagePreviewWrap');
    const preview = document.getElementById('activityImageBarnvyPreview');
    const recropBtn = document.getElementById('activityImageRecropBtn');
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
    const hidden = document.getElementById('activityImageUrl');
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
    const urlEl = document.getElementById('activityImageUrl');
    const current = urlEl && urlEl.value ? urlEl.value : '';
    if (!current || !window.LibraryImageCrop) return;
    const recropBtn = document.getElementById('activityImageRecropBtn');
    if (recropBtn) {
      recropBtn.disabled = true;
      recropBtn.textContent = lpt('library.images.recropOpening');
    }
    let cropped;
    try {
      cropped = await LibraryImageCrop.openFromUrl(current);
    } catch (err) {
      showToast(err.message || lpt('library.images.recropOpenFailed'), true);
      cropped = null;
    } finally {
      if (recropBtn) {
        recropBtn.disabled = false;
        recropBtn.textContent = lpt('library.images.recropBtn');
      }
    }
    if (!cropped) return;
    try {
      const newUrl = await uploadFile(cropped);
      const res = await apiFetch('/api/family/images', {
        method: 'POST',
        body: JSON.stringify({ label: null, image_url: newUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(function () { return {}; });
        throw new Error(err.error || lpt('library.images.saveFailed'));
      }
      const row = await res.json();
      images.push(row);
      renderGrid();
      renderPickerGrid();
      selectActivityImage(row.image_url);
      showToast(lpt('library.images.recropSaved'));
    } catch (err) {
      showToast(err.message || lpt('library.images.recropSaveFailed'), true);
    }
  }

  function setVisualMode(mode) {
    _visualMode = mode === 'photo' ? 'photo' : 'emoji';
    const emojiBlock = document.getElementById('activityEmojiBlock');
    const photoBlock = document.getElementById('activityPhotoBlock');
    const btnEmoji = document.getElementById('activityVisualEmojiBtn');
    const btnPhoto = document.getElementById('activityVisualPhotoBtn');
    const isPhoto = _visualMode === 'photo';
    if (emojiBlock) emojiBlock.classList.toggle('hidden', isPhoto);
    if (photoBlock) photoBlock.classList.toggle('hidden', !isPhoto);
    if (btnEmoji) btnEmoji.classList.toggle('activity-visual-tab--active', !isPhoto);
    if (btnPhoto) btnPhoto.classList.toggle('activity-visual-tab--active', isPhoto);
  }

  function initActivityImagePicker(act) {
    return loadImages().then(function () {
      const imageUrl = act && act.image_url ? act.image_url : '';
      const isNew = !act || !act.id;
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
    let file = input.files && input.files[0];
    if (!file) return;
    const labelEl = document.getElementById('familyImageLabel');
    const label = labelEl && labelEl.value ? labelEl.value.trim() : '';
    const btn = document.getElementById('familyImageUploadBtn');
    if (btn) { btn.disabled = true; btn.textContent = lpt('library.images.uploading'); }
    try {
      file = await cropBeforeUpload(file);
      if (!file) return;
      await addImage(file, label);
      if (labelEl) labelEl.value = '';
      showToast(lpt('library.images.addedToArchive'));
    } catch (err) {
      showToast(err.message || lpt('library.images.uploadFailed'), true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = lpt('library.images.uploadBtn'); }
      input.value = '';
    }
  }

  async function handlePickerUpload(input) {
    let file = input.files && input.files[0];
    if (!file) return;
    try {
      file = await cropBeforeUpload(file);
      if (!file) return;
      const row = await addImage(file, '');
      selectActivityImage(row.image_url);
      setVisualMode('photo');
      showToast(lpt('library.images.uploaded'));
    } catch (err) {
      showToast(err.message || lpt('library.images.uploadFailed'), true);
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

    const uploadInput = document.getElementById('familyImageFile');
    if (uploadInput) {
      uploadInput.addEventListener('change', function () { handleArchiveUpload(uploadInput); });
    }
    const pickerInput = document.getElementById('activityImageFile');
    if (pickerInput) {
      pickerInput.addEventListener('change', function () { handlePickerUpload(pickerInput); });
    }
    const clearBtn = document.getElementById('activityImageClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearActivityImage);
    const recropBtn = document.getElementById('activityImageRecropBtn');
    if (recropBtn) {
      recropBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        recropSelectedImage();
      });
    }
    const emojiBtn = document.getElementById('activityVisualEmojiBtn');
    const photoBtn = document.getElementById('activityVisualPhotoBtn');
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
      const el = document.getElementById('activityImageUrl');
      return el && el.value ? el.value : null;
    },
    clearActivityImage: clearActivityImage,
    setVisualMode: setVisualMode,
  };
})();
