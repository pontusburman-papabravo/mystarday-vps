/**
 * Daily log generator.
 *
 * Generates a daily_log + daily_log_items snapshot from the weekly_schedule.
 * Snapshot principle: changes to the weekly schedule template do NOT affect
 * already-generated daily logs.
 *
 * Called:
 *   1. At midnight (scheduled job) for all children
 *   2. On-demand when a parent or child first accesses the log for a date
 */

const db = require('./db');
const { resolveWeeklyScheduleId } = require('./custody-schedule-resolve');
const { getDayOfWeek } = require('./schedule-date-utils');

/**
 * Calculate child's age in years from a birthday string (YYYY-MM-DD).
 * Returns a floating-point number (e.g. 4.5 for a 4.5-year-old).
 * @param {string|null} birthday - ISO date string
 * @returns {number} Age in years, or null if birthday is not set
 */
function getChildAgeInYears(birthday) {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - birthDate.getTime();
  const ageYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(ageYears * 10) / 10; // Round to 1 decimal
}

/**
 * Determine the age-appropriate label for school-related activities.
 * - Ages 0–6 (including exactly 6): use "Skola/Förskola"
 * - Ages >6: use "Skola"
 *
 * When showing schedule items to a child, call this to get the correct variant name.
 *
 * @param {string|null} birthday
 * @returns {'Skola/Förskola' | 'Skola'}
 */
function getSchoolVariant(birthday) {
  const age = getChildAgeInYears(birthday);
  if (age === null) return 'Skola/Förskola'; // Default to younger variant
  if (age <= 6) return 'Skola/Förskola';
  return 'Skola';
}

/**
 * Batch insert daily_log_items in a single query.
 * Replaces N sequential INSERTs with one multi-row INSERT.
 *
 * @param {object} q  - db or pg client
 * @param {string} logId - daily_log UUID
 * @param {Array}  items - rows with { activity_template_id, name, icon, image_url, start_time, end_time, star_value, sort_order, section }
 */
async function batchInsertDailyLogItems(q, logId, items) {
  if (!items || items.length === 0) return;
  const valueClauses = [];
  const params = [];
  let pi = 1;
  for (const item of items) {
    valueClauses.push(`($${pi}, $${pi + 1}, $${pi + 2}, $${pi + 3}, $${pi + 4}, $${pi + 5}, $${pi + 6}, $${pi + 7}, $${pi + 8}, $${pi + 8}, $${pi + 9})`);
    params.push(logId, item.activity_template_id, item.name, item.icon, item.image_url || null,
      item.start_time, item.end_time, item.star_value, item.sort_order, item.section);
    pi += 10;
  }
  await q.query(
    `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, image_url, start_time, end_time, star_value, sort_order, child_sort_order, section) VALUES ${valueClauses.join(', ')}`,
    params
  );
}

/**
 * Get the ISO date string (YYYY-MM-DD) in the child's timezone.
 * Falls back to Europe/Stockholm.
 */
function getLocalDateStr(dateInput, timezone) {
  const tz = timezone || 'Europe/Stockholm';
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleDateString('sv-SE', { timeZone: tz }); // sv-SE produces YYYY-MM-DD
}

/**
 * Generate (or retrieve) the daily log for a child on a specific date.
 *
 * @param {string} childId  - UUID of the child
 * @param {string} dateStr  - ISO date string YYYY-MM-DD (local date)
 * @param {object} [client] - Optional pg client (for transactions). Uses pool if omitted.
 * @returns {Promise<{ log: object, items: object[], generated: boolean }>}
 */
