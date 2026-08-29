'use strict';

/**
 * Regression tests for scripts/release-compliance-gate.mjs (DEL 8 of the
 * release compliance gate mandate). These test the pure classifier
 * functions directly with the exact fixtures the mandate specifies, so the
 * suite stays hermetic and does not depend on the ever-changing content of
 * public/ or src/locales/.
 */

const path = require('node:path');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { STATUS, DISPOSITION } = require('../scripts/lib/release-compliance/constants.cjs');
const { scanTextForPreReleaseLanguage } = require('../scripts/lib/release-compliance/check-language-scan.cjs');
const { scanTextForPlaceholders } = require('../scripts/lib/release-compliance/check-placeholder-scan.cjs');
const { classifyLegalUrl, defaultProductionHosts } = require('../scripts/lib/release-compliance/check-legal-urls.cjs');
const { loadReleaseComplianceConfig } = require('../scripts/lib/release-compliance/load-config.cjs');
const { dispositionForHit, partitionHitsByDisposition } = require('../scripts/lib/release-compliance/disposition.cjs');
const { getClosedMarketSurfaces } = require('../scripts/lib/release-compliance/market-context.cjs');
const { buildReport } = require('../scripts/lib/release-compliance/report.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const CONFIG = loadReleaseComplianceConfig(REPO_ROOT);
const CLOSED_MARKETS = getClosedMarketSurfaces(REPO_ROOT, CONFIG);

function consumerHits(content, opts) {
  return scanTextForPreReleaseLanguage(content, { config: CONFIG, ...opts }).filter(
    (h) => h.classification === 'A_CONSUMER_UI'
  );
}

function withDisposition(hits, extra = {}) {
  return hits.map((hit) => dispositionForHit(hit, { config: CONFIG, closedMarketSurfaces: CLOSED_MARKETS, ...extra }));
}

describe('release-compliance-gate — Check A: pre-release language scan', () => {
  test('PASS — plain "English" does not match any keyword', () => {
    const hits = consumerHits('English', { filePath: 'public/settings.html', fileType: 'html' });
    assert.equal(hits.length, 0);
  });

  test('FAIL — "English Beta" in shipped HTML is classified A_CONSUMER_UI (BLOCKER disposition)', () => {
    const hits = withDisposition(consumerHits('<p>English Beta</p>', { filePath: 'public/settings.html', fileType: 'html' }));
    assert.equal(hits.length, 1);
    assert.equal(hits[0].keyword, 'beta');
    assert.equal(hits[0].disposition, DISPOSITION.BLOCKER);
  });

  test('FAIL — "English (Beta)" in shipped HTML is classified A_CONSUMER_UI', () => {
    const hits = consumerHits('<span>English (Beta)</span>', { filePath: 'public/settings.html', fileType: 'html' });
    assert.equal(hits.length, 1);
  });

  test('FAIL — "Try the beta" in a shipped JS UI string is classified A_CONSUMER_UI', () => {
    const js = "toast.show('Try the beta');";
    const hits = consumerHits(js, { filePath: 'public/js/some-feature.js', fileType: 'js' });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].keyword, 'beta');
  });

  test('FAIL — "Trial version" in shipped HTML is classified A_CONSUMER_UI', () => {
    const hits = consumerHits('<h1>Trial version</h1>', { filePath: 'public/index.html', fileType: 'html' });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].keyword, 'trial');
  });

  test('SAFE — internal variable name english_beta_offer_state never matches (no word boundary)', () => {
    const js = "const english_beta_offer_state = computeState();";
    const hits = scanTextForPreReleaseLanguage(js, { filePath: 'public/js/some-feature.js', fileType: 'js', config: CONFIG });
    assert.equal(hits.length, 0);
  });

  test('SAFE — test fixture email beta@test.se is classified C_SAFE, not A', () => {
    const js = "const fixtureEmail = 'beta@test.se';";
    const hits = scanTextForPreReleaseLanguage(js, { filePath: 'public/js/some-feature.js', fileType: 'js', config: CONFIG });
    assert.ok(hits.length >= 1);
    for (const hit of hits) assert.equal(hit.classification, 'C_SAFE');
  });

  test('SAFE — historical beta mention in docs/ is classified B_INTERNAL by path', () => {
    const hits = scanTextForPreReleaseLanguage('We shipped an English beta in 2026.', {
      filePath: 'docs/i18n-beta-rollout-plan.md',
      fileType: 'text',
      config: CONFIG,
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].classification, 'B_INTERNAL');
  });

  test('SAFE — admin-only beta status badge is classified B_INTERNAL by path', () => {
    const js = "badge.textContent = 'EN beta';";
    const hits = scanTextForPreReleaseLanguage(js, { filePath: 'public/admin/admin-families.js', fileType: 'js', config: CONFIG });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].classification, 'B_INTERNAL');
  });

  test('SAFE — "free trial" subscription copy is legitimate, not pre-release labeling', () => {
    const hits = scanTextForPreReleaseLanguage('14-day free trial, then $9.99/month', {
      filePath: 'src/locales/en-GB.json',
      fileType: 'text',
      config: CONFIG,
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].classification, 'C_SAFE');
  });

  test('SAFE — "coming soon" + waitlist for an unlaunched market is legitimate marketing copy', () => {
    const html = '<p>English coming soon — <a href="#waitlist">join the waitlist</a>.</p>';
    const hits = scanTextForPreReleaseLanguage(html, { filePath: 'public/en.html', fileType: 'html', config: CONFIG });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].classification, 'C_SAFE');
  });

  test('SAFE — "English coming soon." on en.html without waitlist on same line is legitimate store-locale note', () => {
    const html = '<p class="store-locale-note"><strong>English coming soon.</strong></p>';
    const hits = scanTextForPreReleaseLanguage(html, { filePath: 'public/en.html', fileType: 'html', config: CONFIG });
    const consumerA = hits.filter((h) => h.classification === 'A_CONSUMER_UI');
    assert.equal(consumerA.length, 0);
  });

  test('CSS class names like "ccsz-preview" do not fail (compound identifier, not prose)', () => {
    const js = "return '<span class=\"ccsz-preview ccsz-preview--large\"></span>';";
    const hits = consumerHits(js, { filePath: 'public/js/child-activity-card-size-picker.js', fileType: 'js' });
    assert.equal(hits.length, 0);
  });

  test('ambiguous "test"/"preview" without a release-stage word nearby is C_SAFE, not FAIL', () => {
    const js = "host.indexOf('preview') !== -1";
    const hits = scanTextForPreReleaseLanguage(js, { filePath: 'public/js/meta-app-events.js', fileType: 'js', config: CONFIG });
    const consumerA = hits.filter((h) => h.classification === 'A_CONSUMER_UI');
    assert.equal(consumerA.length, 0);
  });

  test('SAFE — print-schema preview mode ternary is code, not consumer UI', () => {
    const js = "const mode = opts.mode === 'preview' ? 'preview' : 'print';";
    const hits = consumerHits(js, { filePath: 'public/js/print-schema-core.js', fileType: 'js' });
    assert.equal(hits.length, 0);
  });

  test('REVIEW — beta interest signup copy is MANUAL_REVIEW_REQUIRED, not P0 FAIL', () => {
    const js = "sublabel: 'Anmäl intresse för kommande beta',";
    const hits = withDisposition(consumerHits(js, { filePath: 'public/js/preview-shell.js', fileType: 'js' }));
    assert.equal(hits.length, 1);
    assert.equal(hits[0].disposition, DISPOSITION.REVIEW);
    const { blockerHits } = partitionHitsByDisposition(hits);
    assert.equal(blockerHits.length, 0);
  });
});

