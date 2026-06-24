/**
 * Schedule-item CRUD: list, add, update, delete, reorder items within a schedule.
 * Mounted at: /api/schedules/:scheduleId/items
 * Does NOT handle: child schedule management, templates.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { getOrGenerateDailyLog, getSchoolVariant, syncDailyLogWithSchedule, getLocalDateStr, getDayOfWeek } = require('../../lib/daily-log-generator');
const { addDaysIso } = require('../../lib/date-utils');
const { broadcast } = require('../../lib/sse-broadcast');
const { validate } = require('../../middleware/validate');
const { CreateScheduleItemSchema, UpdateScheduleItemSchema, ReorderSchema } = require('../../lib/schemas');

const router = express.Router({ mergeParams: true });
router.use(requireParent);

async function getScheduleAccess(parentId, scheduleId) {
  const childResult = await db.query(
    `SELECT ws.id, ws.child_id, ws.day_of_week, ws.sort_order
     FROM weekly_schedule ws
     JOIN child c ON c.id = ws.child_id
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND ws.id = $2`,
    [parentId, scheduleId]
  );
  if (childResult.rows.length > 0) return childResult.rows[0];

  const familyResult = await db.query(
    `SELECT ws.id, ws.child_id, ws.day_of_week, ws.sort_order
     FROM weekly_schedule ws
     JOIN parent p ON p.family_id = ws.family_id
     WHERE p.id = $1 AND ws.id = $2 AND ws.child_id IS NULL`,
    [parentId, scheduleId]
  );
  return familyResult.rows[0] || null;
}

function determineSection(startTime, familySettings) {
  if (!startTime) return 'dag';
  const [h, m] = startTime.split(':').map(Number);
  const mins = h * 60 + m;

  function timeToMins(t) {
    const [th, tm] = (t || '00:00').split(':').map(Number);
    return th * 60 + tm;
  }

  const morningStart = timeToMins(familySettings.morning_start || '06:00');
  const morningEnd = timeToMins(familySettings.morning_end || '09:00');
  const dayStart = timeToMins(familySettings.day_start || '09:00');
  const dayEnd = timeToMins(familySettings.day_end || '16:00');
  const eveningStart = timeToMins(familySettings.evening_start || '16:00');
  const eveningEnd = timeToMins(familySettings.evening_end || '21:00');

  if (mins >= morningStart && mins < morningEnd) return 'morgon';
  if (mins >= dayStart && mins < dayEnd) return 'dag';
  if (mins >= eveningStart && mins < eveningEnd) return 'kvall';
  return 'natt';
}

/** Reorder weekly schedule items to match daily_log_item sort_order for a specific date. */
function mergeItemsWithDailyLogOrder(weeklyItems, logItems) {
  if (!logItems || logItems.length === 0) return weeklyItems;

  const weeklyByKey = new Map();
  for (const item of weeklyItems) {
    weeklyByKey.set(`${item.section}:${item.activity_template_id}`, item);
  }

  const ordered = [];
  const usedKeys = new Set();

  for (const logItem of logItems) {
    if (logItem.activity_template_id) {
      const key = `${logItem.section}:${logItem.activity_template_id}`;
      const weekly = weeklyByKey.get(key);
      if (weekly && !usedKeys.has(key)) {
        ordered.push({ ...weekly, sort_order: ordered.length });
        usedKeys.add(key);
      }
      continue;
    }
    ordered.push({
      id: logItem.id,
      activity_template_id: null,
      start_time: logItem.start_time,
      end_time: logItem.end_time,
      sort_order: ordered.length,
      section: logItem.section,
      activity_name: logItem.name,
      activity_icon: logItem.icon,
      activity_name_display: logItem.name,
      star_value: logItem.star_value,
      sub_step_count: 0,
      sub_steps: [],
      is_once_task: true,
    });
  }

  for (const item of weeklyItems) {
    const key = `${item.section}:${item.activity_template_id}`;
    if (!usedKeys.has(key)) {
      ordered.push({ ...item, sort_order: ordered.length });
    }
  }

  return ordered;
}

