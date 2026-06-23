/**
 * Authz regression tests — IDOR and cross-family access prevention.
 *
 * Tests the centralized authz middleware (src/middleware/authz.js).
 * Uses mock DB to avoid a live database connection.
 *
 * Run: node --test test/authz.test.js
 */

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// ─── Inject fake DATABASE_URL before any module loads ────────────────────────
process.env.DATABASE_URL = 'REDACTED/mock_test';

// ─── Mock DB ─────────────────────────────────────────────────────────────────
let mockQueryFn = async () => ({ rows: [] });

const mockDb = {
  query: async (text, params) => mockQueryFn(text, params),
  getClient: async () => { throw new Error('getClient not mocked'); },
  pool: {},
};

const dbPath = require.resolve(path.join(__dirname, '../src/lib/db'));
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: mockDb,
  children: [],
  parent: null,
  paths: [],
};

const authzPath = require.resolve(path.join(__dirname, '../src/middleware/authz'));
delete require.cache[authzPath];
const authz = require(authzPath);

// ─── Test helpers ─────────────────────────────────────────────────────────────

function setMockRows(rows) {
  mockQueryFn = async () => ({ rows });
}

function setMockQuery(fn) {
  mockQueryFn = fn;
}

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    let statusCode;
    const res = {
      status(code) {
        statusCode = code;
        return {
          json(body) {
            resolve({ status: statusCode, body });
          },
        };
      },
    };
    const next = (err) => {
      if (err) resolve({ error: err });
      else resolve({ next: true });
    };
    middleware(req, res, next);
  });
}

// Reset mock before each test
beforeEach(() => {
  setMockRows([]);
});

// ─── Kill switch tests ────────────────────────────────────────────────────────

test('ENABLED is true by default (env var not set to false)', () => {
  assert.strictEqual(typeof authz.ENABLED, 'boolean');
  assert.strictEqual(authz.ENABLED, true);
});

test('requireChildAccess passes through when kill switch off (reloaded module)', async () => {
  const origEnv = process.env.AUTHZ_HARDENING_ENABLED;
  process.env.AUTHZ_HARDENING_ENABLED = 'false';

  // Reload authz with kill switch off
  delete require.cache[authzPath];
  const authzOff = require(authzPath);
  assert.strictEqual(authzOff.ENABLED, false);

  const req = { user: { id: 'parent-1' }, params: { childId: 'child-1' } };
  const mw = authzOff.requireChildAccess('childId');
  const result = await runMiddleware(mw, req);
  // With kill switch off, should pass through WITHOUT calling DB at all
  assert.deepStrictEqual(result, { next: true }, 'Should pass through when disabled');

  // Restore env + re-cache the enabled version
  if (origEnv === undefined) delete process.env.AUTHZ_HARDENING_ENABLED;
  else process.env.AUTHZ_HARDENING_ENABLED = origEnv;
  delete require.cache[authzPath];
  require(authzPath);
});

// ─── getChildAccess ───────────────────────────────────────────────────────────

test('returns child row when parent owns child', async () => {
  setMockRows([{ id: 'child-1', family_id: 'fam-1', name: 'Emma' }]);
  const result = await authz.getChildAccess('parent-1', 'child-1');
  assert.ok(result, 'Should return child row');
  assert.strictEqual(result.id, 'child-1');
});

test('returns null when parent_child link is revoked', async () => {
  setMockQuery(async (sql) => {
    assert.match(sql, /revoked_at IS NULL/i, 'getChildAccess must filter revoked links');
    return { rows: [] };
  });
  const result = await authz.getChildAccess('parent-revoked', 'child-1');
  assert.strictEqual(result, null, 'Revoked parent_child should deny access');
});

test('getChildAccess SQL always includes revoked_at IS NULL filter', async () => {
  let capturedSql = '';
  setMockQuery(async (sql) => {
    capturedSql = sql;
    return { rows: [{ id: 'child-1', family_id: 'fam-1', name: 'Emma' }] };
  });
  await authz.getChildAccess('parent-1', 'child-1');
  assert.match(capturedSql, /revoked_at IS NULL/i);
});

test('returns null when parent does not own child (IDOR scenario)', async () => {
  setMockRows([]); // parent_child JOIN returns no rows
  const result = await authz.getChildAccess('parent-attacker', 'child-victim');
  assert.strictEqual(result, null, 'Should block cross-family child access');
});

test('returns null for non-existent childId', async () => {
  setMockRows([]);
  const result = await authz.getChildAccess('parent-1', '00000000-0000-0000-0000-000000000000');
  assert.strictEqual(result, null);
});

