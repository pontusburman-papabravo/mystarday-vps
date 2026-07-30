'use strict';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalize visible_to_children for reward create/update.
 * null = all children, [] = none, [uuid...] = only listed children (family-scoped).
 * Foreign or invalid UUIDs are filtered out (not expanded to "all").
 */
async function normalizeVisibleToChildren(db, familyId, input) {
  if (input === undefined) {
    return { value: undefined };
  }
  if (input === null) {
    return { value: null };
  }
  if (!Array.isArray(input)) {
    return { error: 'visible_to_children måste vara null eller en array' };
  }
  const rawIds = [...new Set(
    input.filter((id) => typeof id === 'string' && id.length > 0)
  )];
  if (rawIds.length === 0) {
    return { value: [] };
  }
  const uuids = rawIds.filter((id) => UUID_RE.test(id));
  if (uuids.length === 0) {
    return { value: [] };
  }
  const validChildren = await db.query(
    `SELECT id FROM child WHERE id = ANY($1::uuid[]) AND family_id = $2`,
    [uuids, familyId]
  );
  const validSet = new Set(validChildren.rows.map((r) => r.id));
  const filtered = uuids.filter((id) => validSet.has(id));
  return { value: filtered };
}

module.exports = {
  normalizeVisibleToChildren,
  UUID_RE,
};
