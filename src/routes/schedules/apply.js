/**
 * Phase 1B canonical apply endpoints — the "+ Lägg till" primary action's backend.
 * Mounted at: /api/children/:childId/schedules (childRouter)
 *
 * Thin routes only: authz + request shaping, then delegate entirely to the canonical
 * command service (src/lib/schedule-apply.js). No schedule-mutation SQL lives here —
 * see docs/schedule-canonical-architecture.md "Phase 1B" for the endpoint-to-service map.
 *
 * Every route accepts an optional `operation_id` for idempotent retries (§1B.9). Family/child
 * integrity is enforced a second time inside the canonical service itself (§4) — this route
 * layer's `getChildAccess` check is the actor/role authorization layer, not the only guard.
 */

const express = require('express');
const { requireParent } = require('../../middleware/auth');
const authz = require('../../middleware/authz');
const { syncDailyLogWithSchedule } = require('../../lib/daily-log-generator');
const { broadcast } = require('../../lib/sse-broadcast');
const { getFamilyLocale } = require('../../lib/onboarding-locale');
const {
  applyScheduleSourceToChildPlan,
  applyActivityToChild,
  copyScheduleDay,
  saveWeeklyDayAsFamilyTemplate,
  ScheduleApplyError,
} = require('../../lib/schedule-apply');

const router = express.Router({ mergeParams: true });
router.use(requireParent);

function parseDays(rawDays) {
  if (!Array.isArray(rawDays)) return null;
  const days = rawDays.map((d) => parseInt(d, 10)).filter((d) => !Number.isNaN(d));
  return days.length > 0 ? days : null;
}

function handleApplyError(err, res) {
  if (err instanceof ScheduleApplyError) {
    return res.status(err.httpStatus).json({ error: err.message, code: err.code, details: err.details });
  }
  return null;
}

/**
 * POST /api/children/:childId/schedules/apply-source
 * Body: { source: { type: 'family_template'|'standard_schedule', id }, days: number[],
 *          mode?, operation_id?, variants?, optional_selections? }
 * §1B.19 canonical apply endpoint for "Från mall" (Mina mallar → family_template,
 * Färdiga mallar → standard_schedule — the frontend never sends these backend names to the
 * user, see docs "Phase 1B / user-facing labels").
 */
