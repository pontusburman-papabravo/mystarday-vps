'use strict';

/**
 * Private weekly highlight — no PII in default share text.
 */

const db = require('../db');

/**
 * @param {string} familyId
 * @param {string} parentId
 * @param {object[]} children — accessible children
 */
async function buildWeeklyHighlight(familyId, parentId, children) {
  if (!children?.length) return null;

  const childIds = children.map((c) => c.id);
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE dli.section = 'fm')::int AS fm_count,
       COUNT(*) FILTER (WHERE dli.section = 'em')::int AS em_count,
       COUNT(*) FILTER (WHERE dli.section = 'kvall')::int AS kvall_count,
       COUNT(DISTINCT dl.child_id)::int AS active_children
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = ANY($1::uuid[])
       AND dli.completed = true
       AND COALESCE(dli.completed_at, dli.completed_date::timestamptz) >= NOW() - INTERVAL '7 days'`,
    [childIds]
  );
  const row = result.rows[0];
  const total = (row.fm_count || 0) + (row.em_count || 0) + (row.kvall_count || 0);
  if (total < 1) return null;

  let headlineKey = 'generic';
  let shareKey = 'generic';
  if (row.fm_count >= 3) {
    headlineKey = 'morning';
    shareKey = 'morning';
  } else if (row.kvall_count >= 3) {
    headlineKey = 'evening';
    shareKey = 'evening';
  } else if (row.active_children > 1) {
    headlineKey = 'multi_child';
    shareKey = 'multi_child';
  }

  return {
    completion_count: total,
    headline_key: headlineKey,
    share_key: shareKey,
    multi_child: row.active_children > 1,
    child_count_bucket: row.active_children > 1 ? 'multi' : 'single',
  };
}

function registerUrlForShare() {
  const config = require('../config');
  const base = String(process.env.APP_URL || config.email?.baseUrl || '').replace(/\/$/, '');
  if (!base || base.includes('[')) return '/register';
  return `${base}/register`;
}

/**
 * Localized strings without child names (server-side for API).
 */
function formatHighlightCopy(lang, highlight) {
  const { t } = require('../i18n');
  const prefix = 'home.growth.weeklyHighlight';
  const key = highlight.share_key || 'generic';
  const regUrl = registerUrlForShare();
  const shareBase = t(lang, `${prefix}.${key}.shareText`);
  return {
    headline: t(lang, `${prefix}.${key}.headline`),
    body: t(lang, `${prefix}.${key}.body`),
    share_text: `${shareBase} ${regUrl}`.trim(),
  };
}

module.exports = {
  buildWeeklyHighlight,
  formatHighlightCopy,
};