async function getOrGenerateDailyLog(childId, dateStr, client) {
  const q = client || db;

  // ── 1. Check if log already exists ──────────────────────
  const existing = await q.query(
    `SELECT dl.id, dl.child_id, dl.date, dl.is_paused, dl.generated_from, dl.created_at
     FROM daily_log dl
     WHERE dl.child_id = $1 AND dl.date = $2`,
    [childId, dateStr]
  );

  if (existing.rows.length > 0) {
    const log = existing.rows[0];
    const items = await q.query(
      `SELECT dli.id, dli.daily_log_id, dli.activity_template_id, dli.is_once_task, dli.name, dli.icon,
              COALESCE(dli.image_url, at.image_url) AS image_url,
              dli.start_time, dli.end_time, dli.star_value, dli.completed, dli.completed_at,
              dli.sort_order, dli.child_sort_order, dli.section,
              dli.parent_note, dli.child_note,
              COALESCE(at.feedback_for, 'both') AS feedback_for
       FROM daily_log_item dli
       LEFT JOIN activity_template at ON at.id = dli.activity_template_id
       WHERE dli.daily_log_id = $1
       ORDER BY CASE dli.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, dli.sort_order ASC, dli.start_time ASC NULLS LAST`,
      [log.id]
    );

    // BUG-10 FIX: If log exists but has 0 items, check if a schedule now exists
    // and populate items from it. Checks special day schedules first.
    if (items.rows.length === 0) {
      const childInfo = await q.query('SELECT id, timezone FROM child WHERE id = $1', [childId]);
      const tz = (childInfo.rows[0] && childInfo.rows[0].timezone) || 'Europe/Stockholm';

      // Check special day schedule first
      const specialResult = await q.query(
        `SELECT sds.id FROM special_day_schedule sds WHERE sds.child_id = $1 AND sds.date = $2`,
        [childId, dateStr]
      );
      if (specialResult.rows.length > 0) {
        const specialDayId = specialResult.rows[0].id;
        const specialItems = await q.query(
          `SELECT sdsi.activity_template_id, sdsi.name, sdsi.icon,
                  sdsi.start_time, sdsi.end_time, sdsi.star_value, sdsi.sort_order, sdsi.section,
                  at.image_url
           FROM special_day_schedule_item sdsi
           LEFT JOIN activity_template at ON at.id = sdsi.activity_template_id
           WHERE sdsi.special_day_schedule_id = $1
           ORDER BY CASE sdsi.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, sdsi.sort_order ASC`,
          [specialDayId]
        );
        if (specialItems.rows.length > 0) {
          // Batch insert all items in one query instead of N round-trips
          await batchInsertDailyLogItems(q, log.id, specialItems.rows);
          const populatedItems = await q.query(
            `SELECT dli.id, dli.daily_log_id, dli.activity_template_id, dli.is_once_task, dli.name, dli.icon,
                    COALESCE(dli.image_url, at.image_url) AS image_url,
                    dli.start_time, dli.end_time, dli.star_value, dli.completed, dli.completed_at,
                    dli.sort_order, dli.child_sort_order, dli.section,
                    COALESCE(at.feedback_for, 'both') AS feedback_for
             FROM daily_log_item dli
             LEFT JOIN activity_template at ON at.id = dli.activity_template_id
             WHERE dli.daily_log_id = $1
             ORDER BY CASE dli.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, dli.sort_order ASC, dli.start_time ASC NULLS LAST`,
            [log.id]
          );
          return { log, items: populatedItems.rows, generated: true, from_special_day: true };
        }
      }

      // Fall back to weekly schedule
      const scheduleId = await resolveWeeklyScheduleId(q, childId, dateStr, tz);
      if (scheduleId) {
        const scheduleItems = await q.query(
          `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
                  at.name, at.icon, at.image_url, at.star_value
           FROM weekly_schedule_item wsi
           JOIN activity_template at ON at.id = wsi.activity_template_id
           WHERE wsi.weekly_schedule_id = $1
           ORDER BY CASE wsi.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, wsi.sort_order ASC`,
          [scheduleId]
        );
        if (scheduleItems.rows.length > 0) {
          // Batch insert all items in one query
          await batchInsertDailyLogItems(q, log.id, scheduleItems.rows);
          // Update generated_from reference
          await q.query('UPDATE daily_log SET generated_from = $1 WHERE id = $2', [scheduleId, log.id]);
          // Re-fetch populated items
          const populatedItems = await q.query(
            `SELECT dli.id, dli.daily_log_id, dli.activity_template_id, dli.is_once_task, dli.name, dli.icon,
                    COALESCE(dli.image_url, at.image_url) AS image_url,
                    dli.start_time, dli.end_time, dli.star_value, dli.completed, dli.completed_at,
                    dli.sort_order, dli.child_sort_order, dli.section,
                    COALESCE(at.feedback_for, 'both') AS feedback_for
             FROM daily_log_item dli
             LEFT JOIN activity_template at ON at.id = dli.activity_template_id
             WHERE dli.daily_log_id = $1
             ORDER BY CASE dli.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, dli.sort_order ASC, dli.start_time ASC NULLS LAST`,
            [log.id]
          );
          return { log, items: populatedItems.rows, generated: true };
        }
      }
    }

    return { log, items: items.rows, generated: false };
  }

  // ── 2. Get child info (timezone) ─────────────────────────
  const childResult = await q.query(
    'SELECT id, timezone FROM child WHERE id = $1',
    [childId]
  );
  if (childResult.rows.length === 0) throw new Error('Child not found');

  const child = childResult.rows[0];
  const timezone = child.timezone || 'Europe/Stockholm';

  // ── 3. Get day of week for dateStr ───────────────────────
  const dayOfWeek = getDayOfWeek(dateStr, timezone);

  // ── 4a. Check for special day schedule override ──────────
  const specialDayResult = await q.query(
    `SELECT sds.id
     FROM special_day_schedule sds
     WHERE sds.child_id = $1 AND sds.date = $2`,
    [childId, dateStr]
  );

  if (specialDayResult.rows.length > 0) {
    const specialDayId = specialDayResult.rows[0].id;

    const specialItems = await q.query(
      `SELECT sdsi.activity_template_id, sdsi.name, sdsi.icon,
              sdsi.start_time, sdsi.end_time, sdsi.star_value, sdsi.sort_order, sdsi.section,
              at.image_url
       FROM special_day_schedule_item sdsi
       LEFT JOIN activity_template at ON at.id = sdsi.activity_template_id
       WHERE sdsi.special_day_schedule_id = $1
       ORDER BY CASE sdsi.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, sdsi.sort_order ASC`,
      [specialDayId]
    );

    if (specialItems.rows.length > 0) {
      const logResult = await q.query(
        `INSERT INTO daily_log (child_id, date, is_paused, generated_from)
         VALUES ($1, $2, false, NULL)
         ON CONFLICT (child_id, date) DO UPDATE SET generated_from = NULL
         RETURNING id, child_id, date, is_paused, generated_from, created_at`,
        [childId, dateStr]
      );
      const log = logResult.rows[0];

      // Batch insert all items in one query
      await batchInsertDailyLogItems(q, log.id, specialItems.rows);

      const items = await q.query(
        `SELECT dli.id, dli.daily_log_id, dli.activity_template_id, dli.is_once_task, dli.name, dli.icon,
                COALESCE(dli.image_url, at.image_url) AS image_url,
                dli.start_time, dli.end_time, dli.star_value, dli.completed, dli.completed_at,
                dli.sort_order, dli.child_sort_order, dli.section,
                dli.parent_note, dli.child_note,
                COALESCE(at.feedback_for, 'both') AS feedback_for
         FROM daily_log_item dli
         LEFT JOIN activity_template at ON at.id = dli.activity_template_id
         WHERE dli.daily_log_id = $1
         ORDER BY CASE dli.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, dli.sort_order ASC, dli.start_time ASC NULLS LAST`,
        [log.id]
      );

      return { log, items: items.rows, generated: true, from_special_day: true };
    }
    // Empty special day row — fall through to weekly schedule below
  }

  // ── 4b. Find weekly schedule for that day_of_week (custody-aware) ─
  const scheduleId = await resolveWeeklyScheduleId(q, childId, dateStr, timezone);

  // ── 5. Create the daily_log record ───────────────────────

  const logResult = await q.query(
    `INSERT INTO daily_log (child_id, date, is_paused, generated_from)
     VALUES ($1, $2, false, $3)
     ON CONFLICT (child_id, date) DO UPDATE SET generated_from = EXCLUDED.generated_from
     RETURNING id, child_id, date, is_paused, generated_from, created_at`,
    [childId, dateStr, scheduleId]
  );
  const log = logResult.rows[0];

  // ── 6. Copy schedule items → daily_log_items (snapshot) ──
  if (scheduleId) {
    const scheduleItems = await q.query(
      `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
              at.name, at.icon, at.image_url, at.star_value
       FROM weekly_schedule_item wsi
       JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE wsi.weekly_schedule_id = $1
       ORDER BY CASE wsi.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, wsi.sort_order ASC`,
      [scheduleId]
    );

    // Batch insert all items in one query instead of N round-trips
    await batchInsertDailyLogItems(q, log.id, scheduleItems.rows);
  }

  // ── 7. Return fresh log + items ───────────────────────────
  const items = await q.query(
    `SELECT dli.id, dli.daily_log_id, dli.activity_template_id, dli.is_once_task, dli.name, dli.icon,
            COALESCE(dli.image_url, at.image_url) AS image_url,
            dli.start_time, dli.end_time, dli.star_value, dli.completed, dli.completed_at,
            dli.sort_order, dli.child_sort_order, dli.section,
            COALESCE(at.feedback_for, 'both') AS feedback_for
     FROM daily_log_item dli
     LEFT JOIN activity_template at ON at.id = dli.activity_template_id
     WHERE dli.daily_log_id = $1
     ORDER BY CASE dli.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, dli.sort_order ASC, dli.start_time ASC NULLS LAST`,
    [log.id]
  );

  return { log, items: items.rows, generated: true };
}

