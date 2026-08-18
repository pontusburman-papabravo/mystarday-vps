/**
 * Admin — growth stuck cohorts preview (no auto-send).
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

  const FOLLOW_UP_LABELS = {
    preview_handoff_nudge: 'Hjälp att slutföra onboarding',
    preview_child_login_help: 'Hjälp med barninloggning',
    preview_first_star_guide: 'Guide till första stjärnan',
    preview_return_nudge: 'Påminnelse att komma tillbaka',
    preview_support_outreach: 'Supportuppföljning',
    preview_manual_review: 'Manuell genomgång',
  };

  function followUpLabel(key) {
    return FOLLOW_UP_LABELS[key] || key || 'Manuell genomgång';
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
          '<div class="bg-white rounded-2xl border-2 border-lavender p-4">' +
          '<p class="text-3xl font-heading font-bold text-navy">' + n + '</p>' +
          '<p class="text-sm text-text-soft mt-1">' + COHORT_LABELS[key] + '</p>' +
          '</div>'
        );
      });
      const total = data.total || 0;
      const totalLabel = total === 1 ? '1 familj' : total + ' familjer';
      el.innerHTML =
        '<p class="text-sm text-slate-600 mb-3">Preview 48h–14d. Ingen automatisk utskickning. Totalt: ' +
        totalLabel +
        ' (QA dolda).</p><div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">' +
        parts.join('') +
        '</div>';
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
          const acq = f.acquisition || {};
          const step = COHORT_LABELS[f.blockingStep] || f.blockingStep || '';
          return (
            '<tr>' +
            '<td>' + escapeHtml(f.familyName || f.familyId) + '</td>' +
            '<td>' + escapeHtml(step) + '</td>' +
            '<td>' + escapeHtml(f.lastEventType || '—') + '</td>' +
            '<td>' + escapeHtml(f.locale || '—') + '</td>' +
            '<td>' + escapeHtml(f.platform || '—') + '</td>' +
            '<td>' + escapeHtml(acq.source || '—') + '</td>' +
            '<td>' + escapeHtml(followUpLabel(f.recommendedFollowUp)) +
            ' <span class="badge">manual</span></td>' +
            '</tr>'
          );
        })
        .join('');
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
