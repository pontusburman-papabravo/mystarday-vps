'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PACKAGE_NAME, languagePlan } = require('../src/lib/play-live-audit');
const { pngSize } = require('../src/lib/locale-readiness');
const { brandName } = require('../src/lib/public-html-placeholders');
const { RELEASE_TRACK, classifyPlayRequest } = require('../src/lib/play-publisher-read');
const {
  REVIEW_BEHAVIOR,
  classifyPlayWrite,
  createPlayWriter,
} = require('../src/lib/play-publisher-write');
const {
  CONFIRMATION,
  buildPlan,
  countrySnapshot,
  renderPlanMarkdown,
  reviewersApproved,
  runPlayStorePublish,
} = require('../src/lib/play-store-plan');

function jsonResponse(status, body) {
  return {
    status,
    async text() {
      return body == null ? '' : JSON.stringify(body);
    },
    async json() {
      return body;
    },
  };
}

function swedishRow() {
  return {
    appLocale: 'sv-SE',
    googleLocale: 'sv-SE',
    mapping: 'direct',
    brand: 'Brand',
    expected: { title: 'Brand', shortDescription: 'Kort', fullDescription: 'Lang' },
    screenshotExpectation: { status: 'live_external' },
  };
}

function countriesBody() {
  return {
    countries: [{ countryCode: 'SE' }, { countryCode: 'FI' }, { countryCode: 'IE' }, { countryCode: 'CA' }],
    restOfWorld: false,
  };
}

function listing() {
  return {
    language: 'sv-SE',
    title: 'Other',
    shortDescription: 'Kort',
    fullDescription: 'Lang',
    video: 'https://example.com/v',
  };
}

function playFetch(commit) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ method: options.method, url, body: options.body || null });
    if (url.includes('api.github.com')) {
      return jsonResponse(200, [{ state: 'approved', environments: [{ name: 'store-publishing' }] }]);
    }
    if (options.method === 'POST' && url.endsWith('/edits')) return jsonResponse(200, { id: 'edit-1' });
    if (options.method === 'GET' && url.endsWith('/listings')) return jsonResponse(200, { listings: [listing()] });
    if (options.method === 'GET' && (url.endsWith('/phoneScreenshots') || url.endsWith('/featureGraphic'))) {
      return jsonResponse(200, { images: [] });
    }
    if (url.includes('/countryAvailability/')) return jsonResponse(200, countriesBody());
    if (options.method === 'PUT') return jsonResponse(200, { language: 'sv-SE' });
    if (options.method === 'DELETE') return jsonResponse(200, {});
    if (url.includes(':commit')) return jsonResponse(commit ? commit.status : 200, commit ? commit.body : { id: 'edit-1' });
    return jsonResponse(404, {});
  };
  return { calls, fetchImpl };
}

function applyInput(fetchImpl, planSha256, extra = {}) {
  return {
    mode: 'apply',
    confirmation: CONFIRMATION,
    planSha256,
    locales: 'sv-SE',
    ref: 'refs/heads/main',
    repo: 'octo/repo',
    runId: '123',
    githubToken: 'gh-token',
    playToken: 'play-token',
    fetchImpl,
    rows: [swedishRow()],
    ...extra,
  };
}

function readCountries() {
  return {
    status: 'READ',
    observed: ['CA', 'FI', 'IE', 'SE'],
    restOfWorld: false,
    fiObserved: 'present',
  };
}

