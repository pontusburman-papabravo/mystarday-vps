/**
 * Shared harvest operations: history, streaks, completeness checks.
 */

const fs = require('fs');
const path = require('path');
const { apiRequest, readJson, sleep } = require('./migration-http');
const { collectLogDates, mergeHistoryIntoApi, countHistoryInHarvest } = require('../../src/lib/harvest-history');

async function fetchJsonBearer(baseUrl, apiPath, bearer) {
  const res = await apiRequest(baseUrl, apiPath, { bearer });
  const body = await readJson(res);
  return { ok: res.ok, status: res.status, body, error: body.error || body._raw };
}

async function impersonateFamily(baseUrl, jar, csrf, familyId) {
  const res = await apiRequest(baseUrl, `/api/admin/impersonate/${familyId}`, {
    method: 'POST',
    jar,
    csrf,
    body: {},
  });
  const body = await readJson(res);
  if (!res.ok || !body.token) throw new Error(body.error || 'Impersonate failed');
  return body.token;
}

function resolveFamilyHarvestPath(inDir, familyId) {
  const candidates = [
    path.join(inDir, 'families', familyId, 'harvest.json'),
    path.join(inDir, familyId, 'harvest.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(inDir, 'families', familyId, 'harvest.json');
}

function loadHarvestJson(harvestPath) {
  if (!fs.existsSync(harvestPath)) return null;
  return JSON.parse(fs.readFileSync(harvestPath, 'utf8'));
}

function saveHarvestJson(harvestPath, harvest) {
  fs.mkdirSync(path.dirname(harvestPath), { recursive: true });
  fs.writeFileSync(harvestPath, JSON.stringify(harvest, null, 2));
}

function listFamilyIds(inDir) {
  const familiesRoot = path.join(inDir, 'families');
  if (!fs.existsSync(familiesRoot)) return [];
  return fs
    .readdirSync(familiesRoot)
    .filter((name) => {
      const dir = path.join(familiesRoot, name);
      return fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'harvest.json'));
    })
    .sort();
}

/**
 * Pontus-level completeness: base harvest + history + streaks.
 */
function assessFamilyEnrichment(harvest) {
  const missing = [];
  if (!harvest?.api?.family) missing.push('base');
  const children = harvest?.api?.family?.children || [];
  const historyStats = countHistoryInHarvest(harvest?.api || {});

  if (children.length > 0) {
    if (!historyStats.hasDetails) missing.push('history');
    else if (historyStats.items === 0 && historyStats.errors === 0) missing.push('history_empty');
    else if (historyStats.errors > 0 && historyStats.items === 0) missing.push('history_errors');

    const progress = harvest?.api?.child_progress;
    if (!progress || typeof progress !== 'object') {
      missing.push('streaks');
    } else {
      for (const child of children) {
        if (!child.id) continue;
        const p = progress[child.id];
        if (!p || p._error) missing.push(`streaks:${child.name || child.id}`);
      }
    }
  }

  return {
    complete: missing.length === 0,
    missing,
    history: historyStats,
    childCount: children.length,
  };
}

async function refreshDailyLogChunks(harvest, { baseUrl, childId, delayMs, bearer }) {
  const chunks = [];
  const today = new Date().toISOString().slice(0, 10);
  const from = '2020-01-01';
  let start = from;
  while (start <= today) {
    const endDate = new Date(start + 'T12:00:00Z');
    endDate.setUTCDate(endDate.getUTCDate() + 89);
    let end = endDate.toISOString().slice(0, 10);
    if (end > today) end = today;
    const logs = await fetchJsonBearer(
      baseUrl,
      `/api/children/${childId}/daily-logs?from=${start}&to=${end}`,
      bearer
    );
    chunks.push({ from: start, to: end, data: logs.ok ? logs.body : { _error: logs.error } });
    start = new Date(end + 'T12:00:00Z');
    start.setUTCDate(start.getUTCDate() + 1);
    start = start.toISOString().slice(0, 10);
    await sleep(delayMs);
  }
  if (!harvest.api.daily_logs) harvest.api.daily_logs = {};
  harvest.api.daily_logs[childId] = chunks;
  return chunks;
}

/**
 * Fetch daily_log_item history + manual stars into harvest.api.
 */
async function harvestFamilyHistoryInto(harvest, opts) {
  const { baseUrl, bearer, delayMs = 250, force = false } = opts;
  const children = harvest.api?.family?.children || [];
  let totalDays = 0;
  let totalItems = 0;

  for (const child of children) {
    const childId = child.id;
    if (!childId) continue;

    let chunks = harvest.api?.daily_logs?.[childId];
    const chunksBad = !chunks || chunks.some((c) => c.data?._error);
    if (force || chunksBad) {
      chunks = await refreshDailyLogChunks(harvest, { baseUrl, childId, delayMs, bearer });
    }

    const dates = collectLogDates(chunks);
    const dailyLogDetails = force ? {} : { ...(harvest.api?.daily_log_details?.[childId] || {}) };

    for (const date of dates) {
      if (!force && dailyLogDetails[date] && !dailyLogDetails[date]._error) continue;
      const detail = await fetchJsonBearer(
        baseUrl,
        `/api/children/${childId}/daily-log?date=${date}`,
        bearer
      );
      dailyLogDetails[date] = detail.ok ? detail.body : { _error: detail.error, _status: detail.status };
      if (detail.ok && detail.body?.items) totalItems += detail.body.items.length;
      await sleep(delayMs);
    }
    totalDays += dates.length;

    const manual = await fetchJsonBearer(baseUrl, `/api/rewards/manual-stars/${childId}`, bearer);
    const manualGrants = manual.ok ? manual.body : { _error: manual.error, grants: [] };
    mergeHistoryIntoApi(harvest.api, childId, dailyLogDetails, manualGrants);
    await sleep(delayMs);
  }

  harvest.history_harvested_at = new Date().toISOString();
  return { totalDays, totalItems };
}

/**
 * Fetch streak via GET /api/children/:id/progress into harvest.api.child_progress.
 */
async function harvestFamilyStreaksInto(harvest, opts) {
  const { baseUrl, bearer, delayMs = 200 } = opts;
  const children = harvest.api?.family?.children || [];
  if (!harvest.api.child_progress) harvest.api.child_progress = {};

  const results = [];
  for (const child of children) {
    const childId = child.id;
    if (!childId) continue;

    const progress = await fetchJsonBearer(baseUrl, `/api/children/${childId}/progress`, bearer);
    harvest.api.child_progress[childId] = progress.ok ? progress.body : { _error: progress.error };

    const streak = progress.ok ? progress.body?.streak : null;
    results.push({
      name: child.name || childId,
      ok: progress.ok,
      current_streak: streak?.current_streak ?? 0,
      error: progress.ok ? null : progress.error,
    });
    await sleep(delayMs);
  }

  harvest.streaks_harvested_at = new Date().toISOString();
  return results;
}

module.exports = {
  fetchJsonBearer,
  impersonateFamily,
  resolveFamilyHarvestPath,
  loadHarvestJson,
  saveHarvestJson,
  listFamilyIds,
  assessFamilyEnrichment,
  harvestFamilyHistoryInto,
  harvestFamilyStreaksInto,
};
