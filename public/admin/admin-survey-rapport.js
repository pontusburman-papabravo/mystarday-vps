/**
 * admin-survey-rapport.js
 * Owns: survey rapport view (charts, comparison, CSV export).
 * Does NOT own: survey builder, question editor, respondent flow.
 *
 * Entry points: openRapport(surveyId), closeRapport(), openComparison()
 * Requires Chart.js (already loaded via CDN in index.html).
 */

let rapportSurveyId = null;
let rapportCharts = []; // Track active Chart.js instances for destroy-on-reload
let comparisonCharts = [];

// ── Open / close rapport ────────────────────────────────────────────────────

async function openRapport(surveyId) {
  rapportSurveyId = surveyId;
  if (typeof window.ensureAdminChartJs === 'function') {
    await window.ensureAdminChartJs();
  }
  // Show rapport view, hide editor
  document.getElementById('surveysEditorView').classList.add('hidden');
  document.getElementById('surveysRapportView').classList.remove('hidden');

  const container = document.getElementById('rapportContainer');
  container.innerHTML = `<div class="flex items-center justify-center py-20 text-text-soft">
    <svg class="animate-spin w-6 h-6 mr-3 text-gold" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
    Laddar rapport…
  </div>`;

  try {
    const data = await Auth.api(`/api/admin/surveys/${surveyId}/rapport`);
    _destroyCharts(rapportCharts);
    rapportCharts = [];
    renderRapport(data);
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 py-8 text-center">Kunde inte ladda rapport: ${escHtml(err.message || '')}</p>`;
  }
}

function closeRapport() {
  _destroyCharts(rapportCharts);
  rapportCharts = [];
  document.getElementById('surveysRapportView').classList.add('hidden');
  document.getElementById('surveysEditorView').classList.remove('hidden');
}

// ── Render full rapport ─────────────────────────────────────────────────────

