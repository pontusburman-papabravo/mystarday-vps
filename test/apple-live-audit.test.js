'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { IOS_BUNDLE_ID } = require('../config/iap-product-contract');
const { assertReadOnlyRequest } = require('../src/lib/app-store-connect-read');
const { assertAppleRequest, getCollection } = require('../src/lib/app-store-connect-api');
const {
  EXPECTED_APP_ID,
  collectAppleLiveAudit,
  selectAppInfos,
  selectVersions,
} = require('../src/lib/apple-live-audit');
const {
  buildAppleStorePlan,
  classifyField,
  judgeScreenshots,
  languageCatalog,
} = require('../src/lib/apple-store-plan');
const { main } = require('../scripts/apple-live-audit');

const ISSUER_ID = '57246542-96fe-1a63-e053-0824d011072a';
const KEY_ID = 'AB12CD34EF';

function generatePem() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return privateKey.export({ type: 'pkcs8', format: 'pem' });
}

function credentials(pem, overrides = {}) {
  return {
    APP_STORE_CONNECT_API_PRIVATE_KEY: pem,
    APP_STORE_CONNECT_KEY_ID: KEY_ID,
    APP_STORE_CONNECT_ISSUER_ID: ISSUER_ID,
    APPLE_SIGN_IN_PRIVATE_KEY: 'sign-in-with-apple-must-stay-unused',
    ...overrides,
  };
}

function jsonResponse(status, body, headers = {}) {
  return {
    status,
    headers: { get(name) { return headers[String(name).toLowerCase()] || null; } },
    async text() { return body == null ? '' : JSON.stringify(body); },
  };
}

function appResource() {
  return {
    type: 'apps',
    id: EXPECTED_APP_ID,
    attributes: {
      bundleId: IOS_BUNDLE_ID,
      name: ['Min', 'Stjärndag'].join(' '),
      primaryLocale: 'sv',
    },
  };
}

