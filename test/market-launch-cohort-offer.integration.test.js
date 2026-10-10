'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { setupTestDb } = require('./helpers/setup.js');

const FLAG = 'launch_cohort_offer_v1';

function reload(mod) {
  delete require.cache[require.resolve(mod)];
  return require(mod);
}

async function withTx(db, fn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* already closed */ }
    throw err;
  } finally {
    client.release();
  }
}

async function seedOffer(pool, { flag = true, countries = ['DE', 'FR', 'NL'], enabled = true } = {}) {
  await pool.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [FLAG, flag]
  );
  for (const country of countries) {
    await pool.query(
      `INSERT INTO market_launch_cohort_config (country_code, enabled, slot_limit, assigned_count)
       VALUES ($1, $2, 25, 0)
       ON CONFLICT (country_code) DO UPDATE
         SET enabled = EXCLUDED.enabled, assigned_count = market_launch_cohort_config.assigned_count`,
      [country, enabled]
    );
  }
}

async function insertFamily(client, countryCode, createdAt, locale = 'de-DE', marketRegion = 'EU') {
  const { rows } = await client.query(
    `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region, preferred_locale)
     VALUES ('Cohort', 'none', false, $1::timestamptz, $2, $3, $4)
     RETURNING id, created_at, country_code, preferred_locale`,
    [createdAt, countryCode, marketRegion, locale]
  );
  return rows[0];
}

