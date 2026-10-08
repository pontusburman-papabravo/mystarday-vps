'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PACKAGE_NAME, languagePlan } = require('../src/lib/play-live-audit');
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

  it('classifies fallback, hidden, and invalid screenshots without a country change', () => {
    const plan = buildPlan({
      rows: languagePlan(undefined, 'Brand'),
      listings: new Map(),
      images: new Map(),
      countries: {
        status: 'READ',
        observed: ['CA', 'FI', 'IE', 'SE'],
        restOfWorld: false,
        fiObserved: 'present',
      },
    });
    assert.equal(plan.countries.fiObserved, 'present');
    assert.equal(plan.blocked.some((item) => item.locale === 'ga-IE' && item.reason === 'fallback'), true);
    assert.equal(plan.blocked.some((item) => item.locale === 'mt-MT' && item.reason === 'fallback'), true);
    assert.equal(plan.blocked.some((item) => item.locale === 'is-IS' && item.reason === 'hidden'), true);
    assert.equal(plan.blocked.some((item) => item.locale === 'bg-BG' && item.reason === 'bad-dimensions'), true);
    assert.equal(plan.changes.some((item) => item.locale === 'fi-FI' && item.kind === 'text' && item.risk === 'new-listing'), true);
    assert.equal(plan.changes.some((item) => item.locale === 'is-IS' || item.locale === 'ga-IE'), false);
    assert.equal(plan.changes.every((item) => item.kind === 'text' || item.kind === 'images'), true);
  });

  it('reads a dry-run and deletes the edit without writing', async () => {
    const { calls, fetchImpl } = playFetch();
    const report = await runPlayStorePublish({
      mode: 'dry-run',
      playToken: 'play-token',
      fetchImpl,
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

  it('reports a committed edit as pending review and discards it when review is already open', async () => {
    const preview = await runPlayStorePublish({
      mode: 'dry-run',
      playToken: 'play-token',
      fetchImpl: playFetch().fetchImpl,
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
    const dry = await runPlayStorePublish({ mode: 'dry-run', playToken: 'play-token', fetchImpl: dryFetch, rows: [imageRow] });
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
    assert.match(workflow, /actions: read/);
    assert.match(workflow, /if: always\(\)/);
    assert.doesNotMatch(workflow, /private_key|BEGIN PRIVATE|inappproducts|pricing/);
    assert.match(audit, /secrets\.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
    assert.doesNotMatch(audit, /GOOGLE_PLAY_PUBLISHER_JSON/);
  });
});
