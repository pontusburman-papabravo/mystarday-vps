/**
 * child-today-focus.js — Idag 10/10: quest focus bar + resolveIdagState().
 * Stjärnor, mål, vecka och statistik → Skattkammaren.
 */
(function () {
  'use strict';

  const IDAG_STATES = {
    NO_TASKS: 'no_tasks',
    ALL_DONE: 'all_done',
    ACTIVE: 'active',
  };

  const DECAL_EMPTY = '/images/child/decals/today-empty-v1@2x.webp';
  const DECAL_CELEBRATION = '/images/child/decals/today-celebration-frame-v1@2x.webp';
  const CELEBRATION_MS = 2000;

  let _childName = '';
  let _lastState = null;

  function ctf(key, params) {
    return (typeof window.cpt === 'function' ? cpt(key, params) : '');
  }

  function firstName(name) {
    if (!name) return 'du';
    return String(name).trim().split(/\s+/)[0];
  }

  function incompleteItems(items) {
    return (items || []).filter(function (item) {
      return item && !item.completed;
    });
  }

  function sortBySchedule(items) {
    return items.slice().sort(function (a, b) {
      const am = a.sort_order != null ? a.sort_order : 0;
      const bm = b.sort_order != null ? b.sort_order : 0;
      if (am !== bm) return am - bm;
      return String(a.start_time || '').localeCompare(String(b.start_time || ''));
    });
  }

  function buildQuestQueue(items, backendFiltered) {
    const sorted = sortBySchedule(items);
    const result = { now: [], next: [], later: [] };

    if (backendFiltered) {
      sorted.forEach(function (item) {
        if (item.completed) return;
        const status = item._nnl_status || 'now';
        if (status === 'now') result.now.push(item);
        else if (status === 'next') result.next.push(item);
        else result.later.push(item);
      });
      return result;
    }

    let unchecked = 0;
    sorted.forEach(function (item) {
      if (item.completed) return;
      unchecked++;
      if (unchecked === 1) result.now.push(item);
      else if (unchecked === 2) result.next.push(item);
      else result.later.push(item);
    });
    return result;
  }

  /**
   * Exclusive Idag state — vision § Tillståndsmaskin.
   * Priority: All done → Active → No tasks.
   */
  function resolveIdagState(data, options) {
    options = options || {};
    const items = (data && data.items) || [];
    const total = data && data.total != null ? data.total : items.length;
    const completed = data && data.completed != null
      ? data.completed
      : items.filter(function (i) { return i.completed; }).length;
    const isToday = options.isToday !== false;
    const backendFiltered = !!(data && data.now_next_filtered);

    const base = {
      completed: completed,
      total: total,
      progressLabel: ctf('today.progressDone', { completed: completed, total: total }),
      nowItem: null,
      nextItem: null,
      primaryAction: null,
      nextStepLabel: '',
      starsOnNow: 0,
    };

    const incomplete = incompleteItems(items);
    const hasOpenWork = incomplete.length > 0 || (total > 0 && completed < total);

    if (total === 0) {
      return Object.assign({}, base, {
        state: IDAG_STATES.NO_TASKS,
        progressLabel: ctf('today.noMissionsToday'),
        nextStepLabel: ctf('today.enjoyFreeDay'),
      });
    }

    if (!hasOpenWork) {
      return Object.assign({}, base, {
        state: IDAG_STATES.ALL_DONE,
        progressLabel: ctf('today.progressDone', { completed: completed, total: total }),
        nextStepLabel: ctf('today.allDoneToday'),
      });
    }

    const queue = buildQuestQueue(items, backendFiltered);
    const nowItem = queue.now[0] || null;
    const nextItem = queue.next[0] || queue.later[0] || null;
    const starsOnNow = nowItem && nowItem.star_value > 0 ? nowItem.star_value : 0;

    let nextStepLabel = '';
    if (nextItem) {
      nextStepLabel = ctf('today.laterPrefix', { name: nextItem.name });
    } else if (nowItem) {
      nextStepLabel = ctf('today.checkOffToContinue');
    }

    return Object.assign({}, base, {
      state: IDAG_STATES.ACTIVE,
      nowItem: nowItem,
      nextItem: nextItem,
      starsOnNow: starsOnNow,
      nextStepLabel: nextStepLabel,
      primaryAction: nowItem && isToday
        ? { type: 'complete', itemId: nowItem.id }
        : null,
    });
  }

  function emptyIllusHtml() {
    return '<div class="ctf-empty-illus" role="img" aria-label="Ledig dag">' +
      '<img src="' + DECAL_EMPTY + '" alt="" decoding="async" loading="lazy" width="320" height="200" />' +
    '</div>';
  }

  function renderScheduleEmpty(isToday) {
    if (isToday) {
      return '<div class="ctf-schedule-empty">' +
        emptyIllusHtml() +
        '<p class="ctf-schedule-empty-title">' + ctf('today.noActivitiesToday') + '</p>' +
        '<p class="ctf-schedule-empty-sub">' + ctf('today.enjoyFreeDay') + '</p>' +
      '</div>';
    }
    return '<div class="ctf-schedule-empty">' +
      '<p class="text-4xl mb-3" aria-hidden="true">📅</p>' +
      '<p class="ctf-schedule-empty-title">' + ctf('today.noScheduleThisDay') + '</p>' +
      '<p class="ctf-schedule-empty-sub">' + ctf('today.pickAnotherDay') + '</p>' +
    '</div>';
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function dismissCelebrationOverlay(overlay) {
    if (!overlay || !overlay.parentNode) return;
    overlay.classList.add('ctf-celebration--out');
    const delay = prefersReducedMotion() ? 0 : 280;
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, delay);
  }

  function showCelebrationOverlay() {
    if (document.getElementById('ctfCelebrationOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ctfCelebrationOverlay';
    overlay.className = 'ctf-celebration-overlay' +
      (prefersReducedMotion() ? ' ctf-celebration--reduced' : '');
    overlay.innerHTML =
      '<button type="button" class="ctf-celebration-skip" aria-label="' + ctf('today.skipCelebration') + '">' +
        ctf('today.skipCelebration') +
      '</button>' +
      '<div class="ctf-celebration-frame" role="presentation">' +
        '<img src="' + DECAL_CELEBRATION + '" alt="" decoding="async" width="320" height="320" />' +
      '</div>';
    document.body.appendChild(overlay);

    const skip = overlay.querySelector('.ctf-celebration-skip');
    if (skip) {
      skip.addEventListener('click', function () { dismissCelebrationOverlay(overlay); });
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) dismissCelebrationOverlay(overlay);
    });

    const duration = prefersReducedMotion() ? 800 : CELEBRATION_MS;
    setTimeout(function () { dismissCelebrationOverlay(overlay); }, duration);
  }

  function renderFocusBar(state) {
    const progress = state.progressLabel || '';
    const nextStep = state.nextStepLabel || '';
    const nowName = state.nowItem ? state.nowItem.name : '';
    const fun = window.ChildTodayFun;
    const samlingFun = fun && fun.isSamlingGateOn && fun.isSamlingGateOn();
    const warmth = window.ChildTodayWarmth;
    const samlingWarmth = warmth && warmth.isSamlingGateOn && warmth.isSamlingGateOn();

    let headline = ctf('today.dailyMission');
    if (state.state === IDAG_STATES.ACTIVE && nowName) {
      headline = ctf('today.nowPrefix', { name: nowName });
    } else if (state.state === IDAG_STATES.ALL_DONE) {
      headline = ctf('celebration.greatWork');
    }

    const illus = state.state === IDAG_STATES.NO_TASKS ? emptyIllusHtml() : '';
    const greeting = samlingFun && fun.greetingLine
      ? fun.greetingLine(_childName)
      : ctf('today.greeting', { name: firstName(_childName) });
    const progressTrail = samlingFun && fun.renderProgressTrail && state.total > 0
      ? fun.renderProgressTrail(state.completed, state.total)
      : '';
    const trailHtml = progressTrail
      ? progressTrail.replace('ctf-progress-trail', 'ctf-progress-trail' + (samlingWarmth ? ' ctf-progress-trail--warm' : ''))
      : '';
    const dayStory = samlingWarmth && warmth.dayNarrative
      ? warmth.dayNarrative(state)
      : '';
    const starTeaser = samlingFun && fun.starsTeaser && state.starsOnNow > 0
      ? fun.starsTeaser(state.starsOnNow)
      : '';

    return '<div class="ctf-bar' + (samlingFun ? ' ctf-bar--fun' : '') + '" id="todayFocusBar">' +
      illus +
      '<div class="ctf-greeting">' + greeting + '</div>' +
      (dayStory ? '<p class="ctf-day-narrative">' + dayStory + '</p>' : '') +
      trailHtml +
      '<div class="ctf-missions-head">' +
        '<span class="ctf-missions-title">' + headline + '</span>' +
        (starTeaser || (!samlingWarmth ? '<span class="ctf-missions-sub">' + progress + '</span>' : '')) +
      '</div>' +
      (nextStep
        ? '<p class="ctf-next-step">' + nextStep + '</p>'
        : '') +
    '</div>';
  }

  function mount(state) {
    const existing = document.getElementById('todayFocusMount');
    if (!existing) return;
    _lastState = state || _lastState;
    if (!_lastState) return;
    existing.innerHTML = renderFocusBar(_lastState);
  }

  function hideLegacyChrome() {
    ['progressSection', 'goalTeaserBtn'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('ctf-hidden');
        el.setAttribute('aria-hidden', 'true');
      }
    });
    // weekNavDetails stays visible — collapsed <details> "Andra dagar" for multi-day browse
    const ringWrap = document.getElementById('childHeaderRing');
    if (ringWrap) {
      ringWrap.classList.add('ctf-hidden');
      ringWrap.setAttribute('aria-hidden', 'true');
    }
    ['viewToggleBtn', 'printBtn'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('ctf-hidden');
    });
  }

  function renameTab() {
    const label = ctf('nav.today');
    const tab = document.getElementById('tabSchedule');
    if (tab) tab.textContent = '☀️ ' + label;
    const tabLegacy = document.getElementById('tabScheduleLegacy');
    if (tabLegacy) tabLegacy.textContent = '☀️ ' + label;
  }

  function init(childName) {
    _childName = childName || '';
    document.documentElement.classList.add('today-focus-mode');
    hideLegacyChrome();
    renameTab();
  }

  function updateFromDailyLog(data, isToday) {
    const prevState = _lastState && _lastState.state;
    _lastState = resolveIdagState(data, { isToday: isToday });
    mount(_lastState);
    if (
      isToday &&
      _lastState.state === IDAG_STATES.ALL_DONE &&
      prevState !== IDAG_STATES.ALL_DONE
    ) {
      showCelebrationOverlay();
    }
    return _lastState;
  }

  function onTabChange(tab) {
    const mountEl = document.getElementById('todayFocusMount');
    if (!mountEl) return;
    if (tab === 'schedule') {
      mountEl.classList.remove('hidden');
      mount(_lastState);
    } else {
      mountEl.classList.add('hidden');
    }
  }

  window.ChildTodayFocus = {
    init: init,
    updateFromDailyLog: updateFromDailyLog,
    onTabChange: onTabChange,
    renameTab: renameTab,
    renderScheduleEmpty: renderScheduleEmpty,
    resolveIdagState: resolveIdagState,
    IDAG_STATES: IDAG_STATES,
    // Legacy aliases — goal bar now lives in Skattkammaren
    updateGoal: function () {},
    updateProgress: function (completed, total) {
      if (!_lastState) return;
      _lastState = Object.assign({}, _lastState, {
        completed: completed,
        total: total,
        progressLabel: (typeof window.cpt === 'function'
          ? cpt('today.progressDone', { completed: completed, total: total })
          : ''),
      });
      mount(_lastState);
    },
  };
  window.resolveIdagState = resolveIdagState;
  window.IDAG_STATES = IDAG_STATES;
})();
