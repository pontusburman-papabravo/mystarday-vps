/**
 * library-image-crop.js — pan/zoom crop before upload (barnvy aspect preview).
 */
(function () {
  'use strict';

  /** Match barnvy photo-activity-card (~12:5). */
  const ASPECT = 12 / 5;
  const EXPORT_W = 960;
  const EXPORT_H = Math.round(EXPORT_W / ASPECT);

  const state = {
    img: null,
    resolve: null,
    baseScale: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    drag: null,
    objectUrl: null,
  };

  function $(id) { return document.getElementById(id); }

  function getScale() { return state.baseScale * state.zoom; }
  function dispW() { return state.img.naturalWidth * getScale(); }
  function dispH() { return state.img.naturalHeight * getScale(); }

  function viewportEl() { return $('imageCropViewport'); }

  function clampPan() {
    const vp = viewportEl();
    if (!vp || !state.img) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    state.panX = Math.min(0, Math.max(vw - dispW(), state.panX));
    state.panY = Math.min(0, Math.max(vh - dispH(), state.panY));
  }

  function centerImage() {
    const vp = viewportEl();
    if (!vp || !state.img) return;
    state.panX = (vp.clientWidth - dispW()) / 2;
    state.panY = (vp.clientHeight - dispH()) / 2;
    clampPan();
  }

  function layoutImage() {
    const el = $('imageCropImg');
    if (!el || !state.img) return;
    const s = getScale();
    el.style.width = (state.img.naturalWidth * s) + 'px';
    el.style.height = (state.img.naturalHeight * s) + 'px';
    el.style.left = state.panX + 'px';
    el.style.top = state.panY + 'px';
    drawPreview();
  }

  function cropSourceRect() {
    const vp = viewportEl();
    const scale = getScale();
    return {
      sx: -state.panX / scale,
      sy: -state.panY / scale,
      sw: vp.clientWidth / scale,
      sh: vp.clientHeight / scale,
    };
  }

  function drawToCanvas(canvas) {
    if (!state.img || !canvas) return;
    const r = cropSourceRect();
    canvas.width = EXPORT_W;
    canvas.height = EXPORT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(state.img, r.sx, r.sy, r.sw, r.sh, 0, 0, EXPORT_W, EXPORT_H);
  }

  function drawPreview() {
    const canvas = $('imageCropBarnvyPreview');
    if (!canvas || !state.img) return;
    const mini = $('imageCropBarnvyPreviewWrap');
    const w = mini ? Math.min(mini.clientWidth, 280) : 200;
    const h = Math.round(w / ASPECT);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const r = cropSourceRect();
    ctx.drawImage(state.img, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
  }

  function setZoom(zoom) {
    if (!state.img) return;
    const vp = viewportEl();
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const oldScale = getScale();
    const ix = (cx - state.panX) / oldScale;
    const iy = (cy - state.panY) / oldScale;
    state.zoom = zoom;
    state.panX = cx - ix * getScale();
    state.panY = cy - iy * getScale();
    clampPan();
    layoutImage();
    const slider = $('imageCropZoom');
    if (slider) slider.value = String(zoom);
  }

  function resetEditor() {
    if (!state.img) return;
    const vp = viewportEl();
    state.baseScale = Math.max(
      vp.clientWidth / state.img.naturalWidth,
      vp.clientHeight / state.img.naturalHeight
    );
    state.zoom = 1;
    const slider = $('imageCropZoom');
    if (slider) slider.value = '1';
    centerImage();
    layoutImage();
  }

  function cleanup() {
    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }
    state.img = null;
    state.resolve = null;
    const el = $('imageCropImg');
    if (el) {
      el.removeAttribute('src');
      el.style.width = '';
      el.style.height = '';
      el.style.left = '';
      el.style.top = '';
    }
  }

  function closeModal(result) {
    const modal = $('imageCropModal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('image-crop-open');
    const resolver = state.resolve;
    cleanup();
    if (typeof resolver === 'function') resolver(result);
  }

  function showModal() {
    const modal = $('imageCropModal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('image-crop-open');
    }
  }

  function loadImageFromFile(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      state.objectUrl = url;
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        state.objectUrl = null;
        reject(new Error('Kunde inte läsa bilden'));
      };
      img.src = url;
    });
  }

  function loadImageFromUrl(url) {
    if (!url) return Promise.reject(new Error('Ingen bild-URL'));

    function blobToImage(blob) {
      return loadImageFromFile(new File([blob], 'recrop.jpg', { type: blob.type || 'image/jpeg' }));
    }

    let absolute = url;
    try {
      absolute = new URL(url, window.location.origin).href;
    } catch (_) {
      return Promise.reject(new Error('Ogiltig bild-URL'));
    }

    const sameOrigin = absolute.indexOf(window.location.origin) === 0;

    if (sameOrigin) {
      return fetch(absolute, { credentials: 'include' })
        .then(function (res) {
          if (!res.ok) throw new Error('Kunde inte hämta bilden');
          return res.blob();
        })
        .then(blobToImage);
    }

    const fetchFn = window.apiFetch || fetch;
    const proxyPath = '/api/family/images/source?url=' + encodeURIComponent(url);
    return fetchFn(proxyPath, { credentials: 'include' })
      .then(function (res) {
        if (!res.ok) throw new Error('Kunde inte hämta bilden');
        return res.blob();
      })
      .then(blobToImage);
  }

  function openEditor(img) {
    return new Promise(function (resolve) {
      state.resolve = resolve;
      state.img = img;
      const el = $('imageCropImg');
      if (el) el.src = img.src;
      showModal();
      requestAnimationFrame(function () {
        resetEditor();
      });
    });
  }

  function open(file) {
    if (!file) return Promise.resolve(null);
    return loadImageFromFile(file).then(function (img) {
      return openEditor(img);
    }).catch(function (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Kunde inte öppna bilden', true);
      return null;
    });
  }

  function openFromUrl(url) {
    if (!url) return Promise.resolve(null);
    return loadImageFromUrl(url).then(function (img) {
      return openEditor(img);
    }).catch(function (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Kunde inte öppna bilden', true);
      return null;
    });
  }

  function exportFile() {
    return new Promise(function (resolve, reject) {
      const canvas = document.createElement('canvas');
      try {
        drawToCanvas(canvas);
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error('Kunde inte spara beskärningen'));
            return;
          }
          resolve(new File([blob], 'aktivitet.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
      } catch (err) {
        reject(err);
      }
    });
  }

  function onPointerDown(e) {
    if (!state.img) return;
    const vp = viewportEl();
    if (!vp) return;
    state.drag = {
      x: e.clientX,
      y: e.clientY,
      panX: state.panX,
      panY: state.panY,
    };
    vp.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!state.drag) return;
    state.panX = state.drag.panX + (e.clientX - state.drag.x);
    state.panY = state.drag.panY + (e.clientY - state.drag.y);
    clampPan();
    layoutImage();
  }

  function onPointerUp(e) {
    if (!state.drag) return;
    const vp = viewportEl();
    if (vp) {
      try { vp.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
    state.drag = null;
  }

  function bindUi() {
    const vp = viewportEl();
    if (vp) {
      vp.addEventListener('pointerdown', onPointerDown);
      vp.addEventListener('pointermove', onPointerMove);
      vp.addEventListener('pointerup', onPointerUp);
      vp.addEventListener('pointercancel', onPointerUp);
    }
    const slider = $('imageCropZoom');
    if (slider) {
      slider.addEventListener('input', function () {
        setZoom(parseFloat(slider.value, 10) || 1);
      });
    }
    const cancelBtn = $('imageCropCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { closeModal(null); });
    const confirmBtn = $('imageCropConfirmBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        confirmBtn.disabled = true;
        exportFile().then(function (file) {
          closeModal(file);
        }).catch(function (err) {
          if (typeof showToast === 'function') showToast(err.message || 'Kunde inte spara', true);
        }).finally(function () {
          confirmBtn.disabled = false;
        });
      });
    }
    const modal = $('imageCropModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal(null);
      });
    }
    window.addEventListener('resize', function () {
      if (state.img && modal && !modal.classList.contains('hidden')) {
        resetEditor();
      }
    });
  }

  function init() {
    bindUi();
  }

  window.LibraryImageCrop = {
    init: init,
    open: open,
    openFromUrl: openFromUrl,
    aspect: ASPECT,
  };
})();
