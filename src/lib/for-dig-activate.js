'use strict';

/**
 * Server-side activation orchestrator for För dig goals.
 * Reuses standard-library copy logic patterns.
 */

const db = require('./db');
const { getGoalBySlug } = require('./for-dig-config');
const { broadcast } = require('./sse-broadcast');
const { syncDailyLogWithSchedule, syncDailyLogsForTemplateChange } = require('./daily-log-generator');

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
  const wanted = (names || []).map(normalizeName);
  return items.filter((item) => wanted.some((w) => normalizeName(item.name).includes(w) || w.includes(normalizeName(item.name))));
}

function libraryUnavailableError(context) {
  const err = new Error(
    'Materialet för detta mål är inte tillgängligt just nu. Försök igen senare eller kontakta oss om problemet kvarstår.'
  );
  err.status = 503;
  err.context = context;
  return err;
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

async function copySchedule(client, familyId, childId, scheduleName, days, overwrite, goalSlug, starOverrides) {
  const scheduleResult = await client.query(
    'SELECT id, name FROM default_schedule WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [scheduleName]
  );
  if (scheduleResult.rows.length === 0) {
    throw libraryUnavailableError(`schedule:${scheduleName}`);
  }

  const scheduleId = scheduleResult.rows[0].id;
  const items = await client.query(
    `SELECT dsi.name, dsi.icon, dsi.section, dsi.star_value, dsi.start_time, dsi.end_time, dsi.sort_order, dsi.sub_steps
     FROM default_schedule_item dsi
     WHERE dsi.default_schedule_id = $1
     ORDER BY CASE dsi.section WHEN 'morgon' THEN 0 WHEN 'dag' THEN 1 WHEN 'kvall' THEN 2 ELSE 3 END, dsi.sort_order ASC`,
    [scheduleId]
  );

  if (items.rows.length === 0) {
    throw libraryUnavailableError(`schedule_empty:${scheduleName}`);
  }

  const validDays = days.map((d) => parseInt(d, 10)).filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
  if (validDays.length === 0) {
    const err = new Error('Inga giltiga dagar angivna.');
    err.status = 400;
    throw err;
  }

  const activityTemplateMap = {};
  const touchedTemplateIds = [];
  for (const item of items.rows) {
    const stars = starValueForItem(item, starOverrides);
    const existing = await client.query(
      `SELECT id FROM activity_template WHERE family_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [familyId, item.name]
    );

    if (existing.rows.length > 0) {
      const templateId = existing.rows[0].id;
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
      }
    } else {
      const newTemplate = await client.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, is_favorite, sort_order, for_dig_goal_slug)
         VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING id`,
        [familyId, item.name, item.icon, stars, item.sort_order || 0, goalSlug || null]
      );
      const templateId = newTemplate.rows[0].id;
      activityTemplateMap[item.name] = templateId;
      touchedTemplateIds.push(templateId);

      const subSteps = item.sub_steps || [];
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
  }

  const filledDays = [];
  for (const dow of validDays) {
    let scheduleRowId;
    const existingSchedule = await client.query(
      'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
      [childId, dow]
    );

    if (existingSchedule.rows.length > 0) {
      if (!overwrite) continue;
      scheduleRowId = existingSchedule.rows[0].id;
      await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [scheduleRowId]);
      await client.query(
        'UPDATE weekly_schedule SET name = $1 WHERE id = $2',
        [scheduleName, scheduleRowId]
      );
    } else {
      const newSched = await client.query(
        'INSERT INTO weekly_schedule (child_id, day_of_week, name, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
        [childId, dow, scheduleName, dow]
      );
      scheduleRowId = newSched.rows[0].id;
    }

    for (const item of items.rows) {
      const templateId = activityTemplateMap[item.name];
      if (!templateId) continue;
      await client.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [scheduleRowId, templateId, item.start_time || null, item.end_time || null, item.sort_order || 0, item.section || 'dag']
      );
    }
    filledDays.push(dow);
  }

  return { scheduleId, scheduleName, filledDays, activityTemplateMap, touchedTemplateIds };
}

async function copyActivities(client, familyId, activityNames, goalSlug, starOverrides) {
  const defaults = await client.query(
    `SELECT id, name, icon, star_value, sub_steps FROM default_activity_template ORDER BY sort_order ASC`
  );
  if (defaults.rows.length === 0) {
    throw libraryUnavailableError('activities_empty');
  }

  const matched = findByNames(defaults.rows, activityNames);
  if (matched.length === 0) {
    throw libraryUnavailableError('activities_no_match');
  }

  const existingRows = await client.query(
    `SELECT id, LOWER(name) AS lname FROM activity_template WHERE family_id = $1`,
    [familyId]
  );
  const existingByName = new Map(existingRows.rows.map((a) => [a.lname, a.id]));

  const toCopy = matched.filter((a) => !existingByName.has(normalizeName(a.name)));
  const maxSort = await client.query(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM activity_template WHERE family_id = $1`,
    [familyId]
  );
  let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;
  const touchedTemplateIds = [];

  for (const act of toCopy) {
    const stars = starValueForItem(act, starOverrides);
    const newTemplate = await client.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, is_favorite, sort_order, for_dig_goal_slug)
       VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING id`,
      [familyId, act.name, act.icon, stars, nextOrder++, goalSlug || null]
    );
    const templateId = newTemplate.rows[0].id;
    touchedTemplateIds.push(templateId);
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

  for (const act of matched) {
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

  return {
    copied: toCopy.length,
    skipped: matched.length - toCopy.length,
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

async function getGoalActivationPreview(goalSlug) {
  const goal = getGoalBySlug(goalSlug);
  if (!goal) return null;

  if (goal.scheduleName) {
    const scheduleResult = await db.query(
      'SELECT id FROM default_schedule WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [goal.scheduleName]
    );
    if (scheduleResult.rows.length === 0) {
      return { type: 'schedule', items: [] };
    }
    const items = await db.query(
      `SELECT name, icon, star_value
       FROM default_schedule_item
       WHERE default_schedule_id = $1
       ORDER BY sort_order ASC`,
      [scheduleResult.rows[0].id]
    );
    return { type: 'schedule', items: items.rows };
  }

  if (goal.activityNames && goal.activityNames.length > 0) {
    const defaults = await db.query(
      'SELECT name, icon, star_value FROM default_activity_template ORDER BY sort_order ASC'
    );
    return { type: 'activities', items: findByNames(defaults.rows, goal.activityNames) };
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
      for (const child of verifiedChildren) {
        scheduleResult = await copySchedule(
          client,
          familyId,
          child.id,
          goal.scheduleName,
          goal.scheduleDays || [1, 2, 3, 4, 5],
          overwrite,
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
  verifyChildAccess,
  buildActivationSuccessMessage,
  buildActivationNextStep,
  scheduleActivatableLabel,
  starValueForItem,
  lookupStarOverride,
};
