'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');

test('migration adds waitlist survey columns', () => {
  const mig = fs.readFileSync(
    path.join(__dirname, '../migrations/1807300000000_waitlist_survey.js'),
    'utf8'
  );
  assert.match(mig, /pain_points TEXT\[\]/);
  assert.match(mig, /survey_completed_at TIMESTAMPTZ/);
  assert.match(mig, /survey_skipped_at TIMESTAMPTZ/);
});

test('GET /api/admin/waitlist returns entries from mock DB', async () => {
  const mock = injectMockDb();

  mock.setQuery(async (sql) => {
    if (String(sql).includes('COUNT(*)') && String(sql).includes('FROM waitlist')) {
      return { rows: [{ total: '1' }] };
    }
    if (String(sql).includes('FROM waitlist') && String(sql).includes('survey_status')) {
      return {
        rows: [{
          id: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          created_at: '2026-06-20T10:00:00Z',
          pain_points: ['morning_routines'],
          pain_points_other: null,
          current_method: 'paper',
          survey_completed_at: '2026-06-20T10:05:00Z',
          survey_skipped_at: null,
          survey_status: 'completed',
        }],
      };
    }
    return { rows: [] };
  });

  const waitlistPath = require.resolve('../src/routes/admin/waitlist');
  delete require.cache[waitlistPath];
  const waitlistRouter = require('../src/routes/admin/waitlist');

  const app = express();
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'admin-1', isAdmin: true };
    next();
  });
  app.use(waitlistRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/waitlist?limit=50&offset=0`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 1);
    assert.equal(body.entries.length, 1);
    assert.equal(body.entries[0].survey_status, 'completed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});
