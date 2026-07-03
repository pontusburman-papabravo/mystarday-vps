/**
 * Parent entity DB module.
 * Owns: parent table queries (including Apple + Google Sign In).
 * Does NOT own: parent_child linking, auth tokens, push subscriptions.
 */

const db = require('../src/lib/db');

const PARENT_AUTH_SELECT = `
  SELECT id, family_id, email, name, verified, is_admin, created_at,
         password_hash IS NOT NULL AS has_password,
         apple_user_id, google_user_id,
         COALESCE(onboarding_completed, true) AS onboarding_completed
  FROM parent`;

/**
 * Get a parent by Apple user ID.
 */
async function getParentByAppleUserId(appleUserId) {
  const result = await db.query(
    `${PARENT_AUTH_SELECT} WHERE apple_user_id = $1`,
    [appleUserId]
  );
  return result.rows[0] || null;
}

/**
 * Get a parent by Google user ID (JWT sub).
 */
async function getParentByGoogleUserId(googleUserId) {
  const result = await db.query(
    `${PARENT_AUTH_SELECT} WHERE google_user_id = $1`,
    [googleUserId]
  );
  return result.rows[0] || null;
}

/**
 * Get a parent by email (for linking existing accounts to OAuth).
 */
async function getParentByEmail(email) {
  const result = await db.query(
    `${PARENT_AUTH_SELECT} WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Link an Apple user ID to an existing parent account.
 */
async function linkAppleUserId(parentId, appleUserId, appleEmail) {
  const result = await db.query(
    `UPDATE parent
     SET apple_user_id = $2, apple_email = $3
     WHERE id = $1
     RETURNING id`,
    [parentId, appleUserId, appleEmail || null]
  );
  return result.rows[0] || null;
}

/**
 * Link a Google user ID to an existing parent account.
 */
async function linkGoogleUserId(parentId, googleUserId) {
  const result = await db.query(
    `UPDATE parent
     SET google_user_id = $2
     WHERE id = $1
     RETURNING id`,
    [parentId, googleUserId]
  );
  return result.rows[0] || null;
}

module.exports = {
  getParentByAppleUserId,
  getParentByGoogleUserId,
  getParentByEmail,
  linkAppleUserId,
  linkGoogleUserId,
};
