'use strict';

const db = require('./db');

const SECTION_ORDER = ['morgon', 'dag', 'kvall', 'natt'];

/**
 * Lifetime completed activities for a child (all schedule days).
 * @param {string} childId
 * @returns {Promise<number>}
 */
async function countLifetimeCompletions(childId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dli.completed = true`,
    [childId]
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * Product definition: first_star_mode when flag is on and child has never completed.
 * @param {{ flagEnabled: boolean, lifetimeCompletions: number }} params
 * @returns {boolean}
 */
function resolveFirstStarMode({ flagEnabled, lifetimeCompletions }) {
  if (!flagEnabled) return false;
  return lifetimeCompletions === 0;
}

/**
 * Keep only the first unchecked activity (NU). Tags _nnl_status: 'now' for child UI.
 * @param {object[]} sortedItems — section-sorted daily log items
 * @returns {object[]}
 */
function applyFirstStarModeFilter(sortedItems) {
  const sections = {};
  for (const item of sortedItems) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }

  for (const section of SECTION_ORDER) {
    const sectionItems = sections[section];
    if (!sectionItems) continue;
    for (const item of sectionItems) {
      if (!item.completed) {
        return [{ ...item, _nnl_status: 'now' }];
      }
    }
  }

  return [];
}

module.exports = {
  SECTION_ORDER,
  countLifetimeCompletions,
  resolveFirstStarMode,
  applyFirstStarModeFilter,
};
