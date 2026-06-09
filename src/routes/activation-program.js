/**
 * Parent activation program API — banner, aha, reflection (MVP Fas 2–4).
 */

const express = require('express');
const { DateTime } = require('luxon');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const programDb = require('../../db/parent-activation-program');
const seenDb = require('../../db/parent-seen-completion');
const {
  getCalendarDay,
  getEffectiveProgramDay,
  maybeExpireProgram,
  rolloverDayStatus,
  markDayDone,
  isDayDone,
  showReflection,
} = require('../lib/activation-program');
const { getDayContent } = require('../lib/activation-program-content');
const analytics = require('../lib/activation-program-analytics');
const { isActivationProgramEnabled } = require('../lib/activation-program-enroll');

const router = express.Router();
router.use(requireParent);

async function loadProgramContext(familyId, parentId) {
  let program = await programDb.getActiveByFamily(familyId);
  if (!program) return null;

  const timezone = await programDb.getFamilyTimezone(familyId);
  const expired = maybeExpireProgram(program, timezone);
  if (expired.status === 'expired' && program.status === 'active') {
    program = await programDb.updateStatus(program.id, 'expired');
  } else {
    program = expired;
  }

  return { program, timezone };
}

async function getFirstChildPreview(familyId) {
  const childResult = await db.query(
    `SELECT id, name, emoji, avatar_url FROM child
     WHERE family_id = $1
     ORDER BY sort_order ASC, created_at ASC
     LIMIT 1`,
    [familyId]
  );
  const child = childResult.rows[0];
  if (!child) return null;

  const tz = await programDb.getFamilyTimezone(familyId);
  const today = DateTime.now().setZone(tz).toISODate();

  const logResult = await db.query(
    `SELECT dl.id FROM daily_log dl
     WHERE dl.child_id = $1 AND dl.date = $2
     LIMIT 1`,
    [child.id, today]
  );
  let activities = [];
  if (logResult.rows[0]) {
    const items = await db.query(
      `SELECT name, section, completed, star_value
       FROM daily_log_item
       WHERE daily_log_id = $1
       ORDER BY sort_order ASC
       LIMIT 4`,
      [logResult.rows[0].id]
    );
    activities = items.rows;
  }

  return {
    child_id: child.id,
    child_name: child.name,
    child_emoji: child.emoji,
    child_avatar_url: child.avatar_url,
    activities,
  };
}

async function buildProgramResponse(program, timezone, parentId, familyId, markBannerSeen) {
  const calendarDay = getCalendarDay(program, timezone);
  const effectiveDay = getEffectiveProgramDay(program, timezone);
  let dayStatus = rolloverDayStatus(program.day_status || {}, effectiveDay);

  const dayKey = String(effectiveDay);
  if (!dayStatus[dayKey]) dayStatus[dayKey] = 'pending';

  const childName = (await getFirstChildPreview(familyId))?.child_name || 'barnet';
  let content = getDayContent(effectiveDay, { childName });

  const hasChildCompletion = await seenDb.hasChildCompletionSince(familyId, program.started_at);

  if (effectiveDay >= 3 && !hasChildCompletion && content.supportive_fallback) {
    content = {
      ...content,
      body: content.supportive_fallback,
      is_supportive_fallback: true,
    };
    if (!isDayDone(dayStatus, 3) && !isDayDone(program.day_status || {}, 3)) {
      const marked = markDayDone(dayStatus, 3, 'supportive_fallback');
      dayStatus = marked.dayStatus;
      analytics.trackDayDone(familyId, 3, 'supportive_fallback', true);
    }
  }

  if (showReflection(program, timezone)) {
    content = {
      ...getDayContent(7, { childName }),
      show_reflection: true,
    };
  }

  const preview = effectiveDay === 1 ? await getFirstChildPreview(familyId) : null;

  let dayAdvanced = effectiveDay > program.last_seen_day;
  let firstBannerSeen = false;

  if (markBannerSeen && program.cohort_arm === 'treatment') {
    const updated = await programDb.setFirstBannerSeenAt(program.id);
    if (updated && !program.first_banner_seen_at) {
      firstBannerSeen = true;
      const hoursSinceEnroll = DateTime.fromJSDate(new Date(program.started_at), { zone: 'utc' })
        .diffNow('hours').negate().hours;
      analytics.trackFirstBannerSeen(
        familyId,
        effectiveDay,
        Math.round(hoursSinceEnroll * 10) / 10
      );
    }
    if (dayAdvanced) {
      await programDb.updateLastSeenDay(program.id, effectiveDay);
    }
    if (JSON.stringify(dayStatus) !== JSON.stringify(program.day_status || {})) {
      await programDb.updateDayStatus(program.id, dayStatus);
    }
  }

  const ahaMoments = program.cohort_arm === 'treatment'
    ? await seenDb.getUnseenCompletions(parentId, familyId, program.started_at)
    : [];

  return {
    active: true,
    cohort_arm: program.cohort_arm,
    status: program.status,
    program_type: program.program_type,
    calendar_day: calendarDay,
    effective_day: effectiveDay,
    last_seen_day: program.last_seen_day,
    day_advanced: dayAdvanced,
    first_banner_seen: firstBannerSeen,
    day_status: dayStatus,
    content,
    preview,
    aha_moments: ahaMoments.map((m) => ({
      child_id: m.child_id,
      child_name: m.child_name,
      activity_name: m.activity_name,
      daily_log_item_id: m.daily_log_item_id,
      completed_at: m.completed_at,
    })),
    show_reflection: showReflection(program, timezone),
    reflection_score: program.reflection_score,
    reflection_text: program.reflection_text,
  };
}

