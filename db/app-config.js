/**
 * app_config key-value store (admin-managed rollout, toggles).
 * Does NOT own app_settings (payment/pricing) — see db/app-settings.js.
 */

const { query } = require('../src/lib/db');

let ensureTablePromise = null;

function ensureTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by UUID REFERENCES parent(id) ON DELETE SET NULL
      )
    `).catch((err) => {
      ensureTablePromise = null;
      throw err;
    });
  }
  return ensureTablePromise;
}

function normalizeStoredValue(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

async function get(key) {
  await ensureTable();
  const { rows } = await query('SELECT value FROM app_config WHERE key = $1', [key]);
  return normalizeStoredValue(rows[0]?.value ?? null);
}

async function getEntry(key) {
  await ensureTable();
  const { rows } = await query(
    'SELECT key, value, description, updated_at, updated_by FROM app_config WHERE key = $1',
    [key]
  );
  const row = rows[0];
  if (!row) return null;
  return { ...row, value: normalizeStoredValue(row.value) };
}

async function set(key, value, { description, updatedBy } = {}) {
  await ensureTable();
  const { rows } = await query(
    `INSERT INTO app_config (key, value, description, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           description = COALESCE(EXCLUDED.description, app_config.description),
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
     RETURNING *`,
    [key, value, description ?? null, updatedBy ?? null]
  );
  return rows[0];
}

async function getAll() {
  await ensureTable();
  const { rows } = await query(
    'SELECT key, value, description, updated_at FROM app_config ORDER BY key ASC'
  );
  return rows.map((row) => ({ ...row, value: normalizeStoredValue(row.value) }));
}

module.exports = { get, getEntry, set, getAll, ensureTable };
