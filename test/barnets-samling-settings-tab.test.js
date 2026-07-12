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

  it('child-settings-view renders customization + parent PIN section', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-settings-view.js'), 'utf8');
    assert.match(src, /ChildCustomizationEntries/);
    assert.match(src, /CHILD_SYSTEM_ACTIONS/);
    assert.match(src, /ParentalGate\.requireParentMode/);
    assert.match(src, /Kräver förälders PIN/);
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

  it('bottom nav uses emoji for settings tab icon', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-worlds-nav.js'), 'utf8');
    assert.match(src, /world\.id !== 'settings'/);
  });

  it('five-tab bottom nav padding includes settingsView', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-bottom-nav.css'), 'utf8');
    assert.match(css, /#settingsView/);
  });
});
