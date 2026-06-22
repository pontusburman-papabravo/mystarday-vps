/**
 * Client-side analytics beacon route.
 * Owns: receiving client events (pageview, PWA mode, funnel landing visit).
 * Does NOT own: server-side feature tracking (that lives in each feature route).
 *
 * All events are anonymous — only family_id (from JWT) or a nonce for unauthenticated events.
 * No IP, no browser fingerprint, no PII.
 */

const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const analytics = require('../../db/analytics');

const router = express.Router();

// Allowed event types from client (whitelist — rejects unknown events)
const ALLOWED_CLIENT_EVENTS = new Set([
  'funnel_landing_visit',
  'funnel_onboarding_abandoned',
  'pwa_installed',
  'pwa_browser',
  'feature_child_view',
  'feature_treasure_chest',
  'feature_schedule_edit',
  'feature_daily_log',
  'for_dig_page_view',
  'for_dig_goal_expand',
  'for_dig_activate_click',
  'for_dig_activate_success',
  'for_dig_activate_fail',
  'for_dig_library_link',
  'for_dig_feedback_intent',
  'for_dig_feedback_outcome',
  'for_dig_feedback_suggestion',
  'for_dig_install_logged',
  'for_dig_favorite_toggle',
  'win_back_landing',
  'preview_shown',
  'interest_registered',
  'upgrade_from_preview',
  'seven_questions_shown',
  'read_aloud_used',
  'app_opened',
  'entry_welcome_viewed',
  'entry_cta_started',
  'entry_existing_account_tapped',
  'entry_how_it_works_opened',
  'role_selection_viewed',
  'role_child_selected',
  'role_adult_selected',
  'child_login_mode_viewed',
  'child_profile_selected',
  'child_profile_not_found_clicked',
  'child_login_submitted',
  'child_login_success',
  'child_login_failed',
  'adult_start_viewed',
  'adult_existing_selected',
  'adult_new_selected',
  'adult_login_viewed',
  'adult_login_method_selected',
  'adult_login_success',
  'adult_login_failed',
  'adult_signup_intro_viewed',
  'signup_started',
  'signup_completed',
]);

/**
 * POST /api/analytics/event
 * Body: { event_type: string, metadata?: object }
 *
 * Authenticated: uses req.user.familyId.
 * Unauthenticated: uses a session nonce from body (for landing-page visits).
 */
router.post('/event', optionalAuth, async (req, res) => {
  // Always respond 204 — analytics must never fail the caller
  res.status(204).end();

  const { event_type, metadata = {}, session_id } = req.body || {};
  if (!event_type || !ALLOWED_CLIENT_EVENTS.has(event_type)) return;

  // Use authenticated family_id when available, else fall back to session_id nonce
  const familyId = req.user?.familyId || (typeof session_id === 'string' ? session_id : null);
  if (!familyId) return;

  analytics.track(familyId, event_type, metadata);
});

module.exports = router;
