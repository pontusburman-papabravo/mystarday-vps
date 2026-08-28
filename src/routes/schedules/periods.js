/**
 * Phase 2 canonical Special Period endpoints — Calendar's period CRUD backend.
 * Mounted at its own top-level path: /api/children/:childId/schedule-periods — a SIBLING of
 * /api/children/:childId/schedules (weekly) and /api/children/:childId/special-days (single
 * date), mirroring the existing special-day-schedules.js mounting pattern rather than nesting
 * under /schedules (periods are a Calendar/date-range concept, not a weekly-editor one).
 *
 * Thin routes only: authz + request shaping, then delegate entirely to the canonical
 * command service (src/lib/schedule-period.js). No schedule-mutation SQL lives here — see
 * docs/schedule-canonical-architecture.md "Phase 2" for the domain model and rationale.
 *
 * Every write route accepts an optional `operation_id` for idempotent retries, reusing the
 * exact same schedule_apply_operation ledger + advisory-lock pattern Phase 1A/1B commands use
 * (via runIdempotentScheduleCommand(), see schedule-period.js). Family/child integrity is
 * enforced a second time inside the canonical service itself — this route layer's
 * `getChildAccess` check is the actor/role authorization layer, not the only guard.
 */

const express = require('express');
const { requireParent } = require('../../middleware/auth');
const authz = require('../../middleware/authz');
const { syncDailyLogForSpecialDay } = require('../../lib/daily-log-generator');
const { broadcast } = require('../../lib/sse-broadcast');
const { getFamilyLocale } = require('../../lib/onboarding-locale');
const {
  createSchedulePeriod,
  updateSchedulePeriod,
  deleteSchedulePeriod,
  listSchedulePeriods,
} = require('../../lib/schedule-period');
const { ScheduleApplyError } = require('../../lib/schedule-apply');

const router = express.Router({ mergeParams: true });
router.use(requireParent);
router.use(authz.requireChildAccess('childId'));

function handlePeriodError(err, res) {
  if (err instanceof ScheduleApplyError) {
    return res.status(err.httpStatus).json({ error: err.message, code: err.code, details: err.details });
  }
  return null;
}

async function syncMaterializedDates(childId, dates) {
  for (const dateStr of dates) {
    try {
      const sd = await require('../../lib/db').query(
        'SELECT id FROM special_day_schedule WHERE child_id = $1 AND date = $2',
        [childId, dateStr]
      );
      if (sd.rows.length > 0) await syncDailyLogForSpecialDay(sd.rows[0].id, dateStr, childId);
    } catch { /* best-effort — matches existing apply-date-range non-fatal sync pattern */ }
  }
}

// GET /api/children/:childId/schedule-periods
router.get('/', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const periods = await listSchedulePeriods({ familyId: child.family_id, childId: req.params.childId });
    res.json({ periods });
  } catch (err) {
    if (handlePeriodError(err, res)) return;
    console.error('[SCHEDULE-PERIOD] list error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// POST /api/children/:childId/schedule-periods
// Body: { name, start_date, end_date, source: { type, id }, apply_mode?, operation_id?,
//          variants?, optional_selections? }
router.post('/', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const {
      name, start_date: startDate, end_date: endDate, source, apply_mode: applyMode,
      operation_id: operationId, variants, optional_selections: optionalSelections,
    } = req.body || {};
    if (!source || !source.type || !source.id) {
      return res.status(400).json({ error: 'source.type och source.id krävs' });
    }

    const locale = await getFamilyLocale(child.family_id);
    const result = await createSchedulePeriod({
      familyId: child.family_id,
      childId: req.params.childId,
      name, startDate, endDate,
      sourceType: source.type, sourceId: source.id,
      applyMode: applyMode || 'replace_day',
      operationId: operationId || null,
      locale, variants: variants ?? null, optionalSelections: optionalSelections ?? null,
    });

    await syncMaterializedDates(req.params.childId, result.applied_dates);
    broadcast(child.family_id, 'SCHEDULE_UPDATED', {
      childId: req.params.childId,
      date_range: { start_date: result.start_date, end_date: result.end_date },
    });

    res.status(201).json(result);
  } catch (err) {
    if (handlePeriodError(err, res)) return;
    console.error('[SCHEDULE-PERIOD] create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// PATCH /api/children/:childId/schedule-periods/:periodId
router.patch('/:periodId', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const {
      name, start_date: startDate, end_date: endDate, source, apply_mode: applyMode,
      operation_id: operationId, variants, optional_selections: optionalSelections,
    } = req.body || {};

    const locale = await getFamilyLocale(child.family_id);
    const result = await updateSchedulePeriod({
      familyId: child.family_id,
      childId: req.params.childId,
      periodId: req.params.periodId,
      name,
      startDate,
      endDate,
      sourceType: source?.type,
      sourceId: source?.id,
      applyMode,
      operationId: operationId || null,
      locale, variants: variants ?? null, optionalSelections: optionalSelections ?? null,
    });

    if (result.content_changed) {
      await syncMaterializedDates(req.params.childId, result.applied_dates);
      broadcast(child.family_id, 'SCHEDULE_UPDATED', {
        childId: req.params.childId,
        date_range: { start_date: result.start_date, end_date: result.end_date },
      });
    }

    res.status(200).json(result);
  } catch (err) {
    if (handlePeriodError(err, res)) return;
    console.error('[SCHEDULE-PERIOD] update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// DELETE /api/children/:childId/schedule-periods/:periodId
router.delete('/:periodId', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { operation_id: operationId } = req.body || {};
    const result = await deleteSchedulePeriod({
      familyId: child.family_id,
      childId: req.params.childId,
      periodId: req.params.periodId,
      operationId: operationId || null,
    });

    // Note: unlike create/update, there is no "resync date to weekly after removing a special
    // day" helper today — an already-generated daily_log for one of these dates stays as-is
    // (matches existing apply-date-range/special-day deletion behaviour elsewhere in the repo;
    // out of scope to introduce a new resync primitive in this phase). Live clients still get a
    // fresh view on next load via the broadcast below and resolveEffectiveSchedule() correctly
    // falling back to weekly for any date whose special_day_schedule row no longer exists.
    broadcast(child.family_id, 'SCHEDULE_UPDATED', { childId: req.params.childId, period_deleted: result.period_id });

    res.status(200).json(result);
  } catch (err) {
    if (handlePeriodError(err, res)) return;
    console.error('[SCHEDULE-PERIOD] delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
