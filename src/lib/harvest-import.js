/**
 * Map api-harvest-v1 JSON bundles to Postgres rows for import.
 */

const { hashPassword } = require('./hash');
const { buildDailyLogItemRows, buildManualStarRows } = require('./harvest-history');

const DEFAULT_IMPORT_PASSWORD = 'ChangeMeAfterImport2026!';

function isApiError(value) {
  return value && typeof value === 'object' && value._error;
}

function asArray(value) {
  if (!value || isApiError(value)) return [];
  if (Array.isArray(value)) return value;
  return [];
}

/** Unwrap list endpoints that return `{ items: [...] }` or `{ rewards: [...] }`. */
function unwrapApiList(payload, listKey) {
  if (!payload || isApiError(payload)) return [];
  if (Array.isArray(payload)) return payload;
  if (listKey && Array.isArray(payload[listKey])) return payload[listKey];
  return [];
}

/** Count weekly schedule rows in harvest.json (for verify script). */
function countSchedulesInHarvest(api) {
  const children = api?.family?.children || [];
  const perChild = [];
  let scheduleDays = 0;
  let items = 0;
  let itemErrors = 0;

  for (const child of children) {
    if (!child?.id) continue;
    let days = 0;
    let childItems = 0;
    const schedList = api?.schedules?.[child.id];
    if (isApiError(schedList)) {
      itemErrors++;
      perChild.push({ name: child.name, id: child.id, days: 0, items: 0, error: schedList._error });
      continue;
    }
    const scheds = asArray(schedList);
    days = scheds.length;
    scheduleDays += days;
    const itemsMap = api?.schedules?.[`${child.id}_items`] || {};
    for (const sched of scheds) {
      const payload = itemsMap[sched.id];
      if (isApiError(payload)) {
        itemErrors++;
        continue;
      }
      const list = payload?.items || asArray(payload);
      childItems += list.length;
    }
    items += childItems;
    perChild.push({ name: child.name, id: child.id, days, items: childItems });
  }

  return { scheduleDays, items, itemErrors, perChild, hasSchedules: scheduleDays > 0 || items > 0 };
}

function pick(row, allowed) {
  const out = {};
  for (const key of allowed) {
    if (row[key] !== undefined) out[key] = row[key];
  }
  return out;
}

/** JSONB array for pg — node-pg serializes JS arrays as PG arrays, not JSON. */
function normalizeJsonbArray(value, fallback = []) {
  let parsed = value;
  if (parsed == null || parsed === '') parsed = fallback;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = fallback;
    }
  }
  if (!Array.isArray(parsed)) parsed = fallback;
  return JSON.stringify(parsed);
}

/**
 * @param {object} harvest — parsed harvest.json
 * @param {{ defaultPassword?: string }} [opts]
 * @returns {Promise<{ bundles: { table: string, rows: object[], conflict: string[] }[], warnings: string[] }>}
 */
