'use strict';

/**
 * Canonical schedule section identity — single source of truth for NEW schedule-domain
 * code (canonical apply/resolve services). Existing scattered SQL CASE expressions and
 * frontend mappings are NOT touched by this Phase 1A refactor (see docs/schedule-canonical-architecture.md).
 *
 * Stable order: morgon -> dag -> kvall -> natt.
 * "eftermiddag" is intentionally NOT a schedule section (see activity_template.time_group,
 * which is a separate, unrelated concept from the canonical schedule section).
 */
const CANONICAL_SECTIONS = Object.freeze(['morgon', 'dag', 'kvall', 'natt']);

const SECTION_INDEX = new Map(CANONICAL_SECTIONS.map((s, i) => [s, i]));

/** @param {string|null|undefined} section */
function normalizeSection(section) {
  if (!section || !SECTION_INDEX.has(section)) return 'dag';
  return section;
}

/** @param {string|null|undefined} section */
function sectionSortIndex(section) {
  return SECTION_INDEX.get(normalizeSection(section));
}

/**
 * Sort a list of items in-place-safe (returns a new array) by canonical section order,
 * then by the caller-supplied secondary key (defaults to sort_order).
 * @param {Array<object>} items
 * @param {(item: object) => number} [secondaryKey]
 */
function sortByCanonicalSection(items, secondaryKey = (item) => item.sort_order || 0) {
  return [...items].sort((a, b) => {
    const diff = sectionSortIndex(a.section) - sectionSortIndex(b.section);
    if (diff !== 0) return diff;
    return secondaryKey(a) - secondaryKey(b);
  });
}

module.exports = {
  CANONICAL_SECTIONS,
  normalizeSection,
  sectionSortIndex,
  sortByCanonicalSection,
};
