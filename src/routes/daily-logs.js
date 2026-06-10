/**
 * Daily log API routes.
 *
 * GET  /api/children/:childId/daily-log?date=YYYY-MM-DD
 *      → Fetch (or generate on-demand) the daily log for a child on a given date.
 *
 * GET  /api/children/:childId/daily-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
 *      → Fetch history of daily logs with item counts / completion stats.
 *
 * PUT  /api/daily-log-items/:itemId/complete
 *      → Mark an activity as completed (parent action).
 *
 * PUT  /api/daily-log-items/:itemId/uncomplete
 *      → Undo completion (parent action).
 *
 * PUT  /api/daily-logs/:logId/pause
 *      → Pause a day (e.g. sick day / holiday). Sets is_paused=true.
 *
 * PUT  /api/daily-logs/:logId/unpause
 *      → Un-pause a paused day.
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent, requireChild } = require('../middleware/auth');
const { getOrGenerateDailyLog, getSchoolVariant } = require('../lib/daily-log-generator');
const { broadcast } = require('../lib/sse-broadcast');
const { notifyParentsChildCompleted } = require('../lib/push');

// ─── SSE helper: look up family_id for a child ───────────
async function getChildFamilyId(childId) {
  const r = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
  return r.rows[0]?.family_id || null;
}

const router = express.Router();
router.use(requireParent);

// ─── Helpers ─────────────────────────────────────────────

/**
 * Verify parent has access to child. Returns child row or null.
 */
async function getChildAccess(parentId, childId) {
  const result = await db.query(
    'SELECT c.id, c.family_id, c.timezone, c.birthday FROM child c JOIN parent_child pc ON pc.child_id = c.id WHERE pc.parent_id = $1 AND c.id = $2',
    [parentId, childId]
  );
  return result.rows[0] || null;
}

/**
 * Verify parent has access to a daily_log (via child ownership).
 * Returns { log, childId } or null.
 */
async function getLogAccess(parentId, logId) {
  const result = await db.query(
    `SELECT dl.id, dl.child_id, dl.date, dl.is_paused, dl.generated_from, dl.created_at
     FROM daily_log dl
     JOIN child c ON c.id = dl.child_id
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND dl.id = $2`,
    [parentId, logId]
  );
  return result.rows[0] || null;
}

/**
 * Verify parent has access to a daily_log_item (via log → child → parent).
 * Returns the item row or null.
 */
async function getItemAccess(parentId, itemId) {
  const result = await db.query(
    `SELECT dli.id, dli.daily_log_id, dli.completed, dli.completed_at, dl.child_id, dl.is_paused
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND dli.id = $2`,
    [parentId, itemId]
  );
  return result.rows[0] || null;
}

/**
 * Get section times from family settings for a child.
 */
async function getSectionTimes(childId) {
  const result = await db.query(
    `SELECT f.morning_start, f.morning_end, f.day_start, f.day_end,
            f.evening_start, f.evening_end, f.night_start, f.night_end
     FROM family f
     JOIN child c ON c.family_id = f.id
     WHERE c.id = $1`,
    [childId]
  );
  return result.rows[0] || {};
}

// ─── Routes ───────────────────────────────────────────────

/**
 * GET /api/children/:childId/daily-log?date=YYYY-MM-DD
 * Fetch (or generate on-demand) today's log for the child.
 * If date is omitted, defaults to child's local today.
 */
