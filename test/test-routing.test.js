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
} = require('../scripts/lib/test-routing/config.mjs');

const { classifyRisk, riskToRecommendedLevel } = require('../scripts/lib/test-routing/risk.mjs');
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

test('R3 cumulative plan includes L2, L3, and releaseReview', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/auth/login.js'] });
  assert.equal(plan.riskClass, 'R3');
  assert.equal(plan.verificationPlan.L1.required, false);
  assert.equal(plan.verificationPlan.L2.required, true);
  assert.equal(plan.verificationPlan.L3.required, true);
  assert.equal(plan.verificationPlan.releaseReview, true);
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

test('unknown critical path fail-safe plan with L2_NOT_RESOLVED', () => {
  const plan = routeChangedFiles(ROOT, { files: ['server.js'] });
  assert.equal(plan.verificationPlan.L3.required, true);
  assert.equal(plan.verificationPlan.L2.l2NotResolved, true);
  assert.ok(plan.reason.includes('L2_NOT_RESOLVED'));
  assert.ok(plan.verificationPlan.L1.tests.length > 0, 'L1 smoke still present for R1 unknown critical');
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
    hasUnsafeUnknown: false,
  });
  assert.equal(plan.L2.l2NotResolved, true);
  assert.equal(plan.L3.required, true);
});
