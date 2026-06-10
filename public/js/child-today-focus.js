/**
 * child-today-focus.js — Förenklad Idag-vy: en primär handling (uppdrag).
 * Stjärnor, mål, vecka och statistik → Skattkammaren.
 */
(function () {
  'use strict';

  var _goalData = null;
  var _childName = '';
  var _progress = { completed: 0, total: 0 };

  function firstName(name) {
    if (!name) return 'du';
    return String(name).trim().split(/\s+/)[0];
  }

  function renderFocusBar() {
    var goal = _goalData && _goalData.goal;
    var hasGoal = goal && goal.reward_id;
    var balance = (_goalData && _goalData.star_balance) || 0;
    var cost = hasGoal ? (goal.star_cost || 1) : 0;
    var icon = hasGoal ? (goal.reward_icon || '🎯') : '🎯';
    var goalName = hasGoal ? goal.reward_name : 'Välj mål i Skattkammaren';
    var goalLine = hasGoal
      ? icon + ' ' + goalName
      : '🎯 Välj ett sparmål';
    var starsLine = hasGoal
      ? '⭐ ' + balance + ' / ' + cost
      : '';

    var missionSub = _progress.total > 0
      ? _progress.completed + ' av ' + _progress.total + ' klara'
      : '';

    return '<div class="ctf-bar" id="todayFocusBar">' +
      '<div class="ctf-greeting">Hej ' + firstName(_childName) + ' 👋</div>' +
      '<div class="ctf-goal-card">' +
        '<div class="ctf-goal-name">' + goalLine + '</div>' +
        (starsLine ? '<div class="ctf-goal-stars">' + starsLine + '</div>' : '') +
      '</div>' +
      '<button type="button" class="ctf-skatt-btn" id="ctfSkattBtn">💎 Besök Skattkammaren</button>' +
      '<div class="ctf-divider"></div>' +
      '<div class="ctf-missions-head">' +
        '<span class="ctf-missions-title">Dagens uppdrag</span>' +
        (missionSub ? '<span class="ctf-missions-sub">' + missionSub + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function mount() {
    var existing = document.getElementById('todayFocusMount');
    if (!existing) return;
    existing.innerHTML = renderFocusBar();
    var btn = document.getElementById('ctfSkattBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (typeof showTab === 'function') showTab('rewards');
      });
    }
  }

  function hideLegacyChrome() {
    ['weekNavSection', 'progressSection'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.classList.add('ctf-hidden');
        el.setAttribute('aria-hidden', 'true');
      }
    });
    var ringBadge = document.getElementById('ringActivityBadge');
    if (ringBadge) ringBadge.classList.add('ctf-hidden');
  }

  function renameTab() {
    var tab = document.getElementById('tabSchedule');
    if (tab) tab.textContent = '☀️ Idag';
  }

  function init(childName) {
    _childName = childName || '';
    document.documentElement.classList.add('today-focus-mode');
    hideLegacyChrome();
    renameTab();
    mount();
  }

  function updateGoal(goalData) {
    _goalData = goalData;
    mount();
  }

  function updateProgress(completed, total) {
    _progress = { completed: completed || 0, total: total || 0 };
    mount();
  }

  function onTabChange(tab) {
    var mountEl = document.getElementById('todayFocusMount');
    if (!mountEl) return;
    if (tab === 'schedule') {
      mountEl.classList.remove('hidden');
      mount();
    } else {
      mountEl.classList.add('hidden');
    }
  }

  window.ChildTodayFocus = {
    init: init,
    updateGoal: updateGoal,
    updateProgress: updateProgress,
    onTabChange: onTabChange,
  };
})();
