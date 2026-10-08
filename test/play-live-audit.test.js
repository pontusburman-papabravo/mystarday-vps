'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  RELEASE_TRACK,
  classifyPlayRequest,
  createPlayReader,
} = require('../src/lib/play-publisher-read');
const {
  PACKAGE_NAME,
  SCREENSHOT_COMPARISON,
  SYNC_WITH_RELEASE,
  finishReport,
  finlandKeptOpen,
  judgeLanguage,
  judgeMarkets,
  judgeScreenshotSet,
  judgeScreenshots,
  languagePlan,
  phoneDimensionProblem,
  readTrackCountryAvailability,
  renderAuditMarkdown,
  runPlayLiveAudit,
  redactValue,
  storeContentReady,
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
    assert.equal(classifyPlayRequest('GET', `${base}/edits/edit-1/countryAvailability/${RELEASE_TRACK}`), 'countries');
    assert.equal(classifyPlayRequest('GET', `${base}/edits/edit-1/countryAvailability`), null);
    assert.equal(classifyPlayRequest('PUT', `${base}/edits/edit-1/countryAvailability/${RELEASE_TRACK}`), null);
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
    assert.equal(match.text, 'MATCH');
    assert.equal(match.screenshots, 'COUNT_MATCH');
    assert.equal(match.status, 'COUNT_MATCH');
    assert.notEqual(match.screenshots, 'MATCH');
    assert.equal(match.screenshotComparison, 'count');
    assert.equal(match.fields.title.live, 'Brand');
    assert.equal(match.fields.title.expected, 'Brand');
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
    const missing = judgeLanguage(row, { listing: null });
    assert.equal(missing.status, 'MISSING');
    assert.equal(missing.screenshots, 'MISSING');
    assert.equal(judgeLanguage(row, { textForbidden: true }).status, 'UNKNOWN');
    assert.equal(judgeScreenshots({ status: 'present', files: ['a.png'], featureGraphic: 'f.png' }, { phoneScreenshots: 1, featureGraphic: 1 }, false), 'COUNT_MATCH');
    assert.notEqual(judgeScreenshots({ status: 'live_external' }, { phoneScreenshots: 1, featureGraphic: 1 }, false), 'MATCH');
  });

  it('reports Finland when it is open and does not ask for a change', () => {
    const markets = judgeMarkets(['CA', 'IE', 'SE'], ['CA', 'FI', 'IE', 'SE'], false);
    assert.equal(markets.status, 'DRIFT');
    assert.equal(markets.fiObserved, 'present');
    assert.equal(markets.fiStoreAvailability, 'KEEP_OPEN');
    assert.equal(markets.action, 'none');
    const worldwide = judgeMarkets(['CA', 'IE', 'SE'], ['CA', 'IE', 'SE'], false, { restOfWorld: true });
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
    assert.match(workflow, /play-live-audit\.md/);
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
    assert.equal(report.languages[0].screenshotComparison, 'unavailable');
    assert.equal(report.listingContentReady, false);
    assert.equal(report.fiStoreAvailability, 'KEEP_OPEN');
    assert.equal(report.markets.status, 'UNKNOWN');
    assert.equal(report.markets.fiObserved, 'UNKNOWN');
    assert.equal(report.markets.restOfWorld, null);
    assert.equal(report.writes.availabilityChange, false);
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
      if (url.endsWith(`/countryAvailability/${RELEASE_TRACK}`)) {
        return jsonResponse(200, {
          [SYNC_WITH_RELEASE]: false,
          countries: [{ countryCode: 'se' }, { countryCode: 'ie' }, { countryCode: 'ca' }],
          restOfWorld: false,
        });
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
    assert.equal(report.languages[0].text, 'MATCH');
    assert.equal(report.languages[0].screenshots, 'COUNT_MATCH');
    assert.equal(report.languages[0].status, 'COUNT_MATCH');
    assert.equal(report.languages[0].mapping, 'fallback');
    assert.equal(report.languages[0].recommendation.action, 'keep-fallback');
    assert.equal(report.markets.status, 'MATCH');
    assert.equal(report.markets.restOfWorld, false);
    assert.equal(report.markets[SYNC_WITH_RELEASE], false);
    assert.equal(report.markets.fiObserved, 'absent');
    assert.equal(report.markets.action, 'none');
    assert.equal(report.writes.commit, false);
    assert.equal(report.writes.listingUpdate, false);
    assert.equal(report.writes.imageUpload, false);
    assert.equal(report.writes.availabilityChange, false);
    assert.equal(report.writes.pricing, false);
    assert.equal(report.screenshotComparison, SCREENSHOT_COMPARISON);
    assert.match(report.screenshotComparisonNote, /never reported as MATCH/);
    assert.equal(report.listingContentReady, false);
    assert.match(renderAuditMarkdown(report), /inte klart/);
  });
});

