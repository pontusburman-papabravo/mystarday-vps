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

function loadClientCardSize(gateOn) {
  const script = read('public/js/child-activity-card-size.js');
  function CustomEvent(type, opts) {
    this.type = type;
    this.detail = opts && opts.detail;
  }
  const doc = {
    documentElement: {
      getAttribute: function (name) {
        if (name === 'data-barnets-samling') return gateOn ? 'on' : null;
        if (name === 'data-activity-card-size') return doc._sizeAttr || null;
        return null;
      },
      setAttribute: function (name, value) {
        if (name === 'data-activity-card-size') doc._sizeAttr = value;
      },
      removeAttribute: function (name) {
        if (name === 'data-activity-card-size') doc._sizeAttr = null;
      },
    },
    dispatchEvent: function () {},
  };
  const win = {
    ChildWorlds: gateOn ? { isBarnetsSamlingEnabled: function () { return true; } } : {},
    document: doc,
    CustomEvent: CustomEvent,
  };
  vm.runInNewContext(script, { window: win, document: doc, CustomEvent: CustomEvent }, { filename: 'child-activity-card-size.js' });
  return win;
}

const serverSizes = require('../config/child-activity-card-size');

describe('child-activity-card-size — server resolver', () => {
  it('defaults unknown, empty, or null to standard', () => {
    assert.equal(serverSizes.resolveCardSize(null), 'standard');
    assert.equal(serverSizes.resolveCardSize(''), 'standard');
    assert.equal(serverSizes.resolveCardSize('huge'), 'standard');
    assert.equal(serverSizes.DEFAULT_SIZE, 'standard');
  });

  it('lists two sizes with Swedish labels', () => {
    const sizes = serverSizes.listSizes();
    assert.equal(sizes.length, 2);
    assert.deepEqual(sizes.map(function (s) { return s.id; }), ['standard', 'large']);
    assert.equal(sizes[0].label, 'Vanliga kort');
    assert.equal(sizes[1].label, 'Stora bilder');
  });
});

describe('child-activity-card-size — client', () => {
  it('sets data-activity-card-size on document when gate ON', () => {
    const win = loadClientCardSize(true);
    win.ChildActivityCardSize.applyFromConfig({ activity_card_size: 'large' });
    assert.equal(win.document.documentElement.getAttribute('data-activity-card-size'), 'large');
  });

  it('preview does not change saved size until commit', () => {
    const win = loadClientCardSize(true);
    win.ChildActivityCardSize.applyFromConfig({ activity_card_size: 'standard' }, { silent: true });
    win.ChildActivityCardSize.applyPreview('large');
    assert.equal(win.ChildActivityCardSize.getActiveSizeId(), 'large');
    assert.equal(win.ChildActivityCardSize.getSavedSizeId(), 'standard');
    win.ChildActivityCardSize.revertToSaved({ silent: true });
    assert.equal(win.ChildActivityCardSize.getActiveSizeId(), 'standard');
  });

  it('removes data attribute when gate OFF', () => {
    const win = loadClientCardSize(false);
    win.ChildActivityCardSize.applyFromConfig({ activity_card_size: 'large' }, { silent: true });
    assert.equal(win.document.documentElement.getAttribute('data-activity-card-size'), null);
  });
});

describe('child-activity-card-size — UI wiring', () => {
  it('renders Kortstorlek entry in customization module', () => {
    const src = read('public/js/child-customization-entries.js');
    assert.match(src, /renderCardSizeEntry/);
    assert.match(src, /bspOpenCardSizePicker/);
    assert.match(src, /renderPictogramEntry/);
    assert.match(src, /renderCardSizeEntry/);
  });

  it('picker scripts and styles load on child dashboard', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /child-activity-card-size\.js/);
    assert.match(html, /child-activity-card-size-picker\.js/);
    assert.match(html, /child-activity-card-size\.css/);
  });

  it('photo cards use fixed img slot for layout stability', () => {
    const src = read('public/js/child-dashboard-photo-cards.js');
    assert.match(src, /photo-activity-card__img-slot/);
  });

  it('large mode CSS uses contain and single-column list', () => {
    const css = read('public/css/child-activity-card-size.css');
    assert.match(css, /data-activity-card-size="large"/);
    assert.match(css, /object-fit: contain/);
    assert.match(css, /flex-direction: column/);
  });

  it('picker uses dedicated activity-card-size endpoint', () => {
    const src = read('public/js/child-activity-card-size-picker.js');
    assert.match(src, /\/activity-card-size/);
    assert.match(src, /settings\.cardSizeSave/);
    assert.match(src, /revertToSaved/);
  });
});

test('PATCH /api/children/:id/activity-card-size — child saves canonical size', async (t) => {
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
      `UPDATE child SET username = 'cardsz1', pin = $1 WHERE id = $2`,
      [await hashPassword('2468'), childId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'cardsz1', pin: '2468' }),
    });
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const loginBody = await loginRes.json();
    const csrf = loginBody.csrfToken;

    const saveRes = await fetch(`${http.baseUrl}/api/children/${childId}/activity-card-size`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ activity_card_size: 'large' }),
    });
    assert.equal(saveRes.status, 200);
    const merged = await saveRes.json();
    assert.equal(merged.activity_card_size, 'large');

    await db.query(
      `UPDATE child SET child_view_config = $1 WHERE id = $2`,
      [JSON.stringify({ view_mode: 'classic', pictogram_pack: 'simple', activity_card_size: 'large' }), childId]
    );

    const preserveRes = await fetch(`${http.baseUrl}/api/children/${childId}/activity-card-size`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ activity_card_size: 'standard' }),
    });
    assert.equal(preserveRes.status, 200);
    const preserved = await preserveRes.json();
    assert.equal(preserved.activity_card_size, 'standard');
    assert.equal(preserved.view_mode, 'classic');
    assert.equal(preserved.pictogram_pack, 'simple');

    const badRes = await fetch(`${http.baseUrl}/api/children/${childId}/activity-card-size`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ activity_card_size: 'extra-large' }),
    });
    assert.equal(badRes.status, 400);

    const otherChild = await createChild(http.baseUrl, session, { name: 'Syskon', emoji: '🌙' });
    const forbidden = await fetch(`${http.baseUrl}/api/children/${otherChild}/activity-card-size`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ activity_card_size: 'large' }),
    });
    assert.equal(forbidden.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('PATCH /api/children/:id/activity-card-size — rejects extra config keys', async (t) => {
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
      `UPDATE child SET username = 'cardsz2', pin = $1 WHERE id = $2`,
      [await hashPassword('1357'), childId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'cardsz2', pin: '1357' }),
    });
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const loginBody = await loginRes.json();

    const res = await fetch(`${http.baseUrl}/api/children/${childId}/activity-card-size`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      },
      body: JSON.stringify({ activity_card_size: 'large', pictogram_pack: 'action' }),
    });
    assert.equal(res.status, 400);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
