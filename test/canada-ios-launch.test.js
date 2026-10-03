'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  injectStoreLinkPlaceholders,
  APPLE_APP_STORE_GEO_NEUTRAL_URL,
  getIrelandPlayStoreUrl,
} = require('../config/store-links');

const ROOT = path.join(__dirname, '..');
const SCRIPT = fs.readFileSync(path.join(ROOT, 'public/js/landing-canada-ios.js'), 'utf8');
const EVENTS = fs.readFileSync(path.join(ROOT, 'public/js/landing-events.js'), 'utf8');
const EN_HTML = fs.readFileSync(path.join(ROOT, 'public/en.html'), 'utf8');
const INDEX_HTML = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
const PLAY = 'https://play.google.com/store/apps/details?id=example.app&hl=en&gl=IE';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function makeNode(doc, tag, attrs, text) {
  const node = {
    tagName: String(tag || 'div').toUpperCase(),
    attrs: Object.assign({}, attrs),
    className: (attrs && attrs.class) || '',
    textContent: text || '',
    children: [],
    parentNode: null,
    ownerDocument: doc,
    setAttribute(name, value) { this.attrs[name] = String(value); },
    removeAttribute(name) { delete this.attrs[name]; },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      if (doc._all.indexOf(child) === -1) doc._all.push(child);
      return child;
    },
    insertBefore(child, ref) {
      child.parentNode = this;
      const at = this.children.indexOf(ref);
      if (at === -1) this.children.push(child);
      else this.children.splice(at, 0, child);
      if (doc._all.indexOf(child) === -1) doc._all.push(child);
      return child;
    },
    replaceChild(next, prev) {
      const at = this.children.indexOf(prev);
      if (at === -1) throw new Error('missing child');
      next.parentNode = this;
      this.children[at] = next;
      prev.parentNode = null;
      const allAt = doc._all.indexOf(prev);
      if (allAt !== -1) doc._all.splice(allAt, 1);
      if (doc._all.indexOf(next) === -1) doc._all.push(next);
      return prev;
    },
    addEventListener(type, handler) {
      if (type === 'click') this._click = handler;
    },
  };
  doc._all.push(node);
  return node;
}

function classNames(node) {
  return String(node.className || '').split(/\s+/).filter(Boolean);
}

function matches(node, selector) {
  const raw = String(selector || '').trim();
  if (!raw) return false;
  if (raw.indexOf(',') !== -1) return raw.split(',').some((part) => matches(node, part));
  if (raw.indexOf(' ') !== -1) {
    const parts = raw.split(/\s+/);
    const last = parts.pop();
    if (!matches(node, last)) return false;
    const rest = parts.join(' ');
    let parent = node.parentNode;
    while (parent) {
      if (matches(parent, rest)) return true;
      parent = parent.parentNode;
    }
    return false;
  }
  if (raw.charAt(0) === '.') return classNames(node).indexOf(raw.slice(1)) !== -1;
  if (raw === 'a[href]') return node.tagName === 'A' && node.getAttribute('href') != null;
  if (raw === 'title') return node.tagName === 'TITLE';
  if (/^[a-z][a-z0-9]*$/i.test(raw)) return node.tagName === raw.toUpperCase();
  if (raw === 'script[type="application/ld+json"]') {
    return node.tagName === 'SCRIPT' && node.getAttribute('type') === 'application/ld+json';
  }
  if (raw === 'meta[name="description"]') {
    return node.tagName === 'META' && node.getAttribute('name') === 'description';
  }
  if (raw === 'meta[property="og:description"]') {
    return node.tagName === 'META' && node.getAttribute('property') === 'og:description';
  }
  const attr = raw.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
  if (attr) {
    if (attr[2] == null) return node.getAttribute(attr[1]) != null;
    return node.getAttribute(attr[1]) === attr[2];
  }
  return false;
}

