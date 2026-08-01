'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const {
  uniqueEmail,
  registerRaw,
  loginRaw,
  countFamiliesForEmail,
  countParentsForEmail,
  DEFAULT_PASSWORD,
} = require('./helpers/golden-path-fas6.js');

test('Fas6 A — concurrent duplicate register: one family, loser 409, login works', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const base = uniqueEmail('dup-reg');
  const mixedCase = base.replace('@', '@').toUpperCase().replace(base.split('@')[0], base.split('@')[0].toUpperCase());

  try {
    const [a, b] = await Promise.all([
      registerRaw(http.baseUrl, { email: base, name: 'Dup A' }),
      registerRaw(http.baseUrl, { email: mixedCase, name: 'Dup B' }),
    ]);

    const statuses = [a.status, b.status].sort((x, y) => x - y);
    assert.ok(statuses[0] === 201, `winner must be 201, got ${a.status}/${b.status}`);
    assert.equal(statuses[1], 409, `concurrent loser should be 409 after race fix; got ${statuses[1]}`);

    const winner = a.status === 201 ? a : b;
    const loser = a.status === 409 ? a : b;
    assert.equal(loser.body?.error !== undefined || loser.text.length > 0, true);

    assert.equal(await countFamiliesForEmail(db, base), 1);
    assert.equal(await countParentsForEmail(db, base), 1);

    const login = await loginRaw(http.baseUrl, { email: base, password: DEFAULT_PASSWORD });
    assert.equal(login.status, 200);
    assert.ok(login.body?.csrfToken);

    const orphanFamilies = await db.query(
      `SELECT f.id FROM family f
       JOIN parent p ON p.family_id = f.id
       WHERE LOWER(p.email) = $1`,
      [base.toLowerCase()]
    );
    assert.equal(orphanFamilies.rows.length, 1);

    assert.equal(winner.status, 201);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas6 A — rapid sequential duplicate register: stable 409', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const email = uniqueEmail('dup-seq');

  try {
    const first = await registerRaw(http.baseUrl, { email });
    assert.equal(first.status, 201);
    const second = await registerRaw(http.baseUrl, { email });
    assert.equal(second.status, 409);
    assert.equal(await countFamiliesForEmail(db, email), 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