describe('Apple read allowlist', () => {
  it('allows the audit reads and refuses writes and other resources', () => {
    const allowed = [
      'https://api.appstoreconnect.apple.com/v1/apps',
      'https://api.appstoreconnect.apple.com/v1/apps?limit=200',
      `https://api.appstoreconnect.apple.com/v1/apps/${EXPECTED_APP_ID}/appInfos`,
      `https://api.appstoreconnect.apple.com/v1/apps/${EXPECTED_APP_ID}/appStoreVersions?filter[platform]=IOS`,
      'https://api.appstoreconnect.apple.com/v1/appInfos/10/appInfoLocalizations',
      'https://api.appstoreconnect.apple.com/v1/appStoreVersions/20/appStoreVersionLocalizations',
      'https://api.appstoreconnect.apple.com/v1/appStoreVersionLocalizations/30/appScreenshotSets',
      'https://api.appstoreconnect.apple.com/v1/appScreenshotSets/40/appScreenshots?cursor=next',
    ];
    for (const url of allowed) assert.equal(assertAppleRequest('GET', url).pathname.startsWith('/v1/'), true);
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      assert.throws(() => assertAppleRequest(method, allowed[0]), (error) => error.code === 'APPLE_CONNECT_METHOD_BLOCKED');
    }
    for (const url of [
      `https://api.appstoreconnect.apple.com/v1/apps/${EXPECTED_APP_ID}/inAppPurchases`,
      `https://api.appstoreconnect.apple.com/v1/apps/${EXPECTED_APP_ID}/appAvailabilities`,
      `https://api.appstoreconnect.apple.com/v1/apps/${EXPECTED_APP_ID}/appPricePoints`,
      `https://api.appstoreconnect.apple.com/v1/apps/${EXPECTED_APP_ID}/customerReviews`,
      'https://api.appstoreconnect.apple.com/v1/users',
      'https://example.com/v1/apps',
    ]) {
      assert.throws(() => assertAppleRequest('GET', url), (error) => error.code === 'APPLE_CONNECT_URL_BLOCKED');
    }
    assert.throws(
      () => assertReadOnlyRequest('GET', `https://api.appstoreconnect.apple.com/v1/apps/${EXPECTED_APP_ID}/appStoreVersions`),
      (error) => error.code === 'APPLE_CONNECT_URL_BLOCKED',
    );
  });

  it('follows pagination and stops before a next link outside the allowlist', async () => {
    const calls = [];
    const page = await getCollection('https://api.appstoreconnect.apple.com/v1/apps?limit=1', {
      token: 'test-token',
      fetchImpl: async (url) => {
        calls.push(url);
        if (calls.length === 1) {
          return jsonResponse(200, {
            data: [{ id: '1' }],
            links: { next: 'https://api.appstoreconnect.apple.com/v1/apps?cursor=abc' },
          });
        }
        return jsonResponse(200, {
          data: [{ id: '2' }],
          links: { next: 'https://api.appstoreconnect.apple.com/v1/users?cursor=no' },
        });
      },
    });
    assert.deepEqual(calls, [
      'https://api.appstoreconnect.apple.com/v1/apps?limit=1',
      'https://api.appstoreconnect.apple.com/v1/apps?cursor=abc',
    ]);
    assert.equal(page.listComplete, false);
    assert.equal(page.data.length, 2);
    assert.equal(page.appleError.code, 'APPLE_CONNECT_URL_BLOCKED');
  });

  it('retries 429 and classifies 401 separately from 403', async () => {
    let calls = 0;
    const slept = [];
    const page = await getCollection('https://api.appstoreconnect.apple.com/v1/apps', {
      token: 'test-token',
      maxRetries: 2,
      sleepImpl: async (ms) => { slept.push(ms); },
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return jsonResponse(429, { errors: [{ code: 'RATE_LIMITED', title: 'Too many' }] }, { 'retry-after': '1' });
        return jsonResponse(200, { data: [] });
      },
    });
    assert.equal(page.ok, true);
    assert.equal(calls, 2);
    assert.deepEqual(slept, [1000]);

    const denied = await getCollection('https://api.appstoreconnect.apple.com/v1/apps', {
      token: 'test-token',
      fetchImpl: async () => jsonResponse(401, { errors: [{ code: 'NOT_AUTHORIZED', title: 'Authentication credentials are missing or invalid.' }] }),
    });
    assert.equal(denied.classification, 'auth_error');
    const forbidden = await getCollection('https://api.appstoreconnect.apple.com/v1/apps', {
      token: 'test-token',
      fetchImpl: async () => jsonResponse(403, { errors: [{ code: 'FORBIDDEN_ERROR', title: 'forbidden' }] }),
    });
    assert.equal(forbidden.classification, 'permission_error');
  });
});

describe('Apple version selection', () => {
  it('keeps the live version apart from the editable version', () => {
    const selected = selectVersions([
      { id: 'live', attributes: { platform: 'IOS', versionString: '1.4.7', appStoreState: 'READY_FOR_DISTRIBUTION', createdDate: '2026-01-01T00:00:00Z' } },
      { id: 'draft', attributes: { platform: 'IOS', versionString: '1.5.0', appStoreState: 'PREPARE_FOR_SUBMISSION', createdDate: '2026-02-01T00:00:00Z' } },
      { id: 'review', attributes: { platform: 'IOS', versionString: '1.4.8', appStoreState: 'IN_REVIEW', createdDate: '2026-01-15T00:00:00Z' } },
    ]);
    assert.equal(selected.live.selection, 'one');
    assert.equal(selected.live.resource.id, 'live');
    assert.equal(selected.editable.selection, 'one');
    assert.equal(selected.editable.resource.id, 'draft');
    assert.equal(selected.observed.length, 3);
    const ambiguous = selectVersions([
      { id: 'a', attributes: { platform: 'IOS', appStoreState: 'READY_FOR_SALE', versionString: '1' } },
      { id: 'b', attributes: { platform: 'IOS', appStoreState: 'READY_FOR_DISTRIBUTION', versionString: '2' } },
    ]);
    assert.equal(ambiguous.live.selection, 'ambiguous');
    assert.equal(ambiguous.live.resource, null);
    const infos = selectAppInfos([
      { id: 'published', attributes: { state: 'READY_FOR_DISTRIBUTION' } },
      { id: 'editing', attributes: { state: 'PREPARE_FOR_SUBMISSION' } },
    ]);
    assert.equal(infos.live.resource.id, 'published');
    assert.equal(infos.editable.resource.id, 'editing');
  });
});

