/**
 * Harvest daily_log_item history via parent API (bypasses broken GDPR ZIP export).
 */

function collectLogDates(dailyLogChunks) {
  const dates = new Set();
  for (const chunk of dailyLogChunks || []) {
    const data = chunk?.data;
    if (!data || data._error) continue;
    const list = Array.isArray(data) ? data : [];
    for (const log of list) {
      if (!log?.date) continue;
      const date = String(log.date).slice(0, 10);
      const total = parseInt(log.total_items, 10) || 0;
      const completed = parseInt(log.completed_items, 10) || 0;
      // Include any day with a log row, or with activity counts
      if (log.id || total > 0 || completed > 0) dates.add(date);
    }
  }
  return [...dates].sort();
}

/** Count history payload in harvest.json for diagnostics. */
function countHistoryInHarvest(api) {
  let days = 0;
  let items = 0;
  let errors = 0;
  const details = api?.daily_log_details || {};
  for (const byDate of Object.values(details)) {
    if (!byDate || typeof byDate !== 'object') continue;
    for (const payload of Object.values(byDate)) {
      if (payload?._error) {
        errors++;
        continue;
      }
      days++;
      if (Array.isArray(payload?.items)) items += payload.items.length;
    }
  }
  return { days, items, errors, hasDetails: days > 0 || errors > 0 };
}

/**
 * @param {object} api — harvest api section (mutated in place when mergeInto provided)
 */
function mergeHistoryIntoApi(api, childId, dailyLogDetails, manualGrants) {
  if (!api.daily_log_details) api.daily_log_details = {};
  api.daily_log_details[childId] = dailyLogDetails;
  if (!api.manual_star_grants) api.manual_star_grants = {};
  api.manual_star_grants[childId] = manualGrants;
}

/**
 * Build import rows from harvested daily_log_details.
 */
function buildDailyLogItemRows(childRows, api) {
  const rows = [];
  const warnings = [];

  for (const child of childRows) {
    const byDate = api.daily_log_details?.[child.id];
    if (!byDate || typeof byDate !== 'object') continue;

    for (const [date, payload] of Object.entries(byDate)) {
      if (!payload || payload._error) continue;
      const logId = payload.log?.id;
      if (!logId) {
        warnings.push(`daily_log_details ${child.name} ${date}: saknar log.id`);
        continue;
      }
      const items = Array.isArray(payload.items) ? payload.items : [];
      for (const item of items) {
        if (!item.id) continue;
        rows.push({
          id: item.id,
          daily_log_id: logId,
          _child_id: child.id,
          _log_date: date,
          activity_template_id: item.activity_template_id || null,
          name: item.name || 'Aktivitet',
          icon: item.icon || '⭐',
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          star_value: item.star_value ?? 1,
          completed: item.completed === true,
          completed_at: item.completed_at || null,
          completed_date: item.completed ? (item.completed_date || date) : null,
          sort_order: item.sort_order ?? 0,
          child_sort_order: item.child_sort_order ?? item.sort_order ?? 0,
          section: item.section || 'morgon',
          parent_note: item.parent_note || null,
          child_note: item.child_note || null,
        });
      }
    }
  }

  return { rows, warnings };
}

function buildManualStarRows(childRows, api, primaryParentId) {
  const rows = [];
  for (const child of childRows) {
    const payload = api.manual_star_grants?.[child.id];
    const grants = payload?.grants || (Array.isArray(payload) ? payload : []);
    for (const g of grants) {
      if (!g.id) continue;
      rows.push({
        id: g.id,
        child_id: child.id,
        granted_by: primaryParentId,
        star_count: g.star_count ?? 1,
        reason: g.reason || null,
        image_url: g.image_url || null,
        created_at: g.created_at || new Date().toISOString(),
      });
    }
  }
  return rows;
}

/**
 * Map prod daily_log_id → local DB id via (child_id, date).
 * Dashboard may have created logs with different UUIDs before history import.
 */
async function remapDailyLogItemRows(client, itemRows) {
  const out = [];
  let skipped = 0;
  for (const row of itemRows) {
    const childId = row._child_id;
    const logDate = row._log_date;
    if (!childId || !logDate) {
      skipped++;
      continue;
    }
    const { rows: logs } = await client.query(
      `SELECT id FROM daily_log WHERE child_id = $1 AND date = $2::date`,
      [childId, logDate]
    );
    if (!logs[0]) {
      skipped++;
      continue;
    }
    const copy = { ...row, daily_log_id: logs[0].id };
    delete copy._child_id;
    delete copy._log_date;
    out.push(copy);
  }
  return { rows: out, skipped };
}

module.exports = {
  collectLogDates,
  mergeHistoryIntoApi,
  buildDailyLogItemRows,
  buildManualStarRows,
  countHistoryInHarvest,
  remapDailyLogItemRows,
};
