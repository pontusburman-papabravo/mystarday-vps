'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const NO_GATE_A = path.join(ROOT, 'artifacts/__test_missing_gate_a.json');
const NO_GATE_BC = path.join(ROOT, 'artifacts/__test_missing_gate_bc.json');

function deltaOpts(overrides = {}) {
  return {
    gateAPath: NO_GATE_A,
    gateBCPath: NO_GATE_BC,
    ...overrides,
  };
}

const {
  matchGlob,
  mapFileToDomains,
  classifyUnknownFile,
  loadRoutingConfig,
  buildDomainTestIndex,
} = require('../scripts/lib/test-routing/config.mjs');

const { classifyRisk, riskToRecommendedLevel, resolveFinalRisk, riskClassToTier } = require('../scripts/lib/test-routing/risk.mjs');
const { routeChangedFiles, resolveDomainGate, dedupeTests } = require('../scripts/lib/test-routing/route.mjs');
const {
  buildVerificationPlan,
  collectLocalExecutionTests,
  resolveExecutionOutcome,
} = require('../scripts/lib/test-routing/verification-plan.mjs');
const {
  generateStoreManualDelta,
  validateChecklistAnchors,
} = require('../scripts/lib/store-manual-delta/generate.mjs');
const { evaluateGateA, evaluateGateBC, resolveDeltaStatus } = require('../scripts/lib/store-manual-delta/gate-status.mjs');

test('matchGlob supports ** and * patterns', () => {
  assert.equal(matchGlob('src/routes/auth/login.js', 'src/routes/auth/**'), true);
  assert.equal(matchGlob('src/routes/family/core.js', 'src/routes/auth/**'), false);
  assert.equal(matchGlob('docs/process/GLOBAL_CORE.md', 'docs/**'), true);
});

test('mapFileToDomains maps known auth path', () => {
  const domains = {
    'auth-security': { pathGlobs: ['src/routes/auth/**'] },
    'payments-iap': { pathGlobs: ['src/routes/iap.js'] },
  };
  const matched = mapFileToDomains('src/routes/auth/login.js', domains);
  assert.deepEqual(matched, ['auth-security']);
});

test('classifyUnknownFile fail-safe buckets', () => {
  const policy = {
    criticalPathGlobs: ['server.js', 'migrations/**'],
    sharedCoreGlobs: ['src/lib/**'],
    nonCriticalBroadenGlobs: ['docs/**'],
  };
  assert.equal(classifyUnknownFile('server.js', policy), 'critical');
  assert.equal(classifyUnknownFile('src/lib/foo.js', policy), 'shared_core');
  assert.equal(classifyUnknownFile('docs/x.md', policy), 'non_critical');
  assert.equal(classifyUnknownFile('random/unknown.js', policy), 'unmapped');
});

test('classifyRisk never below explicit min risk', () => {
  const globalCore = {
    r0PathGlobs: ['docs/**'],
    r3PathGlobs: ['src/routes/auth/**'],
    r2MinDomains: 2,
    riskClasses: {
      R0: { defaultVerification: ['L1'] },
      R3: { defaultVerification: ['L2', 'L3', 'RELEASE_REVIEW'] },
    },
  };
  const { riskClass } = classifyRisk(['docs/a.md'], globalCore, [], 'R3');
  assert.equal(riskClass, 'R3');
});

test('classifyRisk R2 on multi-domain', () => {
  const globalCore = {
    r0PathGlobs: ['docs/**'],
    r3PathGlobs: [],
    r2MinDomains: 2,
    riskClasses: { R2: { defaultVerification: ['L1', 'L2', 'L3'] } },
  };
  const { riskClass } = classifyRisk(['a.js'], globalCore, ['auth-security', 'payments-iap']);
  assert.equal(riskClass, 'R2');
});

test('riskToRecommendedLevel maps R3 to L3', () => {
  const globalCore = {
    riskClasses: {
      R3: { defaultVerification: ['L2', 'L3', 'RELEASE_REVIEW'] },
    },
  };
  assert.equal(riskToRecommendedLevel('R3', globalCore), 'L3');
});

test('R1 cumulative plan includes L1 and L2', () => {
  const plan = routeChangedFiles(ROOT, { files: ['public/js/custody-banner.js'] });
  assert.equal(plan.riskClass, 'R1');
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, false);
  assert.ok(plan.verificationPlan.L2.tests.length > 0);
  assert.ok(collectLocalExecutionTests(plan.verificationPlan).length > 0);
});

