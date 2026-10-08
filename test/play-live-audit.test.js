'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  classifyPlayRequest,
  createPlayReader,
} = require('../src/lib/play-publisher-read');
const {
  PACKAGE_NAME,
  languagePlan,
  judgeLanguage,
  judgeMarkets,
  judgeScreenshots,
  runPlayLiveAudit,
  redactValue,
} = require('../src/lib/play-live-audit');
const { loadStoreCatalog } = require('../src/lib/store-locale');

function jsonResponse(status, body) {
  return {
    status,
    async text() {
      return body == null ? '' : JSON.stringify(body);
    },
  };
}

describe('Play read client', () => {
  it('refuses commit, upload, and availability updates before any request', async () => {
    let called = 0;
    let createBody = null;
    const reader = createPlayReader({
      packageName: PACKAGE_NAME,
      token: 'test-token',
      fetchImpl: async (_url, init) => {
        called += 1;
        createBody = init.body;
        return jsonResponse(200, {});
      },
    });
    const blocked = [
      ['POST', `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/1:commit`],
      ['PUT', `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/1/listings/sv-SE`],
      ['POST', `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/1/listings/sv-SE/phoneScreenshots`],
    ];
    for (const [method, url] of blocked) {
      assert.equal(classifyPlayRequest(method, url), null);
    }
    const created = await reader.createEdit();
    assert.equal(created.ok, true);
    assert.equal(called, 1);
    assert.equal(createBody, '{}');
    assert.equal(reader.calls.some((call) => call.path.includes('commit')), false);
    await reader.listImages('edit-1', 'bg', 'featureGraphic');
    await assert.rejects(
      async () => reader.listImages('edit-1', '../commit', 'phoneScreenshots'),
      (error) => error.message === 'PLAY_REQUEST_BLOCKED'
    );
    await assert.rejects(
      async () => reader.deleteEdit('1:commit'),
      (error) => error.message === 'PLAY_REQUEST_BLOCKED'
    );
  });

  it('allows create, read, and delete of an uncommitted edit', () => {
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}`;
    assert.equal(classifyPlayRequest('POST', `${base}/edits`), 'edit-create');
    assert.equal(classifyPlayRequest('GET', `${base}/edits/edit-1/listings`), 'listings');
    assert.equal(classifyPlayRequest('GET', `${base}/edits/edit-1/listings/sv-SE/phoneScreenshots`), 'images');
    assert.equal(classifyPlayRequest('GET', `${base}/edits/edit-1/listings/bg/featureGraphic`), 'images');
    assert.equal(classifyPlayRequest('GET', `${base}/edits/edit-1/countryAvailability`), 'countries');
    assert.equal(classifyPlayRequest('DELETE', `${base}/edits/edit-1`), 'edit-delete');
  });
});

describe('Play listing comparison', () => {
  it('plans one row per app locale and keeps Irish and Maltese on the en-GB fallback', () => {
    const catalog = loadStoreCatalog();
    const plan = languagePlan(catalog, 'Brand');
    assert.equal(plan.length, Object.keys(catalog.locales.appLocales).length);
    const irish = plan.find((row) => row.appLocale === 'ga-IE');
    const maltese = plan.find((row) => row.appLocale === 'mt-MT');
    const icelandic = plan.find((row) => row.appLocale === 'is-IS');
    assert.equal(irish.mapping, 'fallback');
    assert.equal(irish.googleLocale, 'en-GB');
    assert.equal(maltese.googleLocale, 'en-GB');
    assert.equal(icelandic.mapping, 'direct');
    assert.equal(icelandic.googleLocale, 'is-IS');
  });

  it('marks matching copy as MATCH and a different title as DRIFT', () => {
    const row = {
      appLocale: 'sv-SE',
      googleLocale: 'sv-SE',
      mapping: 'direct',
      fallback: null,
      brand: 'Brand',
      expected: { title: '{{brand}}', shortDescription: 'Kort', fullDescription: 'Lång' },
      screenshotExpectation: { status: 'live_external' },
    };
    const match = judgeLanguage(row, {
      listing: { language: 'sv-SE', title: 'Brand', shortDescription: 'Kort', fullDescription: 'Lång' },
      counts: { phoneScreenshots: 2, featureGraphic: 1 },
    });
    assert.equal(match.status, 'MATCH');
    const drift = judgeLanguage(row, {
      listing: { language: 'sv-SE', title: 'Other', shortDescription: 'Kort', fullDescription: 'Lång' },
      counts: { phoneScreenshots: 2, featureGraphic: 1 },
    });
    assert.equal(drift.status, 'DRIFT');
    assert.deepEqual(drift.differingFields, ['title']);
  });

  it('marks a missing direct listing as MISSING and a forbidden read as UNKNOWN', () => {
    const row = {
      appLocale: 'de-DE',
      googleLocale: 'de-DE',
      mapping: 'direct',
      fallback: null,
      brand: 'Brand',
      expected: { title: 'Brand', shortDescription: 'Kurz', fullDescription: 'Lang' },
      screenshotExpectation: { status: 'present', files: ['a.png'], featureGraphic: 'feature.png' },
    };
    assert.equal(judgeLanguage(row, { listing: null }).status, 'MISSING');
    assert.equal(judgeLanguage(row, { textForbidden: true }).status, 'UNKNOWN');
    assert.equal(judgeScreenshots({ status: 'present', files: ['a.png'], featureGraphic: 'f.png' }, { phoneScreenshots: 1, featureGraphic: 1 }, false), 'MATCH');
  });

  it('reports Finland when it is open and does not ask for a change', () => {
    const markets = judgeMarkets(['CA', 'IE', 'SE'], ['CA', 'FI', 'IE', 'SE'], false);
    assert.equal(markets.status, 'DRIFT');
    assert.equal(markets.fiObserved, 'present');
    assert.equal(markets.fiStoreAvailability, 'KEEP_OPEN');
    assert.equal(markets.action, 'none');
    const worldwide = judgeMarkets(['CA', 'IE', 'SE'], ['CA', 'IE', 'SE'], false, { includeRestOfWorld: true });
    assert.equal(worldwide.status, 'DRIFT');
    assert.equal(worldwide.fiObserved, 'present');
    assert.equal(worldwide.action, 'none');
  });

  it('treats an unreadable screenshot response as UNKNOWN', () => {
    assert.equal(
      judgeScreenshots({ status: 'live_external' }, { phoneScreenshots: 0, featureGraphic: 0 }, true),
      'UNKNOWN'
    );
  });

  it('strips key material from the report', () => {
    const clean = redactValue({
      private_key: 'secret-key',
      note: 'Bearer ya29.not-a-real-token',
      nested: { access_token: 'tok' },
    });
    assert.equal(clean.private_key, '[redacted]');
    assert.equal(clean.nested.access_token, '[redacted]');
    assert.equal(clean.note.includes('ya29'), false);
  });
});

describe('Play audit workflow', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/play-live-audit.yml'), 'utf8');

  it('runs only when someone starts it and cannot publish', () => {
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /\n\s*push:/);
    assert.doesNotMatch(workflow, /pull_request/);
    assert.doesNotMatch(workflow, /schedule:/);
    assert.match(workflow, /permissions:\n {2}contents: read\n/);
    assert.match(workflow, /secrets\.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
    assert.match(workflow, /persist-credentials: false/);
    assert.match(workflow, /if: always\(\)/);
    assert.doesNotMatch(workflow, /:commit|edits\.commit|pricing|availability/);
    assert.doesNotMatch(workflow, /private_key|BEGIN PRIVATE/);
  });
});

describe('Play audit run', () => {
  it('reads listings, records a 403 path, deletes the edit, and never commits', async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ method: options.method, url });
      if (options.method === 'POST' && url.endsWith('/edits')) return jsonResponse(200, { id: 'edit-1' });
      if (options.method === 'GET' && url.endsWith('/listings')) {
        return jsonResponse(403, { error: { code: 403 } });
      }
      if (options.method === 'DELETE') return jsonResponse(200, {});
      return jsonResponse(500, {});
    };
    const report = await runPlayLiveAudit({
      packageName: PACKAGE_NAME,
      token: 'test-token',
      fetchImpl,
      plan: [{
        appLocale: 'sv-SE',
        googleLocale: 'sv-SE',
        mapping: 'direct',
        fallback: null,
        brand: 'Brand',
        expected: { title: 'Brand', shortDescription: 'Kort', fullDescription: 'Lång' },
        screenshotExpectation: { status: 'live_external' },
      }],
      repoLive: ['CA', 'IE', 'SE'],
    });
    assert.equal(report.auth, 'OK');
    assert.equal(report.edit.created, true);
    assert.equal(report.edit.committed, false);
    assert.equal(report.edit.deleted, true);
    assert.equal(report.languages[0].status, 'UNKNOWN');
    assert.equal(report.fiStoreAvailability, 'KEEP_OPEN');
    assert.deepEqual(report.forbidden, [{
      method: 'GET',
      path: `/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/edit-1/listings`,
      status: 403,
    }]);
    assert.equal(calls.some((call) => call.url.includes('commit')), false);
    assert.equal(calls.some((call) => call.method === 'DELETE'), true);
    assert.equal(JSON.stringify(report).includes('test-token'), false);
  });

  it('compares a readable listing without uploading', async () => {
    const fetchImpl = async (url, options) => {
      if (options.method === 'POST') return jsonResponse(200, { id: 'edit-2' });
      if (url.endsWith('/listings')) {
        return jsonResponse(200, {
          listings: [{ language: 'en-GB', title: 'Brand', shortDescription: 'Short', fullDescription: 'Long' }],
        });
      }
      if (url.endsWith('/phoneScreenshots')) return jsonResponse(200, { images: [{ id: 'p1' }] });
      if (url.endsWith('/featureGraphic')) return jsonResponse(200, { images: [{ id: 'f1' }] });
      if (url.endsWith('/countryAvailability')) {
        return jsonResponse(200, { countries: [{ countryCode: 'se' }, { countryCode: 'ie' }, { countryCode: 'ca' }] });
      }
      if (options.method === 'DELETE') return jsonResponse(200, {});
      return jsonResponse(404, {});
    };
    const report = await runPlayLiveAudit({
      packageName: PACKAGE_NAME,
      token: 'test-token',
      fetchImpl,
      plan: [{
        appLocale: 'ga-IE',
        googleLocale: 'en-GB',
        mapping: 'fallback',
        fallback: 'en-GB',
        brand: 'Brand',
        expected: { title: '{{brand}}', shortDescription: 'Short', fullDescription: 'Long' },
        screenshotExpectation: { status: 'live_external' },
      }],
      repoLive: ['CA', 'IE', 'SE'],
    });
    assert.equal(report.languages[0].status, 'MATCH');
    assert.equal(report.languages[0].mapping, 'fallback');
    assert.equal(report.markets.status, 'MATCH');
    assert.equal(report.markets.fiObserved, 'absent');
    assert.equal(report.markets.action, 'none');
    assert.equal(report.writes.commit, false);
  });
});
