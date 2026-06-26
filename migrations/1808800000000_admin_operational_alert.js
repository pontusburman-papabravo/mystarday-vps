'use strict';

/**
 * Admin operational alerts — activation advisor and future ops recommendations.
 */

module.exports = {
  name: '1808800000000_admin_operational_alert',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_operational_alert (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(128) NOT NULL UNIQUE,
        category VARCHAR(32) NOT NULL DEFAULT 'activation',
        severity VARCHAR(16) NOT NULL DEFAULT 'info'
          CHECK (severity IN ('info', 'warning', 'critical')),
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        action_route VARCHAR(200),
        metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        dismissed_at TIMESTAMPTZ,
        dismissed_by UUID REFERENCES parent(id) ON DELETE SET NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_operational_alert_active
        ON admin_operational_alert (created_at DESC)
        WHERE dismissed_at IS NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS admin_operational_alert');
  },
};
