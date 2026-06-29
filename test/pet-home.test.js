'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('pet home game v2', () => {
  it('spec documents handcrafted worlds not generic engine', () => {
    const spec = fs.readFileSync(path.join(ROOT, 'docs/build-play-worlds-spec.md'), 'utf8');
    assert.match(spec, /Verktyg före resultat/);
    assert.match(spec, /build-pet-home/);
    assert.match(spec, /WorldEngine/);
  });

  it('registry routes husdjur to pet-home', () => {
    const { playHrefForSlug } = require('../src/lib/play-world-registry');
    assert.equal(playHrefForSlug('husdjur'), '/child/pet-home');
    assert.equal(playHrefForSlug('racerbil'), '/child/garage');
  });

  it('pet-home state normalizes game v2 fields', () => {
    const { normalizePetHomeState } = require('../src/lib/play/pet-home-state');
    const s = normalizePetHomeState({ hunger: 200, bowl_fill: 50, pet_id: 'katt' });
    assert.equal(s.game_version, 2);
    assert.equal(s.hunger, 100);
    assert.equal(s.pet_id, 'katt');
    assert.equal(s.bowl_fill, 50);
  });

  it('pet-home state migrates hamster to kanin', () => {
    const { normalizePetHomeState } = require('../src/lib/play/pet-home-state');
    assert.equal(normalizePetHomeState({ pet_id: 'hamster' }).pet_id, 'kanin');
  });

  it('pet-home page has mockup panels and toolbar', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/build-pet-home.html'), 'utf8');
    assert.match(html, /phMeters/);
    assert.match(html, /phGoals/);
    assert.match(html, /phToolbar/);
    assert.match(html, /phTreat/);
    assert.match(html, /pet-hund\.svg/);
  });

  it('routes register pet-home and redirect play/husdjur', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/child\/pet-home/);
    assert.match(src, /build-pet-home\.html/);
    assert.match(src, /\/child\/play\/husdjur/);
  });

  it('play-world-save bridge exists', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/play-world-save.js'), 'utf8');
    assert.match(src, /saveDebounced/);
    assert.match(src, /husdjur/);
  });
});
