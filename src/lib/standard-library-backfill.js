'use strict';

const {
  loadLegacyMap,
  activityRowMatches,
  scheduleRowMatches,
  findMatchingRows,
} = require('./standard-library-legacy-map');

function createEmptyActivityBucket() {
  return {
    total_legacy: 0,
    exact_mapped: 0,
    explicit_mapped: 0,
    teacch_overlays: 0,
    ambiguous: 0,
    unmapped: 0,
    already_canonical: 0,
    conflicts: 0,
  };
}

function createEmptyScheduleBucket() {
  return {
    total_legacy: 0,
    mapped: 0,
    ambiguous: 0,
    unmapped: 0,
    already_canonical: 0,
    conflicts: 0,
  };
}

function detectDuplicateCanonicalIds(rows, field = 'canonical_id') {
  const seen = new Map();
  const duplicates = new Set();

  for (const row of rows) {
    const value = row[field];
    if (!value) continue;
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.set(value, row.id);
    }
  }

  return {
    duplicates: [...duplicates],
    hasDuplicates: duplicates.size > 0,
  };
}

async function readLegacyDefaultLibraryState(client) {
  const activitiesRes = await client.query(`
    SELECT
      id, name, icon, star_value, sort_order, sub_steps, category_name,
      schema_type, template_group, seven_questions, package_component,
      canonical_id, deprecated
    FROM default_activity_template
    ORDER BY sort_order ASC, name ASC
  `);
  const schedulesRes = await client.query(`
    SELECT id, name, description, icon, sort_order, canonical_id, deprecated
    FROM default_schedule
    ORDER BY sort_order ASC, name ASC
  `);
  const scheduleItemsRes = await client.query(`
    SELECT
      dsi.id,
      dsi.default_schedule_id,
      dsi.default_activity_template_id,
      dsi.name,
      dsi.section,
      dsi.sort_order,
      ds.name AS schedule_name,
      ds.canonical_id AS schedule_canonical_id
    FROM default_schedule_item dsi
    INNER JOIN default_schedule ds ON ds.id = dsi.default_schedule_id
    ORDER BY ds.sort_order ASC, dsi.sort_order ASC
  `);
  const rewardsRes = await client.query(`
    SELECT id, name FROM default_reward ORDER BY sort_order ASC, name ASC
  `);

  return {
    activities: activitiesRes.rows,
    schedules: schedulesRes.rows,
    scheduleItems: scheduleItemsRes.rows,
    rewards: rewardsRes.rows,
  };
}

