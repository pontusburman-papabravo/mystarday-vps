'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('FEAT-1 boendeschema', () => {
  it('custody domain migration adds pattern_type and configuration', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808970000000_custody_schedule_domain.js'),
      'utf8'
    );
    assert.match(src, /custody_pattern/);
    assert.match(src, /pattern_type/);
    assert.match(src, /configuration/);
  });

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
    assert.match(routes, /buildCustodyContextResponse/);
  });

  it('calendar integrates custody schedule engine', () => {
    const cal = fs.readFileSync(path.join(ROOT, 'src/routes/calendar.js'), 'utf8');
    assert.match(cal, /resolveCustodyDateSync/);
    assert.match(cal, /loadCustodyContext/);
    assert.doesNotMatch(cal, /custody-resolver/);
  });

  it('UI scripts exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/custody-settings.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/custody-banner.js')));
  });

  it('custody analytics events whitelisted', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
    assert.match(src, /custody_banner_seen/);
    assert.match(src, /custody_view_filtered/);
    assert.match(src, /custody_schedule_created/);
    assert.match(src, /custody_filter_changed/);
    assert.match(src, /custody_schedule_updated/);
  });

  it('custody schedule enabled globally via migration', () => {
    const mig = fs.readFileSync(
      path.join(ROOT, 'migrations/1808720000000_enable_custody_schedule.js'),
      'utf8'
    );
    assert.match(mig, /custody_schedule_beta/);
    assert.match(mig, /enabled = true/);
  });

  it('custody flag exempt from onboarding launch cohort', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/activation-flags.js'), 'utf8');
    assert.match(src, /COHORT_EXEMPT_FLAG_KEYS/);
    assert.match(src, /custody_schedule_beta/);
  });
});