test('R2 cumulative plan includes L1, multi-domain L2, and L3', () => {
  const plan = routeChangedFiles(ROOT, {
    files: ['public/js/schedule.js', 'public/js/child-dashboard.js'],
  });
  assert.equal(plan.riskClass, 'R2');
  assert.ok(plan.domains.length >= 2);
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, true);
  assert.ok(plan.verificationPlan.L2.tests.length > 0);
});

test('R3 cumulative plan includes L1, L2, L3, and releaseReview', () => {
  // push-recipients has explicit domain l1Tests; automatic R3 auth paths fail closed without them.
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/push.js'], minRisk: 'R3' });
  assert.equal(plan.riskClass, 'R3');
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, true);
  assert.equal(plan.verificationPlan.releaseReview, true);
  assert.equal(plan.verificationPlan.independentReview, true);
  assert.equal(plan.verificationPlan.rollbackConsideration, true);
  assert.equal(plan.verificationPlan.dbInvariants, true);
  assert.ok(plan.verificationPlan.L1.tests.length > 0);
  assert.ok(plan.verificationPlan.L2.tests.length > 0);
});

test('explicit --min-risk R3 keeps L2 required on docs-only', () => {
  const plan = routeChangedFiles(ROOT, {
    files: ['docs/process/GLOBAL_CORE.md'],
    minRisk: 'R3',
  });
  assert.equal(plan.riskClass, 'R3');
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, true);
  assert.equal(plan.verificationPlan.releaseReview, true);
});

test('unknown critical path fail-safe escalates to R3 with L3', () => {
  const plan = routeChangedFiles(ROOT, { files: ['server.js'] });
  assert.equal(plan.riskClass, 'R3');
  assert.equal(plan.riskTier, 'HIGH');
  assert.equal(plan.verificationPlan.L3.required, true);
  assert.equal(plan.verificationPlan.L2.l2NotResolved, true);
  assert.ok(plan.reason.includes('L2_NOT_RESOLVED'));
  assert.ok(plan.verificationPlan.L1.tests.length > 0, 'L1 smoke still present');
});

test('resolveExecutionOutcome: local fail exits 1', () => {
  const outcome = resolveExecutionOutcome(
    { L3: { required: true, command: 'npm run test:gate' }, releaseReview: false },
    { ok: false },
  );
  assert.equal(outcome.status, 'LOCAL_FAIL');
  assert.equal(outcome.exitCode, 1);
});

test('resolveExecutionOutcome: local pass with L3 required exits 2', () => {
  const outcome = resolveExecutionOutcome(
    { L3: { required: true, command: 'npm run test:gate' }, releaseReview: false },
    { ok: true },
  );
  assert.equal(outcome.status, 'L3_REQUIRED');
  assert.equal(outcome.exitCode, 2);
  assert.equal(outcome.l3Required, true);
});

test('resolveExecutionOutcome: R3 local pass requires L3 and release review flag', () => {
  const vp = {
    L1: { required: false, tests: [] },
    L2: { required: true, domains: ['auth-security'], tests: ['test/a.test.js'] },
    L3: { required: true, command: 'npm run test:gate' },
    releaseReview: true,
  };
  const outcome = resolveExecutionOutcome(vp, { ok: true });
  assert.equal(outcome.exitCode, 2);
  assert.equal(outcome.l3Required, true);
  assert.equal(outcome.releaseReviewRequired, true);
});

test('routeChangedFiles docs-only suggests R0/L1 only', () => {
  const plan = routeChangedFiles(ROOT, { files: ['docs/process/GLOBAL_CORE.md'] });
  assert.equal(plan.meta.riskClass, 'R0');
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, false);
  assert.equal(plan.verificationPlan.L3.required, false);
});

test('resolveDomainGate deduplicates overlapping tests', () => {
  const gate = resolveDomainGate(ROOT, ['auth-security', 'payments-iap']);
  const all = Object.values(gate.perDomain).flat();
  const unique = new Set(all);
  assert.equal(gate.tests.length, unique.size);
  assert.ok(gate.tests.length > 0);
});

test('resolveDomainGate rejects unknown domain', () => {
  assert.throws(
    () => resolveDomainGate(ROOT, ['not-a-domain']),
    (err) => err.code === 'UNKNOWN_DOMAIN',
  );
});

