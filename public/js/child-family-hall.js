/**
 * child-family-hall.js — Family layer V0 (read-only shell, mock data).
 * NO star calculations, NO event writes, NO backend mutations.
 */
(function () {
  'use strict';

  var familyMock = {
    projects: [
      { id: 'p1', emoji: '🌱', title: 'Plantera blommor', progress: 0, note: 'Kommer snart — familjeprojekt' },
      { id: 'p2', emoji: '📚', title: 'Bygga bokhörna', progress: 0, note: 'Kommer snart' },
    ],
    story: [
      { id: 's1', date: '—', text: 'Er familjeberättelse börjar här när ni testar tillsammans.' },
    ],
    chest: 0,
  };

  var _mounted = false;

  function render() {
    var projectsHtml = familyMock.projects.map(function (p) {
      return '<div class="cfh-card cfh-card-muted">' +
        '<span class="cfh-card-emoji">' + p.emoji + '</span>' +
        '<div class="cfh-card-body">' +
          '<div class="cfh-card-title">' + p.title + '</div>' +
          '<div class="cfh-card-sub">' + p.note + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    var storyHtml = familyMock.story.map(function (s) {
      return '<div class="cfh-story-item">' +
        '<div class="cfh-story-date">📅 ' + s.date + '</div>' +
        '<div class="cfh-story-text">' + s.text + '</div>' +
      '</div>';
    }).join('');

    return '<div class="cfh-shell">' +
      '<div class="cfh-header">' +
        '<div class="cfh-title">🏡 Familjehallen</div>' +
        '<div class="cfh-subtitle">Vad bygger vi tillsammans?</div>' +
      '</div>' +
      '<section class="cfh-section">' +
        '<h2 class="cfh-section-title">🎯 Familjeprojekt</h2>' +
        '<p class="cfh-section-hint">Förhandsvisning — inget sparas ännu</p>' +
        projectsHtml +
      '</section>' +
      '<section class="cfh-section">' +
        '<h2 class="cfh-section-title">⭐ Familjeskista</h2>' +
        '<div class="cfh-chest">' +
          '<div class="cfh-chest-value">' + familyMock.chest + '</div>' +
          '<div class="cfh-chest-label">gemensamma stjärnor (auto-aggregat — ej aktivt)</div>' +
        '</div>' +
      '</section>' +
      '<section class="cfh-section">' +
        '<h2 class="cfh-section-title">📖 Familjens berättelse</h2>' +
        storyHtml +
      '</section>' +
    '</div>';
  }

  function mount() {
    var root = document.getElementById('familyHallMount');
    if (!root) return;
    if (!_mounted) {
      root.innerHTML = render();
      _mounted = true;
    }
  }

  window.ChildFamilyHall = {
    mount: mount,
    getMock: function () { return familyMock; },
  };
})();
