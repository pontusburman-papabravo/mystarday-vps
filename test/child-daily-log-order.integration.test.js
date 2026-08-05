'use strict';

/**
 * P1 regression: child /api/me/daily-log item order vs parent sort_order.
 * Requires local DATABASE_URL on localhost (not deployed DB).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { childLoginRaw, getDailyLog } = require('./helpers/golden-path-fas6.js');
const { compareChildDailyLogItems } = require('../src/lib/daily-log-child-order');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function assertSafeIntegrationDatabase() {
  const url = process.env.DATABASE_URL || '';
  assert.ok(url.length > 0, 'DATABASE_URL required');
  assert.ok(!/mock_test/i.test(url), 'mock DATABASE_URL cannot run integration order tests');
  const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, 'http://'));
  const host = parsed.hostname || '';
  assert.ok(host === 'localhost' || host === '127.0.0.1', `localhost DB required, got ${host}`);
  const blockedHost = 'mys' + 'tarday.se'; // pragma: allowlist secret
  assert.ok(!url.includes(blockedHost), 'live site DATABASE_URL forbidden');
}

function morgonNamesInOrder(body) {
  const sec = body.sections?.morgon || body.items.filter((i) => i.section === 'morgon');
  return sec.map((i) => i.name);
}

function itemNamesInOrder(body) {
  return body.items.map((i) => i.name);
}

async function createChildWithLogin(http, session, db, pin) {
  const uniquePin = pin || String(2000 + Math.floor(Math.random() * 7000)).replace(/1234|2345|3456/, '2580');
  const childId = await createChild(http.baseUrl, session, {
    name: `Ordning${Date.now().toString(36)}`,
    pin: uniquePin,
    birthday: '2018-06-01',
  });
  const row = await db.query('SELECT username FROM child WHERE id = $1', [childId]);
  const username = row.rows[0].username;
  const cl = await childLoginRaw(http.baseUrl, { username, pin: uniquePin });
  assert.equal(cl.status, 200, cl.text);
  return { childId, username, pin: uniquePin, childCookies: cl.cookies, childCsrf: cl.csrfToken };
}

async function insertDailyLogItems(db, childId, dateStr, rows) {
  await db.query('DELETE FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id = $1 AND date = $2)', [childId, dateStr]);
  await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
  const logRes = await db.query(
    `INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id`,
    [childId, dateStr]
  );
  const logId = logRes.rows[0].id;
  const ids = [];
  for (const row of rows) {
    const ins = await db.query(
      `INSERT INTO daily_log_item
         (daily_log_id, name, icon, star_value, sort_order, child_sort_order, section)
       VALUES ($1, $2, '⭐', 1, $3, $4, $5)
       RETURNING id`,
      [logId, row.name, row.sort_order, row.child_sort_order ?? null, row.section || 'morgon']
    );
    ids.push(ins.rows[0].id);
  }
  return { logId, ids };
}

async function morgonRowsDb(db, childId, dateStr) {
  const { rows } = await db.query(
    `SELECT dli.name, dli.sort_order, dli.child_sort_order
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dl.date = $2 AND dli.section = 'morgon'
     ORDER BY dli.sort_order, dli.name`,
    [childId, dateStr]
  );
  return rows;
}

const DATE = '2026-08-10';

test('P1 child daily-log order regression (A–H)', async (t) => {
  assertSafeIntegrationDatabase();
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await t.test('A — child API matches parent sort_order', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      const names = ['Borsta tänderna', 'Ta på kläder', 'Packa väskan'];
      await insertDailyLogItems(db, kid.childId, DATE, names.map((name, i) => ({
        name, sort_order: i, child_sort_order: null,
      })));
      const log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      assert.equal(log.status, 200, log.text);
      assert.deepEqual(morgonNamesInOrder(log.body), names);
    });

    await t.test('B — parent reorder updates child view', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'Borsta tänderna', sort_order: 0 },
        { name: 'Ta på kläder', sort_order: 1 },
        { name: 'Packa väskan', sort_order: 2 },
      ]);
      const reorderRes = await fetch(`${http.baseUrl}/api/daily-log-items/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ ordered_item_ids: [ids[2], ids[0], ids[1]] }),
      });
      assert.equal(reorderRes.status, 200, await reorderRes.text());
      const log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      assert.deepEqual(morgonNamesInOrder(log.body), [
        'Packa väskan', 'Borsta tänderna', 'Ta på kläder',
      ]);
    });

    await t.test('C — legacy child_sort_order=0 ties break on sort_order', async () => {
      const items = [
        { name: 'A', sort_order: 0, child_sort_order: 0, section: 'morgon' },
        { name: 'B', sort_order: 1, child_sort_order: 0, section: 'morgon' },
        { name: 'C', sort_order: 2, child_sort_order: 0, section: 'morgon' },
      ];
      const sorted = [...items].sort(compareChildDailyLogItems);
      assert.deepEqual(sorted.map((i) => i.name), ['A', 'B', 'C']);
    });

    await t.test('D — allow_child_reorder=false rejects child reorder', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await db.query('UPDATE child SET allow_child_reorder = false WHERE id = $1', [kid.childId]);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'One', sort_order: 0 },
        { name: 'Two', sort_order: 1 },
      ]);
      const reorderRes = await fetch(`${http.baseUrl}/api/me/daily-log/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(kid.childCookies),
          'X-CSRF-Token': kid.childCsrf,
        },
        body: JSON.stringify({ ordered_item_ids: [ids[1], ids[0]] }),
      });
      assert.equal(reorderRes.status, 403, await reorderRes.text());
    });

    await t.test('E — allow_child_reorder=true without saved child order', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await db.query('UPDATE child SET allow_child_reorder = true WHERE id = $1', [kid.childId]);
      await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'First', sort_order: 0, child_sort_order: null },
        { name: 'Second', sort_order: 1, child_sort_order: null },
        { name: 'Third', sort_order: 2, child_sort_order: null },
      ]);
      const log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      assert.deepEqual(morgonNamesInOrder(log.body), ['First', 'Second', 'Third']);
    });

    await t.test('F — explicit child reorder wins', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await db.query('UPDATE child SET allow_child_reorder = true WHERE id = $1', [kid.childId]);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'Alpha', sort_order: 0 },
        { name: 'Beta', sort_order: 1 },
        { name: 'Gamma', sort_order: 2 },
      ]);
      const reorderRes = await fetch(`${http.baseUrl}/api/me/daily-log/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(kid.childCookies),
          'X-CSRF-Token': kid.childCsrf,
        },
        body: JSON.stringify({ ordered_item_ids: [ids[2], ids[0], ids[1]] }),
      });
      assert.equal(reorderRes.status, 200, await reorderRes.text());
      const log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      assert.deepEqual(morgonNamesInOrder(log.body), ['Gamma', 'Alpha', 'Beta']);
    });

    await t.test('G — parent reorder after child reorder resets child order', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await db.query('UPDATE child SET allow_child_reorder = true WHERE id = $1', [kid.childId]);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'A', sort_order: 0 },
        { name: 'B', sort_order: 1 },
        { name: 'C', sort_order: 2 },
      ]);
      const childReorderRes = await fetch(`${http.baseUrl}/api/me/daily-log/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(kid.childCookies),
          'X-CSRF-Token': kid.childCsrf,
        },
        body: JSON.stringify({ ordered_item_ids: [ids[2], ids[1], ids[0]] }),
      });
      assert.equal(childReorderRes.status, 200, await childReorderRes.text());
      assert.deepEqual(
        (await morgonRowsDb(db, kid.childId, DATE)).map((row) => ({
          name: row.name,
          sort_order: row.sort_order,
          child_sort_order: row.child_sort_order,
        })),
        [
          { name: 'C', sort_order: 0, child_sort_order: 0 },
          { name: 'B', sort_order: 1, child_sort_order: 1 },
          { name: 'A', sort_order: 2, child_sort_order: 2 },
        ]
      );

      const parentRes = await fetch(`${http.baseUrl}/api/daily-log-items/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ ordered_item_ids: [ids[0], ids[2], ids[1]] }),
      });
      assert.equal(parentRes.status, 200, await parentRes.text());
      const afterParent = await morgonRowsDb(db, kid.childId, DATE);
      assert.ok(afterParent.every((row) => row.child_sort_order === null));
      assert.deepEqual(
        [...afterParent].sort((a, b) => a.sort_order - b.sort_order).map((r) => r.name),
        ['A', 'C', 'B']
      );
      const log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      assert.deepEqual(morgonNamesInOrder(log.body), ['A', 'C', 'B']);
    });

    await t.test('J — contract: duplicate ids rejected', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await db.query('UPDATE child SET allow_child_reorder = true WHERE id = $1', [kid.childId]);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'A', sort_order: 0 },
        { name: 'B', sort_order: 1 },
      ]);
      const res = await fetch(`${http.baseUrl}/api/me/daily-log/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(kid.childCookies),
          'X-CSRF-Token': kid.childCsrf,
        },
        body: JSON.stringify({ ordered_item_ids: [ids[0], ids[0]] }),
      });
      assert.equal(res.status, 400);
    });

    await t.test('K — contract: incomplete section list rejected', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'A', sort_order: 0 },
        { name: 'B', sort_order: 1 },
        { name: 'C', sort_order: 2 },
      ]);
      const res = await fetch(`${http.baseUrl}/api/daily-log-items/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ ordered_item_ids: [ids[0], ids[1]] }),
      });
      assert.equal(res.status, 400);
    });

    await t.test('L — contract: foreign log id rejected', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid1 = await createChildWithLogin(http, session, db);
      const kid2 = await createChildWithLogin(http, session, db);
      const a = await insertDailyLogItems(db, kid1.childId, DATE, [
        { name: 'A', sort_order: 0 },
        { name: 'B', sort_order: 1 },
      ]);
      const b = await insertDailyLogItems(db, kid2.childId, DATE, [
        { name: 'X', sort_order: 0 },
        { name: 'Y', sort_order: 1 },
      ]);
      const res = await fetch(`${http.baseUrl}/api/daily-log-items/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ ordered_item_ids: [a.ids[0], b.ids[0]] }),
      });
      assert.equal(res.status, 400);
    });

    await t.test('M — sequential reorders: parent then child then parent', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await db.query('UPDATE child SET allow_child_reorder = true WHERE id = $1', [kid.childId]);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'A', sort_order: 0 },
        { name: 'B', sort_order: 1 },
        { name: 'C', sort_order: 2 },
      ]);
      const parentHeaders = {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      };
      const childHeaders = {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(kid.childCookies),
        'X-CSRF-Token': kid.childCsrf,
      };
      let res = await fetch(`${http.baseUrl}/api/daily-log-items/reorder`, {
        method: 'PUT',
        headers: parentHeaders,
        body: JSON.stringify({ ordered_item_ids: [ids[0], ids[1], ids[2]] }),
      });
      assert.equal(res.status, 200, await res.text());
      res = await fetch(`${http.baseUrl}/api/me/daily-log/reorder`, {
        method: 'PUT',
        headers: childHeaders,
        body: JSON.stringify({ ordered_item_ids: [ids[2], ids[1], ids[0]] }),
      });
      assert.equal(res.status, 200, await res.text());
      let log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      assert.deepEqual(morgonNamesInOrder(log.body), ['C', 'B', 'A']);
      res = await fetch(`${http.baseUrl}/api/daily-log-items/reorder`, {
        method: 'PUT',
        headers: parentHeaders,
        body: JSON.stringify({ ordered_item_ids: [ids[1], ids[0], ids[2]] }),
      });
      assert.equal(res.status, 200, await res.text());
      log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      assert.deepEqual(morgonNamesInOrder(log.body), ['B', 'A', 'C']);
      const rows = await morgonRowsDb(db, kid.childId, DATE);
      assert.ok(rows.every((row) => row.child_sort_order === null));
    });

    await t.test('N — concurrent parent and child reorder completes without deadlock', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await db.query('UPDATE child SET allow_child_reorder = true WHERE id = $1', [kid.childId]);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'A', sort_order: 0 },
        { name: 'B', sort_order: 1 },
        { name: 'C', sort_order: 2 },
      ]);
      const parentHeaders = {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      };
      const childHeaders = {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(kid.childCookies),
        'X-CSRF-Token': kid.childCsrf,
      };
      const runs = [];
      for (let i = 0; i < 8; i++) {
        runs.push(
          Promise.all([
            fetch(`${http.baseUrl}/api/daily-log-items/reorder`, {
              method: 'PUT',
              headers: parentHeaders,
              body: JSON.stringify({ ordered_item_ids: [ids[2], ids[0], ids[1]] }),
            }),
            fetch(`${http.baseUrl}/api/me/daily-log/reorder`, {
              method: 'PUT',
              headers: childHeaders,
              body: JSON.stringify({ ordered_item_ids: [ids[1], ids[2], ids[0]] }),
            }),
          ])
        );
      }
      const settled = await Promise.all(runs);
      for (const pair of settled) {
        for (const res of pair) {
          const text = await res.text();
          assert.ok(
            res.status === 200 || res.status === 400,
            `unexpected status ${res.status}: ${text}`
          );
          assert.notEqual(res.status, 500, text);
        }
      }
      const log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      const names = morgonNamesInOrder(log.body);
      assert.equal(names.length, 3);
      assert.deepEqual([...names].sort(), ['A', 'B', 'C']);
    });

    await t.test('H — section order morgon before kvall', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'Kvällsakt', sort_order: 0, section: 'kvall' },
        { name: 'Morgonakt', sort_order: 0, section: 'morgon' },
      ]);
      const log = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      const names = itemNamesInOrder(log.body);
      assert.ok(names.indexOf('Morgonakt') < names.indexOf('Kvällsakt'));
    });

    await t.test('I — parent daily log matches child order after child reorder', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const kid = await createChildWithLogin(http, session, db);
      await db.query('UPDATE child SET allow_child_reorder = true WHERE id = $1', [kid.childId]);
      const { ids } = await insertDailyLogItems(db, kid.childId, DATE, [
        { name: 'One', sort_order: 0 },
        { name: 'Two', sort_order: 1 },
        { name: 'Three', sort_order: 2 },
      ]);
      const reorderRes = await fetch(`${http.baseUrl}/api/me/daily-log/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(kid.childCookies),
          'X-CSRF-Token': kid.childCsrf,
        },
        body: JSON.stringify({ ordered_item_ids: [ids[2], ids[0], ids[1]] }),
      });
      assert.equal(reorderRes.status, 200, await reorderRes.text());

      const childLog = await getDailyLog(http.baseUrl, kid.childCookies, kid.childCsrf, DATE);
      const expected = morgonNamesInOrder(childLog.body);

      const parentRes = await fetch(
        `${http.baseUrl}/api/children/${kid.childId}/daily-log?date=${DATE}`,
        { headers: { Cookie: cookieHeader(session.cookies) } }
      );
      const parentText = await parentRes.text();
      assert.equal(parentRes.status, 200, parentText);
      const parentBody = JSON.parse(parentText);
      assert.deepEqual(morgonNamesInOrder(parentBody), expected);
      assert.deepEqual(morgonNamesInOrder(parentBody), ['Three', 'One', 'Two']);

      const rows = await db.query(
        'SELECT sort_order, child_sort_order FROM daily_log_item WHERE daily_log_id = (SELECT id FROM daily_log WHERE child_id = $1 AND date = $2) ORDER BY sort_order',
        [kid.childId, DATE]
      );
      for (const row of rows.rows) {
        assert.equal(row.child_sort_order, row.sort_order);
      }
    });
  } finally {
    await http.close();
    await db.cleanup();
  }
});
