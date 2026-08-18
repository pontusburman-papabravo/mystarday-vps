'use strict';

/**
 * Batch observability for admin — authentication, sessions, activity per actor.
 * Derived from login_event + analytics_events + daily_log_item + family_trusted_device.
 */

const db = require('../src/lib/db');
const { classifySessionSource } = require('../src/lib/session-telemetry');
const {
  SESSION_EVENT_TYPES,
  ACTIVITY_ANALYTICS_EVENT_TYPES,
  INTERVAL_MAP,
} = require('../config/user-observability');

function actorKey(actorType, actorId) {
  return `${actorType}:${actorId}`;
}

function emptyActorStats() {
  return {
    last_active_at: null,
    last_authenticated_at: null,
    last_session_started_at: null,
    last_session_source: null,
    last_session_device_id: null,
    last_session_device_label: null,
    last_session_device_mode: null,
    active_days_30d: 0,
    parent_view_events_30d: 0,
    schedule_edits_30d: 0,
    activity_completions_30d: 0,
    widget_completions_30d: 0,
  };
}

async function fetchAuthByFamilyIds(familyIds) {
  if (!familyIds.length) return new Map();
  const { rows } = await db.query(
    `SELECT user_id, role, family_id, MAX(occurred_at) AS last_authenticated_at
     FROM login_event
     WHERE family_id = ANY($1::uuid[])
     GROUP BY user_id, role, family_id`,
    [familyIds]
  );
  const map = new Map();
  for (const row of rows) {
    const actorType = row.role === 'child' ? 'child' : 'parent';
    map.set(actorKey(actorType, row.user_id), {
      family_id: row.family_id,
      last_authenticated_at: row.last_authenticated_at,
    });
  }
  return map;
}

async function fetchSessionRollups(familyIds) {
  if (!familyIds.length) return new Map();

  const { rows } = await db.query(
    `SELECT DISTINCT ON (actor_type, actor_id)
       actor_type,
       actor_id,
       family_id,
       created_at AS last_session_started_at,
       metadata AS last_session_metadata
     FROM (
       SELECT
         ae.family_id,
         ae.metadata->>'actor_id' AS actor_id,
         ae.metadata->>'actor_type' AS actor_type,
         ae.created_at,
         ae.metadata
       FROM analytics_events ae
       WHERE ae.family_id = ANY($1::uuid[])
         AND ae.event_type = ANY($2::text[])
         AND ae.metadata->>'actor_id' IS NOT NULL
         AND ae.metadata->>'actor_type' IN ('parent', 'child')
     ) sessions
     ORDER BY actor_type, actor_id, created_at DESC`,
    [familyIds, SESSION_EVENT_TYPES]
  );

  const map = new Map();
  for (const row of rows) {
    const meta = row.last_session_metadata || {};
    map.set(actorKey(row.actor_type, row.actor_id), {
      family_id: row.family_id,
      last_session_started_at: row.last_session_started_at,
      last_session_source: classifySessionSource(meta),
      last_session_device_id: meta.trusted_device_id || null,
      last_session_device_mode: meta.device_mode || null,
    });
  }
  return map;
}