// ─── getLogAccess ─────────────────────────────────────────────────────────────

test('returns log row when parent owns log via child', async () => {
  setMockRows([{ id: 'log-1', child_id: 'child-1', date: '2026-05-11', is_paused: false }]);
  const result = await authz.getLogAccess('parent-1', 'log-1');
  assert.ok(result);
  assert.strictEqual(result.id, 'log-1');
});

test('returns null for cross-family log access (IDOR scenario)', async () => {
  setMockRows([]);
  const result = await authz.getLogAccess('parent-attacker', 'log-from-another-family');
  assert.strictEqual(result, null, 'Should block cross-family log access');
});

// ─── getItemAccess ────────────────────────────────────────────────────────────

test('returns item row when parent owns item via log→child chain', async () => {
  setMockRows([{ id: 'item-1', daily_log_id: 'log-1', completed: false, child_id: 'child-1', is_paused: false }]);
  const result = await authz.getItemAccess('parent-1', 'item-1');
  assert.ok(result);
  assert.strictEqual(result.id, 'item-1');
});

test('returns null for cross-family item access (IDOR scenario)', async () => {
  setMockRows([]);
  const result = await authz.getItemAccess('parent-attacker', 'item-from-another-family');
  assert.strictEqual(result, null, 'Should block cross-family item access');
});

// ─── getScheduleAccess ────────────────────────────────────────────────────────

test('returns schedule row for child-scoped schedule (first query hits)', async () => {
  let callCount = 0;
  setMockQuery(async () => {
    callCount++;
    if (callCount === 1) return { rows: [{ id: 'sched-1', child_id: 'child-1', day_of_week: 1 }] };
    return { rows: [] };
  });
  const result = await authz.getScheduleAccess('parent-1', 'sched-1');
  assert.ok(result);
  assert.strictEqual(result.id, 'sched-1');
});

test('returns family-level template schedule (child_id IS NULL, second query hits)', async () => {
  let callCount = 0;
  setMockQuery(async () => {
    callCount++;
    if (callCount === 1) return { rows: [] }; // child-scoped: miss
    if (callCount === 2) return { rows: [{ id: 'sched-tmpl', child_id: null, day_of_week: 0 }] };
    return { rows: [] };
  });
  const result = await authz.getScheduleAccess('parent-1', 'sched-tmpl');
  assert.ok(result, 'Should find family-level template');
  assert.strictEqual(result.id, 'sched-tmpl');
});

test('returns null for cross-family schedule access (IDOR scenario)', async () => {
  setMockQuery(async () => ({ rows: [] })); // both queries miss
  const result = await authz.getScheduleAccess('parent-attacker', 'sched-victim');
  assert.strictEqual(result, null, 'Should block cross-family schedule access');
});

// ─── getSpecialDayAccess ──────────────────────────────────────────────────────

test('returns special day row when parent owns it', async () => {
  setMockRows([{ id: 'sday-1', child_id: 'child-1', date: '2026-05-25', note: null }]);
  const result = await authz.getSpecialDayAccess('parent-1', 'sday-1');
  assert.ok(result);
  assert.strictEqual(result.id, 'sday-1');
});

test('returns null for cross-family special day access (IDOR scenario)', async () => {
  setMockRows([]);
  const result = await authz.getSpecialDayAccess('parent-attacker', 'sday-victim');
  assert.strictEqual(result, null, 'Should block cross-family special day access');
});

// ─── getRewardAccess ──────────────────────────────────────────────────────────

test('returns reward row when family owns it', async () => {
  setMockRows([{ id: 'reward-1', name: 'Bio', star_cost: 50, family_id: 'fam-1' }]);
  const result = await authz.getRewardAccess('fam-1', 'reward-1');
  assert.ok(result);
  assert.strictEqual(result.id, 'reward-1');
});

test('returns null for cross-family reward access (IDOR scenario)', async () => {
  setMockRows([]);
  const result = await authz.getRewardAccess('fam-attacker', 'reward-from-another-family');
  assert.strictEqual(result, null, 'Should block cross-family reward access');
});

// ─── requireChildAccess middleware ────────────────────────────────────────────

test('calls next() and sets req.authzChild when parent owns child', async () => {
  setMockRows([{ id: 'child-1', family_id: 'fam-1', name: 'Emma' }]);
  const req = { user: { id: 'parent-1' }, params: { childId: 'child-1' } };
  const mw = authz.requireChildAccess('childId');
  const result = await runMiddleware(mw, req);
  assert.deepStrictEqual(result, { next: true });
  assert.strictEqual(req.authzChild.id, 'child-1', 'authzChild should be set on req');
});

