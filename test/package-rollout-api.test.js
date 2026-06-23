'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const express = require('express');
const http = require('http');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mock/mock';

const store = new Map();

const mockDb = {
  query: async (sql, params = []) => {
    const text = String(sql);
    if (text.includes('CREATE TABLE IF NOT EXISTS app_config')) {
      return { rows: [] };
    }
    if (text.includes('INSERT INTO app_config')) {
      const [key, value, description, updatedBy] = params;
      const row = {
        key,
        value,
        description,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      };
      store.set(key, row);
      return { rows: [row] };
    }
    if (text.includes('SELECT') && text.includes('FROM app_config WHERE key')) {
      const row = store.get(params[0]);
      return { rows: row ? [row] : [] };
    }
    if (text.includes('INSERT INTO admin_audit_log')) {
      return { rows: [{ id: 'audit-1' }] };
    }
    return { rows: [] };
  },
};

const dbPath = require.resolve(path.join(__dirname, '../src/lib/db'));
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: mockDb, children: [], parent: null, paths: [],
};

function loadRouters() {
  const appConfigPath = require.resolve(path.join(__dirname, '../db/app-config'));
  delete require.cache[appConfigPath];

  const rolloutPath = require.resolve(path.join(__dirname, '../src/routes/admin/package-rollout'));
  delete require.cache[rolloutPath];

  const subPath = require.resolve(path.join(__dirname, '../src/routes/admin/subscription-settings'));
  delete require.cache[subPath];

  const addonsPath = require.resolve(path.join(__dirname, '../db/subscription-addons'));
  require.cache[addonsPath] = {
    id: addonsPath, filename: addonsPath, loaded: true,
    exports: { getAllAddons: async () => ({ rows: [] }) },
    children: [], parent: null, paths: [],
  };

  const settingsPath = require.resolve(path.join(__dirname, '../db/app-settings'));
  require.cache[settingsPath] = {
    id: settingsPath, filename: settingsPath, loaded: true,
    exports: {
      getPaymentEnabled: async () => false,
      getBasicPrice: async () => 59,
      getBasicTrialDays: async () => 14,
      getFounderFamilyLimit: async () => 200,
    },
    children: [], parent: null, paths: [],
  };

  return {
    rolloutRouter: require('../src/routes/admin/package-rollout'),
    subscriptionRouter: require('../src/routes/admin/subscription-settings'),
  };
}

async function withServer(routers, fn) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'admin-uuid-1', type: 'parent' };
    next();
  });
  app.use('/api/admin/package-rollout', routers.rolloutRouter);
  app.use('/api/admin/subscription-settings', routers.subscriptionRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    await fn(port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

beforeEach(() => {
  store.clear();
});

test('PUT then GET rollout persists interest mode', async () => {
  const routers = loadRouters();
  await withServer(routers, async (port) => {
    const put = await fetch(`http://127.0.0.1:${port}/api/admin/package-rollout/rollout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'interest' }),
    });
    assert.equal(put.status, 200);
    const putBody = await put.json();
    assert.equal(putBody.rollout_mode, 'interest');

    const get = await fetch(`http://127.0.0.1:${port}/api/admin/package-rollout/rollout`);
    assert.equal(get.status, 200);
    const getBody = await get.json();
    assert.equal(getBody.rollout_mode, 'interest');
  });
});

test('subscription-settings GET includes persisted rollout', async () => {
  store.set('PACKAGES_ROLLOUT_MODE', {
    key: 'PACKAGES_ROLLOUT_MODE',
    value: 'interest',
    description: 'test',
    updated_at: '2026-06-20T12:00:00.000Z',
    updated_by: null,
  });

  const routers = loadRouters();
  await withServer(routers, async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/subscription-settings`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.rollout_mode, 'interest');
    assert.equal(body.rollout.rollout_mode, 'interest');
    assert.equal(body.rollout.interest_cta_enabled, true);
  });
});
