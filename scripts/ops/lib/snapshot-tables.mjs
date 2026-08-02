/**
 * Read-only snapshot table specs — non-PII fingerprint columns only.
 */
export const SNAPSHOT_TABLE_SPECS = [
  {
    table: 'family',
    idColumn: 'id',
    tsColumns: ['created_at', 'updated_at'],
    fingerprintColumns: ['id', 'subscription_status', 'is_lifetime_free'],
  },
  {
    table: 'parent',
    idColumn: 'id',
    tsColumns: ['created_at'],
    fingerprintColumns: ['id', 'family_id'],
  },
  {
    table: 'child',
    idColumn: 'id',
    tsColumns: ['created_at'],
    fingerprintColumns: ['id', 'family_id'],
  },
  {
    table: 'parent_child',
    idColumn: 'parent_id',
    tsColumns: ['connected_at'],
    fingerprintColumns: ['parent_id', 'child_id', 'role'],
    orderBy: ['parent_id', 'child_id'],
  },
  {
    table: 'weekly_schedule',
    idColumn: 'id',
    tsColumns: ['created_at'],
    fingerprintColumns: ['id', 'family_id', 'child_id'],
  },
  {
    table: 'weekly_schedule_item',
    idColumn: 'id',
    tsColumns: [],
    fingerprintColumns: ['id', 'weekly_schedule_id', 'activity_template_id'],
  },
  {
    table: 'daily_log',
    idColumn: 'id',
    tsColumns: ['created_at'],
    fingerprintColumns: ['id', 'child_id', 'date'],
  },
  {
    table: 'daily_log_item',
    idColumn: 'id',
    tsColumns: ['completed_date'],
    fingerprintColumns: ['id', 'daily_log_id', 'activity_template_id', 'completed'],
  },
  {
    table: 'reward',
    idColumn: 'id',
    tsColumns: ['created_at'],
    fingerprintColumns: ['id', 'family_id', 'star_cost'],
  },
  {
    table: 'reward_redemption',
    idColumn: 'id',
    tsColumns: ['created_at'],
    fingerprintColumns: ['id', 'reward_id', 'child_id', 'stars_spent'],
  },
  {
    table: 'feature_flag',
    idColumn: 'key',
    tsColumns: [],
    fingerprintColumns: ['key', 'enabled'],
  },
  {
    table: '_migrations',
    idColumn: 'id',
    tsColumns: ['applied_at'],
    fingerprintColumns: ['id', 'name'],
  },
  {
    table: 'iap_webhook_log',
    idColumn: 'revenuecat_event_id',
    tsColumns: ['received_at'],
    fingerprintColumns: ['revenuecat_event_id', 'event_type', 'family_id'],
    optional: true,
  },
  {
    table: 'family_subscriptions',
    idColumn: 'family_id',
    tsColumns: [],
    fingerprintColumns: ['family_id', 'tier'],
    optional: true,
  },
];

/** Tables that must appear in a pg_restore --list for prod backup verification. */
export const BACKUP_ARCHIVE_REQUIRED_TABLES = [
  'family',
  'parent',
  'child',
  'parent_child',
  'weekly_schedule',
  'daily_log',
  'reward',
  'reward_redemption',
  'feature_flag',
  '_migrations',
];

export const PII_FIELD_DENYLIST = new Set([
  'email',
  'password_hash',
  'pin_hash',
  'pin_fingerprint',
  'message',
  'body',
  'token',
  'subscription_json',
  'native_token',
  'avatar_url',
  'apple_email',
]);

/** Explicit allowlist: every fingerprint column must be listed here. */
export const FINGERPRINT_COLUMN_ALLOWLIST = new Set(
  SNAPSHOT_TABLE_SPECS.flatMap((spec) => spec.fingerprintColumns)
);

export function assertFingerprintAllowlist() {
  for (const spec of SNAPSHOT_TABLE_SPECS) {
    for (const col of spec.fingerprintColumns) {
      if (!FINGERPRINT_COLUMN_ALLOWLIST.has(col)) {
        throw new Error(`FINGERPRINT_NOT_ALLOWLISTED:${spec.table}.${col}`);
      }
      if (PII_FIELD_DENYLIST.has(col)) {
        throw new Error(`PII_IN_FINGERPRINT:${spec.table}.${col}`);
      }
    }
  }
}

assertFingerprintAllowlist();
