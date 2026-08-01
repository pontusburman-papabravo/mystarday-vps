'use strict';

/**
 * Ordered reset steps for RC-1 QA fixture only (family_id scoped).
 * policy: reset | preserve | n/a
 *
 * preserve: family, parent, child rows, family_features (english flags), family_subscriptions
 * reset: ephemeral / run-scoped data below
 */

const RC1_QA_RESET_STEPS = [
  { table: 'daily_log_item', policy: 'reset', via: 'daily_log.child_id → child.family_id' },
  { table: 'daily_log', policy: 'reset', via: 'child.family_id' },
  { table: 'reward_redemption', policy: 'reset', via: 'reward.family_id' },
  { table: 'reward', policy: 'reset', via: 'family_id' },
  { table: 'weekly_schedule_item', policy: 'reset', via: 'weekly_schedule.family_id' },
  { table: 'weekly_schedule', policy: 'reset', via: 'family_id' },
  { table: 'special_day_schedule_item', policy: 'reset', via: 'special_day_schedule.child_id' },
  { table: 'special_day_schedule', policy: 'reset', via: 'child.family_id' },
  { table: 'schedule_date_exclusion', policy: 'reset', via: 'child.family_id' },
  { table: 'activity_sub_step', policy: 'reset', via: 'activity_template.family_id' },
  { table: 'activity_template', policy: 'reset', via: 'family_id' },
  { table: 'streak', policy: 'reset', via: 'child.family_id' },
  { table: 'child_observation', policy: 'reset', via: 'child.family_id' },
  { table: 'pedagog_notes', policy: 'reset', via: 'child.family_id' },
  { table: 'for_dig_goal_feedback', policy: 'reset', via: 'family_id' },
  { table: 'for_dig_goal_install', policy: 'reset', via: 'family_id' },
  { table: 'for_dig_goal_favorite', policy: 'reset', via: 'family_id' },
  { table: 'family_image', policy: 'reset', via: 'family_id' },
  { table: 'living_object_instance', policy: 'reset', via: 'family_id' },
  { table: 'family_milestones', policy: 'reset', via: 'family_id' },
  { table: 'system_messages', policy: 'reset', via: 'family_id' },
  { table: 'analytics_events', policy: 'reset', via: 'family_id' },
  { table: 'parent_session_handoff', policy: 'reset', via: 'family_id' },
  { table: 'refresh_token', policy: 'reset', via: 'parent/child in family' },
  { table: 'pin_lockout', policy: 'reset', via: 'child.family_id' },
  { table: 'pin_audit_log', policy: 'reset', via: 'child.family_id' },
  { table: 'pin_notification_log', policy: 'reset', via: 'family_id' },
  { table: 'notification_log', policy: 'reset', via: 'parent.family_id' },
  { table: 'family', policy: 'preserve', note: 'row kept; fields updated by prepare' },
  { table: 'parent', policy: 'preserve', note: 'fixture parent only' },
  { table: 'child', policy: 'preserve', note: 'fixture child username rc1qachild' },
  { table: 'family_features', policy: 'preserve', note: 'english_app flags upserted' },
  { table: 'family_subscriptions', policy: 'preserve', note: 'lifetime_free basic_app' },
];

async function wipeQaFamilyData(client, familyId) {
  const childIdsSub = 'SELECT id FROM child WHERE family_id = $1';
  const parentIdsSub = 'SELECT id FROM parent WHERE family_id = $1';

  await client.query(
    `DELETE FROM daily_log_item WHERE daily_log_id IN
       (SELECT id FROM daily_log WHERE child_id IN (${childIdsSub}))`,
    [familyId]
  );
  await client.query(
    `DELETE FROM daily_log WHERE child_id IN (${childIdsSub})`,
    [familyId]
  );
  await client.query(
    `DELETE FROM reward_redemption WHERE reward_id IN (SELECT id FROM reward WHERE family_id = $1)`,
    [familyId]
  );
  await client.query('DELETE FROM reward WHERE family_id = $1', [familyId]);

  await client.query(
    `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN
       (SELECT id FROM weekly_schedule WHERE family_id = $1)`,
    [familyId]
  );
  await client.query('DELETE FROM weekly_schedule WHERE family_id = $1', [familyId]);

  await client.query(
    `DELETE FROM special_day_schedule_item WHERE special_day_schedule_id IN
       (SELECT id FROM special_day_schedule WHERE child_id IN (${childIdsSub}))`,
    [familyId]
  );
  await client.query(
    `DELETE FROM special_day_schedule WHERE child_id IN (${childIdsSub})`,
    [familyId]
  );
  await client.query(
    `DELETE FROM schedule_date_exclusion WHERE child_id IN (${childIdsSub})`,
    [familyId]
  );

  await client.query(
    `DELETE FROM activity_sub_step WHERE activity_template_id IN
       (SELECT id FROM activity_template WHERE family_id = $1)`,
    [familyId]
  );
  await client.query('DELETE FROM activity_template WHERE family_id = $1', [familyId]);

  await client.query(`DELETE FROM streak WHERE child_id IN (${childIdsSub})`, [familyId]);
  await client.query(`DELETE FROM child_observation WHERE child_id IN (${childIdsSub})`, [familyId]);
  await client.query(`DELETE FROM pedagog_notes WHERE child_id IN (${childIdsSub})`, [familyId]);

  await client.query('DELETE FROM for_dig_goal_feedback WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM for_dig_goal_install WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM for_dig_goal_favorite WHERE family_id = $1', [familyId]);

  await client.query('DELETE FROM family_image WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM living_object_instance WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_milestones WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM system_messages WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM analytics_events WHERE family_id = $1', [familyId]);

  await client.query('DELETE FROM parent_session_handoff WHERE family_id = $1', [familyId]);
  await client.query(
    `DELETE FROM refresh_token WHERE parent_id IN (${parentIdsSub})
       OR child_id IN (${childIdsSub})`,
    [familyId]
  );
  await client.query(`DELETE FROM pin_lockout WHERE child_id IN (${childIdsSub})`, [familyId]);
  await client.query(`DELETE FROM pin_audit_log WHERE child_id IN (${childIdsSub})`, [familyId]);
  await client.query('DELETE FROM pin_notification_log WHERE family_id = $1', [familyId]);
  await client.query(
    `DELETE FROM notification_log WHERE parent_id IN (${parentIdsSub})`,
    [familyId]
  );
}

module.exports = {
  RC1_QA_RESET_STEPS,
  wipeQaFamilyData,
};