/**
 * Generate daily logs for ALL children for a given date.
 * Used by the midnight scheduler.
 *
 * @param {string} [dateStr] - YYYY-MM-DD, defaults to today (UTC)
 */
async function generateLogsForAllChildren(dateStr) {
  if (!dateStr) {
    dateStr = new Date().toISOString().slice(0, 10);
  }

  const childResult = await db.query('SELECT id, timezone FROM child');
  const children = childResult.rows;

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const child of children) {
    // Use child's local date
    const localDate = getLocalDateStr(new Date(`${dateStr}T00:00:00Z`), child.timezone);
    try {
      const result = await getOrGenerateDailyLog(child.id, localDate);
      if (result.generated) generated++;
      else skipped++;
    } catch (err) {
      errors++;
      console.error(`[DAILY-LOG-GEN] Error for child ${child.id}:`, err.message);
    }
  }

  console.log(`[DAILY-LOG-GEN] ${dateStr}: generated=${generated} skipped=${skipped} errors=${errors}`);
  return { generated, skipped, errors };
}


/**
 * Sync daily logs for all children in a family who have a given activity_template
 * in today's schedule. Called when an activity template's name/icon/star_value changes.
 *
 * @param {string} familyId           - UUID of the family
 * @param {string} activityTemplateId - UUID of the changed template
 * @param {object} [client]           - Optional pg client
 */
