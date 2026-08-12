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

function makeEl(id, opts) {
  opts = opts || {};
  const hidden = !!opts.hidden;
  const attrs = Object.assign({}, opts.attrs || {});
  const el = {
    id: id,
    tagName: opts.tagName || 'section',
    innerHTML: opts.innerHTML || '',
    _attrs: attrs,
    _classes: new Set(hidden ? ['hidden'] : []),
    classList: null,
    closest: function (tag) {
      if (tag === 'section' && this.tagName === 'section') return this;
      return opts.parentSection || null;
    },
    getAttribute: function (k) { return this._attrs[k] || null; },
    setAttribute: function (k, v) { this._attrs[k] = String(v); },
    removeAttribute: function (k) { delete this._attrs[k]; },
    hasAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this._attrs, k); },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
  };
  el.classList = {
    add: function (c) { el._classes.add(c); },
    remove: function (c) { el._classes.delete(c); },
    contains: function (c) { return el._classes.has(c); },
    toggle: function (c, on) {
      if (on === undefined) {
        if (el._classes.has(c)) el._classes.delete(c);
        else el._classes.add(c);
      } else if (on) el._classes.add(c);
      else el._classes.delete(c);
    },
  };
  return el;
}

function makeMountEl() {
  const el = makeEl('parentMagicPageMount', { hidden: true, tagName: 'div' });
  let html = '';
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return html; },
    set: function (v) { html = String(v || ''); },
    configurable: true,
  });
  el.querySelector = function (sel) {
    if (!html || html.indexOf('data-settings-group=') === -1) return null;
    if (sel.indexOf('data-settings-group') !== -1 || sel.indexOf('magic-settings-menu') !== -1) {
      return { getAttribute: function () { return 'profile'; } };
    }
    return null;
  };
  return el;
}

function makeSettingsDom(extraIds) {
  const noop = function () {};
  const elements = Object.assign({
    parentMagicPageMount: makeMountEl(),
    magicSettingsBackBar: makeEl('magicSettingsBackBar', { tagName: 'div' }),
    familySection: makeEl('familySection', { tagName: 'section' }),
    nativeAccountActions: makeEl('nativeAccountActions', { hidden: true, tagName: 'section' }),
    coParentInviteSection: makeEl('coParentInviteSection', { hidden: true, tagName: 'section' }),
    pedagogInviteSection: makeEl('pedagogInviteSection', { hidden: true, tagName: 'section' }),
    familyName: makeEl('familyName', {
      tagName: 'input',
      parentSection: null,
    }),
  }, extraIds || {});
  elements.familyName.closest = function (tag) {
    if (tag === 'section') return elements.familySection;
    return null;
  };

  const body = {
    _classes: new Set(['parent-magic-view', 'parent-magic-page-settings']),
    classList: null,
    getAttribute: function (k) { return k === 'data-magic-page' ? 'settings' : null; },
    querySelectorAll: function (sel) {
      if (sel === '[data-magic-settings-content]') {
        return Object.values(elements).filter(function (el) {
          return el.hasAttribute('data-magic-settings-content');
        });
      }
      return [];
    },
  };
  body.classList = {
    add: function (c) { body._classes.add(c); },
    remove: function (c) { body._classes.delete(c); },
    contains: function (c) { return body._classes.has(c); },
    toggle: function (c, on) { if (on) body._classes.add(c); else body._classes.delete(c); },
  };

  const sandbox = {
    body: body,
    elements: elements,
    location: { pathname: '/settings', hash: '' },
    ParentMagicShell: { isMagic: function () { return true; } },
    console: { error: noop, warn: noop },
    escHtml: function (s) { return String(s); },
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
    getElementById: function (id) { return elements[id] || null; },
    querySelector: function () { return null; },
    querySelectorAll: body.querySelectorAll.bind(body),
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
    assert.equal(sandbox.elements.parentMagicPageMount.classList.contains('hidden'), true);
  });

  it('CASE 3 hub throw path exposes legacy fallback helper', () => {
    assert.match(HUBS, /showLegacySettingsFallback/);
    assert.match(HUBS, /catch \(err\)[\s\S]*showLegacySettingsFallback/);
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    hub.showLegacySettingsFallback('forced test failure');
    assert.equal(sandbox.body.classList.contains('magic-settings-ready'), false);
    assert.equal(sandbox.elements.parentMagicPageMount.classList.contains('hidden'), true);
  });

  it('CASE 4 settings shell boots before family/notifications API block', () => {
    const domIdx = SETTINGS_HTML.indexOf("document.addEventListener('DOMContentLoaded'");
    const shellIdx = SETTINGS_HTML.indexOf('bootSettingsShellEarly');
    const familyIdx = SETTINGS_HTML.indexOf("await Auth.api('/api/family')");
    assert.ok(domIdx >= 0 && shellIdx > domIdx, 'early shell boot must be registered on DOMContentLoaded');
    assert.ok(shellIdx < familyIdx, 'shell boot must start before /api/family await');
    assert.match(SETTINGS_HTML, /await shellBootPromise/);
    assert.match(SETTINGS_HTML, /preserveNavigation:\s*true/);
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
    assert.match(SHELL, /preserveNavigation:\s*true/);
  });

  it('parent shell refresh is re-entrancy guarded against layout-event loops', () => {
    assert.match(SHELL, /_refreshDepth/);
    assert.match(SHELL, /refreshInner/);
  });

  it('settings-account.js does not shadow window.pt with a recursive global helper', () => {
    const account = fs.readFileSync(path.join(ROOT, 'public/js/settings-account.js'), 'utf8');
    assert.doesNotMatch(account, /^function pt\(/m);
    assert.match(account, /settingsAccountPt/);
    assert.match(account, /_parentAppPt/);
    assert.doesNotMatch(account, /window\.pt\(key, params\)/);
  });
});

