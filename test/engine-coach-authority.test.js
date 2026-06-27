'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Engine coach authority (PR1)', () => {
  it('engine-coach only targets engineCoachMount', () => {
    const src = read('public/js/engine-coach.js');
    assert.match(src, /engineCoachMount/);
    assert.doesNotMatch(src, /homeReadinessMount/);
    assert.doesNotMatch(src, /medforalderCtaBanner/);
    assert.match(src, /data-authority.*engine-only/);
  });

  it('legacy modules do not write to engineCoachMount', () => {
    const files = [
      'public/js/home-readiness.js',
      'public/js/dashboard-cta.js',
      'public/js/activation-program-banner.js',
      'public/js/activation-program-aha-card.js',
    ];
    for (const f of files) {
      const src = read(f);
      assert.doesNotMatch(src, /engineCoachMount/i, f + ' must not reference monopoly mount');
    }
  });

  it('dashboard.html declares exclusive mount above readiness', () => {
    const html = read('public/dashboard.html');
    const engineIdx = html.indexOf('id="engineCoachMount"');
    const readinessIdx = html.indexOf('id="homeReadinessMount"');
    assert.ok(engineIdx > 0 && readinessIdx > 0);
    assert.ok(engineIdx < readinessIdx, 'Engine monopoly slot must appear before readiness');
    assert.match(html, /data-authority="engine-only"/);
  });

  it('engine-client logs authority conflicts', () => {
    const src = read('public/js/engine-client.js');
    assert.match(src, /engine_authority_conflict/);
    assert.match(src, /detectAuthorityConflicts/);
  });
});
