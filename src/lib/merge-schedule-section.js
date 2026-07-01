'use strict';

/**
 * Pure helrutin merge — section-scoped schedule merge (v1).
 * No UI, activation, or database awareness. See docs/helrutin-semantik-spec.md §7.
 */

const VALID_SECTIONS = new Set(['morgon', 'dag', 'kvall']);

/**
 * @param {string|null|undefined} section
 * @returns {'morgon'|'dag'|'kvall'}
 */
function normalizeSection(section) {
  if (section == null || section === '') return 'dag';
  const s = String(section).toLowerCase();
  return VALID_SECTIONS.has(s) ? s : 'dag';
}

/**
 * @param {{ section?: string|null }} item
 * @param {string} targetSection
 */
function belongsToSection(item, targetSection) {
  return normalizeSection(item.section) === normalizeSection(targetSection);
}

/**
 * @param {Array<{ section?: string|null }>} existingItems
 * @param {string} targetSection
 * @returns {'append'|'replace'}
 */
function planMergeMode(existingItems, targetSection) {
  const inSection = (existingItems || []).filter((item) => belongsToSection(item, targetSection));
  return inSection.length === 0 ? 'append' : 'replace';
}

/**
 * @typedef {Object} ScheduleItem
 * @property {string} activityTemplateId
 * @property {string} [section]
 * @property {number} [sortOrder]
 * @property {string|null} [startTime]
 * @property {string|null} [endTime]
 */

/**
 * @param {Object} input
 * @param {ScheduleItem[]} input.existingItems — all items for one day
 * @param {string} input.targetSection
 * @param {ScheduleItem[]} input.packageItems — pre-filtered to targetSection
 * @returns {{ items: ScheduleItem[], mode: 'append'|'replace', removedInSection: number, addedInSection: number, emptyPackage: boolean }}
 */
function mergeScheduleSection({ existingItems, targetSection, packageItems }) {
  const target = normalizeSection(targetSection);
  const existing = Array.isArray(existingItems) ? existingItems.map(cloneItem) : [];
  const pkg = Array.isArray(packageItems) ? packageItems.map(cloneItem) : [];

  if (pkg.length === 0) {
    return {
      items: existing,
      mode: 'append',
      removedInSection: 0,
      addedInSection: 0,
      emptyPackage: true,
    };
  }

  const otherSections = existing.filter((item) => !belongsToSection(item, target));
  const inSection = existing.filter((item) => belongsToSection(item, target));
  const mode = inSection.length === 0 ? 'append' : 'replace';

  let mergedSectionItems;

  if (mode === 'replace') {
    mergedSectionItems = pkg.map((item, idx) => ({
      activityTemplateId: item.activityTemplateId,
      section: target,
      sortOrder: item.sortOrder != null ? item.sortOrder : idx,
      startTime: item.startTime ?? null,
      endTime: item.endTime ?? null,
    }));
  } else {
    const existingIds = new Set(inSection.map((item) => item.activityTemplateId));
    const maxSort = inSection.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), -1);
    let nextOrder = maxSort + 1;
    mergedSectionItems = [];
    for (const item of pkg) {
      if (existingIds.has(item.activityTemplateId)) continue;
      mergedSectionItems.push({
        activityTemplateId: item.activityTemplateId,
        section: target,
        sortOrder: item.sortOrder != null ? item.sortOrder : nextOrder++,
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
      });
      existingIds.add(item.activityTemplateId);
    }
  }

  const items = mode === 'replace'
    ? [...otherSections, ...mergedSectionItems]
    : [...otherSections, ...inSection, ...mergedSectionItems];

  return {
    items,
    mode,
    removedInSection: mode === 'replace' ? inSection.length : 0,
    addedInSection: mergedSectionItems.length,
    emptyPackage: false,
  };
}

function cloneItem(item) {
  return {
    activityTemplateId: item.activityTemplateId,
    section: item.section,
    sortOrder: item.sortOrder,
    startTime: item.startTime ?? null,
    endTime: item.endTime ?? null,
  };
}

module.exports = {
  VALID_SECTIONS,
  normalizeSection,
  belongsToSection,
  planMergeMode,
  mergeScheduleSection,
};