describe('Apple catalog comparison', () => {
  it('uses the catalog, with fallbacks kept out of the missing-listing bucket', () => {
    const languages = languageCatalog();
    assert.equal(languages.direct.length, 19);
    assert.equal(languages.fallbacks.length, 7);
    assert.equal(languages.fallbacks.every((row) => row.appleLocale === 'en-GB'), true);
    assert.equal(languages.direct.some((row) => row.appleLocale === 'sv'), true);
  });

  it('does not treat a forbidden or incomplete read as a missing locale', () => {
    const plan = buildAppleStorePlan({
      classification: 'partial',
      authResult: 'authenticated',
      versions: { live: null, editable: null, liveSelection: 'unreadable', editableSelection: 'unreadable', observed: [] },
      appInfos: { live: null, editable: null, liveSelection: 'unreadable', editableSelection: 'unreadable' },
    }, { brand: 'Brand' });
    const finnish = plan.rows.find((row) => row.appleLocale === 'fi' && row.mapping === 'direct');
    const swedish = plan.rows.find((row) => row.appleLocale === 'sv' && row.mapping === 'direct');
    const irish = plan.rows.find((row) => row.appLocales.includes('ga-IE'));
    assert.equal(finnish.textStatus, 'UNKNOWN');
    assert.equal(finnish.screenshotStatus, 'UNKNOWN');
    assert.equal(swedish.screenshotStatus, 'EXTERNAL');
    assert.equal(irish.mapping, 'fallback');
    assert.equal(irish.textStatus, 'EXTERNAL');
    assert.equal(plan.changes.some((change) => change.locale === 'fi'), false);
    assert.equal(plan.applyAllowed, false);
  });

  it('classifies external notes, protected drift, and checksum-backed screenshots', () => {
    assert.equal(classifyField({ kind: 'external' }, 'already live', true), 'EXTERNAL');
    assert.equal(classifyField({ kind: 'text', text: 'Hej' }, '', true), 'MISSING');
    assert.equal(classifyField({ kind: 'text', text: 'Hej' }, 'Hej', false), 'UNKNOWN');
    const local = [{
      file: 'a.png',
      width: 1290,
      height: 2796,
      md5: 'a'.repeat(32),
      sha256: 'b'.repeat(64),
    }];
    const unknown = judgeScreenshots(
      { status: 'present', files: ['a.png'] },
      {
        screenshots: {
          listComplete: true,
          sets: [{ screenshotDisplayType: 'APP_IPHONE_67', listComplete: true, screenshots: [{ width: 1290, height: 2796, sourceFileChecksum: null }] }],
        },
      },
      () => local[0],
    );
    assert.equal(unknown.status, 'UNKNOWN');
    assert.equal(unknown.reason, 'checksum-absent');
    assert.equal(unknown.dimensionsMatch, true);
    const matched = judgeScreenshots(
      { status: 'present', files: ['a.png'] },
      {
        screenshots: {
          listComplete: true,
          sets: [{ screenshotDisplayType: 'APP_IPHONE_67', listComplete: true, screenshots: [{ width: 1290, height: 2796, sourceFileChecksum: 'a'.repeat(32) }] }],
        },
      },
      () => local[0],
    );
    assert.equal(matched.status, 'MATCH');
    const external = judgeScreenshots({ status: 'live_external' }, null, () => { throw new Error('no file'); });
    assert.equal(external.status, 'EXTERNAL');
    const unmapped = judgeScreenshots(
      { status: 'present', files: ['small.png'] },
      { screenshots: { listComplete: true, sets: [] } },
      () => ({ file: 'small.png', width: 780, height: 1688, md5: 'abc', sha256: 'def' }),
    );
    assert.equal(unmapped.status, 'UNKNOWN');
    assert.equal(unmapped.reason, 'unmapped-local-dimensions');
  });

  it('keeps Swedish and English out of the change list', () => {
    const plan = buildAppleStorePlan({
      classification: 'ok',
      authResult: 'authenticated',
      appInfos: {
        liveSelection: 'one',
        editableSelection: 'none',
        live: {
          id: 'info',
          state: 'READY_FOR_DISTRIBUTION',
          localizationListComplete: true,
          localizations: [{ locale: 'sv', name: 'Other', subtitle: 'Other', privacyPolicyUrl: 'https://example.com/privacy' }],
        },
      },
      versions: {
        liveSelection: 'one',
        editableSelection: 'one',
        live: {
          id: 'live',
          versionString: '1.4.7',
          appStoreState: 'READY_FOR_DISTRIBUTION',
          localizationListComplete: true,
          localizations: [{
            locale: 'sv',
            description: 'Annan text',
            keywords: 'annat',
            promotionalText: 'annat',
            supportUrl: 'https://example.com/kontakt',
            marketingUrl: 'https://example.com/',
            whatsNew: 'redan publicerat',
            screenshots: { listComplete: true, sets: [] },
          }],
        },
        editable: { id: 'draft', versionString: '1.5.0', appStoreState: 'PREPARE_FOR_SUBMISSION' },
      },
    }, { brand: 'Brand', inspectLocal: () => ({ width: 1290, height: 2796, md5: 'abc', sha256: 'def' }) });
    assert.equal(plan.changes.some((change) => change.locale === 'sv' || change.locale === 'en-GB'), false);
    assert.equal(plan.blocked.some((item) => item.locale === 'sv' && item.reason === 'protected-listing'), true);
    assert.equal(plan.rows.find((row) => row.appleLocale === 'sv').textStatus, 'DRIFT');
    assert.equal(plan.applyAllowed, false);
    assert.equal(plan.blockReason, 'read-only-dry-run');
    assert.match(plan.digest, /^[a-f0-9]{64}$/);
  });
});

