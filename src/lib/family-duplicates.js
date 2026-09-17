/**
 * Duplicate checks for family members (vuxna + barn).
 */
const VALID_FAMILY_ROLES = ['mamma', 'pappa', 'bonusförälder', 'annan'];

/**
 * @returns {{ ok: true } | { ok: false, code: string, error: string, existingName?: string }}
 */
async function checkAdultInviteEligibility(db, email, familyId) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      ok: false,
      code: 'INVALID_EMAIL',
      error: 'INVALID_EMAIL',
    };
  }

  const inFamily = await db.query(
    'SELECT id, name FROM parent WHERE LOWER(email) = $1 AND family_id = $2',
    [normalizedEmail, familyId]
  );
  if (inFamily.rows.length > 0) {
    return {
      ok: false,
      code: 'ALREADY_MEMBER',
      error: 'ALREADY_MEMBER',
      existingName: inFamily.rows[0].name,
    };
  }

  const otherFamily = await db.query(
    'SELECT id FROM parent WHERE LOWER(email) = $1 AND family_id != $2',
    [normalizedEmail, familyId]
  );
  if (otherFamily.rows.length > 0) {
    return {
      ok: false,
      code: 'OTHER_FAMILY',
      error: 'OTHER_FAMILY',
    };
  }

  const pending = await db.query(
    `SELECT id FROM family_invite
     WHERE family_id = $1 AND LOWER(email) = $2 AND accepted = false AND expires_at > NOW()`,
    [familyId, normalizedEmail]
  );
  if (pending.rows.length > 0) {
    return {
      ok: false,
      code: 'PENDING_INVITE',
      error: 'PENDING_INVITE',
    };
  }

  return { ok: true };
}

/**
 * @returns {{ ok: true } | { ok: false, code: string, error: string, suggestions?: string[] }}
 */
async function checkChildNameInFamily(db, name, familyId, excludeChildId = null) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return { ok: false, code: 'INVALID_NAME', error: 'INVALID_NAME' };
  }

  let query = `SELECT id, name FROM child
     WHERE family_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))`;
  const params = [familyId, trimmed];
  if (excludeChildId) {
    query += ' AND id != $3';
    params.push(excludeChildId);
  }

  const result = await db.query(query, params);
  if (result.rows.length > 0) {
    return {
      ok: false,
      code: 'DUPLICATE_CHILD_NAME',
      error: 'DUPLICATE_CHILD_NAME',
      existingName: result.rows[0].name,
      suggestions: [2, 3, 4].map((n) => `${trimmed} ${n}`),
    };
  }
  return { ok: true };
}

module.exports = {
  VALID_FAMILY_ROLES,
  checkAdultInviteEligibility,
  checkChildNameInFamily,
};
