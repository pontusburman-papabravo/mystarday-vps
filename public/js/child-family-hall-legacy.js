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

  function renderPersonCard(person, key) {
    const memberType = person.kind === 'sibling' ? 'child' : 'parent';
    const displayEmoji = person.displayEmoji || person.emoji || (memberType === 'child' ? '⭐' : '👤');
    const member = {
      id: person.id,
      name: person.name,
      emoji: person.emoji,
      display_emoji: displayEmoji,
      avatar_src: person.avatar_src || person.avatarUrl || '',
      has_avatar: person.has_avatar || person.hasAvatar,
      type: memberType,
      member_type: memberType,
    };
    const avatar = window.MemberAvatar && MemberAvatar.renderMemberAvatar
      ? '<div class="cfh-person-avatar-ring" data-role="' + esc(person.roleLabel || '') + '">' +
        MemberAvatar.renderMemberAvatar(member, 76, { memberType: memberType, displayEmoji: displayEmoji }) +
        '</div>'
      : '<span class="cfh-person-emoji cfh-person-emoji--face">' + esc(displayEmoji) + '</span>';
    const label = person.roleLabel || (memberType === 'child' ? 'Syskon' : 'Hjälper mig hemma');
    return '<button type="button" class="cfh-person-card cfh-person-card-btn" data-cfh-person-key="' + esc(key) + '"' +
      ' aria-label="' + esc(person.name + ', ' + label) + '">' + avatar +
      '<span class="cfh-person-name">' + esc(person.name) + '</span>' +
      '<span class="cfh-person-role">' + esc(label) + '</span>' +
      '<span class="cfh-person-tap-hint">Tryck för mer</span></button>';
  }

  function renderPersons(data) {
    const persons = data.persons;
    if (!persons) return '';
    const sheetPersons = [];
    let cards = '';
    (persons.parents || []).forEach(function (p, i) {
      const key = 'legacy-parent-' + (p.id || i);
      const person = {
        key: key,
        id: p.id,
        name: p.name,
        emoji: p.emoji || p.display_emoji || '👤',
        displayEmoji: p.display_emoji || p.emoji || '👤',
        avatarUrl: p.avatar_src || '',
        hasAvatar: !!p.has_avatar,
        kind: 'parent',
        roleLabel: p.roleLabel || 'Hjälper mig hemma',
        cardNote: '',
      };
      sheetPersons.push(person);
      cards += renderPersonCard(person, key);
    });
    (persons.siblings || []).forEach(function (s, i) {
      const key = 'legacy-sibling-' + (s.id || i);
      const person = {
        key: key,
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        avatarUrl: s.avatar_src || '',
        hasAvatar: !!s.has_avatar,
        kind: 'sibling',
        roleLabel: s.roleLabel || 'Syskon',
        cardNote: '',
      };
      sheetPersons.push(person);
      cards += renderPersonCard(person, key);
    });
    if (window.ChildFamilyPersonSheet && ChildFamilyPersonSheet.setPersons) {
      ChildFamilyPersonSheet.setPersons(sheetPersons);
    }
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
