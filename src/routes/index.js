/**
 * Route registry — mounts all API and page routes on the Express app.
 * Does NOT own: middleware, server startup, scheduler management (server.js).
 */

/**
 * Mount all routes on an Express app instance.
 * Called once from server.js after all middleware is configured.
 * @param {import('express').Express} app
 */
function registerRoutes(app) {
  const { isBillingUiEnabled } = require('../lib/billing-ui');
  // ─── API Routes ───────────────────────────────────────────

  // Journey Context (parent) — before child /api/me routers whose requireChild middleware
  // would otherwise block GET /api/me/journey-context for parents.
  app.use('/api/me', require('./journey-context'));
  const platformFeedback = require('./platform-feedback');
  app.use('/api/me', platformFeedback.childRouter);
  app.use('/api/family', platformFeedback.parentRouter);
  app.use('/api/me', require('./morgonhus').childRouter);
  app.use('/api/me', require('./garden').childRouter);

  // Mount /api/me child-self routes before the children router's /:childId catch-all.
  app.use('/api/me', require('./daily-logs').childSelfRouter);
  app.use('/api/me', require('./rewards').childRouter);
  app.use('/api/me', require('./goals').childRouter);
  app.use('/api/me', require('./ratings').childRouter);
  app.use('/api/me/transition-support', require('./transition-support'));
  app.use('/api/me/activation-program', require('./activation-program'));
  const childUniverse = require('./child-universe');
  app.use('/api/me', childUniverse.childRouter);
  app.use('/api/family', childUniverse.parentRouter);
  const familyHall = require('./family-hall');
  app.use('/api/me', familyHall.childRouter);
  app.use('/api/family', familyHall.parentRouter);
  app.use('/api/family', familyHall.memoryRouter);

  app.use('/api/events', require('./events'));
  app.use('/api/auth', require('./auth'));
  app.use('/api/family', require('./family'));
  app.use('/api/children', require('./children'));
  app.use('/api/children', require('./mood-summary'));
  app.use('/api/children', require('./observations'));
  app.use('/api/observations', require('./observations')); // PATCH /:id, DELETE /:id (child-scoped)
  app.use('/api/general-observations', require('./general-observations')); // family-level general observations
  app.use('/api/account', require('./account'));
  app.use('/api/categories', require('./categories'));
  app.use('/api/activities', require('./activities'));
  app.use('/api/activity-templates', require('./activities')); // backward-compat alias
  app.use('/api/pictograms', require('./pictograms'));
  app.use('/api/onboarding', require('./onboarding'));
  app.use('/api/standard-library', require('./standard-library'));

  // Weekly schedule routes (child-scoped, schedule-scoped, and family-level templates)
  const schedules = require('./schedules');
  app.use('/api/children/:childId/schedules', schedules.childRouter);
  app.use('/api/schedules/:scheduleId/items', schedules.scheduleRouter);
  app.use('/api/schedule-templates', schedules.familyRouter);

  // Special day schedule routes
  const specialDays = require('./special-day-schedules');
  app.use('/api/children/:childId/special-days', specialDays.childRouter);
  app.use('/api/special-day-schedules/:scheduleId/items', specialDays.scheduleRouter);

  // Daily log routes (parent-scoped)
  const dailyLogs = require('./daily-logs');
  app.use('/api/children', dailyLogs.childRouter);
  app.use('/api/daily-log-items', dailyLogs.itemRouter);
  app.use('/api/daily-logs', dailyLogs.logRouter);

  // Rewards + redemptions (parent-scoped)
  const rewards = require('./rewards');
  app.use('/api/rewards', rewards.parentRouter);

  // Goals, manual stars, goal change requests (parent-scoped)
  app.use('/api/rewards', require('./goals').parentRouter);

  // Image upload for manual star grants
  app.use('/api/upload', require('./upload'));

  // Ratings routes
  const ratings = require('./ratings');
  app.use('/api/daily-log-items', ratings.parentRouter);
  app.use('/api/messages', require('./messages'));
  app.use('/api/notifications', require('./notification-log'));

  // Landing page API (before public router to catch /api/landing/*)
  app.use(require('./landing'));
  app.use('/api', require('./public'));
  app.use('/api/feedback', require('./feedback'));
  app.use('/api/consent', require('./consent'));
  app.use('/api/reminders', require('./reminders'));
  app.use('/api/push', require('./push'));
  app.use('/api/dagens-nyhet', require('./dagens-nyhet'));
  app.use('/api/newsletter', require('./newsletter'));
  app.use('/api/analytics', require('./analytics'));
  app.use('/api/subscription', require('./subscription'));
  app.use('/api/pedagog-notes', require('./pedagog-notes'));
  app.use('/api/pedagog/daily-log', require('./pedagog-daily-log'));
  app.use('/api/pedagog/day-comments', require('./pedagog-day-comments'));
  app.use('/api/pedagog/school-activities', require('./pedagog-school-activities'));
  app.use('/api/pedagog/absence', require('./pedagog-absence'));
  app.use('/api/pedagog-invite', require('./pedagog-invite'));
  app.use('/api/features', require('./features'));
  app.use('/api/for-dig', require('./for-dig'));

  // RevenueCat IAP config (native clients only)
  app.use('/api/iap', require('./iap'));

  // Professional share-link reports (authenticated parent API)
  app.use('/api/reports', require('./reports'));

  // Surveys + admin router (admin mounted LAST so it takes priority over /api/features/:slug)
  const surveys = require('./surveys');
  app.use('/api/admin/surveys', surveys.adminRouter);
  app.use('/api/admin', require('./admin'));
  app.use('/api/admin/images', require('./admin/images'));
  app.use('/api/surveys', surveys.publicRouter);
  app.use('/api/children/:childId', require('./calendar'));

  const { join } = require('path');
  const childDashboardHtml = join(__dirname, '../../public', 'child-dashboard.html');

  // Barnmeny v2 — must register before /child/:childId A/B router in static-routes
  app.get('/child/today', (req, res) => res.sendFile(childDashboardHtml));
  app.get('/child/world', (req, res) => res.sendFile(childDashboardHtml));
  app.get('/child/family', (req, res) => res.sendFile(childDashboardHtml));

  // ─── PWA + child view routes ─────────────────────────────────
  app.use('/', require('./static-routes'));

  // ─── Feature-gated HTML pages (/reports, /pedagog-note) ─
  app.use(require('./feature-gated-pages'));

  // ─── Professional share-link report ─────────────────────
  app.get('/r/:publicId', (req, res) => {
    res.sendFile(require('path').join(__dirname, '../../public', 'professional-report.html'));
  });

  // ─── SPA fallback for app pages ───────────────────────────
  const appPages = [
    'login', 'child-login',
    'verify-email', 'forgot-password', 'reset-password', 'verify-email-change',
    'dashboard', 'child-dashboard',
    'settings', 'accept-invite', 'pedagog-invite',
    'activities', 'library', 'for-dig', 'schedule', 'assign-schedule', 'daily-log',
    'family', 'calendar', 'onboarding', 'child-wizard', 'notifications',
    'planning', 'rewards', 'family-child', 'print-schema',
  ];
  app.get('/upgrade', async (req, res) => {
    const billingOk = await isBillingUiEnabled();
    if (!billingOk) return res.redirect(302, '/dashboard');
    res.redirect(302, '/settings#prenumeration');
  });

  app.get('/payment-success', async (req, res) => {
    const billingOk = await isBillingUiEnabled();
    if (!billingOk) return res.redirect(302, '/dashboard');
    res.redirect(302, '/settings#prenumeration');
  });

  app.get('/upgrade/success', async (req, res) => {
    const billingOk = await isBillingUiEnabled();
    if (!billingOk) return res.redirect(302, '/dashboard');
    res.redirect(302, '/settings#prenumeration');
  });

  app.get('/child-dashboard', (req, res) => {
    res.redirect(302, '/child/today');
  });

  app.get('/child-settings', (req, res) => {
    const id = req.query.id;
    if (id) {
      return res.redirect(302, '/family/child/' + encodeURIComponent(id) + '?tab=setup');
    }
    return res.redirect(302, '/family');
  });

  app.get('/family/child/:childId', (req, res) => {
    res.sendFile(join(__dirname, '../../public', 'family-child.html'));
  });

  for (const page of appPages) {
    app.get(`/${page}`, (req, res) => {
      res.sendFile(join(__dirname, '../../public', `${page}.html`));
    });
  }

  // Universal link /invite/{token} → accept-invite page (email uses ?token= query form)
  app.get('/invite/:token', (req, res) => {
    res.redirect(302, `/accept-invite?token=${encodeURIComponent(req.params.token)}`);
  });

  // Legacy child short paths → barnmeny v2 routes
  app.get('/today', (req, res) => res.redirect(302, '/child/today'));
  app.get('/universe', (req, res) => res.redirect(302, '/child/world'));
  app.get('/family-week', (req, res) => res.redirect(301, '/schedule?view=family'));

  app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, '../../public', 'admin/index.html'));
  });

  // Feature flag development pages (admin/development, admin/development/:slug)
  app.use(require('./development-pages'));

  // Survey pages: /tyck/:slug → tyck.html, /tyck → SMS shortlink redirect
  app.use('/tyck', require('./surveys').shortlinkRouter);

  // public-pages mounted once in app.js (after API routes + static)
}

module.exports = { registerRoutes };