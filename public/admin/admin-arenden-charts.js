/**
 * Ärenden — Chart.js graphs for bug trends and system-area failures.
 * Requires Chart.js (loaded in admin index.html).
 */
(function () {
  const CHART_COLORS = [
    '#F5A623', '#1B2340', '#7DD3C0', '#A8C8E8', '#E8B4D4',
    '#C4B5FD', '#FDBA74', '#86EFAC', '#93C5FD', '#FCA5A5',
  ];

  let activeCharts = [];

  function destroyCharts() {
    for (const chart of activeCharts) {
      try { chart.destroy(); } catch (_) { /* ignore */ }
    }
    activeCharts = [];
  }

  function labelForRootCause(code, rootCauses) {
    return (rootCauses && rootCauses[code]) || code || 'Okänd';
  }

  function formatWeekLabel(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return String(isoDate);
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }

  function fillWeeklySeries(rows) {
    return (rows || []).map((row) => ({
      week_start: String(row.week_start).slice(0, 10),
      total: Number(row.total) || 0,
      open_count: Number(row.open_count) || 0,
      classified_count: Number(row.classified_count) || 0,
    }));
  }

  function drawBugTrendChart(canvas, series) {
    const labels = series.map((r) => formatWeekLabel(r.week_start));
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Nya buggrapporter',
            data: series.map((r) => r.total),
            borderColor: '#F5A623',
            backgroundColor: 'rgba(245,166,35,0.12)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 3,
          },
          {
            label: 'Klassade samma vecka',
            data: series.map((r) => r.classified_count),
            borderColor: '#1B2340',
            backgroundColor: 'rgba(27,35,64,0.08)',
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        },
        scales: {
          x: { ticks: { maxRotation: 0, font: { size: 10 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
        },
      },
    });
    activeCharts.push(chart);
  }

  function drawAreaFailureChart(canvas, byRootCause, rootCauses) {
    const rows = (byRootCause || []).filter((r) => r.total > 0);
    if (!rows.length) return;

    const labels = rows.map((r) => labelForRootCause(r.root_cause, rootCauses));
    const openData = rows.map((r) => r.open_count || 0);
    const handledData = rows.map((r) => Math.max(0, (r.total || 0) - (r.open_count || 0)));

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Öppna',
            data: openData,
            backgroundColor: '#F5A623',
            borderRadius: 4,
            stack: 'status',
          },
          {
            label: 'Hanterade',
            data: handledData,
            backgroundColor: '#7DD3C0',
            borderRadius: 4,
            stack: 'status',
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              footer: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx == null || !rows[idx]) return '';
                return `Totalt: ${rows[idx].total}`;
              },
            },
          },
        },
        scales: {
          x: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
          y: { stacked: true, ticks: { font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
    activeCharts.push(chart);
  }

  function drawAreaShareChart(canvas, byRootCause, rootCauses) {
    const rows = (byRootCause || []).filter((r) => r.total > 0);
    if (!rows.length) return;

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: rows.map((r) => labelForRootCause(r.root_cause, rootCauses)),
        datasets: [{
          data: rows.map((r) => r.total),
          backgroundColor: CHART_COLORS.slice(0, rows.length),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 10, font: { size: 10 }, padding: 8 },
          },
        },
      },
    });
    activeCharts.push(chart);
  }

  function renderArendenCharts(analytics, taxonomy) {
    destroyCharts();
    if (typeof Chart === 'undefined') return;

    const rootCauses = taxonomy?.rootCauses || {};
    const series = fillWeeklySeries(analytics?.bugsOverTime || []);

    const trendCanvas = document.getElementById('arendenBugTrendChart');
    const areaCanvas = document.getElementById('arendenBugAreaChart');
    const shareCanvas = document.getElementById('arendenBugAreaShareChart');

    if (trendCanvas) drawBugTrendChart(trendCanvas, series);
    if (areaCanvas) drawAreaFailureChart(areaCanvas, analytics?.byRootCause, rootCauses);
    if (shareCanvas) drawAreaShareChart(shareCanvas, analytics?.byRootCause, rootCauses);

    const emptyEl = document.getElementById('arendenChartsEmpty');
    const hasData = series.some((r) => r.total > 0)
      || (analytics?.byRootCause || []).some((r) => r.total > 0);
    if (emptyEl) emptyEl.classList.toggle('hidden', hasData);
  }

  window.renderArendenCharts = renderArendenCharts;
  window.destroyArendenCharts = destroyCharts;
})();
