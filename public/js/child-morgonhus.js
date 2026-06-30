/**
 * child-morgonhus.js — Playable Morgonhuset scene (routine_home).
 * Uses Experience Pack props + Platform Runtime unlocked nodes when available.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/morgonhus';
  const REACTION_MS = 1800;

  let _active = false;
  let _skipForSession = false;
  let _state = null;
  let _prefersReducedMotion = false;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function propClasses(prop) {
    const classes = ['mh-prop', 'mh-prop--' + prop.prop_id];
    if (prop.unlocked) classes.push('is-unlocked');
    else classes.push('is-locked');
    if (prop.visual_token) classes.push('mh-token--' + prop.visual_token);
    return classes.join(' ');
  }

  function renderScene(state) {
    const props = (state && state.props) || [];
    const title = (state && state.display_name) || 'Morgonhuset';
    const intro = (state && state.first_enter_message) || '';

    const propButtons = props.map(function (prop) {
      const emoji = prop.prop_id === 'welcome_mat' ? '🧺'
        : prop.prop_id === 'first_light' ? '🪟'
        : prop.prop_id === 'door' ? '🚪' : '✨';
      return '<button type="button" class="' + propClasses(prop) + '"' +
        ' data-prop="' + esc(prop.prop_id) + '"' +
        ' data-node="' + esc(prop.node_id || '') + '"' +
        ' aria-label="' + esc(prop.label_sv) + '">' +
        '<span class="mh-prop-emoji" aria-hidden="true">' + emoji + '</span>' +
        '<span class="mh-prop-label">' + esc(prop.label_sv) + '</span>' +
        '</button>';
    }).join('');

    return '<div class="mh-scene" data-world="routine_home">' +
      '<div class="mh-scene-bg" aria-hidden="true"></div>' +
      '<div class="mh-scene-sun" aria-hidden="true"></div>' +
      '<header class="mh-scene-header">' +
        '<h1 class="mh-scene-title">' + esc(title) + '</h1>' +
        (intro ? '<p class="mh-scene-intro">' + esc(intro) + '</p>' : '') +
      '</header>' +
      '<div class="mh-scene-room" role="group" aria-label="Morgonhuset">' +
        propButtons +
      '</div>' +
      '<div class="mh-scene-toast hidden" id="mhSceneToast" role="status" aria-live="polite"></div>' +
      '<div class="mh-scene-footer">' +
        '<button type="button" class="mh-skatt-link" id="mhSkattLink">💎 Skattkammaren</button>' +
      '</div>' +
    '</div>';
  }

  function findProp(state, propId) {
    return (state.props || []).find(function (p) { return p.prop_id === propId; }) || null;
  }

  function showToast(root, message) {
    const toast = root.querySelector('#mhSceneToast');
    if (!toast || !message) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.classList.add('hidden');
    }, REACTION_MS);
  }

  function triggerReaction(btn, token) {
    if (_prefersReducedMotion) return;
    btn.classList.add('is-tapped');
    if (token) btn.classList.add('mh-token-active--' + token);
    setTimeout(function () {
      btn.classList.remove('is-tapped');
      if (token) btn.classList.remove('mh-token-active--' + token);
    }, REACTION_MS);
  }

  function applyUnlockedState(root, state) {
    if (!root || !state) return;
    (state.props || []).forEach(function (prop) {
      const btn = root.querySelector('[data-prop="' + prop.prop_id + '"]');
      if (!btn) return;
      btn.classList.toggle('is-unlocked', Boolean(prop.unlocked));
      btn.classList.toggle('is-locked', !prop.unlocked);
      if (prop.visual_token) {
        btn.classList.add('mh-token--' + prop.visual_token);
      }
    });
  }

  function bindInteractions(root, state, handlers) {
    if (!root || !state) return;

    const h = handlers || {};

    root.querySelectorAll('.mh-prop').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const propId = btn.getAttribute('data-prop');
        const prop = findProp(state, propId);
        if (!prop) return;

        if (prop.unlocked || prop.always_active) {
          triggerReaction(btn, prop.visual_token);
          const msg = prop.child_message || prop.ambient_message || 'Det händer något…';
          showToast(root, msg);
          if (h.onPropTap) h.onPropTap(prop);
          return;
        }

        triggerReaction(btn, null);
        showToast(root, prop.locked_hint || 'Inte redo än.');
        if (h.onLockedTap) h.onLockedTap(prop);
      });
    });

    const skattLink = root.querySelector('#mhSkattLink');
    if (skattLink && h.onSkattLink) {
      skattLink.addEventListener('click', h.onSkattLink);
    }
  }

  function hideLoader() {
    const loader = document.getElementById('skattkammarLoading');
    const view = document.getElementById('skattkammarView');
    if (loader) loader.style.display = 'none';
    if (view) view.style.display = '';
  }

  async function fetchState() {
    if (!window.Auth || typeof window.Auth.api !== 'function') return null;
    try {
      return await window.Auth.api(API_PATH);
    } catch (err) {
      if (err && err.status === 503) return null;
      console.warn('[morgonhus] fetch failed:', err && err.message);
      return null;
    }
  }

  function openSkattkammaren() {
    _active = false;
    _skipForSession = true;
    _state = null;
    document.body.classList.remove('child-morgonhus-active');
    if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      window.loadRewards();
    }
  }

  async function tryMountWorld() {
    if (_skipForSession) return false;
    const view = document.getElementById('skattkammarView');
    if (!view) return false;

    const state = await fetchState();
    if (!state || !state.enabled) return false;

    _prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _state = state;
    _active = true;
    view.innerHTML = renderScene(state);
    applyUnlockedState(view, state);
    bindInteractions(view, state, {
      onSkattLink: openSkattkammaren,
    });
    hideLoader();
    document.body.classList.add('child-morgonhus-active');
    return true;
  }

  async function refresh() {
    if (!_active) return false;
    const state = await fetchState();
    if (!state) return false;
    _state = state;
    const view = document.getElementById('skattkammarView');
    if (view) applyUnlockedState(view, state);
    return true;
  }

  function isActive() {
    return _active;
  }

  function init() {
    if (window.ChildEventBus) {
      window.ChildEventBus.on('ActivityCompleted', function () {
        if (_active) refresh();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ChildMorgonhus = {
    API_PATH: API_PATH,
    renderScene: renderScene,
    propClasses: propClasses,
    applyUnlockedState: applyUnlockedState,
    bindInteractions: bindInteractions,
    findProp: findProp,
    tryMountWorld: tryMountWorld,
    refresh: refresh,
    isActive: isActive,
    openSkattkammaren: openSkattkammaren,
  };
})();
