/**
 * Checkpoint manifest for scripts/smoke-prod-full-qa.mjs
 * Edit here when routes or window.* entry points change.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Parse STATIC_ASSETS array from public/sw.js */
export function readSwPrecacheAssets() {
  const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
  const m = sw.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

export function readSwCacheName() {
  const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
  const m = sw.match(/const CACHE_NAME = '([^']+)'/);
  return m ? m[1] : 'stjarndag-v312';
}

/** All HTML files under public/ → URL paths to request */
export function discoverHtmlPagePaths() {
  const out = new Set();
  function walk(dir, prefix = '') {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(path.join(dir, ent.name), rel);
      else if (ent.name.endsWith('.html')) out.add(`/${rel}`);
    }
  }
  walk(path.join(ROOT, 'public'));
  // SPA clean URLs (also served without .html)
  const spaAliases = [
    '/login', '/register', '/dashboard', '/schedule', '/family', '/planning',
    '/rewards', '/reports', '/settings', '/activities', '/library', '/calendar',
    '/daily-log', '/onboarding', '/child-wizard', '/notifications', '/for-dig',
    '/assign-schedule', '/child-login', '/accept-invite', '/pedagog-invite',
    '/verify-email', '/forgot-password', '/reset-password', '/child/today',
    '/child/world', '/child/family', '/admin', '/admin/development',
    '/pricing-info', '/offline', '/faq', '/terms', '/privacy', '/kontakt',
    '/en', '/barn-stod', '/samarbete', '/pedagoger-och-terapeuter',
    '/skattkammaren', '/skattkammaren-parent', '/family-week', '/activation-enroll',
    '/pedagog-note', '/pedagog-oversikt', '/pedagog-historik', '/pedagog-dag',
    '/upgrade', '/payment-success', '/upgrade-success', '/tyck', '/',
  ];
  spaAliases.forEach((p) => out.add(p));
  return [...out].sort();
}

export const REDIRECT_CHECKS = [
  { from: '/child-dashboard', status: [301, 302], locationIncludes: '/child/today' },
  { from: '/today', status: [301, 302], locationIncludes: '/child/today' },
  { from: '/universe', status: [301, 302], locationIncludes: '/child/world' },
  { from: '/family-week', status: [301, 302], locationIncludes: '/schedule' },
  // /skattkammaren → /rewards is client-side (deep-link-router); checked in browser phase
  { from: '/upgrade', status: [301, 302], locationIncludes: '/dashboard' },
  { from: '/payment-success', status: [301, 302], locationIncludes: '/dashboard' },
];

export const PUBLIC_API_CHECKS = [
  { method: 'GET', path: '/health', expect: 200, jsonKey: 'status' },
  { method: 'GET', path: '/api/app-config', expect: 200 },
  { method: 'GET', path: '/api/i18n/sv', expect: 200 },
  { method: 'GET', path: '/api/auth/csrf-token', expect: 200 },
  { method: 'GET', path: '/api/family-count', expect: 200 },
  { method: 'GET', path: '/api/registration-status', expect: 200 },
  { method: 'GET', path: '/api/public/pricing-info', expect: 200 },
  { method: 'GET', path: '/api/public/program-catalog', expect: 200 },
  { method: 'GET', path: '/api/landing/stats', expect: 200 },
  { method: 'GET', path: '/api/dagens-nyhet/active', expect: [200, 204] },
  { method: 'GET', path: '/api/push/vapid-public-key', expect: 200 },
];

/** Must return 401 without session */
export const ANON_GUARD_API_CHECKS = [
  '/api/auth/me',
  '/api/family',
  '/api/children',
  '/api/activities',
  '/api/rewards',
  '/api/notifications',
  '/api/account/status',
  '/api/subscription/status',
];

export const FAS8_SPLIT_JS = [
  'dashboard-dnd.js', 'dashboard-activity-modal.js', 'dashboard-views.js',
  'dashboard-copy-modals.js', 'dashboard-card-actions.js', 'dashboard-approvals.js',
  'dashboard-special-days.js', 'dashboard-cta.js', 'dashboard-star-history.js',
  'schedule-core.js', 'schedule-special-days.js', 'schedule-template-mode.js',
  'schedule-insert-fill.js', 'child-dashboard-rewards.js', 'child-dashboard-celebrations.js',
];

