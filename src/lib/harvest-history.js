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
      const total = parseInt(log.total_items, 10) || 0;
      const completed = parseInt(log.completed_items, 10) || 0;
      if (total > 0 || completed > 0) dates.add(String(log.date).slice(0, 10));
    }
  }
  return [...dates].sort();
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

module.exports = {
  collectLogDates,
  mergeHistoryIntoApi,
  buildDailyLogItemRows,
  buildManualStarRows,
};
