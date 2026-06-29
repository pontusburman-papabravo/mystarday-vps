'use strict';

/**
 * Child self-access daily log routes (mounted at /api/me).
 */

const express = require('express');
const db = require('../../lib/db');
const { requireChild } = require('../../middleware/auth');
const { scopeRouterToPath } = require('../../middleware/router-path-scope');
const { getOrGenerateDailyLog } = require('../../lib/daily-log-generator');
const { broadcast } = require('../../lib/sse-broadcast');
const { notifyParentsChildCompleted } = require('../../lib/push');
const {
  getChildFamilyId,
  getSectionTimes,
  parseLogDate,
  getChildOwnedLogItem,
} = require('./helpers');

const childSelfRouter = express.Router();
childSelfRouter.use(scopeRouterToPath('/daily-log', '/daily-log-items', '/view-type'));
childSelfRouter.use(requireChild);

/**
 * GET /api/children/me/daily-log?date=YYYY-MM-DD
 * Fetch (or generate on-demand) today's log for the authenticated child.
 */
childSelfRouter.get('/daily-log', async (req, res) => {
  try {
    const childId = req.user.id;

    // Get child's UI flags + timezone (for NOW/NEXT/LATER date comparison)
    const childResult = await db.query(
      'SELECT allow_child_reorder, show_now_next, show_mood_rating, timezone, dopamin_animation, visual_timer, hide_clock, color_coding, view_type FROM child WHERE id = $1',
      [childId]
    );
    const childTimezone = childResult.rows[0]?.timezone || 'Europe/Stockholm';
    const dateStr = parseLogDate(req.query.date, childTimezone);

    const allowChildReorder = childResult.rows[0]?.allow_child_reorder || false;
    const showNowNext = childResult.rows[0]?.show_now_next !== false; // default true
    const showMoodRating = childResult.rows[0]?.show_mood_rating !== false; // default true
    const dopaminAnimation = childResult.rows[0]?.dopamin_animation !== false; // default true
    const visualTimer = childResult.rows[0]?.visual_timer !== false; // default true
    const hideClock = childResult.rows[0]?.hide_clock || false; // default false
    const colorCoding = childResult.rows[0]?.color_coding !== false; // default true
    const viewType = childResult.rows[0]?.view_type || 'day_sections'; // 'day_sections' | 'now_next_later'

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

    // ── Enrich items with seven_questions from activity templates (teacch) ──
    const sevenQuestionsMap = {};
    if (templateIds.length > 0) {
      const sqResult = await db.query(
        `SELECT id, seven_questions FROM activity_template WHERE id = ANY($1::uuid[])`,
        [templateIds]
      );
      for (const row of sqResult.rows) {
        sevenQuestionsMap[row.id] = row.seven_questions || {};
      }
    }
    for (const item of sortedItems) {
      if (item.activity_template_id && sevenQuestionsMap[item.activity_template_id]) {
        item.seven_questions = sevenQuestionsMap[item.activity_template_id];
      }
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

    // Modell A (§4.4.11): record 'child' as home source; don't overwrite a
    // pedagog/school completion that already happened first.
    const result = await db.query(
      `UPDATE daily_log_item
       SET completed = true, completed_at = NOW(), completed_date = $2,
           completed_by = COALESCE(completed_by, 'child'),
           completion_source = COALESCE(completion_source, 'home')
       WHERE id = $1
       RETURNING id, completed, completed_at, completed_date`,
      [req.params.itemId, logDate2]
    );
    res.json(result.rows[0]);
    // Family layer: derived contribution event (fire-and-forget)
    if (!item.completed) {
      const { handleActivityCompleted } = require('../../lib/family-event-engine');
      handleActivityCompleted(req.params.itemId, req.user.id, false).catch(() => {});
    }
    // Broadcast to all family members + push notify parents (fire-and-forget)
    getChildFamilyId(req.user.id).then(async (fid) => {
      if (!fid) return;
      broadcast(fid, 'DAILY_LOG_ITEM_COMPLETED', { itemId: req.params.itemId, childId: req.user.id, completed: true });
      // Activation program: child_first_completion (Fas 2 — child path only)
      if (!item.completed) {
        require('../../lib/activation-first-completion').maybeRecordFirstCompletion(fid, {
          child_id: req.user.id,
          source: 'child_complete',
        });
        require('../../lib/journey/ingest').ingestMilestoneAsync({
          familyId: fid,
          milestone: 'child_first_completion',
          childId: req.user.id,
          metadata: { daily_log_item_id: req.params.itemId },
        });
      }
      if (!item.completed) {
        try {
          const parentActivationProgram = require('../../../db/parent-activation-program');
          const { isActivationProgramEnabled } = require('../../lib/activation-program-enroll');
          const { maybeTrackChildFirstCompletion, getFamilyTimezone } = require('../../lib/activation-program-aha');
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
    const item = await getChildOwnedLogItem(req.params.itemId, req.user.id);
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
    const item = await getChildOwnedLogItem(req.params.itemId, req.user.id);
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
    const item = await getChildOwnedLogItem(req.params.itemId, req.user.id);
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


module.exports = childSelfRouter;
