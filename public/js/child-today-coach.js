/**
 * child-today-coach.js — Coach-loop placements after activity (barnmeny v2 Sprint 4).
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

  function showCoach(message, placement) {
    if (!window.ChildCapabilities) return;
    var mount = ensureMount();
    if (!mount) return;
    mount.innerHTML =
      '<div class="mb-4 p-4 bg-mint border border-green-200 rounded-2xl" data-coach-placement="' +
      (placement || 'today_coach_post_activity') +
      '">' +
      '<p class="font-heading font-bold text-navy mb-1">Bra jobbat!</p>' +
      '<p class="text-sm text-navy">' +
      message +
      '</p></div>';
  }

  function onActivityComplete(meta) {
    var placement = (meta && meta.placement) || 'today_coach_post_activity';
    var msg =
      (meta && meta.message) ||
      'Du klarade uppdraget — fortsätt så här!';
    showCoach(msg, placement);
  }

  function bindEventBus() {
    if (!window.ChildEventBus || !ChildEventBus.on) return;
    ChildEventBus.on('activity:complete', function (payload) {
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
  };
})();
