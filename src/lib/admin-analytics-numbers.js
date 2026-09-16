'use strict';

/**
 * Pure number-definition helpers for admin Produktanalys.
 * Keep KPI / funnel / heatmap labels honest: never mix event counts with
 * full-database counts in the same ratio or funnel.
 */

const HEATMAP_DOW_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

/**
 * Conversion = first child / signup.
 * Use analytics events only when BOTH steps have counts; otherwise use the
 * same database population for both sides. Never mix.
 *
 * @param {{ eventStarted: number, eventCompleted: number, dbRegistered: number, dbWithChild: number }} input
 */
function conversionFromFunnel(input) {
  const eventStarted = Number(input.eventStarted) || 0;
  const eventCompleted = Number(input.eventCompleted) || 0;
  const dbRegistered = Number(input.dbRegistered) || 0;
  const dbWithChild = Number(input.dbWithChild) || 0;
  const eventsComplete = eventStarted > 0 && eventCompleted > 0;
  const started = eventsComplete ? eventStarted : dbRegistered;
  const completed = eventsComplete ? eventCompleted : dbWithChild;
  const conversion_rate = started > 0 ? Math.round((completed / started) * 10000) / 100 : 0;
  return {
    started,
    completed,
    conversion_rate,
    source: eventsComplete ? 'events' : 'database',
  };
}

/**
 * Funnel steps. Landing is always event-only (no DB equivalent).
 * Signup / email / child share one source so later steps cannot exceed earlier ones
 * just because one event type was never tracked.
 *
 * @param {Record<string, number>} eventMap
 * @param {{ families_registered?: number, families_verified?: number, families_with_child?: number }} dbFallback
 */
function funnelStepsFromSources(eventMap, dbFallback) {
  const map = eventMap || {};
  const fb = dbFallback || {};
  const signupE = Number(map.funnel_signup_started) || 0;
  const emailE = Number(map.funnel_email_verified) || 0;
  const childE = Number(map.funnel_first_child_created) || 0;
  const useEvents = signupE > 0 && emailE > 0 && childE > 0;
  return [
    {
      step: 'Landningssida besökt',
      event: 'funnel_landing_visit',
      count: Number(map.funnel_landing_visit) || 0,
    },
    {
      step: 'Registrering påbörjad',
      event: 'funnel_signup_started',
      count: useEvents ? signupE : Number(fb.families_registered) || 0,
    },
    {
      step: 'E-post verifierad',
      event: 'funnel_email_verified',
      count: useEvents ? emailE : Number(fb.families_verified) || 0,
    },
    {
      step: 'Första barn skapat',
      event: 'funnel_first_child_created',
      count: useEvents ? childE : Number(fb.families_with_child) || 0,
    },
  ];
}

/**
 * Heatmap matrix from ISODOW (1=Mon … 7=Sun) + hour 0–23 rows.
 * Ignores NULL / out-of-range buckets (legacy time_bucket was never written).
 *
 * @param {Array<{ dow: number|string, hour: number|string, event_count: number|string }>} rows
 */
function buildHeatmapFromRows(rows) {
  const matrix = {};
  for (let dow = 1; dow <= 7; dow++) {
    matrix[dow] = {};
    for (let h = 0; h < 24; h++) matrix[dow][h] = 0;
  }

  for (const row of rows || []) {
    const dow = parseInt(row.dow, 10);
    const hour = parseInt(row.hour, 10);
    if (!Number.isInteger(dow) || dow < 1 || dow > 7) continue;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    matrix[dow][hour] += parseInt(row.event_count, 10) || 0;
  }

  const resultRows = [];
  for (let dow = 1; dow <= 7; dow++) {
    resultRows.push({
      day: HEATMAP_DOW_LABELS[dow - 1],
      dayIndex: dow,
      hours: Array.from({ length: 24 }, (_, h) => matrix[dow][h]),
    });
  }

  let maxCount = 0;
  let peakHour = 0;
  for (let h = 0; h < 24; h++) {
    let total = 0;
    for (let dow = 1; dow <= 7; dow++) total += matrix[dow][h];
    if (total > maxCount) {
      maxCount = total;
      peakHour = h;
    }
  }

  return { rows: resultRows, peak_hour: peakHour };
}

module.exports = {
  HEATMAP_DOW_LABELS,
  conversionFromFunnel,
  funnelStepsFromSources,
  buildHeatmapFromRows,
};
