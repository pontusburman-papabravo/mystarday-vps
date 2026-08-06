/**
 * dashboard-child-handoff.js — tydlig "barnet loggar in" / logout på föräldraöversikten.
 * Viktigt i native app där sidomeny och logout saknas på Hem.
 * Fas 2: när handoff_v2 är aktiv styrs synlighet av Journey Context.
 */
(function () {
  'use strict';

  const DISMISS_KEY = 'dashboard_child_handoff_dismissed';
  const DISMISS_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days (mobile web only)

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function copyPrefix(postSchema) {
    return postSchema ? 'home.handoff.postSchema.' : 'home.handoff.';
  }

  function applyLegacyHandoffCopy(el, postSchema) {
    if (!el) return;
    const prefix = copyPrefix(postSchema);
    const titleEl = el.querySelector('.dash-child-handoff-title');
    const subEl = el.querySelector('.dash-child-handoff-sub');
    const childBtn = el.querySelector('#dashboardChildLoginBtn');
    const logoutBtn = el.querySelector('#dashboardParentLogoutBtn');
    const dismissBtn = el.querySelector('#dashboardChildHandoffDismiss');
    if (titleEl) titleEl.textContent = pt(prefix + 'title');
    if (subEl) subEl.textContent = pt(prefix + 'sub');
    if (childBtn) childBtn.textContent = pt(prefix + 'childLogin');
    if (logoutBtn) logoutBtn.textContent = pt('home.handoff.parentLogout');
    el.setAttribute('aria-label', pt(prefix + 'regionAria'));
    if (dismissBtn) dismissBtn.setAttribute('title', pt('home.handoff.dismissTitle'));
    el.classList.toggle('dash-child-handoff-post-schema', Boolean(postSchema));
    if (logoutBtn) logoutBtn.classList.toggle('hidden', Boolean(postSchema));
  }

  function applyMagicHandoffCopy(handoffRoot, postSchema) {
    if (!handoffRoot) return;
    const prefix = copyPrefix(postSchema);
    const titleEl = handoffRoot.querySelector('.parent-handoff-title');
    const subEl = handoffRoot.querySelector('.parent-handoff-sub');
    const childBtn = handoffRoot.querySelector('[data-action="child-login"]');
    const logoutBtn = handoffRoot.querySelector('[data-action="parent-logout"]');
    if (titleEl) titleEl.textContent = pt(prefix + 'title');
    if (subEl) subEl.textContent = pt(prefix + 'sub');
    if (childBtn) childBtn.textContent = pt(prefix + 'childLogin');
    if (logoutBtn) {
      logoutBtn.textContent = pt('home.handoff.parentLogout');
      logoutBtn.classList.toggle('hidden', Boolean(postSchema));
    }
    handoffRoot.classList.toggle('parent-handoff-post-schema', Boolean(postSchema));
  }

  function isNativeShell() {
    return (window.Platform && Platform.isNative && Platform.isNative()) ||
      document.body.classList.contains('has-native-tab-bar') ||
      document.documentElement.classList.contains('platform-native');
  }

  function isMobileWeb() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function wantsChildHandoffDeepLink() {
    try {
      return new URLSearchParams(window.location.search).get('next_step') === 'child_handoff';
    } catch {
      return false;
    }
  }

  function clearHandoffDeepLink() {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('next_step') !== 'child_handoff') return;
      url.searchParams.delete('next_step');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {}
  }

  async function loadActivationHandoffNeeded() {
    if (!window.apiFetch) return false;
    try {
      const res = await window.apiFetch('/api/family/activation-config');
      if (!res.ok) return false;
      const cfg = await res.json();
      const st = cfg.state || {};
      return Boolean(st.schema_saved_at && !st.child_access_completed_at);
    } catch {
      return false;
    }
  }

  function isDismissed() {
    if (wantsChildHandoffDeepLink()) return false;
    if (isNativeShell()) return false;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Date.now() - parsed.ts < DISMISS_TTL;
    } catch {
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
    } catch {}
    const el = document.getElementById('dashboardChildHandoff');
    if (el) el.classList.add('hidden');
  }

  function trackDashboardHandoffAnalytics(deepLink) {
    if (typeof window.analytics === 'undefined' || !analytics.track) return;
    const source = deepLink ? 'dashboard_deeplink' : 'dashboard_handoff';
    const meta = { source: source };
    if (window.apiFetch) {
      window.apiFetch('/api/family/activation-config')
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (cfg) {
          if (cfg && cfg.primary_child_id) meta.child_id = cfg.primary_child_id;
          analytics.track(null, 'child_handoff_started', meta);
          analytics.track(null, 'child_view_opened', meta);
        })
        .catch(function () {
          analytics.track(null, 'child_handoff_started', meta);
          analytics.track(null, 'child_view_opened', meta);
        });
    } else {
      analytics.track(null, 'child_handoff_started', meta);
      analytics.track(null, 'child_view_opened', meta);
    }
  }

  function startChildLogin() {
    const deepLink = wantsChildHandoffDeepLink();
    trackDashboardHandoffAnalytics(deepLink);
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

  function bindEvents(el, opts) {
    opts = opts || {};
    const childBtn = document.getElementById('dashboardChildLoginBtn');
    const logoutBtn = document.getElementById('dashboardParentLogoutBtn');
    const dismissBtn = document.getElementById('dashboardChildHandoffDismiss');

    if (childBtn) childBtn.addEventListener('click', startChildLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', parentLogout);
    if (dismissBtn) {
      const hideDismiss = isNativeShell() || Boolean(opts.persistent);
      dismissBtn.classList.toggle('hidden', hideDismiss);
      dismissBtn.addEventListener('click', dismiss);
    }
  }

  async function resolveVisibility(el) {
    if (!el) return;

    const activationNeeded = await loadActivationHandoffNeeded();
    const deepLink = wantsChildHandoffDeepLink();

    if (deepLink) {
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
    }

    if (!isNativeShell() && !isMobileWeb() && !activationNeeded && !deepLink) {
      el.classList.add('hidden');
      return;
    }

    if (activationNeeded || deepLink) {
      applyLegacyHandoffCopy(el, true);
      el.classList.remove('hidden');
      bindEvents(el, { persistent: true });
      if (deepLink) {
        clearHandoffDeepLink();
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (window.apiFetch) {
          window.apiFetch('/api/analytics/event', {
            method: 'POST',
            body: JSON.stringify({
              event_type: 'onboarding_handoff_opened',
              metadata: { source: 'dashboard_deeplink' },
            }),
          }).catch(function () {});
        }
      }
      return;
    }

    applyLegacyHandoffCopy(el, false);

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
      } catch {}
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

  function onParentI18nReady() {
    const el = document.getElementById('dashboardChildHandoff');
    if (!el || el.classList.contains('hidden')) return;
    const postSchema = el.classList.contains('dash-child-handoff-post-schema');
    applyLegacyHandoffCopy(el, postSchema);
  }

  document.addEventListener('parent-i18n-ready', onParentI18nReady);

  window.DashboardChildHandoff = {
    init: init,
    dismiss: dismiss,
    startChildLogin: startChildLogin,
    parentLogout: parentLogout,
    resolveVisibility: resolveVisibility,
    contextWantsHandoff: contextWantsHandoff,
    loadActivationHandoffNeeded: loadActivationHandoffNeeded,
    wantsChildHandoffDeepLink: wantsChildHandoffDeepLink,
    applyLegacyHandoffCopy: applyLegacyHandoffCopy,
    applyMagicHandoffCopy: applyMagicHandoffCopy,
  };
})();
