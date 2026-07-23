/**
 * Locale-aware date/time formatting for parent Home and Today.
 * Uses I18n.getCurrentLang() — never hardcode sv-SE in callers.
 */
(function localeDateTimeModule() {
  'use strict';

  function lang() {
    if (window.I18n && typeof window.I18n.getCurrentLang === 'function') {
      return window.I18n.getCurrentLang();
    }
    return 'sv-SE';
  }

  function pt(key, params) {
    if (window.pt) return window.pt(key, params);
    return key;
  }

  function normalizeIsoDate(dateStr) {
    if (!dateStr) return '';
    return String(dateStr).slice(0, 10);
  }

  function parseLocalNoon(dateStr) {
    return new Date(normalizeIsoDate(dateStr) + 'T12:00:00');
  }

  function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatWithIntl(date, options) {
    return new Intl.DateTimeFormat(lang(), options).format(date);
  }

  function weekdayShort(date) {
    return formatWithIntl(date, { weekday: 'short' });
  }

  function weekdayLong(date) {
    return formatWithIntl(date, { weekday: 'long' });
  }

  function monthDay(date) {
    return formatWithIntl(date, { day: 'numeric', month: 'long' });
  }

  function monthDayYear(date) {
    return formatWithIntl(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function monthDayShort(date) {
    return formatWithIntl(date, { day: 'numeric', month: 'short' });
  }

  /**
   * Header label for daily log date navigation.
   * @param {string} dateStr YYYY-MM-DD
   * @param {string} [todayStr]
   */
  function formatDateHeader(dateStr, todayStr) {
    const today = todayStr || getTodayStr();
    const d = parseLocalNoon(dateStr);
    const yesterday = new Date(parseLocalNoon(today));
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(parseLocalNoon(today));
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const tStr = tomorrow.toISOString().slice(0, 10);

    if (dateStr === today) {
      return pt('time.todayPrefix') + ' — ' + monthDay(d);
    }
    if (dateStr === yStr) {
      return pt('time.yesterdayPrefix') + ' — ' + monthDay(d);
    }
    if (dateStr === tStr) {
      return pt('time.tomorrowPrefix') + ' — ' + monthDay(d);
    }
    return monthDayYear(d);
  }

  /** Mon–Sun short labels for week strip (Monday first). */
  function weekDayLabelsMondayFirst() {
    const base = new Date('2024-01-01T12:00:00'); // Monday
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(weekdayShort(d));
    }
    return out;
  }

  /** Sun–Sat short labels (JS getDay order). */
  function weekDayLabelsSundayFirst() {
    const base = new Date('2024-01-07T12:00:00'); // Sunday
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(weekdayShort(d));
    }
    return out;
  }

  function sectionLabel(key) {
    return pt('sections.' + key) || key;
  }

  function sectionLabelWithEmoji(key) {
    const emojis = { morgon: '🌅', dag: '☀️', kvall: '🌆', natt: '🌙' };
    const label = sectionLabel(key);
    const emoji = emojis[key] || '';
    return emoji ? emoji + ' ' + label : label;
  }

  function isoDateInLocale(dateStr) {
    const d = parseLocalNoon(dateStr);
    return formatWithIntl(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  window.LocaleDateTime = {
    lang,
    getTodayStr,
    normalizeIsoDate,
    parseLocalNoon,
    formatDateHeader,
    weekdayShort,
    weekdayLong,
    monthDay,
    monthDayYear,
    monthDayShort,
    weekDayLabelsMondayFirst,
    weekDayLabelsSundayFirst,
    sectionLabel,
    sectionLabelWithEmoji,
    isoDateInLocale,
    formatWithIntl,
  };
})();
