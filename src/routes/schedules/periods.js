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
 * A period never writes into special_day_schedule/daily_log (see schedule-period.js's header
 * comment) — there is therefore no per-date resync to perform here, unlike the legacy
 * apply-date-range route. The broadcast below is enough for open clients to refetch; any
 * already-generated daily_log for an affected date is picked up on next natural regeneration,
 * matching how a weekly-schedule edit today has always behaved for an already-generated log.
 *
 * Every write route accepts an optional `operation_id` for idempotent retries, reusing the
 * exact same schedule_apply_operation ledger Phase 1A/1B commands use (via
 * runIdempotentScheduleCommand(), see schedule-period.js) PLUS a separate child-scoped
 * advisory lock that makes the overlap invariant concurrency-safe (see that file's
 * acquirePeriodChildLock()). Family/child integrity is enforced a second time inside the
 * canonical service itself — this route layer's `getChildAccess`/`requireChildAccess` check is
 * the actor/role authorization layer, not the only guard.
 */

const express = require('express');
const { requireParent } = require('../../middleware/auth');
const authz = require('../../middleware/authz');
const { broadcast } = require('../../lib/sse-broadcast');
const { getFamilyLocale } = require('../../lib/onboarding-locale');
const {
  createSchedulePeriod,
  updateSchedulePeriod,
  deleteSchedulePeriod,
  getSchedulePeriod,
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

// GET /api/children/:childId/schedule-periods/:periodId — full detail for the edit UI to
// preload by id (name/dates/source/apply_mode/items), so the parent never re-enters dates to
// locate a period (§18/§19).
router.get('/:periodId', async (req, res) => {
  try {
    const child = req.authzChild || await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const period = await getSchedulePeriod({
      familyId: child.family_id, childId: req.params.childId, periodId: req.params.periodId,
    });
    res.json(period);
  } catch (err) {
    if (handlePeriodError(err, res)) return;
    console.error('[SCHEDULE-PERIOD] get error:', err);
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
      applyMode: applyMode || 'merge',
      operationId: operationId || null,
      locale, variants: variants ?? null, optionalSelections: optionalSelections ?? null,
    });

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

    broadcast(child.family_id, 'SCHEDULE_UPDATED', {
      childId: req.params.childId,
      date_range: { start_date: result.start_date, end_date: result.end_date },
    });

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

    broadcast(child.family_id, 'SCHEDULE_UPDATED', { childId: req.params.childId, period_deleted: result.period_id });

    res.status(200).json(result);
  } catch (err) {
    if (handlePeriodError(err, res)) return;
    console.error('[SCHEDULE-PERIOD] delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
