/**
 * Admin relative timestamps in Europe/Stockholm calendar days.
 * UMD: Node tests `require` this file; the browser gets window.formatAdminRelativeTime.
 */
'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.formatAdminRelativeTime = api.formatAdminRelativeTime;
    root.toIsoUtc = api.toIsoUtc;
  }
}(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : null, function () {
  const STOCKHOLM_TZ = 'Europe/Stockholm';
  const CLOCK_SKEW_MS = 60 * 1000;

  function toIsoUtc(value) {
    if (value == null || value === '') return null;
    try {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch {
      return null;
    }
  }

  function parseInstant(value) {
    if (value == null || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function stockholmDayKey(date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: STOCKHOLM_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  function addCalendarDays(dayKey, delta) {
    const parts = String(dayKey).split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const utc = new Date(Date.UTC(year, month - 1, day));
    utc.setUTCDate(utc.getUTCDate() + delta);
    return utc.toISOString().slice(0, 10);
  }

  function stockholmTime(date) {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: STOCKHOLM_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  }

  function stockholmDateTime(date) {
    const day = new Intl.DateTimeFormat('sv-SE', {
      timeZone: STOCKHOLM_TZ,
      day: 'numeric',
      month: 'short',
    }).format(date);
    return day + ' ' + stockholmTime(date);
  }

  function formatAdminRelativeTime(iso, now) {
    const then = parseInstant(iso);
    if (!then) return '';
    const current = parseInstant(now) || new Date();
    const diffMs = current.getTime() - then.getTime();

    if (diffMs < -CLOCK_SKEW_MS) {
      return stockholmDateTime(then);
    }
    if (diffMs < CLOCK_SKEW_MS) {
      return 'just nu';
    }

    const thenDay = stockholmDayKey(then);
    const nowDay = stockholmDayKey(current);
    if (thenDay === nowDay) {
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) return mins + ' min sedan';
      return Math.floor(mins / 60) + ' tim sedan';
    }
    if (thenDay === addCalendarDays(nowDay, -1)) {
      return 'igår ' + stockholmTime(then);
    }
    return stockholmDateTime(then);
  }

  return {
    STOCKHOLM_TZ,
    toIsoUtc,
    formatAdminRelativeTime,
  };
}));
