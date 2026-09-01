/**
 * Public landing copy follows /api/market/registration-gates.
 *
 * CLOSED          — country not available; waitlist stays as interest capture
 * OPEN_PREBILLING — registration + product; no “subscribe now”
 * OPEN_PAID       — registration + prices shown in the app
 */
(function landingMarketState() {
  'use strict';

  function launchState(code, state) {
    if (state.launch_state && state.launch_state[code]) return state.launch_state[code];
    const allowed = !!(state.signup_allowed && state.signup_allowed[code]);
    if (!allowed) return 'closed';
    return state.public_billing_usable ? 'open_paid' : 'open_prebilling';
  }

  function anyOpen(state, codes) {
    return codes.some((code) => launchState(code, state) !== 'closed');
  }

  function stripText(state) {
    const ie = launchState('IE', state);
    const fi = launchState('FI', state);
    const parts = [];
    if (state.english_available === true) {
      parts.push('English is available in the app.');
    }
    parts.push(ie === 'closed'
      ? 'Ireland is not open for registration yet.'
      : 'Ireland is open for registration.');
    parts.push(fi === 'closed'
      ? 'Finland is not open for registration yet.'
      : 'Finland is open for registration.');
    if (ie === 'open_prebilling' || fi === 'open_prebilling') {
      parts.push('You can use the app now. A subscription is not required yet.');
    }
    if (ie === 'open_paid' || fi === 'open_paid') {
      parts.push('Prices, if any, are shown in the app before you buy.');
    }
    return parts.join(' ');
  }

  function hideStaleEnglishComingSoon() {
    document.querySelectorAll('.store-locale-note').forEach((el) => {
      if (el.id === 'landingMarketState') return;
      el.hidden = true;
    });
    document.querySelectorAll('[aria-label="Download the app (Swedish only today)"]').forEach((el) => {
      el.setAttribute('aria-label', 'Download the app');
    });
    const heroBody = document.querySelector('.hero-launch-card__body');
    if (heroBody) {
      heroBody.innerHTML = 'The app is live on the App Store and Google Play in Swedish and English. Create an account if your country is open. If it is not, you can leave your email to be notified.';
    }
    document.querySelectorAll('.faq-answer-inner, .faq-answer').forEach((el) => {
      if (!/Swedish only|English is coming soon|English coming soon/i.test(el.textContent || '')) return;
      el.textContent = 'The App Store and Google Play apps are available in Swedish and English. Create an account if your country is open. You can also use the browser version and add it to your home screen as a PWA.';
    });
    document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
      try {
        const data = JSON.parse(el.textContent);
        if (!data || data['@type'] !== 'FAQPage' || !Array.isArray(data.mainEntity)) return;
        data.mainEntity.forEach((item) => {
          const answer = item && item.acceptedAnswer && item.acceptedAnswer.text;
          if (typeof answer === 'string' && /Swedish only|English is coming soon/i.test(answer)) {
            item.acceptedAnswer.text = 'The App Store and Google Play apps are available in Swedish and English. Create an account if your country is open. You can also use the browser version and add it to your home screen as a PWA.';
          }
        });
        el.textContent = JSON.stringify(data);
      } catch (_) { /* leave JSON-LD as authored */ }
    });
    document.querySelectorAll('a[href*="apple.co"], a[href*="apps.apple.com"]').forEach((el) => {
      if (/Download for iPhone \(Swedish\)/i.test(el.textContent || '')) {
        el.textContent = 'Download for iPhone';
      }
    });
    document.querySelectorAll('a[href*="play.google.com"], a[href*="__PLAY_STORE_URL__"]').forEach((el) => {
      if (/Download for Android \(Swedish\)/i.test(el.textContent || '')) {
        el.textContent = 'Download for Android';
      }
    });
  }

  function retargetPrimaryCtas(canRegister) {
    if (!canRegister) return;
    document.querySelectorAll('a.btn-primary[href="#waitlist"], a.btn-primary[href="/en#waitlist"], a[href="/en#waitlist"]').forEach((el) => {
      if (el.id === 'waitlistSubmitBtn') return;
      if (el.closest('#waitlistForm')) return;
      el.setAttribute('href', '/register');
      if (el.textContent && /waitlist/i.test(el.textContent)) {
        el.textContent = 'Create account';
      }
    });
  }

  function retuneWaitlistCopy(state) {
    const ieOpen = launchState('IE', state) !== 'closed';
    const fiOpen = launchState('FI', state) !== 'closed';
    const intro = document.querySelector('#waitlist .founder-block__intro, .waitlist-block .founder-block__intro');
    if (intro && /English launch is ready|ready for your family in English|English version is ready/i.test(intro.textContent || '')) {
      intro.textContent = ieOpen || fiOpen
        ? 'Create an account if your country is open. Leave your email only if you want to hear about future markets.'
        : 'English is available today. Leave your email if your country is not open for registration yet.';
    }
    const consent = document.querySelector('#waitlist label[for="waitlistConsent"] span, .waitlist-form__consent span');
    if (consent && /English launch is ready/i.test(consent.textContent || '')) {
      consent.textContent = 'Email me when My Starday is available in my country. I can unsubscribe anytime.';
    }
  }

  function hideSubscribeNowIfPrebilling(state) {
    const ie = launchState('IE', state);
    const fi = launchState('FI', state);
    if (ie !== 'open_prebilling' && fi !== 'open_prebilling') return;
    document.querySelectorAll('[data-public-subscribe-now]').forEach((el) => {
      el.hidden = true;
    });
  }

  function renderStrip(state) {
    let strip = document.getElementById('landingMarketState');
    if (!strip) {
      strip = document.createElement('p');
      strip.id = 'landingMarketState';
      strip.className = 'store-locale-note store-locale-note--live-state';
      const host = document.querySelector('.landing-hero__ctas')
        || document.querySelector('.landing-hero__copy')
        || document.querySelector('main')
        || document.body;
      if (host) host.insertBefore(strip, host.firstChild);
      else return;
    }
    strip.hidden = false;
    strip.textContent = stripText(state);
  }

  async function run() {
    const res = await fetch('/api/market/registration-gates', { credentials: 'same-origin' });
    if (!res.ok) return;
    const state = await res.json();
    if (state.english_available === true) {
      hideStaleEnglishComingSoon();
    }
    const canRegister = anyOpen(state, ['SE', 'IE', 'FI']);
    retargetPrimaryCtas(canRegister);
    retuneWaitlistCopy(state);
    hideSubscribeNowIfPrebilling(state);
    renderStrip(state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { run().catch(() => {}); });
  } else {
    run().catch(() => {});
  }
})();
