/**
 * child-family-hall.js — Mina personer 10/10 (read-only, resolveFamilyState-driven).
 * All data from GET /api/me/family — NO mocks, NO UI writes.
 */
(function () {
  'use strict';

  const FEATURE_SLUG = 'mina_personer_10_10';

  let _cachedData = null;
  let _warmTimer = null;
  let _v10Enabled = false;

  function fetchFeatures() {
    if (window.Auth && typeof Auth.api === 'function') {
      return Auth.api('/api/features').catch(function () { return []; });
    }
    return fetch('/api/features', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  function isV10Enabled(features) {
    return (features || []).some(function (f) { return f.slug === FEATURE_SLUG; });
  }

  function paint(root, data) {
    if (_v10Enabled) {
      const state = resolveState(data);
      root.innerHTML = render(data);
      scheduleWarmMomentRerender(data, state);
      return;
    }
    clearWarmTimer();
    if (window.ChildFamilyHallLegacy && ChildFamilyHallLegacy.render) {
      root.innerHTML = ChildFamilyHallLegacy.render(data);
      return;
    }
    root.innerHTML = render(data);
  }

  function clearWarmTimer() {
    if (_warmTimer) {
      clearTimeout(_warmTimer);
      _warmTimer = null;
    }
  }

  function scheduleWarmMomentRerender(data, state) {
    clearWarmTimer();
    if (!data || state.state !== 'warm_moment') return;
    const story = data.story && data.story[0];
    if (!story || !story.createdAt) return;
    const created = Date.parse(story.createdAt);
    if (!created) return;
    const limit = typeof window.WARM_MOMENT_MS === 'number' ? window.WARM_MOMENT_MS : 2000;
    const remaining = limit - (Date.now() - created);
    if (remaining <= 0) return;
    _warmTimer = setTimeout(function () {
      const root = document.getElementById('familyHallMount');
      if (root && _cachedData && _v10Enabled) {
        paint(root, _cachedData);
      }
    }, remaining + 40);
  }

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
    if (window.MemberAvatar && MemberAvatar.renderMemberAvatar) {
      const memberType = person.kind === 'parent' || person.kind === 'pedagog' ? 'parent' : 'child';
      const member = {
        id: person.id,
        name: person.name,
        emoji: person.emoji,
        avatar_src: person.avatarUrl || '',
        has_avatar: person.hasAvatar,
        type: memberType,
        member_type: memberType,
      };
      return MemberAvatar.renderMemberAvatar(member, 52, { memberType: memberType });
    }
    let src = person.avatarUrl || '';
    if (!src && person.hasAvatar && person.id) {
      const memberType = person.kind === 'parent' || person.kind === 'pedagog' ? 'parent' : 'child';
      src = '/api/avatars/' + memberType + '/' + person.id;
    }
    if (src) {
      return '<img class="cfh-person-photo" src="' + esc(src) + '" alt="" loading="lazy" decoding="async" />';
    }
    return '<span class="cfh-person-emoji" aria-hidden="true">' + esc(person.emoji || '👤') + '</span>';
  }

  function renderPersonCards(state) {
    if (!state.persons.length) {
      return '<p class="cfh-empty cfh-empty-hero">Här visas de som hjälper mig varje dag.</p>';
    }
    return '<div class="cfh-person-grid" role="list">' + state.persons.map(function (person) {
      const highlightCls = state.highlightPersonKey === person.key ? ' cfh-person-card--highlight' : '';
      const awayNote = person.cardNote || '';
      return '<div class="cfh-person-card' + highlightCls + '" role="listitem">' +
        personAvatarHtml(person) +
        '<span class="cfh-person-name">' + esc(person.name) + '</span>' +
        '<span class="cfh-person-role">' + esc(person.roleLabel) + '</span>' +
        (awayNote
          ? '<span class="cfh-person-away">' + esc(awayNote) + '</span>'
          : '') +
      '</div>';
    }).join('') + '</div>';
  }

  function renderHero(state) {
    return '<header class="cfh-hero cfh-hero-panel">' +
      '<h1 class="cfh-title">❤️ Mina personer</h1>' +
      '<p class="cfh-subtitle">De som hjälper mig</p>' +
    '</header>';
  }

  function renderWarmBanner(state) {
    if (state.state === 'warm_moment' && state.warmText) {
      return '<p class="cfh-warm-banner" role="status">' + esc(state.warmText) + '</p>';
    }
    if (state.state === 'away' && state.togetherLine) {
      return '<p class="cfh-warm-banner cfh-warm-banner--calm" role="status">' +
        esc(state.togetherLine) + '</p>';
    }
    if (state.statusLine) {
      return '<p class="cfh-warm-banner cfh-warm-banner--calm" role="status">' +
        esc(state.statusLine) + '</p>';
    }
    return '';
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

    const featured = story.filter(function (s) { return s.type === 'project_completed'; });
    const routine = story.filter(function (s) { return s.type !== 'project_completed'; });
    const recentRoutine = routine.slice(0, 4);
    const shownCount = Math.min(featured.length, 3) + recentRoutine.length;
    const moreCount = Math.max(0, story.length - shownCount);

    let html = '<p class="cfh-section-hint">Höjdpunkter från er vardag — lugna stunder, inte en prestationslista.</p>';

    if (featured.length) {
      html += '<div class="cfh-story-featured" aria-label="Gemensamma höjdpunkter">';
      featured.slice(0, 3).forEach(function (s) {
        html += '<div class="cfh-story-item cfh-story-item--featured">' +
          '<div class="cfh-story-date">🎉 ' + formatDate(s.createdAt) + '</div>' +
          '<div class="cfh-story-text">' + esc(s.text) + '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    if (recentRoutine.length) {
      html += '<div class="cfh-story-timeline" aria-label="Senaste vardagsstunder">';
      html += '<p class="cfh-story-timeline-kicker">Senaste från vardagen</p>';
      recentRoutine.forEach(function (s) {
        html += '<div class="cfh-story-chip">' +
          '<span class="cfh-story-chip-date">' + formatDate(s.createdAt) + '</span>' +
          '<span class="cfh-story-chip-text">' + esc(s.text) + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    if (moreCount > 0) {
      html += '<p class="cfh-story-more">+' + moreCount + ' tidigare stunder finns kvar i er berättelse.</p>';
    }

    return html;
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

  function renderSecondarySections(data) {
    return '<div class="cfh-secondary-sections">' +
      '<section class="cfh-section cfh-section-muted cfh-section--goals" aria-label="Gemensamma mål">' +
        '<h3 class="cfh-section-title">🎯 Gemensamma mål</h3>' +
        renderProjects(data.projects) +
      '</section>' +
      renderChestSection(data) +
      '<section class="cfh-section cfh-section-muted cfh-section--story" aria-label="Våra stunder">' +
        '<h3 class="cfh-section-title">📖 Våra stunder</h3>' +
        renderStory(data.story) +
      '</section>' +
    '</div>';
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
      renderWarmBanner(state) +
      '<section class="cfh-persons-primary" aria-label="Mina personer">' +
        renderPersonCards(state) +
      '</section>' +
      renderSecondarySections(data) +
    '</div>';
  }

  function mount() {
    const root = document.getElementById('familyHallMount');
    if (!root || !window.ChildFamily) return;

    root.innerHTML = renderLoading();

    ChildFamily.load()
      .then(function (data) {
        return fetchFeatures().then(function (features) {
          _cachedData = data;
          _v10Enabled = isV10Enabled(features);
          paint(root, data);
        });
      })
      .catch(function () {
        root.innerHTML = renderError();
        const retry = document.getElementById('cfhRetryBtn');
        if (retry) retry.addEventListener('click', refresh);
      });
  }

  function refresh(options) {
    options = options || {};
    if (!window.ChildFamily) return Promise.resolve();

    const root = document.getElementById('familyHallMount');
    if (!options.force && _cachedData && root && root.querySelector('.cfh-shell')) {
      paint(root, _cachedData);
      return Promise.resolve();
    }

    clearWarmTimer();
    if (options.force) ChildFamily.invalidate();
    mount();
    return Promise.resolve();
  }

  window.ChildFamilyHall = {
    mount: mount,
    refresh: refresh,
  };
})();