async function syncDailyLogsForTemplateChange(familyId, activityTemplateId, client) {
  const q = client || db;

  // Find all children in this family
  const childrenResult = await q.query(
    'SELECT id, timezone FROM child WHERE family_id = $1',
    [familyId]
  );

  for (const child of childrenResult.rows) {
    const tz = child.timezone || 'Europe/Stockholm';
    const today = getLocalDateStr(new Date(), tz);
    const todayDow = getDayOfWeek(today, tz);

    // Check if this template is used in today's schedule for this child
    const inSchedule = await q.query(
      `SELECT wsi.id FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE ws.child_id = $1 AND ws.day_of_week = $2 AND wsi.activity_template_id = $3`,
      [child.id, todayDow, activityTemplateId]
    );

    if (inSchedule.rows.length > 0) {
      await syncDailyLogWithSchedule(child.id, todayDow, q);
    }
  }
}

/**
 * Sync the daily log for a specific date with the current special day schedule.
 * Called when a special day schedule item is added, removed, or updated.
 * The daily log snapshot is updated to match the special day schedule.
 *
 * @param {string} scheduleId   - special_day_schedule.id
 * @param {string} scheduleDate  - YYYY-MM-DD of the special day (from schedule.date)
 * @param {string} childId       - UUID of the child
 * @param {object} [client]      - Optional pg client
 * @returns {Promise<{ synced: boolean, removed?: number, updated?: number }>}
 */