function buildActivityAssignments(legacyActivities, map, existingCanonicalRows) {
  const bucket = createEmptyActivityBucket();
  const mappings = [];
  const blockingErrors = [];
  const assignedCanonical = new Map();
  const claimedLegacyIds = new Set();

  const legacyRows = legacyActivities.filter((row) => !row.canonical_id);
  const alreadyCanonical = legacyActivities.filter((row) => row.canonical_id);
  bucket.total_legacy = legacyRows.length;
  bucket.already_canonical = alreadyCanonical.length;

  const existingDupes = detectDuplicateCanonicalIds(existingCanonicalRows);
  if (existingDupes.hasDuplicates) {
    for (const canonicalId of existingDupes.duplicates) {
      blockingErrors.push(`duplicate existing activity canonical_id: ${canonicalId}`);
      bucket.conflicts += 1;
    }
  }

  for (const entry of map.activities) {
    if (entry.classification === 'TEACCH_OVERLAY') {
      const matches = findMatchingRows(legacyRows, entry.match, activityRowMatches)
        .filter((row) => !claimedLegacyIds.has(row.id));
      for (const row of matches) {
        claimedLegacyIds.add(row.id);
        bucket.teacch_overlays += 1;
        mappings.push({
          legacy_id: row.id,
          legacy_name: row.name,
          canonical_id: entry.canonical_id ?? null,
          classification: 'TEACCH_OVERLAY',
          treatment: entry.treatment || 'preserve_legacy_row_no_canonical_assignment',
          reason: entry.reason || 'TEACCH overlay preserved without canonical assignment',
          write: null,
        });
      }
      continue;
    }

    const matches = findMatchingRows(legacyRows, entry.match, activityRowMatches)
      .filter((row) => !claimedLegacyIds.has(row.id));

    if (matches.length > 1) {
      bucket.ambiguous += matches.length;
      for (const row of matches) {
        mappings.push({
          legacy_id: row.id,
          legacy_name: row.name,
          canonical_id: entry.canonical_id ?? null,
          classification: 'AMBIGUOUS',
          reason: `Multiple legacy rows match explicit rule for ${entry.canonical_id}`,
          write: null,
        });
        blockingErrors.push(`ambiguous activity mapping for legacy_id ${row.id} (${row.name})`);
      }
      continue;
    }

    if (matches.length === 0) continue;

    const row = matches[0];
    claimedLegacyIds.add(row.id);
    const canonicalId = entry.canonical_id;
    if (!canonicalId) {
      bucket.unmapped += 1;
      mappings.push({
        legacy_id: row.id,
        legacy_name: row.name,
        canonical_id: null,
        classification: 'UNMAPPED',
        reason: 'Explicit rule without canonical target',
        write: null,
      });
      continue;
    }

    if (assignedCanonical.has(canonicalId)) {
      bucket.conflicts += 1;
      mappings.push({
        legacy_id: row.id,
        legacy_name: row.name,
        canonical_id: canonicalId,
        classification: 'AMBIGUOUS',
        reason: `canonical_id ${canonicalId} already assigned to legacy_id ${assignedCanonical.get(canonicalId)}`,
        write: null,
      });
      blockingErrors.push(`conflicting canonical_id assignment: ${canonicalId}`);
      continue;
    }

    if (existingCanonicalRows.some((existing) => existing.canonical_id === canonicalId)) {
      bucket.conflicts += 1;
      mappings.push({
        legacy_id: row.id,
        legacy_name: row.name,
        canonical_id: canonicalId,
        classification: 'AMBIGUOUS',
        reason: `canonical_id ${canonicalId} already exists on another row`,
        write: null,
      });
      blockingErrors.push(`canonical_id already present in database: ${canonicalId}`);
      continue;
    }

    assignedCanonical.set(canonicalId, row.id);
    if (entry.classification === 'EXACT') bucket.exact_mapped += 1;
    else bucket.explicit_mapped += 1;

    mappings.push({
      legacy_id: row.id,
      legacy_name: row.name,
      canonical_id: canonicalId,
      classification: entry.classification,
      reason: entry.reason || null,
      write: {
        table: 'default_activity_template',
        id: row.id,
        canonical_id: canonicalId,
        deprecated: false,
      },
    });
  }

  for (const row of legacyRows) {
    if (claimedLegacyIds.has(row.id)) continue;
    bucket.unmapped += 1;
    mappings.push({
      legacy_id: row.id,
      legacy_name: row.name,
      canonical_id: null,
      classification: 'UNMAPPED',
      reason: 'No explicit legacy map entry',
      write: null,
    });
  }

  return { bucket, mappings, blockingErrors };
}

