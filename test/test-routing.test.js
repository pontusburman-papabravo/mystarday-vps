'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const {
  matchGlob,
  mapFileToDomains,
  classifyUnknownFile,
  resolveDomainTests,
} = require('../scripts/lib/test-routing/config.mjs');

const { classifyRisk, riskToRecommendedLevel } = require('../scripts/lib/test-routing/risk.mjs');
const { routeChangedFiles, resolveDomainGate, dedupeTests } = require('../scripts/lib/test-routing/route.mjs');
const { generateStoreManualDelta } = require('../scripts/lib/store-manual-delta/generate.mjs');

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

test('routeChangedFiles unknown critical recommends L3', () => {
  const plan = routeChangedFiles(ROOT, { files: ['server.js'] });
  assert.equal(plan.recommendedLevel, 'L3');
  assert.ok(plan.reason.some((r) => r.includes('unknown_fail_safe')));
  assert.equal(plan.tests.length, 0);
});

test('routeChangedFiles known auth path maps domain and R3/L3', () => {
  const plan = routeChangedFiles(ROOT, { files: ['src/routes/auth/login.js'] });
  assert.ok(plan.domains.includes('auth-security'));
  assert.equal(plan.meta.riskClass, 'R3');
  assert.equal(plan.recommendedLevel, 'L3');
  assert.equal(plan.meta.l3Command, 'npm run test:gate');
});

test('routeChangedFiles docs-only suggests R0/L1', () => {
  const plan = routeChangedFiles(ROOT, { files: ['docs/process/GLOBAL_CORE.md'] });
  assert.equal(plan.meta.riskClass, 'R0');
  assert.equal(plan.recommendedLevel, 'L1');
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
  const delta = generateStoreManualDelta(ROOT, {
    changedPaths: ['ios/App/AppDelegate.swift'],
    profile: 'apple',
    nativeRelease: true,
  });
  assert.ok(delta.items.some((i) => i.id === 'apple-select-build'));
  assert.ok(delta.actionCount >= 1);
});

test('store manual delta unknown path triggers manual review', () => {
  const delta = generateStoreManualDelta(ROOT, {
    changedPaths: ['totally/unknown/module.js'],
    profile: 'both',
  });
  assert.equal(delta.status, 'MANUAL_REVIEW_REQUIRED');
  assert.ok(delta.unknownPaths.includes('totally/unknown/module.js'));
});

test('store manual delta iap change includes iap items', () => {
  const delta = generateStoreManualDelta(ROOT, {
    changedPaths: ['public/js/iap-manager.js'],
    profile: 'apple',
  });
  assert.ok(delta.items.some((i) => i.id === 'apple-iap-metadata'));
});
