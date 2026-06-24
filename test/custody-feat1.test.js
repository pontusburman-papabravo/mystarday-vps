'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('FEAT-1 boendeschema', () => {
  it('migration creates custody tables and week_variant', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808650000000_custody_schedule.js'),
      'utf8'
    );
    assert.match(src, /custody_home/);
    assert.match(src, /custody_pattern/);
    assert.match(src, /week_variant/);
  });

  it('family custody routes mounted', () => {
    const idx = fs.readFileSync(path.join(ROOT, 'src/routes/family/index.js'), 'utf8');
    assert.match(idx, /\/custody/);
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/family/custody.js'), 'utf8');
    assert.match(routes, /\/custody\/pattern/);
    assert.match(routes, /\/custody\/setup/);
  });

  it('calendar integrates custody resolver', () => {
    const cal = fs.readFileSync(path.join(ROOT, 'src/routes/calendar.js'), 'utf8');
    assert.match(cal, /custodyPattern/);
    assert.match(cal, /getWeekVariantForDate/);
  });

  it('UI scripts exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/custody-settings.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/custody-banner.js')));
  });

  it('custody analytics events whitelisted', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
    assert.match(src, /custody_banner_seen/);
    assert.match(src, /custody_view_filtered/);
  });
});
