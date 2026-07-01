'use strict';

/**
 * Server-side activation orchestrator for För dig goals.
 * Reuses standard-library copy logic patterns.
 */

const db = require('./db');
const { getGoalBySlug } = require('./for-dig-config');
const { broadcast } = require('./sse-broadcast');
const { syncDailyLogWithSchedule } = require('./daily-log-generator');

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

  if (result.schedule) {
    return {
      label: 'Visa schema',
      href: `/schedule?child=${childId}`,
      hint: 'Rutinen är redan inlagd i veckoschemat.',
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

async function copySchedule(client, familyId, childId, scheduleName, days, overwrite) {
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
  for (const item of items.rows) {
    const existing = await client.query(
      `SELECT id FROM activity_template WHERE family_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [familyId, item.name]
    );

    if (existing.rows.length > 0) {
      activityTemplateMap[item.name] = existing.rows[0].id;
    } else {
      const newTemplate = await client.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, is_favorite, sort_order)
         VALUES ($1, $2, $3, $4, false, $5) RETURNING id`,
        [familyId, item.name, item.icon, item.star_value, item.sort_order || 0]
      );
      const templateId = newTemplate.rows[0].id;
      activityTemplateMap[item.name] = templateId;

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

  return { scheduleId, scheduleName, filledDays, activityTemplateMap };
}

async function copyActivities(client, familyId, activityNames) {
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

  const existing = await client.query(
    `SELECT LOWER(name) AS lname FROM activity_template WHERE family_id = $1`,
    [familyId]
  );
  const existingNames = new Set(existing.rows.map((a) => a.lname));

  const toCopy = matched.filter((a) => !existingNames.has(normalizeName(a.name)));
  const maxSort = await client.query(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM activity_template WHERE family_id = $1`,
    [familyId]
  );
  let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

  for (const act of toCopy) {
    const newTemplate = await client.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, is_favorite, sort_order)
       VALUES ($1, $2, $3, $4, false, $5) RETURNING id`,
      [familyId, act.name, act.icon, act.star_value, nextOrder++]
    );
    const templateId = newTemplate.rows[0].id;
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

  return { copied: toCopy.length, skipped: matched.length - toCopy.length, matched: matched.length };
}

async function copyRewards(client, familyId, rewardNames) {
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
    await client.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, sort_order, source_default_id, modified_by_family)
       VALUES ($1, $2, $3, $4, false, true, $5, $6, false)`,
      [familyId, r.name, r.icon, r.star_cost, nextOrder++, r.id]
    );
  }

  return { copied: toCopy.length, skipped: matched.length - toCopy.length, matched: matched.length };
}

async function activateGoal({ parentId, familyId, childId, goalSlug, overwrite = true }) {
  const goal = getGoalBySlug(goalSlug);
  if (!goal) {
    const err = new Error('Utvecklingsmålet hittades inte.');
    err.status = 404;
    throw err;
  }

  const child = await verifyChildAccess(parentId, childId);
  if (!child) {
    const err = new Error('Du har inte åtkomst till detta barn.');
    err.status = 403;
    throw err;
  }

  const client = await db.getClient();
  let scheduleResult = null;
  let activityResult = null;
  let rewardResult = null;

  try {
    await client.query('BEGIN');

    if (goal.scheduleName) {
      scheduleResult = await copySchedule(
        client,
        familyId,
        childId,
        goal.scheduleName,
        goal.scheduleDays || [1, 2, 3, 4, 5],
        overwrite
      );
    }

    if (goal.activityNames && goal.activityNames.length > 0) {
      activityResult = await copyActivities(client, familyId, goal.activityNames);
    }

    if (goal.rewardNames && goal.rewardNames.length > 0) {
      rewardResult = await copyRewards(client, familyId, goal.rewardNames);
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

  if (scheduleResult?.filledDays?.length) {
    for (const dow of scheduleResult.filledDays) {
      try {
        await syncDailyLogWithSchedule(childId, dow);
      } catch (syncErr) {
        console.error('[FOR-DIG] Sync error (non-fatal):', syncErr.message);
      }
    }
    broadcast(familyId, 'SCHEDULE_UPDATED', { childId });
  }

  return {
    goal,
    child_name: child.name,
    schedule: scheduleResult,
    activities: activityResult,
    rewards: rewardResult,
  };
}

module.exports = {
  activateGoal,
  verifyChildAccess,
  buildActivationSuccessMessage,
  buildActivationNextStep,
  scheduleActivatableLabel,
};
