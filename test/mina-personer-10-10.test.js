'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HALL = path.join(ROOT, 'public/js/child-family-hall.js');
const STATE = path.join(ROOT, 'public/js/child-family-state.js');
const VISION = path.join(ROOT, 'docs/mina-personer-vision.md');
const PROMPT = path.join(ROOT, 'docs/mina-personer-agent-prompt.md');

describe('Mina personer barn 10/10', () => {
  it('vision is product-only constitution', () => {
    const vision = fs.readFileSync(VISION, 'utf8');
    assert.match(vision, /Olle-test/);
    assert.match(vision, /Filterregel/);
    assert.match(vision, /Tillståndsmaskin \(exklusiv\)/);
    assert.match(vision, /Jag är inte ensam/);
    assert.match(vision, /Personkort/);
    assert.doesNotMatch(vision, /child-family-hall\.js/);
    assert.doesNotMatch(vision, /resolveFamilyState/);
  });

  it('agent prompt is GO and points to state module', () => {
    const prompt = fs.readFileSync(PROMPT, 'utf8');
    assert.match(prompt, /Status: GO/);
    assert.match(prompt, /child-family-state\.js/);
    assert.match(prompt, /resolveFamilyState/);
  });

  it('has exclusive resolveFamilyState as single truth source', () => {
    const src = fs.readFileSync(STATE, 'utf8');
    assert.match(src, /function resolveFamilyState/);
    assert.match(src, /FAMILY_STATES/);
    assert.match(src, /window\.resolveFamilyState = resolveFamilyState/);
  });

  it('hall render uses state — Mina personer copy, no Familjehallen hero', () => {
    const src = fs.readFileSync(HALL, 'utf8');
    assert.match(src, /resolveFamilyState/);
    assert.match(src, /Mina personer/);
    assert.match(src, /De som hjälper mig/);
    assert.match(src, /cfh-persons-primary/);
    assert.match(src, /cfh-secondary-sections/);
    assert.doesNotMatch(src, /Familjehallen/);
    assert.doesNotMatch(src, /Familjeskista/);
    assert.doesNotMatch(src, /checklist/i);
  });

  it('no primary CTA competing with Idag', () => {
    const hallSrc = fs.readFileSync(HALL, 'utf8');
    assert.doesNotMatch(hallSrc, /showTab\('schedule'\)/);
    assert.doesNotMatch(hallSrc, /Bocka av/);
    assert.doesNotMatch(hallSrc, /cfh-primary/);
    assert.doesNotMatch(hallSrc, /<button[^>]+class="[^"]*primary/i);
  });

  it('person cards use warm role labels not admin roles', () => {
    const stateSrc = fs.readFileSync(STATE, 'utf8');
    assert.match(stateSrc, /Hjälper mig hemma/);
    const hallSrc = fs.readFileSync(HALL, 'utf8');
    assert.doesNotMatch(hallSrc, />Vuxen</);
  });

  it('re-renders after warm moment window (G-04)', () => {
    const src = fs.readFileSync(HALL, 'utf8');
    assert.match(src, /scheduleWarmMomentRerender/);
    assert.match(src, /WARM_MOMENT_MS/);
    assert.match(src, /clearWarmTimer/);
  });

  it('away copy uses safe framing on cards', () => {
    const sheet = fs.readFileSync(path.join(ROOT, 'public/js/child-family-person-sheet.js'), 'utf8');
    const state = fs.readFileSync(STATE, 'utf8');
    assert.match(sheet, /person\.cardNote/);
    assert.doesNotMatch(sheet, /person\.awayLabel/);
    assert.match(state, /awayCardNote/);
    assert.match(state, /softenAwayLabel/);
  });

  it('gates v10 behind mina_personer_10_10 feature', () => {
    const src = fs.readFileSync(HALL, 'utf8');
    assert.match(src, /mina_personer_10_10/);
    assert.match(src, /ChildFamilyHallLegacy/);
    assert.match(src, /fetchFeatures/);
  });

  it('person cards open expanded sheet with role label', () => {
    const hall = fs.readFileSync(HALL, 'utf8');
    const sheet = fs.readFileSync(path.join(ROOT, 'public/js/child-family-person-sheet.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(hall, /ChildFamilyPersonSheet/);
    assert.match(hall, /data-cfh-person-key/);
    assert.match(hall, /cfh-person-card-btn/);
    assert.match(sheet, /cfh-person-sheet-role/);
    assert.match(sheet, /bindCards/);
    assert.match(html, /child-family-person-sheet\.js/);
    assert.match(html, /child-family-person-sheet\.css/);
    assert.match(html, /member-avatar\.js/);
  });

  it('family hall API assigns roleLabel via family-person-role', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/family-hall.js'), 'utf8');
    assert.match(src, /family-person-role/);
    assert.match(src, /roleLabel: childRoleLabelForParent/);
    assert.match(src, /roleLabel: childRoleLabelForSibling/);
  });

  it('SW bumped for Mina personer 10/10', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/cache-version.json'), 'utf8'));
    assert.match(sw, new RegExp("const CACHE_NAME = '" + cache.cacheName + "'"));
    assert.ok(cache.cacheName >= 'stjarndag-v454');
  });
});
