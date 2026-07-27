'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t } = require('../src/lib/i18n');
const { shouldShowLegacyLanguageNotice } = require('../src/lib/locale-selection');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('legacy-language notice relevance (pure DB signal)', () => {
  it('relevant: en-GB family that switched from Swedish, not dismissed', () => {
    assert.equal(shouldShowLegacyLanguageNotice({
      preferred_locale: 'en-GB',
      previous_locale: 'sv-SE',
      legacy_language_notice_dismissed_at: null,
    }), true);
  });

  it('not relevant: new English family (no previous locale)', () => {
    assert.equal(shouldShowLegacyLanguageNotice({
      preferred_locale: 'en-GB',
      previous_locale: null,
      legacy_language_notice_dismissed_at: null,
    }), false);
  });

  it('not relevant: dismissed once — never again', () => {
    assert.equal(shouldShowLegacyLanguageNotice({
      preferred_locale: 'en-GB',
      previous_locale: 'sv-SE',
      legacy_language_notice_dismissed_at: new Date(),
    }), false);
  });

  it('not relevant: Swedish family', () => {
    assert.equal(shouldShowLegacyLanguageNotice({
      preferred_locale: 'sv-SE',
      previous_locale: 'en-GB',
      legacy_language_notice_dismissed_at: null,
    }), false);
  });

  it('notice copy exists in both locales and matches the agreed wording', () => {
    loadLocales();
    assert.equal(
      t('en-GB', 'language.legacyNotice.body'),
      'Existing activities stay in their original language. New activities use English.'
    );
    assert.equal(
      t('sv-SE', 'language.legacyNotice.body'),
      'Befintliga aktiviteter behåller sitt nuvarande språk. Nya aktiviteter skapas på svenska.'
    );
  });

  it('client notice module + dismiss endpoint are wired', () => {
    const client = read('public/js/legacy-language-notice.js');
    assert.match(client, /show_legacy_language_notice/);
    assert.match(client, /legacy-language-notice\/dismiss/);
    assert.match(read('public/dashboard.html'), /legacy-language-notice\.js/);
    assert.match(read('src/routes/family/locale.js'), /legacy-language-notice\/dismiss/);
  });
});

describe('en-GB terminology (glossary)', () => {
  loadLocales();

  it('bonus stars — no "extra stars" anywhere in en-GB bundles', () => {
    const enFiles = fs.readdirSync(path.join(ROOT, 'config/i18n'))
      .filter((f) => f.endsWith('en-GB.json'))
      .map((f) => `config/i18n/${f}`)
      .concat(['src/locales/en-GB.json']);
    for (const file of enFiles) {
      assert.doesNotMatch(read(file), /extra stars/i, `${file} must use "bonus stars"`);
    }
    assert.equal(t('en-GB', 'schedule.modals.giveStars.title'), 'Give bonus stars');
    assert.equal(t('en-GB', 'schedule.modals.giveStars.pickerTitle'), 'Give bonus stars');
    assert.equal(t('en-GB', 'home.quickActions.extraStars'), 'Bonus stars');
  });

  it('populate week — no old "Fill week" copy in en-GB', () => {
    assert.doesNotMatch(read('config/i18n/schedule-en-GB.json'), /Fill week/);
    assert.equal(t('en-GB', 'schedule.fillWeek.title'), 'Populate week');
    assert.equal(t('en-GB', 'schedule.chrome.fillWeek'), '📆 Populate week');
  });

  it('kept terms remain unchanged', () => {
    assert.equal(t('en-GB', 'schedule.modals.addActivity.onceTitle'), 'One-off activity');
    assert.equal(t('en-GB', 'schedule.period.modalTitle'), 'Holiday period');
    assert.equal(t('en-GB', 'schedule.period.resetBtn'), 'Reset to weekly schedule');
    assert.equal(t('en-GB', 'schedule.chrome.viewSbs'), '👥 Compare children');
  });

  it('Swedish copy is untouched', () => {
    assert.equal(t('sv-SE', 'schedule.modals.giveStars.title'), 'Ge extra stjärnor');
    assert.equal(t('sv-SE', 'schedule.fillWeek.title'), 'Fyll vecka');
    assert.equal(t('sv-SE', 'home.quickActions.extraStars'), 'Extra stjärnor');
  });

  it('glossary doc records the final choices', () => {
    const doc = read('docs/i18n-glossary.md');
    assert.match(doc, /Bonus stars/);
    assert.match(doc, /Populate week/);
    assert.match(doc, /shouldShowLegacyLanguageNotice/);
  });
});

describe('en-GB date formatting guards', () => {
  const scheduleModules = [
    'public/js/schedule.js',
    'public/js/schedule-core.js',
    'public/js/schedule-cal-nav.js',
    'public/js/schedule-views.js',
    'public/js/schedule-special-days.js',
    'public/js/schedule-activity-modals.js',
    'public/js/dashboard-activity-modal.js',
    'public/js/locale-datetime.js',
  ];

  it('no hardcoded display-locale date formatting in Planning/Schedule modules', () => {
    for (const file of scheduleModules) {
      const src = read(file);
      // Display formatting (with options) must never pin a locale.
      assert.doesNotMatch(src, /toLocaleDateString\('(sv-SE|en-US|en-GB)',\s*\{/, file);
      // Bare sv-SE (technical YYYY-MM-DD) only allowed with the do-not-localize comment.
      const bare = src.match(/toLocaleDateString\('sv-SE'\)/g) || [];
      if (bare.length > 0) {
        assert.match(src, /do not localize/, `${file}: bare sv-SE requires technical-format comment`);
      }
    }
  });
});

describe('mobile overlay polish', () => {
  it('help + support bubble triggers sit below modal overlays (z-50)', () => {
    const help = read('public/js/help-bubble.js');
    const hbBtnZ = help.match(/#hbBtn[^}]*z-index:\s*(\d+)/s);
    assert.ok(hbBtnZ && Number(hbBtnZ[1]) < 50, '#hbBtn z-index must be < 50');
    assert.doesNotMatch(help, /z-index:\s*(900|10001);\s*\n\s*width: 44px/);
    const support = read('public/js/support-bubble.js');
    const rootZ = support.match(/#supportBubbleRoot[^}]*z-index:\s*(\d+)/s);
    assert.ok(rootZ && Number(rootZ[1]) < 50, '#supportBubbleRoot z-index must be < 50');
  });

  it('bottom nav hides while a modal overlay is open', () => {
    const css = read('public/css/parent-bottom-nav.css');
    assert.match(css, /body:has\(> \.fixed\.inset-0:not\(\.hidden\)\) \.parent-bottom-nav/);
  });
});

describe('english demo seed script', () => {
  it('exists with documented identity and safety rails, no credentials in repo', () => {
    const script = read('scripts/seed-english-demo-family.mjs');
    assert.match(script, /english\.demo@mystarday\.se/); // pragma: allowlist secret
    assert.match(script, /English Demo \(QA\)/);
    assert.match(script, /DEMO_FAMILY_PASSWORD/);
    assert.match(script, /DEMO_CHILD_PIN/);
    assert.match(script, /idempotent/i);
    assert.match(script, /preferred_locale = 'en-GB'/);
    assert.match(script, /english_child_experience/);
    // no hardcoded password fallback values committed
    assert.doesNotMatch(script, /DEMO_FAMILY_PASSWORD\s*\|\|\s*['"][A-Za-z0-9]/);
    // no Swedish display names in the demo content
    assert.doesNotMatch(script, /[åäöÅÄÖ]/);
    const pkg = read('package.json');
    assert.match(pkg, /"seed:english-demo"/);
  });
});
