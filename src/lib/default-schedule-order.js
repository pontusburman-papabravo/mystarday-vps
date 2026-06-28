'use strict';

/**
 * Chronological ordering for default_schedule_item rows.
 * sort_order is per-section in the library; consumers must sort by section first.
 */

const SECTION_RANK = { morgon: 0, dag: 1, kvall: 2, natt: 3 };

function sectionOrderClause(alias) {
  const p = alias ? `${alias}.` : '';
  return `CASE ${p}section
  WHEN 'morgon' THEN 0
  WHEN 'dag' THEN 1
  WHEN 'kvall' THEN 2
  WHEN 'natt' THEN 3
  ELSE 4
END, ${p}sort_order ASC, ${p}name ASC`;
}

const SECTION_ORDER_SQL = sectionOrderClause();

/**
 * @param {Array<{ section?: string, sort_order?: number, name?: string }>} items
 */
function sortDefaultScheduleItems(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const secA = SECTION_RANK[a.section] ?? 99;
    const secB = SECTION_RANK[b.section] ?? 99;
    if (secA !== secB) return secA - secB;
    const ordA = a.sort_order ?? 0;
    const ordB = b.sort_order ?? 0;
    if (ordA !== ordB) return ordA - ordB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'sv');
  });
}

module.exports = {
  SECTION_ORDER_SQL,
  sectionOrderClause,
  SECTION_RANK,
  sortDefaultScheduleItems,
};