/** Parent API after login — static paths */
export const PARENT_API_STATIC = [
  ['GET', '/api/auth/me', 200],
  ['GET', '/api/auth/csrf-token', 200],
  ['GET', '/api/auth/login-picker-children', 200],
  ['GET', '/api/family', 200],
  ['GET', '/api/family/dashboard-stats', 200],
  ['GET', '/api/family/subscription-status', 200],
  ['GET', '/api/family/readiness', 200],
  ['GET', '/api/family/star-history', 200],
  ['GET', '/api/children', 200],
  ['GET', '/api/activities', 200],
  ['GET', '/api/rewards', 200],
  ['GET', '/api/features', 200],
  ['GET', '/api/notifications', 200],
  ['GET', '/api/notifications/unread-count', 200],
  ['GET', '/api/messages/unread', 200],
  ['GET', '/api/for-dig/goals', 200],
  ['GET', '/api/for-dig/installs', 200],
  ['GET', '/api/for-dig/popular', 200],
  ['GET', '/api/for-dig/favorites', 200],
  ['GET', '/api/schedule-templates', 200],
  ['GET', '/api/categories', 200],
  ['GET', '/api/account/notifications', 200],
  ['GET', '/api/account/status', 200],
  ['GET', '/api/subscription/status', 200],
  ['GET', '/api/subscription/access', 200],
  ['GET', '/api/iap/config', 200],
  ['GET', '/api/standard-library', 200],
  ['GET', '/api/standard-library/schedules', 200],
  ['GET', '/api/standard-library/rewards', 200],
  ['GET', '/api/reminders', 200],
  ['GET', '/api/consent', 200],
  ['GET', '/api/push/preferences', 200],
  ['GET', '/api/dagens-nyhet/banner', [200, 204]],
];

/** Per parent browser route: path, optional wait expr, window fns, globals */
export const PARENT_BROWSER_ROUTES = [
  {
    path: '/dashboard',
    waitExpr: 'typeof window.initDragDrop === "function"',
    windowFns: [
      'initDragDrop', 'loadTemplates', 'renderTimeline', 'openGiveStarsModal',
      'openCopyDayModal', 'loadStarHistory', 'renderSpecialDaysCalendar',
    ],
    globals: ['NavConfig'],
  },
  {
    path: '/planning',
    waitExpr: '!!window.NavConfig',
    globals: ['NavConfig'],
  },
  {
    path: '/rewards',
    waitExpr: 'document.body.innerText.length > 100',
    globals: ['NavConfig'],
  },
  {
    path: '/family',
    waitExpr: 'document.body.innerText.length > 100',
    globals: ['NavConfig'],
  },
  {
    path: '/schedule',
    waitExpr: 'typeof window.renderSpecialDaysCalendar === "function"',
    windowFns: [
      'renderSpecialDaysCalendar', 'openTemplateModal', 'openFillWeekModal',
      'loadSpecialDays', 'openInsertDayModal',
    ],
    globals: ['ScheduleCore'],
  },
  {
    path: '/reports',
    waitExpr: 'document.body.innerText.length > 80',
  },
  {
    path: '/settings',
    waitExpr: 'document.body.innerText.length > 80',
    globals: ['NavConfig'],
  },
  {
    path: '/activities',
    waitExpr: 'document.body.innerText.length > 80',
  },
  {
    path: '/library',
    waitExpr: 'document.body.innerText.length > 80',
    globals: ['LibraryMagicHub'],
  },
  {
    path: '/calendar',
    waitExpr: 'document.body.innerText.length > 80',
  },
  {
    path: '/daily-log',
    waitExpr: 'document.body.innerText.length > 80',
  },
  {
    path: '/notifications',
    waitExpr: 'document.body.innerText.length > 80',
  },
  {
    path: '/for-dig',
    waitExpr: 'document.body.innerText.length > 80',
  },
  {
    path: '/assign-schedule',
    waitExpr: 'document.body.innerText.length > 80',
  },
];

export const CHILD_BROWSER_CHECKS = {
  windowFns: ['loadRewards', 'renderSkattkammaren', 'openGoalPicker', 'coalescedLoadDay'],
  globals: ['ChildWorlds', 'ChildActivityEngine', 'ChildLayerRouter'],
  minWorldNavButtons: 3,
  worldIds: ['today', 'world', 'family'],
  forbidApiPattern: 'daily-log?date=null',
};

export const CONTRACT_TEST_FILES = [
  'test/dashboard-split.test.js',
  'test/dashboard-views.test.js',
  'test/dashboard-copy-modals.test.js',
  'test/dashboard-card-actions.test.js',
  'test/dashboard-approvals.test.js',
  'test/dashboard-special-days.test.js',
  'test/dashboard-cta.test.js',
  'test/dashboard-star-history.test.js',
  'test/schedule-child-split.test.js',
  'test/child-loadday-null-date.test.js',
  'test/child-dashboard-celebrations.test.js',
  'test/vuxenmeny-v2.test.js',
  'test/barnmeny-v2.test.js',
  'test/security.test.js',
  'test/route-inventory.test.js',
];
