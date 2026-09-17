/**
 * SEO guide analytics — article CTAs, hub nav, next-step links.
 */
(function (global) {
  'use strict';

  const SESSION_KEY = 'analytics_session_nonce';

  const ALLOWED = {
    article_cta_register: true,
    guide_next_step_click: true,
    guide_hub_nav_click: true,
    article_faq_expand: true,
    resource_page_viewed: true,
    resource_pdf_download: true,
    resource_cta_clicked: true,
  };

  function getOrCreateSessionNonce() {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const nonce = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, nonce);
      return nonce;
    } catch (_) {
      return 'anon_' + Date.now();
    }
  }

  function guideSlugFromPath() {
    const p = (global.location && global.location.pathname) || '';
    if (p === '/bildschema-app') return 'bildschema-app';
    if (p === '/beloningssystem-barn') return 'beloningssystem-barn';
    if (p === '/morgonrutin-barn') return 'morgonrutin-barn';
    if (p === '/rutiner-npf-barn') return 'rutiner-npf-barn';
    if (p === '/alternativ-bildschema-tavla') return 'alternativ-bildschema-tavla';
    if (p === '/veckoschema-bildstod') return 'veckoschema-bildstod';
    return p.replace(/^\//, '') || 'unknown';
  }

  function isResourcePath(pathname) {
    const p = pathname || '';
    return p === '/resurser' || p.indexOf('/resurser/') === 0
      || p === '/en/resources' || p.indexOf('/en/resources/') === 0;
  }

  function resourceMeta(extra) {
    const p = (global.location && global.location.pathname) || '';
    const locale = p.indexOf('/en/resources') === 0 ? 'en-GB' : 'sv-SE';
    const parts = p.replace(/^\/en\/resources\/?/, '/').replace(/^\/resurser\/?/, '/').split('/').filter(Boolean);
    const category = parts[0] || 'hub';
    return Object.assign({
      page: 'resource_library',
      locale: locale,
      category: category,
      path: p,
    }, extra || {});
  }

  function track(eventType, metadata) {
    if (!eventType || !ALLOWED[eventType]) return;
    const slug = guideSlugFromPath();
    const meta = Object.assign({ page: 'seo_guide', guide_slug: slug }, metadata || {});
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({
          event_type: eventType,
          metadata: meta,
          session_id: getOrCreateSessionNonce(),
        }),
      }).catch(function () {});
    } catch (_) { /* silent */ }
  }

  function bindTracked(selector, eventName, extraMeta) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener('click', function () {
        const meta = typeof extraMeta === 'function' ? extraMeta(el) : (extraMeta || {});
        track(eventName, meta);
      });
    });
  }

  function init() {
    bindTracked('[data-track="article_cta_register"]', 'article_cta_register');

    if (isResourcePath((global.location && global.location.pathname) || '')) {
      track('resource_page_viewed', resourceMeta());
      bindTracked('[data-track="article_cta_register"]', 'resource_cta_clicked', function () {
        return resourceMeta({ resource_type: 'app_cta' });
      });
      bindTracked('[data-resource-pdf]', 'resource_pdf_download', function (el) {
        return resourceMeta({
          pdf_id: el.getAttribute('data-resource-pdf') || '',
          resource_type: el.getAttribute('data-resource-pdf') || 'pdf',
          file: el.getAttribute('data-resource-file') || '',
        });
      });
    }

    bindTracked('[data-track="guide_hub_nav_click"]', 'guide_hub_nav_click', function (el) {
      return {
        from_slug: guideSlugFromPath(),
        to_slug: el.getAttribute('data-guide-slug') || '',
        link_type: 'hub_nav',
      };
    });

    bindTracked('[data-track="guide_next_step_click"]', 'guide_next_step_click', function (el) {
      return {
        from_slug: guideSlugFromPath(),
        to_slug: el.getAttribute('data-guide-slug') || '',
        link_type: el.getAttribute('data-link-type') || 'spoke',
      };
    });

    document.querySelectorAll('.faq-item').forEach(function (item) {
      const btn = item.querySelector('.faq-question');
      if (!btn) return;
      const slug = item.getAttribute('data-faq') || 'unknown';

      btn.addEventListener('click', function () {
        const wasOpen = item.classList.contains('is-open');
        document.querySelectorAll('.faq-item.is-open').forEach(function (openItem) {
          openItem.classList.remove('is-open');
          const b = openItem.querySelector('.faq-question');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          track('article_faq_expand', { faq_slug: slug });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.ArticleEvents = { track: track, guideSlugFromPath: guideSlugFromPath };
})(window);
