'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const { loadLocales, t, compareLocaleStructures } = require('../src/lib/i18n');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadCoreWithLocale(lang, ptMap) {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/print-schema-core.js'), 'utf8') + `
    window.__buildTestDoc = function (childName, activities, opts) {
      opts = opts || {};
      const core = window.PrintSchemaCore;
      const child = { id: 'c1', name: childName, emoji: '🌟' };
      const monday = core.mondayOf(new Date('2026-07-28T12:00:00'));
      const days = [];
      for (let i = 0; i < 7; i += 1) {
        const d = core.addDays(monday, i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        days.push({
          date: y + '-' + m + '-' + day,
          dateObj: d,
          activities: i === 0 ? activities : [],
          custody: null,
          skipContent: false,
        });
      }
      return core.buildPrintHtml({
        child: child,
        days: days,
        periodKey: opts.periodKey || '1w',
        myDaysOnly: Boolean(opts.myDaysOnly),
        mode: opts.mode || 'print',
      });
    };
  `;
  const sandbox = {
    window: {
      pt: function (key) {
        return ptMap[key] || key;
      },
      I18n: { getCurrentLang: function () { return lang; } },
      LocaleDateTime: {
        weekdayLong: function (d) {
          return new Intl.DateTimeFormat(lang, {
            weekday: 'long',
            timeZone: 'Europe/Stockholm',
          }).format(d);
        },
        formatWithIntl: function (d, opts) {
          return new Intl.DateTimeFormat(lang, { ...opts, timeZone: 'Europe/Stockholm' }).format(d);
        },
        isoDateInLocale: function (iso) {
          return new Intl.DateTimeFormat(lang, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Europe/Stockholm',
          }).format(new Date(iso + 'T12:00:00'));
        },
      },
      escapeHtml: function (s) {
        return String(s || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      },
    },
    console,
  };
  vm.runInNewContext(src, sandbox);
  return {
    core: sandbox.window.PrintSchemaCore,
    buildTestDoc: sandbox.window.__buildTestDoc,
  };
}

const EN_PT = {
  'printSchema.layout.titleSchedule': 'Schedule',
  'printSchema.layout.titleMyDays': 'My days',
  'printSchema.period.1w': '1 week',
  'printSchema.layout.emptyCell': '–',
  'printSchema.layout.childFallback': 'Child',
  'printSchema.filename.prefixSchedule': 'my-starday-weekly-schedule',
  'printSchema.filename.prefixMyDays': 'my-starday-my-days',
  'printSchema.filename.fallbackSlug': 'child',
};

const SV_PT = {
  'printSchema.layout.titleSchedule': 'Schema',
  'printSchema.layout.titleMyDays': 'Mina dagar',
  'printSchema.period.1w': '1 vecka',
  'printSchema.layout.emptyCell': '–',
  'printSchema.layout.childFallback': 'Barn',
  'printSchema.filename.prefixSchedule': 'min-stjarndag-veckoschema',
  'printSchema.filename.prefixMyDays': 'min-stjarndag-mina-dagar',
  'printSchema.filename.fallbackSlug': 'barn',
};

