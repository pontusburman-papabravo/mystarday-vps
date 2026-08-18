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
  TRUSTED_DEVICE_FRICTION_EVENT_TYPES,
} = require('../config/user-observability');

function pctRate(numerator, denominator) {
  const num = Number(numerator) || 0;
  const den = Number(denominator) || 0;
  if (den <= 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

function parseCount(row, key) {
  return parseInt(row?.[key], 10) || 0;
}

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

async function fetchTrustedDeviceAggregateKpis(periodKey = '24h') {
  const interval = INTERVAL_MAP[periodKey] || INTERVAL_MAP['24h'];
  const sessionTypes = SESSION_EVENT_TYPES;

  const { rows } = await db.query(
    `WITH bounds AS (SELECT NOW() - ${interval} AS since),
     registry AS (
       SELECT
         COUNT(*) FILTER (WHERE revoked_at IS NULL)::int AS active_devices,
         COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)::int AS revoked_devices,
         COUNT(DISTINCT family_id) FILTER (WHERE revoked_at IS NULL)::int AS families_enrolled,
         COUNT(*) FILTER (WHERE revoked_at IS NULL AND device_mode = 'parent')::int AS active_parent_mode,
         COUNT(*) FILTER (WHERE revoked_at IS NULL AND device_mode = 'child')::int AS active_child_mode,
         COUNT(*) FILTER (WHERE revoked_at IS NULL AND device_mode = 'shared')::int AS active_shared_mode,
         COUNT(*) FILTER (
           WHERE revoked_at IS NULL AND last_seen_at >= (SELECT since FROM bounds)
         )::int AS devices_seen,
         COUNT(DISTINCT family_id) FILTER (
           WHERE revoked_at IS NULL AND last_seen_at >= (SELECT since FROM bounds)
         )::int AS families_with_device_seen
       FROM family_trusted_device
     ),
     session_stats AS (
       SELECT
         COUNT(*)::int AS sessions,
         COUNT(DISTINCT ae.metadata->>'trusted_device_id') FILTER (
           WHERE ae.metadata->>'trusted_device_id' IS NOT NULL
         )::int AS distinct_devices_in_sessions,
         COUNT(DISTINCT ae.family_id)::int AS families_with_sessions,
         COUNT(*) FILTER (WHERE ae.metadata->>'device_mode' = 'parent')::int AS sessions_parent_mode,
         COUNT(*) FILTER (WHERE ae.metadata->>'device_mode' = 'child')::int AS sessions_child_mode,
         COUNT(*) FILTER (WHERE ae.metadata->>'device_mode' = 'shared')::int AS sessions_shared_mode
       FROM analytics_events ae, bounds b
       WHERE ae.event_type = ANY($1::text[])
         AND ae.created_at >= b.since
         AND ae.metadata->>'trusted_device_id' IS NOT NULL
     )
     SELECT
       r.active_devices,
       r.revoked_devices,
       r.families_enrolled,
       r.active_parent_mode,
       r.active_child_mode,
       r.active_shared_mode,
       r.devices_seen,
       r.families_with_device_seen,
       s.sessions,
       s.distinct_devices_in_sessions,
       s.families_with_sessions,
       s.sessions_parent_mode,
       s.sessions_child_mode,
       s.sessions_shared_mode
     FROM registry r
     CROSS JOIN session_stats s`,
    [sessionTypes]
  );

  const row = rows[0] || {};
  return {
    families_enrolled: parseInt(row.families_enrolled, 10) || 0,
    active_devices: parseInt(row.active_devices, 10) || 0,
    revoked_devices: parseInt(row.revoked_devices, 10) || 0,
    active_by_mode: {
      parent: parseInt(row.active_parent_mode, 10) || 0,
      child: parseInt(row.active_child_mode, 10) || 0,
      shared: parseInt(row.active_shared_mode, 10) || 0,
    },
    devices_seen: parseInt(row.devices_seen, 10) || 0,
    families_with_device_seen: parseInt(row.families_with_device_seen, 10) || 0,
    sessions: parseInt(row.sessions, 10) || 0,
    distinct_devices_in_sessions: parseInt(row.distinct_devices_in_sessions, 10) || 0,
    families_with_sessions: parseInt(row.families_with_sessions, 10) || 0,
    sessions_by_mode: {
      parent: parseInt(row.sessions_parent_mode, 10) || 0,
      child: parseInt(row.sessions_child_mode, 10) || 0,
      shared: parseInt(row.sessions_shared_mode, 10) || 0,
    },
  };
}

async function fetchTrustedDeviceImpactKpis(periodKey = '24h') {
  const interval = INTERVAL_MAP[periodKey] || INTERVAL_MAP['24h'];
  const sessionTypes = SESSION_EVENT_TYPES;
  const activityTypes = ACTIVITY_ANALYTICS_EVENT_TYPES;
  const frictionTypes = TRUSTED_DEVICE_FRICTION_EVENT_TYPES;

  const { rows } = await db.query(
    `WITH bounds AS (SELECT NOW() - ${interval} AS since),
     bounds_30d AS (SELECT NOW() - INTERVAL '30 days' AS since_30d),
     family_ages AS (
       SELECT id AS family_id, created_at
       FROM family
       WHERE archived_at IS NULL
     ),
     session_events AS (
       SELECT
         ae.family_id,
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
         ae.event_type,
         ae.created_at
       FROM analytics_events ae, bounds b
       WHERE ae.event_type = ANY($2::text[])
         AND ae.created_at >= b.since
     ),
     completion_events AS (
       SELECT c.family_id, dli.completed_at AS created_at
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id, bounds b
       WHERE dli.completed = true AND dli.completed_at >= b.since
     ),
     auths AS (
       SELECT family_id, occurred_at
       FROM login_event, bounds b
       WHERE occurred_at >= b.since
     ),
     active_families AS (
       SELECT DISTINCT family_id FROM (
         SELECT family_id FROM session_events
         UNION SELECT family_id FROM activity_events WHERE actor_id IS NOT NULL
         UNION SELECT family_id FROM completion_events
         UNION SELECT family_id FROM auths
       ) af
     ),
     td_sessions AS (
       SELECT
         family_id,
         created_at,
         date_trunc('day', created_at AT TIME ZONE 'Europe/Stockholm') AS session_day
       FROM session_events
       WHERE trusted_device_id IS NOT NULL
     ),
     td_families AS (
       SELECT family_id, COUNT(DISTINCT session_day)::int AS session_days
       FROM td_sessions
       GROUP BY family_id
     ),
     td_sessions_30d AS (
       SELECT
         ae.family_id,
         date_trunc('day', ae.created_at AT TIME ZONE 'Europe/Stockholm') AS session_day
       FROM analytics_events ae, bounds_30d b
       WHERE ae.event_type = ANY($1::text[])
         AND ae.created_at >= b.since_30d
         AND ae.metadata->>'trusted_device_id' IS NOT NULL
     ),
     td_families_30d AS (
       SELECT family_id, COUNT(DISTINCT session_day)::int AS session_days
       FROM td_sessions_30d
       GROUP BY family_id
     ),
     completion_families AS (
       SELECT DISTINCT family_id FROM completion_events
     ),
     routine_day_families AS (
       SELECT DISTINCT c.family_id
       FROM daily_log dl
       JOIN child c ON c.id = dl.child_id, bounds b
       WHERE dl.date >= (b.since AT TIME ZONE 'Europe/Stockholm')::date
         AND EXISTS (SELECT 1 FROM daily_log_item dli WHERE dli.daily_log_id = dl.id)
         AND NOT EXISTS (
           SELECT 1 FROM daily_log_item dli
           WHERE dli.daily_log_id = dl.id AND dli.completed IS NOT TRUE
         )
     ),
     first_star_families AS (
       SELECT DISTINCT ae.family_id
       FROM analytics_events ae, bounds b
       WHERE ae.event_type = 'first_completion_recorded'
         AND ae.created_at >= b.since
       UNION
       SELECT DISTINCT fm.family_id
       FROM family_milestones fm, bounds b
       WHERE fm.milestone IN ('child_first_completion', 'first_success')
         AND fm.occurred_at >= b.since
     ),
     friction_events AS (
       SELECT ae.event_type, COUNT(*)::int AS n
       FROM analytics_events ae, bounds b
       WHERE ae.event_type = ANY($3::text[])
         AND ae.created_at >= b.since
       GROUP BY ae.event_type
     ),
     friction_total AS (
       SELECT COALESCE(SUM(n), 0)::int AS total FROM friction_events
     ),
     td_session_count AS (
       SELECT COUNT(*)::int AS sessions FROM td_sessions
     ),
     classic_auth_td_enrolled AS (
       SELECT COUNT(DISTINCT le.family_id)::int AS families
       FROM login_event le
       CROSS JOIN bounds b
       JOIN family_trusted_device d ON d.family_id = le.family_id AND d.revoked_at IS NULL
       WHERE le.occurred_at >= b.since
     ),
     cohort_slice AS (
       SELECT
         fa.family_id,
         CASE WHEN fa.created_at >= NOW() - INTERVAL '7 days' THEN true ELSE false END AS is_new_7d,
         CASE WHEN fa.created_at >= NOW() - INTERVAL '30 days' THEN true ELSE false END AS is_new_30d
       FROM family_ages fa
     ),
     cohort_metrics AS (
       SELECT
         cs.is_new_7d,
         cs.is_new_30d,
         COUNT(DISTINCT af.family_id) FILTER (WHERE af.family_id IS NOT NULL)::int AS active_families,
         COUNT(DISTINCT tf.family_id) FILTER (WHERE tf.family_id IS NOT NULL)::int AS td_families,
         COUNT(DISTINCT tf.family_id) FILTER (WHERE tf.session_days >= 2)::int AS recurring_2plus,
         COUNT(DISTINCT tf.family_id) FILTER (
           WHERE tf.family_id IS NOT NULL AND cf.family_id IS NOT NULL
         )::int AS with_completion,
         COUNT(DISTINCT tf.family_id) FILTER (
           WHERE tf.family_id IS NOT NULL AND rd.family_id IS NOT NULL
         )::int AS with_routine_day,
         COUNT(DISTINCT tf.family_id) FILTER (
           WHERE tf.family_id IS NOT NULL AND fs.family_id IS NOT NULL
         )::int AS with_first_star
       FROM cohort_slice cs
       LEFT JOIN active_families af ON af.family_id = cs.family_id
       LEFT JOIN td_families tf ON tf.family_id = cs.family_id
       LEFT JOIN completion_families cf ON cf.family_id = cs.family_id
       LEFT JOIN routine_day_families rd ON rd.family_id = cs.family_id
       LEFT JOIN first_star_families fs ON fs.family_id = cs.family_id
       GROUP BY cs.is_new_7d, cs.is_new_30d
     )
     SELECT
       (SELECT COUNT(*)::int FROM active_families) AS active_families,
       (SELECT COUNT(*)::int FROM td_families) AS td_families,
       (SELECT COUNT(*)::int FROM td_families WHERE session_days >= 2) AS recurring_2plus_days,
       (SELECT COUNT(*)::int FROM td_families WHERE session_days >= 3) AS recurring_3plus_days,
       (SELECT COUNT(*)::int FROM td_families_30d WHERE session_days >= 7) AS recurring_7plus_days_30d,
       (SELECT COUNT(*)::int FROM td_families_30d) AS td_families_30d,
       (SELECT COUNT(*)::int FROM td_families tf JOIN completion_families cf ON cf.family_id = tf.family_id) AS td_with_completion,
       (SELECT COUNT(*)::int FROM td_families tf JOIN routine_day_families rd ON rd.family_id = tf.family_id) AS td_with_routine_day,
       (SELECT COUNT(*)::int FROM td_families tf JOIN first_star_families fs ON fs.family_id = tf.family_id) AS td_with_first_star,
       (SELECT total FROM friction_total) AS friction_events,
       (SELECT sessions FROM td_session_count) AS td_sessions,
       (SELECT families FROM classic_auth_td_enrolled) AS classic_auth_td_enrolled_families,
       (SELECT COALESCE(jsonb_object_agg(event_type, n), '{}'::jsonb) FROM friction_events) AS friction_by_type,
       (SELECT COALESCE(jsonb_agg(row_to_json(cm)), '[]'::jsonb) FROM cohort_metrics cm) AS cohort_rows`,
    [sessionTypes, activityTypes, frictionTypes]
  );

  const row = rows[0] || {};
  const activeFamilies = parseCount(row, 'active_families');
  const tdFamilies = parseCount(row, 'td_families');
  const recurring2 = parseCount(row, 'recurring_2plus_days');
  const recurring3 = parseCount(row, 'recurring_3plus_days');
  const recurring7_30d = parseCount(row, 'recurring_7plus_days_30d');
  const tdWithCompletion = parseCount(row, 'td_with_completion');
  const tdWithRoutineDay = parseCount(row, 'td_with_routine_day');
  const tdWithFirstStar = parseCount(row, 'td_with_first_star');
  const frictionEvents = parseCount(row, 'friction_events');
  const tdSessions = parseCount(row, 'td_sessions');
  const frictionByType = row.friction_by_type || {};

  function cohortFromRows(isNewKey) {
    const newRows = (row.cohort_rows || []).filter((r) => r[isNewKey] === true);
    const establishedRows = (row.cohort_rows || []).filter((r) => r[isNewKey] === false);
    function sum(rows, key) {
      return rows.reduce((acc, r) => acc + (parseInt(r[key], 10) || 0), 0);
    }
    const newActive = sum(newRows, 'active_families');
    const newTd = sum(newRows, 'td_families');
    const estActive = sum(establishedRows, 'active_families');
    const estTd = sum(establishedRows, 'td_families');
    return {
      new: {
        active_families: newActive,
        td_families: newTd,
        adoption_pct: pctRate(newTd, newActive),
        recurring_2plus_pct: pctRate(sum(newRows, 'recurring_2plus'), newTd),
        completion_pct: pctRate(sum(newRows, 'with_completion'), newTd),
        routine_day_pct: pctRate(sum(newRows, 'with_routine_day'), newTd),
        first_star_pct: pctRate(sum(newRows, 'with_first_star'), newTd),
      },
      established: {
        active_families: estActive,
        td_families: estTd,
        adoption_pct: pctRate(estTd, estActive),
        recurring_2plus_pct: pctRate(sum(establishedRows, 'recurring_2plus'), estTd),
        completion_pct: pctRate(sum(establishedRows, 'with_completion'), estTd),
        routine_day_pct: pctRate(sum(establishedRows, 'with_routine_day'), estTd),
        first_star_pct: pctRate(sum(establishedRows, 'with_first_star'), estTd),
      },
    };
  }

  return {
    adoption: {
      active_families: activeFamilies,
      td_families: tdFamilies,
      adoption_pct: pctRate(tdFamilies, activeFamilies),
    },
    recurring: {
      families_2plus_days: recurring2,
      families_2plus_pct: pctRate(recurring2, tdFamilies),
      families_3plus_days: recurring3,
      families_3plus_pct: pctRate(recurring3, tdFamilies),
      families_7plus_days_30d: recurring7_30d,
      families_7plus_pct_30d: pctRate(recurring7_30d, parseCount(row, 'td_families_30d')),
    },
    outcomes: {
      td_families_with_child_completion: tdWithCompletion,
      td_completion_pct: pctRate(tdWithCompletion, tdFamilies),
      td_families_with_routine_day: tdWithRoutineDay,
      td_routine_day_pct: pctRate(tdWithRoutineDay, tdFamilies),
      td_families_with_first_star_signal: tdWithFirstStar,
      td_first_star_pct: pctRate(tdWithFirstStar, tdFamilies),
      routine_day_definition: 'all_daily_log_items_completed_for_day',
    },
    friction: {
      total_events: frictionEvents,
      td_sessions: tdSessions,
      friction_pct_of_td_attempts: pctRate(frictionEvents, frictionEvents + tdSessions),
      classic_auth_td_enrolled_families: parseCount(row, 'classic_auth_td_enrolled_families'),
      by_type: frictionByType,
    },
    cohorts: {
      by_7d: cohortFromRows('is_new_7d'),
      by_30d: cohortFromRows('is_new_30d'),
    },
  };
}

async function computeUsageKpis(periodKey = '24h') {
  const interval = INTERVAL_MAP[periodKey] || INTERVAL_MAP['24h'];
  const sessionTypes = SESSION_EVENT_TYPES;
  const activityTypes = ACTIVITY_ANALYTICS_EVENT_TYPES;

  const [usageResult, trustedDevices, trustedImpact] = await Promise.all([
    db.query(
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
    ),
    fetchTrustedDeviceAggregateKpis(periodKey),
    fetchTrustedDeviceImpactKpis(periodKey),
  ]);

  const row = usageResult.rows[0] || {};
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
    trusted_devices: {
      ...trustedDevices,
      impact: trustedImpact,
    },
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
  fetchTrustedDeviceAggregateKpis,
  fetchTrustedDeviceImpactKpis,
  getUsageTrends,
  fetchActiveDaysUnion,
};
