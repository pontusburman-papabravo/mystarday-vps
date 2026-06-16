const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseEnvLine, diagnoseDatabaseUrl } = require('../src/lib/load-env');

describe('load-env', () => {
  test('parseEnvLine handles export prefix', () => {
    const p = parseEnvLine('export DATABASE_URL=postgres://localhost/db');
    assert.equal(p.key, 'DATABASE_URL');
    assert.equal(p.val, 'postgres://localhost/db');
  });

  test('parseEnvLine strips inline comments from unquoted values', () => {
    const p = parseEnvLine(
      'ACTIVATION_PROGRAM_LAUNCH_AT=2026-06-10T06:00:00Z # välj er faktiska go-live-tid (UTC)'
    );
    assert.equal(p.key, 'ACTIVATION_PROGRAM_LAUNCH_AT');
    assert.equal(p.val, '2026-06-10T06:00:00Z');
  });

  test('sanitizeEnvValue strips systemd-style polluted timestamps', () => {
    const { sanitizeEnvValue } = require('../src/lib/load-env');
    assert.equal(
      sanitizeEnvValue('2026-06-10T06:00:00Z # välj er faktiska go-live-tid (UTC)'),
      '2026-06-10T06:00:00Z'
    );
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