function renderRapport(data) {
  const { survey, stats, breakdowns, time_series } = data;
  const submitted = parseInt(stats.submitted_count) || 0;
  const started = parseInt(stats.total_starts) || 0;
  const inProgress = parseInt(stats.in_progress_count) || 0;
  const views = parseInt(survey.view_count) || 0;
  const completionRate = started > 0 ? Math.round((submitted / started) * 100) : 0;
  const viewRate = views > 0 ? Math.round((submitted / views) * 100) : 0;

  const container = document.getElementById('rapportContainer');

  container.innerHTML = `
    <!-- Rapport header -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div>
        <h4 class="font-heading font-bold text-navy text-2xl">${escHtml(survey.title)}</h4>
        ${survey.target_tag ? `<p class="text-text-soft text-sm mt-1">${escHtml(survey.target_tag)}</p>` : ''}
      </div>
      <div class="flex flex-wrap gap-3">
        <button onclick="openExportPanel()" class="px-4 py-2 bg-mint text-green-800 text-sm font-semibold rounded-xl hover:opacity-80 transition">⬇ CSV-export</button>
      </div>
    </div>

    <!-- KPI row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-sky rounded-2xl p-5 border-2 border-lavender">
        <div class="text-3xl font-heading font-bold text-navy">${submitted}</div>
        <div class="text-xs text-text-soft mt-1 font-semibold uppercase tracking-wide">Inskickade svar</div>
      </div>
      <div class="bg-lavender rounded-2xl p-5 border-2 border-lavender">
        <div class="text-3xl font-heading font-bold text-navy">${inProgress}</div>
        <div class="text-xs text-text-soft mt-1 font-semibold uppercase tracking-wide">Påbörjade</div>
      </div>
      <div class="bg-mint rounded-2xl p-5 border-2 border-mint">
        <div class="text-3xl font-heading font-bold text-navy">${completionRate}%</div>
        <div class="text-xs text-text-soft mt-1 font-semibold uppercase tracking-wide">Genomförda (av startade)</div>
      </div>
      <div class="bg-gold-light rounded-2xl p-5 border-2 border-gold">
        <div class="text-3xl font-heading font-bold text-navy">${views > 0 ? viewRate + '%' : '—'}</div>
        <div class="text-xs text-text-soft mt-1 font-semibold uppercase tracking-wide">Svarsfrekvens (av visningar)</div>
        ${views > 0 ? `<div class="text-xs text-text-soft mt-1">${views} visningar totalt</div>` : '<div class="text-xs text-text-soft mt-1">Visningar ej tillgängliga</div>'}
      </div>
    </div>

    <!-- Time series chart -->
    <div class="bg-white border-2 border-lavender rounded-2xl p-6 mb-8">
      <h5 class="font-heading font-bold text-navy text-lg mb-4">Svar per dag</h5>
      ${time_series.length === 0
        ? '<p class="text-text-soft text-sm py-4">Inga inskickade svar ännu.</p>'
        : `<div class="relative" style="height:200px"><canvas id="rapportTimeSeriesChart"></canvas></div>`}
    </div>

    <!-- Per-question breakdowns -->
    <div class="space-y-6">
      <h5 class="font-heading font-bold text-navy text-xl">Per fråga</h5>
      ${breakdowns.length === 0
        ? '<p class="text-text-soft text-sm">Inga frågor i enkäten.</p>'
        : breakdowns.map((b, i) => renderBreakdownCard(b, i)).join('')}
    </div>

    <!-- Export panel (hidden initially) -->
    <div id="exportPanel" class="hidden mt-8 bg-white border-2 border-gold rounded-2xl p-6">
      <h5 class="font-heading font-bold text-navy text-lg mb-4">⬇ CSV-export</h5>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="text-xs font-semibold text-navy mb-1 block">Från datum</label>
          <input type="date" id="exportStartDate" class="w-full border border-lavender rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gold">
        </div>
        <div>
          <label class="text-xs font-semibold text-navy mb-1 block">Till datum</label>
          <input type="date" id="exportEndDate" class="w-full border border-lavender rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gold">
        </div>
        <div class="flex flex-col justify-end">
          <label class="flex items-center gap-2 text-sm text-navy cursor-pointer mb-2">
            <input type="checkbox" id="exportCompleteOnly" checked class="w-4 h-4"> Bara kompletta svar
          </label>
        </div>
      </div>
      <div class="flex gap-3">
        <button onclick="downloadCSV()" class="px-5 py-2 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/80 transition text-sm">Ladda ner CSV</button>
        <button onclick="closeExportPanel()" class="px-4 py-2 bg-sky text-navy font-semibold rounded-xl hover:bg-lavender transition text-sm">Avbryt</button>
      </div>
    </div>
  `;

  // Draw time series chart
  if (time_series.length > 0) {
    _drawTimeSeries('rapportTimeSeriesChart', time_series, rapportCharts);
  }

  // Draw question charts
  breakdowns.forEach((b, i) => {
    if (b.question_type === 'radio' || b.question_type === 'checkbox') {
      _drawBarChart(`chartBar_${i}`, b.breakdown, b.total, rapportCharts);
      _drawPieChart(`chartPie_${i}`, b.breakdown, rapportCharts);
    } else if (b.question_type === 'scale') {
      _drawScaleChart(`chartScale_${i}`, b, rapportCharts);
    }
  });
}

