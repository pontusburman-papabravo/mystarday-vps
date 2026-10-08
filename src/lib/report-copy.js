'use strict';

/**
 * Family-visible report strings. Locale files own the copy.
 * A future catalog locale with no report fragment uses en-GB via t().
 */

const { t, plural, loadLocales } = require('./i18n');
const { DEFAULT_LOCALE, validateLocale } = require('./locale');

const SECTION_ORDER = Object.freeze(['morning', 'day', 'evening', 'night']);

const SECTION_KEY = Object.freeze({
  morgon: 'morning',
  fm: 'morning',
  dag: 'day',
  em: 'day',
  kvall: 'evening',
  evening: 'evening',
  natt: 'night',
});

const SECTION_LABEL_KEY = Object.freeze({
  morning: 'sectionMorning',
  day: 'sectionDay',
  evening: 'sectionEvening',
  night: 'sectionNight',
});

const MEAL_STATUS_KEY = Object.freeze({
  good: 'mealGood',
  little: 'mealLittle',
  none: 'mealNone',
  not_served: 'mealNotServed',
});

const MEAL_NAME_KEY = Object.freeze({
  frukost: 'breakfast',
  lunch: 'lunch',
  mellanmal: 'snack',
});

function ensureReportLocales() {
  if (t('en-GB', 'reports.professional.reportFallback') === 'reports.professional.reportFallback') {
    loadLocales();
  }
}

function reportLocale(locale) {
  ensureReportLocales();
  return validateLocale(locale || DEFAULT_LOCALE);
}

function tr(locale, key, params) {
  return t(reportLocale(locale), `reports.professional.${key}`, params);
}

function sectionMeta(sec, locale) {
  const id = SECTION_KEY[String(sec || '').toLowerCase()] || 'other';
  const label = id === 'other'
    ? t(reportLocale(locale), 'reports.otherSection')
    : tr(locale, SECTION_LABEL_KEY[id]);
  return { id, label };
}

function statusLabel(status, locale) {
  if (status === 'approved') return tr(locale, 'approved');
  if (status === 'pending') return tr(locale, 'pending');
  if (status === 'denied') return tr(locale, 'denied');
  return status || '';
}

function timesLabel(count, locale) {
  return plural(reportLocale(locale), 'reports.professional.times', count);
}

function sleepHoursLabel(hours, locale) {
  const hrs = parseFloat(hours);
  if (hrs === 0) return tr(locale, 'sleepNone');
  if (hrs === 0.5) return tr(locale, 'sleepHalfHour');
  if (hrs < 2) return tr(locale, 'sleepHoursShort', { hours: hrs });
  return tr(locale, 'sleepTwoPlus');
}

function sleepQualityLabel(quality, locale) {
  if (quality === 'easy') return tr(locale, 'sleepEasy');
  if (quality === 'slow') return tr(locale, 'sleepSlow');
  if (quality === 'difficult') return tr(locale, 'sleepDifficult');
  return '';
}

function mealStatusLabel(value, locale) {
  const key = MEAL_STATUS_KEY[value];
  return key ? tr(locale, key) : '';
}

function mealNameLabel(key, locale) {
  const messageKey = MEAL_NAME_KEY[key];
  return messageKey ? tr(locale, messageKey) : key;
}

module.exports = {
  SECTION_ORDER,
  ensureReportLocales,
  reportLocale,
  tr,
  sectionMeta,
  statusLabel,
  timesLabel,
  sleepHoursLabel,
  sleepQualityLabel,
  mealStatusLabel,
  mealNameLabel,
};
