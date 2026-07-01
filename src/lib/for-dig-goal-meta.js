'use strict';

const db = require('./db');
const { getGoalBySlug } = require('./for-dig-config');

function goalMetaFromSlug(slug) {
  if (!slug) return null;
  const goal = getGoalBySlug(slug);
  if (!goal) return null;
  return {
    slug: goal.slug,
    icon: goal.icon,
    title: goal.title,
    accentColor: goal.accentColor,
    accentBg: goal.accentBg,
  };
}

function attachGoalMeta(row) {
  if (!row || !row.for_dig_goal_slug) return row;
  const for_dig_goal = goalMetaFromSlug(row.for_dig_goal_slug);
  if (!for_dig_goal) return row;
  return { ...row, for_dig_goal };
}

function attachGoalMetaToMany(rows) {
  return rows.map(attachGoalMeta);
}

async function enrichLogItemsWithForDigGoal(items) {
  if (!items || items.length === 0) return items;

  const templateIds = [...new Set(items.map((i) => i.activity_template_id).filter(Boolean))];
  if (templateIds.length === 0) return items;

  const result = await db.query(
    `SELECT id, for_dig_goal_slug
     FROM activity_template
     WHERE id = ANY($1::uuid[]) AND for_dig_goal_slug IS NOT NULL`,
    [templateIds]
  );
  const slugByTemplate = Object.fromEntries(
    result.rows.map((row) => [row.id, row.for_dig_goal_slug])
  );

  return items.map((item) => {
    const slug = slugByTemplate[item.activity_template_id];
    if (!slug) return item;
    const for_dig_goal = goalMetaFromSlug(slug);
    return for_dig_goal ? { ...item, for_dig_goal } : item;
  });
}

module.exports = {
  goalMetaFromSlug,
  attachGoalMeta,
  attachGoalMetaToMany,
  enrichLogItemsWithForDigGoal,
};
