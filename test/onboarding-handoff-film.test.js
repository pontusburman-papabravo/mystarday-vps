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

  it('film module uses text only (no voiceover, no music)', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    assert.match(src, /SCENES/);
    assert.match(src, /Testa barnläget nu/);
    assert.match(src, /Gör det senare/);
    assert.doesNotMatch(src, /speechSynthesis/);
    assert.doesNotMatch(src, /startMusic/);
    assert.doesNotMatch(src, /AudioContext/);
  });

  it('film enabled by activation state, not slim fast path', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    assert.match(src, /schema_saved_at/);
    assert.match(src, /child_access_completed_at/);
    assert.match(src, /handoff_film_completed_at/);
    assert.doesNotMatch(src, /isSlimFastPath/);
  });

  it('schema save paths route through goToHandoffAfterSchema or enterChildHandoff', () => {
    const starter = read('public/js/onboarding-starter-plan.js');
    const guide = read('public/js/onboarding-activity-guide.js');
    const onboarding = read('public/js/onboarding.js');
    const film = read('public/js/onboarding-handoff-film.js');
    const activation = read('public/js/onboarding-activation.js');
    assert.match(starter, /goToHandoffAfterSchema/);
    assert.match(guide, /goToHandoffAfterSchema|enterChildHandoff/);
    assert.match(onboarding, /enterChildHandoff/);
    assert.match(film, /async function goToHandoffAfterSchema/);
    assert.match(film, /await oa\.loadConfig\(\)/);
    assert.match(activation, /loadConfig: loadConfig/);
  });

  it('film CTA try shows handoff panel; later defers to dashboard CTA', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    assert.match(src, /showHandoffPanel/);
    assert.match(src, /startChildHandoff\('onboarding_film'\)/);
    assert.match(src, /postponeHandoff/);
    assert.match(src, /next_step=child_handoff/);
    assert.doesNotMatch(src, /\/api\/onboarding\/complete/);
  });

  it('activation-config exposes handoff film flag and state', () => {
    const src = read('src/routes/family/core.js');
    assert.match(src, /activation_onboarding_handoff_film_v1/);
    assert.match(src, /FLAG_KEYS\.handoffFilm/);
    assert.match(src, /handoff_film_completed_at/);
    assert.match(src, /\/activation\/handoff-film-seen/);
  });

  it('handoff copy on dashboard matches activation spec', () => {
    const dash = read('public/dashboard.html');
    const registry = read('config/journey-experience-registry.json');
    assert.match(dash, /Nästa steg: Låt barnet testa sin rutin/);
    assert.match(dash, /Öppna barnläget/);
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

  it('email resume uses enterChildHandoff', () => {
    const onboarding = read('public/js/onboarding.js');
    assert.match(onboarding, /enterChildHandoff\('email_resume'\)/);
  });
});
