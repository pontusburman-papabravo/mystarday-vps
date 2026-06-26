/**
 * family-museum.js — Familjemuseum för föräldrar (V4).
 */
(function () {
  'use strict';

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
          '<h2 class="fm-museum-title">Familjemuseum</h2>' +
          '<p class="fm-museum-lead">Allt ni uppnått tillsammans — minnen som växer.</p>' +
        '</div>' +
      '</div>' +
      '<div class="fm-museum-grid">' +
        '<div class="fm-museum-stat"><strong>' + (data.total_completions || 0) + '</strong><span>aktiviteter</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_redemptions || 0) + '</strong><span>belöningar</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_stars_earned || 0) + '</strong><span>stjärnor</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_achievements || 0) + '</strong><span>trofeer</span></div>' +
      '</div>' +
      (rewards
        ? '<div class="fm-museum-rewards"><p class="fm-museum-rewards-label">Mest inlösta belöningar</p>' +
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

  window.FamilyMuseum = { mount: mount };
})();