/**
 * GET /api/me/activation-program
 * Treatment + active → full payload. Control → active:false (no UI).
 */
router.get('/', async (req, res) => {
  try {
    if (!isActivationProgramEnabled()) {
      return res.json({ active: false });
    }

    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.status !== 'active') {
      return res.json({ active: false, status: ctx?.program?.status || null });
    }

    if (ctx.program.cohort_arm === 'control') {
      return res.json({
        active: false,
        cohort_arm: 'control',
        status: 'active',
      });
    }

    const payload = await buildProgramResponse(
      ctx.program,
      ctx.timezone,
      req.user.id,
      req.user.familyId,
      true
    );
    res.json(payload);
  } catch (err) {
    console.error('[ACTIVATION] GET error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/skip-day', async (req, res) => {
  try {
    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.cohort_arm !== 'treatment' || ctx.program.status !== 'active') {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }
    const effectiveDay = getEffectiveProgramDay(ctx.program, ctx.timezone);
    const dayStatus = { ...(ctx.program.day_status || {}), [String(effectiveDay)]: 'skipped' };
    await programDb.updateDayStatus(ctx.program.id, dayStatus);
    analytics.trackDaySkipped(req.user.familyId, effectiveDay);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION] skip-day error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/complete-day', async (req, res) => {
  try {
    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.cohort_arm !== 'treatment' || ctx.program.status !== 'active') {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }
    const day = req.body.day || getEffectiveProgramDay(ctx.program, ctx.timezone);
    const { dayStatus } = markDayDone(ctx.program.day_status || {}, day, 'manual');
    await programDb.updateDayStatus(ctx.program.id, dayStatus);
    analytics.trackDayDone(req.user.familyId, day, 'manual', false);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION] complete-day error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/solo-day', async (req, res) => {
  try {
    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.cohort_arm !== 'treatment' || ctx.program.status !== 'active') {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }
    const { dayStatus } = markDayDone(ctx.program.day_status || {}, 6, 'solo_dismiss');
    await programDb.updateDayStatus(ctx.program.id, dayStatus);
    analytics.trackDayDone(req.user.familyId, 6, 'solo_dismiss', false);
    analytics.trackDaySolo(req.user.familyId, 6);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION] solo-day error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/opt-out', async (req, res) => {
  try {
    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.status !== 'active') {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }
    const effectiveDay = getEffectiveProgramDay(ctx.program, ctx.timezone);
    await programDb.updateStatus(ctx.program.id, 'opted_out');
    analytics.trackOptedOut(req.user.familyId, effectiveDay);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION] opt-out error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/reflection', async (req, res) => {
  try {
    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.cohort_arm !== 'treatment') {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }
    if (!showReflection(ctx.program, ctx.timezone) && ctx.program.status === 'active') {
      return res.status(400).json({ error: 'Reflektionen är inte tillgänglig än' });
    }

    const score = parseInt(req.body.score, 10);
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Ogiltigt betyg' });
    }
    const text = req.body.text ? String(req.body.text).trim().substring(0, 500) : null;

    const { dayStatus } = markDayDone(ctx.program.day_status || {}, 7, 'reflection');
    await programDb.updateDayStatus(ctx.program.id, dayStatus);
    await programDb.updateStatus(ctx.program.id, 'completed', {
      reflectionScore: score,
      reflectionText: text,
    });
    analytics.trackDayDone(req.user.familyId, 7, 'reflection', false);
    analytics.trackProgramCompleted(req.user.familyId, score);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION] reflection error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * POST /api/me/activation-program/aha-seen
 * Mark completion seen + track parent_first_completion_seen.
 */
