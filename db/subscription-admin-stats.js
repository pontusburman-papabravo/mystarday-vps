/**
 * Subscription package admin stats (§9.10.4).
 */

const db = require('../src/lib/db');
const packageInterest = require('./package-interest');
const appConfig = require('./app-config');
const { VALID_ROLLOUT_MODES, getRolloutFlags } = require('../src/lib/package-access');

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * @param {'7d'|'30d'|'90d'} period
 */
async function getSubscriptionStats(period = '30d') {
  const days = PERIOD_DAYS[period] || 30;
  const interval = `${days} days`;

  const rolloutRaw = await appConfig.get('PACKAGES_ROLLOUT_MODE');
  const rollout_mode = VALID_ROLLOUT_MODES.includes(rolloutRaw)
    ? rolloutRaw
    : (VALID_ROLLOUT_MODES.includes(process.env.PACKAGES_ROLLOUT_MODE)
      ? process.env.PACKAGES_ROLLOUT_MODE
      : 'off');

  const [
    interestByComponent,
    previewEvents,
    interestEvents,
    activeComponents,
    archivedComponents,
    lifetimeFreeCount,
  ] = await Promise.all([
    packageInterest.getInterestCountsByComponent(),
    db.query(
      `SELECT
         metadata->>'component' AS component,
         COUNT(*)::int AS events,
         COUNT(DISTINCT family_id)::int AS families
       FROM analytics_events
       WHERE event_type = 'preview_shown'
         AND created_at >= NOW() - $1::interval
         AND metadata->>'component' IS NOT NULL
       GROUP BY metadata->>'component'`,
      [interval]
    ),
    db.query(
      `SELECT
         metadata->>'component' AS component,
         COUNT(*)::int AS events,
         COUNT(DISTINCT family_id)::int AS families
       FROM analytics_events
       WHERE event_type = 'interest_registered'
         AND created_at >= NOW() - $1::interval
         AND metadata->>'component' IS NOT NULL
       GROUP BY metadata->>'component'`,
      [interval]
    ),
    db.query(
      `SELECT COUNT(DISTINCT fs.family_id)::int AS count
       FROM family_subscriptions fs,
            jsonb_array_elements(fs.components) elem
       WHERE elem->>'component' IN ('reporting', 'pedagog', 'teacch')
         AND COALESCE(elem->>'state', 'active') = 'active'`
    ),
    db.query(
      `SELECT COUNT(DISTINCT fs.family_id)::int AS count
       FROM family_subscriptions fs,
            jsonb_array_elements(fs.components) elem
       WHERE elem->>'component' IN ('reporting', 'pedagog', 'teacch')
         AND elem->>'state' = 'archived'`
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM family WHERE is_lifetime_free = true AND archived_at IS NULL`
    ),
  ]);

  const previewMap = Object.fromEntries(
    previewEvents.rows.map((r) => [r.component, r])
  );
  const interestEventMap = Object.fromEntries(
    interestEvents.rows.map((r) => [r.component, r])
  );
  const interestDbMap = Object.fromEntries(
    interestByComponent.map((r) => [r.component, r.families])
  );

  const components = ['reporting', 'pedagog', 'teacch'].map((slug) => {
    const previews = previewMap[slug]?.families || 0;
    const interests = interestEventMap[slug]?.families || interestDbMap[slug] || 0;
    const previewEventsCount = previewMap[slug]?.events || 0;
    return {
      component: slug,
      interest_families: interestDbMap[slug] || 0,
      interest_events: interestEventMap[slug]?.events || 0,
      preview_families: previews,
      preview_events: previewEventsCount,
      conversion_pct: previews > 0 ? Math.round((interests / previews) * 1000) / 10 : null,
    };
  });

  const totalInterestFamilies = interestByComponent.reduce((sum, r) => sum + r.families, 0);

  return {
    period,
    rollout_mode,
    ...getRolloutFlags(rollout_mode),
    summary: {
      interest_families_total: totalInterestFamilies,
      active_package_families: activeComponents.rows[0]?.count ?? 0,
      archived_package_families: archivedComponents.rows[0]?.count ?? 0,
      lifetime_free_families: lifetimeFreeCount.rows[0]?.count ?? 0,
    },
    by_component: components,
  };
}

module.exports = { getSubscriptionStats };
