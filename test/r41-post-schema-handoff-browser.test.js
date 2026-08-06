/**
 * R4.1 — Puppeteer browser gate (emulated mobile; not physical iPhone/Android).
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GATE = path.join(ROOT, 'scripts/r41-post-schema-handoff-browser-gate.mjs');

describe('R4.1 post-schema handoff browser gate', () => {
  it('r41-post-schema-handoff-browser-gate passes at 390×844 and 412×915', { timeout: 180_000 }, () => {
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
    const jsonStart = result.stdout.indexOf('{\n  "step": "r41-post-schema-handoff-browser-gate"');
    assert.ok(jsonStart >= 0, 'missing gate JSON in stdout');
    const payload = JSON.parse(result.stdout.slice(jsonStart));
    assert.equal(payload.pass, true, JSON.stringify(payload.results));
    assert.equal(payload.results['390x844'].pass, true);
    assert.equal(payload.results['412x915'].pass, true);
  });
});
