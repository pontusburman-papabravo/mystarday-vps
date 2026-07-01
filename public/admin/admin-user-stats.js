// Admin: User statistics per role (parents, children, pedagog/terapeut)
async function loadUserStats() {
  const container = document.getElementById('userStatsContainer');
  if (!container) return;

  container.innerHTML = '<p class="text-text-soft text-sm py-8 text-center">Laddar...</p>';

  try {
    const data = await Auth.api('/api/admin/user-stats');
    renderUserStats(data);
  } catch (err) {
    container.innerHTML = '<p class="text-red-500 text-sm">Kunde inte ladda statistik: ' + esc(err.message || 'Okänt fel') + '</p>';
  }
}

function renderUserStats(data) {
  const { parents, children, share_links } = data;
  const container = document.getElementById('userStatsContainer');
  if (!container) return;

  container.innerHTML = `
    ${window.AdminHistoryWarning ? window.AdminHistoryWarning.historyLimitedWarningHtml() : ''}

    <!-- PARENTS -->
    <div class="mb-10">
      <h4 class="text-xl font-heading font-bold text-navy mb-1">👨‍👩‍👧 Föräldrar</h4>
      <p class="text-text-soft text-sm mb-5">Registrerade konton och aktivitetsstatistik</p>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-mint rounded-2xl p-5 border-2 border-mint">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Totalt</p>
          <p class="text-3xl font-heading font-bold text-navy">${num(parents.total)}</p>
        </div>
        <div class="bg-sky rounded-2xl p-5 border-2 border-lavender">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Aktiva 7 dgr</p>
          <p class="text-3xl font-heading font-bold text-navy">${num(parents.active_7d)}</p>
          <p class="text-xs text-text-soft mt-1">av ${num(parents.total)}</p>
        </div>
        <div class="bg-sky rounded-2xl p-5 border-2 border-lavender">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Aktiva 30 dgr</p>
          <p class="text-3xl font-heading font-bold text-navy">${num(parents.active_30d)}</p>
          <p class="text-xs text-text-soft mt-1">av ${num(parents.total)}</p>
        </div>
        <div class="bg-lavender rounded-2xl p-5 border-2 border-lavender">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Snitt barn/förälder</p>
          <p class="text-3xl font-heading font-bold text-navy">${fmt(parents.avg_children)}</p>
        </div>
      </div>

      ${parents.active_7d > 0 && parents.total > 0 ? sparklineBar(parents.active_7d, parents.total, 'Aktiva 7 dgr', 'bg-gold') : ''}
    </div>

    <!-- CHILDREN -->
    <div class="mb-10">
      <h4 class="text-xl font-heading font-bold text-navy mb-1">⭐ Barn</h4>
      <p class="text-text-soft text-sm mb-5">Registrerade barn och aktivitetsgenomförande</p>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-lavender rounded-2xl p-5 border-2 border-lavender">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Totalt</p>
          <p class="text-3xl font-heading font-bold text-navy">${num(children.total)}</p>
        </div>
        <div class="bg-sky rounded-2xl p-5 border-2 border-lavender">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Aktiva 7 dgr</p>
          <p class="text-3xl font-heading font-bold text-navy">${num(children.active_7d)}</p>
          <p class="text-xs text-text-soft mt-1">av ${num(children.total)}</p>
        </div>
        <div class="bg-sky rounded-2xl p-5 border-2 border-lavender">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Aktiva 30 dgr</p>
          <p class="text-3xl font-heading font-bold text-navy">${num(children.active_30d)}</p>
          <p class="text-xs text-text-soft mt-1">av ${num(children.total)}</p>
        </div>
        <div class="bg-gold-light rounded-2xl p-5 border-2 border-gold/30">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Completion rate</p>
          <p class="text-3xl font-heading font-bold text-navy">${fmt(children.avg_completion_rate)}<span class="text-xl">%</span></p>
          <p class="text-xs text-text-soft mt-1">snitt (30 dgr)</p>
        </div>
      </div>

      <div class="bg-gold-light rounded-2xl p-5 border-2 border-gold/30 mb-4">
        <p class="text-text-soft text-xs font-semibold uppercase mb-1">Intjänade stjärnor (30 dgr)</p>
        <p class="text-2xl font-heading font-bold text-navy">${num(children.total_stars_30d)} ⭐</p>
      </div>

      ${children.active_7d > 0 && children.total > 0 ? sparklineBar(children.active_7d, children.total, 'Aktiva 7 dgr', 'bg-purple-400') : ''}
    </div>

    <!-- PEDAGOGS / TERAPEUTS -->
    <div>
      <h4 class="text-xl font-heading font-bold text-navy mb-1">📋 Pedagoger & Terapeuter</h4>
      <p class="text-text-soft text-sm mb-5">Rapportdelningslänkar (via pedagogsidan)</p>

      ${share_links.available ? `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-sky rounded-2xl p-5 border-2 border-lavender">
            <p class="text-text-soft text-xs font-semibold uppercase mb-1">Totalt</p>
            <p class="text-3xl font-heading font-bold text-navy">${num(share_links.total_links)}</p>
          </div>
          <div class="bg-sky rounded-2xl p-5 border-2 border-lavender">
            <p class="text-text-soft text-xs font-semibold uppercase mb-1">Senaste 30 dgr</p>
            <p class="text-3xl font-heading font-bold text-navy">${num(share_links.created_30d)}</p>
          </div>
          <div class="bg-mint rounded-2xl p-5 border-2 border-mint">
            <p class="text-text-soft text-xs font-semibold uppercase mb-1">Aktiva</p>
            <p class="text-3xl font-heading font-bold text-navy">${num(share_links.active_links)}</p>
          </div>
          <div class="bg-coral rounded-2xl p-5 border-2 border-coral">
            <p class="text-text-soft text-xs font-semibold uppercase mb-1">Återkallade</p>
            <p class="text-3xl font-heading font-bold text-navy">${num(share_links.revoked_links)}</p>
          </div>
        </div>

        <div class="bg-sky rounded-2xl p-5 border-2 border-lavender mb-6">
          <p class="text-text-soft text-xs font-semibold uppercase mb-1">Unika visningar (totalt)</p>
          <p class="text-3xl font-heading font-bold text-navy">${num(share_links.total_views)} 👁️</p>
        </div>

        ${share_links.popular_fields && share_links.popular_fields.length > 0 ? `
          <div class="bg-white rounded-2xl border-2 border-lavender p-5">
            <p class="font-heading font-bold text-navy text-sm mb-3">Populära rapportfält</p>
            <div class="flex flex-wrap gap-2">
              ${share_links.popular_fields.map(f => `
                <span class="bg-gold-light text-navy px-3 py-1.5 rounded-full text-xs font-semibold border border-gold/30">
                  ${esc(f.label)} (${num(f.count)})
                </span>
              `).join('')}
            </div>
          </div>
        ` : `
          <p class="text-text-soft text-sm italic">Inga rapportlänkar ännu.</p>
        `}
      ` : `
        <div class="bg-sky rounded-2xl p-5 border-2 border-lavender">
          <p class="text-text-soft text-sm text-center">📎 Rapportdelning ej aktiverad ännu</p>
          <p class="text-text-soft text-xs text-center mt-1">Funktionen är tillgänglig när rapportdelningsfeaturen är klar.</p>
        </div>
      `}
    </div>
  `;
}

// Simple mini bar chart for active/total comparison
function sparklineBar(active, total, label, colorClass) {
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;
  return `
    <div class="bg-white rounded-2xl border-2 border-lavender p-4">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-semibold text-navy">${esc(label)}</span>
        <span class="text-sm font-bold text-navy">${num(active)} / ${num(total)} (${pct}%)</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div class="${colorClass} h-3 rounded-full transition-all" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}

function num(n) {
  return Number(n || 0).toLocaleString('sv-SE');
}

function fmt(n) {
  const v = parseFloat(n || 0);
  return v % 1 === 0 ? v.toLocaleString('sv-SE') : v.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}