async function fetchActivityRollups(familyIds) {
  if (!familyIds.length) return new Map();

  const { rows } = await db.query(
    `WITH raw AS (
       SELECT
         ae.family_id,
         COALESCE(ae.metadata->>'actor_id', ae.metadata->>'child_id') AS actor_id,
         CASE
           WHEN ae.metadata->>'actor_type' IN ('parent', 'child') THEN ae.metadata->>'actor_type'
           WHEN ae.metadata ? 'child_id' THEN 'child'
           ELSE NULL
         END AS actor_type,
         ae.event_type,
         ae.created_at
       FROM analytics_events ae
       WHERE ae.family_id = ANY($1::uuid[])
         AND ae.created_at >= NOW() - INTERVAL '30 days'
         AND ae.event_type = ANY($2::text[])
     ),
     filtered AS (
       SELECT * FROM raw WHERE actor_id IS NOT NULL AND actor_type IS NOT NULL
     )
     SELECT
       actor_type,
       actor_id,
       family_id,
       MAX(created_at) AS last_active_at,
       COUNT(*) FILTER (
         WHERE event_type IN ('feature_daily_log', 'feature_schedule_edit')
           AND actor_type = 'parent'
       )::int AS parent_view_events_30d,
       COUNT(*) FILTER (
         WHERE event_type = 'feature_schedule_edit' AND actor_type = 'parent'
       )::int AS schedule_edits_30d,
       COUNT(*) FILTER (
         WHERE event_type = 'widget_completion_succeeded'
       )::int AS widget_completions_30d
     FROM filtered
     GROUP BY actor_type, actor_id, family_id`,
    [familyIds, ACTIVITY_ANALYTICS_EVENT_TYPES]
  );

  const map = new Map();
  for (const row of rows) {
    map.set(actorKey(row.actor_type, row.actor_id), {
      family_id: row.family_id,
      last_active_at: row.last_active_at,
      parent_view_events_30d: row.parent_view_events_30d || 0,
      schedule_edits_30d: row.schedule_edits_30d || 0,
      widget_completions_30d: row.widget_completions_30d || 0,
    });
  }
  return map;
}

async function fetchActiveDaysUnion(familyIds) {
  if (!familyIds.length) return new Map();

  const { rows } = await db.query(
    `WITH activity_days AS (
       SELECT
         COALESCE(ae.metadata->>'actor_id', ae.metadata->>'child_id') AS actor_id,
         CASE
           WHEN ae.metadata->>'actor_type' IN ('parent', 'child') THEN ae.metadata->>'actor_type'
           WHEN ae.metadata ? 'child_id' THEN 'child'
           ELSE NULL
         END AS actor_type,
         ae.family_id,
         date_trunc('day', ae.created_at AT TIME ZONE 'Europe/Stockholm') AS day
       FROM analytics_events ae
       WHERE ae.family_id = ANY($1::uuid[])
         AND ae.created_at >= NOW() - INTERVAL '30 days'
         AND ae.event_type = ANY($2::text[])
     ),
     completion_days AS (
       SELECT
         c.id::text AS actor_id,
         'child' AS actor_type,
         c.family_id,
         date_trunc('day', dli.completed_at AT TIME ZONE 'Europe/Stockholm') AS day
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = ANY($1::uuid[])
         AND dli.completed = true
         AND dli.completed_at >= NOW() - INTERVAL '30 days'
     ),
     union_days AS (
       SELECT actor_type, actor_id, family_id, day FROM activity_days
       WHERE actor_id IS NOT NULL AND actor_type IS NOT NULL
       UNION
       SELECT actor_type, actor_id, family_id, day FROM completion_days
     )
     SELECT actor_type, actor_id, family_id, COUNT(DISTINCT day)::int AS active_days_30d
     FROM union_days
     GROUP BY actor_type, actor_id, family_id`,
    [familyIds, ACTIVITY_ANALYTICS_EVENT_TYPES]
  );

  const map = new Map();
  for (const row of rows) {
    map.set(actorKey(row.actor_type, row.actor_id), {
      family_id: row.family_id,
      active_days_30d: row.active_days_30d || 0,
    });
  }
  return map;
}

async function fetchCompletionRollups(familyIds) {
  if (!familyIds.length) return new Map();
  const { rows } = await db.query(
    `SELECT
       c.id AS actor_id,
       c.family_id,
       MAX(dli.completed_at) AS last_completion_at,
       COUNT(*)::int AS activity_completions_30d
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     WHERE c.family_id = ANY($1::uuid[])
       AND dli.completed = true
       AND dli.completed_at >= NOW() - INTERVAL '30 days'
     GROUP BY c.id, c.family_id`,
    [familyIds]
  );
  const map = new Map();
  for (const row of rows) {
    map.set(actorKey('child', row.actor_id), {
      family_id: row.family_id,
      last_completion_at: row.last_completion_at,
      activity_completions_30d: row.activity_completions_30d || 0,
    });
  }
  return map;
}

