'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');

test('migration adds waitlist country_code column', () => {
  const mig = fs.readFileSync(
    path.join(__dirname, '../migrations/1810000000010_waitlist_country.js'),
    'utf8'
  );
  assert.match(mig, /country_code CHAR\(2\)/);
  assert.match(mig, /idx_waitlist_country_code/);
});

test('WAITLIST_COUNTRIES excludes US for EU launch focus', () => {
  const { WAITLIST_COUNTRIES, REGISTRATION_COUNTRIES } = require('../config/market-countries');
  const waitlistCodes = WAITLIST_COUNTRIES.map((c) => c.code);
  assert.ok(waitlistCodes.includes('SE'));
  assert.ok(waitlistCodes.includes('GB'));
  assert.ok(waitlistCodes.includes('ZZ'));
  assert.ok(!waitlistCodes.includes('US'));
  assert.ok(REGISTRATION_COUNTRIES.some((c) => c.code === 'US'));
});

test('GET /api/waitlist/countries returns EU-focused list', async () => {
  const publicPath = require.resolve('../src/routes/public');
  delete require.cache[publicPath];
  const publicRouter = require('../src/routes/public');

  const app = express();
  app.use('/api', publicRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/waitlist/countries`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.countries));
    assert.ok(body.countries.length >= 20);
    assert.ok(body.countries.some((c) => c.code === 'SE' && c.label === 'Sweden'));
    assert.ok(!body.countries.some((c) => c.code === 'US'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/waitlist/survey stores optional country_code', async () => {
  const mock = injectMockDb();
  let capturedParams = null;

  mock.setQuery(async (sql, params) => {
    if (String(sql).includes('UPDATE waitlist')) {
      capturedParams = params;
      return { rowCount: 1, rows: [{ id: 1 }] };
    }
    return { rows: [], rowCount: 0 };
  });

  const waitlistDbPath = require.resolve('../db/waitlist');
  delete require.cache[waitlistDbPath];
  const publicPath = require.resolve('../src/routes/public');
  delete require.cache[publicPath];
  const publicRouter = require('../src/routes/public');

  const app = express();
  app.use(express.json());
  app.use('/api', publicRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/waitlist/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        pain_points: ['morning_routines'],
        current_method: 'paper',
        country_code: 'DE',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(capturedParams);
    assert.equal(capturedParams[4], 'DE');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});

test('POST /api/waitlist/survey rejects invalid country_code', async () => {
  const mock = injectMockDb();
  mock.setQuery(async () => ({ rows: [], rowCount: 0 }));

  const waitlistDbPath = require.resolve('../db/waitlist');
  delete require.cache[waitlistDbPath];
  const publicPath = require.resolve('../src/routes/public');
  delete require.cache[publicPath];
  const publicRouter = require('../src/routes/public');

  const app = express();
  app.use(express.json());
  app.use('/api', publicRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/waitlist/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        pain_points: ['bedtime'],
        current_method: 'verbal',
        country_code: 'US',
      }),
    });
    assert.equal(res.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});
