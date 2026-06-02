/**
 * Family-scoped data export for migration (JSON bundles).
 * Used by scripts/export-family-data.js and POST /api/admin/migration-export.
 */

const CHILD_IDS = '(SELECT id FROM child WHERE family_id = $1)';
const PARENT_IDS = '(SELECT id FROM parent WHERE family_id = $1)';
const ACTIVITY_IDS = '(SELECT id FROM activity_template WHERE family_id = $1)';
const WEEKLY_SCHEDULE_IDS = `(
  SELECT ws.id FROM weekly_schedule ws
  WHERE ws.family_id = $1 OR ws.child_id IN ${CHILD_IDS}
)`;

const FAMILY_EXPORT_TABLES = [
  { file: 'family.json', sql: 'SELECT * FROM family WHERE id = $1' },
  { file: 'parent.json', sql: `SELECT * FROM parent WHERE family_id = $1` },
  { file: 'parent_child.json', sql: `
    SELECT * FROM parent_child
    WHERE parent_id IN ${PARENT_IDS} OR child_id IN ${CHILD_IDS}` },
  { file: 'child.json', sql: `SELECT * FROM child WHERE family_id = $1` },
  { file: 'category.json', sql: `SELECT * FROM category WHERE family_id = $1` },
  { file: 'activity_template.json', sql: `SELECT * FROM activity_template WHERE family_id = $1` },
  { file: 'activity_sub_step.json', sql: `
    SELECT ass.* FROM activity_sub_step ass
    WHERE ass.activity_template_id IN ${ACTIVITY_IDS}` },
  { file: 'weekly_schedule.json', sql: `
    SELECT * FROM weekly_schedule
    WHERE family_id = $1 OR child_id IN ${CHILD_IDS}` },
  { file: 'weekly_schedule_item.json', sql: `
    SELECT wsi.* FROM weekly_schedule_item wsi
    WHERE wsi.weekly_schedule_id IN ${WEEKLY_SCHEDULE_IDS}` },
  { file: 'special_day_schedule.json', sql: `
    SELECT * FROM special_day_schedule WHERE child_id IN ${CHILD_IDS}` },
  { file: 'special_day_schedule_item.json', sql: `
    SELECT sdsi.* FROM special_day_schedule_item sdsi
    JOIN special_day_schedule sds ON sds.id = sdsi.special_day_schedule_id
    WHERE sds.child_id IN ${CHILD_IDS}` },
  { file: 'schedule_date_exclusion.json', sql: `
    SELECT * FROM schedule_date_exclusion WHERE child_id IN ${CHILD_IDS}` },
  { file: 'reward.json', sql: `SELECT * FROM reward WHERE family_id = $1` },
  { file: 'child_reward_goal.json', sql: `
    SELECT * FROM child_reward_goal WHERE child_id IN ${CHILD_IDS}` },
  { file: 'child_reward_goal_change_request.json', sql: `
    SELECT * FROM child_reward_goal_change_request WHERE child_id IN ${CHILD_IDS}` },
  { file: 'daily_log.json', sql: `SELECT * FROM daily_log WHERE child_id IN ${CHILD_IDS}` },
  { file: 'daily_log_item.json', sql: `
    SELECT dli.* FROM daily_log_item dli
    JOIN daily_log dl ON dl.id = dli.daily_log_id
    WHERE dl.child_id IN ${CHILD_IDS}` },
  { file: 'rating.json', sql: `
    SELECT r.* FROM rating r
    JOIN daily_log_item dli ON dli.id = r.daily_log_item_id
    JOIN daily_log dl ON dl.id = dli.daily_log_id
    WHERE dl.child_id IN ${CHILD_IDS}` },
  { file: 'reward_redemption.json', sql: `
    SELECT * FROM reward_redemption
    WHERE child_id IN ${CHILD_IDS}
       OR reward_id IN (SELECT id FROM reward WHERE family_id = $1)` },
  { file: 'manual_star_grant.json', sql: `
    SELECT * FROM manual_star_grant WHERE child_id IN ${CHILD_IDS}` },
  { file: 'streak.json', sql: `SELECT * FROM streak WHERE child_id IN ${CHILD_IDS}` },
  { file: 'parent_note.json', sql: `SELECT * FROM parent_note WHERE child_id IN ${CHILD_IDS}`, optional: true },
  { file: 'pedagog_notes.json', sql: `SELECT * FROM pedagog_notes WHERE child_id IN ${CHILD_IDS}`, optional: true },
  { file: 'child_observation.json', sql: `
    SELECT * FROM child_observation WHERE child_id IN ${CHILD_IDS}`, optional: true },
  { file: 'general_observations.json', sql: `
    SELECT * FROM general_observations WHERE family_id = $1`, optional: true },
  { file: 'family_subscriptions.json', sql: `
    SELECT * FROM family_subscriptions WHERE family_id = $1`, optional: true },
  { file: 'family_features.json', sql: `
    SELECT * FROM family_features WHERE family_id = $1`, optional: true },
  { file: 'family_invite.json', sql: `SELECT * FROM family_invite WHERE family_id = $1` },
  { file: 'pedagog_invite.json', sql: `SELECT * FROM pedagog_invite WHERE family_id = $1`, optional: true },
  { file: 'professional_share_link.json', sql: `
    SELECT * FROM professional_share_link WHERE family_id = $1`, optional: true },
  { file: 'system_messages.json', sql: `
    SELECT * FROM system_messages WHERE family_id = $1` },
  { file: 'notification_preference.json', sql: `
    SELECT * FROM notification_preference WHERE parent_id IN ${PARENT_IDS}`, optional: true },
  { file: 'email_subscriptions.json', sql: `
    SELECT * FROM email_subscriptions WHERE parent_id IN ${PARENT_IDS}`, optional: true },
];

