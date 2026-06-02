const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  prepareRowForExport,
  rowsToInsertSql,
} = require('../src/lib/sql-export-utils');
const { sortTablesForExport } = require('../src/lib/full-database-export-sql');

describe('sql-export-utils', () => {
  it('redacts sensitive columns', () => {
    const row = prepareRowForExport(
      { id: '1', email: 'a@b.se', password_hash: 'secret', name: 'Ada' },
      { redactSensitive: true }
    );
    assert.equal(row.password_hash, '[REDACTED]');
    assert.equal(row.email, 'a@b.se');
  });

  it('builds INSERT with ON CONFLICT when PK provided', () => {
    const lines = rowsToInsertSql('family', [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test' }], ['id']);
    assert.match(lines[0], /ON CONFLICT/);
    assert.match(lines[0], /INSERT INTO "family"/);
  });
});

describe('full-database-export-sql', () => {
  it('orders known tables before unknown alphabetically', () => {
    const ordered = sortTablesForExport(['zebra_table', 'family', 'parent', 'aaa_misc']);
    assert.equal(ordered[0], 'family');
    assert.equal(ordered[1], 'parent');
    assert.equal(ordered[2], 'aaa_misc');
    assert.equal(ordered[3], 'zebra_table');
  });
});
