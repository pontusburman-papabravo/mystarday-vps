/**
 * activation-first-success-hub.js — single primary Hem coach when activation_first_success_v1 is ON.
 * Recoverable fetch/defer flow (#1023).
 */
(function () {
  'use strict';

  const MOUNT_ID = 'activationFirstSuccessCoachMount';
  const CACHE_MS = 45 * 1000;
  const FETCH_TIMEOUT_MS = 15000;
  const SESSION_SUPPRESS_KEY = 'msd_afs_continue_without_guide';
  const DEFER_DURATION_HOURS = 12;

  let cache = { at: 0, data: null, flagOn: false };
  let blockedState = null;
  let fetchGeneration = 0;
  let fetchInFlight = null;
  let retryInFlight = false;
  let deferInFlight = false;

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function track(eventType, meta) {
    if (typeof window.analytics === 'undefined' || !window.analytics.track) return;
    window.analytics.track(null, eventType, meta || {});
  }

  function trackOnce(eventType, dedupeKey, meta) {
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, String(Date.now()));
    } catch (_) { /* private mode */ }
    track(eventType, meta);
  }

  function isSessionSuppressed() {
    try {
      return sessionStorage.getItem(SESSION_SUPPRESS_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setSessionSuppressed() {
    try {
      sessionStorage.setItem(SESSION_SUPPRESS_KEY, '1');
    } catch (_) { /* private mode */ }
  }

  function clearBlockedState() {
    blockedState = null;
  }

  function classifyBlocked(errorClass, httpStatus) {
    return {
      errorClass: errorClass || 'server',
      httpStatus: typeof httpStatus === 'number' ? httpStatus : null,
      attempt: 1,
      retryCount: 0,
    };
  }

  function analyticsBase(payload, blocked) {
    const nextAction = (payload && payload.next_action) || (blocked && blocked.nextAction) || 'unknown';
    return {
      surface: 'home',
      next_action: nextAction,
    };
  }

  function trackShownOnce(payload) {
    if (!payload || !payload.next_action) return;
    const dedupeKey = 'msd_afs_shown_' + payload.next_action + '_' + (payload.funnel_step || '');
    trackOnce('activation_first_success_next_action_shown', dedupeKey, {
      next_action: payload.next_action,
      journey_phase: payload.journey_phase,
      funnel_step: payload.funnel_step,
      journey_action: payload.primary_action && payload.primary_action.action,
    });
  }

  function trackBlockedShownOnce(state, payload) {
    const dedupeKey = 'msd_afs_blocked_' + (state.errorClass || 'server');
    trackOnce('activation_first_success_blocked_shown', dedupeKey, Object.assign({}, analyticsBase(payload, state), {
      error_class: state.errorClass,
      http_status: state.httpStatus,
      attempt: state.attempt,
      retry_count: state.retryCount,
    }));
  }

  async function onDismissGrowth(payload) {
    if (!payload || !payload.dismiss_action || typeof window.apiFetch !== 'function') return;
    try {
      await window.apiFetch('/api/family/growth/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: payload.dismiss_action }),
      });
    } catch (_) { /* non-critical */ }
    cache = { at: 0, data: null, flagOn: false };
    clearBlockedState();
    render(null);
  }

  function onPrimaryCta(payload) {
    track('activation_first_success_cta_clicked', {
      next_action: payload.next_action,
      funnel_step: payload.funnel_step,
      journey_action: payload.primary_action && payload.primary_action.action,
    });
    const action = payload.next_action;
    if (action === 'child_access' || action === 'await_first_completion' || action === 'welcome_back') {
      if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
        DashboardChildHandoff.startChildLogin();
        return;
      }
      if (window.Auth && Auth.logout) {
        Auth.logout({ childFlow: true });
        return;
      }
      window.location.href = '/child-login';
      return;
    }
    if (action === 'invite_adult') {
      track('cta_invite_co_parent_clicked', { surface: 'journey_home' });
      if (window.CoParentInviteUI && typeof CoParentInviteUI.open === 'function') {
        CoParentInviteUI.open();
        return;
      }
      if (typeof window.openCoParentInviteModal === 'function') {
        openCoParentInviteModal();
        return;
      }
      window.location.href = '/settings#family';
      return;
    }
    if (action === 'share_week') {
      track('weekly_highlight_shared', { surface: 'journey_home', channel: 'primary_cta' });
      var text = payload.share_text || payload.body || '';
      if (navigator.share) {
        navigator.share({ text: text }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
      return;
    }
    if (action === 'refer_family') {
      if (window.ReferralShare && typeof ReferralShare.load === 'function') {
        ReferralShare.load().then(function (ref) {
          var payloadShare = ReferralShare.buildPayload(ref ? { personalUrl: ref.registerUrl } : {});
          if (navigator.share) {
            navigator.share({ text: payloadShare.text, url: payloadShare.url }).catch(function () {});
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(payloadShare.text).catch(function () {});
          }
          track('referral_link_shared', { surface: 'journey_home', personal: Boolean(ref) });
        });
        return;
      }
      window.location.href = '/settings';
      return;
    }
    if (action === 'parent_ack' && payload.cta_target) {
      window.location.href = payload.cta_target;
      return;
    }
    if (payload.cta_target) {
      window.location.href = payload.cta_target;
    }
  }

  function renderCoach(payload) {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return false;

    const headline = payload.headline || pt('home.firstSuccess.actions.' + payload.next_action + '.headline');
    const body = payload.body || pt('home.firstSuccess.actions.' + payload.next_action + '.body');
    const cta = payload.cta_label || pt('home.firstSuccess.actions.' + payload.next_action + '.cta');
    const pinHint = (payload.next_action === 'child_access' || payload.next_action === 'await_first_completion' || payload.next_action === 'welcome_back')
      ? '<p class="text-xs text-text-soft mt-2">' + esc(pt('home.firstSuccess.pinHint')) + '</p>'
      : '';

    const dismissHtml = payload.dismiss_action
      ? '<button type="button" class="activation-fs-dismiss w-full min-h-[44px] py-3 mt-2 rounded-xl border-2 border-lavender text-navy font-semibold text-sm">' +
        esc(pt('home.growth.dismissNotNow')) + '</button>'
      : '';

    const deferHtml = payload.can_defer
      ? '<button type="button" class="activation-fs-defer w-full min-h-[44px] py-3 mt-2 rounded-xl border-2 border-lavender text-navy font-semibold text-sm">' +
        esc(pt('home.firstSuccess.recovery.defer')) + '</button>'
      : '';

    const deferErrorHtml = '<p class="activation-fs-defer-error hidden text-sm text-red-700 mt-2" role="alert"></p>';

    mount.classList.remove('hidden');
    mount.setAttribute('data-authority', 'activation-first-success-v1');
    mount.innerHTML =
      '<div class="activation-fs-coach rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 mb-4" role="region" aria-label="' + esc(pt('home.firstSuccess.coachAria')) + '">' +
      '<p class="font-heading font-bold text-navy text-base mb-2">' + esc(headline) + '</p>' +
      '<p class="text-sm text-navy mb-3">' + esc(body) + '</p>' +
      pinHint +
      '<button type="button" class="activation-fs-cta w-full min-h-[44px] py-3 rounded-xl bg-gold text-white font-semibold text-sm">' + esc(cta) + '</button>' +
      deferHtml +
      dismissHtml +
      deferErrorHtml +
      '</div>';

    const btn = mount.querySelector('.activation-fs-cta');
    if (btn) {
      btn.addEventListener('click', function () { onPrimaryCta(payload); });
    }
    const dismissBtn = mount.querySelector('.activation-fs-dismiss');
    if (dismissBtn && payload.dismiss_action) {
      dismissBtn.addEventListener('click', function () { onDismissGrowth(payload); });
    }
    const deferBtn = mount.querySelector('.activation-fs-defer');
    if (deferBtn && payload.can_defer) {
      deferBtn.addEventListener('click', function () { onDefer(payload, deferBtn); });
    }

    if (payload.next_action === 'invite_adult') {
      track('cta_invite_co_parent_shown', { surface: 'journey_home' });
    }
    if (payload.next_action === 'share_week') {
      track('weekly_highlight_shown', { surface: 'journey_home' });
    }
    if (payload.next_action === 'refer_family') {
      track('referral_shown', { surface: 'journey_home' });
    }

    trackShownOnce(payload);
    return true;
  }

  function renderBlocked(state) {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return false;

    const retryLabel = state.retrying
      ? pt('home.firstSuccess.recovery.retrying')
      : pt('home.firstSuccess.recovery.retry');

    mount.classList.remove('hidden');
    mount.setAttribute('data-authority', 'activation-first-success-v1');
    mount.setAttribute('data-state', 'blocked');
    mount.innerHTML =
      '<div class="activation-fs-blocked rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 mb-4" role="region" aria-label="' + esc(pt('home.firstSuccess.recovery.fetchErrorHeadline')) + '">' +
      '<p class="font-heading font-bold text-navy text-base mb-2">' + esc(pt('home.firstSuccess.recovery.fetchErrorHeadline')) + '</p>' +
      '<p class="text-sm text-navy mb-3">' + esc(pt('home.firstSuccess.recovery.fetchErrorBody')) + '</p>' +
      '<div aria-live="polite" class="sr-only activation-fs-blocked-status">' + esc(state.retrying ? pt('home.firstSuccess.recovery.retrying') : '') + '</div>' +
      '<button type="button" class="activation-fs-retry w-full min-h-[44px] py-3 rounded-xl bg-gold text-white font-semibold text-sm"' +
        (state.retrying ? ' disabled' : '') + '>' + esc(retryLabel) + '</button>' +
      '<button type="button" class="activation-fs-continue w-full min-h-[44px] py-3 mt-2 rounded-xl border-2 border-lavender text-navy font-semibold text-sm">' +
        esc(pt('home.firstSuccess.recovery.continueWithoutGuide')) + '</button>' +
      '</div>';

    const retryBtn = mount.querySelector('.activation-fs-retry');
    if (retryBtn && !state.retrying) {
      retryBtn.addEventListener('click', function () { onRetry(retryBtn); });
    }
    const continueBtn = mount.querySelector('.activation-fs-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', onContinueWithoutGuide);
    }
    return true;
  }

  function render(payload) {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return false;
    if (isSessionSuppressed()) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      mount.removeAttribute('data-state');
      return false;
    }
    if (blockedState) {
      return renderBlocked(blockedState);
    }
    if (!payload || !payload.show_primary_coach || !payload.next_action || payload.next_action === 'none' || payload.deferred) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      mount.removeAttribute('data-state');
      return false;
    }
    return renderCoach(payload);
  }

  async function fetchNextAction(force, options) {
    const opts = options || {};
    const now = Date.now();
    if (!force && !blockedState && cache.data && now - cache.at < CACHE_MS) {
      return { ok: true, payload: cache.data, fromCache: true };
    }
    if (fetchInFlight && !force) {
      return fetchInFlight;
    }

    const gen = ++fetchGeneration;
    const run = async function () {
      if (typeof window.apiFetch !== 'function') {
        return { ok: false, blocked: classifyBlocked('network', null) };
      }

      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);
      try {
        const res = await window.apiFetch('/api/family/next-action', { signal: controller.signal });

        if (gen !== fetchGeneration) {
          return { ok: false, stale: true };
        }

        if (res.status === 401) {
          if (opts.skipAuthRecovery) {
            return { ok: false, authFailed: true };
          }
          if (window.Auth && typeof window.Auth.silentRefresh === 'function') {
            const refreshed = await window.Auth.silentRefresh();
            if (refreshed) {
              const retryRes = await window.apiFetch('/api/family/next-action', { signal: controller.signal });
              if (gen !== fetchGeneration) {
                return { ok: false, stale: true };
              }
              if (retryRes.status === 401) {
                return { ok: false, authFailed: true };
              }
              if (retryRes.status === 403) {
                let body403 = {};
                try { body403 = await retryRes.clone().json(); } catch (_) { /* ignore */ }
                if (body403.error === 'PEDAGOG_ONLY') {
                  return { ok: false, pedagogOnly: true };
                }
              }
              if (retryRes.status === 429) {
                return { ok: false, blocked: classifyBlocked('rate_limited', 429) };
              }
              if (retryRes.status >= 500) {
                return { ok: false, blocked: classifyBlocked('server', retryRes.status) };
              }
              if (!retryRes.ok) {
                return { ok: false, blocked: classifyBlocked('server', retryRes.status) };
              }
              const retryData = await retryRes.json();
              if (gen !== fetchGeneration) {
                return { ok: false, stale: true };
              }
              cache = {
                at: Date.now(),
                data: retryData,
                flagOn: Boolean(retryData.enabled),
              };
              clearBlockedState();
              return { ok: true, payload: retryData };
            }
          }
          return { ok: false, authFailed: true };
        }

        if (res.status === 403) {
          let body = {};
          try { body = await res.clone().json(); } catch (_) { /* ignore */ }
          if (body.error === 'PEDAGOG_ONLY') {
            return { ok: false, pedagogOnly: true };
          }
        }

        if (res.status === 429) {
          return { ok: false, blocked: classifyBlocked('rate_limited', 429) };
        }

        if (res.status >= 500) {
          return { ok: false, blocked: classifyBlocked('server', res.status) };
        }

        if (!res.ok) {
          return { ok: false, blocked: classifyBlocked('server', res.status) };
        }

        const data = await res.json();
        if (gen !== fetchGeneration) {
          return { ok: false, stale: true };
        }
        cache = {
          at: Date.now(),
          data: data,
          flagOn: Boolean(data.enabled),
        };
        clearBlockedState();
        return { ok: true, payload: data };
      } catch (err) {
        if (gen !== fetchGeneration) {
          return { ok: false, stale: true };
        }
        const isTimeout = err && (err.name === 'AbortError' || err.name === 'TimeoutError');
        const isNetwork = err && err.name === 'TypeError';
        const errorClass = isTimeout ? 'timeout' : (isNetwork ? 'network' : 'network');
        return { ok: false, blocked: classifyBlocked(errorClass, null) };
      } finally {
        clearTimeout(timer);
        if (gen === fetchGeneration) {
          fetchInFlight = null;
        }
      }
    };

    fetchInFlight = run();
    return fetchInFlight;
  }

  async function onRetry(retryBtn) {
    if (retryInFlight) return;
    retryInFlight = true;
    const prevRetryCount = blockedState ? blockedState.retryCount : 0;
    if (blockedState) {
      blockedState.retrying = true;
      blockedState.retryCount = prevRetryCount + 1;
      renderBlocked(blockedState);
    }

    track('activation_first_success_retry_clicked', Object.assign({}, analyticsBase(cache.data, blockedState), {
      error_class: blockedState && blockedState.errorClass,
      http_status: blockedState && blockedState.httpStatus,
      attempt: blockedState && blockedState.attempt,
      retry_count: blockedState && blockedState.retryCount,
    }));

    try {
      const result = await fetchNextAction(true);
      if (result.stale) return;
      if (result.authFailed) {
        blockedState.retrying = false;
        render(null);
        return;
      }
      if (result.blocked) {
        blockedState = Object.assign({}, result.blocked, {
          retryCount: prevRetryCount + 1,
          retrying: false,
          nextAction: cache.data && cache.data.next_action,
        });
        trackBlockedShownOnce(blockedState, cache.data);
        renderBlocked(blockedState);
        if (retryBtn && document.contains(retryBtn)) {
          retryBtn.focus();
        }
        return;
      }
      if (!result.ok || !result.payload || !result.payload.enabled) {
        blockedState = null;
        render(null);
        await refreshLegacyCoachMounts();
        return;
      }
      if (result.payload.deferred) {
        blockedState = null;
        render(null);
        await refreshLegacyCoachMounts();
        return;
      }
      blockedState = null;
      const shown = render(result.payload);
      const recoveredMeta = Object.assign({}, analyticsBase(result.payload), {
        retry_count: prevRetryCount + 1,
      });
      trackOnce(
        'activation_first_success_recovered',
        'msd_afs_recovered_' + (result.payload.next_action || 'unknown'),
        recoveredMeta
      );
      if (result.payload.authority === 'journey_retention') {
        trackRetention(result.payload, shown);
      } else if (shown) {
        await refreshLegacyCoachMounts();
      }
    } finally {
      retryInFlight = false;
      if (blockedState) blockedState.retrying = false;
    }
  }

  function onContinueWithoutGuide() {
    const errorClass = blockedState && blockedState.errorClass;
    setSessionSuppressed();
    clearBlockedState();
    cache = { at: 0, data: cache.data, flagOn: true };
    track('activation_first_success_blocked_continue_clicked', Object.assign({}, analyticsBase(cache.data, null), {
      error_class: errorClass,
    }));
    render(null);
    refreshLegacyCoachMounts();
  }

  async function onDefer(payload, deferBtn) {
    if (deferInFlight || !payload || !payload.can_defer) return;
    deferInFlight = true;
    const mount = document.getElementById(MOUNT_ID);
    const errEl = mount && mount.querySelector('.activation-fs-defer-error');
    if (deferBtn) {
      deferBtn.disabled = true;
      deferBtn.textContent = pt('home.firstSuccess.recovery.deferring');
    }
    if (errEl) {
      errEl.classList.add('hidden');
      errEl.textContent = '';
    }

    try {
      const res = await window.apiFetch('/api/family/activation/defer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_action: payload.next_action }),
      });

      if (res.status === 409) {
        let body = {};
        try { body = await res.json(); } catch (_) { /* ignore */ }
        cache = { at: 0, data: null, flagOn: false };
        clearBlockedState();
        await load({ force: true });
        return;
      }

      if (!res.ok) {
        if (errEl) {
          errEl.textContent = pt('home.firstSuccess.recovery.deferError');
          errEl.classList.remove('hidden');
        }
        if (deferBtn) {
          deferBtn.disabled = false;
          deferBtn.textContent = pt('home.firstSuccess.recovery.defer');
        }
        return;
      }

      const body = await res.json();
      const updated = Object.assign({}, payload, {
        deferred: true,
        show_primary_coach: false,
        deferred_until: body.deferred_until || payload.deferred_until,
      });
      cache = { at: Date.now(), data: updated, flagOn: true };
      clearBlockedState();
      render(null);
      trackOnce(
        'activation_first_success_deferred',
        'msd_afs_deferred_' + payload.next_action,
        Object.assign({}, analyticsBase(payload), {
          defer_duration_hours: DEFER_DURATION_HOURS,
        })
      );
      await refreshLegacyCoachMounts();
    } catch (_) {
      if (errEl) {
        errEl.textContent = pt('home.firstSuccess.recovery.deferError');
        errEl.classList.remove('hidden');
      }
      if (deferBtn) {
        deferBtn.disabled = false;
        deferBtn.textContent = pt('home.firstSuccess.recovery.defer');
      }
    } finally {
      deferInFlight = false;
    }
  }

  async function refreshLegacyCoachMounts() {
    if (!shouldSuppressLegacyCoaches()) return;
    try {
      const engine = window.EngineCoach;
      if (engine && typeof engine.load === 'function') {
        await engine.load({ force: true }).catch(function () {});
      }
      const journey = window.JourneyCoach;
      if (journey && typeof journey.pollCoach === 'function') {
        await journey.pollCoach();
      }
    } catch (_) { /* legacy coach scripts optional */ }
  }

  function trackRetention(payload, shown) {
    if (payload.primary_action && payload.primary_action.action === 'SILENT') {
      track('journey_silent', {
        reason: payload.primary_action.reason,
        surface: 'home',
      });
    } else if (shown) {
      track('journey_coach_shown', {
        action: payload.primary_action && payload.primary_action.action,
        reason: payload.primary_action && payload.primary_action.reason,
        surface: 'home',
      });
    }
  }

  async function load(options) {
    if (isSessionSuppressed()) {
      render(null);
      await refreshLegacyCoachMounts();
      return { ok: true, sessionSuppressed: true };
    }

    if (blockedState && !(options && options.force)) {
      renderBlocked(blockedState);
      await refreshLegacyCoachMounts();
      return { ok: false, reason: 'blocked', blocked: blockedState };
    }

    const result = await fetchNextAction(options && options.force);
    if (result.stale) {
      return { ok: false, reason: 'stale' };
    }

    if (result.authFailed) {
      render(null);
      return { ok: false, reason: 'auth' };
    }

    if (result.pedagogOnly) {
      render(null);
      return { ok: false, reason: 'pedagog_only' };
    }

    if (result.blocked) {
      if (!blockedState) {
        blockedState = Object.assign({}, result.blocked, {
          nextAction: cache.data && cache.data.next_action,
        });
        trackBlockedShownOnce(blockedState, cache.data);
      }
      renderBlocked(blockedState);
      await refreshLegacyCoachMounts();
      return { ok: false, reason: 'blocked', blocked: blockedState };
    }

    const payload = result.payload;
    if (!payload || !payload.enabled) {
      cache.flagOn = false;
      clearBlockedState();
      render(null);
      return { ok: false, reason: 'disabled' };
    }

    cache.flagOn = Boolean(payload.show_primary_coach || payload.deferred);
    if (payload.deferred) {
      render(null);
      await refreshLegacyCoachMounts();
      return { ok: true, payload: payload, deferred: true };
    }

    const shown = render(payload);
    if (payload.authority === 'journey_retention') {
      trackRetention(payload, shown);
      await refreshLegacyCoachMounts();
    } else if (shown) {
      await refreshLegacyCoachMounts();
    }
    return { ok: true, payload: payload, shown: shown };
  }

  function shouldSuppressLegacyCoaches() {
    if (isSessionSuppressed()) return true;
    if (blockedState) return true;
    if (!cache.data || !cache.data.enabled) return false;
    if (cache.data.authority === 'journey_retention') return true;
    if (cache.data.deferred) return true;
    return Boolean(cache.data.show_primary_coach);
  }

  function getCachedPayload() {
    return cache.data || null;
  }

  function isBlocked() {
    return Boolean(blockedState);
  }

  window.ActivationFirstSuccessHub = {
    load: load,
    fetchNextAction: fetchNextAction,
    shouldSuppressLegacyCoaches: shouldSuppressLegacyCoaches,
    getCachedPayload: getCachedPayload,
    isSessionSuppressed: isSessionSuppressed,
    isBlocked: isBlocked,
    clearCache: function () {
      cache = { at: 0, data: null, flagOn: false };
      clearBlockedState();
      fetchGeneration += 1;
      fetchInFlight = null;
    },
  };
})();
