/**
 * Public marketing language switcher (sv ↔ en paths).
 */
(function publicLangSwitcherModule() {
  'use strict';

  const ROUTES = {
    '/': '/en',
    '/en': '/',
    '/faq': '/en/faq',
    '/en/faq': '/faq',
    '/kontakt': '/en/contact',
    '/en/contact': '/kontakt',
    '/privacy': '/en/privacy',
    '/en/privacy': '/privacy',
    '/terms': '/en/terms',
    '/en/terms': '/terms',
    '/pricing-info': '/en/pricing',
    '/en/pricing': '/pricing-info',
    '/register': '/en/register',
    '/en/register': '/register',
    '/login': '/en/login',
    '/en/login': '/login',
    '/forgot-password': '/en/forgot-password',
    '/en/forgot-password': '/forgot-password',
  };

  function currentPath() {
    const p = location.pathname.replace(/\/$/, '') || '/';
    return p;
  }

  function alternatePath() {
    const p = currentPath();
    return ROUTES[p] || (p.startsWith('/en') ? '/' : '/en');
  }

  function isEnglish() {
    return currentPath() === '/en' || currentPath().startsWith('/en/');
  }

  function inject() {
    if (document.querySelector('[data-public-lang-switcher]')) return;
    const nav = document.querySelector('nav') || document.body;
    const wrap = document.createElement('div');
    wrap.setAttribute('data-public-lang-switcher', '1');
    wrap.style.cssText = 'display:flex;gap:0.5rem;align-items:center;font-size:0.8125rem;font-weight:600;';
    const sv = document.createElement('a');
    sv.href = alternatePath().startsWith('/en') ? '/' : (ROUTES[currentPath()] ? ROUTES[currentPath()].replace(/\/en.*/, '/') : '/');
    sv.textContent = 'Svenska';
    sv.style.cssText = isEnglish() ? 'color:#8A92AA;text-decoration:none;' : 'color:#1C2340;text-decoration:none;';
    const en = document.createElement('a');
    en.href = isEnglish() ? alternatePath() : (ROUTES[currentPath()] || '/en');
    en.textContent = 'English';
    en.style.cssText = isEnglish() ? 'color:#1C2340;text-decoration:none;' : 'color:#8A92AA;text-decoration:none;';
    if (!isEnglish()) {
      wrap.appendChild(sv);
      wrap.appendChild(document.createTextNode(' · '));
      wrap.appendChild(en);
    } else {
      wrap.appendChild(sv);
      wrap.appendChild(document.createTextNode(' · '));
      wrap.appendChild(en);
    }
    if (nav.tagName === 'NAV') {
      nav.appendChild(wrap);
    } else {
      wrap.style.cssText += 'position:fixed;top:0.75rem;right:0.75rem;z-index:300;background:rgba(255,255,255,0.9);padding:0.35rem 0.6rem;border-radius:999px;';
      document.body.appendChild(wrap);
    }
  }

  document.addEventListener('DOMContentLoaded', inject);
  window.PublicLangSwitcher = { alternatePath, isEnglish };
})();
