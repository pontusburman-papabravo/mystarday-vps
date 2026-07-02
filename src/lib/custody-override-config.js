'use strict';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REASON_LEN = 200;

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
function validateOverridePayload(body, validHomeIds) {
  const startDate = body?.start_date;
  const endDate = body?.end_date;
  const homeId = body?.home_id;

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return { ok: false, error: 'start_date och end_date krävs (YYYY-MM-DD)' };
  }
  if (startDate > endDate) {
    return { ok: false, error: 'start_date får inte vara efter end_date' };
  }
  if (!homeId || typeof homeId !== 'string' || !validHomeIds.has(homeId)) {
    return { ok: false, error: 'Ogiltigt hem' };
  }

  let reason = null;
  if (body.reason != null && body.reason !== '') {
    reason = String(body.reason).trim().slice(0, MAX_REASON_LEN);
  }

  let priority = 0;
  if (body.priority != null && body.priority !== '') {
    const n = Number(body.priority);
    if (!Number.isInteger(n) || n < -32768 || n > 32767) {
      return { ok: false, error: 'priority måste vara ett heltal' };
    }
    priority = n;
  }

  return {
    ok: true,
    row: {
      start_date: startDate,
      end_date: endDate,
      home_id: homeId,
      reason,
      priority,
    },
  };
}

module.exports = {
  ISO_DATE,
  MAX_REASON_LEN,
  isIsoDate,
  validateOverridePayload,
};
