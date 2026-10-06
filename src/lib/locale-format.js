'use strict';

/**
 * Locale-aware date labels. Month and weekday names come from Intl,
 * so a future fr-FR or de-DE bundle does not need its own name list.
 */

const { intlLocaleTag, validateLocale, DEFAULT_LOCALE } = require('./locale');

function formatLocaleDate(value, locale, options) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tag = intlLocaleTag(locale);
  try {
    return new Intl.DateTimeFormat(tag, options).format(date);
  } catch (_) {
    return new Intl.DateTimeFormat(validateLocale(DEFAULT_LOCALE), options).format(date);
  }
}

function formatDayMonth(value, locale) {
  return formatLocaleDate(value, locale, { day: 'numeric', month: 'short' });
}

function formatDayMonthLong(value, locale) {
  return formatLocaleDate(value, locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDayMonthRange(start, end, locale) {
  const left = formatDayMonth(start, locale);
  const right = formatDayMonth(end, locale);
  if (!left || !right) return left || right || '';
  return `${left}–${right}`;
}

module.exports = {
  formatLocaleDate,
  formatDayMonth,
  formatDayMonthLong,
  formatDayMonthRange,
};
