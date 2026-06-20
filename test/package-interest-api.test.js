'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const express = require('express');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'REDACTED/mock_test';

let queryStack = [];
let appConfigValue = 'off';

function pushRows(rows) {
  queryStack.push({ rows });
}

const mockDb = {
  query: async () => {
    const entry = queryStack.shift();
    return entry || { rows: [] };
  },
  getClient: async () => { throw new Error('getClient not mocked'); },
  pool: {},
};

const dbPath = require.resolve(path.join(__dirname, '../src/lib/db'));
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: mockDb, children: [], parent: null, paths: [],
};

const appConfigPath = require.resolve(path.join(__dirname, '../db/app-config'));
require.cache[appConfigPath] = {
  id: appConfigPath, filename: appConfigPath, loaded: true,
  exports: {
    get: async (key) => (key === 'PACKAGES_ROLLOUT_MODE' ? appConfigValue : null),
    set: async () => ({}),
    getAll: async () => [],
  },
  children: [], parent: null, paths: [],
};

function loadSubscriptionRouter() {
  const authPath = require.resolve(path.join(__dirname, '../src/middleware/auth'));
  require.cache[authPath] = {
    id: authPath, filename: authPath, loaded: true,
    exports: {
      requireAuth: (req, _res, next) => next(),
      requireParent: (req, _res, next) => next(),
    },
    children: [], parent: null, paths: [],
  };

  const modPath = path.join(__dirname, '../src/routes/subscription');
  delete require.cache[require.resolve(modPath)];
  delete require.cache[require.resolve(path.join(__dirname, '../db/family-subscriptions'))];
  delete require.cache[require.resolve(path.join(__dirname, '../db/package-interest'))];
  delete require.cache[require.resolve(path.join(__dirname, '../db/features'))];
  delete require.cache[require.resolve(path.join(__dirname, '../src/lib/package-access'))];
  delete require.cache[require.resolve(path.join(__dirname, '../db/analytics'))];
  return require(modPath);
}

function mockFamilyAccessQueries(rolloutMode) {
  const mockQueryFn = async (sql) => {
    const q = String(sql);
    if (q.includes('FROM family_subscriptions')) {
      return {
        rows: [{
          family_id: 'fam-1',
          tier: 'lifetime_free',
          components: [{ component: 'basic_app', state: 'active' }],
        }],
      };
    }
    if (q.includes('professional_share_link') || q.includes('pedagog_notes')) {
      return { rows: [{ reporting: 0, pedagog: 0, teacch: 0 }] };
    }
    if (q.includes('FROM package_interest') && q.includes('SELECT component')) {
      return { rows: [] };
    }
    if (q.includes('FROM features')) {
      return { rows: [] };
    }
    if (q.includes('FROM family_features')) {
      return { rows: [] };
    }
    if (q.includes('INSERT INTO package_interest')) {
      return {
        rows: [{
          id: 'pi-1',
          family_id: 'fam-1',
          parent_id: 'parent-1',
          component: 'reporting',
          source: 'bottom_nav_preview',
        }],
      };
    }
    if (q.includes('SELECT id FROM package_interest')) {
      return { rows: [] };
    }
    if (q.includes('INSERT INTO analytics_events')) {
      return { rows: [] };
    }
    return { rows: [] };
  };

  mockDb.query = mockQueryFn;
  appConfigValue = rolloutMode;
}

beforeEach(() => {
  queryStack = [];
  appConfigValue = 'off';
  mockDb.query = async () => {
    const entry = queryStack.shift();
    return entry || { rows: [] };
  };
});

test('POST /interest returns 400 when rollout is not interest', async () => {
  mockFamilyAccessQueries('off');

  const router = loadSubscriptionRouter();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'parent-1', familyId: 'fam-1' };
    next();
  });
  app.use(router);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component: 'reporting', source: 'bottom_nav_preview' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'INTEREST_NOT_ENABLED');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /interest registers row when rollout is interest', async () => {
  mockFamilyAccessQueries('interest');

  const router = loadSubscriptionRouter();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { type: 'parent', id: 'parent-1', familyId: 'fam-1' };
    next();
  });
  app.use(router);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component: 'reporting', source: 'bottom_nav_preview' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.match(body.message, /noterat ditt intresse/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
