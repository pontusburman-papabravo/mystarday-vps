'use strict';

/**
 * R4.5 closure — transition lead parity, rebind-installation, canonical widget pick.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_NATIVE, FLAG_COMPLETION } = require('../src/lib/widget-flags');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const {
  isItemBlockedByTransitionLead,
  pickIdagPrimaryNowItem,
  resolveCanonicalChildNextActivity,
} = require('../src/lib/canonical-child-next-activity');
const { resolveWidgetNextAction } = require('../src/lib/widget-next-activity');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ROOT = path.join(__dirname, '..');

async function enableWidgetFlags(db) {
  for (const key of [FLAG_KEY, FLAG_NATIVE, FLAG_COMPLETION]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

test('transition lead: soon phase blocks widget primary', () => {
  const now = new Date();
  now.setHours(8, 0, 0, 0);
  const item = { id: '1', completed: false, start_time: '08:30', section: 'morgon' };
  assert.equal(
    isItemBlockedByTransitionLead(item, {
      transitionSupportEnabled: true,
      transitionLeadMinutes: [5, 1],
      now,
    }),
    true
  );
  const inside = new Date();
  inside.setHours(8, 26, 0, 0);
  assert.equal(
    isItemBlockedByTransitionLead(item, {
      transitionSupportEnabled: true,
      transitionLeadMinutes: [5, 1],
      now: inside,
    }),
    false
  );
});

test('transition lead: no start_time unchanged', () => {
  const item = { id: '1', completed: false, section: 'morgon' };
  assert.equal(
    isItemBlockedByTransitionLead(item, {
      transitionSupportEnabled: true,
      transitionLeadMinutes: [5, 1],
      now: new Date(),
    }),
    false
  );
});

test('pickIdagPrimaryNowItem sequential: blocked first item yields null for widget reject', () => {
  const items = [
    { id: 'a', completed: false, sort_order: 0, start_time: '23:59', section: 'morgon' },
    { id: 'b', completed: false, sort_order: 1, section: 'morgon' },
  ];
  const now = new Date();
  now.setHours(8, 0, 0, 0);
  const picked = pickIdagPrimaryNowItem(
    items,
    { firstStarMode: false, isToday: true, viewType: 'day_sections', showNowNext: false },
    {
      shouldRejectPrimary: (it) => isItemBlockedByTransitionLead(it, {
        transitionSupportEnabled: true,
        transitionLeadMinutes: [5, 1],
        now,
      }),
    }
  );
  assert.equal(picked, null);
});

test('R4.5 closure: POST /api/widget/rebind-installation', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  await enableWidgetFlags(db);
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const parent = await registerAndLogin(http.baseUrl);
    const childA = await createChild(http.baseUrl, parent, { name: 'Astrid' });
    const childB = await createChild(http.baseUrl, parent, { name: 'Belle' });

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parent.cookies),
        'X-CSRF-Token': parent.csrfToken,
      },
      body: JSON.stringify({
        installation_id: 'inst-parent-default',
        platform: 'ios',
        child_id: childA,
      }),
    });
    assert.equal(bindRes.status, 201);
    const { binding_token: tokenA } = await bindRes.json();

    const rebindRes = await fetch(`${http.baseUrl}/api/widget/rebind-installation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        installation_id: 'inst-parent-default:wi:widget-b',
        child_id: childB,
      }),
    });
    const rebindText = await rebindRes.text();
    assert.equal(rebindRes.status, 201, rebindText);
    const rebindBody = JSON.parse(rebindText);
    assert.ok(rebindBody.binding_token);
    assert.equal(rebindBody.child_id, childB);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('iOS WidgetBridgeStore uses per-scope keychain accounts', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift'),
    'utf8'
  );
  assert.match(src, /timelineScope/);
  assert.match(src, /keychainAccount\(for:/);
  assert.match(src, /migrateLegacyBindingIfNeeded/);
});

test('iOS AppIntent widget configuration sources present', () => {
  const dir = path.join(ROOT, 'ios/App/WidgetRoutine');
  assert.ok(fs.existsSync(path.join(dir, 'WidgetConfigurationIntents.swift')));
  const widget = fs.readFileSync(path.join(dir, 'NextRoutineWidget.swift'), 'utf8');
  assert.match(widget, /AppIntentConfiguration/);
  assert.match(widget, /NextRoutineWidgetConfigIntent/);
});

test('Android RoutineWidgetConfigureActivity registered', () => {
  const manifest = fs.readFileSync(
    path.join(ROOT, 'plugins/capacitor-widget-bridge/android/src/main/AndroidManifest.xml'),
    'utf8'
  );
  assert.match(manifest, /RoutineWidgetConfigureActivity/);
  const info = fs.readFileSync(
    path.join(ROOT, 'plugins/capacitor-widget-bridge/android/src/main/res/xml/routine_widget_info.xml'),
    'utf8'
  );
  assert.match(info, /configure/);
});
