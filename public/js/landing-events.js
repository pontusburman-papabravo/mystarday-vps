/**
 * Landing CTA event tracking — analytics whitelist + console in dev.
 */
(function (global) {
  'use strict';

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
    landing_share_click: true,
    app_store_click: true,
    play_store_click: true,
  };

  function track(eventType, metadata) {
    if (!eventType) return;
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType.startsWith('faq_expand_') ? 'landing_faq_expand' : eventType,
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
          track(eventName, meta);
        }
      });
    });
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
    bindCta('[data-track="landing_share_click"]', 'landing_share_click');
    bindCta('[data-track="app_store_click"]', 'app_store_click');
    bindCta('[data-track="play_store_click"]', 'play_store_click');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.LandingEvents = { track: track };
})(window);
