'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { lookupDefaultRewardIdForSeed } = require('../src/lib/reward-provenance');
const { localizeRewardItems } = require('../src/lib/family-content-display');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail() {
  return `prov-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

describe('lookupDefaultRewardIdForSeed', () => {
  test('exact system match sets id', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const client = await db.pool.connect();
    try {
      const name = `Exact match ${Date.now()}`;
      const ins = await client.query(
        `INSERT INTO default_reward (name, icon, star_cost, sort_order)
         VALUES ($1, $2, $3, 1) RETURNING id`,
        [name, '🎬', 12]
      );
      const id = ins.rows[0].id;
      const found = await lookupDefaultRewardIdForSeed(client, {
        name,
        icon: '🎬',
        star_cost: 12,
      });
      assert.equal(found, id);
    } finally {
      client.release();
      await db.cleanup();
    }
  });

  test('unique icon+cost legacy match when name differs in seed row', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const client = await db.pool.connect();
    try {
      const ins = await client.query(
        `INSERT INTO default_reward (name, icon, star_cost, sort_order)
         VALUES ($1, $2, $3, 2) RETURNING id`,
        [`Library name ${Date.now()}`, '🍿', 8]
      );
      const id = ins.rows[0].id;
      const found = await lookupDefaultRewardIdForSeed(client, {
        name: 'Different English seed label',
        icon: '🍿',
        star_cost: 8,
      });
      assert.equal(found, id);
    } finally {
      client.release();
      await db.cleanup();
    }
  });

  test('multiple icon+cost matches return null', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const client = await db.pool.connect();
    try {
      const icon = '🎯';
      const cost = 15;
      await client.query(
        `INSERT INTO default_reward (name, icon, star_cost, sort_order) VALUES ($1, $2, $3, 3), ($4, $2, $3, 4)`,
        [`A ${Date.now()}`, icon, cost, `B ${Date.now()}`]
      );
      const found = await lookupDefaultRewardIdForSeed(client, {
        name: 'Ambiguous',
        icon,
        star_cost: cost,
      });
      assert.equal(found, null);
    } finally {
      client.release();
      await db.cleanup();
    }
  });

  test('name alone does not match without icon+cost row', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const client = await db.pool.connect();
    try {
      const name = `Name only ${Date.now()}`;
      await client.query(
        `INSERT INTO default_reward (name, icon, star_cost, sort_order) VALUES ($1, '🎁', 5, 5)`,
        [name]
      );
      const found = await lookupDefaultRewardIdForSeed(client, {
        name,
        icon: '❓',
        star_cost: 99,
      });
      assert.equal(found, null);
    } finally {
      client.release();
      await db.cleanup();
    }
  });

  test('unknown reward returns null', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const client = await db.pool.connect();
    try {
      const found = await lookupDefaultRewardIdForSeed(client, {
        name: 'Does not exist',
        icon: '🛸',
        star_cost: 3,
      });
      assert.equal(found, null);
    } finally {
      client.release();
      await db.cleanup();
    }
  });
});

test('en-GB registration: provenance + localization rules on seeded rewards', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { loadLocales } = require('../src/lib/i18n');
  loadLocales();

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const client = await db.pool.connect();

  try {
    const ins = await client.query(
      `INSERT INTO default_reward (name, icon, star_cost, sort_order)
       VALUES ('Extra skärmtid', '📱', 5, 0)
       ON CONFLICT DO NOTHING
       RETURNING id`
    );
    let defaultId = ins.rows[0]?.id;
    if (!defaultId) {
      const existing = await client.query(
        `SELECT id FROM default_reward WHERE icon = '📱' AND star_cost = 5 AND name = 'Extra skärmtid' LIMIT 1`
      );
      defaultId = existing.rows[0]?.id;
    }

    const email = uniqueEmail();
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prov Parent',
        email,
        password: 'testpass123',
        preferred_locale: 'en-GB',
      }),
    });
    assert.equal(res.status, 201, await res.text());

    const rewards = await db.query(
      `SELECT r.name, r.source_default_id, r.modified_by_family
       FROM reward r
       JOIN parent p ON p.family_id = r.family_id
       WHERE LOWER(p.email) = $1`,
      [email.toLowerCase()]
    );
    assert.ok(rewards.rows.length > 0);
    const withProvenance = rewards.rows.filter((r) => r.source_default_id && !r.modified_by_family);
    assert.ok(withProvenance.length > 0, 'expected at least one provenance-linked reward');

    const svLinked = rewards.rows.find((r) => r.name === 'Extra skärmtid' && r.source_default_id);
    if (svLinked) {
      const out = await localizeRewardItems([svLinked], 'en-GB');
      assert.equal(out[0].display_name, 'Extra screen time');
    }

    for (const row of withProvenance) {
      assert.ok(row.name, 'stored reward name must be preserved');
    }

    const localized = await localizeRewardItems(withProvenance, 'en-GB');
    const anyDisplay = localized.some((row) => row.display_name);
    if (svLinked) {
      assert.ok(anyDisplay, 'expected display_name when Swedish default name is linked');
    }

    const userNamed = rewards.rows.filter((r) => !r.source_default_id || r.modified_by_family);
    for (const row of userNamed) {
      const out = await localizeRewardItems([row], 'en-GB');
      assert.equal(out[0].display_name, undefined);
    }

    const mutated = await db.query(
      `UPDATE reward SET modified_by_family = true
       WHERE family_id = (SELECT family_id FROM parent WHERE LOWER(email) = $1 LIMIT 1)
       RETURNING name, source_default_id, modified_by_family`,
      [email.toLowerCase()]
    );
    assert.ok(mutated.rows.length > 0);
    const afterMod = await localizeRewardItems(mutated.rows, 'en-GB');
    afterMod.forEach((row) => {
      assert.equal(row.display_name, undefined);
    });
  } finally {
    client.release();
    await http.close();
    await db.cleanup();
  }
});
