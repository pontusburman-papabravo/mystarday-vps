'use strict';

/**
 * Win-back env configuration.
 * WIN_BACK_STALE_HOURS — auto-reject pending_approval records after N hours (default 168 = 7 days).
 */

const DEFAULT_STALE_HOURS = 168;

function getWinBackStaleHours() {
  const raw = process.env.WIN_BACK_STALE_HOURS;
  if (raw == null || String(raw).trim() === '') return DEFAULT_STALE_HOURS;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_STALE_HOURS;
  return Math.min(n, 24 * 90); // cap at 90 days
}

module.exports = {
  DEFAULT_STALE_HOURS,
  getWinBackStaleHours,
};
