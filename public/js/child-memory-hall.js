/**
 * child-memory-hall.js — Minnesrummet (world 3) — warm pride, not stats.
 * Dev-gated via memory_hall_playable. BL-012 approved.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/memory-hall';
  const TAP_RESET_MS = 1800;
  const TOAST_MS = 6500;
  const MAX_WALL_FRAMES = 6;
  const ENTER_ANIM_MS = 650;

  let _active = false;
  let _state = null;
  let _prefersReducedMotion = false;
  let _assetCleanup = null;
  let _illustratedScene = false;

  function pipeline() {
    return window.MemoryHallAssetPipeline || null;
  }

  function scenePictureMarkup() {
    const p = pipeline();
    if (p && typeof p.scenePictureHtml === 'function') {
      return p.scenePictureHtml();
    }
    return '';
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function renderEmptyState() {
    return '<div class="mu-scene mu-scene--empty mu-scene--scaffold" data-world="memory_hall">' +
      renderScaffoldDecor() +
      '<header class="mu-scene-header">' +
        '<h1 class="mu-scene-title">Minnesrummet</h1>' +
        '<p class="mu-scene-subtitle">Här växer minnen när du gör saker du är stolt över.</p>' +
      '</header>' +
      '<div class="mu-memory-wall" role="list" aria-label="Mina minnen">' +
        renderEmptyFrames(3) +
      '</div>' +
      '<div class="mu-scene-toast mu-toast-off" id="muSceneToast" role="status" aria-live="polite"></div>' +
      '<button type="button" class="mu-back-fab" id="muBackGarden" aria-label="Tillbaka till trädgården">' +
        '<span class="mu-back-icon" aria-hidden="true"></span>' +
      '</button>' +
    '</div>';
  }

  function renderScaffoldDecor() {
    return '<div class="mu-scene-canvas" aria-hidden="true">' +
      '<div class="mu-room-bg"></div>' +
      '<div class="mu-room-window"></div>' +
      '<div class="mu-room-light"></div>' +
      '<div class="mu-room-floor"></div>' +
    '</div>';
  }

  function renderEmptyFrames(count) {
    var items = '';
    for (var i = 0; i < count; i += 1) {
      items += '<div class="mu-frame mu-frame--empty" role="listitem" aria-label="Tom ram">' +
        '<span class="mu-frame-inner" aria-hidden="true"></span>' +
      '</div>';
    }
    return items;
  }

  function exhibitTapMessage(slot) {
    if (!slot) return '';
    if (slot.slot_type === 'warm_echo') {
      return (slot.content && slot.content.toast)
        || 'Ett mjukt minne från en bra dag.';
    }
    var title = (slot.content && slot.content.title) || slot.label_sv || '';
    if (slot.slot_type === 'remembered_gift') {
      return title ? ('Du minns ' + title + '. Det var fint.') : 'Du minns något fint här.';
    }
    return 'Det här minnet betyder något för dig.';
  }

  function renderExhibitSlots(slots, opts) {
    var illustrated = opts && opts.illustrated;
    if (!slots || !slots.length) {
      return illustrated ? '' : renderEmptyFrames(3);
    }

    var filled = slots.slice(0, MAX_WALL_FRAMES).map(function (slot) {
      var emoji = (slot.content && slot.content.emoji) ? slot.content.emoji : '✨';
      var title = (slot.content && slot.content.title) || slot.label_sv || '';
      var message = exhibitTapMessage(slot);
      var overlayClass = illustrated ? ' mu-frame--overlay' : '';
      var warmClass = slot.slot_type === 'warm_echo' ? ' mu-frame--warm-echo' : '';
      return '<button type="button" class="mu-frame mu-frame--filled mu-frame--' + esc(slot.slot_type || 'unknown') + overlayClass + warmClass + '"' +
        ' role="listitem" data-slot="' + esc(slot.slot_id || '') + '"' +
        ' data-memory-message="' + esc(message) + '"' +
        ' aria-label="' + esc(title) + '">' +
        '<span class="mu-frame-inner">' +
          '<span class="mu-frame-emoji" aria-hidden="true">' + esc(emoji) + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    if (illustrated) {
      return '<div class="mu-exhibits mu-exhibits--illustrated" role="list" aria-label="Mina minnen">' + filled + '</div>';
    }

    var emptyCount = Math.max(0, Math.min(3, MAX_WALL_FRAMES - slots.length));
    return '<div class="mu-memory-wall" role="list" aria-label="Mina minnen">' +
      filled + renderEmptyFrames(emptyCount) +
    '</div>';
  }

  function renderScaffoldHeader(state) {
    var title = state.display_name || 'Minnesrummet';
    var intro = state.first_enter_message || 'Här finns det du varit stolt över.';
    return '<header class="mu-scene-header">' +
      '<h1 class="mu-scene-title">' + esc(title) + '</h1>' +
      '<p class="mu-scene-subtitle">' + esc(intro) + '</p>' +
    '</header>';
  }

  function renderScene(state, opts) {
    if (!state) return renderEmptyState();
    var hasScenery = state.scenery && state.scenery.length;
    var hasExhibits = state.exhibits && state.exhibits.length;
    if (!hasScenery && !hasExhibits) return renderEmptyState();

    var illustrated = opts && opts.illustrated;
    var title = state.display_name || 'Minnesrummet';
    var intro = state.first_enter_message || '';

    var sceneryHtml = hasScenery ? (state.scenery || []).map(function (s) {
      var id = s.scenery_id || '';
      var hotspotClass = s.hotspot_class || 'mu-hotspot';
      return '<button type="button" class="mu-hotspot ' + esc(hotspotClass) + '"' +
        ' data-scenery="' + esc(id) + '"' +
        ' aria-label="' + esc(s.label_sv || id) + '"></button>';
    }).join('') : '';

    var sceneClass = 'mu-scene mu-scene--entering' +
      (illustrated ? ' mu-scene--illustrated' : ' mu-scene--scaffold');
    var canvasInner = illustrated ? scenePictureMarkup() : renderScaffoldDecor();

    if (!illustrated) {
      return '<div class="' + sceneClass + '" data-world="memory_hall" role="img" aria-label="' + esc(title) + '">' +
        canvasInner +
        renderScaffoldHeader(state) +
        renderExhibitSlots(state.exhibits, { illustrated: false }) +
        '<button type="button" class="mu-window-tap" data-scenery="memory_hall_window"' +
          ' aria-label="Fönstret">Fönstret</button>' +
        '<div class="mu-scene-toast mu-toast-off" id="muSceneToast" role="status" aria-live="polite"></div>' +
        '<div class="mu-scene-status" id="muSceneStatus" role="status" aria-live="polite" aria-atomic="true"></div>' +
        '<button type="button" class="mu-back-fab" id="muBackGarden" aria-label="Tillbaka till trädgården">' +
          '<span class="mu-back-icon" aria-hidden="true"></span>' +
        '</button>' +
      '</div>';
    }

    if (illustrated) {
      const wf = window.ChildWorldWayfinder;
      const slots = (state.exhibits || []).map(function (slot) {
        const copy = Object.assign({}, slot);
        copy._tapMessage = exhibitTapMessage(slot);
        return copy;
      });
      const sceneHtml = '<div class="' + sceneClass + '" data-world="memory_hall" role="img" aria-label="' + esc(title) + '">' +
        '<div class="mu-scene-canvas" aria-hidden="true">' + canvasInner + '</div>' +
        '<div class="mu-scene-toast mu-toast-off" id="muSceneToast" role="status" aria-live="polite"></div>' +
        '<div class="mu-scene-status" id="muSceneStatus" role="status" aria-live="polite" aria-atomic="true"></div>' +
      '</div>';
      if (!wf || typeof wf.render !== 'function') {
        return sceneHtml;
      }
      return '<div class="cww-shell">' +
        wf.render({
          placeId: 'memory_hall',
          placeLabel: title,
          placeIcon: '🖼️',
          back: { label: 'Tillbaka till Min värld', short: 'Min värld' },
        }) +
        '<div class="cww-scene-stage">' + sceneHtml + '</div>' +
        wf.renderMemoryPanel(slots) +
      '</div>';
    }

    return '';
  }

  function showToast(root, message) {
    if (!root || !message) return;
    var toast = root.querySelector('#muSceneToast');
    if (!toast) {
      showFeedback(root, message);
      return;
    }
    toast.textContent = message;
    toast.classList.remove('mu-toast-off');
    toast.classList.add('is-visible');
    clearTimeout(showToast._timer);
    function dismiss() {
      toast.classList.remove('is-visible');
      toast.classList.add('mu-toast-off');
      if (typeof toast.removeEventListener === 'function') {
        toast.removeEventListener('click', dismiss);
      }
    }
    if (toast.style) {
      toast.style.pointerEvents = 'auto';
      toast.style.cursor = 'pointer';
    }
    if (typeof toast.setAttribute === 'function') {
      toast.setAttribute('role', 'button');
      toast.setAttribute('aria-label', message + ' — tryck för att stänga');
    }
    if (typeof toast.addEventListener === 'function') {
      toast.addEventListener('click', dismiss);
    }
    showToast._timer = setTimeout(dismiss, TOAST_MS);
  }

  function showFeedback(root, message) {
    if (!root || !message) return;
    var status = root.querySelector('#muSceneStatus');
    if (!status) return;
    status.textContent = message;
    setTimeout(function () {
      if (status.textContent === message) status.textContent = '';
    }, TAP_RESET_MS);
  }

  function bindFrameInteractions(root) {
    if (!root) return;
    root.querySelectorAll('.mu-frame--filled').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var message = btn.getAttribute('data-memory-message') || '';
        if (!_prefersReducedMotion) {
          btn.classList.add('is-tapped');
          setTimeout(function () { btn.classList.remove('is-tapped'); }, TAP_RESET_MS);
        }
        showToast(root, message);
      });
    });
    root.querySelectorAll('.mu-frame--empty').forEach(function (el) {
      el.addEventListener('click', function () {
        showToast(root, 'Här kan ett nytt minne hänga snart.');
      });
    });
  }

  function bindInteractions(root, state) {
    if (!root || !state) return;

    var wf = window.ChildWorldWayfinder;
    if (wf && typeof wf.bind === 'function') {
      wf.bind(root, {
        onBack: function () {
          deactivate();
          if (window.LivingWorldTransition
              && typeof window.LivingWorldTransition.exitMemoryHall === 'function'
              && window.LivingWorldTransition.activeWorldId
              && window.LivingWorldTransition.activeWorldId() === 'memory_hall') {
            window.LivingWorldTransition.exitMemoryHall();
            return;
          }
          if (window.ChildWorldHub && typeof window.ChildWorldHub.show === 'function') {
            window.ChildWorldHub.show();
          }
        },
      });
    }
    if (wf && typeof wf.bindMemoryPanel === 'function') {
      wf.bindMemoryPanel(root, function (message) {
        showToast(root, message);
      });
    }

    root.querySelectorAll('.mu-hotspot, .mu-window-tap').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-scenery');
        var scenery = (state.scenery || []).find(function (s) { return s.scenery_id === id; });
        var message = scenery
          ? (scenery.ambient_message_sv || scenery.ambient_message || scenery.label_sv || '')
          : 'Ljuset faller mjukt in.';
        if (!_prefersReducedMotion) {
          btn.classList.add('is-tapped');
          setTimeout(function () { btn.classList.remove('is-tapped'); }, TAP_RESET_MS);
        }
        showToast(root, message);
      });
    });

    bindFrameInteractions(root);

    var backBtn = root.querySelector('#muBackGarden');
    if (backBtn && !(wf && typeof wf.bind === 'function')) {
      backBtn.addEventListener('click', function () {
        if (window.LivingWorldTransition
            && typeof window.LivingWorldTransition.activeWorldId === 'function'
            && window.LivingWorldTransition.activeWorldId() === 'memory_hall'
            && typeof window.LivingWorldTransition.exitMemoryHall === 'function') {
          window.LivingWorldTransition.exitMemoryHall();
          return;
        }
        deactivate();
      });
    }
  }

  function bindAssetWatch(root) {
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    var p = pipeline();
    if (!p || typeof p.watchSceneImage !== 'function') return;
    _assetCleanup = p.watchSceneImage(root, function () {
      console.warn('[memory-hall] scene-bg failed — falling back to scaffold');
      if (!_state) return;
      _illustratedScene = false;
      root.innerHTML = renderScene(_state, { illustrated: false });
      bindInteractions(root, _state);
      scheduleEnterAnimation(root);
    });
  }

  function scheduleEnterAnimation(root) {
    if (!root || _prefersReducedMotion) return;
    var scene = root.querySelector('.mu-scene--entering');
    if (!scene) return;
    setTimeout(function () {
      scene.classList.remove('mu-scene--entering');
    }, ENTER_ANIM_MS);
  }

  async function fetchState() {
    if (!window.Auth || typeof window.Auth.api !== 'function') return null;
    try {
      return await window.Auth.api(API_PATH);
    } catch (err) {
      if (err && err.status === 503) return null;
      console.warn('[memory-hall] fetch failed:', err && err.message);
      return null;
    }
  }

  function hideLoader() {
    var loader = document.getElementById('skattkammarLoading');
    var view = document.getElementById('skattkammarView');
    if (loader) loader.style.display = 'none';
    if (view) view.style.display = '';
  }

  async function mount(container, opts) {
    var root = container || document.getElementById('skattkammarView');
    if (!root) return false;

    var state = await fetchState();
    if (!state || !state.enabled) return false;

    var p = pipeline();
    var illustrated = false;
    if (p && typeof p.preloadScene === 'function') {
      illustrated = await p.preloadScene(5000);
    }

    _prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _state = state;
    _active = true;
    _illustratedScene = illustrated;
    root.innerHTML = renderScene(state, { illustrated: illustrated });
    bindInteractions(root, state);
    scheduleEnterAnimation(root);
    if (illustrated) {
      bindAssetWatch(root);
    }
    hideLoader();
    document.body.classList.add('child-memory-hall-active');
    document.body.classList.remove('child-morgonhus-active', 'child-garden-active');
    if (window.ChildWorldWayfinder && typeof window.ChildWorldWayfinder.setActivePlace === 'function') {
      window.ChildWorldWayfinder.setActivePlace(document, 'memory_hall');
    }
    return true;
  }

  function deactivate() {
    _active = false;
    _state = null;
    _illustratedScene = false;
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    document.body.classList.remove('child-memory-hall-active');
    if (window.ChildWorldWayfinder && typeof window.ChildWorldWayfinder.clearActivePlace === 'function') {
      window.ChildWorldWayfinder.clearActivePlace(document);
    }
  }

  function isActive() {
    return _active;
  }

  window.ChildMemoryHall = {
    API_PATH: API_PATH,
    renderScene: renderScene,
    renderEmptyState: renderEmptyState,
    renderExhibitSlots: renderExhibitSlots,
    exhibitTapMessage: exhibitTapMessage,
    mount: mount,
    deactivate: deactivate,
    isActive: isActive,
  };
})();