async function fetchDevicesByFamilyIds(familyIds) {
  if (!familyIds.length) return new Map();
  const { rows } = await db.query(
    `SELECT
       d.id,
       d.family_id,
       d.device_mode,
       d.platform,
       d.label,
       d.last_seen_at,
       d.revoked_at,
       d.last_active_child_id,
       lc.name AS last_active_child_name,
       lc.emoji AS last_active_child_emoji
     FROM family_trusted_device d
     LEFT JOIN child lc ON lc.id = d.last_active_child_id
     WHERE d.family_id = ANY($1::uuid[])
     ORDER BY d.family_id, (d.revoked_at IS NULL) DESC, d.last_seen_at DESC NULLS LAST`,
    [familyIds]
  );
  const byFamily = new Map();
  for (const row of rows) {
    if (!byFamily.has(row.family_id)) byFamily.set(row.family_id, []);
    byFamily.get(row.family_id).push({
      id: row.id,
      label: row.label || null,
      platform: row.platform || 'unknown',
      device_mode: row.device_mode,
      last_seen_at: row.last_seen_at,
      last_active_child_name: row.last_active_child_name || null,
      last_active_child_emoji: row.last_active_child_emoji || null,
      status: row.revoked_at ? 'revoked' : 'active',
    });
  }
  return byFamily;
}

function mergeActorStats(authMap, sessionMap, activityMap, activeDaysMap, completionMap, deviceLabelById) {
  const keys = new Set([
    ...authMap.keys(),
    ...sessionMap.keys(),
    ...activityMap.keys(),
    ...activeDaysMap.keys(),
    ...completionMap.keys(),
  ]);
  const merged = new Map();
  for (const key of keys) {
    const auth = authMap.get(key) || {};
    const session = sessionMap.get(key) || {};
    const activity = activityMap.get(key) || {};
    const activeDays = activeDaysMap.get(key) || {};
    const completion = completionMap.get(key) || {};
    const [actorType] = key.split(':');

    const lastActiveCandidates = [
      activity.last_active_at,
      completion.last_completion_at,
    ].filter(Boolean);
    const lastActiveAt = lastActiveCandidates.length
      ? new Date(Math.max(...lastActiveCandidates.map((d) => new Date(d).getTime())))
      : null;

    const deviceId = session.last_session_device_id;
    merged.set(key, {
      last_active_at: lastActiveAt,
      last_authenticated_at: auth.last_authenticated_at || null,
      last_session_started_at: session.last_session_started_at || null,
      last_session_source: session.last_session_source || null,
      last_session_device_id: deviceId,
      last_session_device_label: deviceId ? (deviceLabelById.get(deviceId) || null) : null,
      last_session_device_mode: session.last_session_device_mode || null,
      active_days_30d: activeDays.active_days_30d || 0,
      parent_view_events_30d: actorType === 'parent' ? (activity.parent_view_events_30d || 0) : 0,
      schedule_edits_30d: actorType === 'parent' ? (activity.schedule_edits_30d || 0) : 0,
      activity_completions_30d: completion.activity_completions_30d || 0,
      widget_completions_30d: activity.widget_completions_30d || 0,
    });
  }
  return merged;
}

/**
 * Batch observability for admin families-grouped (no N+1).
 * @returns {{ byFamilyId: Map<string, { parents, children, trusted_devices }> }}
 */
async function getBatchForFamilies(familyIds) {
  const ids = [...new Set((familyIds || []).filter(Boolean))];
  if (!ids.length) {
    return { byFamilyId: new Map() };
  }

  const [authMap, sessionMap, activityMap, activeDaysMap, completionMap, devicesByFamily] = await Promise.all([
    fetchAuthByFamilyIds(ids),
    fetchSessionRollups(ids),
    fetchActivityRollups(ids),
    fetchActiveDaysUnion(ids),
    fetchCompletionRollups(ids),
    fetchDevicesByFamilyIds(ids),
  ]);

  const deviceLabelById = new Map();
  for (const devices of devicesByFamily.values()) {
    for (const d of devices) {
      if (d.id && d.label) deviceLabelById.set(d.id, d.label);
    }
  }

  const actorStats = mergeActorStats(
    authMap,
    sessionMap,
    activityMap,
    activeDaysMap,
    completionMap,
    deviceLabelById
  );
  const byFamilyId = new Map();

  for (const familyId of ids) {
    byFamilyId.set(familyId, {
      parents: {},
      children: {},
      trusted_devices: devicesByFamily.get(familyId) || [],
    });
  }

  for (const [key, stats] of actorStats) {
    const [actorType, actorId] = key.split(':');
    const familyId = authMap.get(key)?.family_id
      || sessionMap.get(key)?.family_id
      || activityMap.get(key)?.family_id
      || activeDaysMap.get(key)?.family_id
      || completionMap.get(key)?.family_id;
    if (!familyId || !byFamilyId.has(familyId)) continue;
    const bucket = actorType === 'child' ? 'children' : 'parents';
    byFamilyId.get(familyId)[bucket][actorId] = stats;
  }

  return { byFamilyId };
}

