'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('parent backup login (e-post/Apple/Google)', () => {
  it('redirectToParentBackupLogin clears orchestrator and stores backup intent', () => {
    const auth = fs.readFileSync(path.join(ROOT, 'public/js/auth.js'), 'utf8');
    assert.match(auth, /redirectToParentBackupLogin/);
    assert.match(auth, /storeIntent/);
    assert.match(auth, /clearOrchestratorSessionState/);
    assert.match(auth, /\/login\?parent=1&next=/);
    assert.match(auth, /\/api\/auth\/logout/);
  });

  it('profile picker shows parent backup login affordance', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-profile-picker.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.match(html, /cppParentBackupLink/);
    assert.match(html, /e-post eller Apple\/Google/);
    assert.match(js, /redirectToParentBackupLogin/);
    assert.match(js, /wireParentBackupLink/);
    assert.match(js, /data-parent-has-app-pin/);
    assert.match(js, /classList\.toggle\('visible'/);
  });

  it('adult PIN gate offers forgot-PIN backup login', () => {
    const gate = fs.readFileSync(path.join(ROOT, 'public/js/adult-pin-gate-ui.js'), 'utf8');
    assert.match(gate, /forgotPinBackup/);
    assert.match(gate, /redirectToParentBackupLogin/);
  });

  it('login page opens parent form when parent=1', () => {
    const login = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    assert.match(login, /get\('parent'\) === '1'/);
    assert.match(login, /showParentLogin/);
  });
});
