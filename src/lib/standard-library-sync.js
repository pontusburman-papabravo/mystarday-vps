'use strict';

const { getPictogram } = require('../../config/pictogram-library');
const {
  validateStandardLibraryManifest,
  readManifestFile,
  DEFAULT_MANIFEST_PATH,
} = require('./standard-library-manifest');

const ACTIVITY_COMPARE_FIELDS = [
  'canonical_id',
  'name',
  'name_i18n',
  'icon_key',
  'icon',
  'star_value',
  'duration_seconds',
  'sub_steps',
  'variants',
  'seven_questions',
  'deprecated',
  'sort_order',
];

const SCHEDULE_COMPARE_FIELDS = [
  'canonical_id',
  'name',
  'name_i18n',
  'description',
  'description_i18n',
  'deprecated',
  'sort_order',
];

const SCHEDULE_ITEM_COMPARE_FIELDS = [
  'schedule_canonical_id',
  'sort_order',
  'activity_canonical_id',
  'section',
  'variant_key',
  'is_optional',
  'start_time',
  'end_time',
  'name',
  'icon',
  'star_value',
  'sub_steps',
];

function createEmptyBucket() {
  return {
    inserts: 0,
    updates: 0,
    unchanged: 0,
    deprecated: 0,
    conflicts: 0,
  };
}

function createEmptySummary() {
  return {
    activities: createEmptyBucket(),
    schedules: createEmptyBucket(),
    schedule_items: createEmptyBucket(),
    totals: createEmptyBucket(),
  };
}

function resolveIconEmoji(iconKey) {
  const pic = getPictogram(iconKey);
  return pic?.emoji || '⭐';
}

function mapManifestSubSteps(subSteps) {
  return (subSteps || []).map((step, index) => ({
    step_id: step.step_id,
    name: step.name_i18n.sv,
    name_i18n: step.name_i18n,
    icon_key: step.icon_key ?? null,
    icon: step.icon_key ? resolveIconEmoji(step.icon_key) : null,
    duration_seconds: step.duration_seconds ?? null,
    sort_order: index,
  }));
}

function mapManifestVariants(variants) {
  return (variants || []).map((variant) => ({
    variant_key: variant.variant_key,
    name_i18n: variant.name_i18n,
    name: variant.name_i18n.sv,
    sub_steps: mapManifestSubSteps(variant.sub_steps),
  }));
}

function mapManifestActivity(activity, sortOrder) {
  return {
    canonical_id: activity.activity_id,
    name: activity.name_i18n.sv,
    name_i18n: activity.name_i18n,
    icon_key: activity.icon_key,
    icon: resolveIconEmoji(activity.icon_key),
    star_value: activity.default_stars,
    duration_seconds: activity.duration_seconds ?? null,
    sub_steps: mapManifestSubSteps(activity.sub_steps),
    variants: mapManifestVariants(activity.variants),
    seven_questions: activity.seven_questions ?? {},
    deprecated: false,
    sort_order: sortOrder,
  };
}

function mapManifestSchedule(schedule, sortOrder) {
  return {
    canonical_id: schedule.schedule_id,
    name: schedule.name_i18n.sv,
    name_i18n: schedule.name_i18n,
    description: schedule.description_i18n.sv,
    description_i18n: schedule.description_i18n,
    deprecated: false,
    sort_order: sortOrder,
    items: schedule.items.map((item, itemIndex) => ({
      schedule_canonical_id: schedule.schedule_id,
      sort_order: itemIndex,
      activity_canonical_id: item.activity_id,
      section: item.section,
      variant_key: item.variant_key ?? null,
      is_optional: item.is_optional ?? false,
      start_time: item.start_time ?? null,
      end_time: item.end_time ?? null,
    })),
  };
}