function renderBreakdownCard(b, i) {
  const typeLabel = { radio: 'Välj ett', checkbox: 'Flerval', text_short: 'Fritext', text_long: 'Fritext', scale: 'Skala' };
  let bodyHtml = '';

  if (b.question_type === 'radio' || b.question_type === 'checkbox') {
    bodyHtml = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p class="text-xs font-semibold text-text-soft uppercase mb-3">Stapeldiagram</p>
          <div class="relative" style="height:180px"><canvas id="chartBar_${i}"></canvas></div>
        </div>
        <div>
          <p class="text-xs font-semibold text-text-soft uppercase mb-3">Cirkeldiagram</p>
          <div class="relative" style="height:180px"><canvas id="chartPie_${i}"></canvas></div>
        </div>
      </div>
      <div class="mt-4 space-y-2">
        ${b.breakdown.map(o => {
          const pct = b.total > 0 ? Math.round((o.count / b.total) * 100) : 0;
          return `<div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-sm text-navy truncate">${escHtml(o.option_text)}</span>
                <span class="text-sm font-semibold text-navy shrink-0">${o.count} (${pct}%)</span>
              </div>
              <div class="h-2 bg-sky rounded-full overflow-hidden">
                <div class="h-full bg-gold rounded-full transition-all" style="width:${pct}%"></div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } else if (b.question_type === 'scale') {
    bodyHtml = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="bg-sky rounded-xl p-4 text-center">
          <div class="text-2xl font-heading font-bold text-navy">${b.avg !== null ? b.avg : '—'}</div>
          <div class="text-xs text-text-soft mt-1">Medelvärde</div>
        </div>
        <div class="bg-lavender rounded-xl p-4 text-center">
          <div class="text-2xl font-heading font-bold text-navy">${b.total}</div>
          <div class="text-xs text-text-soft mt-1">Antal svar</div>
        </div>
        <div class="bg-mint rounded-xl p-4 text-center">
          <div class="text-sm font-semibold text-navy">${escHtml(b.scale_min_label || String(b.scale_min || 1))} → ${escHtml(b.scale_max_label || String(b.scale_max || 5))}</div>
          <div class="text-xs text-text-soft mt-1">Skala</div>
        </div>
      </div>
      <div class="relative" style="height:180px"><canvas id="chartScale_${i}"></canvas></div>`;
  } else {
    // text
    const answers = b.breakdown || [];
    bodyHtml = `
      <p class="text-xs text-text-soft mb-3">${answers.length} svar${answers.length === 200 ? ' (visar senaste 200)' : ''}</p>
      <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
        ${answers.length === 0
          ? '<p class="text-text-soft text-sm">Inga textsvar ännu.</p>'
          : answers.map(a => `<div class="bg-sky/60 rounded-xl px-4 py-3 text-sm text-navy">${escHtml(a)}</div>`).join('')}
      </div>`;
  }

  return `
    <div class="bg-white border-2 border-lavender rounded-2xl p-6">
      <div class="flex items-start gap-3 mb-4">
        <span class="bg-navy text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">${i + 1}</span>
        <div class="flex-1">
          <span class="text-xs font-semibold text-text-soft uppercase tracking-wide">${typeLabel[b.question_type] || b.question_type}</span>
          <p class="font-semibold text-navy mt-0.5">${escHtml(b.question_text)}</p>
          ${b.total !== undefined && b.question_type !== 'text_short' && b.question_type !== 'text_long'
            ? `<p class="text-xs text-text-soft mt-1">${b.total} svar totalt</p>` : ''}
        </div>
      </div>
      ${bodyHtml}
    </div>`;
}

// ── Chart helpers ───────────────────────────────────────────────────────────

const CHART_COLORS = ['#F5A623','#1B2340','#7C3AED','#059669','#DC2626','#0EA5E9','#D97706','#10B981','#6366F1','#EF4444'];

function _destroyCharts(arr) {
  for (const c of arr) { try { c.destroy(); } catch (_) {} }
  arr.length = 0;
}

function _drawTimeSeries(canvasId, timeSeries, chartsArr) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  // Fill gaps — build complete date range
  if (timeSeries.length === 0) return;
  const labels = timeSeries.map(r => r.date);
  const data = timeSeries.map(r => r.count);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Svar per dag',
        data,
        borderColor: '#F5A623',
        backgroundColor: 'rgba(245,166,35,0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: data.length > 30 ? 0 : 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxRotation: 45, font: { size: 11 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
      },
    },
  });
  chartsArr.push(chart);
}

function _drawBarChart(canvasId, breakdown, total, chartsArr) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || breakdown.length === 0) return;
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: breakdown.map(o => _truncate(o.option_text, 25)),
      datasets: [{
        data: breakdown.map(o => o.count),
        backgroundColor: CHART_COLORS.slice(0, breakdown.length),
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 11 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
      },
    },
  });
  chartsArr.push(chart);
}

