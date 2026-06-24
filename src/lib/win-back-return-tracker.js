'use strict';

/**
 * Fire win_back_returned once on the parent's first login after a win-back send.
 */

const db = require('./db');
const { ATTRIBUTION_DAYS } = require('../../db/win-back-email-stats');
const { trackWinBackReturned } = require('./analytics-tracker');

async function maybeTrackWinBackReturn(parentId, familyId) {
  if (!parentId || !familyId) return;

  const result = await db.query(
    `SELECT w.id
     FROM win_back_email_log w
     WHERE w.parent_id = $1
       AND w.status = 'sent'
       AND w.sent_at IS NOT NULL
       AND w.returned_at IS NULL
       AND w.sent_at > NOW() - ($2::text || ' days')::interval
       AND (
         SELECT COUNT(*)::int
         FROM login_event le
         WHERE le.user_id = w.parent_id
           AND le.role IN ('parent', 'admin')
           AND le.occurred_at > w.sent_at
       ) = 1
     ORDER BY w.sent_at DESC
     LIMIT 1`,
    [parentId, String(ATTRIBUTION_DAYS)]
  );

  if (!result.rows.length) return;

  await markWinBackReturned(result.rows[0].id, familyId);
}

/**
 * Mark win-back returned when engagement is detected via analytics (link click, För dig visit).
 */
async function maybeMarkWinBackReturnedFromEngagement(familyId, eventType) {
  if (!familyId) return;
  const allowed = new Set(['win_back_landing', 'for_dig_page_view', 'app_opened']);
  if (!allowed.has(eventType)) return;

  const result = await db.query(
    `SELECT w.id
     FROM win_back_email_log w
     WHERE w.family_id = $1
       AND w.status = 'sent'
       AND w.sent_at IS NOT NULL
       AND w.returned_at IS NULL
       AND w.sent_at > NOW() - ($2::text || ' days')::interval
     ORDER BY w.sent_at DESC
     LIMIT 1`,
    [familyId, String(ATTRIBUTION_DAYS)]
  );

  if (!result.rows.length) return;

  await markWinBackReturned(result.rows[0].id, familyId);
}

async function markWinBackReturned(logId, familyId) {
  const updated = await db.query(
    `UPDATE win_back_email_log
     SET returned_at = NOW()
     WHERE id = $1 AND returned_at IS NULL
     RETURNING id`,
    [logId]
  );

  if (updated.rows.length) {
    trackWinBackReturned(familyId, { win_back_log_id: logId });
  }
}

module.exports = {
  maybeTrackWinBackReturn,
  maybeMarkWinBackReturnedFromEngagement,
};
