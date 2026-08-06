/**
 * RC-1 R3 — Puppeteer regression for parent bottom nav aria-label.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GATE = path.join(ROOT, 'scripts/parent-nav-aria-regression-gate.mjs');

describe('parent nav aria regression browser gate (RC-1 R3)', () => {
  it('parent-nav-aria-regression-gate passes', { timeout: 180_000 }, () => {
    if (!process.env.DATABASE_URL) {
      return;
    }
    const result = spawnSync(process.execPath, [GATE], {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        REQUIRE_EMAIL_VERIFICATION: 'false',
      },
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      assert.fail(
        `gate exit ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      );
    }
    const jsonStart = result.stdout.indexOf('{\n  "step": "parent-nav-aria-regression-gate"');
    assert.ok(jsonStart >= 0, 'missing gate JSON in stdout');
    const payload = JSON.parse(result.stdout.slice(jsonStart));
    assert.equal(payload.pass, true, JSON.stringify(payload.regression));
    assert.equal(payload.regression.staticNavEnGb, true);
    assert.equal(payload.regression.dynamicNavEnGb, true);
    assert.equal(payload.regression.localeChangeUpdates, true);
    assert.equal(payload.regression.svSeKeepsSwedish, true);
    assert.equal(payload.regression.singleNav, true);
    assert.equal(payload.regression.parentI18nReadyRefresh, true);
    assert.equal(payload.regression.parentI18nReadyEvent, true);
  });
});
