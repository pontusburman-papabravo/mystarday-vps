'use strict';

/**
 * Same-family paid-transition notice for IE/FI launch access.
 * Does not open markets or enable billing.
 *
 * upcoming — before country payment_start_at (T1)
 * hold     — after cutoff while public billing is still unusable (ops-late safety)
 * paywall  — after cutoff and billing usable, no store/admin/gift row
 * none     — paid / grandfathered / not applicable
 */

const PAID_TRANSITION_KINDS = Object.freeze({
  NONE: 'none',
  UPCOMING: 'upcoming',
  HOLD: 'hold',
  PAYWALL: 'paywall',
});

/**
 * @param {{
 *   accessKind?: string|null,
 *   paymentStartAt?: Date|string|null,
 *   now?: Date,
 *   publicBillingUsable?: boolean,
 * }} input
 */
function describePaidTransition(input = {}) {
  const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
  const cutoff = input.paymentStartAt ? new Date(input.paymentStartAt) : null;
  const cutoffIso = cutoff && !Number.isNaN(cutoff.getTime()) ? cutoff.toISOString() : null;
  const accessKind = input.accessKind || 'limited';

  if (accessKind === 'paid' || accessKind === 'grandfathered') {
    return { kind: PAID_TRANSITION_KINDS.NONE, cutoff_at: cutoffIso, hold_active: false };
  }

  if (accessKind === 'prebilling') {
    if (cutoff && now < cutoff) {
      return { kind: PAID_TRANSITION_KINDS.UPCOMING, cutoff_at: cutoffIso, hold_active: false };
    }
    return { kind: PAID_TRANSITION_KINDS.HOLD, cutoff_at: cutoffIso, hold_active: true };
  }

  if (accessKind === 'limited' && input.publicBillingUsable === true) {
    return { kind: PAID_TRANSITION_KINDS.PAYWALL, cutoff_at: cutoffIso, hold_active: false };
  }

  return { kind: PAID_TRANSITION_KINDS.NONE, cutoff_at: cutoffIso, hold_active: false };
}

function attachPaidTransition(resolved, { now, publicBillingUsable } = {}) {
  const paid_transition = describePaidTransition({
    accessKind: resolved && resolved.access_kind,
    paymentStartAt: resolved && resolved.payment_start_at,
    now,
    publicBillingUsable,
  });
  return { ...resolved, paid_transition };
}

module.exports = {
  PAID_TRANSITION_KINDS,
  describePaidTransition,
  attachPaidTransition,
};