test('first 25 launch cohort slots are atomic and leave SE, IE and CA unchanged', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  reload('../src/lib/db');
  const { syncCreatedFamilyAccessMirrors, resolveFamilyEntitlements } = reload('../src/lib/family-entitlements');
  const cohortDb = reload('../db/launch-cohort-offer');
  const { launchCohortEndsAt } = reload('../src/lib/launch-cohort-offer');

  try {
    await seedOffer(db);
    const createdAt = '2026-10-10T10:00:00.000Z';

    const first = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'DE', createdAt);
      const access = await syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'DE', { client });
      const again = await syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'DE', { client });
      return { family, access, again };
    });
    assert.equal(first.access.kind, 'launch_cohort');
    assert.equal(first.again.kind, 'launch_cohort');
    assert.equal(Number(first.access.grant.slot_number), 1);
    const expectedEnd = launchCohortEndsAt(new Date(createdAt), 'Europe/Berlin');
    assert.equal(new Date(first.access.grant.expires_at).toISOString(), expectedEnd.toISOString());
    const localEnd = DateTime.fromJSDate(expectedEnd, { zone: 'Europe/Berlin' });
    const localStart = DateTime.fromJSDate(new Date(createdAt), { zone: 'Europe/Berlin' });
    assert.equal(localEnd.toFormat('HH:mm'), localStart.toFormat('HH:mm'));
    assert.equal(localEnd.year, localStart.year + 1);

    const audit = await db.query(
      `SELECT amount_minor, currency, store, event_type
       FROM payment_audit_log
       WHERE family_id = $1 AND event_type = 'launch_cohort_granted'`,
      [first.family.id]
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].amount_minor, null);
    assert.equal(audit.rows[0].currency, null);
    assert.equal(audit.rows[0].store, null);

    const mirror = await db.query('SELECT subscription_status FROM family WHERE id = $1', [first.family.id]);
    assert.equal(mirror.rows[0].subscription_status, 'none');

    const active = await resolveFamilyEntitlements(first.family.id, new Date(createdAt));
    assert.equal(active.premium.source, 'launch_cohort');
    assert.equal(active.premium.store, null);
    assert.equal(active.premium.active, true);
    assert.equal(active.access_kind, 'launch_cohort');
    assert.equal(active.premium.metadata.auto_converts, false);
    assert.equal(active.premium.metadata.payment_method_required, false);

    const atEnd = await resolveFamilyEntitlements(first.family.id, expectedEnd);
    assert.equal(atEnd.premium.active, false);

    await db.query(`UPDATE family SET preferred_locale = 'fr-FR' WHERE id = $1`, [first.family.id]);
    const afterLocale = await resolveFamilyEntitlements(first.family.id, new Date(createdAt));
    assert.equal(new Date(afterLocale.premium.expires_at).toISOString(), expectedEnd.toISOString());

    await withTx(db, async (client) => {
      await client.query(`UPDATE family SET country_code = 'FR' WHERE id = $1`, [first.family.id]);
      const moved = await syncCreatedFamilyAccessMirrors(first.family.id, new Date(createdAt), 'FR', { client });
      assert.equal(moved.kind, 'launch_cohort');
      assert.equal(moved.grant.country_code.trim(), 'DE');
    });
    const fr = await cohortDb.getLaunchCohortConfig('FR');
    assert.equal(Number(fr.assigned_count), 0);

    const rolled = await db.pool.connect();
    try {
      await rolled.query('BEGIN');
      const ghost = await insertFamily(rolled, 'DE', createdAt);
      await syncCreatedFamilyAccessMirrors(ghost.id, new Date(createdAt), 'DE', { client: rolled });
      await rolled.query('ROLLBACK');
    } finally {
      rolled.release();
    }
    const afterRollback = await cohortDb.getLaunchCohortConfig('DE');
    assert.equal(Number(afterRollback.assigned_count), 1);

    const more = [];
    for (let i = 0; i < 24; i += 1) {
      more.push(withTx(db, async (client) => {
        const family = await insertFamily(client, 'DE', createdAt);
        return syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'DE', { client });
      }));
    }
    const granted = await Promise.all(more);
    assert.equal(granted.every((row) => row.kind === 'launch_cohort'), true);

    const overflow = await Promise.all(Array.from({ length: 15 }, () => withTx(db, async (client) => {
      const family = await insertFamily(client, 'DE', createdAt);
      return syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'DE', { client });
    })));
    assert.equal(overflow.every((row) => row.kind === 'trial'), true);

    const raced = await Promise.all(Array.from({ length: 40 }, () => withTx(db, async (client) => {
      const family = await insertFamily(client, 'NL', createdAt, 'nl-NL');
      return syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'NL', { client });
    })));
    assert.equal(raced.filter((row) => row.kind === 'launch_cohort').length, 25);
    assert.equal(raced.filter((row) => row.kind === 'trial').length, 15);
    const nlSlots = await db.query(
      `SELECT slot_number FROM family_launch_cohort_grant WHERE country_code = 'NL' ORDER BY slot_number`
    );
    assert.deepEqual(nlSlots.rows.map((row) => Number(row.slot_number)), Array.from({ length: 25 }, (_, i) => i + 1));
    const nlConfig = await cohortDb.getLaunchCohortConfig('NL');
    assert.equal(Number(nlConfig.assigned_count), 25);
    const full = await cohortDb.getLaunchCohortConfig('DE');
    assert.equal(Number(full.assigned_count), 25);
    const slots = await db.query(
      `SELECT slot_number FROM family_launch_cohort_grant WHERE country_code = 'DE' ORDER BY slot_number`
    );
    assert.deepEqual(slots.rows.map((row) => Number(row.slot_number)), Array.from({ length: 25 }, (_, i) => i + 1));

    const twentySixth = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'DE', createdAt);
      const access = await syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'DE', { client });
      return { family, access };
    });
    assert.equal(twentySixth.access.kind, 'trial');
    const stillFull = await cohortDb.getLaunchCohortConfig('DE');
    assert.equal(Number(stillFull.assigned_count), 25);

    const victimFamily = await db.query(
      `SELECT family_id FROM family_launch_cohort_grant WHERE country_code = 'DE' AND slot_number = 25`
    );
    await db.query('DELETE FROM family WHERE id = $1', [victimFamily.rows[0].family_id]);
    const afterDelete = await cohortDb.getLaunchCohortConfig('DE');
    assert.equal(Number(afterDelete.assigned_count), 25);
    const replacement = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'DE', createdAt);
      return syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'DE', { client });
    });
    assert.equal(replacement.kind, 'trial');

    await db.query(`UPDATE market_launch_cohort_config SET enabled = false WHERE country_code = 'FR'`);
    const disabled = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'FR', createdAt, 'fr-FR');
      return syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'FR', { client });
    });
    assert.equal(disabled.kind, 'trial');
    const kept = await resolveFamilyEntitlements(first.family.id, new Date(createdAt));
    assert.equal(kept.premium.source, 'launch_cohort');

    await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FLAG]);
    const flagOff = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'FR', createdAt, 'fr-FR');
      return syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'FR', { client });
    });
    assert.equal(flagOff.kind, 'trial');

    await seedOffer(db, { flag: true, countries: ['FR'], enabled: true });
    const protectedFamily = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'FR', createdAt, 'fr-FR');
      await client.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, source_reference, status, starts_at, expires_at, metadata
         ) VALUES ($1, 'basic', 'apple', 'existing', 'active', $2, $3, '{"plan":"yearly"}'::jsonb)`,
        [family.id, createdAt, '2027-01-01T00:00:00.000Z']
      );
      const access = await syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'FR', { client });
      return { family, access };
    });
    assert.equal(protectedFamily.access.kind === 'launch_cohort', false);
    const frCount = await cohortDb.getLaunchCohortConfig('FR');
    assert.equal(Number(frCount.assigned_count), 0);
    const appleNow = await resolveFamilyEntitlements(protectedFamily.family.id, new Date(createdAt));
    assert.equal(appleNow.premium.source, 'apple');

    const overlap = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'FR', createdAt, 'fr-FR');
      const access = await syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'FR', { client });
      await client.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, source_reference, status, starts_at, expires_at, metadata
         ) VALUES ($1, 'basic', 'google', 'store', 'active', $2, $3, '{"plan":"monthly"}'::jsonb)`,
        [family.id, createdAt, '2026-11-10T00:00:00.000Z']
      );
      return family.id;
    });
    const googleWins = await resolveFamilyEntitlements(overlap, new Date('2026-10-20T00:00:00.000Z'));
    assert.equal(googleWins.premium.source, 'google');
    assert.equal(googleWins.premium.store, 'google');
    await db.query(
      `UPDATE family_entitlements SET expires_at = '2026-10-19T00:00:00.000Z'
       WHERE family_id = $1 AND source = 'google'`,
      [overlap]
    );
    const cohortReturns = await resolveFamilyEntitlements(overlap, new Date('2026-10-20T00:00:00.000Z'));
    assert.equal(cohortReturns.premium.source, 'launch_cohort');
    assert.equal(cohortReturns.premium.store, null);

    await db.query(
      `UPDATE family_entitlements
          SET starts_at = '2026-10-01T00:00:00.000Z',
              expires_at = '2026-10-09T00:00:00.000Z'
        WHERE family_id = $1 AND source = 'launch_cohort'`,
      [overlap]
    );
    await db.query(
      `UPDATE family_launch_cohort_grant
          SET starts_at = '2026-10-01T00:00:00.000Z',
              expires_at = '2026-10-09T00:00:00.000Z'
        WHERE family_id = $1`,
      [overlap]
    );
    const afterCohort = await resolveFamilyEntitlements(overlap, new Date('2026-10-20T12:00:00.000Z'));
    assert.equal(afterCohort.premium.active, false);
    assert.equal(afterCohort.access_kind, 'limited');

    const seBefore = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'SE', '2026-10-02T12:00:00.000Z', 'sv-SE');
      const access = await syncCreatedFamilyAccessMirrors(family.id, new Date('2026-10-02T12:00:00.000Z'), 'SE', { client });
      return access.kind;
    });
    const seAfter = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'SE', '2026-10-03T00:00:00.000Z', 'sv-SE');
      const access = await syncCreatedFamilyAccessMirrors(family.id, new Date('2026-10-03T00:00:00.000Z'), 'SE', { client });
      return access.kind;
    });
    const ie = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'IE', createdAt, 'en-GB');
      const access = await syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'IE', { client });
      return access.kind;
    });
    const ca = await withTx(db, async (client) => {
      const family = await insertFamily(client, 'CA', createdAt, 'en-GB', 'OTHER');
      const access = await syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'CA', { client });
      return access.kind;
    });
    assert.equal(seBefore, 'intro_year');
    assert.equal(seAfter, 'trial');
    assert.equal(ie, 'complimentary');
    assert.equal(ca, 'complimentary');
    const protectedGrants = await db.query(
      `SELECT country_code FROM family_launch_cohort_grant WHERE country_code IN ('SE', 'IE', 'CA')`
    );
    assert.equal(protectedGrants.rows.length, 0);

    await assert.rejects(
      () => cohortDb.setLaunchCohortCountryEnabled('SE', true),
      (err) => err.code === 'LAUNCH_COHORT_EXCLUDED'
    );
    await assert.rejects(
      () => cohortDb.setLaunchCohortCountryEnabled('IE', true),
      (err) => err.code === 'LAUNCH_COHORT_EXCLUDED'
    );
    await assert.rejects(
      () => cohortDb.setLaunchCohortCountryEnabled('CA', true),
      (err) => err.code === 'LAUNCH_COHORT_EXCLUDED'
    );

    const hidden = await cohortDb.describePublicLaunchCohortOffer('DE', 'de-DE');
    assert.equal(hidden.show, false);
    assert.equal(hidden.slots_remaining, null);
    await db.query(`UPDATE feature_flag SET enabled = true WHERE key = $1`, [FLAG]);
    await db.query(`UPDATE market_launch_cohort_config SET enabled = true, assigned_count = 24 WHERE country_code = 'FR'`);
    const shown = await cohortDb.describePublicLaunchCohortOffer('FR', 'fr-FR');
    assert.equal(shown.show, true);
    assert.equal(shown.slots_remaining, 1);
    assert.match(shown.copy.remaining, /1/);
    const swedenOffer = await cohortDb.describePublicLaunchCohortOffer('SE', 'sv-SE');
    assert.equal(swedenOffer.show, false);
    assert.equal(swedenOffer.slots_remaining, null);

    await db.query(
      `UPDATE family_launch_cohort_grant
          SET starts_at = NOW() - INTERVAL '11 months',
              expires_at = NOW() + INTERVAL '10 days'
        WHERE family_id = $1`,
      [first.family.id]
    );
    const expiring = await cohortDb.listLaunchCohortExpiring(30);
    assert.equal(expiring.some((row) => row.family_id === first.family.id), true);

    const lostRace = await db.pool.connect();
    let lostCode = null;
    try {
      await lostRace.query('BEGIN');
      const family = await insertFamily(lostRace, 'DE', createdAt);
      await syncCreatedFamilyAccessMirrors(family.id, new Date(createdAt), 'DE', {
        client: lostRace,
        cohortBypass: true,
      });
      await lostRace.query('COMMIT');
    } catch (err) {
      lostCode = err.code;
      await lostRace.query('ROLLBACK');
    } finally {
      lostRace.release();
    }
    assert.equal(lostCode, 'MARKET_BILLING_NOT_READY');
    const unchanged = await cohortDb.getLaunchCohortConfig('DE');
    assert.equal(Number(unchanged.assigned_count), 25);
  } finally {
    await db.cleanup();
  }
});
