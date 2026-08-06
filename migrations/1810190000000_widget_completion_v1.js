'use strict';

/**
 * R4.5 — widget completion idempotency + feature flags.
 */

module.exports = {
  name: '1810190000000_widget_completion_v1',

  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
    featureFlagInserts: [
      { key: 'native_widget_enabled', enabled: false },
      { key: 'widget_completion_enabled', enabled: false },
    ],
  },

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS widget_completion_idempotency (
        installation_id VARCHAR(128) NOT NULL,
        idempotency_key VARCHAR(128) NOT NULL,
        daily_log_item_id UUID NOT NULL,
        response_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (installation_id, idempotency_key)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS widget_completion_idempotency_item_idx
        ON widget_completion_idempotency (daily_log_item_id, created_at DESC)
    `);
    const flags = [
      ['native_widget_enabled', 'R4.5 native home-screen widget (read + bind)'],
      ['widget_completion_enabled', 'R4.5 widget completion POST (kill switch)'],
    ];
    for (const [key, description] of flags) {
      await client.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ($1, false, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, description]
      );
    }
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS widget_completion_idempotency');
    await client.query(
      'DELETE FROM feature_flag WHERE key = ANY($1::text[])',
      [['native_widget_enabled', 'widget_completion_enabled']]
    );
  },
};
