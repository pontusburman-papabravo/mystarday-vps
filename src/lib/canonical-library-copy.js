'use strict';

const { loadAndValidateStandardLibraryManifest } = require('./standard-library-manifest');
const { shouldCopySevenQuestions } = require('./standard-library-copy');

const CANONICAL_VARIANT_REQUIRED = 'CANONICAL_VARIANT_REQUIRED';
const CANONICAL_VARIANT_INVALID = 'CANONICAL_VARIANT_INVALID';
const CANONICAL_SOURCE_INVALID = 'CANONICAL_SOURCE_INVALID';
const CANONICAL_DUPLICATE_IDENTITY = 'CANONICAL_DUPLICATE_IDENTITY';
const CANONICAL_SCHEDULE_NOT_FOUND = 'CANONICAL_SCHEDULE_NOT_FOUND';

class CanonicalCopyError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'CanonicalCopyError';
    this.code = code;
    this.details = details;
  }
}

function pickLocaleString(nameI18n, locale, fallback = '') {
  if (!nameI18n || typeof nameI18n !== 'object') return fallback;
  if (locale === 'en-GB' || locale === 'en') {
    return nameI18n['en-GB'] || nameI18n.sv || fallback;
  }
  return nameI18n.sv || nameI18n['en-GB'] || fallback;
}

function parseVariantsJson(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseSubStepsJson(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function detectDuplicateCanonicalIds(rows) {
  const seen = new Map();
  const duplicates = new Set();
  for (const row of rows) {
    const value = row.canonical_id;
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    else seen.set(value, row.id);
  }
  return duplicates;
}

function buildManifestIndex(manifest) {
  const activities = new Map();
  const schedules = new Map();
  for (const activity of manifest.activities) {
    activities.set(activity.activity_id, activity);
  }
  for (const schedule of manifest.schedules) {
    schedules.set(schedule.schedule_id, schedule);
  }
  return { activities, schedules };
}

function shouldIncludeOptionalItem(item, optionalSelections) {
  if (!item.is_optional) return true;
  if (!optionalSelections || typeof optionalSelections !== 'object') {
    // Legacy-compatible default: include all optional items when caller omits selections.
    return true;
  }
  const key = item.activity_canonical_id;
  if (!(key in optionalSelections)) return true;
  return optionalSelections[key] === true;
}

function activityCanonicalId(row) {
  return row.activity_canonical_id || row.canonical_id || null;
}

function resolveActivitySnapshot(defaultActivity, { locale, variants }) {
  const canonicalId = activityCanonicalId(defaultActivity);
  const variantList = parseVariantsJson(defaultActivity.variants);
  const chosenVariantKey = variants?.[canonicalId] ?? itemVariantKey(defaultActivity);

  if (variantList.length > 0) {
    if (!chosenVariantKey) {
      throw new CanonicalCopyError(CANONICAL_VARIANT_REQUIRED, {
        activity_id: canonicalId,
        allowed_variants: variantList.map((v) => v.variant_key),
      });
    }
    const variant = variantList.find((v) => v.variant_key === chosenVariantKey);
    if (!variant) {
      throw new CanonicalCopyError(CANONICAL_VARIANT_INVALID, {
        activity_id: canonicalId,
        variant_key: chosenVariantKey,
        allowed_variants: variantList.map((v) => v.variant_key),
      });
    }
    return {
      name: pickLocaleString(variant.name_i18n, locale, variant.name || defaultActivity.name),
      subSteps: parseSubStepsJson(variant.sub_steps),
      chosenVariantKey,
    };
  }

  return {
    name: pickLocaleString(defaultActivity.name_i18n, locale, defaultActivity.name),
    subSteps: parseSubStepsJson(defaultActivity.sub_steps),
    chosenVariantKey: null,
  };
}

function itemVariantKey(defaultActivity) {
  return defaultActivity.item_variant_key ?? null;
}

function activityHasVariants(defaultActivity) {
  return parseVariantsJson(defaultActivity.variants).length > 0;
}

function buildActivityCacheKey(defaultActivity, { locale, variants }) {
  const defaultActivityId = defaultActivity.default_activity_id;
  if (!activityHasVariants(defaultActivity)) {
    return String(defaultActivityId);
  }
  const { chosenVariantKey } = resolveActivitySnapshot(defaultActivity, { locale, variants });
  return `${defaultActivityId}:${chosenVariantKey}`;
}

async function loadCanonicalScheduleSource(client, { defaultScheduleId, canonicalScheduleId }) {
  const params = [];
  let where = '';
  if (defaultScheduleId) {
    params.push(defaultScheduleId);
    where = 'ds.id = $1';
  } else if (canonicalScheduleId) {
    params.push(canonicalScheduleId);
    where = 'ds.canonical_id = $1';
  } else {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
      reason: 'defaultScheduleId or canonicalScheduleId required',
    });
  }

  const scheduleRes = await client.query(
    `SELECT ds.id, ds.name, ds.canonical_id, ds.deprecated, ds.name_i18n
     FROM default_schedule ds
     WHERE ${where}
     LIMIT 1`,
    params
  );
  if (scheduleRes.rows.length === 0) {
    throw new CanonicalCopyError(CANONICAL_SCHEDULE_NOT_FOUND, {
      defaultScheduleId: defaultScheduleId || null,
      canonicalScheduleId: canonicalScheduleId || null,
    });
  }
  return scheduleRes.rows[0];
}

