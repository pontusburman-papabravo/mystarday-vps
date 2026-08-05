'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SETTINGS_HTML = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
const AUTH_JS = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');

describe('settings switch user → child picker handoff', () => {
  it('switchUserBtn calls Auth.switchChildMember, not Auth.logout', () => {
    assert.match(SETTINGS_HTML, /button\.id === 'switchUserBtn'/);
    assert.match(SETTINGS_HTML, /Auth\.switchChildMember/);
    const block = SETTINGS_HTML.slice(
      SETTINGS_HTML.indexOf("if (button.id === 'switchUserBtn')"),
      SETTINGS_HTML.indexOf("if (button.id === 'switchUserBtn')") + 220
    );
    assert.match(block, /await Auth\.switchChildMember\(\)/);
    assert.doesNotMatch(block, /Auth\.logout/);
  });

  it('logoutBtn still uses Auth.logout without switchChild path', () => {
    assert.match(SETTINGS_HTML, /#logoutBtn, #switchUserBtn/);
    const bindBlock = SETTINGS_HTML.slice(
      SETTINGS_HTML.indexOf('function bindCriticalAccountActions'),
      SETTINGS_HTML.indexOf('bindCriticalAccountActions();') + 200
    );
    assert.match(bindBlock, /await Auth\.logout\(options\)/);
    assert.match(bindBlock, /nativeChildLoginBtn.*childFlow: true/s);
  });

  it('Auth.switchChildMember posts switchChild and navigates to child-login picker', () => {
    assert.match(AUTH_JS, /async switchChildMember\(\)/);
    assert.match(AUTH_JS, /switchChild:\s*true/);
    assert.match(AUTH_JS, /\/child-login\?picker=1/);
  });

  it('Auth.logout web redirect goes to / or /login, not child-login picker', () => {
    const redirectFn = AUTH_JS.slice(
      AUTH_JS.indexOf('_redirectAfterLogoutClear(childFlow)'),
      AUTH_JS.indexOf('_redirectAfterLogoutClear(childFlow)') + 700
    );
    assert.match(redirectFn, /childFlow\)\s*\{[\s\S]*\/child-login/);
    assert.match(redirectFn, /window\.location\.replace\('\/'\)/);
  });
});
