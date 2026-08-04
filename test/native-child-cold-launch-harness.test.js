'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../src/lib/config');

const {
  legacyIntermittentResolveMeType,
  fixedResolveMeType,
  runColdLaunchHarness,
} = require('./helpers/native-child-cold-launch-harness');

const ROOT = path.join(__dirname, '..');

describe('native child-first cold launch harness', () => {
  const staleParentChildRefresh = {
    accessType: 'parent',
    refreshType: 'child',
    refreshValid: true,
  };

  it('legacy intermittent model bounces before picker guard (pre-fix)', () => {
    const result = runColdLaunchHarness(legacyIntermittentResolveMeType, staleParentChildRefresh, 8);
    assert.equal(result.stableOnChildToday, false);
    assert.ok(result.totalNavigations >= 2, 'expected today↔login flicker navigations');
    assert.ok(result.endedOnPicker || result.redirectLoop, 'picker guard or loop');
  });

  it('fixed model stabilizes on /child/today', () => {
    const result = runColdLaunchHarness(fixedResolveMeType, staleParentChildRefresh, 8);
    assert.equal(result.stableOnChildToday, true);
    assert.equal(result.redirectLoop, false);
    assert.ok(result.totalNavigations <= 1);
  });

  it('child-only session stays on today', () => {
    const result = runColdLaunchHarness(fixedResolveMeType, {
      accessType: 'child',
      refreshType: 'child',
      refreshValid: true,
    }, 4);
    assert.equal(result.stableOnChildToday, true);
  });

  it('parent-only session does not loop (picker guard after hops)', () => {
    const result = runColdLaunchHarness(fixedResolveMeType, {
      accessType: 'parent',
      refreshType: 'parent',
      refreshValid: true,
    }, 6);
    assert.equal(result.redirectLoop, false);
    assert.ok(result.endedOnPicker || result.trace[result.trace.length - 1].indexOf('child-login') !== -1);
  });
});

describe('native child-first client wiring', () => {
  const restore = fs.readFileSync(path.join(ROOT, 'public/js/native-child-session-restore.js'), 'utf8');
  const dashboard = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');

  it('exposes bootstrap lock and auth modes', () => {
    assert.match(restore, /AUTH_MODE/);
    assert.match(restore, /_bootstrapPromise/);
    assert.match(restore, /bootstrapNativeChildSession/);
  });

  it('child-dashboard uses loop-safe child-login fallback', () => {
    assert.match(dashboard, /childLoginFallbackUrl/);
    assert.match(dashboard, /bootstrapNativeChildSession/);
  });

  it('does not treat localStorage as sole auth proof', () => {
    assert.match(restore, /\/api\/auth\/me/);
    assert.doesNotMatch(restore, /localStorage\.getItem\([^)]+\)[\s\S]{0,80}type === 'child'/);
  });
});

describe('session-cookie-reconcile integration', () => {
  it('aligns access_token to child when refresh is child', async (t) => {
    const db = require('../src/lib/db');
    if (!process.env.DATABASE_URL) {
      t.skip('DATABASE_URL not set');
      return;
    }

    const { acquireDbTestLock } = require('./helpers/db-test-lock');
    const releaseLock = await acquireDbTestLock();
    t.after(async () => { await releaseLock(); });

    const familyRes = await db.query(
      `INSERT INTO family (name, timezone) VALUES ('Reconcile', 'Europe/Stockholm') RETURNING id`
    );
    const familyId = familyRes.rows[0].id;
    const childRes = await db.query(
      `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
       VALUES ($1, 'Kid', '⭐', 'kid', 'x', 0) RETURNING id`,
      [familyId]
    );
    const childId = childRes.rows[0].id;

    const parentRes = await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed)
       VALUES ($1, 'x', $2, 'P', true) RETURNING id`,
      [`reconcile-${Date.now()}@example.com`, familyId]
    );
    const parentId = parentRes.rows[0].id;

    const { createRefreshToken } = require('../src/lib/refresh-tokens');
    const childRefresh = await createRefreshToken({
      userId: childId,
      userType: 'child',
      familyId,
    });

    const parentAccess = jwt.sign(
      { id: parentId, type: 'parent', familyId, email: 'p@example.com' },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    const { reconcileChildSessionCookies } = require('../src/lib/session-cookie-reconcile');
    const req = {
      cookies: {
        access_token: parentAccess,
        refresh_token: childRefresh,
      },
    };
    const setCookieHeaders = [];
    const res = {
      cookie() {},
      getHeader() { return null; },
      setHeader(name, value) {
        if (name === 'Set-Cookie') setCookieHeaders.push(value);
      },
    };

    const result = await reconcileChildSessionCookies(req, res);
    assert.equal(result.reconciled, true);
    assert.ok(req.cookies.access_token);
    const decoded = jwt.verify(req.cookies.access_token, config.jwt.secret);
    assert.equal(decoded.type, 'child');
    assert.equal(decoded.id, childId);

    await db.query('DELETE FROM child WHERE id = $1', [childId]);
    await db.query('DELETE FROM parent WHERE id = $1', [parentId]);
    await db.query('DELETE FROM family WHERE id = $1', [familyId]);
  });
});
