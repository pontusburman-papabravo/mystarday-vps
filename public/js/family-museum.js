/**
 * family-museum.js — Familjemuseum för föräldrar (V4).
 */
(function () {
  'use strict';

  function renderCard(data) {
    if (!data) return '';
    var rewards = (data.top_rewards || []).map(function (r) {
      return '<div style="font-size:0.75rem;color:#5A6178;">' + (r.icon || '🎁') + ' ' + r.name + ' — <strong>' + r.cnt + '×</strong></div>';
    }).join('');

    return '<div class="fm-museum-card" id="familyMuseumCard">' +
      '<div class="fm-museum-title">🏛️ Familjemuseum</div>' +
      '<p style="font-size:0.78rem;color:#5A6178;margin:0 0 12px;">Allt ni uppnått tillsammans — minnen som växer.</p>' +
      '<div class="fm-museum-grid">' +
        '<div class="fm-museum-stat"><strong>' + (data.total_completions || 0) + '</strong><span style="font-size:0.65rem;color:#9AA0B8;">aktiviteter</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_redemptions || 0) + '</strong><span style="font-size:0.65rem;color:#9AA0B8;">belöningar</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_stars_earned || 0) + '</strong><span style="font-size:0.65rem;color:#9AA0B8;">⭐ tjänat</span></div>' +
        '<div class="fm-museum-stat"><strong>' + (data.total_achievements || 0) + '</strong><span style="font-size:0.65rem;color:#9AA0B8;">trofeer</span></div>' +
      '</div>' +
      (rewards ? '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #EDE7F6;">' + rewards + '</div>' : '') +
      '</div>';
  }

  function mount(containerId) {
    var el = document.getElementById(containerId);
    if (!el || !window.Auth) return;
    Auth.api('/api/family/museum').then(function (data) {
      el.insertAdjacentHTML('afterbegin', renderCard(data));
    }).catch(function () {});
  }

  window.FamilyMuseum = { mount: mount };
})();
