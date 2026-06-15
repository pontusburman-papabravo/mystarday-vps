/**
 * magic-view-access.js — Who may use the classic/magic view toggle (internal preview).
 * Default allowlist: MAGIC_VIEW_ALLOWLIST env (comma-separated emails).
 */

function getAllowlist() {
  const raw = process.env.MAGIC_VIEW_ALLOWLIST || 'pontus@burman.cc';
  return raw
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

function isEmailAllowlisted(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.toLowerCase().trim();
  return getAllowlist().includes(normalized);
}

async function familyHasMagicViewAccess(familyId) {
  if (!familyId) return false;
  const allowlist = getAllowlist();
  if (!allowlist.length) return false;
  const db = require('./db');
  const result = await db.query(
    `SELECT 1 FROM parent
     WHERE family_id = $1 AND LOWER(email) = ANY($2::text[])
     LIMIT 1`,
    [familyId, allowlist]
  );
  return result.rows.length > 0;
}

module.exports = {
  getAllowlist,
  isEmailAllowlisted,
  familyHasMagicViewAccess,
};
