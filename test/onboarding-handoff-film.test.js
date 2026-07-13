'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Onboarding handoff film', () => {
  it('onboarding.html loads film CSS and JS after activation', () => {
    const html = read('public/onboarding.html');
    assert.match(html, /onboarding-handoff-film\.css/);
    const actIdx = html.indexOf('onboarding-activation.js');
    const filmIdx = html.indexOf('onboarding-handoff-film.js');
    assert.ok(actIdx >= 0 && filmIdx > actIdx);
  });

  it('film module uses music + text only (no voiceover)', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    assert.match(src, /SCENES/);
    assert.match(src, /Testa barnläget nu/);
    assert.match(src, /Gör det senare/);
    assert.match(src, /startMusic/);
    assert.doesNotMatch(src, /speechSynthesis/);
  });

  it('schema save paths route through goToHandoffAfterSchema', () => {
    const starter = read('public/js/onboarding-starter-plan.js');
    const guide = read('public/js/onboarding-activity-guide.js');
    const onboarding = read('public/js/onboarding.js');
    assert.match(starter, /OnboardingHandoffFilm\.goToHandoffAfterSchema/);
    assert.match(guide, /OnboardingHandoffFilm\.goToHandoffAfterSchema/);
    assert.match(onboarding, /OnboardingHandoffFilm\.goToHandoffAfterSchema/);
  });

  it('film CTA try opens child login; later completes onboarding', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    assert.match(src, /startChildHandoff\('onboarding_film'\)/);
    assert.match(src, /\/api\/onboarding\/complete/);
    assert.match(src, /window\.location\.href = '\/dashboard'/);
  });

  it('activation-config exposes handoff film flag', () => {
    const src = read('src/routes/family/core.js');
    assert.match(src, /activation_onboarding_handoff_film_v1/);
    assert.match(src, /FLAG_KEYS\.handoffFilm/);
  });

  it('handoff copy on dashboard and journey matches spec', () => {
    const dash = read('public/dashboard.html');
    const registry = read('config/journey-experience-registry.json');
    assert.match(dash, /Nästa steg: Låt barnet testa sin rutin/);
    assert.match(dash, /Testa barnläget nu/);
    assert.match(registry, /"cta": "Testa barnläget nu"/);
    assert.match(registry, /Låt barnet testa sin rutin/);
  });

  it('first-star guide defers to film when film flag active', () => {
    const src = read('public/js/onboarding-first-star.js');
    assert.match(src, /OnboardingHandoffFilm\.isEnabled/);
  });

  it('film preview page and route exist', () => {
    const html = read('public/onboarding-film-preview.html');
    const routes = read('src/routes/index.js');
    const filmJs = read('public/js/onboarding-handoff-film.js');
    assert.match(html, /OnboardingHandoffFilm\.showPreview/);
    assert.match(routes, /\/onboarding\/film-preview/);
    assert.match(filmJs, /showPreview/);
    assert.match(filmJs, /preview: true/);
  });
});
