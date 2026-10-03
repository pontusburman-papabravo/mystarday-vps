'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function blockBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  assert.ok(start >= 0, 'missing ' + startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, 'missing ' + endMarker);
  return src.slice(start, end);
}

describe('family child profile four tabs', () => {
  it('renderChildCard href is /family/child/ plus the child id', () => {
    const src = read('public/js/family.js');
    const fn = blockBetween(src, 'function renderChildCard(child)', 'function renderAdultCard');
    assert.match(fn, /\/family\/child\/' \+ encodeURIComponent\(child\.id\)/);
  });

  it('family.html has no child drawer and no z-[9050]', () => {
    const html = read('public/family.html');
    assert.doesNotMatch(html, /id="childDrawer"/);
    assert.doesNotMatch(html, /id="childDrawerPanel"/);
    assert.doesNotMatch(html, /z-\[9050\]/);
  });

  it('child-profile tab ids are exactly overview, schema, rewards, setup', () => {
    const src = read('public/js/child-profile.js');
    const tabs = blockBetween(src, 'const TABS = [', '];');
    const ids = [...tabs.matchAll(/id: '([^']+)'/g)].map(function (m) { return m[1]; });
    assert.deepEqual(ids, ['overview', 'schema', 'rewards', 'setup']);
  });

  it('log, progress, and child-view are secondary links, not tab buttons', () => {
    const src = read('public/js/child-profile.js');
    const tabs = blockBetween(src, 'const TABS = [', '];');
    assert.doesNotMatch(tabs, /id: 'log'|id: 'progress'|id: 'child-view'/);
    const secondary = blockBetween(src, 'const SECONDARY_LINKS = [', '];');
    const ids = [...secondary.matchAll(/id: '([^']+)'/g)].map(function (m) { return m[1]; });
    assert.deepEqual(ids, ['log', 'progress', 'child-view']);
    assert.match(src, /data-secondary="' \+ item\.id/);
    assert.doesNotMatch(src, /data-tab="log"|data-tab="progress"|data-tab="child-view"|data-tab="settings"/);
  });

  it('schema content links to /schedule?child=', () => {
    const src = read('public/js/child-profile.js');
    const schema = blockBetween(src, "if (tab === 'schema')", "if (tab === 'rewards')");
    assert.match(schema, /child-profile-schema-link/);
    assert.match(schema, /\/schedule\?child=' \+ encodeURIComponent\(childId\)/);
  });

  it('rewards content links to /rewards with the child, not library#rewards', () => {
    const src = read('public/js/child-profile.js');
    const rewards = blockBetween(src, 'async function rewardsTabHtml()', 'function quickActionsHtml()');
    assert.match(rewards, /child-profile-rewards-link/);
    assert.match(rewards, /\/rewards\?child=' \+ encodeURIComponent\(childId\)/);
    assert.doesNotMatch(rewards, /\/library#rewards/);
    assert.doesNotMatch(src, /\/library#rewards/);
  });

  it('old tab query values map onto the four tabs or a secondary link', () => {
    const src = read('public/js/child-profile.js');
    const map = blockBetween(src, 'const LEGACY_PROFILE_TABS = {', '};');
    assert.match(map, /settings: \{ tab: 'setup', secondary: null \}/);
    assert.match(map, /log: \{ tab: 'overview', secondary: 'log' \}/);
    assert.match(map, /progress: \{ tab: 'overview', secondary: 'progress' \}/);
    assert.match(map, /'child-view': \{ tab: 'overview', secondary: 'child-view' \}/);
    assert.match(src, /function mapLegacyTab/);
    assert.match(src, /LEGACY_PROFILE_TABS\[raw\]/);
    const logLink = blockBetween(src, 'function secondaryLinksHtml', 'function secondaryPanelHtml');
    assert.match(logLink, /\/daily-log\?childId=/);
    assert.match(src, /id="profileProgressBody"/);
    assert.match(src, /id="childHandoffBtn"/);
  });

  it('parent primary nav stays Hem, Planering, Belöningar, För dig, Familj', () => {
    const src = read('public/js/nav-config.js');
    const nav = blockBetween(src, 'const PRIMARY_NAV = [', 'const SETTINGS_NAV');
    const ids = [...nav.matchAll(/id: '([^']+)'/g)].map(function (m) { return m[1]; });
    assert.deepEqual(ids, ['home', 'planning', 'rewards', 'for_you', 'family']);
  });
});
