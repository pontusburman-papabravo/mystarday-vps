'use strict';

/**
 * Public marketing/legal surfaces must follow the same launch model as signup.
 * Do not invent per-page launch flags.
 *
 * CLOSED           — market not available for signup
 * OPEN_PREBILLING  — signup + product usable; billing intentionally not live
 * OPEN_PAID        — signup + normal subscription/paywall
 */

const PUBLIC_LAUNCH_STATES = Object.freeze({
  CLOSED: 'closed',
  OPEN_PREBILLING: 'open_prebilling',
  OPEN_PAID: 'open_paid',
});

/**
 * @param {{ signupAllowed?: boolean, publicBillingUsable?: boolean }} input
 * @returns {'closed'|'open_prebilling'|'open_paid'}
 */
function resolvePublicLaunchState(input = {}) {
  if (!input.signupAllowed) return PUBLIC_LAUNCH_STATES.CLOSED;
  if (!input.publicBillingUsable) return PUBLIC_LAUNCH_STATES.OPEN_PREBILLING;
  return PUBLIC_LAUNCH_STATES.OPEN_PAID;
}

/**
 * @param {{ signupAllowedByCountry?: Record<string, boolean>, publicBillingUsable?: boolean, countryCodes?: string[] }} input
 */
function resolvePublicLaunchStates(input = {}) {
  const codes = input.countryCodes || ['SE', 'IE', 'FI'];
  const signup = input.signupAllowedByCountry || {};
  const out = {};
  for (const code of codes) {
    out[code] = resolvePublicLaunchState({
      signupAllowed: signup[code] === true,
      publicBillingUsable: input.publicBillingUsable === true,
    });
  }
  return out;
}

module.exports = {
  PUBLIC_LAUNCH_STATES,
  resolvePublicLaunchState,
  resolvePublicLaunchStates,
};
