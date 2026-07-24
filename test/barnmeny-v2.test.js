'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('barnmeny v2 — Sprint 0 config', () => {
  it('child-worlds.js defines legacy and gated samling nav', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /id: 'today'/);
    assert.match(src, /LEGACY_WORLDS/);
    assert.match(src, /SAMLING_WORLDS/);
    assert.match(src, /activeChildNavItem/);
    assert.match(src, /nav\.myPeople/);
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

  it('child-package-nav removed (barnmeny v2 uses child-worlds)', () => {
    assert.ok(!fs.existsSync(path.join(ROOT, 'public/js/child-package-nav.js')));
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.doesNotMatch(html, /child-package-nav\.js/);
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

  it('barnmeny v2 nav scripts are precached for offline PWA', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /'\/js\/child-worlds\.js'/);
    assert.match(sw, /'\/js\/child-worlds-nav\.js'/);
    assert.match(sw, /'\/js\/child-layer-router\.js'/);
  });
});

describe('barnmeny v2 — Sprint 2 modules', () => {
  it('child-shell.js orchestrates worlds', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-shell.js'), 'utf8');
    assert.match(src, /ChildToday/);
    assert.match(src, /ChildWorld/);
    assert.match(src, /ChildFamily/);
    assert.match(src, /child_world_view/);
  });

  it('engine modules exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/child-activity-engine.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/child-rewards-engine.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/child-support-layer.js')));
  });
});

describe('barnmeny v2 — Sprint 3 routes', () => {
  it('index.js registers child world routes and redirect', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/child\/today/);
    assert.match(src, /\/child\/world/);
    assert.match(src, /\/child\/family/);
    assert.match(src, /\/child-dashboard.*\/child\/today/s);
  });

  it('auth redirects child to /child/today', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    assert.match(src, /\/child\/today/);
  });
});

describe('barnmeny v2 — Sprint 4 coach & support', () => {
  it('child-today-coach has aria-live', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-today-coach.js'), 'utf8');
    assert.match(src, /aria-live/);
    assert.match(src, /today_coach_post_activity/);
  });

  it('child-support-layer renders substeps', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-support-layer.js'), 'utf8');
    assert.match(src, /renderSubsteps/);
    assert.match(src, /Steg/);
  });
});

describe('barnmeny v2 — Sprint 5 cleanup', () => {
  it('child-package-nav removed after v2 rollout', () => {
    assert.ok(!fs.existsSync(path.join(ROOT, 'public/js/child-package-nav.js')));
  });

  it('child-layer-router uses ChildWorlds when v2', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-layer-router.js'), 'utf8');
    assert.match(src, /ChildWorlds/);
  });

  it('index.js registers child world routes before static-routes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    const todayIdx = src.indexOf("app.get('/child/today'");
    const staticIdx = src.indexOf("require('./static-routes')");
    assert.ok(todayIdx > 0 && staticIdx > todayIdx, 'child/today must register before static-routes');
  });

  it('child-worlds labelForWorld supports personal name', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    assert.match(src, /labelForWorld/);
    assert.match(src, /\{name\}/);
  });

  it('child-worlds-nav reads childName for labels', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    assert.match(src, /childName/);
    assert.match(src, /labelForWorld/);
  });
});
