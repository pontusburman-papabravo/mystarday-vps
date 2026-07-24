'use strict';

/**
 * Locale selection metadata + English beta offer state for P-i18n-Language-Launch-Foundation.
 * Does not modify migrations 0003/0004 (Journey).
 */

const OFFER_STATES = [
  'not_shown',
  'remind_later',
  'accepted_english_beta',
  'declined_english_beta',
  'registration_decided',
];

const SELECTION_SOURCES = [
  'registration',
  'settings',
  'existing_user_offer',
  'admin',
  'legacy_default',
];

module.exports = {
  name: '1810000000005_family_locale_selection_metadata',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS locale_selected_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS locale_selection_source VARCHAR(32),
        ADD COLUMN IF NOT EXISTS previous_locale VARCHAR(16),
        ADD COLUMN IF NOT EXISTS english_beta_offer_state VARCHAR(32) NOT NULL DEFAULT 'not_shown',
        ADD COLUMN IF NOT EXISTS english_beta_offer_remind_at TIMESTAMPTZ
    `);

    await client.query(`
      UPDATE family
      SET locale_selected_at = COALESCE(locale_selected_at, created_at),
          locale_selection_source = COALESCE(locale_selection_source, 'legacy_default')
      WHERE locale_selected_at IS NULL OR locale_selection_source IS NULL
    `);

    await client.query(`
      UPDATE family
      SET english_beta_offer_state = 'accepted_english_beta'
      WHERE preferred_locale = 'en-GB'
        AND english_beta_offer_state = 'not_shown'
    `);

    await client.query(`
      ALTER TABLE contact_message
        ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    `);

    const offerList = OFFER_STATES.map((s) => `'${s}'`).join(', ');
    await client.query(`
      ALTER TABLE family DROP CONSTRAINT IF EXISTS family_english_beta_offer_state_check
    `);
    await client.query(`
      ALTER TABLE family
        ADD CONSTRAINT family_english_beta_offer_state_check
        CHECK (english_beta_offer_state IN (${offerList}))
    `);

    const sourceList = SELECTION_SOURCES.map((s) => `'${s}'`).join(', ');
    await client.query(`
      ALTER TABLE family DROP CONSTRAINT IF EXISTS family_locale_selection_source_check
    `);
    await client.query(`
      ALTER TABLE family
        ADD CONSTRAINT family_locale_selection_source_check
        CHECK (locale_selection_source IS NULL OR locale_selection_source IN (${sourceList}))
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_preferred_locale ON family (preferred_locale)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_english_beta_offer_state ON family (english_beta_offer_state)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_message_type_created ON contact_message (message_type, created_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_contact_message_type_created');
    await client.query('DROP INDEX IF EXISTS idx_family_english_beta_offer_state');
    await client.query('DROP INDEX IF EXISTS idx_family_preferred_locale');
    await client.query('ALTER TABLE family DROP CONSTRAINT IF EXISTS family_locale_selection_source_check');
    await client.query('ALTER TABLE family DROP CONSTRAINT IF EXISTS family_english_beta_offer_state_check');
    await client.query('ALTER TABLE contact_message DROP COLUMN IF EXISTS metadata');
    await client.query(`
      ALTER TABLE family
        DROP COLUMN IF EXISTS english_beta_offer_remind_at,
        DROP COLUMN IF EXISTS english_beta_offer_state,
        DROP COLUMN IF EXISTS previous_locale,
        DROP COLUMN IF EXISTS locale_selection_source,
        DROP COLUMN IF EXISTS locale_selected_at
    `);
  },
};
