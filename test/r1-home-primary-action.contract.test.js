'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('R1 — Hem primary action orchestration', () => {
  it('documents competing coach mounts and Journey-first priority', () => {
    const orch = read('public/js/home-primary-action.js');
    assert.match(orch, /journeyCoachMount/);
    assert.match(orch, /activationFirstSuccessCoachMount/);
    assert.match(orch, /engineCoachMount/);
    assert.match(orch, /journeyHasRelevantStep/);
    const journeyIdx = orch.indexOf('journeyHasRelevantStep()');
    const activationIdx = orch.indexOf('activationHasPrimary()');
    const engineIdx = orch.indexOf('engineHasPrimary()');
    assert.ok(journeyIdx < activationIdx && activationIdx < engineIdx);
  });

  it('dashboard-home-hub applies HomePrimaryAction after coach loads', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /HomePrimaryAction\.apply/);
    const journeyIdx = hub.indexOf('JourneyCoach.pollCoach');
    const applyIdx = hub.indexOf('HomePrimaryAction.apply');
    assert.ok(journeyIdx > 0 && applyIdx > journeyIdx);
  });

  it('journey coach defers when canonical Hem hub suppresses legacy coaches (R4.6)', () => {
    const journey = read('public/js/journey-coach.js');
    assert.match(journey, /ActivationFirstSuccessHub\.shouldSuppressLegacyCoaches/);
    const orch = read('public/js/home-primary-action.js');
    assert.match(orch, /journey_retention/);
  });

  it('dashboard loads home-primary-action after journey-coach', () => {
    const html = read('public/dashboard.html');
    const jIdx = html.indexOf('home-primary-action.js');
    const cIdx = html.indexOf('journey-coach.js');
    assert.ok(cIdx > 0 && jIdx > cIdx);
  });

  it('exposes founder prod pilot CLI and orchestration smoke', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.equal(pkg.scripts['r1:hem-founder-pilot'], 'node scripts/r1-hem-founder-pilot.mjs');
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts/r1-home-primary-action-orchestration-smoke.mjs')));
    assert.match(read('src/lib/journey/family-pilot.js'), /family_journey_hem_pilot_v1/);
  });
});
