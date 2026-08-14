'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');

test('GET /api/admin/release-readiness returns 401 without auth', async () => {
  const mock = injectMockDb();
  const systemPath = require.resolve('../src/routes/admin/system');
  delete require.cache[systemPath];
  const systemRouter = require('../src/routes/admin/system');

  const app = express();
  app.use((req, res) => res.status(401).json({ error: 'Autentisering krävs' }));
  app.use('/api/admin', (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Autentisering krävs' });
    next();
  });
  app.use(systemRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/release-readiness`);
    assert.equal(res.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});

test('GET /api/admin/release-readiness returns 403 for non-admin parent', async () => {
  const mock = injectMockDb();
  const systemPath = require.resolve('../src/routes/admin/system');
  delete require.cache[systemPath];
  const systemRouter = require('../src/routes/admin/system');

  const app = express();
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'p1', isAdmin: false };
    next();
  });
  app.use((req, res, next) => {
    if (req.user.type !== 'parent' || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Förbjuden — kräver administratörsbehörighet' });
    }
    next();
  });
  app.use(systemRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/release-readiness`);
    assert.equal(res.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});

test('GET /api/admin/release-readiness returns effective kill-switch booleans for admin', async () => {
  const mock = injectMockDb();
  const prevAuthz = process.env.AUTHZ_HARDENING_ENABLED;
  const prevRate = process.env.RATE_LIMIT_ENABLED;
  process.env.AUTHZ_HARDENING_ENABLED = '';
  process.env.RATE_LIMIT_ENABLED = '';

  const systemPath = require.resolve('../src/routes/admin/system');
  delete require.cache[systemPath];
  const systemRouter = require('../src/routes/admin/system');

  const app = express();
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'admin-1', isAdmin: true };
    next();
  });
  app.use(systemRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/release-readiness`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.authzHardeningEnabled, true);
    assert.equal(body.rateLimitEnabled, true);
    assert.equal(body.activityTimerV2Disabled, false);
    assert.equal(body.activityTimerV2Available, true);
    assert.equal(
      Object.keys(body).sort().join(','),
      'activityTimerV2Available,activityTimerV2Disabled,authzHardeningEnabled,rateLimitEnabled'
    );
  } finally {
    process.env.AUTHZ_HARDENING_ENABLED = prevAuthz;
    process.env.RATE_LIMIT_ENABLED = prevRate;
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});

test('GET /api/admin/release-readiness reflects disabled kill switches', async () => {
  const mock = injectMockDb();
  const prevAuthz = process.env.AUTHZ_HARDENING_ENABLED;
  const prevRate = process.env.RATE_LIMIT_ENABLED;
  process.env.AUTHZ_HARDENING_ENABLED = 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';

  const systemPath = require.resolve('../src/routes/admin/system');
  delete require.cache[systemPath];
  const systemRouter = require('../src/routes/admin/system');

  const app = express();
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'admin-1', isAdmin: true };
    next();
  });
  app.use(systemRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/release-readiness`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.authzHardeningEnabled, false);
    assert.equal(body.rateLimitEnabled, false);
    assert.equal(typeof body.activityTimerV2Disabled, 'boolean');
    assert.equal(body.activityTimerV2Available, !body.activityTimerV2Disabled);
  } finally {
    process.env.AUTHZ_HARDENING_ENABLED = prevAuthz;
    process.env.RATE_LIMIT_ENABLED = prevRate;
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});

test('GET /api/admin/release-readiness reflects ACTIVITY_TIMER_V2_DISABLED kill switch', async () => {
  const mock = injectMockDb();
  const prev = process.env.ACTIVITY_TIMER_V2_DISABLED;
  process.env.ACTIVITY_TIMER_V2_DISABLED = 'true';

  const systemPath = require.resolve('../src/routes/admin/system');
  delete require.cache[systemPath];
  const rolloutPath = require.resolve('../src/lib/activity-timer-rollout');
  delete require.cache[rolloutPath];
  const systemRouter = require('../src/routes/admin/system');

  const app = express();
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'admin-1', isAdmin: true };
    next();
  });
  app.use(systemRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/release-readiness`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.activityTimerV2Disabled, true);
    assert.equal(body.activityTimerV2Available, false);
  } finally {
    process.env.ACTIVITY_TIMER_V2_DISABLED = prev;
    delete require.cache[rolloutPath];
    await new Promise((resolve) => server.close(resolve));
    mock.restore();
  }
});
