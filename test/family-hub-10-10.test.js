'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FAMILY_JS = path.join(ROOT, 'public/js/family.js');
const FAMILY_HUB = path.join(ROOT, 'public/js/family-hub.js');
const FAMILY_HTML = path.join(ROOT, 'public/family.html');

describe('Familj hub 10/10', () => {
  it('priority ladder: Barn before Vuxna before secondary content', () => {
    const html = fs.readFileSync(FAMILY_HTML, 'utf8');
    const barnIdx = html.indexOf('id="familyChildrenSection"');
    const vuxnaIdx = html.indexOf('id="familyAdultsSection"');
    const secondaryIdx = html.indexOf('id="familyHubSecondary"');
    const pedagogIdx = html.indexOf('id="familyPedagogSection"');
    assert.ok(barnIdx >= 0 && vuxnaIdx > barnIdx);
    assert.ok(pedagogIdx > vuxnaIdx && pedagogIdx < secondaryIdx);
    assert.ok(secondaryIdx > vuxnaIdx);
  });

  it('child cards link to barnprofil — no settings button on card', () => {
    const src = fs.readFileSync(FAMILY_JS, 'utf8');
    assert.match(src, /family-child-card/);
    assert.match(src, /\/family\/child\/'/);
    assert.doesNotMatch(src, /family-child-settings-btn/);
    assert.doesNotMatch(src, /Inställningar[\s\S]*?family-child-card/);
  });

  it('openChildDrawer redirects to barnprofil', () => {
    const src = fs.readFileSync(FAMILY_JS, 'utf8');
    assert.match(src, /function openChildDrawer/);
    assert.match(src, /window\.location\.href = url/);
    assert.match(src, /\/family\/child\//);
  });

  it('legacy ?child= URL redirects to barnprofil', () => {
    const src = fs.readFileSync(FAMILY_JS, 'utf8');
    assert.match(src, /urlParams\.get\('child'\)/);
    assert.match(src, /window\.location\.replace\('\/family\/child\//);
  });

  it('vuxna section has single primary invite CTA', () => {
    const html = fs.readFileSync(FAMILY_HTML, 'utf8');
    const adultsBlock = html.slice(html.indexOf('id="familyAdultsSection"'), html.indexOf('id="familyPedagogSection"'));
    assert.match(adultsBlock, /\+ Bjud in förälder/);
    assert.match(adultsBlock, /openCoParentInviteModal/);
    const primaryMatches = adultsBlock.match(/bg-gold[\s\S]*?Bjud in förälder/g) || [];
    assert.ok(primaryMatches.length >= 1 && primaryMatches.length <= 2);
  });

  it('hub summary visible without magic hero stats', () => {
    const html = fs.readFileSync(FAMILY_HTML, 'utf8');
    assert.match(html, /id="familyHubSummary"/);
    assert.match(html, /family-hub-intro/);
    const hubs = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
    assert.match(hubs, /page === 'family'[\s\S]*el\.innerHTML = ''[\s\S]*el\.classList\.add\('hidden'\)/);
  });

  it('family-hub.js handles pedagog section via capabilities', () => {
    const src = fs.readFileSync(FAMILY_HUB, 'utf8');
    assert.match(src, /family_pedagog_interest/);
    assert.match(src, /capabilitiesForPlacement/);
    assert.match(src, /afterRender: afterRender/);
  });

  it('child-profile-setup includes barnvy & rutiner settings inline', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(src, /Barnvy & rutiner/);
    assert.match(src, /profileSetupNnl/);
    assert.match(src, /saveNnlMode/);
    assert.doesNotMatch(src, /\/child-settings\?child=/);
  });

  it('child-profile-setup lets parent rename child (name + emoji)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(src, /profileSetupIdentityForm/);
    assert.match(src, /profileSetupName/);
    assert.match(src, /Barnets namn/);
    assert.match(src, /Spara profil/);
    assert.match(src, /wireIdentityForm/);
    assert.match(src, /method:\s*'PUT'/);
  });

  it('child-settings redirects to barnprofil setup tab', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(routes, /\/child-settings[\s\S]*\/family\/child\/\$\{encodeURIComponent\(childId\)\}\?tab=setup/);
    assert.doesNotMatch(routes, /child-settings\.html/);
  });

  it('child-profile-setup shows reward star_cost', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-setup.js'), 'utf8');
    assert.match(src, /star_cost/);
  });

  it('SW bumped for Familj 10/10', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/cache-version.json'), 'utf8'));
    assert.match(sw, new RegExp("const CACHE_NAME = '" + cache.cacheName + "'"));
    assert.ok(cache.cacheName >= 'stjarndag-v492');
  });
});
