// Admin router — mounts all admin sub-routers.
// Does NOT own business logic — only delegates to specialized modules:
// - admin/family.js (families, parents, invites, members)
// - admin/child.js (children, PIN lockout, PIN audit)
// - admin/schedule.js (activity templates, default schedules, retention)
// - admin/reward.js (default rewards library)
// - admin/system.js (stats, config, feature flags, messages, push)
// - admin/email-templates.js (email template CRUD for undersokning/valkomstmail/nyhetsbrev)
// - admin/professional-interest.js (list professional interest submissions)
// - admin/user-stats.js (parent/child/pedagog statistics)
// - admin/waitlist.js (English waitlist signups + survey responses)

const express = require('express');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin check to all admin routes
router.use(requireAdmin);

// Mount sub-routers (no path prefix; routes include full paths like /families, /default-templates, etc.)
const familyRouter = require('./admin/family');
const childRouter = require('./admin/child');
const scheduleRouter = require('./admin/schedule');
const rewardRouter = require('./admin/reward');
const systemRouter = require('./admin/system');
const analyticsRouter = require('./admin/analytics');
const welcomeEmailRouter = require('./admin/welcome-email');
const emailTemplatesRouter = require('./admin/email-templates');
const professionalInterestRouter = require('./admin/professional-interest');
const userStatsRouter = require('./admin/user-stats');
const waitlistRouter = require('./admin/waitlist');
const featuresRouter = require('./admin/features');
const familyComponentsRouter = require('./admin/family-components');
const subscriptionSettingsRouter = require('./admin/subscription-settings');
const packageRolloutRouter = require('./admin/package-rollout');
const packageInterestRouter = require('./admin/package-interest');
const subscriptionStatsRouter = require('./admin/subscription-stats');
const packagesRouter = require('./admin/packages');
const emailLogRouter = require('./admin/email-log');
const landingNewsRouter = require('./admin/landing-news');
const migrationExportRouter = require('./admin/migration-export');
const databaseExportRouter = require('./admin/database-export');
const activationProgramRouter = require('./admin/activation-program');
const forDigRouter = require('./admin/for-dig');
const startSummaryRouter = require('./admin/start-summary');
const operationalAlertsRouter = require('./admin/operational-alerts');
const contactMessagesRouter = require('./admin/contact-messages');
const growthPipelineRouter = require('./admin/growth-pipeline');
const referralsRouter = require('./admin/referrals');
const familyOverviewRouter = require('./admin/family-overview');
const adminSearchRouter = require('./admin/admin-search');
const l1GovernanceRouter = require('./admin/l1-governance');
const journeyRolloutRouter = require('./admin/journey-rollout');
const journeyDailyAnalysisRouter = require('./admin/journey-daily-analysis');
const journeyMetricsRouter = require('./admin/journey-metrics');
const journeyRegistryRouter = require('./admin/journey-registry');
const localeAnalyticsRouter = require('./admin/locale-analytics');

router.use(familyRouter);
router.use(migrationExportRouter);
router.use(databaseExportRouter);
router.use(featuresRouter);
router.use('/subscription-settings', subscriptionSettingsRouter);
router.use(familyComponentsRouter);
router.use('/package-rollout', packageRolloutRouter);
router.use('/package-interest', packageInterestRouter);
router.use('/subscription-stats', subscriptionStatsRouter);
router.use('/packages', packagesRouter);
router.use('/landing-news', landingNewsRouter);
router.use(childRouter);
router.use(scheduleRouter);
router.use(rewardRouter);
router.use(systemRouter);
router.use(contactMessagesRouter);
router.use(growthPipelineRouter);
router.use(referralsRouter);
router.use(familyOverviewRouter);
router.use(adminSearchRouter);
router.use(l1GovernanceRouter);
router.use(startSummaryRouter);
router.use(operationalAlertsRouter);
router.use(analyticsRouter);
router.use(journeyRolloutRouter);
router.use(journeyDailyAnalysisRouter);
router.use(journeyMetricsRouter);
router.use(journeyRegistryRouter);
router.use(localeAnalyticsRouter);
router.use(activationProgramRouter);
router.use(forDigRouter);
router.use('/welcome-email', welcomeEmailRouter);
router.use('/email-templates', emailTemplatesRouter);
router.use('/email-log', emailLogRouter);
router.use(professionalInterestRouter);
router.use(userStatsRouter);
router.use(waitlistRouter);

// Log route registration on startup (verify welcome-email is mounted)
try {
  const welcomeRoutes = welcomeEmailRouter.stack
    .filter(r => r.route && r.route.path)
    .map(r => `${Object.keys(r.methods || {}).join(',').toUpperCase()} ${r.route.path}`);
  console.log('[ADMIN] welcome-email routes registered:', welcomeRoutes.join(' | ') || '(none)');
} catch (e) {
  console.error('[ADMIN] Could not log welcome-email routes:', e.message);
}

module.exports = router;
