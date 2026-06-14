const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseEnvLine, diagnoseDatabaseUrl } = require('../src/lib/load-env');

describe('load-env', () => {
  test('parseEnvLine handles export prefix', () => {
    const p = parseEnvLine('export DATABASE_URL=postgres://localhost/db');
    assert.equal(p.key, 'DATABASE_URL');
    assert.equal(p.val, 'postgres://localhost/db');
  });

  test('parseEnvLine strips quotes', () => {
    const p = parseEnvLine('JWT_SECRET="abc-def"');
    assert.equal(p.val, 'abc-def');
  });

  test('diagnoseDatabaseUrl rejects empty', () => {
    assert.equal(diagnoseDatabaseUrl('').code, 'empty');
  });

  test('diagnoseDatabaseUrl rejects user without password on remote host', () => {
    const d = diagnoseDatabaseUrl('postgresql://user@db.example.com/neondb');
    assert.equal(d.code, 'no_password');
  });

  test('diagnoseDatabaseUrl accepts localhost without password', () => {
    assert.equal(diagnoseDatabaseUrl('postgresql://user@localhost/stjarndag').ok, true);
  });
});
