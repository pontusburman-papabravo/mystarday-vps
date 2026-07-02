/**
 * Client mirror of src/lib/transition-support.js — keep logic in sync.
 */
(function (global) {
  'use strict';

  const DEFAULT_LEAD_MINUTES = [5, 1];
  const PHASE_LABELS_SV = { soon: 'Snart', now: 'Nu' };

  function normalizeLeadMinutes(leadMinutes) {
    if (!Array.isArray(leadMinutes) || leadMinutes.length === 0) {
      return DEFAULT_LEAD_MINUTES.slice();
    }
    const unique = [...new Set(
      leadMinutes
        .map((n) => parseInt(n, 10))
        .filter((n) => !Number.isNaN(n) && n > 0 && n <= 60)
    )];
    unique.sort((a, b) => b - a);
    return unique.length > 0 ? unique : DEFAULT_LEAD_MINUTES.slice();
  }

  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  function minutesUntilStart(startTime, now) {
    const startMins = parseTimeToMinutes(startTime);
    if (startMins === null) return null;
    const d = now || new Date();
    const nowMins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    return startMins - nowMins;
  }

  function computeTransitionPhase(minutesUntil, leadMinutes) {
    const leads = normalizeLeadMinutes(leadMinutes);
    if (minutesUntil === null || Number.isNaN(minutesUntil)) {
      return { phase: 'soon', label: PHASE_LABELS_SV.soon, leadMinute: null };
    }
    if (minutesUntil <= 0) {
      return { phase: 'now', label: PHASE_LABELS_SV.now, leadMinute: null };
    }
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      if (minutesUntil <= lead) {
        return {
          phase: 'in_' + lead,
          label: lead === 1 ? 'Om 1 min' : 'Om ' + lead + ' min',
          leadMinute: lead,
        };
      }
    }
    return { phase: 'soon', label: PHASE_LABELS_SV.soon, leadMinute: null };
  }

  function getTransitionFromStartTime(startTime, options) {
    options = options || {};
    const minutesUntil = minutesUntilStart(startTime, options.now);
    return computeTransitionPhase(minutesUntil, options.leadMinutes);
  }

  global.TransitionSupport = {
    normalizeLeadMinutes,
    minutesUntilStart,
    computeTransitionPhase,
    getTransitionFromStartTime,
  };
})(typeof window !== 'undefined' ? window : globalThis);