describe('settings-account pt() behavioral regression', () => {
  const ACCOUNT = fs.readFileSync(path.join(ROOT, 'public/js/settings-account.js'), 'utf8');
  const ACCOUNT_TRANSLATOR = (() => {
    const start = ACCOUNT.indexOf('const _parentAppPt');
    const end = ACCOUNT.indexOf('// ── Render the "Konto & inloggning" section');
    assert.ok(start >= 0 && end > start, 'settings-account translator block missing');
    return ACCOUNT.slice(start, end);
  })();
  const OLD_PT_IMPL = [
    'function pt(key, params) {',
    '  return (typeof window.pt === \'function\') ? window.pt(key, params) : key;',
    '}',
  ].join('\n');

  function makeBrowserSandbox() {
    const sandbox = {
      console: { error() {}, warn() {} },
      I18n: {
        t(key) {
          return key === 'settings.account.title' ? 'Konto & inloggning' : key;
        },
      },
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.window.pt = function parentPt(key) {
      return sandbox.I18n.t(key);
    };
    return sandbox;
  }

  it('old global pt() pattern recurses through window.pt and throws', () => {
    const sandbox = makeBrowserSandbox();
    vm.runInNewContext(OLD_PT_IMPL, sandbox, { filename: 'old-settings-account-pt.js' });
    assert.throws(
      () => sandbox.pt('settings.account.title'),
      /Maximum call stack size exceeded/
    );
  });

  it('committed settings-account translator preserves window.pt and settingsAccountPt works', () => {
    const sandbox = makeBrowserSandbox();
    const parentPt = sandbox.window.pt;
    vm.runInNewContext(ACCOUNT_TRANSLATOR, sandbox, { filename: 'settings-account-translator.js' });
    assert.equal(sandbox.window.pt, parentPt, 'settings-account translator must not replace window.pt');
    assert.equal(typeof sandbox.settingsAccountPt, 'function');
    assert.equal(sandbox.settingsAccountPt('settings.account.title'), 'Konto & inloggning');
    assert.doesNotThrow(() => sandbox.settingsAccountPt('settings.account.title'));
  });
});

describe('settings magic fail-safe behavior (DOM sandbox)', () => {
  it('normal hub render marks ready and shows menu cards', () => {
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    const ok = hub.showSettingsRootMenu();
    assert.equal(ok, true);
    assert.equal(sandbox.body.classList.contains('magic-settings-ready'), true);
    assert.match(sandbox.elements.parentMagicPageMount.innerHTML, /data-settings-group="family"/);
    assert.equal(sandbox.elements.parentMagicPageMount.classList.contains('hidden'), false);
  });

  it('fallback restores only magic-owned visibility — originally hidden sections stay hidden', () => {
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    hub.showSettingsRootMenu();
    hub.showLegacySettingsFallback('test ownership');
    assert.equal(sandbox.elements.nativeAccountActions.classList.contains('hidden'), true);
    assert.equal(sandbox.elements.coParentInviteSection.classList.contains('hidden'), true);
    assert.equal(sandbox.elements.pedagogInviteSection.classList.contains('hidden'), true);
    assert.equal(sandbox.elements.familySection.hasAttribute('data-magic-settings-content'), false);
    assert.equal(sandbox.elements.familySection.classList.contains('hidden'), false);
  });

  it('late ensureSettingsChrome preserves an open Familj group', async () => {
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    hub.showSettingsRootMenu();
    hub.showSettingsGroup('family');
    assert.equal(hub.getActiveSettingsGroup(), 'family');
    await hub.ensureSettingsChrome({ preserveNavigation: true });
    assert.equal(hub.getActiveSettingsGroup(), 'family');
    assert.equal(sandbox.body.classList.contains('magic-settings-in-group'), true);
    assert.equal(sandbox.elements.familySection.classList.contains('hidden'), false);
  });

  it('returnToSettingsMenu after group opens root menu once', () => {
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    hub.showSettingsRootMenu();
    hub.showSettingsGroup('family');
    hub.returnToSettingsMenu();
    assert.equal(hub.getActiveSettingsGroup(), null);
    assert.equal(sandbox.body.classList.contains('magic-settings-in-group'), false);
    assert.match(sandbox.elements.parentMagicPageMount.innerHTML, /data-settings-group="profile"/);
  });

  it('early hub copy uses Swedish fallback instead of raw i18n keys', () => {
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    hub.showSettingsRootMenu();
    assert.match(sandbox.elements.parentMagicPageMount.innerHTML, /Inställningar/);
    assert.match(sandbox.elements.parentMagicPageMount.innerHTML, /Profil/);
    assert.doesNotMatch(sandbox.elements.parentMagicPageMount.innerHTML, /settings\.groups\./);
    assert.doesNotMatch(sandbox.elements.parentMagicPageMount.innerHTML, /settings\.title/);
  });

  it('tagSettingsSections keeps an open group visible after re-tag', () => {
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    hub.showSettingsRootMenu();
    hub.showSettingsGroup('family');
    hub.tagSettingsSections();
    assert.equal(sandbox.elements.familySection.classList.contains('hidden'), false);
    assert.equal(hub.getActiveSettingsGroup(), 'family');
  });

  it('missing ParentMagicPageHub leaves legacy path available via fallback helper', () => {
    const sandbox = makeSettingsDom();
    const hub = loadHubsInSandbox(sandbox);
    hub.showSettingsRootMenu();
    sandbox.ParentMagicPageHub = null;
    hub.showLegacySettingsFallback('hub unavailable');
    assert.equal(sandbox.body.classList.contains('magic-settings-ready'), false);
    assert.equal(sandbox.elements.familySection.classList.contains('hidden'), false);
  });
});