test('dedupeTests preserves single copy', () => {
  const out = dedupeTests(['test/a.test.js', 'test/a.test.js', 'test/b.test.js']);
  assert.deepEqual(out, ['test/a.test.js', 'test/b.test.js']);
});

test('all eight domains exist in overlay', () => {
  const expected = [
    'auth-security',
    'payments-iap',
    'i18n-markets-legal',
    'planning-schedule',
    'child-experience',
    'parent-experience',
    'db-migrations',
    'native-platform',
  ];
  for (const id of expected) {
    const gate = resolveDomainGate(ROOT, [id]);
    assert.ok(gate.tests.length >= 1, `${id} should resolve at least one test`);
  }
});

test('store manual delta native release includes apple build action', () => {
  const delta = generateStoreManualDelta(ROOT, deltaOpts({
    changedPaths: ['ios/App/AppDelegate.swift'],
    profile: 'apple',
    nativeRelease: true,
  }));
  assert.ok(delta.items.some((i) => i.id === 'apple-select-build'));
  assert.ok(delta.actionCount >= 1);
  assert.equal(delta.status, 'MANUAL_REVIEW_REQUIRED');
  assert.ok(delta.gateReasons.includes('gate_a_not_verified'));
});

test('store manual delta unknown path triggers manual review', () => {
  const delta = generateStoreManualDelta(ROOT, deltaOpts({
    changedPaths: ['totally/unknown/module.js'],
    profile: 'both',
  }));
  assert.equal(delta.status, 'MANUAL_REVIEW_REQUIRED');
  assert.ok(delta.unknownPaths.includes('totally/unknown/module.js'));
  assert.ok(delta.gateReasons.includes('unknown_paths'));
});

test('store manual delta iap change includes iap items', () => {
  const delta = generateStoreManualDelta(ROOT, deltaOpts({
    changedPaths: ['public/js/iap-manager.js'],
    profile: 'apple',
  }));
  assert.ok(delta.items.some((i) => i.id === 'apple-iap-metadata'));
});

test('gate A BLOCKER yields BLOCKED delta status', () => {
  const { status, gateReasons } = resolveDeltaStatus({
    gateA: { overallStatus: 'BLOCKER' },
    gateBC: { gateB: { status: 'PASS' }, gateC: { status: 'PASS' }, overallStatus: 'PASS' },
    unknownPaths: [],
    hasAlwaysManualTrigger: false,
  });
  assert.equal(status, 'BLOCKED');
  assert.ok(gateReasons.includes('gate_a_blocker'));
});

test('gate B/C FAIL yields BLOCKED delta status', () => {
  const { status, gateReasons } = resolveDeltaStatus({
    gateA: { overallStatus: 'PASS' },
    gateBC: { gateB: { status: 'FAIL' }, gateC: { status: 'PASS' }, overallStatus: 'FAIL' },
    unknownPaths: [],
    hasAlwaysManualTrigger: false,
  });
  assert.equal(status, 'BLOCKED');
  assert.ok(gateReasons.includes('gate_bc_fail'));
});

test('verified gates with no unknown paths yields DELTA_READY', () => {
  const { status } = resolveDeltaStatus({
    gateA: { overallStatus: 'PASS' },
    gateBC: { gateB: { status: 'PASS' }, gateC: { status: 'PASS' }, overallStatus: 'PASS' },
    unknownPaths: [],
    hasAlwaysManualTrigger: false,
  });
  assert.equal(status, 'DELTA_READY');
});

test('evaluateGateA missing artifact is not verified', () => {
  const evalA = evaluateGateA(null);
  assert.equal(evalA.verified, false);
  assert.ok(evalA.reasons.includes('gate_a_not_verified'));
});

test('evaluateGateBC MANUAL_REVIEW_REQUIRED is not verified', () => {
  const evalBC = evaluateGateBC({ gateB: { status: 'PASS' }, gateC: { status: 'MANUAL_REVIEW_REQUIRED' } });
  assert.equal(evalBC.verified, false);
  assert.ok(evalBC.reasons.includes('gate_bc_manual_review_required'));
});

test('checklist anchors resolve in canonical checklist', () => {
  const result = validateChecklistAnchors(ROOT);
  assert.equal(result.ok, true, JSON.stringify(result.missing));
  assert.equal(result.itemCount, 18);
});

