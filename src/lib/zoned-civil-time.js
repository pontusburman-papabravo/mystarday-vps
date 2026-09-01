'use strict';

/**
 * Server-side civil-clock helpers. No client clock.
 * ISO instants with an offset/Z stay absolute. Bare YYYY-MM-DD is civil midnight
 * in the named IANA timezone (DST-safe).
 */

function getZonedDateParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
  };
}

function zonedWallClockToUtcMs(timeZone, year, month, day, hour, minute, second = 0) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  let utcMs = Date.UTC(y, m - 1, d, hour, minute, second);

  for (let i = 0; i < 8; i += 1) {
    const got = getZonedDateParts(new Date(utcMs), timeZone);
    const deltaMinutes =
      (y - got.year) * 525600
      + (m - got.month) * 43200
      + (d - got.day) * 1440
      + (hour - got.hour) * 60
      + (minute - got.minute)
      + Math.floor((second - got.second) / 60);
    if (deltaMinutes === 0) break;
    utcMs += deltaMinutes * 60 * 1000;
  }

  return utcMs;
}

function civilDateMidnightInZone(civilDate, timeZone) {
  const match = String(civilDate || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !timeZone) return null;
  const utcMs = zonedWallClockToUtcMs(
    timeZone,
    match[1],
    match[2],
    match[3],
    0,
    0,
    0
  );
  return new Date(utcMs);
}

/**
 * @param {string|Date|null|undefined} raw
 * @param {string} timeZone
 * @returns {{ instant: Date|null, configured: boolean, invalid: boolean, timeZone: string, representation: 'absolute'|'civil_date'|null }}
 */
function parseMarketPaymentStartInstant(raw, timeZone) {
  if (raw == null || raw === '') {
    return {
      instant: null,
      configured: false,
      invalid: false,
      timeZone,
      representation: null,
    };
  }
  const text = typeof raw === 'string' ? raw.replace(/^"|"$/g, '').trim() : String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const instant = civilDateMidnightInZone(text, timeZone);
    return {
      instant,
      configured: instant != null,
      invalid: instant == null,
      timeZone,
      representation: 'civil_date',
    };
  }
  const instant = raw instanceof Date ? raw : new Date(text);
  if (Number.isNaN(instant.getTime())) {
    return {
      instant: null,
      configured: false,
      invalid: true,
      timeZone,
      representation: null,
    };
  }
  return {
    instant,
    configured: true,
    invalid: false,
    timeZone,
    representation: 'absolute',
  };
}

module.exports = {
  getZonedDateParts,
  zonedWallClockToUtcMs,
  civilDateMidnightInZone,
  parseMarketPaymentStartInstant,
};
