'use strict';

const db = require('../db');
const { t } = require('../i18n');
const { getFamilyLocale } = require('../onboarding-locale');

const SCHEDULE_TO_GROUP = {
  'Förskola vardag': 'forskola',
  'Skola vardag': 'skola',
  Helg: 'helg',
  'Kort morgon': 'morgon',
  Kvällsrutin: 'kvall',
};

const TEMPLATE_GROUP_ICONS = {
  forskola: '🏫',
  skola: '📚',
  morgon: '🌅',
  dag: '☀️',
  kvall: '🌙',
  helg: '🎉',
};

function getTemplateGroupMeta(lang) {
  const prefix = 'onboarding.templateGroups.';
  const keys = Object.keys(TEMPLATE_GROUP_ICONS);
  const meta = {};
  for (const key of keys) {
    meta[key] = {
      icon: TEMPLATE_GROUP_ICONS[key],
      name: t(lang, `${prefix}${key}.name`),
      description: t(lang, `${prefix}${key}.description`),
    };
  }
  return meta;
}

async function fetchStarterTemplateGroups(familyId) {
  const lang = await getFamilyLocale(familyId);
  const templateGroupMeta = getTemplateGroupMeta(lang);
  const result = await db.query(
    `SELECT ds.name AS schedule_name, COUNT(dsi.id) AS count
     FROM default_schedule ds
     LEFT JOIN default_schedule_item dsi ON dsi.default_schedule_id = ds.id
     GROUP BY ds.name, ds.sort_order
     ORDER BY ds.sort_order ASC`
  );

  return result.rows
    .map((r) => {
      const grpKey = SCHEDULE_TO_GROUP[r.schedule_name];
      if (!grpKey || !templateGroupMeta[grpKey]) return null;
      const activityCount = parseInt(r.count, 10);
      if (!activityCount) return null;
      return {
        key: grpKey,
        ...templateGroupMeta[grpKey],
        activity_count: activityCount,
      };
    })
    .filter(Boolean);
}

async function fetchFamilyTemplates(familyId) {
  const templates = await db.query(
    `SELECT ws.id, ws.name, ws.sort_order, ws.is_favorite,
            COUNT(wsi.id) AS item_count
     FROM weekly_schedule ws
     LEFT JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
     WHERE ws.family_id = $1 AND ws.child_id IS NULL
     GROUP BY ws.id
     HAVING COUNT(wsi.id) > 0
     ORDER BY ws.sort_order ASC, ws.name ASC`,
    [familyId]
  );
  return templates.rows.map((row) => ({
    id: row.id,
    name: row.name,
    sort_order: row.sort_order,
    is_favorite: row.is_favorite,
    item_count: parseInt(row.item_count, 10) || 0,
  }));
}

async function childHasWeeklySchedule(familyId, childId) {
  const result = await db.query(
    `SELECT 1 FROM weekly_schedule ws
     INNER JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
     WHERE ws.family_id = $1 AND ws.child_id = $2
     LIMIT 1`,
    [familyId, childId]
  );
  return result.rows.length > 0;
}

/**
 * @param {string} familyId
 * @param {string} [childId]
 */
async function childInFamily(familyId, childId) {
  const result = await db.query(
    'SELECT id FROM child WHERE family_id = $1 AND id = $2 LIMIT 1',
    [familyId, childId]
  );
  return result.rows.length > 0;
}

async function buildActivationScheduleOptions(familyId, childId) {
  let childOk = true;
  if (childId) {
    childOk = await childInFamily(familyId, childId);
  }

  const [starterGroups, familyTemplates, childrenRes] = await Promise.all([
    fetchStarterTemplateGroups(familyId),
    fetchFamilyTemplates(familyId),
    db.query(
      `SELECT id, name, emoji FROM child WHERE family_id = $1 ORDER BY created_at ASC`,
      [familyId]
    ),
  ]);

  const children = childrenRes.rows.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
  }));

  let targetChildId = childId || children[0]?.id || null;
  let childHasSchedule = false;
  if (targetChildId && childOk) {
    childHasSchedule = await childHasWeeklySchedule(familyId, targetChildId);
  }

  const hasAnyOptions = starterGroups.length > 0 || familyTemplates.length > 0;

  return {
    starter_templates: starterGroups,
    family_templates: familyTemplates,
    children,
    target_child_id: targetChildId,
    child_has_schedule: childHasSchedule,
    empty: !hasAnyOptions,
    invalid_child: childId ? !childOk : false,
  };
}

module.exports = {
  buildActivationScheduleOptions,
  fetchStarterTemplateGroups,
  fetchFamilyTemplates,
};
