/**
 * Per-vuxen föräldralås-PIN (parent.parent_pin_hash).
 */
const db = require('../src/lib/db');
const { comparePassword } = require('../src/lib/hash');

async function getParentPinRow(parentId) {
  const result = await db.query(
    'SELECT id, family_id, parent_pin_hash FROM parent WHERE id = $1',
    [parentId]
  );
  return result.rows[0] || null;
}

async function parentHasPin(parentId) {
  const row = await getParentPinRow(parentId);
  return !!row?.parent_pin_hash;
}

async function familyAnyParentHasPin(familyId) {
  const result = await db.query(
    `SELECT EXISTS(
       SELECT 1 FROM parent
       WHERE family_id = $1 AND parent_pin_hash IS NOT NULL
     ) AS has_pin`,
    [familyId]
  );
  return result.rows[0]?.has_pin || false;
}

/**
 * Verify PIN for one parent or, if parentId omitted, any parent in the family.
 * @returns {{ ok: boolean, parentId: string|null }}
 */
async function verifyParentPin({ familyId, parentId, pin }) {
  if (parentId) {
    const row = await getParentPinRow(parentId);
    if (!row || row.family_id !== familyId || !row.parent_pin_hash) {
      return { ok: false, parentId: null };
    }
    const ok = await comparePassword(pin, row.parent_pin_hash);
    return { ok, parentId: ok ? row.id : null };
  }

  const result = await db.query(
    `SELECT id, parent_pin_hash FROM parent
     WHERE family_id = $1 AND parent_pin_hash IS NOT NULL`,
    [familyId]
  );
  for (const row of result.rows) {
    if (await comparePassword(pin, row.parent_pin_hash)) {
      return { ok: true, parentId: row.id };
    }
  }
  return { ok: false, parentId: null };
}

async function setParentPinHash(parentId, hash) {
  await db.query(
    'UPDATE parent SET parent_pin_hash = $1, updated_at = NOW() WHERE id = $2',
    [hash, parentId]
  );
}

module.exports = {
  getParentPinRow,
  parentHasPin,
  familyAnyParentHasPin,
  verifyParentPin,
  setParentPinHash,
};
