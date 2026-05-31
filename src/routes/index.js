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
  // ─── API Routes ───────────────────────────────────────────

  // Mount /api/me routes FIRST so child-self endpoints (daily-log, rewards, goals, ratings)
  // are matched before the children router's /:childId catch-all can intercept them.
  // This prevents /api/me/rewards from being caught by children.js/:childId
  // (which would try to query "rewards" as a UUID → 500 error).
  app.use('/api/me', require('./daily-logs').childSelfRouter);
  app.use('/api/me', require('./rewards').childRouter);
  app.use('/api/me', require('./goals').childRouter);
  app.use('/api/me', require('./ratings').childRouter);

  app.use('/api/events', require('./events'));
  app.use('/api/stripe', require('./stripe-webhook'));
  app.use('/api/stripe', require('./stripe-checkout'));
  app.use('/api/auth', require('./auth'));
  app.use('/api/family', require('./family'));
  app.use('/api/children', require('./children'));
  app.use('/api/children', require('./observations'));
  app.use('/api/observations', require('./observations')); // PATCH /:id, DELETE /:id (child-scoped)
  app.use('/api/general-observations', require('./general-observations')); // family-level general observations
  app.use('/api/account', require('./account'));
  app.use('/api/categories', require('./categories'));
  app.use('/api/activities', require('./activities'));
  app.use('/api/activity-templates', require('./activities')); // backward-compat alias
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
  app.use('/api/me', ratings.childRouter);
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
  app.use('/api/pedagog-invite', require('./pedagog-invite'));
  app.use('/api/features', require('./features'));

  // RevenueCat IAP config (native clients only)
  app.use('/api/iap', require('./iap'));

  // Professional share-link reports (authenticated parent API)
  app.use('/api/reports', require('./reports'));

  // Surveys + admin router (admin mounted LAST so it takes priority over /api/features/:slug)
  const surveys = require('./surveys');
  app.use('/api/admin/surveys', surveys.adminRouter);
  app.use('/api', require('./stripe-setup'));
  app.use('/api/admin', require('./admin'));
  app.use('/api/admin/images', require('./admin/images'));
  app.use('/api/surveys', surveys.publicRouter);
  app.use('/api/children/:childId', require('./calendar'));

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
    'settings', 'accept-invite', 'pedagog-invite', 'upgrade',
    'activities', 'library', 'schedule', 'assign-schedule', 'daily-log',
    'family', 'calendar', 'onboarding', 'child-settings', 'child-wizard', 'notifications',
  ];
  const { join } = require('path');
  for (const page of appPages) {
    app.get(`/${page}`, (req, res) => {
      res.sendFile(join(__dirname, '../../public', `${page}.html`));
    });
  }
  app.get('/family-week', (req, res) => res.redirect(301, '/schedule?view=family'));

  app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, '../../public', 'admin/index.html'));
  });

  // Feature flag development pages (admin/development, admin/development/:slug)
  app.use(require('./development-pages'));

  // Survey pages: /tyck/:slug → tyck.html, /tyck → SMS shortlink redirect
  app.use('/tyck', require('./surveys').shortlinkRouter);

  // ─── Payment & upgrade ───────────────────────────────────────
  app.use('/payment', require('./payment'));
  app.use('/upgrade', require('./upgrade-success'));

  // Public static pages (privacy policy, professional landing page)
  app.use(require('./public-pages'));
}

module.exports = { registerRoutes };