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

function webpCanvasSize(filePath) {
  const buf = fs.readFileSync(filePath);
  const idx = buf.indexOf('VP8X');
  if (idx < 0) return null;
  const width = 1 + (buf[idx + 12] | (buf[idx + 13] << 8) | (buf[idx + 14] << 16));
  const height = 1 + (buf[idx + 15] | (buf[idx + 16] << 8) | (buf[idx + 17] << 16));
  const flags = buf[idx + 8];
  return { width, height, hasAlphaFlag: (flags & 0x02) !== 0, hasVp8l: buf.indexOf('VP8L') >= 0 };
}

function loadClientPictogramPacks(gateOn) {
  const packsScript = read('public/js/child-pictogram-packs.js');
  function CustomEvent(type, opts) {
    this.type = type;
    this.detail = opts && opts.detail;
  }
  const win = {
    ChildWorlds: gateOn ? { isBarnetsSamlingEnabled: function () { return true; } } : {},
    document: {
      documentElement: { getAttribute: function () { return gateOn ? 'on' : null; } },
      dispatchEvent: function () {},
    },
    CustomEvent: CustomEvent,
  };
  const ctx = { window: win, document: win.document, CustomEvent: CustomEvent };
  vm.runInNewContext(packsScript, ctx, { filename: 'child-pictogram-packs.js' });
  return win;
}

function loadClientPicker() {
  const packsWin = loadClientPictogramPacks(true);
  const pickerScript = read('public/js/child-pictogram-picker.js');
  const win = Object.assign({}, packsWin, {
    Auth: { api: function () { return Promise.resolve({ pictogram_pack: 'simple' }); } },
    ChildDashboardContext: { me: { id: 'child-1' }, viewConfig: {} },
    document: Object.assign({}, packsWin.document, {
      body: { style: {}, appendChild: function () {} },
      createElement: function () {
        return {
          textContent: '',
          innerHTML: '',
          classList: { add: function () {}, remove: function () {} },
          style: {},
          addEventListener: function () {},
          querySelector: function () { return null; },
          querySelectorAll: function () { return []; },
        };
      },
      getElementById: function () { return null; },
      activeElement: null,
      addEventListener: function () {},
    }),
  });
  win.window = win;
  vm.runInNewContext(pickerScript, win, { filename: 'child-pictogram-picker.js' });
  return win;
}

const serverPacks = require('../config/child-pictogram-packs');
const { PICTOGRAMS } = require('../config/pictogram-library');

describe('child-pictogram-packs — assets and manifest', () => {
  it('has 48 activity keys per pack and 96 activity WebP files on disk', () => {
    const keys = serverPacks.listActivityKeys();
    assert.equal(keys.length, 48);

    const simpleDir = path.join(ROOT, 'public/images/child/pictograms/simple');
    const actionDir = path.join(ROOT, 'public/images/child/pictograms/action');
    const simpleFiles = fs.readdirSync(simpleDir).filter((f) => f.endsWith('.webp'));
    const actionFiles = fs.readdirSync(actionDir).filter((f) => f.endsWith('.webp'));
    assert.equal(simpleFiles.length, 48);
    assert.equal(actionFiles.length, 48);

    keys.forEach(function (key) {
      const simplePath = path.join(simpleDir, key + '@2x.webp');
      const actionPath = path.join(actionDir, key + '@2x.webp');
      assert.ok(fs.existsSync(simplePath), 'missing simple: ' + key);
      assert.ok(fs.existsSync(actionPath), 'missing action: ' + key);

      const manifest = serverPacks.manifest.activities[key];
      assert.equal(manifest.files.simple, '/images/child/pictograms/simple/' + key + '@2x.webp');
      assert.equal(manifest.files.action, '/images/child/pictograms/action/' + key + '@2x.webp');
    });
  });

  it('activity WebP files are 512×512 VP8X canvas', () => {
    const sample = ['breakfast', 'bath', 'brush-teeth', 'school', 'play', 'sleep'];
    sample.forEach(function (key) {
      ['simple', 'action'].forEach(function (pack) {
        const filePath = path.join(ROOT, 'public/images/child/pictograms', pack, key + '@2x.webp');
        const size = webpCanvasSize(filePath);
        assert.ok(size, 'VP8X missing for ' + pack + '/' + key);
        assert.equal(size.width, 512);
        assert.equal(size.height, 512);
      });
    });
  });

  it('lists two packs with Swedish labels', () => {
    const packs = serverPacks.listPacks();
    assert.equal(packs.length, 2);
    assert.deepEqual(packs.map(function (p) { return p.id; }), ['simple', 'action']);
    assert.equal(packs[0].label, 'Tydliga bilder');
    assert.equal(packs[1].label, 'Aktiva bilder');
  });
});

