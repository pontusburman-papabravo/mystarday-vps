'use strict';

const CHILD_LOGIN_SELECT = `
  id, family_id, name, emoji, username, pin, avatar_storage_key, avatar_updated_at
`;

/**
 * Resolve a child row for POST /api/auth/child-login.
 * Order: username → display name in parent session family → globally unique display name.
 *
 * Global name match is allowed only when exactly one child has that name (prevents
 * cross-family login when multiple children share a display name).
 *
 * @param {import('pg').Pool} db
 * @param {string} normalizedInput lowercased, trimmed username or name from client
 * @param {string|null} parentFamilyId from stjarndag_parent_session / parent JWT when present
 * @returns {Promise<object|null>}
 */
async function resolveChildForLogin(db, normalizedInput, parentFamilyId) {
  const byUsername = await db.query(
    `SELECT ${CHILD_LOGIN_SELECT} FROM child WHERE LOWER(username) = $1`,
    [normalizedInput]
  );
  if (byUsername.rows[0]) {
    return byUsername.rows[0];
  }

  if (parentFamilyId) {
    const inFamily = await db.query(
      `SELECT ${CHILD_LOGIN_SELECT}
       FROM child WHERE family_id = $1 AND LOWER(name) = $2`,
      [parentFamilyId, normalizedInput]
    );
    if (inFamily.rows.length === 1) {
      return inFamily.rows[0];
    }
  }

  const byName = await db.query(
    `SELECT ${CHILD_LOGIN_SELECT} FROM child WHERE LOWER(name) = $1`,
    [normalizedInput]
  );
  if (byName.rows.length === 1) {
    return byName.rows[0];
  }

  return null;
}

module.exports = { resolveChildForLogin };
