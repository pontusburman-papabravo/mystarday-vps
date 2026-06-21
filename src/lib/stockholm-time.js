/**
 * Timezone-safe helpers for Europe/Stockholm wall-clock times.
 *
 * Avoids parsing "YYYY-MM-DDTHH:mm:ss" with `new Date(...)`, which uses the
 * process timezone and breaks when the server runs in Europe/Stockholm.
 */

const STOCKHOLM_TZ = 'Europe/Stockholm';

function getStockholmDateParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
    localDow: new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`).getUTCDay(),
  };
}

/**
 * Convert a Stockholm wall-clock timestamp to UTC epoch milliseconds.
 * @param {string|number} year
 * @param {string|number} month - 1-12
 * @param {string|number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} [second=0]
 */
function stockholmWallClockToUtcMs(year, month, day, hour, minute, second = 0) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  // Start with CET (UTC+1) as a safe initial guess; iterate until wall clock matches.
  let utcMs = Date.UTC(y, m - 1, d, hour - 1, minute, second);

  for (let i = 0; i < 5; i++) {
    const got = getStockholmDateParts(new Date(utcMs));
    const deltaMinutes =
      (y - parseInt(got.year, 10)) * 525600 +
      (m - parseInt(got.month, 10)) * 43200 +
      (d - parseInt(got.day, 10)) * 1440 +
      (hour - got.hour) * 60 +
      (minute - got.minute) +
      Math.floor((second - got.second) / 60);

    if (deltaMinutes === 0) break;
    utcMs += deltaMinutes * 60 * 1000;
  }

  return utcMs;
}

function addDaysToStockholmDate(year, month, day, days) {
  const utcMs = stockholmWallClockToUtcMs(year, month, day, 12, 0);
  const shifted = getStockholmDateParts(new Date(utcMs + days * 86400000));
  return { year: shifted.year, month: shifted.month, day: shifted.day };
}

module.exports = {
  STOCKHOLM_TZ,
  getStockholmDateParts,
  stockholmWallClockToUtcMs,
  addDaysToStockholmDate,
};
