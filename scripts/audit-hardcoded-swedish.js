#!/usr/bin/env node
'use strict';

/**
 * Audit hardcoded Swedish product copy.
 *
 * Modes:
 *   node scripts/audit-hardcoded-swedish.js           # report all tiers
 *   node scripts/audit-hardcoded-swedish.js --strict  # fail on STRICT tier only
 *   node scripts/audit-hardcoded-swedish.js --baseline # fail if BASELINE count increases
 *
 * Tiers:
 *   STRICT   — i18n infrastructure; new Swedish user-facing copy blocks merge
 *   BASELINE — P0/P1 not yet migrated; tracked count must not grow
 *   REPORT   — admin/SEO/legal; informational only
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'audit-hardcoded-swedish-baseline.json');

const MODE_STRICT = process.argv.includes('--strict');
const MODE_BASELINE = process.argv.includes('--baseline');
const MODE_REPORT = !MODE_STRICT && !MODE_BASELINE;

const SWEDISH_RE = /[åäöÅÄÖ]/;

const STRICT_FILES = [
  'public/js/i18n.js',
  'public/js/locale-switcher.js',
  'public/js/auth-entry-failsafe.js',
  'public/js/auth-entry-i18n.js',
  'public/js/auth.js',
  'public/js/child-login.js',
  'public/js/login-locale.js',
  'public/js/google-auth-ui.js',
  'public/js/auth-login-platform.js',
  'public/js/onboarding-i18n.js',
  'public/js/onboarding.js',
  'public/js/onboarding-starter-plan.js',
  'public/js/onboarding-handoff-film.js',
  'public/js/onboarding-activity-guide.js',
  'public/js/onboarding-activation.js',
  'public/js/onboarding-first-star.js',
  'public/js/activation-program-enroll-choice.js',
  'public/onboarding.html',
  'src/lib/locale.js',
  'src/lib/i18n.js',
  'src/lib/i18n-flags.js',
  'src/lib/auth-email-locale.js',
  'src/lib/onboarding-locale.js',
  'src/lib/default-content/index.js',
  'src/routes/onboarding.js',
  'config/i18n/onboarding-en-GB.json',
  'public/js/parent-app-i18n.js',
  'public/js/locale-datetime.js',
  'public/js/dashboard-home-hub.js',
  'public/js/dashboard-daily-summary.js',
  'public/js/daily-log.js',
  'public/js/journey-coach.js',
  'public/js/home-readiness.js',
  'public/js/parent-home-locale-gate.js',
  'config/i18n/home-en-GB.json',
  'config/i18n/today-en-GB.json',
  'config/i18n/journey-en-GB.json',
  'config/i18n/time-en-GB.json',
  'public/js/child-app-i18n.js',
  'src/lib/child-ui-locale.js',
  'config/i18n/child-en-GB.json',
  'public/js/child-samling-yearbook.js',
  'public/js/child-samling-memory.js',
  'public/js/child-collections.js',
  'public/js/child-treasure-present.js',
  'public/js/child-ui-text.js',
  'public/js/child-settings-view.js',
  'public/js/child-theme-picker.js',
  'public/js/child-theme.js',
  'public/js/child-system-menu.js',
  'public/js/child-star-feedback.js',
  'public/js/child-week-overview.js',
  'public/js/child-dashboard-warmth.js',
  'public/js/child-first-star-mode.js',
  'public/js/child-achievements.js',
  'public/js/child-achievement-i18n.js',
  'public/js/child-customization-entries.js',
  'public/js/child-today-focus.js',
  'public/js/child-today-warmth.js',
  'public/js/child-today-coach.js',
  'public/js/child-today-fun.js',
  'public/js/child-today-tasks.js',
  'public/js/child-dashboard-celebrations.js',
  'public/js/child-dashboard-activities.js',
  'public/js/child-dashboard-day-nav.js',
  'public/js/child-dashboard-load-day.js',
  'public/js/child-dashboard-substeps.js',
  'public/js/child-dashboard-photo-cards.js',
  'public/js/child-dashboard-activity-timer.js',
  'public/js/child-read-aloud.js',
  'public/js/child-support-layer.js',
  'public/js/child-worlds.js',
  'public/login.html',
  'public/register.html',
  'public/child-login.html',
  'public/forgot-password.html',
  'public/reset-password.html',
  'public/verify-email.html',
  'src/lib/auth-api-messages.js',
  'src/routes/auth/register.js',
  'src/routes/auth/login.js',
  'src/routes/auth/email.js',
  'config/i18n/schedule-en-GB.json',
  'public/js/schedule-i18n.js',
  'public/js/schedule-core.js',
  'public/js/schedule.js',
  'public/js/schedule-views.js',
  'public/js/schedule-activity-modals.js',
  'public/js/schedule-special-days.js',
  'public/js/schedule-period.js',
  'public/js/schedule-insert-fill.js',
  'public/js/schedule-template-mode.js',
  'public/js/schedule-dnd.js',
  'public/js/schedule-cal-nav.js',
  'public/js/schedule-custody.js',
  'public/js/schedule-family-grid.js',
  'public/js/dashboard-activity-modal.js',
  'public/schedule.html',
];

const BASELINE_FILES = [
];

const REPORT_FILES = [
  'public/admin/',
  'public/index.html',
  'public/terms.html',
  'public/privacy.html',
];

const STRICT_ALLOWLIST = [
  /pragma:/,
  /console\./,
  /\/\//,
  /SV_CATEGORY_TO_TIME_GROUP|SV_TIME_CATEGORY_OFFSET/, // Swedish DB category keys (not UI copy)
  /data-i18n/, // Swedish fallback text in HTML until JS applies locale
  /"months":\s*\[/, // Swedish month names in sv-SE locale JSON only
  /keywords: \[/, // Swedish activity-name matching keywords (not UI copy)
  /<!--/, // HTML comments (not user-visible)
  /auth-entry-noscript|auth-entry-fallback/, // Emergency no-JS / bootstrap-failure copy (static, bilingual)
  /Förskola vardag|Kvällsrutin|Morgon vardag|sectionToCategoryName/, // DB template / category keys in onboarding routes
  /\.replace\(\/\[/, // diacritic strip helper in onboarding routes
  /_FALLBACK|FW_DAYS_/, // Swedish day/section fallback arrays used only when i18n is unavailable
  /vacationNames|föräldrabehörighet/, // DB-name / server-error matching keywords, not UI copy
  /cat\.name\.includes|'skola','förskola'/, // DB category-name matching in schedule modules
  /copyFromLabel/, // static fallback overwritten via spt() before the modal is shown
  /<meta|Stjärndag/, // head metadata (SEO scope) + brand proper noun
  /^\s*\*/, // JSDoc block comment lines
  /\/\*/, // CSS/JS block comments
  /roomHint:|direction:/, // child-theme internal metadata (not shown in picker UI)
  /option value="(morgon|dag|kvall|natt)"/, // section options localized at modal open (schedule-special-days.js)
  /\/saga|bok|läsa|bibliotek|park|utflykt|lekplats|äventyr|stjärn|bonus|film|tv|skärm|bio/, // reward-name keyword matchers (warmth narratives)
  /inställningar:|installningar:/, // SAMLING_HASH route aliases (not visible labels)
];