test('generateStoreManualDelta with pass gates and known path can be DELTA_READY', () => {
  const fs = require('fs');
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-fix-'));
  const gateA = path.join(tmp, 'gate-a.json');
  const gateBC = path.join(tmp, 'gate-bc.json');
  fs.writeFileSync(gateA, JSON.stringify({ overallStatus: 'PASS', decision: 'PUBLIC-RUNTIME GATE READY' }));
  fs.writeFileSync(gateBC, JSON.stringify({
    overallStatus: 'PASS',
    gateB: { status: 'PASS' },
    gateC: { status: 'PASS' },
  }));

  const delta = generateStoreManualDelta(ROOT, {
    changedPaths: ['src/routes/iap.js'],
    profile: 'apple',
    gateAPath: gateA,
    gateBCPath: gateBC,
  });
  assert.equal(delta.status, 'DELTA_READY');
  assert.deepEqual(delta.gateReasons, []);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('buildVerificationPlan R2 sets L3 when L2 not resolved', () => {
  const plan = buildVerificationPlan({
    riskClass: 'R2',
    globalCore: {
      riskClasses: { R2: { defaultVerification: ['L1', 'L2', 'L3'] } },
      l1SmokeTests: ['test/smoke.test.js'],
    },
    entry: { l3Command: 'npm run test:gate' },
    domainList: [],
    domainTestIndex: {},
    domainL1Index: {},
    hasUnsafeUnknown: false,
  });
  assert.equal(plan.L2.l2NotResolved, true);
  assert.equal(plan.L3.required, true);
});

// ─── Phase -1: Parent Experience routing alignment ─────────

test('known LOW path (docs-only) → R0/LOW without L3', () => {
  const plan = routeChangedFiles(ROOT, { files: ['docs/process/GLOBAL_CORE.md'] });
  assert.equal(plan.automaticRisk, 'R0');
  assert.equal(plan.riskTier, 'LOW');
  assert.equal(plan.verificationPlan.L3.required, false);
});

test('MEDIUM domain (single parent-home) → L1 + L2 without L3', () => {
  const plan = routeChangedFiles(ROOT, { files: ['public/js/idag-state.js'] });
  assert.equal(plan.riskClass, 'R1');
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, false);
  assert.ok(plan.domains.includes('parent-home'));
});

test('HIGH auth path → L1 + L2 + L3', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/auth/login.js'] });
  assert.equal(plan.riskClass, 'R3');
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, true);
});

test('HIGH deletion path → account-deletion + family-authz domains', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/family/account.js'] });
  assert.equal(plan.riskClass, 'R3');
  assert.ok(plan.domains.includes('account-deletion'));
  assert.ok(plan.domains.includes('family-authz') || plan.domains.includes('auth-security'));
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, true);
});

test('deletion path maps to account-deletion domain', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/family/account.js'] });
  assert.ok(plan.domains.includes('account-deletion'));
});

test('authz path maps to family-authz domain', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/middleware/authz.js'] });
  assert.ok(plan.domains.includes('family-authz'));
});

test('push child-recipient path → push-recipients domain', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/push.js'] });
  assert.ok(plan.domains.includes('push-recipients'));
});

test('for-dig path → for-dig domain', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/for-dig.js'] });
  assert.ok(plan.domains.includes('for-dig'));
});

test('parent home path → parent-home domain', () => {
  const plan = routeChangedFiles(ROOT, { files: ['public/js/home-readiness.js'] });
  assert.ok(plan.domains.includes('parent-home'));
});

test('manual risk may raise automatic LOW to HIGH', () => {
  const plan = routeChangedFiles(ROOT, {
    files: ['docs/process/GLOBAL_CORE.md'],
    manualRisk: 'HIGH',
  });
  assert.equal(plan.automaticRisk, 'R0');
  assert.equal(plan.finalRisk, 'R3');
  assert.equal(plan.manualApplied, true);
  assert.equal(plan.verificationPlan.L3.required, true);
});

test('manual risk may not lower automatic HIGH', () => {
  const plan = routeChangedFiles(ROOT, {
    files: ['src/routes/auth/login.js'],
    manualRisk: 'LOW',
  });
  assert.equal(plan.automaticRisk, 'R3');
  assert.equal(plan.finalRisk, 'R3');
  assert.equal(plan.manualRejected, true);
});

test('resolveFinalRisk: AUTO=HIGH MANUAL=LOW → FINAL=HIGH', () => {
  const { finalRisk, manualRejected } = resolveFinalRisk('R3', 'LOW', {});
  assert.equal(finalRisk, 'R3');
  assert.equal(manualRejected, true);
});