function buildDesiredStateFromManifest(manifest) {
  const activities = manifest.activities.map((activity, index) =>
    mapManifestActivity(activity, index)
  );
  const activitiesByCanonical = new Map(
    activities.map((activity) => [activity.canonical_id, activity])
  );

  const schedules = manifest.schedules.map((schedule, index) => {
    const mapped = mapManifestSchedule(schedule, index);
    mapped.items = mapped.items.map((item) => {
      const activity = activitiesByCanonical.get(item.activity_canonical_id);
      return {
        ...item,
        name: activity.name,
        icon: activity.icon,
        star_value: activity.star_value,
        sub_steps: activity.sub_steps,
      };
    });
    return mapped;
  });

  const scheduleItems = schedules.flatMap((schedule) => schedule.items);

  return {
    activities,
    schedules,
    scheduleItems,
  };
}

function stableValue(value) {
  return JSON.stringify(value ?? null);
}

function pickFields(row, fields) {
  const out = {};
  for (const field of fields) {
    out[field] = row[field];
  }
  return out;
}

function rowsEquivalent(desired, current, fields) {
  const left = pickFields(desired, fields);
  const right = pickFields(current, fields);
  for (const field of fields) {
    if (stableValue(left[field]) !== stableValue(right[field])) {
      return false;
    }
  }
  return true;
}

function indexRowsByCanonicalId(rows, summaryBucket) {
  const map = new Map();
  const conflictIds = new Set();

  for (const row of rows) {
    if (!row.canonical_id) continue;
    if (map.has(row.canonical_id)) {
      conflictIds.add(row.canonical_id);
      summaryBucket.conflicts += 1;
      continue;
    }
    map.set(row.canonical_id, row);
  }

  for (const conflictId of conflictIds) {
    map.delete(conflictId);
  }

  return map;
}

function scheduleItemKey(item) {
  return `${item.schedule_canonical_id}:${item.sort_order}`;
}

function diffEntitySet({
  desiredRows,
  currentRows,
  compareFields,
  canonicalField = 'canonical_id',
}) {
  const bucket = createEmptyBucket();
  const currentByCanonical = indexRowsByCanonicalId(currentRows, bucket);
  const desiredCanonicalIds = new Set();
  const changes = [];

  for (const desired of desiredRows) {
    desiredCanonicalIds.add(desired[canonicalField]);
    const current = currentByCanonical.get(desired[canonicalField]);

    if (!current) {
      bucket.inserts += 1;
      changes.push({ action: 'insert', desired, current: null });
      continue;
    }

    if (rowsEquivalent(desired, current, compareFields)) {
      bucket.unchanged += 1;
      changes.push({ action: 'unchanged', desired, current });
      continue;
    }

    bucket.updates += 1;
    changes.push({ action: 'update', desired, current });
  }

  for (const [canonicalId, current] of currentByCanonical.entries()) {
    if (!desiredCanonicalIds.has(canonicalId)) {
      bucket.deprecated += 1;
      changes.push({ action: 'deprecated', desired: null, current });
    }
  }

  return { bucket, changes };
}

function diffScheduleItems(desiredItems, currentItems) {
  const bucket = createEmptyBucket();
  const currentByKey = new Map(
    currentItems.map((item) => [scheduleItemKey(item), item])
  );
  const desiredKeys = new Set();
  const changes = [];

  for (const desired of desiredItems) {
    const key = scheduleItemKey(desired);
    desiredKeys.add(key);
    const current = currentByKey.get(key);

    if (!current) {
      bucket.inserts += 1;
      changes.push({ action: 'insert', desired, current: null });
      continue;
    }

    const comparableCurrent = {
      ...current,
      activity_canonical_id: current.activity_canonical_id,
    };

    if (rowsEquivalent(desired, comparableCurrent, SCHEDULE_ITEM_COMPARE_FIELDS)) {
      bucket.unchanged += 1;
      changes.push({ action: 'unchanged', desired, current });
      continue;
    }

    bucket.updates += 1;
    changes.push({ action: 'update', desired, current });
  }

  for (const [key, current] of currentByKey.entries()) {
    if (!desiredKeys.has(key)) {
      bucket.deprecated += 1;
      changes.push({ action: 'deprecated', desired: null, current });
    }
  }

  return { bucket, changes };
}

