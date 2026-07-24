/**
 * child-family-hall.js — Mina personer 10/10 (read-only, resolveFamilyState-driven).
 * All data from GET /api/me/family — NO mocks, NO UI writes.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

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
      if (window.ChildFamilyPersonSheet) {
        ChildFamilyPersonSheet.bindCards(root);
      }
      scheduleWarmMomentRerender(data, state);
      return;
    }
    clearWarmTimer();
    if (window.ChildFamilyHallLegacy && ChildFamilyHallLegacy.render) {
      root.innerHTML = ChildFamilyHallLegacy.render(data);
      if (window.ChildFamilyPersonSheet) {
        ChildFamilyPersonSheet.bindCards(root);
      }
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

  const PERSON_AVATAR_SIZE = 76;

  function personAvatarOptions(person) {
    const memberType = person.kind === 'parent' || person.kind === 'pedagog' ? 'parent' : 'child';
    return {
      memberType: memberType,
      displayEmoji: person.displayEmoji || person.emoji || (memberType === 'child' ? '⭐' : '👤'),
    };
  }

  function personMember(person) {
    const opts = personAvatarOptions(person);
    return {
      id: person.id,
      name: person.name,
      emoji: person.emoji,
      display_emoji: person.displayEmoji,
      avatar_src: person.avatarUrl || '',
      has_avatar: person.hasAvatar,
      type: opts.memberType,
      member_type: opts.memberType,
    };
  }

  function personAvatarHtml(person, size) {
    size = size || PERSON_AVATAR_SIZE;
    const opts = personAvatarOptions(person);
    if (window.MemberAvatar && MemberAvatar.renderMemberAvatar) {
      return '<div class="cfh-person-avatar-ring" data-role="' + esc(person.roleLabel) + '">' +
        MemberAvatar.renderMemberAvatar(personMember(person), size, opts) +
        '</div>';
    }
    let src = person.avatarUrl || '';
    if (!src && person.hasAvatar && person.id) {
      src = '/api/avatars/' + opts.memberType + '/' + person.id;
    }
    if (src) {
      return '<div class="cfh-person-avatar-ring" data-role="' + esc(person.roleLabel) + '">' +
        '<img class="cfh-person-photo" src="' + esc(src) + '" alt="" loading="lazy" decoding="async" />' +
        '</div>';
    }
    return '<div class="cfh-person-avatar-ring" data-role="' + esc(person.roleLabel) + '">' +
      '<span class="cfh-person-emoji cfh-person-emoji--face" aria-hidden="true">' +
      esc(opts.displayEmoji) + '</span></div>';
  }

  function roleBadgeClass(roleLabel) {
    if (roleLabel === 'Pappa') return 'cfh-person-role--pappa';
    if (roleLabel === 'Mamma') return 'cfh-person-role--mamma';
    if (roleLabel === 'Syskon') return 'cfh-person-role--sibling';
    return 'cfh-person-role--other';
  }

  function roleDisplayLabel(person) {
    if (person.familyRole && typeof window.childRoleLabel === 'function') {
      return childRoleLabel(person.familyRole);
    }
    if (person.kind === 'pedagog' && typeof window.childRoleLabel === 'function') {
      return childRoleLabel('pedagog');
    }
    if (person.kind === 'sibling' && typeof window.childRoleLabel === 'function') {
      return childRoleLabel('sibling');
    }
    return person.roleLabel || '';
  }

  function renderPersonCards(state) {
    if (!state.persons.length) {
      return '<p class="cfh-empty cfh-empty-hero">' + esc(t('family.emptyHero')) + '</p>';
    }
    if (window.ChildFamilyPersonSheet && ChildFamilyPersonSheet.setPersons) {
      ChildFamilyPersonSheet.setPersons(state.persons);
    }
    return '<div class="cfh-person-grid" role="list">' + state.persons.map(function (person) {
      const highlightCls = state.highlightPersonKey === person.key ? ' cfh-person-card--highlight' : '';
      const roleLabel = roleDisplayLabel(person);
      const roleCls = roleBadgeClass(roleLabel);
      return '<button type="button" class="cfh-person-card cfh-person-card-btn' + highlightCls + '"' +
        ' role="listitem" data-cfh-person-key="' + esc(person.key) + '"' +
        ' aria-label="' + esc(person.name + ', ' + roleLabel) + '">' +
        personAvatarHtml(person) +
        '<span class="cfh-person-name">' + esc(person.name) + '</span>' +
        '<span class="cfh-person-role ' + roleCls + '">' + esc(roleLabel) + '</span>' +
        '<span class="cfh-person-tap-hint">' + esc(t('family.tapForMore')) + '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  function renderHero(state) {
    return '<header class="cfh-hero cfh-hero-panel">' +
      '<h1 class="cfh-title">❤️ ' + esc(t('family.title')) + '</h1>' +
      '<p class="cfh-subtitle">' + esc(t('family.helpers')) + '</p>' +
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
      return '<p class="cfh-empty">' + esc(t('family.noSharedGoals')) + '</p>';
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
      return '<p class="cfh-empty">' + esc(t('family.storyEmpty')) + '</p>';
    }

    const featured = story.filter(function (s) { return s.type === 'project_completed'; });
    const routine = story.filter(function (s) { return s.type !== 'project_completed'; });
    const recentRoutine = routine.slice(0, 4);
    const shownCount = Math.min(featured.length, 3) + recentRoutine.length;
    const moreCount = Math.max(0, story.length - shownCount);

    let html = '<p class="cfh-section-hint">' + esc(t('family.storyHint')) + '</p>';

    if (featured.length) {
      html += '<div class="cfh-story-featured" aria-label="' + esc(t('family.sharedHighlights')) + '">';
      featured.slice(0, 3).forEach(function (s) {
        html += '<div class="cfh-story-item cfh-story-item--featured">' +
          '<div class="cfh-story-date">🎉 ' + formatDate(s.createdAt) + '</div>' +
          '<div class="cfh-story-text">' + esc(s.text) + '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    if (recentRoutine.length) {
      html += '<div class="cfh-story-timeline" aria-label="' + esc(t('family.timelineLabel')) + '">';
      html += '<p class="cfh-story-timeline-kicker">' + esc(t('family.recentMoments')) + '</p>';
      recentRoutine.forEach(function (s) {
        html += '<div class="cfh-story-chip">' +
          '<span class="cfh-story-chip-date">' + formatDate(s.createdAt) + '</span>' +
          '<span class="cfh-story-chip-text">' + esc(s.text) + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    if (moreCount > 0) {
      html += '<p class="cfh-story-more">' + esc(t('family.moreMoments', { count: moreCount })) + '</p>';
    }

    return html;
  }

  function renderChestSection(data) {
    if (data.chestEnabled === false) return '';
    return '<section class="cfh-section cfh-section-muted">' +
      '<h3 class="cfh-section-title">⭐ ' + esc(t('family.together')) + '</h3>' +
      '<p class="cfh-section-hint">' + esc(t('family.togetherHint')) + '</p>' +
      '<div class="cfh-chest cfh-chest-muted">' +
        '<div class="cfh-chest-value">' + (data.chest || 0) + '</div>' +
        '<div class="cfh-chest-label">' + esc(t('family.familyStars')) + '</div>' +
      '</div>' +
    '</section>';
  }

  function renderSecondarySections(data) {
    return '<div class="cfh-secondary-sections">' +
      '<section class="cfh-section cfh-section-muted cfh-section--goals" aria-label="' + esc(t('family.sharedGoals')) + '">' +
        '<h3 class="cfh-section-title">🎯 ' + esc(t('family.sharedGoals')) + '</h3>' +
        renderProjects(data.projects) +
      '</section>' +
      renderChestSection(data) +
      '<section class="cfh-section cfh-section-muted cfh-section--story" aria-label="' + esc(t('family.ourMoments')) + '">' +
        '<h3 class="cfh-section-title">📖 ' + esc(t('family.ourMoments')) + '</h3>' +
        renderStory(data.story) +
      '</section>' +
    '</div>';
  }

  function renderLoading() {
    return '<div class="cfh-shell cfh-loading">' +
      '<p class="text-4xl mb-3" aria-hidden="true">❤️</p>' +
      '<p class="text-text-soft">' + esc(t('family.loading')) + '</p>' +
    '</div>';
  }

  function renderError() {
    return '<div class="cfh-shell cfh-error">' +
      '<p class="text-4xl mb-3" aria-hidden="true">😴</p>' +
      '<p class="text-navy font-semibold">' + esc(t('family.loadFailedTitle')) + '</p>' +
      '<p class="text-text-soft text-sm mt-2">' + esc(t('family.loadFailedRetry')) + '</p>' +
      '<button type="button" id="cfhRetryBtn" class="mt-4 px-4 py-2 rounded-xl bg-gold text-white font-semibold text-sm min-h-[44px]">' + esc(t('common.retry')) + '</button>' +
    '</div>';
  }

  function render(data) {
    const state = resolveState(data);
    return '<div class="cfh-shell" data-cfh-state="' + esc(state.state) + '">' +
      renderHero(state) +
      renderWarmBanner(state) +
      '<section class="cfh-persons-primary" aria-label="' + esc(t('family.title')) + '">' +
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
