'use strict';

/**
 * Bildstöd PR 3 — emotion_key on ratings, child mood/transition settings, feature seeds.
 */

const EMOTION_FEATURE = {
  slug: 'emotion_tracking',
  name: 'Känslostöd',
  description: 'Känsloregistrering efter aktivitet — kort eller slider (Basic)',
  status: 'live',
  tags: ['features', 'barn'],
  priority: 'medium',
  complexity: 4,
  estimated_hours: 10.0,
};

const TRANSITION_FEATURE = {
  slug: 'transition_support',
  name: 'Övergångsstöd',
  description: 'Inline övergångstext i NU-kortet — Snart, Om X min, Nu (Extra stöd)',
  status: 'dev',
  tags: ['features', 'barn', 'teacch'],
  priority: 'high',
  complexity: 5,
  estimated_hours: 12.0,
};

async function upsertFeature(client, f) {
  await client.query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       status = EXCLUDED.status,
       tags = EXCLUDED.tags,
       priority = EXCLUDED.priority,
       complexity = EXCLUDED.complexity,
       estimated_hours = EXCLUDED.estimated_hours,
       updated_at = NOW()`,
    [f.slug, f.name, f.description, f.status, f.tags, f.priority, f.complexity, f.estimated_hours]
  );
}

module.exports = {
  name: '1809500000000_bildstod_pr3',

  up: async (client) => {
    await client.query(`
      ALTER TABLE rating
        ADD COLUMN IF NOT EXISTS emotion_key VARCHAR(32)
    `);

    await client.query(`
      ALTER TABLE child
        ADD COLUMN IF NOT EXISTS mood_input_mode VARCHAR(16) NOT NULL DEFAULT 'slider'
    `);

    await client.query(`
      ALTER TABLE child
        ADD COLUMN IF NOT EXISTS transition_lead_minutes JSONB NOT NULL DEFAULT '[5, 1]'::jsonb
    `);

    await upsertFeature(client, EMOTION_FEATURE);
    await upsertFeature(client, TRANSITION_FEATURE);
  },

  down: async (client) => {
    await client.query('ALTER TABLE rating DROP COLUMN IF EXISTS emotion_key');
    await client.query('ALTER TABLE child DROP COLUMN IF EXISTS mood_input_mode');
    await client.query('ALTER TABLE child DROP COLUMN IF EXISTS transition_lead_minutes');
    await client.query(`DELETE FROM features WHERE slug IN ('emotion_tracking', 'transition_support')`);
  },
};