function mergeSummary(summary, bucketName, bucket) {
  summary[bucketName] = bucket;
  for (const key of Object.keys(summary.totals)) {
    summary.totals[key] += bucket[key];
  }
}

function computeSyncPlan(desired, current) {
  const summary = createEmptySummary();

  const activityDiff = diffEntitySet({
    desiredRows: desired.activities,
    currentRows: current.activities,
    compareFields: ACTIVITY_COMPARE_FIELDS,
  });
  mergeSummary(summary, 'activities', activityDiff.bucket);

  const scheduleDiff = diffEntitySet({
    desiredRows: desired.schedules.map((schedule) => {
      const { items, ...scheduleRow } = schedule;
      return scheduleRow;
    }),
    currentRows: current.schedules,
    compareFields: SCHEDULE_COMPARE_FIELDS,
  });
  mergeSummary(summary, 'schedules', scheduleDiff.bucket);

  const scheduleItemDiff = diffScheduleItems(desired.scheduleItems, current.scheduleItems);
  mergeSummary(summary, 'schedule_items', scheduleItemDiff.bucket);

  return {
    summary,
    changes: {
      activities: activityDiff.changes,
      schedules: scheduleDiff.changes,
      schedule_items: scheduleItemDiff.changes,
    },
  };
}

async function readCurrentCanonicalState(client) {
  const activitiesRes = await client.query(`
      SELECT
        id, canonical_id, name, name_i18n, icon_key, icon, star_value,
        duration_seconds, sub_steps, variants, seven_questions, deprecated, sort_order
      FROM default_activity_template
      WHERE canonical_id IS NOT NULL
    `);
  const schedulesRes = await client.query(`
      SELECT
        id, canonical_id, name, name_i18n, description, description_i18n,
        deprecated, sort_order
      FROM default_schedule
      WHERE canonical_id IS NOT NULL
    `);
  const scheduleItemsRes = await client.query(`
      SELECT
        dsi.id,
        dsi.default_schedule_id,
        dsi.default_activity_template_id,
        dsi.name,
        dsi.icon,
        dsi.section,
        dsi.star_value,
        dsi.start_time,
        dsi.end_time,
        dsi.sort_order,
        dsi.sub_steps,
        dsi.is_optional,
        dsi.variant_key,
        ds.canonical_id AS schedule_canonical_id,
        dat.canonical_id AS activity_canonical_id
      FROM default_schedule_item dsi
      INNER JOIN default_schedule ds ON ds.id = dsi.default_schedule_id
      LEFT JOIN default_activity_template dat ON dat.id = dsi.default_activity_template_id
      WHERE ds.canonical_id IS NOT NULL
    `);

  return {
    activities: activitiesRes.rows,
    schedules: schedulesRes.rows,
    scheduleItems: scheduleItemsRes.rows,
  };
}

async function insertActivity(client, desired) {
  const { rows } = await client.query(
    `INSERT INTO default_activity_template (
       canonical_id, name, name_i18n, icon_key, icon, star_value,
       duration_seconds, sub_steps, variants, seven_questions, deprecated, sort_order
     ) VALUES (
       $1, $2, $3::jsonb, $4, $5, $6,
       $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12
     )
     RETURNING id, canonical_id`,
    [
      desired.canonical_id,
      desired.name,
      JSON.stringify(desired.name_i18n),
      desired.icon_key,
      desired.icon,
      desired.star_value,
      desired.duration_seconds,
      JSON.stringify(desired.sub_steps),
      JSON.stringify(desired.variants),
      JSON.stringify(desired.seven_questions),
      desired.deprecated,
      desired.sort_order,
    ]
  );
  return rows[0];
}