const BASELINE_ALLOWLIST = [
  ...STRICT_ALLOWLIST,
  /family_role/,
  /mamma|pappa|bonus/,
  /data-i18n/, // Swedish fallback text in HTML until full migration
];

function shouldIgnore(line, allowlist) {
  return allowlist.some((re) => re.test(line));
}

function auditFile(relPath, allowlist) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return [];
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, idx) => {
    if (!SWEDISH_RE.test(line)) return;
    if (shouldIgnore(line, allowlist)) return;
    hits.push({ file: relPath, line: idx + 1, text: line.trim().slice(0, 120) });
  });
  return hits;
}

function auditPaths(paths, allowlist) {
  const hits = [];
  for (const p of paths) {
    const abs = path.join(ROOT, p);
    if (p.endsWith('/')) {
      if (!fs.existsSync(abs)) continue;
      walkDir(abs, p, hits, allowlist);
    } else {
      hits.push(...auditFile(p, allowlist));
    }
  }
  return hits;
}

function walkDir(absDir, relPrefix, hits, allowlist) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = path.join(relPrefix, entry.name);
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      walkDir(abs, rel, hits, allowlist);
    } else if (/\.(js|html|json)$/.test(entry.name)) {
      hits.push(...auditFile(rel, allowlist));
    }
  }
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function printHits(label, hits) {
  console.log(`\n[audit-hardcoded-swedish] ${label}: ${hits.length} hit(s)`);
  for (const h of hits.slice(0, 50)) {
    console.log(`  ${h.file}:${h.line}: ${h.text}`);
  }
  if (hits.length > 50) {
    console.log(`  ... and ${hits.length - 50} more`);
  }
}

const strictHits = auditPaths(STRICT_FILES, STRICT_ALLOWLIST);
const baselineHits = auditPaths(BASELINE_FILES, BASELINE_ALLOWLIST);
const reportHits = auditPaths(REPORT_FILES, BASELINE_ALLOWLIST);

let exitCode = 0;

if (MODE_STRICT) {
  printHits('STRICT', strictHits);
  if (strictHits.length > 0) exitCode = 1;
} else if (MODE_BASELINE) {
  printHits('BASELINE', baselineHits);
  const saved = loadBaseline();
  const limit = saved?.baseline_count ?? baselineHits.length;
  console.log(`\n[audit-hardcoded-swedish] baseline limit: ${limit}, current: ${baselineHits.length}`);
  if (baselineHits.length > limit) exitCode = 1;
} else {
  printHits('STRICT', strictHits);
  printHits('BASELINE', baselineHits);
  printHits('REPORT (informational)', reportHits);
  console.log('\n[audit-hardcoded-swedish] summary:', {
    strict: strictHits.length,
    baseline: baselineHits.length,
    report: reportHits.length,
  });
}

process.exit(exitCode);
