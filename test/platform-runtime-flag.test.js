'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');

describe('platform_runtime_enabled — rollout safety', () => {
  it('migration seeds flag default OFF', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1808950000000_platform_runtime.js'),
      'utf8'
    );
    assert.match(src, /VALUES \(\$1, false, \$2\)/);
    assert.match(src, /ON CONFLICT \(key\) DO NOTHING/);
  });

  it('isRuntimeEnabled returns false when DB flag is off', async () => {
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      if (String(sql).includes('platform_runtime_enabled')) {
        return { rows: [{ enabled: false }] };
      }
      return { rows: [] };
    });

    const runtimePath = require.resolve('../src/lib/platform-runtime/orchestrator');
    delete require.cache[runtimePath];
    const { isRuntimeEnabled } = require(runtimePath);

    assert.equal(await isRuntimeEnabled(), false);
  });

  it('isRuntimeEnabled returns false when flag row is missing', async () => {
    const mock = injectMockDb();
    mock.setQuery(async () => ({ rows: [] }));

    const runtimePath = require.resolve('../src/lib/platform-runtime/orchestrator');
    delete require.cache[runtimePath];
    const { isRuntimeEnabled } = require(runtimePath);

    assert.equal(await isRuntimeEnabled(), false);
  });

  it('platform-feedback routes return 503 when runtime is off', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/platform-feedback.js'),
      'utf8'
    );
    assert.match(src, /503/);
    assert.match(src, /isRuntimeEnabled/);
    assert.match(src, /Platform Runtime ej aktiverat/);
  });

  it('handleActivityComplete skips when runtime is disabled', async () => {
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      if (String(sql).includes('platform_runtime_enabled')) {
        return { rows: [{ enabled: false }] };
      }
      return { rows: [] };
    });

    const runtimePath = require.resolve('../src/lib/platform-runtime/orchestrator');
    delete require.cache[runtimePath];
    const { handleActivityComplete } = require(runtimePath);

    const result = await handleActivityComplete({
      childId: 'child-1',
      familyId: 'fam-1',
      dailyLogItemId: 'item-1',
    });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'runtime_disabled');
  });

  it('env PLATFORM_RUNTIME_ENABLED=false forces runtime off', async () => {
    const prev = process.env.PLATFORM_RUNTIME_ENABLED;
    process.env.PLATFORM_RUNTIME_ENABLED = 'false';

    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      if (String(sql).includes('platform_runtime_enabled')) {
        return { rows: [{ enabled: true }] };
      }
      return { rows: [] };
    });

    const runtimePath = require.resolve('../src/lib/platform-runtime/orchestrator');
    delete require.cache[runtimePath];
    const { isRuntimeEnabled } = require(runtimePath);

    try {
      assert.equal(await isRuntimeEnabled(), false);
    } finally {
      process.env.PLATFORM_RUNTIME_ENABLED = prev;
      delete require.cache[runtimePath];
    }
  });
});
