/**
 * child-family-hall.js — Mina personer 10/10 (read-only, resolveFamilyState-driven).
 * All data from GET /api/me/family — NO mocks, NO UI writes.
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

  function resolveState(data) {
    if (typeof window.resolveFamilyState === 'function') {
      return window.resolveFamilyState(data, { now: Date.now() });
    }
    return { state: 'together', persons: [], personCount: 0, statusLine: '', togetherLine: '' };
  }

  function personAvatarHtml(person) {
    if (person.avatarUrl) {
      return '<img class="cfh-person-photo" src="' + esc(person.avatarUrl) + '" alt="" loading="lazy" decoding="async" />';
    }
    return '<span class="cfh-person-emoji" aria-hidden="true">' + esc(person.emoji || '👤') + '</span>';
  }

  function renderPersonCards(state) {
    if (!state.persons.length) {
      return '<p class="cfh-empty cfh-empty-hero">Här visas de som hjälper dig varje dag.</p>';
    }
    return '<div class="cfh-person-grid" role="list">' + state.persons.map(function (person) {
      const awayCls = person.away ? ' cfh-person-card--away' : '';
      const highlightCls = state.highlightPersonKey === person.key ? ' cfh-person-card--highlight' : '';
      return '<div class="cfh-person-card' + awayCls + highlightCls + '" role="listitem">' +
        personAvatarHtml(person) +
        '<span class="cfh-person-name">' + esc(person.name) + '</span>' +
        '<span class="cfh-person-role">' + esc(person.roleLabel) + '</span>' +
        (person.away && person.awayLabel
          ? '<span class="cfh-person-away">' + esc(person.awayLabel) + '</span>'
          : '') +
      '</div>';
    }).join('') + '</div>';
  }

  function renderHero(state) {
    const warmCls = state.state === 'warm_moment' ? ' cfh-hero--warm' : '';
    return '<header class="cfh-hero' + warmCls + '">' +
      '<h1 class="cfh-title">❤️ Mina personer</h1>' +
      '<p class="cfh-subtitle">De som hjälper mig</p>' +
      (state.statusLine
        ? '<p class="cfh-status">' + esc(state.statusLine) + '</p>'
        : '') +
      (state.togetherLine && state.state !== 'growing_circle'
        ? '<p class="cfh-together-line">' + esc(state.togetherLine) + '</p>'
        : '') +
    '</header>';
  }

  function renderProjects(projects) {
    if (!projects || !projects.length) {
      return '<p class="cfh-empty">Inga gemensamma mål just nu.</p>';
    }
    return projects.map(function (p) {
      return '<div class="cfh-card cfh-card-muted">' +
        '<span class="cfh-card-emoji">' + esc(p.emoji || '🎯') + '</span>' +
        '<div class="cfh-card-body">' +
          '<div class="cfh-card-title">' + esc(p.title) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderStory(story) {
    if (!story || !story.length) {
      return '<p class="cfh-empty">Er berättelse börjar när ni gör något tillsammans ✨</p>';
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
    return '<section class="cfh-section cfh-section-muted">' +
      '<h3 class="cfh-section-title">⭐ Tillsammans</h3>' +
      '<p class="cfh-section-hint">Ni samlar stjärnor som familj — utan jämförelse.</p>' +
      '<div class="cfh-chest cfh-chest-muted">' +
        '<div class="cfh-chest-value">' + (data.chest || 0) + '</div>' +
        '<div class="cfh-chest-label">stjärnor tillsammans</div>' +
      '</div>' +
    '</section>';
  }

  function renderBelowFold(data) {
    const hasSecondary = (data.projects && data.projects.length) ||
      (data.story && data.story.length) ||
      data.chestEnabled !== false;
    if (!hasSecondary) return '';

    return '<details class="cfh-below-fold">' +
      '<summary class="cfh-below-fold-summary">Tidigare stunder och gemensamma mål</summary>' +
      '<div class="cfh-below-fold-body">' +
        '<section class="cfh-section cfh-section-muted">' +
          '<h3 class="cfh-section-title">🎯 Gemensamma mål</h3>' +
          renderProjects(data.projects) +
        '</section>' +
        renderChestSection(data) +
        '<section class="cfh-section cfh-section-muted">' +
          '<h3 class="cfh-section-title">📖 Våra stunder</h3>' +
          renderStory(data.story) +
        '</section>' +
      '</div>' +
    '</details>';
  }

  function renderLoading() {
    return '<div class="cfh-shell cfh-loading">' +
      '<p class="text-4xl mb-3" aria-hidden="true">❤️</p>' +
      '<p class="text-text-soft">Laddar dina personer...</p>' +
    '</div>';
  }

  function renderError() {
    return '<div class="cfh-shell cfh-error">' +
      '<p class="text-4xl mb-3" aria-hidden="true">😴</p>' +
      '<p class="text-navy font-semibold">Kunde inte ladda Mina personer</p>' +
      '<p class="text-text-soft text-sm mt-2">Försök igen om en stund.</p>' +
      '<button type="button" id="cfhRetryBtn" class="mt-4 px-4 py-2 rounded-xl bg-gold text-white font-semibold text-sm min-h-[44px]">Försök igen</button>' +
    '</div>';
  }

  function render(data) {
    const state = resolveState(data);
    return '<div class="cfh-shell" data-cfh-state="' + esc(state.state) + '">' +
      renderHero(state) +
      '<section class="cfh-persons-primary" aria-label="Mina personer">' +
        renderPersonCards(state) +
      '</section>' +
      renderBelowFold(data) +
    '</div>';
  }

  function mount() {
    const root = document.getElementById('familyHallMount');
    if (!root || !window.ChildFamily) return;

    root.innerHTML = renderLoading();

    ChildFamily.load()
      .then(function (data) {
        root.innerHTML = render(data);
      })
      .catch(function () {
        root.innerHTML = renderError();
        const retry = document.getElementById('cfhRetryBtn');
        if (retry) retry.addEventListener('click', refresh);
      });
  }

  function refresh() {
    if (!window.ChildFamily) return Promise.resolve();
    ChildFamily.invalidate();
    mount();
    return Promise.resolve();
  }

  window.ChildFamilyHall = {
    mount: mount,
    refresh: refresh,
  };
})();
