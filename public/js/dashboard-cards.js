/**
 * Dashboard child cards grid (Fas 8 D1).
 * Home hub cards — stats fetch, block pills, accordion expand.
 * Reads dashboard.js globals (dashboardStats, children, escHtml, renderChildAvatar).
 */
(function () {
  'use strict';

  function escHtml(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    return String(s || '');
  }

function buildBlockPills(items) {
  if (!items || items.length === 0) return `<span class="dash-section-pill pill-gray">Inget schema</span>`;

  // Get current time as minutes since midnight (Stockholm)
  const nowStr = new Date().toLocaleTimeString('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' });
  const [nowH, nowM] = nowStr.split(':').map(Number);
  const nowMins = nowH * 60 + nowM;

  // Helper: parse "HH:MM:SS" or "HH:MM" to minutes
  function toMins(t) {
    if (!t) return null;
    const parts = t.split(':').map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  }

  // Define blocks: { key, label, start, end, matcher }
  // Items matched by matcher(); Dag split on start_time.
  const blockDefs = [
    { key: 'morgon',       label: '🌅',      start: 6*60,  end: 9*60,
      matcher: item => item.section === 'morgon' },
    { key: 'formiddag',    label: '☀️',      start: 9*60,  end: 12*60,
      matcher: item => {
        if (item.section !== 'dag') return false;
        const t = toMins(item.start_time);
        return t === null || t < 12*60; // no time or before noon → Förmiddag
      }},
    { key: 'eftermiddag',  label: '🌤',      start: 12*60, end: 17*60,
      matcher: item => {
        if (item.section !== 'dag') return false;
        const t = toMins(item.start_time);
        return t !== null && t >= 12*60; // has time and after noon → Eftermiddag
      }},
    { key: 'kvall',        label: '🌆',      start: 17*60, end: 21*60,
      matcher: item => item.section === 'kvall' || item.section === 'natt' },
  ];

  // Compute trafikljus color for a block given its items and time range
  // Grön = alla klara, Gul = pågår/delvis, Röd = ej klart (passerat/aktivt utan framsteg)
  function blockColor(blockItems, startMins, endMins) {
    if (blockItems.length === 0) return null; // no pill
    const doneCount = blockItems.filter(i => i.completed).length;
    const allDone = doneCount === blockItems.length;
    if (allDone) return 'green';           // 🟢 alla aktiviteter i sektionen avklarade
    const someDone = doneCount > 0;
    if (someDone) return 'yellow';         // 🟡 pågår / delvis avklarade
    // Nothing done — check time to determine if missed or future
    const inProgress = nowMins >= startMins && nowMins < endMins;
    const passed = nowMins >= endMins;
    if (passed || inProgress) return 'red'; // 🔴 ej påbörjade (tid pågår/passerat)
    return 'gray';                          // ⚪ framtid — inte börjat än
  }

  const pills = [];
  for (const bd of blockDefs) {
    const blockItems = items.filter(bd.matcher);
    const color = blockColor(blockItems, bd.start, bd.end);
    if (color !== null) {
      pills.push(`<span class="dash-section-pill pill-${color}">${bd.label}</span>`);
    }
  }

  return pills.length > 0
    ? pills.join('')
    : `<span class="dash-section-pill pill-gray">Inget schema</span>`;
}
async function loadDashboardCards() {
  try {
    const res = await window.apiFetch('/api/family/dashboard-stats');
    if (!res.ok) {
      console.error('[DASHBOARD] dashboard-stats response:', res.status);
      return;
    }
    dashboardStats = await res.json();
    renderDashboardCards();
    if (window.HomeBumpTime && typeof HomeBumpTime.render === 'function') {
      HomeBumpTime.render(dashboardStats);
    }
  } catch (e) {
    console.error('[DASHBOARD] loadDashboardCards failed:', e);
  }
}
// Track which card is expanded
let _expandedCardId = null;

function renderDashboardCards() {
  const container = document.getElementById('childCardsGrid');
  const ch = dashboardStats?.children || [];

  if (ch.length === 0 && children.length === 0) {
    container.innerHTML = `<div class="text-center py-16">
      <p class="text-5xl mb-4">👨‍👩‍👧</p>
      <p class="font-semibold text-navy mb-1">Inga barn tillagda ännu</p>
      <p class="text-sm text-text-soft mb-3">Lägg till ditt första barn för att komma igång</p>
      <button onclick="document.getElementById('addChildModal').classList.remove('hidden')" class="px-6 py-3 bg-gold text-white rounded-xl font-semibold">+ Lägg till barn</button>
    </div>`;
    return;
  }

  // Use stats for children that have data; fall back to children list
  let childList = ch.length > 0 ? ch : children.map(c => ({
    id: c.id, name: c.name, emoji: c.emoji,
    today_total: 0, today_completed: 0, today_pct: null,
    today_log_id: null, today_is_paused: false,
    star_balance: 0, stars_today: 0, today_items: [], nearest_reward: null, history: [],
  }));

  function childAttentionScore(c) {
    const pending = (c.pending_redemptions || 0) + (c.pending_goal_changes || 0);
    if (pending > 0) return 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    const incomplete = (c.history || []).filter(function (d) {
      return d.date < todayStr && d.total > 0 && d.completed < d.total && !d.is_paused;
    }).length;
    if (incomplete > 0) return 1;
    if (c.today_is_paused) return 2;
    const total = c.today_total || 0;
    const done = c.today_completed || 0;
    if (total > 0 && done < total) return 3;
    if (total === 0) return 4;
    return 5;
  }

  childList = childList.slice().sort(function (a, b) {
    return childAttentionScore(a) - childAttentionScore(b);
  });

  const warningsOnly = window.HomeReadiness && HomeReadiness.warningsOnlyEnabled && HomeReadiness.warningsOnlyEnabled();
  if (warningsOnly) {
    childList = childList.filter(function (c) { return childAttentionScore(c) < 5; });
  }

  // Build current week dates Mon→Sun (Swedish week)
  const today = new Date();
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const weekDates = [];
  const dayLabels = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    weekDates.push({
      dateStr: d.toLocaleDateString('sv-SE'),
      label: dayLabels[i],
      isToday: d.toLocaleDateString('sv-SE') === today.toLocaleDateString('sv-SE'),
      isFuture: d > today && d.toLocaleDateString('sv-SE') !== today.toLocaleDateString('sv-SE'),
    });
  }

  container.innerHTML = childList.map(c => {
    const name = c.name ? (c.name.charAt(0).toUpperCase() + c.name.slice(1)) : '';
    const total = c.today_total || 0;
    const done = c.today_completed || 0;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    const allDone = total > 0 && done === total;
    const isPaused = c.today_is_paused || false;
    const stars = c.star_balance || 0;
    const starsToday = c.stars_today || 0;
    const nearestReward = c.nearest_reward || null;
    const todayItems = c.today_items || [];
    const pendingRedemptions = c.pending_redemptions || 0;
    const pendingGoalChanges = c.pending_goal_changes || 0;
    const totalPending = pendingRedemptions + pendingGoalChanges;
    const isExpanded = _expandedCardId === c.id;

    // ── Avatar progress ring (today's activity completion) ──
    // Ring shows X/Y activities completed TODAY
    // Colors: empty=0, gold <50%, orange 50-99%, green 100%
    const ringR = 28;
    const ringCirc = 2 * Math.PI * ringR;
    const showRing = total > 0;
    let ringColor = '#E5E7EB'; // default gray (0%)
    if (pct >= 100) ringColor = '#10B981';       // green — all done
    else if (pct >= 50) ringColor = '#F97316';   // orange — 50-99%
    else if (pct > 0) ringColor = '#F5A623';     // gold — 1-49%
    const ringOffset = ringCirc - (pct / 100) * ringCirc;
    const ringTooltip = total > 0 ? `${done}/${total} aktiviteter klara idag` : '';

    const avatarHtml = `
      <div class="dash-avatar-wrap" title="${escHtml(ringTooltip)}">
        ${showRing ? `
        <svg class="dash-avatar-ring" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="${ringR}" fill="none" stroke="#E5E7EB" stroke-width="4"/>
          <circle cx="32" cy="32" r="${ringR}" fill="none" stroke="${ringColor}" stroke-width="4"
            stroke-dasharray="${ringCirc}" stroke-dashoffset="${ringOffset}"
            stroke-linecap="round" transform="rotate(-90 32 32)"/>
        </svg>` : ''}
        <span class="dash-avatar-emoji">${renderChildAvatar(c, 32)}</span>
      </div>`;

    // ── Tidsblock-engine: map items → blocks with trafikljus-färg ─
    // Blocks: Morgon 06–09, Förmiddag 09–12, Eftermiddag 12–17, Kväll 17–21 (natt→kväll)
    const sectionPillsHtml = buildBlockPills(todayItems);

    // ── Senast / Nästa status row ────────────────────────────
    const lastDone = [...todayItems].reverse().find(item => item.completed);
    const nextPending = todayItems.find(item => !item.completed);
    let statusRowHtml = '';
    if (isPaused) {
      statusRowHtml = `<span class="dash-status-row">⏸ <em>Pausad idag</em></span>`;
    } else if (allDone && total > 0) {
      statusRowHtml = `<span class="dash-status-row" style="color:#10B981;font-weight:700;">✅ Alla aktiviteter klara idag!</span>`;
    } else if (total === 0) {
      statusRowHtml = `<span class="dash-status-row">Inga aktiviteter planerade idag</span>`;
    } else {
      const lastPart = lastDone
        ? `<strong>Senast:</strong> ${escHtml(lastDone.name)} ✅${lastDone.start_time ? ' ' + lastDone.start_time.substring(0,5) : ''}`
        : '';
      const nextPart = nextPending
        ? `<strong>Nästa:</strong> ${escHtml(nextPending.icon || '')} ${escHtml(nextPending.name)}`
        : '';
      statusRowHtml = `<span class="dash-status-row">${[lastPart, nextPart].filter(Boolean).join(' &nbsp;·&nbsp; ')}</span>`;
    }

    // ── Activity checklist for expanded detail ───────────────
    let activityListHtml = '';
    if (isPaused) {
      activityListHtml = `<div class="text-xs text-text-soft text-center py-3 italic">Pausad idag</div>`;
    } else if (todayItems.length === 0) {
      activityListHtml = `
        <div class="text-xs text-text-soft text-center py-2 mb-2">Inget schema för idag</div>
        <div class="text-center mb-1">
          <a href="/schedule?child=${c.id}" onclick="event.stopPropagation()" class="text-xs text-gold hover:text-amber-600 font-semibold transition-colors">✨ Skapa aktivitet i schema →</a>
        </div>
        <p class="text-[10px] text-text-soft text-center leading-tight">${escHtml(name)} har inga aktiviteter ännu — skapa den första →</p>`;
    } else {
      const itemsHtml = todayItems.map(item => {
        const statusClass = item.status === 'NU' ? 'status-nu' : item.status === 'NÄSTA' ? 'status-nasta' : item.status === 'DONE' ? 'status-done' : 'status-sedan';
        const checkClass = item.completed ? 'checked' : '';
        const badgeHtml = item.status === 'NU' ? `<span class="status-badge-nu">NU</span>` :
                          item.status === 'NÄSTA' ? `<span class="status-badge-nasta">NÄSTA</span>` : '';
        const goalBadgeHtml = item.for_dig_goal && window.ForDigGoalBadge
          ? ForDigGoalBadge.render(item.for_dig_goal)
          : '';
        const starsHtml = item.star_value > 0 ? `<span class="text-[10px] text-gold font-bold ml-auto flex-shrink-0">+${item.star_value}⭐</span>` : '';
        const nameDisplay = item.completed ? `<span class="line-through opacity-60">${escHtml(item.name)}</span>` : `<span>${escHtml(item.name)}</span>`;
        const oncePin = item.is_once_task ? `<span title="Engångsaktivitet" class="text-[10px] flex-shrink-0">📌</span>` : '';
        return `
          <div class="dash-activity-item ${statusClass}" data-item-id="${item.id}">
            <button class="dash-activity-check ${checkClass}" onclick="event.stopPropagation(); dashToggleActivity('${item.id}', '${c.id}', ${item.completed})" title="${item.completed ? 'Avmarkera' : 'Markera klar'}">
              ${item.completed ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
            </button>
            ${oncePin}
            <span class="text-base flex-shrink-0">${item.icon || '📋'}</span>
            <span class="text-sm font-medium text-navy flex-1 min-w-0 truncate flex items-center gap-1">${goalBadgeHtml}${nameDisplay}</span>
            ${badgeHtml}
            ${starsHtml}
          </div>`;
      }).join('');
      activityListHtml = `<div class="dash-activity-list">${itemsHtml}</div>`;
    }

    // ── Mini weekly chart for expanded detail ────────────────
    const histByDate = {};
    for (const h of (c.history || [])) histByDate[h.date] = h;
    const miniChartBars = weekDates.map(day => {
      const h = histByDate[day.dateStr];
      const dayPct = h ? (h.pct || 0) : 0;
      const dayPaused = h?.is_paused;
      let barHeight, barBg;
      if (day.isFuture) { barHeight = 0; barBg = ''; }
      else if (dayPaused) { barHeight = 15; barBg = '#D1D5DB'; }
      else if (dayPct >= 100) { barHeight = 100; barBg = 'linear-gradient(180deg, #34D399, #10B981)'; }
      else if (dayPct > 0) { barHeight = Math.max(15, dayPct); barBg = 'linear-gradient(180deg, #FBBF24, #F5A623)'; }
      else if (h) { barHeight = 8; barBg = '#E5E7EB'; }
      else { barHeight = 0; barBg = ''; }
      const labelColor = day.isToday ? 'color:#F5A623;font-weight:800;' : '';
      const todayDot = day.isToday ? '<div style="width:5px;height:5px;border-radius:50%;background:#F5A623;margin:2px auto 0;"></div>' : '';
      const dayClass = day.isFuture ? 'mini-week-day' : 'mini-week-day mini-week-day--clickable';
      const dayClick = day.isFuture ? '' : ` onclick="event.stopPropagation(); window.location.href='/daily-log?childId=${c.id}&date=${day.dateStr}'" title="Fyll i ${day.label}"`;
      return `<div class="${dayClass}"${dayClick}>
        <div class="mini-week-bar-track">
          ${barHeight > 0 ? `<div class="mini-week-bar-fill" style="height:${barHeight}%;background:${barBg};" title="${dayPct}%${dayPaused ? ' (pausad)' : ''}"></div>` : ''}
        </div>
        <div class="mini-week-label" style="${labelColor}">${day.label}</div>
        ${todayDot}
      </div>`;
    }).join('');

    // ── Reward progress bar for expanded detail ──────────────
    let expandedRewardHtml = '';
    if (nearestReward) {
      const rPct = Math.min(100, Math.round((stars / nearestReward.star_cost) * 100));
      expandedRewardHtml = `
        <div class="mb-3 p-3 bg-navy rounded-xl">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs text-white/80 font-semibold truncate">${escHtml(nearestReward.icon || '🎁')} ${escHtml(nearestReward.name)}</span>
            <span class="text-xs text-white/60 ml-2 flex-shrink-0">${stars}/${nearestReward.star_cost} ⭐</span>
          </div>
          <div class="reward-progress-bar-track">
            <div class="reward-progress-bar-fill" style="width:${rPct}%"></div>
          </div>
        </div>`;
    } else {
      // Empty state: no rewards yet
      expandedRewardHtml = `
        <div class="mb-3 p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
          <span class="text-sm">🎁 Inga belöningar ännu</span>
          <a href="/library#rewards" class="block text-xs text-purple-600 font-semibold mt-1 hover:underline">→ Lägg till en belöning</a>
        </div>`;
    }

    // ── Pause button for expanded detail ─────────────────────
    const pauseLabel = isPaused ? '▶ Återuppta' : '⏸ Pausa idag';
    const pauseClass = isPaused ? 'pause-btn is-paused' : 'pause-btn';

    // ── Redemption badge (inline) ─────────────────────────────
    // Only show if there are pending requests; clicking expands inline panel
    const redemptionBadgeHtml = totalPending > 0 ? `
      <button class="dash-action-btn btn-redemption" onclick="event.stopPropagation(); toggleInlineRedemption('${c.id}', '${escHtml(name)}')" title="${totalPending} väntande förfrågan">
        🎁 ${totalPending}
      </button>` : '';

    const cardStats = window.DashboardDailySummary
      ? window.DashboardDailySummary.buildChildStats(c)
      : { primaryHtml: `<div class="text-xs text-text-soft">Idag ${done}/${total}</div>`, secondaryHtml: `<div class="text-xs font-bold text-gold">⭐ Totalt ${stars}</div>`, cardClass: '' };

    return `<div class="dash-child-card ${isPaused ? 'paused' : ''} ${isExpanded ? 'is-expanded' : ''} ${cardStats.cardClass || ''}" data-child-id="${c.id}">
      <!-- ── COMPACT TOP (always visible) ── -->
      <div class="dash-card-compact" onclick="toggleCardExpand('${c.id}')">
        <div class="flex items-center gap-3">
          <!-- Avatar with reward ring -->
          ${avatarHtml}

          <!-- Name + progress highlights -->
          <div class="flex-1 min-w-0" style="min-width:60px;">
            <div class="flex items-center gap-1.5 mb-0.5">
              <h4 class="font-heading font-bold text-navy text-base leading-tight truncate">
                <a href="/family/child/${c.id}" class="hover:text-gold no-underline text-navy" onclick="event.stopPropagation()">🌟 ${escHtml(name)}</a>
              </h4>
              ${allDone ? '<span class="text-base" title="Alla klara!">🌟</span>' : ''}
              ${isPaused ? '<span class="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">PAUSAD</span>' : ''}
            </div>
            ${cardStats.primaryHtml}
            ${cardStats.secondaryHtml}
          </div>

          <!-- Section pills + chevron -->
          <div class="flex items-center gap-1.5 flex-shrink-0" style="flex-direction:row;">
            <div style="display:flex;flex-direction:row;gap:4px;flex-wrap:nowrap;">${sectionPillsHtml}</div>
            <span class="dash-expand-chevron">▼</span>
          </div>
        </div>

        <!-- Status row (Senast/Nästa) -->
        <div class="mt-2">${statusRowHtml}</div>

        <!-- Action buttons (only redemption badge remains; quick actions moved to header) -->
        ${redemptionBadgeHtml ? `<div class="flex items-center gap-2 mt-2.5" onclick="event.stopPropagation()">${redemptionBadgeHtml}</div>` : ''}

        <!-- Inline redemption panel (hidden by default) -->
        <div id="inline-redemption-${c.id}" class="hidden"></div>
      </div>

      <!-- ── EXPANDED DETAIL (accordion) ── -->
      <div class="dash-card-expanded ${isExpanded ? '' : 'hidden'}" id="card-detail-${c.id}">
        <div class="dash-detail-panel">
          <!-- Reward progress -->
          ${expandedRewardHtml}

          <!-- Activity checklist -->
          <div class="mb-3" onclick="event.stopPropagation()">
            <div class="text-[10px] font-bold text-text-soft uppercase tracking-wider mb-2">📋 Idag</div>
            ${activityListHtml}
          </div>

          <!-- Weekly mini chart -->
          <div class="mb-3 p-3 bg-gray-50 rounded-xl" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between mb-2">
              <div class="text-[10px] font-bold text-text-soft uppercase tracking-wide">📊 Senaste 7 dagarna</div>
              <a href="/daily-log?childId=${c.id}" class="text-[10px] font-semibold text-gold hover:text-amber-600 transition-colors" onclick="event.stopPropagation()">Fyll i i efterhand →</a>
            </div>
            <div class="mini-week-chart">${miniChartBars}</div>
          </div>

          <!-- Bottom actions: pause + add activity + schema link + share -->
          <div class="flex items-center justify-between gap-2 flex-wrap" onclick="event.stopPropagation()">
            <button class="${pauseClass}" onclick="togglePauseDay('${c.id}', '${c.today_log_id || ''}', ${isPaused})" ${!c.today_log_id ? 'disabled title="Inget schema genererat idag"' : ''}>
              ${pauseLabel}
            </button>
            <div class="flex items-center gap-2">
              <button class="text-xs text-gold hover:text-amber-600 font-semibold transition-colors" onclick="openDashboardAddForChild('${c.id}')">
                + Aktivitet
              </button>
              <a href="/schedule?child=${c.id}" onclick="event.stopPropagation()" class="text-xs text-purple-600 hover:text-purple-800 font-semibold transition-colors">
                ✨ Skapa i schema →
              </a>
              <button class="text-xs text-text-soft hover:text-navy font-semibold transition-colors" onclick="window.location.href='/schedule?child=${c.id}'">
                Schema →
              </button>
              <button class="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors" onclick="shareChildSchedule('${c.id}')">
                📤 Dela
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  if (window.DashboardCustody && typeof DashboardCustody.apply === 'function') {
    DashboardCustody.apply(childList.map(function (c) { return c.id; }));
  }

  if (window.DashboardHomeHub) {
    DashboardHomeHub.render(dashboardStats);
  }

  if (window.DashboardDailySummary && dashboardStats) {
    window.DashboardDailySummary.update(dashboardStats);
  }
}

function toggleCardExpand(childId) {
  if (_expandedCardId === childId) {
    // Collapse current
    _expandedCardId = null;
    const card = document.querySelector(`[data-child-id="${childId}"]`);
    if (card) {
      card.classList.remove('is-expanded');
      const detail = document.getElementById(`card-detail-${childId}`);
      if (detail) detail.classList.add('hidden');
    }
  } else {
    // Collapse previously expanded
    if (_expandedCardId) {
      const prev = document.querySelector(`[data-child-id="${_expandedCardId}"]`);
      if (prev) {
        prev.classList.remove('is-expanded');
        const prevDetail = document.getElementById(`card-detail-${_expandedCardId}`);
        if (prevDetail) prevDetail.classList.add('hidden');
      }
    }
    // Expand new
    _expandedCardId = childId;
    const card = document.querySelector(`[data-child-id="${childId}"]`);
    if (card) {
      card.classList.add('is-expanded');
      const detail = document.getElementById(`card-detail-${childId}`);
      if (detail) detail.classList.remove('hidden');
    }
  }
}
  window.loadDashboardCards = loadDashboardCards;
  window.renderDashboardCards = renderDashboardCards;
  window.toggleCardExpand = toggleCardExpand;
})();
