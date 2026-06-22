'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('barnmeny v2 — Sprint 0 config', () => {
  it('child-worlds.js defines three worlds and activeChildNavItem', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /id: 'today'/);
    assert.match(src, /id: 'world'/);
    assert.match(src, /id: 'family'/);
    assert.match(src, /activeChildNavItem/);
    assert.match(src, /Mina personer/);
    assert.doesNotMatch(src, /id: 'more'/);
  });

  it('child-capabilities.js has system actions with parental gate', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-capabilities.js'), 'utf8');
    assert.match(src, /CHILD_CAPABILITIES/);
    assert.match(src, /CHILD_SYSTEM_ACTIONS/);
    assert.match(src, /requiresParentalGate: true/);
    assert.match(src, /primaryPlacement/);
  });

  it('child-placements.js registers coach and family placements', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-placements.js'), 'utf8');
    assert.match(src, /today_coach_post_activity/);
    assert.match(src, /family_hall/);
    assert.match(src, /world_history/);
  });
});
