/**
 * Child-scoped schedule CRUD + once-tasks.
 * Handles: list, create, delete schedules; one-time tasks.
 * Does NOT handle: bulk ops, item management, templates.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { getOrGenerateDailyLog } = require('../../lib/daily-log-generator');
const { broadcast } = require('../../lib/sse-broadcast');
const { validate } = require('../../middleware/validate');
const { CreateScheduleSchema } = require('../../lib/schemas');

const router = express.Router({ mergeParams: true });
router.use(requireParent);

async function getChildAccess(parentId, childId) {
  const result = await db.query(
    'SELECT c.id, c.family_id FROM child c JOIN parent_child pc ON pc.child_id = c.id WHERE pc.parent_id = $1 AND c.id = $2',
    [parentId, childId]
  );
  return result.rows[0] || null;
}

/** Resolve activity_template_id for an engångsaktivitet (library template or inline sub_steps). */
async function resolveOnceTaskTemplateId(familyId, { name, icon, star_value, activity_template_id, sub_steps }) {
  if (activity_template_id) {
    const check = await db.query(
      'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
      [activity_template_id, familyId]
    );
    if (check.rows.length === 0) return null;
    return activity_template_id;
  }

  const steps = Array.isArray(sub_steps)
    ? sub_steps.filter((s) => s && String(s.name || '').trim())
    : [];
  if (steps.length === 0) return null;

  const tmpl = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
     VALUES ($1, $2, $3, $4, 0, 'user')
     RETURNING id`,
    [familyId, name, icon || '📌', star_value || 1]
  );
  const templateId = tmpl.rows[0].id;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await db.query(
      `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [templateId, String(step.name).trim(), step.icon || null, i]
    );
  }
  return templateId;
}

