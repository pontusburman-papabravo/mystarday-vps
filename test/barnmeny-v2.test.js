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

describe('barnmeny v2 — Sprint 1 three-world nav', () => {
  it('child-worlds-nav.js renders from ChildWorlds', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    assert.match(src, /ChildWorlds\.CHILD_WORLDS/);
    assert.match(src, /aria-current/);
    assert.match(src, /Barnnavigering/);
  });

  it('child-system-menu.js uses ParentalGate', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-system-menu.js'), 'utf8');
    assert.match(src, /ParentalGate\.requireParentMode/);
    assert.match(src, /CHILD_SYSTEM_ACTIONS/);
  });

  it('child-package-nav skips when v2 enabled', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-package-nav.js'), 'utf8');
    assert.match(src, /ChildWorlds\.V2_ENABLED/);
  });

  it('session-gate allows /child/* routes in child mode', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    assert.match(src, /path\.indexOf\('\/child\/'\)/);
  });

  it('child-dashboard integrates v2 chrome', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    assert.match(src, /ChildWorlds\.V2_ENABLED/);
    assert.match(src, /ChildWorldsNav/);
  });
});
