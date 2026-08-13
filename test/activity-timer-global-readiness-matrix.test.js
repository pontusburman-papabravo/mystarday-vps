'use strict';

/**
 * Activity Timer Global Readiness — maps 24 normative scenarios to automated coverage.
 * Product rules unchanged: opt-in per child, default OFF, timer is support not coercion.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function assertCoverage(label, files) {
  const missing = files.filter((f) => !exists(f));
  assert.deepEqual(missing, [], `${label}: missing coverage files: ${missing.join(', ')}`);
}

const SCENARIO_MATRIX = Object.freeze([
  {
    id: 1,
    scenario: 'master OFF + duration → no timer',
    coverage: [
      'test/activity-timer-readiness.integration.test.js',
      'test/activity-timer-child-api.integration.test.js',
    ],
  },
  {
    id: 2,
    scenario: 'master ON + duration → timer',
    coverage: [
      'test/activity-timer-readiness.integration.test.js',
      'test/activity-timer-child-api.integration.test.js',
    ],
  },
  { id: 3, scenario: 'start', coverage: ['test/activity-timer-session.test.js'] },
  { id: 4, scenario: 'pause', coverage: ['test/activity-timer-session.test.js'] },
  {
    id: 5,
    scenario: 'refresh paused',
    coverage: ['test/activity-timer-session.test.js'],
    sourceMustMatch: [/reload mid-timer|paused remaining stable/i],
  },
  { id: 6, scenario: 'resume', coverage: ['test/activity-timer-session.test.js'] },
  { id: 7, scenario: 'stop', coverage: ['test/activity-timer-session.test.js'] },
  { id: 8, scenario: 'countdown finish', coverage: ['test/activity-timer-session.test.js'] },
  {
    id: 9,
    scenario: 'Klar before timer finish',
    coverage: ['test/activity-timer-session.test.js'],
    sourceMustMatch: [/clearSession removes key \(Klar path\)/],
  },
  {
    id: 10,
    scenario: 'completion cleanup',
    coverage: ['test/activity-timer-session.test.js'],
    sourceMustMatch: [/clearSessionsForDailyLogItem/],
  },
  {
    id: 11,
    scenario: 'single timed substep',
    coverage: ['test/activity-timer-session.test.js', 'test/activity-timer-click-layout.test.js'],
  },
  {
    id: 12,
    scenario: 'multiple timed substeps',
    coverage: ['test/activity-timer-session.test.js', 'test/activity-timer-click-layout.test.js'],
  },
  {
    id: 13,
    scenario: 'parent timer hidden with timed substeps',
    coverage: ['test/activity-timer-click-layout.test.js'],
    sourceMustMatch: [/hides parent timer when timed substeps exist/],
  },
  {
    id: 14,
    scenario: 'no-duration activity',
    coverage: ['test/activity-timer.test.js', 'test/activity-timer-readiness.integration.test.js'],
  },
  {
    id: 15,
    scenario: 'sibling isolation',
    coverage: [
      'test/activity-timer-session.test.js',
      'test/activity-timer-readiness.integration.test.js',
    ],
  },
  {
    id: 16,
    scenario: 'profile switch',
    coverage: ['test/activity-timer-session.test.js'],
    sourceMustMatch: [/siblings do not share timer state|different childId/i],
  },
  {
    id: 17,
    scenario: 'date rollover',
    coverage: ['test/activity-timer-session.test.js'],
    sourceMustMatch: [/old schedule date does not leak/i],
  },
  {
    id: 18,
    scenario: 'stale local/session storage',
    coverage: ['test/activity-timer-session.test.js'],
    sourceMustMatch: [/corrupt localStorage|pruneSessions/],
  },
  {
    id: 19,
    scenario: 'iPhone viewport',
    coverage: ['test/activity-timer-click-layout.test.js', 'scripts/ops/activity-timer-prod-pilot-core.cjs'],
    sourceMustMatch: [/iphone-390x844|390, height: 844|390x844/],
  },
  {
    id: 20,
    scenario: 'Android viewport',
    coverage: ['test/activity-timer-click-layout.test.js', 'scripts/ops/activity-timer-prod-pilot-core.cjs'],
    sourceMustMatch: [/android-412x915|412, height: 915|412x915/],
  },
  {
    id: 21,
    scenario: 'Wake Lock unavailable',
    coverage: ['test/activity-timer-click-layout.test.js'],
    sourceMustMatch: [/syncScreenWakeLock/, /wakeLock/],
  },
  {
    id: 22,
    scenario: 'repeated rapid user actions',
    coverage: ['test/activity-timer-session.test.js'],
    sourceMustMatch: [/idempotent|double resume|start is idempotent/],
  },
  {
    id: 23,
    scenario: 'no console errors',
    coverage: ['scripts/ops/activity-timer-prod-pilot-core.cjs'],
    sourceMustMatch: [/NO_UNEXPECTED_5XX/],
  },
  {
    id: 24,
    scenario: 'no unexpected API 4xx/5xx',
    coverage: [
      'scripts/ops/activity-timer-prod-pilot-core.cjs',
      'test/activity-timer-readiness.integration.test.js',
    ],
  },
]);

test('activity timer global readiness matrix: all 24 scenarios mapped', () => {
  assert.equal(SCENARIO_MATRIX.length, 24);
  const ids = SCENARIO_MATRIX.map((r) => r.id);
  assert.deepEqual(ids, [...Array(24)].map((_, i) => i + 1));
});

for (const row of SCENARIO_MATRIX) {
  test(`scenario ${row.id}: ${row.scenario}`, () => {
    assertCoverage(`scenario ${row.id}`, row.coverage);
    if (row.sourceMustMatch) {
      const combined = row.coverage.map((f) => read(f)).join('\n');
      for (const re of row.sourceMustMatch) {
        assert.match(combined, re, `scenario ${row.id}: pattern ${re}`);
      }
    }
  });
}

test('gate manifest lists activity timer readiness tests', () => {
  const manifest = read('scripts/lib/pre-public-release-gate/manifest.cjs');
  assert.match(manifest, /activity-timer-global-readiness-matrix\.test\.js/);
  assert.match(manifest, /activity-timer-readiness\.integration\.test\.js/);
  assert.match(manifest, /activity-timer-prod-pilot-harness\.test\.js/);
});

test('release-readiness exposes activity timer rollout fields', () => {
  const src = read('src/routes/admin/system.js');
  assert.match(src, /activityTimerV2Disabled/);
  assert.match(src, /activityTimerV2Available/);
  assert.match(src, /isRolloutDisabled/);
});

test('prod gate checks activity timer runtime availability', () => {
  const prod = read('scripts/lib/pre-public-release-gate/prod.cjs');
  assert.match(prod, /checkProdActivityTimerRuntime/);
  const gate = read('scripts/pre-public-release-gate.mjs');
  assert.match(gate, /buildActivityTimerSection/);
});

test('legacy Puppeteer VPS acceptance is advisory — not a public-runtime gate blocker', () => {
  const runbook = read('docs/runbooks/PRE-PUBLIC-RELEASE-GATE.md');
  assert.match(runbook, /ADVISORY/i);
  assert.match(runbook, /at-pilot/i);
  assert.match(runbook, /libatk|GUI/i);
  const gate = read('scripts/pre-public-release-gate.mjs');
  assert.match(gate, /Puppeteer VPS smoke is advisory/i);
  const legacy = read('scripts/activity-timer-prod-acceptance-gate.mjs');
  assert.match(legacy, /ADVISORY/i);
  assert.doesNotMatch(gate, /activity-timer-prod-acceptance-gate/);
});

test('fixture never mass-enables activity_timers_enabled', () => {
  const fixture = read('scripts/ops/activity-timer-qa-fixture.cjs');
  assert.match(fixture, /activity_timers_enabled[\s\S]{0,120}false/);
  assert.doesNotMatch(fixture, /UPDATE child SET activity_timers_enabled = true WHERE family_id/);
});
