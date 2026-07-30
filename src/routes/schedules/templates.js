/**
 * Family-level schedule template management.
 * Mounted at: /api/schedule-templates
 * Handles: list, create, delete templates; create from standard; apply to child.
 * Does NOT handle: child schedule management, schedule item CRUD.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { syncDailyLogWithSchedule } = require('../../lib/daily-log-generator');
const { broadcast } = require('../../lib/sse-broadcast');
const { validate } = require('../../middleware/validate');
const { CreateScheduleTemplateSchema } = require('../../lib/schemas');
const { getChildAccess } = require('../../middleware/authz');

const router = express.Router();
router.use(requireParent);

// GET /api/schedule-templates — list family-level schedule templates
router.get('/', async (req, res) => {
  try {
    const templates = await db.query(
      `SELECT ws.id, ws.name, ws.sort_order, ws.created_at, ws.is_favorite,
              COUNT(wsi.id) AS item_count
       FROM weekly_schedule ws
       LEFT JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
       WHERE ws.family_id = $1 AND ws.child_id IS NULL
       GROUP BY ws.id
       ORDER BY ws.sort_order ASC, ws.name ASC`,
      [req.user.familyId]
    );
    res.json(templates.rows);
  } catch (err) {
    console.error('[SCHEDULE-TEMPLATES] List error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// GET /api/schedule-templates/:templateId — get template with items
router.get('/:templateId', async (req, res) => {
  try {
    const template = await db.query(
      `SELECT ws.id, ws.name, ws.sort_order FROM weekly_schedule ws
       WHERE ws.id = $1 AND ws.family_id = $2 AND ws.child_id IS NULL`,
      [req.params.templateId, req.user.familyId]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Schemamallar hittades inte' });
    }

    const items = await db.query(
      `SELECT wsi.id, wsi.activity_template_id, wsi.start_time, wsi.end_time,
              wsi.sort_order, wsi.section,
              at.name, at.icon, at.star_value
       FROM weekly_schedule_item wsi
       LEFT JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE wsi.weekly_schedule_id = $1
       ORDER BY wsi.sort_order ASC`,
      [req.params.templateId]
    );

    res.json({ ...template.rows[0], items: items.rows });
  } catch (err) {
    console.error('[SCHEDULE-TEMPLATES] Get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/schedule-templates — create a new empty family-level schedule template
router.post('/', validate(CreateScheduleTemplateSchema), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Schemanamn krävs' });
    }

    const maxResult = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
       FROM weekly_schedule WHERE family_id = $1 AND child_id IS NULL`,
      [req.user.familyId]
    );
    const sortOrder = parseInt(maxResult.rows[0].next_sort, 10);

    // day_of_week=0 is a placeholder for family-level templates (not tied to a specific day).
    // The NOT NULL constraint requires a value even though templates are day-agnostic.
    const result = await db.query(
      `INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week)
       VALUES ($1, $2, $3, 0)
       RETURNING id, name, sort_order, created_at`,
      [req.user.familyId, name.trim(), sortOrder]
    );
    res.status(201).json({ ...result.rows[0], item_count: 0 });
  } catch (err) {
    console.error('[SCHEDULE-TEMPLATES] Create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/schedule-templates/from-standard/:standardId — create from standard schedule
router.post('/from-standard/:standardId', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Schemanamn krävs' });
    }

    const familyId = req.user.familyId;

    const schedResult = await db.query('SELECT id, name FROM default_schedule WHERE id = $1', [req.params.standardId]);
    if (schedResult.rows.length === 0) return res.status(404).json({ error: 'Standardschemat hittades inte' });

    const items = await db.query(
      `SELECT dsi.name, dsi.icon, dsi.section, dsi.star_value, dsi.start_time, dsi.end_time, dsi.sort_order, dsi.sub_steps
       FROM default_schedule_item dsi
       WHERE dsi.default_schedule_id = $1
       ORDER BY CASE dsi.section WHEN 'morgon' THEN 0 WHEN 'dag' THEN 1 WHEN 'kvall' THEN 2 ELSE 3 END, dsi.sort_order ASC`,
      [req.params.standardId]
    );

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const maxResult = await client.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
         FROM weekly_schedule WHERE family_id = $1 AND child_id IS NULL`,
        [familyId]
      );
      const sortOrder = parseInt(maxResult.rows[0].next_sort, 10);

      // day_of_week=0 is a placeholder for family-level templates (not tied to a specific day).
      const templateResult = await client.query(
        `INSERT INTO weekly_schedule (family_id, name, sort_order, day_of_week)
         VALUES ($1, $2, $3, 0)
         RETURNING id, name, sort_order, created_at`,
        [familyId, name.trim(), sortOrder]
      );
      const templateId = templateResult.rows[0].id;

      for (const item of items.rows) {
        let tplId = null;
        const existing = await client.query(
          `SELECT id FROM activity_template WHERE family_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
          [familyId, item.name]
        );

        if (existing.rows.length > 0) {
          tplId = existing.rows[0].id;
        } else {
          const newTpl = await client.query(
            `INSERT INTO activity_template (family_id, name, icon, star_value, is_favorite, sort_order, source)
             VALUES ($1, $2, $3, $4, false, $5, 'admin') RETURNING id`,
            [familyId, item.name, item.icon, item.star_value, item.sort_order || 0]
          );
          tplId = newTpl.rows[0].id;

          const subSteps = item.sub_steps || [];
          if (Array.isArray(subSteps) && subSteps.length > 0) {
            for (let i = 0; i < subSteps.length; i++) {
              await client.query(
                `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
                 VALUES ($1, $2, $3, $4)`,
                [tplId, subSteps[i].name, subSteps[i].icon || null, i]
              );
            }
          }
        }

        if (tplId) {
          await client.query(
            `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [templateId, tplId, item.start_time || null, item.end_time || null, item.sort_order || 0, item.section || 'dag']
          );
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        ...templateResult.rows[0],
        item_count: items.rows.length,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULE-TEMPLATES] Create from standard error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// PUT /api/schedule-templates/:templateId — update family template (e.g. is_favorite)
router.put('/:templateId', async (req, res) => {
  try {
    const { is_favorite: isFavorite } = req.body || {};
    if (isFavorite === undefined) {
      return res.status(400).json({ error: 'Inget att uppdatera' });
    }

    const result = await db.query(
      `UPDATE weekly_schedule
       SET is_favorite = $1
       WHERE id = $2 AND family_id = $3 AND child_id IS NULL
       RETURNING id, name, is_favorite`,
      [Boolean(isFavorite), req.params.templateId, req.user.familyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schemamallen hittades inte' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[SCHEDULE-TEMPLATES] Update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// DELETE /api/schedule-templates/:templateId — delete a family-level schedule template
router.delete('/:templateId', async (req, res) => {
  try {
    const template = await db.query(
      `SELECT id, name FROM weekly_schedule WHERE id = $1 AND family_id = $2 AND child_id IS NULL`,
      [req.params.templateId, req.user.familyId]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Schemamallen hittades inte' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [req.params.templateId]);
      await client.query('DELETE FROM weekly_schedule WHERE id = $1', [req.params.templateId]);
      await client.query('COMMIT');
      res.json({ message: 'Schemat har tagits bort' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULE-TEMPLATES] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/schedule-templates/:templateId/apply — apply template to a child for given days
router.post('/:templateId/apply', async (req, res) => {
  try {
    const { child_id, days, overwrite } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id krävs' });
    if (!Array.isArray(days) || days.length === 0) return res.status(400).json({ error: 'days[] krävs (t.ex. [1,2,3,4,5])' });

    const template = await db.query(
      `SELECT id, name FROM weekly_schedule WHERE id = $1 AND family_id = $2 AND child_id IS NULL`,
      [req.params.templateId, req.user.familyId]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Schemamallen hittades inte' });
    }

    const childAccess = await getChildAccess(req.user.id, child_id);
    if (!childAccess) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const templateItems = await db.query(
      `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
              at.name, at.icon, at.star_value
       FROM weekly_schedule_item wsi
       LEFT JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE wsi.weekly_schedule_id = $1
       ORDER BY wsi.sort_order ASC`,
      [req.params.templateId]
    );

    const validDays = days.map(d => parseInt(d, 10)).filter(d => !isNaN(d) && d >= 0 && d <= 6);
    if (validDays.length === 0) return res.status(400).json({ error: 'Inga giltiga dagar' });

    const client = await db.getClient();
    const filledDays = [];
    try {
      await client.query('BEGIN');

      for (const dow of validDays) {
        const existing = await client.query(
          'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
          [child_id, dow]
        );

        let scheduleId;
        if (existing.rows.length > 0) {
          if (!overwrite) continue;
          scheduleId = existing.rows[0].id;
          await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [scheduleId]);
        } else {
          const newSched = await client.query(
            'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
            [child_id, dow, dow]
          );
          scheduleId = newSched.rows[0].id;
        }

        for (const item of templateItems.rows) {
          await client.query(
            `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [scheduleId, item.activity_template_id, item.start_time || null, item.end_time || null, item.sort_order || 0, item.section || 'dag']
          );
        }
        filledDays.push(dow);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    for (const dow of filledDays) {
      try {
        await syncDailyLogWithSchedule(child_id, dow);
      } catch {}
    }

    broadcast(childAccess.family_id, 'SCHEDULE_UPDATED', { childId: child_id });

    const dayNames = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
    const dayStr = filledDays.map(d => dayNames[d]).join(', ');
    res.status(201).json({
      message: `"${template.rows[0].name}" tillämpat på ${filledDays.length} dag(ar): ${dayStr}`,
      filled_days: filledDays,
    });
  } catch (err) {
    console.error('[SCHEDULE-TEMPLATES] Apply error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;