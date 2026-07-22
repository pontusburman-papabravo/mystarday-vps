'use strict';

/**
 * Item-level daily log routes (mounted at /api/daily-log-items).
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { getItemAccess, requireItemAccess } = require('../../middleware/authz');
const { broadcast } = require('../../lib/sse-broadcast');
const { notifyParentsChildCompleted } = require('../../lib/push');
const { getChildFamilyId } = require('./helpers');

const itemRouter = express.Router();
itemRouter.use(requireParent);

itemRouter.put('/reorder', async (req, res) => {
  try {
    const { ordered_item_ids } = req.body;
    if (!Array.isArray(ordered_item_ids) || ordered_item_ids.length === 0) {
      return res.status(400).json({ error: 'ordered_item_ids must be a non-empty array' });
    }

    const firstItem = await getItemAccess(req.user.id, ordered_item_ids[0]);
    if (!firstItem) return res.status(403).json({ error: 'Du har inte åtkomst till dessa aktiviteter' });

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

itemRouter.delete('/:itemId', requireItemAccess('itemId'), async (req, res) => {
  try {
    const item = req.authzItem;

    const meta = await db.query(
      'SELECT activity_template_id, is_once_task FROM daily_log_item WHERE id = $1',
      [req.params.itemId]
    );
    if (meta.rows[0]?.activity_template_id != null && !meta.rows[0]?.is_once_task) {
      return res.status(400).json({ error: 'Schemalagda aktiviteter tas bort via veckoschemat' });
    }

    await db.query('DELETE FROM daily_log_item WHERE id = $1', [req.params.itemId]);

    getChildFamilyId(item.child_id).then(fid => {
      if (fid) broadcast(fid, 'SCHEDULE_UPDATED', { once_task: true });
    }).catch((err) => console.error('[DAILY-LOG-ITEM] Broadcast after delete failed:', err.message));

    res.json({ ok: true });
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Delete once-task error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

itemRouter.put('/:itemId/complete', requireItemAccess('itemId'), async (req, res) => {
  try {
    const item = req.authzItem;

    const logDateResult = await db.query(
      'SELECT date FROM daily_log WHERE id = $1',
      [item.daily_log_id]
    );
    const logDate = logDateResult.rows[0]?.date || new Date();

    const result = await db.query(
      `UPDATE daily_log_item
       SET completed = true, completed_at = NOW(), completed_date = $2,
           completed_by = COALESCE(completed_by, 'parent'),
           completed_by_parent_id = COALESCE(completed_by_parent_id, $3),
           completion_source = COALESCE(completion_source, 'home')
       WHERE id = $1 AND completed = false
       RETURNING id, completed, completed_at, completed_date`,
      [req.params.itemId, logDate, req.user.id]
    );
    const justCompleted = result.rows.length > 0;
    let firstStarNewlyRecorded = false;
    if (justCompleted) {
      try {
        const fid = await getChildFamilyId(item.child_id);
        if (fid) {
          firstStarNewlyRecorded = await require('../../lib/activation-first-completion')
            .maybeRecordFirstCompletion(fid, {
              child_id: item.child_id,
              source: 'parent_complete',
            });
        }
      } catch (err) {
        console.error('[DAILY-LOG-ITEM] maybeRecordFirstCompletion failed:', err.message);
      }
    }
    res.json(
      justCompleted
        ? Object.assign({}, result.rows[0], {
          meta_milestones: firstStarNewlyRecorded
            ? { first_star_earned: true, flow: 'parent_complete' }
            : {},
        })
        : { id: req.params.itemId, completed: true, meta_milestones: {} }
    );
    if (justCompleted) {
      const { handleActivityCompleted } = require('../../lib/family-event-engine');
      handleActivityCompleted(req.params.itemId, item.child_id, false).catch((err) => {
        console.error('[DAILY-LOG-ITEM] handleActivityCompleted failed:', err.message);
      });
    }
    getChildFamilyId(item.child_id).then(async (fid) => {
      if (!fid) return;
      require('../../lib/analytics-tracker').trackDailyLog(fid);
      broadcast(fid, 'DAILY_LOG_ITEM_COMPLETED', { itemId: req.params.itemId, childId: item.child_id, completed: true });
      if (!justCompleted) return;
      try {
        const [childRow, activityRow] = await Promise.all([
          db.query('SELECT name FROM child WHERE id = $1', [item.child_id]),
          db.query('SELECT name FROM daily_log_item WHERE id = $1', [req.params.itemId]),
        ]);
        const childName = childRow.rows[0]?.name || 'Barnet';
        const activityName = activityRow.rows[0]?.name || 'en aktivitet';
        notifyParentsChildCompleted(fid, item.child_id, childName, activityName, req.user.id).catch((err) => {
          console.error('[DAILY-LOG-ITEM] notifyParentsChildCompleted failed:', err.message);
        });
      } catch (err) {
        console.error('[DAILY-LOG-ITEM] Completion notify lookup failed:', err.message);
      }
    }).catch((err) => console.error('[DAILY-LOG-ITEM] Post-complete broadcast failed:', err.message));
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Complete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

itemRouter.put('/:itemId/uncomplete', requireItemAccess('itemId'), async (req, res) => {
  try {
    const item = req.authzItem;

    const result = await db.query(
      `UPDATE daily_log_item
       SET completed = false, completed_at = NULL, completed_date = NULL
       WHERE id = $1
       RETURNING id, completed, completed_at, completed_date`,
      [req.params.itemId]
    );
    res.json(result.rows[0]);
    getChildFamilyId(item.child_id).then(fid => {
      if (fid) broadcast(fid, 'DAILY_LOG_ITEM_COMPLETED', { itemId: req.params.itemId, childId: item.child_id, completed: false });
    }).catch((err) => console.error('[DAILY-LOG-ITEM] Uncomplete broadcast failed:', err.message));
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Uncomplete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

itemRouter.patch('/:itemId/note', requireItemAccess('itemId'), async (req, res) => {
  try {

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

module.exports = itemRouter;
