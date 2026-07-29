'use strict';

const maps = require('../../config/family-content-locale/sv-to-en.json');
const { isEnglishFamilyLocale } = require('./family-locale');
const { buildContentTranslator, staticLookup, translateContentText } = require('./content-translator');

const CONTENT_SCOPE = {
  FAMILY: 'family',
  STANDARD_LIBRARY: 'standard_library',
};

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

function lookupActivityName(svName, row) {
  if (!svName) return undefined;
  if (maps.activities[svName]) return maps.activities[svName];
  const byKey = activityCompositeKey(row);
  if (byKey && maps.activityByKey && maps.activityByKey[byKey]) {
    return maps.activityByKey[byKey];
  }
  return staticLookup(svName, 'en-GB') || undefined;
}

function lookupRewardName(svName, row) {
  if (!svName) return undefined;
  if (maps.rewards[svName]) return maps.rewards[svName];
  const byKey = `${row?.icon || row?.reward_icon || ''}|${row?.star_cost ?? ''}`;
  if (byKey && maps.rewardByKey && maps.rewardByKey[byKey]) {
    return maps.rewardByKey[byKey];
  }
  return staticLookup(svName, 'en-GB') || undefined;
}

/**
 * System-seeded activity (standard library copy or registration seed).
 * User-created rows must have source='user' and are never auto-translated.
 * @param {object} row
 * @returns {boolean}
 */
function isSystemSeededActivity(row) {
  if (!row) return false;
  if (row.source === 'user') return false;
  if (row.source === 'admin') return true;
  // Legacy registration seeds (source unset) — not user-created after source='user' on create.
  return row.source == null || row.source === '';
}

/**
 * System-seeded reward (admin library copy). User-created rewards lack source_default_id.
 * @param {object} row
 * @returns {boolean}
 */
function isSystemSeededReward(row) {
  if (!row) return false;
  if (row.modified_by_family) return false;
  return row.source_default_id != null;
}

function shouldLocalizeActivity(row, options = {}) {
  if (options.contentScope === CONTENT_SCOPE.STANDARD_LIBRARY) return true;
  return isSystemSeededActivity(row);
}

function shouldLocalizeReward(row, options = {}) {
  if (options.contentScope === CONTENT_SCOPE.STANDARD_LIBRARY) return true;
  return isSystemSeededReward(row);
}

function resolveSchoolVariantDisplayName(svVariant, locale) {
  if (!isEnglishFamilyLocale(locale)) return svVariant;
  if (svVariant === 'Skola/Förskola' || svVariant === 'Förskola/Skola') return 'Preschool/School';
  if (svVariant === 'Skola') return 'School';
  return svVariant;
}

/**
 * @param {string|null|undefined} locale
 * @param {string} storedName
 * @param {object} [row]
 * @returns {Promise<string>}
 */
async function resolveActivityDisplayName(locale, storedName, row) {
  if (!storedName || !isEnglishFamilyLocale(locale)) return storedName;
  if (row && !isSystemSeededActivity(row)) return storedName;
  const schoolEn = resolveSchoolVariantDisplayName(storedName, locale);
  if (schoolEn !== storedName) return schoolEn;
  const mapped = lookupActivityName(storedName, row);
  if (mapped) return mapped;
  return translateContentText(storedName, locale);
}

/**
 * @param {string|null|undefined} locale
 * @param {string} storedName
 * @param {object} [row]
 * @returns {Promise<string>}
 */
async function resolveRewardDisplayName(locale, storedName, row) {
  if (!storedName || !isEnglishFamilyLocale(locale)) return storedName;
  if (row && !isSystemSeededReward(row)) return storedName;
  const mapped = lookupRewardName(storedName, row);
  if (mapped) return mapped;
  return translateContentText(storedName, locale);
}

function collectActivityTexts(items, options = {}) {
  const texts = [];
  for (const item of items || []) {
    if (!item || !shouldLocalizeActivity(item, options)) continue;
    const label = item.activity_name_display || item.activity_name || item.name;
    if (label) texts.push(label);
    if (Array.isArray(item.sub_steps)) {
      for (const step of item.sub_steps) {
        if (step?.name) texts.push(step.name);
      }
    }
  }
  return texts;
}

function collectRewardTexts(items, options = {}) {
  const texts = [];
  for (const item of items || []) {
    if (!item || !shouldLocalizeReward(item, options)) continue;
    if (item.name) texts.push(item.name);
    if (item.reward_name) texts.push(item.reward_name);
    if (item.to_reward_name) texts.push(item.to_reward_name);
  }
  return texts;
}

function collectScheduleTexts(schedules) {
  const texts = [];
  for (const schedule of schedules || []) {
    if (!schedule) continue;
    if (schedule.name) texts.push(schedule.name);
    if (schedule.description) texts.push(schedule.description);
    for (const item of schedule.items || []) {
      if (item?.name) texts.push(item.name);
      if (Array.isArray(item.sub_steps)) {
        for (const step of item.sub_steps) {
          if (step?.name) texts.push(step.name);
        }
      }
    }
  }
  return texts;
}

