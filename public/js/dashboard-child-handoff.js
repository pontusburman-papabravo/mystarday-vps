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

  function copyPrefix(postSchema, trustedPath) {
    if (trustedPath) return postSchema ? 'home.handoff.postSchema.trusted.' : 'home.handoff.trusted.';
    return postSchema ? 'home.handoff.postSchema.pin.' : 'home.handoff.pin.';
  }

  function trustedPathAvailable(trustedPath) {
    if (typeof trustedPath === 'boolean') return trustedPath;
    if (trustedPath && typeof trustedPath === 'object') return Boolean(trustedPath.available);
    return false;
  }

  function resolveTrustedPathFlag(trustedPath) {
    if (typeof trustedPath === 'boolean') return Promise.resolve(trustedPath);
    if (trustedPath && typeof trustedPath === 'object') {
      return Promise.resolve(Boolean(trustedPath.available));
    }
    return probeTrustedChildPath().then(function (path) {
      return Boolean(path && path.available);
    });
  }

  function paintLegacyHandoffCopy(el, postSchema, trustedPath) {
    const prefix = copyPrefix(postSchema, trustedPathAvailable(trustedPath));
    const titleEl = el.querySelector('.dash-child-handoff-title');
    const subEl = el.querySelector('.dash-child-handoff-sub');
    const childBtn = el.querySelector('#dashboardChildLoginBtn');
    const logoutBtn = el.querySelector('#dashboardParentLogoutBtn');
    const dismissBtn = el.querySelector('#dashboardChildHandoffDismiss');
    if (titleEl) titleEl.textContent = pt(prefix + 'title');
    if (subEl) subEl.textContent = pt(prefix + 'sub');
    if (childBtn) childBtn.textContent = pt(prefix + 'childLogin');
    const changePin = el.querySelector('[data-action="change-pin"]');
    if (changePin) {
      changePin.textContent = pt('home.handoff.changePin');
      changePin.setAttribute('aria-label', pt('home.handoff.changePinAria'));
    }
    if (logoutBtn) logoutBtn.textContent = pt('home.handoff.parentLogout');
    el.setAttribute('aria-label', pt(prefix + 'regionAria'));
    if (dismissBtn) dismissBtn.setAttribute('title', pt('home.handoff.dismissTitle'));
    el.classList.toggle('dash-child-handoff-post-schema', Boolean(postSchema));
    if (logoutBtn) logoutBtn.classList.toggle('hidden', Boolean(postSchema));
  }

  function applyLegacyHandoffCopy(el, postSchema, trustedPath) {
    if (!el) return;
    if (typeof trustedPath === 'boolean' || (trustedPath && typeof trustedPath === 'object')) {
      paintLegacyHandoffCopy(el, postSchema, trustedPath);
      return;
    }
    paintLegacyHandoffCopy(el, postSchema, false);
    resolveTrustedPathFlag(trustedPath).then(function (available) {
      paintLegacyHandoffCopy(el, postSchema, available);
    });
  }

  function paintMagicHandoffCopy(handoffRoot, postSchema, trustedPath) {
    const prefix = copyPrefix(postSchema, trustedPathAvailable(trustedPath));
    const titleEl = handoffRoot.querySelector('.parent-handoff-title');
    const subEl = handoffRoot.querySelector('.parent-handoff-sub');
    const childBtn = handoffRoot.querySelector('[data-action="child-login"]');
    const logoutBtn = handoffRoot.querySelector('[data-action="parent-logout"]');
    if (titleEl) titleEl.textContent = pt(prefix + 'title');
    if (subEl) subEl.textContent = pt(prefix + 'sub');
    if (childBtn) childBtn.textContent = pt(prefix + 'childLogin');
    const changePin = handoffRoot.querySelector('[data-action="change-pin"]');
    if (changePin) {
      changePin.textContent = pt('home.handoff.changePin');
      changePin.setAttribute('aria-label', pt('home.handoff.changePinAria'));
    }
    if (logoutBtn) {
      logoutBtn.textContent = pt('home.handoff.parentLogout');
      logoutBtn.classList.toggle('hidden', Boolean(postSchema));
    }
    handoffRoot.classList.toggle('parent-handoff-post-schema', Boolean(postSchema));
  }

  function applyMagicHandoffCopy(handoffRoot, postSchema, trustedPath) {
    if (!handoffRoot) return;
    if (typeof trustedPath === 'boolean' || (trustedPath && typeof trustedPath === 'object')) {
      paintMagicHandoffCopy(handoffRoot, postSchema, trustedPath);
      return;
    }
    paintMagicHandoffCopy(handoffRoot, postSchema, false);
    resolveTrustedPathFlag(trustedPath).then(function (available) {
      paintMagicHandoffCopy(handoffRoot, postSchema, available);
    });
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
    const source = 'home_handoff';
    if (window.ChildAccessHandoff && typeof ChildAccessHandoff.rememberSource === 'function') {
      ChildAccessHandoff.rememberSource(source);
    } else {
      try { sessionStorage.setItem('sd_child_access_source', source); } catch (_) {}
    }
    if (typeof window.analytics === 'undefined' || !analytics.track) return;
    const meta = { source: source, deep_link: Boolean(deepLink) };
    if (window.apiFetch) {
      window.apiFetch('/api/family/activation-config')
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (cfg) {
          if (cfg && cfg.primary_child_id) meta.child_id = cfg.primary_child_id;
          analytics.track(null, 'child_handoff_started', meta);
        })
        .catch(function () {
          analytics.track(null, 'child_handoff_started', meta);
        });
    } else {
      analytics.track(null, 'child_handoff_started', meta);
    }
  }

  async function probeTrustedChildPath() {
    try {
      const res = await fetch('/api/auth/trusted-device/context', { credentials: 'include' });
      if (!res.ok) return { available: false };
      const ctx = await res.json();
      if (!ctx || ctx.ok === false) return { available: false };
      if (ctx.device_mode === 'parent') return { available: false, deviceMode: 'parent' };
      if (ctx.device_mode === 'child' || ctx.device_mode === 'shared') {
        return {
          available: true,
          deviceMode: ctx.device_mode,
          allowedChildren: ctx.allowed_children || [],
          needsPicker: ctx.device_mode === 'shared' && (ctx.allowed_children || []).length > 1,
        };
      }
      return { available: false };
    } catch (_) {
      return { available: false };
    }
  }

  function goToSharedChildPicker(allowedChildren) {
    try {
      sessionStorage.setItem('shared_device_picker_children', JSON.stringify(allowedChildren || []));
    } catch (_) { /* ignore */ }
    if (window.AppEntryOrchestrator && AppEntryOrchestrator.isDailyUxActive
      && AppEntryOrchestrator.isDailyUxActive()) {
      window.location.replace('/child/profile-picker');
      return;
    }
    window.location.replace('/child-login?shared_device=1');
  }

  async function tryOpenTrustedChildView() {
    const path = await probeTrustedChildPath();
    if (!path.available) return false;
    if (path.needsPicker) {
      goToSharedChildPicker(path.allowedChildren);
      return true;
    }
    if (!window.TrustedDeviceClient || typeof TrustedDeviceClient.tryRestoreSession !== 'function') {
      return false;
    }
    const restored = await TrustedDeviceClient.tryRestoreSession();
    if (restored && restored.ok && restored.user && restored.user.type === 'child') {
      window.location.replace(restored.redirect || '/child/today');
      return true;
    }
    if (restored && restored.code === 'SHARED_PICKER_REQUIRED') {
      goToSharedChildPicker(restored.allowed_children);
      return true;
    }
    return false;
  }

  async function startChildLogin() {
    const deepLink = wantsChildHandoffDeepLink();
    trackDashboardHandoffAnalytics(deepLink);
    if (window.JourneyContextClient) {
      JourneyContextClient.postEvent('handoff_started').catch(function () {});
    }
    try {
      const opened = await tryOpenTrustedChildView();
      if (opened) return;
    } catch (_) { /* PIN fallback */ }
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

  function maybeEnrichHandoff(el) {
    if (!el || el.classList.contains('hidden')) return;
    function run() {
      if (window.GrowthSystemHelp && typeof GrowthSystemHelp.enrichHandoff === 'function') {
        GrowthSystemHelp.enrichHandoff(el);
      }
    }
    if (window.GrowthSystemHelp) {
      run();
      return;
    }
    const s = document.createElement('script');
    s.src = '/js/growth-system-help.js';
    s.onload = run;
    document.head.appendChild(s);
  }

  function isVisibleEl(el) {
    return Boolean(el && el.classList && !el.classList.contains('hidden'));
  }

  function coachOffersChildLogin(el) {
    if (!isVisibleEl(el)) return false;
    return Boolean(el.querySelector(
      '[data-child-login-cta], [data-action="child-login"], #dashboardChildLoginBtn, .activation-fs-cta'
    ));
  }

  function hasVisibleChildLoginCta() {
    return coachOffersChildLogin(document.getElementById('activationFirstSuccessCoachMount'))
      || coachOffersChildLogin(document.getElementById('journeyCoachMount'));
  }

  /**
   * Signup Journey (days 1–14) used to hide the Hem handoff card even when
   * Journey was silent/idle and First Success was suppressed — leaving no
   * child-login CTA. After the coach ladder settles, keep exactly one visible
   * child-login action for families who still need child access.
   */
  function afterPrimaryAction() {
    const fs = document.getElementById('activationFirstSuccessCoachMount');
    const journey = document.getElementById('journeyCoachMount');
    const magic = document.querySelector('.parent-handoff-card');

    if (hasVisibleChildLoginCta()) {
      if (magic) magic.classList.add('hidden');
      maybeEnrichHandoff(coachOffersChildLogin(fs) ? fs : journey);
      return;
    }

    Promise.resolve(loadActivationHandoffNeeded()).then(function (needed) {
      if (!needed) return;
      if (journey && !coachOffersChildLogin(journey)) {
        journey.classList.add('hidden');
      }
      const card = document.querySelector('.parent-handoff-card')
        || document.getElementById('dashboardChildHandoff');
      if (!card) return;
      card.classList.remove('hidden');
      maybeEnrichHandoff(card);
    });
  }

  async function resolveVisibility(el) {
    if (!el) return;

    const activationNeeded = await loadActivationHandoffNeeded();
    const deepLink = wantsChildHandoffDeepLink();

    if (deepLink && !activationNeeded) {
      clearHandoffDeepLink();
    }

    if (deepLink && activationNeeded) {
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
    }

    if (!isNativeShell() && !isMobileWeb() && !activationNeeded && !(deepLink && activationNeeded)) {
      el.classList.add('hidden');
      return;
    }

    const trustedPath = await probeTrustedChildPath();

    if (activationNeeded || (deepLink && activationNeeded)) {
      applyLegacyHandoffCopy(el, true, trustedPath);
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
      maybeEnrichHandoff(el);
      return;
    }

    applyLegacyHandoffCopy(el, false, trustedPath);

    if (window.JourneyContextClient) {
      try {
        const journeyOn = await JourneyContextClient.isJourneyApiEnabled();
        if (journeyOn) {
          const ctx = await JourneyContextClient.fetchContext();
          if (ctx?.signup_journey?.active && !activationNeeded) {
            el.classList.add('hidden');
            return;
          }
          if (ctx?.capabilities?.handoff_v2 && !activationNeeded) {
            el.classList.toggle('hidden', !contextWantsHandoff(ctx));
            if (!contextWantsHandoff(ctx)) return;
            bindEvents(el);
            maybeEnrichHandoff(el);
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
    maybeEnrichHandoff(el);
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
    probeTrustedChildPath: probeTrustedChildPath,
    tryOpenTrustedChildView: tryOpenTrustedChildView,
    maybeEnrichHandoff: maybeEnrichHandoff,
    afterPrimaryAction: afterPrimaryAction,
    hasVisibleChildLoginCta: hasVisibleChildLoginCta,
  };
})();