async function loadCanonicalScheduleItems(client, defaultScheduleId) {
  const itemsRes = await client.query(
    `SELECT
       dsi.id,
       dsi.section,
       dsi.sort_order,
       dsi.start_time,
       dsi.end_time,
       dsi.is_optional,
       dsi.variant_key AS item_variant_key,
       dat.id AS default_activity_id,
       dat.canonical_id AS activity_canonical_id,
       dat.name,
       dat.name_i18n,
       dat.icon,
       dat.icon_key,
       dat.star_value,
       dat.duration_seconds,
       dat.sub_steps,
       dat.variants,
       dat.seven_questions,
       dat.deprecated AS activity_deprecated
     FROM default_schedule_item dsi
     INNER JOIN default_activity_template dat ON dat.id = dsi.default_activity_template_id
     WHERE dsi.default_schedule_id = $1
     ORDER BY CASE dsi.section
       WHEN 'morgon' THEN 0 WHEN 'dag' THEN 1 WHEN 'kvall' THEN 2 ELSE 3 END,
       dsi.sort_order ASC`,
    [defaultScheduleId]
  );
  return itemsRes.rows;
}

async function validateCanonicalScheduleSource(client, schedule, manifestIndex) {
  if (!schedule.canonical_id) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
      reason: 'schedule missing canonical_id',
      schedule_id: schedule.id,
    });
  }
  if (schedule.deprecated) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
      reason: 'schedule is deprecated',
      canonical_id: schedule.canonical_id,
    });
  }
  if (!manifestIndex.schedules.has(schedule.canonical_id)) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
      reason: 'schedule canonical_id not in v1.1 manifest',
      canonical_id: schedule.canonical_id,
    });
  }

  const activitiesRes = await client.query(
    `SELECT id, canonical_id FROM default_activity_template WHERE canonical_id IS NOT NULL`
  );
  const activityDupes = detectDuplicateCanonicalIds(activitiesRes.rows);
  if (activityDupes.size > 0) {
    throw new CanonicalCopyError(CANONICAL_DUPLICATE_IDENTITY, {
      duplicate_canonical_ids: [...activityDupes],
    });
  }

  const schedulesRes = await client.query(
    `SELECT id, canonical_id FROM default_schedule WHERE canonical_id IS NOT NULL`
  );
  const scheduleDupes = detectDuplicateCanonicalIds(schedulesRes.rows);
  if (scheduleDupes.size > 0) {
    throw new CanonicalCopyError(CANONICAL_DUPLICATE_IDENTITY, {
      duplicate_canonical_ids: [...scheduleDupes],
    });
  }
}

function validateScheduleItems(items, manifestIndex) {
  if (items.length === 0) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
      reason: 'schedule has no canonical-linked items',
    });
  }
  for (const item of items) {
    if (!item.activity_canonical_id) {
      throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
        reason: 'schedule item missing activity canonical_id',
        item_id: item.id,
      });
    }
    if (!manifestIndex.activities.has(item.activity_canonical_id)) {
      throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
        reason: 'activity canonical_id not in v1.1 manifest',
        canonical_id: item.activity_canonical_id,
      });
    }
    if (item.activity_deprecated) {
      throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
        reason: 'activity is deprecated',
        canonical_id: item.activity_canonical_id,
      });
    }
  }
}

async function findFamilyActivityByProvenance(client, familyId, defaultActivityId, canonicalId) {
  const res = await client.query(
    `SELECT id FROM activity_template
     WHERE family_id = $1
       AND source_default_activity_id = $2
       AND source_canonical_id = $3
     LIMIT 1`,
    [familyId, defaultActivityId, canonicalId]
  );
  return res.rows[0]?.id ?? null;
}

