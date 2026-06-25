/**
 * library-images.js — family image archive in Bibliotek (upload once, reuse on activities).
 */
(function () {
  'use strict';

  var images = [];
  var pickerCallback = null;

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function uploadFile(file) {
    if (!file) throw new Error('Ingen fil vald');
    var fd = new FormData();
    fd.append('image', file);
    if (window.Auth && Auth.ensureCsrfToken) await Auth.ensureCsrfToken();
    var headers = {};
    if (window.Auth && Auth.getCsrfToken) {
      var csrf = Auth.getCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    var res = await fetch('/api/upload/image', {
      method: 'POST',
      headers: headers,
      body: fd,
      credentials: 'include',
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Uppladdning misslyckades');
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
    if (!confirm('Ta bort bilden från bildarkivet? Aktiviteter som redan använder den behåller bilden.')) return;
    var res = await apiFetch('/api/family/images/' + id, { method: 'DELETE' });
    if (!res.ok) {
      showToast('Kunde inte ta bort bilden', true);
      return;
    }
    images = images.filter(function (i) { return i.id !== id; });
    renderGrid();
    renderPickerGrid();
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

  function selectActivityImage(url) {
    var hidden = document.getElementById('activityImageUrl');
    var preview = document.getElementById('activityImagePreview');
    if (hidden) hidden.value = url || '';
    if (preview) {
      if (url) {
        preview.src = url;
        preview.classList.remove('hidden');
      } else {
        preview.classList.add('hidden');
        preview.removeAttribute('src');
      }
    }
    document.querySelectorAll('.activity-image-pick').forEach(function (btn) {
      btn.classList.toggle('ring-2', btn.getAttribute('data-pick-url') === url);
      btn.classList.toggle('ring-gold', btn.getAttribute('data-pick-url') === url);
    });
    if (typeof pickerCallback === 'function') pickerCallback(url);
  }

  function clearActivityImage() {
    selectActivityImage('');
  }

  function setVisualMode(mode) {
    var emojiBlock = document.getElementById('activityEmojiBlock');
    var photoBlock = document.getElementById('activityPhotoBlock');
    var btnEmoji = document.getElementById('activityVisualEmojiBtn');
    var btnPhoto = document.getElementById('activityVisualPhotoBtn');
    var isPhoto = mode === 'photo';
    if (emojiBlock) emojiBlock.classList.toggle('hidden', isPhoto);
    if (photoBlock) photoBlock.classList.toggle('hidden', !isPhoto);
    if (btnEmoji) {
      btnEmoji.classList.toggle('bg-white', !isPhoto);
      btnEmoji.classList.toggle('shadow', !isPhoto);
    }
    if (btnPhoto) {
      btnPhoto.classList.toggle('bg-white', isPhoto);
      btnPhoto.classList.toggle('shadow', isPhoto);
    }
  }

  function initActivityImagePicker(act) {
    var url = act && act.image_url ? act.image_url : '';
    setVisualMode(url ? 'photo' : 'emoji');
    selectActivityImage(url);
    renderPickerGrid();
  }

  async function handleArchiveUpload(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var labelEl = document.getElementById('familyImageLabel');
    var label = labelEl && labelEl.value ? labelEl.value.trim() : '';
    var btn = document.getElementById('familyImageUploadBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Laddar upp…'; }
    try {
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
    getSelectedUrl: function () {
      var el = document.getElementById('activityImageUrl');
      return el && el.value ? el.value : null;
    },
    clearActivityImage: clearActivityImage,
  };
})();
