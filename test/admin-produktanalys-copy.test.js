'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Produktanalys copy is readable Swedish', () => {
  it('overview page explains numbers instead of analytics jargon', () => {
    const html = read('public/admin/index.html');
    const analytics = read('public/admin/admin-analytics.js');
    assert.match(html, /Hur går det för familjerna\?/);
    assert.match(html, /Varje tal har en kort förklaring/);
    assert.doesNotMatch(html, />Analytics</);
    assert.doesNotMatch(html, /KPI:er, onboarding-tratt/);
    assert.doesNotMatch(html, /Uppdatera snapshot/);

    assert.match(analytics, /data-tab="overview">Hur går det\?</);
    assert.match(analytics, /data-tab="how-used">Så används appen</);
    assert.match(analytics, /Börja här/);
    assert.match(analytics, /Vad betyder orden\?/);
    assert.match(analytics, /Första lyckade dagen/);
    assert.match(analytics, /Appen på hemskärmen/);
    assert.match(analytics, /Sparad telefon/);
    assert.doesNotMatch(analytics, /Ghost Families/);
    assert.doesNotMatch(analytics, /Onboarding-tratt/);
    assert.doesNotMatch(analytics, /Feature-popularitet/);
    assert.doesNotMatch(analytics, /Trusted-device-sessioner/);
    assert.doesNotMatch(analytics, /Klassiska autentiseringar/);
    assert.match(analytics, /Rullande 24 timmar/);
    assert.match(analytics, /aldrig blandat/);
    assert.match(analytics, /Inga i den spårade gruppen/);
    assert.doesNotMatch(analytics, /alla som registrerat sig har öppnat barnvyn/);
  });

  it('workspace tabs ask questions instead of duplicating the nav label', () => {
    const shell = read('public/admin/admin-produktanalys-shell.js');
    assert.match(shell, /label: 'Produktanalys'/);
    assert.match(shell, /Nya och aktiva/);
    assert.match(shell, /Vilka användare/);
    assert.match(shell, /hint:/);
  });

  it('morning check and rollout panels speak Swedish', () => {
    const dailyUi = read('public/admin/admin-journey-daily-analysis.js');
    const rolloutUi = read('public/admin/admin-journey-rollout.js');
    const daily = read('src/lib/journey/daily-analysis.js');
    assert.match(dailyUi, /Morgonkoll/);
    assert.match(dailyUi, /Hur gick det i morse\?/);
    assert.doesNotMatch(dailyUi, /Family Journey — daglig analys/);
    assert.doesNotMatch(dailyUi, /Browser QA-punkter/);
    assert.match(rolloutUi, /Ny hem-upplevelse — stegvis lansering/);
    assert.match(rolloutUi, /Steg \$\{w\.wave\}/);
    assert.match(daily, /Barn har inte loggat in än/);
    assert.match(daily, /Första lyckade dagen/);
    assert.doesNotMatch(daily, /North Star/);
    assert.doesNotMatch(daily, /Handoff-flaskhals/);
  });

  it('maps journey phases to Swedish labels', () => {
    const { phaseLabelSv } = require('../src/lib/journey/phases');
    assert.equal(phaseLabelSv('FIRST_USE'), 'Första användningen');
    assert.equal(phaseLabelSv('SETTING_UP'), 'Sätter upp');
    assert.equal(phaseLabelSv('UNKNOWN_PHASE'), 'UNKNOWN_PHASE');
  });

  it('keeps activation funnel contract strings', () => {
    const analytics = read('public/admin/admin-analytics.js');
    assert.match(analytics, /First Success-tratt/);
    assert.match(analytics, /signup → barn → schema → barnåtkomst → första stjärnan → aktivitet dag 2/);
    assert.match(analytics, /Veckorapport aktivering/);
    assert.match(analytics, /Värvningar \(referral v0\)/);
  });
});