async function insertFamilyActivitySnapshot(client, {
  familyId,
  defaultActivity,
  locale,
  variants,
  sortOrder,
}) {
  const snapshot = resolveActivitySnapshot(defaultActivity, { locale, variants });
  const sevenQuestions = await shouldCopySevenQuestions(familyId, defaultActivity);

  const cols = [
    'family_id', 'name', 'icon', 'icon_key', 'star_value', 'duration_seconds',
    'is_favorite', 'sort_order', 'source',
    'source_default_activity_id', 'source_canonical_id',
  ];
  const vals = [
    familyId,
    snapshot.name,
    defaultActivity.icon,
    defaultActivity.icon_key,
    defaultActivity.star_value,
    defaultActivity.duration_seconds,
    false,
    sortOrder,
    'admin',
    defaultActivity.default_activity_id,
    activityCanonicalId(defaultActivity),
  ];

  if (sevenQuestions) {
    cols.push('seven_questions');
    vals.push(JSON.stringify(sevenQuestions));
  }

  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
  const inserted = await client.query(
    `INSERT INTO activity_template (${cols.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    vals
  );
  const templateId = inserted.rows[0].id;

  for (let i = 0; i < snapshot.subSteps.length; i++) {
    const step = snapshot.subSteps[i];
    await client.query(
      `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order, duration_seconds)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        templateId,
        pickLocaleString(step.name_i18n, locale, step.name),
        step.icon || null,
        step.sort_order ?? i,
        step.duration_seconds ?? null,
      ]
    );
  }

  return {
    templateId,
    snapshot,
    created: true,
  };
}

async function ensureFamilyActivityTemplate(client, {
  familyId,
  defaultActivity,
  locale,
  variants,
  sortOrder,
  activityCache,
}) {
  const cacheKey = buildActivityCacheKey(defaultActivity, { locale, variants });
  if (activityCache.has(cacheKey)) {
    return activityCache.get(cacheKey);
  }

  let templateId = null;
  let created = false;

  // Variant-bearing canonical activities may share provenance across variants.
  // Never reuse a persisted family snapshot across separate copy operations by
  // provenance alone — each resolved variant gets its own family snapshot.
  if (!activityHasVariants(defaultActivity)) {
    templateId = await findFamilyActivityByProvenance(
      client,
      familyId,
      defaultActivity.default_activity_id,
      activityCanonicalId(defaultActivity)
    );
  }

  if (!templateId) {
    const inserted = await insertFamilyActivitySnapshot(client, {
      familyId,
      defaultActivity,
      locale,
      variants,
      sortOrder,
    });
    templateId = inserted.templateId;
    created = inserted.created;
  }

  const entry = { templateId, created };
  activityCache.set(cacheKey, entry);
  return entry;
}

async function loadCanonicalDefaultActivity(client, canonicalId, manifestIndex) {
  const res = await client.query(
    `SELECT
       id AS default_activity_id,
       canonical_id AS activity_canonical_id,
       name, name_i18n, icon, icon_key, star_value, duration_seconds,
       sub_steps, variants, seven_questions, deprecated AS activity_deprecated
     FROM default_activity_template
     WHERE canonical_id = $1
     LIMIT 1`,
    [canonicalId]
  );
  if (res.rows.length === 0) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
      reason: 'activity not found',
      canonical_id: canonicalId,
    });
  }
  const row = res.rows[0];
  if (row.activity_deprecated) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
      reason: 'activity is deprecated',
      canonical_id: canonicalId,
    });
  }
  if (!manifestIndex.activities.has(canonicalId)) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, {
      reason: 'activity canonical_id not in v1.1 manifest',
      canonical_id: canonicalId,
    });
  }
  return row;
}