test('returns 403 when parent does not own child (IDOR scenario)', async () => {
  setMockRows([]);
  const req = { user: { id: 'parent-attacker' }, params: { childId: 'child-victim' } };
  const mw = authz.requireChildAccess('childId');
  const result = await runMiddleware(mw, req);
  assert.strictEqual(result.status, 403, 'Should return 403 for unauthorized child access');
});

test('uses custom param name in requireChildAccess', async () => {
  setMockRows([{ id: 'child-2', family_id: 'fam-1', name: 'Axel' }]);
  const req = { user: { id: 'parent-1' }, params: { id: 'child-2' } };
  const mw = authz.requireChildAccess('id');
  const result = await runMiddleware(mw, req);
  assert.deepStrictEqual(result, { next: true });
});

// ─── requireLogAccess middleware ──────────────────────────────────────────────

test('calls next() and sets req.authzLog when parent owns log', async () => {
  setMockRows([{ id: 'log-1', child_id: 'child-1', date: '2026-05-11', is_paused: false }]);
  const req = { user: { id: 'parent-1' }, params: { logId: 'log-1' } };
  const mw = authz.requireLogAccess('logId');
  const result = await runMiddleware(mw, req);
  assert.deepStrictEqual(result, { next: true });
  assert.strictEqual(req.authzLog.id, 'log-1');
});

test('returns 403 for cross-family log access (IDOR scenario)', async () => {
  setMockRows([]);
  const req = { user: { id: 'parent-attacker' }, params: { logId: 'log-victim' } };
  const mw = authz.requireLogAccess('logId');
  const result = await runMiddleware(mw, req);
  assert.strictEqual(result.status, 403, 'Should return 403 for unauthorized log access');
});

// ─── requireItemAccess middleware ─────────────────────────────────────────────

test('calls next() and sets req.authzItem when parent owns item', async () => {
  setMockRows([{ id: 'item-1', daily_log_id: 'log-1', completed: false, child_id: 'child-1', is_paused: false }]);
  const req = { user: { id: 'parent-1' }, params: { itemId: 'item-1' } };
  const mw = authz.requireItemAccess('itemId');
  const result = await runMiddleware(mw, req);
  assert.deepStrictEqual(result, { next: true });
  assert.strictEqual(req.authzItem.id, 'item-1');
});

test('returns 403 for cross-family item access (IDOR scenario)', async () => {
  setMockRows([]);
  const req = { user: { id: 'parent-attacker' }, params: { itemId: 'item-victim' } };
  const mw = authz.requireItemAccess('itemId');
  const result = await runMiddleware(mw, req);
  assert.strictEqual(result.status, 403, 'Should return 403 for unauthorized item access');
});

// ─── requireScheduleAccess middleware ────────────────────────────────────────

test('calls next() and sets req.authzSchedule when parent owns schedule', async () => {
  setMockQuery(async () => ({ rows: [{ id: 'sched-1', child_id: 'child-1', day_of_week: 2 }] }));
  const req = { user: { id: 'parent-1' }, params: { scheduleId: 'sched-1' } };
  const mw = authz.requireScheduleAccess('scheduleId');
  const result = await runMiddleware(mw, req);
  assert.deepStrictEqual(result, { next: true });
  assert.strictEqual(req.authzSchedule.id, 'sched-1');
});

