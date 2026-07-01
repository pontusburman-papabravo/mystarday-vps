'use strict';

const { getWeekMondayIso } = require('./date-utils');
const {
  loadCustodyContext,
  resolveCustodyDateSync,
} = require('./custody-schedule-engine');

/**
 * Legacy A/B variant for API consumers not yet migrated off week_variant.
 * @param {object|null} schedule
 * @param {{ id: string }|null} activeHome
 * @returns {'a'|'b'|null}
 */
function legacyWeekVariant(schedule, activeHome) {
  if (!schedule || !activeHome || schedule.pattern_type !== 'alternate_weeks') {
    return null;
  }
  const config = schedule.configuration || {};
  const homeA = config.home_a || schedule.week_a_home_id;
  if (!homeA) return null;
  return activeHome.id === homeA ? 'a' : 'b';
}

/**
 * Build API payload from a loaded engine context (no DB).
 * @param {import('./custody-schedule-engine/types').CustodyResolveInput} engineCtx
 * @param {string} dateStr YYYY-MM-DD
 */
function buildCustodyContextFromEngine(engineCtx, dateStr) {
  if (!engineCtx.schedule) {
    return { active: false };
  }

  const context = resolveCustodyDateSync(engineCtx, dateStr);
  const weekMonday = getWeekMondayIso(dateStr);
  const weekContext = resolveCustodyDateSync(engineCtx, weekMonday);

  const weekBannerHome = weekContext.activeHome;

  return {
    active: true,
    ...context,
    weekMonday,
    parentHomeId: engineCtx.parentHomeId,
    // Legacy aliases — remove when Phase 4 UI migration complete
    variant: legacyWeekVariant(engineCtx.schedule, context.activeHome),
    home: context.activeHome,
    weekBanner: weekBannerHome
      ? {
        label: weekBannerHome.label,
        color: weekBannerHome.color,
        variant: legacyWeekVariant(engineCtx.schedule, weekBannerHome),
      }
      : null,
    isMyDay: context.isParentDay,
    nextHandoff: context.nextTransition ?? null,
    previousHandoff: context.previousTransition ?? null,
  };
}

/**
 * Build GET /custody/context response — CustodyContext + legacy aliases (one deploy).
 * @param {object} params
 * @param {string} params.childId
 * @param {string} params.familyId
 * @param {string} params.parentId
 * @param {string} params.dateStr YYYY-MM-DD
 * @param {import('pg').Pool|import('pg').PoolClient} [params.client]
 */
async function buildCustodyContextResponse({
  childId, familyId, parentId, dateStr, client,
}) {
  const engineCtx = await loadCustodyContext({ childId, familyId, parentId }, client);
  return buildCustodyContextFromEngine(engineCtx, dateStr);
}

module.exports = {
  legacyWeekVariant,
  buildCustodyContextFromEngine,
  buildCustodyContextResponse,
};
