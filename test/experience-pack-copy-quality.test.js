'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadPack, clearPackCache, resolveExperienceCopy } = require('../src/lib/experience-pack');

const TECHNICAL_PHRASES = [
  'komponent',
  'unlock',
  'progression',
  'runtime',
  'API',
  'har lagts ut',
];

describe('Experience Pack copy quality — Proof of Product', () => {
  beforeEach(() => clearPackCache());

  it('parent first-step message feels human, not technical', () => {
    const pack = loadPack('child_se');
    const copy = resolveExperienceCopy(pack, 'parent_ack_completion', {
      child_name: 'Alma',
      activity_name: 'Tänder',
    });

    assert.equal(copy.headline, 'Idag tog Alma sitt första steg.');
    for (const phrase of TECHNICAL_PHRASES) {
      assert.ok(!copy.headline.toLowerCase().includes(phrase), `headline contains "${phrase}"`);
      assert.ok(!copy.body.toLowerCase().includes(phrase), `body contains "${phrase}"`);
    }
    assert.notEqual(copy.cta, 'Visa');
  });

  it('celebration copy is relief-first, not star-first', () => {
    const pack = loadPack('child_se');
    const copy = resolveExperienceCopy(pack, 'celebrate_first_success', { child_name: 'Alma' });

    assert.ok(!copy.headline.toLowerCase().includes('stjärn'));
    assert.match(copy.body, /Alma/);
    assert.equal(copy.cta, 'Vad fint');
  });

  it('child whisper is optional hint only — no duplicate completion shout', () => {
    const pack = loadPack('child_se');
    const copy = resolveExperienceCopy(pack, 'child_first_completion');

    assert.equal(copy.message, undefined);
    assert.match(copy.world_hint, /Morgonhuset/);
    assert.ok(copy.world_hint.includes('…') || copy.world_hint.includes('...'));
  });
});
