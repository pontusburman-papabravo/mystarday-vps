/**
 * Weekly summary scheduler.
 *
 * Fires every Sunday at 21:00 Europe/Stockholm time.
 * Aggregates stars earned, routines completed, and mood ratings for the past week.
 * Sends a formatted email to every parent with weekly_summary = true in notification_preference.
 *
 * Does NOT manage any other notification type — reward redemption notifications
 * live in src/routes/rewards.js.
 */

const db = require('./db');
const { sendEmail } = require('./email');
const config = require('./config');
const { t } = require('./i18n');
const { validateLocale } = require('./locale');
const { resolveCommunicationLocale } = require('./communication-locale');
const { buildNotificationEmailFooterHtml } = require('./email-notification-footer');
const { escapeHtml, escapeUserDisplay, escapeFirstName } = require('./email-html');
const { buildOptOutUrl } = require('./notification-email-opt-out');
const { WEEKLY_SUMMARY_SCHEDULER_LOCK_ID } = require('./scheduler-constants');
const {
  getStockholmDateParts,
  stockholmWallClockToUtcMs,
  addDaysToStockholmDate,
} = require('./stockholm-time');

function msUntilNextSunday2100Stockholm({ afterRun = false, now = new Date() } = {}) {
  const parts = getStockholmDateParts(now);

  let daysUntilSunday = (7 - parts.localDow) % 7;
  let targetDate = { year: parts.year, month: parts.month, day: parts.day };
  if (daysUntilSunday > 0) {
    targetDate = addDaysToStockholmDate(parts.year, parts.month, parts.day, daysUntilSunday);
  }

  let utcMs = stockholmWallClockToUtcMs(targetDate.year, targetDate.month, targetDate.day, 21, 0);
  let ms = utcMs - now.getTime();

  if (ms <= 0 && !afterRun) {
    return 0;
  }

  if (ms <= 0 && afterRun) {
    targetDate = addDaysToStockholmDate(targetDate.year, targetDate.month, targetDate.day, 7);
    utcMs = stockholmWallClockToUtcMs(targetDate.year, targetDate.month, targetDate.day, 21, 0);
    ms = utcMs - now.getTime();
  }

  return Math.max(0, ms);
}