function buildScheduleAssignments(legacySchedules, map, existingCanonicalRows) {
  const bucket = createEmptyScheduleBucket();
  const mappings = [];
  const blockingErrors = [];
  const assignedCanonical = new Map();
  const claimedLegacyIds = new Set();

  const legacyRows = legacySchedules.filter((row) => !row.canonical_id);
  const alreadyCanonical = legacySchedules.filter((row) => row.canonical_id);
  bucket.total_legacy = legacyRows.length;
  bucket.already_canonical = alreadyCanonical.length;

  const existingDupes = detectDuplicateCanonicalIds(existingCanonicalRows);
  if (existingDupes.hasDuplicates) {
    for (const canonicalId of existingDupes.duplicates) {
      blockingErrors.push(`duplicate existing schedule canonical_id: ${canonicalId}`);
      bucket.conflicts += 1;
    }
  }

  for (const entry of map.schedules) {
    const matches = findMatchingRows(legacyRows, entry.match, scheduleRowMatches)
      .filter((row) => !claimedLegacyIds.has(row.id));

    if (matches.length > 1) {
      bucket.ambiguous += matches.length;
      for (const row of matches) {
        mappings.push({
          legacy_id: row.id,
          legacy_name: row.name,
          canonical_id: entry.canonical_schedule_id,
          classification: 'AMBIGUOUS',
          reason: `Multiple legacy schedules match ${entry.canonical_schedule_id}`,
          write: null,
        });
        blockingErrors.push(`ambiguous schedule mapping for legacy_id ${row.id} (${row.name})`);
      }
      continue;
    }

    if (matches.length === 0) continue;

    const row = matches[0];
    claimedLegacyIds.add(row.id);
    const canonicalId = entry.canonical_schedule_id;

    if (assignedCanonical.has(canonicalId)) {
      bucket.conflicts += 1;
      mappings.push({
        legacy_id: row.id,
        legacy_name: row.name,
        canonical_id: canonicalId,
        classification: 'AMBIGUOUS',
        reason: `canonical schedule ${canonicalId} already assigned`,
        write: null,
      });
      blockingErrors.push(`conflicting schedule canonical_id assignment: ${canonicalId}`);
      continue;
    }

    if (existingCanonicalRows.some((existing) => existing.canonical_id === canonicalId)) {
      bucket.conflicts += 1;
      mappings.push({
        legacy_id: row.id,
        legacy_name: row.name,
        canonical_id: canonicalId,
        classification: 'AMBIGUOUS',
        reason: `canonical schedule ${canonicalId} already exists`,
        write: null,
      });
      blockingErrors.push(`schedule canonical_id already present: ${canonicalId}`);
      continue;
    }

    assignedCanonical.set(canonicalId, row.id);
    bucket.mapped += 1;
    mappings.push({
      legacy_id: row.id,
      legacy_name: row.name,
      canonical_id: canonicalId,
      classification: entry.classification,
      reason: entry.reason || null,
      write: {
        table: 'default_schedule',
        id: row.id,
        canonical_id: canonicalId,
        deprecated: entry.classification === 'SAFE_EXPLICIT_MAPPING',
      },
    });
  }

  for (const row of legacyRows) {
    if (claimedLegacyIds.has(row.id)) continue;
    bucket.unmapped += 1;
    mappings.push({
      legacy_id: row.id,
      legacy_name: row.name,
      canonical_id: null,
      classification: 'UNMAPPED',
      reason: 'No explicit legacy map entry',
      write: null,
    });
  }

  return { bucket, mappings, blockingErrors };
}

function summarizeScheduleItems(scheduleItems) {
  const bySchedule = new Map();
  for (const item of scheduleItems) {
    const key = item.schedule_name;
    if (!bySchedule.has(key)) {
      bySchedule.set(key, {
        schedule_name: key,
        schedule_canonical_id: item.schedule_canonical_id,
        item_count: 0,
        mapping_status: item.schedule_canonical_id ? 'canonical' : 'legacy',
      });
    }
    bySchedule.get(key).item_count += 1;
  }
  return [...bySchedule.values()];
}

function computeBackfillPlan(state, map) {
  const existingCanonicalActivities = state.activities.filter((row) => row.canonical_id);
  const existingCanonicalSchedules = state.schedules.filter((row) => row.canonical_id);

  const activityPlan = buildActivityAssignments(
    state.activities,
    map,
    existingCanonicalActivities
  );
  const schedulePlan = buildScheduleAssignments(
    state.schedules,
    map,
    existingCanonicalSchedules
  );

  const blockingErrors = [
    ...activityPlan.blockingErrors,
    ...schedulePlan.blockingErrors,
  ];

  const writes = [
    ...activityPlan.mappings.filter((m) => m.write),
    ...schedulePlan.mappings.filter((m) => m.write),
  ];

  return {
    ok: blockingErrors.length === 0,
    blockingErrors,
    activities: activityPlan.bucket,
    schedules: schedulePlan.bucket,
    scheduleItems: summarizeScheduleItems(state.scheduleItems),
    mappings: {
      activities: activityPlan.mappings,
      schedules: schedulePlan.mappings,
    },
    writes,
    rewards: {
      total: state.rewards.length,
      touched: 0,
    },
    constraints: evaluateConstraintReadiness(state, writes),
  };
}

