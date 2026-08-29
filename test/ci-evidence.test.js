'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const { evaluateCiEvidence, EVIDENCE_STATUS } = require('../scripts/lib/ci-evidence/evaluate.mjs');
const { computeTestManifest, extractTestFilesFromScript } = require('../scripts/lib/ci-evidence/manifest.mjs');
const { buildPreflightReport, formatHumanReport } = require('../scripts/release-preflight.mjs');

const WORKFLOW_PATH = '.github/workflows/ci.yml';
const MANIFEST_SHA = 'abc123manifest';
const WORKFLOW_BLOB = 'deadbeefworkflow';
const HEAD_SHA = 'a'.repeat(40);
const OLD_CREATED_AT = '2020-01-01T00:00:00Z';

function successRun(overrides = {}) {
  return {
    run_id: '123456',
    head_sha: HEAD_SHA,
    conclusion: 'success',
    run_attempt: 1,
    workflow_id: '99',
    workflow_path: WORKFLOW_PATH,
    jobs: [{ name: 'test', conclusion: 'success' }],
    created_at: OLD_CREATED_AT,
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    headSha: HEAD_SHA,
    workingTreeClean: true,
    workflowPath: WORKFLOW_PATH,
    requiredJobs: ['test'],
    workflowBlobSha: WORKFLOW_BLOB,
    testManifestSha256: MANIFEST_SHA,
    ghAvailable: true,
    ghAuthenticated: true,
    run: successRun(),
    runWorkflowBlobSha: WORKFLOW_BLOB,
    runTestManifestSha256: MANIFEST_SHA,
    source: 'gh-cli',
    ...overrides,
  };
}

describe('ci-evidence evaluate', () => {
  test('1. exact SHA + success → REUSE_ALLOWED', () => {
    const result = evaluateCiEvidence(baseInput());
    assert.equal(result.status, EVIDENCE_STATUS.REUSE_ALLOWED);
    assert.equal(result.run_id, '123456');
    assert.equal(result.head_sha, HEAD_SHA);
    assert.equal(result.test_manifest_sha256, MANIFEST_SHA);
  });

  test('2. SHA mismatch → REUSE_FORBIDDEN', () => {
    const result = evaluateCiEvidence(
      baseInput({ run: successRun({ head_sha: 'b'.repeat(40) }) })
    );
    assert.equal(result.status, EVIDENCE_STATUS.REUSE_FORBIDDEN);
    assert.equal(result.reason, 'sha_mismatch');
  });

  test('3. dirty tree → REUSE_FORBIDDEN', () => {
    const result = evaluateCiEvidence(baseInput({ workingTreeClean: false }));
    assert.equal(result.status, EVIDENCE_STATUS.REUSE_FORBIDDEN);
    assert.equal(result.reason, 'dirty_working_tree');
  });

  test('4. missing run → NOT_VERIFIED', () => {
    const result = evaluateCiEvidence(baseInput({ run: null }));
    assert.equal(result.status, EVIDENCE_STATUS.NOT_VERIFIED);
    assert.equal(result.reason, 'no_ci_run');
  });

  test('5. cancelled run → REUSE_FORBIDDEN', () => {
    const result = evaluateCiEvidence(
      baseInput({ run: successRun({ conclusion: 'cancelled' }) })
    );
    assert.equal(result.status, EVIDENCE_STATUS.REUSE_FORBIDDEN);
    assert.equal(result.reason, 'run_cancelled');
  });

  test('6. failed required job → REUSE_FORBIDDEN', () => {
    const result = evaluateCiEvidence(
      baseInput({
        run: successRun({
          jobs: [{ name: 'test', conclusion: 'failure' }],
        }),
      })
    );
    assert.equal(result.status, EVIDENCE_STATUS.REUSE_FORBIDDEN);
    assert.equal(result.reason, 'required_job_not_success');
  });

  test('7. workflow mismatch → REUSE_FORBIDDEN', () => {
    const result = evaluateCiEvidence(
      baseInput({
        runWorkflowBlobSha: 'otherblob',
      })
    );
    assert.equal(result.status, EVIDENCE_STATUS.REUSE_FORBIDDEN);
    assert.equal(result.reason, 'workflow_mismatch');
  });

  test('8. manifest mismatch → REUSE_FORBIDDEN', () => {
    const result = evaluateCiEvidence(
      baseInput({
        runTestManifestSha256: 'othermanifest',
      })
    );
    assert.equal(result.status, EVIDENCE_STATUS.REUSE_FORBIDDEN);
    assert.equal(result.reason, 'test_manifest_mismatch');
  });

  test('9. gh unavailable → NOT_VERIFIED', () => {
    const result = evaluateCiEvidence(baseInput({ ghAvailable: false, run: null }));
    assert.equal(result.status, EVIDENCE_STATUS.NOT_VERIFIED);
    assert.equal(result.reason, 'gh_unavailable');
  });

  test('10. old-but-exact valid SHA → still REUSE_ALLOWED (no max-age)', () => {
    const result = evaluateCiEvidence(
      baseInput({
        run: successRun({ created_at: '2018-06-01T12:00:00Z' }),
      })
    );
    assert.equal(result.status, EVIDENCE_STATUS.REUSE_ALLOWED);
  });
});

