'use strict';

const db = require('../../lib/db');
const { getSchoolVariant } = require('../../lib/daily-log-generator');

async function getChildFamilyId(childId) {
  const r = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
  return r.rows[0]?.family_id || null;
}

async function getSectionTimes(childId) {
  const result = await db.query(
    `SELECT f.morning_start, f.morning_end, f.day_start, f.day_end,
            f.evening_start, f.evening_end, f.night_start, f.night_end
     FROM family f
     JOIN child c ON c.family_id = f.id
     WHERE c.id = $1`,
    [childId]
  );
  return result.rows[0] || {};
}

/** Normalize ?date= query to YYYY-MM-DD in child timezone when omitted. */
function parseLogDate(queryDate, timezone = 'Europe/Stockholm') {
  let dateStr = queryDate;
  if (!dateStr) {
    dateStr = new Date().toLocaleDateString('sv-SE', { timeZone: timezone });
  } else {
    const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) dateStr = m[1];
  }
  return dateStr;
}

function groupItemsBySection(items) {
  const sections = {};
  for (const item of items) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }
  return sections;
}

function attachSchoolVariantToItems(items, birthday) {
  const schoolVariant = getSchoolVariant(birthday);
  const itemsWithVariant = items.map((item) => ({
    ...item,
    age_variant: (item.name === 'Skola/Förskola' || item.name === 'Skola')
      ? schoolVariant
      : null,
  }));
  return { schoolVariant, itemsWithVariant };
}

/** Attach sub_steps from activity_template for daily log items (engångsaktiviteter m.m.). */
async function enrichLogItemSubSteps(items) {
  const templateIds = [...new Set(
    items.filter((i) => i.activity_template_id).map((i) => i.activity_template_id)
  )];
  if (templateIds.length === 0) return items;

  const subRes = await db.query(
    `SELECT activity_template_id,
            json_agg(json_build_object('id', id, 'name', name, 'icon', icon, 'sort_order', sort_order)
              ORDER BY sort_order ASC, id ASC) AS steps
     FROM activity_sub_step
     WHERE activity_template_id = ANY($1::uuid[])
     GROUP BY activity_template_id`,
    [templateIds]
  );
  const subMap = new Map(subRes.rows.map((r) => [r.activity_template_id, r.steps || []]));

  return items.map((item) => {
    if (!item.activity_template_id) return item;
    const steps = subMap.get(item.activity_template_id);
    if (!steps || steps.length === 0) return item;
    return { ...item, sub_steps: steps, sub_step_count: steps.length };
  });
}

async function getChildOwnedLogItem(itemId, childId) {
  const itemResult = await db.query(
    `SELECT dli.id, dli.activity_template_id, dl.child_id, dl.is_paused
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dli.id = $1 AND dl.child_id = $2`,
    [itemId, childId]
  );
  return itemResult.rows[0] || null;
}

module.exports = {
  getChildFamilyId,
  getSectionTimes,
  parseLogDate,
  groupItemsBySection,
  attachSchoolVariantToItems,
  enrichLogItemSubSteps,
  getChildOwnedLogItem,
};
