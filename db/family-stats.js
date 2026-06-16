/**
 * Family statistics DB module.
 * Owns: family-level aggregate queries for public and admin stats.
 * Does NOT own: parent/child-level stats (user-stats.js), analytics (analytics.js).
 */

const db = require('../src/lib/db');

/**
 * Total registered families — used for founder counter and lifetime-free eligibility.
 */
async function getTotalFamilyCount() {
  const result = await db.query('SELECT COUNT(*)::int AS total FROM family');
  return result.rows[0].total || 0;
}

/**
 * Legacy alias — landing page founder counter.
 */
async function getFounderCount() {
  return getTotalFamilyCount();
}

module.exports = { getFounderCount, getTotalFamilyCount };