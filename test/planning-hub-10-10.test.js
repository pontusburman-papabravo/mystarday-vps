'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HUB = path.join(ROOT, 'public/js/planning-hub.js');

describe('Planering hub 10/10', () => {
  it('uses vision copy-regel underrader', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    assert.match(src, /title: 'Bibliotek', sub: 'Skapa aktiviteter och belöningar'/);
    assert.match(src, /title: 'Kalender', sub: 'Se månad och specialdagar'/);
    assert.match(src, /title: 'Veckoschema', sub: 'Redigera barnets vecka'/);
    assert.match(src, /title: 'Boendeschema', sub: 'Växelvis boende mellan hushåll'/);
    assert.match(src, /title: 'Daglig logg', sub: 'Se och justera tidigare dagar'/);
    assert.match(src, /title: 'Tilldela schema', sub: 'Kopiera schema till barn'/);
  });

  it('prioritizes Veckoschema and Kalender before Övrigt', () => {
    const src = fs.readFileSync(HUB, 'utf8');
    const planIdx = src.indexOf('const PLAN_LINKS');
    const otherIdx = src.indexOf('const OTHER_LINKS');
    assert.ok(planIdx >= 0 && otherIdx > planIdx);
    assert.match(src, /sectionHtml\('Planera vardagen'/);
    assert.match(src, /sectionHtml\('Bygg innehåll'/);
    const planSectionIdx = src.indexOf("sectionHtml('Planera vardagen'");
    const buildSectionIdx = src.indexOf("sectionHtml('Bygg innehåll'");
    assert.ok(planSectionIdx > 0 && buildSectionIdx > planSectionIdx);
    assert.match(src, /sectionHtml\('Övrigt'/);
    const veckoIdx = src.indexOf("title: 'Veckoschema'");
    const boendeIdx = src.indexOf('CUSTODY_LINK');
    const dagligIdx = src.indexOf("title: 'Daglig logg'");
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
    assert.match(src, /Kom igång/);
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
