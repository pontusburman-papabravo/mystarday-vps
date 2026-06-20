'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('admin default-schedules list query uses updated_at (not missing created_at)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../src/routes/admin/schedule.js'),
    'utf8'
  );
  assert.match(src, /FROM default_schedule ds[\s\S]*ds\.updated_at/);
  assert.doesNotMatch(src, /FROM default_schedule ds[\s\S]*ds\.created_at/);
});

test('GET /api/admin/default-schedules returns schedules from mock DB', async () => {
  const { injectMockDb } = require('./helpers/setup.js');
  const mock = injectMockDb();

  mock.setQuery(async (sql) => {
    if (String(sql).includes('FROM default_schedule ds')) {
      return {
        rows: [{
          id: 'sch-1',
          name: 'Morgonrutin',
          description: 'Test',
          icon: '☀️',
          sort_order: 0,
          updated_at: '2026-06-20T08:00:00Z',
          item_count: '3',
        }],
      };
    }
    return { rows: [] };
  });

  const schedulePath = require.resolve('../src/routes/admin/schedule');
  delete require.cache[schedulePath];
  const scheduleRouter = require('../src/routes/admin/schedule');

  const express = require('express');
  const app = express();
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'admin-1', isAdmin: true, familyId: 'fam-1' };
    next();
  });
  app.use(scheduleRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/default-schedules`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.length, 1);
    assert.equal(body[0].name, 'Morgonrutin');
    assert.equal(body[0].item_count, '3');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});
