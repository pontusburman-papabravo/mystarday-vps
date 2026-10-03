'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HUB = path.join(ROOT, 'public/js/planning-hub.js');

describe('Planering hub 10/10', () => {
  it('uses vision copy-regel underrader via locale keys', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /planning\.primary\.week\.title/);
    assert.match(src, /planning\.primary\.activities\.title/);
    assert.match(src, /planning\.primary\.more\.title/);
    assert.match(src, /planning\.links\.custody\.title/);
    assert.match(src, /planning\.links\.custody\.sub/);
    assert.match(src, /planning\.links\.assignSchedule\.sub/);
    assert.match(src, /planning\.links\.printSchema\.title/);
  });

  it('keeps Veckan and Aktiviteter as the only primary hrefs, with Mer as the third choice', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    const primaryIdx = src.indexOf('const PRIMARY_CHOICES');
    const merIdx = src.indexOf('const MER_LINKS');
    assert.ok(primaryIdx >= 0 && merIdx > primaryIdx);
    const primaryBlock = src.slice(primaryIdx, merIdx);
    assert.match(primaryBlock, /'\/schedule'/);
    assert.match(primaryBlock, /'\/library'/);
    assert.doesNotMatch(primaryBlock, /\/calendar/);
    assert.doesNotMatch(primaryBlock, /\/daily-log/);
    assert.match(src, /data-planning-primary="more"/);
  });

  it('hides boendeschema unless custody is active', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /fetchCustodyActive/);
    assert.match(src, /homes\.length > 1 \|\| patterns\.length > 0/);
    assert.match(src, /if \(custodyActive\) more\.push\(CUSTODY_LINK\)/);
  });

  it('shows Kom igång tom-state for families without schedule today', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /planning\.gettingStarted\.title/);
    assert.match(src, /fetchNeedsGettingStarted/);
    assert.match(src, /href="\/for-dig"/);
    assert.match(src, /showGettingStarted/);
    assert.doesNotMatch(src, /Kom igång För dig.*min-h-\[44px\]/);
  });

  it('planning hub page skips large magic hero', () => {
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    assert.match(hubs, /page === 'planning'/);
    assert.match(hubs, /el\.classList\.add\('hidden'\)/);
  });

  it('keeps capabilities in Övrigt via capabilitiesForPlacement', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /capabilitiesForPlacement/);
    assert.match(src, /planning_hub/);
    assert.doesNotMatch(src, /href: '\/activities'/);
  });

  it('marks planFromPlanning on hub link click', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /PlanningBackNav\.markFromPlanning/);
  });
});
