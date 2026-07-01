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
 * @property {string} start YYYY-MM-DD
 * @property {string} end YYYY-MM-DD
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
 * @property {string|null} [nextTransition] YYYY-MM-DD
 * @property {string|null} [previousTransition] YYYY-MM-DD
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
