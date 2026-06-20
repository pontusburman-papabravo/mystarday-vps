'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { injectMockDb } = require('./helpers/setup.js');

test('migration creates professional_interest table', () => {
  const mig = fs.readFileSync(
    path.join(__dirname, '../migrations/1807200000000_professional_interest.js'),
    'utf8'
  );
  assert.match(mig, /CREATE TABLE IF NOT EXISTS professional_interest/);
  assert.match(mig, /gdpr_consent/);
});

test('POST /api/public/professional-interest saves submission without auth', async () => {
  const mock = injectMockDb();
  const inserted = [];

  mock.setQuery(async (sql, params) => {
    if (String(sql).includes('INSERT INTO professional_interest')) {
      inserted.push(params);
      return {
        rows: [{
          id: 1,
          name: params[0],
          email: params[1],
          role: params[2],
          organization: params[3],
          created_at: new Date().toISOString(),
        }],
      };
    }
    return { rows: [] };
  });

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
    const res = await fetch(`http://127.0.0.1:${port}/api/public/professional-interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anna Test',
        email: 'anna@example.com',
        role: 'Specialpedagog',
        organization: 'Testskola',
        message: 'Vill veta mer om verktyget.',
        gdprConsent: true,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(inserted.length, 1);
    assert.deepEqual(inserted[0].slice(0, 4), [
      'Anna Test',
      'anna@example.com',
      'Specialpedagog',
      'Testskola',
    ]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});
