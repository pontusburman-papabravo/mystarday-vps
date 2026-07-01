'use strict';

const custodyDb = require('../../../db/custody');
const { homesById } = require('./homes');
const { defaultPipeline, ResolverPipeline } = require('./pipeline');
const { findTransitions } = require('./handoff');
const OverrideResolver = require('./resolvers/override-resolver');
const PatternResolver = require('./resolvers/pattern-resolver');

/** Pipeline for transition scan — override + pattern only (no fallback). */
const transitionPipeline = new ResolverPipeline([OverrideResolver, PatternResolver]);

/**
 * @param {import('pg').Pool|import('pg').PoolClient} [client]
 * @param {object} params
 * @param {string} params.childId
 * @param {string} params.familyId
 * @param {string} [params.parentId]
 */
async function loadCustodyContext({ childId, familyId, parentId }, client) {
  const [schedule, homes, parentHomeId] = await Promise.all([
    custodyDb.getSchedule(childId, client),
    custodyDb.listHomes(familyId, client),
    parentId ? custodyDb.getParentHomeId(parentId, familyId, client) : Promise.resolve(null),
  ]);

  return {
    childId,
    familyId,
    parentHomeId: parentHomeId || null,
    schedule: schedule || null,
    homesById: homesById(homes),
    overrides: [],
  };
}

/**
 * Active home id for transition scan — same resolver chain as pipeline (no fallback).
 * @param {import('./types').CustodyResolveInput} ctx
 * @param {string} dateStr
 */
function getHomeIdForDate(ctx, dateStr) {
  const partial = transitionPipeline.resolve(ctx, dateStr);
  return partial?.activeHome?.id ?? null;
}

/**
 * @param {import('./types').CustodyResolveInput} ctx
 * @param {import('./types').PartialCustodyContext} partial
 * @param {string} dateStr
 * @returns {import('./types').CustodyContext}
 */
function finalizeContext(ctx, partial, dateStr) {
  const activeHome = partial.activeHome;
  const isParentDay = Boolean(
    ctx.parentHomeId && activeHome && activeHome.id === ctx.parentHomeId
  );

  let nextTransition = null;
  let previousTransition = null;
  if (activeHome) {
    const transitions = findTransitions((d) => getHomeIdForDate(ctx, d), dateStr);
    nextTransition = transitions.nextTransition;
    previousTransition = transitions.previousTransition;
  }

  return {
    date: dateStr,
    activeHome,
    source: partial.source,
    patternType: partial.patternType,
    activePeriod: partial.activePeriod,
    nextTransition,
    previousTransition,
    isParentDay,
  };
}

/**
 * @param {import('./types').CustodyResolveInput} ctx
 * @param {string} dateStr YYYY-MM-DD
 * @returns {import('./types').CustodyContext}
 */
function resolveCustodyDateSync(ctx, dateStr) {
  const partial = defaultPipeline.resolve(ctx, dateStr);
  if (!partial) {
    return finalizeContext(ctx, {
      activeHome: null,
      source: 'fallback',
      patternType: null,
      activePeriod: null,
    }, dateStr);
  }
  return finalizeContext(ctx, partial, dateStr);
}

/**
 * @param {object} params
 * @param {string} params.childId
 * @param {string} params.date YYYY-MM-DD
 * @param {string} params.familyId
 * @param {string} [params.parentId]
 * @param {import('pg').Pool|import('pg').PoolClient} [params.client]
 * @returns {Promise<import('./types').CustodyContext>}
 */
async function resolveCustodyDate({ childId, date, familyId, parentId, client }) {
  const ctx = await loadCustodyContext({ childId, familyId, parentId }, client);
  return resolveCustodyDateSync(ctx, date);
}

/**
 * @param {object} params
 * @param {string} params.childId
 * @param {string} params.dateFrom
 * @param {string} params.dateTo
 * @param {string} params.familyId
 * @param {string} [params.parentId]
 * @param {import('pg').Pool|import('pg').PoolClient} [params.client]
 * @returns {Promise<import('./types').CustodyContext[]>}
 */
async function resolveCustodyDateRange({
  childId, dateFrom, dateTo, familyId, parentId, client,
}) {
  const ctx = await loadCustodyContext({ childId, familyId, parentId }, client);
  const results = [];
  let d = dateFrom;
  while (d <= dateTo) {
    results.push(resolveCustodyDateSync(ctx, d));
    const [y, m, day] = d.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() + 1);
    d = dt.toISOString().slice(0, 10);
  }
  return results;
}

module.exports = {
  loadCustodyContext,
  resolveCustodyDateSync,
  resolveCustodyDate,
  resolveCustodyDateRange,
  getHomeIdForDate,
  finalizeContext,
  ResolverPipeline: require('./pipeline').ResolverPipeline,
  defaultPipeline: require('./pipeline').defaultPipeline,
  transitionPipeline,
};
