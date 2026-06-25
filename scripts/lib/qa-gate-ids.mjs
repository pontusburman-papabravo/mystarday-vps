/**
 * Release Gate ID registry — single source of truth.
 * Sync with docs/QA-mobil-fullstandig-protokoll.md §0 and §Z.
 */

/** Explicit §0 Release Gate IDs (56 rows; doc rounds to ~48 with range notation) */
export const GATE_IDS = [
  'A01', 'A05', 'A06', 'A07', 'A08',
  'C01', 'C02', 'C04', 'C10',
  'Z01',
  'D01', 'D02', 'D11',
  'E01', 'E02', 'E03',
  'F01', 'F04', 'F05', 'F07', 'F08',
  'G01', 'G04', 'G05',
  'I01', 'I03', 'I04',
  'K01', 'K02', 'K03',
  'L01', 'L02', 'L07', 'L08',
  'O01', 'O03', 'O06',
  'P01', 'P03', 'P04',
  'Q01', 'Q04',
  'R01',
  'S02', 'S04', 'S05', 'S07',
  'T01', 'T02', 'T04', 'T05',
  'U01', 'U02',
  'Z04', 'Z05', 'Z06',
];

export const GATE_ID_SET = new Set(GATE_IDS);

/** §Z client boot contracts (full regression) */
export const Z_IDS = [
  'Z01', 'Z02', 'Z03', 'Z04', 'Z05', 'Z06', 'Z07',
  'Z08', 'Z09', 'Z10', 'Z11', 'Z12', 'Z13', 'Z14',
];

/** Gate subset of Z (also listed individually as Z01, Z04–Z06 in GATE_IDS) */
export const GATE_Z_IDS = ['Z01', 'Z04', 'Z05', 'Z06'];

/** Gate rows still requiring manual checkbox in runbook (UI/PG-heavy) */
export const GATE_MANUAL_IDS = [
  'G04', 'G05',
  'I04',
  'K03',
  'L07', 'L08',
  'S02', 'S04', 'S05', 'S07',
  'T02', 'T04', 'T05',
];

export const GATE_AUTO_IDS = GATE_IDS.filter((id) => !GATE_MANUAL_IDS.includes(id));

/** Full-regression automated checkpoint IDs (non-gate smoke) */
export const FULL_AUTO_IDS = [
  'A01', 'A02', 'A03', 'A05', 'A06', 'A07', 'A08',
  'B01', 'B02', 'B03', 'B04', 'B05',
  'C01', 'C02', 'C04', 'C05', 'C09', 'C10',
  'D01', 'D02', 'D11', 'D14', 'D15',
  'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E10',
  'F01', 'F04', 'F05', 'F07', 'F08', 'F14', 'F15',
  'G01',
  'H01', 'H10',
  'I01', 'I02', 'I03', 'I11', 'I13',
  'J01', 'J08',
  'K01', 'K02', 'K11',
  'L01', 'L02', 'L14',
  'M01',
  'N01', 'N09', 'N12', 'N14',
  'O01', 'O03', 'O06', 'O08',
  'P01', 'P03', 'P04',
  'Q01', 'Q04',
  'R01', 'R06',
  'S10',
  'T01', 'T09',
  'U01', 'U02', 'U03', 'U04', 'U05', 'U09',
  ...Z_IDS,
];

/** Parent routes exercised in gate mode */
export const GATE_PARENT_ROUTES = [
  { id: 'D01', path: '/dashboard', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'E01', path: '/planning', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'F01', path: '/daily-log', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'G01', path: '/schedule', waitExpr: 'typeof window.renderSpecialDaysCalendar === "function"' },
  { id: 'I01', path: '/rewards', waitExpr: 'document.body.innerText.length > 80' },
  { id: 'K01', path: '/family', waitExpr: 'document.body.innerText.length > 80' },
];

/** Fas-8 split bundles checked by Z14 */
export const Z14_BUNDLES = [
  '/js/dashboard-cta.js',
  '/js/dashboard-dnd.js',
  '/js/dashboard-views.js',
  '/js/dashboard-approvals.js',
  '/js/child-dashboard-rewards.js',
];