describe('release-compliance-gate — Check C: placeholder / review-unsafe copy scan', () => {
  test('docs sandbox mention is informational only — never a blocking scan target', () => {
    const hits = withDisposition(
      scanTextForPlaceholders('APNs sandbox environment for TestFlight builds', {
        filePath: 'docs/app-store-review-notes.md',
        fileType: 'markdown',
        config: CONFIG,
      }),
      { isSubmissionTemplate: true }
    );
    assert.ok(hits.length >= 1);
    for (const hit of hits) assert.equal(hit.disposition, DISPOSITION.INFORMATIONAL);
  });

  test('SAFE — same placeholder text explicitly marked as a documented test fixture is not flagged', () => {
    const hits = scanTextForPlaceholders('Example only (test fixture): YOUR REVIEW PASSWORD', {
      filePath: 'docs/app-store-review-notes.md',
      fileType: 'markdown',
      config: CONFIG,
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].classification, 'C_SAFE');
  });

  test('SAFE — HTML input placeholder attribute is legitimate web development, not review-unsafe copy', () => {
    const js = "return '<input type=\"text\" placeholder=\"Name\">';";
    const hits = scanTextForPlaceholders(js, { filePath: 'public/js/some-form.js', fileType: 'js', config: CONFIG }).filter(
      (h) => h.classification === 'A_CONSUMER_UI'
    );
    assert.equal(hits.length, 0);
  });

  test('NOT_APPLICABLE — UK placeholder legal pages when market_uk_open=false', () => {
    const hits = withDisposition(
      scanTextForPlaceholders('<h1>UK Privacy Notice (placeholder)</h1>', {
        filePath: 'public/en/uk-privacy.html',
        fileType: 'html',
        config: CONFIG,
      })
    );
    const consumerA = hits.filter((h) => h.classification === 'A_CONSUMER_UI');
    assert.equal(consumerA.length, 1);
    assert.equal(consumerA[0].disposition, DISPOSITION.NOT_APPLICABLE);
    const { blockerHits } = partitionHitsByDisposition(hits);
    assert.equal(blockerHits.length, 0);
  });
});

