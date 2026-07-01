/**
 * Admin — Föräldaraktivering 7D experiment dashboard (Fas 6C).
 */
(function () {
  'use strict';

  let loaded = false;
  let currentWindow = 14;
  const chartInstances = {};

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pct(rate) {
    if (rate == null || Number.isNaN(rate)) return '—';
    return `${Math.round(rate * 1000) / 10}%`;
  }

  function destroyChart(id) {
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      delete chartInstances[id];
    }
  }

  function promisingBadge(isPromising) {
    if (isPromising) {
      return '<span class="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">✓ Lovande (+10 pp / +20 %)</span>';
    }
    return '<span class="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Under tröskel</span>';
  }

  function renderKpis(funnel, retention) {
    const el = document.getElementById('activationKpiCards');
    if (!el) return;

    if (!funnel.launchAt) {
      el.innerHTML = '<p class="text-text-soft col-span-full">ACTIVATION_PROGRAM_LAUNCH_AT är inte satt — kohorten är tom.</p>';
      return;
    }

    const fam = retention?.family || funnel.retentionSummary || {};
    el.innerHTML = `
      <div class="bg-white border-2 border-lavender rounded-2xl p-4">
        <p class="text-xs font-semibold text-text-soft uppercase">Kohort</p>
        <p class="text-3xl font-heading font-bold text-navy">${funnel.enrolled}</p>
        <p class="text-xs text-text-soft mt-1">T ${funnel.treatmentEnrolled} · C ${funnel.controlEnrolled}</p>
      </div>
      <div class="bg-white border-2 border-lavender rounded-2xl p-4">
        <p class="text-xs font-semibold text-text-soft uppercase">Family Day ${currentWindow} (T)</p>
        <p class="text-3xl font-heading font-bold text-indigo-700">${pct(fam.treatmentRate)}</p>
        <p class="text-xs text-text-soft mt-1">Control: ${pct(fam.controlRate)}</p>
      </div>
      <div class="bg-white border-2 border-lavender rounded-2xl p-4">
        <p class="text-xs font-semibold text-text-soft uppercase">Aha opportunity</p>
        <p class="text-3xl font-heading font-bold text-navy">${pct(funnel.aha?.opportunityRate)}</p>
        <p class="text-xs text-text-soft mt-1">Conversion: ${pct(funnel.aha?.conversionRate)}</p>
      </div>
      <div class="bg-white border-2 border-lavender rounded-2xl p-4 flex flex-col justify-center">
        <p class="text-xs font-semibold text-text-soft uppercase mb-2">Experiment</p>
        ${promisingBadge(fam.isPromising)}
      </div>
    `;
  }

  function renderFunnelChart(funnel) {
    const canvas = document.getElementById('activationFunnelChart');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('activationFunnelChart');

    const steps = funnel.steps || [];
    chartInstances.activationFunnelChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: steps.map((s) => s.label),
        datasets: [{
          label: 'Familjer',
          data: steps.map((s) => s.count),
          backgroundColor: '#6366f1',
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  function renderAhaRetentionChart(retention) {
    const canvas = document.getElementById('activationAhaRetentionChart');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('activationAhaRetentionChart');

    const ar = retention?.ahaRetention?.treatment || {};
    chartInstances.activationAhaRetentionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Med aha-sett', 'Utan aha-sett'],
        datasets: [{
          label: `Day ${currentWindow} retention`,
          data: [ar.with_aha?.rate || 0, ar.without_aha?.rate || 0],
          backgroundColor: ['#22c55e', '#f59e0b'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            ticks: { callback: (v) => `${Math.round(v * 100)}%` },
          },
        },
      },
    });

    const note = document.getElementById('activationAhaRetentionNote');
    if (note) {
      note.textContent = `Mätbara: ${ar.with_aha?.measurable || 0} med aha · ${ar.without_aha?.measurable || 0} utan`;
    }
  }

  function renderRetentionWall(wall) {
    const el = document.getElementById('activationRetentionWall');
    if (!el || !wall) return;
    el.innerHTML = `
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase text-text-soft">
            <th class="pb-2"></th>
            <th class="pb-2">Retained</th>
            <th class="pb-2">Churned</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-t border-lavender">
            <td class="py-2 font-semibold">Completed</td>
            <td class="py-2 text-green-700">${wall.completed_retained}</td>
            <td class="py-2 text-red-600 font-semibold">${wall.completed_churned}</td>
          </tr>
          <tr class="border-t border-lavender">
            <td class="py-2 font-semibold">Incomplete</td>
            <td class="py-2 text-green-700">${wall.incomplete_retained}</td>
            <td class="py-2">${wall.incomplete_churned}</td>
          </tr>
        </tbody>
      </table>
      <p class="text-xs text-text-soft mt-2">Röd cell = Retention Wall (complete + churned) — prioritera intervjuer.</p>
    `;
  }

  function renderDay3(d3) {
    const el = document.getElementById('activationDay3Stats');
    if (!el || !d3) return;
    el.innerHTML = `
      <p><span class="font-semibold">Aha-trigger:</span> ${d3.aha}</p>
      <p><span class="font-semibold">Stödjande fallback:</span> ${d3.supportive_fallback}</p>
      <p class="text-text-soft text-xs">Enrollment gap (treatment): ${document.getElementById('activationEnrollmentGap')?.textContent || '—'}</p>
    `;
  }

  function renderReflection(dist) {
    const el = document.getElementById('activationReflectionDist');
    if (!el) return;
    if (!dist?.length) {
      el.innerHTML = '<p class="text-text-soft text-sm">Inga reflektionssvar ännu.</p>';
      return;
    }
    el.innerHTML = dist.map((r) => `
      <div class="flex items-center gap-2 text-sm">
        <span class="w-8 font-bold text-navy">${r.score}★</span>
        <div class="flex-1 h-2 bg-lavender rounded-full overflow-hidden">
          <div class="h-full bg-indigo-500 rounded-full" style="width:${Math.min(100, r.count * 20)}%"></div>
        </div>
        <span class="text-text-soft w-6 text-right">${r.count}</span>
      </div>
    `).join('');
  }

  function renderDeepDive(list) {
    const el = document.getElementById('activationDeepDiveList');
    if (!el) return;
    if (!list?.length) {
      el.innerHTML = '<p class="text-text-soft text-sm">Inga deep-dive-kandidater i mogen kohort.</p>';
      return;
    }
    el.innerHTML = `<ul class="space-y-2 text-sm">${list.map((row) => `
      <li class="flex justify-between gap-2 border-b border-lavender pb-2">
        <span class="font-mono text-xs text-text-soft">${esc(row.familyId).slice(0, 8)}…</span>
        <span class="font-semibold text-red-700">${row.reason === 'low_reflection_score' ? 'Låg reflektion' : 'Complete + churned'}</span>
      </li>
    `).join('')}</ul>`;
  }

  function updateWindowTabs(retention) {
    document.querySelectorAll('[data-activation-window]').forEach((btn) => {
      const w = parseInt(btn.dataset.activationWindow, 10);
      const mature = w === 14 || retention?.windowMature;
      btn.disabled = !mature && w !== 14;
      btn.classList.toggle('opacity-40', btn.disabled);
      btn.classList.toggle('ring-2', w === currentWindow);
      btn.classList.toggle('ring-indigo-500', w === currentWindow);
    });
    const hint = document.getElementById('activationWindowHint');
    if (hint) {
      hint.textContent = retention?.windowMature
        ? `Kohort mogen för Day ${currentWindow}.`
        : `Day ${currentWindow} — väntar på att kohorten ska mogna.`;
    }
    if (window.AdminHistoryWarning) {
      window.AdminHistoryWarning.setHistoryLimitedWarning(
        'activationHistoryWarning',
        window.AdminHistoryWarning.isLongActivationWindow(currentWindow)
      );
    }
  }

  async function loadActivationProgramAdmin(force) {
    if (loaded && !force) return;

    const status = document.getElementById('activationLoadStatus');
    if (status) status.textContent = 'Laddar…';

    try {
      const [funnel, retention] = await Promise.all([
        Auth.api(`/api/admin/activation-program/funnel?window=${currentWindow}`),
        Auth.api(`/api/admin/activation-program/retention?window=${currentWindow}`),
      ]);

      const gapEl = document.getElementById('activationEnrollmentGap');
      if (gapEl) gapEl.textContent = String(funnel.enrollmentGap ?? '—');

      renderKpis(funnel, retention);
      renderFunnelChart(funnel);
      renderAhaRetentionChart(retention);
      renderRetentionWall(retention.retentionWall?.treatment || funnel.retentionWall);
      renderDay3(funnel.day3Triggers);
      renderReflection(funnel.reflectionDistribution);
      renderDeepDive(funnel.deepDive);
      updateWindowTabs(retention);

      if (status) status.textContent = funnel.launchAt
        ? `Launch: ${funnel.launchAt.slice(0, 10)}`
        : 'Ingen launch konfigurerad';

      loaded = true;
    } catch (err) {
      console.error('[Activation admin]', err);
      const kpiEl = document.getElementById('activationKpiCards');
      if (kpiEl) {
        const detail = err.body?.detail;
        const msg = err.message || 'Fel vid laddning';
        kpiEl.innerHTML = `<p class="text-red-600 col-span-full text-sm">${esc(msg)}${detail ? `<br><span class="text-xs font-mono">${esc(detail)}</span>` : ''}</p>`;
      }
      if (status) {
        status.textContent = err.body?.detail
          ? `${err.message || 'Fel vid laddning'} — ${err.body.detail}`
          : (err.message || 'Fel vid laddning');
      }
    }
  }

  function setActivationWindow(days) {
    currentWindow = days;
    loaded = false;
    loadActivationProgramAdmin(true);
  }

  async function exportActivationCsv() {
    try {
      const res = await fetch(`/api/admin/activation-program/retention/export?window=${currentWindow}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activation-program-${currentWindow}d-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Activation export]', err);
      alert('Kunde inte exportera CSV.');
    }
  }

  window.loadActivationProgramAdmin = loadActivationProgramAdmin;
  window.setActivationWindow = setActivationWindow;
  window.exportActivationCsv = exportActivationCsv;
})();
