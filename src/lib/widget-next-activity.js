'use strict';

const db = require('./db');
const { getOrGenerateDailyLog, getLocalDateStr } = require('./daily-log-generator');
const { compareChildDailyLogItems } = require('./daily-log-child-order');
const { enrichPictogramFieldsMany } = require('../../config/pictogram-library');
const { signInstanceToken } = require('./widget-instance-token');
const { getFamilyPreferredLocale } = require('./family-locale');
const { resolveActivityDisplayName } = require('./family-content-display');

const SECTION_ORDER = ['morgon', 'formiddag', 'dag', 'eftermiddag', 'kvall', 'natt'];

const ROUTINE_LABELS = {
  morgon: 'Morgon',
  formiddag: 'Förmiddag',
  dag: 'Dag',
  eftermiddag: 'Eftermiddag',
  kvall: 'Kväll',
  natt: 'Natt',
};

function sectionRank(section) {
  const idx = SECTION_ORDER.indexOf(section);
  return idx >= 0 ? idx : SECTION_ORDER.length;
}

function sortItemsForChild(items) {
  return [...items].sort((a, b) => {
    const sr = sectionRank(a.section) - sectionRank(b.section);
    if (sr !== 0) return sr;
    return compareChildDailyLogItems(a, b);
  });
}

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
  if (subMeta.sub_step_count > 0) {
    return { capability: 'open_app', reason: 'sub_steps' };
  }
  return { capability: 'direct_complete', reason: null };
}

/**
 * Pick the next activity for widget presentation.
 */
async function resolveWidgetNextAction(childId) {
  const childRes = await db.query(
    `SELECT id, family_id, timezone, require_sequential_completion, activity_timers_enabled
     FROM child WHERE id = $1`,
    [childId]
  );
  const child = childRes.rows[0];
  if (!child) {
    return { status: 'reauth_required' };
  }

  const tz = child.timezone || 'Europe/Stockholm';
  const dateStr = getLocalDateStr(undefined, tz);
  const { log, items } = await getOrGenerateDailyLog(childId, dateStr);
  if (log?.is_paused) {
    return { status: 'nothing_now' };
  }

  const sorted = sortItemsForChild(items);
  const total = sorted.length;
  const completed = sorted.filter((i) => i.completed).length;
  if (total > 0 && completed >= total) {
    return { status: 'all_done', progress: { completed, total } };
  }
  if (total === 0) {
    return { status: 'nothing_now', progress: { completed: 0, total: 0 } };
  }

  const templateIds = [...new Set(sorted.map((i) => i.activity_template_id).filter(Boolean))];
  const subMap = await loadSubStepCounts(templateIds);
  for (const item of sorted) {
    const meta = subMap[item.activity_template_id];
    if (meta) item._sub_meta = meta;
  }

  const requireSequential = child.require_sequential_completion === true;
  const childFlags = { activity_timers_enabled: child.activity_timers_enabled === true };

  let firstIncompleteSeen = false;
  for (const item of sorted) {
    if (item.completed) continue;
    if (requireSequential && firstIncompleteSeen) {
      break;
    }
    firstIncompleteSeen = true;

    const incompleteSubs = await incompleteSubStepCount(item.id);
    const cap = resolveWidgetCapability(item, childFlags, incompleteSubs);

    const locale = await getFamilyPreferredLocale(child.family_id);
    const title = await resolveActivityDisplayName(locale, item.name, item);
    const enriched = enrichPictogramFieldsMany([item])[0];

    if (cap.capability === 'open_app') {
      return {
        status: 'ready',
        activity: {
          instance_token: signInstanceToken(childId, item.id),
          title,
          image_key: enriched.icon_key || null,
          routine_title: ROUTINE_LABELS[item.section] || item.section,
          capability: 'open_app',
          open_app_reason: cap.reason,
          progress: { completed, total },
        },
      };
    }

    return {
      status: 'ready',
      activity: {
        instance_token: signInstanceToken(childId, item.id),
        title,
        image_key: enriched.icon_key || null,
        routine_title: ROUTINE_LABELS[item.section] || item.section,
        capability: 'direct_complete',
        progress: { completed, total },
      },
    };
  }

  return { status: 'nothing_now', progress: { completed, total } };
}

module.exports = {
  resolveWidgetNextAction,
  sortItemsForChild,
  resolveWidgetCapability,
};
