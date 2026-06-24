'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateStarterPlan,
  personalizeFallbackTitle,
  sanitizeTitle,
} = require('../src/lib/starter-plan/generate-plan');

describe('generateStarterPlan', () => {
  const baseItems = [
    { name: 'Vakna', icon: '🛏️', section: 'morgon', star_value: 1, sort_order: 0 },
    { name: 'Borsta tänder', icon: '🪥', section: 'morgon', star_value: 1, sort_order: 1 },
  ];

  it('falls back without OPENAI_API_KEY', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await generateStarterPlan({
        childName: 'Ella',
        ageBand: '6-8',
        routineType: 'morning',
        supportLevel: 'medium',
        desiredLength: 'short',
        baseItems,
        scheduleName: 'Kort morgon',
      });
      assert.equal(result.used_ai, false);
      assert.ok(result.fallback_reason);
      assert.equal(result.items.length, 2);
      assert.match(result.items[0].name, /Ella/);
    } finally {
      if (prev) process.env.OPENAI_API_KEY = prev;
    }
  });

  it('sanitizeTitle trims and caps length', () => {
    assert.equal(sanitizeTitle('  Hej  '), 'Hej');
    assert.equal(sanitizeTitle(''), null);
  });

  it('personalizeFallbackTitle adds child name once', () => {
    assert.match(personalizeFallbackTitle('Vakna', 'Ella'), /Ella/);
    assert.equal(personalizeFallbackTitle('Ella vaknar', 'Ella'), 'Ella vaknar');
  });
});
