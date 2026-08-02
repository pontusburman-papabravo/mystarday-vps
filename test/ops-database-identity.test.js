'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

describe('database identity', () => {
  test('hash is stable and excludes password', async () => {
    const { databaseIdentityHash } = await import('../scripts/ops/lib/database-identity.mjs');
    const a = databaseIdentityHash('postgresql://user:secret@db.example.com:5432/mydb');
    const b = databaseIdentityHash('postgresql://user:othersecret@db.example.com:5432/mydb');
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });

  test('localhost uses ssl=false in fingerprint', async () => {
    const { parseDatabaseUrlSafe } = await import('../scripts/ops/lib/database-identity.mjs');
    const id = parseDatabaseUrlSafe('postgresql://u:p@localhost:5432/stjarndag');
    assert.equal(id.ssl, false);
  });
});
