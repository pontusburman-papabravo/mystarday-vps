/**
 * Parent activation program API — banner (Fas 3), aha (Fas 2), reflection.
 */

const express = require('express');
const { DateTime } = require('luxon');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const parentActivationProgram = require('../../db/parent-activation-program');
const parentSeenCompletion = require('../../db/parent-seen-completion');
const {
  isActivationProgramEnabled,
  normalizeEnrollSource,
  normalizeEnrollChoice,
  getCohortArmForEnroll,
  MVP_PROGRAM_TYPE,
} = require('../lib/activation-program-enroll');
const {
  canShowOnboardingEnrollChoice,
  canShowEmailEnrollChoice,
  isProgramFeatureLive,
} = require('../lib/activation-program-eligibility');
const {
  getCalendarDay,
  getEffectiveProgramDay,
  maybeExpireProgram,
  shouldShowBanner,
  rolloverDayStatus,
  markDayDone,
  isDayDone,
  showReflection,
} = require('../lib/activation-program');
const { getDayContent } = require('../lib/activation-program-content');
const { resolveCommunicationLocale } = require('../lib/communication-locale');
const { t } = require('../lib/i18n');
const programAnalytics = require('../lib/activation-program-analytics');
const {
  listUnseenCompletions,
  maybeTrackParentFirstCompletionSeen,
  mapCompletionRow,
  getFamilyTimezone,
} = require('../lib/activation-program-aha');
const analyticsTracker = require('../lib/analytics-tracker');
const { FLAG_KEYS, isFlagEnabled } = require('../lib/journey/flags');
const { getFamilyLocale, sendOnboardingError } = require('../lib/onboarding-locale');
const {
  isActivationProgramApiSunsetForFamily,
  SUNSET_BODY,
} = require('../lib/activation-program-runtime');

const router = express.Router();
router.use(requireParent);

router.use(async (req, res, next) => {
  if (req.path.startsWith('/enroll-choice')) {
    return next();
  }
  const familyId = req.user?.familyId;
  if (!familyId) return next();
  if (await isActivationProgramApiSunsetForFamily(familyId)) {
    return res.status(410).json(SUNSET_BODY);
  }
  next();
});

function isFeatureActive() {
  return isActivationProgramEnabled();
}

