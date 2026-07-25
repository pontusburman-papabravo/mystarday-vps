'use strict';

const maps = require('../../config/family-content-locale/sv-to-en.json');
const { isEnglishFamilyLocale } = require('./family-locale');

function activityCompositeKey(row) {
  if (!row) return '';
  return [
    row.icon || row.activity_icon || '',
    row.schema_type || '',
    row.category || row.category_name || '',
    row.sort_order ?? '',
    row.star_value ?? '',
  ].join('|');
}

function rewardCompositeKey(row) {
  if (!row) return '';
  return `${row.icon || ''}|${row.star_cost ?? ''}`;
}

/**
 * @param {string} svName
 * @param {object} [row]
 * @returns {string|undefined}
 */
function lookupActivityName(svName, row) {
  if (!svName) return undefined;
  if (maps.activities[svName]) return maps.activities[svName];
  const byKey = activityCompositeKey(row);
  if (byKey && maps.activityByKey && maps.activityByKey[byKey]) {
    return maps.activityByKey[byKey];
  }
  return undefined;
}

/**
 * @param {string} svName
 * @param {object} [row]
 * @returns {string|undefined}
 */
function lookupRewardName(svName, row) {
  if (!svName) return undefined;
  if (row && row.modified_by_family === true) return undefined;
  if (maps.rewards[svName]) return maps.rewards[svName];
  const byKey = rewardCompositeKey(row);
  if (byKey && maps.rewardByKey && maps.rewardByKey[byKey]) {
    return maps.rewardByKey[byKey];
  }
  return undefined;
}

/**
 * @param {string|null|undefined} locale
 * @param {string} storedName
 * @param {object} [row]
 * @returns {string}
 */
function resolveActivityDisplayName(locale, storedName, row) {
  if (!storedName || !isEnglishFamilyLocale(locale)) return storedName;
  const schoolEn = resolveSchoolVariantDisplayName(storedName, locale);
  if (schoolEn !== storedName) return schoolEn;
  return lookupActivityName(storedName, row) || storedName;
}

/**
 * @param {string|null|undefined} locale
 * @param {string} storedName
 * @param {object} [row]
 * @returns {string}
 */
function resolveRewardDisplayName(locale, storedName, row) {
  if (!storedName || !isEnglishFamilyLocale(locale)) return storedName;
  return lookupRewardName(storedName, row) || storedName;
}

/**
 * Age-based school label in English when locale is en-GB.
 * @param {string} svVariant
 * @param {string|null|undefined} locale
 * @returns {string}
 */
function resolveSchoolVariantDisplayName(svVariant, locale) {
  if (!isEnglishFamilyLocale(locale)) return svVariant;
  if (svVariant === 'Skola/Förskola' || svVariant === 'Förskola/Skola') return 'Preschool/School';
  if (svVariant === 'Skola') return 'School';
  return svVariant;
}

/**
 * @param {object} item
 * @param {string|null|undefined} locale
 * @returns {object}
 */
function localizeActivityRow(item, locale) {
  if (!item || !isEnglishFamilyLocale(locale)) return item;
  const storedName = item.activity_name || item.name;
  if (!storedName) return item;

  const sourceLabel = item.activity_name_display || storedName;
  const displayName = resolveActivityDisplayName(locale, sourceLabel, item);
  if (displayName === storedName && displayName === sourceLabel && !item.display_name) return item;

  const out = { ...item, display_name: displayName, activity_name_display: displayName };
  if (item.name) out.name = item.name;

  if (Array.isArray(item.sub_steps) && item.sub_steps.length > 0) {
    out.sub_steps = item.sub_steps.map((step) => {
      if (!step || !step.name) return step;
      const stepDisplay = resolveActivityDisplayName(locale, step.name, step);
      return stepDisplay === step.name ? step : { ...step, display_name: stepDisplay };
    });
  }

  return out;
}

/**
 * @param {object} item
 * @param {string|null|undefined} locale
 * @returns {object}
 */
function localizeRewardRow(item, locale) {
  if (!item || !isEnglishFamilyLocale(locale)) return item;
  const storedName = item.name || item.reward_name;
  if (!storedName) return item;
  const displayName = resolveRewardDisplayName(locale, storedName, item);
  if (displayName === storedName) return item;
  const out = { ...item, display_name: displayName };
  if (item.reward_name) out.reward_name_display = displayName;
  return out;
}

/**
 * @param {Array<object>} items
 * @param {string|null|undefined} locale
 * @returns {Array<object>}
 */
function localizeActivityItems(items, locale) {
  if (!Array.isArray(items) || !isEnglishFamilyLocale(locale)) return items;
  return items.map((item) => localizeActivityRow(item, locale));
}

/**
 * @param {Array<object>} items
 * @param {string|null|undefined} locale
 * @returns {Array<object>}
 */
function localizeRewardItems(items, locale) {
  if (!Array.isArray(items) || !isEnglishFamilyLocale(locale)) return items;
  return items.map((item) => localizeRewardRow(item, locale));
}

module.exports = {
  resolveActivityDisplayName,
  resolveRewardDisplayName,
  resolveSchoolVariantDisplayName,
  localizeActivityRow,
  localizeRewardRow,
  localizeActivityItems,
  localizeRewardItems,
};