async function enrichFamiliesGrouped(rows) {
  const familyIds = rows.map((r) => r.id);
  const { byFamilyId } = await getBatchForFamilies(familyIds);
  for (const family of rows) {
    const obs = byFamilyId.get(family.id) || { parents: {}, children: {}, trusted_devices: [] };
    family.trusted_devices = obs.trusted_devices;
    for (const parent of family.parents || []) {
      parent.observability = obs.parents[parent.id] || emptyActorStats();
    }
    for (const child of family.children || []) {
      child.observability = obs.children[child.id] || emptyActorStats();
    }
  }
  return rows;
}

async function computeUsageKpis(periodKey = '24h') {
  const interval = INTERVAL_MAP[periodKey] || INTERVAL_MAP['24h'];
  const sessionTypes = SESSION_EVENT_TYPES;
  const activityTypes = ACTIVITY_ANALYTICS_EVENT_TYPES;

  const { rows } = await db.query(
    `WITH bounds AS (SELECT NOW() - ${interval} AS since),
     session_events AS (
       SELECT
         ae.family_id,
         ae.metadata->>'actor_id' AS actor_id,
         ae.metadata->>'actor_type' AS actor_type,
         ae.metadata->>'trusted_device_id' AS trusted_device_id,
         ae.created_at
       FROM analytics_events ae, bounds b
       WHERE ae.event_type = ANY($1::text[])
         AND ae.created_at >= b.since
         AND ae.metadata->>'actor_id' IS NOT NULL
     ),
     activity_events AS (
       SELECT
         ae.family_id,
         COALESCE(ae.metadata->>'actor_id', ae.metadata->>'child_id') AS actor_id,
         CASE
           WHEN ae.metadata->>'actor_type' IN ('parent', 'child') THEN ae.metadata->>'actor_type'
           WHEN ae.metadata ? 'child_id' THEN 'child'
           ELSE NULL
         END AS actor_type,
         ae.event_type,
         ae.created_at
       FROM analytics_events ae, bounds b
       WHERE ae.event_type = ANY($2::text[])
         AND ae.created_at >= b.since
     ),
     completion_events AS (
       SELECT c.family_id, c.id::text AS actor_id, 'child' AS actor_type, dli.completed_at AS created_at
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id, bounds b
       WHERE dli.completed = true AND dli.completed_at >= b.since
     ),
     auths AS (
       SELECT user_id, role, family_id, occurred_at
       FROM login_event, bounds b
       WHERE occurred_at >= b.since
     )
     SELECT
       (SELECT COUNT(DISTINCT family_id) FROM (
         SELECT family_id FROM session_events
         UNION SELECT family_id FROM activity_events WHERE actor_id IS NOT NULL
         UNION SELECT family_id FROM completion_events
         UNION SELECT family_id FROM auths
       ) f) AS active_families,
       (SELECT COUNT(DISTINCT actor_id) FROM (
         SELECT actor_id FROM session_events WHERE actor_id IS NOT NULL
         UNION SELECT actor_id FROM activity_events WHERE actor_id IS NOT NULL
         UNION SELECT actor_id FROM completion_events
       ) p) AS active_people,
       (SELECT COUNT(DISTINCT actor_id) FROM (
         SELECT actor_id FROM session_events WHERE actor_type = 'parent'
         UNION SELECT actor_id FROM activity_events WHERE actor_type = 'parent'
       ) p) AS active_parents,
       (SELECT COUNT(DISTINCT actor_id) FROM (
         SELECT actor_id FROM session_events WHERE actor_type = 'child'
         UNION SELECT actor_id FROM activity_events WHERE actor_type = 'child'
         UNION SELECT actor_id FROM completion_events
       ) c) AS active_children,
       (SELECT COUNT(*)::int FROM session_events WHERE trusted_device_id IS NOT NULL) AS trusted_device_sessions,
       (SELECT COUNT(*)::int FROM auths) AS classic_authentications,
       (SELECT COUNT(*)::int FROM completion_events) AS activity_completions,
       (SELECT COUNT(*)::int FROM activity_events WHERE event_type = 'widget_completion_succeeded') AS widget_completions`,
    [sessionTypes, activityTypes]
  );

  const row = rows[0] || {};
  return {
    period: periodKey,
    active_families: parseInt(row.active_families, 10) || 0,
    active_people: parseInt(row.active_people, 10) || 0,
    active_parents: parseInt(row.active_parents, 10) || 0,
    active_children: parseInt(row.active_children, 10) || 0,
    trusted_device_sessions: parseInt(row.trusted_device_sessions, 10) || 0,
    classic_authentications: parseInt(row.classic_authentications, 10) || 0,
    activity_completions: parseInt(row.activity_completions, 10) || 0,
    widget_completions: parseInt(row.widget_completions, 10) || 0,
  };
}

