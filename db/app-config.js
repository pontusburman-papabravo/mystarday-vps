/**
 * app_config key-value store (admin-managed rollout, toggles).
 * Does NOT own app_settings (payment/pricing) — see db/app-settings.js.
 */

const { query } = require('../src/lib/db');

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
  const { rows } = await query('SELECT value FROM app_config WHERE key = $1', [key]);
  return normalizeStoredValue(rows[0]?.value ?? null);
}

async function set(key, value, { description, updatedBy } = {}) {
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
  const { rows } = await query(
    'SELECT key, value, description, updated_at FROM app_config ORDER BY key ASC'
  );
  return rows;
}

module.exports = { get, set, getAll };
