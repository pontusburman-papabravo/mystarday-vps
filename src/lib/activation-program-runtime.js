'use strict';

/**
 * Runtime sunset for legacy Activation Program (not activation_first_success_v1).
 * Active participants keep API access; everyone else gets sunset when enrollments are closed.
 */

const parentActivationProgram = require('../../db/parent-activation-program');
const { FLAG_KEYS, isFlagEnabled } = require('./journey/flags');

const SUNSET_BODY = {
  error: 'Activation-programmet är avvecklat. Använd Family Journey Context.',
  migration: '/api/me/journey-context',
};

async function getActiveActivationProgram(familyId, client) {
  if (!familyId) return null;
  const program = await parentActivationProgram.getActiveByFamily(familyId, client);
  if (!program || program.status !== 'active') return null;
  return program;
}

/**
 * @returns {Promise<boolean>} true when legacy program API should return 410 for this family
 */
async function isActivationProgramApiSunsetForFamily(familyId, client) {
  const active = await getActiveActivationProgram(familyId, client);
  if (active) return false;

  const newEnrollmentsOpen = await isFlagEnabled(FLAG_KEYS.activationNewEnrollments);
  if (!newEnrollmentsOpen) return true;

  return isFlagEnabled(FLAG_KEYS.activationApiDeprecated);
}

async function isActivationProgramOutboundSunset() {
  const newEnrollmentsOpen = await isFlagEnabled(FLAG_KEYS.activationNewEnrollments);
  if (!newEnrollmentsOpen) return true;
  return isFlagEnabled(FLAG_KEYS.activationApiDeprecated);
}

module.exports = {
  SUNSET_BODY,
  getActiveActivationProgram,
  isActivationProgramApiSunsetForFamily,
  isActivationProgramOutboundSunset,
};
