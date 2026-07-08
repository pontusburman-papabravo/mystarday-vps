'use strict';

const db = require('../src/lib/db');

async function getChildRow(childId) {
  const r = await db.query(
    `SELECT id, family_id, name, emoji, avatar_url, avatar_config, house_config, birthday
     FROM child WHERE id = $1`,
    [childId]
  );
  return r.rows[0] || null;
}

async function updateAvatarConfig(childId, patch) {
  const r = await db.query(
    `UPDATE child
     SET avatar_config = avatar_config || $2::jsonb
     WHERE id = $1
     RETURNING avatar_config`,
    [childId, JSON.stringify(patch)]
  );
  return r.rows[0]?.avatar_config || {};
}

async function updateHouseConfig(childId, patch) {
  const r = await db.query(
    `UPDATE child
     SET house_config = house_config || $2::jsonb
     WHERE id = $1
     RETURNING house_config`,
    [childId, JSON.stringify(patch)]
  );
  return r.rows[0]?.house_config || {};
}

async function getChildAchievements(childId) {
  const r = await db.query(
    `SELECT ad.slug, ad.name, ad.description, ad.emoji, ca.unlocked_at
     FROM child_achievement ca
     JOIN achievement_definition ad ON ad.slug = ca.achievement_slug
     WHERE ca.child_id = $1
     ORDER BY ca.unlocked_at DESC`,
    [childId]
  );
  return r.rows;
}

async function getChildCollectibles(childId) {
  const r = await db.query(
    `SELECT cc.slug, cc.name, cc.emoji, cc.rarity, cc.star_cost, ccol.unlocked_at
     FROM child_collectible ccol
     JOIN collectible_catalog cc ON cc.slug = ccol.collectible_slug
     WHERE ccol.child_id = $1
     ORDER BY ccol.unlocked_at DESC`,
    [childId]
  );
  return r.rows;
}

async function getAllCollectibles() {
  const r = await db.query(
    `SELECT slug, name, emoji, rarity, unlock_rule, star_cost, sort_order
     FROM collectible_catalog ORDER BY sort_order ASC`
  );
  return r.rows;
}

async function getAllAchievements() {
  const r = await db.query(
    `SELECT slug, name, description, emoji, unlock_rule, sort_order
     FROM achievement_definition ORDER BY sort_order ASC`
  );
  return r.rows;
}

async function unlockAchievement(childId, slug) {
  await db.query(
    `INSERT INTO child_achievement (child_id, achievement_slug)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [childId, slug]
  );
}

async function unlockCollectible(childId, slug) {
  await db.query(
    `INSERT INTO child_collectible (child_id, collectible_slug)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [childId, slug]
  );
}

async function getPet(childId) {
  const r = await db.query(
    `SELECT species, name, mood, accessory, adopted_at FROM child_pet WHERE child_id = $1`,
    [childId]
  );
  return r.rows[0] || null;
}

async function upsertPet(childId, { species, name, accessory }) {
  const r = await db.query(
    `INSERT INTO child_pet (child_id, species, name, accessory)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (child_id) DO UPDATE SET
       species = COALESCE(EXCLUDED.species, child_pet.species),
       name = COALESCE(EXCLUDED.name, child_pet.name),
       accessory = COALESCE(EXCLUDED.accessory, child_pet.accessory)
     RETURNING species, name, mood, accessory, adopted_at`,
    [childId, species || 'dog', name || null, accessory || 'none']
  );
  return r.rows[0];
}

