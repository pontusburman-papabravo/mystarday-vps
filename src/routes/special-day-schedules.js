/**
 * Special Day Schedule routes.
 *
 * A special day schedule overrides the weekly template for a specific calendar date.
 *
 * Child-scoped (parent-auth):
 *   GET    /api/children/:childId/special-days               — list special days (optional ?from=&to=)
 *   POST   /api/children/:childId/special-days               — create special day
 *   DELETE /api/children/:childId/special-days/:date         — delete special day (reverts to weekly template)
 *
 * Schedule-scoped (parent-auth):
 *   GET    /api/special-day-schedules/:scheduleId/items       — list items
 *   POST   /api/special-day-schedules/:scheduleId/items       — add item
 *   PUT    /api/special-day-schedules/:scheduleId/items/reorder — bulk reorder
 *   PUT    /api/special-day-schedules/:scheduleId/items/:itemId — update item
 *   DELETE /api/special-day-schedules/:scheduleId/items/:itemId — remove item
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const authz = require('../middleware/authz');
const { getDayOfWeek, syncDailyLogForSpecialDay, syncDailyLogWithSchedule } = require('../lib/daily-log-generator');
const { broadcast } = require('../lib/sse-broadcast');

const childRouter = express.Router({ mergeParams: true });
const scheduleRouter = express.Router({ mergeParams: true });

childRouter.use(requireParent);
scheduleRouter.use(requireParent);
childRouter.use(authz.requireChildAccess('childId'));
scheduleRouter.use(authz.requireSpecialDayAccess('scheduleId'));

// ─── Child-scoped routes ──────────────────────────────────

// GET /api/children/:childId/special-days?from=YYYY-MM-DD&to=YYYY-MM-DD
childRouter.get('/', async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { from, to } = req.query;

    let query = `
      SELECT sds.id, sds.date, sds.note, sds.created_at,
             COUNT(sdsi.id) AS item_count
      FROM special_day_schedule sds
      LEFT JOIN special_day_schedule_item sdsi ON sdsi.special_day_schedule_id = sds.id
      WHERE sds.child_id = $1
    `;
    const params = [req.params.childId];

    if (from) {
      params.push(from);
      query += ` AND sds.date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND sds.date <= $${params.length}`;
    }

    query += ' GROUP BY sds.id ORDER BY sds.date ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[SPECIAL-DAYS] List error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/children/:childId/special-days
// Body: { date: 'YYYY-MM-DD', note?: string, copy_from_template?: boolean }
childRouter.post('/', async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { date, note, copy_from_template } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ogiltigt datum (format: YYYY-MM-DD)' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create special day schedule (upsert)
      const schedResult = await client.query(
        `INSERT INTO special_day_schedule (child_id, date, note)
         VALUES ($1, $2, $3)
         ON CONFLICT (child_id, date) DO UPDATE SET note = EXCLUDED.note, updated_at = NOW()
         RETURNING id, child_id, date, note, created_at`,
        [req.params.childId, date, note || null]
      );
      const schedule = schedResult.rows[0];

      // Check if items already exist (in case of upsert on existing)
      const existingItems = await client.query(
        'SELECT COUNT(*) AS cnt FROM special_day_schedule_item WHERE special_day_schedule_id = $1',
        [schedule.id]
      );
      const hasItems = parseInt(existingItems.rows[0].cnt) > 0;

      if (copy_from_template && !hasItems) {
        // Find day-of-week for this date using child's timezone
        const tz = child.timezone || 'Europe/Stockholm';
        const dayOfWeek = getDayOfWeek(date, tz);

        // Look up the weekly template for that day
        const weeklyResult = await client.query(
          `SELECT ws.id FROM weekly_schedule ws
           WHERE ws.child_id = $1 AND ws.day_of_week = $2`,
          [req.params.childId, dayOfWeek]
        );

        if (weeklyResult.rows.length > 0) {
          const weeklyScheduleId = weeklyResult.rows[0].id;
          const templateItems = await client.query(
            `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
                    at.name, at.icon, at.star_value
             FROM weekly_schedule_item wsi
             JOIN activity_template at ON at.id = wsi.activity_template_id
             WHERE wsi.weekly_schedule_id = $1
             ORDER BY wsi.section, wsi.sort_order ASC`,
            [weeklyScheduleId]
          );

          for (const item of templateItems.rows) {
            await client.query(
              `INSERT INTO special_day_schedule_item
                 (special_day_schedule_id, activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [schedule.id, item.activity_template_id, item.name, item.icon,
               item.start_time, item.end_time, item.star_value, item.sort_order, item.section]
            );
          }
        }
      }

      await client.query('COMMIT');

      // Fetch items to return
      const items = await db.query(
        `SELECT sdsi.id, sdsi.activity_template_id, sdsi.name, sdsi.icon,
                sdsi.start_time, sdsi.end_time, sdsi.star_value, sdsi.sort_order, sdsi.section
         FROM special_day_schedule_item sdsi
         WHERE sdsi.special_day_schedule_id = $1
         ORDER BY sdsi.section, sdsi.sort_order ASC`,
        [schedule.id]
      );

      res.status(201).json({ ...schedule, items: items.rows });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SPECIAL-DAYS] Create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// DELETE /api/children/:childId/special-days/:date
childRouter.delete('/:date', async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const dateParam = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ error: 'Ogiltigt datum (format: YYYY-MM-DD)' });
    }

    const existing = await db.query(
      'SELECT id FROM special_day_schedule WHERE child_id = $1 AND date = $2',
      [req.params.childId, dateParam]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ingen specialdag hittades för det datumet' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM special_day_schedule_item WHERE special_day_schedule_id = $1',
        [existing.rows[0].id]
      );
      await client.query(
        'DELETE FROM special_day_schedule WHERE id = $1',
        [existing.rows[0].id]
      );
      await client.query('COMMIT');

      // Sync daily log: special day is gone, revert to weekly template for this date
      try {
        const tz = child.timezone || 'Europe/Stockholm';
        const dow = getDayOfWeek(dateParam, tz);
        await syncDailyLogWithSchedule(req.params.childId, dow, null, dateParam);
      } catch (syncErr) {
        console.error('[SPECIAL-DAYS] Sync error (non-fatal):', syncErr.message);
      }

      // Broadcast SSE so child's view updates (broadcast is synchronous, no .catch())
      if (child.family_id) {
        try { broadcast(child.family_id, 'SCHEDULE_UPDATED', { childId: req.params.childId, date: dateParam }); } catch (_) {}
      }

      res.json({ message: 'Specialdagen har tagits bort — veckodagsmallen gäller igen' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SPECIAL-DAYS] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── Schedule-scoped item routes ──────────────────────────

// GET /api/special-day-schedules/:scheduleId/items
scheduleRouter.get('/', async (req, res) => {
  try {
    const schedule = await authz.getSpecialDayAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const items = await db.query(
      `SELECT sdsi.id, sdsi.activity_template_id, sdsi.name, sdsi.icon,
              sdsi.start_time, sdsi.end_time, sdsi.star_value, sdsi.sort_order, sdsi.section
       FROM special_day_schedule_item sdsi
       WHERE sdsi.special_day_schedule_id = $1
       ORDER BY sdsi.section, sdsi.sort_order ASC`,
      [req.params.scheduleId]
    );

    res.json({
      schedule_id: schedule.id,
      date: schedule.date,
      note: schedule.note,
      items: items.rows,
    });
  } catch (err) {
    console.error('[SPECIAL-DAY-ITEMS] List error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/special-day-schedules/:scheduleId/items
// Body: { activity_template_id?, name, icon?, start_time?, end_time?, star_value?, sort_order?, section? }
scheduleRouter.post('/', async (req, res) => {
  try {
    const schedule = await authz.getSpecialDayAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const { activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section } = req.body;

    let itemName = name;
    let itemIcon = icon;
    let itemStarValue = star_value !== undefined ? parseInt(star_value, 10) : 1;

    // If activity_template_id given, pull defaults from template
    if (activity_template_id) {
      const tpl = await db.query(
        'SELECT name, icon, star_value FROM activity_template WHERE id = $1',
        [activity_template_id]
      );
      if (tpl.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte' });
      if (!itemName) itemName = tpl.rows[0].name;
      if (!itemIcon) itemIcon = tpl.rows[0].icon;
      if (star_value === undefined) itemStarValue = tpl.rows[0].star_value;
    }

    if (!itemName) return res.status(400).json({ error: 'name eller activity_template_id krävs' });

    // Next sort_order
    const maxResult = await db.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM special_day_schedule_item WHERE special_day_schedule_id = $1',
      [req.params.scheduleId]
    );
    const nextOrder = sort_order !== undefined ? parseInt(sort_order, 10) : maxResult.rows[0].next_order;
    const detectedSection = section || 'dag';

    const result = await db.query(
      `INSERT INTO special_day_schedule_item
         (special_day_schedule_id, activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, special_day_schedule_id, activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section`,
      [req.params.scheduleId, activity_template_id || null, itemName, itemIcon || null,
       start_time || null, end_time || null, itemStarValue, nextOrder, detectedSection]
    );
    // Sync daily log so child's view reflects the new item immediately
    try {
      await syncDailyLogForSpecialDay(req.params.scheduleId, schedule.date, schedule.child_id);
    } catch (syncErr) {
      console.error('[SPECIAL-DAY-ITEMS] Sync error (non-fatal):', syncErr.message);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[SPECIAL-DAY-ITEMS] Create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// PUT /api/special-day-schedules/:scheduleId/items/reorder
// IMPORTANT: Must be before /:itemId
scheduleRouter.put('/reorder', async (req, res) => {
  try {
    const schedule = await authz.getSpecialDayAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order[] krävs' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const { id, sort_order, section } of order) {
        if (!id) continue;
        const updates = [];
        const vals = [];
        let idx = 1;
        if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); vals.push(sort_order); }
        if (section !== undefined) { updates.push(`section = $${idx++}`); vals.push(section); }
        if (updates.length > 0) {
          vals.push(id, req.params.scheduleId);
          await client.query(
            `UPDATE special_day_schedule_item SET ${updates.join(', ')} WHERE id = $${idx++} AND special_day_schedule_id = $${idx}`,
            vals
          );
        }
      }
      await client.query('COMMIT');

      // Sync daily log so child's view reflects the new order immediately
      try {
        await syncDailyLogForSpecialDay(req.params.scheduleId, schedule.date, schedule.child_id);
      } catch (syncErr) {
        console.error('[SPECIAL-DAY-ITEMS] Sync error (non-fatal):', syncErr.message);
      }

      res.json({ message: 'Sorteringsordning uppdaterad' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SPECIAL-DAY-ITEMS] Reorder error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// PUT /api/special-day-schedules/:scheduleId/items/:itemId
scheduleRouter.put('/:itemId', async (req, res) => {
  try {
    const schedule = await authz.getSpecialDayAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const existing = await db.query(
      'SELECT id FROM special_day_schedule_item WHERE id = $1 AND special_day_schedule_id = $2',
      [req.params.itemId, req.params.scheduleId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    const { name, icon, start_time, end_time, star_value, sort_order, section } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (icon !== undefined) { updates.push(`icon = $${idx++}`); values.push(icon || null); }
    if (start_time !== undefined) { updates.push(`start_time = $${idx++}`); values.push(start_time || null); }
    if (end_time !== undefined) { updates.push(`end_time = $${idx++}`); values.push(end_time || null); }
    if (star_value !== undefined) { updates.push(`star_value = $${idx++}`); values.push(parseInt(star_value, 10)); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(sort_order); }
    if (section !== undefined) {
      const validSections = ['morgon', 'dag', 'kvall', 'natt'];
      if (!validSections.includes(section)) return res.status(400).json({ error: 'Ogiltig sektion' });
      updates.push(`section = $${idx++}`);
      values.push(section);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });

    values.push(req.params.itemId);
    const result = await db.query(
      `UPDATE special_day_schedule_item SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, special_day_schedule_id, activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section`,
      values
    );
    // Sync daily log so child's view reflects the update immediately
    try {
      await syncDailyLogForSpecialDay(req.params.scheduleId, schedule.date, schedule.child_id);
    } catch (syncErr) {
      console.error('[SPECIAL-DAY-ITEMS] Sync error (non-fatal):', syncErr.message);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[SPECIAL-DAY-ITEMS] Update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// DELETE /api/special-day-schedules/:scheduleId/items/:itemId
scheduleRouter.delete('/:itemId', async (req, res) => {
  try {
    const schedule = await authz.getSpecialDayAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const result = await db.query(
      'DELETE FROM special_day_schedule_item WHERE id = $1 AND special_day_schedule_id = $2 RETURNING id',
      [req.params.itemId, req.params.scheduleId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    // Sync child's daily log to reflect the removed item (fixes child view stale snapshot)
    try {
      await syncDailyLogForSpecialDay(schedule.id, schedule.date, schedule.child_id);
    } catch (syncErr) {
      console.error('[SPECIAL-DAY-ITEMS] Sync error (non-fatal):', syncErr.message);
    }

    // Broadcast SSE so child's view updates in real-time (broadcast is synchronous, no .catch())
    try {
      const famRes = await db.query('SELECT family_id FROM child WHERE id = $1', [schedule.child_id]);
      if (famRes.rows[0]?.family_id) {
        broadcast(famRes.rows[0].family_id, 'SCHEDULE_UPDATED', { childId: schedule.child_id, date: schedule.date });
      }
    } catch (_) { /* SSE broadcast is best-effort */ }

    res.json({ message: 'Aktiviteten har tagits bort' });
  } catch (err) {
    console.error('[SPECIAL-DAY-ITEMS] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = { childRouter, scheduleRouter };
