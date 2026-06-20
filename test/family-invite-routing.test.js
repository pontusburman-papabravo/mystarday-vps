'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

function request(server, path, options = {}) {
  const port = server.address().port;
  return fetch(`http://127.0.0.1:${port}${path}`, options);
}

test('child-universe parentRouter passes unmatched /api/family paths without auth', async () => {
  const { parentRouter } = require('../src/routes/child-universe');
  const app = express();
  app.use('/api/family', parentRouter);
  app.use('/api/family', (_req, res) => res.json({ reached: true }));

  const server = await listen(app);
  try {
    const res = await request(server, '/api/family/invite/deadbeef');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { reached: true });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('family-hall parentRouter passes unmatched /api/family paths without auth', async () => {
  const { parentRouter } = require('../src/routes/family-hall');
  const app = express();
  app.use('/api/family', parentRouter);
  app.use('/api/family', (_req, res) => res.json({ reached: true }));

  const server = await listen(app);
  try {
    const res = await request(server, '/api/family/invite/deadbeef');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { reached: true });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /invite/:token redirects to accept-invite with token query', async () => {
  const { registerRoutes } = require('../src/routes/index');
  const app = express();
  registerRoutes(app);

  const server = await listen(app);
  try {
    const res = await request(server, '/invite/abc123token', { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/accept-invite?token=abc123token');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