describe('Play write allowlist', () => {
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}`;

  it('blocks price, track, country, and binary writes, and commits only with the review guard', () => {
    const closed = {};
    const commit = `${base}/edits/edit-1:commit?changesInReviewBehavior=${REVIEW_BEHAVIOR}`;
    assert.equal(classifyPlayWrite('PUT', `${base}/edits/edit-1/countryAvailability/${RELEASE_TRACK}`, { allowMutation: true }), null);
    assert.equal(classifyPlayWrite('POST', `${base}/edits/edit-1/tracks`, { allowMutation: true }), null);
    assert.equal(classifyPlayWrite('POST', `${base}/edits/edit-1/bundles`, { allowMutation: true }), null);
    assert.equal(classifyPlayWrite('POST', `${base}/inappproducts`, { allowMutation: true }), null);
    assert.equal(classifyPlayWrite('PUT', `${base}/edits/edit-1/listings/sv-SE`, closed), null);
    assert.equal(classifyPlayWrite('POST', commit, closed), null);
    assert.equal(classifyPlayWrite('POST', `${commit}&changesNotSentForReview=true`, { allowCommit: true }), null);
    assert.equal(classifyPlayWrite('POST', `${base}/edits/edit-1:commit?changesInReviewBehavior=CANCEL_IN_REVIEW_AND_SUBMIT`, { allowCommit: true }), null);
    assert.equal(classifyPlayWrite('POST', commit, { allowCommit: true }), 'edit-commit');
    assert.equal(classifyPlayWrite('GET', `${base}/edits/edit-1/countryAvailability/${RELEASE_TRACK}`, closed), 'countries-read');
    assert.equal(classifyPlayRequest('PUT', `${base}/edits/edit-1/listings/sv-SE`), null);
    assert.equal(classifyPlayRequest('POST', commit), null);
  });

  it('refuses a listing update or commit before the apply gates are open', async () => {
    let called = 0;
    const writer = createPlayWriter({
      packageName: PACKAGE_NAME,
      token: 'play-token',
      fetchImpl: async () => {
        called += 1;
        return jsonResponse(200, {});
      },
    });
    await assert.rejects(
      async () => writer.updateListing('edit-1', 'sv-SE', { title: 'Brand', shortDescription: 'Kort', fullDescription: 'Lang' }),
      (error) => error.message === 'APPLY_BLOCKED'
    );
    await assert.rejects(async () => writer.commitEdit('edit-1'), (error) => error.message === 'APPLY_BLOCKED');
    assert.equal(called, 0);
  });
});

describe('Play store plan', () => {
  it('keeps an empty or forbidden country read unknown', () => {
    assert.equal(countrySnapshot({ ok: true, body: {} }).status, 'UNKNOWN');
    assert.equal(countrySnapshot({ ok: false, status: 403, body: null }).fiObserved, 'UNKNOWN');
    assert.equal(countrySnapshot({ ok: true, body: null }).status, 'UNKNOWN');
  });

  it('publishes nothing until a locale is named, and keeps Swedish and English out of that plan', () => {
    const rows = languagePlan(undefined, 'Brand');
    const countries = readCountries();
    const open = buildPlan({
      rows,
      listings: new Map(),
      images: new Map(),
      countries,
    });
    assert.equal(open.applyAllowed, false);
    assert.equal(open.blockReason, 'scope-required');
    assert.equal(open.changes.length, 0);
    assert.equal(open.blocked.length, 0);
    assert.deepEqual(open.candidates.map((item) => item.locale), ['fi-FI', 'fr-FR']);
    assert.equal(open.candidates.every((item) => item.publish === false), true);
    assert.equal(open.protectedLocales.length, 0);

    const liveSwedish = new Map([['sv-SE', listing()]]);
    const protectedPlan = buildPlan({ rows, listings: liveSwedish, images: new Map(), countries });
    assert.equal(protectedPlan.changes.some((item) => item.locale === 'sv-SE'), false);
    assert.equal(protectedPlan.protectedLocales.some((item) => item.locale === 'sv-SE' && item.publish === false), true);
    assert.equal(protectedPlan.digest, buildPlan({
      rows,
      listings: new Map([['sv-SE', { ...listing(), title: 'Annat' }]]),
      images: new Map(),
      countries,
    }).digest);

    const named = buildPlan({
      rows: [swedishRow()],
      listings: liveSwedish,
      images: new Map(),
      countries,
      localesFilter: 'sv-SE',
    });
    assert.equal(named.changes.some((item) => item.field === 'title' && item.risk === 'replaces-live-text'), true);
    assert.match(renderPlanMarkdown({ status: 'DRY_RUN', plan: named, livePublicationVerified: false }), /ersätter svensk eller engelsk text/);
  });

  it('lets an explicit fi-FI plan ignore missing languages, and refuses invalid screenshots', () => {
    const rows = languagePlan(undefined, 'Brand');
    const countries = readCountries();
    const finnish = buildPlan({
      rows,
      listings: new Map(),
      images: new Map(),
      countries,
      localesFilter: 'fi-FI',
    });
    assert.equal(finnish.applyAllowed, true);
    assert.equal(finnish.blockReason, null);
    assert.equal(finnish.changes.some((item) => item.locale === 'fi-FI' && item.kind === 'text' && item.risk === 'new-listing'), true);
    assert.equal(finnish.changes.every((item) => item.locale === 'fi-FI'), true);
    assert.equal(finnish.blocked.some((item) => item.locale === 'de-DE' || item.locale === 'bg-BG'), false);
    assert.equal(finnish.candidates.some((item) => item.locale === 'fr-FR' && item.publish === false), true);
    assert.equal(finnish.digest, buildPlan({
      rows,
      listings: new Map([['de-DE', { language: 'de-DE', title: 'X', shortDescription: 'Y', fullDescription: 'Z', video: '' }]]),
      images: new Map(),
      countries,
      localesFilter: 'fi-FI',
    }).digest);

    const blocked = buildPlan({ rows, listings: new Map(), images: new Map(), countries, localesFilter: 'bg-BG,ga-IE,is-IS' });
    assert.equal(blocked.applyAllowed, false);
    assert.equal(blocked.changes.length, 0);
    assert.equal(blocked.blocked.some((item) => item.locale === 'bg-BG' && item.reason === 'bad-dimensions'), true);
    assert.equal(blocked.blocked.some((item) => item.locale === 'ga-IE' && item.reason === 'fallback'), true);
    assert.equal(blocked.blocked.some((item) => item.locale === 'is-IS' && item.reason === 'hidden'), true);
    assert.equal(blocked.blocked.some((item) => item.locale === 'fi-FI'), false);
  });

  it('publishes Finnish Play copy as My Starday and leaves live listings alone', () => {
    const root = path.join(__dirname, '..');
    const listing = JSON.parse(fs.readFileSync(path.join(root, 'store/google/fi-FI/listing.json'), 'utf8'));
    const swedish = JSON.parse(fs.readFileSync(path.join(root, 'store/google/sv-SE/listing.json'), 'utf8'));
    const english = JSON.parse(fs.readFileSync(path.join(root, 'store/google/en-GB/listing.json'), 'utf8'));
    const iap = JSON.parse(fs.readFileSync(path.join(root, 'store/iap.json'), 'utf8'));
    const markets = JSON.parse(fs.readFileSync(path.join(root, 'store/markets.json'), 'utf8'));
    const swedishBrand = brandName();

    assert.equal(listing.name, 'My Starday');
    assert.notEqual(listing.name, swedishBrand);
    assert.equal([...listing.shortDescription].length <= 80, true);
    assert.match(listing.shortDescription, /Visuaaliset rutiinit/);
    assert.equal(listing.fullDescription.includes('mahdollisiin askeliin'), false);
    assert.equal(listing.fullDescription.includes('yksi perhekalenteri lisää'), false);
    assert.equal(listing.fullDescription.includes(swedishBrand), false);
    assert.equal((listing.fullDescription.match(/ADHD/g) || []).length, 2);
    assert.equal((listing.fullDescription.match(/autism/g) || []).length, 2);
    assert.match(listing.fullDescription, /Diagnoosia ei tarvita/);
    assert.match(listing.fullDescription, /ei hoida ADHD:ta eikä autismia/);
    assert.match(listing.fullDescription, /tähtiaarteessa/);
    assert.match(listing.fullDescription, /PIN-koodilla/);
    assert.match(swedish.shortDescription, /hela familjen/);
    assert.equal(english.name, 'My Starday');
    const monthly = iap.products.find((product) => product.id === 'premium_monthly');
    assert.equal(monthly.google['fi-FI'].name, 'Premium kuukausittain');
    assert.equal(monthly.google['sv-SE'].name, 'Premium månadsvis');
    assert.equal(monthly.google['en-GB'].name, 'Premium monthly');
    const finland = markets.markets.find((market) => market.id === 'FI');
    assert.deepEqual(finland.appLocales, ['fi-FI', 'sv-SE']);

    const phone = pngSize(path.join(root, 'store/screenshots/google/fi-FI/01-hem.png'));
    const rewards = pngSize(path.join(root, 'store/screenshots/google/fi-FI/02-familj.png'));
    const feature = pngSize(path.join(root, 'store/screenshots/google/fi-FI/feature.png'));
    assert.deepEqual(phone, { width: 1080, height: 1920 });
    assert.deepEqual(rewards, { width: 1080, height: 1920 });
    assert.deepEqual(feature, { width: 1024, height: 500 });

    const rows = languagePlan();
    const finnish = buildPlan({
      rows,
      listings: new Map([
        ['sv-SE', { language: 'sv-SE', title: swedishBrand, shortDescription: 'Live', fullDescription: 'Live', video: '' }],
        ['en-GB', { language: 'en-GB', title: 'My Starday', shortDescription: 'Live', fullDescription: 'Live', video: '' }],
      ]),
      images: new Map(),
      countries: readCountries(),
      localesFilter: 'fi-FI',
    });
    assert.equal(finnish.changes.every((item) => item.locale === 'fi-FI'), true);
    assert.equal(finnish.changes.some((item) => item.locale === 'sv-SE' || item.locale === 'en-GB'), false);
    assert.deepEqual(finnish.protectedLocales.map((item) => item.locale), ['en-GB', 'sv-SE']);
    assert.equal(finnish.changes.find((item) => item.field === 'title').to, 'My Starday');
    assert.equal(finnish.changes.find((item) => item.field === 'fullDescription').to.includes(swedishBrand), false);
    assert.equal(finnish.countries.observed.includes('FI'), true);
    assert.equal(finnish.countries.restOfWorld, false);
  });

  it('reads a dry-run and deletes the edit without writing', async () => {
    const { calls, fetchImpl } = playFetch();
    const report = await runPlayStorePublish({
      mode: 'dry-run',
      playToken: 'play-token',
      fetchImpl,
      locales: 'sv-SE',
      rows: [swedishRow()],
    });
    assert.equal(report.status, 'DRY_RUN');
    assert.equal(report.published, false);
    assert.equal(report.livePublicationVerified, false);
    assert.equal(report.committed, false);
    assert.equal(report.edit.deleted, true);
    assert.equal(report.plan.changes.some((change) => change.field === 'title' && change.from === 'Other' && change.to === 'Brand'), true);
    assert.equal(report.plan.countries.fiObserved, 'present');
    assert.equal(calls.some((call) => call.method === 'PUT' || call.method === 'PATCH'), false);
    assert.equal(calls.some((call) => call.url.includes(':commit') || call.url.includes('/upload/')), false);
    assert.equal(calls.some((call) => call.method === 'DELETE' && call.url.endsWith('/edits/edit-1')), true);
    assert.equal(calls.some((call) => call.url.includes('api.github.com')), false);
    assert.match(renderPlanMarkdown(report), /Inget har publicerats/);
    assert.match(renderPlanMarkdown(report), /Finland lämnas/);
    assert.equal(JSON.stringify(report).includes('play-token'), false);
  });

  it('blocks apply without confirmation, reviewers, or the approved digest', async () => {
    const denied = playFetch();
    const confirmation = await runPlayStorePublish(applyInput(denied.fetchImpl, 'abc', { confirmation: 'no' }));
    assert.equal(confirmation.status, 'APPLY_BLOCKED');
    assert.equal(confirmation.blockReason, 'confirmation');
    assert.equal(denied.calls.length, 0);

    const ref = await runPlayStorePublish(applyInput(playFetch().fetchImpl, 'abc', { ref: 'refs/heads/other' }));
    assert.equal(ref.blockReason, 'ref');

    const unverified = playFetch();
    unverified.fetchImpl = async (url, options = {}) => {
      unverified.calls.push({ method: options.method, url });
      if (url.includes('api.github.com')) return jsonResponse(403, {});
      return jsonResponse(500, {});
    };
    const reviewers = await runPlayStorePublish(applyInput(unverified.fetchImpl, 'abc'));
    assert.equal(reviewers.blockReason, 'reviewers-unverified');
    assert.equal(reviewers.published, false);
    assert.equal(unverified.calls.some((call) => call.url.includes('androidpublisher')), false);

    const stale = playFetch();
    const mismatch = await runPlayStorePublish(applyInput(stale.fetchImpl, 'ab'.repeat(32)));
    assert.equal(mismatch.status, 'APPLY_BLOCKED');
    assert.equal(mismatch.blockReason, 'plan');
    assert.equal(mismatch.edit.deleted, true);
    assert.equal(mismatch.published, false);
    assert.equal(stale.calls.some((call) => call.method === 'PUT' || call.url.includes(':commit')), false);
  });

  it('sends the GitHub token to the approval check and blocks apply when the token is missing', async () => {
    const seen = [];
    const fetchImpl = async (url, options = {}) => {
      seen.push({ method: options.method, url, authorization: options.headers && options.headers.authorization });
      if (url.includes('/approvals')) {
        return jsonResponse(200, [{ state: 'approved', environments: [{ name: 'store-publishing' }] }]);
      }
      if (options.method === 'POST' && String(url).endsWith('/edits')) return jsonResponse(200, { id: 'edit-1' });
      if (options.method === 'GET' && String(url).endsWith('/listings')) return jsonResponse(200, { listings: [listing()] });
      if (options.method === 'GET' && (String(url).endsWith('/phoneScreenshots') || String(url).endsWith('/featureGraphic'))) {
        return jsonResponse(200, { images: [] });
      }
      if (String(url).includes('/countryAvailability/')) return jsonResponse(200, countriesBody());
      if (options.method === 'PUT') return jsonResponse(200, { language: 'sv-SE' });
      if (options.method === 'DELETE') return jsonResponse(200, {});
      if (String(url).includes(':commit')) return jsonResponse(200, { id: 'edit-1' });
      return jsonResponse(404, {});
    };
    const preview = await runPlayStorePublish({
      mode: 'dry-run',
      playToken: 'play-token',
      fetchImpl,
      locales: 'sv-SE',
      rows: [swedishRow()],
    });
    assert.equal(preview.status, 'DRY_RUN');
    assert.equal(seen.some((call) => call.method === 'PUT' || call.url.includes(':commit') || call.url.includes('/upload/') || call.url.includes('api.github.com')), false);

    const gate = await reviewersApproved({
      fetchImpl,
      repo: 'octo/repo',
      runId: '123',
      token: 'approval-token',
    });
    assert.equal(gate.ok, true);
    assert.equal(gate.reason, 'approved');
    const approval = seen.find((call) => call.url.includes('/approvals'));
    assert.equal(approval.authorization, 'Bearer approval-token');

    const missingCalls = [];
    const missing = await runPlayStorePublish(applyInput(async (url, options = {}) => {
      missingCalls.push({ method: options.method, url });
      return jsonResponse(500, {});
    }, preview.plan.digest, { githubToken: '' }));
    assert.equal(missing.status, 'APPLY_BLOCKED');
    assert.equal(missing.blockReason, 'reviewers-unverified');
    assert.equal(missing.published, false);
    assert.equal(missing.committed, false);
    assert.equal(missingCalls.length, 0);
  });

  it('reports a committed edit as pending review and discards it when review is already open', async () => {
    const preview = await runPlayStorePublish({
      mode: 'dry-run',
      playToken: 'play-token',
      fetchImpl: playFetch().fetchImpl,
      locales: 'sv-SE',
      rows: [swedishRow()],
    });
    const applied = playFetch();
    const report = await runPlayStorePublish(applyInput(applied.fetchImpl, preview.plan.digest));
    assert.equal(report.status, 'COMMITTED_PENDING_REVIEW');
    assert.equal(report.published, false);
    assert.equal(report.livePublicationVerified, false);
    assert.equal(report.committed, true);
    assert.equal(report.countryChange, false);
    assert.equal(report.edit.deleted, false);
    const put = applied.calls.find((call) => call.method === 'PUT');
    const body = JSON.parse(put.body);
    assert.equal(body.title, 'Brand');
    assert.equal(body.video, 'https://example.com/v');
    assert.equal(Object.hasOwn(body, 'privacyPolicyUrl'), false);
    assert.equal(applied.calls.some((call) => call.url.includes(`changesInReviewBehavior=${REVIEW_BEHAVIOR}`)), true);
    assert.equal(applied.calls.some((call) => call.method === 'PUT' && call.url.includes('countryAvailability')), false);
    assert.match(renderPlanMarkdown(report), /inte verifierad som live/);
    assert.equal(JSON.stringify(report).includes('play-token'), false);
    assert.equal(JSON.stringify(report).includes('gh-token'), false);

    const blocked = playFetch({ status: 409, body: { error: { message: 'changes already in review' } } });
    const review = await runPlayStorePublish(applyInput(blocked.fetchImpl, preview.plan.digest));
    assert.equal(review.status, 'APPLY_BLOCKED_IN_REVIEW');
    assert.equal(review.published, false);
    assert.equal(review.livePublicationVerified, false);
    assert.equal(review.committed, false);
    assert.equal(review.edit.deleted, true);
  });

  it('uploads replacement images only while apply is open', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'play-publish-'));
    const phone = path.join(dir, 'phone.png');
    const feature = path.join(dir, 'feature.png');
    function png(file, width, height) {
      const buf = Buffer.alloc(24);
      buf[0] = 0x89;
      buf.write('PNG', 1, 'ascii');
      buf.writeUInt32BE(width, 16);
      buf.writeUInt32BE(height, 20);
      fs.writeFileSync(file, buf);
    }
    png(phone, 1080, 1920);
    png(feature, 1024, 500);
    const imageRow = {
      ...swedishRow(),
      expected: { title: 'Other', shortDescription: 'Kort', fullDescription: 'Lang' },
      screenshotExpectation: { status: 'present', files: [phone], featureGraphic: feature },
    };
    const dryCalls = [];
    const dryFetch = async (url, options = {}) => {
      dryCalls.push({ method: options.method, url });
      if (options.method === 'POST' && url.endsWith('/edits')) return jsonResponse(200, { id: 'edit-9' });
      if (options.method === 'GET' && url.endsWith('/listings')) return jsonResponse(200, { listings: [listing()] });
      if (options.method === 'GET' && url.endsWith('/phoneScreenshots')) return jsonResponse(200, { images: [] });
      if (options.method === 'GET' && url.endsWith('/featureGraphic')) return jsonResponse(200, { images: [] });
      if (url.includes('/countryAvailability/')) return jsonResponse(200, countriesBody());
      if (options.method === 'DELETE') return jsonResponse(200, {});
      return jsonResponse(404, {});
    };
    const dry = await runPlayStorePublish({
      mode: 'dry-run',
      playToken: 'play-token',
      fetchImpl: dryFetch,
      locales: 'sv-SE',
      rows: [imageRow],
    });
    assert.equal(dry.plan.changes.some((change) => change.kind === 'images'), true);
    assert.equal(dryCalls.some((call) => call.url.includes('/upload/') || call.url.includes(':commit')), false);
    const applyCalls = [];
    const applyFetch = async (url, options = {}) => {
      applyCalls.push({ method: options.method, url, type: options.headers && options.headers['content-type'] });
      if (url.includes('api.github.com')) {
        return jsonResponse(200, [{ state: 'approved', environments: [{ name: 'store-publishing' }] }]);
      }
      if (options.method === 'POST' && url.endsWith('/edits')) return jsonResponse(200, { id: 'edit-9' });
      if (options.method === 'GET' && url.endsWith('/listings')) return jsonResponse(200, { listings: [listing()] });
      if (options.method === 'GET' && (url.endsWith('/phoneScreenshots') || url.endsWith('/featureGraphic'))) {
        return jsonResponse(200, { images: [] });
      }
      if (url.includes('/countryAvailability/')) return jsonResponse(200, countriesBody());
      if (url.includes('/upload/')) return jsonResponse(200, { image: { id: 'img-1' } });
      if (url.includes(':commit')) return jsonResponse(200, { id: 'edit-9' });
      if (options.method === 'DELETE') return jsonResponse(200, {});
      return jsonResponse(404, {});
    };
    const report = await runPlayStorePublish(applyInput(applyFetch, dry.plan.digest, { rows: [imageRow] }));
    assert.equal(report.status, 'COMMITTED_PENDING_REVIEW');
    assert.equal(report.published, false);
    assert.equal(report.livePublicationVerified, false);
    const uploads = applyCalls.filter((call) => call.url.includes('/upload/'));
    assert.equal(uploads.length, 2);
    assert.equal(uploads.every((call) => call.type === 'image/png' && call.url.includes('uploadType=media')), true);
    assert.equal(applyCalls.some((call) => call.method === 'DELETE' && call.url.endsWith('/edits/edit-9')), false);
  });

  it('does not upload images that already match, or images whose hashes were not verified', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'play-publish-match-'));
    const phone = path.join(dir, 'phone.png');
    const feature = path.join(dir, 'feature.png');
    function png(file, width, height) {
      const buf = Buffer.alloc(24);
      buf[0] = 0x89;
      buf.write('PNG', 1, 'ascii');
      buf.writeUInt32BE(width, 16);
      buf.writeUInt32BE(height, 20);
      fs.writeFileSync(file, buf);
      return crypto.createHash('sha256').update(buf).digest('hex');
    }
    const phoneHash = png(phone, 1080, 1920);
    const featureHash = png(feature, 1024, 500);
    const imageRow = {
      ...swedishRow(),
      expected: { title: 'Other', shortDescription: 'Kort', fullDescription: 'Lang' },
      screenshotExpectation: { status: 'present', files: [phone], featureGraphic: feature },
    };
    const matched = buildPlan({
      rows: [imageRow],
      listings: new Map([['sv-SE', listing()]]),
      images: new Map([['sv-SE', {
        phone: { unreadable: false, ids: ['p1'], sha256: [phoneHash], sha256Complete: true, count: 1 },
        feature: { unreadable: false, ids: ['f1'], sha256: [featureHash], sha256Complete: true, count: 1 },
      }]]),
      countries: readCountries(),
      localesFilter: 'sv-SE',
    });
    assert.equal(matched.changes.some((item) => item.kind === 'images'), false);
    assert.equal(matched.applyAllowed, false);
    assert.equal(matched.blockReason, 'no-changes');

    const counted = buildPlan({
      rows: [imageRow],
      listings: new Map([['sv-SE', listing()]]),
      images: new Map([['sv-SE', {
        phone: { unreadable: false, ids: ['p1'], sha256: [], sha256Complete: false, count: 1 },
        feature: { unreadable: false, ids: ['f1'], sha256: [], sha256Complete: false, count: 1 },
      }]]),
      countries: readCountries(),
      localesFilter: 'sv-SE',
    });
    assert.equal(counted.changes.some((item) => item.kind === 'images'), false);
    assert.equal(counted.blocked.some((item) => item.reason === 'images-not-verified'), true);
  });
});

describe('Play store publish workflow', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/play-store-publish.yml'), 'utf8');
  const audit = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/play-live-audit.yml'), 'utf8');

  it('starts manually, uses the publisher secret, and leaves the read workflow alone', () => {
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /\n\s*push:/);
    assert.doesNotMatch(workflow, /pull_request/);
    assert.doesNotMatch(workflow, /schedule:/);
    assert.match(workflow, /environment: store-publishing/);
    assert.match(workflow, /secrets\.GOOGLE_PLAY_PUBLISHER_JSON/);
    assert.doesNotMatch(workflow, /GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
    assert.match(workflow, /refs\/heads\/main/);
    assert.match(workflow, /contents: read/);
    assert.match(workflow, /actions: read/);
    assert.doesNotMatch(workflow, /contents: write|actions: write|id-token: write|pull-requests: write/);
    assert.match(workflow, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
    assert.match(workflow, /if: always\(\)/);
    assert.doesNotMatch(workflow, /private_key|BEGIN PRIVATE|inappproducts|pricing/);
    assert.match(audit, /secrets\.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
    assert.doesNotMatch(audit, /GOOGLE_PLAY_PUBLISHER_JSON/);
  });
});
