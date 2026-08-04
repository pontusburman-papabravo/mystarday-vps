/**
 * activation-schedule-picker.js — recoverable schedule picker for Activation save_schedule step.
 */
(function () {
  'use strict';

  const Core = function () { return window.ActivationRecoverableCore; };

  function durationBucket(ms) {
    if (ms < 2000) return 'under_2s';
    if (ms < 5000) return '2_5s';
    if (ms < 12000) return '5_12s';
    return 'over_12s';
  }

  /**
   * @param {object} options
   * @param {HTMLElement} options.mount
   * @param {string} [options.childId]
   * @param {() => void} [options.onApplied]
   */
  function createSchedulePicker(options) {
    const mount = options.mount;
    let abortController = null;
    let generation = 0;
    let retryCount = 0;
    let lastCorrelationId = null;
    let lastData = null;
    let reportOpen = false;

    function renderLoading() {
      mount.innerHTML =
        '<div class="activation-schedule-picker" role="status" aria-live="polite">' +
        '<p class="text-sm text-navy mb-3">' + Core().esc(Core().pt('home.activationRecoverable.schedule.loading')) + '</p>' +
        '<div class="flex gap-2 mt-4">' + actionButtonsHtml(false) + '</div>' +
        '</div>';
      wireActions();
    }

    function actionButtonsHtml(includeRetry) {
      let html = '';
      if (includeRetry) {
        html += '<button type="button" data-act="retry" class="flex-1 min-h-[44px] py-3 rounded-xl bg-gold text-white font-semibold text-sm">' +
          Core().esc(Core().pt('home.activationRecoverable.actions.retry')) + '</button>';
      }
      html += '<button type="button" data-act="report" class="min-h-[44px] px-4 py-3 rounded-xl border-2 border-lavender text-navy text-sm font-semibold">' +
        Core().esc(Core().pt('home.activationRecoverable.actions.report')) + '</button>';
      html += '<button type="button" data-act="continue" class="min-h-[44px] px-4 py-3 rounded-xl border-2 border-indigo-200 text-navy text-sm font-semibold">' +
        Core().esc(Core().pt('home.activationRecoverable.actions.continueAnyway')) + '</button>';
      return html;
    }

    function renderError(errorCode) {
      const msg = Core().humanErrorMessage(errorCode);
      mount.innerHTML =
        '<div class="activation-schedule-picker" role="alert">' +
        '<p class="font-semibold text-navy text-sm mb-2" tabindex="-1" id="activationScheduleErr">' + Core().esc(msg) + '</p>' +
        '<p class="text-xs text-text-soft mb-3">' + Core().esc(Core().pt('home.activationRecoverable.schedule.errorHint')) + '</p>' +
        '<div class="flex flex-col gap-2">' + actionButtonsHtml(true) +
        '<a href="/schedule" class="text-center text-sm font-semibold text-gold underline min-h-[44px] py-2">' +
        Core().esc(Core().pt('home.activationRecoverable.schedule.createNew')) + '</a>' +
        '</div></div>';
      const errEl = mount.querySelector('#activationScheduleErr');
      if (errEl) errEl.focus();
      Core().track('activation_step_error', {
        step_id: 'save_schedule',
        error_code: errorCode,
        rollout_source: 'activation_first_success_v1',
      });
      wireActions();
    }

    function renderEmpty() {
      mount.innerHTML =
        '<div class="activation-schedule-picker">' +
        '<p class="text-sm text-navy mb-2">' + Core().esc(Core().pt('home.activationRecoverable.schedule.emptyTitle')) + '</p>' +
        '<p class="text-xs text-text-soft mb-3">' + Core().esc(Core().pt('home.activationRecoverable.schedule.emptyBody')) + '</p>' +
        '<a href="/schedule" class="block w-full min-h-[44px] py-3 rounded-xl bg-gold text-white font-semibold text-sm text-center mb-2">' +
        Core().esc(Core().pt('home.activationRecoverable.schedule.createNew')) + '</a>' +
        '<div class="flex flex-col gap-2">' + actionButtonsHtml(false) + '</div>' +
        '</div>';
      wireActions();
    }

    function renderOptions(data) {
      lastData = data;
      const starters = data.starter_templates || [];
      const family = data.family_templates || [];
      let listHtml = '';

      if (starters.length) {
        listHtml += '<p class="text-xs font-semibold text-text-soft uppercase mb-2">' +
          Core().esc(Core().pt('home.activationRecoverable.schedule.starterHeading')) + '</p>';
        listHtml += '<div class="space-y-2 mb-3">';
        starters.forEach(function (g) {
          listHtml += '<button type="button" data-starter="' + Core().esc(g.key) + '" class="w-full text-left px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold min-h-[44px]">' +
            '<span class="text-lg mr-2">' + Core().esc(g.icon || '📋') + '</span>' +
            '<span class="font-semibold text-sm text-navy">' + Core().esc(g.name) + '</span>' +
            '</button>';
        });
        listHtml += '</div>';
      }

      if (family.length) {
        listHtml += '<p class="text-xs font-semibold text-text-soft uppercase mb-2">' +
          Core().esc(Core().pt('home.activationRecoverable.schedule.familyHeading')) + '</p>';
        listHtml += '<div class="space-y-2 mb-3">';
        family.forEach(function (tpl) {
          listHtml += '<button type="button" data-family-template="' + Core().esc(tpl.id) + '" class="w-full text-left px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold min-h-[44px]">' +
            '<span class="font-semibold text-sm text-navy">' + Core().esc(tpl.name) + '</span>' +
            '</button>';
        });
        listHtml += '</div>';
      }

      mount.innerHTML =
        '<div class="activation-schedule-picker">' +
        '<p class="text-sm text-navy mb-2">' + Core().esc(Core().pt('home.activationRecoverable.schedule.pickTitle')) + '</p>' +
        listHtml +
        '<div class="flex flex-col gap-2 mt-2">' + actionButtonsHtml(false) + '</div>' +
        '</div>';

      mount.querySelectorAll('[data-starter]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          applyStarter(btn.getAttribute('data-starter'));
        });
      });
      mount.querySelectorAll('[data-family-template]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          applyFamilyTemplate(btn.getAttribute('data-family-template'));
        });
      });
      wireActions();
    }

    function wireActions() {
      const reportBtn = mount.querySelector('[data-act="report"]');
      const continueBtn = mount.querySelector('[data-act="continue"]');
      const retryBtn = mount.querySelector('[data-act="retry"]');
      if (retryBtn) {
        retryBtn.addEventListener('click', function () {
          retryCount += 1;
          Core().track('activation_schedule_retry', {
            step_id: 'save_schedule',
            retry_count: retryCount,
            rollout_source: 'activation_first_success_v1',
          });
          load();
        });
      }
      if (continueBtn) {
        continueBtn.addEventListener('click', function () {
          Core().continueAnyway('save_schedule', {
            child_has_schedule: lastData && lastData.child_has_schedule,
            error_code: null,
          });
        });
      }
      if (reportBtn) {
        reportBtn.addEventListener('click', function () { openReportForm(); });
      }
    }

    function openReportForm() {
      if (reportOpen) return;
      reportOpen = true;
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[12000] flex items-end sm:items-center justify-center bg-navy/50 p-4';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML =
        '<div class="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">' +
        '<h2 class="font-heading font-bold text-navy text-base mb-2">' + Core().esc(Core().pt('home.activationRecoverable.report.title')) + '</h2>' +
        '<p class="text-xs text-text-soft mb-3">' + Core().esc(Core().pt('home.activationRecoverable.report.hint')) + '</p>' +
        '<textarea id="activationReportNote" rows="3" maxlength="500" class="form-input w-full mb-3" placeholder="' + Core().esc(Core().pt('home.activationRecoverable.report.placeholder')) + '"></textarea>' +
        '<p id="activationReportStatus" class="text-xs text-mint hidden mb-2"></p>' +
        '<div class="flex flex-col gap-2">' +
        '<button type="button" id="activationReportSend" class="min-h-[44px] py-3 rounded-xl bg-navy text-white font-semibold text-sm">' +
        Core().esc(Core().pt('home.activationRecoverable.report.send')) + '</button>' +
        '<button type="button" id="activationReportClose" class="min-h-[44px] py-2 text-sm font-semibold text-text-soft">' +
        Core().esc(Core().pt('home.activationRecoverable.report.close')) + '</button>' +
        '</div></div>';
      document.body.appendChild(overlay);

      function close() {
        overlay.remove();
        reportOpen = false;
      }

      overlay.querySelector('#activationReportClose').addEventListener('click', close);
      overlay.querySelector('#activationReportSend').addEventListener('click', async function () {
        const note = overlay.querySelector('#activationReportNote').value.trim();
        const statusEl = overlay.querySelector('#activationReportStatus');
        const sendBtn = overlay.querySelector('#activationReportSend');
        sendBtn.disabled = true;
        const result = await Core().submitProblemReport(
          'save_schedule',
          Core().STEP_STATUS.blocked_by_error,
          note,
          {
            error_code: null,
            correlation_id: lastCorrelationId,
            retry_count: retryCount,
          }
        );
        if (result.ok) {
          statusEl.textContent = Core().pt('home.activationRecoverable.report.sent');
          statusEl.classList.remove('hidden');
        } else {
          statusEl.textContent = Core().pt('home.activationRecoverable.report.failed');
          statusEl.classList.remove('hidden');
          statusEl.classList.add('text-coral');
        }
        sendBtn.disabled = false;
      });
    }

    async function applyStarter(templateGroup) {
      const childId = (lastData && lastData.target_child_id) || options.childId;
      if (!childId) return;
      const btn = mount.querySelector('[data-starter="' + templateGroup + '"]');
      if (btn) btn.disabled = true;
      try {
        const res = await window.apiFetch('/api/onboarding/schedule', {
          method: 'POST',
          body: JSON.stringify({ child_id: childId, template_group: templateGroup }),
        });
        if (!res.ok) {
          renderError(Core().mapHttpToErrorCode(res.status));
          return;
        }
        Core().track('activation_step_completed', { step_id: 'save_schedule', rollout_source: 'activation_first_success_v1' });
        if (options.onApplied) options.onApplied();
        if (window.ActivationFirstSuccessHub) ActivationFirstSuccessHub.load({ force: true });
      } catch (_) {
        renderError(Core().ERROR_CODES.SCHEDULE_LOAD_5XX);
      }
    }

    async function applyFamilyTemplate(templateId) {
      const childId = (lastData && lastData.target_child_id) || options.childId;
      if (!childId || !templateId) return;
      try {
        const res = await window.apiFetch('/api/schedule-templates/' + encodeURIComponent(templateId) + '/apply', {
          method: 'POST',
          body: JSON.stringify({ child_id: childId, days: [1, 2, 3, 4, 5] }),
        });
        if (!res.ok) {
          renderError(Core().mapHttpToErrorCode(res.status));
          return;
        }
        Core().track('activation_step_completed', { step_id: 'save_schedule', rollout_source: 'activation_first_success_v1' });
        if (options.onApplied) options.onApplied();
        if (window.ActivationFirstSuccessHub) ActivationFirstSuccessHub.load({ force: true });
      } catch (_) {
        renderError(Core().ERROR_CODES.SCHEDULE_LOAD_5XX);
      }
    }

    async function fetchOptions(signal) {
      const qs = options.childId ? '?child_id=' + encodeURIComponent(options.childId) : '';
      const started = Date.now();
      lastCorrelationId = 'sched-' + started + '-' + Math.random().toString(36).slice(2, 8);
      Core().track('activation_schedule_load_started', {
        step_id: 'save_schedule',
        correlation_id: lastCorrelationId,
        rollout_source: 'activation_first_success_v1',
      });

      const controller = new AbortController();
      const linked = signal ? { signal: controller.signal } : {};
      if (signal) {
        signal.addEventListener('abort', function () { controller.abort(); });
      }
      const timeoutId = setTimeout(function () { controller.abort(); }, Core().SCHEDULE_LOAD_TIMEOUT_MS);

      let res;
      try {
        res = await window.apiFetch('/api/family/activation/schedule-options' + qs, linked);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          const elapsed = Date.now() - started;
          Core().track('activation_schedule_load_failed', {
            step_id: 'save_schedule',
            error_code: Core().ERROR_CODES.SCHEDULE_LOAD_TIMEOUT,
            duration_bucket: durationBucket(elapsed),
            retry_count: retryCount,
          });
          const err = new Error('timeout');
          err.code = Core().ERROR_CODES.SCHEDULE_LOAD_TIMEOUT;
          throw err;
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);
      const elapsed = Date.now() - started;

      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        Core().track('activation_schedule_load_failed', {
          step_id: 'save_schedule',
          error_code: Core().ERROR_CODES.SCHEDULE_PARSE_ERROR,
          duration_bucket: durationBucket(elapsed),
          retry_count: retryCount,
        });
        throw new Error('parse');
      }

      if (!res.ok) {
        const code = (data && data.error_code) || Core().mapHttpToErrorCode(res.status);
        Core().track('activation_schedule_load_failed', {
          step_id: 'save_schedule',
          error_code: code,
          duration_bucket: durationBucket(elapsed),
          retry_count: retryCount,
        });
        const err = new Error('http');
        err.code = code;
        throw err;
      }

      Core().track('activation_schedule_load_succeeded', {
        step_id: 'save_schedule',
        duration_bucket: durationBucket(elapsed),
        retry_count: retryCount,
      });
      return data;
    }

    async function load() {
      const myGen = ++generation;
      if (abortController) abortController.abort();
      abortController = new AbortController();
      renderLoading();

      try {
        let data;
        try {
          data = await fetchOptions(abortController.signal);
        } catch (firstErr) {
          if (firstErr.name === 'AbortError') return;
          if (retryCount === 0 && firstErr.message !== 'parse') {
            await new Promise(function (r) { setTimeout(r, Core().AUTO_RETRY_DELAY_MS); });
            retryCount += 1;
            data = await fetchOptions(abortController.signal);
          } else {
            throw firstErr;
          }
        }

        if (myGen !== generation) return;
        if (data.empty) {
          renderEmpty();
          Core().track('activation_step_error', {
            step_id: 'save_schedule',
            error_code: Core().ERROR_CODES.SCHEDULE_EMPTY,
            rollout_source: 'activation_first_success_v1',
          });
          return;
        }
        renderOptions(data);
      } catch (err) {
        if (err.name === 'AbortError' || myGen !== generation) return;
        const code = err.code
          || (err.message === 'timeout' ? Core().ERROR_CODES.SCHEDULE_LOAD_TIMEOUT : Core().ERROR_CODES.SCHEDULE_LOAD_5XX);
        if (err.message === 'parse') {
          renderError(Core().ERROR_CODES.SCHEDULE_PARSE_ERROR);
          return;
        }
        renderError(code);
      }
    }

    function destroy() {
      generation += 1;
      if (abortController) abortController.abort();
      mount.innerHTML = '';
    }

    load();

    return { reload: load, destroy: destroy };
  }

  window.ActivationSchedulePicker = {
    create: createSchedulePicker,
    durationBucket: durationBucket,
  };
})();
