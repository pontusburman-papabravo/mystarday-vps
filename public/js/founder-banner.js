/**
 * founder-banner.js — shows founding-member badge for lifetime-free families.
 */
(function () {
  'use strict';

  function founderCopy() {
    if (typeof window.pt === 'function') {
      const title = window.pt('home.founderBanner.title');
      const body = window.pt('home.founderBanner.body');
      if (title && title !== 'home.founderBanner.title') {
        return { title, body };
      }
    }
    return {
      title: '🎉 Du är grundarmedlem',
      body: 'Som en av de första familjerna har du livstids tillgång utan kostnad. Tack för att du är med från början!',
    };
  }

  function applyBannerCopy() {
    const banner = document.getElementById('founderMemberBanner');
    if (!banner) return;
    const copy = founderCopy();
    const paras = banner.querySelectorAll('p');
    if (paras[0]) paras[0].textContent = copy.title;
    if (paras[1]) paras[1].textContent = copy.body;
  }

  function showBanner() {
    const user = window.Auth && Auth.getUser ? Auth.getUser() : null;
    if (!user || user.is_lifetime_free !== true) return;

    if (document.getElementById('founderMemberBanner')) {
      applyBannerCopy();
      return;
    }

    const copy = founderCopy();
    const banner = document.createElement('div');
    banner.id = 'founderMemberBanner';
    banner.setAttribute('role', 'status');
    banner.style.cssText = [
      'margin:0 16px 12px',
      'padding:12px 16px',
      'background:linear-gradient(135deg,#FFF8E6,#FFF3D6)',
      'border:2px solid #F5A623',
      'border-radius:14px',
      'color:#1B2340',
      'font-size:0.9rem',
      'line-height:1.45',
      'box-shadow:0 4px 16px rgba(245,166,35,0.15)',
    ].join(';');
    banner.innerHTML =
      '<p style="margin:0;font-weight:800;font-size:1rem;">' + copy.title + '</p>' +
      '<p style="margin:6px 0 0;font-weight:500;">' + copy.body + '</p>';

    const main = document.querySelector('main');
  // Must stay inside <main> so the banner scrolls with page content on desktop.
    if (main) {
      const anchor =
        document.getElementById('appViewToggleMount') ||
        main.querySelector('.bg-sky.border-b') ||
        main.firstChild;
      if (anchor && anchor.parentNode === main) {
        main.insertBefore(banner, anchor.nextSibling);
      } else {
        main.insertBefore(banner, main.firstChild);
      }
      return;
    }

    const flexMain = document.querySelector('.flex-1');
    if (flexMain) {
      flexMain.insertBefore(banner, flexMain.firstChild);
      return;
    }

    document.body.insertBefore(banner, document.body.firstChild);
  }

  function init() {
    if (typeof Auth === 'undefined') return;
    if (Auth.isLoggedIn && Auth.isLoggedIn()) {
      showBanner();
      return;
    }
    document.addEventListener('auth:ready', showBanner, { once: true });
  }

  document.addEventListener('parent-i18n-ready', function () {
    if (document.getElementById('founderMemberBanner')) applyBannerCopy();
    else showBanner();
  });
  document.addEventListener('locale-changed', function () {
    const el = document.getElementById('founderMemberBanner');
    if (el) el.remove();
    showBanner();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