describe('child-pictogram-packs — resolvePack and aliases', () => {
  it('defaults unknown, empty, or null pack to simple', () => {
    assert.equal(serverPacks.resolvePack(null), 'simple');
    assert.equal(serverPacks.resolvePack(''), 'simple');
    assert.equal(serverPacks.resolvePack('   '), 'simple');
    assert.equal(serverPacks.resolvePack('unknown'), 'simple');
    assert.equal(serverPacks.DEFAULT_PACK, 'simple');
  });

  it('normalizes legacy icon_key aliases to manifest keys', () => {
    assert.equal(serverPacks.normalizeActivityKey('brush_teeth'), 'brush-teeth');
    assert.equal(serverPacks.normalizeActivityKey('wake_up'), 'wake-up');
    assert.equal(serverPacks.normalizeActivityKey('dress'), 'get-dressed');
    assert.equal(serverPacks.normalizeActivityKey('screen'), 'screen-time');
  });

  it('unknown icon_key returns null without throwing', () => {
    assert.equal(serverPacks.normalizeActivityKey('totally_unknown_key'), null);
    assert.equal(serverPacks.normalizeActivityKey('mom'), null);
    assert.equal(serverPacks.resolveActivityAsset('mom', 'action'), null);
  });
});

describe('child-pictogram-packs — fallback chain (server)', () => {
  it('resolves action asset when manifest entry exists', () => {
    const url = serverPacks.resolveActivityAsset('breakfast', 'action');
    assert.equal(url, '/images/child/pictograms/action/breakfast@2x.webp');
  });

  it('falls back simple when action file missing in manifest', () => {
    const entry = serverPacks.manifest.activities.breakfast;
    const savedAction = entry.files.action;
    delete entry.files.action;
    try {
      assert.equal(
        serverPacks.resolveActivityAsset('breakfast', 'action'),
        '/images/child/pictograms/simple/breakfast@2x.webp'
      );
    } finally {
      entry.files.action = savedAction;
    }
  });

  it('returns null for unmappable keys so legacy emoji can render', () => {
    assert.equal(serverPacks.resolveActivityAsset('shoes', 'simple'), null);
    assert.equal(serverPacks.resolveActivityAsset('happy', 'action'), null);
  });
});

