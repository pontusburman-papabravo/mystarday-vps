/**
 * child-family-hall-legacy.js — Familjehall V0 fallback (pre–Mina personer 10/10).
 * Shown when family lacks mina_personer_10_10 feature access.
 */
(function () {
  'use strict';

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    } catch (_) {
      return '';
    }
  }

  function renderProjects(projects) {
    if (!projects || !projects.length) {
      return '<p class="cfh-empty">Inga familjeprojekt ännu — föräldern kan lägga till ett gemensamt mål.</p>';
    }
    return projects.map(function (p) {
      const pct = p.targetValue > 0
        ? Math.min(100, Math.round((p.currentValue / p.targetValue) * 100))
        : 0;
      const contrib = (p.contributors || []).map(function (c) {
        return esc(c.name);
      }).join(', ');
      return '<div class="cfh-card">' +
        '<span class="cfh-card-emoji">' + esc(p.emoji || '🎯') + '</span>' +
        '<div class="cfh-card-body">' +
          '<div class="cfh-card-title">' + esc(p.title) + '</div>' +
          '<div class="cfh-progress-track"><div class="cfh-progress-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="cfh-card-sub">⭐ ' + (p.currentValue || 0) + ' / ' + (p.targetValue || 0) +
            (contrib ? ' · ' + contrib : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderStory(story) {
    if (!story || !story.length) {
      return '<p class="cfh-empty">Er familjeberättelse börjar när någon klarar ett uppdrag ✨</p>';
    }
    return story.map(function (s) {
      return '<div class="cfh-story-item">' +
        '<div class="cfh-story-date">📅 ' + formatDate(s.createdAt) + '</div>' +
        '<div class="cfh-story-text">' + esc(s.text) + '</div>' +
      '</div>';
    }).join('');
  }

  function renderChestSection(data) {
    if (data.chestEnabled === false) return '';
    return '<section class="cfh-section">' +
      '<h2 class="cfh-section-title">⭐ Familjeskista</h2>' +
      '<div class="cfh-chest">' +
        '<div class="cfh-chest-value">' + (data.chest || 0) + '</div>' +
        '<div class="cfh-chest-label">stjärnor tillsammans</div>' +
      '</div>' +
    '</section>';
  }

  function renderPersons(data) {
    const persons = data.persons;
    if (!persons) return '';
    let cards = '';
    (persons.parents || []).forEach(function (p) {
      cards += '<div class="cfh-person-card"><span class="cfh-person-emoji">' + esc(p.emoji || '👤') + '</span>' +
        '<span class="cfh-person-name">' + esc(p.name) + '</span><span class="cfh-person-role">Vuxen</span></div>';
    });
    (persons.siblings || []).forEach(function (s) {
      cards += '<div class="cfh-person-card"><span class="cfh-person-emoji">' + esc(s.emoji || '⭐') + '</span>' +
        '<span class="cfh-person-name">' + esc(s.name) + '</span><span class="cfh-person-role">Syskon</span></div>';
    });
    if (!cards) {
      return '<p class="cfh-empty">Här visas familjen som hjälper dig varje dag.</p>';
    }
    return '<div class="cfh-person-grid">' + cards + '</div>';
  }

  function render(data) {
    return '<div class="cfh-shell" data-cfh-legacy="true">' +
      '<div class="cfh-header">' +
        '<div class="cfh-title">🏡 Familjehallen</div>' +
        '<div class="cfh-subtitle">Vad bygger vi tillsammans?</div>' +
      '</div>' +
      '<section class="cfh-section">' +
        '<h2 class="cfh-section-title">❤️ Mina personer</h2>' +
        renderPersons(data) +
      '</section>' +
      '<section class="cfh-section">' +
        '<h2 class="cfh-section-title">🎯 Familjeprojekt</h2>' +
        renderProjects(data.projects) +
      '</section>' +
      renderChestSection(data) +
      '<section class="cfh-section">' +
        '<h2 class="cfh-section-title">📖 Familjens berättelse</h2>' +
        renderStory(data.story) +
      '</section>' +
    '</div>';
  }

  window.ChildFamilyHallLegacy = { render: render };
})();
