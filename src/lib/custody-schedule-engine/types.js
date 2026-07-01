'use strict';

/**
 * @typedef {object} CustodyHome
 * @property {string} id
 * @property {string} label
 * @property {string} color
 * @property {string|null} icon
 */

/**
 * @typedef {object} CustodyActivePeriod
 * @property {string} start YYYY-MM-DD inclusive
 * @property {string} end YYYY-MM-DD inclusive
 *
 * Semantics (stable contract):
 * - source=override: the override row's [start_date, end_date].
 * - source=pattern: the current pattern segment containing `date` (e.g. Mon–Sun
 *   week block, or Mon–Thu / Fri–Sun for alternate_weekends) — NOT "how long
 *   activeHome stays unchanged" when segment boundaries differ from home changes.
 * - source=fallback: null.
 */

/**
 * @typedef {'override'|'pattern'|'fallback'} CustodySource
 */

/**
 * Public contract — all consumers receive this shape only.
 * @typedef {object} CustodyContext
 * @property {CustodyHome|null} activeHome
 * @property {CustodySource} source
 * @property {string|null} patternType
 * @property {CustodyActivePeriod|null} activePeriod
 * @property {string|null} [nextTransition] YYYY-MM-DD — first date **after** `date`
 *   where `activeHome.id` may change per the full resolver chain (override →
 *   pattern). Not "next pattern handoff" alone — overrides can shift the date.
 * @property {string|null} [previousTransition] YYYY-MM-DD — first date where the
 *   current `activeHome.id` became active (per resolver chain).
 * @property {boolean} isParentDay
 * @property {string} date
 */

/**
 * Loaded engine input (internal + async loader).
 * @typedef {object} CustodyEngineContext
 * @property {string} childId
 * @property {string} familyId
 * @property {string|null} parentHomeId
 * @property {object|null} schedule
 * @property {Record<string, object>} homesById
 * @property {Array<object>} overrides
 */

/**
 * @typedef {CustodyEngineContext} CustodyResolveInput
 */

/**
 * Partial result from a single resolver step.
 * @typedef {object} PartialCustodyContext
 * @property {CustodyHome|null} activeHome
 * @property {CustodySource} source
 * @property {string|null} patternType
 * @property {CustodyActivePeriod|null} activePeriod
 */

module.exports = {};