function serializeValue(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.toISOString();
  if (Buffer.isBuffer(v)) return v.toString('base64');
  if (typeof v === 'object') return v;
  return v;
}

function serializeRows(rows) {
  return rows.map((row) => {
    const out = {};
    for (const [key, val] of Object.entries(row)) {
      out[key] = serializeValue(val);
    }
    return out;
  });
}

async function queryTable(query, sql, familyId, optional) {
  try {
    const result = await query(sql, [familyId]);
    return { rows: result.rows, skipped: false };
  } catch (err) {
    if (optional && err.code === '42P01') {
      return { rows: [], skipped: true };
    }
    throw err;
  }
}

/**
 * @param {(sql: string, params: unknown[]) => Promise<{ rows: object[] }>} query
 * @param {string} familyId
 * @returns {Promise<{ manifest: object, files: Record<string, object[]> }>}
 */
async function buildFamilyExportBundle(query, familyId) {
  const manifest = {
    family_id: familyId,
    exported_at: new Date().toISOString(),
    tables: {},
  };
  const files = {};

  for (const { file, sql, optional } of FAMILY_EXPORT_TABLES) {
    const { rows, skipped } = await queryTable(query, sql, familyId, optional);
    const data = serializeRows(rows);
    files[file] = data;
    manifest.tables[file.replace('.json', '')] = {
      row_count: data.length,
      ...(skipped ? { skipped: true, reason: 'table_missing' } : {}),
    };
  }

  return { manifest, files };
}

/**
 * @param {(sql: string, params?: unknown[]) => Promise<{ rows: object[] }>} query
 * @param {string | null} familyId
 */
async function listFamiliesForExport(query, familyId) {
  if (familyId) {
    const check = await query('SELECT id, name FROM family WHERE id = $1', [familyId]);
    if (check.rows.length === 0) {
      const err = new Error('Family not found');
      err.code = 'FAMILY_NOT_FOUND';
      throw err;
    }
    return check.rows;
  }
  const result = await query(
    `SELECT id, name FROM family ORDER BY created_at ASC NULLS LAST, id ASC`
  );
  return result.rows;
}

/**
 * Stream all families into a zip archiver.
 * @param {(sql: string, params?: unknown[]) => Promise<{ rows: object[] }>} query
 * @param {import('archiver').Archiver} archive
 * @param {{ familyId?: string | null, onProgress?: (info: object) => void }} options
 */
async function appendFamiliesToArchive(query, archive, options = {}) {
  const families = await listFamiliesForExport(query, options.familyId || null);
  const index = {
    exported_at: new Date().toISOString(),
    family_count: families.length,
    format_version: 1,
    families: [],
  };

  for (let i = 0; i < families.length; i++) {
    const f = families[i];
    options.onProgress?.({ phase: 'family', index: i + 1, total: families.length, familyId: f.id, name: f.name });

    const { manifest, files } = await buildFamilyExportBundle(query, f.id);
    const prefix = `families/${f.id}/`;
    archive.append(JSON.stringify(manifest, null, 2), { name: `${prefix}manifest.json` });
    for (const [file, data] of Object.entries(files)) {
      archive.append(JSON.stringify(data, null, 2), { name: `${prefix}${file}` });
    }

    index.families.push({
      id: f.id,
      name: f.name,
      table_row_counts: Object.fromEntries(
        Object.entries(manifest.tables).map(([k, v]) => [k, v.row_count])
      ),
    });
  }

  archive.append(JSON.stringify(index, null, 2), { name: 'index.json' });
  return { familyCount: families.length, index };
}

function isMigrationExportEnabled() {
  return process.env.MIGRATION_EXPORT_ENABLED === 'true';
}

function verifyMigrationExportSecret(req) {
  const expected = process.env.MIGRATION_EXPORT_SECRET;
  if (!expected) {
    return { ok: false, error: 'MIGRATION_EXPORT_SECRET is not configured on the server' };
  }
  const provided = req.get('X-Migration-Export-Secret') || '';
  if (provided.length !== expected.length) {
    return { ok: false, error: 'Invalid migration export secret' };
  }
  let match = 0;
  for (let i = 0; i < expected.length; i++) {
    match |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (match !== 0) {
    return { ok: false, error: 'Invalid migration export secret' };
  }
  return { ok: true };
}

module.exports = {
  FAMILY_EXPORT_TABLES,
  serializeRows,
  buildFamilyExportBundle,
  listFamiliesForExport,
  appendFamiliesToArchive,
  isMigrationExportEnabled,
  verifyMigrationExportSecret,
};
