/**
 * Thin client adapter for the Phase 1A/1B canonical schedule-apply backend
 * (src/routes/schedules/apply.js). One place owns:
 *   - building the request bodies for apply-activity / apply-source / copy-recurring-day /
 *     save-as-template
 *   - the operation_id lifecycle (§1B.9/§12): stable per logical command, regenerated only
 *     when the command's defining fields change — never regenerated merely because a
 *     request timed out (that is exactly the case a stable operation_id protects).
 *
 * No schedule-mutation semantics live here — merge/replace/duplicate/transaction/authz
 * remain entirely server-side (src/lib/schedule-apply.js). This module only shapes requests
 * and manages the client-side operation_id, per docs/schedule-canonical-architecture.md
 * "Phase 1B" §1B.18.
 */
(function () {
  'use strict';

  function newOperationId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    // Fallback for older browsers without crypto.randomUUID — not used for any security
    // purpose here, only as an idempotency-ledger key.
    return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Tracks ONE stable operation_id per logical command. Call `forCommand(fingerprint)` with
   * a plain object describing every field that defines the command (child, source, days,
   * mode, ...); the SAME operation_id is returned for repeated calls with an unchanged
   * fingerprint (safe retry), and a NEW operation_id is generated the moment any field
   * changes (a materially different command must never reuse an old key — see the backend's
   * 409 IDEMPOTENCY_KEY_REUSED contract).
   */
  function createOperationTracker() {
    let operationId = null;
    let lastFingerprint = null;
    return {
      forCommand(fingerprint) {
        const serialized = JSON.stringify(fingerprint);
        if (!operationId || serialized !== lastFingerprint) {
          operationId = newOperationId();
          lastFingerprint = serialized;
        }
        return operationId;
      },
      reset() {
        operationId = null;
        lastFingerprint = null;
      },
    };
  }

  async function postJson(url, body) {
    const res = await window.apiFetch(url, { method: 'POST', body: JSON.stringify(body) });
    let data = null;
    try { data = await res.json(); } catch { /* empty/non-JSON body */ }
    return { ok: res.ok, status: res.status, data };
  }

  const ScheduleApplyClient = {
    createOperationTracker,
    newOperationId,

    /** §1B.1 "Aktivitet" — direct-activity apply (applyActivityToChild). */
    applyActivity(childId, { activityTemplateId, days, section, startTime, endTime, mode, operationId }) {
      return postJson(`/api/children/${childId}/schedules/apply-activity`, {
        activity_template_id: activityTemplateId,
        days,
        section: section || 'dag',
        start_time: startTime || null,
        end_time: endTime || null,
        mode: mode || 'merge',
        operation_id: operationId || null,
      });
    },

    /** §1B.2 "Från mall" — family_template / standard_schedule (applyScheduleSourceToChildPlan). */
    applyTemplate(childId, { sourceType, sourceId, days, mode, operationId }) {
      return postJson(`/api/children/${childId}/schedules/apply-source`, {
        source: { type: sourceType, id: sourceId },
        days,
        mode: mode || 'merge',
        operation_id: operationId || null,
      });
    },

    /** §1B.4/§1B.8 "Kopiera dag" — single target child (copyScheduleDay). */
    copyDay(childId, { sourceChildId, sourceDayOfWeek, targetDays, mode, operationId }) {
      return postJson(`/api/children/${childId}/schedules/copy-recurring-day`, {
        source_child_id: sourceChildId || childId,
        source_day_of_week: sourceDayOfWeek,
        target_days: targetDays,
        mode: mode || 'merge',
        operation_id: operationId || null,
      });
    },

    /** §1B.5 "Spara dagen som mall" (saveWeeklyDayAsFamilyTemplate). */
    saveDayAsTemplate(childId, { dayOfWeek, templateName, operationId }) {
      return postJson(`/api/children/${childId}/schedules/save-as-template`, {
        day_of_week: dayOfWeek,
        template_name: templateName,
        operation_id: operationId || null,
      });
    },
  };

  window.ScheduleApplyClient = ScheduleApplyClient;
})();
