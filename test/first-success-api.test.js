'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');
const { ProductEngine, normalizeFamilyFacts, serializeEngineOutput } = require('../src/core-engine');

const ROUTE_FILE = path.join(__dirname, '../src/routes/family/first-success.js');

describe('GET /api/family/first-success — route contract', () => {
  it('is a thin pass-through (no business if-satser)', () => {
    const src = fs.readFileSync(ROUTE_FILE, 'utf8');
    assert.match(src, /collectFamilyFacts/);
    assert.match(src, /ProductEngine\.evaluate/);
    assert.match(src, /serializeEngineOutput/);
    assert.match(src, /queueEngineTrace/);
    assert.doesNotMatch(src, /recommendedAction/);
    assert.doesNotMatch(src, /ADD_EVENING/);
    assert.doesNotMatch(src, /NEEDS_/);
  });

  it('serialize is JSON-only (no remapping)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/core-engine/serialize.js'), 'utf8');
    assert.doesNotMatch(src, /switch\s*\(/);
    assert.doesNotMatch(src, /if\s*\(.*Need/i);
  });
});

describe('serializeEngineOutput', () => {
  it('round-trips Engine output with ISO timestamps', () => {
    const facts = normalizeFamilyFacts({
      familyId: 'fam-api-001',
      signupAt: '2026-06-01T10:00:00.000Z',
      childrenIds: ['c1'],
      totalCompletions: 1,
      firstCompletionAt: '2026-06-01T10:05:00.000Z',
      lastCompletionAt: '2026-06-01T10:05:00.000Z',
      hasSeenChildView: true,
      hasRoutine: true,
      hasEveningRoutine: false,
      currentStreakDays: 1,
      rewardsClaimedCount: 0,
    });
    const output = ProductEngine.evaluate(facts, {
      activePolicySet: 'v2_first_success_control',
      currentDeviceTime: new Date('2026-06-02T18:00:00.000Z'),
    });
    const json = serializeEngineOutput(output);

    assert.equal(typeof json.timestamp, 'string');
    assert.equal(json.trace.coreState, 'FIRST_ACTIVITY');
    assert.equal(json.trace.evaluatedNeed, 'NEEDS_CONSISTENCY');
    assert.equal(json.policy.name, 'ADD_EVENING');
    assert.equal(typeof json.policy.validityWindow.expiresAt, 'string');
    assert.ok(Array.isArray(json.trace.rulesTriggered));
  });
});

test('GET /api/family/first-success returns serialized Engine output', async () => {
  const mock = injectMockDb();
  const familyId = '11111111-1111-4111-8111-111111111111';

  mock.setQuery(async (sql) => {
    const q = String(sql);
    if (q.includes('feature_flag') && q.includes('first_success_engine_api')) {
      return { rows: [{ enabled: true }] };
    }
    return { rows: [] };
  });

  const collectorPath = require.resolve('../src/core-engine/1-facts/collector');
  const routePath = require.resolve('../src/routes/family/first-success');
  const originalCollector = require(collectorPath);

  require.cache[collectorPath] = {
    id: collectorPath,
    filename: collectorPath,
    loaded: true,
    exports: {
      ...originalCollector,
      collectFamilyFacts: async () => normalizeFamilyFacts({
        familyId,
        signupAt: new Date().toISOString(),
        childrenIds: ['child-1'],
        totalCompletions: 0,
        firstCompletionAt: null,
        lastCompletionAt: null,
        hasSeenChildView: false,
        hasRoutine: true,
        hasEveningRoutine: false,
        currentStreakDays: 0,
        rewardsClaimedCount: 0,
      }),
    },
  };
  delete require.cache[routePath];

  const tracePath = require.resolve('../src/lib/engine-trace-queue');
  delete require.cache[tracePath];
  const flagPath = require.resolve('../src/lib/first-success-engine-flag');
  delete require.cache[flagPath];

  const router = require('../src/routes/family/first-success');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'parent-1', familyId, family_role: 'primary' };
    next();
  });
  app.use('/api/family', router);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const res = await fetch(`${base}/api/family/first-success`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.trace.coreState, 'ROUTINE_READY');
    assert.equal(body.trace.evaluatedNeed, 'NEEDS_CLARITY');
    assert.equal(body.policy.name, 'SHOW_CHILD');
    assert.equal(typeof body.timestamp, 'string');
  } finally {
    await new Promise((r) => server.close(r));
    delete require.cache[routePath];
    delete require.cache[collectorPath];
    require.cache[collectorPath] = {
      id: collectorPath,
      filename: collectorPath,
      loaded: true,
      exports: originalCollector,
    };
  }
});

test('GET /api/family/first-success returns 503 when engine kill switch is off', async () => {
  const prev = process.env.FIRST_SUCCESS_ENGINE_API;
  process.env.FIRST_SUCCESS_ENGINE_API = 'false';

  const routePath = require.resolve('../src/routes/family/first-success');
  const flagPath = require.resolve('../src/lib/first-success-engine-flag');
  delete require.cache[flagPath];
  delete require.cache[routePath];

  const router = require('../src/routes/family/first-success');
  const app = express();
  app.use((req, _res, next) => {
    req.user = { id: 'p1', familyId: '22222222-2222-4222-8222-222222222222' };
    next();
  });
  app.use('/api/family', router);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/family/first-success`);
    const body = await res.json();
    assert.equal(res.status, 503);
    assert.equal(body.error, 'engine_disabled');
    assert.equal(body.legacyEndpoint, '/api/family/readiness');
  } finally {
    process.env.FIRST_SUCCESS_ENGINE_API = prev;
    await new Promise((r) => server.close(r));
  }
});