router.get('/:childId/daily-log', async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    // Determine the date — accept both YYYY-MM-DD and ISO strings (2026-05-25T00:00:00.000Z)
    let dateStr = req.query.date;
    if (!dateStr) {
      const tz = child.timezone || 'Europe/Stockholm';
      dateStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz });
    } else {
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) dateStr = m[1];
    }

    const { log, items, generated } = await getOrGenerateDailyLog(req.params.childId, dateStr);

    // Compute age-aware school variant for this child
    const schoolVariant = getSchoolVariant(child.birthday);

    // Add age_variant to each item for frontend display
    const itemsWithVariant = items.map(item => ({
      ...item,
      age_variant: (item.name === 'Skola/Förskola' || item.name === 'Skola')
        ? schoolVariant
        : null,
    }));

    // Group items by section
    const sections = {};
    for (const item of itemsWithVariant) {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    }

    const sectionTimes = await getSectionTimes(req.params.childId);

    res.json({
      log,
      child_birthday: child.birthday,
      age_variant: schoolVariant,
      items: itemsWithVariant,
      sections,
      section_times: sectionTimes,
      generated,
      total: itemsWithVariant.length,
      completed: itemsWithVariant.filter(i => i.completed).length,
    });
  } catch (err) {
    console.error('[DAILY-LOG] Get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * GET /api/children/:childId/daily-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Fetch history of daily logs in a date range.
 */
router.get('/:childId/daily-logs', async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from och to krävs (YYYY-MM-DD)' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'Ogiltigt datumformat. Använd YYYY-MM-DD.' });
    }

    // Limit range to max 90 days
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      return res.status(400).json({ error: 'Datumintervallet får inte överstiga 90 dagar' });
    }

    // TO_CHAR ensures date is always 'YYYY-MM-DD' string — node-pg returns
    // DATE columns as JS Date objects which serialize to ISO timestamps and
    // break frontend date parsing in renderActivityList().
    const result = await db.query(
      `SELECT dl.id, TO_CHAR(dl.date, 'YYYY-MM-DD') AS date, dl.is_paused, dl.generated_from, dl.created_at,
              COUNT(dli.id) AS total_items,
              COUNT(CASE WHEN dli.completed THEN 1 END) AS completed_items
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = $1 AND dl.date >= $2 AND dl.date <= $3
       GROUP BY dl.id, dl.date, dl.is_paused, dl.generated_from, dl.created_at
       ORDER BY dl.date DESC`,
      [req.params.childId, from, to]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[DAILY-LOG] History error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ────────────────────────────────────────────────────────────
// Item-level routes (mounted at /api/daily-log-items)
// ────────────────────────────────────────────────────────────

const itemRouter = express.Router();
itemRouter.use(requireParent);

/**
 * PUT /api/daily-log-items/reorder
 * Parent reorders activities in a child's daily log.
 * Body: { ordered_item_ids: string[] }
 * IMPORTANT: This route MUST be defined before /:itemId to avoid Express matching "reorder" as a UUID
 */
itemRouter.put('/reorder', async (req, res) => {
  try {
    const { ordered_item_ids } = req.body;
    if (!Array.isArray(ordered_item_ids) || ordered_item_ids.length === 0) {
      return res.status(400).json({ error: 'ordered_item_ids must be a non-empty array' });
    }

    // Verify parent has access to the first item (all items should be in the same log)
    const firstItem = await getItemAccess(req.user.id, ordered_item_ids[0]);
    if (!firstItem) return res.status(403).json({ error: 'Du har inte åtkomst till dessa aktiviteter' });

    // Update sort_order for each item in a transaction (atomic — no partial reorder on crash)
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ordered_item_ids.length; i++) {
        await client.query(
          'UPDATE daily_log_item SET sort_order = $1 WHERE id = $2 AND daily_log_id = $3',
          [i, ordered_item_ids[i], firstItem.daily_log_id]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Parent reorder error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * DELETE /api/daily-log-items/:itemId
 * Delete a once-task (activity_template_id IS NULL).
 * Scheduled items must be removed via /api/schedules/:scheduleId/items/:itemId instead.
 */
itemRouter.delete('/:itemId', async (req, res) => {
  try {
    const item = await getItemAccess(req.user.id, req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    // Verify this is a once-task (no activity_template_id)
    const meta = await db.query(
      'SELECT activity_template_id FROM daily_log_item WHERE id = $1',
      [req.params.itemId]
    );
    if (meta.rows[0]?.activity_template_id != null) {
      return res.status(400).json({ error: 'Schemalagda aktiviteter tas bort via veckoschemat' });
    }

    await db.query('DELETE FROM daily_log_item WHERE id = $1', [req.params.itemId]);

    getChildFamilyId(item.child_id).then(fid => {
      if (fid) broadcast(fid, 'SCHEDULE_UPDATED', { once_task: true });
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Delete once-task error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/daily-log-items/:itemId/complete
 * Mark an activity as completed (parent action).
 * Push is sent to OTHER parents only — the acting parent is excluded (no self-notification).
 * completed_date is set to the log's date (not NOW()) so retroactive completion is correct.
 */
itemRouter.put('/:itemId/complete', async (req, res) => {
  try {
    const item = await getItemAccess(req.user.id, req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    // Look up the log's date for completed_date (supports retroactive past-date completion)
    const logDateResult = await db.query(
      'SELECT date FROM daily_log WHERE id = $1',
      [item.daily_log_id]
    );
    const logDate = logDateResult.rows[0]?.date || new Date();

    const result = await db.query(
      `UPDATE daily_log_item
       SET completed = true, completed_at = NOW(), completed_date = $2
       WHERE id = $1
       RETURNING id, completed, completed_at, completed_date`,
      [req.params.itemId, logDate]
    );
    res.json(result.rows[0]);
    // Family layer: derived contribution event (fire-and-forget)
    if (!item.completed) {
      const { handleActivityCompleted } = require('../lib/family-event-engine');
      handleActivityCompleted(req.params.itemId, item.child_id, false).catch(() => {});
    }
    // Broadcast SSE + push to OTHER parents (fire-and-forget; acting parent is excluded)
    getChildFamilyId(item.child_id).then(async (fid) => {
      if (!fid) return;
      // Analytics: feature_daily_log — parent marked activity complete
      require('../lib/analytics-tracker').trackDailyLog(fid);
      broadcast(fid, 'DAILY_LOG_ITEM_COMPLETED', { itemId: req.params.itemId, childId: item.child_id, completed: true });
      try {
        const [childRow, activityRow] = await Promise.all([
          db.query('SELECT name FROM child WHERE id = $1', [item.child_id]),
          db.query('SELECT name FROM daily_log_item WHERE id = $1', [req.params.itemId]),
        ]);
        const childName = childRow.rows[0]?.name || 'Barnet';
        const activityName = activityRow.rows[0]?.name || 'en aktivitet';
        // Pass req.user.id as excludeParentId — parent should not notify themselves
        notifyParentsChildCompleted(fid, item.child_id, childName, activityName, req.user.id).catch(() => {});
      } catch (_) {}
    }).catch(() => {});
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Complete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/daily-log-items/:itemId/uncomplete
 * Undo completion of an activity.
 */
itemRouter.put('/:itemId/uncomplete', async (req, res) => {
  try {
    const item = await getItemAccess(req.user.id, req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    const result = await db.query(
      `UPDATE daily_log_item
       SET completed = false, completed_at = NULL, completed_date = NULL
       WHERE id = $1
       RETURNING id, completed, completed_at, completed_date`,
      [req.params.itemId]
    );
    res.json(result.rows[0]);
    // Broadcast to all family members (fire-and-forget)
    getChildFamilyId(item.child_id).then(fid => {
      if (fid) broadcast(fid, 'DAILY_LOG_ITEM_COMPLETED', { itemId: req.params.itemId, childId: item.child_id, completed: false });
    }).catch(() => {});
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Uncomplete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PATCH /api/daily-log-items/:itemId/note
 * Save parent annotation on a daily-log item.
 * Body: { note: "text" }  (max 1000 chars; send null/empty to clear)
 */
itemRouter.patch('/:itemId/note', async (req, res) => {
  try {
    const item = await getItemAccess(req.user.id, req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    const rawNote = req.body.note;
    const note = rawNote === null || rawNote === undefined || rawNote === ''
      ? null
      : String(rawNote).trim().substring(0, 1000);

    const result = await db.query(
      `UPDATE daily_log_item SET parent_note = $2 WHERE id = $1 RETURNING id, parent_note`,
      [req.params.itemId, note]
    );
    res.json({ success: true, note: result.rows[0]?.parent_note || null });
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Note update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ────────────────────────────────────────────────────────────
// Log-level routes (mounted at /api/daily-logs)
// ────────────────────────────────────────────────────────────

const logRouter = express.Router();
logRouter.use(requireParent);

/**
 * PUT /api/daily-logs/:logId/pause
 * Pause a day (sick day / holiday).
 */
logRouter.put('/:logId/pause', async (req, res) => {
  try {
    const log = await getLogAccess(req.user.id, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Dagloggen hittades inte' });

    const result = await db.query(
      `UPDATE daily_log SET is_paused = true WHERE id = $1 RETURNING id, date, is_paused`,
      [req.params.logId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[DAILY-LOG] Pause error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/daily-logs/:logId/unpause
 * Un-pause a day.
 */
logRouter.put('/:logId/unpause', async (req, res) => {
  try {
    const log = await getLogAccess(req.user.id, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Dagloggen hittades inte' });

    const result = await db.query(
      `UPDATE daily_log SET is_paused = false WHERE id = $1 RETURNING id, date, is_paused`,
      [req.params.logId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[DAILY-LOG] Unpause error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/daily-logs/:logId/bump-time
 * Shift all uncompleted, untimed activities' start_time and end_time forward
 * by the specified number of minutes.
 *
 * Body: { minutes: 5 | 10 | 15 | 30 }
 *
 * Returns: { updated: number, snapshot: Array<{ id, start_time, end_time }> }
 * The snapshot lets the client implement a single-level undo.
 */
logRouter.put('/:logId/bump-time', async (req, res) => {
  try {
    const log = await getLogAccess(req.user.id, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Dagloggen hittades inte' });

    const ALLOWED_MINUTES = [5, 10, 15, 30];
    const minutes = parseInt(req.body.minutes, 10);
    if (!ALLOWED_MINUTES.includes(minutes)) {
      return res.status(400).json({ error: 'Ogiltigt antal minuter. Tillåtna värden: 5, 10, 15, 30.' });
    }

    // Fetch all uncompleted items with a start_time for this log
    const beforeResult = await db.query(
      `SELECT id, start_time, end_time
       FROM daily_log_item
       WHERE daily_log_id = $1 AND completed = false AND start_time IS NOT NULL`,
      [req.params.logId]
    );

    if (beforeResult.rows.length === 0) {
      return res.json({ updated: 0, snapshot: [] });
    }

    // Save snapshot for undo (caller stores this)
    const snapshot = beforeResult.rows.map(r => ({
      id: r.id,
      start_time: r.start_time,
      end_time: r.end_time,
    }));

    // Shift times using PostgreSQL interval arithmetic on HH:MM text columns
    const updateResult = await db.query(
      `UPDATE daily_log_item
       SET
         start_time = TO_CHAR(
           (TO_TIMESTAMP(start_time, 'HH24:MI') + ($1 || ' minutes')::interval),
           'HH24:MI'
         ),
         end_time = CASE
           WHEN end_time IS NOT NULL THEN
             TO_CHAR(
               (TO_TIMESTAMP(end_time, 'HH24:MI') + ($1 || ' minutes')::interval),
               'HH24:MI'
             )
           ELSE NULL
         END
       WHERE daily_log_id = $2 AND completed = false AND start_time IS NOT NULL
       RETURNING id, start_time, end_time`,
      [String(minutes), req.params.logId]
    );

    res.json({ updated: updateResult.rows.length, snapshot, items: updateResult.rows });
  } catch (err) {
    console.error('[DAILY-LOG] Bump-time error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/daily-logs/:logId/bump-time-undo
 * Restore item times from a previously saved snapshot.
 *
 * Body: { snapshot: Array<{ id, start_time, end_time }> }
 */
logRouter.put('/:logId/bump-time-undo', async (req, res) => {
  try {
    const log = await getLogAccess(req.user.id, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Dagloggen hittades inte' });

    const snapshot = req.body.snapshot;
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
      return res.status(400).json({ error: 'Ogiltig snapshot' });
    }

    // Restore each item's times. Use unnest for a single efficient query.
    const ids = snapshot.map(s => s.id);
    const startTimes = snapshot.map(s => s.start_time);
    const endTimes = snapshot.map(s => s.end_time);

    const updateResult = await db.query(
      `UPDATE daily_log_item AS dli
       SET
         start_time = v.start_time,
         end_time = v.end_time
       FROM UNNEST($1::uuid[], $2::text[], $3::text[]) AS v(id, start_time, end_time)
       WHERE dli.id = v.id AND dli.daily_log_id = $4
       RETURNING dli.id, dli.start_time, dli.end_time`,
      [ids, startTimes, endTimes, req.params.logId]
    );

    res.json({ restored: updateResult.rows.length, items: updateResult.rows });
  } catch (err) {
    console.error('[DAILY-LOG] Bump-time-undo error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ────────────────────────────────────────────────────────────
// Child self-access routes (mounted at /api/children/me)
// Children can fetch their own daily log and mark items as done.
// ────────────────────────────────────────────────────────────

const childSelfRouter = express.Router();
childSelfRouter.use(requireChild);

/**
 * GET /api/children/me/daily-log?date=YYYY-MM-DD
 * Fetch (or generate on-demand) today's log for the authenticated child.
 */
childSelfRouter.get('/daily-log', async (req, res) => {
  try {
    const childId = req.user.id;

    // Determine the date — accept both YYYY-MM-DD and ISO strings
    let dateStr = req.query.date;
    if (!dateStr) {
      const tzResult = await db.query('SELECT timezone FROM child WHERE id = $1', [childId]);
      const tz = (tzResult.rows[0] && tzResult.rows[0].timezone) || 'Europe/Stockholm';
      dateStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz });
    } else {
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) dateStr = m[1];
    }

    // Get child's UI flags + timezone (for NOW/NEXT/LATER date comparison)
    const childResult = await db.query(
      'SELECT allow_child_reorder, show_now_next, show_mood_rating, timezone, dopamin_animation, visual_timer, hide_clock, color_coding, view_type FROM child WHERE id = $1',
      [childId]
    );
    const allowChildReorder = childResult.rows[0]?.allow_child_reorder || false;
    const showNowNext = childResult.rows[0]?.show_now_next !== false; // default true
    const showMoodRating = childResult.rows[0]?.show_mood_rating !== false; // default true
    const dopaminAnimation = childResult.rows[0]?.dopamin_animation !== false; // default true
    const visualTimer = childResult.rows[0]?.visual_timer !== false; // default true
    const hideClock = childResult.rows[0]?.hide_clock || false; // default false
    const colorCoding = childResult.rows[0]?.color_coding !== false; // default true
    const viewType = childResult.rows[0]?.view_type || 'day_sections'; // 'day_sections' | 'now_next_later'
    const childTimezone = childResult.rows[0]?.timezone || 'Europe/Stockholm';

    const { log, items, generated } = await getOrGenerateDailyLog(childId, dateStr);

    // Apply child's custom ordering within each section.
    // child_sort_order is set when the child reorders activities via drag & drop.
    // Falls back to parent's sort_order when no custom order has been set.
    const sortedItems = [...items].sort((a, b) => {
      if (a.section !== b.section) return 0; // section grouping handled below
      const aOrder = a.child_sort_order != null ? a.child_sort_order : a.sort_order;
      const bOrder = b.child_sort_order != null ? b.child_sort_order : b.sort_order;
      return aOrder - bOrder;
    });

    // Group items by section (using child-sorted order)
    const sections = {};
    for (const item of sortedItems) {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    }

    const sectionTimes = await getSectionTimes(childId);

    // ── Enrich items with sub_step_count from activity templates ─────
    // Used by the child UI to decide whether to show an expand button.
    // One batch query: count sub-steps per activity_template_id.
    const templateIds = [...new Set(sortedItems.map(i => i.activity_template_id).filter(Boolean))];
    const subStepCountMap = {};
    if (templateIds.length > 0) {
      const countResult = await db.query(
        `SELECT activity_template_id, COUNT(*) AS cnt
         FROM activity_sub_step
         WHERE activity_template_id = ANY($1::uuid[])
         GROUP BY activity_template_id`,
        [templateIds]
      );
      for (const row of countResult.rows) {
        subStepCountMap[row.activity_template_id] = parseInt(row.cnt, 10);
      }
    }
    // Attach sub_step_count to each sorted item
    for (const item of sortedItems) {
      item.sub_step_count = subStepCountMap[item.activity_template_id] || 0;
    }

    // ── Batch-fetch child ratings for all items in one query ───────────────
    // Replaces N sequential GET /api/me/daily-log-items/:id/rating calls.
    // Uses the `rating` table (daily_log_item_id + user_type='child').
    const itemIds = sortedItems.map(i => i.id);
    const ratingMap = {};
    if (itemIds.length > 0) {
      const ratingResult = await db.query(
        `SELECT daily_log_item_id, score AS child_score, comment AS child_comment
         FROM rating
         WHERE daily_log_item_id = ANY($1::uuid[]) AND user_type = 'child'`,
        [itemIds]
      );
      for (const row of ratingResult.rows) {
        ratingMap[row.daily_log_item_id] = {
          child_score: row.child_score,
          child_comment: row.child_comment,
        };
      }
    }
    // Attach rating to each item
    for (const item of sortedItems) {
      item.rating = ratingMap[item.id] || null;
    }

    // Compute totals from the FULL list (before any filtering)
    const total = sortedItems.length;
    const completedCount = sortedItems.filter(i => i.completed).length;

    // ── NOW/NEXT/LATER backend tagging ─────────────────────────
    // When show_now_next is enabled AND the date is today,
    // return ALL items tagged with _nnl_status:
    //   'done'  = completed (shown as history at top)
    //   'now'   = first unchecked (featured card)
    //   'next'  = second unchecked
    //   'later' = all remaining unchecked
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: childTimezone });
    const isToday = dateStr === todayStr;

    let filteredItems = sortedItems;
    let nowNextFiltered = false;
    // Only apply NOW/NEXT/LATER tagging when child's view_type is 'now_next_later'
    // (and the legacy show_now_next toggle is also on, and it's today).
    if (viewType === 'now_next_later' && showNowNext && isToday) {
      const sectionOrder = ['morgon', 'dag', 'kvall', 'natt'];
      const tagged = [];
      let uncheckedCount = 0;
      for (const sec of sectionOrder) {
        if (!sections[sec]) continue;
        for (const item of sections[sec]) {
          if (item.completed) {
            tagged.push({ ...item, _nnl_status: 'done' });
          } else {
            uncheckedCount++;
            const status = uncheckedCount === 1 ? 'now' : uncheckedCount === 2 ? 'next' : 'later';
            tagged.push({ ...item, _nnl_status: status });
          }
        }
      }
      filteredItems = tagged;
      nowNextFiltered = true;
    }

    // Re-group filtered items by section
    const filteredSections = {};
    for (const item of filteredItems) {
      if (!filteredSections[item.section]) filteredSections[item.section] = [];
      filteredSections[item.section].push(item);
    }

    res.json({
      log,
      allow_child_reorder: allowChildReorder,
      show_now_next: showNowNext,
      show_mood_rating: showMoodRating,
      dopamin_animation: dopaminAnimation,
      visual_timer: visualTimer,
      hide_clock: hideClock,
      color_coding: colorCoding,
      view_type: viewType,
      items: filteredItems,
      sections: filteredSections,
      section_times: sectionTimes,
      generated,
      total,
      completed: completedCount,
      now_next_filtered: nowNextFiltered,
    });
  } catch (err) {
    console.error('[DAILY-LOG-CHILD] Get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/children/me/daily-log-items/:itemId/complete
 * Child marks an activity as completed.
 */
childSelfRouter.put('/daily-log-items/:itemId/complete', async (req, res) => {
  try {
    // Verify the item belongs to this child
    const itemResult = await db.query(
      `SELECT dli.id, dli.daily_log_id, dli.completed, dl.child_id, dl.is_paused
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [req.params.itemId, req.user.id]
    );
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    if (item.is_paused) return res.status(400).json({ error: 'Dagen är pausad' });

    // Look up log date for completed_date
    const logDateResult2 = await db.query(
      'SELECT date FROM daily_log WHERE id = $1',
      [item.daily_log_id]
    );
    const logDate2 = logDateResult2.rows[0]?.date || new Date();

    const result = await db.query(
      `UPDATE daily_log_item
       SET completed = true, completed_at = NOW(), completed_date = $2
       WHERE id = $1
       RETURNING id, completed, completed_at, completed_date`,
      [req.params.itemId, logDate2]
    );
    res.json(result.rows[0]);
    // Family layer: derived contribution event (fire-and-forget)
    if (!item.completed) {
      const { handleActivityCompleted } = require('../lib/family-event-engine');
      handleActivityCompleted(req.params.itemId, req.user.id, false).catch(() => {});
    }
    // Broadcast to all family members + push notify parents (fire-and-forget)
    getChildFamilyId(req.user.id).then(async (fid) => {
      if (!fid) return;
      broadcast(fid, 'DAILY_LOG_ITEM_COMPLETED', { itemId: req.params.itemId, childId: req.user.id, completed: true });
      // Activation program: child_first_completion (Fas 2 — child path only)
      if (!item.completed) {
        try {
          const parentActivationProgram = require('../../db/parent-activation-program');
          const { isActivationProgramEnabled } = require('../lib/activation-program-enroll');
          const { maybeTrackChildFirstCompletion, getFamilyTimezone } = require('../lib/activation-program-aha');
          if (isActivationProgramEnabled()) {
            const program = await parentActivationProgram.getActiveByFamily(fid);
            if (program) {
              const [activityRow, timezone] = await Promise.all([
                db.query('SELECT name FROM daily_log_item WHERE id = $1', [req.params.itemId]),
                getFamilyTimezone(fid),
              ]);
              await maybeTrackChildFirstCompletion({
                familyId: fid,
                program,
                childId: req.user.id,
                dailyLogItemId: req.params.itemId,
                activityName: activityRow.rows[0]?.name || 'en aktivitet',
                timezone,
              });
            }
          }
        } catch (err) {
          console.error('[ACTIVATION-PROGRAM] child_first_completion error:', err.message);
        }
      }
      // Push notification: look up child name + activity name, then notify parents
      try {
        const [childRow, activityRow] = await Promise.all([
          db.query('SELECT name FROM child WHERE id = $1', [req.user.id]),
          db.query('SELECT name FROM daily_log_item WHERE id = $1', [req.params.itemId]),
        ]);
        const childName = childRow.rows[0]?.name || 'Barnet';
        const activityName = activityRow.rows[0]?.name || 'en aktivitet';
        notifyParentsChildCompleted(fid, req.user.id, childName, activityName).catch(() => {});
      } catch (_) {}
    }).catch(() => {});
  } catch (err) {
    console.error('[DAILY-LOG-CHILD] Complete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/me/daily-log/reorder
 * Child reorders activities in their daily log.
 * Accepts: { ordered_item_ids: string[] } — new order of item IDs (within same log)
 *
 * Saves child_sort_order for each item. This is separate from the parent's
 * schedule sort_order, so children's custom ordering doesn't affect the template.
 */
childSelfRouter.put('/daily-log/reorder', async (req, res) => {
  try {
    const { ordered_item_ids } = req.body;
    if (!Array.isArray(ordered_item_ids) || ordered_item_ids.length === 0) {
      return res.status(400).json({ error: 'ordered_item_ids must be a non-empty array' });
    }

    const childId = req.user.id;

    // Check that parent has enabled reordering for this child
    const childSettings = await db.query(
      'SELECT allow_child_reorder FROM child WHERE id = $1',
      [childId]
    );
    if (!childSettings.rows[0]?.allow_child_reorder) {
      return res.status(403).json({ error: 'Omordning är inte tillåten för detta barn' });
    }

    // Verify first item belongs to this child's daily log
    const firstItem = await db.query(
      `SELECT dli.id, dl.id AS log_id
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [ordered_item_ids[0], childId]
    );
    if (firstItem.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }
    const logId = firstItem.rows[0].log_id;

    // Verify all items are in the same log and belong to this child
    const validItems = await db.query(
      `SELECT dli.id
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.id = $1 AND dl.child_id = $2`,
      [logId, childId]
    );
    const validIds = new Set(validItems.rows.map(r => r.id));
    for (const id of ordered_item_ids) {
      if (!validIds.has(id)) {
        return res.status(400).json({ error: 'Ogiltigt aktivitets-ID i listan' });
      }
    }

    // Update child_sort_order for each item in a transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ordered_item_ids.length; i++) {
        await client.query(
          'UPDATE daily_log_item SET child_sort_order = $1 WHERE id = $2 AND daily_log_id = $3',
          [i, ordered_item_ids[i], logId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ message: 'Ordning sparad' });
  } catch (err) {
    console.error('[DAILY-LOG-CHILD] Reorder error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/children/me/daily-log-items/:itemId/uncomplete
 * Child undoes completion of an activity.
 */
childSelfRouter.put('/daily-log-items/:itemId/uncomplete', async (req, res) => {
  try {
    const itemResult = await db.query(
      `SELECT dli.id, dl.child_id
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [req.params.itemId, req.user.id]
    );
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    const result = await db.query(
      `UPDATE daily_log_item
       SET completed = false, completed_at = NULL, completed_date = NULL
       WHERE id = $1
       RETURNING id, completed, completed_at, completed_date`,
      [req.params.itemId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[DAILY-LOG-CHILD] Uncomplete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── Sub-step endpoints (child view) ────────────────────────────────────────

/**
 * GET /api/children/me/daily-log-items/:itemId/sub-steps
 * Returns all sub-steps for this activity with their completion status.
 * Reads the template's sub-steps and joins any existing tracking rows.
 */
childSelfRouter.get('/daily-log-items/:itemId/sub-steps', async (req, res) => {
  try {
    // Verify item belongs to this child
    const itemResult = await db.query(
      `SELECT dli.id, dli.activity_template_id, dl.child_id, dl.is_paused
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [req.params.itemId, req.user.id]
    );
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    // Get sub-steps from template (with completion state if any)
    const stepsResult = await db.query(
      `SELECT
         s.id,
         s.name,
         s.icon,
         s.sort_order,
         COALESCE(t.completed, false) AS completed,
         t.completed_at
       FROM activity_sub_step s
       LEFT JOIN daily_log_item_sub_step t
         ON t.activity_sub_step_id = s.id AND t.daily_log_item_id = $1
       WHERE s.activity_template_id = $2
       ORDER BY s.sort_order, s.id`,
      [req.params.itemId, item.activity_template_id]
    );

    res.json({ sub_steps: stepsResult.rows });
  } catch (err) {
    console.error('[DAILY-LOG-CHILD] Sub-steps get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/children/me/daily-log-items/:itemId/sub-steps/:subStepId/complete
 * Child checks off a single sub-step. Uses upsert so rows are created lazily.
 */
childSelfRouter.put('/daily-log-items/:itemId/sub-steps/:subStepId/complete', async (req, res) => {
  try {
    // Verify item belongs to this child
    const itemResult = await db.query(
      `SELECT dli.id, dli.activity_template_id, dl.child_id, dl.is_paused
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [req.params.itemId, req.user.id]
    );
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    if (item.is_paused) return res.status(400).json({ error: 'Dagen är pausad' });

    // Verify sub-step belongs to this item's template
    const stepResult = await db.query(
      `SELECT id FROM activity_sub_step
       WHERE id = $1 AND activity_template_id = $2`,
      [req.params.subStepId, item.activity_template_id]
    );
    if (!stepResult.rows[0]) return res.status(404).json({ error: 'Delsteget hittades inte' });

    // Upsert completion row
    const upsertResult = await db.query(
      `INSERT INTO daily_log_item_sub_step (daily_log_item_id, activity_sub_step_id, completed, completed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (daily_log_item_id, activity_sub_step_id)
       DO UPDATE SET completed = true, completed_at = NOW()
       RETURNING activity_sub_step_id AS id, completed, completed_at`,
      [req.params.itemId, req.params.subStepId]
    );

    res.json(upsertResult.rows[0]);
  } catch (err) {
    console.error('[DAILY-LOG-CHILD] Sub-step complete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/children/me/daily-log-items/:itemId/sub-steps/:subStepId/uncomplete
 * Child unchecks a single sub-step.
 */
childSelfRouter.put('/daily-log-items/:itemId/sub-steps/:subStepId/uncomplete', async (req, res) => {
  try {
    // Verify item belongs to this child
    const itemResult = await db.query(
      `SELECT dli.id, dli.activity_template_id, dl.child_id
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [req.params.itemId, req.user.id]
    );
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    // Verify sub-step belongs to this item's template
    const stepResult = await db.query(
      `SELECT id FROM activity_sub_step
       WHERE id = $1 AND activity_template_id = $2`,
      [req.params.subStepId, item.activity_template_id]
    );
    if (!stepResult.rows[0]) return res.status(404).json({ error: 'Delsteget hittades inte' });

    // Upsert uncomplete row
    const upsertResult = await db.query(
      `INSERT INTO daily_log_item_sub_step (daily_log_item_id, activity_sub_step_id, completed, completed_at)
       VALUES ($1, $2, false, NULL)
       ON CONFLICT (daily_log_item_id, activity_sub_step_id)
       DO UPDATE SET completed = false, completed_at = NULL
       RETURNING activity_sub_step_id AS id, completed, completed_at`,
      [req.params.itemId, req.params.subStepId]
    );

    res.json(upsertResult.rows[0]);
  } catch (err) {
    console.error('[DAILY-LOG-CHILD] Sub-step uncomplete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/me/view-type
 * Child saves their preferred view type (day_sections or now_next_later).
 * This allows the child to toggle the view themselves from their dashboard.
 */
childSelfRouter.put('/view-type', async (req, res) => {
  try {
    const { view_type } = req.body;
    const allowed = ['day_sections', 'now_next_later'];
    if (!view_type || !allowed.includes(view_type)) {
      return res.status(400).json({ error: 'Ogiltigt view_type. Tillåtna värden: day_sections, now_next_later' });
    }
    await db.query(
      'UPDATE child SET view_type = $1 WHERE id = $2',
      [view_type, req.user.id]
    );
    res.json({ view_type });
  } catch (err) {
    console.error('[DAILY-LOG-CHILD] View type update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = { childRouter: router, itemRouter, logRouter, childSelfRouter };