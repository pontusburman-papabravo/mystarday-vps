'use strict';

const appConfig = require('../../db/app-config');
const { runDailyAnalysis, CONFIG_KEY } = require('./journey/daily-analysis');
const { JOURNEY_DAILY_ANALYSIS_LOCK_ID } = require('./scheduler-constants');
const db = require('./db');

const ANALYSIS_HOUR_STOCKHOLM = 6;
const ANALYSIS_MINUTE = 0;

let _timer = null;

function isEnabled() {
  const v = process.env.JOURNEY_DAILY_ANALYSIS_ENABLED;
  if (v === 'false' || v === '0') return false;
  return true;
}

function msUntilNextRun() {
  const { DateTime } = require('luxon');
  const tz = 'Europe/Stockholm';
  const now = DateTime.now().setZone(tz);
  let target = now.set({
    hour: ANALYSIS_HOUR_STOCKHOLM,
    minute: ANALYSIS_MINUTE,
    second: 0,
    millisecond: 0,
  });
  if (now >= target) target = target.plus({ days: 1 });
  return Math.max(target.diff(now).as('milliseconds'), 60_000);
}

async function persistReport(report) {
  await appConfig.set(CONFIG_KEY, JSON.stringify(report), {
    description: 'Senaste Family Journey dagliga analys (metrics + browser QA)',
  });
  return report;
}

async function loadLatestReport() {
  const raw = await appConfig.get(CONFIG_KEY);
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function runJourneyDailyAnalysisJob() {
  const client = await db.getClient();
  try {
    const { rows } = await client.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [JOURNEY_DAILY_ANALYSIS_LOCK_ID]
    );
    if (!rows[0]?.acquired) {
      console.log('[journey-daily-analysis] Skipped — lock held');
      return null;
    }
    try {
      console.log('[journey-daily-analysis] Starting daily run…');
      const report = await runDailyAnalysis();
      await persistReport(report);
      console.log(
        '[journey-daily-analysis] Done —',
        report.summary?.measurementPoints,
        'mätpunkter,',
        report.summary?.failuresFound,
        'fel,',
        report.actions?.length || 0,
        'åtgärder'
      );
      return report;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [JOURNEY_DAILY_ANALYSIS_LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

function scheduleNext() {
  const delay = msUntilNextRun();
  _timer = setTimeout(() => {
    runJourneyDailyAnalysisJob()
      .catch((err) => console.error('[journey-daily-analysis] Job error:', err.message))
      .finally(() => scheduleNext());
  }, delay);
  if (_timer.unref) _timer.unref();
}

function startJourneyDailyAnalysisScheduler() {
  if (!isEnabled()) {
    console.log('[journey-daily-analysis] Disabled (JOURNEY_DAILY_ANALYSIS_ENABLED=false)');
    return;
  }
  if (_timer) return;
  scheduleNext();
  console.log('[journey-daily-analysis] Scheduler started (daily 06:00 Europe/Stockholm)');
}

function stopJourneyDailyAnalysisScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

module.exports = {
  startJourneyDailyAnalysisScheduler,
  stopJourneyDailyAnalysisScheduler,
  runJourneyDailyAnalysisJob,
  loadLatestReport,
  persistReport,
  msUntilNextRun,
  ANALYSIS_HOUR_STOCKHOLM,
};
