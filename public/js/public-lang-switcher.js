/**
 * Public marketing language switcher.
 * Language is separate from market. A missing translation goes to that language's home.
 * Routes: window.PUBLIC_LOCALE_ALTERNATES, with the older sv↔en map as fallback.
 */
(function publicLangSwitcherModule() {
  'use strict';

  const FALLBACK_HOMES = { sv: '/', en: '/en', nl: '/nl' };
  const FALLBACK_LABELS = { sv: 'Svenska', en: 'English', nl: 'Nederlands' };

  function currentPath() {
    const p = location.pathname.replace(/\/$/, '') || '/';
    return p;
  }

  function homeGroup() {
    const list = window.PUBLIC_LOCALE_ALTERNATES || [];
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].key === 'home') return list[i];
    }
    return null;
  }

  function homes() {
    const out = {};
    const keys = Object.keys(FALLBACK_HOMES);
    for (let i = 0; i < keys.length; i += 1) out[keys[i]] = FALLBACK_HOMES[keys[i]];
    const home = homeGroup();
    if (!home) return out;
    const codes = Object.keys(home);
    for (let i = 0; i < codes.length; i += 1) {
      if (codes[i] !== 'key' && home[codes[i]]) out[codes[i]] = home[codes[i]];
    }
    return out;
  }

  function labels() {
    return window.PUBLIC_LOCALE_LABELS || FALLBACK_LABELS;
  }

  function localeOf(path) {
    const map = homes();
    const codes = Object.keys(map).filter(function (code) {
      return map[code] && map[code] !== '/';
    }).sort(function (a, b) {
      return map[b].length - map[a].length;
    });
    for (let i = 0; i < codes.length; i += 1) {
      const prefix = map[codes[i]];
      if (path === prefix || path.indexOf(prefix + '/') === 0) return codes[i];
    }
    return 'sv';
  }

  function origins() {
    return window.__PUBLIC_SEO_ORIGINS || null;
  }

  function groupFor(path) {
    const list = window.PUBLIC_LOCALE_ALTERNATES || [];
    for (let i = 0; i < list.length; i += 1) {
      const group = list[i];
      const keys = Object.keys(group);
      for (let k = 0; k < keys.length; k += 1) {
        if (keys[k] !== 'key' && group[keys[k]] === path) return group;
      }
    }
    return null;
  }

  function targetFor(locale) {
    const group = groupFor(currentPath());
    if (group && group[locale]) return group[locale];
    const legacy = window.PUBLIC_LANG_ROUTES || { '/': '/en', '/en': '/' };
    if (locale === 'en' && localeOf(currentPath()) === 'sv') return legacy[currentPath()] || homes().en;
    if (locale === 'sv' && localeOf(currentPath()) === 'en') return legacy[currentPath()] || homes().sv;
    return homes()[locale] || null;
  }

  function absoluteHref(target) {
    const path = target || '/';
    const o = origins();
    if (!o || !o.sv || !o.en) return path;
    const locale = localeOf(path);
    const origin = o[locale] || (locale === 'sv' ? o.sv : o.en);
    if (path === '/') return origin + '/';
    return origin + path;
  }

  function isEnglish() {
    return localeOf(currentPath()) === 'en';
  }

  function alternatePath() {
    const here = localeOf(currentPath());
    return targetFor(here === 'sv' ? 'en' : 'sv');
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
    const wrap = document.createElement('nav');
    wrap.setAttribute('data-public-lang-switcher', '1');
    wrap.setAttribute('aria-label', 'Language');
    wrap.style.cssText = 'display:flex;gap:0.5rem;align-items:center;font-size:0.8125rem;font-weight:600;';
    const here = localeOf(currentPath());
    const names = labels();
    Object.keys(homes()).forEach(function (code, index) {
      if (index) wrap.appendChild(document.createTextNode(' · '));
      const href = absoluteHref(targetFor(code));
      if (code === here) {
        const span = document.createElement('span');
        span.textContent = names[code] || code;
        span.setAttribute('aria-current', 'page');
        span.style.cssText = 'color:#1C2340;';
        wrap.appendChild(span);
        return;
      }
      const link = document.createElement('a');
      link.href = href;
      link.textContent = names[code] || code;
      link.style.cssText = 'color:#8A92AA;text-decoration:none;';
      wrap.appendChild(link);
    });
    if (nav.tagName === 'NAV') {
      nav.appendChild(wrap);
    } else {
      wrap.style.cssText += 'position:fixed;top:0.75rem;right:0.75rem;z-index:300;background:rgba(255,255,255,0.9);padding:0.35rem 0.6rem;border-radius:999px;';
      document.body.appendChild(wrap);
    }
  }

  function loadRoutesThenInject() {
    function ready() {
      inject();
    }
    if (window.PUBLIC_LOCALE_ALTERNATES) {
      ready();
      return;
    }
    const s = document.createElement('script');
    s.src = '/js/public-locale-alternates.js?v=1';
    s.onload = ready;
    s.onerror = ready;
    document.head.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', loadRoutesThenInject);
  window.PublicLangSwitcher = {
    alternatePath: alternatePath,
    isEnglish: isEnglish,
    targetFor: targetFor,
    localeOf: localeOf,
  };
})();
