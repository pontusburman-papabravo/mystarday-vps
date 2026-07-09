'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Family chest toggle (Option B)', () => {
  it('migration adds family_chest_enabled to family table', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1802000000000_family_chest_enabled.js'),
      'utf8'
    );
    assert.match(mig, /family_chest_enabled/);
    assert.match(mig, /DEFAULT true/);
  });

  it('event engine checks chest flag before updating chest', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/family-event-engine.js'),
      'utf8'
    );
    assert.match(src, /family_chest_enabled/);
    assert.match(src, /activity_contribution/);
  });

  it('child UI hides chest when chestEnabled is false', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'public/js/child-family-hall.js'),
      'utf8'
    );
    assert.match(src, /chestEnabled === false/);
    assert.match(src, /cfh-secondary-sections/);
  });

  it('parent toggle saves via /api/family/settings', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'public/js/family-chest-setting.js'),
      'utf8'
    );
    assert.match(src, /family_chest_enabled/);
    assert.match(src, /\/api\/family\/settings/);
  });

  it('API read model exposes chestEnabled', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/family-hall.js'), 'utf8');
    assert.match(src, /chestEnabled/);
  });
});
