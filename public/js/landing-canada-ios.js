/**
 * English /en serves Ireland and Canada on the same page.
 * No country signal: both are visible (App Store for both, Play for Ireland,
 * Google Play — coming soon for Canada). ?country=CA or ?country=IE focuses one.
 * A Canadian or Irish time zone can preselect that focus. The switch stores
 * sd_country_code only — never sd_country_confirmed — so registration still asks.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sd_country_code';
  const APP_STORE_URL = 'https://apps.apple.com/app/id6774493098';
  const SOON_LABEL = 'Google Play — coming soon';
  const SHARED_SOON_LABEL = 'Canada · Google Play — coming soon';
  const AVAILABILITY = 'Available now on the App Store. Android coming soon.';
  const CANADA_TIME_ZONES = {
    'America/St_Johns': true,
    'America/Halifax': true,
    'America/Glace_Bay': true,
    'America/Moncton': true,
    'America/Goose_Bay': true,
    'America/Blanc-Sablon': true,
    'America/Toronto': true,
    'America/Iqaluit': true,
    'America/Atikokan': true,
    'America/Winnipeg': true,
    'America/Resolute': true,
    'America/Rankin_Inlet': true,
    'America/Regina': true,
    'America/Swift_Current': true,
    'America/Edmonton': true,
    'America/Cambridge_Bay': true,
    'America/Yellowknife': true,
    'America/Inuvik': true,
    'America/Creston': true,
    'America/Dawson_Creek': true,
    'America/Fort_Nelson': true,
    'America/Whitehorse': true,
    'America/Dawson': true,
    'America/Vancouver': true,
  };
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
  const SHARED_PHRASES = [
    ['Free in Ireland until 31 December 2026', 'Free in Ireland and Canada until 31 December 2026'],
    ['free for families in Ireland until 31 December 2026', 'free in Ireland and Canada until 31 December 2026'],
    ['My Starday is now available in Ireland.', 'On the App Store in Ireland and Canada.'],
    ['Now in Ireland', 'Now in Ireland and Canada'],
    ['Welcome Ireland', 'Ireland and Canada'],
    ['App Store & Google Play', 'Ireland and Canada'],
    ['Available on iPhone, iPad, and Android — in Swedish and English.', 'On the App Store in Ireland and Canada. Google Play in Ireland.'],
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

  function timeZoneCountry() {
    try {
      const tz = global.Intl
        && global.Intl.DateTimeFormat
        && global.Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === 'Europe/Dublin') return 'IE';
      if (tz && CANADA_TIME_ZONES[tz]) return 'CA';
    } catch (_) { /* no timezone */ }
    return null;
  }

  function resolvedMarket() {
    const fromQuery = queryCountry();
    if (fromQuery === 'CA' || fromQuery === 'IE') return fromQuery;
    if (fromQuery) return 'other';
    const stored = storedCountry();
    if (stored === 'CA' || stored === 'IE') return stored;
    if (stored) return 'other';
    return timeZoneCountry() || 'both';
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

  function applyPhrases(value, pairs) {
    let next = String(value || '');
    (pairs || PHRASES).forEach(function (pair) {
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

  function siblingAfter(node) {
    const parent = node && node.parentNode;
    const kids = parent && parent.children;
    if (!kids) return null;
    for (let i = 0; i < kids.length; i += 1) {
      if (kids[i] === node) return kids[i + 1] || null;
    }
    return null;
  }

  function rewriteLeaves(doc, pairs) {
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
      const next = applyPhrases(el.textContent, pairs);
      if (next !== el.textContent) el.textContent = next;
    });
  }

  function rewriteMetadata(doc, pairs, operatingSystem) {
    const title = doc.querySelector('title');
    if (title) title.textContent = applyPhrases(title.textContent, pairs);
    ['meta[name="description"]', 'meta[property="og:description"]'].forEach(function (selector) {
      const el = doc.querySelector(selector);
      if (!el) return;
      el.setAttribute('content', applyPhrases(el.getAttribute('content'), pairs));
    });
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
      const raw = applyPhrases(el.textContent, pairs);
      try {
        const data = JSON.parse(raw);
        if (operatingSystem && data && data['@type'] === 'SoftwareApplication') {
          data.operatingSystem = operatingSystem;
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

  function pointAppStore(el) {
    const href = el.getAttribute('href') || '';
    if (href.indexOf('apps.apple.com') !== -1 && href.indexOf('6774493098') !== -1) {
      el.setAttribute('href', APP_STORE_URL);
    }
  }

  function addSharedCanadaStatus(anchor) {
    const next = siblingAfter(anchor);
    if (next && String(next.className || '').indexOf('store-android-soon') !== -1) return;
    const doc = anchor.ownerDocument || document;
    const note = doc.createElement('span');
    note.className = 'store-android-soon';
    note.setAttribute('role', 'status');
    note.textContent = SHARED_SOON_LABEL;
    if (!anchor.parentNode) return;
    anchor.parentNode.insertBefore(note, siblingAfter(anchor));
  }

  function markIrelandPlay(anchor) {
    anchor.setAttribute('data-market', 'IE');
    const label = anchor.getAttribute('aria-label') || '';
    if (label.indexOf('Ireland') === -1) {
      anchor.setAttribute('aria-label', label ? label + ' in Ireland' : 'Get it on Google Play in Ireland');
    }
    const parent = anchor.parentNode;
    if (!parent || parent.getAttribute && parent.getAttribute('data-ireland-play') === '1') return;
    const doc = anchor.ownerDocument || document;
    const wrap = doc.createElement('span');
    wrap.className = 'store-market-play';
    wrap.setAttribute('data-ireland-play', '1');
    const caption = doc.createElement('span');
    caption.className = 'store-market-caption';
    caption.textContent = 'Ireland';
    parent.insertBefore(wrap, anchor);
    wrap.appendChild(caption);
    wrap.appendChild(anchor);
  }

  function chooseMarket(code) {
    if (code !== 'IE' && code !== 'CA') return;
    if (queryCountry() === code) return;
    rememberCountry(code);
    let params = null;
    try {
      params = new URLSearchParams((global.location && global.location.search) || '');
    } catch (_) { /* keep the current page */ }
    if (!params || !global.location || typeof global.location.assign !== 'function') return;
    params.delete('market');
    params.set('country', code);
    const path = global.location.pathname || '/en';
    global.location.assign(path + '?' + params.toString());
  }

  function mountSwitch(doc, pressed) {
    let bar = doc.querySelector('[data-en-market-switch]');
    if (!bar) {
      bar = doc.createElement('div');
      bar.className = 'landing-market-switch';
      bar.setAttribute('data-en-market-switch', '');
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Ireland or Canada');
      [{ code: 'IE', label: 'Ireland' }, { code: 'CA', label: 'Canada' }].forEach(function (item) {
        const button = doc.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('data-market-switch', item.code);
        button.textContent = item.label;
        button.addEventListener('click', function () { chooseMarket(item.code); });
        bar.appendChild(button);
      });
      const card = doc.querySelector('.hero-launch-card');
      if (card) card.insertBefore(bar, card.children[0] || null);
      else {
        const badges = doc.querySelector('.store-badges');
        if (badges && badges.parentNode) badges.parentNode.insertBefore(bar, badges);
      }
    }
    doc.querySelectorAll('[data-market-switch]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-market-switch') === pressed ? 'true' : 'false');
    });
  }

  function applyBoth(doc) {
    const root = doc.documentElement;
    root.setAttribute('data-en-market', 'both');
    root.removeAttribute('data-canada-ios-launch');
    const card = doc.querySelector('.hero-launch-card');
    if (card) card.setAttribute('aria-label', 'Ireland and Canada');
    Array.prototype.slice.call(doc.querySelectorAll('a[href]')).forEach(function (el) {
      pointAppStore(el);
      if (!isPlayHref(el.getAttribute('href') || '')) return;
      addSharedCanadaStatus(el);
      markIrelandPlay(el);
    });
    rewriteLeaves(doc, SHARED_PHRASES);
    rewriteMetadata(doc, SHARED_PHRASES, null);
    addWebAccountLink(doc);
  }

  function applyIreland(doc) {
    const root = doc.documentElement;
    root.setAttribute('data-en-market', 'IE');
    root.removeAttribute('data-canada-ios-launch');
  }

  function applyCanada(doc) {
    const root = doc.documentElement;
    const device = platform();
    root.setAttribute('data-en-market', 'CA');
    root.setAttribute('data-canada-ios-launch', '1');
    root.setAttribute('data-store-platform', device);

    Array.prototype.slice.call(doc.querySelectorAll('a[href]')).forEach(function (el) {
      pointAppStore(el);
      if (isPlayHref(el.getAttribute('href') || '')) replacePlayLink(el);
    });

    doc.querySelectorAll('.store-badges').forEach(function (group) {
      group.setAttribute('data-store-platform', device);
    });

    // Keep data-hero-launch="ireland" so landing-market-state does not
    // replace the hero with a Google Play availability sentence.
    const card = doc.querySelector('.hero-launch-card');
    if (card) card.setAttribute('aria-label', 'Welcome Canada');

    rewriteLeaves(doc, PHRASES);
    rewriteMetadata(doc, PHRASES, 'iOS');
    addAvailabilityLine(doc);
    addWebAccountLink(doc);
  }

  function init() {
    const fromQuery = queryCountry();
    if (fromQuery) rememberCountry(fromQuery);
    const market = resolvedMarket();
    if (!fromQuery && !storedCountry() && (market === 'CA' || market === 'IE')) rememberCountry(market);
    if (market === 'CA') applyCanada(document);
    else if (market === 'both') applyBoth(document);
    else applyIreland(document);
    mountSwitch(document, market === 'CA' || market === 'IE' ? market : '');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.LandingCanadaIos = {
    landingCountry: landingCountry,
    resolvedMarket: resolvedMarket,
    platform: platform,
    applyCanada: applyCanada,
    APP_STORE_URL: APP_STORE_URL,
    SOON_LABEL: SOON_LABEL,
    SHARED_SOON_LABEL: SHARED_SOON_LABEL,
  };
})(typeof window !== 'undefined' ? window : globalThis);
