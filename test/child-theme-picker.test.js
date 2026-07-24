'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadChildThemePicker() {
  const themeScript = read('public/js/child-theme.js');
  const pickerScript = read('public/js/child-theme-picker.js');
  const win = { document: {
    documentElement: { getAttribute: function () { return 'on'; } },
    body: { classList: { add: function () {}, remove: function () {} }, style: {} },
    createElement: function () { return { textContent: '', innerHTML: '' }; },
    getElementById: function () { return null; },
    head: { appendChild: function () {} },
    addEventListener: function () {},
    activeElement: null,
  } };
  const ctx = { window: win, document: win.document };
  vm.runInNewContext(themeScript, ctx, { filename: 'child-theme.js' });
  vm.runInNewContext(pickerScript, ctx, { filename: 'child-theme-picker.js' });
  return win;
}

describe('child-theme-picker — UI and config', () => {
  it('reads ten themes from ChildTheme.listThemes', () => {
    const win = loadChildThemePicker();
    const themes = win.ChildTheme.listThemes();
    assert.equal(themes.length, 10);
    themes.forEach(function (theme) {
      assert.ok(theme.id);
      assert.ok(theme.label);
      assert.ok(theme.assets.background);
      assert.ok(theme.assets.icons.today);
    });
    assert.ok(!themes.some(function (t) { return t.id === 'fantasy'; }));
  });

  it('renders Mitt tema entry in customization module when gate on', () => {
    const src = read('public/js/child-customization-entries.js');
    assert.match(src, /renderThemeEntry/);
    assert.match(src, /bspOpenThemePicker/);
    assert.match(src, /ChildTheme\.isSamlingGateOn/);
  });

  it('picker scripts and styles are loaded on child dashboard', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /child-theme-picker\.js/);
    assert.match(html, /child-theme-picker\.css/);
  });

  it('picker uses dedicated visual-theme endpoint', () => {
    const src = read('public/js/child-theme-picker.js');
    assert.match(src, /\/visual-theme/);
    assert.match(src, /settings\.themePickerUse/);
    assert.match(src, /common\.cancel/);
    assert.doesNotMatch(src, /house_config/);
  });

  it('picker uses atomic jsonb_set in visual-theme route', () => {
    const src = read('src/routes/children.js');
    assert.match(src, /jsonb_set/);
    assert.match(src, /RETURNING child_view_config/);
    assert.doesNotMatch(src, /Object\.assign\(\{\}, current, \{ visual_theme/);
  });

  it('picker restores body overflow and traps focus', () => {
    const src = read('public/js/child-theme-picker.js');
    assert.match(src, /_previousBodyOverflow/);
    assert.match(src, /unlockBodyScroll/);
    assert.match(src, /trapFocus/);
    assert.match(src, /focusInitial/);
  });

  it('cancel reverts via ChildTheme.revertToSaved', () => {
    const src = read('public/js/child-theme-picker.js');
    assert.match(src, /revertToSaved/);
    assert.match(src, /applyPreview/);
  });

  it('save blocks parallel requests while saving', () => {
    const src = read('public/js/child-theme-picker.js');
    assert.match(src, /if \(state\.saving\) return/);
    assert.match(src, /saveBtn\.disabled = state\.saving/);
  });

  it('theme cards use radiogroup and aria-checked', () => {
    const src = read('public/js/child-theme-picker.js');
    assert.match(src, /role="radiogroup"/);
    assert.match(src, /aria-checked/);
    assert.match(src, /loading="lazy"/);
  });

  it('gate OFF does not render theme entry in customization module', () => {
    const src = read('public/js/child-customization-entries.js');
    assert.match(src, /!ChildTheme\.isSamlingGateOn/);
  });
});

test('PATCH /api/children/:id/visual-theme — child saves canonical theme', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session);
    await db.query(
      `UPDATE child SET username = 'theme1', pin = $1 WHERE id = $2`,
      [await hashPassword('2468'), childId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'theme1', pin: '2468' }),
    });
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const loginBody = await loginRes.json();
    const csrf = loginBody.csrfToken;

    const saveRes = await fetch(`${http.baseUrl}/api/children/${childId}/visual-theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ visual_theme: 'animals' }),
    });
    assert.equal(saveRes.status, 200);
    const merged = await saveRes.json();
    assert.equal(merged.visual_theme, 'animals');

    const row = await db.query('SELECT child_view_config FROM child WHERE id = $1', [childId]);
    assert.equal(row.rows[0].child_view_config.visual_theme, 'animals');

    await db.query(
      `UPDATE child SET child_view_config = $1 WHERE id = $2`,
      [JSON.stringify({ view_mode: 'classic', show_star_goal: true, visual_theme: 'animals' }), childId]
    );

    const preserveRes = await fetch(`${http.baseUrl}/api/children/${childId}/visual-theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ visual_theme: 'space' }),
    });
    assert.equal(preserveRes.status, 200);
    const preserved = await preserveRes.json();
    assert.equal(preserved.visual_theme, 'space');
    assert.equal(preserved.view_mode, 'classic');
    assert.equal(preserved.show_star_goal, true);

    const badRes = await fetch(`${http.baseUrl}/api/children/${childId}/visual-theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ visual_theme: 'cars' }),
    });
    assert.equal(badRes.status, 400);

    const otherChild = await createChild(http.baseUrl, session, { name: 'Syskon', emoji: '🌙' });
    const forbidden = await fetch(`${http.baseUrl}/api/children/${otherChild}/visual-theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ visual_theme: 'space' }),
    });
    assert.equal(forbidden.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('PATCH /api/children/:id/visual-theme — rejects extra config keys', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session);
    await db.query(
      `UPDATE child SET username = 'theme2', pin = $1 WHERE id = $2`,
      [await hashPassword('1357'), childId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'theme2', pin: '1357' }),
    });
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const loginBody = await loginRes.json();

    const res = await fetch(`${http.baseUrl}/api/children/${childId}/visual-theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      },
      body: JSON.stringify({ visual_theme: 'space', view_mode: 'new' }),
    });
    assert.equal(res.status, 400);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