async function copyCanonicalDefaultActivityToFamily(client, options) {
  const {
    familyId,
    canonicalActivityId,
    locale = 'sv-SE',
    variants = null,
    sortOrder = 0,
    manifest = null,
  } = options;

  const resolvedManifest = manifest || loadAndValidateStandardLibraryManifest();
  const manifestIndex = buildManifestIndex(resolvedManifest);

  const activitiesRes = await client.query(
    `SELECT id, canonical_id FROM default_activity_template WHERE canonical_id IS NOT NULL`
  );
  const dupes = detectDuplicateCanonicalIds(activitiesRes.rows);
  if (dupes.size > 0) {
    throw new CanonicalCopyError(CANONICAL_DUPLICATE_IDENTITY, {
      duplicate_canonical_ids: [...dupes],
    });
  }

  const defaultActivity = await loadCanonicalDefaultActivity(
    client,
    canonicalActivityId,
    manifestIndex
  );
  resolveActivitySnapshot(defaultActivity, { locale, variants });

  await client.query('BEGIN');
  try {
    const activityCache = new Map();
    const { templateId, created } = await ensureFamilyActivityTemplate(client, {
      familyId,
      defaultActivity,
      locale,
      variants,
      sortOrder,
      activityCache,
    });
    await client.query('COMMIT');
    return { ok: true, templateId, created, canonicalActivityId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * Copy a canonical default_schedule into a child's weekly_schedule for selected days.
 *
 * Identity: canonical_id + default_activity_template.id only (never name).
 * Optional default when optionalSelections omitted: include all optional items (legacy UX).
 */
async function copyCanonicalScheduleToFamily(client, options) {
  const {
    familyId,
    childId,
    defaultScheduleId = null,
    canonicalScheduleId = null,
    days,
    overwrite = false,
    optionalSelections = null,
    variants = null,
    locale = 'sv-SE',
    manifest = null,
  } = options;

  if (!familyId || !childId) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, { reason: 'familyId and childId required' });
  }
  if (!Array.isArray(days) || days.length === 0) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, { reason: 'days[] required' });
  }

  const validDays = days.map((d) => parseInt(d, 10)).filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
  if (validDays.length === 0) {
    throw new CanonicalCopyError(CANONICAL_SOURCE_INVALID, { reason: 'no valid days' });
  }

  const resolvedManifest = manifest || loadAndValidateStandardLibraryManifest();
  const manifestIndex = buildManifestIndex(resolvedManifest);

  const schedule = await loadCanonicalScheduleSource(client, {
    defaultScheduleId,
    canonicalScheduleId,
  });
  await validateCanonicalScheduleSource(client, schedule, manifestIndex);

  const items = await loadCanonicalScheduleItems(client, schedule.id);
  validateScheduleItems(items, manifestIndex);

  const filteredItems = items.filter((item) => shouldIncludeOptionalItem(item, optionalSelections));

  // Validate variants before any writes.
  for (const item of filteredItems) {
    resolveActivitySnapshot(item, { locale, variants });
  }

  await client.query('BEGIN');
  try {
    const activityCache = new Map();
    let activitiesCreated = 0;

    for (const item of filteredItems) {
      const { created } = await ensureFamilyActivityTemplate(client, {
        familyId,
        defaultActivity: item,
        locale,
        variants,
        sortOrder: item.sort_order || 0,
        activityCache,
      });
      if (created) activitiesCreated += 1;
    }

    const filledDays = [];
    for (const dow of validDays) {
      let scheduleId;
      const existingSchedule = await client.query(
        'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
        [childId, dow]
      );

      if (existingSchedule.rows.length > 0) {
        if (!overwrite) continue;
        scheduleId = existingSchedule.rows[0].id;
        await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [scheduleId]);
      } else {
        const newSched = await client.query(
          'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
          [childId, dow, dow]
        );
        scheduleId = newSched.rows[0].id;
      }

      for (const item of filteredItems) {
        const cached = activityCache.get(buildActivityCacheKey(item, { locale, variants }));
        if (!cached?.templateId) continue;
        await client.query(
          `INSERT INTO weekly_schedule_item (
             weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            scheduleId,
            cached.templateId,
            item.start_time || null,
            item.end_time || null,
            item.sort_order || 0,
            item.section || 'dag',
          ]
        );
      }
      filledDays.push(dow);
    }

    await client.query('COMMIT');

    return {
      ok: true,
      scheduleCanonicalId: schedule.canonical_id,
      scheduleName: pickLocaleString(schedule.name_i18n, locale, schedule.name),
      filledDays,
      activitiesCreated,
      itemsCopied: filteredItems.length,
      activityTemplateIds: Object.fromEntries(
        [...activityCache.entries()].map(([cacheKey, entry]) => [cacheKey, entry.templateId])
      ),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

module.exports = {
  CANONICAL_VARIANT_REQUIRED,
  CANONICAL_VARIANT_INVALID,
  CANONICAL_SOURCE_INVALID,
  CANONICAL_DUPLICATE_IDENTITY,
  CANONICAL_SCHEDULE_NOT_FOUND,
  CanonicalCopyError,
  pickLocaleString,
  shouldIncludeOptionalItem,
  copyCanonicalScheduleToFamily,
  copyCanonicalDefaultActivityToFamily,
};