router.post('/apply-source', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { source, days, mode, operation_id: operationId, variants, optional_selections: optionalSelections } = req.body || {};
    if (!source || !source.type || !source.id) {
      return res.status(400).json({ error: 'source.type och source.id krävs' });
    }
    const validDays = parseDays(days);
    if (!validDays) return res.status(400).json({ error: 'days[] krävs' });

    const locale = await getFamilyLocale(child.family_id);
    const result = await applyScheduleSourceToChildPlan({
      familyId: child.family_id,
      childId: req.params.childId,
      sourceType: source.type,
      sourceId: source.id,
      targets: validDays.map((dayOfWeek) => ({ dayOfWeek, mode: mode || 'merge' })),
      operationId: operationId || null,
      locale,
      variants: variants ?? null,
      optionalSelections: optionalSelections ?? null,
    });

    for (const dow of result.applied_days) {
      try { await syncDailyLogWithSchedule(req.params.childId, dow); } catch { /* best-effort */ }
    }
    if (result.applied_days.length > 0) {
      broadcast(child.family_id, 'SCHEDULE_UPDATED', { childId: req.params.childId });
    }

    res.status(201).json(result);
  } catch (err) {
    if (handleApplyError(err, res)) return;
    console.error('[SCHEDULE-APPLY] apply-source error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * POST /api/children/:childId/schedules/apply-activity
 * Body: { activity_template_id, days: number[], section?, start_time?, end_time?, mode?,
 *          operation_id? }
 * §1B.1 "Lägg till → Aktivitet". Direct-activity command (§1B.20 decision record) — does not
 * go through resolveScheduleSource / SOURCE_TYPES.
 */
router.post('/apply-activity', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const {
      activity_template_id: activityTemplateId, days, section, start_time: startTime,
      end_time: endTime, mode, operation_id: operationId,
    } = req.body || {};
    if (!activityTemplateId) return res.status(400).json({ error: 'activity_template_id krävs' });
    const validDays = parseDays(days);
    if (!validDays) return res.status(400).json({ error: 'days[] krävs' });

    const result = await applyActivityToChild({
      familyId: child.family_id,
      childId: req.params.childId,
      activityTemplateId,
      days: validDays,
      section: section || 'dag',
      startTime: startTime || null,
      endTime: endTime || null,
      mode: mode || 'merge',
      operationId: operationId || null,
    });

    for (const dow of result.applied_days) {
      try { await syncDailyLogWithSchedule(req.params.childId, dow); } catch { /* best-effort */ }
    }
    if (result.applied_days.length > 0) {
      broadcast(child.family_id, 'SCHEDULE_UPDATED', { childId: req.params.childId });
    }

    res.status(201).json(result);
  } catch (err) {
    if (handleApplyError(err, res)) return;
    console.error('[SCHEDULE-APPLY] apply-activity error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * POST /api/children/:childId/schedules/copy-recurring-day
 *
 * NOTE the route name: `child-bulk.js` already owns the legacy `POST .../copy-day` path
 * (always-replace, same-child-only, no idempotency). Per the strangler pattern (§1B.13) that
 * legacy route is NOT removed/renamed in this phase, so this canonical replacement uses a
 * distinct path rather than silently shadowing or colliding with it.
 *
 * Body: { source_child_id?, source_day_of_week, target_days: number[], mode?, operation_id? }
 * `:childId` is always the TARGET child. `source_child_id` defaults to `:childId` (copy within
 * the same child's week); pass a different child id (same family) to copy across children.
 * §1B.4 / §1B.21 — no temporary template is created.
 */
router.post('/copy-recurring-day', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const {
      source_child_id: sourceChildId, source_day_of_week: sourceDayOfWeek,
      target_days: targetDays, mode, operation_id: operationId,
    } = req.body || {};
    if (sourceDayOfWeek === undefined || sourceDayOfWeek === null) {
      return res.status(400).json({ error: 'source_day_of_week krävs' });
    }
    const validTargetDays = parseDays(targetDays);
    if (!validTargetDays) return res.status(400).json({ error: 'target_days[] krävs' });

    // The route layer authorizes the target child (above) and the source child (here, if
    // different) — the canonical service independently re-checks both (§4, §22).
    const resolvedSourceChildId = sourceChildId || req.params.childId;
    if (resolvedSourceChildId !== req.params.childId) {
      const sourceChild = await authz.getChildAccess(req.user.id, resolvedSourceChildId);
      if (!sourceChild) return res.status(403).json({ error: 'Du har inte åtkomst till källbarnet' });
    }

    const result = await copyScheduleDay({
      familyId: child.family_id,
      sourceChildId: resolvedSourceChildId,
      sourceDayOfWeek: parseInt(sourceDayOfWeek, 10),
      targetChildId: req.params.childId,
      targetDays: validTargetDays,
      mode: mode || 'merge',
      operationId: operationId || null,
    });

    for (const dow of result.applied_days) {
      try { await syncDailyLogWithSchedule(req.params.childId, dow); } catch { /* best-effort */ }
    }
    if (result.applied_days.length > 0) {
      broadcast(child.family_id, 'SCHEDULE_UPDATED', { childId: req.params.childId });
    }

    res.status(201).json(result);
  } catch (err) {
    if (handleApplyError(err, res)) return;
    console.error('[SCHEDULE-APPLY] copy-day error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * POST /api/children/:childId/schedules/save-as-template
 * Body: { day_of_week, template_name, operation_id? }
 * §1B.5 / §1B.22 "Spara dagen som mall" — explicit copy, never a live link back to the day.
 */
router.post('/save-as-template', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { day_of_week: dayOfWeek, template_name: templateName, operation_id: operationId } = req.body || {};
    if (dayOfWeek === undefined || dayOfWeek === null) return res.status(400).json({ error: 'day_of_week krävs' });
    if (!templateName || !String(templateName).trim()) return res.status(400).json({ error: 'template_name krävs' });

    const result = await saveWeeklyDayAsFamilyTemplate({
      familyId: child.family_id,
      childId: req.params.childId,
      dayOfWeek: parseInt(dayOfWeek, 10),
      templateName,
      operationId: operationId || null,
    });

    res.status(201).json(result);
  } catch (err) {
    if (handleApplyError(err, res)) return;
    console.error('[SCHEDULE-APPLY] save-as-template error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
