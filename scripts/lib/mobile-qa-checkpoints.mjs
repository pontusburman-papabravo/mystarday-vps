/**
 * Checkpoint definitions for scripts/smoke-mobile-full-qa.mjs
 * Maps to docs/QA-mobil-fullstandig-protokoll.md (200 test points)
 */

export const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** Automated checkpoint IDs from the QA protocol */
export const AUTO_IDS = [
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08',
  'B01', 'B02', 'B03', 'B04', 'B05',
  'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C09', 'C10',
  'D01', 'D02', 'D04', 'D05', 'D08', 'D11', 'D14', 'D15',
  'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E10',
  'F01', 'F14', 'F15',
  'G01', 'G10', 'G11',
  'H01', 'H10', 'H12',
  'I01', 'I02', 'I11', 'I13',
  'J01', 'J08',
  'K01', 'K02', 'K11',
  'L01', 'L02', 'L14',
  'M01',
  'N01', 'N09', 'N12', 'N14',
  'O01', 'O08', 'O09', 'O10',
  'P01', 'P11', 'P12',
  'Q01', 'Q11',
  'R01', 'R06',
  'S08', 'S09', 'S10',
  'T09',
  'U01', 'U02', 'U03', 'U04', 'U05', 'U09',
];

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
