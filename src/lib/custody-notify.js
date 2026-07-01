'use strict';

const db = require('./db');
const { addDaysIso } = require('./date-utils');
const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');
const {
  loadCustodyContext,
  resolveCustodyDateSync,
} = require('./custody-schedule-engine');

/**
 * @param {object} patternRow — custody_pattern row (+ optional child_id/family_id)
 * @param {Record<string, object>} homesById
 * @returns {import('./custody-schedule-engine/types').CustodyResolveInput}
 */
function engineCtxFromPatternRow(patternRow, homesById) {
  return {
    childId: patternRow.child_id || null,
    familyId: patternRow.family_id || null,
    parentHomeId: null,
    schedule: patternRow,
    homesById,
    overrides: [],
  };
}

/**
 * True when active home changes tomorrow (handoff eve).
 * @param {import('./custody-schedule-engine/types').CustodyResolveInput} engineCtx
 * @param {string} dateStr YYYY-MM-DD
 */
function isCustodyHandoffEve(engineCtx, dateStr) {
  if (!engineCtx?.schedule?.anchor_date) return false;
  const today = resolveCustodyDateSync(engineCtx, dateStr);
  const tomorrow = resolveCustodyDateSync(engineCtx, addDaysIso(dateStr, 1));
  if (!today.activeHome?.id || !tomorrow.activeHome?.id) return false;
  return today.activeHome.id !== tomorrow.activeHome.id;
}

/**
 * Parent IDs who should receive custody-scoped notifications for child on date.
 * Without pattern: all linked parents. With pattern: parents mapped to today's home.
 */
async function getNotifyParentIdsForChildDate(childId, dateStr, client = db) {
  const parentsResult = await client.query(
    `SELECT DISTINCT p.id
     FROM parent p
     JOIN parent_child pc ON pc.parent_id = p.id AND pc.child_id = $1
     WHERE pc.revoked_at IS NULL`,
    [childId]
  );
  const allParentIds = parentsResult.rows.map((r) => r.id);
  if (allParentIds.length === 0) return allParentIds;

  const childRow = await client.query('SELECT family_id FROM child WHERE id = $1', [childId]);
  const familyId = childRow.rows[0]?.family_id;
  if (!familyId) return allParentIds;

  const flagOk = await isActivationFlagEnabled(FLAG_KEYS.custodySchedule, familyId);
  if (!flagOk) return allParentIds;

  const engineCtx = await loadCustodyContext({ childId, familyId }, client);
  if (!engineCtx.schedule) return allParentIds;

  const resolved = resolveCustodyDateSync(engineCtx, dateStr);
  const homeId = resolved.activeHome?.id;
  if (!homeId || resolved.source === 'fallback') {
    return [];
  }

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

module.exports = {
  engineCtxFromPatternRow,
  isCustodyHandoffEve,
  getNotifyParentIdsForChildDate,
};
