'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const {
  loadLocales,
  auditTranslationContract,
  plural,
  pluralCategory,
  ALLOW_EMPTY_TRANSLATIONS,
  ALLOW_PLACEHOLDER_MISMATCH,
} = require('../src/lib/i18n');

describe('translation contract', () => {
  before(() => {
    loadLocales();
  });

  it('sv-SE and en-GB share keys, non-empty strings, and placeholders', () => {
    const contract = auditTranslationContract();
    assert.equal(contract.ok, true, contract.errors.slice(0, 30).join('\n'));
  });

  it('keeps the known empty-suffix and market-copy exceptions frozen', () => {
    assert.deepEqual([...ALLOW_EMPTY_TRANSLATIONS].sort(), [
      'child.checkoff.score.1',
      'market.choice.hint',
      'today.bump.movedOne',
      'today.emotions.sliderSuffixMany',
      'today.emotions.sliderSuffixOne',
      'today.rating.labels[0]',
    ]);
    assert.deepEqual([...ALLOW_PLACEHOLDER_MISMATCH], []);
  });

  it('rejects empty strings and placeholder drift', () => {
    const broken = auditTranslationContract({
      'sv-SE': { greet: 'Hej {{name}}', empty: '' },
      'en-GB': { greet: 'Hello', empty: 'ok' },
    });
    assert.equal(broken.ok, false);
    assert.ok(broken.errors.some((line) => line.includes('placeholder mismatch greet')));
    assert.ok(broken.errors.some((line) => line.includes('empty in sv-SE: empty')));
  });

  it('plural categories stay one/other for Swedish and English', () => {
    assert.equal(pluralCategory('sv-SE', 1), 'one');
    assert.equal(pluralCategory('sv-SE', 2), 'other');
    assert.equal(pluralCategory('en-GB', 1), 'one');
    assert.equal(pluralCategory('en-GB', 5), 'other');
  });

  it('plural uses one and other on the live schedule strings', () => {
    assert.equal(plural('en-GB', 'schedule.activityCount', 1), '1 activity');
    assert.equal(plural('en-GB', 'schedule.activityCount', 5), '5 activities');
    assert.equal(plural('sv-SE', 'schedule.activityCount', 1), '1 aktivitet');
    assert.equal(plural('sv-SE', 'schedule.activityCount', 5), '5 aktiviteter');
  });

  it('uses Intl.PluralRules for the Central European packs', () => {
    assert.equal(pluralCategory('cs-CZ', 1), 'one');
    assert.equal(pluralCategory('cs-CZ', 2), 'few');
    assert.equal(pluralCategory('cs-CZ', 5), 'other');
    assert.equal(pluralCategory('sk-SK', 4), 'few');
    assert.equal(pluralCategory('sl-SI', 2), 'two');
    assert.equal(pluralCategory('sl-SI', 3), 'few');
    assert.equal(pluralCategory('hr-HR', 22), 'few');
    assert.equal(pluralCategory('hr-HR', 5), 'other');
    assert.equal(pluralCategory('hu-HU', 5), 'other');
    assert.equal(pluralCategory('ro-RO', 0), 'few');
    assert.equal(pluralCategory('ro-RO', 22), 'other');
    assert.equal(plural('cs-CZ', 'schedule.activityCount', 2), '2 aktivity');
    assert.equal(plural('cs-CZ', 'schedule.activityCount', 5), '5 aktivit');
    assert.equal(plural('sk-SK', 'schedule.activityCount', 2), '2 aktivity');
    assert.equal(plural('sk-SK', 'schedule.activityCount', 5), '5 aktivít');
    assert.equal(plural('sl-SI', 'schedule.activityCount', 2), '2 dejavnosti');
    assert.equal(plural('hr-HR', 'schedule.activityCount', 22), '22 aktivnosti');
    assert.equal(plural('hr-HR', 'schedule.activityCount', 5), '5 aktivnosti');
    assert.equal(plural('hu-HU', 'schedule.activityCount', 5), '5 tevékenység');
    assert.equal(plural('ro-RO', 'schedule.activityCount', 2), '2 activități');
    assert.equal(plural('ro-RO', 'schedule.activityCount', 22), '22 de activități');
    assert.equal(new Intl.PluralRules('pl-PL').select(2), 'few');
    assert.equal(pluralCategory('pl-PL', 2), 'few');
    assert.equal(new Intl.PluralRules('pl-PL').select(5), 'many');
    assert.equal(pluralCategory('pl-PL', 5), 'many');
    assert.equal(plural('pl-PL', 'schedule.activityCount', 1), '1 czynność');
    assert.equal(plural('pl-PL', 'schedule.activityCount', 5), '5 czynności');
    assert.equal(new Intl.PluralRules('sl-SI').select(2), 'two');
  });

  it('keeps Lithuanian schedule counts on Intl.PluralRules', () => {
    const rules = new Intl.PluralRules('lt-LT');
    const text = {
      0: '0 veiklų',
      1: '1 veikla',
      2: '2 veiklos',
      9: '9 veiklos',
      10: '10 veiklų',
      11: '11 veiklų',
      19: '19 veiklų',
      20: '20 veiklų',
      21: '21 veikla',
      22: '22 veiklos',
      29: '29 veiklos',
      30: '30 veiklų',
      31: '31 veikla',
      101: '101 veikla',
      102: '102 veiklos',
      111: '111 veiklų',
      121: '121 veikla',
    };
    const category = {
      1: 'one',
      2: 'few',
      10: 'other',
      11: 'other',
      20: 'other',
      21: 'one',
      22: 'few',
      31: 'one',
      101: 'one',
      102: 'few',
      111: 'other',
      121: 'one',
    };
    for (const [raw, expected] of Object.entries(text)) {
      const count = Number(raw);
      const fromIntl = rules.select(count);
      assert.equal(pluralCategory('lt-LT', count), fromIntl, String(count));
      assert.equal(plural('lt-LT', 'schedule.activityCount', count), expected, String(count));
      if (category[count]) assert.equal(fromIntl, category[count], String(count));
    }
  });

  it('keeps the other Lithuanian plural forms Intl.PluralRules selects', () => {
    const rules = new Intl.PluralRules('lt-LT');
    const rows = [
      ['child.login.lockoutSubMinutes', 1, 'one', 'Bandyk vėl už 1 minutę'],
      ['child.login.lockoutSubMinutes', 2, 'few', 'Bandyk vėl už 2 minutes'],
      ['child.login.lockoutSubMinutes', 11, 'other', 'Bandyk vėl už 11 minučių'],
      ['child.login.lockoutSubMinutes', 21, 'one', 'Bandyk vėl už 21 minutę'],
      ['child.activityTimer.minuteUnit', 1, 'one', 'minutė'],
      ['child.activityTimer.minuteUnit', 2, 'few', 'minutės'],
      ['child.activityTimer.minuteUnit', 11, 'other', 'minučių'],
      ['child.activityTimer.minuteUnit', 21, 'one', 'minutė'],
      ['child.activityTimer.secondUnit', 1, 'one', 'sekundė'],
      ['child.activityTimer.secondUnit', 2, 'few', 'sekundės'],
      ['child.activityTimer.secondUnit', 11, 'other', 'sekundžių'],
      ['child.activityTimer.secondUnit', 21, 'one', 'sekundė'],
      ['onboarding.templateGroups.activityCount', 2, 'few', '2 veiklos'],
      ['onboarding.templateGroups.activityCount', 11, 'other', '11 veiklų'],
      ['onboarding.templateGroups.activityCount', 21, 'one', '21 veikla'],
      ['onboarding.rewards.selectCount', 0, 'other', '0 apdovanojimų pasirinkta ✓'],
      ['onboarding.rewards.selectCount', 1, 'one', '1 apdovanojimas pasirinktas ✓'],
      ['onboarding.rewards.selectCount', 2, 'few', '2 apdovanojimai pasirinkti ✓'],
      ['onboarding.rewards.selectCount', 11, 'other', '11 apdovanojimų pasirinkta ✓'],
      ['onboarding.rewards.selectCount', 21, 'one', '21 apdovanojimas pasirinktas ✓'],
      ['library.confirm.usedInSchedules', 1, 'one', 'Naudojama 1 savaitės plane.'],
      ['library.confirm.usedInSchedules', 2, 'few', 'Naudojama 2 savaitės planuose.'],
      ['library.confirm.usedInSchedules', 11, 'other', 'Naudojama 11 savaitės planų.'],
      ['library.confirm.usedInSchedules', 21, 'one', 'Naudojama 21 savaitės plane.'],
      ['reports.professional.times', 1, 'one', '1 kartą'],
      ['reports.professional.times', 2, 'few', '2 kartus'],
      ['reports.professional.times', 11, 'other', '11 kartų'],
      ['reports.professional.times', 21, 'one', '21 kartą'],
    ];
    for (const [key, count, expectedCategory, expectedText] of rows) {
      assert.equal(rules.select(count), expectedCategory, `${key} ${count}`);
      assert.equal(pluralCategory('lt-LT', count), expectedCategory, `${key} ${count}`);
      assert.equal(plural('lt-LT', key, count), expectedText, `${key} ${count}`);
    }
    assert.equal(
      plural('lt-LT', 'onboarding.rewards.selectCount', 0),
      '0 apdovanojimų pasirinkta ✓'
    );
    assert.notEqual(
      plural('lt-LT', 'onboarding.rewards.selectCount', 0),
      'Pasirink bent 1 apdovanojimą (0 pasirinkta)'
    );
  });

  it('does not choose one/other before Intl.PluralRules', () => {
    const root = path.join(__dirname, '..');
    const server = fs.readFileSync(path.join(root, 'src/lib/i18n.js'), 'utf8');
    const serverFn = server.slice(server.indexOf('function pluralCategory'), server.indexOf('function plural('));
    const serverIntl = serverFn.indexOf('new Intl.PluralRules');
    const serverBinary = serverFn.indexOf("n === 1 ? 'one' : 'other'");
    assert.ok(serverIntl >= 0);
    assert.ok(serverBinary > serverIntl);

    const client = fs.readFileSync(path.join(root, 'public/js/i18n.js'), 'utf8');
    const clientStart = client.indexOf('plural(baseKey, count, params');
    const clientFn = client.slice(clientStart, client.indexOf('apply(root', clientStart));
    const clientIntl = clientFn.indexOf('new Intl.PluralRules');
    const clientBinary = clientFn.indexOf("n === 1 ? 'one' : 'other'");
    assert.ok(clientIntl >= 0);
    assert.ok(clientBinary > clientIntl);
    assert.equal(clientFn.slice(0, clientIntl).includes('n === 1'), false);

    const multi = [
      ['lt-LT', 2, 'few'],
      ['lt-LT', 21, 'one'],
      ['pl-PL', 2, 'few'],
      ['pl-PL', 5, 'many'],
      ['cs-CZ', 2, 'few'],
      ['sk-SK', 4, 'few'],
      ['sl-SI', 2, 'two'],
    ];
    for (const [locale, count, expected] of multi) {
      const binary = count === 1 ? 'one' : 'other';
      const fromIntl = new Intl.PluralRules(locale).select(count);
      assert.equal(fromIntl, expected, `${locale} ${count}`);
      assert.notEqual(fromIntl, binary, `${locale} ${count}`);
      assert.equal(pluralCategory(locale, count), fromIntl, `${locale} ${count}`);
    }
  });

  it('uses Intl.PluralRules for Bulgarian, Greek, Estonian, Lithuanian, and Latvian', () => {
    assert.equal(pluralCategory('bg-BG', 1), 'one');
    assert.equal(pluralCategory('bg-BG', 5), 'other');
    assert.equal(pluralCategory('el-GR', 2), 'other');
    assert.equal(pluralCategory('et-EE', 0), 'other');
    assert.equal(pluralCategory('et-EE', 1), 'one');
    assert.equal(pluralCategory('lt-LT', 1), 'one');
    assert.equal(pluralCategory('lt-LT', 2), 'few');
    assert.equal(pluralCategory('lt-LT', 5), 'few');
    assert.equal(pluralCategory('lt-LT', 11), 'other');
    assert.equal(pluralCategory('lt-LT', 21), 'one');
    assert.equal(pluralCategory('lt-LT', 101), 'one');
    assert.equal(pluralCategory('lv-LV', 0), 'zero');
    assert.equal(pluralCategory('lv-LV', 1), 'one');
    assert.equal(pluralCategory('lv-LV', 11), 'zero');
    assert.equal(pluralCategory('lv-LV', 2), 'other');
    assert.equal(plural('bg-BG', 'schedule.activityCount', 5), '5 дейности');
    assert.equal(plural('el-GR', 'schedule.activityCount', 2), '2 δραστηριότητες');
    assert.equal(plural('et-EE', 'schedule.activityCount', 2), '2 tegevust');
    assert.equal(plural('lt-LT', 'schedule.activityCount', 2), '2 veiklos');
    assert.equal(plural('lt-LT', 'schedule.activityCount', 11), '11 veiklų');
    assert.equal(plural('lt-LT', 'schedule.activityCount', 21), '21 veikla');
    assert.equal(plural('lt-LT', 'schedule.activityCount', 101), '101 veikla');
    assert.equal(plural('lv-LV', 'schedule.activityCount', 21), '21 aktivitāte');
    assert.equal(plural('lv-LV', 'schedule.activityCount', 0), '0 aktivitāšu');
    assert.equal(plural('lv-LV', 'schedule.activityCount', 1), '1 aktivitāte');
    assert.equal(plural('lv-LV', 'schedule.activityCount', 2), '2 aktivitātes');
    assert.equal(plural('lv-LV', 'schedule.activityCount', 11), '11 aktivitāšu');
  });
});
