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

  async function loadGrowthStuckSummary() {
    const el = document.getElementById('growthStuckSummary');
    if (!el) return;
    el.textContent = 'Laddar…';
    try {
      const data = await Auth.api('/api/admin/growth/stuck-cohorts/summary');
      const parts = Object.keys(COHORT_LABELS).map(function (key) {
        const n = (data.counts && data.counts[key]) || 0;
        return '<div class="stat-card"><div class="stat-value">' + n + '</div><div class="stat-label">' +
          COHORT_LABELS[key] + '</div></div>';
      });
      el.innerHTML =
        '<p class="text-sm text-slate-600 mb-3">Preview only — autoSendAllowed=' +
        String(data.autoSendAllowed) +
        '. Total: ' +
        (data.total || 0) +
        '</p><div class="stats-grid">' +
        parts.join('') +
        '</div>';
    } catch (err) {
      el.textContent = err.message || 'Kunde inte ladda kohorter (flagga av?).';
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
          return (
            '<tr>' +
            '<td>' + escapeHtml(f.familyName || f.familyId) + '</td>' +
            '<td>' + escapeHtml(f.blockingStep || '') + '</td>' +
            '<td>' + escapeHtml(f.lastEventType || '—') + '</td>' +
            '<td>' + escapeHtml(f.locale || '—') + '</td>' +
            '<td>' + escapeHtml(f.platform || '—') + '</td>' +
            '<td>' + escapeHtml(acq.source || '—') + '</td>' +
            '<td>' + escapeHtml(f.recommendedFollowUp || '') +
            ' <span class="badge">manual</span></td>' +
            '</tr>'
          );
        })
        .join('');
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="7">' + escapeHtml(err.message || 'Fel') + '</td></tr>';
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

  function bindGrowthStuckDom() {
    if (bindGrowthStuckDom._bound) return;
    bindGrowthStuckDom._bound = true;
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindGrowthStuckDom);
  } else {
    bindGrowthStuckDom();
  }
})();
