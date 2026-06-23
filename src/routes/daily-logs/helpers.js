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
  getChildOwnedLogItem,
};
