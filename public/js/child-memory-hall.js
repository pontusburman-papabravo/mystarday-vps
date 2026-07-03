/**
 * child-memory-hall.js — Minnesrummet (world 3) — warm pride, not stats.
 * Dev-gated via memory_hall_playable. BL-012 approved.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/memory-hall';
  const TAP_RESET_MS = 1800;

  let _active = false;
  let _state = null;
  let _prefersReducedMotion = false;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function renderEmptyState() {
    return '<div class="mu-scene mu-scene--empty" data-world="memory_hall">' +
      '<p class="mu-empty-message" role="status">' +
        'Här växer minnen när du gör saker du är stolt över.' +
      '</p>' +
    '</div>';
  }

  function renderExhibitSlots(slots) {
    if (!slots || !slots.length) return '';
    const items = slots.map(function (slot) {
      const emoji = (slot.content && slot.content.emoji) ? slot.content.emoji : '✨';
      const title = (slot.content && slot.content.title) || slot.label_sv || '';
      return '<div class="mu-exhibit mu-exhibit--' + esc(slot.slot_type || 'unknown') + '"' +
        ' role="listitem" data-slot="' + esc(slot.slot_id || '') + '"' +
        ' aria-label="' + esc(title) + '">' +
        '<span class="mu-exhibit-emoji" aria-hidden="true">' + esc(emoji) + '</span>' +
        '<span class="mu-exhibit-label">' + esc(title) + '</span>' +
        '</div>';
    }).join('');
    return '<div class="mu-exhibits" role="list" aria-label="Mina minnen">' + items + '</div>';
  }

  function renderScene(state) {
    if (!state) return renderEmptyState();
    const hasScenery = state.scenery && state.scenery.length;
    const hasExhibits = state.exhibits && state.exhibits.length;
    if (!hasScenery && !hasExhibits) return renderEmptyState();

    const title = state.display_name || 'Minnesrummet';
    const intro = state.first_enter_message || '';

    const sceneryHtml = hasScenery ? (state.scenery || []).map(function (s) {
      const id = s.scenery_id || '';
      const hotspotClass = s.hotspot_class || 'mu-hotspot';
      return '<button type="button" class="mu-hotspot ' + esc(hotspotClass) + '"' +
        ' data-scenery="' + esc(id) + '"' +
        ' aria-label="' + esc(s.label_sv || id) + '"></button>';
    }).join('') : '';

    return '<div class="mu-scene" data-world="memory_hall" role="img" aria-label="' + esc(title) + '">' +
      '<div class="mu-scene-canvas" aria-hidden="true"></div>' +
      sceneryHtml +
      renderExhibitSlots(state.exhibits) +
      '<div class="mu-scene-status" id="muSceneStatus" role="status" aria-live="polite" aria-atomic="true"></div>' +
      (intro ? '<p class="mu-scene-intro">' + esc(intro) + '</p>' : '') +
      '<button type="button" class="mu-back-fab" id="muBackGarden" aria-label="Tillbaka till trädgården">' +
        '<span class="mu-back-icon" aria-hidden="true"></span>' +
      '</button>' +
    '</div>';
  }

  function showFeedback(root, message) {
    if (!root || !message) return;
    const status = root.querySelector('#muSceneStatus');
    if (!status) return;
    status.textContent = message;
    setTimeout(function () {
      if (status.textContent === message) status.textContent = '';
    }, TAP_RESET_MS);
  }

  function bindInteractions(root, state) {
    if (!root || !state) return;
    root.querySelectorAll('.mu-hotspot').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-scenery');
        const scenery = (state.scenery || []).find(function (s) { return s.scenery_id === id; });
        if (!scenery) return;
        if (!_prefersReducedMotion) {
          btn.classList.add('is-tapped');
          setTimeout(function () { btn.classList.remove('is-tapped'); }, TAP_RESET_MS);
        }
        showFeedback(root, scenery.ambient_message || scenery.label_sv || '');
      });
    });

    const backBtn = root.querySelector('#muBackGarden');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (window.LivingWorldTransition
            && typeof window.LivingWorldTransition.activeWorld === 'function'
            && window.LivingWorldTransition.activeWorld() === 'memory_hall'
            && typeof window.LivingWorldTransition.exitMemoryHall === 'function') {
          window.LivingWorldTransition.exitMemoryHall();
          return;
        }
        deactivate();
      });
    }
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
    const loader = document.getElementById('skattkammarLoading');
    const view = document.getElementById('skattkammarView');
    if (loader) loader.style.display = 'none';
    if (view) view.style.display = '';
  }

  async function mount(container, opts) {
    const root = container || document.getElementById('skattkammarView');
    if (!root) return false;

    const state = await fetchState();
    if (!state || !state.enabled) return false;

    _prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _state = state;
    _active = true;
    root.innerHTML = renderScene(state);
    bindInteractions(root, state);
    hideLoader();
    document.body.classList.add('child-memory-hall-active');
    document.body.classList.remove('child-morgonhus-active', 'child-garden-active');
    return true;
  }

  function deactivate() {
    _active = false;
    _state = null;
    document.body.classList.remove('child-memory-hall-active');
  }

  function isActive() {
    return _active;
  }

  window.ChildMemoryHall = {
    API_PATH: API_PATH,
    renderScene: renderScene,
    renderEmptyState: renderEmptyState,
    renderExhibitSlots: renderExhibitSlots,
    mount: mount,
    deactivate: deactivate,
    isActive: isActive,
  };
})();
