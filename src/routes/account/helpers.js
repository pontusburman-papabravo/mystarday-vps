'use strict';

const db = require('../../lib/db');

async function getAccountAuth(parentId) {
  const r = await db.query(
    `SELECT password_hash IS NOT NULL AS has_password,
            apple_user_id IS NOT NULL AS has_apple_linked,
            email, apple_email
     FROM parent WHERE id = $1`,
    [parentId]
  );
  if (!r.rows.length) return null;
  const row = r.rows[0];
  return {
    hasPassword: row.has_password,
    hasAppleLinked: row.has_apple_linked,
    email: row.email,
    appleEmail: row.apple_email || null,
    canUnlinkApple: row.has_password && row.has_apple_linked,
  };
}

module.exports = { getAccountAuth };