function makeDocument() {
  const doc = {
    readyState: 'complete',
    _all: [],
    addEventListener() {},
  };
  doc.createElement = function createElement(tag) {
    return makeNode(doc, tag, {}, '');
  };
  doc.documentElement = makeNode(doc, 'html', {}, '');
  doc.querySelectorAll = function querySelectorAll(selector) {
    return doc._all.filter((node) => node.parentNode && matches(node, selector));
  };
  doc.querySelector = function querySelector(selector) {
    return doc.querySelectorAll(selector)[0] || null;
  };

  const ctas = makeNode(doc, 'div', { class: 'landing-hero__ctas' }, '');
  const offer = makeNode(doc, 'p', { class: 'landing-hero__offer' }, 'Free in Ireland until 31 December 2026. No card required.');
  const badges = makeNode(doc, 'div', { class: 'store-badges landing-hero__store-badges' }, '');
  const app = makeNode(doc, 'a', {
    href: 'https://apps.apple.com/ie/app/my-starday-family-routines/id6774493098',
    class: 'store-badge-link',
    'data-track': 'app_store_click',
    'data-store-placement': 'hero',
  }, '');
  const play = makeNode(doc, 'a', {
    href: PLAY,
    class: 'store-badge-link',
    'data-track': 'play_store_click',
    'data-store-cta': 'play',
    'data-store-placement': 'hero',
  }, 'Download for Android');
  const card = makeNode(doc, 'div', { class: 'hero-launch-card', 'data-hero-launch': 'ireland' }, '');
  const tag = makeNode(doc, 'span', { class: 'hero-launch-card__tag' }, 'Now in Ireland');
  const title = makeNode(doc, 'title', {}, 'My Starday — Free in Ireland until 31 December 2026');
  const description = makeNode(doc, 'meta', {
    name: 'description',
    content: 'Free in Ireland until 31 December 2026.',
  }, '');
  const json = makeNode(doc, 'script', { type: 'application/ld+json' }, JSON.stringify({
    '@type': 'SoftwareApplication',
    operatingSystem: 'iOS, Android',
    description: 'Free in Ireland until 31 December 2026.',
  }));
  const chip = makeNode(doc, 'span', { class: 'trust-chip' }, 'App Store & Google Play');

  doc.documentElement.appendChild(card);
  card.appendChild(tag);
  doc.documentElement.appendChild(ctas);
  ctas.appendChild(offer);
  ctas.appendChild(badges);
  badges.appendChild(app);
  badges.appendChild(play);
  doc.documentElement.appendChild(chip);
  doc.documentElement.appendChild(title);
  doc.documentElement.appendChild(description);
  doc.documentElement.appendChild(json);
  return doc;
}

