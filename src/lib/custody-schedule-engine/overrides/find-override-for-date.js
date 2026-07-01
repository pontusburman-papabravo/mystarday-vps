'use strict';

/**
 * Generic override lookup — no reason-specific logic (jul, sportlov, etc.).
 * @param {Array<{ start_date: string, end_date: string, home_id: string, priority?: number }>|null|undefined} overrides
 * @param {string} dateStr YYYY-MM-DD
 * @returns {object|null}
 */
function findOverrideForDate(overrides, dateStr) {
  if (!overrides?.length) return null;

  const matching = overrides.filter(
    (o) => dateStr >= o.start_date && dateStr <= o.end_date
  );
  if (!matching.length) return null;

  matching.sort((a, b) => {
    const prio = (b.priority ?? 0) - (a.priority ?? 0);
    if (prio !== 0) return prio;
    return a.start_date.localeCompare(b.start_date);
  });

  return matching[0];
}

module.exports = {
  findOverrideForDate,
};
