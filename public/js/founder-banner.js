/**
 * founder-banner.js — shows Grundarmedlem badge for lifetime-free families.
 */
(function () {
  'use strict';

  function showBanner() {
    var user = window.Auth && Auth.getUser ? Auth.getUser() : null;
    if (!user || user.is_lifetime_free !== true) return;

    if (document.getElementById('founderMemberBanner')) return;

    var banner = document.createElement('div');
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
      '<p style="margin:0;font-weight:800;font-size:1rem;">🎉 Du är grundarmedlem</p>' +
      '<p style="margin:6px 0 0;font-weight:500;">Som en av de första familjerna har du livstids tillgång utan kostnad. Tack för att du är med från början!</p>';

    var main = document.querySelector('main');
    if (main) {
      // Must stay inside <main> — inserting before main breaks md:flex-row (3-column crush).
      var anchor =
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

    var flexMain = document.querySelector('.flex-1');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
