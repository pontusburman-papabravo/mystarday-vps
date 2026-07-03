/**
 * child-memory-hall.js — Minneshallen playable scaffold (world 3).
 * Not mounted in child-dashboard until BL-012 creative approval.
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
      '<p class="mu-empty-message" role="status">Här blir det plats för minnen.</p>' +
    '</div>';
  }

  function renderExhibitSlots(slots) {
    if (!slots || !slots.length) return '';
    const items = slots.map(function (slot) {
      return '<div class="mu-exhibit mu-exhibit--' + esc(slot.slot_type || 'unknown') + '"' +
        ' role="listitem" data-slot="' + esc(slot.slot_id || '') + '"' +
        ' aria-label="' + esc(slot.label_sv || slot.slot_id || '') + '">' +
        '<span class="mu-exhibit-label">' + esc(slot.label_sv || '') + '</span>' +
        '</div>';
    }).join('');
    return '<div class="mu-exhibits" role="list" aria-label="Utställningar">' + items + '</div>';
  }

  function renderScene(state) {
    if (!state) return renderEmptyState();
    const hasScenery = state.scenery && state.scenery.length;
    const hasExhibits = state.exhibits && state.exhibits.length;
    if (!hasScenery && !hasExhibits) return renderEmptyState();

    const title = state.display_name || 'Minneshallen';
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
        showFeedback(root, scenery.ambient_message_sv || scenery.label_sv || '');
      });
    });
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

  async function mount(container) {
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
