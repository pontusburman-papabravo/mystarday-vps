/**
 * PR-A bug fix regression tests.
 *
 * Covers:
 *   #12  — localStorage keys fixed (family.html, mobile-nav.js)
 *   #11  — Double /api/contact handler removed (contact.js deleted, only public.js remains)
 *   #13  — Reward redemption uses transaction with row lock (code structure check)
 *   #14  — /api/family-count returns 503 on DB error (not hardcoded 45)
 *   #17  — Graceful SIGTERM/SIGINT handling wired in server.js
 *   #18  — rewards.js.bak deleted
 *
 * Run: node --test test/bugfix-pra.test.js
 * Uses node:test (Node >= 18). No live DB required.
 */

'use strict';

process.env.DATABASE_URL = 'REDACTED/mock_test';

const { describe, it } = require('node:test');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT        = path.join(__dirname, '..');
const PUBLIC_DIR  = path.join(ROOT, 'public');
const SERVER_JS   = path.join(ROOT, 'server.js');
const PUBLIC_JS   = path.join(ROOT, 'src', 'routes', 'public.js');
const REWARDS_JS  = path.join(ROOT, 'src', 'routes', 'rewards.js');
const MOBILE_NAV  = path.join(PUBLIC_DIR, 'js', 'mobile-nav.js');
const FAMILY_HTML = path.join(PUBLIC_DIR, 'family.html');
const FAMILY_JS   = path.join(PUBLIC_DIR, 'js', 'family.js');
const AUTH_JS     = path.join(PUBLIC_DIR, 'js', 'auth.js');

