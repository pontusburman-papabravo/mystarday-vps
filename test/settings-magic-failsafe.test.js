'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const HUBS = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
const SETTINGS_HTML = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
const SHELL = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');

function loadHubsInSandbox(sandbox) {
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.document = sandbox.document;
  vm.runInNewContext(HUBS, sandbox, { filename: 'parent-magic-page-hubs.js' });
  return sandbox.ParentMagicPageHub;
}

function makeSettingsDom() {
  const noop = function () {};
  const body = {
    _classes: new Set(['parent-magic-view', 'parent-magic-page-settings']),
    classList: null,
    getAttribute: function (k) { return k === 'data-magic-page' ? 'settings' : null; },
    querySelectorAll: function () { return []; },
  };
  body.classList = {
    add: function (c) { body._classes.add(c); },
    remove: function (c) { body._classes.delete(c); },
    contains: function (c) { return body._classes.has(c); },
    toggle: function (c, on) { if (on) body._classes.add(c); else body._classes.delete(c); },
  };
  const mount = {
    id: 'parentMagicPageMount',
    className: 'hidden',
    innerHTML: '',
    classList: {
      _c: new Set(['hidden']),
      add: function (c) { this._c.add(c); },
      remove: function (c) { this._c.delete(c); },
      contains: function (c) { return this._c.has(c); },
      toggle: function () {},
    },
    querySelector: function () { return null; },
  };
  const scroll = {
    querySelectorAll: function () { return []; },
  };
  const sandbox = {
    body: body,
    mount: mount,
    location: { pathname: '/settings', hash: '' },
    ParentMagicShell: { isMagic: function () { return true; } },
    console: { error: noop, warn: noop },
    escHtml: function (s) { return String(s); },
    pt: function (k) { return k; },
    cpt: function () { return ''; },
    IconSystem: { has: function () { return false; } },
    dispatchEvent: noop,
    CustomEvent: function (name) { this.type = name; },
    addEventListener: noop,
    document: null,
    window: null,
    global: null,
  };
  sandbox.document = {
    body: body,
    getElementById: function (id) {
      if (id === 'parentMagicPageMount') return mount;
      if (id === 'magicSettingsBackBar') return { innerHTML: '' };
      return null;
    },
    querySelector: function (sel) {
      if (sel === 'main[data-settings-root] .flex-1.overflow-auto') return scroll;
      return null;
    },
    querySelectorAll: function () { return []; },
    addEventListener: noop,
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  return sandbox;
}

describe('settings magic fail-safe contracts', () => {
  it('CASE 1 CSS: legacy hidden only after magic-settings-ready', () => {
    assert.match(CSS, /magic-settings-ready\[data-magic-page="settings"\]:not\(\.magic-settings-in-group\) main > \.flex-1\.overflow-auto/);
    assert.doesNotMatch(
      CSS,
      /body\.parent-magic-view\[data-magic-page="settings"\]:not\(\.magic-settings-in-group\) main > \.flex-1\.overflow-auto/
    );
    assert.doesNotMatch(
      CSS,
      /body\.parent-magic-view:not\(\.magic-settings-in-group\) \[data-magic-settings-content\]/
    );
  });

  it('CASE 1 hub: render path marks magic-settings-ready after menu cards exist', () => {
    assert.match(HUBS, /markSettingsHubReady/);
    assert.match(HUBS, /settingsHubHasUsableContent/);
    assert.match(HUBS, /SETTINGS_HUB_MENU_SELECTOR/);
    assert.match(HUBS, /renderSettingsHubRootMenu/);
  });

  it('CASE 2 hub missing mount falls back to legacy settings', () => {
    const sandbox = makeSettingsDom();
    sandbox.document.getElementById = function () { return null; };
    const hub = loadHubsInSandbox(sandbox);
    const ok = hub.showSettingsRootMenu();
    assert.equal(ok, false);
    assert.equal(sandbox.body.classList.contains('magic-settings-ready'), false);
    assert.equal(sandbox.mount.classList.contains('hidden'), true);
  });

  it('CASE 3 hub throw path exposes legacy fallback helper', () => {
    assert.match(HUBS, /showLegacySettingsFallback/);
    assert.match(HUBS, /catch \(err\)[\s\S]*showLegacySettingsFallback/);
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    hub.showLegacySettingsFallback('forced test failure');
    assert.equal(sandbox.body.classList.contains('magic-settings-ready'), false);
    assert.equal(sandbox.mount.classList.contains('hidden'), true);
  });

  it('CASE 4 settings shell boots before family/notifications API block', () => {
    const domIdx = SETTINGS_HTML.indexOf("document.addEventListener('DOMContentLoaded'");
    const shellIdx = SETTINGS_HTML.indexOf('bootSettingsShellEarly');
    const familyIdx = SETTINGS_HTML.indexOf("await Auth.api('/api/family')");
    assert.ok(domIdx >= 0 && shellIdx > domIdx, 'early shell boot must be registered on DOMContentLoaded');
    assert.ok(shellIdx < familyIdx, 'shell boot must start before /api/family await');
    assert.match(SETTINGS_HTML, /await shellBootPromise/);
  });

  it('CASE 5 returnToSettingsMenu restores root hub menu', () => {
    assert.match(HUBS, /returnToSettingsMenu[\s\S]*showSettingsRootMenu/);
    assert.match(HUBS, /data-settings-back/);
  });

  it('CASE 6 Byt profil chrome is separate module from settings hub mount', () => {
    const chrome = fs.readFileSync(path.join(ROOT, 'public/js/profile-switch-chrome.js'), 'utf8');
    assert.match(chrome, /FLOAT_BTN_ID/);
    assert.match(chrome, /ensureFloatingBtn/);
    assert.match(HUBS, /ProfileSwitchChrome\.apply/);
    assert.match(HUBS, /data-profile-switch-settings/);
  });

  it('ensureSettingsChrome returns false on inactive magic instead of silent blank', () => {
    assert.match(HUBS, /parent magic mode inactive/);
    assert.match(HUBS, /return false/);
  });

  it('parent shell syncs settings page id from DOM', () => {
    assert.match(SHELL, /isSettingsDomPage/);
    assert.match(SHELL, /_page = 'settings'/);
  });
});
