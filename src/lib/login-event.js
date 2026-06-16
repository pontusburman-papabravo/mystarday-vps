'use strict';

/**
 * Login event recording + win-back return attribution.
 */

const db = require('./db');
const { maybeTrackWinBackReturn } = require('./win-back-return-tracker');

/**
 * Insert login_event and run post-login hooks (win-back return tracking for parents).
 */
async function recordLoginEvent({ userId, role, familyId }) {
  await db.query(
    'INSERT INTO login_event (user_id, role, family_id) VALUES ($1, $2, $3)',
    [userId, role, familyId]
  );

  if (role === 'parent' || role === 'admin') {
    await maybeTrackWinBackReturn(userId, familyId);
  }
}

module.exports = { recordLoginEvent };
