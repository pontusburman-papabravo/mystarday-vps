/**
 * child-samling-yearbook.js — Min samling årsbok (Fas E, gate: barnets_samling).
 * Pure helpers from universe.year_story — no API calls.
 */
(function () {
  'use strict';

  const MONTH_NAMES = [
    '', 'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
  ];

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
      return 'Här växer ditt uppslag';
    }
    if (activeDays >= 4) {
      return 'Du var aktiv den här månaden';
    }
    return 'Du tog hand om dig';
  }

  function daysLabel(activeDays) {
    const d = Math.max(0, Math.floor(Number(activeDays) || 0));
    if (d === 0) return '';
    if (d === 1) return '1 dag';
    return d + ' dagar';
  }

  function monthTitle(month) {
    return MONTH_NAMES[month] || '';
  }

  window.ChildSamlingYearbook = {
    monthSpreads: monthSpreads,
    starLine: starLine,
    spreadPhrase: spreadPhrase,
    daysLabel: daysLabel,
    monthTitle: monthTitle,
    MONTH_NAMES: MONTH_NAMES,
  };
})();