test('resolveFinalRisk: AUTO=LOW MANUAL=HIGH → FINAL=HIGH', () => {
  const { finalRisk, manualApplied } = resolveFinalRisk('R0', 'HIGH', { riskSemantics: { HIGH: 'R3' } });
  assert.equal(finalRisk, 'R3');
  assert.equal(manualApplied, true);
});

test('unknown shared-core path → HIGH/R3 fail-safe', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/lib/unknown-new-module.js'] });
  assert.equal(plan.riskClass, 'R3');
  assert.equal(plan.verificationPlan.L3.required, true);
});

test('L1 uses explicit domain l1Tests not arbitrary slice order', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/middleware/authz.js'] });
  const l1 = plan.verificationPlan.L1.tests;
  assert.ok(l1.includes('test/authz.test.js'));
  assert.ok(l1.includes('test/revoked-access-contract.test.js'));
});

test('L2 domain tests are deterministic (sorted deduped)', () => {
  const a = routeChangedFiles(ROOT, { files: ['public/js/home-readiness.js'] });
  const b = routeChangedFiles(ROOT, { files: ['public/js/home-readiness.js'] });
  assert.deepEqual(a.verificationPlan.L2.tests, b.verificationPlan.L2.tests);
  const sorted = [...a.verificationPlan.L2.tests].sort();
  assert.deepEqual(a.verificationPlan.L2.tests, sorted);
});

test('duplicate tests deduplicated across domains', () => {
  const gate = resolveDomainGate(ROOT, ['family-authz', 'account-deletion']);
  const all = Object.values(gate.perDomain).flat();
  assert.equal(gate.tests.length, new Set(all).size);
});

test('HIGH missing required L1 → fail closed to L3', () => {
  const plan = buildVerificationPlan({
    riskClass: 'R3',
    globalCore: {
      riskClasses: {
        R3: {
          defaultVerification: ['L1', 'L2', 'L3', 'RELEASE_REVIEW'],
          independentReview: true,
          rollbackConsideration: true,
          dbInvariants: true,
        },
      },
      l1SmokeTests: [],
    },
    entry: { l3Command: 'npm run test:gate' },
    domainList: ['account-deletion'],
    domainTestIndex: { 'account-deletion': ['test/x.test.js'] },
    domainL1Index: { 'account-deletion': [] },
    hasUnsafeUnknown: false,
  });
  assert.equal(plan.failClosed, true);
  assert.equal(plan.failClosedReason, 'high_missing_domain_l1');
  assert.equal(plan.L3.required, true);
});

test('HIGH missing domain-focused L1 fails closed even when global smoke exists', () => {
  const plan = buildVerificationPlan({
    riskClass: 'R3',
    globalCore: {
      riskClasses: {
        R3: {
          defaultVerification: ['L1', 'L2', 'L3', 'RELEASE_REVIEW'],
          independentReview: true,
          rollbackConsideration: true,
          dbInvariants: true,
        },
      },
      l1SmokeTests: [
        'test/ci-test-manifest.test.js',
        'test/test-routing.test.js',
      ],
    },
    entry: { l3Command: 'npm run test:gate' },
    domainList: ['account-deletion'],
    domainTestIndex: { 'account-deletion': ['test/eea-launch-framework.test.js'] },
    domainL1Index: { 'account-deletion': [] },
    hasUnsafeUnknown: false,
  });
  assert.equal(plan.failClosed, true);
  assert.equal(plan.failClosedReason, 'high_missing_domain_l1');
  assert.equal(plan.L3.required, true);
  assert.ok(plan.L1.tests.includes('test/ci-test-manifest.test.js'));
  assert.ok(plan.L1.tests.includes('test/test-routing.test.js'));
  assert.deepEqual(plan.L1.domainsMissingFocusedL1, ['account-deletion']);
});

test('HIGH missing required L2 → fail closed to L3', () => {
  const plan = buildVerificationPlan({
    riskClass: 'R3',
    globalCore: {
      riskClasses: {
        R3: {
          defaultVerification: ['L1', 'L2', 'L3', 'RELEASE_REVIEW'],
          independentReview: true,
          rollbackConsideration: true,
          dbInvariants: true,
        },
      },
      l1SmokeTests: ['test/smoke.test.js'],
    },
    entry: { l3Command: 'npm run test:gate' },
    domainList: [],
    domainTestIndex: {},
    domainL1Index: {},
    hasUnsafeUnknown: false,
  });
  assert.equal(plan.failClosed, true);
  assert.equal(plan.L3.required, true);
});

