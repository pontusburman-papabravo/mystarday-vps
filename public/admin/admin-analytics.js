/**
 * Admin analytics module.
 * Owns: Analytics tab with KPI cards, sparklines, funnel, feature charts, heatmap,
 *       warning flags, retention cohort matrix, trend charts, newsletter effect.
 * Does NOT own: any other admin sections or non-analytics API calls.
 */

/* global Chart */

let chartInstances = {};
let activeTab = 'overview';
let trendChart = null;

// ─── Entry point ──────────────────────────────────────────

async function loadAnalytics() {
  const container = document.getElementById('analyticsContainer');
  if (!container) return;

  Object.keys(chartInstances).forEach(destroyChart);
  activeTab = 'overview';

  container.innerHTML = buildAnalyticsHTML();
  initTabs();

  // Load overview tab immediately
  await switchTab('overview');

  // Pre-fetch other tabs in background (don't block UI)
  prefetchTabs();
}

function prefetchTabs() {
  // Kick off data fetches for non-visible tabs so they're ready when switched
  ['dynamics', 'warnings', 'retention', 'trends', 'newsletter'].forEach(tab => {
    // Just pre-warm by rendering the tab structure — data loads on demand
  });
}

// ─── Tab system ───────────────────────────────────────────

function initTabs() {
  const tabs = document.querySelectorAll('.analytics-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

async function switchTab(tabName) {
  activeTab = tabName;

  // Update tab button styles
  document.querySelectorAll('.analytics-tab').forEach(t => {
    if (t.dataset.tab === tabName) {
      t.className = 'analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy transition-colors cursor-pointer';
    } else {
      t.className = 'analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer';
    }
  });

  // Show/hide sections
  document.querySelectorAll('.analytics-section').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(`section-${tabName}`);
  if (target) target.classList.remove('hidden');

  // Load data for the active tab
  if (tabName === 'overview') await loadOverviewTab();
  else if (tabName === 'dynamics') await loadDynamics();
  else if (tabName === 'warnings') await loadWarnings();
  else if (tabName === 'retention') await loadRetention();
  else if (tabName === 'trends') await loadTrends();
  else if (tabName === 'newsletter') await loadNewsletter();
  else if (tabName === 'activation') {
    await loadActivationFunnel();
    await loadActivationExperiment();
    await loadReferralsAdmin();
  }
}

// ─── HTML skeleton ────────────────────────────────────────

function buildAnalyticsHTML() {
  return `
    <div class="space-y-6">

      <!-- Tab bar -->
      <div class="flex flex-wrap gap-2 border-b border-sky pb-3">
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy transition-colors cursor-pointer" data-tab="overview">Översikt</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="dynamics">👨‍👩‍👧 Familjdynamik</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="warnings">⚠️ Varningsflaggor</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="retention">📈 Retention</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="trends">📉 Trender</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="newsletter">📧 Nyhetsbrev</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="activation">⭐ Aktivering</button>
      </div>

      <!-- ── OVERVIEW (Del 1) ──────────────────────────────── -->
      <div id="section-overview" class="analytics-section space-y-8">

        <!-- KPI Cards -->
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-4">Nyckeltal</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="kpiCards"></div>
        </div>

        <!-- Funnel -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Onboarding-tratt</h3>
          <p class="text-text-soft text-sm mb-4">Antal unika familjer per steg (all tid)</p>
          <div class="analytics-chart-wrap analytics-chart-wrap--tall"><canvas id="funnelChart"></canvas></div>
        </div>

        <!-- Feature popularity -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Feature-popularitet</h3>
          <p class="text-text-soft text-sm mb-4">Antal händelser per funktion (senaste 30 dagarna)</p>
          <div class="analytics-chart-wrap analytics-chart-wrap--tall"><canvas id="featureChart"></canvas></div>
          <div id="featureTable" class="mt-4"></div>
        </div>
      </div>

      <!-- ── FAMILY DYNAMICS (Case C) ───────────────────── -->
      <div id="section-dynamics" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">👨‍👩‍👧 Familjdynamik</h3>
          <p class="text-text-soft text-sm mb-6">Fleranvändarstöd och korrelation med engagemang</p>
        </div>

        <!-- Multi-parent breakdown -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-4">Antal föräldrar per familj</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-sm mb-6">
              <thead>
                <tr class="border-b border-sky text-left text-text-soft text-xs font-semibold uppercase tracking-wide">
                  <th class="pb-2 pr-4">Föräldrar</th>
                  <th class="pb-2 pr-4 text-right">Familjer</th>
                  <th class="pb-2 pr-4 text-right">Snitt aktiva dagar (30d)</th>
                  <th class="pb-2 text-right">Snitt händelser/familj (30d)</th>
                </tr>
              </thead>
              <tbody id="dynamicsParentTable">
                <tr><td colspan="4" class="text-center text-text-soft py-6">Laddar...</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Engagement comparison -->
          <div id="dynamicsComparison" class="bg-sky rounded-xl p-4">
            <div class="flex items-center gap-4">
              <div class="text-center">
                <p class="text-xs font-semibold text-text-soft mb-1">1 förälder</p>
                <p id="dynamics1ParentDays" class="text-xl font-heading font-bold text-navy">—</p>
                <p class="text-xs text-text-soft">dagar/familj</p>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <p id="dynamicsDelta" class="text-sm font-bold text-navy"></p>
                <div class="w-full h-1 bg-lavender rounded-full mt-1">
                  <div id="dynamicsDeltaBar" class="h-full bg-gold rounded-full transition-all" style="width:50%"></div>
                </div>
              </div>
              <div class="text-center">
                <p class="text-xs font-semibold text-text-soft mb-1">2+ föräldrar</p>
                <p id="dynamicsMultiParentDays" class="text-xl font-heading font-bold text-navy">—</p>
                <p class="text-xs text-text-soft">dagar/familj</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity heatmap -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="text-base font-heading font-bold text-navy">🗓️ Aktivitetsvärmekarta</h4>
              <p class="text-text-soft text-xs mt-1">Timme × veckodag (senaste 30 dagarna)</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-text-soft">Topptimme:</p>
              <p id="heatmapPeak" class="text-sm font-heading font-bold text-navy">—</p>
            </div>
          </div>

          <!-- Heatmap grid -->
          <div class="overflow-x-auto">
            <div id="heatmapContainer" class="inline-block min-w-full"></div>
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-2 mt-4 justify-end">
            <span class="text-xs text-text-soft">Låg</span>
            <div class="flex gap-0.5" id="heatmapLegend"></div>
            <span class="text-xs text-text-soft">Hög</span>
          </div>

          <p class="text-xs text-text-soft mt-3">
            💡 Använd topptimmarna för optimal push-notistiming. Mörkare celler = fler händelser.
          </p>
        </div>
      </div>

      <!-- ── WARNING FLAGS (Case D) ─────────────────────── -->
      <div id="section-warnings" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">⚠️ Varningsflaggor</h3>
          <p class="text-text-soft text-sm mb-6">Proaktiv support: ghost families och tappat engagemang</p>
        </div>

        <!-- Weekly churn trend -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">📉 Tappat engagemang per vecka</h4>
          <p class="text-text-soft text-xs mb-4">Antal familjer som tappat engagemang veckan innan — identifiera trender</p>
          <div class="analytics-chart-wrap analytics-chart-wrap--compact"><canvas id="churnTrendChart"></canvas></div>
        </div>

        <!-- Ghost families -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">👻 Ghost Families</h4>
          <p class="text-text-soft text-xs mb-4">Skapade konto men öppnade aldrig barnvyn</p>
          <div id="ghostFamilies" class="space-y-2 max-h-64 overflow-y-auto">
            <p class="text-text-soft text-sm text-center py-4">Laddar...</p>
          </div>
        </div>

        <!-- Dropped families -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">📉 Tappat engagemang</h4>
          <p class="text-text-soft text-xs mb-4">Inga händelser på 3+ dygn</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-sky text-left text-text-soft text-xs font-semibold uppercase tracking-wide">
                  <th class="pb-2 pr-4">Familj</th>
                  <th class="pb-2 pr-4">Senaste aktivitet</th>
                  <th class="pb-2 text-right">Dagar inaktiv</th>
                </tr>
              </thead>
              <tbody id="droppedFamilies">
                <tr><td colspan="3" class="text-center text-text-soft py-4">Laddar...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── RETENTION COHORT (Case 3) ──────────────────── -->
      <div id="section-retention" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">📈 Retention-kurva</h3>
          <p class="text-text-soft text-sm mb-6">Veckovisa kohorter — "Fastnar appen?" — aktiv familj = minst 1 event/vecka</p>
        </div>

        <!-- Summary stats -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3" id="retentionSummary"></div>

        <!-- Cohort matrix -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" id="cohortTable">
              <thead>
                <tr class="border-b border-sky text-left text-text-soft text-xs font-semibold uppercase tracking-wide">
                  <th class="pb-2 pr-4">Kohortera</th>
                  <th class="pb-2 pr-4 text-center">Vecka 0</th>
                  <th class="pb-2 pr-4 text-center">Vecka 1</th>
                  <th class="pb-2 pr-4 text-center">Vecka 2</th>
                  <th class="pb-2 pr-4 text-center">Vecka 4</th>
                  <th class="pb-2 pr-4 text-center">Månad 2</th>
                  <th class="pb-2 text-center">Månad 3</th>
                </tr>
              </thead>
              <tbody id="cohortTableBody">
                <tr><td colspan="7" class="text-center text-text-soft py-8">Laddar...</td></tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-text-soft mt-4">
            🟢 >60% retention &nbsp; 🟡 30–60% &nbsp; 🔴 &lt;30% &nbsp; — = inga familjer i kohortera
          </p>
        </div>
      </div>

      <!-- ── HISTORICAL TRENDS (Case 4) ─────────────────── -->
      <div id="section-trends" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">📉 Historiska trender</h3>
          <p class="text-text-soft text-sm mb-6">Fullstora grafer från dagliga snapshots</p>
        </div>

        <!-- Period toggle -->
        <div class="flex gap-2">
          <button onclick="loadTrendsData(7)" class="trends-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors" data-period="7">7 dagar</button>
          <button onclick="loadTrendsData(30)" class="trends-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors" data-period="30">30 dagar</button>
          <button onclick="loadTrendsData(90)" class="trends-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors" data-period="90">90 dagar</button>
        </div>

        <!-- Trend charts grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" id="trendCharts">
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-3">Aktiva familjer (24h)</h4>
            <div class="analytics-chart-wrap"><canvas id="trendActiveFamilies"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-3">Aktiva familjer (7d)</h4>
            <div class="analytics-chart-wrap"><canvas id="trendActiveFamilies7d"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-3">⭐ Stjärnor utdelade</h4>
            <div class="analytics-chart-wrap"><canvas id="trendStars"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-3">📊 Konverteringsgrad</h4>
            <div class="analytics-chart-wrap"><canvas id="trendConversion"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-3">📱 PWA installerad</h4>
            <div class="analytics-chart-wrap"><canvas id="trendPwa"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-3">📧 Nyhetsbrevsprenumeranter</h4>
            <div class="analytics-chart-wrap"><canvas id="trendNewsletter"></canvas></div>
          </div>
        </div>
      </div>

      <!-- ── NEWSLETTER EFFECT (Case 5) ──────────────────── -->
      <div id="section-newsletter" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">📧 Nyhetsbrevseffekt</h3>
          <p class="text-text-soft text-sm mb-6">Aktivitetslyft efter utskick vs normaldagar</p>
        </div>

        <!-- Last newsletter effect summary -->
        <div id="newsletterLatestEffect" class="bg-gold-light rounded-2xl border border-gold/30 p-5">
          <p class="text-sm text-text-soft mb-1">Senaste nyhetsbrevet</p>
          <p id="newsletterLastTitle" class="text-lg font-heading font-bold text-navy mb-2">—</p>
          <div class="flex items-center gap-4">
            <span id="newsletterLastRecipients" class="text-sm text-text-soft">— mottagare</span>
            <span id="newsletterLastLift" class="text-sm font-bold text-navy"></span>
          </div>
        </div>

        <!-- Per-dispatch table -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-4">Per utskick</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-sky text-left text-text-soft text-xs font-semibold uppercase tracking-wide">
                  <th class="pb-2 pr-4">Datum</th>
                  <th class="pb-2 pr-4">Nyhetsbrev</th>
                  <th class="pb-2 pr-4 text-right">Mottagare</th>
                  <th class="pb-2 pr-4 text-right">Aktiva dagen efter</th>
                  <th class="pb-2 pr-4 text-right">Dagssnitt (vecka före)</th>
                  <th class="pb-2 text-right">Aktivitetslyft</th>
                </tr>
              </thead>
              <tbody id="newsletterTableBody">
                <tr><td colspan="6" class="text-center text-text-soft py-8">Laddar...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="section-activation" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">⭐ Aktiveringstratt (P0)</h3>
          <p class="text-text-soft text-sm mb-4">Veckokohort — 9 steg enligt ACT-1 (signup → P0 inom 48h)</p>
        </div>
        <div class="bg-white rounded-2xl border border-sky p-6 overflow-x-auto">
          <table class="w-full text-sm">
            <thead id="activationFunnelHead">
              <tr><th class="text-left pb-2">Laddar…</th></tr>
            </thead>
            <tbody id="activationFunnelBody"></tbody>
          </table>
          <div id="activationChildAccessDiag" class="mt-4 pt-4 border-t border-sky text-sm hidden"></div>
        </div>

        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">🧪 Experiment — activation_rate_48h per variant</h3>
          <p class="text-text-soft text-sm mb-4">Jämför legacy vs mall (A) vs mall+AI (B). Go/no-go: AI endast om B slår A med ≥5 pp absolut.</p>
        </div>
        <div class="bg-white rounded-2xl border border-sky p-6 overflow-x-auto mb-4">
          <table class="w-full text-sm" id="activationExperimentTable">
            <thead id="activationExperimentHead">
              <tr><th class="text-left pb-2">Laddar…</th></tr>
            </thead>
            <tbody id="activationExperimentBody"></tbody>
            <tfoot id="activationExperimentFoot"></tfoot>
          </table>
          <p id="activationExperimentVerdict" class="mt-4 text-sm font-medium hidden"></p>
        </div>

        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">🔗 Värvningar (referral v0)</h3>
          <p class="text-text-soft text-sm mb-4">Personliga koder — signups och kvalificerade värvningar (P0, ingen belöning i v0)</p>
        </div>
        <div class="bg-white rounded-2xl border border-sky p-6 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr>
                <th class="text-left pb-2 pr-4">Kod</th>
                <th class="text-left pb-2 pr-4">Värvare</th>
                <th class="text-right pb-2 pr-4">Delningar</th>
                <th class="text-right pb-2 pr-4">Signups</th>
                <th class="text-right pb-2 pr-4">Kvalificerade</th>
                <th class="text-right pb-2">Senaste signup</th>
              </tr>
            </thead>
            <tbody id="referralsAdminBody">
              <tr><td colspan="5" class="text-center text-text-soft py-8">Laddar...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// ─── Tab loaders ──────────────────────────────────────────

async function loadOverviewTab() {
  const container = document.getElementById('kpiCards');
  if (!container || container.dataset.loaded === 'true') return;
  try {
    const [kpisRes, snapshotsRes, funnelRes, featuresRes] = await Promise.all([
      Auth.api('/api/admin/analytics/kpis'),
      Auth.api('/api/admin/analytics/snapshots?days=14'),
      Auth.api('/api/admin/analytics/funnel'),
      Auth.api('/api/admin/analytics/features'),
    ]);

    renderKpiCards(kpisRes, snapshotsRes);
    renderFunnelChart(funnelRes);
    renderFeatureChart(featuresRes);
    container.dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadOverviewTab error:', err);
    if (container) {
      container.innerHTML = '<p class="text-red-500 text-sm col-span-full">Kunde inte ladda analytics: ' + (typeof esc === 'function' ? esc(err.message || 'Okänt fel') : 'fel') + '</p>';
    }
  }
}

async function loadDynamics() {
  if (document.getElementById('dynamicsParentTable').dataset.loaded) return;
  try {
    // Ensure overview charts are populated (shared KPI/funnel data)
    await loadOverviewTab();

    const [dynamicsRes, heatmapRes] = await Promise.all([
      Auth.api('/api/admin/analytics/family-dynamics'),
      Auth.api('/api/admin/analytics/heatmap'),
    ]);

    renderDynamicsParentTable(dynamicsRes.breakdown);
    renderDynamicsComparison(dynamicsRes.comparison);
    renderHeatmap(heatmapRes);

    document.getElementById('dynamicsParentTable').dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadDynamics error:', err);
  }
}

async function loadWarnings() {
  if (document.getElementById('droppedFamilies').dataset.loaded) return;
  try {
    const [warningsRes] = await Promise.all([
      fetch('/api/admin/analytics/warnings').then(r => r.json()),
    ]);

    renderWarningFlags(warningsRes);
    document.getElementById('droppedFamilies').dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadWarnings error:', err);
  }
}

async function loadRetention() {
  const tbody = document.getElementById('cohortTableBody');
  if (tbody.dataset.loaded) return;
  try {
    const [retentionRes] = await Promise.all([
      fetch('/api/admin/analytics/retention-cohort').then(r => r.json()),
    ]);

    renderRetentionCohort(retentionRes);
    tbody.dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadRetention error:', err);
  }
}

async function loadTrends() {
  await loadTrendsData(30);
}

async function loadTrendsData(days) {
  try {
    destroyChart('trendActiveFamilies');
    destroyChart('trendActiveFamilies7d');
    destroyChart('trendStars');
    destroyChart('trendConversion');
    destroyChart('trendPwa');
    destroyChart('trendNewsletter');

    const snapshots = await fetch(`/api/admin/analytics/trends?days=${days}`).then(r => r.json());

    const labels = snapshots.map(s => s.date.slice(5));
    const datasets = [
      { id: 'trendActiveFamilies',   key: 'active_families_24h',           color: '#EF4444', label: 'Aktiva (24h)' },
      { id: 'trendActiveFamilies7d', key: 'active_families_7d',            color: '#F5A623', label: 'Aktiva (7d)' },
      { id: 'trendStars',            key: 'total_stars_given',             color: '#F5A623', label: 'Stjärnor' },
      { id: 'trendConversion',        key: 'conversion_rate',                color: '#10B981', label: 'Konvertering %' },
      { id: 'trendPwa',              key: 'pwa_installed_count',           color: '#6366F1', label: 'PWA' },
      { id: 'trendNewsletter',       key: 'newsletter_subscribers_count',  color: '#1B2340', label: 'Prenumeranter' },
    ];

    datasets.forEach(({ id, key, color, label }) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const data = snapshots.map(s => s[key] || 0);

      chartInstances[id] = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label,
            data,
            borderColor: color,
            backgroundColor: color + '20',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5,
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { maxTicksLimit: 10, font: { size: 11 } } },
            y: { beginAtZero: true, ticks: { font: { size: 11 } } },
          },
        },
      });
    });

    // Style period buttons
    document.querySelectorAll('.trends-period-btn').forEach(btn => {
      if (parseInt(btn.dataset.period) === days) {
        btn.className = 'trends-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy transition-colors cursor-pointer';
      } else {
        btn.className = 'trends-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer';
      }
    });
  } catch (err) {
    console.error('[Analytics] loadTrendsData error:', err);
  }
}

async function loadNewsletter() {
  if (document.getElementById('newsletterTableBody').dataset.loaded) return;
  try {
    const [newsletterRes] = await Promise.all([
      fetch('/api/admin/analytics/newsletter-effect').then(r => r.json()),
    ]);

    renderNewsletterEffect(newsletterRes);
    document.getElementById('newsletterTableBody').dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadNewsletter error:', err);
  }
}

// ─── KPI Cards (Del 1) ───────────────────────────────────

function renderKpiCards(kpis, snapshots) {
  const container = document.getElementById('kpiCards');
  if (!container) return;

  const snapshotsByDate = {};
  (snapshots || []).forEach(s => { snapshotsByDate[s.date] = s; });
  const sortedDates = Object.keys(snapshotsByDate).sort();

  function sparklineData(field) {
    return sortedDates.map(d => snapshotsByDate[d][field] || 0);
  }

  const cards = [
    { id: 'kpi-active-24h',  title: 'Aktiva familjer (24h)', icon: '❤️', value: kpis.active_families_24h, subtext: `${kpis.active_families_7d} senaste 7 dagarna`, color: '#EF4444', sparkKey: 'active_families_24h' },
    { id: 'kpi-stars',       title: 'Utdelade stjärnor',     icon: '⭐', value: kpis.total_stars_given.toLocaleString('sv-SE'), subtext: `${kpis.total_rewards_claimed} inlösta belöningar`, color: '#F5A623', sparkKey: 'total_stars_given' },
    { id: 'kpi-conversion',  title: 'Konverteringsgrad',       icon: '🎯', value: kpis.conversion_rate + '%', subtext: 'Registrering → Första barn', color: '#10B981', sparkKey: 'conversion_rate' },
    { id: 'kpi-pwa',         title: 'PWA installerad',       icon: '📱', value: kpis.pwa_installed_count, subtext: `${kpis.pwa_browser_count} via webbläsare`, color: '#6366F1', sparkKey: 'pwa_installed_count' },
    { id: 'kpi-newsletter',  title: 'Nyhetsbrevsprenumeranter', icon: '📧', value: kpis.newsletter_subscribers_count, subtext: 'Aktiva prenumeranter', color: '#1B2340', sparkKey: 'newsletter_subscribers_count' },
  ];

  container.innerHTML = cards.map(c => `
    <div class="bg-white rounded-2xl border border-sky p-5 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <span class="text-2xl">${c.icon}</span>
        <span class="text-sm font-semibold text-text-soft">${c.title}</span>
      </div>
      <div class="text-3xl font-heading font-bold text-navy">${c.value}</div>
      <div class="text-xs text-text-soft">${c.subtext}</div>
      <div class="analytics-chart-wrap analytics-chart-wrap--spark"><canvas id="${c.id}-spark"></canvas></div>
    </div>
  `).join('');

  cards.forEach(c => {
    const canvas = document.getElementById(`${c.id}-spark`);
    if (!canvas) return;
    const data = sparklineData(c.sparkKey);
    if (data.length < 2) return;

    destroyChart(c.id + '-spark');
    chartInstances[c.id + '-spark'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: sortedDates.map(d => d.slice(5)),
        datasets: [{
          data,
          borderColor: c.color,
          backgroundColor: c.color + '20',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
      },
    });
  });
}

// ─── Funnel chart ─────────────────────────────────────────

function renderFunnelChart(steps) {
  const canvas = document.getElementById('funnelChart');
  if (!canvas) return;

  destroyChart('funnelChart');
  chartInstances['funnelChart'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: steps.map(s => s.step),
      datasets: [{
        label: 'Unika familjer',
        data: steps.map(s => s.count),
        backgroundColor: ['#1B2340', '#2A3458', '#F5A623', '#10B981'],
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { ticks: { font: { size: 12 } } } },
    },
  });
}

// ─── Feature popularity ───────────────────────────────────

function renderFeatureChart(features) {
  const canvas = document.getElementById('featureChart');
  const tableEl = document.getElementById('featureTable');
  if (!canvas) return;

  if (!features || features.length === 0) {
    canvas.parentElement.innerHTML = '<p class="text-text-soft text-sm text-center py-4">Inga feature-händelser ännu</p>';
    return;
  }

  const sorted = [...features].sort((a, b) => b.total_uses - a.total_uses);
  const colors = ['#F5A623', '#1B2340', '#10B981', '#6366F1'];
  const useHorizontal = sorted.length > 6;
  const wrap = canvas.parentElement;
  if (wrap) {
    wrap.classList.toggle('analytics-chart-wrap--tall', !useHorizontal);
    wrap.style.height = useHorizontal ? `${Math.min(520, 56 + sorted.length * 28)}px` : '';
    wrap.style.maxHeight = useHorizontal ? `${Math.min(520, 56 + sorted.length * 28)}px` : '';
  }

  destroyChart('featureChart');
  chartInstances['featureChart'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(f => f.label),
      datasets: [
        { label: 'Händelser totalt', data: sorted.map(f => f.total_uses), backgroundColor: colors, borderRadius: 6, borderSkipped: false },
        { label: 'Unika familjer',   data: sorted.map(f => f.unique_families), backgroundColor: colors.map(c => c + '60'), borderRadius: 6, borderSkipped: false },
      ],
    },
    options: {
      indexAxis: useHorizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: useHorizontal
        ? {
            x: { beginAtZero: true, ticks: { precision: 0 } },
            y: { ticks: { autoSkip: false, font: { size: 11 } } },
          }
        : {
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
    },
  });

  if (tableEl) {
    tableEl.innerHTML = `
      <table class="w-full text-sm border-collapse">
        <thead><tr class="text-left text-text-soft border-b border-sky">
          <th class="pb-2 font-semibold">Funktion</th>
          <th class="pb-2 font-semibold text-right">Händelser</th>
          <th class="pb-2 font-semibold text-right">Familjer</th>
        </tr></thead>
        <tbody>
          ${sorted.map(f => `
            <tr class="border-b border-sky/50">
              <td class="py-2">${f.label}</td>
              <td class="py-2 text-right font-semibold">${f.total_uses.toLocaleString('sv-SE')}</td>
              <td class="py-2 text-right text-text-soft">${f.unique_families}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }
}

// ─── Family Dynamics (Case C) ─────────────────────────────

function renderDynamicsParentTable(breakdown) {
  const tbody = document.getElementById('dynamicsParentTable');
  if (!tbody || !breakdown || breakdown.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-text-soft py-4">Ingen data ännu</td></tr>';
    return;
  }
  tbody.innerHTML = breakdown.map(r => `
    <tr class="border-b border-sky/50">
      <td class="py-2 pr-4 font-semibold text-navy">${r.parent_count === 1 ? '1 förälder' : `${r.parent_count}+ föräldrar`}</td>
      <td class="py-2 pr-4 text-right">${r.family_count}</td>
      <td class="py-2 pr-4 text-right font-semibold">${r.avg_active_days.toFixed(1)}</td>
      <td class="py-2 text-right">${r.avg_events.toFixed(0)}</td>
    </tr>
  `).join('');
}

function renderDynamicsComparison(comp) {
  const el1 = document.getElementById('dynamics1ParentDays');
  const el2 = document.getElementById('dynamicsMultiParentDays');
  const elDelta = document.getElementById('dynamicsDelta');
  const elBar = document.getElementById('dynamicsDeltaBar');

  if (el1) el1.textContent = comp.single_parent_avg_active_days + ' d';
  if (el2) el2.textContent = comp.multi_parent_avg_active_days + ' d';

  if (comp.engagement_delta_pct !== null) {
    const sign = comp.engagement_delta_pct >= 0 ? '+' : '';
    if (elDelta) elDelta.textContent = `${sign}${comp.engagement_delta_pct}% mer aktiva`;
    if (elBar) {
      const pct = Math.max(5, Math.min(95, (comp.engagement_delta_pct + 100) / 2));
      elBar.style.width = pct + '%';
      elBar.style.backgroundColor = comp.multi_parent_more_engaged ? '#10B981' : '#EF4444';
    }
  }
}

function renderHeatmap(data) {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;

  // Find max value for color scaling
  let maxVal = 1;
  data.rows.forEach(r => { r.hours.forEach(v => { if (v > maxVal) maxVal = v; }); });

  // Build grid: columns = hours, rows = days
  // Header row: hour labels
  let html = '<div class="flex flex-col gap-0.5">';

  // Hour label row
  html += '<div class="flex gap-0.5 mb-1">';
  html += '<div class="w-8"></div>'; // spacer for day label
  for (let h = 0; h < 24; h++) {
    html += `<div class="w-5 text-center text-xs text-text-soft" style="min-width:20px">${h}</div>`;
  }
  html += '</div>';

  // Data rows
  data.rows.forEach(row => {
    html += '<div class="flex gap-0.5 items-center">';
    html += `<div class="w-8 text-xs text-text-soft font-semibold text-right pr-1">${row.day}</div>`;
    row.hours.forEach(val => {
      const intensity = maxVal > 1 ? Math.round((val / maxVal) * 10) / 10 : 0;
      const alpha = 0.1 + intensity * 0.9;
      const r = Math.round(245 * (1 - intensity) + 239 * intensity);
      const g = Math.round(166 * (1 - intensity) + 68 * intensity);
      const b = Math.round(35 * (1 - intensity) + 68 * intensity);
      const bg = `rgba(${r},${g},${b},${alpha})`;
      html += `<div class="w-5 h-5 rounded-sm cursor-default transition-all hover:ring-2 hover:ring-gold flex items-center justify-center text-xs"
               style="min-width:20px;background:${bg}"
               title="${row.day} ${val.toLocaleString('sv-SE')} händelser"
               data-toggle="tooltip"></div>`;
    });
    html += '</div>';
  });
  html += '</div>';

  container.innerHTML = html;

  // Peak hour label
  const peakEl = document.getElementById('heatmapPeak');
  if (peakEl) {
    const h = data.peak_hour;
    peakEl.textContent = `${h}:00–${h}:59`;
  }

  // Legend swatches
  const legendEl = document.getElementById('heatmapLegend');
  if (legendEl) {
    const steps = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    legendEl.innerHTML = steps.map(s => {
      const alpha = 0.1 + s * 0.9;
      const r = Math.round(245 * (1 - s) + 239 * s);
      const g = Math.round(166 * (1 - s) + 68 * s);
      const b = Math.round(35 * (1 - s) + 68 * s);
      return `<div style="width:16px;height:12px;background:rgba(${r},${g},${b},${alpha});border-radius:2px"></div>`;
    }).join('');
  }
}

// ─── Warning Flags (Case D) ────────────────────────────────

async function loadWarnings() {
  if (document.getElementById('droppedFamilies').dataset.loaded) return;
  try {
    const [warningsRes] = await Promise.all([
      fetch('/api/admin/analytics/warnings').then(r => r.json()),
    ]);

    renderWarningFlags(warningsRes);
    document.getElementById('droppedFamilies').dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadWarnings error:', err);
  }
}

function renderWarningFlags(data) {
  // Churn trend chart
  const canvas = document.getElementById('churnTrendChart');
  if (canvas && data.churn_trend && data.churn_trend.length > 0) {
    destroyChart('churnTrendChart');
    chartInstances['churnTrendChart'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.churn_trend.map(w => {
          const d = new Date(w.week_start);
          return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          label: 'Tappade familjer',
          data: data.churn_trend.map(w => w.dropped_count),
          borderColor: '#EF4444',
          backgroundColor: '#EF444420',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { ticks: { maxTicksLimit: 8, font: { size: 11 } } },
        },
      },
    });
  }

  // Ghost families
  const ghostEl = document.getElementById('ghostFamilies');
  if (ghostEl) {
    if (!data.ghost || data.ghost.length === 0) {
      ghostEl.innerHTML = '<p class="text-green-600 text-sm font-semibold text-center py-4">✅ Inga ghost families!</p>';
    } else {
      ghostEl.innerHTML = data.ghost.slice(0, 20).map(f => {
        const regDate = new Date(f.registered_at).toLocaleDateString('sv-SE');
        return `
          <div class="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <div class="flex items-center gap-2">
              <span class="text-red-400">👻</span>
              <span class="font-semibold text-navy text-sm">${esc(f.family_name || 'Okänd')}</span>
            </div>
            <span class="text-xs text-text-soft">Reg. ${regDate}</span>
          </div>`;
      }).join('');
      if (data.ghost.length > 20) {
        ghostEl.innerHTML += `<p class="text-xs text-text-soft text-center pt-2">+${data.ghost.length - 20} till...</p>`;
      }
    }
  }

  // Dropped families table
  const droppedEl = document.getElementById('droppedFamilies');
  if (droppedEl) {
    if (!data.dropped || data.dropped.length === 0) {
      droppedEl.innerHTML = '<tr><td colspan="3" class="text-center text-green-600 font-semibold py-4">✅ Inga familjer med tappat engagemang!</td></tr>';
    } else {
      droppedEl.innerHTML = data.dropped.slice(0, 30).map(f => {
        const lastDate = f.last_activity_at
          ? new Date(f.last_activity_at).toLocaleDateString('sv-SE')
          : 'Aldrig';
        const rowClass = f.days_inactive >= 7 ? 'bg-red-50' : f.days_inactive >= 4 ? 'bg-yellow-50' : '';
        return `
          <tr class="border-b border-sky/50 ${rowClass}">
            <td class="py-2 pr-4 font-semibold text-navy text-sm">${esc(f.family_name || 'Okänd')}</td>
            <td class="py-2 pr-4 text-text-soft text-sm">${lastDate}</td>
            <td class="py-2 text-right">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                ${f.days_inactive >= 7 ? 'bg-red-100 text-red-700' : f.days_inactive >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}">
                ${f.days_inactive} d
              </span>
            </td>
          </tr>`;
      }).join('');
    }
  }
}

// ─── Retention Cohort (Case 3) ───────────────────────────

function renderRetentionCohort(data) {
  // Summary cards
  const summaryEl = document.getElementById('retentionSummary');
  if (summaryEl) {
    const s = data.summary;
    summaryEl.innerHTML = [
      { label: 'Wk 1', val: s.avg_week_1_retention },
      { label: 'Wk 2', val: s.avg_week_2_retention },
      { label: 'Wk 4', val: s.avg_week_4_retention },
      { label: 'Mån 2', val: s.avg_month_2_retention },
      { label: 'Mån 3', val: s.avg_month_3_retention },
    ].map(item => {
      const pct = item.val;
      const color = pct === null ? 'lavender' : pct >= 60 ? 'mint' : pct >= 30 ? 'gold-light' : 'coral';
      return `
        <div class="bg-${color} rounded-2xl p-4 border-2 border-${color} text-center">
          <p class="text-xs font-semibold text-text-soft mb-1">${item.label}</p>
          <p class="text-2xl font-heading font-bold text-navy">${pct !== null ? pct + '%' : '—'}</p>
          <p class="text-xs text-text-soft">snitt</p>
        </div>`;
    }).join('');
  }

  // Cohort table
  const tbody = document.getElementById('cohortTableBody');
  if (!tbody) return;

  if (!data.cohorts || data.cohorts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-text-soft py-8">Inga kohorter ännu</td></tr>';
    return;
  }

  tbody.innerHTML = data.cohorts.map(cohort => {
    const weekLabel = new Date(cohort.cohort_week).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
    return `
      <tr class="border-b border-sky/50">
        <td class="py-2 pr-4 font-semibold text-navy text-sm">${weekLabel}</td>
        ${renderCohortCell(cohort.week_0)}
        ${renderCohortCell(cohort.week_1)}
        ${renderCohortCell(cohort.week_2)}
        ${renderCohortCell(cohort.week_4)}
        ${renderCohortCell(cohort.month_2)}
        ${renderCohortCell(cohort.month_3)}
      </tr>`;
  }).join('');
}

function renderCohortCell(cell) {
  if (!cell) return '<td class="py-2 text-center text-text-soft text-xs">—</td>';
  const pct = cell.retention_pct;
  const color = pct >= 60 ? 'bg-green-100 text-green-700' : pct >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return `<td class="py-2 text-center">
    <span class="inline-flex flex-col items-center px-2 py-1 rounded-lg ${color}">
      <span class="text-xs font-bold">${pct}%</span>
      <span class="text-xs opacity-70">${cell.active_count}/${cell.cohort_size}</span>
    </span>
  </td>`;
}

// ─── Newsletter Effect (Case 5) ────────────────────────────

function renderNewsletterEffect(data) {
  // Latest effect summary
  if (data.dispatches && data.dispatches.length > 0) {
    const latest = data.dispatches[0];
    const elTitle = document.getElementById('newsletterLastTitle');
    const elRecipients = document.getElementById('newsletterLastRecipients');
    const elLift = document.getElementById('newsletterLastLift');
    if (elTitle) elTitle.textContent = latest.title || '—';
    if (elRecipients) elRecipients.textContent = `${latest.recipients.toLocaleString('sv-SE')} mottagare`;
    if (elLift) {
      if (latest.lift_pct > 0) {
        elLift.textContent = `📈 +${latest.lift_pct}% aktivitetslyft`;
        elLift.className = 'text-sm font-bold text-green-700';
      } else if (latest.lift_pct < 0) {
        elLift.textContent = `📉 ${latest.lift_pct}% minskning`;
        elLift.className = 'text-sm font-bold text-red-700';
      } else {
        elLift.textContent = '➡️ Ingen förändring';
        elLift.className = 'text-sm font-bold text-text-soft';
      }
    }
  } else {
    const el = document.getElementById('newsletterLastTitle');
    if (el) el.textContent = 'Inga utskick ännu';
  }

  // Per-dispatch table
  const tbody = document.getElementById('newsletterTableBody');
  if (!tbody) return;

  if (!data.dispatches || data.dispatches.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-text-soft py-8">Inga utskick ännu</td></tr>';
    return;
  }

  tbody.innerHTML = data.dispatches.map(d => {
    const date = d.email_sent_at
      ? new Date(d.email_sent_at).toLocaleDateString('sv-SE')
      : '—';
    const liftClass = d.lift_pct > 0 ? 'text-green-700 font-bold' : d.lift_pct < 0 ? 'text-red-700 font-bold' : 'text-text-soft';
    const liftText = d.lift_pct > 0 ? `+${d.lift_pct}%` : d.lift_pct < 0 ? `${d.lift_pct}%` : '0%';
    return `
      <tr class="border-b border-sky/50">
        <td class="py-2 pr-4 text-text-soft text-sm">${date}</td>
        <td class="py-2 pr-4 font-semibold text-navy text-sm">${esc(d.title || '—')}</td>
        <td class="py-2 pr-4 text-right text-sm">${d.recipients.toLocaleString('sv-SE')}</td>
        <td class="py-2 pr-4 text-right text-sm">${d.active_after}</td>
        <td class="py-2 pr-4 text-right text-text-soft text-sm">${d.daily_avg > 0 ? Math.round(d.daily_avg * 10) / 10 : '—'}</td>
        <td class="py-2 text-right ${liftClass}">${liftText}</td>
      </tr>`;
  }).join('');
}

// ─── Chart lifecycle ──────────────────────────────────────

function destroyChart(id) {
  if (chartInstances[id]) {
    try { chartInstances[id].destroy(); } catch (_) {}
    delete chartInstances[id];
  }
}

// ─── Manual snapshot trigger ──────────────────────────────

async function triggerSnapshot() {
  try {
    const csrfToken = Auth.getCsrfToken();
    const r = await fetch('/api/admin/analytics/snapshot', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': csrfToken || '' },
    });
    const data = await r.json();
    if (data.success) {
      showToast('Snapshot sparad för ' + data.date, 'success');
      await switchTab(activeTab);
    } else {
      showToast('Kunde inte spara snapshot', 'error');
    }
  } catch (err) {
    showToast('Fel: ' + err.message, 'error');
  }
}

function showToast(msg, type) {
  if (typeof window.showToast === 'function') window.showToast(msg, type);
  else alert(msg);
}

async function loadActivationFunnel() {
  const head = document.getElementById('activationFunnelHead');
  const body = document.getElementById('activationFunnelBody');
  if (!head || !body || body.dataset.loaded === 'true') return;
  try {
    const data = await Auth.api('/api/admin/analytics/activation-funnel?weeks=8');
    const steps = data.steps || [];
    head.innerHTML = '<tr><th class="text-left pb-2 pr-4">Vecka</th>' +
      steps.map(function (s) { return '<th class="text-right pb-2 px-2 whitespace-nowrap">' + esc(s.label) + '</th>'; }).join('') +
      '</tr>';
    if (!data.cohorts || data.cohorts.length === 0) {
      body.innerHTML = '<tr><td colspan="' + (steps.length + 1) + '" class="text-center text-text-soft py-6">Ingen kohortdata ännu</td></tr>';
    } else {
      body.innerHTML = data.cohorts.map(function (row) {
        var week = row.cohort_week ? String(row.cohort_week).slice(0, 10) : '—';
        var cells = steps.map(function (s) {
          var n = (row.counts && row.counts[s.key]) || 0;
          var pct = (row.rates && row.rates[s.key]) || 0;
          return '<td class="text-right px-2 py-2 tabular-nums">' + n + '<span class="text-text-soft text-xs"> (' + pct + '%)</span></td>';
        }).join('');
        return '<tr class="border-t border-sky"><td class="py-2 pr-4 font-medium">' + esc(week) + '</td>' + cells + '</tr>';
      }).join('');
    }

    var diagEl = document.getElementById('activationChildAccessDiag');
    if (diagEl && data.childAccessDiagnostics) {
      var diag = data.childAccessDiagnostics;
      var items = (diag.metrics || []).map(function (m) {
        var n = (diag.counts && diag.counts[m.key]) || 0;
        return '<span class="inline-flex items-center gap-1 mr-4 mb-1"><span class="text-text-soft">' +
          esc(m.label) + ':</span> <strong class="tabular-nums">' + n + '</strong></span>';
      }).join('');
      diagEl.innerHTML = '<p class="text-xs text-text-soft uppercase tracking-wide font-semibold mb-2">Child access — diagnostik (sub-metrics)</p>' + items;
      diagEl.classList.remove('hidden');
    }

    body.dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadActivationFunnel error:', err);
    body.innerHTML = '<tr><td class="text-red-500 py-4">Kunde inte ladda aktiveringstratt</td></tr>';
  }
}

async function loadActivationExperiment() {
  var head = document.getElementById('activationExperimentHead');
  var body = document.getElementById('activationExperimentBody');
  var foot = document.getElementById('activationExperimentFoot');
  if (!head || !body || body.dataset.loaded === 'true') return;
  try {
    var data = await Auth.api('/api/admin/analytics/activation-experiment?weeks=8');
    var variants = data.variants || [];
    head.innerHTML = '<tr><th class="text-left pb-2 pr-4">Vecka</th>' +
      variants.map(function (v) {
        return '<th class="text-right pb-2 px-2 whitespace-nowrap">' + esc(v.label) + '</th>';
      }).join('') + '</tr>';

    if (!data.cohorts || data.cohorts.length === 0) {
      body.innerHTML = '<tr><td colspan="' + (variants.length + 1) + '" class="text-center text-text-soft py-6">Ingen variantdata ännu</td></tr>';
    } else {
      body.innerHTML = data.cohorts.map(function (row) {
        var week = row.cohort_week ? String(row.cohort_week).slice(0, 10) : '—';
        var cells = variants.map(function (v) {
          var bucket = (row.variants && row.variants[v.key]) || { signups: 0, p0_48h: 0, rate_48h: 0 };
          if (!bucket.signups) return '<td class="text-right px-2 py-2 text-text-soft">—</td>';
          return '<td class="text-right px-2 py-2 tabular-nums">' +
            bucket.rate_48h + '%<span class="text-text-soft text-xs"> (' + bucket.p0_48h + '/' + bucket.signups + ')</span></td>';
        }).join('');
        return '<tr class="border-t border-sky"><td class="py-2 pr-4 font-medium">' + esc(week) + '</td>' + cells + '</tr>';
      }).join('');
    }

    if (foot && data.totals) {
      var totalCells = variants.map(function (v) {
        var t = data.totals[v.key] || { signups: 0, p0_48h: 0, rate_48h: 0 };
        if (!t.signups) return '<td class="text-right px-2 py-2 text-text-soft">—</td>';
        return '<td class="text-right px-2 py-2 tabular-nums font-bold">' +
          t.rate_48h + '%<span class="text-text-soft text-xs font-normal"> (' + t.p0_48h + '/' + t.signups + ')</span></td>';
      }).join('');
      foot.innerHTML = '<tr class="border-t-2 border-navy bg-sky/30"><td class="py-2 pr-4 font-bold">Totalt</td>' + totalCells + '</tr>';
    }

    var verdictEl = document.getElementById('activationExperimentVerdict');
    if (verdictEl && data.verdict) {
      var v = data.verdict;
      var color = v.status === 'promote_ai' ? 'text-green-700' :
        v.status === 'keep_template_only' ? 'text-navy' : 'text-text-soft';
      verdictEl.className = 'mt-4 text-sm font-medium ' + color;
      verdictEl.textContent = 'Go/no-go: ' + v.message;
      verdictEl.classList.remove('hidden');
    }

    body.dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadActivationExperiment error:', err);
    body.innerHTML = '<tr><td class="text-red-500 py-4">Kunde inte ladda experimentdata</td></tr>';
  }
}

async function loadReferralsAdmin() {
  var body = document.getElementById('referralsAdminBody');
  if (!body || body.dataset.loaded === 'true') return;
  try {
    var data = await Auth.api('/api/admin/referrals');
    var rows = data.referrals || [];
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-center text-text-soft py-6">Inga värvningskoder ännu</td></tr>';
    } else {
      body.innerHTML = rows.map(function (row) {
        var last = row.last_signup_at
          ? new Date(row.last_signup_at).toLocaleDateString('sv-SE')
          : '—';
        return '<tr class="border-t border-sky">' +
          '<td class="py-2 pr-4 font-mono font-semibold">' + esc(row.code) + '</td>' +
          '<td class="py-2 pr-4">' + esc(row.referrer_name || row.referrer_email || '—') + '</td>' +
          '<td class="text-right py-2 pr-4 tabular-nums">' + (row.shares || 0) + '</td>' +
          '<td class="text-right py-2 pr-4 tabular-nums">' + (row.signups || 0) + '</td>' +
          '<td class="text-right py-2 pr-4 tabular-nums">' + (row.qualified || 0) + '</td>' +
          '<td class="text-right py-2 tabular-nums">' + esc(last) + '</td>' +
          '</tr>';
      }).join('');
    }
    body.dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadReferralsAdmin error:', err);
    body.innerHTML = '<tr><td colspan="6" class="text-red-500 py-4">Kunde inte ladda värvningsdata</td></tr>';
  }
}

// ─── Utility ──────────────────────────────────────────────

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Public API ───────────────────────────────────────────

window.loadAnalytics   = loadAnalytics;
window.triggerSnapshot = triggerSnapshot;
window.loadTrendsData  = loadTrendsData;