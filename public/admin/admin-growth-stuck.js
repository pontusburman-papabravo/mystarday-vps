/**
 * Admin — stuck-family work queue with manual preview/send/skip (V1).
 */
(function () {
  'use strict';

  const COHORT_LABELS = {
    onboarding_incomplete: 'Onboarding ej klar',
    schema_no_child_login: 'Schema utan barnlogin',
    login_no_completion: 'Login utan completion',
    completion_no_return: 'Completion utan återkomst',
    core_flow_errors: 'Tekniska fel i kärnflödet',
  };

  const INTERVENTION_LABELS = {
    onboarding_incomplete: 'Onboarding-hjälp',
    schema_without_child_access: 'Barnlogin-hjälp',
    started_but_stalled: 'Återstart',
  };

  const EVENT_LABELS = {
    login: 'Inloggning',
    activation_onboarding_started: 'Onboarding startad',
    funnel_onboarding_started: 'Onboarding startad',
    activation_question_answered: 'Onboarding-fråga besvarad',
    child_login_failed: 'Barninloggning misslyckades',
    child_pin_lockout: 'PIN-låsning',
    api_error_core_flow: 'API-fel i kärnflödet',
  };

  let previewModalEl = null;

  function formatStuckDuration(hours) {
    if (hours == null || hours < 0) return '—';
    if (hours < 48) return hours + ' tim';
    const days = Math.round(hours / 24);
    return days === 1 ? '1 dag' : days + ' dagar';
  }

  function formatShortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }

  function formatWhen(iso) {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const hours = Math.max(0, Math.round((Date.now() - then) / 3600000));
    if (hours < 1) return 'nyss';
    if (hours < 48) return hours + ' tim sedan';
    const days = Math.round(hours / 24);
    return days === 1 ? '1 dag sedan' : days + ' dagar sedan';
  }

  function activityLabel(family) {
    const type = family.lastActivityType || family.lastEventType;
    if (!type) return 'Ingen aktivitet';
    const name = EVENT_LABELS[type] || type;
    const when = formatWhen(family.lastActivityAt || family.lastEventAt);
    return when ? name + ' · ' + when : name;
  }

  function commsLabel(family) {
    const hist = family.commsHistory || {};
    const parts = [];
    if (hist.activationNudgeSentAt) {
      parts.push('Nudge ' + formatShortDate(hist.activationNudgeSentAt));
    }
    if (hist.lastStuckIntervention && hist.lastStuckIntervention.sentAt) {
      parts.push('Stuck-mejl ' + formatShortDate(hist.lastStuckIntervention.sentAt));
    }
    if (!parts.length) return 'Ingen stuck-intervention';
    return parts.join(' · ');
  }

  function openFamily(familyId) {
    if (typeof window.openFamilyHub === 'function') {
      window.openFamilyHub(familyId);
    }
  }

  function ensurePreviewModal() {
    if (previewModalEl) return previewModalEl;
    previewModalEl = document.createElement('div');
    previewModalEl.id = 'growthStuckPreviewModal';
    previewModalEl.className = 'fixed inset-0 z-[200] hidden items-center justify-center bg-black/40 p-4';
    previewModalEl.innerHTML =
      '<div class="bg-white rounded-2xl border-2 border-lavender max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">' +
      '<div class="flex items-start justify-between gap-4 mb-4">' +
      '<div><h4 class="text-xl font-heading font-bold text-navy" id="growthStuckPreviewTitle">Förhandsgranska mejl</h4>' +
      '<p class="text-sm text-text-soft mt-1" id="growthStuckPreviewMeta"></p></div>' +
      '<button type="button" id="growthStuckPreviewClose" class="text-text-soft hover:text-navy text-2xl leading-none" aria-label="Stäng">×</button>' +
      '</div>' +
      '<div id="growthStuckPreviewBlockers" class="mb-4 hidden rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"></div>' +
      '<div class="rounded-xl border border-lavender bg-slate-50 p-4 mb-4">' +
      '<p class="text-xs uppercase tracking-wide text-text-soft mb-1">Ämne</p>' +
      '<p id="growthStuckPreviewSubject" class="font-semibold text-navy"></p>' +
      '</div>' +
      '<div class="rounded-xl border border-lavender overflow-hidden mb-4">' +
      '<iframe id="growthStuckPreviewFrame" title="Mejlförhandsgranskning" class="w-full min-h-[280px] bg-white border-0"></iframe>' +
      '</div>' +
      '<div class="flex flex-wrap gap-2 justify-end">' +
      '<button type="button" id="growthStuckPreviewSkipBtn" class="px-4 py-2 rounded-xl border-2 border-lavender text-sm font-semibold text-navy">Hoppa över</button>' +
      '<button type="button" id="growthStuckPreviewSendBtn" class="px-4 py-2 rounded-xl bg-gold text-navy text-sm font-semibold disabled:opacity-50">Skicka</button>' +
      '</div></div>';
    document.body.appendChild(previewModalEl);
    previewModalEl.querySelector('#growthStuckPreviewClose').addEventListener('click', closePreviewModal);
    previewModalEl.addEventListener('click', function (e) {
      if (e.target === previewModalEl) closePreviewModal();
    });
    return previewModalEl;
  }

  function closePreviewModal() {
    if (!previewModalEl) return;
    previewModalEl.classList.add('hidden');
    previewModalEl.classList.remove('flex');
    previewModalEl.dataset.familyId = '';
  }

  function openPreviewModal(familyId, familyName) {
    const modal = ensurePreviewModal();
    modal.dataset.familyId = familyId;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('growthStuckPreviewTitle').textContent =
      'Förhandsgranska — ' + (familyName || familyId);
    document.getElementById('growthStuckPreviewMeta').textContent = 'Laddar…';
    document.getElementById('growthStuckPreviewSubject').textContent = '';
    document.getElementById('growthStuckPreviewBlockers').classList.add('hidden');
    const frame = document.getElementById('growthStuckPreviewFrame');
    frame.srcdoc = '<p style="font-family:sans-serif;padding:16px;color:#5A6178">Laddar…</p>';
    const sendBtn = document.getElementById('growthStuckPreviewSendBtn');
    sendBtn.disabled = true;
    sendBtn.onclick = function () { sendIntervention(familyId); };
    document.getElementById('growthStuckPreviewSkipBtn').onclick = function () {
      skipIntervention(familyId);
    };
    loadPreview(familyId);
  }

  async function loadPreview(familyId) {
    try {
      const data = await Auth.api(
        '/api/admin/growth/stuck-cohorts/' + encodeURIComponent(familyId) + '/intervention/preview'
      );
      const meta = [];
      if (data.cohort) meta.push(COHORT_LABELS[data.cohort] || data.cohort);
      if (data.interventionKey) {
        meta.push(INTERVENTION_LABELS[data.interventionKey] || data.interventionKey);
      }
      document.getElementById('growthStuckPreviewMeta').textContent = meta.join(' · ') || '—';

      const blockersEl = document.getElementById('growthStuckPreviewBlockers');
      if (data.blockers && data.blockers.length) {
        blockersEl.classList.remove('hidden');
        blockersEl.innerHTML =
          '<p class="font-semibold mb-1">Utskick blockeras:</p><ul class="list-disc pl-5">' +
          data.blockers.map(function (b) {
            return '<li>' + escapeHtml(b.message || b.code) + '</li>';
          }).join('') +
          '</ul>';
      } else {
        blockersEl.classList.add('hidden');
        blockersEl.innerHTML = '';
      }

      document.getElementById('growthStuckPreviewSubject').textContent =
        (data.emailPreview && data.emailPreview.subject) || '—';
      const frame = document.getElementById('growthStuckPreviewFrame');
      frame.srcdoc = (data.emailPreview && data.emailPreview.html) || '<p>Ingen förhandsgranskning</p>';
      document.getElementById('growthStuckPreviewSendBtn').disabled = !data.eligible;
    } catch (err) {
      document.getElementById('growthStuckPreviewMeta').textContent = err.message || 'Fel vid förhandsgranskning';
    }
  }

  async function sendIntervention(familyId) {
    const sendBtn = document.getElementById('growthStuckPreviewSendBtn');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Skickar…';
    }
    try {
      await Auth.api(
        '/api/admin/growth/stuck-cohorts/' + encodeURIComponent(familyId) + '/intervention/send',
        { method: 'POST', body: {} }
      );
      closePreviewModal();
      const filter = document.getElementById('growthStuckCohortFilter');
      loadGrowthStuckTable(filter ? filter.value || null : null);
      loadGrowthStuckSummary();
      if (typeof window.showToast === 'function') {
        window.showToast('Stuck-mejl skickat', 'success');
      }
    } catch (err) {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Skicka';
      }
      await loadPreview(familyId);
      if (typeof window.showToast === 'function') {
        window.showToast(err.message || 'Kunde inte skicka', 'error');
      }
    }
  }

  async function skipIntervention(familyId) {
    const reason = window.prompt('Anledning (valfritt):', 'Manuellt hoppad i admin');
    if (reason === null) return;
    try {
      await Auth.api(
        '/api/admin/growth/stuck-cohorts/' + encodeURIComponent(familyId) + '/intervention/skip',
        { method: 'POST', body: { reason: reason || undefined } }
      );
      closePreviewModal();
      if (typeof window.showToast === 'function') {
        window.showToast('Hoppade över', 'success');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast(err.message || 'Kunde inte hoppa över', 'error');
      }
    }
  }

  async function loadGrowthStuckSummary() {
    const el = document.getElementById('growthStuckSummary');
    if (!el) return;
    el.textContent = 'Laddar…';
    try {
      const data = await Auth.api('/api/admin/growth/stuck-cohorts/summary');
      const parts = Object.keys(COHORT_LABELS).map(function (key) {
        const n = (data.counts && data.counts[key]) || 0;
        return (
          '<button type="button" data-stuck-cohort="' + key + '" class="text-left bg-white rounded-2xl border-2 border-lavender p-4 hover:border-gold transition-colors">' +
          '<p class="text-3xl font-heading font-bold text-navy">' + n + '</p>' +
          '<p class="text-sm text-text-soft mt-1">' + COHORT_LABELS[key] + '</p>' +
          '</button>'
        );
      });
      const total = data.total || 0;
      const totalLabel = total === 1 ? '1 familj' : total + ' familjer';
      el.innerHTML =
        '<p class="text-sm text-slate-600 mb-3">Arbetskö 48h–14d. Totalt: ' +
        totalLabel +
        ' (QA dolda). <strong>Manuellt utskick</strong> — ingen automation.</p><div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">' +
        parts.join('') +
        '</div>';
      el.querySelectorAll('[data-stuck-cohort]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const filter = document.getElementById('growthStuckCohortFilter');
          const key = btn.getAttribute('data-stuck-cohort');
          if (filter) filter.value = key;
          loadGrowthStuckTable(key);
        });
      });
    } catch (err) {
      el.textContent = err.message || 'Kunde inte ladda kohorter.';
    }
  }

  async function loadGrowthStuckTable(cohort) {
    const tbody = document.getElementById('growthStuckTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Laddar…</td></tr>';
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (cohort) qs.set('cohort', cohort);
      const data = await Auth.api('/api/admin/growth/stuck-cohorts?' + qs.toString());
      if (!data.families || !data.families.length) {
        tbody.innerHTML = '<tr><td colspan="7">Inga familjer i segmentet</td></tr>';
        return;
      }
      tbody.innerHTML = data.families
        .map(function (f) {
          const id = String(f.familyId || '');
          const name = escapeHtml(f.familyName || id);
          const acq = (f.acquisition && f.acquisition.source) ? escapeHtml(f.acquisition.source) : '';
          const meta = [f.locale, f.platform, acq].filter(Boolean).join(' · ');
          const cohortLabel = COHORT_LABELS[f.blockingStep] || f.blockingStep || '';
          return (
            '<tr class="align-top border-b border-lavender/60">' +
            '<td class="py-3 pr-2">' +
            '<button type="button" data-family-id="' + escapeHtml(id) + '" class="js-stuck-open-family font-semibold text-navy hover:text-gold text-left">' +
            name +
            '</button>' +
            (meta ? '<p class="text-xs text-text-soft mt-0.5">' + escapeHtml(meta) + '</p>' : '') +
            '</td>' +
            '<td class="py-3 pr-2">' + escapeHtml(f.whyStuck || '') + '</td>' +
            '<td class="py-3 pr-2 whitespace-nowrap">' + escapeHtml(formatStuckDuration(f.stuckHours)) + '</td>' +
            '<td class="py-3 pr-2 text-xs">' + escapeHtml(commsLabel(f)) + '</td>' +
            '<td class="py-3 pr-2">' + escapeHtml(activityLabel(f)) + '</td>' +
            '<td class="py-3 pr-2 text-xs text-text-soft">' + escapeHtml(cohortLabel) + '</td>' +
            '<td class="py-3 pr-2 whitespace-nowrap">' +
            '<button type="button" class="js-stuck-preview px-2 py-1 rounded-lg border border-lavender text-xs font-semibold text-navy hover:border-gold mr-1" data-family-id="' + escapeHtml(id) + '" data-family-name="' + name + '">Förhandsgranska</button>' +
            '<button type="button" class="js-stuck-open-family px-2 py-1 rounded-lg text-xs font-semibold text-gold hover:underline" data-family-id="' + escapeHtml(id) + '">Visa</button>' +
            '</td>' +
            '</tr>'
          );
        })
        .join('');
      tbody.querySelectorAll('.js-stuck-open-family').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openFamily(btn.getAttribute('data-family-id'));
        });
      });
      tbody.querySelectorAll('.js-stuck-preview').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openPreviewModal(
            btn.getAttribute('data-family-id'),
            btn.getAttribute('data-family-name')
          );
        });
      });
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="7">' + escapeHtml(err.message || 'Kunde inte hämta fastnade familjer') + '</td></tr>';
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.loadGrowthStuckSummary = loadGrowthStuckSummary;
  window.loadGrowthStuckTable = loadGrowthStuckTable;

  document.addEventListener('DOMContentLoaded', function () {
    const filter = document.getElementById('growthStuckCohortFilter');
    const reloadBtn = document.getElementById('growthStuckReloadBtn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', function () {
        const cohort = filter ? filter.value : '';
        loadGrowthStuckSummary();
        loadGrowthStuckTable(cohort || null);
      });
    }
    if (filter) {
      filter.addEventListener('change', function () {
        loadGrowthStuckTable(filter.value || null);
      });
    }
  });
})();
