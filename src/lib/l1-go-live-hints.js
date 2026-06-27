'use strict';

/**
 * Read-only hints for go-live checklist (suggestions, not auto-check).
 */
function computeGoLiveHints({ decisions, metrics, release }) {
  const hints = {};
  if (decisions.length > 0) {
    hints.decision_logging = 'Minst ett beslut finns i loggen';
  }
  if (decisions.some((d) => d.decision_type === 'ACCEPT-UNKNOWN')) {
    hints.accept_unknown_active = 'ACCEPT-UNKNOWN registrerat';
  }
  if (metrics.conflicts_7d > 0 || metrics.coach_clicks_7d > 0) {
    hints.observability_axes = 'Engine-events syns i analytics (7d)';
  }
  if (release.l1_primary_owner && release.review_day_14_at) {
    hints.l1_owners_scheduled = 'Ägare och review-datum ifyllda';
  }
  return hints;
}

module.exports = { computeGoLiveHints };
