'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  getPlayStoreUrl,
  getIrelandPlayStoreUrl,
  APPLE_APP_STORE_GEO_NEUTRAL_URL,
  APPLE_APP_STORE_IE_URL,
  androidPackageName,
} = require('../config/store-links');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const EN_HTML = read('public/en.html');
const LANDING_EVENTS = read('public/js/landing-events.js');
const ANALYTICS = read('src/routes/analytics.js');

function visibleLandingCopy(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

describe('Ireland /en conversion funnel', () => {
  it('does not show waitlist capture on /en', () => {
    const visible = visibleLandingCopy(EN_HTML);
    assert.doesNotMatch(visible, /Join the waitlist/i);
    assert.doesNotMatch(visible, /Join waitlist/i);
    assert.doesNotMatch(EN_HTML, /id="waitlistForm"/);
    assert.doesNotMatch(EN_HTML, /id="waitlist"/);
    assert.doesNotMatch(EN_HTML, /landing-waitlist\.js/);
    assert.match(EN_HTML, /id="get-the-app"/);
    assert.match(visible, /My Starday is now available in Ireland/);
  });

  it('uses complimentary Ireland copy and never a converting trial', () => {
    const visible = visibleLandingCopy(EN_HTML);
    assert.match(visible, /Free until 31 December 2026\. No payment required during the free period\./);
    assert.doesNotMatch(visible, /No card required/);
    assert.match(visible, /does not turn into a subscription by itself|does not automatically convert into a paid subscription/);
    assert.doesNotMatch(visible, /14 days free/i);
    assert.doesNotMatch(visible, /14-day trial/i);
    assert.doesNotMatch(visible, /7-day/i);
    assert.doesNotMatch(visible, /7 day/i);
    assert.doesNotMatch(visible, /7 days/i);
  });

  it('does not show leftover Swedish demo copy', () => {
    const visible = visibleLandingCopy(EN_HTML);
    assert.doesNotMatch(visible, /12 stjärnor/);
    assert.match(visible, /12 stars/);
    assert.doesNotMatch(visible, /Barninloggning/);
    assert.doesNotMatch(visible, /Välkomstskärm/);
    assert.doesNotMatch(visible, /Skapa konto/);
  });

  it('uses the geo-neutral App Store id and English Ireland Play URLs', () => {
    assert.match(EN_HTML, /https:\/\/apps\.apple\.com\/app\/id6774493098/);
    assert.doesNotMatch(EN_HTML, /apps\.apple\.com\/ie\/app\//);
    assert.doesNotMatch(EN_HTML, /https:\/\/apple\.co\/4v2ESuH/);
    assert.equal(APPLE_APP_STORE_GEO_NEUTRAL_URL, 'https://apps.apple.com/app/id6774493098');
    assert.equal(APPLE_APP_STORE_IE_URL, 'https://apps.apple.com/ie/app/my-starday-family-routines/id6774493098');
    assert.match(EN_HTML, /data-store-cta="play"/);
    assert.match(EN_HTML, new RegExp(getIrelandPlayStoreUrl().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(getPlayStoreUrl(), 'https://play.google.com/store/apps/details?id=' + androidPackageName());
    assert.equal(getIrelandPlayStoreUrl(), getPlayStoreUrl() + '&hl=en&gl=IE');
  });

  it('keeps login secondary and has no primary web-registration CTA', () => {
    const visible = visibleLandingCopy(EN_HTML);
    assert.match(visible, /Already have an account\?/);
    assert.match(EN_HTML, /href="\/en\/login"/);
    assert.match(EN_HTML, /data-track="nav_login_click"/);
    assert.doesNotMatch(visible, /Create account/);
    assert.doesNotMatch(EN_HTML, /href="\/en\/register"/);
    assert.doesNotMatch(EN_HTML, /href="\/register"/);
    assert.match(EN_HTML, /href="#app-store" class="btn-primary"/);
    assert.match(EN_HTML, />Get My Starday</);
  });

  it('metadata says Ireland is free until 31 December 2026', () => {
    assert.match(EN_HTML, /<title>Visual schedule app for kids – routines, rewards and picture support \| My Starday<\/title>/);
    assert.match(EN_HTML, /name="description" content="A visual schedule app for kids\./);
    assert.match(EN_HTML, /og:description" content="Visual schedules and picture support that help children follow routines/);
    assert.match(EN_HTML, /https:\/\/mys(?:tar)day\.app\/en/);
    assert.doesNotMatch(EN_HTML, /Sweden only/i);
    assert.doesNotMatch(EN_HTML, /coming soon/i);
    assert.doesNotMatch(EN_HTML, /Join the waitlist/i);
    assert.doesNotMatch(EN_HTML, /14 days free/i);
  });

  it('hero is about visual routines and store install', () => {
    assert.match(EN_HTML, /<h1>Not just another family calendar\.<\/h1>/);
    assert.match(EN_HTML, /what is happening now, what comes next and what they have already achieved/);
    assert.match(EN_HTML, /Available now in Ireland/);
    assert.match(EN_HTML, /data-hero-launch="ireland"/);
    assert.match(EN_HTML, /data-store-placement="hero"/);
    assert.match(EN_HTML, /data-store-placement="mid_page"/);
    assert.match(EN_HTML, /data-store-placement="footer"/);
  });
});

describe('Ireland /en analytics', () => {
  it('allowlists landing_view and store_cta_clicked without inventing install events', () => {
    assert.match(ANALYTICS, /'landing_view'/);
    assert.match(ANALYTICS, /'store_cta_clicked'/);
    assert.match(ANALYTICS, /'app_store_click'/);
    assert.match(ANALYTICS, /'play_store_click'/);
    assert.doesNotMatch(ANALYTICS, /'store_install'/);
    assert.match(LANDING_EVENTS, /store_cta_clicked/);
    assert.match(LANDING_EVENTS, /landing_view/);
    assert.match(LANDING_EVENTS, /session_id/);
    assert.match(LANDING_EVENTS, /UtmCapture/);
    assert.match(LANDING_EVENTS, /market/);
    assert.match(LANDING_EVENTS, /placement/);
    const csrf = read('src/middleware/csrf.js');
    assert.match(csrf, /\/analytics\/event/);
  });

  it('sends landing_view and store_cta_clicked with market, platform, placement, and UTM', () => {
    const posts = [];
    const iosLink = {
      getAttribute(name) {
        if (name === 'data-track') return 'app_store_click';
        if (name === 'data-store-placement') return 'hero';
        return null;
      },
      addEventListener(type, handler) {
        if (type === 'click') this._click = handler;
      },
    };
    const playLink = {
      getAttribute(name) {
        if (name === 'data-track') return 'play_store_click';
        if (name === 'data-store-cta') return 'play';
        if (name === 'data-store-placement') return 'footer';
        return null;
      },
      addEventListener(type, handler) {
        if (type === 'click') this._click = handler;
      },
    };
    const sandbox = {
      console,
      Math,
      Date,
      fetch(url, opts) {
        posts.push({ url, opts });
        return Promise.resolve({ ok: true });
      },
      localStorage: {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, val) { this.store[key] = String(val); },
      },
      location: { pathname: '/en', search: '?utm_source=ads&utm_campaign=ie-launch' },
      UtmCapture: {
        get() {
          return {
            utm_source: 'ads',
            utm_campaign: 'ie-launch',
            utm_medium: 'paid',
          };
        },
      },
      document: {
        readyState: 'complete',
        querySelectorAll(selector) {
          if (selector === '[data-track="app_store_click"]') return [iosLink];
          if (selector === '[data-track="play_store_click"]') return [playLink];
          return [];
        },
        addEventListener() {},
      },
      window: null,
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(LANDING_EVENTS, sandbox, { filename: 'landing-events.js' });

    const landing = posts.find((p) => {
      const body = JSON.parse(p.opts.body);
      return body.event_type === 'landing_view';
    });
    assert.ok(landing, 'landing_view should fire on /en');
    const landingBody = JSON.parse(landing.opts.body);
    assert.equal(landingBody.metadata.market, 'IE');
    assert.equal(landingBody.metadata.utm_source, 'ads');
    assert.equal(landingBody.metadata.utm_campaign, 'ie-launch');
    assert.match(landingBody.session_id, /^[0-9a-f-]{36}$/i);

    iosLink._click();
    playLink._click();

    const storeEvents = posts
      .map((p) => JSON.parse(p.opts.body))
      .filter((body) => body.event_type === 'store_cta_clicked');
    assert.equal(storeEvents.length, 2);
    assert.equal(storeEvents[0].metadata.platform, 'ios');
    assert.equal(storeEvents[0].metadata.placement, 'hero');
    assert.equal(storeEvents[0].metadata.market, 'IE');
    assert.equal(storeEvents[0].metadata.country, 'IE');
    assert.equal(storeEvents[0].metadata.store, 'app_store');
    assert.equal(storeEvents[0].metadata.utm_source, 'ads');
    assert.equal(storeEvents[1].metadata.platform, 'android');
    assert.equal(storeEvents[1].metadata.store, 'play');
    assert.equal(storeEvents[1].metadata.placement, 'footer');
    assert.ok(storeEvents[0].session_id);
    assert.ok(storeEvents.every((body) => body.event_type !== 'store_install'));
  });
});

describe('related English public pages stay aligned', () => {
  it('English FAQ and pricing do not send new families to web signup or waitlist', () => {
    const faq = read('public/en-faq.html');
    const pricing = read('public/en-pricing.html');
    assert.doesNotMatch(faq, /Join the waitlist/i);
    assert.doesNotMatch(pricing, /Join the waitlist/i);
    assert.doesNotMatch(faq, /Create account/);
    assert.doesNotMatch(pricing, /Create account/);
    assert.doesNotMatch(faq, /href="\/en\/register"/);
    assert.doesNotMatch(pricing, /href="\/en\/register"/);
    assert.match(faq, /Free until 31 December 2026/);
    assert.match(pricing, /Free until 31 December 2026/);
    assert.match(faq, /Ireland and Canada/);
    assert.match(pricing, /Ireland and Canada/);
    assert.doesNotMatch(faq, /14 days free/i);
    assert.doesNotMatch(pricing, /14 days free/i);
    assert.match(faq, /https:\/\/apps\.apple\.com\/app\/id6774493098/);
    assert.doesNotMatch(faq, /apps\.apple\.com\/ie\/app\//);
    assert.match(pricing, /https:\/\/apps\.apple\.com\/app\/id6774493098/);
    assert.doesNotMatch(pricing, /apps\.apple\.com\/ie\/app\//);
    assert.match(faq, /hl=en&amp;gl=IE|hl=en&gl=IE/);
    assert.match(pricing, /hl=en&amp;gl=IE|hl=en&gl=IE/);
  });
});