describe('Apple live audit collection', () => {
  it('reads only the canonical app and redacts the signing material', async () => {
    const pem = generatePem();
    const calls = [];
    let leaked = '';
    const audit = await collectAppleLiveAudit({
      env: credentials(pem),
      nowSec: 1_700_000_000,
      fetchImpl: async (url, init) => {
        calls.push({ url, method: init.method });
        leaked = init.headers.Authorization;
        if (url.startsWith('https://api.appstoreconnect.apple.com/v1/apps?')) {
          return jsonResponse(200, { data: [appResource()] });
        }
        if (url.includes('/appInfos')) {
          return jsonResponse(200, { data: [{ id: 'info1', attributes: { state: 'READY_FOR_DISTRIBUTION' } }] });
        }
        if (url.includes('/appInfoLocalizations')) {
          return jsonResponse(200, { data: [{ id: 'loc', attributes: { locale: 'sv', name: 'Namn', subtitle: 'Underrad', privacyPolicyUrl: 'https://example.com/privacy' } }] });
        }
        if (url.includes('/appStoreVersions?')) {
          return jsonResponse(200, {
            data: [
              { id: '9001', attributes: { platform: 'IOS', versionString: '1.4.7', appStoreState: 'READY_FOR_DISTRIBUTION', createdDate: '2026-01-01T00:00:00Z' } },
              { id: '9002', attributes: { platform: 'IOS', versionString: '1.5.0', appStoreState: 'PREPARE_FOR_SUBMISSION', createdDate: '2026-02-01T00:00:00Z' } },
            ],
          });
        }
        if (url.includes('/appStoreVersionLocalizations')) {
          return jsonResponse(200, { data: [{ id: 'vloc', attributes: { locale: 'fi', description: 'Text', keywords: 'a', promotionalText: 'b', supportUrl: 'https://example.com/s', marketingUrl: 'https://example.com/m', whatsNew: 'nytt' } }] });
        }
        if (url.includes('/appScreenshotSets')) {
          return jsonResponse(200, { data: [{ id: 'set1', attributes: { screenshotDisplayType: 'APP_IPHONE_67' } }] });
        }
        if (url.includes('/appScreenshots')) {
          return jsonResponse(200, {
            data: [{
              id: 'shot1',
              attributes: {
                fileName: 'one.png',
                fileSize: 10,
                sourceFileChecksum: 'abc',
                imageAsset: { templateUrl: 'https://example.invalid/secret-upload', width: 1290, height: 2796 },
                assetDeliveryState: { state: 'COMPLETE' },
              },
            }],
          });
        }
        return jsonResponse(404, { errors: [{ code: 'NOT_FOUND', title: 'missing' }] });
      },
    });
    assert.equal(calls.every((call) => call.method === 'GET'), true);
    assert.equal(audit.classification, 'ok');
    assert.equal(audit.httpStatus, 200);
    assert.equal(audit.versions.live.appStoreState, 'READY_FOR_DISTRIBUTION');
    assert.equal(audit.versions.editable.appStoreState, 'PREPARE_FOR_SUBMISSION');
    assert.equal(audit.versions.live.localizations[0].locale, 'fi');
    assert.equal(audit.versions.editable.localizations[0].locale, 'fi');
    const serialized = JSON.stringify(audit);
    assert.equal(serialized.includes(pem), false);
    assert.equal(serialized.includes(KEY_ID), false);
    assert.equal(serialized.includes(ISSUER_ID), false);
    assert.equal(serialized.includes(leaked), false);
    assert.equal(serialized.includes('secret-upload'), false);
    assert.equal(serialized.includes('templateUrl'), false);
  });

  it('stops on 401 and does not turn 403 into a missing app', async () => {
    const pem = generatePem();
    let calls = 0;
    const unauthorized = await collectAppleLiveAudit({
      env: credentials(pem),
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(401, { errors: [{ code: 'NOT_AUTHORIZED', title: 'Authentication credentials are missing or invalid.', detail: KEY_ID }] });
      },
    });
    assert.equal(calls, 1);
    assert.equal(unauthorized.classification, 'auth_error');
    assert.equal(unauthorized.httpStatus, 401);
    assert.equal(JSON.stringify(unauthorized).includes(KEY_ID), false);

    const forbidden = await collectAppleLiveAudit({
      env: credentials(pem),
      fetchImpl: async (url) => {
        if (url.includes('/v1/apps?')) return jsonResponse(200, { data: [appResource()] });
        return jsonResponse(403, { errors: [{ code: 'FORBIDDEN_ERROR', title: 'forbidden' }] });
      },
    });
    assert.equal(forbidden.classification, 'partial');
    assert.equal(forbidden.authResult, 'authenticated');
    assert.equal(forbidden.versions.liveSelection, 'unreadable');
    assert.equal(forbidden.versions.live, null);
  });
});