async function syncDailyLogForSpecialDay(scheduleId, scheduleDate, childId, client) {
  const q = client || db;

  // Find daily log for this specific date
  const logResult = await q.query(
    'SELECT id FROM daily_log WHERE child_id = $1 AND date = $2',
    [childId, scheduleDate]
  );
  if (logResult.rows.length === 0) return { synced: false, reason: 'no_log' };
  const logId = logResult.rows[0].id;

  // Get current special day schedule items (the desired state)
  const sdsiResult = await q.query(
    `SELECT sdsi.activity_template_id, sdsi.name, sdsi.icon,
            sdsi.start_time, sdsi.end_time, sdsi.star_value, sdsi.sort_order, sdsi.section,
            at.image_url
     FROM special_day_schedule_item sdsi
     LEFT JOIN activity_template at ON at.id = sdsi.activity_template_id
     WHERE sdsi.special_day_schedule_id = $1
     ORDER BY CASE sdsi.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, sdsi.sort_order ASC`,
    [scheduleId]
  );
  const scheduleItems = sdsiResult.rows;

  // Get current daily log items
  const dliResult = await q.query(
    `SELECT id, activity_template_id, is_once_task, name, icon, start_time, end_time,
            star_value, completed, sort_order, section
     FROM daily_log_item
     WHERE daily_log_id = $1`,
    [logId]
  );
  const dailyItems = dliResult.rows;

  const schedTemplateIds = new Set(scheduleItems.map(si => si.activity_template_id));
  let removed = 0, updated = 0;

  // REMOVE — daily log items whose template is no longer in the special day schedule
  // Engångsaktiviteter are always preserved — never delete them
  for (const di of dailyItems) {
    if (di.activity_template_id == null || di.is_once_task) continue; // behåll engångsaktiviteter
    if (!schedTemplateIds.has(di.activity_template_id) && !di.completed) {
      await q.query('DELETE FROM daily_log_item WHERE id = $1', [di.id]);
      removed++;
    }
  }

  // UPDATE — items present in both: refresh properties from special day schedule
  for (const si of scheduleItems) {
    const matches = dailyItems.filter(di => di.activity_template_id === si.activity_template_id);
    for (const di of matches) {
      if (di.is_once_task) continue;
      if (!di.completed) {
        await q.query(
          `UPDATE daily_log_item
           SET name = $1, icon = $2, image_url = $3, start_time = $4, end_time = $5,
               star_value = $6, sort_order = $7, section = $8
           WHERE id = $9`,
          [si.name, si.icon, si.image_url || null, si.start_time, si.end_time,
           si.star_value, si.sort_order, si.section, di.id]
        );
        updated++;
      } else {
        await q.query(
          `UPDATE daily_log_item
           SET name = $1, icon = $2, image_url = $3, start_time = $4, end_time = $5,
               sort_order = $6, section = $7
           WHERE id = $8`,
          [si.name, si.icon, si.image_url || null, si.start_time, si.end_time,
           si.sort_order, si.section, di.id]
        );
        updated++;
      }
    }
  }

  // ADD — schedule items that are missing from the daily log
  const dailyTemplateIds = new Set(dailyItems.map(di => di.activity_template_id));
  let added = 0;
  for (const si of scheduleItems) {
    if (!dailyTemplateIds.has(si.activity_template_id)) {
      const maxResult = await q.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
         FROM daily_log_item WHERE daily_log_id = $1 AND section = $2`,
        [logId, si.section]
      );
      const nextOrder = maxResult.rows[0].next_order;
      await q.query(
        `INSERT INTO daily_log_item
           (daily_log_id, activity_template_id, name, icon, image_url, start_time, end_time,
            star_value, sort_order, child_sort_order, section)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)`,
        [logId, si.activity_template_id, si.name, si.icon, si.image_url || null,
         si.start_time, si.end_time, si.star_value, nextOrder, si.section]
      );
      added++;
    }
  }

  console.log(`[DAILY-LOG-SYNC-SPECIAL] child=${childId} date=${scheduleDate}: removed=${removed} updated=${updated} added=${added}`);
  return { synced: true, removed, updated, added };
}

/**
 * Sync the daily log for today (or a specific date) with the weekly schedule.
 *
 * @param {string} childId   - UUID of the child
 * @param {number} dayOfWeek - 0-6 (the day_of_week that was modified)
 * @param {object} [client]  - Optional pg client
 * @param {string} [targetDate] - Optional YYYY-MM-DD; if provided, syncs that date's daily log
 */
async function syncDailyLogWithSchedule(childId, dayOfWeek, client, targetDate) {
  const q = client || db;

  // Get child timezone
  const childResult = await q.query('SELECT timezone FROM child WHERE id = $1', [childId]);
  const tz = (childResult.rows[0]?.timezone) || 'Europe/Stockholm';

  // Determine which date to sync
  let syncDate = null;
  if (targetDate) {
    // Explicit date provided (special day sync path) — use it directly
    syncDate = targetDate;
  } else {
    // Original weekly schedule path — sync today only
    const today = getLocalDateStr(new Date(), tz);
    const todayDow = getDayOfWeek(today, tz);
    if (dayOfWeek !== todayDow) return { synced: false, reason: 'not_today' };
    syncDate = today;
  }

  // Find today's daily log
  const logResult = await q.query(
    'SELECT id FROM daily_log WHERE child_id = $1 AND date = $2',
    [childId, syncDate]
  );
  if (logResult.rows.length === 0) return { synced: false, reason: 'no_log' };
  const logId = logResult.rows[0].id;

  // Get weekly schedule items for the day of week (custody-aware)
  const scheduleId = await resolveWeeklyScheduleId(q, childId, syncDate, tz);

  let scheduleItems = [];
  if (scheduleId) {
    const siResult = await q.query(
      `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
              at.name, at.icon, at.image_url, at.star_value
       FROM weekly_schedule_item wsi
       JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE wsi.weekly_schedule_id = $1
       ORDER BY CASE wsi.section WHEN 'morgon' THEN 1 WHEN 'dag' THEN 2 WHEN 'kvall' THEN 3 WHEN 'natt' THEN 4 ELSE 5 END, wsi.sort_order ASC`,
      [scheduleId]
    );
    scheduleItems = siResult.rows;
  }

  const dliResult = await q.query(
    `SELECT id, activity_template_id, is_once_task, name, icon, start_time, end_time,
            star_value, completed, sort_order, section
     FROM daily_log_item
     WHERE daily_log_id = $1`,
    [logId]
  );
  const dailyItems = dliResult.rows;

  const schedTemplateIds = new Set(scheduleItems.map(si => si.activity_template_id));
  const dailyByTemplate = new Map();
  for (const di of dailyItems) {
    if (!dailyByTemplate.has(di.activity_template_id)) {
      dailyByTemplate.set(di.activity_template_id, []);
    }
    dailyByTemplate.get(di.activity_template_id).push(di);
  }

  // Exclude items that were removed "bara denna dag" via schedule_date_exclusion
  let excludedTemplateIds = new Set();
  try {
    const exclRes = await q.query(
      `SELECT activity_template_id FROM schedule_date_exclusion
       WHERE child_id = $1 AND date = $2`,
      [childId, syncDate]
    );
    excludedTemplateIds = new Set(exclRes.rows.map(r => r.activity_template_id));
  } catch (_) { /* table may not exist yet during migration window */ }

  let added = 0, removed = 0, updated = 0;

  for (const si of scheduleItems) {
    if (excludedTemplateIds.has(si.activity_template_id)) continue;
    const existing = dailyByTemplate.get(si.activity_template_id);
    if (!existing || existing.length === 0) {
      await q.query(
        `INSERT INTO daily_log_item
           (daily_log_id, activity_template_id, name, icon, image_url, start_time, end_time,
            star_value, sort_order, child_sort_order, section)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)`,
        [logId, si.activity_template_id, si.name, si.icon, si.image_url || null,
         si.start_time, si.end_time, si.star_value, si.sort_order, si.section]
      );
      added++;
    }
  }

  for (const di of dailyItems) {
    if (di.activity_template_id == null || di.is_once_task) continue; // behåll engångsaktiviteter
    if (!schedTemplateIds.has(di.activity_template_id) && !di.completed) {
      await q.query('DELETE FROM daily_log_item WHERE id = $1', [di.id]);
      removed++;
    }
  }

  for (const si of scheduleItems) {
    const existing = dailyByTemplate.get(si.activity_template_id);
    if (!existing || existing.length === 0) continue;
    for (const di of existing) {
      if (di.is_once_task) continue;
      if (!di.completed) {
        await q.query(
          `UPDATE daily_log_item
           SET name = $1, icon = $2, image_url = $3, start_time = $4, end_time = $5,
               star_value = $6, sort_order = $7, section = $8
           WHERE id = $9`,
          [si.name, si.icon, si.image_url || null, si.start_time, si.end_time,
           si.star_value, si.sort_order, si.section, di.id]
        );
        updated++;
      } else {
        await q.query(
          `UPDATE daily_log_item
           SET name = $1, icon = $2, image_url = $3, start_time = $4, end_time = $5,
               sort_order = $6, section = $7
           WHERE id = $8`,
          [si.name, si.icon, si.image_url || null, si.start_time, si.end_time,
           si.sort_order, si.section, di.id]
        );
        updated++;
      }
    }
  }

  console.log(`[DAILY-LOG-SYNC] child=${childId} date=${syncDate}: added=${added} removed=${removed} updated=${updated}`);
  return { synced: true, added, removed, updated };
}

module.exports = {
  getOrGenerateDailyLog,
  generateLogsForAllChildren,
  syncDailyLogWithSchedule,
  syncDailyLogForSpecialDay,
  syncDailyLogsForTemplateChange,
  getLocalDateStr,
  getDayOfWeek,
  getChildAgeInYears,
  getSchoolVariant,
};
