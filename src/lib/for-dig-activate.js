'use strict';

/**
 * Server-side activation orchestrator for För dig goals.
 * Reuses standard-library copy logic patterns.
 */

const db = require('./db');
const { getGoalBySlug } = require('./for-dig-config');
const { broadcast } = require('./sse-broadcast');
const { syncDailyLogWithSchedule, syncDailyLogsForTemplateChange } = require('./daily-log-generator');
const {
  mergeScheduleSection,
  normalizeSection,
  belongsToSection,
} = require('./merge-schedule-section');
const {
  materializeStandardScheduleActivities,
  copyStandardActivityToFamily,
  familyHasCanonicalActivity,
  LEGACY_SCHEDULE_NAME_TO_CANONICAL,
  NON_INTERACTIVE_AFTER_SCHOOL_VARIANT,
  CanonicalCopyError,
  CANONICAL_DUPLICATE_IDENTITY,
  CANONICAL_SOURCE_INVALID,
} = require('./canonical-library-runtime');
const { pickLocaleString, previewCanonicalScheduleSection } = require('./canonical-library-copy');
const { getFamilyLocale } = require('./onboarding-locale');

/** Explicit legacy bridge: För dig goal display labels → canonical activity_id */
const FOR_DIG_LEGACY_ACTIVITY_TO_CANONICAL = Object.freeze({
  'klä på sig': 'get_dressed',
  'borsta tänderna (morgon)': 'brush_teeth',
  'borsta tänder': 'brush_teeth',
  'äta frukost': 'breakfast',
  'frukost': 'breakfast',
  'packa väska': 'pack_school_bag',
  'packa skolväskan': 'pack_school_bag',
  'läxor': 'homework',
});

function resolveLegacyScheduleNameCanonical(scheduleName) {
  if (!scheduleName) return null;
  if (LEGACY_SCHEDULE_NAME_TO_CANONICAL[scheduleName]) {
    return LEGACY_SCHEDULE_NAME_TO_CANONICAL[scheduleName];
  }
  const wanted = normalizeName(scheduleName);
  for (const [key, value] of Object.entries(LEGACY_SCHEDULE_NAME_TO_CANONICAL)) {
    if (normalizeName(key) === wanted) return value;
  }
  return null;
}

function lookupStarOverride(starOverrides, name) {
  if (!starOverrides || typeof starOverrides !== 'object') return null;
  const wanted = normalizeName(name);
  for (const [key, value] of Object.entries(starOverrides)) {
    if (normalizeName(key) !== wanted) continue;
    const stars = parseInt(value, 10);
    if (stars >= 1 && stars <= 5) return stars;
  }
  return null;
}

function starValueForItem(item, starOverrides) {
  const override = lookupStarOverride(starOverrides, item.name);
  if (override != null) return override;
  return parseInt(item.star_value, 10) || 1;
}

