/**
 * Checkpoint definitions for scripts/smoke-mobile-full-qa.mjs
 * Maps to docs/QA-mobil-fullstandig-protokoll.md v1.2
 */

import {
  FULL_AUTO_IDS,
  GATE_PARENT_ROUTES,
  Z14_BUNDLES,
} from './qa-gate-ids.mjs';

export { GATE_PARENT_ROUTES, Z14_BUNDLES, FULL_AUTO_IDS };

export const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** @deprecated use FULL_AUTO_IDS */
export const AUTO_IDS = FULL_AUTO_IDS;

export const REDIRECT_CHECKS = [
  { id: 'U03', from: '/today', locationIncludes: '/child/today' },
  { id: 'U04', from: '/universe', locationIncludes: '/child/world' },
  { id: 'U05', from: '/family-week', locationIncludes: '/schedule' },
  { id: 'O08', from: '/child-dashboard', locationIncludes: '/child/today' },
  { id: 'I02', from: '/skattkammaren', urlIncludes: '/rewards', browserOnly: true },
  { id: 'L14', from: '/child-settings?id=test', urlIncludes: '/family/child' },
];

export const PARENT_ROUTES = [
  { id: 'D01', path: '/dashboard', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'E01', path: '/planning', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'I01', path: '/rewards', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'J01', path: '/for-dig', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'K01', path: '/family', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'F01', path: '/daily-log', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'G01', path: '/schedule', waitExpr: 'typeof window.renderSpecialDaysCalendar === "function"' },
  { id: 'H01', path: '/library', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'E04', path: '/library', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'E05', path: '/calendar', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'E06', path: '/assign-schedule', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'H10', path: '/activities', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'N01', path: '/settings', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'N12', path: '/notifications', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'M01', path: '/reports', waitExpr: 'document.body.innerText.length > 40', allow403: true },
];

export const PUBLIC_ROUTES = [
  { id: 'B01', path: '/' },
  { id: 'B02', path: '/login' },
  { id: 'B03', path: '/child-login' },
  { id: 'B05', path: '/faq' },
  { id: 'U09', path: '/offline.html' },
];
