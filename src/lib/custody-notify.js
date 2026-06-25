'use strict';

const db = require('./db');
const custodyDb = require('../../db/custody');
const { getHomeForDate } = require('./custody-resolver');
const { addDaysIso } = require('./date-utils');
const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');

/**
 * Parent IDs who should receive custody-scoped notifications for child on date.
 * Without pattern: all linked parents. With pattern: parents mapped to today's home.
 */
async function getNotifyParentIdsForChildDate(childId, dateStr, client = db) {
  const pattern = await custodyDb.getPattern(childId, client);
  const parentsResult = await client.query(
    `SELECT DISTINCT p.id
     FROM parent p
     JOIN parent_child pc ON pc.parent_id = p.id AND pc.child_id = $1
     WHERE pc.revoked_at IS NULL`,
    [childId]
  );
  const allParentIds = parentsResult.rows.map((r) => r.id);
  if (!pattern || allParentIds.length === 0) return allParentIds;

  const childRow = await client.query('SELECT family_id FROM child WHERE id = $1', [childId]);
  const familyId = childRow.rows[0]?.family_id;
  if (!familyId) return allParentIds;

  const flagOk = await isActivationFlagEnabled(FLAG_KEYS.custodySchedule, familyId);
  if (!flagOk) return allParentIds;

  const homes = await custodyDb.listHomes(familyId, client);
  const homesById = Object.fromEntries(homes.map((h) => [h.id, h]));
  const { homeId } = getHomeForDate(pattern, homesById, dateStr);

  const mapped = await client.query(
    `SELECT cph.parent_id
     FROM custody_parent_home cph
     WHERE cph.custody_home_id = $1
       AND cph.parent_id = ANY($2::uuid[])`,
    [homeId, allParentIds]
  );

  if (mapped.rows.length > 0) {
    return mapped.rows.map((r) => r.parent_id);
  }
  return allParentIds;
}

/**
 * True when custody week variant changes tomorrow (handoff eve).
 */
function isCustodyHandoffEve(pattern, dateStr) {
  const tomorrow = addDaysIso(dateStr, 1);
  const { getWeekVariantForDate } = require('./custody-resolver');
  return getWeekVariantForDate(pattern, dateStr) !== getWeekVariantForDate(pattern, tomorrow);
}

module.exports = {
  getNotifyParentIdsForChildDate,
  isCustodyHandoffEve,
};