// ─── Fix #12: localStorage keys ───────────────────────────
describe('Fix #12 -- localStorage keys use stjarndag_ prefix', () => {
  it('family.html must not removeItem("token") with bare key', () => {
    const src = fs.readFileSync(FAMILY_HTML, 'utf8');
    // Matches removeItem('token') or removeItem("token") — the wrong bare key
    const hasBareToken = /localStorage\.removeItem\(['"]token['"]\)/.test(src);
    assert.strictEqual(hasBareToken, false,
      'family.html still calls localStorage.removeItem("token") — should use "stjarndag_token"');
  });

  it('family.html must not removeItem("user") with bare key', () => {
    const src = fs.readFileSync(FAMILY_HTML, 'utf8');
    const hasBareUser = /localStorage\.removeItem\(['"]user['"]\)/.test(src);
    assert.strictEqual(hasBareUser, false,
      'family.html still calls localStorage.removeItem("user") — should use "stjarndag_user"');
  });

  it('mobile-nav.js must not removeItem("token") with bare key', () => {
    const src = fs.readFileSync(MOBILE_NAV, 'utf8');
    const hasBareToken = /localStorage\.removeItem\(['"]token['"]\)/.test(src);
    assert.strictEqual(hasBareToken, false,
      'mobile-nav.js still calls localStorage.removeItem("token") — should use "stjarndag_token"');
  });

  it('mobile-nav.js must not removeItem("user") with bare key', () => {
    const src = fs.readFileSync(MOBILE_NAV, 'utf8');
    const hasBareUser = /localStorage\.removeItem\(['"]user['"]\)/.test(src);
    assert.strictEqual(hasBareUser, false,
      'mobile-nav.js still calls localStorage.removeItem("user") — should use "stjarndag_user"');
  });

  it('family.html logout delegates to Auth.logout()', () => {
    const js = fs.readFileSync(FAMILY_JS, 'utf8');
    assert.ok(js.includes('Auth.logout()'),
      'family.js must call Auth.logout() — not inline bare localStorage keys');
  });

  it('Auth.clearAuth removes stjarndag_token and stjarndag_user', () => {
    const src = fs.readFileSync(AUTH_JS, 'utf8');
    assert.ok(src.includes('localStorage.removeItem(this.TOKEN_KEY)'),
      'auth.js clearAuth must remove TOKEN_KEY (stjarndag_token)');
    assert.ok(src.includes('localStorage.removeItem(this.USER_KEY)'),
      'auth.js clearAuth must remove USER_KEY (stjarndag_user)');
  });
});

// ─── Fix #11: Double /api/contact handler removed ─────────
describe('Fix #11 -- contact.js removed, server.js no longer mounts it', () => {
  it('src/routes/contact.js must not exist', () => {
    const contactPath = path.join(ROOT, 'src', 'routes', 'contact.js');
    const exists = fs.existsSync(contactPath);
    assert.strictEqual(exists, false,
      'src/routes/contact.js still exists — it should have been deleted');
  });

  it('server.js must not require ./src/routes/contact', () => {
    const src = fs.readFileSync(SERVER_JS, 'utf8');
    const hasRequire = src.includes("require('./src/routes/contact')");
    assert.strictEqual(hasRequire, false,
      'server.js still requires src/routes/contact — remove the mount');
  });

  it('public.js /contact handler writes to contact_message table', () => {
    const src = fs.readFileSync(PUBLIC_JS, 'utf8');
    assert.ok(src.includes('contact_message'),
      'public.js /contact handler should INSERT into contact_message table');
  });
});

// ─── Fix #13: Reward redemption race condition ─────────────
describe('Fix #13 -- reward redemption uses transaction with row lock', () => {
  it('rewards.js redeem route uses BEGIN/COMMIT transaction', () => {
    const src = fs.readFileSync(REWARDS_JS, 'utf8');
    assert.ok(src.includes("client.query('BEGIN')"),
      'rewards.js redeem should start a transaction with BEGIN');
    assert.ok(src.includes("client.query('COMMIT')"),
      'rewards.js redeem should commit the transaction');
  });

  it('rewards.js redeem route acquires row lock with FOR UPDATE', () => {
    const src = fs.readFileSync(REWARDS_JS, 'utf8');
    assert.ok(src.includes('FOR UPDATE'),
      'rewards.js redeem must use SELECT ... FOR UPDATE to serialize concurrent redemptions');
  });

  it('rewards.js redeem route calls ROLLBACK on error path', () => {
    const src = fs.readFileSync(REWARDS_JS, 'utf8');
    assert.ok(src.includes("client.query('ROLLBACK')"),
      'rewards.js redeem must rollback the transaction on error');
  });

  it('rewards.js redeem route uses client.release() in finally block', () => {
    const src = fs.readFileSync(REWARDS_JS, 'utf8');
    assert.ok(src.includes('client.release()'),
      'rewards.js redeem must release the client in a finally block to avoid pool leaks');
  });
});

// ─── Fix #14: family-count 503 on DB error ────────────────
describe('Fix #14 -- /api/family-count returns 503 on DB error, not hardcoded 45', () => {
  it('public.js family-count error handler must not return { count: 45 }', () => {
    const src = fs.readFileSync(PUBLIC_JS, 'utf8');
    const hasHardcoded45 = src.includes('count: 45');
    assert.strictEqual(hasHardcoded45, false,
      'public.js family-count still has hardcoded { count: 45 } fallback — should return 503');
  });

  it('public.js family-count error handler returns 503', () => {
    const src = fs.readFileSync(PUBLIC_JS, 'utf8');
    assert.ok(src.includes('503'),
      'public.js family-count error path must call res.status(503)');
  });
});

// ─── Fix #17: Graceful SIGTERM/SIGINT handling ────────────
describe('Fix #17 -- server.js handles SIGTERM and SIGINT for clean process exit', () => {
  it('server.js registers SIGTERM handler', () => {
    const src = fs.readFileSync(SERVER_JS, 'utf8');
    assert.ok(src.includes("'SIGTERM'"),
      'server.js must listen for SIGTERM');
  });

  it('server.js registers SIGINT handler', () => {
    const src = fs.readFileSync(SERVER_JS, 'utf8');
    assert.ok(src.includes("'SIGINT'"),
      'server.js must listen for SIGINT');
  });

  it('server.js calls pool.end() in termination handler', () => {
    const src = fs.readFileSync(SERVER_JS, 'utf8');
    assert.ok(src.includes('pool.end()'),
      'server.js must call pool.end() to drain DB connections on termination');
  });

  it('server.js stops all three schedulers in termination handler', () => {
    const src = fs.readFileSync(SERVER_JS, 'utf8');
    assert.ok(src.includes('stopMidnightScheduler()'),
      'server.js must call stopMidnightScheduler()');
    assert.ok(src.includes('stopDeletionScheduler()'),
      'server.js must call stopDeletionScheduler()');
    assert.ok(src.includes('stopWeeklySummaryScheduler()'),
      'server.js must call stopWeeklySummaryScheduler()');
  });
});

// ─── Fix #18: rewards.js.bak deleted ─────────────────────
describe('Fix #18 -- rewards.js.bak removed', () => {
  it('src/routes/rewards.js.bak must not exist', () => {
    const bakPath = path.join(ROOT, 'src', 'routes', 'rewards.js.bak');
    const exists = fs.existsSync(bakPath);
    assert.strictEqual(exists, false,
      'src/routes/rewards.js.bak still exists — delete it; history is in git');
  });
});
