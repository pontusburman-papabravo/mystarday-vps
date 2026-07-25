/**
 * family-museum.js — Familjemuseum för föräldrar (V4).
 */
(function () {
  'use strict';

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function renderCard(data) {
    if (!data) return '';
    const rewards = (data.top_rewards || []).map(function (r) {
      return '<span class="fm-museum-reward-chip">' + esc(r.icon || '🎁') + ' ' + esc(r.name) +
        ' <em>' + esc(String(r.cnt)) + '×</em></span>';
    }).join('');

    return '<div class="fm-museum-card" id="familyMuseumCard">' +
      '<div class="fm-museum-head">' +
        '<div class="fm-museum-icon" aria-hidden="true">🏛️</div>' +
        '<div class="min-w-0">' +
          '<h2 class="fm-museum-title">' + esc(pt('family.museum.title')) + '</h2>' +
          '<p class="fm-museum-lead">' + esc(pt('family.museum.lead')) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="fm-museum-grid">' +
        '<div class="fm-museum-stat"><strong>' + (data.total_completions || 0) + '</strong><span>' + esc(pt('family.museum.stats.activities')) + '</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_redemptions || 0) + '</strong><span>' + esc(pt('family.museum.stats.rewards')) + '</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_stars_earned || 0) + '</strong><span>' + esc(pt('family.museum.stats.stars')) + '</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_achievements || 0) + '</strong><span>' + esc(pt('family.museum.stats.trophies')) + '</span></div>' +
      '</div>' +
      (rewards
        ? '<div class="fm-museum-rewards"><p class="fm-museum-rewards-label">' + esc(pt('family.museum.topRewards')) + '</p>' +
          '<div class="fm-museum-reward-chips">' + rewards + '</div></div>'
        : '') +
      '</div>';
  }

  function mount(containerId) {
    const el = document.getElementById(containerId);
    if (!el || !window.Auth) return;
    Auth.api('/api/family/museum').then(function (data) {
      const existing = document.getElementById('familyMuseumCard');
      if (existing) existing.remove();
      el.insertAdjacentHTML('afterbegin', renderCard(data));
    }).catch(function () {});
  }

  document.addEventListener('parent-i18n-ready', function () {
    const existing = document.getElementById('familyMuseumCard');
    if (existing) {
      mount('familyMuseumMount');
    }
  });

  window.FamilyMuseum = { mount: mount };
})();