function hasStarOverrides(starOverrides) {
  return starOverrides && typeof starOverrides === 'object' && Object.keys(starOverrides).length > 0;
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function findByNames(items, names) {
  const byNorm = new Map(items.map((item) => [normalizeName(item.name), item]));
  const matched = [];
  for (const name of names || []) {
    const item = byNorm.get(normalizeName(name));
    if (item) matched.push(item);
  }
  return matched;
}

function libraryUnavailableError(context) {
  const err = new Error(
    'Materialet för detta mål är inte tillgängligt just nu. Försök igen senare eller kontakta oss om problemet kvarstår.'
  );
  err.status = 503;
  err.context = context;
  return err;
}

const SECTION_LABELS = {
  morgon: 'Morgon',
  dag: 'Dag',
  kvall: 'Kväll',
};

const WEEKDAY_INDICES = [1, 2, 3, 4, 5];

function formatDaysLabel(days) {
  const sorted = [...days].map((d) => parseInt(d, 10)).filter((d) => !Number.isNaN(d)).sort((a, b) => a - b);
  if (sorted.length === 7) return 'alla dagar';
  if (sorted.length === 5 && WEEKDAY_INDICES.every((d, i) => sorted[i] === d)) return 'vardagar';
  const short = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
  return sorted.map((d) => short[d]).join(', ');
}

function sectionLabelForGoal(goal, preview) {
  if (goal.scheduleSectionLabel) return goal.scheduleSectionLabel;
  if (goal.scheduleSection && SECTION_LABELS[goal.scheduleSection]) {
    return SECTION_LABELS[goal.scheduleSection];
  }
  if (preview?.type === 'schedule' && preview.items?.length > 0) {
    return 'Rutin';
  }
  return SECTION_LABELS.dag;
}

function resolveScheduleSection(goal) {
  if (goal.scheduleSection) return normalizeSection(goal.scheduleSection);
  const bySlug = {
    'trygga-kvallar': 'kvall',
    'bra-morgnar': 'morgon',
    skolansvar: 'dag',
  };
  return bySlug[goal.slug] || 'dag';
}

function sectionActivityLabel(goal) {
  const label = sectionLabelForGoal(goal).toLowerCase();
  if (label === 'kväll') return 'kvällsaktiviteterna';
  if (label === 'morgon') return 'morgonaktiviteterna';
  if (label === 'skola') return 'skolaktiviteterna';
  return `${label}saktiviteterna`;
}

function getGoalCtaLabel(goal) {
  if (goal.confirmCtaLabel) return goal.confirmCtaLabel;
  if (goal.scheduleName) {
    return `Lägg in ${scheduleActivatableLabel(goal).toLowerCase()}`;
  }
  if (goal.activityNames && goal.activityNames.length > 0) {
    return 'Lägg till aktiviteterna';
  }
  if (goal.rewardNames && goal.rewardNames.length > 0) {
    return 'Lägg till belöningarna';
  }
  return goal.activateLabel || 'Aktivera';
}

function buildPromiseLine(goal, childNames) {
  const who = childNames.length === 1 ? childNames[0] : 'barnen';
  if (goal.rewardNames && goal.rewardNames.length > 0) {
    return 'Belöningarna är klara på mindre än en minut.';
  }
  if (goal.scheduleName) {
    return `${scheduleActivatableLabel(goal)} för ${who} blir klar på mindre än en minut.`;
  }
  return `Aktiviteterna för ${who} är klara på mindre än en minut.`;
}

async function childHasItemsInSection(childId, days, targetSection) {
  const validDays = days.map((d) => parseInt(d, 10)).filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
  if (validDays.length === 0) return false;
  const section = normalizeSection(targetSection);
  const result = await db.query(
    `SELECT 1 FROM weekly_schedule_item wsi
     JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
     WHERE ws.child_id = $1 AND ws.day_of_week = ANY($2::int[])
       AND LOWER(COALESCE(NULLIF(wsi.section, ''), 'dag')) = $3
     LIMIT 1`,
    [childId, validDays, section]
  );
  return result.rows.length > 0;
}

function itemCountForPlan(goal, preview) {
  const previewCount = (preview?.items || []).length;
  if (previewCount > 0) return previewCount;
  if (goal.activityNames) return goal.activityNames.length;
  if (goal.rewardNames) return goal.rewardNames.length;
  return 0;
}

async function buildActivationPlanPreview({ parentId, childIds, goalSlug }) {
  const goal = getGoalBySlug(goalSlug);
  if (!goal) return null;

  const ids = Array.isArray(childIds) ? childIds.filter(Boolean) : [];
  if (ids.length === 0) {
    const err = new Error('Minst ett barn krävs.');
    err.status = 400;
    throw err;
  }

  const verifiedChildren = [];
  for (const id of ids) {
    const child = await verifyChildAccess(parentId, id);
    if (!child) {
      const err = new Error('Du har inte åtkomst till ett av valda barn.');
      err.status = 403;
      throw err;
    }
    verifiedChildren.push(child);
  }

  const locale = await getFamilyLocale(verifiedChildren[0].family_id);
  const preview = await getGoalActivationPreview(goalSlug, { locale });
  const childNames = verifiedChildren.map((c) => c.name);
  const headline = goal.headline || goal.title;
  const promise = buildPromiseLine(goal, childNames);
  const decisions = [];
  const itemCount = itemCountForPlan(goal, preview);

  if (goal.scheduleName) {
    const days = goal.scheduleDays || WEEKDAY_INDICES;
    const targetSection = resolveScheduleSection(goal);
    let willReplace = false;
    for (const child of verifiedChildren) {
      if (await childHasItemsInSection(child.id, days, targetSection)) {
        willReplace = true;
        break;
      }
    }
    const sectionLabel = sectionLabelForGoal(goal, preview);
    if (willReplace) {
      decisions.push({
        signal: 'replace',
        text: `Ersätter ${sectionActivityLabel(goal)} på valda dagar`,
      });
    } else {
      decisions.push({
        signal: 'add',
        text: `Lägger in rutinen under ${sectionLabel}`,
      });
    }
    decisions.push({ signal: 'keep', text: 'Övriga sektioner behålls' });
    decisions.push({ signal: 'safe', text: 'Du kan ändra efteråt' });
  } else if (goal.activityNames && goal.activityNames.length > 0) {
    const countText = itemCount === 1 ? '1 aktivitet' : `${itemCount} aktiviteter`;
    decisions.push({ signal: 'add', text: `Lägger till ${countText} i schemat` });
    decisions.push({ signal: 'keep', text: 'Befintligt schema behålls' });
    decisions.push({ signal: 'safe', text: 'Du kan ändra efteråt' });
  } else if (goal.rewardNames && goal.rewardNames.length > 0) {
    const countText = itemCount === 1 ? '1 belöning' : `${itemCount} belöningar`;
    decisions.push({ signal: 'add', text: `Lägger till ${countText} i Skattkammaren` });
    decisions.push({ signal: 'safe', text: 'Du kan ändra efteråt' });
  }

  return {
    headline,
    promise,
    decisions: decisions.slice(0, 3),
    cta_label: getGoalCtaLabel(goal),
    child_names: childNames,
    details: {
      type: preview?.type || 'none',
      items: preview?.items || [],
      days_label: goal.scheduleDays ? formatDaysLabel(goal.scheduleDays) : null,
      section_label: sectionLabelForGoal(goal, preview),
      item_count: itemCount,
    },
    library_available: itemCount > 0 || preview?.type === 'none',
  };
}

function scheduleActivatableLabel(goal) {
  if (goal.activateLabel && /^aktivera\s+/i.test(goal.activateLabel)) {
    const rest = goal.activateLabel.replace(/^aktivera\s+/i, '');
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return goal.title;
}

function activityCountLabel(count) {
  if (count === 1) return '1 aktivitet';
  return `${count} aktiviteter`;
}

function rewardCountLabel(count) {
  if (count === 1) return '1 belöning';
  return `${count} belöningar`;
}

function buildActivationSuccessMessage(goal, result) {
  const name = result.child_name;
  if (result.schedule) {
    return `${scheduleActivatableLabel(goal)} är nu igång för ${name}!`;
  }

  if (result.activities) {
    const { copied, matched } = result.activities;
    if (result.activitySchedule?.filledDays?.length) {
      const names = result.child_names || [name];
      const who = names.length === 1 ? `${names[0]}s` : 'barnens';
      if (copied > 0) {
        return `${activityCountLabel(copied)} tillagda i ${who} schema!`;
      }
      return `Aktiviteterna finns nu i ${who} schema.`;
    }
    if (copied > 0) {
      return `${activityCountLabel(copied)} tillagda i biblioteket. Lägg till dem i ${name}s schema när ni är redo.`;
    }
    if (matched > 0) {
      return `Aktiviteterna finns redan i biblioteket. Lägg till dem i ${name}s schema när ni vill.`;
    }
  }

  if (result.rewards) {
    const { copied, matched } = result.rewards;
    if (copied > 0) {
      return `${rewardCountLabel(copied)} tillagda i Skattkammaren!`;
    }
    if (matched > 0) {
      return 'Belöningarna finns redan i Skattkammaren.';
    }
  }

  return `Material för ${goal.title} finns nu i biblioteket.`;
}

function buildActivationNextStep(result, childId) {
  if (!childId) return null;

  if (result.schedule || result.activitySchedule) {
    return {
      label: 'Visa schema',
      href: `/schedule?child=${childId}`,
      hint: result.activitySchedule
        ? 'Aktiviteterna är inlagda i veckoschemat.'
        : 'Rutinen är redan inlagd i veckoschemat.',
    };
  }

  if (result.activities) {
    return {
      label: 'Lägg till i schema',
      href: `/schedule?child=${childId}`,
      hint: 'Aktiviteterna finns i biblioteket — lägg till dem i schemat när ni vill börja.',
    };
  }

  if (result.rewards) {
    return {
      label: 'Öppna Skattkammaren',
      href: '/skattkammaren',
      hint: 'Belöningarna är redo att användas.',
    };
  }

  return null;
}

async function verifyChildAccess(parentId, childId) {
  const result = await db.query(
    `SELECT c.id, c.family_id, c.name
     FROM child c
     JOIN parent_child pc ON pc.child_id = c.id AND pc.parent_id = $1 AND pc.revoked_at IS NULL
     WHERE c.id = $2`,
    [parentId, childId]
  );
  return result.rows[0] || null;
}

async function copySchedule(client, familyId, childId, scheduleName, days, targetSection, goalSlug, starOverrides) {
  const section = normalizeSection(targetSection);
  const canonicalScheduleId = resolveLegacyScheduleNameCanonical(scheduleName);
  if (!canonicalScheduleId) {
    throw libraryUnavailableError(`schedule:${scheduleName}`);
  }

  const locale = await getFamilyLocale(familyId);
  const prepared = await materializeStandardScheduleActivities(client, {
    familyId,
    canonicalScheduleId,
    locale,
    callerVariants: canonicalScheduleId === 'school_weekday'
      ? { after_school: NON_INTERACTIVE_AFTER_SCHOOL_VARIANT }
      : null,
    allowNonInteractiveAfterSchoolDefault: canonicalScheduleId === 'school_weekday',
  });

  const sectionItems = prepared.filteredItems.filter((item) => normalizeSection(item.section) === section);
  if (sectionItems.length === 0) {
    throw libraryUnavailableError(`schedule_section_empty:${scheduleName}:${section}`);
  }

  const validDays = days.map((d) => parseInt(d, 10)).filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
  if (validDays.length === 0) {
    const err = new Error('Inga giltiga dagar angivna.');
    err.status = 400;
    throw err;
  }

  const activityTemplateMap = {};
  const touchedTemplateIds = [];
  for (const item of sectionItems) {
    const templateId = prepared.templateIdForItem(item);
    if (!templateId) continue;
    const stars = starValueForItem(item, starOverrides);
    activityTemplateMap[item.name] = templateId;

    if (goalSlug) {
      const updated = await client.query(
        `UPDATE activity_template
         SET for_dig_goal_slug = $1,
             star_value = CASE WHEN $4::boolean THEN $5 ELSE star_value END
         WHERE id = $2 AND family_id = $3
         RETURNING id`,
        [goalSlug, templateId, familyId, hasStarOverrides(starOverrides), stars]
      );
      if (updated.rows[0]) touchedTemplateIds.push(updated.rows[0].id);
    } else {
      touchedTemplateIds.push(templateId);
    }
  }

  const filledDays = [];
  for (const dow of validDays) {
    let scheduleRowId;
    const existingSchedule = await client.query(
      'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
      [childId, dow]
    );

    if (existingSchedule.rows.length > 0) {
      scheduleRowId = existingSchedule.rows[0].id;
    } else {
      const newSched = await client.query(
        'INSERT INTO weekly_schedule (child_id, day_of_week, name, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
        [childId, dow, scheduleName, dow]
      );
      scheduleRowId = newSched.rows[0].id;
    }

    const existingItemsResult = await client.query(
      `SELECT activity_template_id, section, sort_order, start_time, end_time
       FROM weekly_schedule_item WHERE weekly_schedule_id = $1`,
      [scheduleRowId]
    );
    const existingItems = existingItemsResult.rows.map((row) => ({
      activityTemplateId: row.activity_template_id,
      section: row.section,
      sortOrder: row.sort_order,
      startTime: row.start_time,
      endTime: row.end_time,
    }));

    const packageItems = sectionItems.map((item) => ({
      activityTemplateId: activityTemplateMap[item.name],
      section,
      sortOrder: item.sort_order ?? 0,
      startTime: item.start_time || null,
      endTime: item.end_time || null,
    })).filter((item) => item.activityTemplateId);

    const mergeResult = mergeScheduleSection({
      existingItems,
      targetSection: section,
      packageItems,
    });

    if (mergeResult.emptyPackage) {
      throw libraryUnavailableError(`schedule_section_empty:${scheduleName}:${section}`);
    }

    if (mergeResult.mode === 'replace') {
      await client.query(
        `DELETE FROM weekly_schedule_item
         WHERE weekly_schedule_id = $1
           AND LOWER(COALESCE(NULLIF(section, ''), 'dag')) = $2`,
        [scheduleRowId, section]
      );
    }

    const existingInSectionIds = new Set(
      existingItems
        .filter((item) => belongsToSection(item, section))
        .map((item) => item.activityTemplateId)
    );
    const toInsert = mergeResult.items
      .filter((item) => belongsToSection(item, section))
      .filter((item) => mergeResult.mode === 'replace' || !existingInSectionIds.has(item.activityTemplateId));

    for (const item of toInsert) {
      await client.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [scheduleRowId, item.activityTemplateId, item.startTime, item.endTime, item.sortOrder ?? 0, section]
      );
    }

    if (toInsert.length > 0 || mergeResult.mode === 'replace') {
      filledDays.push(dow);
    }
  }

  return {
    scheduleId: prepared.schedule?.id ?? null,
    scheduleName,
    filledDays,
    activityTemplateMap,
    touchedTemplateIds,
    targetSection: section,
  };
}

async function copyActivities(client, familyId, activityNames, goalSlug, starOverrides) {
  const locale = await getFamilyLocale(familyId);
  const canonicalNames = [];
  const legacyNames = [];

  for (const name of activityNames || []) {
    const canonicalId = FOR_DIG_LEGACY_ACTIVITY_TO_CANONICAL[normalizeName(name)];
    if (canonicalId) {
      canonicalNames.push({ name, canonicalId });
    } else {
      legacyNames.push(name);
    }
  }

  const matched = [];
  const touchedTemplateIds = [];
  let copied = 0;
  let skipped = 0;

  const maxSort = await client.query(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM activity_template WHERE family_id = $1`,
    [familyId]
  );
  let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

  for (const entry of canonicalNames) {
    const defaults = await client.query(
      `SELECT id, name, icon, star_value, sub_steps, canonical_id
       FROM default_activity_template WHERE canonical_id = $1 LIMIT 1`,
      [entry.canonicalId]
    );
    if (defaults.rows.length === 0) continue;
    const act = defaults.rows[0];
    matched.push(act);

    const exists = await familyHasCanonicalActivity(client, familyId, entry.canonicalId);
    let templateId;
    if (!exists) {
      const result = await copyStandardActivityToFamily(client, {
        familyId,
        defaultActivityId: act.id,
        canonicalActivityId: entry.canonicalId,
        locale,
        sortOrder: nextOrder++,
        externalTransaction: true,
      });
      templateId = result.templateId;
      copied += 1;
      touchedTemplateIds.push(templateId);
    } else {
      const existing = await client.query(
        `SELECT id FROM activity_template
         WHERE family_id = $1 AND source_canonical_id = $2 LIMIT 1`,
        [familyId, entry.canonicalId]
      );
      templateId = existing.rows[0]?.id;
      skipped += 1;
    }

    if (templateId && goalSlug) {
      const stars = starValueForItem(act, starOverrides);
      const updated = await client.query(
        `UPDATE activity_template
         SET for_dig_goal_slug = $1,
             star_value = CASE WHEN $4::boolean THEN $5 ELSE star_value END
         WHERE id = $2 AND family_id = $3
         RETURNING id`,
        [goalSlug, templateId, familyId, hasStarOverrides(starOverrides), stars]
      );
      if (updated.rows[0]) touchedTemplateIds.push(updated.rows[0].id);
    }
  }

  if (legacyNames.length > 0) {
    const defaults = await client.query(
      `SELECT id, name, icon, star_value, sub_steps FROM default_activity_template ORDER BY sort_order ASC`
    );
    const legacyMatched = findByNames(defaults.rows, legacyNames);
    matched.push(...legacyMatched);

    const existingRows = await client.query(
      `SELECT id, LOWER(name) AS lname FROM activity_template WHERE family_id = $1`,
      [familyId]
    );
    const existingByName = new Map(existingRows.rows.map((a) => [a.lname, a.id]));

    const toCopy = legacyMatched.filter((a) => !existingByName.has(normalizeName(a.name)));
    for (const act of toCopy) {
      const stars = starValueForItem(act, starOverrides);
      const newTemplate = await client.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, is_favorite, sort_order, for_dig_goal_slug)
         VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING id`,
        [familyId, act.name, act.icon, stars, nextOrder++, goalSlug || null]
      );
      const templateId = newTemplate.rows[0].id;
      touchedTemplateIds.push(templateId);
      copied += 1;
      const subSteps = act.sub_steps || [];
      if (Array.isArray(subSteps) && subSteps.length > 0) {
        for (let i = 0; i < subSteps.length; i++) {
          await client.query(
            `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [templateId, subSteps[i].name, subSteps[i].icon || null, i]
          );
        }
      }
    }

    for (const act of legacyMatched) {
      const existingId = existingByName.get(normalizeName(act.name));
      if (!existingId || !goalSlug) continue;
      const stars = starValueForItem(act, starOverrides);
      const updated = await client.query(
        `UPDATE activity_template
         SET for_dig_goal_slug = $1,
             star_value = CASE WHEN $4::boolean THEN $5 ELSE star_value END
         WHERE id = $2 AND family_id = $3
         RETURNING id`,
        [goalSlug, existingId, familyId, hasStarOverrides(starOverrides), stars]
      );
      if (updated.rows[0]) touchedTemplateIds.push(updated.rows[0].id);
    }
    skipped += legacyMatched.length - toCopy.length;
  }

  if (matched.length === 0) {
    throw libraryUnavailableError('activities_no_match');
  }

  return {
    copied,
    skipped,
    matched: matched.length,
    touchedTemplateIds,
    matchedActivities: matched,
  };
}

async function getActivityTemplateIds(client, familyId, activityNames) {
  const rows = await client.query(
    `SELECT id, name FROM activity_template WHERE family_id = $1`,
    [familyId]
  );
  const matched = findByNames(rows.rows, activityNames);
  return matched.map((row) => row.id);
}

async function appendActivitiesToSchedule(client, childId, goal, templateIds) {
  if (!templateIds.length) {
    return { filledDays: [] };
  }

  const days = (goal.scheduleDays || [1, 2, 3, 4, 5])
    .map((d) => parseInt(d, 10))
    .filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
  const section = goal.scheduleSection || 'dag';
  const filledDays = [];

  for (const dow of days) {
    let scheduleRowId;
    const existingSchedule = await client.query(
      'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
      [childId, dow]
    );

    if (existingSchedule.rows.length > 0) {
      scheduleRowId = existingSchedule.rows[0].id;
    } else {
      const newSched = await client.query(
        'INSERT INTO weekly_schedule (child_id, day_of_week, name, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
        [childId, dow, goal.title, dow]
      );
      scheduleRowId = newSched.rows[0].id;
    }

    const maxSort = await client.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM weekly_schedule_item WHERE weekly_schedule_id = $1',
      [scheduleRowId]
    );
    let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;
    let addedOnDay = false;

    for (const templateId of templateIds) {
      const dup = await client.query(
        `SELECT 1 FROM weekly_schedule_item
         WHERE weekly_schedule_id = $1 AND activity_template_id = $2`,
        [scheduleRowId, templateId]
      );
      if (dup.rows.length > 0) continue;

      await client.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
         VALUES ($1, $2, $3, $4)`,
        [scheduleRowId, templateId, nextOrder++, section]
      );
      addedOnDay = true;
    }

    if (addedOnDay) filledDays.push(dow);
  }

  return { filledDays };
}

async function copyRewards(client, familyId, rewardNames, starOverrides) {
  const defaults = await client.query(
    `SELECT id, name, icon, star_cost FROM default_reward ORDER BY sort_order ASC`
  );
  if (defaults.rows.length === 0) {
    throw libraryUnavailableError('rewards_empty');
  }

  const matched = findByNames(defaults.rows, rewardNames);
  if (matched.length === 0) {
    throw libraryUnavailableError('rewards_no_match');
  }

  const existingCopies = await client.query(
    `SELECT source_default_id FROM reward WHERE family_id = $1 AND source_default_id = ANY($2::uuid[])`,
    [familyId, matched.map((r) => r.id)]
  );
  const alreadyCopiedIds = new Set(existingCopies.rows.map((r) => r.source_default_id));
  const toCopy = matched.filter((r) => !alreadyCopiedIds.has(r.id));

  const maxSort = await client.query(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM reward WHERE family_id = $1`,
    [familyId]
  );
  let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

  for (const r of toCopy) {
    const starCost = starValueForItem(r, starOverrides);
    await client.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, sort_order, source_default_id, modified_by_family)
       VALUES ($1, $2, $3, $4, false, true, $5, $6, false)`,
      [familyId, r.name, r.icon, starCost, nextOrder++, r.id]
    );
  }

  if (hasStarOverrides(starOverrides)) {
    for (const r of matched) {
      const starCost = starValueForItem(r, starOverrides);
      await client.query(
        `UPDATE reward SET star_cost = $1
         WHERE family_id = $2 AND source_default_id = $3`,
        [starCost, familyId, r.id]
      );
    }
  }

  return { copied: toCopy.length, skipped: matched.length - toCopy.length, matched: matched.length };
}