describe('release-compliance-gate — Check B: legal URL classification', () => {
  test('PASS — a relative production route path', () => {
    const result = classifyLegalUrl('/privacy', CONFIG);
    assert.equal(result.status, STATUS.PASS);
  });

  test('PASS — an allowed absolute production host', () => {
    const host = defaultProductionHosts()[0];
    const result = classifyLegalUrl(`https://${host}/terms`, CONFIG);
  });

  test('PASS — Apple official domain (used for the standard EULA link)', () => {
    const result = classifyLegalUrl('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/', CONFIG);
    assert.equal(result.status, STATUS.PASS);
  });

  test('FAIL — example.com', () => {
    const result = classifyLegalUrl('https://example.com/privacy', CONFIG);
    assert.equal(result.status, STATUS.FAIL);
  });

  test('FAIL — localhost', () => {
    const result = classifyLegalUrl('http://localhost:3000/privacy', CONFIG);
    assert.equal(result.status, STATUS.FAIL);
  });

  test('MANUAL_REVIEW_REQUIRED — an unknown but well-formed absolute host', () => {
    const result = classifyLegalUrl('https://unknown-cdn-host.io/privacy', CONFIG);
    assert.equal(result.status, STATUS.MANUAL_REVIEW_REQUIRED);
  });
});

describe('release-compliance-gate — report readiness labels', () => {
  test('stale Gate A artifact yields CODE READY: NOT_VERIFIED, not false', () => {
    const report = buildReport({
      sections: [],
      gateAReference: {
        status: 'NOT_VERIFIED',
        note: 'Gate A: NOT_VERIFIED (cached result stale)',
      },
    });
    assert.equal(report.readiness.codeReady, 'NOT_VERIFIED');
    assert.equal(report.gateA.status, 'NOT_VERIFIED');
  });

  test('fresh Gate A PASS with no section FAILs yields CODE READY: PASS', () => {
    const report = buildReport({
      sections: [{ id: 'B_legal_url_eula_checks', status: STATUS.PASS, evidence: {} }],
      gateAReference: { status: 'PASS', note: 'fresh pass' },
    });
    assert.equal(report.readiness.codeReady, 'PASS');
  });
});

describe('release-compliance-gate — orchestrator smoke test', () => {
  test('runPreReleaseLanguageScan runs against the real repo without throwing and returns a valid status', () => {
    const { runPreReleaseLanguageScan } = require('../scripts/lib/release-compliance/check-language-scan.cjs');
    const result = runPreReleaseLanguageScan(REPO_ROOT);
    assert.ok(Object.values(STATUS).includes(result.status));
    assert.ok(Array.isArray(result.evidence.consumerHits));
    // Acceptance: English Beta labeling removed from main — no P0 blockers from locales/UI.
    assert.equal(result.evidence.consumerHits.length, 0, JSON.stringify(result.evidence.consumerHits));
  });

  test('runPlaceholderScan runs against the real repo without throwing and UK closed-market pages are N/A', () => {
    const { runPlaceholderScan } = require('../scripts/lib/release-compliance/check-placeholder-scan.cjs');
    const result = runPlaceholderScan(REPO_ROOT);
    assert.ok(Object.values(STATUS).includes(result.status));
    assert.equal(result.evidence.consumerHits.length, 0, JSON.stringify(result.evidence.consumerHits));
    assert.ok((result.evidence.notApplicableHits || []).length >= 1);
  });

  test('runLegalUrlChecks runs against the real repo without throwing', () => {
    const { runLegalUrlChecks } = require('../scripts/lib/release-compliance/check-legal-urls.cjs');
    const result = runLegalUrlChecks(REPO_ROOT);
    assert.ok(Object.values(STATUS).includes(result.status));
  });

  test('runAccountDeletionChecks finds the real account-deletion route + client entry point', () => {
    const { runAccountDeletionChecks } = require('../scripts/lib/release-compliance/check-account-deletion.cjs');
    const result = runAccountDeletionChecks(REPO_ROOT);
    assert.notEqual(result.status, STATUS.FAIL, JSON.stringify(result.evidence));
  });

  test('runVersionBuildCacheChecks finds SW cache version in sync with config', () => {
    const { runVersionBuildCacheChecks } = require('../scripts/lib/release-compliance/check-version-build-cache.cjs');
    const result = runVersionBuildCacheChecks(REPO_ROOT);
    const swCheck = result.evidence.checks.find((c) => c.id === 'sw_cache_version_matches_config');
    assert.equal(swCheck.status, STATUS.PASS, JSON.stringify(swCheck.evidence));
  });
});
