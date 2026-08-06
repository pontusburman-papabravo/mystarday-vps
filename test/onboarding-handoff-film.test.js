'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Onboarding handoff film', () => {
  loadLocales();

  it('onboarding.html loads film CSS and JS after activation', () => {
    const html = read('public/onboarding.html');
    assert.match(html, /onboarding-handoff-film\.css/);
    const actIdx = html.indexOf('onboarding-activation.js');
    const filmIdx = html.indexOf('onboarding-handoff-film.js');
    assert.ok(actIdx >= 0 && filmIdx > actIdx);
  });

  it('film module uses locale keys (no hardcoded Swedish copy)', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    assert.match(src, /SCENE_IDS/);
    assert.match(src, /onboarding\.handoffFilm\.ctaTryNow/);
    assert.match(src, /onboarding\.handoffFilm\.ctaLater/);
    assert.match(src, /onboarding\.handoffFilm\.scenes\./);
    assert.doesNotMatch(src, /Testa barnläget nu/);
    assert.doesNotMatch(src, /Gör det senare/);
    assert.doesNotMatch(src, /speechSynthesis/);
    assert.doesNotMatch(src, /startMusic/);
    assert.doesNotMatch(src, /AudioContext/);
  });

  it('handoff film CTA copy is localized for sv-SE and en-GB', () => {
    const svTry = t('sv-SE', 'onboarding.handoffFilm.ctaTryNow');
    const svLater = t('sv-SE', 'onboarding.handoffFilm.ctaLater');
    const enTry = t('en-GB', 'onboarding.handoffFilm.ctaTryNow');
    const enLater = t('en-GB', 'onboarding.handoffFilm.ctaLater');

    assert.match(svTry, /barnläget/i);
    assert.match(svLater, /senare/i);
    assert.match(enTry, /child mode/i);
    assert.match(enLater, /later/i);
    assert.notEqual(svTry, enTry);
    assert.notEqual(svLater, enLater);
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

  it('handoff copy on dashboard uses localized post-schema keys', () => {
    const dash = read('public/dashboard.html');
    const handoffJs = read('public/js/dashboard-child-handoff.js');
    const hubJs = read('public/js/dashboard-home-hub.js');
    const registry = read('config/journey-experience-registry.json');
    assert.match(dash, /dashboardChildHandoff/);
    assert.match(dash, /dash-child-handoff-title/);
    assert.doesNotMatch(dash, /Nästa steg: Låt barnet testa sin rutin/);
    assert.match(handoffJs, /home\.handoff\.postSchema/);
    assert.match(handoffJs, /applyMagicHandoffCopy/);
    assert.match(hubJs, /syncPostSchemaHandoffCard/);
    assert.match(registry, /"cta": "Testa barnläget nu"/);
    assert.match(registry, /Låt barnet testa sin rutin/);
    const enTitle = t('en-GB', 'home.handoff.postSchema.title');
    assert.match(enTitle, /Let your child try their routine/i);
    const enCta = t('en-GB', 'home.handoff.postSchema.childLogin');
    assert.match(enCta, /Try child mode now/i);
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

  it('add-child onboarding shows handoff film after schema save', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    const onboarding = read('public/js/onboarding.js');
    assert.match(src, /isAddChildFlow/);
    assert.match(src, /afterSchemaSave/);
    assert.match(src, /__handoffFilmSeenForChild/);
    assert.doesNotMatch(src, /IS_ADD_CHILD\) return false/);
    assert.match(onboarding, /enterChildHandoff\('add_child_step6'\)/);
  });

  it('preview replay destroys prior timer session (no ghost last scene)', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    assert.match(src, /destroyActiveSession/);
    assert.match(src, /activeSession\.timerId/);
    assert.match(src, /scheduleSceneTimeout/);
    assert.match(src, /activeSession\.overlay !== overlay/);
  });

  it('film shown once per session (no duplicate complete events)', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    assert.match(src, /shownThisSession/);
    assert.match(src, /onboarding_handoff_film_complete/);
  });
});