async function getGoalActivationPreview(goalSlug, options = {}) {
  const { locale = 'sv-SE' } = options;
  const goal = getGoalBySlug(goalSlug);
  if (!goal) return null;

  if (goal.scheduleName) {
    const canonicalScheduleId = resolveLegacyScheduleNameCanonical(goal.scheduleName);
    if (!canonicalScheduleId) {
      return { type: 'schedule', items: [] };
    }

    const section = resolveScheduleSection(goal);
    const variants = canonicalScheduleId === 'school_weekday'
      ? { after_school: NON_INTERACTIVE_AFTER_SCHOOL_VARIANT }
      : null;

    const client = await db.pool.connect();
    try {
      const items = await previewCanonicalScheduleSection(client, {
        canonicalScheduleId,
        section,
        locale,
        variants,
      });
      return { type: 'schedule', items };
    } catch (err) {
      if (err instanceof CanonicalCopyError) {
        if (err.code === CANONICAL_DUPLICATE_IDENTITY || err.code === CANONICAL_SOURCE_INVALID) {
          throw err;
        }
        return { type: 'schedule', items: [] };
      }
      throw err;
    } finally {
      client.release();
    }
  }

  if (goal.activityNames && goal.activityNames.length > 0) {
    const items = [];
    const legacyNames = [];

    for (const name of goal.activityNames) {
      const canonicalId = FOR_DIG_LEGACY_ACTIVITY_TO_CANONICAL[normalizeName(name)];
      if (canonicalId) {
        const row = await db.query(
          `SELECT name, name_i18n, icon, star_value
           FROM default_activity_template WHERE canonical_id = $1`,
          [canonicalId]
        );
        if (row.rows.length > 1) {
          throw new CanonicalCopyError(CANONICAL_DUPLICATE_IDENTITY, {
            duplicate_canonical_ids: [canonicalId],
          });
        }
        if (row.rows[0]) {
          const act = row.rows[0];
          items.push({
            name: pickLocaleString(act.name_i18n, locale, act.name),
            icon: act.icon,
            star_value: act.star_value,
          });
        }
      } else {
        legacyNames.push(name);
      }
    }

    if (legacyNames.length > 0) {
      const defaults = await db.query(
        'SELECT name, icon, star_value FROM default_activity_template ORDER BY sort_order ASC'
      );
      items.push(...findByNames(defaults.rows, legacyNames));
    }

    return { type: 'activities', items };
  }

  if (goal.rewardNames && goal.rewardNames.length > 0) {
    const defaults = await db.query(
      'SELECT name, icon, star_cost AS star_value FROM default_reward ORDER BY sort_order ASC'
    );
    return { type: 'rewards', items: findByNames(defaults.rows, goal.rewardNames) };
  }

  return { type: 'none', items: [] };
}

