'use strict';

/**
 * Regression test: the Mitt/Settings tab's "Byt profil" action
 * ([data-parent-action="switch_profile"]) rendered unconditionally
 * whenever daily UX (family shared device) was active — even though
 * profile-switch-chrome.js already renders a global "Byt profil" control
 * (header button, or a floating button in Barnets samling) gated by the
 * exact same ProfileSwitchChrome.shouldShow() signal. A child navigating
 * to the Mitt tab could see two "Byt profil" affordances for the same
 * action in the same session.
 *
 * See public/js/child-settings-view.js, public/js/profile-switch-chrome.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/child-settings-view.js'), 'utf8');

function loadSettingsView({ dailyUxActive, globalSwitchShown }) {
  const mount = { innerHTML: '', querySelectorAll: () => [] };
  const doc = {
    getElementById: (id) => (id === 'settingsViewMount' ? mount : null),
    createElement: () => {
      const el = { _text: '' };
      Object.defineProperty(el, 'textContent', {
        get() { return el._text; },
        set(v) { el._text = v; },
      });
      Object.defineProperty(el, 'innerHTML', { get() { return el._text; } });
      return el;
    },
    addEventListener: () => {},
    documentElement: { classList: { contains: () => false } },
  };
  const win = {
    childT: (key) => key,
    ChildTrustedChrome: { isDailyUxActive: () => !!dailyUxActive },
    ProfileSwitchChrome: { shouldShow: () => !!globalSwitchShown },
  };
  const sandbox = {
    window: win,
    document: doc,
    console,
    // child-settings-view.js checks window.X then reads the bare X global
    // (same convention used throughout child-dashboard*.js, relying on
    // window === globalThis in a browser) — bridge each here.
    childT: win.childT,
    ChildTrustedChrome: win.ChildTrustedChrome,
    ProfileSwitchChrome: win.ProfileSwitchChrome,
  };
  vm.runInNewContext(SRC, sandbox, { filename: 'child-settings-view.js' });
  return { win, mount };
}

describe('child Mitt tab — no duplicate "Byt profil" alongside the global control', () => {
  it('hides the Mitt-tab switch_profile action when the global profile-switch control already shows', () => {
    const { win, mount } = loadSettingsView({ dailyUxActive: true, globalSwitchShown: true });
    win.ChildSettingsView.refresh({ force: true });
    assert.doesNotMatch(mount.innerHTML, /data-parent-action="switch_profile"/);
  });

  it('still shows the Mitt-tab switch_profile action when no global control is currently shown', () => {
    const { win, mount } = loadSettingsView({ dailyUxActive: true, globalSwitchShown: false });
    win.ChildSettingsView.refresh({ force: true });
    assert.match(mount.innerHTML, /data-parent-action="switch_profile"/);
  });
});
