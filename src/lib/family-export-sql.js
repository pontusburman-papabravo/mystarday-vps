/**
 * Build SQL INSERT statements from family export rows.
 */

const { rowsToInsertSql } = require('./sql-export-utils');

/** @type {{ table: string, file: string, conflict: string[] }[]} */
const SQL_EXPORT_ORDER = [
  { table: 'family', file: 'family.json', conflict: ['id'] },
  { table: 'parent', file: 'parent.json', conflict: ['id'] },
  { table: 'child', file: 'child.json', conflict: ['id'] },
  { table: 'category', file: 'category.json', conflict: ['id'] },
  { table: 'activity_template', file: 'activity_template.json', conflict: ['id'] },
  { table: 'activity_sub_step', file: 'activity_sub_step.json', conflict: ['id'] },
  { table: 'parent_child', file: 'parent_child.json', conflict: ['parent_id', 'child_id'] },
  { table: 'weekly_schedule', file: 'weekly_schedule.json', conflict: ['id'] },
  { table: 'weekly_schedule_item', file: 'weekly_schedule_item.json', conflict: ['id'] },
  { table: 'special_day_schedule', file: 'special_day_schedule.json', conflict: ['id'] },
  { table: 'special_day_schedule_item', file: 'special_day_schedule_item.json', conflict: ['id'] },
  {
    table: 'schedule_date_exclusion',
    file: 'schedule_date_exclusion.json',
    conflict: ['child_id', 'date', 'activity_template_id'],
  },
  { table: 'reward', file: 'reward.json', conflict: ['id'] },
  { table: 'child_reward_goal', file: 'child_reward_goal.json', conflict: ['id'] },
  {
    table: 'child_reward_goal_change_request',
    file: 'child_reward_goal_change_request.json',
    conflict: ['id'],
  },
  { table: 'daily_log', file: 'daily_log.json', conflict: ['id'] },
  { table: 'daily_log_item', file: 'daily_log_item.json', conflict: ['id'] },
  { table: 'rating', file: 'rating.json', conflict: ['id'] },
  { table: 'reward_redemption', file: 'reward_redemption.json', conflict: ['id'] },
  { table: 'manual_star_grant', file: 'manual_star_grant.json', conflict: ['id'] },
  { table: 'streak', file: 'streak.json', conflict: ['id'] },
  { table: 'parent_note', file: 'parent_note.json', conflict: ['id'] },
  { table: 'pedagog_notes', file: 'pedagog_notes.json', conflict: ['id'] },
  { table: 'child_observation', file: 'child_observation.json', conflict: ['id'] },
  { table: 'general_observations', file: 'general_observations.json', conflict: ['id'] },
  { table: 'family_subscriptions', file: 'family_subscriptions.json', conflict: ['family_id'] },
  { table: 'family_features', file: 'family_features.json', conflict: ['family_id', 'feature_slug'] },
  { table: 'family_invite', file: 'family_invite.json', conflict: ['id'] },
  { table: 'pedagog_invite', file: 'pedagog_invite.json', conflict: ['id'] },
  { table: 'professional_share_link', file: 'professional_share_link.json', conflict: ['id'] },
  { table: 'system_messages', file: 'system_messages.json', conflict: ['id'] },
  { table: 'notification_preference', file: 'notification_preference.json', conflict: ['parent_id'] },
  { table: 'email_subscriptions', file: 'email_subscriptions.json', conflict: ['id'] },
];

/**
 * @param {Record<string, object[]>} files — keys like family.json
 * @param {{ familyId: string, familyName?: string | null }} meta
 */
function buildFamilySqlSection(files, meta) {
  const chunks = [];
  chunks.push(`-- ── Family ${meta.familyId}${meta.familyName ? ` (${meta.familyName})` : ''} ──`);

  for (const { table, file, conflict } of SQL_EXPORT_ORDER) {
    const rows = files[file];
    if (!rows || rows.length === 0) continue;
    chunks.push(`-- ${table}: ${rows.length} row(s)`);
    chunks.push(...rowsToInsertSql(table, rows, conflict));
    chunks.push('');
  }

  return chunks.join('\n');
}

function buildSqlFileHeader(familyCount) {
  return `-- Min Stjärndag — family data SQL export
-- Families: ${familyCount}
-- Generated: ${new Date().toISOString()}
-- Run on target DB after: npm run migrate
-- Import: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f this-file.sql

SET client_encoding = 'UTF8';
BEGIN;
`;
}

function buildSqlFileFooter() {
  return `
COMMIT;
-- Done.
`;
}

module.exports = {
  SQL_EXPORT_ORDER,
  buildFamilySqlSection,
  buildSqlFileHeader,
  buildSqlFileFooter,
  rowsToInsertSql,
};
