/**
 * child-today-coach.js — Coach-loop placements after activity (barnmeny v2.1 Sprint 7).
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  const COACH_MOUNT_ID = 'childCoachMount';
  const SESSION_KEY = 'childTodayCoachDismissed';

  function ensureMount() {
    const existing = document.getElementById(COACH_MOUNT_ID);
    if (existing) return existing;
    const scheduleView = document.getElementById('scheduleView');
    if (!scheduleView) return null;
    const mount = document.createElement('div');
    mount.id = COACH_MOUNT_ID;
    mount.className = 'px-4 max-w-lg mx-auto';
    mount.setAttribute('aria-live', 'polite');
    scheduleView.insertBefore(mount, scheduleView.firstChild);
    return mount;
  }

  function peekNextActivity() {
    const nowEl = document.querySelector('.now-card:not(.done) .now-title');
    if (nowEl && nowEl.textContent.trim()) {
      return nowEl.textContent.trim();
    }
    const nextEl = document.querySelector('.next-card:not(.done) .nl-title');
    if (nextEl && nextEl.textContent.trim()) {
      return nextEl.textContent.trim();
    }
    return null;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function dismissCoach() {
    const mount = document.getElementById(COACH_MOUNT_ID);
    if (mount) mount.innerHTML = '';
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (_) {}
  }

  function showCoach(message, placement, nextTitle) {
    const mount = ensureMount();
    if (!mount) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1' && !nextTitle) return;
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}

    const nextBlock = nextTitle
      ? '<p class="text-sm font-semibold text-navy mt-2">' + esc(t('todayCoach.nextPrefix', { name: nextTitle })) + '</p>'
      : '<p class="text-sm text-navy/80 mt-2">' + esc(t('todayCoach.allDoneForNow')) + '</p>';

    mount.innerHTML =
      '<div class="mb-4 p-4 bg-mint border border-green-200 rounded-2xl relative pr-12" data-coach-placement="' +
      esc(placement || 'today_coach_post_activity') +
      '">' +
      '<button type="button" class="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-navy/50 hover:text-navy hover:bg-white/60 text-lg leading-none" aria-label="' + esc(t('todayCoach.closeAria')) + '" data-coach-dismiss>&times;</button>' +
      '<p class="font-heading font-bold text-navy mb-1">' + esc(t('todayCoach.greatJob')) + '</p>' +
      '<p class="text-sm text-navy">' + esc(message) + '</p>' +
      nextBlock +
      '</div>';

    const dismissBtn = mount.querySelector('[data-coach-dismiss]');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', dismissCoach);
    }
  }

  function onActivityComplete(meta) {
    const placement = (meta && meta.placement) || 'today_coach_post_activity';
    const base = (meta && meta.message) || t('todayCoach.defaultMessage');
    const nextTitle = peekNextActivity();
    showCoach(base, placement, nextTitle);
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
    dismissCoach: dismissCoach,
    onActivityComplete: onActivityComplete,
    peekNextActivity: peekNextActivity,
  };
})();
