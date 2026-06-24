'use strict';

const P0_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * @param {Date|string} signupAt
 * @param {Date|string} eventAt
 */
function isWithinP0Window(signupAt, eventAt) {
  const signup = new Date(signupAt);
  const event = new Date(eventAt);
  if (Number.isNaN(signup.getTime()) || Number.isNaN(event.getTime())) return false;
  return event.getTime() - signup.getTime() <= P0_WINDOW_MS;
}

/**
 * @param {object|null} state
 * @param {Date} [now]
 */
function reconcileP0State(state, now = new Date()) {
  if (!state) {
    return { p0ActivatedAt: null, p0ActivatedWithin48h: false };
  }
  const { signup_at, schema_saved_at, child_access_completed_at, first_completion_at } = state;
  if (!schema_saved_at || !child_access_completed_at || !first_completion_at) {
    return { p0ActivatedAt: null, p0ActivatedWithin48h: false };
  }
  const timestamps = [schema_saved_at, child_access_completed_at, first_completion_at].map((t) => new Date(t));
  const allWithin48h = timestamps.every((t) => isWithinP0Window(signup_at, t));
  if (!allWithin48h) {
    return { p0ActivatedAt: null, p0ActivatedWithin48h: false };
  }
  const p0ActivatedAt = new Date(Math.max(...timestamps.map((t) => t.getTime())));
  return {
    p0ActivatedAt,
    p0ActivatedWithin48h: isWithinP0Window(signup_at, p0ActivatedAt),
  };
}

/**
 * @param {object|null} state
 */
function isP0Activated(state) {
  return Boolean(state?.p0_activated_at);
}

/**
 * Current P0 milestone for nudges/admin (state-based, not full 9-step analytics).
 * @param {object|null} state
 */
function getActivationFunnelStep(state) {
  if (!state) return 'signup';
  if (state.p0_activated_within_48h) return 'p0_activated_48h';
  if (state.p0_activated_at) return 'p0_activated';
  if (state.first_completion_at) return 'first_completion';
  if (state.child_access_completed_at) return 'child_access';
  if (state.schema_saved_at) return 'schema_saved';
  return 'signup';
}

module.exports = {
  P0_WINDOW_MS,
  isWithinP0Window,
  reconcileP0State,
  isP0Activated,
  getActivationFunnelStep,
};
