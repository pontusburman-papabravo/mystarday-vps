/**
 * Pedagog audit log writes (§4.4.14, E12).
 */

const db = require('./db');

async function logPedagogEvent({
  familyId,
  childId = null,
  pedagogId = null,
  parentId = null,
  action,
  metadata = {},
}) {
  try {
    await db.query(
      `INSERT INTO pedagog_audit_log (family_id, child_id, pedagog_id, parent_id, action, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [familyId, childId, pedagogId, parentId, action, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('[pedagog-audit] log failed:', err.message);
  }
}

module.exports = { logPedagogEvent };
