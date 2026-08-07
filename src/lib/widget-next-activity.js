'use strict';

const db = require('./db');
const { enrichPictogramFieldsMany } = require('../../config/pictogram-library');
const { signInstanceToken } = require('./widget-instance-token');
const { getFamilyPreferredLocale } = require('./family-locale');
const { resolveActivityDisplayName } = require('./family-content-display');
const { resolveCanonicalChildNextActivity } = require('./canonical-child-next-activity');

const ROUTINE_LABELS = {
  morgon: 'Morgon',
  formiddag: 'Förmiddag',
  dag: 'Dag',
  eftermiddag: 'Eftermiddag',
  kvall: 'Kväll',
  natt: 'Natt',
};

async function loadSubStepCounts(templateIds) {
  const map = {};
  if (templateIds.length === 0) return map;
  const result = await db.query(
    `SELECT activity_template_id,
            COUNT(*)::int AS cnt,
            COUNT(*) FILTER (
              WHERE duration_seconds IS NOT NULL AND duration_seconds >= 5
            )::int AS timed_cnt
     FROM activity_sub_step
     WHERE activity_template_id = ANY($1::uuid[])
     GROUP BY activity_template_id`,
    [templateIds]
  );
  for (const row of result.rows) {
    map[row.activity_template_id] = {
      sub_step_count: row.cnt,
      sub_step_timed_count: row.timed_cnt,
    };
  }
  return map;
}

async function incompleteSubStepCount(dailyLogItemId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM activity_sub_step ass
     LEFT JOIN daily_log_item_sub_step dss
       ON dss.activity_sub_step_id = ass.id AND dss.daily_log_item_id = $1
     WHERE ass.activity_template_id = (
       SELECT activity_template_id FROM daily_log_item WHERE id = $1
     )
       AND COALESCE(dss.completed, false) = false`,
    [dailyLogItemId]
  );
  return result.rows[0]?.n || 0;
}

function resolveWidgetCapability(item, childFlags, incompleteSubs) {
  if (item.completed) {
    return { capability: 'none', reason: 'already_completed' };
  }
  if (incompleteSubs > 0) {
    return { capability: 'open_app', reason: 'sub_steps' };
  }
  const subMeta = item._sub_meta || {};
  if (childFlags.activity_timers_enabled && (subMeta.sub_step_timed_count > 0 || item.duration_seconds)) {
    return { capability: 'open_app', reason: 'timer' };
  }
  return { capability: 'direct_complete', reason: null };
}

/**
 * Pick the next activity for widget presentation (canonical Idag parity).
 */
async function resolveWidgetNextAction(childId) {
  const canonical = await resolveCanonicalChildNextActivity(childId, { audience: 'widget' });
  if (canonical.status === 'not_found') {
    return { status: 'reauth_required' };
  }
  if (canonical.status === 'paused') {
    return { status: 'nothing_now' };
  }
  const { completed, total } = canonical;
  if (canonical.status === 'all_done') {
    return { status: 'all_done', progress: { completed, total } };
  }
  if (canonical.status === 'nothing_now') {
    return { status: 'nothing_now', progress: { completed, total } };
  }

  const item = canonical.primaryItem;
  const sorted = canonical.sortedItems;
  const childFlags = { activity_timers_enabled: canonical.activityTimersEnabled === true };

  const templateIds = [...new Set(sorted.map((i) => i.activity_template_id).filter(Boolean))];
  const subMap = await loadSubStepCounts(templateIds);
  const meta = subMap[item.activity_template_id];
  if (meta) item._sub_meta = meta;

  const incompleteSubs = await incompleteSubStepCount(item.id);
  const cap = resolveWidgetCapability(item, childFlags, incompleteSubs);

  const locale = await getFamilyPreferredLocale(canonical.familyId);
  const title = await resolveActivityDisplayName(locale, item.name, item);
  const enriched = enrichPictogramFieldsMany([item])[0];

  const instanceToken = signInstanceToken(childId, item.id);
  const panel = cap.reason === 'timer' ? 'timer' : cap.reason === 'sub_steps' ? 'substeps' : null;
  let openAppPath = `/child/today?widget_focus=${encodeURIComponent(instanceToken)}`;
  if (panel) {
    openAppPath += `&panel=${panel}`;
  }

  const activityPayload = {
    instance_token: instanceToken,
    title,
    image_key: enriched.icon_key || null,
    routine_title: ROUTINE_LABELS[item.section] || item.section,
    capability: cap.capability,
    progress: { completed, total },
    open_app_path: openAppPath,
  };
  if (cap.reason) {
    activityPayload.open_app_reason = cap.reason;
  }
  if (cap.reason === 'timer' && item.duration_seconds) {
    activityPayload.duration_seconds = item.duration_seconds;
  }

  return {
    status: 'ready',
    activity: activityPayload,
  };
}

module.exports = {
  resolveWidgetNextAction,
  resolveWidgetCapability,
  incompleteSubStepCount,
};
