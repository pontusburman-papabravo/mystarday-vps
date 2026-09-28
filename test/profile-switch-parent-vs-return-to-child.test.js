'use strict';

/**
 * Regression test: on a parent shell page (e.g. /settings) while an adult has
 * temporarily escalated privilege from a child session (AdultPrivilege.isPrivilegeActive()),
 * "Tillbaka till barn" (ensureReturnToChildBtn) must be the ONE canonical profile/mode
 * control shown in the header. The general "Byt profil" picker (ensureParentBtn) must
 * not also render, since choosing a different profile there overlaps ambiguously with
 * resuming the interrupted child session.
 *
 * See public/js/profile-switch-chrome.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/profile-switch-chrome.js'), 'utf8');

function detach(child) {
  if (!child || !child._parent) return;
  const ci = child._parent.children.indexOf(child);
  if (ci !== -1) child._parent.children.splice(ci, 1);
  child._parent = null;
}

function makeElement(tag, registry) {
  const el = {
    tagName: tag,
    id: '',
    className: '',
    innerHTML: '',
    _attrs: {},
    children: [],
    addEventListener: () => {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k); },
    removeAttribute(k) { delete this._attrs[k]; },
    appendChild(child) {
      detach(child);
      child._parent = this;
      this.children.push(child);
      if (registry.indexOf(child) === -1) registry.push(child);
    },
    insertBefore(child, ref) {
      detach(child);
      child._parent = this;
      const idx = ref ? this.children.indexOf(ref) : -1;
      this.children.splice(idx === -1 ? 0 : idx, 0, child);
      if (registry.indexOf(child) === -1) registry.push(child);
    },
    remove() {
      const i = registry.indexOf(this);
      if (i !== -1) registry.splice(i, 1);
      if (this._parent) {
        const ci = this._parent.children.indexOf(this);
        if (ci !== -1) this._parent.children.splice(ci, 1);
      }
    },
  };
  Object.defineProperty(el, 'firstChild', { get() { return this.children[0] || null; } });
  Object.defineProperty(el, 'parentNode', { get() { return this._parent || null; } });
  const classes = new Set();
  el.classList = {
    add: (c) => classes.add(c),
    remove: (c) => classes.delete(c),
    contains: (c) => classes.has(c),
  };
  return el;
}

function buildSandbox({ pathname, dailyUxActive, profileCount, adultPrivilegeActive, headerPresent = true }) {
  const registry = [];
  const state = { headerPresent };
  const headerBar = makeElement('div', registry);
  headerBar.setAttribute('data-parent-nav-header', '1');
  registry.push(headerBar);
  const main = makeElement('main', registry);
  const body = makeElement('body', registry);
  body.appendChild(main);

  const sessionData = {};
  if (dailyUxActive) sessionData.stjarndag_family_device_daily_ux_v1 = '1';
  if (profileCount != null) sessionData.stjarndag_entry_profile_count = String(profileCount);

  const doc = {
    cookie: 'access_token=test-token',
    body,
    documentElement: { getAttribute: () => null },
    getElementById: (id) => registry.find((el) => el.id === id) || null,
    querySelector: (sel) => {
      if (sel === '[data-parent-nav-header]') return state.headerPresent ? headerBar : null;
      if (sel === 'main') return main;
      const match = /^\[([\w-]+)\]$/.exec(sel);
      if (match) return registry.find((el) => el.hasAttribute(match[1])) || null;
      return null;
    },
    createElement: (tag) => makeElement(tag, registry),
    addEventListener: () => {},
    readyState: 'loading', // prevents the module's own boot() from firing at load time
  };

  const win = {
    location: { pathname },
    AdultPrivilege: {
      isPrivilegeActive: () => !!adultPrivilegeActive,
      returnToChildExperience: () => {},
    },
  };

  const sandbox = {
    window: win,
    document: doc,
    sessionStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(sessionData, k) ? sessionData[k] : null),
      setItem: (k, v) => { sessionData[k] = String(v); },
    },
    console,
    // profile-switch-chrome.js checks `window.AdultPrivilege` then reads the
    // bare `AdultPrivilege` global (same convention used throughout
    // child-dashboard*.js, relying on window === globalThis in a browser) —
    // bridge it here since our sandbox's `window` is a plain object.
    AdultPrivilege: win.AdultPrivilege,
  };

  vm.runInNewContext(SRC, sandbox, { filename: 'profile-switch-chrome.js' });
  return { win, doc, headerBar, main, registry, state };
}

describe('profile-switch-chrome — canonical control per context', () => {
  it('adult privilege active on parent shell: only "Tillbaka till barn" shows, not "Byt profil"', () => {
    const { win, headerBar } = buildSandbox({
      pathname: '/settings',
      dailyUxActive: true,
      profileCount: 3,
      adultPrivilegeActive: true,
    });

    win.ProfileSwitchChrome.apply();

    const returnBtn = headerBar.children.find((el) => el.id === 'profileReturnToChildBtn');
    const switchBtn = headerBar.children.find((el) => el.hasAttribute('data-profile-switch-parent'));
    assert.ok(returnBtn, '"Tillbaka till barn" must render while adult privilege is active');
    assert.equal(switchBtn, undefined, '"Byt profil" must not render alongside "Tillbaka till barn"');
  });

  it('no adult privilege on parent shell: "Byt profil" shows normally, no "Tillbaka till barn"', () => {
    const { win, headerBar } = buildSandbox({
      pathname: '/settings',
      dailyUxActive: true,
      profileCount: 3,
      adultPrivilegeActive: false,
    });

    win.ProfileSwitchChrome.apply();

    const returnBtn = headerBar.children.find((el) => el.id === 'profileReturnToChildBtn');
    const switchBtn = headerBar.children.find((el) => el.hasAttribute('data-profile-switch-parent'));
    assert.equal(returnBtn, undefined, '"Tillbaka till barn" must not render without an active privilege escalation');
    assert.ok(switchBtn, '"Byt profil" should render normally when there is no competing return-to-child action');
    assert.equal(switchBtn.classList.contains('profile-switch-parent-fallback'), false);
  });

  it('moves an early fallback button into the header once the bar exists', () => {
    const { win, headerBar, main, state } = buildSandbox({
      pathname: '/settings',
      dailyUxActive: true,
      profileCount: 3,
      adultPrivilegeActive: false,
      headerPresent: false,
    });

    win.ProfileSwitchChrome.apply();
    const early = main.children.find((el) => el.hasAttribute('data-profile-switch-parent'));
    assert.ok(early, 'without a header the control stays in document flow on main');
    assert.equal(early.classList.contains('profile-switch-parent-fallback'), true);
    assert.equal(early.parentNode === headerBar, false);

    state.headerPresent = true;
    win.ProfileSwitchChrome.apply();

    const anchored = headerBar.children.find((el) => el.hasAttribute('data-profile-switch-parent'));
    assert.ok(anchored, 'the same control moves into the header bar');
    assert.equal(anchored, early);
    assert.equal(anchored.classList.contains('profile-switch-parent-fallback'), false);
    assert.equal(main.children.some((el) => el.hasAttribute('data-profile-switch-parent')), false);
  });
});
