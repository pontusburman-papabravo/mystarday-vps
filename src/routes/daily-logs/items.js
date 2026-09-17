'use strict';

const { sendApiError } = require('../../lib/api-user-error');

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
const {
  DailyLogReorderError,
  reorderDailyLogItemsAsParent,
} = require('../../lib/daily-log-reorder');

const itemRouter = express.Router();
itemRouter.use(requireParent);

itemRouter.put('/reorder', async (req, res) => {
  try {
    const { ordered_item_ids } = req.body;
    await reorderDailyLogItemsAsParent(db, {
      parentId: req.user.id,
      orderedItemIds: ordered_item_ids,
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof DailyLogReorderError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[DAILY-LOG-ITEM] Parent reorder error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
      return sendApiError(res, 400, 'SCHEDULED_VIA_WEEK');
    }

    await db.query('DELETE FROM daily_log_item WHERE id = $1', [req.params.itemId]);

    getChildFamilyId(item.child_id).then(fid => {
      if (fid) broadcast(fid, 'SCHEDULE_UPDATED', { childId: item.child_id, once_task: true });
    }).catch((err) => console.error('[DAILY-LOG-ITEM] Broadcast after delete failed:', err.message));

    res.json({ ok: true });
  } catch (err) {
    console.error('[DAILY-LOG-ITEM] Delete once-task error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

itemRouter.put('/:itemId/complete', requireItemAccess('itemId'), async (req, res) => {
  const client = await db.getClient();
  try {
    const item = req.authzItem;

    const logDateResult = await db.query(
      'SELECT date FROM daily_log WHERE id = $1',
      [item.daily_log_id]
    );
    const logDate = logDateResult.rows[0]?.date || new Date();

    let justCompleted = false;
    let firstStarNewlyRecorded = false;
    let completeRow = null;

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE daily_log_item
       SET completed = true, completed_at = NOW(), completed_date = $2,
           completed_by = COALESCE(completed_by, 'parent'),
           completed_by_parent_id = COALESCE(completed_by_parent_id, $3),
           completion_source = COALESCE(completion_source, 'home')
       WHERE id = $1 AND completed = false
       RETURNING id, completed, completed_at, completed_date`,
      [req.params.itemId, logDate, req.user.id]
    );
    justCompleted = result.rows.length > 0;
    completeRow = result.rows[0] || null;

    if (justCompleted) {
      const fid = await getChildFamilyId(item.child_id);
      if (fid) {
        const { tryAtomicFirstCompletionInTx } = require('../../lib/activation-first-completion');
        firstStarNewlyRecorded = await tryAtomicFirstCompletionInTx(client, fid);
      }
    }
    await client.query('COMMIT');

    if (firstStarNewlyRecorded) {
      const fid = await getChildFamilyId(item.child_id);
      if (fid) {
        const { emitFirstCompletionRecorded } = require('../../lib/activation-first-completion');
        emitFirstCompletionRecorded(fid, {
          child_id: item.child_id,
          source: 'parent_complete',
        });
      }
    }
    res.json(
      justCompleted
        ? Object.assign({}, completeRow, {
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
        const { t } = require('../../lib/i18n');
        const { getFamilyPreferredLocale } = require('../../lib/family-locale');
        const locale = await getFamilyPreferredLocale(fid);
        const childName = childRow.rows[0]?.name || t(locale, 'family.fallbacks.child');
        const activityName = activityRow.rows[0]?.name || t(locale, 'family.fallbacks.activity');
        notifyParentsChildCompleted(fid, item.child_id, childName, activityName, req.user.id).catch((err) => {
          console.error('[DAILY-LOG-ITEM] notifyParentsChildCompleted failed:', err.message);
        });
      } catch (err) {
        console.error('[DAILY-LOG-ITEM] Completion notify lookup failed:', err.message);
      }
    }).catch((err) => console.error('[DAILY-LOG-ITEM] Post-complete broadcast failed:', err.message));
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* ignore */
    }
    console.error('[DAILY-LOG-ITEM] Complete error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  } finally {
    client.release();
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
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = itemRouter;