function applyActivityTranslation(item, translate, locale, options = {}) {
  if (!item || !isEnglishFamilyLocale(locale)) return item;
  if (!shouldLocalizeActivity(item, options)) return item;
  const storedName = item.activity_name || item.name;
  if (!storedName) return item;

  const sourceLabel = item.activity_name_display || storedName;
  let displayName = sourceLabel;
  if (sourceLabel === 'Skola/Förskola' || sourceLabel === 'Skola' || sourceLabel === 'Förskola/Skola') {
    displayName = resolveSchoolVariantDisplayName(sourceLabel, locale);
  } else {
    displayName = translate(sourceLabel);
  }

  if (displayName === storedName && displayName === sourceLabel && !item.display_name) return item;

  const out = { ...item, display_name: displayName, activity_name_display: displayName };

  if (Array.isArray(item.sub_steps) && item.sub_steps.length > 0) {
    out.sub_steps = item.sub_steps.map((step) => {
      if (!step?.name) return step;
      const stepDisplay = translate(step.name);
      return stepDisplay === step.name ? step : { ...step, display_name: stepDisplay };
    });
  }

  return out;
}

function applyRewardTranslation(item, translate, locale, options = {}) {
  if (!item || !isEnglishFamilyLocale(locale)) return item;
  if (!shouldLocalizeReward(item, options)) return item;
  const storedName = item.name || item.reward_name;
  const out = { ...item };
  let changed = false;

  if (storedName) {
    const displayName = translate(storedName);
    if (displayName !== storedName) {
      out.display_name = displayName;
      if (item.reward_name) out.reward_name_display = displayName;
      changed = true;
    }
  }

  if (item.to_reward_name) {
    const toDisplay = translate(item.to_reward_name);
    if (toDisplay !== item.to_reward_name) {
      out.to_reward_name_display = toDisplay;
      changed = true;
    }
  }

  return changed ? out : item;
}

/**
 * @param {object} item
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function localizeActivityRow(item, locale, sourceLocale = 'sv-SE', options = {}) {
  const [out] = await localizeActivityItems([item], locale, sourceLocale, options);
  return out;
}

/**
 * @param {object} item
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function localizeRewardRow(item, locale, sourceLocale = 'sv-SE', options = {}) {
  const [out] = await localizeRewardItems([item], locale, sourceLocale, options);
  return out;
}

/**
 * @param {Array<object>} items
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @param {object} [options] contentScope: 'standard_library' | 'family' (default)
 * @returns {Promise<Array<object>>}
 */
async function localizeActivityItems(items, locale, sourceLocale = 'sv-SE', options = {}) {
  if (!Array.isArray(items) || !isEnglishFamilyLocale(locale)) return items;
  const translate = await buildContentTranslator(
    collectActivityTexts(items, options),
    locale,
    sourceLocale
  );
  return items.map((item) => applyActivityTranslation(item, translate, locale, options));
}

/**
 * @param {Array<object>} items
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @param {object} [options] contentScope: 'standard_library' | 'family' (default)
 * @returns {Promise<Array<object>>}
 */
async function localizeRewardItems(items, locale, sourceLocale = 'sv-SE', options = {}) {
  if (!Array.isArray(items) || !isEnglishFamilyLocale(locale)) return items;
  const translate = await buildContentTranslator(
    collectRewardTexts(items, options),
    locale,
    sourceLocale
  );
  return items.map((item) => applyRewardTranslation(item, translate, locale, options));
}

/**
 * Localize admin standard schedules (name, description, items) for en-GB families.
 * @param {Array<object>} schedules
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @returns {Promise<Array<object>>}
 */
async function localizeStandardSchedules(schedules, locale, sourceLocale = 'sv-SE') {
  if (!Array.isArray(schedules) || !isEnglishFamilyLocale(locale)) return schedules;
  const libraryOpts = { contentScope: CONTENT_SCOPE.STANDARD_LIBRARY };
  const translate = await buildContentTranslator(collectScheduleTexts(schedules), locale, sourceLocale);
  return schedules.map((schedule) => {
    const out = { ...schedule };
    if (schedule.name) {
      const displayName = translate(schedule.name);
      if (displayName !== schedule.name) out.display_name = displayName;
    }
    if (schedule.description) {
      const displayDescription = translate(schedule.description);
      if (displayDescription !== schedule.description) out.display_description = displayDescription;
    }
    if (Array.isArray(schedule.items)) {
      out.items = schedule.items.map((item) =>
        applyActivityTranslation({ ...item, activity_name: item.name }, translate, locale, libraryOpts)
      );
    }
    return out;
  });
}

module.exports = {
  CONTENT_SCOPE,
  isSystemSeededActivity,
  isSystemSeededReward,
  resolveActivityDisplayName,
  resolveRewardDisplayName,
  resolveSchoolVariantDisplayName,
  localizeActivityRow,
  localizeRewardRow,
  localizeActivityItems,
  localizeRewardItems,
  localizeStandardSchedules,
};
