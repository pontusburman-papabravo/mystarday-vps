/**
 * admin-journey-daily-analysis.js — daglig Journey-analys på admin startsida.
 */
(function () {
  'use strict';

  let _failureChart = null;
  let _funnelChart = null;

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function severityBadge(severity) {
    if (severity === 'critical') return { cls: 'bg-coral text-navy', label: 'Kritisk' };
    if (severity === 'warning') return { cls: 'bg-gold-light text-navy', label: 'Varning' };
    return { cls: 'bg-sky text-navy', label: 'Info' };
  }

  function formatWhen(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  function formatChartLabel(iso) {
    try {
      return new Date(iso).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  function renderHistoryCharts(history) {
    if (!history || history.length < 2 || typeof Chart === 'undefined') return;

    const labels = history.map((h) => formatChartLabel(h.generatedAt));

    if (_failureChart) { _failureChart.destroy(); _failureChart = null; }
    if (_funnelChart) { _funnelChart.destroy(); _funnelChart = null; }

    const failCanvas = document.getElementById('journeyChartFailures');
    const funnelCanvas = document.getElementById('journeyChartFunnel');
    if (!failCanvas || !funnelCanvas) return;

    _failureChart = new Chart(failCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Hittade fel',
            data: history.map((h) => h.failuresFound),
            borderColor: '#e17055',
            backgroundColor: 'rgba(225,112,85,0.15)',
            tension: 0.25,
            fill: true,
          },
          {
            label: 'Browser QA-fel',
            data: history.map((h) => h.browserQaFailures),
            borderColor: '#fdcb6e',
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });

    _funnelChart = new Chart(funnelCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'FIRST_USE utan barnlogin',
            data: history.map((h) => h.firstUseNoChildLogin),
            borderColor: '#6c5ce7',
            tension: 0.25,
          },
          {
            label: 'Parent-ack kö',
            data: history.map((h) => h.parentAckPending),
            borderColor: '#00b894',
            tension: 0.25,
          },
          {
            label: 'first_success (30d)',
            data: history.map((h) => h.firstSuccess30d),
            borderColor: '#0984e3',
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  function renderReport(data) {
    const report = data?.report;
    const mount = document.getElementById('journeyDailyAnalysisBlock');
    if (!mount) return;

    if (!report) {
      mount.innerHTML = `
        <div class="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5">
          <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">Family Journey — daglig analys</p>
              <h2 class="text-xl font-heading font-bold text-navy">Ingen analys körd än</h2>
              <p class="text-sm text-text-soft mt-1">Schemalagd körning varje morgon kl. 06:00 (Stockholm).</p>
            </div>
            <button type="button" id="journeyAnalysisRunBtn" class="px-4 py-2 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-yellow-500">Kör analys nu</button>
          </div>
        </div>`;
      bindRunBtn();
      return;
    }

    const s = report.summary || {};
    const actions = report.actions || [];
    const sections = report.sections || [];
    const browserSection = sections.find((x) => x.id === 'browser_qa');

    const actionsHtml = actions.length
      ? `<div class="mt-4">
          <p class="text-xs font-bold uppercase text-text-soft mb-2">Föreslagna åtgärder idag</p>
          <ol class="space-y-2 list-decimal list-inside">
            ${actions.map((a) => {
              const badge = severityBadge(a.priority);
              const link = a.route
                ? `<a href="${esc(a.route)}" onclick="return adminNavClick(event)" class="font-semibold text-gold hover:underline ml-1">Gå →</a>`
                : '';
              return `<li class="text-sm text-navy bg-white/70 rounded-xl px-3 py-2 border border-indigo-100">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls} mr-2">${esc(badge.label)}</span>
                <span class="font-semibold">${esc(a.title)}</span>
                <span class="text-text-soft"> — ${esc(a.detail)}</span>${link}
              </li>`;
            }).join('')}
          </ol>
        </div>`
      : '<p class="text-sm text-green-700 mt-3">Inga kritiska åtgärder föreslagna.</p>';

    const sectionsHtml = sections.map((sec) => {
      const badge = severityBadge(sec.severity);
      const findings = (sec.findings || []).map((f) => `<li class="text-sm text-navy">${esc(f)}</li>`).join('');
      const failures = (sec.failures || []).slice(0, 5).map((f) =>
        `<li class="text-sm text-red-700">✗ ${esc(f.title || f.id)}${f.detail ? ` — ${esc(f.detail)}` : ''}</li>`
      ).join('');
      return `
        <div class="bg-white/80 rounded-xl border border-indigo-100 p-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}">${esc(badge.label)}</span>
            <p class="font-semibold text-navy text-sm">${esc(sec.title)}</p>
          </div>
          <ul class="list-disc list-inside space-y-0.5">${findings}</ul>
          ${failures ? `<ul class="mt-2 space-y-0.5">${failures}</ul>` : ''}
        </div>`;
    }).join('');

    const hasUrgent = (s.failuresFound || 0) > 0 || actions.some((a) => a.priority === 'critical');
    const detailsOpen = hasUrgent ? ' open' : '';

    mount.innerHTML = `
      <details id="journeyAnalysisDetails" class="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-200 rounded-2xl shadow-sm group"${detailsOpen}>
        <summary class="p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">Family Journey — daglig analys</p>
              <h2 class="text-lg font-heading font-bold text-navy inline">Morgonrapport</h2>
              <span class="text-sm text-text-soft ml-2">· ${esc(formatWhen(report.generatedAt))} · Wave ${esc(s.activeWave ?? '—')}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold text-indigo-700 bg-white/80 px-2 py-1 rounded-lg border border-indigo-100">
                ${(s.failuresFound || 0) > 0 ? `${s.failuresFound} fel` : 'OK'}
                · ${actions.length} åtgärd${actions.length === 1 ? '' : 'er'}
              </span>
              <span class="text-sm font-semibold text-gold group-open:hidden">Visa rapport ▾</span>
              <span class="text-sm font-semibold text-gold hidden group-open:inline">Dölj ▴</span>
            </div>
          </div>
        </summary>
        <div class="px-5 pb-5 border-t border-indigo-100 pt-4">
        <div class="flex flex-wrap gap-2 mb-4 justify-end">
            <button type="button" id="journeyAnalysisRefreshBtn" class="px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm font-semibold hover:bg-indigo-50">↺ Uppdatera</button>
            <button type="button" id="journeyAnalysisRunBtn" class="px-4 py-2 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-yellow-500">Kör om</button>
            <a href="#produktanalys" onclick="return adminNavClick(event)" class="px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm font-semibold hover:bg-indigo-50">Rollout →</a>
          </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div class="bg-white rounded-xl border border-indigo-100 p-3 text-center">
            <p class="text-2xl font-heading font-bold text-navy">${s.measurementPoints ?? '—'}</p>
            <p class="text-xs text-text-soft">Mätpunkter</p>
          </div>
          <div class="bg-white rounded-xl border border-indigo-100 p-3 text-center">
            <p class="text-2xl font-heading font-bold ${(s.failuresFound || 0) > 0 ? 'text-red-600' : 'text-green-700'}">${s.failuresFound ?? 0}</p>
            <p class="text-xs text-text-soft">Hittade fel</p>
          </div>
          <div class="bg-white rounded-xl border border-indigo-100 p-3 text-center">
            <p class="text-2xl font-heading font-bold text-navy">${s.browserQaPoints ?? 0}</p>
            <p class="text-xs text-text-soft">Browser QA-punkter</p>
          </div>
          <div class="bg-white rounded-xl border border-indigo-100 p-3 text-center">
            <p class="text-2xl font-heading font-bold text-navy">${actions.length}</p>
            <p class="text-xs text-text-soft">Åtgärder</p>
          </div>
        </div>

        ${browserSection?.findings?.some((f) => f.includes('Hoppad')) ? `
          <p class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Browser QA delvis hoppad — sätt <code>JOURNEY_QA_PARENT_EMAIL</code> / <code>PASSWORD</code> på servern.
          </p>` : ''}

        <div class="mb-4 ${(data.history || []).length < 2 ? 'hidden' : ''}" id="journeyAnalysisChartsWrap">
          <p class="text-xs font-bold uppercase text-text-soft mb-2">Trend (${(data.history || []).length} körningar)</p>
          <div class="grid md:grid-cols-2 gap-4">
            <div class="bg-white rounded-xl border border-indigo-100 p-3">
              <p class="text-xs font-semibold text-navy mb-2">Fel &amp; browser QA</p>
              <div class="analytics-chart-wrap analytics-chart-wrap--compact"><canvas id="journeyChartFailures"></canvas></div>
            </div>
            <div class="bg-white rounded-xl border border-indigo-100 p-3">
              <p class="text-xs font-semibold text-navy mb-2">Journey-flaskhalsar</p>
              <div class="analytics-chart-wrap analytics-chart-wrap--compact"><canvas id="journeyChartFunnel"></canvas></div>
            </div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-3 mb-2">${sectionsHtml}</div>
        ${actionsHtml}
        </div>
      </details>`;

    document.getElementById('journeyAnalysisRefreshBtn')?.addEventListener('click', loadJourneyDailyAnalysis);
    bindRunBtn();
    renderHistoryCharts(data.history || []);
  }

  function bindRunBtn() {
    const btn = document.getElementById('journeyAnalysisRunBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Kör…';
      try {
        await Auth.api('/api/admin/journey-daily-analysis/run', { method: 'POST' });
        if (typeof showToast === 'function') showToast('Analys klar', 'success');
        await loadJourneyDailyAnalysis();
      } catch (err) {
        console.error('[ADMIN] journey analysis run:', err);
        if (typeof showToast === 'function') showToast('Analys misslyckades', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Kör om';
      }
    });
  }

  function renderError() {
    const mount = document.getElementById('journeyDailyAnalysisBlock');
    if (!mount) return;
    mount.innerHTML = `
      <div class="bg-coral/30 border border-coral rounded-2xl p-4">
        <p class="font-semibold text-navy mb-2">Kunde inte ladda Journey-analys.</p>
        <button type="button" onclick="loadJourneyDailyAnalysis()" class="text-sm font-bold text-gold hover:underline">Försök igen</button>
      </div>`;
  }

  function renderLoading() {
    const mount = document.getElementById('journeyDailyAnalysisBlock');
    if (!mount) return;
    mount.innerHTML = '<div class="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-5"><p class="text-sm text-text-soft">Laddar Journey-analys…</p></div>';
  }

  async function loadJourneyDailyAnalysis() {
    if (typeof Auth === 'undefined' || !Auth.api) return;
    renderLoading();
    try {
      const data = await Auth.api('/api/admin/journey-daily-analysis/latest?_=' + Date.now());
      if (typeof window.ensureAdminChartJs === 'function') {
        await window.ensureAdminChartJs();
      }
      renderReport(data);
    } catch (err) {
      console.error('[ADMIN] journey daily analysis:', err);
      renderError();
    }
  }

  window.loadJourneyDailyAnalysis = loadJourneyDailyAnalysis;
})();
