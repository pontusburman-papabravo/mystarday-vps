'use strict';

const db = require('./db');
const { broadcast } = require('./sse-broadcast');
const { getChildFamilyId } = require('../routes/daily-logs/helpers');
const { countLifetimeCompletions } = require('./first-star-mode');

/**
 * Shared completion path for widget + other server entry points.
 * Preserves stars, first-success, SSE, activation hooks, platform-runtime.
 *
 * @param {object} params
 * @param {string} params.dailyLogItemId
 * @param {string} params.childId
 * @param {string} [params.familyId]
 * @param {'child'|'parent'} params.completedBy
 * @param {string|null} [params.completedByParentId]
 * @param {string} params.completionSource — e.g. widget_ios, home
 * @param {string|null} [params.clientOriginId]
 */
async function completeDailyLogItemCore({
  dailyLogItemId,
  childId,
  familyId,
  completedBy,
  completedByParentId = null,
  completionSource,
  clientOriginId = null,
}) {
  const client = await db.getClient();
  try {
    const itemResult = await client.query(
      `SELECT dli.id, dli.daily_log_id, dli.completed, dli.star_value, dl.child_id, dl.is_paused
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [dailyLogItemId, childId]
    );
    const item = itemResult.rows[0];
    if (!item) {
      return { status: 'not_found' };
    }
    if (item.is_paused) {
      return { status: 'paused' };
    }
    if (item.completed) {
      return {
        status: 'already_completed',
        justCompleted: false,
        star_value: item.star_value || 0,
        completeRow: null,
      };
    }

    const logDateResult = await client.query(
      'SELECT date FROM daily_log WHERE id = $1',
      [item.daily_log_id]
    );
    const logDate = logDateResult.rows[0]?.date || new Date();

    const lifetimeCompletionsBefore = await countLifetimeCompletions(childId);

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE daily_log_item
       SET completed = true, completed_at = NOW(), completed_date = $2,
           completed_by = $3,
           completed_by_parent_id = $4,
           completion_source = $5
       WHERE id = $1 AND completed = false
       RETURNING id, completed, completed_at, completed_date, star_value`,
      [
        dailyLogItemId,
        logDate,
        completedBy,
        completedBy === 'parent' ? completedByParentId : null,
        completionSource,
      ]
    );
    const justCompleted = result.rows.length > 0;
    const completeRow = result.rows[0] || null;

    let firstStarNewlyRecorded = false;
    let familyIdForMilestone = familyId;
    if (justCompleted) {
      if (!familyIdForMilestone) {
        const fam = await client.query('SELECT family_id FROM child WHERE id = $1', [childId]);
        familyIdForMilestone = fam.rows[0]?.family_id;
      }
      if (familyIdForMilestone) {
        const { tryAtomicFirstCompletionInTx } = require('./activation-first-completion');
        firstStarNewlyRecorded = await tryAtomicFirstCompletionInTx(client, familyIdForMilestone);
      }
    }
    await client.query('COMMIT');

    if (justCompleted && familyId) {
      const { maybeTrackFirstStarModeActivity } = require('./first-star-mode-analytics');
      await maybeTrackFirstStarModeActivity({
        familyId,
        childId,
        dailyLogItemId,
        lifetimeCompletionsBefore,
      });
    }

    if (firstStarNewlyRecorded && familyIdForMilestone) {
      const { emitFirstCompletionRecorded } = require('./activation-first-completion');
      emitFirstCompletionRecorded(familyIdForMilestone, {
        child_id: childId,
        source: completionSource,
      });
    }

    if (justCompleted) {
      const { handleActivityCompleted } = require('./family-event-engine');
      handleActivityCompleted(dailyLogItemId, childId, false).catch((err) => {
        console.error('[DAILY-LOG-COMPLETE] handleActivityCompleted failed:', err.message);
      });
      getChildFamilyId(childId).then(async (fid) => {
        if (!fid) return;
        broadcast(fid, 'DAILY_LOG_ITEM_COMPLETED', {
          itemId: dailyLogItemId,
          childId,
          completed: true,
          ...(clientOriginId ? { clientOriginId } : {}),
        });
        if (firstStarNewlyRecorded) {
          require('./journey/ingest').ingestMilestoneAsync({
            familyId: fid,
            milestone: 'child_first_completion',
            childId,
            metadata: { daily_log_item_id: dailyLogItemId },
          });
        }
        require('./platform-runtime').handleActivityComplete({
          childId,
          familyId: fid,
          dailyLogItemId,
        }).catch((err) => {
          console.error('[platform-runtime] complete core error:', err.message);
        });
      }).catch(() => {});
    }

    return {
      status: justCompleted ? 'completed' : 'already_completed',
      justCompleted,
      star_value: completeRow?.star_value ?? item.star_value ?? 0,
      completeRow,
      firstStarNewlyRecorded,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { completeDailyLogItemCore };
