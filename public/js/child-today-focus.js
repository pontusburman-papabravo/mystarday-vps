/**
 * child-today-focus.js — Idag 10/10: quest hero + resolveIdagState().
 * Stjärnor, mål, vecka och statistik → Skattkammaren.
 */
(function () {
  'use strict';

  const IDAG_STATES = {
    NO_TASKS: 'no_tasks',
    ALL_DONE: 'all_done',
    ACTIVE: 'active',
  };

  let _childName = '';
  let _childEmoji = '⭐';
  let _lastState = null;

  function firstName(name) {
    if (!name) return 'du';
    return String(name).trim().split(/\s+/)[0];
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 11) return 'God morgon';
    if (hour < 17) return 'Hej';
    if (hour < 21) return 'God kväll';
    return 'Hej';
  }

  function formatTodayDate() {
    try {
      return new Date().toLocaleDateString('sv-SE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch (_) {
      return '';
    }
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
      progressLabel: completed + ' av ' + total + ' klara',
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
        progressLabel: 'Inga uppdrag idag',
        nextStepLabel: 'Njut av din lediga dag',
      });
    }

    if (!hasOpenWork) {
      return Object.assign({}, base, {
        state: IDAG_STATES.ALL_DONE,
        progressLabel: completed + ' av ' + total + ' klara',
        nextStepLabel: 'Alla klara idag!',
      });
    }

    const queue = buildQuestQueue(items, backendFiltered);
    const nowItem = queue.now[0] || null;
    const nextItem = queue.next[0] || queue.later[0] || null;
    const starsOnNow = nowItem && nowItem.star_value > 0 ? nowItem.star_value : 0;

    let nextStepLabel = '';
    if (nextItem) {
      nextStepLabel = 'Sedan: ' + nextItem.name;
    } else if (nowItem) {
      nextStepLabel = 'Bocka av för att gå vidare';
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

  function renderProgressDots(completed, total) {
    const capped = Math.min(total, 12);
    let html = '<div class="idag-progress" role="img" aria-label="' +
      esc(completed + ' av ' + total + ' klara') + '">';
    for (let i = 0; i < capped; i++) {
      html += '<span class="idag-dot' + (i < completed ? ' is-done' : '') + '"></span>';
    }
    if (total > capped) {
      html += '<span class="idag-dot-more">+' + (total - capped) + '</span>';
    }
    html += '</div>';
    return html;
  }

  function renderHero(state) {
    const greeting = getTimeGreeting();
    const name = firstName(_childName);
    const dateLine = formatTodayDate();

    let headline = 'Dagens uppdrag';
    let subline = state.progressLabel || '';
    let moodClass = 'idag-mood-active';

    if (state.state === IDAG_STATES.NO_TASKS) {
      headline = 'Ledig dag';
      subline = state.nextStepLabel || 'Inget på schemat idag';
      moodClass = 'idag-mood-free';
    } else if (state.state === IDAG_STATES.ALL_DONE) {
      headline = 'Allt klart!';
      subline = state.progressLabel;
      moodClass = 'idag-mood-done';
    } else if (state.state === IDAG_STATES.ACTIVE && state.nowItem) {
      headline = state.nowItem.name;
      subline = state.progressLabel;
    }

    let starsHint = '';
    if (state.state === IDAG_STATES.ACTIVE && state.starsOnNow > 0) {
      starsHint = '<span class="idag-stars-hint">+' + state.starsOnNow + ' ⭐</span>';
    }

    return '<div class="idag-hero ' + moodClass + '" id="todayFocusBar">' +
      '<div class="idag-sky" aria-hidden="true"><span class="idag-sun"></span></div>' +
      '<div class="idag-hero-inner">' +
        '<div class="idag-identity">' +
          '<span class="idag-emoji" aria-hidden="true">' + esc(_childEmoji) + '</span>' +
          '<div class="idag-identity-text">' +
            '<p class="idag-greeting">' + esc(greeting) + ', ' + esc(name) + '</p>' +
            (dateLine ? '<p class="idag-date">' + esc(dateLine) + '</p>' : '') +
          '</div>' +
        '</div>' +
        (state.total > 0 ? renderProgressDots(state.completed, state.total) : '') +
        '<div class="idag-headline-row">' +
          '<h2 class="idag-headline">' + esc(headline) + '</h2>' +
          starsHint +
        '</div>' +
        '<p class="idag-subline">' + esc(subline) + '</p>' +
        (state.state === IDAG_STATES.ACTIVE && state.nextStepLabel
          ? '<p class="idag-next">' + esc(state.nextStepLabel) + '</p>'
          : '') +
      '</div>' +
    '</div>';
  }

  function setIdagTabActive(active) {
    document.body.classList.toggle('idag-tab-active', !!active);
  }

  function mount(state) {
    const existing = document.getElementById('todayFocusMount');
    if (!existing) return;
    _lastState = state || _lastState;
    if (!_lastState) return;
    existing.innerHTML = renderHero(_lastState);
  }

  function hideLegacyChrome() {
    ['weekNavSection', 'progressSection', 'weekNavDetails', 'goalTeaserBtn'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('ctf-hidden');
        el.setAttribute('aria-hidden', 'true');
      }
    });
    const ringWrap = document.getElementById('childHeaderRing');
    if (ringWrap) {
      ringWrap.classList.add('ctf-hidden');
      ringWrap.setAttribute('aria-hidden', 'true');
    }
    ['viewToggleBtn', 'printBtn', 'childDarkBtn', 'switchChildBtn', 'logoutBtn'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('ctf-hidden');
    });
    const nameBlock = document.querySelector('#childMainHeader .flex.items-center.gap-2');
    if (nameBlock) {
      nameBlock.classList.add('ctf-hidden');
      nameBlock.setAttribute('aria-hidden', 'true');
    }
  }

  function renameTab() {
    const tab = document.getElementById('tabSchedule');
    if (tab) tab.textContent = '☀️ Idag';
    const tabLegacy = document.getElementById('tabScheduleLegacy');
    if (tabLegacy) tabLegacy.textContent = '☀️ Idag';
  }

  function syncEmoji() {
    const emojiEl = document.getElementById('childEmoji');
    if (emojiEl && emojiEl.textContent) {
      _childEmoji = emojiEl.textContent.trim() || '⭐';
    }
  }

  function init(childName) {
    _childName = childName || '';
    syncEmoji();
    document.documentElement.classList.add('today-focus-mode');
    hideLegacyChrome();
    renameTab();
    setIdagTabActive(true);
  }

  function updateFromDailyLog(data, isToday) {
    _lastState = resolveIdagState(data, { isToday: isToday });
    mount(_lastState);
    if (window.ChildTodayTasks && ChildTodayTasks.syncPrimaryCta) {
      ChildTodayTasks.syncPrimaryCta(_lastState);
    }
    return _lastState;
  }

  function onTabChange(tab) {
    const mountEl = document.getElementById('todayFocusMount');
    if (!mountEl) return;
    const isIdag = tab === 'schedule';
    setIdagTabActive(isIdag);
    if (isIdag) {
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
    resolveIdagState: resolveIdagState,
    IDAG_STATES: IDAG_STATES,
    syncEmoji: syncEmoji,
    updateGoal: function () {},
    updateProgress: function (completed, total) {
      if (!_lastState) return;
      _lastState = Object.assign({}, _lastState, {
        completed: completed,
        total: total,
        progressLabel: completed + ' av ' + total + ' klara',
      });
      mount(_lastState);
    },
  };
  window.resolveIdagState = resolveIdagState;
  window.IDAG_STATES = IDAG_STATES;
})();
