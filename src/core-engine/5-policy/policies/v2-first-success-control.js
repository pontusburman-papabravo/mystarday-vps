'use strict';

/** @typedef {import('../engine').PolicyDirective} PolicyDirective */

/**
 * @param {import('../constants').PrimaryNeed} need
 * @param {import('../engine').EngineContext} context
 * @param {import('../../1-facts/types').FamilyFacts} facts
 * @returns {PolicyDirective}
 */
function resolve(need, context, facts) {
  const expiresAt = new Date(context.currentDeviceTime.getTime() + 24 * 60 * 60 * 1000);
  const id = `control_${facts.familyId}_${need}`;

  switch (need) {
    case 'NEEDS_CLARITY':
      return {
        id,
        name: 'SHOW_CHILD',
        validityWindow: { startHour: 6, endHour: 21, expiresAt },
        uiTokens: { theme: 'DEFAULT', intensity: 'LOW', tags: ['ONBOARDING'] },
      };
    case 'NEEDS_MOMENTUM':
      return {
        id,
        name: 'SHOW_CHILD',
        validityWindow: { startHour: 6, endHour: 21, expiresAt },
        uiTokens: { theme: 'ENCOURAGEMENT', intensity: 'HIGH', tags: ['FIRST_SUCCESS'] },
      };
    case 'NEEDS_CONSISTENCY':
      return {
        id,
        name: 'ADD_EVENING',
        validityWindow: { startHour: 17, endHour: 21, expiresAt },
        uiTokens: { theme: 'ENCOURAGEMENT', intensity: 'HIGH', tags: ['BUILD_ROUTINE'] },
      };
    case 'NEEDS_CUSTOMIZATION':
      if ((facts.coParentCount || 1) < 2) {
        return {
          id: `${id}_invite`,
          name: 'INVITE_CO_PARENT',
          validityWindow: { startHour: 8, endHour: 20, expiresAt },
          uiTokens: { theme: 'CALM', intensity: 'LOW', tags: ['SHARE'] },
        };
      }
      return {
        id: `${id}_customize`,
        name: 'CUSTOMIZE_ROUTINE',
        validityWindow: { startHour: 0, endHour: 24, expiresAt },
        uiTokens: { theme: 'CALM', intensity: 'LOW', tags: ['CUSTOMIZE'] },
      };
    case 'NEEDS_WINBACK':
      return {
        id: `${id}_winback`,
        name: 'SIMPLIFY_ROUTINE',
        validityWindow: { startHour: 8, endHour: 20, expiresAt },
        uiTokens: { theme: 'CALM', intensity: 'LOW', tags: ['WINBACK'] },
      };
    default:
      return {
        id: `${id}_fallback`,
        name: 'SHOW_CHILD',
        validityWindow: { startHour: 0, endHour: 24, expiresAt },
        uiTokens: { theme: 'DEFAULT', intensity: 'LOW', tags: [] },
      };
  }
}

module.exports = { resolve };
