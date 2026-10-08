'use strict';

/**
 * Locale-aware default content for registration seeding.
 * Data lives in config/default-content/<locale>/.
 */

const fs = require('fs');
const path = require('path');
const { validateLocale, DEFAULT_LOCALE, CANONICAL_FALLBACK_LOCALE } = require('../locale');

const CONTENT_ROOT = path.join(__dirname, '../../../config/default-content');

/** Maps activity time-of-day category keys to DB time_group values. */
const CATEGORY_TO_TIME_GROUP = Object.freeze({
  Morning: 'morgon',
  'Late Morning': 'formiddag',
  Afternoon: 'eftermiddag',
  Evening: 'kvall',
});

/** Sort multipliers to preserve ordering within each time-of-day category. */
const TIME_CATEGORY_OFFSET = Object.freeze({
  Morning: 0,
  'Late Morning': 100,
  Afternoon: 200,
  Evening: 300,
});

/** Swedish time-slot names from default_activity_template (admin DB). */
const svDbMap = require('../../../config/default-content/sv-category-db-map.json');
const SV_CATEGORY_TO_TIME_GROUP = Object.freeze(svDbMap.categoryToTimeGroup);
const SV_TIME_CATEGORY_OFFSET = Object.freeze(svDbMap.timeCategoryOffset);

/**
 * Resolve time_group for an activity category label (English or Swedish).
 * @param {string} categoryName
 * @returns {string}
 */
function resolveTimeGroup(categoryName) {
  return CATEGORY_TO_TIME_GROUP[categoryName]
    || SV_CATEGORY_TO_TIME_GROUP[categoryName]
    || 'morgon';
}

/**
 * @param {string} categoryName
 * @returns {number}
 */
function resolveTimeOffset(categoryName) {
  if (TIME_CATEGORY_OFFSET[categoryName] != null) return TIME_CATEGORY_OFFSET[categoryName];
  if (SV_TIME_CATEGORY_OFFSET[categoryName] != null) return SV_TIME_CATEGORY_OFFSET[categoryName];
  return 400;
}

const localeCache = new Map();

function directoryHasActivities(dir) {
  return fs.existsSync(path.join(dir, 'activities.json'));
}

/**
 * Requested locale files, then English for any non-default locale, then Swedish.
 * A future language without its own seed files must not inherit Swedish copy.
 */
function resolveContentDirectory(canonical) {
  const primary = path.join(CONTENT_ROOT, canonical);
  if (directoryHasActivities(primary)) return { dir: primary, locale: canonical };
  if (canonical !== DEFAULT_LOCALE) {
    const english = path.join(CONTENT_ROOT, CANONICAL_FALLBACK_LOCALE);
    if (directoryHasActivities(english)) return { dir: english, locale: CANONICAL_FALLBACK_LOCALE };
  }
  return { dir: path.join(CONTENT_ROOT, DEFAULT_LOCALE), locale: DEFAULT_LOCALE };
}

function loadLocaleFiles(locale) {
  const canonical = validateLocale(locale);
  if (localeCache.has(canonical)) {
    return localeCache.get(canonical);
  }

  const resolved = resolveContentDirectory(canonical);

  const readJson = (filename) => require(path.join(resolved.dir, filename));

  const activities = readJson('activities.json');
  const categories = readJson('categories.json');
  const rewards = readJson('rewards.json');

  const content = {
    locale: resolved.locale,
    activities,
    categories,
    rewards,
    templateCategories: categories,
    categoryToTimeGroup: CATEGORY_TO_TIME_GROUP,
    timeCategoryOffset: TIME_CATEGORY_OFFSET,
  };

  localeCache.set(canonical, content);
  return content;
}

/**
 * Load default registration content for a locale.
 * @param {string|null|undefined} locale
 * @returns {{
 *   locale: string,
 *   activities: Array<{ name: string, icon: string, category: string, star_value: number, sort_order: number, schema_type: string }>,
 *   categories: Array<{ key: string, name: string, sort_order: number }>,
 *   rewards: Array<{ name: string, icon: string, star_cost: number }>,
 *   templateCategories: Array<{ key: string, name: string, sort_order: number }>,
 *   categoryToTimeGroup: Readonly<Record<string, string>>,
 *   timeCategoryOffset: Readonly<Record<string, number>>,
 * }}
 */
function loadDefaultContent(locale) {
  return loadLocaleFiles(locale);
}

module.exports = {
  loadDefaultContent,
  CATEGORY_TO_TIME_GROUP,
  TIME_CATEGORY_OFFSET,
  SV_CATEGORY_TO_TIME_GROUP,
  SV_TIME_CATEGORY_OFFSET,
  resolveTimeGroup,
  resolveTimeOffset,
};
