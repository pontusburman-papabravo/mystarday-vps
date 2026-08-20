'use strict';

/**
 * family_entitlements DB access.
 */
const db = require('../src/lib/db');
const { PREMIUM_ENTITLEMENT_KEY } = require('../config/entitlements');

async function listByFamily(familyId, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const { rows } = await q(
    `SELECT *
     FROM family_entitlements
     WHERE family_id = $1
     ORDER BY granted_at ASC`,
    [familyId]
  );
  return rows;
}

async function listActiveByFamily(familyId, entitlementKey = PREMIUM_ENTITLEMENT_KEY, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const { rows } = await q(
    `SELECT *
     FROM family_entitlements
     WHERE family_id = $1
       AND entitlement_key = $2
       AND revoked_at IS NULL
     ORDER BY granted_at ASC`,
    [familyId, entitlementKey]
  );
  return rows;
}

async function upsertGrandfathered(familyId, { client = null, metadata = {} } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const { rows } = await q(
    `INSERT INTO family_entitlements (
       family_id, entitlement_key, source, source_reference, status,
       starts_at, expires_at, metadata
     )
     VALUES ($1, $2, 'grandfathered', 'payment_start_cutoff', 'grandfathered', NOW(), NULL, $3::jsonb)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [familyId, PREMIUM_ENTITLEMENT_KEY, JSON.stringify(metadata)]
  );
  if (rows[0]) return rows[0];

  const existing = await q(
    `SELECT * FROM family_entitlements
     WHERE family_id = $1 AND entitlement_key = $2 AND source = 'grandfathered' AND revoked_at IS NULL
     LIMIT 1`,
    [familyId, PREMIUM_ENTITLEMENT_KEY]
  );
  return existing.rows[0] || null;
}

async function upsertStoreEntitlement(familyId, payload, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const {
    source,
    status,
    startsAt = null,
    expiresAt = null,
    sourceReference = null,
    metadata = {},
  } = payload;

  await q(
    `UPDATE family_entitlements
     SET revoked_at = NOW(), updated_at = NOW()
     WHERE family_id = $1
       AND entitlement_key = $2
       AND source IN ('apple', 'google')
       AND revoked_at IS NULL`,
    [familyId, PREMIUM_ENTITLEMENT_KEY]
  );

  const { rows } = await q(
    `INSERT INTO family_entitlements (
       family_id, entitlement_key, source, source_reference, status,
       starts_at, expires_at, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING *`,
    [
      familyId,
      PREMIUM_ENTITLEMENT_KEY,
      source,
      sourceReference,
      status,
      startsAt,
      expiresAt,
      JSON.stringify(metadata),
    ]
  );
  return rows[0];
}

async function revokeStoreEntitlement(familyId, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  await q(
    `UPDATE family_entitlements
     SET status = 'expired', revoked_at = NOW(), updated_at = NOW()
     WHERE family_id = $1
       AND entitlement_key = $2
       AND source IN ('apple', 'google')
       AND revoked_at IS NULL`,
    [familyId, PREMIUM_ENTITLEMENT_KEY]
  );
}

async function upsertAdminGrant(familyId, payload, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const { expiresAt, permanent, sourceReference, metadata = {} } = payload;

  await q(
    `UPDATE family_entitlements
     SET revoked_at = NOW(), updated_at = NOW()
     WHERE family_id = $1
       AND entitlement_key = $2
       AND source = 'admin'
       AND revoked_at IS NULL`,
    [familyId, PREMIUM_ENTITLEMENT_KEY]
  );

  const { rows } = await q(
    `INSERT INTO family_entitlements (
       family_id, entitlement_key, source, source_reference, status,
       starts_at, expires_at, metadata
     )
     VALUES ($1, $2, 'admin', $3, 'active', NOW(), $4, $5::jsonb)
     RETURNING *`,
    [
      familyId,
      PREMIUM_ENTITLEMENT_KEY,
      sourceReference || (permanent ? 'permanent' : 'temporary'),
      permanent ? null : expiresAt,
      JSON.stringify({ ...metadata, permanent: !!permanent }),
    ]
  );
  return rows[0];
}

async function upsertGiftEntitlement(familyId, payload, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const {
    startsAt,
    expiresAt,
    sourceReference,
    metadata = {},
  } = payload;

  const { rows } = await q(
    `INSERT INTO family_entitlements (
       family_id, entitlement_key, source, source_reference, status,
       starts_at, expires_at, metadata
     )
     VALUES ($1, $2, 'gift', $3, 'gift', $4, $5, $6::jsonb)
     RETURNING *`,
    [
      familyId,
      PREMIUM_ENTITLEMENT_KEY,
      sourceReference,
      startsAt,
      expiresAt,
      JSON.stringify(metadata),
    ]
  );
  return rows[0];
}

module.exports = {
  listByFamily,
  listActiveByFamily,
  upsertGrandfathered,
  upsertStoreEntitlement,
  revokeStoreEntitlement,
  upsertAdminGrant,
  upsertGiftEntitlement,
};