describe('i18n print-schema', () => {
  it('print-schema fragment loads in server locale bundles', () => {
    loadLocales();
    assert.ok(t('en-GB', 'printSchema.layout.titleSchedule'));
    assert.ok(t('sv-SE', 'printSchema.layout.titleSchedule'));
    assert.notEqual(
      t('sv-SE', 'printSchema.layout.titleSchedule'),
      t('en-GB', 'printSchema.layout.titleSchedule')
    );
  });

  it('print-schema fragment keys have full sv-SE / en-GB parity', () => {
    loadLocales();
    const { missingInEn, missingInSv } = compareLocaleStructures();
    const enMissing = missingInEn.filter((k) => k.startsWith('printSchema.'));
    const svMissing = missingInSv.filter((k) => k.startsWith('printSchema.'));
    assert.deepEqual(enMissing, [], 'keys missing in print-schema-en-GB.json');
    assert.deepEqual(svMissing, [], 'keys missing in print-schema-sv-SE.json');
  });

  it('print-schema surfaces are covered by the STRICT hardcoded-Swedish audit tier', () => {
    const audit = read('scripts/audit-hardcoded-swedish.js');
    for (const file of [
      'config/i18n/print-schema-en-GB.json',
      'public/js/print-schema-core.js',
      'public/js/print-schema.js',
      'public/print-schema.html',
    ]) {
      assert.ok(audit.includes(`'${file}'`), `${file} should be in STRICT_FILES`);
    }
  });

  it('en-GB PDF HTML uses English system copy', () => {
    const { buildTestDoc } = loadCoreWithLocale('en-GB', EN_PT);
    const doc = buildTestDoc('Ella', [{ name: 'Tandborstning', section: 'morgon', icon: '🪥' }]);
    assert.match(doc.body, /Ella — Schedule/);
    assert.match(doc.body, /1 week/);
    assert.doesNotMatch(doc.body, /1 vecka/);
    assert.match(doc.body, /Tandborstning/);
  });

  it('sv-SE PDF HTML keeps Swedish system copy', () => {
    const { buildTestDoc } = loadCoreWithLocale('sv-SE', SV_PT);
    const doc = buildTestDoc('Ella', [{ name: 'Tandborstning', section: 'morgon', icon: '🪥' }]);
    assert.match(doc.body, /Ella — Schema/);
    assert.match(doc.body, /1 vecka/);
    assert.match(doc.body, /Tandborstning/);
  });

  it('en-GB dates use British formatting via LocaleDateTime', () => {
    const { core } = loadCoreWithLocale('en-GB', EN_PT);
    const monday = new Date('2026-07-28T12:00:00');
    const label = core.fmtRangeLabel(monday, core.addDays(monday, 6));
    assert.match(label, /28/);
    assert.match(label, /Jul|July/);
    assert.doesNotMatch(label, /juli/i);
  });

  it('stockholmTodayIso uses Europe/Stockholm not UTC midnight drift', () => {
    const fixedUtc = new Date('2026-07-27T23:30:00Z');
    const RealDate = Date;
    class FixedDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) return fixedUtc;
        return new RealDate(...args);
      }
      static now() { return fixedUtc.getTime(); }
    }
    const src = fs.readFileSync(path.join(ROOT, 'public/js/print-schema-core.js'), 'utf8');
    const sandbox = {
      window: { pt: function () { return ''; }, I18n: { getCurrentLang: function () { return 'en-GB'; } } },
      Date: FixedDate,
      console,
    };
    vm.runInNewContext(src, sandbox);
    const iso = sandbox.window.PrintSchemaCore.stockholmTodayIso();
    assert.equal(iso, '2026-07-28');
  });

  it('escapes XSS in user fields in PDF HTML', () => {
    const { buildTestDoc } = loadCoreWithLocale('en-GB', EN_PT);
    const xss = '<img src=x onerror=alert(1)>&"\'';
    const doc = buildTestDoc(xss, [{ name: xss, section: 'dag' }]);
    assert.doesNotMatch(doc.body, /<img src=x onerror=alert\(1\)>/);
    assert.match(doc.body, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(doc.body, /&amp;/);
    assert.match(doc.body, /&quot;/);
    assert.match(doc.body, /&#39;/);
  });

  it('buildPdfFilename uses locale prefix and safe slug', () => {
    const { core } = loadCoreWithLocale('en-GB', EN_PT);
    const name = core.buildPdfFilename('Emma', false);
    assert.match(name, /^my-starday-weekly-schedule-emma-\d{4}-\d{2}-\d{2}\.pdf$/);
    const my = core.buildPdfFilename('Emma', true);
    assert.match(my, /^my-starday-my-days-emma-/);
    const evil = core.buildPdfFilename('../../etc/passwd', false);
    assert.doesNotMatch(evil, /\.\./);
    const empty = core.buildPdfFilename('', false);
    assert.match(empty, /^my-starday-weekly-schedule-child-/);
  });

  it('sv-SE filename prefix differs from en-GB', () => {
    const svCore = loadCoreWithLocale('sv-SE', SV_PT).core;
    const enCore = loadCoreWithLocale('en-GB', EN_PT).core;
    const sv = svCore.buildPdfFilename('Anna', false);
    const en = enCore.buildPdfFilename('Anna', false);
    assert.match(sv, /^min-stjarndag-veckoschema-/);
    assert.match(en, /^my-starday-weekly-schedule-/);
  });

  it('buildPdfFilename keeps Latin diacritics and falls back for non-Latin scripts', () => {
    const { core } = loadCoreWithLocale('en-GB', EN_PT);
    const asa = core.buildPdfFilename('Åsa', false);
    assert.match(asa, /^my-starday-weekly-schedule-åsa-\d{4}-\d{2}-\d{2}\.pdf$/);
    const elodie = core.buildPdfFilename('Élodie', false);
    assert.match(elodie, /^my-starday-weekly-schedule-élodie-\d{4}-\d{2}-\d{2}\.pdf$/);
    const jose = core.buildPdfFilename('José', false);
    assert.match(jose, /^my-starday-weekly-schedule-josé-\d{4}-\d{2}-\d{2}\.pdf$/);
    const cjk = core.buildPdfFilename('李', false);
    assert.match(cjk, /^my-starday-weekly-schedule-child-\d{4}-\d{2}-\d{2}\.pdf$/);
    assert.doesNotMatch(cjk, /[^\x00-\x7F]/);
  });

  it('PDF HTML preserves emoji, Swedish letters, punctuation, and long words for rasterization', () => {
    const { buildTestDoc } = loadCoreWithLocale('en-GB', EN_PT);
    const childName = 'Åsa Élodie';
    const activity = 'Brush teeth — don\'t forget! (extra-long English activity label)';
    const doc = buildTestDoc(childName, [
      { name: activity, section: 'morgon', icon: '🪥', completed: false },
      { name: 'Fika ☕', section: 'dag', icon: '⭐' },
    ]);
    assert.ok(doc.body.includes('🪥'));
    assert.ok(doc.body.includes('☕'));
    assert.ok(doc.body.includes('Åsa Élodie'));
    assert.ok(doc.body.includes('—'));
    assert.match(doc.body, /don(?:&#39;|')t forget!/);
    assert.ok(doc.body.includes('extra-long English activity label'));
    assert.match(doc.styles, /word-break:\s*break-word/);
    assert.doesNotMatch(doc.body, /&amp;#|&lt;img/);
  });

  it('empty schedule still renders localized chrome', () => {
    const { buildTestDoc } = loadCoreWithLocale('en-GB', EN_PT);
    const doc = buildTestDoc('Ella', []);
    assert.match(doc.body, /Schedule/);
    assert.match(doc.styles, /A4 landscape/);
  });

  it('long activity names and many activities scale without dropping pictogram icon', () => {
    const { buildTestDoc } = loadCoreWithLocale('en-GB', EN_PT);
    const longName = 'Very long English activity name that should still appear in the cell';
    const acts = [];
    for (let i = 0; i < 14; i += 1) {
      acts.push({ name: longName + ' ' + i, section: 'dag', icon: '⭐', completed: false });
    }
    const doc = buildTestDoc('Ella', acts);
    assert.match(doc.body, /⭐/);
    assert.ok(doc.body.includes(longName));
    assert.match(doc.styles, /4\.5|cell/);
  });

  it('downloadPdf fails fast when PDF libs are missing', async () => {
    const { core } = loadCoreWithLocale('en-GB', EN_PT);
    const doc = { styles: '', body: '<div class="sheet"><div class="grid"></div></div>' };
    await assert.rejects(
      () => core.downloadPdf(doc, { childName: 'Ella', myDaysOnly: false }),
      /pdf_libs_missing/
    );
  });
});
