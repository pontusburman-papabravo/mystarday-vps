/**
 * Admin — stuck-family diagnostics (recommended system help, no auto-send).
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

  const EVENT_LABELS = {
    login: 'Inloggning',
    activation_onboarding_started: 'Onboarding startad',
    funnel_onboarding_started: 'Onboarding startad',
    activation_question_answered: 'Onboarding-fråga besvarad',
    child_login_failed: 'Barninloggning misslyckades',
    child_pin_lockout: 'PIN-låsning',
    api_error_core_flow: 'API-fel i kärnflödet',
  };

  function formatStuckDuration(hours) {
    if (hours == null || hours < 0) return '—';
    if (hours < 48) return hours + ' tim';
    const days = Math.round(hours / 24);
    return days === 1 ? '1 dag' : days + ' dagar';
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

  function openFamily(familyId) {
    if (typeof window.openFamilyHub === 'function') {
      window.openFamilyHub(familyId);
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
        '<p class="text-sm text-slate-600 mb-3">Diagnostik 48h–14d. Totalt: ' +
        totalLabel +
        ' (QA dolda). Automation/utskick är avstängd.</p><div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">' +
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
    tbody.innerHTML = '<tr><td colspan="5">Laddar…</td></tr>';
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (cohort) qs.set('cohort', cohort);
      const data = await Auth.api('/api/admin/growth/stuck-cohorts?' + qs.toString());
      if (!data.families || !data.families.length) {
        tbody.innerHTML = '<tr><td colspan="5">Inga familjer i segmentet</td></tr>';
        return;
      }
      tbody.innerHTML = data.families
        .map(function (f) {
          const id = String(f.familyId || '');
          const name = escapeHtml(f.familyName || id);
          const acq = (f.acquisition && f.acquisition.source) ? escapeHtml(f.acquisition.source) : '';
          const meta = [f.locale, f.platform, acq].filter(Boolean).join(' · ');
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
            '<td class="py-3 pr-2">' + escapeHtml(activityLabel(f)) + '</td>' +
            '<td class="py-3 pr-2">' + escapeHtml(f.recommendedSystemHelp || f.manualNextStep || '') + '</td>' +
            '</tr>'
          );
        })
        .join('');
      tbody.querySelectorAll('.js-stuck-open-family').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openFamily(btn.getAttribute('data-family-id'));
        });
      });
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="5">' + escapeHtml(err.message || 'Kunde inte hämta fastnade familjer') + '</td></tr>';
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