test('returns 403 for cross-family schedule access (IDOR scenario)', async () => {
  setMockQuery(async () => ({ rows: [] }));
  const req = { user: { id: 'parent-attacker' }, params: { scheduleId: 'sched-victim' } };
  const mw = authz.requireScheduleAccess('scheduleId');
  const result = await runMiddleware(mw, req);
  assert.strictEqual(result.status, 403, 'Should return 403 for unauthorized schedule access');
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

test('DB errors propagate to next(err) — does not swallow exceptions', async () => {
  setMockQuery(async () => { throw new Error('DB connection error'); });
  const req = { user: { id: 'parent-1' }, params: { childId: 'child-1' } };
  const mw = authz.requireChildAccess('childId');
  const result = await runMiddleware(mw, req);
  assert.ok(result.error, 'Should propagate DB errors via next(err)');
  assert.ok(result.error.message.includes('DB connection error'));
});

test('invited parent (role: shared) gets access — parent_child JOIN includes all roles', async () => {
  // The query JOINs parent_child without filtering on role column.
  // An invited parent has a row with role='shared' — the JOIN still returns the child.
  setMockRows([{ id: 'child-1', family_id: 'fam-1', name: 'Emma' }]);
  const result = await authz.getChildAccess('invited-parent-id', 'child-1');
  assert.ok(result, 'Invited parent with parent_child row should get access');
});

test('child id used as parent id finds no parent_child rows', async () => {
  // requireParent middleware (auth.js) prevents this in practice.
  // As a defence-in-depth test: a child UUID used as parentId finds no parent_child rows.
  setMockRows([]);
  const result = await authz.getChildAccess('child-id-acting-as-parent', 'some-child');
  assert.strictEqual(result, null, 'Child UUID has no parent_child rows — returns null');
});

// ─── requireNotPedagogOnly ──────────────────────────────────────────────────

test('requireNotPedagogOnly passes through for family parent', async () => {
  // getParentRoles: hasPrimaryOrShared=true, hasPedagogOnly=false
  setMockRows([{ role: 'primary', child_id: 'child-1' }]);
  const req = { user: { id: 'parent-family' } };
  const result = await runMiddleware(authz.requireNotPedagogOnly, req);
  assert.deepStrictEqual(result, { next: true }, 'Family parent should pass through');
});

test('requireNotPedagogOnly passes through for dual-role parent', async () => {
  // getParentRoles: hasPrimaryOrShared=true, hasPedagogOnly=false (dual)
  setMockRows([
    { role: 'primary', child_id: 'child-1' },
    { role: 'pedagog', child_id: 'child-2' },
  ]);
  const req = { user: { id: 'parent-dual' } };
  const result = await runMiddleware(authz.requireNotPedagogOnly, req);
  assert.deepStrictEqual(result, { next: true }, 'Dual-role parent should pass through');
});

test('requireNotPedagogOnly returns 403 for pedagog-only parent', async () => {
  // getParentRoles: hasPrimaryOrShared=false, hasPedagogOnly=true
  setMockRows([{ role: 'pedagog', child_id: 'child-1' }]);
  const req = { user: { id: 'parent-pedagog-only' } };
  const result = await runMiddleware(authz.requireNotPedagogOnly, req);
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.error, 'PEDAGOG_ONLY');
});

test('requireNotPedagogOnly passes through when kill switch off', async () => {
  const origEnv = process.env.AUTHZ_HARDENING_ENABLED;
  process.env.AUTHZ_HARDENING_ENABLED = 'false';
  delete require.cache[authzPath];
  const authzOff = require(authzPath);
  const req = { user: { id: 'parent-pedagog-only' } };
  const result = await runMiddleware(authzOff.requireNotPedagogOnly, req);
  assert.deepStrictEqual(result, { next: true }, 'Kill switch off → pass through');
  if (origEnv === undefined) delete process.env.AUTHZ_HARDENING_ENABLED;
  else process.env.AUTHZ_HARDENING_ENABLED = origEnv;
  delete require.cache[authzPath];
  require(authzPath);
});

// ─── requirePrimaryParent ────────────────────────────────────────────────────

test('requirePrimaryParent passes through for primary parent', async () => {
  // db.query for role='primary' + revoked_at IS NULL returns a row
  setMockRows([{ '?column?': 1 }]);
  const req = { user: { id: 'parent-primary' } };
  const result = await runMiddleware(authz.requirePrimaryParent, req);
  assert.deepStrictEqual(result, { next: true }, 'Primary parent should pass through');
});

test('requirePrimaryParent returns 403 for shared parent', async () => {
  // db.query returns empty rows (shared is not primary)
  setMockRows([]);
  const req = { user: { id: 'parent-shared' } };
  const result = await runMiddleware(authz.requirePrimaryParent, req);
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.error, 'ONLY_PRIMARY');
});

test('requirePrimaryParent returns 403 for pedagog-only parent', async () => {
  setMockRows([]);
  const req = { user: { id: 'parent-pedagog' } };
  const result = await runMiddleware(authz.requirePrimaryParent, req);
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.error, 'ONLY_PRIMARY');
});

test('requirePrimaryParent passes through when kill switch off', async () => {
  const origEnv = process.env.AUTHZ_HARDENING_ENABLED;
  process.env.AUTHZ_HARDENING_ENABLED = 'false';
  delete require.cache[authzPath];
  const authzOff = require(authzPath);
  const req = { user: { id: 'parent-shared' } };
  const result = await runMiddleware(authzOff.requirePrimaryParent, req);
  assert.deepStrictEqual(result, { next: true }, 'Kill switch off → pass through');
  if (origEnv === undefined) delete process.env.AUTHZ_HARDENING_ENABLED;
  else process.env.AUTHZ_HARDENING_ENABLED = origEnv;
  delete require.cache[authzPath];
  require(authzPath);
});

