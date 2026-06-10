/**
 * child-museum.js — Familjemuseum + årsberättelse (V4).
 */
(function () {
  'use strict';

  function renderYearStory(story) {
    if (!story) return '';
    var lines = [];
    lines.push('<div class="cu-museum-stat"><span class="cu-museum-num">' + story.completions + '</span><span class="cu-museum-lbl">aktiviteter ' + story.year + '</span></div>');

    (story.redemptions || []).forEach(function (r) {
      var d = new Date(r.created_at);
      var ds = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      lines.push('<div class="skatt-story-card"><div class="skatt-story-date">📅 ' + ds + '</div>' +
        '<div class="skatt-story-text">' + (r.icon || '🎁') + ' Du låste upp <strong>' + (r.name || '') + '</strong>!</div></div>');
    });

    (story.achievements || []).forEach(function (a) {
      var d = new Date(a.unlocked_at);
      var ds = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      lines.push('<div class="skatt-story-card"><div class="skatt-story-date">📅 ' + ds + '</div>' +
        '<div class="skatt-story-text">' + (a.emoji || '🏆') + ' <strong>' + (a.name || '') + '</strong></div></div>');
    });

    return lines.join('');
  }

  function renderRoom(universe) {
    var stats = universe.stats || {};
    var story = universe.year_story || {};
    var topRewards = '';

    return '<div class="skatt-section cu-museum-room">' +
      '<div class="skatt-section-header">' +
        '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#ffeaa7,#fdcb6e);">🏛️</div>' +
        '<span class="skatt-section-title" style="color:#d4a017;">Familjemuseum</span>' +
      '</div>' +
      '<div class="skatt-section-body">' +
        '<div class="cu-museum-hero">' +
          '<div class="cu-museum-stat"><span class="cu-museum-num">' + (stats.lifetime_stars || 0) + '</span><span class="cu-museum-lbl">⭐ tjänat totalt</span></div>' +
          '<div class="cu-museum-stat"><span class="cu-museum-num">' + (stats.completions || 0) + '</span><span class="cu-museum-lbl">aktiviteter klara</span></div>' +
          '<div class="cu-museum-stat"><span class="cu-museum-num">' + (stats.redemptions || 0) + '</span><span class="cu-museum-lbl">belöningar</span></div>' +
          '<div class="cu-museum-stat"><span class="cu-museum-num">' + ((universe.achievements || []).length) + '</span><span class="cu-museum-lbl">trofeer</span></div>' +
        '</div>' +
        '<h3 class="cu-museum-year-title">📖 Din berättelse ' + (story.year || new Date().getFullYear()) + '</h3>' +
        '<div class="skatt-story-album">' + renderYearStory(story) + '</div>' +
      '</div></div>';
  }

  window.ChildMuseum = { renderRoom: renderRoom };
})();
