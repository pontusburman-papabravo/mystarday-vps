'use strict';

const maps = require('../../config/family-content-locale/sv-to-en.json');
const { isEnglishFamilyLocale } = require('./family-locale');
const { buildContentTranslator, staticLookup, translateContentText } = require('./content-translator');

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
  const byKey = `${row?.icon || ''}|${row?.star_cost ?? ''}`;
  if (byKey && maps.rewardByKey && maps.rewardByKey[byKey]) {
    return maps.rewardByKey[byKey];
  }
  return staticLookup(svName, 'en-GB') || undefined;
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
  const mapped = lookupRewardName(storedName, row);
  if (mapped) return mapped;
  return translateContentText(storedName, locale);
}

function collectActivityTexts(items) {
  const texts = [];
  for (const item of items || []) {
    if (!item) continue;
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

function collectRewardTexts(items) {
  const texts = [];
  for (const item of items || []) {
    if (!item) continue;
    if (item.name) texts.push(item.name);
    if (item.reward_name) texts.push(item.reward_name);
  }
  return texts;
}

function applyActivityTranslation(item, translate, locale) {
  if (!item || !isEnglishFamilyLocale(locale)) return item;
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

function applyRewardTranslation(item, translate, locale) {
  if (!item || !isEnglishFamilyLocale(locale)) return item;
  const storedName = item.name || item.reward_name;
  if (!storedName) return item;
  const displayName = translate(storedName);
  if (displayName === storedName) return item;
  const out = { ...item, display_name: displayName };
  if (item.reward_name) out.reward_name_display = displayName;
  return out;
}

/**
 * @param {object} item
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @returns {Promise<object>}
 */
async function localizeActivityRow(item, locale, sourceLocale = 'sv-SE') {
  const [out] = await localizeActivityItems([item], locale, sourceLocale);
  return out;
}

/**
 * @param {object} item
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @returns {Promise<object>}
 */
async function localizeRewardRow(item, locale, sourceLocale = 'sv-SE') {
  const [out] = await localizeRewardItems([item], locale, sourceLocale);
  return out;
}

/**
 * @param {Array<object>} items
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @returns {Promise<Array<object>>}
 */
async function localizeActivityItems(items, locale, sourceLocale = 'sv-SE') {
  if (!Array.isArray(items) || !isEnglishFamilyLocale(locale)) return items;
  const translate = await buildContentTranslator(collectActivityTexts(items), locale, sourceLocale);
  return items.map((item) => applyActivityTranslation(item, translate, locale));
}

/**
 * @param {Array<object>} items
 * @param {string|null|undefined} locale
 * @param {string} [sourceLocale]
 * @returns {Promise<Array<object>>}
 */
async function localizeRewardItems(items, locale, sourceLocale = 'sv-SE') {
  if (!Array.isArray(items) || !isEnglishFamilyLocale(locale)) return items;
  const translate = await buildContentTranslator(collectRewardTexts(items), locale, sourceLocale);
  return items.map((item) => applyRewardTranslation(item, translate, locale));
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
