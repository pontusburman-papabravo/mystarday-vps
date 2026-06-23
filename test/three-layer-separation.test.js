'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Phase 1 — Today layer', () => {
  it('child-today-tasks caps visible tasks at 5', () => {
    const src = read('public/js/child-today-tasks.js');
    assert.match(src, /MAX_VISIBLE\s*=\s*5/);
    assert.doesNotMatch(src, /ChildUniverse|ChildSkattHouse/);
  });

  it('child-today-focus hides legacy chrome', () => {
    const src = read('public/js/child-today-focus.js');
    assert.match(src, /weekNavSection/);
    assert.match(src, /childHeaderRing/);
    assert.doesNotMatch(src, /familyMock/);
  });

  it('loadDay skips rewards fetch in focus mode', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /isTodayFocusLayer/);
    assert.match(src, /focusLayer[\s\S]*Promise\.resolve\(null\)/);
  });
});

describe('Phase 2 — Universe isolation', () => {
  it('route guards hide schedule on universe layer', () => {
    const css = read('public/css/child-today-focus.css');
    assert.match(css, /\[data-child-layer="universe"\].*#scheduleView/s);
  });

  it('child-layer-router defines three layers', () => {
    const src = read('public/js/child-layer-router.js');
    assert.match(src, /today/);
    assert.match(src, /universe/);
    assert.match(src, /family/);
  });
});

describe('Phase 3 — Family V0 (real, no mocks)', () => {
  it('child-family-hall has no mock data', () => {
    const src = read('public/js/child-family-hall.js');
    assert.doesNotMatch(src, /familyMock/);
    assert.doesNotMatch(src, /mock data/i);
    assert.match(src, /\/api\/me\/family/);
  });

  it('family-event-engine exports server-side handler', () => {
    const src = read('src/lib/family-event-engine.js');
    assert.match(src, /recordActivityContribution/);
    assert.match(src, /handleActivityCompleted/);
    assert.match(src, /family_event/);
  });

  it('migration creates family tables', () => {
    const mig = read('migrations/1801000000000_family_hall_v0.js');
    assert.match(mig, /family_project/);
    assert.match(mig, /family_event/);
    assert.match(mig, /family_chest/);
  });

  it('family-hall routes mounted in index', () => {
    const src = read('src/routes/index.js');
    assert.match(src, /family-hall/);
    assert.match(src, /\/today/);
    assert.match(src, /\/universe/);
    assert.match(src, /\/family/);
  });
});

describe('Phase 4 — Event pipe', () => {
  it('child-event-bus emits ActivityCompleted', () => {
    const src = read('public/js/child-event-bus.js');
    assert.match(src, /ActivityCompleted/);
    assert.match(src, /ChildUniverse\.invalidate/);
    assert.match(src, /ChildFamily\.invalidate/);
  });

  it('child-dashboard emits event on completion', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /ChildEventBus\.emitActivityCompleted/);
  });

  it('daily-logs hooks family event engine', () => {
    const src = read('src/routes/daily-logs/items.js');
    assert.match(src, /handleActivityCompleted/);
  });
});

describe('Phase 5 — Navigation', () => {
  it('child-dashboard has 3-tab nav', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /tabSchedule/);
    assert.match(html, /tabRewards/);
    assert.match(html, /tabFamily/);
    assert.match(html, /child-layer-router/);
    assert.match(html, /child-family-client/);
  });
});