function _drawPieChart(canvasId, breakdown, chartsArr) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || breakdown.length === 0) return;
  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: breakdown.map(o => _truncate(o.option_text, 20)),
      datasets: [{
        data: breakdown.map(o => o.count),
        backgroundColor: CHART_COLORS.slice(0, breakdown.length),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12 } },
      },
    },
  });
  chartsArr.push(chart);
}

function _drawScaleChart(canvasId, b, chartsArr) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const min = b.scale_min || 1;
  const max = b.scale_max || 5;
  const labels = [];
  const data = [];
  const countMap = {};
  for (const r of b.breakdown) countMap[r.scale_value] = r.count;
  for (let v = min; v <= max; v++) {
    const label = v === min && b.scale_min_label
      ? `${v} — ${b.scale_min_label}`
      : v === max && b.scale_max_label
        ? `${v} — ${b.scale_max_label}`
        : String(v);
    labels.push(label);
    data.push(countMap[v] || 0);
  }
  // avg line position (avg used inline in backgroundColor below)
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Antal svar',
          data,
          backgroundColor: data.map((_, i) => {
            const v = i + min;
            if (b.avg !== null && Math.abs(v - b.avg) < 0.5) return '#F5A623';
            return '#1B2340';
          }),
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { afterBody: (_ctx) => b.avg !== null ? [`Medelvärde: ${b.avg}`] : [] } },
      },
      scales: {
        x: { ticks: { font: { size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
      },
    },
  });
  chartsArr.push(chart);
}

// ── CSV export ──────────────────────────────────────────────────────────────

