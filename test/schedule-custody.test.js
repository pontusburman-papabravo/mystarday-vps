'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('schedule-custody (Phase 4.5c)', () => {
  it('uses calendar-week only — no custody date logic', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/schedule-custody.js'), 'utf8');
    assert.match(src, /calendar-week/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
    assert.doesNotMatch(src, /custody-resolver/);
  });

  it('shows home labels from day.custody; period fallback until labels load', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/schedule-custody.js'), 'utf8');
    assert.match(src, /syncVariantLabelsFromWeek/);
    assert.match(src, /d\.custody\.label/);
    assert.match(src, /PERIOD_FALLBACK/);
    assert.match(src, /custody_home_id/);
    assert.match(src, /home_id/);
  });

  it('day tabs get aria/title from custody label', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/schedule-custody.js'), 'utf8');
    assert.match(src, /Hos ' \+ day\.custody\.label/);
    assert.match(src, /isMyDay/);
  });

  it('Phase 1B custody hardening: exposes an explicit getActiveHomeId()/getWriteContext() accessor, reusing getCreateExtras() state', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/schedule-custody.js'), 'utf8');
    assert.match(src, /function getActiveHomeId/);
    assert.match(src, /function getWriteContext/);
    // getWriteContext must reuse getCreateExtras()'s existing state rather than duplicating it.
    assert.match(src, /function getWriteContext\(\) \{\s*return getCreateExtras\(\);\s*\}/);
    assert.match(src, /getActiveHomeId: getActiveHomeId/);
    assert.match(src, /getWriteContext: getWriteContext/);
  });
});
