/**
 * Map global-library-v1 JSON (admin standard library) to Postgres default_* rows.
 */

function normalizeJsonb(value, fallback = []) {
  let parsed = value;
  if (parsed == null || parsed === '') parsed = fallback;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = fallback;
    }
  }
  if (!Array.isArray(parsed) && typeof parsed !== 'object') parsed = fallback;
  return JSON.stringify(parsed);
}

/**
 * @param {object} data — parsed global-library.json
 * @returns {{ bundles: { table: string, rows: object[], conflict: string[] }[] }}
 */
function buildGlobalLibraryBundles(data) {
  if (data.format !== 'global-library-v1') {
    throw new Error('global-library.json saknar format global-library-v1');
  }

  const activities = Array.isArray(data.activities) ? data.activities : [];
  const rewards = Array.isArray(data.rewards) ? data.rewards : [];
  const schedules = Array.isArray(data.schedules) ? data.schedules : [];

  const activityRows = activities
    .filter((a) => a.id && a.name)
    .map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon || '⭐',
      star_value: a.star_value ?? 1,
      sort_order: a.sort_order ?? 0,
      sub_steps: normalizeJsonb(a.sub_steps, []),
      category_name: a.category_name || null,
      schema_type: a.schema_type || null,
      template_group: a.template_group || null,
    }));

  const rewardRows = rewards
    .filter((r) => r.id && r.name)
    .map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon || '🎁',
      star_cost: r.star_cost ?? 1,
      sort_order: r.sort_order ?? 0,
    }));

  const scheduleRows = schedules
    .filter((s) => s.id && s.name)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || null,
      icon: s.icon || '📋',
      sort_order: s.sort_order ?? 0,
    }));

  const scheduleItemRows = [];
  for (const sched of schedules) {
    if (!sched.id) continue;
    for (const item of sched.items || []) {
      if (!item.id) continue;
      scheduleItemRows.push({
        id: item.id,
        default_schedule_id: sched.id,
        default_activity_template_id: item.default_activity_template_id || null,
        name: item.name || null,
        icon: item.icon || '⭐',
        section: item.section || 'morgon',
        star_value: item.star_value ?? 1,
        start_time: item.start_time || null,
        end_time: item.end_time || null,
        sort_order: item.sort_order ?? 0,
        sub_steps: normalizeJsonb(item.sub_steps, []),
      });
    }
  }

  return {
    bundles: [
      { table: 'default_activity_template', conflict: ['id'], rows: activityRows },
      { table: 'default_reward', conflict: ['id'], rows: rewardRows },
      { table: 'default_schedule', conflict: ['id'], rows: scheduleRows },
      { table: 'default_schedule_item', conflict: ['id'], rows: scheduleItemRows },
    ],
    meta: {
      activities: activityRows.length,
      rewards: rewardRows.length,
      schedules: scheduleRows.length,
      scheduleItems: scheduleItemRows.length,
    },
  };
}

/**
 * Local migration DBs need standardbibliotek feature live + features table seeded.
 * Prod uses admin-managed feature status — only force live on localhost.
 */
function isLocalMigrationDb(connectionString) {
  const url = connectionString || process.env.DATABASE_URL || '';
  return url.includes('localhost') || url.includes('127.0.0.1');
}

async function ensureStandardLibraryAccess(client, { forceLive = isLocalMigrationDb() } = {}) {
  if (!forceLive) return { updated: false };

  const result = await client.query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES (
       'standardbibliotek',
       'Standardbibliotek',
       'Admin-seedade globala aktiviteter, belöningar och scheman',
       'live',
       ARRAY['features'],
       'medium',
       4,
       15.0
     )
     ON CONFLICT (slug) DO UPDATE SET status = 'live', updated_at = NOW()
     RETURNING slug, status`
  );
  return { updated: true, slug: result.rows[0]?.slug, status: result.rows[0]?.status };
}

module.exports = { buildGlobalLibraryBundles, normalizeJsonb, ensureStandardLibraryAccess, isLocalMigrationDb };