async function buildHarvestImportBundles(harvest, opts = {}) {
  const warnings = [];
  const api = harvest.api || {};
  const familyApi = api.family;

  if (!familyApi || isApiError(familyApi)) {
    throw new Error('harvest.json saknar api.family (eller har _error)');
  }

  const familyId = harvest.family_id || familyApi.id;
  if (!familyId) throw new Error('family_id saknas i harvest');

  const passwordPlain = opts.defaultPassword || process.env.HARVEST_IMPORT_PASSWORD || DEFAULT_IMPORT_PASSWORD;
  const passwordHash = await hashPassword(passwordPlain);

  const subscription = isApiError(api.subscription) ? null : api.subscription;
  const bundles = [];

  // ── family ──
  bundles.push({
    table: 'family',
    conflict: ['id'],
    rows: [
      pick(familyApi, [
        'id', 'name', 'timezone', 'time_display_mode',
        'morning_start', 'morning_end', 'day_start', 'day_end',
        'evening_start', 'evening_end', 'night_start', 'night_end',
        'streak_start_day', 'sound_enabled', 'created_at',
      ]),
    ].map((row) => ({
      ...row,
      id: row.id || familyId,
      timezone: row.timezone || 'Europe/Stockholm',
      is_lifetime_free: subscription?.tier === 'lifetime_free' || subscription?.tier == null,
      subscription_status: subscription?.tier === 'paid' ? 'active' : 'none',
    })),
  });

  // ── parents ──
  const parents = asArray(familyApi.parents);
  const parentRows = parents.map((p) => ({
    id: p.id,
    family_id: familyId,
    email: p.email,
    name: p.name,
    password_hash: passwordHash,
    verified: true,
    is_admin: p.is_admin === true,
    family_role: p.family_role || 'primary',
    onboarding_completed: true,
    account_type: p.account_type || 'family',
    created_at: p.created_at || new Date().toISOString(),
  }));
  bundles.push({ table: 'parent', conflict: ['id'], rows: parentRows });

  const primaryParentId = parentRows.find((p) => p.family_role === 'primary')?.id || parentRows[0]?.id;

  // ── children ──
  const children = asArray(familyApi.children);
  const childRows = children.map((c) => {
    const detail = api.children_detail?.[c.id];
    const detailRow = detail && !isApiError(detail) ? detail : {};
    return {
      id: c.id,
      family_id: familyId,
      name: c.name || detailRow.name,
      emoji: c.emoji ?? detailRow.emoji ?? '⭐',
      birthday: c.birthday ?? detailRow.birthday ?? null,
      timezone: c.timezone || detailRow.timezone || familyApi.timezone || 'Europe/Stockholm',
      view_mode: c.view_mode || detailRow.view_mode || 'auto',
      username: c.username ?? detailRow.username ?? null,
      avatar_url: c.avatar_url ?? detailRow.avatar_url ?? null,
      sort_order: c.sort_order ?? 0,
      created_at: c.created_at || detailRow.created_at || new Date().toISOString(),
    };
  });
  bundles.push({ table: 'child', conflict: ['id'], rows: childRows });

  // ── parent_child ──
  const parentChildRows = [];
  const pcKeys = new Set();
  for (const p of parents) {
    const childIds = asArray(p.linked_child_ids);
    for (const childId of childIds) {
      const key = `${p.id}:${childId}`;
      if (pcKeys.has(key)) continue;
      pcKeys.add(key);
      let role = 'shared';
      if (p.family_role === 'primary') role = 'primary';
      else if (p.family_role === 'pedagog') role = 'pedagog';
      const childMeta = children.find((c) => c.id === childId);
      if (childMeta?.role && p.family_role !== 'pedagog') role = childMeta.role;
      parentChildRows.push({ parent_id: p.id, child_id: childId, role });
    }
  }
  for (const child of childRows) {
    if (!parentChildRows.some((pc) => pc.child_id === child.id) && primaryParentId) {
      parentChildRows.push({ parent_id: primaryParentId, child_id: child.id, role: 'primary' });
    }
  }
  bundles.push({ table: 'parent_child', conflict: ['parent_id', 'child_id'], rows: parentChildRows });

  // ── categories ──
  bundles.push({
    table: 'category',
    conflict: ['id'],
    rows: asArray(api.categories).map((c) =>
      pick(c, ['id', 'name', 'sort_order', 'is_default'])
    ).map((c) => ({ ...c, family_id: familyId })),
  });

  // ── activities ──
  const activityRows = asArray(api.activities).map((a) => ({
    id: a.id,
    family_id: familyId,
    name: a.name,
    icon: a.icon || '⭐',
    category_id: a.category_id || null,
    star_value: a.star_value ?? 1,
    is_favorite: a.is_favorite === true,
    feedback_for: a.feedback_for || 'both',
    sort_order: a.sort_order ?? 0,
    schema_type: a.schema_type || null,
    time_group: a.time_group || 'morgon',
  }));
  bundles.push({ table: 'activity_template', conflict: ['id'], rows: activityRows });

  // ── activity sub-steps (from schedule item payloads) ──
  const subStepRows = [];
  const subStepIds = new Set();
  const collectSubSteps = (items) => {
    for (const item of asArray(items)) {
      const steps = item.sub_steps;
      if (!steps) continue;
      let parsed = steps;
      if (typeof steps === 'string') {
        try {
          parsed = JSON.parse(steps);
        } catch {
          continue;
        }
      }
      if (!Array.isArray(parsed)) continue;
      for (const step of parsed) {
        if (!step.id || subStepIds.has(step.id)) continue;
        const actId = item.activity_template_id;
        if (!actId || !activityIds.has(actId)) continue;
        subStepIds.add(step.id);
        subStepRows.push({
          id: step.id,
          activity_template_id: actId,
          name: step.name,
          icon: step.icon || '⭐',
          sort_order: step.sort_order ?? 0,
        });
      }
    }
  };

  // ── weekly schedules + items ──
  const weeklyScheduleRows = [];
  const weeklyItemRows = [];
  const activityIds = new Set(activityRows.map((a) => a.id));

  for (const child of childRows) {
    const schedList = api.schedules?.[child.id];
    if (!schedList || isApiError(schedList)) continue;
    for (const sched of asArray(schedList)) {
      weeklyScheduleRows.push({
        id: sched.id,
        child_id: child.id,
        family_id: null,
        day_of_week: sched.day_of_week,
        sort_order: sched.sort_order ?? sched.day_of_week ?? 0,
        name: sched.name || null,
      });
      const itemsKey = `${child.id}_items`;
      const itemsPayload = api.schedules?.[itemsKey]?.[sched.id];
      if (isApiError(itemsPayload)) continue;
      const items = itemsPayload?.items || asArray(itemsPayload);
      collectSubSteps(items);
      for (const item of items) {
        if (!item.id) continue;
        const actId = item.activity_template_id;
        if (actId && !activityIds.has(actId)) {
          warnings.push(
            `weekly_schedule_item ${item.id}: aktivitet ${actId} saknas — hoppar över schemarad`
          );
          continue;
        }
        if (!actId) {
          warnings.push(`weekly_schedule_item ${item.id}: saknar activity_template_id — hoppar över`);
          continue;
        }
        weeklyItemRows.push({
          id: item.id,
          weekly_schedule_id: sched.id,
          activity_template_id: actId,
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          sort_order: item.sort_order ?? 0,
          section: item.section || 'morgon',
        });
      }
    }
  }

  for (const tmpl of asArray(api.schedule_templates)) {
    weeklyScheduleRows.push({
      id: tmpl.id,
      family_id: familyId,
      child_id: null,
      name: tmpl.name || null,
      sort_order: tmpl.sort_order ?? 0,
      day_of_week: tmpl.day_of_week ?? null,
    });
  }
  warnings.push('schedule_templates: endast metadata (inga items i harvest)');

  bundles.push({ table: 'activity_sub_step', conflict: ['id'], rows: subStepRows });
  bundles.push({ table: 'weekly_schedule', conflict: ['id'], rows: weeklyScheduleRows });
  bundles.push({ table: 'weekly_schedule_item', conflict: ['id'], rows: weeklyItemRows });

  // ── special days ──
  const specialDayRows = [];
  const specialItemRows = [];
  for (const child of childRows) {
    const days = api.special_days?.[child.id];
    if (!days || isApiError(days)) continue;
    for (const day of asArray(days)) {
      specialDayRows.push({
        id: day.id,
        child_id: child.id,
        date: day.date,
        note: day.note || null,
        created_at: day.created_at || new Date().toISOString(),
      });
      const itemsPayload = api.special_days?.[`${child.id}_items`]?.[day.id];
      const items = itemsPayload?.items || asArray(itemsPayload);
      for (const item of asArray(items)) {
        if (!item.id) continue;
        specialItemRows.push({
          id: item.id,
          special_day_schedule_id: day.id,
          activity_template_id: item.activity_template_id || null,
          name: item.name,
          icon: item.icon || '⭐',
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          star_value: item.star_value ?? 1,
          sort_order: item.sort_order ?? 0,
          section: item.section || 'morgon',
        });
      }
    }
  }
  bundles.push({ table: 'special_day_schedule', conflict: ['id'], rows: specialDayRows });
  bundles.push({ table: 'special_day_schedule_item', conflict: ['id'], rows: specialItemRows });

  // ── rewards ──
  const rewardRows = unwrapApiList(api.rewards, 'rewards').map((r) => ({
    id: r.id,
    family_id: familyId,
    name: r.name,
    icon: r.icon || '🎁',
    star_cost: r.star_cost ?? r.star_value ?? 1,
    requires_approval: r.requires_approval !== false,
    is_active: r.is_active !== false,
    sort_order: r.sort_order ?? 0,
    visible_to_children:
      Array.isArray(r.visible_to_children) && r.visible_to_children.length > 0
        ? r.visible_to_children
        : null,
  }));
  bundles.push({ table: 'reward', conflict: ['id'], rows: rewardRows });

  const rewardByName = new Map(rewardRows.map((r) => [r.name?.toLowerCase(), r.id]));
  const rewardIds = new Set(rewardRows.map((r) => r.id));

  // ── goals ──
  const goalsPayload = api.goals;
  const goalList = goalsPayload?.goals || asArray(goalsPayload);
  const goalRows = [];
  for (const g of asArray(goalList)) {
    let rewardId = g.reward_id;
    if (rewardId && !rewardIds.has(rewardId)) {
      warnings.push(`child_reward_goal ${g.id}: belöning ${rewardId} saknas i harvest — hoppar över`);
      continue;
    }
    if (!rewardId) continue;
    goalRows.push({
      id: g.id,
      child_id: g.child_id,
      reward_id: rewardId,
      status: g.status || 'active',
      set_by: primaryParentId,
      created_at: g.created_at || new Date().toISOString(),
    });
  }
  bundles.push({ table: 'child_reward_goal', conflict: ['id'], rows: goalRows });

  // ── daily logs (headers only — harvest saknar loggrad-detaljer) ──
  const dailyLogRows = [];
  for (const child of childRows) {
    const chunks = api.daily_logs?.[child.id];
    if (!chunks || !Array.isArray(chunks)) continue;
    for (const chunk of chunks) {
      const data = chunk.data;
      if (!data || isApiError(data)) continue;
      for (const log of asArray(data)) {
        dailyLogRows.push({
          id: log.id,
          child_id: child.id,
          date: log.date,
          is_paused: log.is_paused === true,
          generated_from: log.generated_from || null,
          created_at: log.created_at || new Date().toISOString(),
        });
      }
    }
  }
  if (dailyLogRows.length && !api.daily_log_details) {
    warnings.push(
      `daily_log: ${dailyLogRows.length} dag(ar) utan daily_log_item — kör harvest:history eller import:gdpr-history`
    );
  }
  bundles.push({ table: 'daily_log', conflict: ['child_id', 'date'], rows: dailyLogRows });

  const { rows: dailyLogItemRows, warnings: itemWarnings } = buildDailyLogItemRows(childRows, api);
  warnings.push(...itemWarnings);
  for (const row of dailyLogItemRows) {
    if (row.activity_template_id && !activityIds.has(row.activity_template_id)) {
      warnings.push(
        `daily_log_item ${row.id}: aktivitet ${row.activity_template_id} saknas — sparar utan koppling (behåller namn)`
      );
      row.activity_template_id = null;
    }
  }
  if (dailyLogItemRows.length) {
    bundles.push({ table: 'daily_log_item', conflict: ['id'], rows: dailyLogItemRows });
  }

  const manualStarRows = buildManualStarRows(childRows, api, primaryParentId);
  if (manualStarRows.length) {
    bundles.push({ table: 'manual_star_grant', conflict: ['id'], rows: manualStarRows });
  }

  // ── redemptions ──
  const redemptionRows = [];
  const resolveRewardId = (rr) => {
    if (rr.reward_id && rewardIds.has(rr.reward_id)) return rr.reward_id;
    if (!rr.reward_name) return null;
    const nameKey = String(rr.reward_name).toLowerCase();
    const matches = rewardRows.filter((r) => r.name?.toLowerCase() === nameKey);
    if (matches.length === 1) return matches[0].id;
    if (matches.length > 1 && rr.star_cost != null) {
      const cost = parseInt(rr.star_cost, 10);
      const byCost = matches.find((r) => r.star_cost === cost);
      if (byCost) return byCost.id;
    }
    return matches[0]?.id || rewardByName.get(nameKey) || null;
  };
  for (const rr of asArray(api.reward_redemptions)) {
    const rewardId = resolveRewardId(rr);
    if (!rewardId) {
      warnings.push(`reward_redemption ${rr.id}: kunde inte matcha belöning "${rr.reward_name}"`);
      continue;
    }
    redemptionRows.push({
      id: rr.id,
      reward_id: rewardId,
      child_id: rr.child_id,
      status: rr.status || 'approved',
      star_cost: rr.star_cost ?? null,
      sort_order: rr.sort_order ?? 0,
      created_at: rr.created_at || new Date().toISOString(),
      redeemed_at: rr.redeemed_at || rr.created_at || new Date().toISOString(),
    });
  }
  bundles.push({ table: 'reward_redemption', conflict: ['id'], rows: redemptionRows });

  // ── streak (from harvest child_progress / GET /api/children/:id/progress) ──
  const hasChildProgress = api.child_progress && typeof api.child_progress === 'object';
  if (!hasChildProgress) {
    warnings.push('Ingen child_progress i harvest.json — kör npm run harvest:streaks för streak-värden');
  }
  const streakRows = childRows.map((c) => {
    const progress = api.child_progress?.[c.id];
    const streak =
      progress && !isApiError(progress) && progress.streak ? progress.streak : null;
    return {
      child_id: c.id,
      current_streak: parseInt(streak?.current_streak, 10) || 0,
      cycle_day: parseInt(streak?.cycle_day, 10) || 0,
      last_active_date: streak?.last_active_date || null,
    };
  });
  bundles.push({
    table: 'streak',
    conflict: ['child_id'],
    rows: streakRows,
    upsert: true,
  });

  // ── child observations ──
  const observationRows = [];
  for (const child of childRows) {
    const obsPayload = api[`observations_${child.id}`];
    const list = obsPayload?.observations || asArray(obsPayload);
    for (const o of asArray(list)) {
      if (!o.id) continue;
      observationRows.push({
        id: o.id,
        child_id: child.id,
        parent_id: o.parent_id || primaryParentId,
        date: o.date,
        section: o.section,
        content: o.content,
        is_important: o.is_important === true,
        created_at: o.created_at || new Date().toISOString(),
        updated_at: o.updated_at || o.created_at || new Date().toISOString(),
      });
    }
  }
  bundles.push({ table: 'child_observation', conflict: ['id'], rows: observationRows });

  // ── general observations ──
  const genObsRows = [];
  for (const source of [api.general_observations, api.general_observations_archived]) {
    const list = source?.observations || asArray(source);
    for (const o of asArray(list)) {
      if (!o.id) continue;
      genObsRows.push({
        id: o.id,
        family_id: familyId,
        text: o.text,
        is_important: o.is_important === true,
        created_at: o.created_at || new Date().toISOString(),
        archived_at: source === api.general_observations_archived ? o.archived_at || o.created_at : o.archived_at || null,
      });
    }
  }
  bundles.push({ table: 'general_observations', conflict: ['id'], rows: genObsRows });

  // ── family_subscriptions ──
  if (subscription && subscription.tier) {
    bundles.push({
      table: 'family_subscriptions',
      conflict: ['family_id'],
      rows: [
        {
          family_id: familyId,
          tier: subscription.tier,
          trial_expires_at: subscription.trial_expires_at || null,
          components: normalizeJsonbArray(subscription.components, [
            { component: 'basic_app', expires_at: null },
          ]),
        },
      ],
    });
  }

  // ── notification_preference ──
  bundles.push({
    table: 'notification_preference',
    conflict: ['parent_id'],
    rows: parentRows.map((p) => ({ parent_id: p.id })),
  });

  // ── system messages (unread snapshot) ──
  const msgRows = asArray(api.system_messages)
    .filter((m) => m.id && m.message)
    .map((m) => ({
      id: m.id,
      family_id: familyId,
      message: m.message,
      is_read: m.is_read === true,
      created_at: m.created_at || new Date().toISOString(),
    }));
  bundles.push({ table: 'system_messages', conflict: ['id'], rows: msgRows });

  warnings.push('parent: alla får temporärt lösenord — be användare byta via "Glömt lösenord"');
  warnings.push('child: PIN importeras inte — sätt ny PIN i appen efter import');

  return { bundles, warnings, meta: { familyId, familyName: harvest.family_name || familyApi.name, passwordPlain } };
}

module.exports = {
  buildHarvestImportBundles,
  countSchedulesInHarvest,
  unwrapApiList,
  DEFAULT_IMPORT_PASSWORD,
};
