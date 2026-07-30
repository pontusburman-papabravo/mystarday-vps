'use strict';

const db = require('./db');

/**
 * Compute star balance for a child inside or outside a transaction.
 * @param {string} childId
 * @param {{ query?: Function }} [executor] - pg Pool or Client
 */
async function getStarBalance(childId, executor = db) {
  const query = executor.query.bind(executor);
  const serial = typeof executor.release === 'function';

  const runEarned = () => query(
    `SELECT COALESCE(SUM(dli.star_value), 0) AS earned
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dli.completed = true`,
    [childId]
  );
  const runSpentSnapshot = () => query(
    `SELECT COALESCE(SUM(rr.star_cost), 0) AS spent
     FROM reward_redemption rr
     WHERE rr.child_id = $1
       AND rr.status IN ('approved', 'auto')
       AND rr.star_cost IS NOT NULL`,
    [childId]
  );
  const runSpentLegacy = () => query(
    `SELECT COALESCE(SUM(COALESCE(rr.star_cost, r.star_cost)), 0) AS spent
     FROM reward_redemption rr
     JOIN reward r ON r.id = rr.reward_id
     WHERE rr.child_id = $1
       AND rr.status IN ('approved', 'auto')
       AND rr.star_cost IS NULL`,
    [childId]
  );

  const [earnedResult, spentSnapshotResult, spentLegacyResult] = serial
    ? [
        await runEarned(),
        await runSpentSnapshot(),
        await runSpentLegacy(),
      ]
    : await Promise.all([runEarned(), runSpentSnapshot(), runSpentLegacy()]);

  let manualStars = 0;
  try {
    const manualResult = await query(
      `SELECT COALESCE(SUM(star_count), 0) AS manual FROM manual_star_grant WHERE child_id = $1`,
      [childId]
    );
    manualStars = parseInt(manualResult.rows[0].manual, 10);
  } catch (_) {
    // Table may not exist on old instances
  }

  const earned = parseInt(earnedResult.rows[0].earned, 10);
  const spent = parseInt(spentSnapshotResult.rows[0].spent, 10) + parseInt(spentLegacyResult.rows[0].spent, 10);
  return Math.max(0, earned + manualStars - spent);
}

module.exports = {
  getStarBalance,
};
