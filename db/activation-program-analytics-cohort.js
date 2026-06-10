'use strict';

/**
 * Cohort analytics queries for activation program admin API (Fas 6B).
 */

const db = require('../src/lib/db');

/**
 * Aha flags per family from analytics_events.
 * @param {string[]} familyIds
 * @returns {Promise<Map<string, { hasChildFirst: boolean, hasParentFirstSeen: boolean }>>}
 */
async function fetchAhaFlagsByFamily(familyIds, client = db) {
  const map = new Map();
  if (!familyIds.length) return map;

  const result = await client.query(
    `SELECT family_id::text AS family_id,
            BOOL_OR(event_type = 'child_first_completion') AS has_child_first,
            BOOL_OR(event_type = 'parent_first_completion_seen') AS has_parent_first_seen
     FROM analytics_events
     WHERE family_id = ANY($1::uuid[])
       AND event_type IN ('child_first_completion', 'parent_first_completion_seen')
     GROUP BY family_id`,
    [familyIds]
  );

  for (const row of result.rows) {
    map.set(row.family_id, {
      hasChildFirst: row.has_child_first === true,
      hasParentFirstSeen: row.has_parent_first_seen === true,
    });
  }
  return map;
}

module.exports = {
  fetchAhaFlagsByFamily,
};