describe('ci-evidence manifest', () => {
  test('extractTestFilesFromScript returns sorted unique paths', () => {
    const script =
      'node --test test/b.test.js test/a.test.js test/a.test.js test/c.test.js';
    assert.deepEqual(extractTestFilesFromScript(script), [
      'test/a.test.js',
      'test/b.test.js',
      'test/c.test.js',
    ]);
  });

  test('computeTestManifest is stable for package.json scripts', () => {
    const pkg = require('../package.json');
    const first = computeTestManifest(pkg);
    const second = computeTestManifest(pkg);
    assert.equal(first.sha256, second.sha256);
    assert.match(first.sha256, /^[a-f0-9]{64}$/);
    assert.ok(first.unit.length > 0);
    assert.ok(first.db.length > 0);
  });
});

describe('release-preflight report', () => {
  test('reuse path marks CODE PASS and lists skipped checks', () => {
    const report = buildPreflightReport({
      headSha: HEAD_SHA,
      fullMode: false,
      ciEvidence: {
        status: EVIDENCE_STATUS.REUSE_ALLOWED,
        run_id: '999',
        head_sha: HEAD_SHA,
      },
      gateA: { overallStatus: 'PASS', exitCode: 0, profile: 'public-runtime' },
      compliance: { overallStatus: 'PASS', exitCode: 0 },
      timings: { totalMs: 12000 },
      skippedChecks: ['test:gate:unit', 'test:gate:db'],
    });
    assert.equal(report.final, 'READY');
    assert.equal(report.sections.code.status, 'PASS');
    assert.equal(report.ciEvidenceReused, true);
    const human = formatHumanReport(report);
    assert.match(human, /CI evidence reused/);
    assert.match(human, /run_id: 999/);
  });

  test('NOT_VERIFIED CI evidence forces BLOCKED final when gate A not pass', () => {
    const report = buildPreflightReport({
      headSha: HEAD_SHA,
      fullMode: false,
      ciEvidence: { status: EVIDENCE_STATUS.NOT_VERIFIED, reason: 'no_ci_run' },
      gateA: { overallStatus: 'NOT_VERIFIED', exitCode: 2 },
      compliance: { overallStatus: 'PASS', exitCode: 0 },
      timings: {},
      skippedChecks: [],
    });
    assert.equal(report.final, 'BLOCKED');
    const human = formatHumanReport(report);
    assert.match(human, /CI EVIDENCE: NOT_VERIFIED/);
    assert.match(human, /LOCAL TESTING REQUIRED/);
  });

  test('compliance REVIEW → MANUAL_REVIEW_REQUIRED final', () => {
    const report = buildPreflightReport({
      headSha: HEAD_SHA,
      fullMode: true,
      ciEvidence: null,
      gateA: { overallStatus: 'PASS', exitCode: 0 },
      compliance: { overallStatus: 'MANUAL_REVIEW_REQUIRED', exitCode: 0, manualReviewRequired: true },
      timings: {},
      skippedChecks: [],
    });
    assert.equal(report.final, 'MANUAL_REVIEW_REQUIRED');
  });
});