describe('child-pictogram-packs — client mirror', () => {
  it('gate OFF disables pack resolution in activity-visual', () => {
    const src = read('public/js/activity-visual.js');
    assert.match(src, /ChildPictogramPacks\.isEnabled\(\)/);
    assert.match(src, /customUrl = item\.image_url/);
    assert.match(src, /packImageUrl\(item\)/);
  });

  it('custom photo wins over pack in pick()', () => {
    const activityVisual = read('public/js/activity-visual.js');
    const win = loadClientPictogramPacks(true);
    const sandbox = {
      window: win,
      document: win.document,
      CustomEvent: win.CustomEvent,
      ChildPictogramPacks: win.ChildPictogramPacks,
    };
    vm.runInNewContext(activityVisual, sandbox, { filename: 'activity-visual.js' });
    const item = {
      image_url: '/uploads/custom.webp',
      icon_key: 'breakfast',
      icon: '🥣',
    };
    const picked = win.ActivityVisual.pick(item);
    assert.equal(picked.url, '/uploads/custom.webp');
  });

  it('uses action pack asset when gate ON and no custom photo or design kit', () => {
    const activityVisual = read('public/js/activity-visual.js');
    const win = loadClientPictogramPacks(true);
    win.ChildPictogramPacks.applyFromConfig({ pictogram_pack: 'action' }, { silent: true });
    const sandbox = {
      window: win,
      document: win.document,
      CustomEvent: win.CustomEvent,
      ChildPictogramPacks: win.ChildPictogramPacks,
    };
    vm.runInNewContext(activityVisual, sandbox, { filename: 'activity-visual.js' });
    const picked = win.ActivityVisual.pick({ icon_key: 'school', icon: '🏫' });
    assert.equal(picked.url, '/images/child/pictograms/action/school@2x.webp');
  });

  it('prefers design kit pictogram_url over barnets_samling pack', () => {
    const activityVisual = read('public/js/activity-visual.js');
    const win = loadClientPictogramPacks(true);
    win.ChildPictogramPacks.applyFromConfig({ pictogram_pack: 'action' }, { silent: true });
    const sandbox = {
      window: win,
      document: win.document,
      CustomEvent: win.CustomEvent,
      ChildPictogramPacks: win.ChildPictogramPacks,
    };
    vm.runInNewContext(activityVisual, sandbox, { filename: 'activity-visual.js' });
    const picked = win.ActivityVisual.pick({
      name: 'Borsta tänderna',
      icon: '🪥',
      pictogram_url: '/assets/min-stjarndag-design-kit/icons/svg/light/borsta-tanderna.svg',
      pictogram_emoji: '🪥',
    });
    assert.match(picked.url, /borsta-tanderna\.svg$/);
  });

  it('preview does not change saved pack until commit', () => {
    const win = loadClientPictogramPacks(true);
    win.ChildPictogramPacks.applyFromConfig({ pictogram_pack: 'simple' });
    win.ChildPictogramPacks.applyPreview('action');
    assert.equal(win.ChildPictogramPacks.getActivePackId(), 'action');
    assert.equal(win.ChildPictogramPacks.getSavedPackId(), 'simple');
    win.ChildPictogramPacks.revertToSaved({ silent: true });
    assert.equal(win.ChildPictogramPacks.getActivePackId(), 'simple');
  });

  it('infers activity key from legacy schedule rows without icon_key (Astrid QA)', () => {
    const activityVisual = read('public/js/activity-visual.js');
    const win = loadClientPictogramPacks(true);
    win.ChildPictogramPacks.applyFromConfig({ pictogram_pack: 'action' }, { silent: true });
    const sandbox = {
      window: win,
      document: win.document,
      CustomEvent: win.CustomEvent,
      ChildPictogramPacks: win.ChildPictogramPacks,
    };
    vm.runInNewContext(activityVisual, sandbox, { filename: 'activity-visual.js' });

    const brush = win.ActivityVisual.pick({ name: 'Borsta tänderna (kväll)', icon: '🪥', icon_key: null });
    assert.equal(brush.url, '/images/child/pictograms/action/brush-teeth@2x.webp');

    const pajamasAction = win.ActivityVisual.pick({ name: 'Pyjamas', icon: '🧸', icon_key: null });
    assert.equal(pajamasAction.url, '/images/child/pictograms/action/pajamas@2x.webp');

    win.ChildPictogramPacks.applyFromConfig({ pictogram_pack: 'simple' }, { silent: true });
    const pajamasSimple = win.ActivityVisual.pick({ name: 'Pyjamas', icon: '🧸', icon_key: null });
    assert.equal(pajamasSimple.url, '/images/child/pictograms/simple/pajamas@2x.webp');
  });
});

