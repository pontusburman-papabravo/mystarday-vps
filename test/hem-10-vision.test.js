'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Hem 10/10 — priority ladder', () => {
  it('dashboard-home-hub has readiness and coach slots', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /parentHubReadinessSlot/);
    assert.match(hub, /parentHubCoachSlot/);
    assert.match(hub, /relocateMounts/);
    assert.match(hub, /restoreMounts/);
  });

  it('hub removes action grid and encouragement copy', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.doesNotMatch(hub, /renderActionGrid/);
    assert.doesNotMatch(hub, /encouragementCopy/);
    assert.doesNotMatch(hub, /renderCoParentCta/);
  });

  it('hub shows progress per child and handoff before week', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /parent-ready-progress/);
    assert.match(hub, /Veckans berättelse/);
    const handoffIdx = hub.indexOf('parent-handoff-card');
    const weekIdx = hub.indexOf('parent-week-section');
    assert.ok(handoffIdx > 0 && weekIdx > handoffIdx);
  });

  it('home-readiness filters exceptions on magic home', () => {
    const src = read('public/js/home-readiness.js');
    assert.match(src, /isMagicHome/);
    assert.match(src, /isExceptionItem/);
    assert.match(src, /priority <= 1/);
  });

  it('engine coach defers when readiness visible on magic home', () => {
    const coach = read('public/js/engine-coach.js');
    const client = read('public/js/engine-client.js');
    assert.match(coach, /shouldDeferToExceptions/);
    assert.match(client, /isReadinessBlockingCoach/);
  });

  it('journey coach defers when readiness visible on magic home', () => {
    const src = read('public/js/journey-coach.js');
    assert.match(src, /shouldDeferToExceptions/);
    assert.match(src, /EngineClient\.isReadinessBlockingCoach/);
  });

  it('activation and medförälder banners suppressed on magic home', () => {
    const activation = read('public/js/activation-program-banner.js');
    const cta = read('public/js/dashboard-cta.js');
    assert.match(activation, /DashboardHomeHub\.shouldUse/);
    assert.match(cta, /DashboardHomeHub\.shouldUse/);
  });

  it('magic CSS hides bump mount and styles readiness slot', () => {
    const css = read('public/css/dashboard-magic.css');
    assert.match(css, /#homeBumpMount/);
    assert.match(css, /parent-hub-readiness-slot/);
  });

  it('SW bumped for Hem 10/10', () => {
    const sw = read('public/sw.js');
    assert.match(sw, /stjarndag-v433/);
  });
});
