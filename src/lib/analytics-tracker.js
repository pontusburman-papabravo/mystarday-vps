/**
 * Analytics tracker — thin wrapper around db/analytics.track().
 * Import this in routes to fire events without coupling to the DB layer directly.
 * All functions are fire-and-forget: they never throw, never block the response.
 */

const analytics = require('../../db/analytics');

// ─── Onboarding funnel ────────────────────────────────────

function trackLandingVisit(familyId) {
  analytics.track(familyId, 'funnel_landing_visit');
}

function trackSignupStarted(familyId) {
  analytics.track(familyId, 'funnel_signup_started');
}

function trackEmailVerified(familyId) {
  analytics.track(familyId, 'funnel_email_verified');
}

function trackFirstChildCreated(familyId) {
  analytics.track(familyId, 'funnel_first_child_created');
}

function trackOnboardingCompleted(familyId) {
  analytics.track(familyId, 'funnel_onboarding_completed');
}

function trackFunnelOnboardingStarted(familyId, metadata = {}) {
  analytics.track(familyId, 'funnel_onboarding_started', metadata);
}

function trackOnboardingAbandoned(familyId, step) {
  analytics.track(familyId, 'funnel_onboarding_abandoned', { step });
}

// ─── Win-back email ────────────────────────────────────────

function trackWinBackEmailSent(familyId, childName, metadata = {}) {
  analytics.track(familyId, 'win_back_email_sent', { child_name: childName, ...metadata });
}

function trackWinBackReturned(familyId, metadata = {}) {
  analytics.track(familyId, 'win_back_returned', metadata);
}

// ─── Feature usage ────────────────────────────────────────

function trackChildView(familyId) {
  analytics.track(familyId, 'feature_child_view');
}

function trackTreasureChest(familyId) {
  analytics.track(familyId, 'feature_treasure_chest');
}

function trackScheduleEdit(familyId) {
  analytics.track(familyId, 'feature_schedule_edit');
}

function trackDailyLog(familyId) {
  analytics.track(familyId, 'feature_daily_log');
}

// ─── PWA ─────────────────────────────────────────────────

function trackPwaInstalled(familyId) {
  analytics.track(familyId, 'pwa_installed');
}

function trackPwaBrowser(familyId) {
  analytics.track(familyId, 'pwa_browser');
}

// ─── Newsletter ───────────────────────────────────────────

function trackNewsletterSent(familyId, metadata = {}) {
  analytics.track(familyId, 'newsletter_sent', metadata);
}

function trackNewsletterUnsubscribed(familyId) {
  analytics.track(familyId, 'newsletter_unsubscribed');
}

// ─── Activation program (Fas 2+) ───────────────────────────

function trackParentAhaMomentDismissed(familyId, metadata = {}) {
  analytics.track(familyId, 'parent_aha_moment_dismissed', metadata);
}

// ─── ACT-1 activation funnel ──────────────────────────────

function trackActivationOnboardingStarted(familyId, metadata = {}) {
  analytics.track(familyId, 'activation_onboarding_started', metadata);
}

function trackStarterTemplateSelected(familyId, metadata = {}) {
  analytics.track(familyId, 'starter_template_selected', metadata);
}

function trackStarterPlanSaved(familyId, metadata = {}) {
  analytics.track(familyId, 'starter_plan_saved', metadata);
}

function trackChildAccessCompleted(familyId, metadata = {}) {
  analytics.track(familyId, 'child_access_completed', metadata);
}

function trackFirstCompletionRecorded(familyId, metadata = {}) {
  analytics.track(familyId, 'first_completion_recorded', metadata);
}

function trackActivationAchieved48h(familyId, metadata = {}) {
  analytics.track(familyId, 'activation_achieved_48h', metadata);
}

module.exports = {
  trackLandingVisit,
  trackSignupStarted,
  trackEmailVerified,
  trackFirstChildCreated,
  trackOnboardingCompleted,
  trackFunnelOnboardingStarted,
  trackOnboardingAbandoned,
  trackChildView,
  trackTreasureChest,
  trackScheduleEdit,
  trackDailyLog,
  trackPwaInstalled,
  trackPwaBrowser,
  trackNewsletterSent,
  trackNewsletterUnsubscribed,
  trackWinBackEmailSent,
  trackWinBackReturned,
  trackParentAhaMomentDismissed,
  trackActivationOnboardingStarted,
  trackStarterTemplateSelected,
  trackStarterPlanSaved,
  trackChildAccessCompleted,
  trackFirstCompletionRecorded,
  trackActivationAchieved48h,
};
