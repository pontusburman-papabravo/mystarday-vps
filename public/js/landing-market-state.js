/**
 * Landing copy follows the same registration gates as the product.
 * Closed markets stay closed in copy. When a gate later turns ON, CTAs
 * switch without a new deploy.
 */
(function landingMarketState() {
  'use strict';

  function text(ieOpen, fiOpen, englishAvailable) {
    const parts = [];
    if (englishAvailable) {
      parts.push('English is available in the app.');
    }
    parts.push(ieOpen
      ? 'Ireland is open for registration.'
      : 'Ireland is not open for registration yet.');
    parts.push(fiOpen
      ? 'Finland is open for registration.'
      : 'Finland is not open for registration yet.');
    return parts.join(' ');
  }

  function hideStaleEnglishComingSoon() {
    document.querySelectorAll('.store-locale-note').forEach((el) => {
      el.hidden = true;
    });
    document.querySelectorAll('[aria-label="Download the app (Swedish only today)"]').forEach((el) => {
      el.setAttribute('aria-label', 'Download the app');
    });
    const heroBody = document.querySelector('.hero-launch-card__body');
    if (heroBody) {
      heroBody.innerHTML = 'The app is live on the App Store and Google Play in Swedish and English. Create an account if your country is open, or join the waitlist if it is not.';
    }
  }

  function retargetPrimaryCtas(ieOpen, fiOpen, englishAvailable) {
    const canDirectRegister = englishAvailable || ieOpen || fiOpen;
    if (!canDirectRegister) return;
    document.querySelectorAll('a.btn-primary[href="#waitlist"]').forEach((el, index) => {
      if (index > 2) return;
      el.setAttribute('href', '/register');
      if (el.textContent && /waitlist/i.test(el.textContent)) {
        el.textContent = 'Create account';
      }
    });
  }

  function renderStrip(state) {
    let strip = document.getElementById('landingMarketState');
    if (!strip) {
      strip = document.createElement('p');
      strip.id = 'landingMarketState';
      strip.className = 'store-locale-note store-locale-note--live-state';
      const host = document.querySelector('.landing-hero__ctas') || document.querySelector('.landing-hero__copy');
      if (host) host.insertBefore(strip, host.firstChild);
      else return;
    }
    strip.hidden = false;
    strip.textContent = text(
      state.signup_allowed && state.signup_allowed.IE,
      state.signup_allowed && state.signup_allowed.FI,
      state.english_available === true
    );
  }

  async function run() {
    const res = await fetch('/api/market/registration-gates', { credentials: 'same-origin' });
    if (!res.ok) return;
    const state = await res.json();
    if (state.english_available === true) {
      hideStaleEnglishComingSoon();
    }
    renderStrip(state);
    retargetPrimaryCtas(
      !!(state.signup_allowed && state.signup_allowed.IE),
      !!(state.signup_allowed && state.signup_allowed.FI),
      state.english_available === true
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { run().catch(() => {}); });
  } else {
    run().catch(() => {});
  }
})();