function openExportPanel() {
  document.getElementById('exportPanel').classList.remove('hidden');
  document.getElementById('exportPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeExportPanel() {
  document.getElementById('exportPanel').classList.add('hidden');
}

function downloadCSV() {
  const startDate = document.getElementById('exportStartDate').value || '';
  const endDate = document.getElementById('exportEndDate').value || '';
  const completeOnly = document.getElementById('exportCompleteOnly').checked ? '1' : '0';
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  params.set('complete_only', completeOnly);
  const url = `/api/admin/surveys/${rapportSurveyId}/export?${params.toString()}`;
  // Auth cookie is sent automatically — open directly to trigger browser download
  const link = document.createElement('a');
  link.href = url;
  link.download = 'survey-export.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Comparison view ─────────────────────────────────────────────────────────

let comparisonSurveys = []; // All loaded surveys for selection

async function openComparison() {
  // Hide rapport / editor, show comparison
  document.getElementById('surveysRapportView').classList.add('hidden');
  document.getElementById('surveysEditorView').classList.add('hidden');
  document.getElementById('surveysListView').classList.add('hidden');
  document.getElementById('surveysComparisonView').classList.remove('hidden');

  const container = document.getElementById('comparisonContainer');
  container.innerHTML = '<p class="text-text-soft text-sm">Laddar enkäter för jämförelse…</p>';

  try {
    comparisonSurveys = await Auth.api('/api/admin/surveys');
    renderComparisonSelector(comparisonSurveys);
  } catch (_err) {
    container.innerHTML = '<p class="text-red-500 text-sm">Kunde inte ladda enkäter.</p>';
  }
}

function closeComparison() {
  _destroyCharts(comparisonCharts);
  comparisonCharts = [];
  document.getElementById('surveysComparisonView').classList.add('hidden');
  document.getElementById('surveysListView').classList.remove('hidden');
}

function renderComparisonSelector(surveys) {
  const container = document.getElementById('comparisonContainer');
  container.innerHTML = `
    <p class="text-text-soft text-sm mb-4">Välj minst 2 enkäter att jämföra sida vid sida.</p>
    <div class="space-y-2 mb-6">
      ${surveys.map(s => `
        <label class="flex items-center gap-3 p-3 bg-white border-2 border-lavender rounded-xl cursor-pointer hover:border-gold transition">
          <input type="checkbox" class="comparison-survey-check w-4 h-4" value="${s.id}" id="cmp_${s.id}">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-navy text-sm truncate">${escHtml(s.title)}</p>
            ${s.target_tag ? `<p class="text-xs text-text-soft">${escHtml(s.target_tag)}</p>` : ''}
          </div>
        </label>
      `).join('')}
    </div>
    <button onclick="runComparison()" class="px-5 py-2 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/80 transition">Jämför valda enkäter</button>
    <div id="comparisonResultContainer" class="mt-8"></div>
  `;
}

async function runComparison() {
  const checked = Array.from(document.querySelectorAll('.comparison-survey-check:checked')).map(el => el.value);
  if (checked.length < 2) { alert('Välj minst 2 enkäter.'); return; }

  const resultContainer = document.getElementById('comparisonResultContainer');
  resultContainer.innerHTML = '<p class="text-text-soft text-sm py-4">Laddar jämförelsedata…</p>';

  try {
    if (typeof window.ensureAdminChartJs === 'function') {
      await window.ensureAdminChartJs();
    }
    _destroyCharts(comparisonCharts);
    comparisonCharts = [];
    const data = await Auth.api('/api/admin/surveys/compare', { method: 'POST', body: JSON.stringify({ survey_ids: checked }) });
    renderComparisonResult(data);
  } catch (err) {
    resultContainer.innerHTML = `<p class="text-red-500 text-sm">Fel: ${escHtml(err.message || '')}</p>`;
  }
}

function renderComparisonResult(surveys) {
  const resultContainer = document.getElementById('comparisonResultContainer');

  // KPI summary
  const kpiHtml = `
    <div class="grid grid-cols-1 md:grid-cols-${Math.min(surveys.length, 3)} gap-4 mb-8">
      ${surveys.map((s, i) => `
        <div class="bg-white border-2 border-lavender rounded-2xl p-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-3 h-3 rounded-full shrink-0" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
            <h5 class="font-heading font-bold text-navy text-sm leading-tight">${escHtml(s.title)}</h5>
          </div>
          ${s.target_tag ? `<p class="text-xs text-text-soft mb-3">${escHtml(s.target_tag)}</p>` : ''}
          <div class="grid grid-cols-2 gap-2">
            <div class="text-center">
              <div class="text-xl font-heading font-bold text-navy">${s.stats.submitted_count}</div>
              <div class="text-xs text-text-soft">Inskickade</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-heading font-bold text-navy">
                ${s.stats.total_starts > 0 ? Math.round((s.stats.submitted_count / s.stats.total_starts) * 100) + '%' : '—'}
              </div>
              <div class="text-xs text-text-soft">Genomförda</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;

  // Find common questions (matched by question_text)
  const allTexts = surveys.map(s => s.breakdowns.map(b => b.question_text));
  const commonTexts = allTexts[0].filter(t => allTexts.every(arr => arr.includes(t)));

  let commonHtml = '';
  if (commonTexts.length > 0) {
    commonHtml = `
      <h5 class="font-heading font-bold text-navy text-lg mb-4">Gemensamma frågor — jämförelse</h5>
      <div class="space-y-6">
        ${commonTexts.map((qt, qi) => {
          // Build overlapping bar chart data per survey
          const surveysWithQ = surveys.map(s => {
            const b = s.breakdowns.find(br => br.question_text === qt);
            return { title: s.title, color: CHART_COLORS[surveys.indexOf(s) % CHART_COLORS.length], b };
          }).filter(x => x.b);

          if (surveysWithQ.length === 0) return '';
          const qType = surveysWithQ[0].b.question_type;
          const canvasId = `cmpChart_${qi}`;

          // Nyckeltal för skala-frågor
          let keyMetric = '';
          if (qType === 'scale') {
            keyMetric = `<div class="flex flex-wrap gap-3 mb-4">
              ${surveysWithQ.map(sw => {
                const pct45 = sw.b.total > 0
                  ? Math.round(((sw.b.breakdown.filter(r => r.scale_value >= 4).reduce((s, r) => s + r.count, 0)) / sw.b.total) * 100)
                  : 0;
                return `<span class="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style="background:${sw.color}">
                  ${escHtml(_truncate(sw.title, 20))}: ${pct45}% tycker 4–5
                </span>`;
              }).join('')}
            </div>`;
          }

          return `
            <div class="bg-white border-2 border-lavender rounded-2xl p-6">
              <p class="font-semibold text-navy mb-1">${escHtml(qt)}</p>
              <p class="text-xs text-text-soft mb-4">${_typeLabel(qType)}</p>
              ${keyMetric}
              <div class="relative" style="height:200px"><canvas id="${canvasId}"></canvas></div>
            </div>`;
        }).filter(Boolean).join('')}
      </div>`;
  }

  resultContainer.innerHTML = kpiHtml + (commonHtml || '<p class="text-text-soft text-sm">Inga gemensamma frågor hittades.</p>');

  // Draw common question comparison charts
  commonTexts.forEach((qt, qi) => {
    const surveysWithQ = surveys.map((s, si) => {
      const b = s.breakdowns.find(br => br.question_text === qt);
      return { title: s.title, color: CHART_COLORS[si % CHART_COLORS.length], b };
    }).filter(x => x.b);
    if (surveysWithQ.length === 0) return;

    const qType = surveysWithQ[0].b.question_type;
    const canvasId = `cmpChart_${qi}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (qType === 'radio' || qType === 'checkbox') {
      // Overlapping bars: each option is a group, each survey is a dataset
      const allOptions = [];
      for (const sw of surveysWithQ) {
        for (const o of sw.b.breakdown) {
          if (!allOptions.find(x => x.option_text === o.option_text)) allOptions.push(o);
        }
      }
      const chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: allOptions.map(o => _truncate(o.option_text, 20)),
          datasets: surveysWithQ.map(sw => ({
            label: _truncate(sw.title, 25),
            data: allOptions.map(o => {
              const found = sw.b.breakdown.find(br => br.option_text === o.option_text);
              return found ? (sw.b.total > 0 ? Math.round((found.count / sw.b.total) * 100) : 0) : 0;
            }),
            backgroundColor: sw.color,
            borderRadius: 4,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } } },
          scales: {
            x: { ticks: { font: { size: 10 } }, grid: { display: false } },
            y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%', font: { size: 11 } } },
          },
        },
      });
      comparisonCharts.push(chart);
    } else if (qType === 'scale') {
      // Line per survey across scale values
      const min = surveysWithQ[0].b.scale_min || 1;
      const max = surveysWithQ[0].b.scale_max || 5;
      const scaleLabels = [];
      for (let v = min; v <= max; v++) scaleLabels.push(String(v));
      const chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: scaleLabels,
          datasets: surveysWithQ.map(sw => {
            const countMap = {};
            for (const r of sw.b.breakdown) countMap[r.scale_value] = r.count;
            return {
              label: `${_truncate(sw.title, 20)} (avg ${sw.b.avg ?? '—'})`,
              data: scaleLabels.map(l => sw.b.total > 0 ? Math.round(((countMap[parseInt(l)] || 0) / sw.b.total) * 100) : 0),
              backgroundColor: sw.color,
              borderRadius: 4,
            };
          }),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } } },
          scales: {
            x: { ticks: { font: { size: 11 } }, grid: { display: false } },
            y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%', font: { size: 11 } } },
          },
        },
      });
      comparisonCharts.push(chart);
    }
  });
}

// ── Utilities ───────────────────────────────────────────────────────────────

function _truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function _typeLabel(type) {
  return { radio: 'Välj ett', checkbox: 'Flerval', text_short: 'Fritext', text_long: 'Fritext', scale: 'Skala' }[type] || type;
}

// escHtml is defined in admin-surveys.js and shared globally.

window.openRapport = openRapport;
window.closeRapport = closeRapport;
window.openExportPanel = openExportPanel;
window.closeExportPanel = closeExportPanel;
window.downloadCSV = downloadCSV;
window.openComparison = openComparison;
window.closeComparison = closeComparison;
window.runComparison = runComparison;
