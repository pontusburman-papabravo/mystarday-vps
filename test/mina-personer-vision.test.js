'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VISION = path.join(ROOT, 'docs/mina-personer-vision.md');
const PROMPT = path.join(ROOT, 'docs/mina-personer-agent-prompt.md');

describe('Mina personer vision — product constitution', () => {
  it('is product-only with Olle-test and exclusive state machine', () => {
    const vision = fs.readFileSync(VISION, 'utf8');
    assert.match(vision, /Olle-test/);
    assert.match(vision, /Filterregel/);
    assert.match(vision, /Tillståndsmaskin \(exklusiv\)/);
    assert.match(vision, /Jag är inte ensam/);
    assert.match(vision, /Vem finns här för mig/);
    assert.match(vision, /Personkort/);
    assert.match(vision, /Vanliga felidéer/);
    assert.match(vision, /Öppna frågor/);
    assert.match(vision, /vision först, ingen implementation/i);
    assert.doesNotMatch(vision, /child-family-hall\.js/);
    assert.doesNotMatch(vision, /npm run test:gate/);
    assert.doesNotMatch(vision, /resolveFamilyState/);
  });

  it('agent prompt is blocked until vision approved', () => {
    const prompt = fs.readFileSync(PROMPT, 'utf8');
    assert.match(prompt, /BLOCKERAD/);
    assert.match(prompt, /mina-personer-vision\.md/);
    assert.doesNotMatch(prompt, /if \(!person\)/);
  });

  it('locks domain boundaries vs Idag and Skattkammaren', () => {
    const vision = fs.readFileSync(VISION, 'utf8');
    assert.match(vision, /Gränser mot Idag och Skattkammaren/);
    assert.match(vision, /berättelse, inte ekonomi/i);
    assert.match(vision, /ingen checklista/i);
  });
});
