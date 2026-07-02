'use strict';

const custodyDb = require('../../db/custody');

/**
 * Home IDs for week_variant a/b from pattern configuration (alternate_weeks or weekends).
 * @param {object} pattern
 */
function homesFromPattern(pattern) {
  const { configuration } = custodyDb.resolveScheduleFields(pattern);
  const homeA =
    configuration.home_a ||
    configuration.weekend_home_a ||
    pattern.week_a_home_id ||
    null;
  const homeB =
    configuration.home_b ||
    configuration.weekend_home_b ||
    pattern.week_b_home_id ||
    null;
  return { homeA, homeB };
}

/**
 * @param {object} pattern
 * @param {string} custodyHomeId
 * @returns {'a'|'b'|null}
 */
function variantForHomeId(pattern, custodyHomeId) {
  const { homeA, homeB } = homesFromPattern(pattern);
  if (custodyHomeId === homeA) return 'a';
  if (custodyHomeId === homeB) return 'b';
  return null;
}

/**
 * @param {object} pattern
 * @param {'a'|'b'} weekVariant
 * @returns {string|null}
 */
function homeIdForVariant(pattern, weekVariant) {
  const { homeA, homeB } = homesFromPattern(pattern);
  if (weekVariant === 'a') return homeA;
  if (weekVariant === 'b') return homeB;
  return null;
}

/**
 * Resolve parallel week_variant + custody_home_id for schedule writes.
 * Prefers explicit custody_home_id; keeps week_variant in sync during Phase 5 transition.
 * @param {object} pattern custody_pattern row
 * @param {{ week_variant?: string, custody_home_id?: string }} input
 * @returns {{ weekVariant: 'a'|'b', custodyHomeId: string } | { error: string }}
 */
function resolveScheduleWriteFields(pattern, input) {
  const rawHomeId = input.custody_home_id || null;
  const rawVariant = input.week_variant || null;

  if (rawHomeId && rawVariant) {
    const derived = variantForHomeId(pattern, rawHomeId);
    if (derived && derived !== rawVariant) {
      return { error: 'custody_home_id matchar inte week_variant' };
    }
  }

  if (rawHomeId) {
    const variant = variantForHomeId(pattern, rawHomeId);
    if (!variant) {
      return { error: 'custody_home_id tillhör inte barnets boendeschema' };
    }
    return { weekVariant: variant, custodyHomeId: rawHomeId };
  }

  if (rawVariant === 'a' || rawVariant === 'b') {
    const homeId = homeIdForVariant(pattern, rawVariant);
    if (!homeId) {
      return { error: 'Boendeschemat saknar hem för vald veckovariant' };
    }
    return { weekVariant: rawVariant, custodyHomeId: homeId };
  }

  return { error: 'custody_home_id eller week_variant krävs när boendeschema är aktivt' };
}

module.exports = {
  homesFromPattern,
  variantForHomeId,
  homeIdForVariant,
  resolveScheduleWriteFields,
};