describe('Play release-track country availability', () => {
  const repoLive = ['CA', 'IE', 'SE'];

  function auditCountries(status, body) {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ method: options.method, url, body: options.body || null });
      if (options.method === 'POST' && url.endsWith('/edits')) return jsonResponse(200, { id: 'edit-9' });
      if (options.method === 'GET' && url.endsWith('/listings')) return jsonResponse(200, { listings: [] });
      if (options.method === 'GET' && url.endsWith(`/countryAvailability/${RELEASE_TRACK}`)) {
        return jsonResponse(status, body);
      }
      if (options.method === 'DELETE') return jsonResponse(200, {});
      return jsonResponse(500, { error: { code: 500 } });
    };
    return runPlayLiveAudit({
      packageName: PACKAGE_NAME,
      token: 'test-token',
      fetchImpl,
      plan: [],
      repoLive,
    }).then((report) => ({ report, calls }));
  }

  function assertReadOnly(calls, report) {
    assert.equal(calls.some((call) => call.url.endsWith(`/countryAvailability/${RELEASE_TRACK}`)), true);
    assert.equal(calls.some((call) => call.url.endsWith('/countryAvailability')), false);
    assert.equal(calls.some((call) => call.method === 'PUT' || call.method === 'PATCH'), false);
    assert.equal(calls.some((call) => call.url.includes('commit')), false);
    assert.equal(report.writes.availabilityChange, false);
    assert.equal(report.markets.action, 'none');
    assert.equal(report.fiStoreAvailability, 'KEEP_OPEN');
    assert.equal(report.edit.committed, false);
  }

  it('reads an explicit country list', async () => {
    const { report, calls } = await auditCountries(200, {
      [SYNC_WITH_RELEASE]: false,
      countries: [{ countryCode: 'CA' }, { countryCode: 'IE' }, { countryCode: 'SE' }],
      restOfWorld: false,
    });
    assertReadOnly(calls, report);
    assert.equal(report.markets.status, 'MATCH');
    assert.equal(report.markets.restOfWorld, false);
    assert.equal(report.markets[SYNC_WITH_RELEASE], false);
    assert.equal(report.markets.fiObserved, 'absent');
    assert.deepEqual(report.markets.observed, ['CA', 'IE', 'SE']);
  });

  it('treats restOfWorld as open, including Finland, and ignores includeRestOfWorld', async () => {
    const parsed = readTrackCountryAvailability({
      [SYNC_WITH_RELEASE]: false,
      countries: [{ countryCode: 'CA' }, { countryCode: 'IE' }, { countryCode: 'SE' }],
      restOfWorld: false,
      includeRestOfWorld: true,
    });
    assert.equal(parsed.restOfWorld, false);
    const { report, calls } = await auditCountries(200, {
      [SYNC_WITH_RELEASE]: true,
      countries: [{ countryCode: 'CA' }, { countryCode: 'IE' }, { countryCode: 'SE' }],
      restOfWorld: true,
    });
    assertReadOnly(calls, report);
    assert.equal(report.markets.status, 'DRIFT');
    assert.equal(report.markets.restOfWorld, true);
    assert.equal(report.markets[SYNC_WITH_RELEASE], true);
    assert.equal(report.markets.fiObserved, 'present');
  });

  it('reports Finland when the release track lists it and does not change availability', async () => {
    const { report, calls } = await auditCountries(200, {
      [SYNC_WITH_RELEASE]: true,
      countries: [
        { countryCode: 'CA' },
        { countryCode: 'FI' },
        { countryCode: 'IE' },
        { countryCode: 'SE' },
      ],
      restOfWorld: false,
    });
    assertReadOnly(calls, report);
    assert.equal(report.markets.status, 'DRIFT');
    assert.equal(report.markets.fiObserved, 'present');
    assert.equal(report.markets.restOfWorld, false);
    assert.equal(report.markets[SYNC_WITH_RELEASE], true);
    assert.deepEqual(report.markets.observed, ['CA', 'FI', 'IE', 'SE']);
  });

  it('keeps a forbidden or failed country read unknown instead of closed', async () => {
    const forbidden = await auditCountries(403, { error: { code: 403, message: 'The caller does not have permission' } });
    assertReadOnly(forbidden.calls, forbidden.report);
    assert.equal(forbidden.report.markets.status, 'UNKNOWN');
    assert.equal(forbidden.report.markets.fiObserved, 'UNKNOWN');
    assert.equal(forbidden.report.markets.observed, null);
    assert.equal(forbidden.report.markets.restOfWorld, null);
    assert.equal(forbidden.report.markets[SYNC_WITH_RELEASE], null);
    assert.deepEqual(forbidden.report.forbidden.at(-1), {
      method: 'GET',
      path: `/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/edit-9/countryAvailability/${RELEASE_TRACK}`,
      status: 403,
    });

    const failed = await auditCountries(500, { error: { code: 500 } });
    assertReadOnly(failed.calls, failed.report);
    assert.equal(failed.report.markets.status, 'UNKNOWN');
    assert.equal(failed.report.markets.fiObserved, 'UNKNOWN');
    assert.equal(failed.report.markets.restOfWorld, null);
    assert.equal(failed.report.forbidden.length, 0);

    const empty = await auditCountries(200, null);
    assert.equal(empty.report.markets.status, 'UNKNOWN');
    assert.equal(empty.report.markets.fiObserved, 'UNKNOWN');
    assert.equal(empty.report.markets.restOfWorld, null);

    assert.equal(readTrackCountryAvailability(null), null);
    assert.equal(readTrackCountryAvailability({}), null);
    const blank = await auditCountries(200, {});
    assert.equal(blank.report.markets.status, 'UNKNOWN');
    assert.equal(blank.report.markets.fiObserved, 'UNKNOWN');
    assert.equal(blank.report.markets.restOfWorld, null);
    assert.equal(blank.report.markets.action, 'none');
  });
});

