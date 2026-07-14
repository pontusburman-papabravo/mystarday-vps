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

  it('hub has quick actions for retroactive fill and engångsaktivitet', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /renderQuickActions/);
    assert.match(hub, /I efterhand/);
    assert.match(hub, /Engångs-/);
    assert.match(hub, /openOnceTaskModal/);
    assert.match(hub, /parent-quick-grid/);
    assert.match(hub, /button\[data-action\]/);
  });

  it('hub quick actions use IconSystem assets', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /quickActionIcon/);
    assert.match(hub, /registrera-i-efterhand/);
    assert.match(hub, /engangsaktivitet/);
    assert.match(hub, /extra-stjarnor/);
    assert.match(hub, /IconSystem\.hub/);
  });

  it('hub removes action grid and encouragement copy', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.doesNotMatch(hub, /renderActionGrid/);
    assert.doesNotMatch(hub, /encouragementCopy/);
    assert.doesNotMatch(hub, /renderCoParentCta/);
  });

  it('child row links to daily-log when child has activities today', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /childRowHref/);
    assert.match(hub, /\/daily-log\?childId=/);
    assert.match(hub, /parent-ready-chevron/);
  });

  it('hub shows handoff before week section', () => {
    const hub = read('public/js/dashboard-home-hub.js');
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

  it('SW cache version matches config (Hem + Planering merge)', () => {
    const sw = read('public/sw.js');
    const cache = JSON.parse(read('config/cache-version.json'));
    assert.match(sw, new RegExp("const CACHE_NAME = '" + cache.cacheName + "'"));
    assert.ok(cache.cacheName >= 'stjarndag-v435', 'for-dig branch should be at v435+ after merge');
  });
});
