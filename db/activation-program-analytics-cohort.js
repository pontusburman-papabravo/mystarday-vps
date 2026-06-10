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

const FUNNEL_EVENT_TYPES = [
  'activation_program_started',
  'activation_program_first_banner_seen',
  'activation_program_cta_clicked',
  'child_first_completion',
  'parent_first_completion_seen',
  'activation_program_completed',
];

async function fetchFunnelEventCounts(familyIds, client = db) {
  const counts = Object.fromEntries(FUNNEL_EVENT_TYPES.map((t) => [t, 0]));
  if (!familyIds.length) return counts;

  const result = await client.query(
    `SELECT event_type, COUNT(DISTINCT family_id)::int AS families
     FROM analytics_events
     WHERE family_id = ANY($1::uuid[])
       AND event_type = ANY($2::text[])
     GROUP BY event_type`,
    [familyIds, FUNNEL_EVENT_TYPES]
  );

  for (const row of result.rows) {
    counts[row.event_type] = row.families;
  }
  return counts;
}

async function fetchDay3DoneTriggers(familyIds, client = db) {
  const out = { aha: 0, supportive_fallback: 0, other: 0 };
  if (!familyIds.length) return out;

  const result = await client.query(
    `SELECT metadata->>'trigger' AS trigger, COUNT(DISTINCT family_id)::int AS families
     FROM analytics_events
     WHERE family_id = ANY($1::uuid[])
       AND event_type = 'activation_program_day_done'
       AND (metadata->>'day')::int = 3
     GROUP BY metadata->>'trigger'`,
    [familyIds]
  );

  for (const row of result.rows) {
    if (row.trigger === 'aha') out.aha = row.families;
    else if (row.trigger === 'supportive_fallback') out.supportive_fallback = row.families;
    else out.other += row.families;
  }
  return out;
}

async function fetchReflectionDistribution(launchAtIso, client = db) {
  if (!launchAtIso) return [];

  const result = await client.query(
    `SELECT reflection_score AS score, COUNT(*)::int AS count
     FROM parent_activation_program
     WHERE program_type = 'onboarding_7d'
       AND created_at >= $1::timestamptz
       AND reflection_score IS NOT NULL
     GROUP BY reflection_score
     ORDER BY reflection_score`,
    [launchAtIso]
  );
  return result.rows;
}

module.exports = {
  FUNNEL_EVENT_TYPES,
  fetchAhaFlagsByFamily,
  fetchFunnelEventCounts,
  fetchDay3DoneTriggers,
  fetchReflectionDistribution,
};