describe('child-pictogram-picker — UI wiring', () => {
  it('renders Bildstil entry in customization module', () => {
    const src = read('public/js/child-customization-entries.js');
    assert.match(src, /renderPictogramEntry/);
    assert.match(src, /bspOpenPictogramPicker/);
    assert.match(src, /renderThemeEntry/);
    assert.match(src, /renderPictogramEntry/);
  });

  it('picker scripts and styles load on child dashboard', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /child-pictogram-packs\.js/);
    assert.match(html, /child-pictogram-picker\.js/);
    assert.match(html, /child-pictogram-picker\.css/);
  });

  it('picker uses dedicated pictogram-pack endpoint with preview/save/cancel', () => {
    const src = read('public/js/child-pictogram-picker.js');
    assert.match(src, /\/pictogram-pack/);
    assert.match(src, /Spara bildstil/);
    assert.match(src, /Avbryt/);
    assert.match(src, /applyPreview/);
    assert.match(src, /revertToSaved/);
    assert.doesNotMatch(src, /house_config/);
  });

  it('child dashboard applies pack from view-config on boot', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /ChildPictogramPacks\.applyFromConfig/);
  });

  it('SW precaches pack JS/CSS but not all 96 activity images', () => {
    const sw = read('public/sw.js');
    assert.match(sw, /child-pictogram-packs\.js/);
    assert.match(sw, /child-pictogram-picker\.js/);
    assert.match(sw, /stjarndag-v587/);
    assert.doesNotMatch(sw, /pictograms\/simple\/breakfast@2x\.webp/);
  });
});

test('PATCH /api/children/:id/pictogram-pack — child saves canonical pack', async (t) => {
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
      `UPDATE child SET username = 'picto1', pin = $1 WHERE id = $2`,
      [await hashPassword('2468'), childId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'picto1', pin: '2468' }),
    });
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const loginBody = await loginRes.json();
    const csrf = loginBody.csrfToken;

    const saveRes = await fetch(`${http.baseUrl}/api/children/${childId}/pictogram-pack`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ pictogram_pack: 'action' }),
    });
    assert.equal(saveRes.status, 200);
    const merged = await saveRes.json();
    assert.equal(merged.pictogram_pack, 'action');

    const row = await db.query('SELECT child_view_config FROM child WHERE id = $1', [childId]);
    assert.equal(row.rows[0].child_view_config.pictogram_pack, 'action');

    await db.query(
      `UPDATE child SET child_view_config = $1 WHERE id = $2`,
      [JSON.stringify({ view_mode: 'classic', show_star_goal: true, pictogram_pack: 'action' }), childId]
    );

    const preserveRes = await fetch(`${http.baseUrl}/api/children/${childId}/pictogram-pack`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ pictogram_pack: 'simple' }),
    });
    assert.equal(preserveRes.status, 200);
    const preserved = await preserveRes.json();
    assert.equal(preserved.pictogram_pack, 'simple');
    assert.equal(preserved.view_mode, 'classic');
    assert.equal(preserved.show_star_goal, true);

    const badRes = await fetch(`${http.baseUrl}/api/children/${childId}/pictogram-pack`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ pictogram_pack: 'cartoon' }),
    });
    assert.equal(badRes.status, 400);

    const otherChild = await createChild(http.baseUrl, session, { name: 'Syskon', emoji: '🌙' });
    const forbidden = await fetch(`${http.baseUrl}/api/children/${otherChild}/pictogram-pack`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ pictogram_pack: 'simple' }),
    });
    assert.equal(forbidden.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('PATCH /api/children/:id/pictogram-pack — rejects extra config keys', async (t) => {
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
      `UPDATE child SET username = 'picto2', pin = $1 WHERE id = $2`,
      [await hashPassword('1357'), childId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'picto2', pin: '1357' }),
    });
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const loginBody = await loginRes.json();

    const res = await fetch(`${http.baseUrl}/api/children/${childId}/pictogram-pack`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      },
      body: JSON.stringify({ pictogram_pack: 'simple', view_mode: 'new' }),
    });
    assert.equal(res.status, 400);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

describe('child-pictogram-packs — pictogram-library coverage report', () => {
  it('maps 44 of 96 library keys; unmappable keys fall through safely', () => {
    const mappable = [];
    const unmappable = [];
    PICTOGRAMS.forEach(function (p) {
      if (serverPacks.normalizeActivityKey(p.key)) {
        mappable.push(p.key);
      } else {
        unmappable.push(p.key);
      }
    });
    assert.equal(mappable.length, 44);
    assert.equal(unmappable.length, 52);
    unmappable.forEach(function (key) {
      assert.equal(serverPacks.resolveActivityAsset(key, 'simple'), null);
    });
  });
});