async function loadProgramContext(familyId) {
  let program = await parentActivationProgram.getActiveByFamily(familyId);
  if (!program) return null;

  const timezone = await parentActivationProgram.getFamilyTimezone(familyId);
  const expired = maybeExpireProgram(program, timezone);
  if (expired.status === 'expired' && program.status === 'active') {
    program = await parentActivationProgram.updateStatus(program.id, 'expired');
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

  const tz = await parentActivationProgram.getFamilyTimezone(familyId);
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

async function maybeMarkDay3Aha(familyId, program, timezone) {
  const effectiveDay = getEffectiveProgramDay(program, timezone);
  if (effectiveDay < 3 || isDayDone(program.day_status, 3)) return;

  const dayStatus = markDayDone(program.day_status || {}, 3, 'aha').dayStatus;
  await parentActivationProgram.updateDayStatus(program.id, dayStatus);
  programAnalytics.trackDayDone(familyId, 3, 'aha', true);
}

async function buildProgramResponse(program, timezone, parentId, familyId, markBannerSeen) {
  const calendarDay = getCalendarDay(program, timezone);
  const effectiveDay = getEffectiveProgramDay(program, timezone);
  let dayStatus = rolloverDayStatus(program.day_status || {}, effectiveDay);

  const localeResult = await db.query(
    'SELECT COALESCE(preferred_locale, \'sv-SE\') AS preferred_locale FROM family WHERE id = $1',
    [familyId]
  );
  const locale = resolveCommunicationLocale(localeResult.rows[0]?.preferred_locale);

  const previewCtx = await getFirstChildPreview(familyId);
  const childName = previewCtx?.child_name || t(locale, 'email.common.genericChild');
  let content = getDayContent(effectiveDay, { childName, locale });

  const hasChildCompletion = await parentSeenCompletion.hasChildCompletionSince(
    familyId,
    program.started_at
  );

  if (effectiveDay >= 3 && !hasChildCompletion && content.supportive_fallback) {
    content = {
      ...content,
      body: content.supportive_fallback,
      is_supportive_fallback: true,
    };
    if (!isDayDone(dayStatus, 3) && !isDayDone(program.day_status || {}, 3)) {
      dayStatus = markDayDone(dayStatus, 3, 'supportive_fallback').dayStatus;
      programAnalytics.trackDayDone(familyId, 3, 'supportive_fallback', true);
    }
  }

  const inReflectionWindow = showReflection(program, timezone);
  if (inReflectionWindow) {
    content = {
      ...getDayContent(7, { childName, locale }),
      show_reflection: true,
    };
  }

  const preview = effectiveDay === 1 ? previewCtx : null;

  const dayAdvanced = effectiveDay > program.last_seen_day;
  let firstBannerSeen = false;

  if (markBannerSeen && program.cohort_arm === 'treatment') {
    const updated = await parentActivationProgram.setFirstBannerSeenAt(program.id);
    if (updated && !program.first_banner_seen_at) {
      firstBannerSeen = true;
      const hoursSinceEnroll = DateTime.fromJSDate(new Date(program.started_at), { zone: 'utc' })
        .diffNow('hours')
        .negate().hours;
      programAnalytics.trackFirstBannerSeen(
        familyId,
        effectiveDay,
        Math.round(hoursSinceEnroll * 10) / 10
      );
    }
    if (dayAdvanced) {
      await parentActivationProgram.updateLastSeenDay(program.id, effectiveDay);
    }
    if (JSON.stringify(dayStatus) !== JSON.stringify(program.day_status || {})) {
      await parentActivationProgram.updateDayStatus(program.id, dayStatus);
    }
  }

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
    show_reflection: inReflectionWindow,
    reflection_score: program.reflection_score,
    reflection_text: program.reflection_text,
  };
}

/**
 * @param {string} lang
 * @returns {object}
 */
function getEnrollChoiceCopy(lang) {
  const prefix = 'onboarding.activation';
  return {
    intro_title: t(lang, `${prefix}.introTitle`),
    intro_body: t(lang, `${prefix}.introBody`),
    card_guided_title: t(lang, `${prefix}.guidedTitle`),
    card_guided_body: t(lang, `${prefix}.guidedBody`),
    card_guided_benefits: [0, 1, 2, 3].map((i) => t(lang, `${prefix}.guidedBenefits.${i}`)),
    card_guided_cta: t(lang, `${prefix}.guidedCta`),
    card_direct_title: t(lang, `${prefix}.directTitle`),
    card_direct_body: t(lang, `${prefix}.directBody`),
    card_direct_benefits: [0, 1, 2].map((i) => t(lang, `${prefix}.directBenefits.${i}`)),
    card_direct_cta: t(lang, `${prefix}.directCta`),
    footnote: t(lang, `${prefix}.footnote`),
  };
}

/**
 * GET /api/me/activation-program/enroll-choice
 */
router.get('/enroll-choice', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    if (!(await isFlagEnabled(FLAG_KEYS.activationNewEnrollments))) {
      return res.json({ show: false, sunset: true });
    }
    if (!isProgramFeatureLive()) {
      return res.json({ show: false });
    }

    const familyId = req.user.familyId;
    const enrollSource = normalizeEnrollSource(req.query.enroll_source)
      || 'onboarding_complete';
    const inviteToken = req.query.invite_token || null;

    let show = false;
    if (enrollSource === 'email_reactivation') {
      show = await canShowEmailEnrollChoice({ familyId, inviteToken });
    } else {
      show = await canShowOnboardingEnrollChoice({
        familyId,
        onboardingCompleted: true,
      });
    }

    res.json({
      show,
      enroll_source: enrollSource,
      copy: getEnrollChoiceCopy(lang),
    });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] enroll-choice GET error:', err);
    return sendOnboardingError(res, 500, lang, 'GENERIC');
  }
});

/**
 * POST /api/me/activation-program/enroll-choice
 * Body: { choice: 'guided'|'direct', enroll_source, invite_token? }
 */