async function getUsageTrends(days = 14) {
  const capped = Math.min(Math.max(parseInt(days, 10) || 14, 7), 30);
  const { rows } = await db.query(
    `WITH days AS (
       SELECT generate_series(
         date_trunc('day', NOW() AT TIME ZONE 'Europe/Stockholm') - ($1::int - 1) * INTERVAL '1 day',
         date_trunc('day', NOW() AT TIME ZONE 'Europe/Stockholm'),
         INTERVAL '1 day'
       ) AS day_start
     ),
     session_daily AS (
       SELECT
         date_trunc('day', ae.created_at AT TIME ZONE 'Europe/Stockholm') AS day_start,
         COUNT(DISTINCT ae.metadata->>'actor_id') FILTER (WHERE ae.metadata->>'actor_id' IS NOT NULL) AS people,
         COUNT(DISTINCT ae.metadata->>'actor_id') FILTER (WHERE ae.metadata->>'actor_type' = 'parent') AS parents,
         COUNT(DISTINCT ae.metadata->>'actor_id') FILTER (WHERE ae.metadata->>'actor_type' = 'child') AS children,
         COUNT(*) FILTER (WHERE ae.metadata->>'trusted_device_id' IS NOT NULL) AS trusted_sessions
       FROM analytics_events ae
       WHERE ae.event_type = ANY($2::text[])
         AND ae.created_at >= NOW() - ($1::int || ' days')::interval
       GROUP BY 1
     ),
     auth_daily AS (
       SELECT date_trunc('day', occurred_at AT TIME ZONE 'Europe/Stockholm') AS day_start,
              COUNT(*)::int AS auths
       FROM login_event
       WHERE occurred_at >= NOW() - ($1::int || ' days')::interval
       GROUP BY 1
     )
     SELECT
       d.day_start::date AS day,
       COALESCE(s.people, 0)::int AS active_people,
       COALESCE(s.parents, 0)::int AS active_parents,
       COALESCE(s.children, 0)::int AS active_children,
       COALESCE(s.trusted_sessions, 0)::int AS trusted_device_sessions,
       COALESCE(a.auths, 0)::int AS classic_authentications
     FROM days d
     LEFT JOIN session_daily s ON s.day_start = d.day_start
     LEFT JOIN auth_daily a ON a.day_start = d.day_start
     ORDER BY d.day_start`,
    [capped, SESSION_EVENT_TYPES]
  );
  return rows;
}

module.exports = {
  emptyActorStats,
  getBatchForFamilies,
  enrichFamiliesGrouped,
  computeUsageKpis,
  getUsageTrends,
  fetchActiveDaysUnion,
};
