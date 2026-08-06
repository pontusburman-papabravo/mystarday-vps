'use strict';

const db = require('../src/lib/db');

async function insertDevice(row) {
  const result = await db.query(
    `INSERT INTO family_trusted_device (
       family_id, created_by_parent_id, device_mode, default_child_id,
       last_active_child_id, token_hash, platform, label
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, family_id, device_mode, default_child_id, platform, label, trusted_at`,
    [
      row.family_id,
      row.created_by_parent_id,
      row.device_mode,
      row.default_child_id,
      row.last_active_child_id || row.default_child_id,
      row.token_hash,
      row.platform || null,
      row.label || null,
    ]
  );
  return result.rows[0];
}

async function findByTokenHash(tokenHash) {
  const result = await db.query(
    `SELECT id, family_id, created_by_parent_id, device_mode, default_child_id,
            last_active_child_id, token_hash, platform, label, trusted_at, last_seen_at, revoked_at
     FROM family_trusted_device
     WHERE token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function findById(deviceId) {
  const result = await db.query(
    `SELECT id, family_id, created_by_parent_id, device_mode, default_child_id,
            last_active_child_id, token_hash, platform, label, trusted_at, last_seen_at, revoked_at
     FROM family_trusted_device
     WHERE id = $1`,
    [deviceId]
  );
  return result.rows[0] || null;
}

async function listActiveForFamily(familyId) {
  const result = await db.query(
    `SELECT d.id, d.device_mode, d.default_child_id, d.last_active_child_id,
            d.platform, d.label, d.trusted_at, d.last_seen_at,
            c.name AS child_name, c.emoji AS child_emoji
     FROM family_trusted_device d
     LEFT JOIN child c ON c.id = d.default_child_id
     WHERE d.family_id = $1 AND d.revoked_at IS NULL
     ORDER BY d.trusted_at DESC`,
    [familyId]
  );
  return result.rows;
}

async function revokeForFamily(deviceId, familyId) {
  const existing = await db.query(
    `SELECT id, last_refresh_token_id FROM family_trusted_device
     WHERE id = $1 AND family_id = $2 AND revoked_at IS NULL`,
    [deviceId, familyId]
  );
  const row = existing.rows[0];
  if (!row) return null;
  if (row.last_refresh_token_id) {
    await db.query('DELETE FROM refresh_token WHERE id = $1', [row.last_refresh_token_id]);
  }
  const result = await db.query(
    `UPDATE family_trusted_device
     SET revoked_at = NOW(), last_refresh_token_id = NULL
     WHERE id = $1
     RETURNING id`,
    [deviceId]
  );
  return result.rows[0] || null;
}

async function revokeAllForFamily(familyId) {
  await db.query(
    `UPDATE family_trusted_device
     SET revoked_at = NOW(), last_refresh_token_id = NULL
     WHERE family_id = $1 AND revoked_at IS NULL`,
    [familyId]
  );
}

async function touchLastSeen(deviceId) {
  await db.query(
    `UPDATE family_trusted_device SET last_seen_at = NOW() WHERE id = $1`,
    [deviceId]
  );
}

async function setLastActiveChild(deviceId, childId) {
  await db.query(
    `UPDATE family_trusted_device SET last_active_child_id = $2, last_seen_at = NOW() WHERE id = $1`,
    [deviceId, childId]
  );
}

async function setLastRefreshTokenId(deviceId, refreshTokenId) {
  await db.query(
    `UPDATE family_trusted_device SET last_refresh_token_id = $2 WHERE id = $1`,
    [deviceId, refreshTokenId]
  );
}

async function revokeAllForFamilyWithTokens(familyId) {
  const rows = await db.query(
    `SELECT id, last_refresh_token_id FROM family_trusted_device
     WHERE family_id = $1 AND revoked_at IS NULL`,
    [familyId]
  );
  for (const row of rows.rows) {
    if (row.last_refresh_token_id) {
      await db.query('DELETE FROM refresh_token WHERE id = $1', [row.last_refresh_token_id]);
    }
  }
  await revokeAllForFamily(familyId);
}

module.exports = {
  insertDevice,
  findByTokenHash,
  findById,
  listActiveForFamily,
  revokeForFamily,
  revokeAllForFamily,
  revokeAllForFamilyWithTokens,
  touchLastSeen,
  setLastActiveChild,
  setLastRefreshTokenId,
};