function evaluateConstraintReadiness(state, writes) {
  const projectedActivities = state.activities.map((row) => {
    const write = writes.find((w) => w.table === 'default_activity_template' && w.id === row.id);
    if (!write) return row;
    return { ...row, canonical_id: write.canonical_id };
  });
  const projectedSchedules = state.schedules.map((row) => {
    const write = writes.find((w) => w.table === 'default_schedule' && w.id === row.id);
    if (!write) return row;
    return { ...row, canonical_id: write.canonical_id };
  });

  const activityDupes = detectDuplicateCanonicalIds(
    projectedActivities.filter((row) => row.canonical_id)
  );
  const scheduleDupes = detectDuplicateCanonicalIds(
    projectedSchedules.filter((row) => row.canonical_id)
  );

  const legacyWithoutCanonical = projectedActivities.filter((row) => !row.canonical_id).length
    + projectedSchedules.filter((row) => !row.canonical_id).length;

  return {
    safe_for_future_unique: !activityDupes.hasDuplicates && !scheduleDupes.hasDuplicates
      ? 'YES'
      : 'NO',
    safe_for_future_not_null: legacyWithoutCanonical === 0 ? 'YES' : 'NO',
    rationale: legacyWithoutCanonical > 0
      ? 'Legacy rows without canonical_id remain intentionally during rollout'
      : 'All default rows would carry canonical_id after apply',
  };
}

async function applyBackfillPlan(client, plan) {
  if (!plan.ok) {
    throw new Error(`Backfill plan blocked: ${plan.blockingErrors.join('; ')}`);
  }

  await client.query('BEGIN');
  try {
    for (const write of plan.writes) {
      if (write.table === 'default_activity_template') {
        await client.query(
          `UPDATE default_activity_template
           SET canonical_id = $2, deprecated = $3, updated_at = NOW()
           WHERE id = $1`,
          [write.id, write.canonical_id, write.deprecated ?? false]
        );
      } else if (write.table === 'default_schedule') {
        await client.query(
          `UPDATE default_schedule
           SET canonical_id = $2, deprecated = $3, updated_at = NOW()
           WHERE id = $1`,
          [write.id, write.canonical_id, write.deprecated ?? false]
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function backfillStandardLibrary(client, options = {}) {
  const map = options.map || loadLegacyMap(options.mapPath);
  const state = await readLegacyDefaultLibraryState(client);
  const plan = computeBackfillPlan(state, map);

  if (!plan.ok) {
    return {
      ok: false,
      dryRun: !!options.dryRun,
      plan,
      blockingErrors: plan.blockingErrors,
    };
  }

  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      plan,
      blockingErrors: [],
    };
  }

  await applyBackfillPlan(client, plan);
  return {
    ok: true,
    dryRun: false,
    plan,
    blockingErrors: [],
  };
}

function formatBackfillReport(result) {
  const { plan } = result;
  const lines = [
    `activities: total_legacy=${plan.activities.total_legacy} exact=${plan.activities.exact_mapped} explicit=${plan.activities.explicit_mapped} teacch=${plan.activities.teacch_overlays} ambiguous=${plan.activities.ambiguous} unmapped=${plan.activities.unmapped} already_canonical=${plan.activities.already_canonical} conflicts=${plan.activities.conflicts}`,
    `schedules: total_legacy=${plan.schedules.total_legacy} mapped=${plan.schedules.mapped} ambiguous=${plan.schedules.ambiguous} unmapped=${plan.schedules.unmapped} already_canonical=${plan.schedules.already_canonical} conflicts=${plan.schedules.conflicts}`,
    `rewards: total=${plan.rewards.total} touched=${plan.rewards.touched}`,
    `writes=${plan.writes.length}`,
    `safe_for_future_unique=${plan.constraints.safe_for_future_unique}`,
    `safe_for_future_not_null=${plan.constraints.safe_for_future_not_null}`,
  ];
  return lines.join('\n');
}

module.exports = {
  createEmptyActivityBucket,
  createEmptyScheduleBucket,
  detectDuplicateCanonicalIds,
  readLegacyDefaultLibraryState,
  computeBackfillPlan,
  applyBackfillPlan,
  backfillStandardLibrary,
  formatBackfillReport,
  buildActivityAssignments,
  buildScheduleAssignments,
};