function runCanada(doc, options) {
  const opts = options || {};
  const sandbox = {
    console,
    URLSearchParams,
    document: doc,
    location: {
      pathname: '/en',
      search: opts.search || '',
      assign: opts.assign || function () {},
    },
    Intl: {
      DateTimeFormat: function () {
        return {
          resolvedOptions: function () {
            return { timeZone: opts.timeZone || 'UTC' };
          },
        };
      },
    },
    navigator: { userAgent: opts.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' },
    sessionStorage: opts.sessionStorage || {
      store: {},
      getItem(key) { return this.store[key] || null; },
      setItem(key, value) { this.store[key] = String(value); },
    },
    addEventListener() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SCRIPT, sandbox, { filename: 'landing-canada-ios.js' });
  return sandbox;
}

function hrefs(doc) {
  return doc.querySelectorAll('a[href]').map((el) => el.getAttribute('href'));
}

describe('Canada iOS launch on the shared English page', () => {
  it('keeps a live App Store CTA on id 6774493098 and does not hardcode Ireland', () => {
    assert.equal(APPLE_APP_STORE_GEO_NEUTRAL_URL, 'https://apps.apple.com/app/id6774493098');
    assert.match(EN_HTML, /https:\/\/apps\.apple\.com\/app\/id6774493098/);
    assert.doesNotMatch(EN_HTML, /apps\.apple\.com\/ie\/app\//);
    const doc = makeDocument();
    runCanada(doc, { search: '?country=CA', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    const app = doc.querySelector('[data-track="app_store_click"]');
    assert.ok(app);
    assert.equal(app.getAttribute('href'), 'https://apps.apple.com/app/id6774493098');
    assert.equal(doc.documentElement.getAttribute('data-store-platform'), 'ios');
    assert.equal(doc.documentElement.getAttribute('data-canada-ios-launch'), '1');
  });

  it('shows Android as coming soon and removes the Play link for Canada', () => {
    const doc = makeDocument();
    runCanada(doc, { search: '?country=CA' });
    assert.equal(hrefs(doc).some((href) => href.indexOf('play.google.com') !== -1), false);
    const soon = doc.querySelector('.store-android-soon');
    assert.ok(soon);
    assert.equal(soon.textContent, 'Google Play — coming soon');
    assert.equal(soon.getAttribute('role'), 'status');
    assert.equal(soon.getAttribute('data-track'), null);
    const line = doc.querySelector('[data-canada-store-line]');
    assert.equal(line.textContent, 'Available now on the App Store. Android coming soon.');
    assert.match(doc.querySelector('.landing-hero__offer').textContent, /Free until 31 December 2026/);
    assert.equal(doc.documentElement.getAttribute('data-store-platform'), 'other');
    assert.ok(doc.querySelector('[data-track="app_store_click"]'));
    const json = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
    assert.equal(json.operatingSystem, 'iOS');
    assert.doesNotMatch(json.description, /Google Play/);
    assert.equal(doc.querySelector('.hero-launch-card').getAttribute('data-hero-launch'), 'ireland');
  });

  it('prioritizes the coming-soon status on Android without a Play href', () => {
    const doc = makeDocument();
    runCanada(doc, {
      search: '?market=CA',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)',
    });
    assert.equal(doc.documentElement.getAttribute('data-store-platform'), 'android');
    assert.equal(doc.querySelector('.store-badges').getAttribute('data-store-platform'), 'android');
    assert.equal(hrefs(doc).some((href) => href.indexOf('play.google.com') !== -1), false);
    assert.ok(doc.querySelector('[data-track="app_store_click"]'));
    assert.equal(doc.querySelector('[data-canada-web-account] a').getAttribute('href'), '/register');
  });

  it('shows Ireland and Canada together on /en until a country is chosen', () => {
    const urls = [];
    const doc = makeDocument();
    const sandbox = runCanada(doc, {
      search: '?utm_source=ads',
      assign: function (url) { urls.push(url); },
    });
    assert.equal(doc.documentElement.getAttribute('data-en-market'), 'both');
    assert.equal(doc.documentElement.getAttribute('data-canada-ios-launch'), null);
    assert.ok(hrefs(doc).some((href) => href.indexOf('play.google.com') !== -1));
    assert.equal(doc.querySelector('[data-track="app_store_click"]').getAttribute('href'), APPLE_APP_STORE_GEO_NEUTRAL_URL);
    assert.equal(doc.querySelector('.store-android-soon').textContent, 'Canada · Google Play — coming soon');
    assert.equal(doc.querySelector('[data-track="play_store_click"]').getAttribute('data-market'), 'IE');
    assert.match(doc.querySelector('.hero-launch-card__tag').textContent, /Ireland and Canada/);
    assert.match(doc.querySelector('.landing-hero__offer').textContent, /Free in Ireland and Canada until 31 December 2026/);
    assert.equal(doc.querySelector('[data-canada-web-account] a').getAttribute('href'), '/register');
    assert.equal(sandbox.sessionStorage.getItem('sd_country_confirmed'), null);
    assert.equal(doc.querySelector('[data-market-switch="IE"]').getAttribute('aria-pressed'), 'false');
    assert.equal(doc.querySelector('[data-market-switch="CA"]').getAttribute('aria-pressed'), 'false');
    doc.querySelector('[data-market-switch="CA"]')._click();
    doc.querySelector('[data-market-switch="IE"]')._click();
    assert.deepEqual(urls, ['/en?utm_source=ads&country=CA', '/en?utm_source=ads&country=IE']);

    const irish = makeDocument();
    const session = {
      store: { sd_country_code: 'CA' },
      getItem(key) { return this.store[key] || null; },
      setItem(key, value) { this.store[key] = String(value); },
    };
    runCanada(irish, { search: '?country=IE', sessionStorage: session });
    assert.equal(session.getItem('sd_country_code'), 'IE');
    assert.equal(session.getItem('sd_country_confirmed'), null);
    assert.equal(irish.documentElement.getAttribute('data-en-market'), 'IE');
    assert.equal(irish.documentElement.getAttribute('data-canada-ios-launch'), null);
    assert.ok(hrefs(irish).some((href) => href.indexOf('play.google.com') !== -1));
    assert.equal(irish.querySelector('.store-android-soon'), null);
    assert.equal(irish.querySelector('[data-market-switch="IE"]').getAttribute('aria-pressed'), 'true');
    assert.equal(irish.querySelector('.hero-launch-card__tag').textContent, 'Now in Ireland');
  });

  it('uses the time zone only as a store hint and still lets the switch choose the other country', () => {
    const toronto = makeDocument();
    const torontoSession = runCanada(toronto, { search: '', timeZone: 'America/Toronto' });
    assert.equal(toronto.documentElement.getAttribute('data-canada-ios-launch'), '1');
    assert.equal(hrefs(toronto).some((href) => href.indexOf('play.google.com') !== -1), false);
    assert.equal(torontoSession.sessionStorage.getItem('sd_country_code'), 'CA');
    assert.equal(torontoSession.sessionStorage.getItem('sd_country_confirmed'), null);
    assert.equal(toronto.querySelector('[data-market-switch="CA"]').getAttribute('aria-pressed'), 'true');

    const dublin = makeDocument();
    const dublinSession = runCanada(dublin, { search: '', timeZone: 'Europe/Dublin' });
    assert.equal(dublin.documentElement.getAttribute('data-en-market'), 'IE');
    assert.equal(dublin.documentElement.getAttribute('data-canada-ios-launch'), null);
    assert.ok(hrefs(dublin).some((href) => href.indexOf('play.google.com') !== -1));
    assert.equal(dublin.querySelector('.store-android-soon'), null);
    assert.equal(dublinSession.sessionStorage.getItem('sd_country_code'), 'IE');

    const newYork = makeDocument();
    runCanada(newYork, { search: '', timeZone: 'America/New_York' });
    assert.equal(newYork.documentElement.getAttribute('data-en-market'), 'both');
    assert.ok(hrefs(newYork).some((href) => href.indexOf('play.google.com') !== -1));
    assert.equal(newYork.querySelector('.store-android-soon').textContent, 'Canada · Google Play — coming soon');
  });

  it('does not send a Play download event for the coming-soon status, and tags the App Store click as CA', () => {
    const doc = makeDocument();
    const posts = [];
    const sandbox = {
      console,
      Math,
      Date,
      URLSearchParams,
      fetch(url, opts) {
        posts.push(JSON.parse(opts.body));
        return Promise.resolve({ ok: true });
      },
      localStorage: {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, value) { this.store[key] = String(value); },
      },
      sessionStorage: {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, value) { this.store[key] = String(value); },
      },
      location: { pathname: '/en', search: '?country=CA' },
      navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
      document: doc,
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(SCRIPT, sandbox, { filename: 'landing-canada-ios.js' });
    vm.runInContext(EVENTS, sandbox, { filename: 'landing-events.js' });

    const app = doc.querySelector('[data-track="app_store_click"]');
    assert.equal(doc.querySelector('[data-track="play_store_click"]'), null);
    app._click();

    const types = posts.map((body) => body.event_type);
    assert.ok(types.indexOf('landing_view') !== -1);
    assert.ok(types.indexOf('app_store_click') !== -1);
    assert.equal(types.indexOf('play_store_click'), -1);
    assert.equal(types.indexOf('android_store_coming_soon_clicked'), -1);
    const click = posts.find((body) => body.event_type === 'app_store_click');
    assert.equal(click.metadata.country, 'CA');
    assert.equal(click.metadata.market, 'CA');
    assert.equal(click.metadata.platform, 'ios');
    assert.equal(click.metadata.store, 'app_store');
    const storeClick = posts.find((body) => body.event_type === 'store_cta_clicked');
    assert.equal(storeClick.metadata.country, 'CA');
    assert.equal(storeClick.metadata.store, 'app_store');
  });

  it('counts a shared /en view as both countries and keeps the Play click on Ireland', () => {
    const doc = makeDocument();
    const posts = [];
    const sandbox = {
      console,
      Math,
      Date,
      URLSearchParams,
      fetch(url, opts) {
        posts.push(JSON.parse(opts.body));
        return Promise.resolve({ ok: true });
      },
      localStorage: {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, value) { this.store[key] = String(value); },
      },
      sessionStorage: {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, value) { this.store[key] = String(value); },
      },
      location: { pathname: '/en', search: '', assign: function () {} },
      navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' },
      document: doc,
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(SCRIPT, sandbox, { filename: 'landing-canada-ios.js' });
    vm.runInContext(EVENTS, sandbox, { filename: 'landing-events.js' });

    const view = posts.find((body) => body.event_type === 'landing_view');
    assert.equal(view.metadata.market, 'BOTH');
    assert.equal(view.metadata.country, undefined);
    doc.querySelector('[data-track="play_store_click"]')._click();
    const play = posts.find((body) => body.event_type === 'play_store_click');
    assert.equal(play.metadata.country, 'IE');
    assert.equal(play.metadata.store, 'play');
    doc.querySelector('[data-track="app_store_click"]')._click();
    const app = posts.find((body) => body.event_type === 'app_store_click');
    assert.equal(app.metadata.market, 'BOTH');
    assert.equal(app.metadata.country, undefined);
  });

  it('keeps Canada registration open and does not change Sweden', () => {
    assert.match(read('src/lib/market-region.js'), /market_ca_open:\s*true/);
    assert.match(read('public/js/country-choice.js'), /Canada/);
    assert.match(EN_HTML, /href="\/en\/login"/);
    assert.match(EN_HTML, /landing-canada-ios\.js/);
    assert.ok(EN_HTML.indexOf('landing-canada-ios.js') < EN_HTML.indexOf('landing-events.js'));
    assert.doesNotMatch(EN_HTML, /coming soon/i);
    assert.match(EN_HTML, /"operatingSystem": "iOS, Android"/);
    assert.doesNotMatch(INDEX_HTML, /landing-canada-ios/);
    assert.match(INDEX_HTML, /https:\/\/apple\.co\/4v2ESuH/);
    assert.match(INDEX_HTML, /__PLAY_STORE_URL__/);
    assert.doesNotMatch(INDEX_HTML, /Google Play — coming soon/);
    assert.match(read('public/js/landing-login-choice.js'), /canadaAndroidWebOnly/);
    assert.doesNotMatch(read('src/routes/analytics.js'), /android_store_coming_soon_clicked/);
  });

  it('does not rewrite the geo-neutral App Store URL back to the Ireland storefront', () => {
    const html = '<a href="' + APPLE_APP_STORE_GEO_NEUTRAL_URL + '">App</a><a href="__PLAY_STORE_URL__">Play</a>';
    const out = injectStoreLinkPlaceholders(html, { ireland: true });
    assert.match(out, /https:\/\/apps\.apple\.com\/app\/id6774493098/);
    assert.doesNotMatch(out, /apps\.apple\.com\/ie\/app\//);
    assert.match(out, new RegExp(getIrelandPlayStoreUrl().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  it('keeps the English desktop page usable: both the App Store link and the Canada status', () => {
    assert.match(EN_HTML, /<h1>Not just another family calendar\.<\/h1>/);
    assert.match(EN_HTML, /data-store-placement="hero"/);
    assert.match(EN_HTML, /data-store-placement="footer"/);
    const doc = makeDocument();
    runCanada(doc, { search: '?country=CA', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
    assert.equal(doc.documentElement.getAttribute('data-store-platform'), 'other');
    assert.equal(doc.querySelector('[data-track="app_store_click"]').getAttribute('href'), APPLE_APP_STORE_GEO_NEUTRAL_URL);
    assert.equal(doc.querySelector('.store-android-soon').textContent, 'Google Play — coming soon');
    assert.match(read('public/css/landing.css'), /data-store-platform="ios"/);
    assert.match(read('public/css/landing.css'), /data-store-platform="android"/);
  });
});
