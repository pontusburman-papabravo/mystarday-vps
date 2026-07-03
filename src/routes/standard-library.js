/**
 * Standard Library routes — browse & copy admin-created default activities, rewards, and schedules.
 *
 * Activities are returned as a FLAT list (no category grouping).
 * Parents can copy individual activities or batches to their own library.
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { syncDailyLogWithSchedule } = require('../lib/daily-log-generator');
const { broadcast } = require('../lib/sse-broadcast');
const { insertFamilyActivityFromDefault } = require('../lib/standard-library-copy');

const router = express.Router();
router.use(requireParent);
// Gate 2K: standardbibliotek — all parent-facing routes require feature access
router.use(requireFeature('standardbibliotek'));

// ─── GET /api/standard-library ─────────────────────────────
// Returns all default activities as a flat list with copy status per family.
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, icon, star_value, sort_order, sub_steps
       FROM default_activity_template
       ORDER BY sort_order ASC, name ASC`
    );

    // Check which default activities the family already has (by name match)
    const familyActivities = await db.query(
      `SELECT LOWER(name) as lname FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    const existingNames = new Set(familyActivities.rows.map(a => a.lname));

    const activities = result.rows.map(a => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      star_value: a.star_value,
      sort_order: a.sort_order,
      sub_steps: a.sub_steps || [],
      already_copied: existingNames.has(a.name.toLowerCase()),
    }));

    res.json(activities);
  } catch (err) {
    console.error('[STANDARD-LIBRARY] List error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/activities/copy-batch ─────────
// Copies multiple default activities into the parent's family library
router.post('/activities/copy-batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Inga aktiviteter valda.' });
    }

    // Fetch all requested default activities
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const defaults = await db.query(
      `SELECT id, name, icon, star_value, sub_steps, seven_questions FROM default_activity_template WHERE id IN (${placeholders})`,
      ids
    );
    if (defaults.rows.length === 0) {
      return res.status(404).json({ error: 'Inga av de valda aktiviteterna hittades.' });
    }

    // Check which ones are already in the family
    const existing = await db.query(
      `SELECT LOWER(name) as lname FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    const existingNames = new Set(existing.rows.map(a => a.lname));

    const toCopy = defaults.rows.filter(a => !existingNames.has(a.name.toLowerCase()));

    if (toCopy.length === 0) {
      return res.status(409).json({ error: 'Alla valda aktiviteter finns redan i ditt bibliotek.' });
    }

    // Get max sort_order for existing activities
    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const act of toCopy) {
        await insertFamilyActivityFromDefault(client, req.user.familyId, act, nextOrder++);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const skipped = ids.length - toCopy.length;
    let message = `${toCopy.length} ${toCopy.length === 1 ? 'aktivitet kopierad' : 'aktiviteter kopierade'}`;
    if (skipped > 0) message += ` (${skipped} redan i biblioteket)`;

    res.status(201).json({ message, copied: toCopy.length, skipped });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Batch activity copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/activities/:id/copy ───────────
// Copies a single default activity into the parent's family library
router.post('/activities/:id/copy', async (req, res) => {
  try {
    const { id } = req.params;

    const defaultAct = await db.query(
      `SELECT id, name, icon, star_value, sub_steps, seven_questions FROM default_activity_template WHERE id = $1`,
      [id]
    );
    if (defaultAct.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte.' });
    }

    const act = defaultAct.rows[0];

    // Check if family already has this activity by name
    const existing = await db.query(
      `SELECT id FROM activity_template WHERE family_id = $1 AND LOWER(name) = LOWER($2)`,
      [req.user.familyId, act.name]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Du har redan "${act.name}" i ditt bibliotek.` });
    }

    // Get next sort_order
    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    const nextOrder = parseInt(maxSort.rows[0].next_order, 10);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      await insertFamilyActivityFromDefault(client, req.user.familyId, act, nextOrder);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({ message: `"${act.name}" har kopierats till ditt bibliotek!` });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Activity copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── Backward compat: POST /api/standard-library/:group/copy ─────
// Legacy route that copies all activities into the parent's library.
// Kept for backward compatibility but now copies all default activities regardless of group.
router.post('/:group/copy', async (req, res) => {
  try {
    // Fetch all default activities
    const activities = await db.query(
      `SELECT id, name, icon, star_value, sub_steps, seven_questions
       FROM default_activity_template
       ORDER BY sort_order ASC`
    );

    if (activities.rows.length === 0) {
      return res.status(404).json({ error: 'Inga aktiviteter hittades.' });
    }

    // Check which are already in the family
    const existing = await db.query(
      `SELECT LOWER(name) as lname FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    const existingNames = new Set(existing.rows.map(a => a.lname));
    const toCopy = activities.rows.filter(a => !existingNames.has(a.name.toLowerCase()));

    if (toCopy.length === 0) {
      return res.status(409).json({ error: 'Alla aktiviteter finns redan i ditt bibliotek.' });
    }

    // Get max sort_order
    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const act of toCopy) {
        await insertFamilyActivityFromDefault(client, req.user.familyId, act, nextOrder++);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({
      message: `${toCopy.length} aktiviteter har kopierats till ditt bibliotek!`,
      activities_copied: toCopy.length,
    });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/standard-library/rewards ─────────────────────
// Returns all default rewards with copy status
router.get('/rewards', async (req, res) => {
  try {
    const defaultRewards = await db.query(
      `SELECT id, name, icon, star_cost, sort_order
       FROM default_reward
       ORDER BY sort_order ASC`
    );

    const familyRewards = await db.query(
      `SELECT source_default_id FROM reward
       WHERE family_id = $1 AND source_default_id IS NOT NULL`,
      [req.user.familyId]
    );
    const copiedIds = new Set(familyRewards.rows.map(r => r.source_default_id));

    const rewards = defaultRewards.rows.map(r => ({
      ...r,
      already_copied: copiedIds.has(r.id),
    }));

    res.json(rewards);
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Rewards list error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/rewards/copy-batch ─────────
// Copies multiple default rewards into the parent's family library
router.post('/rewards/copy-batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Inga belöningar valda.' });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const defaultRewards = await db.query(
      `SELECT id, name, icon, star_cost FROM default_reward WHERE id IN (${placeholders})`,
      ids
    );
    if (defaultRewards.rows.length === 0) {
      return res.status(404).json({ error: 'Inga av de valda belöningarna hittades.' });
    }

    const existingCopies = await db.query(
      `SELECT source_default_id FROM reward WHERE family_id = $1 AND source_default_id = ANY($2::uuid[])`,
      [req.user.familyId, ids]
    );
    const alreadyCopiedIds = new Set(existingCopies.rows.map(r => r.source_default_id));

    const toCopy = defaultRewards.rows.filter(r => !alreadyCopiedIds.has(r.id));

    if (toCopy.length === 0) {
      return res.status(409).json({ error: 'Alla valda belöningar finns redan i ditt bibliotek.' });
    }

    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM reward WHERE family_id = $1`,
      [req.user.familyId]
    );
    let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

    for (const r of toCopy) {
      await db.query(
        `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, sort_order, source_default_id, modified_by_family)
         VALUES ($1, $2, $3, $4, false, true, $5, $6, false)`,
        [req.user.familyId, r.name, r.icon, r.star_cost, nextOrder++, r.id]
      );
    }

    const skipped = ids.length - toCopy.length;
    let message = `${toCopy.length} ${toCopy.length === 1 ? 'belöning kopierad' : 'belöningar kopierade'}`;
    if (skipped > 0) message += ` (${skipped} redan i biblioteket)`;

    res.status(201).json({ message, copied: toCopy.length, skipped });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Batch reward copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/rewards/:id/copy ───────────
// Copies a single default reward into the parent's family library
router.post('/rewards/:id/copy', async (req, res) => {
  try {
    const { id } = req.params;

    const defaultReward = await db.query(
      `SELECT id, name, icon, star_cost FROM default_reward WHERE id = $1`,
      [id]
    );
    if (defaultReward.rows.length === 0) {
      return res.status(404).json({ error: 'Standardbelöningen hittades inte.' });
    }

    const r = defaultReward.rows[0];

    const existing = await db.query(
      `SELECT id FROM reward WHERE family_id = $1 AND source_default_id = $2`,
      [req.user.familyId, id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Du har redan en kopia av "${r.name}" i ditt bibliotek.` });
    }

    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM reward WHERE family_id = $1`,
      [req.user.familyId]
    );
    const nextOrder = parseInt(maxSort.rows[0].next_order, 10);

    await db.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, sort_order, source_default_id, modified_by_family)
       VALUES ($1, $2, $3, $4, false, true, $5, $6, false)`,
      [req.user.familyId, r.name, r.icon, r.star_cost, nextOrder, r.id]
    );

    res.status(201).json({ message: `"${r.name}" har kopierats till ditt belöningsbibliotek!` });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Reward copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/standard-library/schedules ─────────────────
// Returns all admin-created standard schedules with items.
// Single JOIN query to avoid N+1 — items grouped in-memory.
router.get('/schedules', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT ds.id AS schedule_id, ds.name AS schedule_name, ds.description, ds.icon AS schedule_icon, ds.sort_order AS schedule_sort,
              dsi.id AS item_id, dsi.name AS item_name, dsi.icon AS item_icon, dsi.section,
              dsi.star_value, dsi.start_time, dsi.end_time, dsi.sort_order AS item_sort, dsi.sub_steps
       FROM default_schedule ds
       LEFT JOIN default_schedule_item dsi ON dsi.default_schedule_id = ds.id
       ORDER BY ds.sort_order ASC,
                CASE dsi.section WHEN 'morgon' THEN 0 WHEN 'dag' THEN 1 WHEN 'kvall' THEN 2 ELSE 3 END,
                dsi.sort_order ASC`
    );

    // Group items by schedule in a single pass
    const scheduleMap = new Map();
    for (const row of rows.rows) {
      if (!scheduleMap.has(row.schedule_id)) {
        scheduleMap.set(row.schedule_id, {
          id: row.schedule_id,
          name: row.schedule_name,
          description: row.description,
          icon: row.schedule_icon,
          sort_order: row.schedule_sort,
          items: [],
        });
      }
      if (row.item_id) {
        scheduleMap.get(row.schedule_id).items.push({
          id: row.item_id,
          name: row.item_name,
          icon: row.item_icon,
          section: row.section,
          star_value: row.star_value,
          start_time: row.start_time,
          end_time: row.end_time,
          sort_order: row.item_sort,
          sub_steps: row.sub_steps,
        });
      }
    }

    res.json(Array.from(scheduleMap.values()));
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Schedules list error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/schedules/:id/copy ───────
// Copies a standard schedule to a child's weekly schedule for selected days.
router.post('/schedules/:id/copy', async (req, res) => {
  try {
    const { child_id, days, overwrite } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id krävs' });
    if (!Array.isArray(days) || days.length === 0) return res.status(400).json({ error: 'days[] krävs (t.ex. [1,2,3,4,5])' });

    // Verify parent owns this child
    const childAccess = await db.query(
      'SELECT c.id, c.family_id FROM child c JOIN parent_child pc ON pc.child_id = c.id WHERE pc.parent_id = $1 AND c.id = $2',
      [req.user.id, child_id]
    );
    if (childAccess.rows.length === 0) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    const familyId = childAccess.rows[0].family_id;

    // Fetch the standard schedule items
    const scheduleResult = await db.query(
      'SELECT id, name FROM default_schedule WHERE id = $1',
      [req.params.id]
    );
    if (scheduleResult.rows.length === 0) return res.status(404).json({ error: 'Standardschemat hittades inte' });
    const scheduleName = scheduleResult.rows[0].name;

    const items = await db.query(
      `SELECT dsi.name, dsi.icon, dsi.section, dsi.star_value, dsi.start_time, dsi.end_time, dsi.sort_order, dsi.sub_steps
       FROM default_schedule_item dsi
       WHERE dsi.default_schedule_id = $1
       ORDER BY CASE dsi.section WHEN 'morgon' THEN 0 WHEN 'dag' THEN 1 WHEN 'kvall' THEN 2 ELSE 3 END, dsi.sort_order ASC`,
      [req.params.id]
    );
    if (items.rows.length === 0) return res.status(404).json({ error: 'Schemat har inga aktiviteter' });

    const validDays = days.map(d => parseInt(d, 10)).filter(d => !isNaN(d) && d >= 0 && d <= 6);
    if (validDays.length === 0) return res.status(400).json({ error: 'Inga giltiga dagar' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // For each item, ensure the family has a matching activity_template
      const activityTemplateMap = {};
      for (const item of items.rows) {
        const existing = await client.query(
          `SELECT id FROM activity_template WHERE family_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
          [familyId, item.name]
        );

        if (existing.rows.length > 0) {
          activityTemplateMap[item.name] = existing.rows[0].id;
        } else {
          const newTemplate = await client.query(
            `INSERT INTO activity_template (family_id, name, icon, star_value, is_favorite, sort_order)
             VALUES ($1, $2, $3, $4, false, $5) RETURNING id`,
            [familyId, item.name, item.icon, item.star_value, item.sort_order || 0]
          );
          const templateId = newTemplate.rows[0].id;
          activityTemplateMap[item.name] = templateId;

          // Create sub-steps if any
          const subSteps = item.sub_steps || [];
          if (Array.isArray(subSteps) && subSteps.length > 0) {
            for (let i = 0; i < subSteps.length; i++) {
              await client.query(
                `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
                 VALUES ($1, $2, $3, $4)`,
                [templateId, subSteps[i].name, subSteps[i].icon || null, i]
              );
            }
          }
        }
      }

      // Now create weekly schedules for each day
      const filledDays = [];
      for (const dow of validDays) {
        let scheduleId;
        const existingSchedule = await client.query(
          'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
          [child_id, dow]
        );

        if (existingSchedule.rows.length > 0) {
          if (!overwrite) continue;
          scheduleId = existingSchedule.rows[0].id;
          await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [scheduleId]);
        } else {
          const newSched = await client.query(
            'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
            [child_id, dow, dow]
          );
          scheduleId = newSched.rows[0].id;
        }

        for (const item of items.rows) {
          const templateId = activityTemplateMap[item.name];
          if (!templateId) continue;

          await client.query(
            `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [scheduleId, templateId, item.start_time || null, item.end_time || null, item.sort_order || 0, item.section || 'dag']
          );
        }
        filledDays.push(dow);
      }

      await client.query('COMMIT');

      // Sync daily logs for each filled day
      for (const dow of filledDays) {
        try {
          await syncDailyLogWithSchedule(child_id, dow);
        } catch (syncErr) {
          console.error('[STANDARD-LIBRARY] Sync error (non-fatal):', syncErr.message);
        }
      }

      // Broadcast SCHEDULE_UPDATED so dashboards refresh automatically
      broadcast(familyId, 'SCHEDULE_UPDATED', { childId: child_id });

      const dayNames = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
      const dayStr = filledDays.map(d => dayNames[d]).join(', ');

      res.status(201).json({
        message: `"${scheduleName}" kopierat till ${filledDays.length} dag(ar): ${dayStr}`,
        filled_days: filledDays,
        activities_created: Object.keys(activityTemplateMap).length,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Schedule copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
