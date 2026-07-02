/**
 * dashboard-child-handoff.js — tydlig "barnet loggar in" / logout på föräldraöversikten.
 * Viktigt i native app där sidomeny och logout saknas på Hem.
 * Fas 2: när handoff_v2 är aktiv styrs synlighet av Journey Context.
 */
(function () {
  'use strict';

  const DISMISS_KEY = 'dashboard_child_handoff_dismissed';
  const DISMISS_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days (mobile web only)

  function isNativeShell() {
    return (window.Platform && Platform.isNative && Platform.isNative()) ||
      document.body.classList.contains('has-native-tab-bar') ||
      document.documentElement.classList.contains('platform-native');
  }

  function isMobileWeb() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function isDismissed() {
    if (isNativeShell()) return false;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Date.now() - parsed.ts < DISMISS_TTL;
    } catch (_) {
      return false;
    }
  }

  function dismiss() {
    if (isNativeShell()) return;
    if (window.JourneyContextClient) {
      JourneyContextClient.postEvent('handoff_deferred').catch(function () {});
    }
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() }));
    } catch (_) {}
    const el = document.getElementById('dashboardChildHandoff');
    if (el) el.classList.add('hidden');
  }

  function startChildLogin() {
    if (window.JourneyContextClient) {
      JourneyContextClient.postEvent('handoff_started').catch(function () {});
    }
    if (window.Auth && typeof Auth.logout === 'function') {
      Auth.logout({ childFlow: true });
    } else {
      window.location.href = '/child-login';
    }
  }

  function parentLogout() {
    if (window.Auth && typeof Auth.logout === 'function') {
      Auth.logout();
    } else if (typeof window.logout === 'function') {
      window.logout();
    } else {
      window.location.href = '/login';
    }
  }

  function contextWantsHandoff(ctx) {
    if (!ctx) return false;
    if (ctx.capabilities?.handoff_v2) {
      return ctx.blocking_experience === 'handoff_to_child';
    }
    if (ctx.blocking_experience === 'handoff_to_child') return true;
    return ctx.priority === 'handoff'
      && Array.isArray(ctx.recommended_experiences)
      && ctx.recommended_experiences.includes('handoff_to_child');
  }

  function bindEvents(el) {
    const childBtn = document.getElementById('dashboardChildLoginBtn');
    const logoutBtn = document.getElementById('dashboardParentLogoutBtn');
    const dismissBtn = document.getElementById('dashboardChildHandoffDismiss');

    if (childBtn) childBtn.addEventListener('click', startChildLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', parentLogout);
    if (dismissBtn) {
      dismissBtn.classList.toggle('hidden', isNativeShell());
      dismissBtn.addEventListener('click', dismiss);
    }
  }

  async function resolveVisibility(el) {
    if (!el) return;

    if (!isNativeShell() && !isMobileWeb()) {
      el.classList.add('hidden');
      return;
    }

    if (window.JourneyContextClient) {
      try {
        const journeyOn = await JourneyContextClient.isJourneyApiEnabled();
        if (journeyOn) {
          const ctx = await JourneyContextClient.fetchContext();
          if (ctx?.signup_journey?.active) {
            el.classList.add('hidden');
            return;
          }
          if (ctx?.capabilities?.handoff_v2) {
            el.classList.toggle('hidden', !contextWantsHandoff(ctx));
            if (!contextWantsHandoff(ctx)) return;
            bindEvents(el);
            return;
          }
        }
      } catch (_) {}
    }

    if (isDismissed()) {
      el.classList.add('hidden');
      return;
    }

    el.classList.remove('hidden');
    bindEvents(el);
  }

  function init() {
    const el = document.getElementById('dashboardChildHandoff');
    if (!el) return;
    resolveVisibility(el);
  }

  window.DashboardChildHandoff = {
    init: init,
    dismiss: dismiss,
    startChildLogin: startChildLogin,
    parentLogout: parentLogout,
    resolveVisibility: resolveVisibility,
    contextWantsHandoff: contextWantsHandoff,
  };
})();
