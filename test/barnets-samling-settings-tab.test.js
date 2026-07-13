'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('barnets_samling — Mitt settings tab', () => {
  it('SAMLING_WORLDS includes settings as fifth tab', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const block = src.slice(src.indexOf('SAMLING_WORLDS'), src.indexOf('LEGACY_HASH'));
    assert.match(block, /id: 'settings'/);
    assert.match(block, /\/child\/settings/);
    assert.match(block, /tabKey: 'settings'/);
    assert.match(block, /Mitt/);
  });

  it('SAMLING_HASH maps settings aliases', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const block = src.slice(src.indexOf('SAMLING_HASH'), src.indexOf('let _barnetsSamling'));
    assert.match(block, /settings: 'settings'/);
    assert.match(block, /mitt: 'settings'/);
    assert.match(block, /more: 'settings'/);
  });

  it('routes register /child/settings', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /\/child\/settings/);
  });

  it('child-settings-view: child actions without PIN, parent switch_child with PIN', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-settings-view.js'), 'utf8');
    assert.match(src, /ChildCustomizationEntries/);
    assert.match(src, /CHILD_ACTIONS/);
    assert.match(src, /PARENT_ACTIONS/);
    assert.match(src, /id: 'dark_mode'/);
    assert.match(src, /id: 'logout'/);
    assert.match(src, /data-child-action="/);
    assert.match(src, /Vill du logga ut\?/);
    assert.match(src, /data-parent-action="/);
    assert.match(src, /id: 'switch_child'/);
    assert.match(src, /ParentalGate\.requireParentMode/);
    assert.doesNotMatch(src, /CHILD_SYSTEM_ACTIONS/);
    assert.doesNotMatch(src, /data-parent-action="logout"/);
    assert.doesNotMatch(src, /data-parent-action="dark_mode"/);
    const runChildBlock = src.slice(src.indexOf('function runChildAction'), src.indexOf('function runParentAction'));
    assert.doesNotMatch(runChildBlock, /ParentalGate/);
    const bindParentBlock = src.slice(src.indexOf('function bindParentActions'), src.indexOf('function refresh'));
    assert.match(bindParentBlock, /ParentalGate\.requireParentMode/);
  });

  it('customization entries live in shared module (not Min samling page)', () => {
    const present = fs.readFileSync(path.join(ROOT, 'public/js/child-samling-present.js'), 'utf8');
    const entries = fs.readFileSync(path.join(ROOT, 'public/js/child-customization-entries.js'), 'utf8');
    assert.doesNotMatch(present, /bspOpenThemePicker/);
    assert.match(entries, /bspOpenThemePicker/);
    assert.match(entries, /bspOpenPictogramPicker/);
    assert.match(entries, /bspOpenCardSizePicker/);
  });

  it('child-dashboard wires settingsView and showTab refresh', () => {
    const dash = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'public/child-dashboard.html'), 'utf8');
    assert.match(dash, /settingsView/);
    assert.match(dash, /ChildSettingsView\.refresh/);
    assert.match(html, /id="settingsView"/);
    assert.match(html, /child-settings-view\.js/);
    assert.match(html, /child-settings\.css/);
  });

  it('bottom nav uses personal Mitt avatar icon', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    assert.match(src, /settingsNavIconMarkup/);
    assert.match(src, /child-mitt-nav-avatar/);
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-bottom-nav.css'), 'utf8');
    assert.match(css, /\.child-mitt-nav-avatar/);
  });

  it('child-capabilities: only switch_child behind parental gate in header menu', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-capabilities.js'), 'utf8');
    assert.match(src, /id: 'switch_child'/);
    assert.doesNotMatch(src, /id: 'dark_mode'/);
    assert.doesNotMatch(src, /id: 'logout'/);
  });

  it('barnets_samling hides duplicate header actions — Mitt tab owns system actions', () => {
    const bootCss = fs.readFileSync(path.join(ROOT, 'public/css/child-app-boot.css'), 'utf8');
    const worlds = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds.js'), 'utf8');
    const systemMenu = fs.readFileSync(path.join(ROOT, 'public/js/child-system-menu.js'), 'utf8');
    const shell = fs.readFileSync(path.join(ROOT, 'public/js/child-shell.js'), 'utf8');
    assert.match(bootCss, /\[data-barnets-samling="on"\] #switchChildBtn/);
    assert.match(bootCss, /\[data-barnets-samling="on"\] #logoutBtn/);
    assert.match(bootCss, /\[data-barnets-samling="on"\] #childSystemIconBtn/);
    assert.match(bootCss, /\[data-barnets-samling="on"\] #childMainHeader/);
    assert.match(worlds, /hideSamlingHeaderActions/);
    assert.match(systemMenu, /shouldMount/);
    assert.match(systemMenu, /isBarnetsSamlingEnabled/);
    assert.doesNotMatch(systemMenu, /DOMContentLoaded.*mount/);
    assert.match(shell, /ChildSystemMenu\.shouldMount/);
  });

  it('Mitt tab isolates Idag chrome — settings layer hides schedule/focus', () => {
    const dash = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
    const router = fs.readFileSync(path.join(ROOT, 'public/js/child-layer-router.js'), 'utf8');
    const nav = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    const focusCss = fs.readFileSync(path.join(ROOT, 'public/css/child-today-focus.css'), 'utf8');
    const settingsCss = fs.readFileSync(path.join(ROOT, 'public/css/child-settings.css'), 'utf8');
    assert.match(dash, /applySamlingTabChrome/);
    assert.match(router, /isSettings/);
    assert.match(router, /hideIdagChrome/);
    assert.match(nav, /tabKey === 'settings'/);
    assert.match(focusCss, /\[data-child-layer="settings"\] #scheduleView/);
    assert.match(focusCss, /\[data-child-layer="settings"\] #todayFocusMount/);
    assert.match(settingsCss, /#settingsView\[data-active="true"\]/);
  });

  it('legacy family hall renders parent avatars via MemberAvatar', () => {
    const legacy = fs.readFileSync(path.join(ROOT, 'public/js/child-family-hall-legacy.js'), 'utf8');
    assert.match(legacy, /MemberAvatar\.renderMemberAvatar/);
    assert.match(legacy, /avatar_src/);
  });

  it('navigateWorld uses SPA showTab when barnets_samling gate is on', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    const fn = src.slice(src.indexOf('function navigateWorld'), src.indexOf('function applyV2Chrome'));
    const gateBlock = fn.slice(fn.indexOf('if (gateOn)'), fn.indexOf('if (world && world.href)'));
    assert.match(gateBlock, /showTab\(tabKey\)/);
    assert.match(gateBlock, /syncChildRoute\(worldId/);
    assert.doesNotMatch(gateBlock, /location\.href/);
  });

  it('five-tab bottom nav keeps 44px+ touch targets', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-bottom-nav.css'), 'utf8');
    assert.match(css, /min-height: 52px/);
    assert.match(css, /#settingsView/);
    assert.match(css, /safe-area-inset-bottom/);
  });
});
