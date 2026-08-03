'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { RC1_SMOKE_BLOCKED_EXIT_CODE } = require('../../scripts/lib/rc1-english-smoke-env');

const runner = path.join(__dirname, '..', '..', 'scripts', 'run-e2e-rc1-prod-smoke.js');

function runRunner(env) {
  return spawnSync(process.execPath, [runner], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

describe('run-e2e-rc1-prod-smoke blocked preflight', () => {
  it('exits blocked exit code when base URL is missing (not exit 0)', () => {
    const result = runRunner({
      RC1_SMOKE_BASE_URL: '',
      E2E_BASE_URL: '',
    });
    assert.equal(result.status, RC1_SMOKE_BLOCKED_EXIT_CODE);
    assert.match(result.stdout + result.stderr, /BLOCKED/);
    assert.doesNotMatch(result.stdout + result.stderr, /5\/5 OK/);
  });

  it('exits 1 when base URL embeds credentials (fail, not pass)', () => {
    const result = runRunner({
      RC1_SMOKE_BASE_URL: 'https://user:secret@example.test',
    });
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /must not embed credentials/);
  });
});
