/**
 * Shared SQL literal escaping and INSERT generation for exports.
 */

/** Column names redacted in full-database exports (values → literal '[REDACTED]'). */
const REDACTED_COLUMN_NAMES = new Set([
  'password_hash',
  'token_hash',
  'native_token',
]);

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

function escapeString(str) {
  return String(str).replace(/'/g, "''");
}

function sqlLiteral(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return 'NULL';
    return String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'::timestamptz`;
  }
  if (Buffer.isBuffer(val)) {
    return `'\\\\x${val.toString('hex')}'`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return `'{}'`;
    const parts = val.map((item) => {
      if (item === null) return 'NULL';
      return `"${escapeString(item).replace(/"/g, '\\"')}"`;
    });
    return `'${`{${parts.join(',')}}`}'`;
  }
  if (typeof val === 'object') {
    return `'${escapeString(JSON.stringify(val))}'::jsonb`;
  }
  const s = String(val);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return `'${s}'::uuid`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `'${s}'::date`;
  }
  return `'${escapeString(s)}'`;
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ redactSensitive?: boolean }} [opts]
 */
function prepareRowForExport(row, opts = {}) {
  if (!opts.redactSensitive) return row;
  const out = { ...row };
  for (const key of Object.keys(out)) {
    if (REDACTED_COLUMN_NAMES.has(key.toLowerCase())) {
      out[key] = '[REDACTED]';
    }
  }
  return out;
}

/**
 * @param {string} table
 * @param {Record<string, unknown>[]} rows
 * @param {string[]|null} conflictCols — primary key columns; null = plain INSERT
 */
function rowsToInsertSql(table, rows, conflictCols) {
  if (!rows.length) return [];
  const columns = Object.keys(rows[0]);
  const colList = columns.map(quoteIdent).join(', ');
  const lines = [];

  for (const row of rows) {
    const values = columns.map((c) => sqlLiteral(row[c])).join(', ');
    if (conflictCols && conflictCols.length > 0) {
      const conflict = conflictCols.map(quoteIdent).join(', ');
      lines.push(
        `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${values}) ON CONFLICT (${conflict}) DO NOTHING;`
      );
    } else {
      lines.push(`INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${values});`);
    }
  }
  return lines;
}

module.exports = {
  REDACTED_COLUMN_NAMES,
  quoteIdent,
  escapeString,
  sqlLiteral,
  prepareRowForExport,
  rowsToInsertSql,
};
