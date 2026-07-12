'use strict';

/**
 * Family Avatar v1 — private storage keys on child + parent.
 * Migrates legacy public avatar_url values to avatar_storage_key.
 */

function extractStorageKeyFromLegacyUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  try {
    const parsed = new URL(trimmed);
    pathname = parsed.pathname;
  } catch {
    if (trimmed.startsWith('/')) pathname = trimmed;
    else return null;
  }

  if (pathname.startsWith('/uploads/')) {
    return pathname.slice('/uploads/'.length);
  }
  if (pathname.startsWith('/')) {
    pathname = pathname.slice(1);
  }
  if (pathname.startsWith('avatars-private/') || pathname.startsWith('avatars/')) {
    return pathname;
  }
  return null;
}

module.exports = {
  name: '1810000000000_family_avatar_private_storage',
  extractStorageKeyFromLegacyUrl,

  up: async (client) => {
    await client.query(`
      ALTER TABLE parent
        ADD COLUMN IF NOT EXISTS avatar_storage_key TEXT,
        ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ
    `);

    await client.query(`
      ALTER TABLE child
        ADD COLUMN IF NOT EXISTS avatar_storage_key TEXT,
        ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ
    `);

    const { rows: children } = await client.query(
      `SELECT id, avatar_url FROM child WHERE avatar_url IS NOT NULL AND avatar_url <> ''`
    );
    for (const row of children) {
      const key = extractStorageKeyFromLegacyUrl(row.avatar_url);
      if (key) {
        await client.query(
          `UPDATE child
           SET avatar_storage_key = $2, avatar_updated_at = COALESCE(avatar_updated_at, NOW()), avatar_url = NULL
           WHERE id = $1`,
          [row.id, key]
        );
      } else {
        await client.query('UPDATE child SET avatar_url = NULL WHERE id = $1', [row.id]);
      }
    }

    await client.query(`
      UPDATE child SET avatar_url = NULL
      WHERE avatar_url IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE parent
        DROP COLUMN IF EXISTS avatar_storage_key,
        DROP COLUMN IF EXISTS avatar_updated_at
    `);
    await client.query(`
      ALTER TABLE child
        DROP COLUMN IF EXISTS avatar_storage_key,
        DROP COLUMN IF EXISTS avatar_updated_at
    `);
  },
};