async function getChildStats(childId) {
  const [earned, completions, redemptions, streak] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(dli.star_value), 0)::int AS earned
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [childId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS cnt
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [childId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS cnt
       FROM reward_redemption
       WHERE child_id = $1 AND status IN ('approved', 'auto')`,
      [childId]
    ),
    db.query(
      `SELECT current_streak FROM streak WHERE child_id = $1`,
      [childId]
    ),
  ]);

  let manualStars = 0;
  try {
    const m = await db.query(
      `SELECT COALESCE(SUM(star_count), 0)::int AS manual FROM manual_star_grant WHERE child_id = $1`,
      [childId]
    );
    manualStars = m.rows[0].manual;
  } catch (_) { /* table may not exist */ }

  return {
    lifetime_stars: parseInt(earned.rows[0].earned, 10) + manualStars,
    completions: completions.rows[0].cnt,
    redemptions: redemptions.rows[0].cnt,
    streak: streak.rows[0]?.current_streak || 0,
    has_completion: completions.rows[0].cnt > 0,
  };
}

async function getFamilyMuseumStats(familyId) {
  const [completions, redemptions, stars, children] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS cnt
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1 AND dli.completed = true`,
      [familyId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS cnt
       FROM reward_redemption rr
       JOIN child c ON c.id = rr.child_id
       WHERE c.family_id = $1 AND rr.status IN ('approved', 'auto')`,
      [familyId]
    ),
    db.query(
      `SELECT COALESCE(SUM(dli.star_value), 0)::int AS stars
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1 AND dli.completed = true`,
      [familyId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS cnt FROM child WHERE family_id = $1`,
      [familyId]
    ),
  ]);

  const topRewards = await db.query(
    `SELECT r.name, r.icon, COUNT(*)::int AS cnt
     FROM reward_redemption rr
     JOIN reward r ON r.id = rr.reward_id
     JOIN child c ON c.id = rr.child_id
     WHERE c.family_id = $1 AND rr.status IN ('approved', 'auto')
     GROUP BY r.id, r.name, r.icon
     ORDER BY cnt DESC
     LIMIT 8`,
    [familyId]
  );

  const achievements = await db.query(
    `SELECT COUNT(*)::int AS cnt
     FROM child_achievement ca
     JOIN child c ON c.id = ca.child_id
     WHERE c.family_id = $1`,
    [familyId]
  );

  return {
    total_completions: completions.rows[0].cnt,
    total_redemptions: redemptions.rows[0].cnt,
    total_stars_earned: stars.rows[0].stars,
    child_count: children.rows[0].cnt,
    total_achievements: achievements.rows[0].cnt,
    top_rewards: topRewards.rows,
  };
}

async function getYearStory(childId, year) {
  const y = year || new Date().getFullYear();
  const start = `${y}-01-01`;
  const end = `${y}-12-31`;

  const [completions, redemptions, achievements, monthlyActivity] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS cnt
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true
         AND dl.date BETWEEN $2 AND $3`,
      [childId, start, end]
    ),
    db.query(
      `SELECT rr.created_at, r.name, r.icon
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = $1 AND rr.status IN ('approved', 'auto')
         AND rr.created_at::date BETWEEN $2 AND $3
       ORDER BY rr.created_at ASC`,
      [childId, start, end]
    ),
    db.query(
      `SELECT ad.name, ad.emoji, ca.unlocked_at
       FROM child_achievement ca
       JOIN achievement_definition ad ON ad.slug = ca.achievement_slug
       WHERE ca.child_id = $1
         AND ca.unlocked_at::date BETWEEN $2 AND $3
       ORDER BY ca.unlocked_at ASC`,
      [childId, start, end]
    ),
    db.query(
      `SELECT EXTRACT(MONTH FROM dl.date)::int AS month,
              COUNT(DISTINCT dl.date)::int AS active_days,
              COALESCE(SUM(dli.star_value), 0)::int AS stars
       FROM daily_log dl
       JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = $1 AND dl.date BETWEEN $2 AND $3 AND dli.completed = true
       GROUP BY EXTRACT(MONTH FROM dl.date)
       ORDER BY month ASC`,
      [childId, start, end]
    ),
  ]);

  let manualByMonth = [];
  try {
    const manual = await db.query(
      `SELECT EXTRACT(MONTH FROM created_at)::int AS month,
              COALESCE(SUM(star_count), 0)::int AS stars
       FROM manual_star_grant
       WHERE child_id = $1 AND created_at::date BETWEEN $2 AND $3
       GROUP BY EXTRACT(MONTH FROM created_at)
       ORDER BY month ASC`,
      [childId, start, end]
    );
    manualByMonth = manual.rows;
  } catch (_) { /* table may not exist */ }

  const monthMap = {};
  monthlyActivity.rows.forEach(function (row) {
    monthMap[row.month] = {
      month: row.month,
      active_days: row.active_days,
      stars: row.stars,
    };
  });
  manualByMonth.forEach(function (row) {
    if (!monthMap[row.month]) {
      monthMap[row.month] = { month: row.month, active_days: 0, stars: 0 };
    }
    monthMap[row.month].stars += row.stars;
  });

  const now = new Date();
  const lastMonth = y < now.getFullYear() ? 12 : now.getMonth() + 1;
  const months = [];
  for (let m = 1; m <= lastMonth; m++) {
    const entry = monthMap[m] || { month: m, active_days: 0, stars: 0 };
    months.push({
      month: m,
      active_days: entry.active_days || 0,
      stars: entry.stars || 0,
    });
  }

  return {
    year: y,
    completions: completions.rows[0].cnt,
    redemptions: redemptions.rows,
    achievements: achievements.rows,
    months: months,
  };
}

module.exports = {
  getChildRow,
  updateAvatarConfig,
  updateHouseConfig,
  getChildAchievements,
  getChildCollectibles,
  getAllCollectibles,
  getAllAchievements,
  unlockAchievement,
  unlockCollectible,
  getPet,
  upsertPet,
  getChildStats,
  getFamilyMuseumStats,
  getYearStory,
};
