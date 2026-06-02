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
const subscriptionSettingsRouter = require('./admin/subscription-settings');
const emailLogRouter = require('./admin/email-log');
const landingNewsRouter = require('./admin/landing-news');
const migrationExportRouter = require('./admin/migration-export');
const databaseExportRouter = require('./admin/database-export');

router.use(familyRouter);
router.use(migrationExportRouter);
router.use(databaseExportRouter);
router.use(featuresRouter);
router.use('/subscription-settings', subscriptionSettingsRouter);
router.use('/landing-news', landingNewsRouter);
router.use(childRouter);
router.use(scheduleRouter);
router.use(rewardRouter);
router.use(systemRouter);
router.use(analyticsRouter);
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
