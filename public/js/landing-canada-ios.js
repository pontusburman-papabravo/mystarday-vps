/**
 * Canada iOS launch on the shared English pages.
 * Play is already public in Ireland, so Android "coming soon" is CA-only.
 * Signal: ?country=CA or ?market=CA, then sessionStorage sd_country_code.
 * Does not set sd_country_confirmed — registration still asks for the country.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sd_country_code';
  const APP_STORE_URL = 'https://apps.apple.com/app/id6774493098';
  const SOON_LABEL = 'Google Play — coming soon';
  const AVAILABILITY = 'Available now on the App Store. Android coming soon.';
  const PHRASES = [
    ['Free in Ireland until 31 December 2026', 'Free until 31 December 2026'],
    ['free for families in Ireland until 31 December 2026', 'free until 31 December 2026'],
    ['The Ireland offer does not', 'The offer does not'],
    ['My Starday is now available in Ireland.', AVAILABILITY],
    ['Now in Ireland', 'Now in Canada'],
    ['Welcome Ireland', 'Welcome Canada'],
    ['Available now in Ireland', 'Available now on the App Store'],
    ['App Store & Google Play', 'App Store now. Google Play — coming soon.'],
    ['App Store or Google Play', 'the App Store. Android coming soon'],
    ['and on Google Play for Android', 'and Android is coming soon'],
    ['Available on iPhone, iPad, and Android — in Swedish and English.', 'On iPhone now. Google Play — coming soon.'],
  ];

  function queryCountry() {
    try {
      const search = (global.location && global.location.search) || '';
      const query = typeof URLSearchParams === 'function' ? new URLSearchParams(search) : null;
      const raw = query && (query.get('country') || query.get('market'));
      if (raw && /^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
    } catch (_) { /* no query */ }
    return null;
  }

  function storedCountry() {
    try {
      const stored = global.sessionStorage && global.sessionStorage.getItem(STORAGE_KEY);
      if (stored && /^[A-Z]{2}$/.test(stored)) return stored;
    } catch (_) { /* private mode */ }
    return null;
  }

  function landingCountry() {
    return queryCountry() || storedCountry();
  }

  function rememberCountry(code) {
    try {
      if (global.sessionStorage) global.sessionStorage.setItem(STORAGE_KEY, code);
    } catch (_) { /* private mode */ }
  }

  function platform() {
    const ua = (global.navigator && global.navigator.userAgent) || '';
    if (/iPad|iPhone|iPod/.test(ua) && !global.MSStream) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'other';
  }

  function isPlayHref(href) {
    return !!(href && (href.indexOf('play.google.com') !== -1 || href.indexOf('__PLAY_STORE_URL__') !== -1));
  }

  function applyPhrases(value) {
    let next = String(value || '');
    PHRASES.forEach(function (pair) {
      next = next.split(pair[0]).join(pair[1]);
    });
    return next;
  }

  function isLeaf(el) {
    return !el.children || el.children.length === 0;
  }

  function replacePlayLink(anchor) {
    const doc = anchor.ownerDocument || document;
    const note = doc.createElement('span');
    note.className = 'store-android-soon';
    note.setAttribute('role', 'status');
    note.textContent = SOON_LABEL;
    if (anchor.parentNode) anchor.parentNode.replaceChild(note, anchor);
  }

  function rewriteLeaves(doc) {
    const selector = [
      '.hero-launch-card__tag',
      '.hero-launch-card__title',
      '.hero-launch-card__hook',
      '.hero-launch-card__body',
      '.landing-hero__offer',
      '.landing-hero__micro',
      '.store-locale-note',
      '.section-eyebrow',
      '.founder-block__intro',
      '.faq-answer-inner',
      '.trust-chip',
      '.final-cta p',
      '.landing-footer__cta p',
    ].join(', ');
    doc.querySelectorAll(selector).forEach(function (el) {
      if (!isLeaf(el)) return;
      const next = applyPhrases(el.textContent);
      if (next !== el.textContent) el.textContent = next;
    });
  }

  function rewriteMetadata(doc) {
    const title = doc.querySelector('title');
    if (title) title.textContent = applyPhrases(title.textContent);
    ['meta[name="description"]', 'meta[property="og:description"]'].forEach(function (selector) {
      const el = doc.querySelector(selector);
      if (!el) return;
      el.setAttribute('content', applyPhrases(el.getAttribute('content')));
    });
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
      const raw = applyPhrases(el.textContent);
      try {
        const data = JSON.parse(raw);
        if (data && data['@type'] === 'SoftwareApplication') {
          data.operatingSystem = 'iOS';
        }
        el.textContent = JSON.stringify(data);
      } catch (_) {
        el.textContent = raw;
      }
    });
  }

  function addAvailabilityLine(doc) {
    if (doc.querySelector('[data-canada-store-line]')) return;
    const ctas = doc.querySelector('.landing-hero__ctas');
    const badges = doc.querySelector('.landing-hero__store-badges');
    if (!ctas || !badges) return;
    const line = doc.createElement('p');
    line.className = 'landing-hero__offer landing-canada-availability';
    line.setAttribute('data-canada-store-line', '');
    line.textContent = AVAILABILITY;
    ctas.insertBefore(line, badges);
  }

  function addWebAccountLink(doc) {
    if (doc.querySelector('[data-canada-web-account]')) return;
    const ctas = doc.querySelector('.landing-hero__ctas');
    if (!ctas) return;
    const wrap = doc.createElement('p');
    wrap.className = 'landing-canada-web';
    wrap.setAttribute('data-canada-web-account', '');
    const link = doc.createElement('a');
    link.setAttribute('href', '/register');
    link.textContent = 'Create a free account in the browser';
    wrap.appendChild(link);
    const how = doc.querySelector('[data-track="hero_how_it_works_click"]');
    if (how && how.parentNode === ctas) ctas.insertBefore(wrap, how);
    else ctas.appendChild(wrap);
  }

  function applyCanada(doc) {
    const root = doc.documentElement;
    const device = platform();
    root.setAttribute('data-canada-ios-launch', '1');
    root.setAttribute('data-store-platform', device);

    Array.prototype.slice.call(doc.querySelectorAll('a[href]')).forEach(function (el) {
      const href = el.getAttribute('href') || '';
      if (href.indexOf('apps.apple.com') !== -1 && href.indexOf('6774493098') !== -1) {
        el.setAttribute('href', APP_STORE_URL);
      }
      if (isPlayHref(href)) replacePlayLink(el);
    });

    doc.querySelectorAll('.store-badges').forEach(function (group) {
      group.setAttribute('data-store-platform', device);
    });

    // Keep data-hero-launch="ireland" so landing-market-state does not
    // replace the hero with a Google Play availability sentence.
    const card = doc.querySelector('.hero-launch-card');
    if (card) card.setAttribute('aria-label', 'Welcome Canada');

    rewriteLeaves(doc);
    rewriteMetadata(doc);
    addAvailabilityLine(doc);
    addWebAccountLink(doc);
  }

  function init() {
    const fromQuery = queryCountry();
    if (fromQuery) rememberCountry(fromQuery);
    if (landingCountry() !== 'CA') return;
    applyCanada(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.LandingCanadaIos = {
    landingCountry: landingCountry,
    platform: platform,
    applyCanada: applyCanada,
    APP_STORE_URL: APP_STORE_URL,
    SOON_LABEL: SOON_LABEL,
  };
})(typeof window !== 'undefined' ? window : globalThis);
