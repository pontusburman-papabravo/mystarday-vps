/**
 * Landing CTA event tracking — analytics whitelist + console in dev.
 * Ireland /en funnel: landing_view + store_cta_clicked (click ≠ install).
 */
(function (global) {
  'use strict';

  const SESSION_KEY = 'analytics_session_nonce';
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const STORE_PLACEMENTS = { hero: true, mid_page: true, footer: true, nav: true, menu: true };

  const ALLOWED = {
    hero_signup_click: true,
    hero_how_it_works_click: true,
    problem_how_it_works_click: true,
    treasure_demo_click: true,
    founder_signup_click: true,
    final_signup_click: true,
    nav_login_click: true,
    nav_child_login_click: true,
    hero_parent_login_click: true,
    hero_child_login_click: true,
    barnvy_child_login_click: true,
    nav_signup_click: true,
    footer_signup_click: true,
    child_view_example_click: true,
    landing_guide_card_click: true,
    two_track_resurser_click: true,
    landing_share_click: true,
    app_store_click: true,
    play_store_click: true,
    landing_view: true,
    store_cta_clicked: true,
  };

  function createUuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getOrCreateSessionNonce() {
    try {
      const existing = global.localStorage && global.localStorage.getItem(SESSION_KEY);
      if (existing && UUID_RE.test(existing)) return existing;
      const nonce = createUuid();
      if (global.localStorage) global.localStorage.setItem(SESSION_KEY, nonce);
      return nonce;
    } catch (_) {
      return createUuid();
    }
  }

  function pathname() {
    try {
      return (global.location && global.location.pathname) || '';
    } catch (_) {
      return '';
    }
  }

  function isIrelandLanding(path) {
    const p = path || pathname();
    return p === '/en' || p === '/en/';
  }

  function irelandMarket(path) {
    const p = path || pathname();
    if (p === '/en' || p === '/en/' || p.indexOf('/en/') === 0) return 'IE';
    return undefined;
  }

  function utmMetadata() {
    const out = {};
    try {
      const capture = global.UtmCapture;
      const data = capture && typeof capture.get === 'function' ? (capture.get() || {}) : {};
      UTM_KEYS.forEach(function (key) {
        if (data[key]) out[key] = data[key];
      });
    } catch (_) { /* no attribution layer */ }
    return out;
  }

  function storePlatform(el) {
    const track = el && el.getAttribute && el.getAttribute('data-track');
    const cta = el && el.getAttribute && el.getAttribute('data-store-cta');
    if (track === 'play_store_click' || cta === 'play') return 'android';
    return 'ios';
  }

  function storePlacement(el) {
    const raw = el && el.getAttribute && el.getAttribute('data-store-placement');
    return STORE_PLACEMENTS[raw] ? raw : 'unknown';
  }

  function buildStoreMeta(el) {
    const meta = Object.assign({
      page: 'landing',
      platform: storePlatform(el),
      placement: storePlacement(el),
    }, utmMetadata());
    const market = irelandMarket();
    if (market) meta.market = market;
    return meta;
  }

  function track(eventType, metadata) {
    if (!eventType) return;
    try {
      const resolvedType = eventType.startsWith('faq_expand_') ? 'landing_faq_expand' : eventType;
      if (!ALLOWED[resolvedType] && resolvedType !== 'landing_faq_expand') return;
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: resolvedType,
          session_id: getOrCreateSessionNonce(),
          metadata: Object.assign({ page: 'landing' }, metadata || {}, {
            faq_slug: eventType.startsWith('faq_expand_') ? eventType.replace('faq_expand_', '') : undefined,
          }),
        }),
        credentials: 'include',
        keepalive: true,
      }).catch(function () {});
    } catch (_) { /* silent */ }
  }

  function bindCta(selector, eventName) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener('click', function () {
        if (ALLOWED[eventName] || eventName.indexOf('faq_expand_') === 0) {
          const meta = { page: 'landing' };
          if (eventName === 'landing_guide_card_click') {
            meta.guide_slug = el.getAttribute('data-guide-slug') || undefined;
          }
          if (eventName === 'app_store_click' || eventName === 'play_store_click') {
            const storeMeta = buildStoreMeta(el);
            track(eventName, storeMeta);
            track('store_cta_clicked', storeMeta);
            return;
          }
          track(eventName, meta);
        }
      });
    });
  }

  function trackLandingView() {
    if (!isIrelandLanding()) return;
    const meta = Object.assign({
      page: 'landing',
      market: 'IE',
    }, utmMetadata());
    track('landing_view', meta);
  }

  function init() {
    bindCta('[data-track="hero_signup_click"]', 'hero_signup_click');
    bindCta('[data-track="hero_how_it_works_click"]', 'hero_how_it_works_click');
    bindCta('[data-track="product_spotlight_signup_click"]', 'product_spotlight_signup_click');
    bindCta('[data-track="product_spotlight_how_it_works_click"]', 'product_spotlight_how_it_works_click');
    bindCta('[data-track="problem_how_it_works_click"]', 'problem_how_it_works_click');
    bindCta('[data-track="treasure_demo_click"]', 'treasure_demo_click');
    bindCta('[data-track="founder_signup_click"]', 'founder_signup_click');
    bindCta('[data-track="final_signup_click"]', 'final_signup_click');
    bindCta('[data-track="nav_login_click"]', 'nav_login_click');
    bindCta('[data-track="nav_child_login_click"]', 'nav_child_login_click');
    bindCta('[data-track="hero_parent_login_click"]', 'hero_parent_login_click');
    bindCta('[data-track="hero_child_login_click"]', 'hero_child_login_click');
    bindCta('[data-track="barnvy_child_login_click"]', 'barnvy_child_login_click');
    bindCta('[data-track="nav_signup_click"]', 'nav_signup_click');
    bindCta('[data-track="footer_signup_click"]', 'footer_signup_click');
    bindCta('[data-track="child_view_example_click"]', 'child_view_example_click');
    bindCta('[data-track="landing_guide_card_click"]', 'landing_guide_card_click');
    bindCta('[data-track="two_track_resurser_click"]', 'two_track_resurser_click');
    bindCta('[data-track="landing_share_click"]', 'landing_share_click');
    bindCta('[data-track="app_store_click"]', 'app_store_click');
    bindCta('[data-track="play_store_click"]', 'play_store_click');
    trackLandingView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.LandingEvents = {
    track: track,
    buildStoreMeta: buildStoreMeta,
    isIrelandLanding: isIrelandLanding,
    irelandMarket: irelandMarket,
    trackLandingView: trackLandingView,
  };
})(window);
