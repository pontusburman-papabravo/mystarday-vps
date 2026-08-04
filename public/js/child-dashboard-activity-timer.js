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

  function itemHasTimer(item) {
    return typeof activityTimerV2Enabled !== 'undefined'
      && activityTimerV2Enabled
      && typeof activityTimersEnabled !== 'undefined'
      && activityTimersEnabled
      && item
      && !item.completed
      && item.duration_seconds != null
      && item.duration_seconds >= 5;
  }

  function activityVisualHtml(item) {
    if (global.ActivityVisual && typeof ActivityVisual.inline === 'function') {
      return ActivityVisual.inline(item);
    }
    return item.icon || '⭐';
  }

  function hourglassMarkup(compact) {
    const cls = compact ? 'at-hourglass at-hourglass--compact' : 'at-hourglass at-hourglass--large';
    return (
      '<div class="' + cls + '" aria-hidden="true" style="--at-progress:0">' +
        '<div class="at-hourglass__glow"></div>' +
        '<div class="at-hourglass__frame">' +
          '<div class="at-hourglass__glass at-hourglass__glass--top"></div>' +
          '<div class="at-hourglass__chamber at-hourglass__chamber--top">' +
            '<div class="at-hourglass__sand at-hourglass__sand-top"></div>' +
          '</div>' +
          '<div class="at-hourglass__neck">' +
            '<div class="at-hourglass__stream"></div>' +
          '</div>' +
          '<div class="at-hourglass__chamber at-hourglass__chamber--bottom">' +
            '<div class="at-hourglass__sand at-hourglass__sand-bottom"></div>' +
          '</div>' +
          '<div class="at-hourglass__glass at-hourglass__glass--bottom"></div>' +
        '</div>' +
        '<div class="at-hourglass__complete">' +
          '<span class="at-hourglass__check" aria-hidden="true"></span>' +
        '</div>' +
      '</div>'
    );
  }

  function applyHourglass(root, progress, status) {
    if (!root) return;
    const hg = root.querySelector('.at-hourglass') || root.closest('.at-hourglass') || root;
    if (!hg || !hg.classList.contains('at-hourglass')) return;
    const p = Math.max(0, Math.min(1, progress));
    hg.style.setProperty('--at-progress', p.toFixed(4));
    const running = status === 'running';
    const finished = status === 'finished';
    const paused = status === 'paused';
    const rm = reducedMotion();
    const stream = hg.querySelector('.at-hourglass__stream');
    if (stream) {
      const active = running && !rm && p > 0 && p < 1;
      stream.classList.toggle('at-hourglass__stream--active', active);
      stream.style.opacity = active ? String(0.5 + (1 - p) * 0.4) : '0';
    }
    hg.classList.toggle('at-hourglass--running', running);
    hg.classList.toggle('at-hourglass--paused', paused);
    hg.classList.toggle('at-hourglass--finished', finished);
    hg.dataset.status = status || 'idle';
  }

  function readItemState(item) {
    const duration = item.duration_seconds;
    const session = (me && currentDate && global.ActivityTimerSession)
      ? ActivityTimerSession.getSession(me.id, currentDate, item.id)
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

  function renderBlock(item) {
    if (!itemHasTimer(item) || !me || !currentDate || !global.ActivityTimerSession) return '';

    const st = readItemState(item);
    const display = st.status === 'idle'
      ? ActivityTimerSession.formatDisplay(st.duration)
      : ActivityTimerSession.formatDisplay(st.remaining);
    const ariaLabel = st.status === 'finished'
      ? t('activityTimer.ariaFinished')
      : ariaRemainingLabel(st.remaining);

    let body = '';
    if (st.status === 'idle') {
      body =
        hourglassMarkup(true) +
        '<span class="activity-timer-digits" aria-live="polite">' + display + '</span>' +
        '<button type="button" class="activity-timer-start btn-child-action" data-item-id="' + item.id + '">' +
          t('activityTimer.start') + '</button>';
    } else if (st.status === 'finished') {
      body =
        hourglassMarkup(true) +
        '<span class="activity-timer-digits" aria-live="polite">0:00</span>' +
        '<p class="activity-timer-done-label">' + t('activityTimer.done') + '</p>' +
        '<button type="button" class="activity-timer-open-compact text-sm font-semibold text-navy underline" data-item-id="' + item.id + '">' +
          t('activityTimer.open') + '</button>';
    } else {
      const statusLabel = st.status === 'paused' ? t('activityTimer.paused') : t('activityTimer.running');
      body =
        '<button type="button" class="activity-timer-compact-btn" data-item-id="' + item.id + '">' +
          hourglassMarkup(true) +
          '<span class="activity-timer-digits" aria-live="polite">' + display + '</span>' +
          '<span class="activity-timer-status-label">' + statusLabel + '</span>' +
        '</button>';
    }

    return (
      '<div class="activity-timer-wrap" id="activity-timer-' + item.id + '" data-item-id="' + item.id + '"' +
           ' data-duration="' + st.duration + '" data-status="' + st.status + '">' +
        body +
        '<span class="sr-only activity-timer-aria">' + ariaLabel + '</span>' +
      '</div>'
    );
  }

  function playEndSound() {
    if (reducedMotion()) return;
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

  function maybeFinishNatural(itemId, durationSeconds) {
    const session = ActivityTimerSession.getSession(me.id, currentDate, itemId);
    let status = ActivityTimerSession.resolveStatus(session, durationSeconds);
    if (status !== 'finished') return false;
    if (session && !session.end_sound_played) {
      ActivityTimerSession.setEndSoundPlayed(me.id, currentDate, itemId);
      ActivityTimerSession.markFinished(me.id, currentDate, itemId);
      playEndSound();
      if (global.Platform && global.Platform.haptics) global.Platform.haptics.medium();
    }
    return true;
  }

  function refreshItemUI(itemId, durationSeconds) {
    const wrap = document.getElementById('activity-timer-' + itemId);
    if (!wrap || !me || !currentDate) return;

    maybeFinishNatural(itemId, durationSeconds);

    const session = ActivityTimerSession.getSession(me.id, currentDate, itemId);
    let status = ActivityTimerSession.resolveStatus(session, durationSeconds);
    let remaining = durationSeconds;
    if (status !== 'idle') {
      remaining = ActivityTimerSession.computeRemainingSeconds(session, durationSeconds);
      if (status === 'running' && remaining <= 0) status = 'finished';
    }
    wrap.dataset.status = status;

    const progress = ActivityTimerSession.sandProgress(
      status === 'idle' ? durationSeconds : remaining,
      durationSeconds
    );
    applyHourglass(wrap, progress, status);

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

    if (_overlayItem && _overlayItem.id === itemId && _overlayEl && !_overlayEl.hidden) {
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
        '<div class="activity-timer-overlay__visual" id="activity-timer-overlay-visual"></div>' +
        '<h2 class="activity-timer-overlay__title" id="activity-timer-overlay-title"></h2>' +
        '<div class="activity-timer-overlay__hourglass" id="activity-timer-overlay-hourglass"></div>' +
        '<p class="activity-timer-overlay__digits" id="activity-timer-overlay-digits"></p>' +
        '<p class="activity-timer-overlay__status" id="activity-timer-overlay-status"></p>' +
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
      const duration = _overlayItem.duration_seconds;
      if (action === 'start') onStart(itemId, true);
      else if (action === 'pause') {
        ActivityTimerSession.pauseSession(me.id, currentDate, itemId, duration);
        if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();
      } else if (action === 'resume') {
        ActivityTimerSession.resumeSession(me.id, currentDate, itemId);
        if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();
      }
      else if (action === 'stop') {
        ActivityTimerSession.stopSession(me.id, currentDate, itemId);
        refreshItemUI(itemId, duration);
        rerenderCompactBlock(itemId);
      } else if (action === 'restart') onRestart(itemId);
      else if (action === 'done') onComplete(itemId);
      syncOverlayUI();
      refreshItemUI(itemId, duration);
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
    maybeFinishNatural(item.id, duration);

    const session = ActivityTimerSession.getSession(me.id, currentDate, item.id);
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
    if (visual) visual.innerHTML = activityVisualHtml(item);
    if (hgSlot && !hgSlot.querySelector('.at-hourglass')) {
      hgSlot.innerHTML = hourglassMarkup(false);
    }
    const progress = ActivityTimerSession.sandProgress(
      status === 'idle' ? duration : remaining,
      duration
    );
    applyHourglass(hgSlot, progress, status);

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
    }
  }

  function openOverlay(item) {
    if (!itemHasTimer(item)) return;
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
    if (!_overlayEl || _overlayEl.hidden) return;
    const finish = function () {
      _overlayEl.hidden = true;
      _overlayEl.classList.remove('activity-timer-overlay--closing', 'activity-timer-overlay--open');
      unlockScroll();
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
    const wrap = document.getElementById('activity-timer-' + itemId);
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

  function onStart(itemId, stayInOverlay) {
    const now = Date.now();
    if (_lastStartTap[itemId] && now - _lastStartTap[itemId] < DEBOUNCE_MS) return;
    _lastStartTap[itemId] = now;

    const wrap = document.getElementById('activity-timer-' + itemId);
    let duration = wrap ? parseInt(wrap.dataset.duration, 10) : 0;
    if (!duration && _overlayItem && _overlayItem.id === itemId) {
      duration = _overlayItem.duration_seconds;
    }
    if (!duration || !me || !currentDate) return;

    ActivityTimerSession.startSession(me.id, currentDate, itemId, duration);
    if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();

    if (_overlayItem && _overlayItem.id === itemId) {
      _overlayItem.duration_seconds = duration;
    }
    rerenderCompactBlock(itemId);
    refreshItemUI(itemId, duration);
    syncOverlayUI();

    if (!stayInOverlay) {
      const card = document.getElementById('card-' + itemId);
      _overlayItem = buildOverlayItemFromDom(itemId, card);
      openOverlay(_overlayItem);
    }
  }

  function onRestart(itemId) {
    const wrap = document.getElementById('activity-timer-' + itemId);
    const duration = wrap
      ? parseInt(wrap.dataset.duration, 10)
      : (_overlayItem && _overlayItem.duration_seconds);
    if (!duration || !me || !currentDate) return;
    ActivityTimerSession.startSession(me.id, currentDate, itemId, duration);
    if (global.Platform && global.Platform.haptics) global.Platform.haptics.light();
    refreshItemUI(itemId, duration);
    rerenderCompactBlock(itemId);
    syncOverlayUI();
  }

  function onComplete(itemId) {
    ActivityTimerSession.clearSession(me.id, currentDate, itemId);
    closeOverlay();
    const wrap = document.getElementById('activity-timer-' + itemId);
    const duration = wrap ? parseInt(wrap.dataset.duration, 10) : 0;
    if (wrap) wrap.remove();
    if (typeof global.toggleItem === 'function') {
      global.toggleItem(itemId, false);
    }
    if (duration) refreshItemUI(itemId, duration);
  }

  function tickAll() {
    document.querySelectorAll('.activity-timer-wrap[data-item-id]').forEach(function (wrap) {
      const itemId = wrap.dataset.itemId;
      const duration = parseInt(wrap.dataset.duration, 10);
      if (!itemId || !duration) return;
      refreshItemUI(itemId, duration);
    });
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
        const card = document.getElementById('card-' + itemId);
        _overlayItem = buildOverlayItemFromDom(itemId, card);
        onStart(itemId, false);
        openOverlay(_overlayItem);
        return;
      }
      const compact = e.target.closest('.activity-timer-compact-btn, .activity-timer-open-compact');
      if (compact) {
        e.preventDefault();
        e.stopPropagation();
        const itemId = compact.dataset.itemId;
        const card = document.getElementById('card-' + itemId);
        _overlayItem = buildOverlayItemFromDom(itemId, card);
        openOverlay(_overlayItem);
      }
    });
  }

  function buildOverlayItemFromDom(itemId, card) {
    const wrap = document.getElementById('activity-timer-' + itemId);
    const duration = wrap ? parseInt(wrap.dataset.duration, 10) : 0;
    return {
      id: itemId,
      duration_seconds: duration,
      completed: false,
      name: card && card.dataset.itemName ? card.dataset.itemName : '',
      display_name: card && card.dataset.itemName ? card.dataset.itemName : '',
      icon: card && card.dataset.itemIcon ? card.dataset.itemIcon : '⭐',
    };
  }

  function initForItems(items) {
    if (!activityTimerV2Enabled || !activityTimersEnabled) return;
    wireDelegation();
    ensureOverlay();
    const timed = (items || []).filter(itemHasTimer);
    const ids = timed.map(function (i) { return i.id; });
    if (me && currentDate && global.ActivityTimerSession) {
      ActivityTimerSession.pruneSessions(me.id, currentDate, ids);
    }
    timed.forEach(function (item) {
      const wrap = document.getElementById('activity-timer-' + item.id);
      if (wrap) {
        const st = readItemState(item);
        applyHourglass(wrap, st.progress, st.status);
      }
    });
    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(tickAll, 1000);
    tickAll();
  }

  function clearForItem(itemId) {
    if (me && currentDate && global.ActivityTimerSession) {
      ActivityTimerSession.clearSession(me.id, currentDate, itemId);
    }
    if (_overlayItem && _overlayItem.id === itemId) closeOverlay();
    const wrap = document.getElementById('activity-timer-' + itemId);
    if (wrap) wrap.remove();
  }

  function attachItemMeta(item) {
    if (!item || !item.id) return;
    _overlayItem = item;
  }

  global.ChildActivityTimer = {
    itemHasTimer: itemHasTimer,
    renderBlock: renderBlock,
    initForItems: initForItems,
    clearForItem: clearForItem,
    tickAll: tickAll,
    openOverlay: openOverlay,
    attachItemMeta: attachItemMeta,
    sandProgress: function (r, d) {
      return global.ActivityTimerSession
        ? ActivityTimerSession.sandProgress(r, d)
        : 0;
    },
  };
})(window);
