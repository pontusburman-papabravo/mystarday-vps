/**
 * child-dashboard-activity-timer.js — aktivitetstimer UI (spec v0.3).
 */
(function (global) {
  'use strict';

  const DEBOUNCE_MS = 300;
  let _tickInterval = null;
  let _wired = false;
  const _lastStartTap = Object.create(null);

  function t(key, params) {
    return (typeof global.childT === 'function' ? childT(key, params)
      : (typeof global.cpt === 'function' ? cpt(key, params) : ''));
  }

  function pluralSuffix(count) {
    const locale = typeof global.getChildDateLocale === 'function' ? getChildDateLocale() : 'sv-SE';
    if (locale === 'en-GB') return count === 1 ? '' : 's';
    return count === 1 ? '' : 'er';
  }

  function ariaRemainingLabel(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m > 0 && r > 0) {
      return t('activityTimer.ariaMinutesAndSeconds', {
        minutes: m,
        seconds: r,
        minutePlural: pluralSuffix(m),
        secondPlural: pluralSuffix(r),
      });
    }
    if (m > 0) {
      return m === 1 ? t('activityTimer.ariaOneMinute') : t('activityTimer.ariaMinutes', { count: m });
    }
    return r === 1 ? t('activityTimer.ariaOneSecond') : t('activityTimer.ariaSeconds', { count: r });
  }

  function itemHasTimer(item) {
    return typeof activityTimersEnabled !== 'undefined'
      && activityTimersEnabled
      && item
      && !item.completed
      && item.duration_seconds != null
      && item.duration_seconds >= 5;
  }

  function ringSvg(itemId, progressPct, color, reducedMotion) {
    const circumference = 100;
    const dash = (progressPct / 100) * circumference;
    const transition = reducedMotion ? '' : ' style="transition:stroke-dasharray 0.35s linear, stroke 0.35s linear"';
    return (
      '<svg class="activity-timer-svg" width="52" height="52" viewBox="0 0 36 36" aria-hidden="true">' +
        '<circle class="activity-timer-track" cx="18" cy="18" r="15.9"/>' +
        '<circle class="activity-timer-ring" cx="18" cy="18" r="15.9"' + transition +
          ' stroke="' + color + '" stroke-dasharray="' + dash.toFixed(1) + ' ' + (circumference - dash).toFixed(1) + '"/>' +
      '</svg>'
    );
  }

  function renderBlock(item) {
    if (!itemHasTimer(item) || !me || !currentDate || !global.ActivityTimerSession) return '';

    const session = ActivityTimerSession.getSession(me.id, currentDate, item.id);
    const duration = item.duration_seconds;
    let status = ActivityTimerSession.resolveStatus(session, duration);
    let remaining = duration;

    if (status === 'running' || status === 'finished') {
      remaining = ActivityTimerSession.computeRemainingSeconds(session, duration);
      if (status === 'running' && remaining <= 0) status = 'finished';
    }

    const display = status === 'idle'
      ? ActivityTimerSession.formatDisplay(duration)
      : ActivityTimerSession.formatDisplay(remaining);
    const progress = status === 'idle' ? 100 : ActivityTimerSession.ringProgress(remaining, duration);
    const color = status === 'idle' ? '#22C55E' : ActivityTimerSession.ringColor(remaining, duration);
    const reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ariaLabel = status === 'finished' ? t('activityTimer.ariaFinished') : ariaRemainingLabel(remaining);

    let controls = '';
    if (status === 'idle') {
      controls =
        '<button type="button" class="activity-timer-start btn-child-action" data-item-id="' + item.id + '">' + t('activityTimer.start') + '</button>';
    } else if (status === 'finished') {
      controls =
        '<p class="activity-timer-done-label">' + t('activityTimer.done') + '</p>' +
        '<button type="button" class="activity-timer-restart text-sm text-text-soft underline mt-1" data-item-id="' + item.id + '">' + t('activityTimer.restart') + '</button>';
    }

    return (
      '<div class="activity-timer-wrap" id="activity-timer-' + item.id + '" data-item-id="' + item.id + '"' +
           ' data-duration="' + duration + '" data-status="' + status + '">' +
        '<div class="activity-timer-visual">' +
          ringSvg(item.id, progress, color, reducedMotion) +
          '<span class="activity-timer-emoji" aria-hidden="true">⏳</span>' +
        '</div>' +
        '<span class="activity-timer-digits" aria-live="polite">' + display + '</span>' +
        '<span class="sr-only activity-timer-aria">' + ariaLabel + '</span>' +
        controls +
      '</div>'
    );
  }

  function playEndSound() {
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      osc.onended = function () { ctx.close(); };
    } catch { /* ignore */ }
  }

  function refreshItemUI(itemId, durationSeconds) {
    const wrap = document.getElementById('activity-timer-' + itemId);
    if (!wrap || !me || !currentDate) return;

    const session = ActivityTimerSession.getSession(me.id, currentDate, itemId);
    let status = ActivityTimerSession.resolveStatus(session, durationSeconds);
    let remaining = durationSeconds;
    if (status !== 'idle') {
      remaining = ActivityTimerSession.computeRemainingSeconds(session, durationSeconds);
      if (status === 'running' && remaining <= 0) status = 'finished';
    }

    wrap.dataset.status = status;
    const digits = wrap.querySelector('.activity-timer-digits');
    const ring = wrap.querySelector('.activity-timer-ring');
    const aria = wrap.querySelector('.activity-timer-aria');
    const display = status === 'idle'
      ? ActivityTimerSession.formatDisplay(durationSeconds)
      : ActivityTimerSession.formatDisplay(remaining);

    if (digits) digits.textContent = display;
    if (aria) {
      aria.textContent = status === 'finished' ? t('activityTimer.ariaFinished') : ariaRemainingLabel(remaining);
    }
    if (ring) {
      const progress = status === 'idle' ? 100 : ActivityTimerSession.ringProgress(remaining, durationSeconds);
      const color = status === 'idle' ? '#22C55E' : ActivityTimerSession.ringColor(remaining, durationSeconds);
      const dash = (progress / 100) * 100;
      ring.setAttribute('stroke', color);
      ring.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + (100 - dash).toFixed(1));
    }

    if (status === 'finished') {
      const sessionNow = ActivityTimerSession.getSession(me.id, currentDate, itemId);
      if (sessionNow && !sessionNow.end_sound_played) {
        ActivityTimerSession.setEndSoundPlayed(me.id, currentDate, itemId);
        ActivityTimerSession.markFinished(me.id, currentDate, itemId);
        playEndSound();
        if (global.Platform && global.Platform.haptics) global.Platform.haptics.medium();
      }
      if (!wrap.querySelector('.activity-timer-done-label')) {
        const done = document.createElement('p');
        done.className = 'activity-timer-done-label';
        done.textContent = t('activityTimer.done');
        wrap.appendChild(done);
        const restart = document.createElement('button');
        restart.type = 'button';
        restart.className = 'activity-timer-restart text-sm text-text-soft underline mt-1';
        restart.dataset.itemId = itemId;
        restart.textContent = t('activityTimer.restart');
        wrap.appendChild(restart);
        const startBtn = wrap.querySelector('.activity-timer-start');
        if (startBtn) startBtn.remove();
      }
    }
  }

  function tickAll() {
    document.querySelectorAll('.activity-timer-wrap[data-item-id]').forEach(function (wrap) {
      const itemId = wrap.dataset.itemId;
      const duration = parseInt(wrap.dataset.duration, 10);
      if (!itemId || !duration) return;
      refreshItemUI(itemId, duration);
    });
  }

  function onStart(itemId) {
    const now = Date.now();
    if (_lastStartTap[itemId] && now - _lastStartTap[itemId] < DEBOUNCE_MS) return;
    _lastStartTap[itemId] = now;

    const wrap = document.getElementById('activity-timer-' + itemId);
    const duration = wrap ? parseInt(wrap.dataset.duration, 10) : 0;
    if (!duration || !me || !currentDate) return;

    ActivityTimerSession.startSession(me.id, currentDate, itemId, duration);
    if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();

    const startBtn = wrap.querySelector('.activity-timer-start');
    if (startBtn) startBtn.remove();
    wrap.dataset.status = 'running';
    refreshItemUI(itemId, duration);
  }

  function onRestart(itemId) {
    onStart(itemId);
  }

  function wireDelegation() {
    if (_wired) return;
    _wired = true;
    document.addEventListener('click', function (e) {
      const start = e.target.closest('.activity-timer-start');
      if (start) {
        e.preventDefault();
        e.stopPropagation();
        onStart(start.dataset.itemId);
        return;
      }
      const restart = e.target.closest('.activity-timer-restart');
      if (restart) {
        e.preventDefault();
        e.stopPropagation();
        onRestart(restart.dataset.itemId);
      }
    });
  }

  function initForItems(items) {
    if (!activityTimersEnabled) return;
    wireDelegation();
    const ids = (items || []).filter(itemHasTimer).map(function (i) { return i.id; });
    if (me && currentDate && global.ActivityTimerSession) {
      ActivityTimerSession.pruneSessions(me.id, currentDate, ids);
    }
    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(tickAll, 1000);
    tickAll();
  }

  function clearForItem(itemId) {
    if (me && currentDate && global.ActivityTimerSession) {
      ActivityTimerSession.clearSession(me.id, currentDate, itemId);
    }
    const wrap = document.getElementById('activity-timer-' + itemId);
    if (wrap) wrap.remove();
  }

  global.ChildActivityTimer = {
    itemHasTimer: itemHasTimer,
    renderBlock: renderBlock,
    initForItems: initForItems,
    clearForItem: clearForItem,
    tickAll: tickAll,
  };
})(window);
