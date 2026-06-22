/**
 * child-today-coach.js — Coach-loop placements after activity (barnmeny v2.1 Sprint 7).
 */
(function () {
  'use strict';

  var COACH_MOUNT_ID = 'childCoachMount';

  function ensureMount() {
    var existing = document.getElementById(COACH_MOUNT_ID);
    if (existing) return existing;
    var scheduleView = document.getElementById('scheduleView');
    if (!scheduleView) return null;
    var mount = document.createElement('div');
    mount.id = COACH_MOUNT_ID;
    mount.className = 'px-4 max-w-lg mx-auto';
    mount.setAttribute('aria-live', 'polite');
    scheduleView.insertBefore(mount, scheduleView.firstChild);
    return mount;
  }

  function peekNextActivity() {
    var nowEl = document.querySelector('.now-card:not(.done) .now-title');
    if (nowEl && nowEl.textContent.trim()) {
      return 'Nästa uppdrag: ' + nowEl.textContent.trim();
    }
    var nextEl = document.querySelector('.next-card:not(.done) .nl-title');
    if (nextEl && nextEl.textContent.trim()) {
      return 'Sen: ' + nextEl.textContent.trim();
    }
    return 'Du är klar med allt för nu — bra jobbat!';
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function showCoach(message, placement) {
    var mount = ensureMount();
    if (!mount) return;
    mount.innerHTML =
      '<div class="mb-4 p-4 bg-mint border border-green-200 rounded-2xl" data-coach-placement="' +
      esc(placement || 'today_coach_post_activity') +
      '">' +
      '<p class="font-heading font-bold text-navy mb-1">Bra jobbat!</p>' +
      '<p class="text-sm text-navy">' +
      esc(message) +
      '</p></div>';
  }

  function onActivityComplete(meta) {
    var placement = (meta && meta.placement) || 'today_coach_post_activity';
    var base =
      (meta && meta.message) ||
      'Du klarade uppdraget — fortsätt så här!';
    var nextHint = peekNextActivity();
    showCoach(base + (nextHint ? ' ' + nextHint : ''), placement);
  }

  function bindEventBus() {
    if (!window.ChildEventBus || !ChildEventBus.on) return;
    ChildEventBus.on('ActivityCompleted', function (payload) {
      onActivityComplete(payload || {});
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEventBus);
  } else {
    bindEventBus();
  }

  window.ChildTodayCoach = {
    showCoach: showCoach,
    onActivityComplete: onActivityComplete,
    peekNextActivity: peekNextActivity,
  };
})();