describe('Play screenshot bytes and launch classification', () => {
  it('compares SHA-256 when Play returns a hash for every image', () => {
    const hash = 'a'.repeat(64);
    const other = 'b'.repeat(64);
    const expectation = { status: 'present', files: ['phone.png'], featureGraphic: 'feature.png' };
    const localFacts = {
      phoneHashes: [hash],
      featureHashes: [hash],
      problems: [],
      dimensions: 'OK',
    };
    const counts = {
      phoneScreenshots: 1,
      featureGraphic: 1,
      phoneSha256: [hash],
      featureSha256: [hash],
      sha256Complete: true,
    };
    assert.equal(judgeScreenshotSet({ expectation, counts, unreadable: false, localFacts }).status, 'CONTENT_MATCH');
    assert.equal(judgeScreenshotSet({
      expectation,
      counts: { ...counts, phoneSha256: [other] },
      unreadable: false,
      localFacts,
    }).status, 'CONTENT_DRIFT');
    const counted = judgeScreenshotSet({
      expectation,
      counts: { phoneScreenshots: 1, featureGraphic: 1 },
      unreadable: false,
      localFacts,
    });
    assert.equal(counted.status, 'COUNT_MATCH');
    assert.equal(counted.comparison, 'count');
    assert.notEqual(counted.status, 'MATCH');
  });

  it('reports a too-narrow phone image separately from a byte match', () => {
    assert.equal(phoneDimensionProblem(780, 1688), 'aspect-over-2-to-1');
    assert.equal(phoneDimensionProblem(1080, 1920), null);
    const hash = 'c'.repeat(64);
    const shot = judgeScreenshotSet({
      expectation: { status: 'present', files: ['phone.png'], featureGraphic: 'feature.png' },
      counts: {
        phoneScreenshots: 1,
        featureGraphic: 1,
        phoneSha256: [hash],
        featureSha256: [hash],
        sha256Complete: true,
      },
      unreadable: false,
      localFacts: {
        phoneHashes: [hash],
        featureHashes: [hash],
        problems: [{ file: 'phone.png', problem: 'aspect-over-2-to-1', width: 780, height: 1688 }],
        dimensions: 'INVALID',
      },
    });
    assert.equal(shot.status, 'CONTENT_MATCH');
    assert.equal(shot.dimensions, 'INVALID');
    const row = judgeLanguage({
      appLocale: 'bg-BG',
      appAvailability: 'public',
      googleLocale: 'bg',
      mapping: 'direct',
      fallback: null,
      brand: 'Brand',
      expected: { title: 'Brand', shortDescription: 'Kort', fullDescription: 'Lång' },
      screenshotExpectation: { status: 'present', files: ['missing-phone.png'], featureGraphic: 'missing-feature.png' },
    }, { listing: null });
    assert.equal(row.status, 'MISSING');
    assert.equal(row.screenshotDimensions, 'INVALID');
    assert.equal(row.recommendation.action, 'do-not-publish');
  });

  it('keeps Finland open and does not call the store ready when copy drifts', () => {
    const markets = judgeMarkets(['CA', 'IE', 'SE'], ['CA', 'FI', 'IE', 'SE'], false, { restOfWorld: false, syncWithRelease: false });
    assert.equal(finlandKeptOpen(markets), true);
    const report = finishReport({
      auth: 'OK',
      fiStoreAvailability: 'KEEP_OPEN',
      forbidden: [],
      markets,
      languages: [{
        appLocale: 'sv-SE',
        googleLocale: 'sv-SE',
        mapping: 'direct',
        appAvailability: 'public',
        status: 'DRIFT',
        text: 'DRIFT',
        screenshots: 'COUNT_MATCH',
        screenshotDimensions: 'UNKNOWN',
        differingFields: ['shortDescription'],
        fields: {
          shortDescription: { live: 'hela familjen', expected: 'familjen' },
        },
        recommendation: { action: 'review', reason: 'Do not overwrite.' },
      }],
    });
    assert.equal(report.markets.acceptedDifference, true);
    assert.equal(report.markets.action, 'none');
    assert.equal(report.listingContentReady, false);
    assert.equal(storeContentReady(report), false);
    assert.equal(report.launchPlan[0].group, 'already-listed');
    assert.equal(report.launchPlan[0].publish, false);
    const markdown = renderAuditMarkdown(report);
    assert.match(markdown, /inte klart/);
    assert.match(markdown, /Lämna Finland öppet/);
    assert.match(markdown, /hela familjen/);
    assert.match(markdown, /Skrivningar: inga/);
  });

  it('classifies missing Play languages without publishing them', () => {
    const plan = languagePlan();
    const judged = (id) => judgeLanguage(plan.find((row) => row.appLocale === id), { listing: null });
    const finnish = judged('fi-FI');
    const french = judged('fr-FR');
    const norwegian = judged('nb-NO');
    const irish = judged('ga-IE');
    const maltese = judged('mt-MT');
    const icelandic = judged('is-IS');
    const bulgarian = judged('bg-BG');
    const english = plan.find((row) => row.appLocale === 'en-GB');
    const swedish = plan.find((row) => row.appLocale === 'sv-SE');
    assert.equal(english.expected.title, 'My Starday');
    assert.match(swedish.expected.shortDescription, /hela familjen/);
    assert.equal(irish.mapping, 'fallback');
    assert.equal(irish.recommendation.action, 'keep-fallback');
    assert.equal(maltese.recommendation.action, 'keep-fallback');
    assert.equal(icelandic.appAvailability, 'registered');
    assert.equal(icelandic.recommendation.action, 'do-not-publish');
    assert.equal(finnish.screenshotDimensions, 'OK');
    assert.equal(finnish.recommendation.action, 'do-not-publish-yet');
    assert.equal(bulgarian.screenshotDimensions, 'INVALID');
    assert.equal(bulgarian.recommendation.action, 'do-not-publish');
    const report = finishReport({
      auth: 'OK',
      fiStoreAvailability: 'KEEP_OPEN',
      forbidden: [],
      markets: judgeMarkets(['CA', 'IE', 'SE'], ['CA', 'FI', 'IE', 'SE'], false),
      languages: [finnish, french, norwegian, irish, icelandic, bulgarian],
    });
    const group = Object.fromEntries(report.launchPlan.map((item) => [item.appLocale, item.group]));
    assert.equal(group['fi-FI'], 'approve-first');
    assert.equal(group['fr-FR'], 'approve-next');
    assert.equal(group['nb-NO'], 'prepare-only');
    assert.equal(group['ga-IE'], 'fallback');
    assert.equal(group['is-IS'], 'hidden');
    assert.equal(group['bg-BG'], 'blocked-dimensions');
    assert.equal(report.launchPlan.every((item) => item.publish === false), true);
    assert.equal(report.listingContentReady, false);
  });
});
