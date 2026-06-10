/**
 * Child universe — avatar, collections, achievements, pets, house config (V1–V4).
 */
module.exports = {
  name: '1800000000000_child_universe',

  up: async (client) => {
    await client.query(`
      ALTER TABLE child
        ADD COLUMN IF NOT EXISTS avatar_config JSONB NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS house_config JSONB NOT NULL DEFAULT '{"theme":"castle","unlocked_rooms":["chest","dreams","shop"]}'
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS collectible_catalog (
        slug          VARCHAR(64) PRIMARY KEY,
        name          VARCHAR(128) NOT NULL,
        emoji         VARCHAR(16) NOT NULL,
        rarity        VARCHAR(16) NOT NULL DEFAULT 'common'
                        CHECK (rarity IN ('common', 'rare', 'legendary')),
        unlock_rule   JSONB NOT NULL DEFAULT '{}',
        star_cost     INTEGER NOT NULL DEFAULT 0,
        sort_order    SMALLINT NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS child_collectible (
        child_id          UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        collectible_slug  VARCHAR(64) NOT NULL REFERENCES collectible_catalog(slug),
        unlocked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (child_id, collectible_slug)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS child_collectible_child_idx
        ON child_collectible (child_id, unlocked_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS achievement_definition (
        slug          VARCHAR(64) PRIMARY KEY,
        name          VARCHAR(128) NOT NULL,
        description   TEXT,
        emoji         VARCHAR(16) NOT NULL,
        unlock_rule   JSONB NOT NULL DEFAULT '{}',
        sort_order    SMALLINT NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS child_achievement (
        child_id            UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        achievement_slug    VARCHAR(64) NOT NULL REFERENCES achievement_definition(slug),
        unlocked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (child_id, achievement_slug)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS child_achievement_child_idx
        ON child_achievement (child_id, unlocked_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS child_pet (
        child_id      UUID PRIMARY KEY REFERENCES child(id) ON DELETE CASCADE,
        species       VARCHAR(32) NOT NULL DEFAULT 'dog',
        name          VARCHAR(64),
        mood          VARCHAR(16) NOT NULL DEFAULT 'happy',
        accessory     VARCHAR(32) NOT NULL DEFAULT 'none',
        adopted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Seed collectibles ──────────────────────────────────
    const collectibles = [
      ['gold_star', 'Guldstjärna', '⭐', 'common', '{"type":"first_completion"}', 0, 1],
      ['silver_badge', 'Silvermärke', '📛', 'common', '{"type":"completions","min":10}', 0, 2],
      ['bronze_trophy', 'Minipokal', '🏆', 'common', '{"type":"redemptions","min":1}', 0, 3],
      ['story_book', 'Sagobok', '📚', 'rare', '{"type":"completions","min":30}', 0, 4],
      ['rare_unicorn', 'Enhörning', '🦄', 'legendary', '{"type":"lifetime_stars","min":100}', 0, 5],
      ['memory_frame', 'Minnesram', '🖼️', 'rare', '{"type":"redemptions","min":3}', 0, 6],
      ['golden_crown', 'Guldkrona', '👑', 'legendary', '{"type":"streak","min":7}', 25, 7],
      ['sparkle_gem', 'Glittrande sten', '💎', 'rare', '{"type":"lifetime_stars","min":50}', 15, 8],
    ];
    for (const row of collectibles) {
      await client.query(
        `INSERT INTO collectible_catalog (slug, name, emoji, rarity, unlock_rule, star_cost, sort_order)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
         ON CONFLICT (slug) DO NOTHING`,
        row
      );
    }

    // ── Seed achievements ────────────────────────────────────
    const achievements = [
      ['first_star', 'Första stjärnan', 'Du tjänade din allra första stjärna!', '⭐', '{"type":"first_completion"}', 1],
      ['first_week', 'Första veckan', 'Sju dagar i rad med aktivitet!', '📅', '{"type":"streak","min":7}', 2],
      ['first_redemption', 'Första belöningen', 'Du löste in din första belöning!', '🎁', '{"type":"redemptions","min":1}', 3],
      ['star_collector', 'Stjärnsamlare', 'Du har tjänat 50 stjärnor totalt!', '🌟', '{"type":"lifetime_stars","min":50}', 4],
      ['star_master', 'Stjärnmästare', 'Du har tjänat 100 stjärnor totalt!', '✨', '{"type":"lifetime_stars","min":100}', 5],
      ['activity_hero', 'Aktivitetshjälte', '50 aktiviteter klara!', '💪', '{"type":"completions","min":50}', 6],
      ['reward_fan', 'Belöningsfantast', 'Fem belöningar inlösta!', '🎉', '{"type":"redemptions","min":5}', 7],
      ['streak_starter', 'Streak-start', 'Tre dagar i rad!', '🔥', '{"type":"streak","min":3}', 8],
    ];
    for (const row of achievements) {
      await client.query(
        `INSERT INTO achievement_definition (slug, name, description, emoji, unlock_rule, sort_order)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6)
         ON CONFLICT (slug) DO NOTHING`,
        row
      );
    }
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS child_pet');
    await client.query('DROP TABLE IF EXISTS child_achievement');
    await client.query('DROP TABLE IF EXISTS achievement_definition');
    await client.query('DROP TABLE IF EXISTS child_collectible');
    await client.query('DROP TABLE IF EXISTS collectible_catalog');
    await client.query(`
      ALTER TABLE child
        DROP COLUMN IF EXISTS avatar_config,
        DROP COLUMN IF EXISTS house_config
    `);
  },
};