async function updateActivity(client, currentId, desired) {
  await client.query(
    `UPDATE default_activity_template
     SET name = $2,
         name_i18n = $3::jsonb,
         icon_key = $4,
         icon = $5,
         star_value = $6,
         duration_seconds = $7,
         sub_steps = $8::jsonb,
         variants = $9::jsonb,
         seven_questions = $10::jsonb,
         deprecated = $11,
         sort_order = $12,
         updated_at = NOW()
     WHERE id = $1`,
    [
      currentId,
      desired.name,
      JSON.stringify(desired.name_i18n),
      desired.icon_key,
      desired.icon,
      desired.star_value,
      desired.duration_seconds,
      JSON.stringify(desired.sub_steps),
      JSON.stringify(desired.variants),
      JSON.stringify(desired.seven_questions),
      desired.deprecated,
      desired.sort_order,
    ]
  );
}

async function insertSchedule(client, desired) {
  const { rows } = await client.query(
    `INSERT INTO default_schedule (
       canonical_id, name, name_i18n, description, description_i18n,
       deprecated, sort_order
     ) VALUES (
       $1, $2, $3::jsonb, $4, $5::jsonb, $6, $7
     )
     RETURNING id, canonical_id`,
    [
      desired.canonical_id,
      desired.name,
      JSON.stringify(desired.name_i18n),
      desired.description,
      JSON.stringify(desired.description_i18n),
      desired.deprecated,
      desired.sort_order,
    ]
  );
  return rows[0];
}

async function updateSchedule(client, currentId, desired) {
  await client.query(
    `UPDATE default_schedule
     SET name = $2,
         name_i18n = $3::jsonb,
         description = $4,
         description_i18n = $5::jsonb,
         deprecated = $6,
         sort_order = $7,
         updated_at = NOW()
     WHERE id = $1`,
    [
      currentId,
      desired.name,
      JSON.stringify(desired.name_i18n),
      desired.description,
      JSON.stringify(desired.description_i18n),
      desired.deprecated,
      desired.sort_order,
    ]
  );
}

async function insertScheduleItem(client, scheduleId, activityId, desired) {
  await client.query(
    `INSERT INTO default_schedule_item (
       default_schedule_id, default_activity_template_id, name, icon, section,
       star_value, start_time, end_time, sort_order, sub_steps, is_optional, variant_key
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10::jsonb, $11, $12
     )`,
    [
      scheduleId,
      activityId,
      desired.name,
      desired.icon,
      desired.section,
      desired.star_value,
      desired.start_time,
      desired.end_time,
      desired.sort_order,
      JSON.stringify(desired.sub_steps),
      desired.is_optional,
      desired.variant_key,
    ]
  );
}

async function updateScheduleItem(client, currentId, scheduleId, activityId, desired) {
  await client.query(
    `UPDATE default_schedule_item
     SET default_schedule_id = $2,
         default_activity_template_id = $3,
         name = $4,
         icon = $5,
         section = $6,
         star_value = $7,
         start_time = $8,
         end_time = $9,
         sort_order = $10,
         sub_steps = $11::jsonb,
         is_optional = $12,
         variant_key = $13
     WHERE id = $1`,
    [
      currentId,
      scheduleId,
      activityId,
      desired.name,
      desired.icon,
      desired.section,
      desired.star_value,
      desired.start_time,
      desired.end_time,
      desired.sort_order,
      JSON.stringify(desired.sub_steps),
      desired.is_optional,
      desired.variant_key,
    ]
  );
}

