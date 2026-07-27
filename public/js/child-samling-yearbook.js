/**
 * child-samling-yearbook.js — Min samling årsbok (Fas E, gate: barnets_samling).
 * Pure helpers from universe.year_story — no API calls.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  function childDateLocale() {
    if (typeof window.getChildDateLocale === 'function') return window.getChildDateLocale();
    return (typeof window.getChildUiLocale === 'function' && window.getChildUiLocale() === 'en-GB')
      ? 'en-GB' : 'sv-SE';
  }

  function capitalizeMonth(label) {
    if (!label) return '';
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function monthSpreads(yearStory) {
    const story = yearStory || {};
    const year = story.year || new Date().getFullYear();
    const raw = story.months || [];
    if (!raw.length) {
      const m = new Date().getMonth() + 1;
      return [{ month: m, stars: 0, active_days: 0, year: year }];
    }
    return raw.map(function (entry) {
      return {
        month: entry.month,
        stars: Number(entry.stars) || 0,
        active_days: Number(entry.active_days) || 0,
        year: year,
      };
    });
  }

  function starLine(stars) {
    const n = Math.max(0, Math.floor(Number(stars) || 0));
    if (n === 0) return '';
    const visible = Math.min(5, n);
    let line = '';
    for (let i = 0; i < visible; i++) line += '★';
    if (n > 5) line += ' +' + (n - 5);
    return line;
  }

  function spreadPhrase(activeDays, stars) {
    if (activeDays <= 0 && stars <= 0) {
      return t('samling.yearbookSpreadGrowing');
    }
    if (activeDays >= 4) {
      return t('samling.yearbookSpreadActive');
    }
    return t('samling.yearbookSpreadSelfCare');
  }

  function daysLabel(activeDays) {
    const d = Math.max(0, Math.floor(Number(activeDays) || 0));
    if (d === 0) return '';
    if (typeof window.childPlural === 'function') {
      return window.childPlural('samling.yearbookDays', d, { count: d });
    }
    const suffix = d === 1 ? 'one' : 'other';
    return t('samling.yearbookDays_' + suffix, { count: d });
  }

  function monthTitle(month) {
    const m = Number(month);
    if (!m || m < 1 || m > 12) return '';
    const d = new Date(2000, m - 1, 1);
    return capitalizeMonth(d.toLocaleDateString(childDateLocale(), { month: 'long' }));
  }

  window.ChildSamlingYearbook = {
    monthSpreads: monthSpreads,
    starLine: starLine,
    spreadPhrase: spreadPhrase,
    daysLabel: daysLabel,
    monthTitle: monthTitle,
  };
})();
