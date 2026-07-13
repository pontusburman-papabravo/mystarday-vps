/**
 * child-family-state.js — Mina personer 10/10: exclusive resolveFamilyState().
 * Vision: docs/mina-personer-vision.md § Tillståndsmaskin.
 */
(function () {
  'use strict';

  const FAMILY_STATES = {
    WARM_MOMENT: 'warm_moment',
    AWAY: 'away',
    TOGETHER: 'together',
    GROWING_CIRCLE: 'growing_circle',
  };

  /** Align with Skattkammaren completed flash (G-04). */
  const WARM_MOMENT_MS = 2000;

  function flattenPersons(persons) {
    if (!persons) return [];
    const list = [];
    (persons.parents || []).forEach(function (p, i) {
      list.push({
        key: 'parent-' + (p.id || i),
        id: p.id || null,
        name: p.name,
        emoji: p.emoji || p.display_emoji || '👤',
        displayEmoji: p.display_emoji || p.displayEmoji || p.emoji || '👤',
        avatarUrl: p.avatar_src || p.avatarUrl || '',
        hasAvatar: !!p.has_avatar,
        kind: 'parent',
        familyRole: p.family_role || null,
        roleLabel: p.roleLabel || 'Hjälper mig hemma',
        away: !!p.away,
        awayLabel: p.awayLabel || p.away_label || '',
      });
    });
    (persons.siblings || []).forEach(function (s) {
      list.push({
        key: 'sibling-' + (s.id || s.name),
        id: s.id || null,
        name: s.name,
        emoji: s.emoji || '⭐',
        displayEmoji: s.emoji || '⭐',
        avatarUrl: s.avatar_src || s.avatarUrl || '',
        hasAvatar: !!s.has_avatar,
        kind: 'sibling',
        roleLabel: s.roleLabel || 'Syskon',
        away: false,
        awayLabel: '',
      });
    });
    (persons.pedagog || []).forEach(function (p, i) {
      list.push({
        key: 'pedagog-' + i,
        name: p.name,
        emoji: p.emoji || '📚',
        avatarUrl: p.avatar_src || p.avatarUrl || '',
        hasAvatar: !!p.has_avatar,
        kind: 'pedagog',
        roleLabel: p.roleLabel || 'Hjälper mig i skolan',
        away: !!p.away,
        awayLabel: p.awayLabel || p.away_label || '',
      });
    });
    return list;
  }

  function firstName(name) {
    if (!name) return '';
    return String(name).trim().split(/\s+/)[0];
  }

  /** Barnvänlig borta-copy — aldrig skuld eller "försvunnen". */
  function softenAwayLabel(label) {
    if (!label) return '';
    const s = String(label).trim();
    if (/borta|saknas|frånvarande|lämnad|övergiven|ensam/i.test(s)) {
      return 'hos den andra föräldern just nu';
    }
    return s;
  }

  function awayCardNote(person) {
    const soft = softenAwayLabel(person.awayLabel);
    if (!soft) return 'Finns kvar här';
    return 'Just nu: ' + soft;
  }

  function awayHeroStatus() {
    return 'Alla finns kvar här';
  }

  function latestWarmStory(story, now) {
    if (!story || !story.length) return null;
    const latest = story[0];
    if (!latest || !latest.createdAt) return null;
    const t = Date.parse(latest.createdAt);
    if (!t || now - t > WARM_MOMENT_MS) return null;
    return latest;
  }

  function findAwayHighlight(persons) {
    for (let i = 0; i < persons.length; i++) {
      if (persons[i].away) return persons[i];
    }
    return null;
  }

  function togetherLineFromData(data, persons) {
    const story = data && data.story;
    if (story && story.length && story[0].text) return story[0].text;
    if (persons.length > 1) return 'Vi hör ihop';
    return '';
  }

  /**
   * Exclusive Mina personer state — vision § Tillståndsmaskin.
   * Priority: Warm moment → Away → Together → Growing circle.
   */
  function resolveFamilyState(data, options) {
    options = options || {};
    const now = options.now != null ? options.now : Date.now();
    const persons = flattenPersons(data && data.persons).map(function (p) {
      if (!p.away) return p;
      return Object.assign({}, p, { cardNote: awayCardNote(p) });
    });
    const personCount = persons.length;
    const warmStory = latestWarmStory(data && data.story, now);
    const awayPerson = findAwayHighlight(persons);
    const togetherLine = togetherLineFromData(data, persons);

    const base = {
      personCount: personCount,
      persons: persons,
      togetherLine: togetherLine,
      primaryAction: null,
      statusLine: '',
      warmText: '',
      highlightPersonKey: null,
      awayNote: '',
    };

    if (warmStory) {
      return Object.assign({}, base, {
        state: FAMILY_STATES.WARM_MOMENT,
        statusLine: 'Vi gjorde något tillsammans ✨',
        warmText: warmStory.text,
        togetherLine: warmStory.text,
      });
    }

    if (awayPerson) {
      const note = awayCardNote(awayPerson);
      return Object.assign({}, base, {
        state: FAMILY_STATES.AWAY,
        statusLine: awayHeroStatus(),
        togetherLine: firstName(awayPerson.name)
          ? firstName(awayPerson.name) + ' finns kvar här'
          : 'Finns kvar här',
        highlightPersonKey: awayPerson.key,
        awayNote: note,
      });
    }

    if (personCount > 0) {
      return Object.assign({}, base, {
        state: FAMILY_STATES.TOGETHER,
        statusLine: personCount === 1 ? 'Du har någon här' : '',
      });
    }

    return Object.assign({}, base, {
      state: FAMILY_STATES.GROWING_CIRCLE,
      statusLine: 'Här visas de som hjälper dig',
    });
  }

  window.FAMILY_STATES = FAMILY_STATES;
  window.WARM_MOMENT_MS = WARM_MOMENT_MS;
  window.resolveFamilyState = resolveFamilyState;
})();