async function applySyncPlan(client, desired, plan) {
  const activityIdByCanonical = new Map();
  const scheduleIdByCanonical = new Map();

  for (const change of plan.changes.activities) {
    if (change.action === 'deprecated') continue;

    if (change.action === 'insert') {
      const row = await insertActivity(client, change.desired);
      activityIdByCanonical.set(row.canonical_id, row.id);
      continue;
    }

    activityIdByCanonical.set(change.current.canonical_id, change.current.id);
    if (change.action === 'update') {
      await updateActivity(client, change.current.id, change.desired);
    }
  }

  for (const change of plan.changes.schedules) {
    if (change.action === 'deprecated') continue;

    if (change.action === 'insert') {
      const row = await insertSchedule(client, change.desired);
      scheduleIdByCanonical.set(row.canonical_id, row.id);
      continue;
    }

    scheduleIdByCanonical.set(change.current.canonical_id, change.current.id);
    if (change.action === 'update') {
      await updateSchedule(client, change.current.id, change.desired);
    }
  }

  for (const change of plan.changes.schedule_items) {
    if (change.action === 'unchanged' || change.action === 'deprecated') continue;

    const scheduleId = scheduleIdByCanonical.get(change.desired.schedule_canonical_id);
    const activityId = activityIdByCanonical.get(change.desired.activity_canonical_id);

    if (!scheduleId) {
      throw new Error(`Missing schedule id for ${change.desired.schedule_canonical_id}`);
    }
    if (!activityId) {
      throw new Error(`Missing activity id for ${change.desired.activity_canonical_id}`);
    }

    if (change.action === 'insert') {
      await insertScheduleItem(client, scheduleId, activityId, change.desired);
      continue;
    }

    if (change.action === 'update') {
      await updateScheduleItem(
        client,
        change.current.id,
        scheduleId,
        activityId,
        change.desired
      );
    }
  }
}

function loadValidatedManifest(manifestOrPath) {
  if (manifestOrPath && typeof manifestOrPath === 'object') {
    const result = validateStandardLibraryManifest(manifestOrPath);
    if (!result.ok) {
      return { ok: false, errors: result.errors, manifest: null };
    }
    return { ok: true, errors: [], manifest: result.manifest };
  }

  const manifestPath = manifestOrPath || DEFAULT_MANIFEST_PATH;
  const raw = readManifestFile(manifestPath);
  const result = validateStandardLibraryManifest(raw);
  if (!result.ok) {
    return { ok: false, errors: result.errors, manifest: null };
  }
  return { ok: true, errors: [], manifest: result.manifest };
}

async function syncStandardLibrary(client, options = {}) {
  const loaded = loadValidatedManifest(options.manifest || options.manifestPath);
  if (!loaded.ok) {
    return {
      ok: false,
      validationErrors: loaded.errors,
      summary: null,
      dryRun: !!options.dryRun,
    };
  }

  const desired = buildDesiredStateFromManifest(loaded.manifest);
  const current = await readCurrentCanonicalState(client);
  const plan = computeSyncPlan(desired, current);

  if (options.dryRun) {
    return {
      ok: true,
      validationErrors: [],
      summary: plan.summary,
      dryRun: true,
    };
  }

  await client.query('BEGIN');
  try {
    await applySyncPlan(client, desired, plan);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  return {
    ok: true,
    validationErrors: [],
    summary: plan.summary,
    dryRun: false,
  };
}

function formatSyncSummary(summary) {
  const lines = [
    `activities: inserts=${summary.activities.inserts} updates=${summary.activities.updates} unchanged=${summary.activities.unchanged} deprecated=${summary.activities.deprecated} conflicts=${summary.activities.conflicts}`,
    `schedules: inserts=${summary.schedules.inserts} updates=${summary.schedules.updates} unchanged=${summary.schedules.unchanged} deprecated=${summary.schedules.deprecated} conflicts=${summary.schedules.conflicts}`,
    `schedule_items: inserts=${summary.schedule_items.inserts} updates=${summary.schedule_items.updates} unchanged=${summary.schedule_items.unchanged} deprecated=${summary.schedule_items.deprecated} conflicts=${summary.schedule_items.conflicts}`,
    `totals: inserts=${summary.totals.inserts} updates=${summary.totals.updates} unchanged=${summary.totals.unchanged} deprecated=${summary.totals.deprecated} conflicts=${summary.totals.conflicts}`,
  ];
  return lines.join('\n');
}

module.exports = {
  ACTIVITY_COMPARE_FIELDS,
  SCHEDULE_COMPARE_FIELDS,
  SCHEDULE_ITEM_COMPARE_FIELDS,
  buildDesiredStateFromManifest,
  computeSyncPlan,
  readCurrentCanonicalState,
  syncStandardLibrary,
  loadValidatedManifest,
  formatSyncSummary,
  mapManifestActivity,
  mapManifestSchedule,
  scheduleItemKey,
};
