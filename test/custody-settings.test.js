'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('custody-settings (Phase 4.5d)', () => {
  it('uses custody API only — no client-side custody date logic', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/custody-settings.js'), 'utf8');
    assert.match(src, /\/api\/family\/custody/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
    assert.doesNotMatch(src, /custody-resolver/);
    assert.doesNotMatch(src, /resolveCustodyDate/);
  });

  it('exposes pattern selector with home labels — not Vecka A/B', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/custody-settings.js'), 'utf8');
    assert.match(src, /alternate_weeks/);
    assert.match(src, /alternate_weekends/);
    assert.match(src, /custom/);
    assert.match(src, /Varannan vecka/);
    assert.match(src, /Varannan helg/);
    assert.match(src, /Eget mönster/);
    assert.match(src, /Hem period 1/);
    assert.match(src, /Bashem vardagar/);
    assert.match(src, /custody-custom-day/);
    assert.match(src, /custody-cycle-length/);
    assert.doesNotMatch(src, /Vecka A/);
    assert.doesNotMatch(src, /Vecka B/);
  });

  it('custom pattern saves configuration.cycle_weeks via API', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/custody-settings.js'), 'utf8');
    assert.match(src, /configuration: \{ cycle_weeks: cycleWeeks \}/);
    assert.match(src, /PATTERN_CUSTOM/);
    assert.match(src, /mondayOfWeek/);
    assert.match(src, /CUSTOM_HELP_TEXT/);
    assert.match(src, /minst två olika hem/);
  });

  it('override section uses custody override API — no client date logic', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/custody-settings.js'), 'utf8');
    assert.match(src, /custody-overrides-section/);
    assert.match(src, /\/api\/family\/custody\/overrides\//);
    assert.doesNotMatch(src, /resolveCustodyDate/);
  });

  it('saves pattern_type and default_home_id via pattern API', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/custody-settings.js'), 'utf8');
    assert.match(src, /pattern_type/);
    assert.match(src, /default_home_id/);
    assert.match(src, /readPatternPayload/);
    assert.match(src, /custody-fields-weekends/);
    assert.match(src, /visible\.querySelector\('\.custody-week-a'\)/);
    assert.match(src, /custody_schedule_updated/);
    assert.match(src, /CustodyA11y/);
    assert.match(src, /homeMarkerHtml/);
  });

  it('PUT pattern route accepts pattern_type and weekend configuration', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/family/custody.js'), 'utf8');
    assert.match(routes, /pattern_type/);
    assert.match(routes, /default_home_id krävs för varannan helg/);
    assert.match(routes, /alternate_weekends/);
    assert.match(routes, /weekend_home_a/);
    assert.match(routes, /custody_schedule_updated/);
    assert.doesNotMatch(routes, /custody_week_variant_changed/);
    assert.doesNotMatch(routes, /Vecka A/);
  });
});
