'use strict';

/**
 * Fas 2 regression tests — aha dedup, invariant #8 child-path-only, route gating.
 * Run: node --test test/activation-program-fas2.test.js
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ─── Mock DB + analytics before loading aha module ───────────────────────────

let analyticsExists = false;
const analyticsCalls = [];

const mockDb = {
  query: async (sql, params) => {
    if (sql.includes('FROM analytics_events')) {
      return { rows: analyticsExists ? [{ '?': 1 }] : [] };
    }
    if (sql.includes('timezone FROM family')) {
      return { rows: [{ timezone: 'Europe/Stockholm' }] };
    }
    if (sql.includes('parent_seen_completion')) {
      return { rows: [] };
    }
    return { rows: [] };
  },
};

const dbPath = require.resolve('../src/lib/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: mockDb,
  children: [],
  parent: null,
  paths: [],
};

const analyticsPath = require.resolve('../db/analytics');
require.cache[analyticsPath] = {
  id: analyticsPath,
  filename: analyticsPath,
  loaded: true,
  exports: {
    track: async (familyId, eventType, metadata) => {
      analyticsCalls.push({ familyId, eventType, metadata });
    },
  },
  children: [],
  parent: null,
  paths: [],
};

const ahaPath = require.resolve('../src/lib/activation-program-aha');
delete require.cache[ahaPath];
const {
  maybeTrackChildFirstCompletion,
  maybeTrackParentFirstCompletionSeen,
  CHILD_FIRST_COMPLETION,
  PARENT_FIRST_COMPLETION_SEEN,
} = require('../src/lib/activation-program-aha');

const { isActivationProgramEnabled } = require('../src/lib/activation-program-enroll');
const { shouldShowBanner } = require('../src/lib/activation-program');

const program = {
  id: 'prog-1',
  started_at: '2026-06-01T08:00:00.000Z',
  program_type: 'onboarding_7d',
  status: 'active',
  cohort_arm: 'treatment',
};

beforeEach(() => {
  analyticsExists = false;
  analyticsCalls.length = 0;
});

describe('Fas 2 — child_first_completion dedup (invariant #8/#9)', () => {
  it('emits child_first_completion once per program run', async () => {
    const payload = {
      familyId: 'fam-1',
      program,
      childId: 'child-1',
      dailyLogItemId: 'item-1',
      activityName: 'Borsta tänderna',
      timezone: 'Europe/Stockholm',
    };

    const first = await maybeTrackChildFirstCompletion(payload);
    assert.equal(first, true);
    assert.equal(analyticsCalls.length, 1);
    assert.equal(analyticsCalls[0].eventType, CHILD_FIRST_COMPLETION);
    assert.equal(analyticsCalls[0].metadata.program_id, 'prog-1');

    analyticsExists = true;
    const second = await maybeTrackChildFirstCompletion(payload);
    assert.equal(second, false);
    assert.equal(analyticsCalls.length, 1);
  });

  it('skips when familyId or program is missing', async () => {
    assert.equal(await maybeTrackChildFirstCompletion({ program }), false);
    assert.equal(await maybeTrackChildFirstCompletion({ familyId: 'fam-1' }), false);
    assert.equal(analyticsCalls.length, 0);
  });
});

describe('Fas 2 — parent_first_completion_seen dedup (invariant #9)', () => {
  it('emits parent_first_completion_seen once per program run', async () => {
    const payload = {
      familyId: 'fam-1',
      program,
      childId: 'child-1',
      dailyLogItemId: 'item-1',
      activityName: 'Borsta tänderna',
      completedAt: new Date('2026-06-01T10:00:00.000Z'),
      timezone: 'Europe/Stockholm',
    };

    const first = await maybeTrackParentFirstCompletionSeen(payload);
    assert.equal(first, true);
    assert.equal(analyticsCalls.length, 1);
    assert.equal(analyticsCalls[0].eventType, PARENT_FIRST_COMPLETION_SEEN);
    assert.ok(typeof analyticsCalls[0].metadata.hours_since_completion === 'number');

    analyticsExists = true;
    const second = await maybeTrackParentFirstCompletionSeen(payload);
    assert.equal(second, false);
    assert.equal(analyticsCalls.length, 1);
  });
});

describe('Fas 2 — treatment gating (invariants #4/#6)', () => {
  it('shouldShowBanner rejects control arm', () => {
    assert.equal(shouldShowBanner({ ...program, cohort_arm: 'control' }), false);
    assert.equal(shouldShowBanner(program), true);
  });

  it('feature flag defaults to disabled', () => {
    const prev = process.env.ACTIVATION_PROGRAM_ENABLED;
    delete process.env.ACTIVATION_PROGRAM_ENABLED;
    assert.equal(isActivationProgramEnabled(), false);
    process.env.ACTIVATION_PROGRAM_ENABLED = 'true';
    assert.equal(isActivationProgramEnabled(), true);
    if (prev === undefined) delete process.env.ACTIVATION_PROGRAM_ENABLED;
    else process.env.ACTIVATION_PROGRAM_ENABLED = prev;
  });
});

describe('Fas 2 — child path only for child_first_completion (invariant #8)', () => {
  it('hooks child_first_completion only on child self complete route', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/daily-logs.js'),
      'utf8'
    );

    const childHookIdx = src.indexOf('child_first_completion');
    assert.ok(childHookIdx > -1, 'child_first_completion hook should exist');

    const childRouterIdx = src.indexOf('childSelfRouter.put(\'/daily-log-items/:itemId/complete\'');
    const parentRouterIdx = src.indexOf("itemRouter.put('/:itemId/complete'");

    assert.ok(childRouterIdx > -1 && parentRouterIdx > -1);
    assert.ok(
      childHookIdx > childRouterIdx,
      'hook should be inside child self complete handler'
    );

    const parentBlock = src.slice(parentRouterIdx, childRouterIdx);
    assert.equal(
      parentBlock.includes('child_first_completion'),
      false,
      'parent complete path must not emit child_first_completion'
    );
  });
});

describe('Fas 2 — dashboard assets', () => {
  it('includes modal markup and aha-card script', () => {
    const html = fs.readFileSync(
      path.join(__dirname, '../public/dashboard.html'),
      'utf8'
    );
    assert.ok(html.includes('id="activationAhaModal"'));
    assert.ok(html.includes('id="activationAhaDismissBtn"'));
    assert.ok(html.includes('Utan att du behövde påminna.'));
    assert.ok(html.includes('/js/activation-program-aha-card.js'));
  });

  it('aha-card script listens for SSE completion events', () => {
    const js = fs.readFileSync(
      path.join(__dirname, '../public/js/activation-program-aha-card.js'),
      'utf8'
    );
    assert.ok(js.includes('sse:DAILY_LOG_ITEM_COMPLETED'));
    assert.ok(js.includes('/api/me/activation-program/new-completions'));
    assert.ok(js.includes('/api/me/activation-program/aha-dismiss'));
  });
});
