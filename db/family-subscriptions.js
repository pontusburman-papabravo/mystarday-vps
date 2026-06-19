/**
 * Family subscription queries.
 * Owns: reading/writing family_subscriptions table, component logic.
 * Does NOT own: Stripe integration, middleware enforcement.
 */

const db = require('../src/lib/db');

/**
 * Create a new subscription for a fresh family (called at registration).
 * Sets tier='trial' with 14-day expiry and basic_app component.
 *
 * @param {number} familyId
 * @returns {Promise<object>} inserted row
 */
async function createForNewFamily(familyId) {
  const { rows } = await db.query(
    `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
     VALUES ($1, 'trial', NOW() + INTERVAL '14 days', $2)
     RETURNING *`,
    [
      familyId,
      JSON.stringify([{ component: 'basic_app', granted_at: new Date().toISOString(), expires_at: null }]),
    ]
  );
  return rows[0];
}

/**
 * Backfill lifetime_free for an existing family that wasn't migrated.
 * Used only for edge cases — most families are migrated by the migration script.
 *
 * @param {number} familyId
 */
async function grantLifetimeFree(familyId) {
  await db.query(
    `INSERT INTO family_subscriptions (family_id, tier, components)
     VALUES ($1, 'lifetime_free', $2)
     ON CONFLICT (family_id) DO NOTHING`,
    [
      familyId,
      JSON.stringify([{ component: 'basic_app', granted_at: new Date().toISOString(), expires_at: null }]),
    ]
  );
}

/**
 * Check if a family has a specific component.
 * Uses the has_component() SQL function for efficiency.
 *
 * @param {number} familyId
 * @param {string} componentName
 * @returns {Promise<boolean>}
 */
async function hasComponent(familyId, componentName) {
  const { rows } = await db.query(
    'SELECT has_component($1, $2) AS result',
    [familyId, componentName]
  );
  return rows[0]?.result ?? false;
}

/**
 * True only when component exists with state=active (write access).
 * @param {number} familyId
 * @param {string} componentName
 */
async function hasActiveComponent(familyId, componentName) {
  const sub = await getByFamilyId(familyId);
  if (!sub) return componentName === 'basic_app';

  const entry = (sub.components || []).find((c) => c.component === componentName);
  if (!entry) return false;
  if ((entry.state || 'active') !== 'active') return false;
  if (entry.expires_at && new Date(entry.expires_at) <= new Date()) return false;
  return true;
}

/**
 * Get the full subscription record for a family.
 * Returns null if no subscription record exists.
 *
 * @param {number} familyId
 * @returns {Promise<object|null>}
 */
async function getByFamilyId(familyId) {
  const { rows } = await db.query(
    'SELECT * FROM family_subscriptions WHERE family_id = $1',
    [familyId]
  );
  return rows[0] ?? null;
}

/**
 * Check if a family is in trial and the trial has expired.
 *
 * @param {number} familyId
 * @returns {Promise<boolean>} true if trial expired
 */
async function isTrialExpired(familyId) {
  const { rows } = await db.query(
    `SELECT 1 FROM family_subscriptions
     WHERE family_id = $1
       AND tier = 'trial'
       AND trial_expires_at IS NOT NULL
       AND trial_expires_at <= NOW()`,
    [familyId]
  );
  return rows.length > 0;
}

/**
 * Grant a component to a family with optional expiry.
 *
 * @param {number} familyId
 * @param {string} componentName
 * @param {Date|null} expiresAt - null means lifetime
 */
async function grantComponent(familyId, componentName, expiresAt = null, options = {}) {
  const component = {
    component: componentName,
    state: options.state || 'active',
    source: options.source || 'admin',
    granted_at: new Date().toISOString(),
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    archived_at: options.archived_at ?? null,
  };

  // Upsert: add component if not present, update expires_at if it is present
  const { rows } = await db.query(
    `INSERT INTO family_subscriptions (family_id, components)
     VALUES ($1, $2)
     ON CONFLICT (family_id) DO UPDATE
       SET components = (
         SELECT jsonb_agg(item)
         FROM (
           SELECT item
           FROM jsonb_array_elements(family_subscriptions.components) WITH ORDINALITY arr(item, ord)
           WHERE (item->>'component') != $3
           UNION ALL
           SELECT $4::jsonb
         ) sub
       ),
           updated_at = NOW()
     RETURNING *`,
    [
      familyId,
      JSON.stringify([component]),
      componentName,
      JSON.stringify(component),
    ]
  );
  return rows[0];
}

module.exports = {
  createForNewFamily,
  grantLifetimeFree,
  hasComponent,
  hasActiveComponent,
  getByFamilyId,
  isTrialExpired,
  grantComponent,
};