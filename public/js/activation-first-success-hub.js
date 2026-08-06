/**
 * activation-first-success-hub.js — single primary Hem coach when activation_first_success_v1 is ON.
 */
(function () {
  'use strict';

  const MOUNT_ID = 'activationFirstSuccessCoachMount';
  const CACHE_MS = 45 * 1000;
  let cache = { at: 0, data: null, flagOn: false };

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function track(eventType, meta) {
    if (typeof window.analytics === 'undefined' || !analytics.track) return;
    analytics.track(null, eventType, meta || {});
  }

  function trackShownOnce(payload) {
    if (!payload || !payload.next_action) return;
    const dedupeKey = 'msd_afs_shown_' + payload.next_action + '_' + (payload.funnel_step || '');
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, String(Date.now()));
    } catch (_) { /* private mode */ }
    track('activation_first_success_next_action_shown', {
      next_action: payload.next_action,
      journey_phase: payload.journey_phase,
      funnel_step: payload.funnel_step,
      journey_action: payload.primary_action && payload.primary_action.action,
    });
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
    if (action === 'parent_ack' && payload.cta_target) {
      window.location.href = payload.cta_target;
      return;
    }
    if (payload.cta_target) {
      window.location.href = payload.cta_target;
    }
  }

  function render(payload) {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return false;
    if (!payload || !payload.show_primary_coach || !payload.next_action || payload.next_action === 'none') {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return false;
    }

    const headline = payload.headline || pt('home.firstSuccess.actions.' + payload.next_action + '.headline');
    const body = payload.body || pt('home.firstSuccess.actions.' + payload.next_action + '.body');
    const cta = payload.cta_label || pt('home.firstSuccess.actions.' + payload.next_action + '.cta');
    const pinHint = (payload.next_action === 'child_access' || payload.next_action === 'await_first_completion' || payload.next_action === 'welcome_back')
      ? '<p class="text-xs text-text-soft mt-2">' + esc(pt('home.firstSuccess.pinHint')) + '</p>'
      : '';

    mount.classList.remove('hidden');
    mount.setAttribute('data-authority', 'activation-first-success-v1');
    mount.innerHTML =
      '<div class="activation-fs-coach rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 mb-4" role="region" aria-label="' + esc(pt('home.firstSuccess.coachAria')) + '">' +
      '<p class="font-heading font-bold text-navy text-base mb-2">' + esc(headline) + '</p>' +
      '<p class="text-sm text-navy mb-3">' + esc(body) + '</p>' +
      pinHint +
      '<button type="button" class="activation-fs-cta w-full min-h-[44px] py-3 rounded-xl bg-gold text-white font-semibold text-sm">' + esc(cta) + '</button>' +
      '</div>';

    const btn = mount.querySelector('.activation-fs-cta');
    if (btn) {
      btn.addEventListener('click', function () { onPrimaryCta(payload); });
    }

    trackShownOnce(payload);
    return true;
  }

  async function fetchNextAction(force) {
    const now = Date.now();
    if (!force && cache.data && now - cache.at < CACHE_MS) {
      return cache.data;
    }
    if (typeof window.apiFetch !== 'function') return null;
    try {
      const res = await window.apiFetch('/api/family/next-action');
      if (!res.ok) return null;
      const data = await res.json();
      cache = {
        at: now,
        data: data,
        flagOn: Boolean(data.enabled && data.show_primary_coach),
      };
      return data;
    } catch (_) {
      return null;
    }
  }

  async function refreshLegacyCoachMounts() {
    if (!shouldSuppressLegacyCoaches()) return;
    if (window.EngineCoach && typeof EngineCoach.load === 'function') {
      await EngineCoach.load({ force: true }).catch(function () {});
    }
    if (window.JourneyCoach && typeof JourneyCoach.pollCoach === 'function') {
      await JourneyCoach.pollCoach();
    }
  }

  async function load(options) {
    const payload = await fetchNextAction(options && options.force);
    if (!payload || !payload.enabled) {
      cache.flagOn = false;
      render(null);
      return { ok: false, reason: 'disabled' };
    }
    cache.flagOn = Boolean(payload.show_primary_coach);
    const shown = render(payload);
    if (payload.authority === 'journey_retention') {
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
      await refreshLegacyCoachMounts();
    } else if (shown) {
      await refreshLegacyCoachMounts();
    }
    return { ok: true, payload: payload };
  }

  function shouldSuppressLegacyCoaches() {
    if (!cache.data || !cache.data.enabled) return false;
    if (cache.data.authority === 'journey_retention') return true;
    return Boolean(cache.data.show_primary_coach);
  }

  function getCachedPayload() {
    return cache.data || null;
  }

  window.ActivationFirstSuccessHub = {
    load: load,
    fetchNextAction: fetchNextAction,
    shouldSuppressLegacyCoaches: shouldSuppressLegacyCoaches,
    getCachedPayload: getCachedPayload,
    clearCache: function () { cache = { at: 0, data: null, flagOn: false }; },
  };
})();
