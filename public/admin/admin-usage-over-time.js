/**
 * Produktanalys — Så används appen.
 * Completions, weekdays, schedules, custom activities. Not login KPIs.
 */
/* global Chart, Auth */
(function () {
  'use strict';

  const chartInstances = {};
  let periodDays = 90;
  let tabReady = false;

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('sv-SE');
  }

  function destroyChart(id) {
    if (chartInstances[id]) {
      try { chartInstances[id].destroy(); } catch (_) { /* ignore */ }
      delete chartInstances[id];
    }
  }

  function skeletonHtml() {
    return `
      <div>
        <h3 class="text-lg font-heading font-bold text-navy mb-1">Så används appen</h3>
        <p class="text-text-soft text-sm mb-4">Avbockningar och scheman — inte inloggningar och inte den korta händelseloggen. Arkiverade familjer och adminkonton räknas inte.</p>
        <div class="flex flex-wrap gap-2 mb-6" id="howUsedPeriodBtns">
          <button type="button" data-days="30" class="how-used-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors">30 dagar</button>
          <button type="button" data-days="90" class="how-used-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy transition-colors">90 dagar</button>
        </div>
      </div>

      <div id="howUsedHeadline" class="bg-sky rounded-2xl border border-sky p-5">
        <p class="text-sm text-text-soft">Laddar användning…</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="howUsedKpis"></div>

      <div class="bg-white rounded-2xl border border-sky p-6">
        <h4 class="text-base font-heading font-bold text-navy mb-1">Avbockningar dag för dag</h4>
        <p class="text-xs text-text-soft mb-3">Staplar = avbockningar. Linjen = unika familjer den dagen. Dagen är schemadagen i svensk tid.</p>
        <div class="analytics-chart-wrap analytics-chart-wrap--tall"><canvas id="howUsedDailyChart"></canvas></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Fler vissa veckodagar?</h4>
          <p class="text-xs text-text-soft mb-3">Vilken veckodag avbockningen gäller — inte när någon råkade trycka.</p>
          <div class="analytics-chart-wrap"><canvas id="howUsedWeekdayChart"></canvas></div>
        </div>
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Morgon, dag, kväll</h4>
          <p class="text-xs text-text-soft mb-3">Avbockningar per dagdel under perioden.</p>
          <div class="analytics-chart-wrap"><canvas id="howUsedSectionChart"></canvas></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Egna aktiviteter eller biblioteket?</h4>
          <p class="text-xs text-text-soft mb-3">Hur aktiviteterna i biblioteket är märkta. “Okänd källa” är ofta inläst vid registrering, innan källan sparades.</p>
          <div class="analytics-chart-wrap"><canvas id="howUsedSourceChart"></canvas></div>
          <p id="howUsedSourceNote" class="text-xs text-text-soft mt-3"></p>
        </div>
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Vad ligger i veckoschemat?</h4>
          <p class="text-xs text-text-soft mb-3">Aktivitetsrader på barnens schema just nu — inte historik. Helgen brukar ha färre rader.</p>
          <div class="analytics-chart-wrap"><canvas id="howUsedScheduleChart"></canvas></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-3">Mest avbockade aktiviteterna</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-text-soft border-b border-sky">
                  <th class="py-2 pr-3 font-semibold">Aktivitet</th>
                  <th class="py-2 pr-3 font-semibold text-right">Avbockningar</th>
                  <th class="py-2 font-semibold text-right">Familjer</th>
                </tr>
              </thead>
              <tbody id="howUsedTopActivities"></tbody>
            </table>
          </div>
        </div>
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Namngivna scheman</h4>
          <p class="text-xs text-text-soft mb-3">Mallar med namn. De flesta barn har bara ett dagsschema utan namn.</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-text-soft border-b border-sky">
                  <th class="py-2 pr-3 font-semibold">Namn</th>
                  <th class="py-2 pr-3 font-semibold text-right">Familjer</th>
                  <th class="py-2 font-semibold text-right">Barn</th>
                </tr>
              </thead>
              <tbody id="howUsedNamedTemplates"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" id="howUsedExtra"></div>

      <div class="bg-white rounded-2xl border border-sky p-5 text-sm text-text-soft space-y-1" id="howUsedDefinitions"></div>
    `;
  }

  function stylePeriodButtons() {
    document.querySelectorAll('.how-used-period-btn').forEach((btn) => {
      const selected = String(btn.dataset.days) === String(periodDays);
      btn.className = selected
        ? 'how-used-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy transition-colors'
        : 'how-used-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors';
    });
  }

  function kpiCard(label, value, hint) {
    return `
      <div class="bg-white rounded-2xl border border-sky p-5">
        <p class="text-xs text-text-soft mb-1">${esc(label)}</p>
        <p class="text-2xl font-heading font-bold text-navy">${esc(value)}</p>
        <p class="text-xs text-text-soft mt-2">${esc(hint)}</p>
      </div>`;
  }

  function renderKpis(data) {
    const el = document.getElementById('howUsedKpis');
    if (!el) return;
    const t = data.totals || {};
    const custom = data.custom || {};
    el.innerHTML = [
      kpiCard('Avbockningar', fmt(t.completions), `${fmt(t.families_active)} familjer av ${fmt(t.product_families)}.`),
      kpiCard('Barn som avbockade', fmt(t.children_active), `Av ${fmt(t.children)} barn i produktfamiljer.`),
      kpiCard('Barn med veckoschema', fmt(t.children_with_week), `${fmt(t.children_with_items)} har minst en aktivitetsrad.`),
      kpiCard(
        'Familjer med egna aktiviteter',
        `${fmt(custom.families_with_user)} av ${fmt(custom.families_with_any_template)}`,
        `${fmt(custom.user_templates)} egna aktiviteter totalt.`
      ),
    ].join('');
  }

  function renderHeadline(data) {
    const el = document.getElementById('howUsedHeadline');
    if (!el) return;
    const from = data.period && data.period.from;
    const to = data.period && data.period.to;
    el.innerHTML = `
      <p class="text-sm font-semibold text-navy mb-1">${esc(data.headline || '')}</p>
      <p class="text-xs text-text-soft">${esc(from)} – ${esc(to)} · Europe/Stockholm</p>
    `;
  }

  function renderTable(tbodyId, rows, emptyText, cellsFn) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!rows || !rows.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-text-soft py-6">${esc(emptyText)}</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(cellsFn).join('');
  }

  function renderExtra(data) {
    const el = document.getElementById('howUsedExtra');
    if (!el) return;
    const rewards = data.rewards || {};
    const special = data.special_days || {};
    const completions = data.completion_sources || {};
    el.innerHTML = [
      kpiCard('Belöningar hämtade', fmt(rewards.redemptions), `${fmt(rewards.families)} familjer under perioden.`),
      kpiCard('Specialdagar', fmt(special.count), `${fmt(special.children)} barn har minst en specialdag just nu.`),
      kpiCard(
        'Avbockningar på egna aktiviteter',
        `${fmt(completions.user_share)} %`,
        `${fmt(completions.user)} av ${fmt(completions.total)} avbockningar.`
      ),
    ].join('');
  }

  function renderDefinitions(data) {
    const el = document.getElementById('howUsedDefinitions');
    if (!el) return;
    const defs = data.definitions || {};
    const items = [
      ['Familjer', defs.families],
      ['Avbockningar', defs.completions],
      ['Egna aktiviteter', defs.customActivities],
      ['Biblioteket', defs.libraryActivities],
      ['Okänd källa', defs.unknownActivities],
      ['Veckodag', defs.weekday],
      ['Scheman', defs.schedules],
      ['Namngivna mallar', defs.namedTemplates],
    ];
    el.innerHTML = '<p class="font-semibold text-navy mb-2">Vad siffrorna betyder</p>' +
      items.map(([title, text]) => `<p><span class="font-semibold text-navy">${esc(title)}:</span> ${esc(text)}</p>`).join('');
  }

  function lineBarChart(canvasId, labels, bars, line, barLabel, lineLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: barLabel,
            data: bars,
            backgroundColor: '#F5A62366',
            borderColor: '#F5A623',
            borderWidth: 1,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: lineLabel,
            data: line,
            borderColor: '#1B2340',
            backgroundColor: '#1B2340',
            tension: 0.3,
            pointRadius: 2,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true, labels: { font: { size: 11 } } } },
        scales: {
          x: { ticks: { maxTicksLimit: 12, font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { font: { size: 11 } }, title: { display: true, text: barLabel, font: { size: 11 } } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 11 } }, title: { display: true, text: lineLabel, font: { size: 11 } } },
        },
      },
    });
  }

  function barChart(canvasId, labels, values, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: color,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  function doughnutChart(canvasId, labels, values, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
      },
    });
  }

  function renderCharts(data) {
    const daily = data.daily || [];
    lineBarChart(
      'howUsedDailyChart',
      daily.map((row) => String(row.day).slice(5)),
      daily.map((row) => row.completions),
      daily.map((row) => row.families),
      'Avbockningar',
      'Familjer'
    );

    const weekday = (data.weekday && data.weekday.days) || [];
    barChart(
      'howUsedWeekdayChart',
      weekday.map((row) => row.label),
      weekday.map((row) => row.completions),
      '#F5A623'
    );

    const sections = data.sections || [];
    barChart(
      'howUsedSectionChart',
      sections.map((row) => row.label),
      sections.map((row) => row.completions),
      '#6366F1'
    );

    const sources = data.template_sources || {};
    doughnutChart(
      'howUsedSourceChart',
      ['Egna', 'Biblioteket', 'Okänd källa'],
      [sources.user || 0, sources.library || 0, sources.unknown || 0],
      ['#F5A623', '#6366F1', '#94A3B8']
    );
    const note = document.getElementById('howUsedSourceNote');
    if (note) {
      note.textContent =
        `${fmt(sources.user)} egna, ${fmt(sources.library)} från biblioteket, ${fmt(sources.unknown)} utan källa. ` +
        `Avbockningar på egna: ${fmt((data.completion_sources && data.completion_sources.user) || 0)}.`;
    }

    const schedule = data.schedule_weekdays || [];
    barChart(
      'howUsedScheduleChart',
      schedule.map((row) => row.label),
      schedule.map((row) => row.items),
      '#1B2340'
    );
  }

  function renderData(data) {
    renderHeadline(data);
    renderKpis(data);
    renderCharts(data);
    renderTable(
      'howUsedTopActivities',
      data.top_activities,
      'Inga avbockningar i perioden',
      (row) => `
        <tr class="border-b border-sky/50">
          <td class="py-2 pr-3 font-semibold text-navy">${esc(row.name)}</td>
          <td class="py-2 pr-3 text-right">${fmt(row.completions)}</td>
          <td class="py-2 text-right text-text-soft">${fmt(row.families)}</td>
        </tr>`
    );
    renderTable(
      'howUsedNamedTemplates',
      data.named_templates,
      'Inga namngivna scheman',
      (row) => `
        <tr class="border-b border-sky/50">
          <td class="py-2 pr-3 font-semibold text-navy">${esc(row.name)}</td>
          <td class="py-2 pr-3 text-right">${fmt(row.families)}</td>
          <td class="py-2 text-right text-text-soft">${fmt(row.children)}</td>
        </tr>`
    );
    renderExtra(data);
    renderDefinitions(data);
  }

  async function loadHowUsedData() {
    const headline = document.getElementById('howUsedHeadline');
    if (headline) headline.innerHTML = '<p class="text-sm text-text-soft">Laddar användning…</p>';
    try {
      const data = await Auth.api(`/api/admin/analytics/usage-over-time?days=${encodeURIComponent(periodDays)}`);
      renderData(data);
    } catch (err) {
      console.error('[ANALYTICS] usage-over-time', err);
      if (headline) {
        headline.innerHTML = '<p class="text-sm text-coral">Kunde inte hämta användning över tid.</p>';
      }
    }
  }

  async function loadHowUsedTab() {
    const root = document.getElementById('howUsedRoot');
    if (!root) return;

    if (typeof window.ensureAdminChartJs === 'function') {
      try { await window.ensureAdminChartJs(); } catch (err) {
        console.error('[ANALYTICS] Chart.js for how-used', err);
      }
    }

    if (!root.querySelector('#howUsedHeadline')) {
      tabReady = false;
    }

    if (!tabReady) {
      root.innerHTML = skeletonHtml();
      tabReady = true;
      document.querySelectorAll('.how-used-period-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          periodDays = parseInt(btn.dataset.days, 10) || 90;
          stylePeriodButtons();
          loadHowUsedData();
        });
      });
    }
    stylePeriodButtons();
    await loadHowUsedData();
  }

  window.loadHowUsedTab = loadHowUsedTab;
})();
