'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

describe('db snapshot specs', () => {
  test('fingerprint columns exclude PII denylist', async () => {
    const { PII_FIELD_DENYLIST, SNAPSHOT_TABLE_SPECS } = await import('../scripts/ops/lib/snapshot-tables.mjs');
    for (const spec of SNAPSHOT_TABLE_SPECS) {
      for (const col of spec.fingerprintColumns) {
        assert.equal(PII_FIELD_DENYLIST.has(col), false, `${spec.table}.${col}`);
      }
    }
  });

  test('compare detects row_count drift', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      tables: {
        family: { exists: true, row_count: 10, row_fingerprint_sha256: 'f1' },
        _migrations: { exists: true, row_count: 5 },
      },
    };
    const after = {
      database_identity_hash: 'abc',
      tables: {
        family: { exists: true, row_count: 9, row_fingerprint_sha256: 'f1' },
        _migrations: { exists: true, row_count: 6 },
      },
    };
    const result = compareDbSnapshots(before, after);
    assert.equal(result.ok, false);
    assert.ok(result.drift.some((d) => d.table === 'family'));
  });
});

describe('snapshot JSON output', () => {
  test('serialized snapshot has no email field names at top level', async (t) => {
    const url = process.env.DATABASE_URL;
    if (!url || /mock_test/i.test(url)) {
      t.skip('DATABASE_URL not set');
      return;
    }
    if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
      t.skip('requires localhost DATABASE_URL');
      return;
    }
    const { captureDbIntegritySnapshot } = await import('../scripts/ops/lib/db-integrity-snapshot-core.mjs');
    const snap = await captureDbIntegritySnapshot(url, { label: 'test' });
    const json = JSON.stringify(snap);
    assert.doesNotMatch(json, /"email"/i);
    assert.doesNotMatch(json, /password_hash/i);
  });
});
