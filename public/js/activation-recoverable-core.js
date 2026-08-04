/**
 * activation-recoverable-core.js — shared Activation recoverable-step contract (client).
 */
(function () {
  'use strict';

  const STEP_STATUS = {
    pending: 'pending',
    completed: 'completed',
    skipped_by_user: 'skipped_by_user',
    deferred: 'deferred',
    blocked_by_error: 'blocked_by_error',
  };

  const ERROR_CODES = {
    SCHEDULE_LOAD_TIMEOUT: 'ACTIVATION_SCHEDULE_LOAD_TIMEOUT',
    SCHEDULE_LOAD_401: 'ACTIVATION_SCHEDULE_LOAD_401',
    SCHEDULE_LOAD_403: 'ACTIVATION_SCHEDULE_LOAD_403',
    SCHEDULE_LOAD_404: 'ACTIVATION_SCHEDULE_LOAD_404',
    SCHEDULE_LOAD_429: 'ACTIVATION_SCHEDULE_LOAD_429',
    SCHEDULE_LOAD_5XX: 'ACTIVATION_SCHEDULE_LOAD_5XX',
    SCHEDULE_EMPTY: 'ACTIVATION_SCHEDULE_EMPTY',
    SCHEDULE_PARSE_ERROR: 'ACTIVATION_SCHEDULE_PARSE_ERROR',
    REPORT_SUBMIT_FAILED: 'ACTIVATION_REPORT_SUBMIT_FAILED',
  };

  const SCHEDULE_LOAD_TIMEOUT_MS = 12000;
  const AUTO_RETRY_DELAY_MS = 800;
  const REPORT_COOLDOWN_MS = 4000;

  let reportInFlight = false;

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function track(eventType, meta) {
    if (typeof window.analytics === 'undefined' || !analytics.track) return;
    analytics.track(null, eventType, meta || {});
  }

  function storageKey(familyId) {
    return 'msd_activation_skips_' + String(familyId || 'unknown');
  }

  function readSkips(familyId) {
    try {
      const raw = localStorage.getItem(storageKey(familyId));
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function writeSkip(familyId, stepId, status) {
    const map = readSkips(familyId);
    map[stepId] = { status: status, at: Date.now() };
    try {
      localStorage.setItem(storageKey(familyId), JSON.stringify(map));
    } catch (_) { /* private mode */ }
  }

  function mapHttpToErrorCode(status) {
    if (status === 401) return ERROR_CODES.SCHEDULE_LOAD_401;
    if (status === 403) return ERROR_CODES.SCHEDULE_LOAD_403;
    if (status === 404) return ERROR_CODES.SCHEDULE_LOAD_404;
    if (status === 429) return ERROR_CODES.SCHEDULE_LOAD_429;
    if (status >= 500) return ERROR_CODES.SCHEDULE_LOAD_5XX;
    return ERROR_CODES.SCHEDULE_LOAD_5XX;
  }

  function platformLabel() {
    if (window.Capacitor && window.Capacitor.getPlatform) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }

  function buildReportMetadata(stepId, activationState, extra) {
    const meta = {
      activation_step_id: stepId,
      activation_state: activationState || STEP_STATUS.blocked_by_error,
      route: window.location.pathname,
      locale: document.documentElement.lang || 'sv-SE',
      platform: platformLabel(),
      app_version: window.__MSD_APP_VERSION || '',
      cache_version: window.__MSD_CACHE_VERSION || '',
      correlation_id: extra && extra.correlation_id ? extra.correlation_id : null,
      rollout_source: 'activation_first_success_v1',
      retry_count: extra && extra.retry_count != null ? extra.retry_count : 0,
      duration_bucket: extra && extra.duration_bucket ? extra.duration_bucket : null,
      error_code: extra && extra.error_code ? extra.error_code : null,
    };
    if (extra && extra.child_id_pseudo) meta.child_id_pseudo = extra.child_id_pseudo;
    return meta;
  }

  function humanErrorMessage(errorCode) {
    const key = 'home.activationRecoverable.errors.' + errorCode;
    const translated = pt(key);
    if (translated !== key) return translated;
    return pt('home.activationRecoverable.errors.generic');
  }

  async function apiJson(path, options) {
    if (typeof window.apiFetch !== 'function') throw new Error('no_api');
    const res = await window.apiFetch(path, options);
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    return { res: res, data: data };
  }

  async function postStepStatus(stepId, status, body) {
    return apiJson('/api/family/activation/step-status', {
      method: 'POST',
      body: JSON.stringify(Object.assign({
        step_id: stepId,
        status: status,
      }, body || {})),
    });
  }

  async function continueAnyway(stepId, opts) {
    const status = (opts && opts.defer) ? STEP_STATUS.deferred : STEP_STATUS.skipped_by_user;
    const familyId = window.Auth && Auth.getUser ? Auth.getUser().familyId : null;
    if (familyId) writeSkip(familyId, stepId, status);

    track('activation_continue_anyway', {
      step_id: stepId,
      status: status,
      error_code: opts && opts.error_code ? opts.error_code : null,
      rollout_source: 'activation_first_success_v1',
    });

    const result = await postStepStatus(stepId, status, {
      child_has_schedule: Boolean(opts && opts.child_has_schedule),
      error_code: opts && opts.error_code ? opts.error_code : null,
      reason: opts && opts.reason ? opts.reason : null,
    });

    const url = (result.data && result.data.continue_url) || '/dashboard';
    track(status === STEP_STATUS.deferred ? 'activation_step_deferred' : 'activation_step_skipped', {
      step_id: stepId,
      rollout_source: 'activation_first_success_v1',
    });

    if (window.ActivationFirstSuccessHub && ActivationFirstSuccessHub.dismissCoach) {
      ActivationFirstSuccessHub.dismissCoach();
    }
    window.location.href = url;
  }

  async function submitProblemReport(stepId, activationState, userMessage, extra) {
    if (reportInFlight) return { ok: false, reason: 'in_flight' };
    reportInFlight = true;
    track('activation_problem_report_opened', { step_id: stepId });

    try {
      const metadata = buildReportMetadata(stepId, activationState, extra);
      const { res, data } = await apiJson('/api/family/activation/problem-report', {
        method: 'POST',
        body: JSON.stringify({
          activation_step_id: stepId,
          message: userMessage || '',
          metadata: metadata,
        }),
      });
      if (!res.ok) {
        track('activation_problem_report_failed', {
          step_id: stepId,
          error_code: data && data.error_code ? data.error_code : ERROR_CODES.REPORT_SUBMIT_FAILED,
        });
        return { ok: false, error_code: ERROR_CODES.REPORT_SUBMIT_FAILED };
      }
      track('activation_problem_report_submitted', { step_id: stepId });
      return { ok: true };
    } catch (_) {
      track('activation_problem_report_failed', { step_id: stepId });
      return { ok: false, error_code: ERROR_CODES.REPORT_SUBMIT_FAILED };
    } finally {
      setTimeout(function () { reportInFlight = false; }, REPORT_COOLDOWN_MS);
    }
  }

  window.ActivationRecoverableCore = {
    STEP_STATUS: STEP_STATUS,
    ERROR_CODES: ERROR_CODES,
    SCHEDULE_LOAD_TIMEOUT_MS: SCHEDULE_LOAD_TIMEOUT_MS,
    AUTO_RETRY_DELAY_MS: AUTO_RETRY_DELAY_MS,
    esc: esc,
    pt: pt,
    track: track,
    readSkips: readSkips,
    writeSkip: writeSkip,
    mapHttpToErrorCode: mapHttpToErrorCode,
    humanErrorMessage: humanErrorMessage,
    buildReportMetadata: buildReportMetadata,
    continueAnyway: continueAnyway,
    submitProblemReport: submitProblemReport,
  };
})();