// GET /api/schedules/:scheduleId/items — list items in schedule
router.get('/', async (req, res) => {
  try {
    const schedule = await getScheduleAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const items = await db.query(
      `SELECT wsi.id, wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
              at.name AS activity_name, at.icon AS activity_icon, at.star_value,
              COALESCE(sub.cnt, 0) AS sub_step_count,
              COALESCE(sub.steps, '[]'::json) AS sub_steps
       FROM weekly_schedule_item wsi
       JOIN activity_template at ON at.id = wsi.activity_template_id
       LEFT JOIN (
         SELECT activity_template_id,
                COUNT(*) AS cnt,
                json_agg(json_build_object('id', id, 'name', name, 'icon', icon, 'sort_order', sort_order) ORDER BY sort_order ASC, id ASC) AS steps
         FROM activity_sub_step
         GROUP BY activity_template_id
       ) sub ON sub.activity_template_id = at.id
       WHERE wsi.weekly_schedule_id = $1
       ORDER BY wsi.section, wsi.sort_order ASC`,
      [req.params.scheduleId]
    );

    const familyResult = await db.query(
      `SELECT f.morning_start, f.morning_end, f.day_start, f.day_end, f.evening_start, f.evening_end,
              f.night_start, f.night_end, c.birthday
       FROM family f
       JOIN child c ON c.family_id = f.id
       WHERE c.id = $1`,
      [schedule.child_id]
    );

    const familyData = familyResult.rows[0] || {};
    const birthday = familyData.birthday;
    const schoolVariant = getSchoolVariant(birthday);

    const ageAwareItems = items.rows.map(item => {
      const activityName = item.activity_name;
      if ((activityName === 'Skola/Förskola' || activityName === 'Skola') &&
          activityName !== schoolVariant) {
        return {
          ...item,
          activity_name_display: schoolVariant,
          age_variant: schoolVariant,
        };
      }
      return {
        ...item,
        activity_name_display: activityName,
        age_variant: activityName === 'Skola/Förskola' || activityName === 'Skola' ? schoolVariant : null,
      };
    });

    let finalItems = ageAwareItems;

    // Filter out items excluded for this date (per-date "bara denna dag" deletes)
    const filterDate = req.query.date ? String(req.query.date).substring(0, 10) : null;
    if (filterDate && /^\d{4}-\d{2}-\d{2}$/.test(filterDate) && schedule.child_id) {
      try {
        const exclRes = await db.query(
          `SELECT activity_template_id FROM schedule_date_exclusion
           WHERE child_id = $1 AND date = $2`,
          [schedule.child_id, filterDate]
        );
        if (exclRes.rows.length > 0) {
          const excludedIds = new Set(exclRes.rows.map(r => r.activity_template_id));
          finalItems = finalItems.filter(item => !excludedIds.has(item.activity_template_id));
        }
      } catch (exclErr) {
        console.error('[SCHEDULE-ITEMS] Exclusion filter error (non-fatal):', exclErr.message);
      }
    }

    // When a date is requested, merge daily_log order (incl. once-tasks + per-day reorder)
    const rawDate = req.query.date;
    if (rawDate) {
      const dateParam = String(rawDate).substring(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam) && schedule.child_id) {
        try {
          const { items: logItems } = await getOrGenerateDailyLog(schedule.child_id, dateParam);
          finalItems = mergeItemsWithDailyLogOrder(finalItems, logItems);
        } catch (mergeErr) {
          console.error('[SCHEDULE-ITEMS] Daily-log order merge error (non-fatal):', mergeErr.message);
        }
      }
    }

    res.json({
      schedule_id: req.params.scheduleId,
      day_of_week: schedule.day_of_week,
      child_birthday: birthday,
      age_variant: schoolVariant,
      items: finalItems,
      section_times: {
        morning_start: familyData.morning_start,
        morning_end: familyData.morning_end,
        day_start: familyData.day_start,
        day_end: familyData.day_end,
        evening_start: familyData.evening_start,
        evening_end: familyData.evening_end,
        night_start: familyData.night_start,
        night_end: familyData.night_end,
      },
    });
  } catch (err) {
    console.error('[SCHEDULE-ITEMS] List error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/schedules/:scheduleId/items — add item to schedule
router.post('/', validate(CreateScheduleItemSchema), async (req, res) => {
  try {
    const schedule = await getScheduleAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const { activity_template_id, start_time, end_time, sort_order, section, date } = req.body;
    if (!activity_template_id) return res.status(400).json({ error: 'activity_template_id krävs' });

    if (start_time && end_time && end_time < start_time) {
      return res.status(400).json({ error: 'Sluttid kan inte vara före starttid' });
    }

    const familyResult = await db.query(
      'SELECT f.id FROM family f JOIN child c ON c.family_id = f.id WHERE c.id = $1',
      [schedule.child_id]
    );
    const familyId = familyResult.rows[0]?.id;

    const template = await db.query(
      'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
      [activity_template_id, familyId]
    );
    if (template.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    const maxResult = await db.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM weekly_schedule_item WHERE weekly_schedule_id = $1',
      [req.params.scheduleId]
    );
    const nextOrder = sort_order !== undefined ? sort_order : maxResult.rows[0].next_order;

    const familySettings = await db.query(
      'SELECT morning_start, morning_end, day_start, day_end, evening_start, evening_end FROM family f JOIN child c ON c.family_id = f.id WHERE c.id = $1',
      [schedule.child_id]
    );
    const detectedSection = section || determineSection(start_time, familySettings.rows[0] || {});

    const result = await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section`,
      [req.params.scheduleId, activity_template_id, start_time || null, end_time || null, nextOrder, detectedSection]
    );

    try {
      await syncDailyLogWithSchedule(schedule.child_id, schedule.day_of_week, undefined, date || undefined);
    } catch (syncErr) {
      console.error('[SCHEDULE-ITEMS] Sync error (non-fatal):', syncErr.message);
    }

    if (familyId) {
      broadcast(familyId, 'SCHEDULE_UPDATED', { childId: schedule.child_id, dayOfWeek: schedule.day_of_week, date: date || null });
      // Analytics: feature_schedule_edit — parent added an item to a schedule
      require('../../lib/analytics-tracker').trackScheduleEdit(familyId);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[SCHEDULE-ITEMS] Create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// PUT /api/schedules/:scheduleId/items/reorder — bulk reorder items
router.put('/reorder', validate(ReorderSchema), async (req, res) => {
  try {
    const schedule = await getScheduleAccess(req.user.id, req.params.scheduleId);
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
            `UPDATE weekly_schedule_item SET ${updates.join(', ')} WHERE id = $${idx++} AND weekly_schedule_id = $${idx}`,
            vals
          );
        }
      }
      await client.query('COMMIT');

      try {
        await syncDailyLogWithSchedule(schedule.child_id, schedule.day_of_week);
      } catch (syncErr) {
        console.error('[SCHEDULE-ITEMS] Sync error (non-fatal):', syncErr.message);
      }

      res.json({ message: 'Sorteringsordning uppdaterad' });
      const famRes = await db.query('SELECT family_id FROM child WHERE id = $1', [schedule.child_id]).catch(() => ({ rows: [] }));
      if (famRes.rows[0]?.family_id) broadcast(famRes.rows[0].family_id, 'SCHEDULE_UPDATED', { childId: schedule.child_id, dayOfWeek: schedule.day_of_week });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULE-ITEMS] Reorder error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// PUT /api/schedules/:scheduleId/items/:itemId — update item
router.put('/:itemId', validate(UpdateScheduleItemSchema), async (req, res) => {
  try {
    const schedule = await getScheduleAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const existing = await db.query(
      'SELECT id FROM weekly_schedule_item WHERE id = $1 AND weekly_schedule_id = $2',
      [req.params.itemId, req.params.scheduleId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte i schemat' });

    const { start_time, end_time, sort_order, section, activity_template_id } = req.body;

    if (start_time !== undefined && end_time !== undefined && start_time && end_time && end_time < start_time) {
      return res.status(400).json({ error: 'Sluttid kan inte vara före starttid' });
    }
    if (start_time !== undefined && end_time === undefined && start_time) {
      const existingItem = await db.query('SELECT end_time FROM weekly_schedule_item WHERE id = $1', [req.params.itemId]);
      const existingEnd = existingItem.rows[0]?.end_time;
      if (existingEnd && existingEnd < start_time) {
        return res.status(400).json({ error: 'Sluttid kan inte vara före starttid. Uppdatera även sluttiden.' });
      }
    }
    if (end_time !== undefined && start_time === undefined && end_time) {
      const existingItem = await db.query('SELECT start_time FROM weekly_schedule_item WHERE id = $1', [req.params.itemId]);
      const existingStart = existingItem.rows[0]?.start_time;
      if (existingStart && end_time < existingStart) {
        return res.status(400).json({ error: 'Sluttid kan inte vara före starttid' });
      }
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (start_time !== undefined) { updates.push(`start_time = $${idx++}`); values.push(start_time || null); }
    if (end_time !== undefined) { updates.push(`end_time = $${idx++}`); values.push(end_time || null); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(sort_order); }
    if (section !== undefined) {
      const validSections = ['morgon', 'dag', 'kvall', 'natt'];
      if (!validSections.includes(section)) return res.status(400).json({ error: 'Ogiltig sektion (morgon/dag/kvall/natt)' });
      updates.push(`section = $${idx++}`);
      values.push(section);
    }
    if (activity_template_id !== undefined) {
      const familyResult = await db.query(
        'SELECT f.id FROM family f JOIN child c ON c.family_id = f.id WHERE c.id = $1',
        [schedule.child_id]
      );
      const familyId = familyResult.rows[0]?.id;
      const tplCheck = await db.query(
        'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
        [activity_template_id, familyId]
      );
      if (tplCheck.rows.length === 0)
        return res.status(404).json({ error: 'Aktiviteten hittades inte' });
      updates.push(`activity_template_id = $${idx++}`);
      values.push(activity_template_id);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });

    values.push(req.params.itemId);
    const result = await db.query(
      `UPDATE weekly_schedule_item SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section`,
      values
    );

    try {
      await syncDailyLogWithSchedule(schedule.child_id, schedule.day_of_week);
    } catch (syncErr) {
      console.error('[SCHEDULE-ITEMS] Sync error (non-fatal):', syncErr.message);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[SCHEDULE-ITEMS] Update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// DELETE /api/schedules/:scheduleId/items/:itemId — remove item from schedule
router.delete('/:itemId', async (req, res) => {
  try {
    const schedule = await getScheduleAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });

    const result = await db.query(
      'DELETE FROM weekly_schedule_item WHERE id = $1 AND weekly_schedule_id = $2 RETURNING id',
      [req.params.itemId, req.params.scheduleId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte i schemat' });

    // Sync today's daily log with the updated weekly schedule.
    // Pass targetDate to force sync even when the modified day is not today
    // (e.g., parent removes Monday item on Sunday → Monday's daily log is still synced).
    try {
      const childResult = await db.query('SELECT timezone FROM child WHERE id = $1', [schedule.child_id]);
      const tz = (childResult.rows[0]?.timezone) || 'Europe/Stockholm';
      const today = getLocalDateStr(new Date(), tz);
      const todayDow = getDayOfWeek(today, tz);
      // Calculate the most recent calendar date matching the schedule's day_of_week
      // (e.g., removing a Monday item on Sunday → sync Monday's log, not Sunday's)
      const daysBack = (todayDow - schedule.day_of_week + 7) % 7;
      const targetDateStr = addDaysIso(today, -daysBack);
      await syncDailyLogWithSchedule(schedule.child_id, schedule.day_of_week, null, targetDateStr);
    } catch (syncErr) {
      console.error('[SCHEDULE-ITEMS] Sync error (non-fatal):', syncErr.message);
    }

    // Broadcast SSE so child's view updates in real-time
    // broadcast() is synchronous (returns undefined) — no .catch() needed
    try {
      const famRes = await db.query('SELECT family_id FROM child WHERE id = $1', [schedule.child_id]);
      if (famRes.rows[0]?.family_id) {
        broadcast(famRes.rows[0].family_id, 'SCHEDULE_UPDATED', { childId: schedule.child_id });
      }
    } catch (_) { /* SSE broadcast is best-effort */ }

    res.json({ message: 'Aktiviteten har tagits bort från schemat' });
  } catch (err) {
    console.error('[SCHEDULE-ITEMS] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/schedules/:scheduleId/items/:itemId/exclude-date — remove item for a single date only
// Keeps the weekly_schedule_item intact (recurring template untouched).
// Deletes the matching daily_log_item for the given date so the activity
// disappears from today's view but stays in the weekly template.
router.post('/:itemId/exclude-date', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ogiltigt datum (YYYY-MM-DD)' });
    }

    const schedule = await getScheduleAccess(req.user.id, req.params.scheduleId);
    if (!schedule) return res.status(403).json({ error: 'Åtkomst nekad' });

    const itemRes = await db.query(
      'SELECT activity_template_id FROM weekly_schedule_item WHERE id = $1 AND weekly_schedule_id = $2',
      [req.params.itemId, req.params.scheduleId]
    );
    if (!itemRes.rows.length) return res.status(404).json({ error: 'Hittades inte' });

    const { activity_template_id } = itemRes.rows[0];

    // Persist exclusion so the item stays hidden on re-sync
    await db.query(
      `INSERT INTO schedule_date_exclusion (child_id, date, activity_template_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (child_id, date, activity_template_id) DO NOTHING`,
      [schedule.child_id, date, activity_template_id]
    );

    // Ensure the daily log exists for this date, then remove the specific item
    const { log } = await getOrGenerateDailyLog(schedule.child_id, date);
    await db.query(
      'DELETE FROM daily_log_item WHERE daily_log_id = $1 AND activity_template_id = $2',
      [log.id, activity_template_id]
    );

    // Broadcast SSE so child's view updates in real-time
    try {
      const famRes = await db.query('SELECT family_id FROM child WHERE id = $1', [schedule.child_id]);
      if (famRes.rows[0]?.family_id) {
        broadcast(famRes.rows[0].family_id, 'SCHEDULE_UPDATED', { childId: schedule.child_id });
      }
    } catch (_) { /* SSE broadcast is best-effort */ }

    res.json({ message: 'Aktiviteten borttagen för detta datum' });
  } catch (err) {
    console.error('[SCHEDULE-ITEMS] Exclude-date error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;