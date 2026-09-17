'use strict';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string} dateStr
 */
function isIsoDate(dateStr) {
  return typeof dateStr === 'string' && ISO_DATE.test(dateStr);
}

/**
 * @param {object} body
 * @param {Set<string>} validHomeIds
 * @returns {{ ok: true, row: object } | { ok: false, error: string }}
 */
function validateOverrideInput(body, validHomeIds) {
  const startDate = body.start_date ?? body.startDate;
  const endDate = body.end_date ?? body.endDate;
  const homeId = body.home_id ?? body.homeId;
  const reason = body.reason != null ? String(body.reason).trim().slice(0, 280) : null;
  const priority = body.priority != null ? Number(body.priority) : 0;

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return { ok: false, error: 'START_END_DATE_REQUIRED' };
  }
  if (startDate > endDate) {
    return { ok: false, error: 'START_AFTER_END' };
  }
  if (!homeId || !validHomeIds.has(homeId)) {
    return { ok: false, error: 'CUSTODY_INVALID_OVERRIDE_HOME' };
  }
  if (!Number.isFinite(priority) || priority < -32768 || priority > 32767) {
    return { ok: false, error: 'CUSTODY_INVALID_PRIORITY' };
  }

  return {
    ok: true,
    row: {
      start_date: startDate,
      end_date: endDate,
      home_id: homeId,
      reason: reason || null,
      priority: Math.trunc(priority),
    },
  };
}

module.exports = {
  isIsoDate,
  validateOverrideInput,
};
