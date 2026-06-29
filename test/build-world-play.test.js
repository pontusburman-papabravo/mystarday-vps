'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  PLAY_WORLD_SLUGS,
  playHrefForSlug,
  normalizePlayCustomization,
  applyPlayAction,
  publicWorldConfig,
  isPlayWorldSlug,
} = require('../src/lib/build-world-play');

describe('build world play', () => {
  it('lists 6 play world slugs (garage is separate)', () => {
    assert.equal(PLAY_WORLD_SLUGS.length, 6);
    assert.ok(PLAY_WORLD_SLUGS.includes('husdjur'));
    assert.ok(PLAY_WORLD_SLUGS.includes('vardag'));
  });

  it('playHrefForSlug routes racerbil to garage and husdjur to pet-home', () => {
    assert.equal(playHrefForSlug('racerbil'), '/child/garage');
    assert.equal(playHrefForSlug('husdjur'), '/child/pet-home');
    assert.equal(playHrefForSlug('laxor'), '/child/play/laxor');
    assert.equal(playHrefForSlug('unknown'), '/child/world');
  });

  it('normalizePlayCustomization clamps stats and validates pickers', () => {
    const c = normalizePlayCustomization('husdjur', {
      happiness: 200,
      hunger: -5,
      pet_id: 'bogus',
    });
    assert.equal(c.happiness, 100);
    assert.equal(c.hunger, 0);
    assert.equal(c.pet_id, 'hund');
  });

  it('applyPlayAction updates husdjur feed stats', () => {
    const base = normalizePlayCustomization('husdjur', { happiness: 50, hunger: 30, cleanliness: 80 });
    const result = applyPlayAction('husdjur', base, 'feed');
    assert.ok(result.message.includes('Nom nom'));
    assert.ok(result.customization.hunger > 30);
    assert.ok(result.customization.happiness > 50);
  });

  it('publicWorldConfig exposes play href for shell worlds', () => {
    const cfg = publicWorldConfig('dinosaurie');
    assert.equal(cfg.catalog_slug, 'dinosaurie');
    assert.match(cfg.hero_svg, /dino-hero\.svg/);
    assert.equal(cfg.play_href, '/child/play/dinosaurie');
  });

  it('isPlayWorldSlug excludes racerbil', () => {
    assert.equal(isPlayWorldSlug('racerbil'), false);
    assert.equal(isPlayWorldSlug('fiske'), true);
  });

  it('play route registered in index.js', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/child\/play\/:slug/);
    assert.match(src, /build-play-world\.html/);
  });

  it('play page uses brand CSS and auth', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/build-play-world.html'), 'utf8');
    assert.match(html, /build-play-world\.css/);
    assert.match(html, /build-play-world\.js/);
    assert.match(html, /auth\.js/);
  });

  it('all 12 SVG assets exist', () => {
    const names = [
      'pet-hero', 'pet-scene', 'dino-hero', 'dino-scene',
      'doll-hero', 'doll-scene', 'fish-hero', 'fish-scene',
      'study-hero', 'study-scene', 'room-hero', 'room-scene',
    ];
    names.forEach(function (n) {
      const p = path.join(ROOT, 'public/img/build/svg', n + '.svg');
      assert.ok(fs.existsSync(p), 'missing ' + n + '.svg');
    });
  });

  it('build-loop exposes play API routes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/build-loop.js'), 'utf8');
    assert.match(src, /\/play\/:catalogSlug/);
    assert.match(src, /build-world-play/);
  });

  it('client play hrefs helper mirrors server', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/build-play-hrefs.js'), 'utf8');
    assert.match(src, /playHrefForSlug/);
    assert.match(src, /\/child\/play\//);
  });
});
