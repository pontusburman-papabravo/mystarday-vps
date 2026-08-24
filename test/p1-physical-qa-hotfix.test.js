'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P1 physical QA hotfix — rate limit bootstrap', () => {
  const limiter = read('src/middleware/rateLimiter.js');

  it('app-entry is exempt from authenticated apiLimiter burst', () => {
    assert.match(limiter, /\/auth\/app-entry/);
    assert.match(limiter, /API_BOOTSTRAP_PREFIXES/);
  });
});

describe('P1 physical QA hotfix — journey context dedup', () => {
  const client = read('public/js/journey-context-client.js');

  it('shares in-flight fetch between isJourneyApiEnabled and fetchContext', () => {
    assert.match(client, /inflightFetch/);
    assert.match(client, /if \(!force && inflightFetch\)/);
    assert.match(client, /if \(inflightFetch\)/);
  });
});

describe('P1 physical QA hotfix — profile picker resilience', () => {
  const picker = read('public/js/child-profile-picker.js');

  it('checks app-entry HTTP status before using body', () => {
    assert.match(picker, /fetchAppEntry/);
    assert.match(picker, /if \(!res\.ok\)/);
    assert.match(picker, /body\.orchestratorActive !== true/);
  });

  it('429 shows recoverable error instead of silent empty state', () => {
    assert.match(picker, /err\.status === 429/);
    assert.match(picker, /För många förfrågningar/);
    assert.match(picker, /cppRetryBtn/);
  });

  it('switch=1 does not auto-select only child', () => {
    assert.match(picker, /totalProfiles === 1 && children\.length === 1 && !isSwitch/);
  });

  it('renders both profile kinds from allowedChildren and allowedParents', () => {
    assert.match(picker, /renderCards\(children, parents\)/);
    assert.match(picker, /data-profile-kind="child"/);
    assert.match(picker, /data-profile-kind="parent"/);
  });
});

describe('P1 physical QA hotfix — settings UX copy and chrome', () => {
  const hubs = read('public/js/parent-magic-page-hubs.js');
  const nativeNav = read('public/js/settings-native-nav.js');
  const sv = read('config/i18n/settings-sv-SE.json');
  const en = read('config/i18n/settings-en-GB.json');

  it('removes mockupen from settings hub copy', () => {
    assert.doesNotMatch(hubs, /mockupen/i);
    assert.doesNotMatch(sv, /mockup/i);
    assert.doesNotMatch(en, /mockup/i);
    assert.match(sv, /Profil, familj och app/);
  });

  it('hides duplicate settings switch card when top chrome button exists', () => {
    assert.match(hubs, /hasTopProfileSwitch/);
    assert.match(hubs, /data-profile-switch-parent/);
  });

  it('subscription group keeps only contextual back in-group', () => {
    assert.match(nativeNav, /magic-settings-in-group/);
    assert.match(hubs, /backToSettings/);
    assert.match(nativeNav, /if \(inGroup\)/);
  });
});

describe('P1 physical QA hotfix — trofe icon runtime path', () => {
  const icon = read('public/js/icon-system.js');
  const hubs = read('public/js/parent-magic-page-hubs.js');

  it('IconSystem hub assets include cache-busted trofe URL', () => {
    assert.match(icon, /trofe: true/);
    assert.match(icon, /HUB_ASSET_VERSION/);
    assert.match(icon, /hub\/' \+ name \+ '\.svg\?v='/);
  });

  it('pageIcon never returns raw icon key string', () => {
    const fn = hubs.slice(hubs.indexOf('function pageIcon'), hubs.indexOf('function renderGenericHero'));
    assert.doesNotMatch(fn, /return iconKey;/);
    assert.match(fn, /return '';/);
  });

  it('trofe.svg is precached in service worker', () => {
    const sw = read('public/sw.js');
    assert.match(sw, /hub\/trofe\.svg/);
    assert.match(sw, /stjarndag-v874/);
  });
});

describe('P1 physical QA hotfix — app-entry fetch coalescing', () => {
  const orch = read('public/js/app-entry-orchestrator.js');

  it('dedupes parallel fetchEntryDecision calls', () => {
    assert.match(orch, /_entryFetchPromise/);
    assert.match(orch, /_entryFetchPromise\.key === cacheKey/);
  });
});
