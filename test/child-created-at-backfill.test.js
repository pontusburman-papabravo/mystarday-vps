'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('child_created_at backfill migration', () => {
  it('adds column and backfills from MIN(child.created_at) when missing', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1809160000000_family_activation_state_child_created_at.js'),
      'utf8'
    );
    assert.match(src, /ADD COLUMN IF NOT EXISTS child_created_at TIMESTAMPTZ/);
    assert.match(src, /child_created_at IS NULL/);
    assert.match(src, /MIN\(c\.created_at\)/);
    assert.match(src, /ON CONFLICT \(family_id\) DO NOTHING/);
  });

  it('defines down() to drop child_created_at', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1809160000000_family_activation_state_child_created_at.js'),
      'utf8'
    );
    assert.match(src, /down:\s*async/);
    assert.match(src, /DROP COLUMN IF EXISTS child_created_at/);
  });
});

describe('activation-p0 child_created milestone', () => {
  it('maps child_created milestone to child_created_at column', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/activation-p0.js'), 'utf8');
    assert.match(src, /child_created: 'child_created_at'/);
  });

  it('onboarding sets child_created via updateActivationState after child insert', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/onboarding.js'), 'utf8');
    assert.match(src, /updateActivationState\(req\.user\.familyId, 'child_created'/);
    assert.match(src, /at: child\.created_at/);
  });
});

describe('family-activation-state child_created_at column', () => {
  it('selects and returns child_created_at', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/family-activation-state.js'), 'utf8');
    assert.match(src, /child_created_at/);
  });
});

describe('child_created_at idempotency (DB)', () => {
  it('updateActivationState only sets child_created_at once', async (t) => {
    const { setupTestDb } = require('./helpers/setup.js');
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { randomUUID } = require('crypto');
    const familyId = randomUUID();
    const childCreatedAt = new Date('2026-06-15T08:00:00.000Z');

    try {
      await db.query(
        `INSERT INTO family (id, name, timezone) VALUES ($1, 'Testfam', 'Europe/Stockholm')`,
        [familyId]
      );
      await db.query(
        `INSERT INTO family_activation_state (family_id, signup_at, activation_variant)
         VALUES ($1, $2, 'template_only')`,
        [familyId, new Date('2026-06-15T07:00:00.000Z')]
      );

      const { updateActivationState } = require('../src/lib/activation-p0');
      const first = await updateActivationState(familyId, 'child_created', { at: childCreatedAt });
      const second = await updateActivationState(familyId, 'child_created', {
        at: new Date('2026-06-16T08:00:00.000Z'),
      });

      assert.equal(new Date(first.child_created_at).toISOString(), childCreatedAt.toISOString());
      assert.equal(new Date(second.child_created_at).toISOString(), childCreatedAt.toISOString());

      const row = await db.query(
        'SELECT child_created_at FROM family_activation_state WHERE family_id = $1',
        [familyId]
      );
      assert.equal(new Date(row.rows[0].child_created_at).toISOString(), childCreatedAt.toISOString());
    } finally {
      await db.cleanup();
    }
  });
});