// GET /api/children/:childId/schedules — list all 7-day schedules for child
router.get('/', async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const schedules = await db.query(
      `SELECT ws.id, ws.day_of_week, ws.sort_order,
              COUNT(wsi.id) AS item_count
       FROM weekly_schedule ws
       LEFT JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
       WHERE ws.child_id = $1
       GROUP BY ws.id
       ORDER BY ws.day_of_week ASC`,
      [req.params.childId]
    );
    res.json(schedules.rows);
  } catch (err) {
    console.error('[SCHEDULES] List error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/children/:childId/schedules — create schedule for a day
router.post('/', validate(CreateScheduleSchema), async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { day_of_week, template_category_id } = req.body;
    if (day_of_week === undefined || day_of_week === null) {
      return res.status(400).json({ error: 'Veckodag krävs (0=sön, 1=mån, … 6=lör)' });
    }
    const dow = parseInt(day_of_week, 10);
    if (isNaN(dow) || dow < 0 || dow > 6) {
      return res.status(400).json({ error: 'Veckodag måste vara ett tal 0–6' });
    }

    const existing = await db.query(
      'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
      [req.params.childId, dow]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Det finns redan ett schema för den veckodagen', id: existing.rows[0].id });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order)
         VALUES ($1, $2, $3)
         RETURNING id, child_id, day_of_week, sort_order`,
        [req.params.childId, dow, dow]
      );
      const schedule = result.rows[0];

      const familyResult = await client.query('SELECT family_id FROM child WHERE id = $1', [req.params.childId]);
      const familyId = familyResult.rows[0]?.family_id;
      if (familyId && template_category_id) {
        const templates = await client.query(
          `SELECT at.id, at.name, at.icon, at.star_value,
                  at.time_group,
                  at.sort_order AS template_sort
           FROM activity_template at
           WHERE at.family_id = $1 AND at.category_id = $2
           ORDER BY at.sort_order ASC, at.name ASC`,
          [familyId, template_category_id]
        );

        const timeGroupToSection = {
          'morgon': 'morgon',
          'formiddag': 'dag',
          'eftermiddag': 'dag',
          'kvall': 'kvall',
        };

        const uniqueTimeGroups = new Set(templates.rows.map(t => t.time_group).filter(Boolean));
        const useSortOrderFallback = uniqueTimeGroups.size <= 1;

        function sectionForTemplate(tpl) {
          if (!useSortOrderFallback && tpl.time_group && timeGroupToSection[tpl.time_group]) {
            return timeGroupToSection[tpl.time_group];
          }
          const so = tpl.template_sort;
          if (so === null || so === undefined) return 'dag';
          if (so < 100) return 'morgon';
          if (so < 300) return 'dag';
          return 'kvall';
        }

        const sectionCounters = {};

        for (const tpl of templates.rows) {
          const sec = sectionForTemplate(tpl);
          if (!(sec in sectionCounters)) sectionCounters[sec] = 0;
          const sortOrder = sectionCounters[sec]++;

          await client.query(
            `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
             VALUES ($1, $2, NULL, NULL, $3, $4)`,
            [schedule.id, tpl.id, sortOrder, sec]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(schedule);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] Create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// DELETE /api/children/:childId/schedules/:scheduleId — delete schedule (and all items)
router.delete('/:scheduleId', async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const schedule = await db.query(
      'SELECT id FROM weekly_schedule WHERE id = $1 AND child_id = $2',
      [req.params.scheduleId, req.params.childId]
    );
    if (schedule.rows.length === 0) {
      return res.status(404).json({ error: 'Schemat hittades inte' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [req.params.scheduleId]);
      await client.query('DELETE FROM weekly_schedule WHERE id = $1', [req.params.scheduleId]);
      await client.query('COMMIT');
      res.json({ message: 'Schemat har tagits bort' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/children/:childId/schedules/once-tasks — create one-time task in daily log
router.post('/once-tasks', async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const {
      name, section, date: rawDate, start_time, end_time, star_value, icon, child_ids,
      activity_template_id, sub_steps,
    } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Namn krävs' });

    // Normalise date: accept YYYY-MM-DD, nullish, or ISO-8600 with time. Default to today.
    let date = rawDate;
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(date)) {
      const now = new Date();
      date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    } else {
      // Strip any time component (ISO with time would be YYYY-MM-DDTHH:MM:SS)
      date = date.substring(0, 10);
    }
    if (start_time && end_time && end_time < start_time) {
      return res.status(400).json({ error: 'Sluttid kan inte vara före starttid' });
    }

    const safeSection = ['morgon', 'dag', 'kvall', 'natt'].includes(section) ? section : 'dag';
    const safeStars = (star_value && parseInt(star_value, 10) > 0) ? parseInt(star_value, 10) : 1;
    const safeIcon = icon || '📌';

    let targetChildIds = [req.params.childId];
    if (Array.isArray(child_ids) && child_ids.length > 0) {
      const familyResult = await db.query(
        'SELECT id FROM child WHERE family_id = $1 AND id = ANY($2::uuid[])',
        [child.family_id, child_ids]
      );
      targetChildIds = familyResult.rows.map(r => r.id);
      if (targetChildIds.length === 0) return res.status(400).json({ error: 'Inga giltiga barn valda' });
    }

    const templateId = await resolveOnceTaskTemplateId(child.family_id, {
      name: name.trim(),
      icon: safeIcon,
      star_value: safeStars,
      activity_template_id: activity_template_id || null,
      sub_steps,
    });

    const created = [];
    for (const cid of targetChildIds) {
      const { log } = await getOrGenerateDailyLog(cid, date);

      const maxResult = await db.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM daily_log_item
         WHERE daily_log_id = $1 AND section = $2`,
        [log.id, safeSection]
      );
      const nextOrder = maxResult.rows[0].next_order;

      const itemResult = await db.query(
        `INSERT INTO daily_log_item
           (daily_log_id, activity_template_id, name, icon, start_time, end_time,
            star_value, sort_order, child_sort_order, section, is_once_task)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, true)
         RETURNING id, daily_log_id, activity_template_id, name, icon, start_time, end_time,
                   star_value, completed, sort_order, section, is_once_task`,
        [log.id, templateId, name.trim(), safeIcon, start_time || null, end_time || null,
         safeStars, nextOrder, safeSection]
      );
      created.push(itemResult.rows[0]);
    }

    broadcast(child.family_id, 'SCHEDULE_UPDATED', { date, once_task: true });

    res.status(201).json({ created, count: created.length });
  } catch (err) {
    console.error('[ONCE-TASKS] Create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;