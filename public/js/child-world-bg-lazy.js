/**
 * child-world-bg-lazy.js — Defer non-default illustrated backgrounds until layer visit.
 * Idag (today) loads immediately; Min värld + Familj load on first navigation.
 */
(function () {
  'use strict';

  const BG = {
    world: '/images/child/world/hub@2x.webp',
    family: '/images/child/family/hall@2x.webp',
  };

  const loaded = {};

  function layerToKey(layer) {
    if (layer === 'home' || layer === 'universe' || layer === 'world') return 'world';
    if (layer === 'family') return 'family';
    return null;
  }

  function loadBg(key) {
    if (!BG[key] || loaded[key]) return;
    loaded[key] = true;
    const el = document.querySelector('.cwb-' + key);
    if (!el) return;
    const img = new Image();
    img.onload = function () {
      el.classList.add('is-bg-loaded');
    };
    img.src = BG[key];
  }

  function onLayer(layer) {
    const key = layerToKey(layer);
    if (key) loadBg(key);
  }

  function watchLayer() {
    onLayer(document.documentElement.getAttribute('data-child-layer') || 'today');
    const obs = new MutationObserver(function () {
      onLayer(document.documentElement.getAttribute('data-child-layer') || 'today');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-child-layer'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchLayer);
  } else {
    watchLayer();
  }
})();
