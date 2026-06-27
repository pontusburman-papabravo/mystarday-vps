'use strict';

/**
 * @typedef {Object} FamilyFacts
 * @property {string} familyId
 * @property {Date} signupAt
 * @property {readonly string[]} childrenIds
 * @property {number} totalCompletions
 * @property {Date|null} firstCompletionAt
 * @property {Date|null} lastCompletionAt
 * @property {Date|null} [firstDayCompletedAt]
 * @property {number} currentStreakDays
 * @property {boolean} hasSeenChildView
 * @property {boolean} hasRoutine
 * @property {boolean} hasEveningRoutine
 * @property {number} rewardsClaimedCount
 * @property {number} [coParentCount]
 * @property {boolean} [openedCustomize]
 * @property {boolean} [_incomplete] Internal: partial/missing facts → graceful degradation
 */

module.exports = {};