async function activateGoal({
  parentId,
  familyId,
  childId,
  childIds,
  goalSlug,
  overwrite = true,
  starOverrides = null,
}) {
  const goal = getGoalBySlug(goalSlug);
  if (!goal) {
    const err = new Error('Utvecklingsmålet hittades inte.');
    err.status = 404;
    throw err;
  }

  const ids = Array.isArray(childIds) && childIds.length > 0
    ? childIds
    : (childId ? [childId] : []);
  if (ids.length === 0) {
    const err = new Error('Minst ett barn krävs.');
    err.status = 400;
    throw err;
  }

  const verifiedChildren = [];
  for (const id of ids) {
    const child = await verifyChildAccess(parentId, id);
    if (!child) {
      const err = new Error('Du har inte åtkomst till ett av valda barn.');
      err.status = 403;
      throw err;
    }
    verifiedChildren.push(child);
  }

  const client = await db.getClient();
  let scheduleResult = null;
  let activityResult = null;
  let rewardResult = null;
  let activitySchedule = null;
  const touchedTemplateIds = new Set();
  const activityScheduleByChild = [];

  try {
    await client.query('BEGIN');

    if (goal.rewardNames && goal.rewardNames.length > 0) {
      rewardResult = await copyRewards(client, familyId, goal.rewardNames, starOverrides);
    }

    if (goal.activityNames && goal.activityNames.length > 0) {
      activityResult = await copyActivities(
        client,
        familyId,
        goal.activityNames,
        goalSlug,
        starOverrides
      );
      for (const id of activityResult.touchedTemplateIds || []) {
        touchedTemplateIds.add(id);
      }

      const templateIds = await getActivityTemplateIds(client, familyId, goal.activityNames);
      for (const child of verifiedChildren) {
        const appended = await appendActivitiesToSchedule(client, child.id, goal, templateIds);
        activityScheduleByChild.push({ child_id: child.id, ...appended });
      }
      activitySchedule = {
        filledDays: [...new Set(activityScheduleByChild.flatMap((r) => r.filledDays))],
        child_count: verifiedChildren.length,
      };
    }

    if (goal.scheduleName) {
      const targetSection = resolveScheduleSection(goal);
      for (const child of verifiedChildren) {
        scheduleResult = await copySchedule(
          client,
          familyId,
          child.id,
          goal.scheduleName,
          goal.scheduleDays || [1, 2, 3, 4, 5],
          targetSection,
          goalSlug,
          starOverrides
        );
        for (const id of scheduleResult.touchedTemplateIds || []) {
          touchedTemplateIds.add(id);
        }
      }
    }

    if (!scheduleResult && !activityResult && !rewardResult) {
      const err = new Error('Detta mål har inget att aktivera ännu.');
      err.status = 400;
      throw err;
    }

    if (activityResult && activityResult.matched === 0 && !scheduleResult && !rewardResult) {
      throw libraryUnavailableError('activities_no_match');
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  for (const child of verifiedChildren) {
    const daysToSync = new Set();
    if (scheduleResult?.filledDays?.length) {
      for (const dow of scheduleResult.filledDays) daysToSync.add(dow);
    }
    const childAppend = activityScheduleByChild.find((r) => r.child_id === child.id);
    if (childAppend?.filledDays?.length) {
      for (const dow of childAppend.filledDays) daysToSync.add(dow);
    }
    for (const dow of daysToSync) {
      try {
        await syncDailyLogWithSchedule(child.id, dow);
      } catch (syncErr) {
        console.error('[FOR-DIG] Sync error (non-fatal):', syncErr.message);
      }
    }
    if (daysToSync.size > 0) {
      broadcast(familyId, 'SCHEDULE_UPDATED', { childId: child.id });
    }
  }

  for (const templateId of touchedTemplateIds) {
    try {
      await syncDailyLogsForTemplateChange(templateId);
    } catch (syncErr) {
      console.error('[FOR-DIG] Template sync error (non-fatal):', syncErr.message);
    }
  }

  const childNames = verifiedChildren.map((c) => c.name);

  return {
    goal,
    child_name: childNames.join(', '),
    child_names: childNames,
    child_ids: verifiedChildren.map((c) => c.id),
    schedule: scheduleResult,
    activities: activityResult,
    activitySchedule,
    rewards: rewardResult,
  };
}

module.exports = {
  activateGoal,
  getGoalActivationPreview,
  buildActivationPlanPreview,
  verifyChildAccess,
  buildActivationSuccessMessage,
  buildActivationNextStep,
  scheduleActivatableLabel,
  getGoalCtaLabel,
  starValueForItem,
  lookupStarOverride,
  findByNames,
  normalizeName,
};
