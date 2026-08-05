/**
 * child-dashboard-activity-timer.js — aktivitetstimer v2 (helskärm, timglas, paus).
 */
(function (global) {
  'use strict';

  const DEBOUNCE_MS = 300;
  let _tickInterval = null;
  let _wired = false;
  let _overlayEl = null;
  let _overlayItem = null;
  let _scrollLockY = 0;
  const _lastStartTap = Object.create(null);
  let _wakeLockSentinel = null;
  let _wakeLockBound = false;

  function t(key, params) {
    return (typeof global.childT === 'function' ? childT(key, params)
      : (typeof global.cpt === 'function' ? cpt(key, params) : ''));
  }

  function reducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  function activityTimerV2On() {
    if (typeof global.activityTimerV2Enabled !== 'undefined') return !!global.activityTimerV2Enabled;
    if (typeof globalThis.activityTimerV2Enabled !== 'undefined') return !!globalThis.activityTimerV2Enabled;
    return false;
  }

  function timersActive() {
    return activityTimerV2On()
      && typeof activityTimersEnabled !== 'undefined'
      && activityTimersEnabled;
  }

  function subStepHasTimer(step) {
    return timersActive()
      && step
      && !step.completed
      && step.duration_seconds != null
      && step.duration_seconds >= 5;
  }

  function timedSubStepsOnItem(item) {
    if (!item) return false;
    const timedFromApi = Number(item.sub_step_timed_count);
    if (Number.isFinite(timedFromApi) && timedFromApi > 0) return true;
    if (!item.id || !global.subStepCache || !subStepCache[item.id]) return false;
    return subStepCache[item.id].some(subStepHasTimer);
  }

  function itemHasTimer(item) {
    return timersActive()
      && item
      && !item.completed
      && item.duration_seconds != null
      && item.duration_seconds >= 5
      && !timedSubStepsOnItem(item);
  }

  function sessionIsRunning(childId, scheduleDate, itemId, durationSeconds, subStepId) {
    if (!global.ActivityTimerSession || !durationSeconds) return false;
    const session = ActivityTimerSession.getSession(childId, scheduleDate, itemId, subStepId || undefined);
    return ActivityTimerSession.resolveStatus(session, durationSeconds) === 'running';
  }

  function anyRunningActivityTimer() {
    if (!me || !currentDate) return false;
    let running = false;
    document.querySelectorAll('.activity-timer-wrap[data-item-id]').forEach(function (wrap) {
      const itemId = wrap.dataset.itemId;
      const subStepId = wrap.dataset.subStepId || null;
      const duration = parseInt(wrap.dataset.duration, 10);
      if (!itemId || !duration) return;
      if (sessionIsRunning(me.id, currentDate, itemId, duration, subStepId)) running = true;
    });
    if (!running && _overlayItem && _overlayEl && !_overlayEl.hidden) {
      const duration = _overlayItem.duration_seconds;
      if (duration && sessionIsRunning(
        me.id, currentDate, _overlayItem.id, duration, _overlayItem.sub_step_id || null
      )) {
        running = true;
      }
    }
    return running;
  }

  async function releaseScreenWakeLock() {
    if (_wakeLockSentinel) {
      try {
        await _wakeLockSentinel.release();
      } catch { /* ignore */ }
      _wakeLockSentinel = null;
    }
  }

  async function acquireScreenWakeLock() {
    if (_wakeLockSentinel || !anyRunningActivityTimer()) return;
    try {
      if (global.navigator && navigator.wakeLock && typeof navigator.wakeLock.request === 'function') {
        _wakeLockSentinel = await navigator.wakeLock.request('screen');
        _wakeLockSentinel.addEventListener('release', function () {
          _wakeLockSentinel = null;
        });
      }
    } catch { /* ignore */ }
  }

  function bindWakeLockLifecycle() {
    if (_wakeLockBound || typeof document === 'undefined') return;
    _wakeLockBound = true;
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        syncScreenWakeLock();
        if (typeof global.ChildActivityTimer !== 'undefined'
          && typeof global.ChildActivityTimer.tickAll === 'function') {
          global.ChildActivityTimer.tickAll();
        }
      }
    });
  }

  function syncScreenWakeLock() {
    bindWakeLockLifecycle();
    if (anyRunningActivityTimer()) {
      acquireScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
  }

  function wrapDomId(itemId, subStepId) {
    return subStepId ? 'activity-timer-' + itemId + '-sub-' + subStepId : 'activity-timer-' + itemId;
  }

  function tapKey(itemId, subStepId) {
    return subStepId ? itemId + ':' + subStepId : itemId;
  }

  function activityVisualHtml(item) {
    if (global.ActivityVisual && typeof ActivityVisual.inline === 'function') {
      return ActivityVisual.inline(item);
    }
    return item.icon || '⭐';
  }

  function syncHourglass(root, durationSeconds, status, remainingSeconds) {
    if (!root || !global.ActivityHourglassUI) return;
    const duration = Math.max(1, Number(durationSeconds) || 1);
    let remaining = remainingSeconds;
    if (status === 'idle') {
      remaining = duration;
    } else if (status === 'finished') {
      remaining = 0;
    }
    ActivityHourglassUI.applyToRoot(root, remaining, duration, status);
  }

  function overlayHourglassMountHtml() {
    if (!global.ActivityHourglassUI) return '';
    return ActivityHourglassUI.mountHtml('activity-hourglass-mount--large');
  }

  function inlineTimerIconHtml() {
    return '<span class="activity-timer-inline-icon" aria-hidden="true">⏳</span>';
  }

  function readTimerState(itemId, duration, subStepId) {
    const session = (me && currentDate && global.ActivityTimerSession)
      ? ActivityTimerSession.getSession(me.id, currentDate, itemId, subStepId || undefined)
      : null;
    let status = ActivityTimerSession
      ? ActivityTimerSession.resolveStatus(session, duration)
      : 'idle';
    let remaining = duration;
    if (status !== 'idle') {
      remaining = ActivityTimerSession.computeRemainingSeconds(session, duration);
      if (status === 'running' && remaining <= 0) status = 'finished';
    }
    const progress = ActivityTimerSession.sandProgress(
      status === 'idle' ? duration : remaining,
      duration
    );
    return { session, status, remaining, duration, progress };
  }

  function readItemState(item) {
    return readTimerState(item.id, item.duration_seconds, null);
  }

  function renderTimerInner(st, itemId, subStepId, substepLayout) {
    const subAttr = subStepId ? ' data-sub-step-id="' + subStepId + '"' : '';
    const display = st.status === 'idle'
      ? ActivityTimerSession.formatDisplay(st.duration)
      : ActivityTimerSession.formatDisplay(st.remaining);
    const startLabel = substepLayout ? t('activityTimer.startShort') : t('activityTimer.start');

    if (st.status === 'idle') {
      return (
        '<div class="activity-timer-controls-row">' +
          inlineTimerIconHtml() +
          '<span class="activity-timer-digits" aria-live="polite">' + display + '</span>' +
          '<button type="button" class="activity-timer-start btn-child-action" data-item-id="' + itemId + '"' + subAttr + '>' +
            startLabel + '</button>' +
        '</div>'
      );
    }
    if (st.status === 'finished') {
      return (
        '<div class="activity-timer-controls-row">' +
          inlineTimerIconHtml() +
          '<span class="activity-timer-digits" aria-live="polite">0:00</span>' +
          '<p class="activity-timer-done-label">' + t('activityTimer.done') + '</p>' +
          '<button type="button" class="activity-timer-open-compact text-sm font-semibold text-navy underline" data-item-id="' + itemId + '"' + subAttr + '>' +
            t('activityTimer.open') + '</button>' +
        '</div>'
      );
    }
    const statusLabel = st.status === 'paused' ? t('activityTimer.paused') : t('activityTimer.running');
    return (
      '<button type="button" class="activity-timer-compact-btn" data-item-id="' + itemId + '"' + subAttr + '>' +
        '<div class="activity-timer-controls-row">' +
          inlineTimerIconHtml() +
          '<span class="activity-timer-digits" aria-live="polite">' + display + '</span>' +
          '<span class="activity-timer-status-label">' + statusLabel + '</span>' +
        '</div>' +
      '</button>'
    );
  }

  function renderTimerWrap(itemId, subStepId, st, substepLayout) {
    const ariaLabel = st.status === 'finished'
      ? t('activityTimer.ariaFinished')
      : ariaRemainingLabel(st.remaining);
    const subAttr = subStepId ? ' data-sub-step-id="' + subStepId + '"' : '';
    const wrapCls = 'activity-timer-wrap' + (substepLayout ? ' activity-timer-wrap--substep' : '');
    return (
      '<div class="' + wrapCls + '" id="' + wrapDomId(itemId, subStepId) + '" data-item-id="' + itemId + '"' + subAttr +
           ' data-duration="' + st.duration + '" data-status="' + st.status + '"' +
           ' onclick="event.stopPropagation()">' +
        renderTimerInner(st, itemId, subStepId, substepLayout) +
        '<span class="sr-only activity-timer-aria">' + ariaLabel + '</span>' +
      '</div>'
    );
  }

  function renderBlock(item) {
    if (!itemHasTimer(item) || !me || !currentDate || !global.ActivityTimerSession) return '';
    const st = readItemState(item);
    return renderTimerWrap(item.id, null, st, false);
  }

  function renderSubStepBlock(itemId, step) {
    if (!subStepHasTimer(step) || !me || !currentDate || !global.ActivityTimerSession) return '';
    const st = readTimerState(itemId, step.duration_seconds, step.id);
    return renderTimerWrap(itemId, step.id, st, true);
  }

  const FINISH_CELEBRATION_MS = 15000;
  let _finishCelebrationActive = false;
  let _finishSoundInterval = null;
  let _finishCelebrationEndTimer = null;
  let _finishCelebrationLayer = null;

  function primeEndAudio() {
    try {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const resume = ctx.resume ? ctx.resume() : Promise.resolve();
      resume.then(function () { ctx.close(); }).catch(function () { ctx.close(); });
    } catch { /* ignore */ }
  }

  function playEndChime(loud) {
    try {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const peak = loud ? 0.48 : 0.12;
      const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
      const startTone = function () {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.setValueAtTime(peak, now);
        master.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
        master.connect(ctx.destination);

        notes.forEach(function (freq, i) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const t0 = now + i * 0.1;
          osc.type = i % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, t0);
          g.gain.setValueAtTime(0.001, t0);
          g.gain.linearRampToValueAtTime(0.85, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
          osc.connect(g);
          g.connect(master);
          osc.start(t0);
          osc.stop(t0 + 0.24);
        });
        window.setTimeout(function () {
          try { ctx.close(); } catch { /* ignore */ }
        }, 1200);
      };
      if (ctx.state === 'suspended' && ctx.resume) {
        ctx.resume().then(startTone).catch(function () { ctx.close(); });
      } else {
        startTone();
      }
    } catch { /* ignore */ }
  }

  function ensureFinishCelebrationLayer() {
    if (_finishCelebrationLayer) return _finishCelebrationLayer;
    const layer = document.createElement('div');
    layer.id = 'activity-timer-celebration';
    layer.className = 'activity-timer-celebration';
    layer.hidden = true;
    layer.setAttribute('role', 'button');
    layer.setAttribute('aria-label', t('activityTimer.finishTapDismiss'));
    layer.innerHTML = '<div class="activity-timer-celebration__burst"></div>';
    layer.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      stopFinishCelebration();
    });
    document.body.appendChild(layer);
    _finishCelebrationLayer = layer;
    return layer;
  }

  function stopFinishCelebration() {
    if (!_finishCelebrationActive && !_finishCelebrationLayer) return;
    _finishCelebrationActive = false;
    if (_finishCelebrationLayer) {
      _finishCelebrationLayer.hidden = true;
      _finishCelebrationLayer.classList.remove('activity-timer-celebration--on');
    }
    if (_finishSoundInterval) {
      clearInterval(_finishSoundInterval);
      _finishSoundInterval = null;
    }
    if (_finishCelebrationEndTimer) {
      clearTimeout(_finishCelebrationEndTimer);
      _finishCelebrationEndTimer = null;
    }
  }

  function startFinishCelebration() {
    if (reducedMotion()) {
      playEndChime(true);
      if (global.Platform && global.Platform.haptics) global.Platform.haptics.medium();
      return;
    }
    stopFinishCelebration();
    _finishCelebrationActive = true;
    const layer = ensureFinishCelebrationLayer();
    layer.hidden = false;
    layer.classList.add('activity-timer-celebration--on');
    playEndChime(true);
    if (global.Platform && global.Platform.haptics) global.Platform.haptics.medium();
    _finishSoundInterval = setInterval(function () {
      playEndChime(true);
    }, 1400);
    _finishCelebrationEndTimer = setTimeout(stopFinishCelebration, FINISH_CELEBRATION_MS);
  }

  function playFinishEffects() {
    startFinishCelebration();
  }

  function maybeFinishNatural(itemId, durationSeconds, subStepId) {
    const session = ActivityTimerSession.getSession(me.id, currentDate, itemId, subStepId || undefined);
    const status = ActivityTimerSession.resolveStatus(session, durationSeconds);
    if (status !== 'finished') return false;
    if (session && !session.end_sound_played) {
      ActivityTimerSession.setEndSoundPlayed(me.id, currentDate, itemId, subStepId || undefined);
      ActivityTimerSession.markFinished(me.id, currentDate, itemId, subStepId || undefined);
      playFinishEffects();
    }
    return true;
  }

  function refreshItemUI(itemId, durationSeconds, subStepId) {
    const wrap = document.getElementById(wrapDomId(itemId, subStepId || null));
    if (!wrap || !me || !currentDate) return;

    maybeFinishNatural(itemId, durationSeconds, subStepId);

    const session = ActivityTimerSession.getSession(me.id, currentDate, itemId, subStepId || undefined);
    let status = ActivityTimerSession.resolveStatus(session, durationSeconds);
    let remaining = durationSeconds;
    if (status !== 'idle') {
      remaining = ActivityTimerSession.computeRemainingSeconds(session, durationSeconds);
      if (status === 'running' && remaining <= 0) status = 'finished';
    }
    wrap.dataset.status = status;

    const digits = wrap.querySelector('.activity-timer-digits');
    const aria = wrap.querySelector('.activity-timer-aria');
    const display = status === 'idle'
      ? ActivityTimerSession.formatDisplay(durationSeconds)
      : (status === 'finished' ? '0:00' : ActivityTimerSession.formatDisplay(remaining));

    if (digits) digits.textContent = display;
    if (aria) {
      aria.textContent = status === 'finished' ? t('activityTimer.ariaFinished') : ariaRemainingLabel(remaining);
    }

    const statusLabel = wrap.querySelector('.activity-timer-status-label');
    if (statusLabel) {
      statusLabel.textContent = status === 'paused' ? t('activityTimer.paused') : t('activityTimer.running');
    }

    if (_overlayItem && _overlayItem.id === itemId
        && (_overlayItem.sub_step_id || null) === (subStepId || null)
        && _overlayEl && !_overlayEl.hidden) {
      syncOverlayUI();
    }
  }

  function ensureOverlay() {
    if (_overlayEl) return _overlayEl;
    const el = document.createElement('div');
    el.id = 'activity-timer-overlay';
    el.className = 'activity-timer-overlay';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="activity-timer-overlay__backdrop"></div>' +
      '<div class="activity-timer-overlay__panel">' +
        '<button type="button" class="activity-timer-overlay__close" aria-label="' + t('activityTimer.close') + '">×</button>' +
        '<div class="activity-timer-overlay__head">' +
          '<span class="activity-timer-overlay__visual" id="activity-timer-overlay-visual"></span>' +
          '<h2 class="activity-timer-overlay__title" id="activity-timer-overlay-title"></h2>' +
        '</div>' +
        '<div class="activity-timer-overlay__hourglass" id="activity-timer-overlay-hourglass"></div>' +
        '<div class="activity-timer-overlay__time">' +
          '<p class="activity-timer-overlay__digits" id="activity-timer-overlay-digits"></p>' +
          '<p class="activity-timer-overlay__status" id="activity-timer-overlay-status"></p>' +
        '</div>' +
        '<div class="activity-timer-overlay__actions">' +
          '<button type="button" class="activity-timer-overlay__btn activity-timer-overlay__btn--primary" data-action="start">' + t('activityTimer.startShort') + '</button>' +
          '<button type="button" class="activity-timer-overlay__btn activity-timer-overlay__btn--primary" data-action="resume">' + t('activityTimer.resume') + '</button>' +
          '<button type="button" class="activity-timer-overlay__btn activity-timer-overlay__btn--secondary" data-action="pause">' + t('activityTimer.pause') + '</button>' +
          '<button type="button" class="activity-timer-overlay__btn activity-timer-overlay__btn--secondary" data-action="stop">' + t('activityTimer.stop') + '</button>' +
          '<button type="button" class="activity-timer-overlay__btn activity-timer-overlay__btn--secondary" data-action="restart">' + t('activityTimer.restartShort') + '</button>' +
          '<button type="button" class="activity-timer-overlay__btn activity-timer-overlay__btn--done" data-action="done">' + t('activityTimer.complete') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    el.querySelector('.activity-timer-overlay__close').addEventListener('click', function (e) {
      e.preventDefault();
      closeOverlay();
    });
    el.querySelector('.activity-timer-overlay__backdrop').addEventListener('click', function (e) {
      e.preventDefault();
      closeOverlay();
    });
    el.querySelector('.activity-timer-overlay__actions').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn || !_overlayItem) return;
      e.preventDefault();
      const action = btn.dataset.action;
      const itemId = _overlayItem.id;
      const subStepId = _overlayItem.sub_step_id || null;
      const duration = _overlayItem.duration_seconds;
      if (action === 'start') onStart(itemId, true, subStepId);
      else if (action === 'pause') {
        ActivityTimerSession.pauseSession(me.id, currentDate, itemId, duration, subStepId || undefined);
        if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();
      } else if (action === 'resume') {
        ActivityTimerSession.resumeSession(me.id, currentDate, itemId, subStepId || undefined);
        if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();
      }
      else if (action === 'stop') {
        ActivityTimerSession.stopSession(me.id, currentDate, itemId, subStepId || undefined);
        refreshItemUI(itemId, duration, subStepId);
        if (!subStepId) rerenderCompactBlock(itemId);
        else if (typeof global.renderSubStepList === 'function') renderSubStepList(itemId);
      } else if (action === 'restart') onRestart(itemId, subStepId);
      else if (action === 'done') onComplete(itemId, subStepId);
      syncOverlayUI();
      refreshItemUI(itemId, duration, subStepId);
      syncScreenWakeLock();
    });

    _overlayEl = el;
    return el;
  }

  function lockScroll() {
    _scrollLockY = window.scrollY || 0;
    document.body.classList.add('activity-timer-overlay-open');
    document.body.style.top = '-' + _scrollLockY + 'px';
  }

  function unlockScroll() {
    document.body.classList.remove('activity-timer-overlay-open');
    document.body.style.top = '';
    window.scrollTo(0, _scrollLockY);
  }

  function syncOverlayUI() {
    if (!_overlayEl || !_overlayItem || !me || !currentDate) return;
    const item = _overlayItem;
    const duration = item.duration_seconds;
    const subStepId = item.sub_step_id || null;
    maybeFinishNatural(item.id, duration, subStepId);

    const session = ActivityTimerSession.getSession(me.id, currentDate, item.id, subStepId || undefined);
    let status = ActivityTimerSession.resolveStatus(session, duration);
    let remaining = duration;
    if (status !== 'idle') {
      remaining = ActivityTimerSession.computeRemainingSeconds(session, duration);
      if (status === 'running' && remaining <= 0) status = 'finished';
    }

    const title = _overlayEl.querySelector('#activity-timer-overlay-title');
    const visual = _overlayEl.querySelector('#activity-timer-overlay-visual');
    const hgSlot = _overlayEl.querySelector('#activity-timer-overlay-hourglass');
    const digits = _overlayEl.querySelector('#activity-timer-overlay-digits');
    const statusEl = _overlayEl.querySelector('#activity-timer-overlay-status');

    if (title) title.textContent = item.display_name || item.name || '';
    if (visual) {
      const visKey = String(item.id) + ':' + String(subStepId || '');
      if (visual.dataset.visKey !== visKey) {
        visual.dataset.visKey = visKey;
        visual.innerHTML = activityVisualHtml(item);
      }
    }
    if (hgSlot && !hgSlot.querySelector('[data-hourglass-mount="1"]')) {
      hgSlot.innerHTML = overlayHourglassMountHtml();
    }
    syncHourglass(hgSlot, duration, status, remaining);

    const display = status === 'idle'
      ? ActivityTimerSession.formatDisplay(duration)
      : (status === 'finished' ? '0:00' : ActivityTimerSession.formatDisplay(remaining));
    if (digits) digits.textContent = display;

    let statusText = '';
    if (status === 'idle') statusText = t('activityTimer.ready');
    else if (status === 'running') statusText = t('activityTimer.running');
    else if (status === 'paused') statusText = t('activityTimer.paused');
    else statusText = t('activityTimer.done');
    if (statusEl) statusEl.textContent = statusText;

    const actions = _overlayEl.querySelector('.activity-timer-overlay__actions');
    if (actions) {
      actions.querySelector('[data-action="start"]').hidden = status !== 'idle';
      actions.querySelector('[data-action="pause"]').hidden = status !== 'running';
      actions.querySelector('[data-action="resume"]').hidden = status !== 'paused';
      actions.querySelector('[data-action="stop"]').hidden = status === 'idle';
      actions.querySelector('[data-action="restart"]').hidden = status === 'idle';
      actions.querySelector('[data-action="done"]').hidden = status !== 'finished';
    }
  }

  function openOverlay(item) {
    if (!item || !timersActive() || !item.duration_seconds || item.duration_seconds < 5) return;
    ensureOverlay();
    _overlayItem = item;
    syncOverlayUI();
    _overlayEl.classList.remove('activity-timer-overlay--closing');
    _overlayEl.hidden = false;
    if (!reducedMotion()) {
      _overlayEl.classList.remove('activity-timer-overlay--open');
      void _overlayEl.offsetWidth;
      _overlayEl.classList.add('activity-timer-overlay--open');
    } else {
      _overlayEl.classList.add('activity-timer-overlay--open');
    }
    lockScroll();
    const closeBtn = _overlayEl.querySelector('.activity-timer-overlay__close');
    if (closeBtn) closeBtn.focus();
  }

  function closeOverlay() {
    stopFinishCelebration();
    if (!_overlayEl || _overlayEl.hidden) return;
    const finish = function () {
      _overlayEl.hidden = true;
      _overlayEl.classList.remove('activity-timer-overlay--closing', 'activity-timer-overlay--open');
      unlockScroll();
      syncScreenWakeLock();
    };
    if (reducedMotion()) {
      finish();
      return;
    }
    _overlayEl.classList.remove('activity-timer-overlay--open');
    _overlayEl.classList.add('activity-timer-overlay--closing');
    window.setTimeout(finish, 340);
  }

  function rerenderCompactBlock(itemId) {
    const wrap = document.getElementById(wrapDomId(itemId, null));
    if (!wrap) return;
    const parent = wrap.parentNode;
    if (!parent) return;
    const item = _overlayItem && _overlayItem.id === itemId
      ? _overlayItem
      : buildOverlayItemFromDom(itemId, document.getElementById('card-' + itemId));
    const html = renderBlock(item);
    if (!html) {
      wrap.remove();
      return;
    }
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const next = temp.firstElementChild;
    if (next) parent.replaceChild(next, wrap);
  }

  function onStart(itemId, stayInOverlay, subStepId) {
    primeEndAudio();
    const key = tapKey(itemId, subStepId);
    const now = Date.now();
    if (_lastStartTap[key] && now - _lastStartTap[key] < DEBOUNCE_MS) return;
    _lastStartTap[key] = now;

    const wrap = document.getElementById(wrapDomId(itemId, subStepId || null));
    let duration = wrap ? parseInt(wrap.dataset.duration, 10) : 0;
    if (!duration && _overlayItem && _overlayItem.id === itemId) {
      duration = _overlayItem.duration_seconds;
    }
    if (!duration || !me || !currentDate) return;

    ActivityTimerSession.startSession(me.id, currentDate, itemId, duration, subStepId || undefined);
    if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();

    if (_overlayItem && _overlayItem.id === itemId) {
      _overlayItem.duration_seconds = duration;
    }
    if (subStepId) {
      if (typeof global.renderSubStepList === 'function') renderSubStepList(itemId);
    } else {
      rerenderCompactBlock(itemId);
    }
    refreshItemUI(itemId, duration, subStepId);
    syncOverlayUI();

    if (!stayInOverlay) {
      const card = document.getElementById('card-' + itemId);
      _overlayItem = buildOverlayItemFromDom(itemId, card, subStepId);
      openOverlay(_overlayItem);
    }
    syncScreenWakeLock();
  }

  function onRestart(itemId, subStepId) {
    const wrap = document.getElementById(wrapDomId(itemId, subStepId || null));
    const duration = wrap
      ? parseInt(wrap.dataset.duration, 10)
      : (_overlayItem && _overlayItem.duration_seconds);
    if (!duration || !me || !currentDate) return;
    ActivityTimerSession.startSession(me.id, currentDate, itemId, duration, subStepId || undefined, { force: true });
    if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();
    refreshItemUI(itemId, duration, subStepId);
    if (subStepId) {
      if (typeof global.renderSubStepList === 'function') renderSubStepList(itemId);
    } else {
      rerenderCompactBlock(itemId);
    }
    syncOverlayUI();
    syncScreenWakeLock();
  }

  function onComplete(itemId, subStepId) {
    ActivityTimerSession.clearSession(me.id, currentDate, itemId, subStepId || undefined);
    closeOverlay();
    syncScreenWakeLock();
    if (subStepId) {
      if (typeof global.renderSubStepList === 'function') renderSubStepList(itemId);
      return;
    }
    const wrap = document.getElementById(wrapDomId(itemId, null));
    const duration = wrap ? parseInt(wrap.dataset.duration, 10) : 0;
    if (wrap) wrap.remove();
    if (typeof global.toggleItem === 'function') {
      global.toggleItem(itemId, false);
    }
    if (duration) refreshItemUI(itemId, duration, null);
  }

  function tickAll() {
    document.querySelectorAll('.activity-timer-wrap[data-item-id]').forEach(function (wrap) {
      const itemId = wrap.dataset.itemId;
      const subStepId = wrap.dataset.subStepId || null;
      const duration = parseInt(wrap.dataset.duration, 10);
      if (!itemId || !duration) return;
      refreshItemUI(itemId, duration, subStepId);
    });
    syncScreenWakeLock();
  }

  function refreshParentTimerUi(itemId) {
    const wrap = document.getElementById(wrapDomId(itemId, null));
    if (!wrap) return;
    const card = document.getElementById('card-' + itemId);
    const duration = parseInt(wrap.dataset.duration, 10);
    const pseudoItem = {
      id: itemId,
      completed: card && card.classList.contains('done'),
      duration_seconds: duration,
      sub_step_timed_count: 0,
    };
    if (global.subStepCache && subStepCache[itemId]) {
      pseudoItem.sub_step_timed_count = subStepCache[itemId].filter(subStepHasTimer).length;
    }
    if (itemHasTimer(pseudoItem)) return;
    const row = wrap.closest('.activity-timer-card-row');
    if (row) row.remove();
    else wrap.remove();
  }

  function wireDelegation() {
    if (_wired) return;
    _wired = true;
    document.addEventListener('click', function (e) {
      const start = e.target.closest('.activity-timer-start');
      if (start) {
        e.preventDefault();
        e.stopPropagation();
        const itemId = start.dataset.itemId;
        const subStepId = start.dataset.subStepId || null;
        const card = document.getElementById('card-' + itemId);
        _overlayItem = buildOverlayItemFromDom(itemId, card, subStepId);
        onStart(itemId, false, subStepId);
        return;
      }
      const compact = e.target.closest('.activity-timer-compact-btn, .activity-timer-open-compact');
      if (compact) {
        e.preventDefault();
        e.stopPropagation();
        const itemId = compact.dataset.itemId;
        const subStepId = compact.dataset.subStepId || null;
        const card = document.getElementById('card-' + itemId);
        _overlayItem = buildOverlayItemFromDom(itemId, card, subStepId);
        openOverlay(_overlayItem);
      }
    }, true);
  }

  function buildOverlayItemFromDom(itemId, card, subStepId) {
    const wrap = document.getElementById(wrapDomId(itemId, subStepId || null));
    const duration = wrap ? parseInt(wrap.dataset.duration, 10) : 0;
    let name = card && card.dataset.itemName ? card.dataset.itemName : '';
    let icon = card && card.dataset.itemIcon ? card.dataset.itemIcon : '⭐';
    if (subStepId && global.subStepCache && subStepCache[itemId]) {
      const step = subStepCache[itemId].find(function (s) { return String(s.id) === String(subStepId); });
      if (step) {
        name = step.display_name || step.name || name;
        icon = step.icon || icon;
      }
    }
    return {
      id: itemId,
      sub_step_id: subStepId || null,
      duration_seconds: duration,
      completed: false,
      name: name,
      display_name: name,
      icon: icon,
    };
  }

  function initForSubSteps(_itemId, _steps) {
    if (!timersActive()) return;
    if (global.ActivityHourglassUI) ActivityHourglassUI.preload();
    wireDelegation();
    ensureOverlay();
    if (!_tickInterval) {
      _tickInterval = setInterval(tickAll, 1000);
    }
    tickAll();
  }

  function initForItems(items) {
    if (!timersActive()) return;
    if (global.ActivityHourglassUI) ActivityHourglassUI.preload();
    wireDelegation();
    ensureOverlay();
    const timed = (items || []).filter(itemHasTimer);
    const ids = timed.map(function (i) { return i.id; });
    if (me && currentDate && global.ActivityTimerSession) {
      ActivityTimerSession.pruneSessions(me.id, currentDate, ids);
    }
    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(tickAll, 1000);
    tickAll();
  }

  function clearForItem(itemId) {
    if (me && currentDate && global.ActivityTimerSession) {
      ActivityTimerSession.clearSessionsForDailyLogItem(me.id, currentDate, itemId);
    }
    if (_overlayItem && _overlayItem.id === itemId) closeOverlay();
    document.querySelectorAll('.activity-timer-wrap[data-item-id="' + itemId + '"]').forEach(function (wrap) {
      wrap.remove();
    });
  }

  function attachItemMeta(item) {
    if (!item || !item.id) return;
    _overlayItem = item;
  }

  global.ChildActivityTimer = {
    itemHasTimer: itemHasTimer,
    subStepHasTimer: subStepHasTimer,
    renderBlock: renderBlock,
    renderSubStepBlock: renderSubStepBlock,
    initForItems: initForItems,
    initForSubSteps: initForSubSteps,
    clearForItem: clearForItem,
    tickAll: tickAll,
    openOverlay: openOverlay,
    attachItemMeta: attachItemMeta,
    refreshParentTimerUi: refreshParentTimerUi,
    sandProgress: function (r, d) {
      return global.ActivityTimerSession
        ? ActivityTimerSession.sandProgress(r, d)
        : 0;
    },
  };
})(window);
