'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');

test('migration creates public_newsletter_subscriber table', () => {
  const mig = fs.readFileSync(
    path.join(__dirname, '../migrations/1808000000000_public_newsletter_subscriber.js'),
    'utf8'
  );
  assert.match(mig, /CREATE TABLE IF NOT EXISTS public_newsletter_subscriber/);
  assert.match(mig, /package_interests/);
  assert.match(mig, /unsubscribe_token/);
});

test('subscribePublic inserts new guest subscriber with package interest', async () => {
  const mock = injectMockDb();
  const calls = [];

  mock.setQuery(async (sql, params) => {
    calls.push({ sql: String(sql), params });
    if (String(sql).includes('SELECT id, package_interests FROM public_newsletter_subscriber')) {
      return { rows: [] };
    }
    if (String(sql).includes('INSERT INTO public_newsletter_subscriber')) {
      return {
        rows: [{ id: 'uuid-1', email: params[0], package_interests: params[2] }],
      };
    }
    return { rows: [] };
  });

  const { subscribePublic } = require('../db/public-newsletter');
  const result = await subscribePublic({
    email: 'Guest@Example.com',
    source: 'landing_preview',
    component: 'reporting',
  });

  assert.equal(result.isNew, true);
  assert.equal(result.row.email, 'guest@example.com');
  assert.deepEqual(result.row.package_interests, ['reporting']);
  assert.ok(calls.some((c) => c.sql.includes('INSERT INTO public_newsletter_subscriber')));

  delete require.cache[require.resolve('../db/public-newsletter')];
  mock.restore();
});

test('POST /api/public/newsletter-subscribe saves guest without auth', async () => {
  const mock = injectMockDb();
  const calls = [];

  mock.setQuery(async (sql, params) => {
    calls.push({ sql: String(sql), params });
    if (String(sql).includes('SELECT id, package_interests FROM public_newsletter_subscriber')) {
      return { rows: [] };
    }
    if (String(sql).includes('INSERT INTO public_newsletter_subscriber')) {
      return {
        rows: [{ id: 'uuid-2', email: params[0], package_interests: params[2] }],
      };
    }
    return { rows: [] };
  });

  const newsletterPath = require.resolve('../db/public-newsletter');
  delete require.cache[newsletterPath];
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
    const res = await fetch(`http://127.0.0.1:${port}/api/public/newsletter-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'besokare@example.com',
        component: 'total',
        source: 'landing',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.match(body.message, /paketet/i);
    assert.ok(calls.some((c) => c.sql.includes('INSERT INTO public_newsletter_subscriber')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    delete require.cache[newsletterPath];
    delete require.cache[publicPath];
    mock.restore();
  }
});

test('GET /api/public/preview-data returns mock packages without auth', async () => {
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
    const res = await fetch(`http://127.0.0.1:${port}/api/public/preview-data`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.reporting);
    assert.ok(body.pedagog);
    assert.ok(body.teacch);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
