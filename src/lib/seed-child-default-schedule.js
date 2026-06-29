'use strict';

const { SECTION_ORDER_SQL } = require('./default-schedule-order');

function getDb() {
  return require('./db');
}

const SECTION_TO_CATEGORY = { morgon: 'Morgon', dag: 'Dag', kvall: 'Kväll', natt: 'Natt' };
const CATEGORY_SORT = { morgon: 0, dag: 1, kvall: 2, natt: 3 };

function resolveDefaultScheduleName(birthday) {
  let name = 'Förskola vardag';
  if (!birthday) return name;

  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return name;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age >= 6) name = 'Skola vardag';
  return name;
}

/**
 * Seed weekly schedule from admin default_schedule tables.
 * Best-effort: callers should catch errors so child creation still succeeds.
 *
 * @returns {Promise<{ seeded: boolean, defaultScheduleName: string }>}
 */
async function seedChildDefaultSchedule({ childId, familyId, birthday }) {
  const defaultScheduleName = resolveDefaultScheduleName(birthday);

  const db = getDb();
  const defaultSchedRow = await db.query(
    'SELECT id FROM default_schedule WHERE name = $1 LIMIT 1',
    [defaultScheduleName]
  );
  if (defaultSchedRow.rows.length === 0) {
    return { seeded: false, defaultScheduleName };
  }

  const defaultSchedId = defaultSchedRow.rows[0].id;
  const defaultItems = await db.query(
    `SELECT name, icon, section, star_value, sort_order, start_time, end_time, sub_steps
     FROM default_schedule_item
     WHERE default_schedule_id = $1
     ORDER BY ${SECTION_ORDER_SQL}`,
    [defaultSchedId]
  );
  if (defaultItems.rows.length === 0) {
    return { seeded: false, defaultScheduleName };
  }

  const categoryMap = {};
  const existingCats = await db.query(
    'SELECT id, name FROM category WHERE family_id = $1',
    [familyId]
  );
  for (const ec of existingCats.rows) {
    categoryMap[ec.name] = ec.id;
  }

  const sectionsUsed = [...new Set(defaultItems.rows.map((r) => r.section))];
  for (const sec of sectionsUsed) {
    const catName = SECTION_TO_CATEGORY[sec] || 'Dag';
    if (!categoryMap[catName]) {
      const catResult = await db.query(
        `INSERT INTO category (family_id, name, sort_order, is_default)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        [familyId, catName, CATEGORY_SORT[sec] ?? 99]
      );
      categoryMap[catName] = catResult.rows[0].id;
    }
  }

  const templateMap = {};
  const itemNames = defaultItems.rows.map((r) => r.name);
  const existingTemplates = await db.query(
    'SELECT id, name FROM activity_template WHERE family_id = $1 AND LOWER(name) = ANY($2)',
    [familyId, itemNames.map((n) => n.toLowerCase())]
  );
  for (const et of existingTemplates.rows) {
    templateMap[et.name] = et.id;
  }

  const missingItems = defaultItems.rows.filter((item) => !templateMap[item.name]);
  for (const item of missingItems) {
    const catName = SECTION_TO_CATEGORY[item.section] || 'Dag';
    const catId = categoryMap[catName];
    const inserted = await db.query(
      `INSERT INTO activity_template (family_id, category_id, name, icon, star_value, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [familyId, catId, item.name, item.icon, item.star_value, item.sort_order]
    );
    const newTemplateId = inserted.rows[0].id;
    templateMap[item.name] = newTemplateId;

    const subSteps = item.sub_steps || [];
    if (Array.isArray(subSteps) && subSteps.length > 0) {
      for (let si = 0; si < subSteps.length; si++) {
        await db.query(
          `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [newTemplateId, subSteps[si].name, subSteps[si].icon || null, si]
        );
      }
    }
  }

  const existingTemplateIds = defaultItems.rows
    .filter((item) => !missingItems.includes(item) && item.sub_steps && Array.isArray(item.sub_steps) && item.sub_steps.length > 0)
    .map((item) => ({ id: templateMap[item.name], subSteps: item.sub_steps }))
    .filter((t) => t.id);

  for (const tpl of existingTemplateIds) {
    const existingSubs = await db.query(
      'SELECT COUNT(*) AS cnt FROM activity_sub_step WHERE activity_template_id = $1',
      [tpl.id]
    );
    if (parseInt(existingSubs.rows[0].cnt, 10) === 0) {
      for (let si = 0; si < tpl.subSteps.length; si++) {
        await db.query(
          `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [tpl.id, tpl.subSteps[si].name, tpl.subSteps[si].icon || null, si]
        );
      }
    }
  }

  const weekdaysOnly = [1, 2, 3, 4, 5];
  const schedResult = await db.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order)
     VALUES ${weekdaysOnly.map((_, i) => `($1, $${i + 2}, $${i + 2})`).join(', ')}
     RETURNING id, day_of_week`,
    [childId, ...weekdaysOnly]
  );

  const validItems = defaultItems.rows.filter((item) => templateMap[item.name]);
  if (validItems.length > 0 && schedResult.rows.length > 0) {
    const values = [];
    const params = [];
    let paramIdx = 1;
    for (const sched of schedResult.rows) {
      let sortIdx = 0;
      for (const item of validItems) {
        values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`);
        params.push(sched.id, templateMap[item.name], item.start_time || null, item.end_time || null, sortIdx++, item.section);
        paramIdx += 6;
      }
    }
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
       VALUES ${values.join(', ')}`,
      params
    );
  }

  if (familyId) {
    const { updateActivationState } = require('./activation-p0');
    updateActivationState(familyId, 'schema_saved', {
      metadata: { source: 'child_default_schedule_seed', default_schedule: defaultScheduleName },
    }).catch((err) => {
      console.error('[SEED-SCHEDULE] schema_saved milestone error:', err.message);
    });
  }

  return { seeded: true, defaultScheduleName };
}

module.exports = {
  resolveDefaultScheduleName,
  seedChildDefaultSchedule,
};