test('base/head SHA diff resolution', () => {
  const { execSync } = require('node:child_process');
  const base = execSync('git rev-parse HEAD~1', { cwd: ROOT, encoding: 'utf8' }).trim();
  const head = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  const { collectChangedFiles } = require('../scripts/lib/test-routing/changed-files.mjs');
  const files = collectChangedFiles(ROOT, { baseSha: base, headSha: head });
  assert.ok(Array.isArray(files));
});

test('canonical L3 command remains npm run test:gate', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/auth/login.js'] });
  assert.equal(plan.verificationPlan.L3.command, 'npm run test:gate');
});

test('same input produces same classifier output (determinism)', () => {
  const input = { files: ['src/routes/family/account.js'] };
  const a = routeChangedFiles(ROOT, input);
  const b = routeChangedFiles(ROOT, input);
  assert.deepEqual({
    domains: a.domains,
    riskClass: a.riskClass,
    l1: a.verificationPlan.L1.tests,
    l2count: a.verificationPlan.L2.tests.length,
    l3: a.verificationPlan.L3.required,
  }, {
    domains: b.domains,
    riskClass: b.riskClass,
    l1: b.verificationPlan.L1.tests,
    l2count: b.verificationPlan.L2.tests.length,
    l3: b.verificationPlan.L3.required,
  });
});

test('P0.1 account deletion routing has complete domain L1 coverage', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/family/account.js'] });
  assert.equal(plan.riskClass, 'R3');
  assert.ok(plan.domains.includes('account-deletion'));
  assert.ok(plan.domains.includes('auth-security'));
  assert.ok(plan.domains.includes('parent-experience'));
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, true);
  assert.notEqual(plan.verificationPlan.failClosed, true);
  assert.equal(plan.verificationPlan.L1.domainsMissingFocusedL1, undefined);
  assert.ok(plan.verificationPlan.L1.tests.length > 0);
  assert.ok(plan.verificationPlan.L2.tests.length > 0);
});

test('synthetic P0.1 deletion classifier pilot', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/family/account.js'] });
  assert.ok(plan.domains.includes('account-deletion'));
  assert.ok(
    plan.domains.includes('family-authz') || plan.domains.includes('auth-security'),
    'deletion path should also touch authz domain',
  );
  assert.equal(plan.riskClass, 'R3');
  assert.equal(riskClassToTier(plan.riskClass), 'HIGH');
  assert.equal(plan.verificationPlan.L1.required, true);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, true);
  assert.equal(plan.verificationPlan.independentReview, true);
  assert.equal(plan.verificationPlan.rollbackConsideration, true);
  assert.equal(plan.verificationPlan.dbInvariants, true);
  assert.ok(plan.verificationPlan.L1.tests.length > 0);
});

test('Phase -1 PR self-classification is conservative (HIGH)', () => {
  const plan = routeChangedFiles(ROOT, {
    files: [
      'scripts/lib/test-routing/route.mjs',
      'config/process/global-core.json',
      '.github/workflows/ci.yml',
    ],
  });
  assert.equal(plan.riskClass, 'R3');
  assert.equal(plan.verificationPlan.L3.required, true);
});

test('all configured domains resolve explicit l1Tests', () => {
  const { overlay } = loadRoutingConfig(ROOT);
  const domains = overlay.domains || {};
  const { l1Index } = buildDomainTestIndex(ROOT, domains);
  const domainIds = Object.keys(domains).sort();
  assert.equal(domainIds.length, 18, 'expected 18 configured domains');
  for (const id of domainIds) {
    assert.ok(l1Index[id].length >= 1, `${id} should resolve at least one explicit l1Tests entry`);
  }
});

test('all Parent Experience domains resolve L2 tests', () => {
  const peDomains = [
    'family-authz',
    'account-deletion',
    'child-access',
    'push-recipients',
    'for-dig',
    'parent-home',
    'family-ui',
    'settings',
    'notifications',
    'rewards',
  ];
  for (const id of peDomains) {
    const gate = resolveDomainGate(ROOT, [id]);
    assert.ok(gate.tests.length >= 1, `${id} should resolve at least one L2 test`);
  }
});