router.post('/aha-seen', async (req, res) => {
  try {
    const { daily_log_item_id: itemId } = req.body || {};
    if (!itemId) return res.status(400).json({ error: 'daily_log_item_id krävs' });

    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.cohort_arm !== 'treatment' || ctx.program.status !== 'active') {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }

    const itemResult = await db.query(
      `SELECT dli.id, dli.name, dli.completed_at, c.id AS child_id, c.name AS child_name
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE dli.id = $1 AND c.family_id = $2 AND dli.completed = true`,
      [itemId, req.user.familyId]
    );
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Aktiviteten hittades inte' });

    await seenDb.markSeen(req.user.id, itemId);

    const effectiveDay = getEffectiveProgramDay(ctx.program, ctx.timezone);
    const hoursSince = item.completed_at
      ? (Date.now() - new Date(item.completed_at).getTime()) / 3600000
      : 0;

    analytics.trackParentFirstCompletionSeen(req.user.familyId, {
      child_id: item.child_id,
      daily_log_item_id: itemId,
      activity_name: item.name,
      effective_day: effectiveDay,
      hours_since_completion: Math.round(hoursSince * 10) / 10,
    });

    if (effectiveDay >= 3 && !isDayDone(ctx.program.day_status || {}, 3)) {
      const { dayStatus } = markDayDone(ctx.program.day_status || {}, 3, 'aha');
      await programDb.updateDayStatus(ctx.program.id, dayStatus);
      analytics.trackDayDone(req.user.familyId, 3, 'aha', true);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION] aha-seen error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/aha-dismissed', async (req, res) => {
  try {
    const { daily_log_item_id: itemId } = req.body || {};
    if (!itemId) return res.status(400).json({ error: 'daily_log_item_id krävs' });
    analytics.trackAhaDismissed(req.user.familyId, itemId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION] aha-dismissed error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/cta-clicked', async (req, res) => {
  try {
    const { day, cta_type: ctaType, destination, child_id: childId, source } = req.body || {};
    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.cohort_arm !== 'treatment') {
      return res.json({ ok: true });
    }

    analytics.trackCtaClicked(req.user.familyId, day, ctaType, destination);

    if (ctaType === 'open_child_view' && childId) {
      analytics.trackChildViewOpened(req.user.familyId, childId, source || 'day1_preview');
      if (day === 1 && !isDayDone(ctx.program.day_status || {}, 1)) {
        const { dayStatus } = markDayDone(ctx.program.day_status || {}, 1, 'child_view');
        await programDb.updateDayStatus(ctx.program.id, dayStatus);
        analytics.trackDayDone(req.user.familyId, 1, 'child_view', true);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION] cta-clicked error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * GET /api/me/activation-program/new-completions — aha candidates only.
 */
router.get('/new-completions', async (req, res) => {
  try {
    const ctx = await loadProgramContext(req.user.familyId, req.user.id);
    if (!ctx || ctx.program.cohort_arm !== 'treatment' || ctx.program.status !== 'active') {
      return res.json({ items: [] });
    }
    const items = await seenDb.getUnseenCompletions(
      req.user.id,
      req.user.familyId,
      ctx.program.started_at
    );
    res.json({ items });
  } catch (err) {
    console.error('[ACTIVATION] new-completions error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = router;
