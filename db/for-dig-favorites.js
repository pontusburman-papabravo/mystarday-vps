'use strict';

const db = require('../src/lib/db');
const { FOR_DIG_GOALS, getGoalBySlug } = require('../src/lib/for-dig-config');

async function toggleGoalFavorite(parentId, familyId, goalSlug) {
  if (!getGoalBySlug(goalSlug)) {
    const err = new Error('Utvecklingsmålet hittades inte');
    err.status = 404;
    throw err;
  }

  const existing = await db.query(
    `SELECT 1 FROM for_dig_goal_favorite WHERE parent_id = $1 AND goal_slug = $2`,
    [parentId, goalSlug]
  );

  if (existing.rows.length > 0) {
    await db.query(
      `DELETE FROM for_dig_goal_favorite WHERE parent_id = $1 AND goal_slug = $2`,
      [parentId, goalSlug]
    );
    return { is_favorite: false, goal_slug: goalSlug };
  }

  await db.query(
    `INSERT INTO for_dig_goal_favorite (family_id, parent_id, goal_slug)
     VALUES ($1, $2, $3)`,
    [familyId, parentId, goalSlug]
  );
  return { is_favorite: true, goal_slug: goalSlug };
}

async function getGoalFavoriteSlugs(parentId) {
  const result = await db.query(
    `SELECT goal_slug FROM for_dig_goal_favorite WHERE parent_id = $1 ORDER BY created_at DESC`,
    [parentId]
  );
  return result.rows.map((r) => r.goal_slug);
}

async function listFavorites(parentId, familyId) {
  const goalSlugs = await getGoalFavoriteSlugs(parentId);
  const goals = goalSlugs
    .map((slug) => {
      const goal = getGoalBySlug(slug);
      if (!goal) return null;
      return {
        goal_slug: goal.slug,
        title: goal.title,
        icon: goal.icon,
        activate_label: goal.activateLabel || 'Aktivera',
      };
    })
    .filter(Boolean);

  const [activities, rewards, schedules] = await Promise.all([
    db.query(
      `SELECT id, name, icon FROM activity_template
       WHERE family_id = $1 AND is_favorite = true
       ORDER BY sort_order ASC, name ASC`,
      [familyId]
    ),
    db.query(
      `SELECT id, name, icon FROM reward
       WHERE family_id = $1 AND is_favorite = true AND is_active = true
       ORDER BY sort_order ASC, name ASC`,
      [familyId]
    ),
    db.query(
      `SELECT id, name FROM weekly_schedule
       WHERE family_id = $1 AND child_id IS NULL AND is_favorite = true
       ORDER BY sort_order ASC, name ASC`,
      [familyId]
    ),
  ]);

  return {
    goals,
    activities: activities.rows,
    rewards: rewards.rows,
    schedules: schedules.rows.map((r) => ({
      id: r.id,
      name: r.name,
    })),
  };
}

async function getInstallLeaderboard(days = 90, minCount = 5) {
  const result = await db.query(
    `SELECT goal_slug, COUNT(DISTINCT family_id)::int AS install_count
     FROM for_dig_goal_install
     WHERE installed_at >= NOW() - ($1::int || ' days')::interval
     GROUP BY goal_slug
     HAVING COUNT(DISTINCT family_id) >= $2
     ORDER BY install_count DESC, goal_slug ASC`,
    [days, minCount]
  );

  return result.rows.map((row, index) => {
    const goal = getGoalBySlug(row.goal_slug);
    return {
      rank: index + 1,
      goal_slug: row.goal_slug,
      title: goal ? goal.title : row.goal_slug,
      icon: goal ? goal.icon : '⭐',
      install_count: row.install_count,
    };
  });
}

module.exports = {
  toggleGoalFavorite,
  getGoalFavoriteSlugs,
  listFavorites,
  getInstallLeaderboard,
};