describe('apple-live-audit workflow', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/apple-live-audit.yml'), 'utf8');
  const verify = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/apple-connect-verify.yml'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, '..', 'scripts/apple-live-audit.js'), 'utf8');

  it('is a separate manual read on store-publishing', () => {
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /\n\s*push:/);
    assert.doesNotMatch(workflow, /pull_request|schedule:/);
    assert.match(workflow, /environment: store-publishing/);
    assert.match(workflow, /secrets\.APP_STORE_CONNECT_API_PRIVATE_KEY/);
    assert.match(workflow, /secrets\.APP_STORE_CONNECT_KEY_ID/);
    assert.match(workflow, /secrets\.APP_STORE_CONNECT_ISSUER_ID/);
    assert.match(workflow, /contents: read/);
    assert.match(workflow, /apple-live-audit\.json/);
    assert.match(workflow, /apple-store-plan\.json/);
    assert.doesNotMatch(workflow, /play-store-publish|play-publisher|GOOGLE_PLAY|APPLE_SIGN_IN|method:\s*'POST'/);
    assert.match(verify, /apple-connect-verify\.js/);
    assert.doesNotMatch(verify, /apple-live-audit/);
    assert.doesNotMatch(script, /play-publisher|apple-token|apple-auth/);
  });

  it('writes both reports without the private key', async () => {
    const pem = generatePem();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apple-live-audit-'));
    const code = await main(
      ['node', 'scripts/apple-live-audit.js', '--out-dir', dir],
      credentials(pem),
      async () => jsonResponse(401, { errors: [{ code: 'NOT_AUTHORIZED', title: 'Authentication credentials are missing or invalid.' }] }),
    );
    assert.equal(code, 1);
    const written = ['apple-live-audit.json', 'apple-live-audit.md', 'apple-store-plan.json', 'apple-store-plan.md']
      .map((name) => fs.readFileSync(path.join(dir, name), 'utf8'))
      .join('\n');
    assert.equal(written.includes(pem), false);
    assert.equal(written.includes(KEY_ID), false);
    assert.match(written, /read-only-dry-run/);
    const plan = JSON.parse(fs.readFileSync(path.join(dir, 'apple-store-plan.json'), 'utf8'));
    assert.equal(plan.applyAllowed, false);
  });
});
