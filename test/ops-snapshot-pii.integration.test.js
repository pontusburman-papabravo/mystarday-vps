'use strict';

/**
 * Snapshot must not leak synthetic PII placed in the database.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { acquireDbTestLock } = require('./helpers/db-test-lock.js');
const { isMockDatabaseUrl } = require('./helpers/migration-gate.js');

const SYNTH_EMAIL = 'ops-pii-leak-test+827@example.invalid';
const SYNTH_NAME = 'OpsPiiLeakTestName827';
const SYNTH_PASSWORD_HASH = '$2b$10$opsPiiLeakTestPasswordHash827xxxxxxxxxxxxxxxxxx';
const SYNTH_PIN_HASH = 'sha256:opsPiiLeakPinHash827deadbeef';

const LEAK_PATTERNS = [
  SYNTH_EMAIL,
  SYNTH_NAME,
  SYNTH_PASSWORD_HASH,
  SYNTH_PIN_HASH,
  'webhookpayload827',
  'https://cdn.example.invalid/child-photo-827.jpg',
];

describe('ops snapshot PII leakage', () => {
  test('integrity snapshot JSON excludes synthetic sensitive values', async (t) => {
    const baseUrl = process.env.DATABASE_URL;
    if (isMockDatabaseUrl(baseUrl)) {
      t.skip('DATABASE_URL not set');
      return;
    }
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      t.skip('localhost only');
      return;
    }

    const releaseLock = await acquireDbTestLock();
    const dbName = `integrity_restore_pii_${Date.now()}`;
    const admin = new URL(baseUrl);
    admin.pathname = '/postgres';
    const { Pool } = require('pg');
    const adminPool = new Pool({ connectionString: admin.toString(), ssl: false });
    const client = await adminPool.connect();
    try {
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName]
      );
      await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      await client.query(`CREATE DATABASE "${dbName}"`);
    } finally {
      client.release();
      await adminPool.end();
    }

    const dbUrl = new URL(baseUrl);
    dbUrl.pathname = `/${dbName}`;

    try {
      execSync('npm run migrate', {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: dbUrl.toString(), NODE_ENV: 'development' },
        stdio: 'pipe',
      });

      const familyId = crypto.randomUUID();
      const parentId = crypto.randomUUID();
      const pool = new Pool({ connectionString: dbUrl.toString(), ssl: false });
      await pool.query(
        `INSERT INTO family (id, name, is_lifetime_free, subscription_status) VALUES ($1, $2, true, 'none')`,
        [familyId, SYNTH_NAME]
      );
      await pool.query(
        `INSERT INTO parent (id, family_id, email, password_hash, name) VALUES ($1, $2, $3, $4, $5)`,
        [parentId, familyId, SYNTH_EMAIL, SYNTH_PASSWORD_HASH, SYNTH_NAME]
      );
      const childId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO child (id, family_id, name, pin_fingerprint, avatar_url) VALUES ($1, $2, $3, $4, $5)`,
        [
          childId,
          familyId,
          SYNTH_NAME,
          SYNTH_PIN_HASH,
          'https://cdn.example.invalid/child-photo-827.jpg',
        ]
      );
      await pool.end();

      const { captureDbIntegritySnapshot } = await import('../scripts/ops/lib/db-integrity-snapshot-core.mjs');
      const snap = await captureDbIntegritySnapshot(dbUrl.toString(), { label: 'pii-test' });
      const json = JSON.stringify(snap);
      for (const needle of LEAK_PATTERNS) {
        assert.equal(json.includes(needle), false, `leaked value: ${needle.slice(0, 24)}`);
      }
      assert.doesNotMatch(json, /"email"\s*:/);
      assert.doesNotMatch(json, /password_hash/i);
      assert.doesNotMatch(json, /pin_hash/i);
    } finally {
      const dropPool = new Pool({ connectionString: admin.toString(), ssl: false });
      const dropClient = await dropPool.connect();
      try {
        await dropClient.query(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
          [dbName]
        );
        await dropClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      } finally {
        dropClient.release();
        await dropPool.end();
      }
      await releaseLock();
    }
  });
});
