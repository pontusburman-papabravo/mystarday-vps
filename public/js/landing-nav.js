/**
 * Landing page navigation — hamburger, scroll state, mobile menu.
 */
(function () {
  'use strict';

  const nav = document.querySelector('.landing-nav');
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  function closeMobileMenu() {
    if (mobileMenu) mobileMenu.classList.remove('is-open');
    if (hamburger) {
      hamburger.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('landing-menu-open');
  }

  function syncMobileMenuLayout() {
    if (!nav) return;
    const top = nav.getBoundingClientRect().bottom;
    document.documentElement.style.setProperty('--landing-nav-offset', Math.round(top) + 'px');
  }

  window.closeLandingMobileMenu = closeMobileMenu;
  window.syncLandingMobileMenuLayout = syncMobileMenuLayout;

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      syncMobileMenuLayout();
      const open = mobileMenu.classList.toggle('is-open');
      hamburger.classList.toggle('is-open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('landing-menu-open', open);
    });

    document.addEventListener('click', function (e) {
      if (!mobileMenu.classList.contains('is-open')) return;
      if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
        closeMobileMenu();
      }
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  if (nav) {
    syncMobileMenuLayout();
    window.addEventListener('resize', syncMobileMenuLayout, { passive: true });
    window.addEventListener('scroll', function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
    }, { passive: true });
  }
})();
