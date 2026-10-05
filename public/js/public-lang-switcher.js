/**
 * Public marketing language switcher (sv ↔ en paths).
 * Routes loaded from generated public-lang-routes.js
 */
(function publicLangSwitcherModule() {
  'use strict';

  const FALLBACK_ROUTES = {
    '/': '/en',
    '/en': '/',
  };

  function routes() {
    return window.PUBLIC_LANG_ROUTES || FALLBACK_ROUTES;
  }

  function currentPath() {
    const p = location.pathname.replace(/\/$/, '') || '/';
    return p;
  }

  function origins() {
    return window.__PUBLIC_SEO_ORIGINS || null;
  }

  function absoluteHref(path) {
    const target = path || '/';
    const o = origins();
    if (!o || !o.sv || !o.en) return target;
    const english = target === '/en' || target.startsWith('/en/');
    const origin = english ? o.en : o.sv;
    if (target === '/') return origin + '/';
    return origin + target;
  }

  function alternatePath() {
    const p = currentPath();
    const map = routes();
    return map[p] || (p.startsWith('/en') ? '/' : '/en');
  }

  function isEnglish() {
    return currentPath() === '/en' || currentPath().startsWith('/en/');
  }

  function hasInAppReturnContext() {
    if (document.documentElement.hasAttribute('data-legal-in-app-return')) return true;
    const returnTo = new URLSearchParams(window.location.search || '').get('returnTo');
    if (!returnTo || typeof returnTo !== 'string') return false;
    const trimmed = returnTo.trim();
    if (trimmed !== '/paywall') return false;
    if (trimmed.indexOf('://') !== -1 || trimmed.indexOf('..') !== -1) return false;
    return true;
  }

  function inject() {
    if (hasInAppReturnContext()) return;
    if (document.querySelector('[data-public-lang-switcher]')) return;
    const nav = document.querySelector('nav') || document.body;
    const wrap = document.createElement('div');
    wrap.setAttribute('data-public-lang-switcher', '1');
    wrap.style.cssText = 'display:flex;gap:0.5rem;align-items:center;font-size:0.8125rem;font-weight:600;';
    const map = routes();
    const sv = document.createElement('a');
    sv.href = absoluteHref(isEnglish() ? (map[currentPath()] || '/') : currentPath());
    sv.textContent = 'Svenska';
    sv.style.cssText = isEnglish() ? 'color:#8A92AA;text-decoration:none;' : 'color:#1C2340;text-decoration:none;';
    const en = document.createElement('a');
    en.href = absoluteHref(isEnglish() ? currentPath() : (map[currentPath()] || '/en'));
    en.textContent = 'English';
    en.style.cssText = isEnglish() ? 'color:#1C2340;text-decoration:none;' : 'color:#8A92AA;text-decoration:none;';
    wrap.appendChild(sv);
    wrap.appendChild(document.createTextNode(' · '));
    wrap.appendChild(en);
    if (nav.tagName === 'NAV') {
      nav.appendChild(wrap);
    } else {
      wrap.style.cssText += 'position:fixed;top:0.75rem;right:0.75rem;z-index:300;background:rgba(255,255,255,0.9);padding:0.35rem 0.6rem;border-radius:999px;';
      document.body.appendChild(wrap);
    }
  }

  function loadRoutesThenInject() {
    if (window.PUBLIC_LANG_ROUTES) {
      inject();
      return;
    }
    const s = document.createElement('script');
    s.src = '/js/public-lang-routes.js?v=1';
    s.onload = inject;
    s.onerror = inject;
    document.head.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', loadRoutesThenInject);
  window.PublicLangSwitcher = { alternatePath, isEnglish, routes };
})();
