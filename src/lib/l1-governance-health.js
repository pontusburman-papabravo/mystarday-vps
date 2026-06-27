'use strict';

function computeGovernanceHealth(decisions, metrics) {
  const n = decisions.length;
  const overrides = decisions.filter((d) => d.answers?.used_override).length;
  const acceptUnknown = decisions.filter((d) => d.decision_type === 'ACCEPT-UNKNOWN').length;
  const followed = decisions.filter((d) => d.answers?.followed_recommendation).length;
  const overrideRate = n ? Math.round((overrides / n) * 100) : null;
  const acceptUnknownRate = n ? Math.round((acceptUnknown / n) * 100) : null;
  const followRate = n ? Math.round((followed / n) * 100) : null;
  const nonAdoptionMismatch =
    metrics.coach_clicks_7d === 0 &&
    metrics.child_access_completed_7d > 0 &&
    metrics.readiness_clicks_7d > 0;

  let gravityWarning = null;
  if (followRate != null && followRate >= 85 && n >= 2) {
    gravityWarning = 'recommendation_gravity';
  }
  if (acceptUnknownRate != null && acceptUnknownRate >= 70 && n >= 2) {
    gravityWarning = gravityWarning || 'accept_unknown_heavy';
  }

  return {
    decision_count: n,
    override_rate_pct: overrideRate,
    accept_unknown_rate_pct: acceptUnknownRate,
    follow_recommendation_rate_pct: followRate,
    non_adoption_mismatch_hint: nonAdoptionMismatch,
    gravity_warning: gravityWarning,
  };
}

module.exports = { computeGovernanceHealth };
