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
    assert.match(src, /planning\.links\.library\.title/);
    assert.match(src, /planning\.links\.calendar\.sub/);
    assert.match(src, /planning\.links\.weekSchedule\.sub/);
    assert.match(src, /planning\.links\.custody\.title/);
    assert.match(src, /planning\.links\.custody\.sub/);
    assert.match(src, /planning\.links\.dailyLog\.sub/);
    assert.match(src, /planning\.links\.assignSchedule\.sub/);
  });

  it('prioritizes Veckoschema and Kalender before Övrigt', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    const planIdx = src.indexOf('const PLAN_LINKS');
    const otherIdx = src.indexOf('const OTHER_LINKS');
    assert.ok(planIdx >= 0 && otherIdx > planIdx);
    assert.match(src, /planning\.sections\.planWeek/);
    assert.match(src, /planning\.sections\.buildContent/);
    const planSectionIdx = src.indexOf("planning.sections.planWeek");
    const buildSectionIdx = src.indexOf("planning.sections.buildContent");
    assert.ok(planSectionIdx > 0 && buildSectionIdx > planSectionIdx);
    assert.match(src, /planning\.sections\.other/);
    const veckoIdx = src.indexOf("planning.links.weekSchedule.title");
    const boendeIdx = src.indexOf('CUSTODY_LINK');
    const dagligIdx = src.indexOf("planning.links.dailyLog.title");
    assert.ok(veckoIdx < dagligIdx);
    assert.ok(boendeIdx < dagligIdx || boendeIdx > otherIdx);
  });

  it('hides boendeschema unless custody is active', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /fetchCustodyActive/);
    assert.match(src, /homes\.length > 1 \|\| patterns\.length > 0/);
    assert.match(src, /if \(custodyActive\) planLinks\.push\(CUSTODY_LINK\)/);
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