router.post('/enroll-choice', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    if (!(await isFlagEnabled(FLAG_KEYS.activationNewEnrollments))) {
      return res.status(410).json({
        error: 'Nya aktiveringsprogram stängs av. Använd Family Journey.',
        migration: '/api/me/journey-context',
      });
    }
    if (!isProgramFeatureLive()) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const familyId = req.user.familyId;
    const parentId = req.user.id;
    const choice = normalizeEnrollChoice(req.body?.choice);
    const enrollSource = normalizeEnrollSource(req.body?.enroll_source);
    const inviteToken = req.body?.invite_token || null;

    if (!choice || !enrollSource) {
      return sendOnboardingError(res, 400, lang, 'INVALID_CHOICE');
    }

    let allowed = false;
    if (enrollSource === 'email_reactivation') {
      allowed = await canShowEmailEnrollChoice({ familyId, inviteToken });
    } else {
      allowed = await canShowOnboardingEnrollChoice({
        familyId,
        onboardingCompleted: true,
      });
    }

    if (!allowed) {
      return sendOnboardingError(res, 404, lang, 'ENROLL_CHOICE_UNAVAILABLE');
    }

    programAnalytics.trackEnrollChoice(familyId, {
      choice,
      enrollSource,
      ctaVariant: 'help_us_week_one',
    });

    let enrolled = false;
    if (choice === 'guided') {
      const cohortArm = getCohortArmForEnroll(familyId);
      await parentActivationProgram.create({
        familyId,
        parentId,
        cohortArm,
        programType: MVP_PROGRAM_TYPE,
        enrollSource,
      });
      programAnalytics.trackProgramStarted(
        familyId,
        cohortArm,
        MVP_PROGRAM_TYPE,
        enrollSource
      );
      enrolled = true;
    }

    res.json({ ok: true, enrolled });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] enroll-choice POST error:', err);
    return sendOnboardingError(res, 500, lang, 'GENERIC');
  }
});

/**
 * GET /api/me/activation-program
 */
router.get('/', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.json({ active: false });
    }

    const familyId = req.user.familyId;
    if (!familyId) {
      return res.json({ active: false });
    }

    const ctx = await loadProgramContext(familyId);
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
      familyId,
      true
    );
    res.json(payload);
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] GET error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

router.post('/skip-day', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const ctx = await loadProgramContext(req.user.familyId);
    if (!ctx || !shouldShowBanner(ctx.program)) {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }

    const effectiveDay = getEffectiveProgramDay(ctx.program, ctx.timezone);
    const dayStatus = { ...(ctx.program.day_status || {}), [String(effectiveDay)]: 'skipped' };
    await parentActivationProgram.updateDayStatus(ctx.program.id, dayStatus);
    programAnalytics.trackDaySkipped(req.user.familyId, effectiveDay);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] skip-day error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

router.post('/complete-day', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const ctx = await loadProgramContext(req.user.familyId);
    if (!ctx || !shouldShowBanner(ctx.program)) {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }

    const day = req.body?.day || getEffectiveProgramDay(ctx.program, ctx.timezone);
    const { dayStatus } = markDayDone(ctx.program.day_status || {}, day, 'manual');
    await parentActivationProgram.updateDayStatus(ctx.program.id, dayStatus);
    programAnalytics.trackDayDone(req.user.familyId, day, 'manual', false);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] complete-day error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

router.post('/solo-day', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const ctx = await loadProgramContext(req.user.familyId);
    if (!ctx || !shouldShowBanner(ctx.program)) {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }

    const { dayStatus } = markDayDone(ctx.program.day_status || {}, 6, 'solo_dismiss');
    await parentActivationProgram.updateDayStatus(ctx.program.id, dayStatus);
    programAnalytics.trackDayDone(req.user.familyId, 6, 'solo_dismiss', false);
    programAnalytics.trackDaySolo(req.user.familyId, 6);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] solo-day error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

router.post('/opt-out', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const ctx = await loadProgramContext(req.user.familyId);
    if (!ctx || ctx.program.status !== 'active') {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }

    const effectiveDay = getEffectiveProgramDay(ctx.program, ctx.timezone);
    await parentActivationProgram.updateStatus(ctx.program.id, 'opted_out');
    programAnalytics.trackOptedOut(req.user.familyId, effectiveDay);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] opt-out error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

router.post('/reflection', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const ctx = await loadProgramContext(req.user.familyId);
    if (!ctx || !shouldShowBanner(ctx.program)) {
      return res.status(404).json({ error: 'Inget aktivt program' });
    }

    if (!showReflection(ctx.program, ctx.timezone) && ctx.program.status === 'active') {
      return res.status(400).json({ error: 'Reflektionen är inte tillgänglig än' });
    }

    const score = parseInt(req.body?.score, 10);
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Ogiltigt betyg' });
    }
    const text = req.body?.text ? String(req.body.text).trim().substring(0, 500) : null;

    const { dayStatus } = markDayDone(ctx.program.day_status || {}, 7, 'reflection');
    await parentActivationProgram.updateDayStatus(ctx.program.id, dayStatus);
    await parentActivationProgram.updateStatus(ctx.program.id, 'completed', {
      reflectionScore: score,
      reflectionText: text,
    });
    programAnalytics.trackDayDone(req.user.familyId, 7, 'reflection', false);
    programAnalytics.trackProgramCompleted(req.user.familyId, score);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] reflection error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

