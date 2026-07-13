/**
 * child-today-fun.js — Playful Idag polish (barnets_samling gate ON).
 * Greeting, star progress trail, current dagdel highlight helpers.
 */
(function () {
  'use strict';

  const MAX_TRAIL_STARS = 12;

  function isSamlingGateOn() {
    if (typeof document !== 'undefined'
        && document.documentElement.getAttribute('data-barnets-samling') === 'on') {
      return true;
    }
    return !!(window.ChildWorlds
      && window.ChildWorlds.isBarnetsSamlingEnabled
      && window.ChildWorlds.isBarnetsSamlingEnabled());
  }

  /** barnets_samling + Idag — quest layout without parent show_now_next opt-in. */
  function isSamlingTodayFocus(isToday) {
    if (!isToday) return false;
    if (!isSamlingGateOn()) return false;
    if (typeof document !== 'undefined'
        && document.documentElement.classList.contains('today-focus-mode')) {
      return true;
    }
    return isSamlingGateOn();
  }

  /**
   * Time-aware NU/Nästa/Senare for samling Idag (aligns focus bar + list).
   * Past incomplete items → hidden "past" bucket (not above fold per idag-vision).
   */
  function buildTimeQuestQueue(items) {
    const classify = window.classifyActivities;
    const getTime = window.getCurrentTimeHHMM;
    if (typeof classify !== 'function' || typeof getTime !== 'function') return null;

    const open = (items || []).filter(function (item) { return item && !item.completed; });
    const cl = classify(open, getTime());
    return {
      now: cl.now || [],
      next: cl.next || [],
      later: cl.laterFuture || [],
      past: cl.laterPast || [],
    };
  }

  function applyTimeQuestTags(items) {
    const queue = buildTimeQuestQueue(items);
    if (!queue) return null;

    const nowIds = new Set(queue.now.map(function (i) { return i.id; }));
    const nextIds = new Set(queue.next.map(function (i) { return i.id; }));
    const laterIds = new Set(queue.later.map(function (i) { return i.id; }));
    const pastIds = new Set(queue.past.map(function (i) { return i.id; }));

    return (items || []).map(function (item) {
      if (!item) return item;
      if (item.completed) return Object.assign({}, item, { _nnl_status: 'done' });
      if (nowIds.has(item.id)) return Object.assign({}, item, { _nnl_status: 'now' });
      if (nextIds.has(item.id)) return Object.assign({}, item, { _nnl_status: 'next' });
      if (laterIds.has(item.id)) return Object.assign({}, item, { _nnl_status: 'later' });
      if (pastIds.has(item.id)) return Object.assign({}, item, { _nnl_status: 'past' });
      return Object.assign({}, item, { _nnl_status: 'later' });
    });
  }

  function firstName(name) {
    if (!name) return 'du';
    return String(name).trim().split(/\s+/)[0];
  }

  function greetingLine(childName) {
    const who = firstName(childName);
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'God morgon ' + who + ' 🌅';
    if (hour >= 10 && hour < 17) return 'Hej ' + who + ' 👋';
    if (hour >= 17 && hour < 22) return 'God kväll ' + who + ' 🌙';
    return 'Hej stjärnkompis ' + who + ' ✨';
  }

  function renderProgressTrail(completed, total) {
    const done = Math.max(0, Math.min(completed || 0, total || 0));
    const all = Math.max(0, total || 0);
    if (all <= 0) return '';

    if (all > MAX_TRAIL_STARS) {
      const pct = Math.round((done / all) * 100);
      return (
        '<div class="ctf-progress-trail ctf-progress-trail--bar" role="img" aria-label="' + done + ' av ' + all + ' klara">' +
          '<div class="ctf-progress-trail__track">' +
            '<div class="ctf-progress-trail__fill" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<span class="ctf-progress-trail__label">' + done + ' av ' + all + ' klara</span>' +
        '</div>'
      );
    }

    let stars = '';
    for (let i = 0; i < all; i++) {
      const filled = i < done;
      stars += '<span class="ctf-progress-star' + (filled ? ' ctf-progress-star--done' : '') + '" aria-hidden="true">' +
        (filled ? '⭐' : '☆') +
      '</span>';
    }
    return (
      '<div class="ctf-progress-trail" role="img" aria-label="' + done + ' av ' + all + ' klara">' +
        '<div class="ctf-progress-trail__stars">' + stars + '</div>' +
        '<span class="ctf-progress-trail__label">' + done + ' av ' + all + ' klara</span>' +
      '</div>'
    );
  }

  function currentDagdelKey(date) {
    const d = (date && typeof date.getHours === 'function') ? date : new Date();
    const hour = d.getHours();
    if (hour >= 5 && hour < 9) return 'morgon';
    if (hour >= 9 && hour < 12) return 'formiddag';
    if (hour >= 12 && hour < 17) return 'eftermiddag';
    if (hour >= 17 && hour < 21) return 'kvall';
    return 'natt';
  }

  function starsTeaser(count) {
    if (!count || count < 1) return '';
    return '<span class="ctf-reward-teaser">+' + count + ' ⭐</span>';
  }

  window.ChildTodayFun = {
    isSamlingGateOn: isSamlingGateOn,
    isSamlingTodayFocus: isSamlingTodayFocus,
    buildTimeQuestQueue: buildTimeQuestQueue,
    applyTimeQuestTags: applyTimeQuestTags,
    greetingLine: greetingLine,
    renderProgressTrail: renderProgressTrail,
    currentDagdelKey: currentDagdelKey,
    starsTeaser: starsTeaser,
  };
})();
