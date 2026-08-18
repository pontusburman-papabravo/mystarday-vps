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
const { enrichActorMetadata } = require('../lib/session-telemetry');
const { maybeMarkWinBackReturnedFromEngagement } = require('../lib/win-back-return-tracker');

const router = express.Router();

// Allowed event types from client (whitelist — rejects unknown events)
const ALLOWED_CLIENT_EVENTS = new Set([
  'funnel_landing_visit',
  'funnel_onboarding_abandoned',
  'funnel_onboarding_started',
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
  // Landing-page CTA tracking (public/js/landing-events.js + landing-faq.js)
  'hero_signup_click',
  'hero_how_it_works_click',
  'problem_how_it_works_click',
  'treasure_demo_click',
  'founder_signup_click',
  'final_signup_click',
  'nav_login_click',
  'nav_child_login_click',
  'hero_parent_login_click',
  'hero_child_login_click',
  'barnvy_child_login_click',
  'nav_signup_click',
  'footer_signup_click',
  'child_view_example_click',
  'landing_guide_card_click',
  'landing_share_click',
  'landing_faq_expand',
  'landing_login_choice_shown',
  'landing_login_choice_app',
  'landing_login_choice_web',
  'app_store_click',
  'play_store_click',
  // SEO guide articles (public/js/article-events.js)
  'article_cta_register',
  'guide_next_step_click',
  'guide_hub_nav_click',
  'article_faq_expand',
  // Dashboard viral CTAs (dashboard-cta.js + coparent-invite-ui.js)
  'cta_invite_co_parent_shown',
  'cta_invite_co_parent_clicked',
  'cta_share_app_shown',
  'cta_share_app_clicked',
  // In-app navigation + engagement
  'nav_hub_click',
  'readiness_action_click',
  'child_profile_section',
  'child_world_view',
  'feature_minimal_ui_enabled',
  // ACT-1 activation funnel (act-1-ai-startschema-spec.md §10)
  'activation_onboarding_started',
  'activation_onboarding_screen_viewed',
  'activation_question_answered',
  'activation_first_success_next_action_shown',
  'activation_first_success_cta_clicked',
  'activation_first_success_blocked_shown',
  'activation_first_success_retry_clicked',
  'activation_first_success_recovered',
  'activation_first_success_deferred',
  'activation_first_success_blocked_continue_clicked',
  'starter_template_selected',
  'starter_plan_generation_started',
  'starter_plan_generation_succeeded',
  'starter_plan_generation_failed',
  'starter_plan_preview_viewed',
  'starter_plan_saved',
  'child_access_completed',
  'child_profile_created',
  'child_pin_created',
  'child_view_opened',
  'child_handoff_started',
  'child_handoff_reminder_landed',
  'child_session_started',
  'child_handoff_skipped',
  'shared_device_picker_shown',
  'shared_device_child_selected',
  'device_setup_shown',
  'device_role_selected',
  'device_start_mode_changed',
  'device_access_revoked',
  'child_context_switched',
  'child_context_restore_failed',
  'stale_child_response_discarded',
  'child_access_denied',
  'adult_privilege_unlock_started',
  'adult_privilege_unlock_success',
  'adult_privilege_unlock_failed',
  'adult_privilege_expired',
  'widget_configured',
  'widget_rendered',
  'widget_completion_started',
  'widget_completion_succeeded',
  'widget_completion_failed',
  'widget_binding_revoked',
  'widget_refresh_failed',
  'widget_child_switched',
  'widget_child_switch_failed',
  'onboarding_handoff_film_shown',
  'onboarding_handoff_film_complete',
  'onboarding_handoff_film_cta_try',
  'onboarding_handoff_film_cta_later',
  'onboarding_handoff_film_preview_shown',
  'onboarding_handoff_film_preview_cta_try',
  'onboarding_handoff_film_preview_cta_later',
  'onboarding_handoff_opened',
  'first_completion_recorded',
  'referral_link_shared',
  'referral_signup',
  'referral_qualified',
  'referral_shown',
  'referral_copied',
  'referral_landing',
  'referral_created',
  'adult_invite_sent',
  'adult_invite_accepted',
  'weekly_highlight_shown',
  'weekly_highlight_shared',
  'growth_feedback_shown',
  'growth_feedback_dismissed',
  'growth_feedback_submitted',
  'waitlist_signup',
  'waitlist_launch_invite',
  'waitlist_account_signup',
  'waitlist_child_created',
  'waitlist_first_success',
  'activation_nudge_sent',
  'retention_reengagement_push_sent',
  // FEAT-1 boendeschema
  'custody_home_selected',
  'custody_week_variant_changed',
  'custody_schedule_created',
  'custody_schedule_updated',
  'custody_filter_changed',
  'custody_view_filtered',
  'custody_banner_seen',
  'print_schema_exported',
  // Engine coach governance (engine-coach.js, engine-client.js)
  'engine_coach_cta_click',
  'engine_authority_conflict',
  // Family Journey coach (journey-coach.js)
  'journey_coach_cta_click',
  // i18n language launch (P-i18n-Language-Launch-Foundation)
  'language_choice_viewed',
  'language_selected',
  'existing_family_language_offer_viewed',
  'existing_family_language_offer_accepted',
  'existing_family_language_offer_declined',
  'existing_family_language_offer_remind_later',
  'language_changed',
  'english_beta_banner_viewed',
  'language_issue_report_opened',
  'language_issue_report_submitted',
  'i18n_missing_key',
  'i18n_fallback_visible',
]);

/**
 * POST /api/analytics/event
 * Body: { event_type: string, metadata?: object }
 *
 * Authenticated: uses req.user.familyId.
 * Unauthenticated: uses a session nonce from body (for landing-page visits).
 */
router.post('/event', optionalAuth, async (req, res) => {
  try {
    const { event_type, metadata = {}, session_id } = req.body || {};
    if (!event_type || !ALLOWED_CLIENT_EVENTS.has(event_type)) return;

    // Use authenticated family_id when available, else fall back to session_id nonce
    const familyId = req.user?.familyId || (typeof session_id === 'string' ? session_id : null);
    if (!familyId) return;

    analytics.track(familyId, event_type, enrichActorMetadata(metadata, req.user));
    // N7: win-back attribution requires an authenticated familyId — an unauthenticated
    // session_id nonce is client-supplied and would let anyone spoof `returned_at`.
    if (req.user?.familyId) {
      await maybeMarkWinBackReturnedFromEngagement(req.user.familyId, event_type);
    }
  } catch (_) {
    // analytics must never fail the caller
  } finally {
    res.status(204).end();
  }
});

module.exports = router;
