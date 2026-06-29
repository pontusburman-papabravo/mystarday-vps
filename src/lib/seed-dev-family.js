'use strict';

/**
 * Minimal family seed for localhost dev-child login (activities, rewards, schedule).
 */

const db = require('./db');

const DEV_ACTIVITIES = [
  { name: 'Vakna', icon: '🛏️', category: 'Morgon', star_value: 1, sort_order: 0, section: 'morgon', start_time: '07:00' },
  { name: 'Klä på sig', icon: '👕', category: 'Morgon', star_value: 1, sort_order: 1, section: 'morgon', start_time: '07:15' },
  { name: 'Frukost', icon: '🍳', category: 'Morgon', star_value: 1, sort_order: 2, section: 'morgon', start_time: '07:30' },
  { name: 'Leka', icon: '🧩', category: 'Dag', star_value: 1, sort_order: 0, section: 'dag', start_time: '10:00' },
  { name: 'Middag', icon: '🍽️', category: 'Kväll', star_value: 1, sort_order: 0, section: 'kvall', start_time: '17:30' },
  { name: 'Sova', icon: '😴', category: 'Kväll', star_value: 1, sort_order: 1, section: 'kvall', start_time: '20:00' },
];

const DEV_REWARDS = [
  { name: 'Glass', icon: '🍦', star_cost: 5 },
  { name: 'Extra skärmtid', icon: '📱', star_cost: 10 },
];

async function ensureCategory(familyId, name, sortOrder) {
  const existing = await db.query(
    'SELECT id FROM category WHERE family_id = $1 AND name = $2 LIMIT 1',
    [familyId, name]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const inserted = await db.query(
    `INSERT INTO category (family_id, name, sort_order, is_default)
     VALUES ($1, $2, $3, true) RETURNING id`,
    [familyId, name, sortOrder]
  );
  return inserted.rows[0].id;
}

async function seedDevActivities(familyId) {
  const categoryIds = {};
  for (const act of DEV_ACTIVITIES) {
    if (!categoryIds[act.category]) {
      categoryIds[act.category] = await ensureCategory(familyId, act.category, act.section === 'morgon' ? 0 : act.section === 'dag' ? 1 : 2);
    }
  }
  const templateIds = {};
  for (const act of DEV_ACTIVITIES) {
    const row = await db.query(
      `INSERT INTO activity_template (family_id, category_id, name, icon, star_value, sort_order, time_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [familyId, categoryIds[act.category], act.name, act.icon, act.star_value, act.sort_order, act.section]
    );
    templateIds[act.name] = row.rows[0].id;
  }
  return templateIds;
}

async function seedDevRewards(familyId) {
  for (let i = 0; i < DEV_REWARDS.length; i++) {
    const r = DEV_REWARDS[i];
    await db.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, sort_order)
       VALUES ($1, $2, $3, $4, true, true, $5)`,
      [familyId, r.name, r.icon, r.star_cost, i]
    );
  }
}

async function seedDevWeeklySchedule(familyId, childId) {
  let templateRows = await db.query(
    'SELECT id, name FROM activity_template WHERE family_id = $1',
    [familyId]
  );
  if (templateRows.rows.length === 0) {
    await seedDevActivities(familyId);
    templateRows = await db.query(
      'SELECT id, name FROM activity_template WHERE family_id = $1',
      [familyId]
    );
  }
  const byName = {};
  for (const row of templateRows.rows) byName[row.name] = row.id;

  const weekdays = [1, 2, 3, 4, 5];
  for (const dow of weekdays) {
    const sched = await db.query(
      `INSERT INTO weekly_schedule (child_id, family_id, day_of_week, name, sort_order)
       VALUES ($1, $2, $3, 'Dev vardag', $4) RETURNING id`,
      [childId, familyId, dow, dow]
    );
    const scheduleId = sched.rows[0].id;
    let sortIdx = 0;
    for (const act of DEV_ACTIVITIES) {
      const templateId = byName[act.name];
      if (!templateId) continue;
      await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
         VALUES ($1, $2, $3, NULL, $4, $5)`,
        [scheduleId, templateId, act.start_time, sortIdx++, act.section]
      );
    }
  }
}

/**
 * Idempotent: fills gaps so dev child has a working Idag-vy.
 */
async function ensureDevFamilyReady(familyId, childId) {
  const acts = await db.query(
    'SELECT COUNT(*)::int AS n FROM activity_template WHERE family_id = $1',
    [familyId]
  );
  if (acts.rows[0].n === 0) {
    await seedDevActivities(familyId);
  }

  const rwds = await db.query(
    'SELECT COUNT(*)::int AS n FROM reward WHERE family_id = $1',
    [familyId]
  );
  if (rwds.rows[0].n === 0) {
    await seedDevRewards(familyId);
  }

  const sched = await db.query(
    'SELECT COUNT(*)::int AS n FROM weekly_schedule WHERE child_id = $1',
    [childId]
  );
  if (sched.rows[0].n === 0) {
    await seedDevWeeklySchedule(familyId, childId);
  }
}

module.exports = {
  ensureDevFamilyReady,
  DEV_ACTIVITIES,
};