function getStockholmWeekKey(date = new Date()) {
  const parts = getStockholmDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Aggregate data for a child over the past 7 days.
 */
async function aggregateChildWeek(childId, startDate, endDate) {
  const starsResult = await db.query(
    `SELECT COALESCE(SUM(dli.star_value) FILTER (WHERE dli.completed = true), 0) AS stars_earned,
            COUNT(*) FILTER (WHERE dli.completed = true) AS routines_completed,
            COUNT(*) AS routines_total
     FROM daily_log dl
     JOIN daily_log_item dli ON dli.daily_log_id = dl.id
     WHERE dl.child_id = $1 AND dl.date >= $2 AND dl.date <= $3`,
    [childId, startDate, endDate]
  );

  let manualStars = 0;
  try {
    const manualResult = await db.query(
      `SELECT COALESCE(SUM(star_count), 0) AS manual
       FROM manual_star_grant
       WHERE child_id = $1
         AND created_at >= $2::date
         AND created_at < ($3::date + interval '1 day')`,
      [childId, startDate, endDate]
    );
    manualStars = parseInt(manualResult.rows[0].manual, 10);
  } catch (_) {
    // Table may not exist on old instances
  }

  // Mood: average of child ratings (score 1–10) from this week
  const moodResult = await db.query(
    `SELECT ROUND(AVG(r.score), 1) AS avg_mood, COUNT(*) AS mood_count
     FROM rating r
     JOIN daily_log_item dli ON dli.id = r.daily_log_item_id
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dl.date >= $2 AND dl.date <= $3
       AND r.user_type = 'child'`,
    [childId, startDate, endDate]
  );

  return {
    starsEarned: parseInt(starsResult.rows[0].stars_earned, 10) + manualStars,
    routinesCompleted: parseInt(starsResult.rows[0].routines_completed, 10),
    routinesTotal: parseInt(starsResult.rows[0].routines_total, 10),
    avgMood: moodResult.rows[0].avg_mood ? parseFloat(moodResult.rows[0].avg_mood) : null,
    moodCount: parseInt(moodResult.rows[0].mood_count, 10),
  };
}

function brandName() {
  return config.email.fromName || 'Stjärndag';
}

/**
 * Format a mood score (1–10) as a localized description with emoji.
 */
function formatMood(score, locale = 'sv-SE') {
  if (score === null) return null;
  const lang = validateLocale(locale);
  const scoreStr = String(score);
  if (score >= 8) return t(lang, 'email.weeklySummary.moodVeryHappy', { score: scoreStr });
  if (score >= 6) return t(lang, 'email.weeklySummary.moodHappy', { score: scoreStr });
  if (score >= 4) return t(lang, 'email.weeklySummary.moodNeutral', { score: scoreStr });
  return t(lang, 'email.weeklySummary.moodSad', { score: scoreStr });
}

/**
 * Pick the single most "braggable" highlight across all children this week.
 */
function buildWeekHighlight(children, locale = 'sv-SE') {
  const lang = validateLocale(locale);
  let best = null;
  for (const { child, stats } of children) {
    const rawName = (child.name || '').trim();
    const name = escapeUserDisplay(rawName) || t(lang, 'email.weeklySummary.genericChildName');
    if (stats.starsEarned > 0 && (!best || stats.starsEarned > best.stars)) {
      best = {
        stars: stats.starsEarned,
        childEmoji: child.emoji || '⭐',
        childName: name,
      };
    }
  }
  if (!best) return null;
  return t(lang, 'email.weeklySummary.highlight', {
    childEmoji: best.childEmoji,
    childName: best.childName,
    stars: String(best.stars),
  });
}

/**
 * Encouragement copy matched to actual week activity — avoid praising zero progress.
 */
function buildEncouragementMessage(children, locale = 'sv-SE') {
  const lang = validateLocale(locale);
  const totalCompleted = children.reduce((sum, c) => sum + c.stats.routinesCompleted, 0);
  const totalStars = children.reduce((sum, c) => sum + c.stats.starsEarned, 0);

  if (totalStars === 0 && totalCompleted === 0) {
    return t(lang, 'email.weeklySummary.encourageNoActivity');
  }
  if (totalCompleted > 0) {
    return t(lang, 'email.weeklySummary.encourageProgress');
  }
  return t(lang, 'email.weeklySummary.encourageSmallSteps');
}

/**
 * Build HTML email body for the weekly summary.
 */
function buildWeeklySummaryHtml(parentName, weekLabel, children, { optOutUrl, locale = 'sv-SE' } = {}) {
  const lang = validateLocale(locale);
  const brand = brandName();
  const firstName = escapeFirstName(parentName) || t(lang, 'email.common.genericParent');
  const highlight = buildWeekHighlight(children, lang);
  const baseUrl = config.email.baseUrl.replace(/\/$/, '');
  const shareUrl = `${baseUrl}/?utm_source=weekly_summary&utm_medium=email&utm_campaign=share`;
  const safeWeekLabel = escapeHtml(weekLabel);
  const shareText = highlight
    ? t(lang, 'email.weeklySummary.shareTextWithHighlight', { highlight, brand })
    : t(lang, 'email.weeklySummary.shareTextGeneric', { brand });
  const waShareHref = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;

  const highlightBanner = highlight
    ? `
      <div style="background:linear-gradient(135deg,#FFE9A8,#FFD56B);border-radius:12px;padding:18px 20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;color:#7A4E00;font-size:17px;font-weight:700;">${highlight}</p>
      </div>`
    : '';

  const shareBlock = `
      <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #E8ECF4;">
        <p style="margin:0 0 12px;color:#5A6178;font-size:14px;">${t(lang, 'email.weeklySummary.sharePrompt')}</p>
        <a href="${waShareHref}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:999px;font-size:14px;margin:0 4px 8px;">${t(lang, 'email.weeklySummary.shareWhatsApp')}</a>
        <a href="${escapeHtml(shareUrl)}" style="display:inline-block;background:#1B2340;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:999px;font-size:14px;margin:0 4px 8px;">${t(lang, 'email.weeklySummary.shareFriend')}</a>
      </div>`;

  const childSections = children.map(({ child, stats }) => {
    const completionPct = stats.routinesTotal > 0
      ? Math.round((stats.routinesCompleted / stats.routinesTotal) * 100)
      : 0;

    const moodLine = stats.avgMood !== null && stats.moodCount >= 2
      ? `<tr><td style="padding:4px 0;color:#5A6178;">${t(lang, 'email.weeklySummary.moodAverage')}</td><td style="padding:4px 0;text-align:right;font-weight:600;color:#1B2340;">${formatMood(stats.avgMood, lang)}</td></tr>`
      : '';

    return `
      <div style="border:1px solid #E8ECF4;border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="margin:0 0 12px;color:#1B2340;font-size:18px;">${escapeHtml(child.emoji || '⭐')} ${escapeUserDisplay(child.name) || t(lang, 'email.weeklySummary.genericChildName')}</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#5A6178;">${t(lang, 'email.weeklySummary.starsEarned')}</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;color:#F5A623;">⭐ ${stats.starsEarned}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#5A6178;">${t(lang, 'email.weeklySummary.routinesCompleted')}</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;color:#1B2340;">${t(lang, 'email.weeklySummary.routinesOf', { completed: String(stats.routinesCompleted), total: String(stats.routinesTotal), pct: String(completionPct) })}</td>
          </tr>
          ${moodLine}
        </table>
        <div style="margin-top:12px;background:#E8F5E9;border-radius:8px;height:8px;overflow:hidden;">
          <div style="background:#4CAF50;height:8px;width:${completionPct}%;border-radius:8px;"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1B2340;">
      <h2 style="color:#1B2340;margin-bottom:4px;">${t(lang, 'email.weeklySummary.greeting', { name: firstName })}</h2>
      <p style="color:#5A6178;margin-top:0;">${t(lang, 'email.weeklySummary.intro', { weekLabel: safeWeekLabel })}</p>

      ${highlightBanner}

      ${childSections}

      <div style="background:#FFF3D6;border-left:4px solid #F5A623;border-radius:8px;padding:14px 16px;margin-top:8px;">
        <p style="margin:0;color:#1B2340;font-size:14px;">
          ${buildEncouragementMessage(children, lang)}
        </p>
      </div>

      ${shareBlock}

      ${buildNotificationEmailFooterHtml({
        locale: lang,
        optOutUrl,
        optOutLabel: t(lang, 'email.notificationFooter.optOutWeeklySummary'),
      })}
    </div>
  `;
}

async function claimWeeklySummarySend(parentId, weekEndDate) {
  const { rows } = await db.query(
    `INSERT INTO weekly_summary_send_log (parent_id, week_end_date)
     VALUES ($1, $2)
     ON CONFLICT (parent_id, week_end_date) DO NOTHING
     RETURNING id`,
    [parentId, weekEndDate]
  );
  return rows.length > 0;
}

/**
 * Send weekly summary emails to all opted-in parents.
 */
async function runWeeklySummaryJob() {
  const client = await db.getClient();
  let lockAcquired = false;
  let sentCount = 0;
  let errorCount = 0;

  try {
    try {
      const { rows } = await client.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [WEEKLY_SUMMARY_SCHEDULER_LOCK_ID]
      );
      lockAcquired = rows[0].acquired;
    } catch (err) {
      console.error('[WEEKLY-SUMMARY] Failed to acquire advisory lock:', err.message);
      return;
    }

    if (!lockAcquired) {
      console.log('[WEEKLY-SUMMARY] Skipping — another instance holds the lock');
      return;
    }

    const weekKey = getStockholmWeekKey(new Date());
    if (_lastRunWeekKey === weekKey) {
      console.log('[WEEKLY-SUMMARY] Skipping — already ran this week in this process');
      return;
    }

    const stockholmParts = getStockholmDateParts(new Date());
    const endDate = `${stockholmParts.year}-${stockholmParts.month}-${stockholmParts.day}`;
    const endDateObj = new Date(`${stockholmParts.year}-${stockholmParts.month}-${stockholmParts.day}T12:00:00`);
    endDateObj.setDate(endDateObj.getDate() - 6);
    const startDate = endDateObj.toISOString().slice(0, 10);

    const weekLabel = `${startDate} – ${endDate}`;
    console.log(`[WEEKLY-SUMMARY] Starting job for ${weekLabel}`);

    const parentsResult = await db.query(
      `SELECT p.id AS parent_id, p.email, p.name AS parent_name, p.family_id,
              COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale,
              np.email_opt_out_token
       FROM parent p
       JOIN family f ON f.id = p.family_id
       JOIN notification_preference np ON np.parent_id = p.id
       WHERE np.weekly_summary = true AND np.email_enabled = true
         AND p.verified = true`,
      []
    );

    console.log(`[WEEKLY-SUMMARY] Found ${parentsResult.rows.length} opted-in parents`);

    for (const parent of parentsResult.rows) {
      try {
        const childrenResult = await db.query(
          `SELECT c.id, c.name, c.emoji
           FROM child c
           JOIN parent_child pc ON pc.child_id = c.id
           WHERE pc.parent_id = $1
           ORDER BY c.sort_order ASC, c.created_at ASC`,
          [parent.parent_id]
        );

        if (childrenResult.rows.length === 0) continue;

        const childData = [];
        for (const child of childrenResult.rows) {
          const stats = await aggregateChildWeek(child.id, startDate, endDate);
          childData.push({ child, stats });
        }

        const totalStars = childData.reduce((sum, c) => sum + c.stats.starsEarned, 0);
        const totalRoutines = childData.reduce((sum, c) => sum + c.stats.routinesTotal, 0);
        if (totalStars === 0 && totalRoutines === 0) {
          console.log(`[WEEKLY-SUMMARY] Skipping parent ${parent.parent_id} — no activity this week`);
          continue;
        }

        const claimed = await claimWeeklySummarySend(parent.parent_id, endDate);
        if (!claimed) {
          console.log(`[WEEKLY-SUMMARY] Skipping parent ${parent.parent_id} — already sent for ${endDate}`);
          continue;
        }

        const optOutUrl = parent.email_opt_out_token
          ? buildOptOutUrl(parent.email_opt_out_token, 'weekly_summary')
          : null;
        const locale = resolveCommunicationLocale(parent.preferred_locale);
        const html = buildWeeklySummaryHtml(parent.parent_name, weekLabel, childData, { optOutUrl, locale });
        await sendEmail({
          to: parent.email,
          subject: t(locale, 'email.weeklySummary.subject', { weekLabel }),
          html,
          apiKeyProfile: 'weekly',
          tags: [{ name: 'type', value: 'weekly_summary' }],
          unsubscribeUrl: optOutUrl || undefined,
        });

        sentCount++;
        console.log(`[WEEKLY-SUMMARY] Sent to parent ${parent.parent_id}`);
      } catch (err) {
        errorCount++;
        console.error(`[WEEKLY-SUMMARY] Failed for parent ${parent.parent_id}:`, err.message);
      }
    }

    _lastRunWeekKey = weekKey;
    console.log(`[WEEKLY-SUMMARY] Done. Sent=${sentCount} Errors=${errorCount}`);
  } catch (err) {
    console.error('[WEEKLY-SUMMARY] Job failed:', err.message);
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [WEEKLY_SUMMARY_SCHEDULER_LOCK_ID]).catch(() => {});
    }
    client.release();
    scheduleNextRun(true);
  }
}

let _timer = null;
let _lastRunWeekKey = null;

function scheduleNextRun(afterRun = false) {
  const ms = msUntilNextSunday2100Stockholm({ afterRun });
  const minutes = Math.round(ms / 60000);
  console.log(`[WEEKLY-SUMMARY] Next run in ${minutes} minutes (next Sunday 21:00 Stockholm)`);
  _timer = setTimeout(() => runWeeklySummaryJob(), ms);
  if (_timer.unref) _timer.unref();
}

/**
 * Start the weekly summary scheduler. Call once at server startup.
 */
function startWeeklySummaryScheduler() {
  scheduleNextRun(false);
  console.log('[WEEKLY-SUMMARY] Scheduler started');
}

/**
 * Stop the scheduler (for tests / graceful shutdown).
 */
function stopWeeklySummaryScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

/**
 * Run the job immediately (for manual trigger / testing).
 */
async function runWeeklySummaryNow() {
  return runWeeklySummaryJob();
}

module.exports = {
  startWeeklySummaryScheduler,
  stopWeeklySummaryScheduler,
  runWeeklySummaryNow,
  msUntilNextSunday2100Stockholm,
  getStockholmWeekKey,
  buildEncouragementMessage,
};
