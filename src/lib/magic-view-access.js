/**
 * magic-view-access.js — Classic/magic view toggle access.
 * Default: all families. MAGIC_VIEW_PREVIEW_ONLY=true restricts to allowlist.
 * MAGIC_VIEW_DISABLED=true emergency kill switch.
 */

function isMagicViewDisabled() {
  return process.env.MAGIC_VIEW_DISABLED === 'true';
}

function isPreviewOnlyMode() {
  return process.env.MAGIC_VIEW_PREVIEW_ONLY === 'true';
}

function getAllowlist() {
  const raw = process.env.MAGIC_VIEW_ALLOWLIST || 'pontus@burman.cc';
  return raw
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

function isEmailAllowlisted(email) {
  if (!email || typeof email !== 'string' || isMagicViewDisabled()) return false;
  if (!isPreviewOnlyMode()) return true;
  const normalized = email.toLowerCase().trim();
  return getAllowlist().includes(normalized);
}

async function familyHasMagicViewAccess(familyId) {
  if (!familyId || isMagicViewDisabled()) return false;
  if (!isPreviewOnlyMode()) return true;
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
  isMagicViewDisabled,
  isPreviewOnlyMode,
};
