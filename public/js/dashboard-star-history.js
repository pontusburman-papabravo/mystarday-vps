/**
 * Dashboard star-history chart (Fas 8 F2c).
 * Weekly stars summary (8 weeks), extracted from dashboard.js.
 * Reads window.apiFetch / escHtml / window.DashboardWeeklyStory at call time.
 * Entry points exposed on window for dashboard.js init + post-give-stars refresh.
 */
(function () {
  // ── Star history chart (weekly stars, 8 weeks) ────────────
  let starHistoryData = null;

  async function loadStarHistory() {
    try {
      const res = await window.apiFetch('/api/family/star-history');
      if (!res.ok) return;
      starHistoryData = await res.json();
      renderStarHistory();
    } catch (e) {
      // Silent — chart is optional
    }
  }

  function renderStarHistory() {
    if (!starHistoryData) return;
    const { children: ch, weeks } = starHistoryData;
    if (!ch || ch.length === 0 || !weeks || weeks.length === 0) return;

    const section = document.getElementById('starHistorySection');
    const content = document.getElementById('starHistoryContent');
    if (!section || !content) return;

    section.classList.remove('hidden');

    const childColors = ['#F5A623', '#7C3AED', '#10B981', '#EF4444', '#3B82F6', '#EC4899'];

    // Find max stars in any week for scaling
    let maxStars = 0;
    for (const w of weeks) {
      let weekTotal = 0;
      for (const c of ch) weekTotal += (w.child_totals[c.id] || 0);
      if (weekTotal > maxStars) maxStars = weekTotal;
    }
    if (maxStars === 0) maxStars = 1;

    const html = `
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        ${ch.map((c, i) => `<span class="flex items-center gap-1 text-xs font-semibold text-navy"><span class="w-3 h-3 rounded-full inline-block" style="background:${childColors[i % childColors.length]}"></span>${c.emoji || ''} ${escHtml(c.name)}</span>`).join('')}
      </div>
      <div class="flex gap-2 items-end justify-between min-w-0 overflow-x-auto pb-1">
        ${weeks.map(w => {
          // Per-child stacked bars
          const bars = ch.map((c, i) => {
            const stars = w.child_totals[c.id] || 0;
            const height = maxStars > 0 ? Math.max(stars > 0 ? 8 : 0, Math.round((stars / maxStars) * 80)) : 0;
            return `<div class="week-bar-track" title="${escHtml(c.name)}: ${stars} ⭐" style="height:80px;">
              <div class="week-bar-fill" style="height:${height}%;background:${childColors[i % childColors.length]};"></div>
            </div>`;
          }).join('');

          const weekTotal = ch.reduce((sum, c) => sum + (w.child_totals[c.id] || 0), 0);
          const isEmpty = weekTotal === 0;
          return `<div class="week-day-col" style="min-width:60px;" title="V${w.week_label}: ${weekTotal} stjärnor">
            <div class="text-[10px] font-bold text-center mb-1 ${isEmpty ? 'text-text-soft' : 'text-gold'}">${weekTotal}⭐</div>
            <div class="flex gap-1 justify-center mb-1">${bars}</div>
            <div class="text-[10px] font-bold text-center ${w.is_current ? 'text-gold' : 'text-text-soft'}">${w.week_label}</div>
          </div>`;
        }).join('')}
      </div>
    `;

    content.innerHTML = html;

    if (window.DashboardWeeklyStory) {
      window.DashboardWeeklyStory.render(starHistoryData);
    }
  }

  // Exposed for dashboard.js init + post-give-stars refresh
  window.loadStarHistory = loadStarHistory;
  window.renderStarHistory = renderStarHistory;
})();
