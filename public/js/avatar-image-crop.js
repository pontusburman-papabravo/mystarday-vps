/**
 * avatar-image-crop.js — square crop modal for profile photos (Family Avatar v1).
 */
(function () {
  'use strict';

  const EXPORT_SIZE = 512;
  let modalEl = null;
  let state = null;

  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.id = 'avatarCropModal';
    modalEl.className = 'hidden fixed inset-0 z-[10500] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'avatarCropTitle');
    modalEl.innerHTML =
      '<div class="bg-white dark:bg-navy w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 shadow-xl">' +
        '<h2 id="avatarCropTitle" class="text-lg font-heading font-bold text-navy dark:text-white mb-3">Beskär profilbild</h2>' +
        '<div id="avatarCropViewport" class="relative w-full aspect-square bg-gray-900 rounded-xl overflow-hidden touch-none" style="max-height:min(70vh,400px);"></div>' +
        '<label class="block mt-3 text-xs font-semibold text-text-soft">Zoom</label>' +
        '<input type="range" id="avatarCropZoom" min="1" max="3" step="0.01" value="1" class="w-full mt-1" />' +
        '<div class="flex gap-2 mt-4">' +
          '<button type="button" id="avatarCropCancelBtn" class="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-lavender text-navy font-semibold">Avbryt</button>' +
          '<button type="button" id="avatarCropConfirmBtn" class="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-gold text-navy font-bold">Spara</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modalEl);

    modalEl.querySelector('#avatarCropCancelBtn').addEventListener('click', function () {
      close(null);
    });
    modalEl.querySelector('#avatarCropConfirmBtn').addEventListener('click', function () {
      exportFile().then(function (file) { close(file); }).catch(function (err) {
        if (typeof showToast === 'function') showToast(err.message || 'Kunde inte spara', true);
      });
    });
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) close(null);
    });
    modalEl.querySelector('#avatarCropZoom').addEventListener('input', function (e) {
      if (!state) return;
      state.zoom = parseFloat(e.target.value, 10) || 1;
      layout();
    });

    const vp = modalEl.querySelector('#avatarCropViewport');
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return modalEl;
  }

  function viewport() {
    return modalEl && modalEl.querySelector('#avatarCropViewport');
  }

  function scale() {
    return state.baseScale * state.zoom;
  }

  function dispW() { return state.img.naturalWidth * scale(); }
  function dispH() { return state.img.naturalHeight * scale(); }

  function clampPan() {
    const vp = viewport();
    if (!vp || !state.img) return;
    state.panX = Math.min(0, Math.max(vp.clientWidth - dispW(), state.panX));
    state.panY = Math.min(0, Math.max(vp.clientHeight - dispH(), state.panY));
  }

  function center() {
    const vp = viewport();
    if (!vp || !state.img) return;
    state.panX = (vp.clientWidth - dispW()) / 2;
    state.panY = (vp.clientHeight - dispH()) / 2;
    clampPan();
  }

  function layout() {
    const vp = viewport();
    if (!vp || !state || !state.imgEl) return;
    const s = scale();
    state.imgEl.style.width = (state.img.naturalWidth * s) + 'px';
    state.imgEl.style.height = (state.img.naturalHeight * s) + 'px';
    state.imgEl.style.left = state.panX + 'px';
    state.imgEl.style.top = state.panY + 'px';
  }

  function resetEditor() {
    const vp = viewport();
    if (!vp || !state || !state.img) return;
    const sx = vp.clientWidth / state.img.naturalWidth;
    const sy = vp.clientHeight / state.img.naturalHeight;
    state.baseScale = Math.max(sx, sy);
    state.zoom = 1;
    const slider = modalEl.querySelector('#avatarCropZoom');
    if (slider) slider.value = '1';
    center();
    layout();
  }

  function cropRect() {
    const vp = viewport();
    const s = scale();
    return {
      sx: -state.panX / s,
      sy: -state.panY / s,
      sw: vp.clientWidth / s,
      sh: vp.clientHeight / s,
    };
  }

  function exportFile() {
    return new Promise(function (resolve, reject) {
      if (!state || !state.img) return reject(new Error('Ingen bild'));
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext('2d');
      const r = cropRect();
      ctx.drawImage(state.img, r.sx, r.sy, r.sw, r.sh, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('Kunde inte skapa bild'));
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  }

  function onPointerDown(e) {
    if (!state || !state.img) return;
    state.drag = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!state || !state.drag) return;
    state.panX = state.drag.panX + (e.clientX - state.drag.x);
    state.panY = state.drag.panY + (e.clientY - state.drag.y);
    clampPan();
    layout();
  }

  function onPointerUp(e) {
    if (!state || !state.drag) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    state.drag = null;
  }

  function close(result) {
    if (!state) return;
    const resolve = state.resolve;
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    if (modalEl) modalEl.classList.add('hidden');
    const vp = viewport();
    if (vp) vp.innerHTML = '';
    state = null;
    if (resolve) resolve(result);
  }

  function openFromFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve(null);
      ensureModal();
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        const vp = viewport();
        vp.innerHTML = '';
        const imgEl = document.createElement('img');
        imgEl.src = url;
        imgEl.alt = '';
        imgEl.draggable = false;
        imgEl.style.position = 'absolute';
        imgEl.style.userSelect = 'none';
        imgEl.style.touchAction = 'none';
        vp.appendChild(imgEl);
        state = {
          img: img,
          imgEl: imgEl,
          objectUrl: url,
          resolve: resolve,
          baseScale: 1,
          zoom: 1,
          panX: 0,
          panY: 0,
          drag: null,
        };
        modalEl.classList.remove('hidden');
        resetEditor();
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Kunde inte läsa bilden'));
      };
      img.src = url;
    });
  }

  window.AvatarImageCrop = {
    openFromFile: openFromFile,
  };
})();