router.post('/push-clicked', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.json({ ok: true });
    }

    const day = parseInt(req.body?.day, 10);
    if (!Number.isFinite(day) || day < 2 || day > 7) {
      return res.status(400).json({ error: 'Ogiltig dag' });
    }

    const ctx = await loadProgramContext(req.user.familyId);
    if (!ctx || !shouldShowBanner(ctx.program)) {
      return res.json({ ok: true });
    }

    programAnalytics.trackPushClicked(req.user.familyId, day);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] push-clicked error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

router.post('/cta-clicked', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.json({ ok: true });
    }

    const { day, cta_type: ctaType, destination, child_id: childId, source } = req.body || {};
    const ctx = await loadProgramContext(req.user.familyId);
    if (!ctx || !shouldShowBanner(ctx.program)) {
      return res.json({ ok: true });
    }

    programAnalytics.trackCtaClicked(req.user.familyId, day, ctaType, destination);

    if (ctaType === 'open_child_view' && childId) {
      programAnalytics.trackChildViewOpened(
        req.user.familyId,
        childId,
        source || 'day1_preview'
      );
      if (day === 1 && !isDayDone(ctx.program.day_status || {}, 1)) {
        const { dayStatus } = markDayDone(ctx.program.day_status || {}, 1, 'child_view');
        await parentActivationProgram.updateDayStatus(ctx.program.id, dayStatus);
        programAnalytics.trackDayDone(req.user.familyId, 1, 'child_view', true);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] cta-clicked error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * GET /api/me/activation-program/new-completions (Fas 2)
 */
router.get('/new-completions', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.json({ completions: [] });
    }

    const familyId = req.user.familyId;
    const parentId = req.user.id;
    if (!familyId) {
      return res.json({ completions: [] });
    }

    const program = await parentActivationProgram.getBannerProgramByFamily(familyId);
    if (!program || !shouldShowBanner(program)) {
      return res.json({ completions: [] });
    }

    const rows = await listUnseenCompletions(parentId, familyId);
    if (rows.length === 0) {
      return res.json({ completions: [] });
    }

    const timezone = await getFamilyTimezone(familyId);
    const first = rows[0];
    const parentFirstSeenEmitted = await maybeTrackParentFirstCompletionSeen({
      familyId,
      program,
      childId: first.child_id,
      dailyLogItemId: first.daily_log_item_id,
      activityName: first.activity_name,
      completedAt: first.completed_at,
      timezone,
    });

    if (parentFirstSeenEmitted) {
      await maybeMarkDay3Aha(familyId, program, timezone);
    }

    const now = new Date();
    res.json({
      completions: rows.map((row) => mapCompletionRow(row, now)),
      parent_first_completion_seen_emitted: parentFirstSeenEmitted,
    });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] new-completions error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * POST /api/me/activation-program/aha-dismiss (Fas 2)
 */
router.post('/aha-dismiss', async (req, res) => {
  try {
    if (!isFeatureActive()) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const familyId = req.user.familyId;
    const parentId = req.user.id;
    const dailyLogItemId = req.body?.daily_log_item_id;

    if (!familyId || !dailyLogItemId) {
      return res.status(400).json({ error: 'daily_log_item_id krävs' });
    }

    const program = await parentActivationProgram.getBannerProgramByFamily(familyId);
    if (!program || !shouldShowBanner(program)) {
      return res.status(404).json({ error: 'Inte tillgängligt' });
    }

    const access = await parentSeenCompletion.verifyFamilyItemAccess(
      parentId,
      familyId,
      dailyLogItemId
    );
    if (!access) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    await parentSeenCompletion.markSeen(parentId, dailyLogItemId);
    require('../lib/journey/ingest').ingestMilestoneAsync({
      familyId,
      milestone: 'parent_saw_completion',
      metadata: { daily_log_item_id: String(dailyLogItemId) },
    });
    analyticsTracker.trackParentAhaMomentDismissed(familyId, {
      daily_log_item_id: String(dailyLogItemId),
      program_id: String(program.id),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[ACTIVATION-PROGRAM] aha-dismiss error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
