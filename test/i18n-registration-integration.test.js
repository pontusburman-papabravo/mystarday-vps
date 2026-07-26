'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail() {
  return `i18n-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

test('registers with en-GB and stores family.preferred_locale', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { loadLocales } = require('../src/lib/i18n');
  loadLocales();

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Parent',
        email,
        password: 'testpass123',
        preferred_locale: 'en-GB',
      }),
    });
    const text = await res.text();
    assert.equal(res.status, 201, text);
    const body = JSON.parse(text);
    assert.equal(body.preferred_locale, 'en-GB');

    const pg = require('../src/lib/db');
    const fam = await pg.query(
      `SELECT f.preferred_locale FROM family f
       JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].preferred_locale, 'en-GB');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('defaults to sv-SE when locale omitted at registration', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sven Förälder',
        email,
        password: 'testpass123',
      }),
    });
    assert.equal(res.status, 201, await res.text());

    const pg = require('../src/lib/db');
    const fam = await pg.query(
      `SELECT f.preferred_locale FROM family f
       JOIN parent p ON p.family_id = f.id WHERE p.email = $1`,
      [email.toLowerCase()]
    );
    assert.equal(fam.rows[0].preferred_locale, 'sv-SE');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('en-GB registration seeds English default activities', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Parent',
        email,
        password: 'testpass123',
        preferred_locale: 'en-GB',
      }),
    });
    assert.equal(res.status, 201, await res.text());

    const pg = require('../src/lib/db');
    const acts = await pg.query(
      `SELECT at.name, at.time_group FROM activity_template at
       JOIN parent p ON p.family_id = at.family_id
       WHERE p.email = $1
       ORDER BY at.sort_order ASC`,
      [email.toLowerCase()]
    );
    assert.ok(acts.rows.length > 0);
    const names = acts.rows.map((r) => r.name);
    const morning = acts.rows.filter((r) => r.time_group === 'morgon').map((r) => r.name);
    const afternoon = acts.rows.filter((r) => r.time_group === 'eftermiddag').map((r) => r.name);
    const evening = acts.rows.filter((r) => r.time_group === 'kvall').map((r) => r.name);
    assert.ok(names.some((n) => /Wake up|Brush teeth/i.test(n)), names.join(', '));
    assert.ok(!names.some((n) => /Vakna|Borsta tänder/i.test(n)), names.join(', '));
    assert.ok(
      morning.some((n) => /Wake up|Get dressed|Brush teeth|Pack school bag/i.test(n)),
      `morning seed: ${morning.join(', ')}`
    );
    assert.ok(
      afternoon.some((n) => /Snack|Play|Exercise|Homework/i.test(n)),
      `afternoon seed: ${afternoon.join(', ')}`
    );
    assert.ok(
      evening.some((n) => /Dinner|Sleep|Bedtime|Pyjamas/i.test(n)),
      `evening seed: ${evening.join(', ')}`
    );
  } finally {
    await http.close();
    await db.cleanup();
  }
});
