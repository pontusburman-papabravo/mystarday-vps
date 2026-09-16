/**
 * Admin analytics module.
 * Owns: Analytics tab with KPI cards, sparklines, funnel, feature charts, heatmap,
 *       warning flags, retention cohort matrix, trend charts, newsletter effect.
 * Does NOT own: any other admin sections or non-analytics API calls.
 */

/* global Chart */

const chartInstances = {};
let activeTab = 'overview';

function syncAnalyticsHistoryWarnings() {
  const warn = window.AdminHistoryWarning;
  if (!warn) return;
  warn.setHistoryLimitedWarning('analyticsFeaturesHistoryWarning', activeTab === 'overview');
  warn.setHistoryLimitedWarning('analyticsHeatmapHistoryWarning', activeTab === 'dynamics');
  warn.setHistoryLimitedWarning('analyticsWarningsHistoryWarning', activeTab === 'warnings');
  warn.setHistoryLimitedWarning('analyticsRetentionHistoryWarning', activeTab === 'retention');
}

function syncTrendsHistoryWarning(days) {
  const warn = window.AdminHistoryWarning;
  if (!warn) return;
  warn.setHistoryLimitedWarning(
    'analyticsTrendsHistoryWarning',
    activeTab === 'trends' && warn.isLongTrendDays(days)
  );
}

// ─── Entry point ──────────────────────────────────────────

async function loadAnalytics() {
  const container = document.getElementById('analyticsContainer');
  if (!container) return;

  if (typeof window.ensureAdminChartJs === 'function') {
    try {
      await window.ensureAdminChartJs();
    } catch (e) {
      console.error('[ANALYTICS] Chart.js load failed', e);
    }
  }

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
  ['dynamics', 'warnings', 'retention', 'trends', 'newsletter'].forEach((_tab) => {
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

  syncAnalyticsHistoryWarnings();

  // Load data for the active tab
  if (tabName === 'overview') await loadOverviewTab();
  else if (tabName === 'dynamics') await loadDynamics();
  else if (tabName === 'warnings') await loadWarnings();
  else if (tabName === 'retention') await loadRetention();
  else if (tabName === 'trends') await loadTrends();
  else if (tabName === 'usage') await loadUsageTab();
  else if (tabName === 'newsletter') await loadNewsletter();
  else if (tabName === 'activation') {
    await loadActivationWeeklyReport();
    await loadReferralsAdmin();
  }
}

// ─── HTML skeleton ────────────────────────────────────────

function buildAnalyticsHTML() {
  return `
    <div class="space-y-6">

      <!-- Tab bar -->
      <div class="flex flex-wrap gap-2 border-b border-sky pb-3">
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy transition-colors cursor-pointer" data-tab="overview">Hur går det?</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="dynamics">Familjer tillsammans</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="warnings">Familjer som fastnar</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="retention">Kommer de tillbaka?</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="trends">Utveckling över tid</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="usage">Inloggning och enheter</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="newsletter">Nyhetsbrev</button>
        <button class="analytics-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors cursor-pointer" data-tab="activation">Första veckan</button>
      </div>

      <!-- ── OVERVIEW (Del 1) ──────────────────────────────── -->
      <div id="section-overview" class="analytics-section space-y-8">

        <div id="journeyRolloutPanel"></div>

        <div class="bg-sky rounded-2xl border border-sky p-5">
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Börja här</h3>
          <p class="text-sm text-text-soft">Korten med aktiva familjer och stjärnor kommer från inloggningar och avbockningar. Tratten, hemskärmen och “kommer de tillbaka” bygger på händelselogg — den är kort efter serverbyte, så lita inte på tapp mellan steg eller månader utan att läsa förklaringen under siffran.</p>
        </div>

        <!-- KPI Cards -->
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Läget just nu</h3>
          <p class="text-text-soft text-sm mb-4">Samma tal varje dag, så du ser om det går upp eller ner. Den lilla linjen är de senaste två veckorna.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="kpiCards"></div>
        </div>

        <!-- Funnel -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Från besökare till första barnet</h3>
          <p class="text-text-soft text-sm mb-4">Landning räknas bara när besöket spårats — ofta lägre än verkliga besök. De tre sista stegen kommer från samma källa (spårning eller hela databasen), så du kan jämföra tapp där. Jämför inte landning med de andra stegen.</p>
          <div class="analytics-chart-wrap analytics-chart-wrap--tall"><canvas id="funnelChart"></canvas></div>
        </div>

        <!-- Feature popularity -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <div id="analyticsFeaturesHistoryWarning" class="hidden mb-4"></div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Vad familjerna använder</h3>
          <p class="text-text-soft text-sm mb-4">Hur ofta varje del av appen använts senaste 30 dagarna. Mörkare stapel = fler gånger, ljusare = hur många olika familjer.</p>
          <div class="analytics-chart-wrap analytics-chart-wrap--tall"><canvas id="featureChart"></canvas></div>
          <div id="featureTable" class="mt-4"></div>
        </div>

        <details class="bg-white rounded-2xl border border-sky p-5">
          <summary class="cursor-pointer text-sm font-semibold text-navy">Vad betyder orden?</summary>
          <dl class="mt-3 space-y-3 text-sm">
            <div><dt class="font-semibold text-navy">Aktiv familj</dt><dd class="text-text-soft">Någon i familjen har loggat in, bockat av en aktivitet, eller appen har sparat en händelse under perioden (rullande 24 timmar / 7 dagar — inte kalenderdygn).</dd></div>
            <div><dt class="font-semibold text-navy">Första lyckade dagen</dt><dd class="text-text-soft">Familjen har lagt till barn, har ett schema, barnet har bockat av och fått en stjärna. Det är måttet på att de kommit igång på riktigt.</dd></div>
            <div><dt class="font-semibold text-navy">Appen på hemskärmen</dt><dd class="text-text-soft">Familjen har lagt till webappen som en ikon (PWA). Inte samma sak som App Store-appen.</dd></div>
            <div><dt class="font-semibold text-navy">Sparad telefon</dt><dd class="text-text-soft">Barnet eller föräldern kommer in utan att skriva PIN/lösenord varje gång.</dd></div>
            <div><dt class="font-semibold text-navy">Startvecka</dt><dd class="text-text-soft">Alla familjer som registrerade sig samma vecka, följda över tid. Visar om de kommer tillbaka.</dd></div>
          </dl>
        </details>
      </div>

      <!-- ── FAMILY DYNAMICS (Case C) ───────────────────── -->
      <div id="section-dynamics" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Familjer tillsammans</h3>
          <p class="text-text-soft text-sm mb-6">Blir familjen mer aktiv när båda föräldrarna är med? Och när på dygnet används appen?</p>
        </div>

        <!-- Multi-parent breakdown -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">En eller två föräldrar</h4>
          <p class="text-text-soft text-xs mb-4">Jämför familjer med en inloggad förälder mot familjer där båda är med. Fler aktiva dagar = de öppnar appen oftare.</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm mb-6">
              <thead>
                <tr class="border-b border-sky text-left text-text-soft text-xs font-semibold uppercase tracking-wide">
                  <th class="pb-2 pr-4">Föräldrar</th>
                  <th class="pb-2 pr-4 text-right">Familjer</th>
                  <th class="pb-2 pr-4 text-right">Snitt aktiva dagar (30d)</th>
                  <th class="pb-2 text-right">Snitt saker gjorda / familj (30d)</th>
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
          <div id="analyticsHeatmapHistoryWarning" class="hidden mb-4"></div>
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="text-base font-heading font-bold text-navy">När används appen?</h4>
              <p class="text-text-soft text-xs mt-1">Timme × veckodag i svensk tid (senaste 30 dagarna). Mörkare = fler sparade händelser, inte avbockningar.</p>
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
            💡 Mörkare rutor = fler sparade händelser i svensk tid. Använd topptimmen om du ska skicka en påminnelse.
          </p>
        </div>
      </div>

      <!-- ── WARNING FLAGS (Case D) ─────────────────────── -->
      <div id="section-warnings" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Familjer som fastnar</h3>
          <p class="text-text-soft text-sm mb-6">Listorna bygger på händelseloggen, inte på avbockningar. Äldre familjer utan spårning syns inte som “aldrig öppnat barnvyn”, och kan se ut som tystnade efter serverbyte.</p>
          <div id="analyticsWarningsHistoryWarning" class="hidden mb-4"></div>
        </div>

        <!-- Weekly churn trend -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Hur många tystnar per vecka</h4>
          <p class="text-text-soft text-xs mb-4">Familjer som slutat använda appen veckan innan. En stigande linje betyder att fler tappar bort sig.</p>
          <div class="analytics-chart-wrap analytics-chart-wrap--compact"><canvas id="churnTrendChart"></canvas></div>
        </div>

        <!-- Ghost families -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Konto skapat — barnvyn aldrig öppnad</h4>
          <p class="text-text-soft text-xs mb-4">Bara familjer där registreringshändelsen finns. Äldre konton utan den händelsen syns inte här — tom lista betyder inte att alla kommit igång.</p>
          <div id="ghostFamilies" class="space-y-2 max-h-64 overflow-y-auto">
            <p class="text-text-soft text-sm text-center py-4">Laddar...</p>
          </div>
        </div>

        <!-- Dropped families -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Tystnade familjer</h4>
          <p class="text-text-soft text-xs mb-4">Ingen händelse i loggen på 3 dygn. Avbockning utan sparad händelse räknas inte. Efter serverbyte kan många äldre familjer hamna här.</p>
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
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Kommer de tillbaka?</h3>
          <p class="text-text-soft text-sm mb-6">Varje rad är familjer som registrerade sig samma vecka. Procenten visar hur många som fortfarande gjorde något i appen vecka 1, 2, 4 och senare. En aktiv familj = minst en sak gjord den veckan.</p>
          <div id="analyticsRetentionHistoryWarning" class="hidden mb-4"></div>
        </div>

        <!-- Summary stats -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3" id="retentionSummary"></div>

        <!-- Cohort matrix -->
        <div class="bg-white rounded-2xl border border-sky p-6">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" id="cohortTable">
              <thead>
                <tr class="border-b border-sky text-left text-text-soft text-xs font-semibold uppercase tracking-wide">
                  <th class="pb-2 pr-4">Startvecka</th>
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
            Grön: mer än 60 % kommer tillbaka. Gul: 30–60 %. Röd: under 30 %. Streck = för få familjer den veckan.
          </p>
        </div>
      </div>

      <!-- ── USAGE (person-level observability) ───────────── -->
      <div id="section-usage" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Inloggning och enheter</h3>
          <p class="text-text-soft text-sm mb-2">
            Vem som faktiskt varit inne — inte samma sak som hur många gånger någon skrev lösenord.
            Om telefonen är sparad räknas det som ett besök, inte som en ny inloggning.
          </p>
        </div>

        <div class="flex flex-wrap gap-2" id="usagePeriodBtns">
          <button type="button" data-period="24h" class="usage-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy transition-colors">24 timmar</button>
          <button type="button" data-period="7d" class="usage-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors">7 dagar</button>
          <button type="button" data-period="30d" class="usage-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors">30 dagar</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="usageKpiCards">
          <p class="text-text-soft text-sm col-span-full">Laddar siffror…</p>
        </div>

        <div class="bg-white rounded-2xl border border-sky p-6 space-y-6">
          <div>
            <h4 class="text-base font-heading font-bold text-navy mb-1">Sparad telefon</h4>
            <p class="text-text-soft text-xs">Hur många som kommer in utan att skriva PIN/lösenord varje gång. Siffrorna i samma period betyder inte att A orsakade B.</p>
          </div>
          <div id="trustedDeviceImpactHeadlines" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <p class="text-text-soft text-sm col-span-full">Laddar…</p>
          </div>
          <div id="trustedDeviceWeekComparison" class="space-y-3 hidden">
            <p class="text-xs font-semibold text-navy uppercase tracking-wide">Senaste 7 dagarna mot veckan innan</p>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" id="trustedDeviceWeekComparisonPanels"></div>
          </div>
          <div id="trustedDeviceImpactCohorts" class="grid grid-cols-1 lg:grid-cols-2 gap-4 hidden"></div>
          <details class="rounded-2xl border border-sky/60 bg-lavender/20 p-4">
            <summary class="cursor-pointer text-xs font-semibold text-navy uppercase tracking-wide">Mer detaljer — enheter, läge och besök</summary>
            <div class="space-y-6 mt-4">
              <div>
                <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-3">Just nu</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="trustedDeviceStockCards">
                  <p class="text-text-soft text-sm col-span-full">Laddar…</p>
                </div>
              </div>
              <div>
                <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-3">Sparade telefoner per vy</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" id="trustedDeviceModeStockCards">
                  <p class="text-text-soft text-sm col-span-full">Laddar…</p>
                </div>
              </div>
              <div>
                <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-3">Besök i perioden</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="trustedDeviceActivityCards">
                  <p class="text-text-soft text-sm col-span-full">Laddar…</p>
                </div>
              </div>
              <div>
                <p class="text-xs font-semibold text-navy uppercase tracking-wide mb-3">Besök per vy</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" id="trustedDeviceModeSessionCards">
                  <p class="text-text-soft text-sm col-span-full">Laddar…</p>
                </div>
              </div>
            </div>
          </details>
        </div>

        <div class="bg-white rounded-2xl border border-sky p-6">
          <h4 class="text-base font-heading font-bold text-navy mb-1">Trend — vem som varit inne</h4>
          <p class="text-text-soft text-xs mb-4">En person räknas max en gång per dag. Inloggningar med lösenord/PIN visas separat.</p>
          <div class="analytics-chart-wrap analytics-chart-wrap--tall"><canvas id="usageTrendChart"></canvas></div>
        </div>
      </div>

      <!-- ── HISTORICAL TRENDS (Case 4) ─────────────────── -->
      <div id="section-trends" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Utveckling över tid</h3>
          <p class="text-text-soft text-sm mb-6">Samma siffror som korten, utritade dag för dag. Välj period ovanför graferna.</p>
          <div id="analyticsTrendsHistoryWarning" class="hidden mb-4"></div>
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
            <h4 class="text-base font-heading font-bold text-navy mb-1">Aktiva familjer senaste dygnet</h4>
            <p class="text-xs text-text-soft mb-3">Familjer med inloggning, avbockning eller händelse senaste 24 timmarna, per dag.</p>
            <div class="analytics-chart-wrap"><canvas id="trendActiveFamilies"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-1">Aktiva familjer senaste veckan</h4>
            <p class="text-xs text-text-soft mb-3">Familjer som gjorde något senaste 7 dagarna, per dag.</p>
            <div class="analytics-chart-wrap"><canvas id="trendActiveFamilies7d"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-1">Stjärnor utdelade</h4>
            <p class="text-xs text-text-soft mb-3">Totalt antal stjärnor från avbockade aktiviteter.</p>
            <div class="analytics-chart-wrap"><canvas id="trendStars"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-1">Andel som lagt till barn</h4>
            <p class="text-xs text-text-soft mb-3">Av dem som började registrera sig, hur många som skapade första barnet. Samma källa i täljare och nämnare.</p>
            <div class="analytics-chart-wrap"><canvas id="trendConversion"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-1">Appen på hemskärmen</h4>
            <p class="text-xs text-text-soft mb-3">Hur många som lagt till webappen som ikon. Inte App Store.</p>
            <div class="analytics-chart-wrap"><canvas id="trendPwa"></canvas></div>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-6">
            <h4 class="text-base font-heading font-bold text-navy mb-1">Nyhetsbrevsprenumeranter</h4>
            <p class="text-xs text-text-soft mb-3">Aktiva mejladresser som vill ha nyhetsbrev.</p>
            <div class="analytics-chart-wrap"><canvas id="trendNewsletter"></canvas></div>
          </div>
        </div>
      </div>

      <!-- ── NEWSLETTER EFFECT (Case 5) ──────────────────── -->
      <div id="section-newsletter" class="analytics-section hidden space-y-8">
        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Gjorde nyhetsbrevet att fler öppnade appen?</h3>
          <p class="text-text-soft text-sm mb-6">Jämför dagen efter utskick med en vanlig dag veckan innan. Plus betyder att fler var aktiva efter mailet.</p>
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
          <h4 class="text-base font-heading font-bold text-navy mb-4">Varje utskick</h4>
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
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Veckorapport aktivering</h3>
          <p class="text-text-soft text-sm mb-4">Tre frågor varje vecka: hur många nya familjer kom igång inom två dygn, var de fastnar, och om det går bättre än förra veckan.</p>
        </div>
        <div id="activationWeeklyReport" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-2xl border border-sky p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-text-soft mb-2">1. Kom igång inom 48 timmar</p>
            <p id="activationQ1Summary" class="text-navy text-sm font-medium">Laddar…</p>
            <p id="activationQ1Detail" class="text-text-soft text-xs mt-2"></p>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-text-soft mb-2">2. Största tappet</p>
            <p id="activationQ2Summary" class="text-navy text-sm font-medium">Laddar…</p>
            <p id="activationQ2Detail" class="text-text-soft text-xs mt-2"></p>
          </div>
          <div class="bg-white rounded-2xl border border-sky p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-text-soft mb-2">3. Går det bättre än förra veckan?</p>
            <p id="activationQ3Summary" class="text-navy text-sm font-medium">Laddar…</p>
            <p id="activationQ3Detail" class="text-text-soft text-xs mt-2"></p>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Första lyckade dagen — First Success-tratt</h3>
          <p class="text-text-soft text-sm mb-4">Familjer som registrerade sig samma vecka, steg för steg: signup → barn → schema → barnåtkomst → första stjärnan → aktivitet dag 2. Siffran i parentes är andel av dem som registrerade sig.</p>
        </div>
        <div class="bg-white rounded-2xl border border-sky p-6 overflow-x-auto">
          <table class="w-full text-sm">
            <thead id="activationFunnelHead">
              <tr><th class="text-left pb-2">Laddar…</th></tr>
            </thead>
            <tbody id="activationFunnelBody"></tbody>
          </table>
          <div id="activationFunnelConversions" class="mt-6 pt-6 border-t border-sky hidden">
            <h4 class="text-sm font-heading font-bold text-navy mb-1">Hur många går vidare till nästa steg</h4>
            <p class="text-text-soft text-xs mb-3">Av dem som klarade förra steget, hur stor andel klarade nästa?</p>
            <table class="w-full text-sm">
              <thead id="activationFunnelConvHead"></thead>
              <tbody id="activationFunnelConvBody"></tbody>
            </table>
          </div>
          <div id="activationChildAccessDiag" class="mt-4 pt-4 border-t border-sky text-sm hidden"></div>
        </div>

        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Kom igång inom 48 timmar — per vecka</h3>
          <p class="text-text-soft text-sm mb-4">Av nya familjer den veckan: hur många hann göra första lyckade dagen inom två dygn.</p>
        </div>
        <div class="bg-white rounded-2xl border border-sky p-6 overflow-x-auto mb-4">
          <table class="w-full text-sm" id="activationP0WeeklyTable">
            <thead>
              <tr>
                <th class="text-left pb-2 pr-4">Vecka</th>
                <th class="text-right pb-2 px-2">Nya familjer</th>
                <th class="text-right pb-2 px-2">Igång inom 48h</th>
                <th class="text-right pb-2">Andel</th>
              </tr>
            </thead>
            <tbody id="activationP0WeeklyBody">
              <tr><td colspan="4" class="text-center text-text-soft py-6">Laddar…</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 class="text-lg font-heading font-bold text-navy mb-1">Värvningar (referral v0)</h3>
          <p class="text-text-soft text-sm mb-4">Personliga koder. Kvalificerad = den värvade familjen har gjort en första lyckad dag. Ingen belöning i den här versionen.</p>
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
  if (typeof window.loadJourneyRolloutPanel === 'function') {
    await window.loadJourneyRolloutPanel();
  }
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
      container.innerHTML = '<p class="text-red-500 text-sm col-span-full">Kunde inte ladda siffrorna: ' + (typeof esc === 'function' ? esc(err.message || 'Okänt fel') : 'fel') + '</p>';
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
  syncTrendsHistoryWarning(days);

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
      { id: 'trendActiveFamilies',   key: 'active_families_24h',           color: '#EF4444', label: 'Aktiva idag' },
      { id: 'trendActiveFamilies7d', key: 'active_families_7d',            color: '#F5A623', label: 'Aktiva senaste veckan' },
      { id: 'trendStars',            key: 'total_stars_given',             color: '#F5A623', label: 'Stjärnor' },
      { id: 'trendConversion',        key: 'conversion_rate',                color: '#10B981', label: 'Andel som lagt till barn %' },
      { id: 'trendPwa',              key: 'pwa_installed_count',           color: '#6366F1', label: 'Appen på hemskärmen' },
      { id: 'trendNewsletter',       key: 'newsletter_subscribers_count',  color: '#1B2340', label: 'Nyhetsbrev' },
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

// ─── Usage tab (person-level observability) ───────────────

let usagePeriod = '24h';
let usageTabInitialized = false;

async function loadUsageTab() {
  if (!usageTabInitialized) {
    usageTabInitialized = true;
    document.querySelectorAll('.usage-period-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        usagePeriod = btn.dataset.period || '24h';
        document.querySelectorAll('.usage-period-btn').forEach((b) => {
          if (b.dataset.period === usagePeriod) {
            b.className = 'usage-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy transition-colors';
          } else {
            b.className = 'usage-period-btn px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky transition-colors';
          }
        });
        loadUsageKpis(usagePeriod);
      });
    });
  }

  await Promise.all([loadUsageKpis(usagePeriod), loadUsageTrendChart()]);
}

async function loadUsageKpis(period) {
  const container = document.getElementById('usageKpiCards');
  const impactContainer = document.getElementById('trustedDeviceImpactHeadlines');
  const weekComparisonRoot = document.getElementById('trustedDeviceWeekComparison');
  const weekComparisonPanels = document.getElementById('trustedDeviceWeekComparisonPanels');
  const cohortContainer = document.getElementById('trustedDeviceImpactCohorts');
  const stockContainer = document.getElementById('trustedDeviceStockCards');
  const modeStockContainer = document.getElementById('trustedDeviceModeStockCards');
  const activityContainer = document.getElementById('trustedDeviceActivityCards');
  const modeSessionContainer = document.getElementById('trustedDeviceModeSessionCards');
  if (!container) return;
  const loading = '<p class="text-text-soft text-sm col-span-full">Laddar…</p>';
  container.innerHTML = loading;
  if (impactContainer) impactContainer.innerHTML = loading;
  if (weekComparisonPanels) weekComparisonPanels.innerHTML = loading;
  if (weekComparisonRoot) weekComparisonRoot.classList.add('hidden');
  if (cohortContainer) {
    cohortContainer.innerHTML = '';
    cohortContainer.classList.add('hidden');
  }
  if (stockContainer) stockContainer.innerHTML = loading;
  if (modeStockContainer) modeStockContainer.innerHTML = loading;
  if (activityContainer) activityContainer.innerHTML = loading;
  if (modeSessionContainer) modeSessionContainer.innerHTML = loading;
  try {
    const kpis = await Auth.api(`/api/admin/analytics/usage?period=${encodeURIComponent(period)}`);
    const periodLabel = { '24h': '24h', '7d': '7d', '30d': '30d' }[period] || period;
    const td = kpis.trusted_devices || {};
    const impact = td.impact || {};
    const modeStock = td.active_by_mode || {};
    const modeSessions = td.sessions_by_mode || {};
    const cards = [
      { icon: '👨‍👩‍👧', title: `Aktiva familjer (${periodLabel})`, value: kpis.active_families, hint: 'Någon i familjen gjorde något i appen.' },
      { icon: '👤', title: `Aktiva personer (${periodLabel})`, value: kpis.active_people, hint: 'Unika föräldrar + barn som varit inne.' },
      { icon: '🧑', title: `Aktiva föräldrar (${periodLabel})`, value: kpis.active_parents },
      { icon: '👶', title: `Aktiva barn (${periodLabel})`, value: kpis.active_children },
      { icon: '📱', title: `Besök via sparad telefon (${periodLabel})`, value: kpis.trusted_device_sessions, hint: 'Kom in utan att skriva PIN eller lösenord.' },
      { icon: '🔐', title: `Inloggningar med PIN/lösenord (${periodLabel})`, value: kpis.classic_authentications, hint: 'Inte samma sak som aktiv användare — många kommer in utan att logga in på nytt.' },
      { icon: '✅', title: `Aktiviteter bockade av (${periodLabel})`, value: kpis.activity_completions },
      { icon: '🧩', title: `Avbockningar från hemskärms-widget (${periodLabel})`, value: kpis.widget_completions, hint: 'Barnet bockade från telefonens startsida, inte inne i appen.' },
    ];
    container.innerHTML = cards.map((c) => renderUsageKpiCard(c)).join('');

    if (impactContainer) {
      const adoption = impact.adoption || {};
      const recurring = impact.recurring || {};
      const outcomes = impact.outcomes || {};
      const friction = impact.friction || {};
      const headlineCards = [
        {
          label: 'Andel med sparad telefon',
          value: fmtPct(adoption.adoption_pct),
          detail: `${adoption.td_families || 0} av ${adoption.active_families || 0} aktiva familjer har minst en sparad telefon (${periodLabel})`,
        },
        {
          label: `Sparad telefon 2+ dagar (${periodLabel})`,
          value: fmtPct(recurring.families_2plus_pct),
          detail: `${recurring.families_2plus_days || 0} familjer kom in via sparad telefon minst två olika dagar`,
        },
        {
          label: `Sparad telefon 3+ dagar (${periodLabel})`,
          value: fmtPct(recurring.families_3plus_pct),
          detail: `${recurring.families_3plus_days || 0} familjer`,
        },
        {
          label: 'Sparad telefon 7+ dagar / 30d',
          value: fmtPct(recurring.families_7plus_pct_30d),
          detail: `${recurring.families_7plus_days_30d || 0} familjer — alltid räknat på 30 dagar`,
        },
        {
          label: `Med sparad telefon + avbockning (${periodLabel})`,
          value: fmtPct(outcomes.td_completion_pct),
          detail: `${outcomes.td_families_with_child_completion || 0} familjer — samma period, inte orsak och verkan`,
        },
        {
          label: `Med sparad telefon + hela dagen klar (${periodLabel})`,
          value: fmtPct(outcomes.td_routine_day_pct),
          detail: `${outcomes.td_families_with_routine_day || 0} familjer — alla schemaposter klara minst en dag`,
        },
        {
          label: `Med sparad telefon + första stjärnan (${periodLabel})`,
          value: fmtPct(outcomes.td_first_star_pct),
          detail: `${outcomes.td_families_with_first_star_signal || 0} familjer`,
        },
        {
          label: `Strul med sparad telefon (${periodLabel})`,
          value: fmtPct(friction.friction_pct_of_td_attempts),
          detail: `${friction.total_events || 0} fel · ${friction.td_sessions || 0} lyckade besök`,
        },
      ];
      impactContainer.innerHTML = headlineCards.map((c) => renderImpactHeadlineCard(c)).join('');
    }

    if (weekComparisonRoot && weekComparisonPanels && impact.week_comparison) {
      weekComparisonRoot.classList.remove('hidden');
      weekComparisonPanels.innerHTML = [
        renderWeekComparisonPanel('Alla familjer', impact.week_comparison.all_families),
        renderWeekComparisonPanel('Nya familjer (registrerade senaste 7 dagarna)', impact.week_comparison.new_families),
      ].join('');
    }

    if (cohortContainer && impact.cohorts) {
      const cohortKey = period === '30d' ? 'by_30d' : 'by_7d';
      const cohort = impact.cohorts[cohortKey];
      if (cohort) {
        cohortContainer.classList.remove('hidden');
        cohortContainer.innerHTML = [
          renderCohortPanel('Nya familjer', cohort.new, period === '30d' ? '≤30 dagar' : '≤7 dagar'),
          renderCohortPanel('Etablerade familjer', cohort.established, period === '30d' ? '>30 dagar' : '>7 dagar'),
        ].join('');
      }
    }

    if (stockContainer) {
      const stockCards = [
        { icon: '👨‍👩‍👧', title: 'Familjer med sparad telefon', value: td.families_enrolled },
        { icon: '📱', title: 'Sparade telefoner totalt', value: td.active_devices },
        { icon: '🚫', title: 'Borttagna telefoner', value: td.revoked_devices },
        { icon: '🔢', title: 'Olika telefoner som använts', value: td.distinct_devices_in_sessions, hint: `Period: ${periodLabel}` },
      ];
      stockContainer.innerHTML = stockCards.map((c) => renderUsageKpiCard(c)).join('');
    }

    if (modeStockContainer) {
      const modeCards = [
        { icon: '🧑', title: 'Föräldervy', value: modeStock.parent },
        { icon: '👶', title: 'Barnvy', value: modeStock.child },
        { icon: '👨‍👩‍👧', title: 'Delad telefon', value: modeStock.shared },
      ];
      modeStockContainer.innerHTML = modeCards.map((c) => renderUsageKpiCard(c)).join('');
    }

    if (activityContainer) {
      const activityCards = [
        { icon: '👁', title: `Telefoner sedda (${periodLabel})`, value: td.devices_seen },
        { icon: '🏠', title: `Familjer med telefon sedd (${periodLabel})`, value: td.families_with_device_seen },
        { icon: '🔄', title: `Familjer som kom in via sparad telefon (${periodLabel})`, value: td.families_with_sessions },
        { icon: '📲', title: `Besök via sparad telefon (${periodLabel})`, value: td.sessions || kpis.trusted_device_sessions },
      ];
      activityContainer.innerHTML = activityCards.map((c) => renderUsageKpiCard(c)).join('');
    }

    if (modeSessionContainer) {
      const sessionModeCards = [
        { icon: '🧑', title: `Besök i föräldervy (${periodLabel})`, value: modeSessions.parent },
        { icon: '👶', title: `Besök i barnvy (${periodLabel})`, value: modeSessions.child },
        { icon: '👨‍👩‍👧', title: `Besök på delad telefon (${periodLabel})`, value: modeSessions.shared },
      ];
      modeSessionContainer.innerHTML = sessionModeCards.map((c) => renderUsageKpiCard(c)).join('');
    }
  } catch (err) {
    console.error('[Analytics] loadUsageKpis error:', err);
    const errHtml = '<p class="text-red-500 text-sm col-span-full">Kunde inte ladda användningssiffror</p>';
    container.innerHTML = errHtml;
    if (impactContainer) impactContainer.innerHTML = errHtml;
    if (stockContainer) stockContainer.innerHTML = errHtml;
    if (modeStockContainer) modeStockContainer.innerHTML = errHtml;
    if (activityContainer) activityContainer.innerHTML = errHtml;
    if (modeSessionContainer) modeSessionContainer.innerHTML = errHtml;
  }
}

function fmtPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Number(value).toLocaleString('sv-SE', { maximumFractionDigits: 1 })}%`;
}

function fmtDelta(deltaPp) {
  if (deltaPp === null || deltaPp === undefined || Number.isNaN(deltaPp)) return '—';
  const rounded = Math.round(Number(deltaPp) * 10) / 10;
  if (rounded > 0) return `↑ ${rounded} pp mot föregående 7d`;
  if (rounded < 0) return `↓ ${Math.abs(rounded)} pp mot föregående 7d`;
  return '→ oförändrat mot föregående 7d';
}

function renderWeekComparisonPanel(title, metrics) {
  const m = metrics || {};
  const rows = [
    ['Aktiva minst 2 dagar', m.active_2plus_days],
    ['Aktiva minst 3 dagar', m.active_3plus_days],
    ['Hela dagen klar', m.routine_day],
  ];
  return `
    <div class="rounded-2xl border border-sky/60 bg-white p-4">
      <p class="text-sm font-heading font-bold text-navy mb-3">${esc(title)}</p>
      <div class="space-y-3">
        ${rows.map(([label, metric]) => {
          const x = metric || {};
          return `<div class="flex flex-col gap-0.5 border-b border-lavender/40 pb-2 last:border-0 last:pb-0">
            <div class="flex justify-between gap-3 text-xs">
              <span class="text-text-soft">${esc(label)}</span>
              <span class="font-semibold text-navy">${esc(fmtPct(x.pct))}</span>
            </div>
            <div class="text-[10px] text-text-soft">${esc(fmtDelta(x.delta_pp))} · ${Number(x.count || 0).toLocaleString('sv-SE')} / ${Number(x.denominator || 0).toLocaleString('sv-SE')}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderImpactHeadlineCard(c) {
  return `
    <div class="rounded-2xl border border-gold/40 bg-gold-light/40 p-4 flex flex-col gap-1 min-h-[88px]">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-text-soft">${esc(c.label)}</span>
      <span class="text-2xl font-heading font-bold text-navy">${esc(c.value)}</span>
      <span class="text-[10px] text-text-soft leading-snug">${esc(c.detail)}</span>
    </div>
  `;
}

function renderCohortPanel(title, data, ageLabel) {
  const d = data || {};
  const rows = [
    ['Aktiva familjer', d.active_families || 0],
    ['Med sparad telefon', d.td_families || 0],
    ['Andel med sparad telefon', fmtPct(d.adoption_pct)],
    ['Sparad telefon 2+ dagar', fmtPct(d.recurring_2plus_pct)],
    ['Med avbockning', fmtPct(d.completion_pct)],
    ['Hela dagen klar', fmtPct(d.routine_day_pct)],
    ['Första stjärnan', fmtPct(d.first_star_pct)],
  ];
  return `
    <div class="rounded-2xl border border-sky/60 bg-white p-4">
      <p class="text-sm font-heading font-bold text-navy">${esc(title)} <span class="text-text-soft font-normal">(${esc(ageLabel)})</span></p>
      <dl class="mt-3 space-y-1">
        ${rows.map(([k, v]) => `<div class="flex justify-between gap-3 text-xs"><dt class="text-text-soft">${esc(k)}</dt><dd class="font-semibold text-navy">${typeof v === 'string' ? esc(v) : Number(v).toLocaleString('sv-SE')}</dd></div>`).join('')}
      </dl>
    </div>
  `;
}

function renderUsageKpiCard(c) {
  return `
      <div class="bg-lavender/30 rounded-2xl border border-sky/60 p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">${c.icon}</span>
          <span class="text-xs font-semibold text-text-soft leading-tight">${esc(c.title)}</span>
        </div>
        <div class="text-2xl font-heading font-bold text-navy">${Number(c.value || 0).toLocaleString('sv-SE')}</div>
        ${c.hint ? `<p class="text-[10px] text-text-soft">${esc(c.hint)}</p>` : ''}
      </div>
    `;
}

async function loadUsageTrendChart() {
  const canvas = document.getElementById('usageTrendChart');
  if (!canvas) return;
  try {
    const data = await Auth.api('/api/admin/analytics/usage-trends?days=14');
    const trends = data.trends || [];
    destroyChart('usageTrendChart');
    chartInstances['usageTrendChart'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: trends.map((t) => String(t.day).slice(5)),
        datasets: [
          {
            label: 'Aktiva personer',
            data: trends.map((t) => t.active_people),
            borderColor: '#1B2340',
            backgroundColor: '#1B234020',
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Föräldrar',
            data: trends.map((t) => t.active_parents),
            borderColor: '#6366F1',
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Barn',
            data: trends.map((t) => t.active_children),
            borderColor: '#10B981',
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Besök via sparad telefon',
            data: trends.map((t) => t.trusted_device_sessions),
            borderColor: '#F5A623',
            borderDash: [4, 4],
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Inloggningar med PIN/lösenord',
            data: trends.map((t) => t.classic_authentications),
            borderColor: '#EF4444',
            borderDash: [2, 2],
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  } catch (err) {
    console.error('[Analytics] loadUsageTrendChart error:', err);
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
    { id: 'kpi-active-24h',  title: 'Familjer som använde appen senaste dygnet', icon: '❤️', value: kpis.active_families_24h, subtext: `${kpis.active_families_7d} senaste 7 dagarna`, meaning: 'Rullande 24 timmar, inte kalenderdygn. Räknas vid inloggning, avbockning eller valfri sparad händelse i appen.', color: '#EF4444', sparkKey: 'active_families_24h' },
    { id: 'kpi-stars',       title: 'Stjärnor som barnen fått',     icon: '⭐', value: kpis.total_stars_given.toLocaleString('sv-SE'), subtext: `${kpis.total_rewards_claimed} inlösta belöningar`, meaning: 'Totalt genom tiderna från avbockade aktiviteter (förälder eller barn). Pålitligast av korten.', color: '#F5A623', sparkKey: 'total_stars_given' },
    { id: 'kpi-conversion',  title: 'Andel som lagt till barn',       icon: '🎯', value: kpis.conversion_rate + '%', subtext: 'Från registrering till första barnet', meaning: 'Samma grupp i täljare och nämnare — antingen spårade händelser eller hela databasen, aldrig blandat.', color: '#10B981', sparkKey: 'conversion_rate' },
    { id: 'kpi-pwa',         title: 'Appen på hemskärmen',       icon: '📱', value: kpis.pwa_installed_count, subtext: `${kpis.pwa_browser_count} öppnade via webbläsare (kan överlappa)`, meaning: 'Bara familjer där webappen sparat händelsen. Inte App Store. Saknas händelse = syns inte.', color: '#6366F1', sparkKey: 'pwa_installed_count' },
    { id: 'kpi-newsletter',  title: 'Vill ha nyhetsbrev', icon: '📧', value: kpis.newsletter_subscribers_count, subtext: 'Mejladresser, inte familjer', meaning: 'Föräldrar med mejl som inte avprenumererat. På som standard — de har inte nödvändigtvis kryssat i själv.', color: '#1B2340', sparkKey: 'newsletter_subscribers_count' },
  ];

  container.innerHTML = cards.map(c => `
    <div class="bg-white rounded-2xl border border-sky p-5 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <span class="text-2xl">${c.icon}</span>
        <span class="text-sm font-semibold text-text-soft">${c.title}</span>
      </div>
      <div class="text-3xl font-heading font-bold text-navy">${c.value}</div>
      <div class="text-xs text-text-soft">${c.subtext}</div>
      ${c.meaning ? `<p class="text-xs text-text-soft leading-snug">${c.meaning}</p>` : ''}
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
    canvas.parentElement.innerHTML = '<p class="text-text-soft text-sm text-center py-4">Ingen användning registrerad ännu</p>';
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
      ghostEl.innerHTML = '<p class="text-text-soft text-sm font-semibold text-center py-4">Inga i den spårade gruppen. Det betyder inte att alla registrerade familjer öppnat barnvyn.</p>';
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
      droppedEl.innerHTML = '<tr><td colspan="3" class="text-center text-green-600 font-semibold py-4">Inga tystnade familjer just nu.</td></tr>';
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
      { label: 'Efter 1 vecka', val: s.avg_week_1_retention },
      { label: 'Efter 2 veckor', val: s.avg_week_2_retention },
      { label: 'Efter 4 veckor', val: s.avg_week_4_retention },
      { label: 'Efter 2 månader', val: s.avg_month_2_retention },
      { label: 'Efter 3 månader', val: s.avg_month_3_retention },
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
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-text-soft py-8">Inga startveckor ännu</td></tr>';
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
      showToast('Dagens lägesbild sparad för ' + data.date, 'success');
      await switchTab(activeTab);
    } else {
      showToast('Kunde inte spara dagens lägesbild', 'error');
    }
  } catch (err) {
    showToast('Fel: ' + err.message, 'error');
  }
}

function showToast(msg, type) {
  if (typeof window.showToast === 'function') window.showToast(msg, type);
  else alert(msg);
}

/** Build conversion column metadata from API steps (adjacent pairs). */
function buildFunnelConversionColumns(steps) {
  const cols = [];
  for (let i = 1; i < steps.length; i++) {
    const from = steps[i - 1];
    const to = steps[i];
    cols.push({
      key: from.key + '_to_' + to.key,
      label: from.label + ' → ' + to.label,
    });
  }
  return cols;
}

async function loadActivationWeeklyReport() {
  const reportRoot = document.getElementById('activationWeeklyReport');
  if (!reportRoot || reportRoot.dataset.loaded === 'true') return;
  try {
    const data = await Auth.api('/api/admin/analytics/activation-weekly-report?weeks=8');
    const q = data.questions || {};

    const q1 = q.activation_48h || {};
    const q1El = document.getElementById('activationQ1Summary');
    const q1Det = document.getElementById('activationQ1Detail');
    if (q1El) q1El.textContent = q1.summary || '—';
    if (q1Det) {
      const week = q1.cohort_week ? String(q1.cohort_week).slice(0, 10) : '—';
      q1Det.textContent = 'Vecka familjerna registrerade sig: ' + week;
    }

    const q2 = q.biggest_dropoff || {};
    const q2El = document.getElementById('activationQ2Summary');
    const q2Det = document.getElementById('activationQ2Detail');
    if (q2El) q2El.textContent = q2.summary || '—';
    if (q2Det && q2.step) {
      q2Det.textContent = 'Steg: ' + q2.step;
    }

    const q3 = q.lift || {};
    const q3El = document.getElementById('activationQ3Summary');
    const q3Det = document.getElementById('activationQ3Detail');
    if (q3El) q3El.textContent = q3.message || '—';
    if (q3Det && q3.delta_pp != null) {
      q3Det.textContent = 'Jämfört med förra veckans andel som kom igång inom 48 timmar.';
    }

    renderActivationFunnelFromReport(data.funnel);

    const p0Body = document.getElementById('activationP0WeeklyBody');
    const p0Rows = data.p0_weekly || [];
    if (p0Body) {
      if (p0Rows.length === 0) {
        p0Body.innerHTML = '<tr><td colspan="4" class="text-center text-text-soft py-6">Ingen data ännu</td></tr>';
      } else {
        p0Body.innerHTML = p0Rows.map(function (row) {
          const week = row.cohort_week ? String(row.cohort_week).slice(0, 10) : '—';
          return '<tr class="border-t border-sky">' +
            '<td class="py-2 pr-4 font-medium">' + esc(week) + '</td>' +
            '<td class="text-right px-2 py-2 tabular-nums">' + (row.signups || 0) + '</td>' +
            '<td class="text-right px-2 py-2 tabular-nums">' + (row.p0_48h || 0) + '</td>' +
            '<td class="text-right py-2 tabular-nums font-medium">' + (row.rate_48h || 0) + '%</td>' +
            '</tr>';
        }).join('');
      }
    }

    reportRoot.dataset.loaded = 'true';
  } catch (err) {
    console.error('[Analytics] loadActivationWeeklyReport error:', err);
    const q1El = document.getElementById('activationQ1Summary');
    if (q1El) q1El.textContent = 'Kunde inte ladda veckorapport';
  }
}

function renderActivationFunnelFromReport(data) {
  const head = document.getElementById('activationFunnelHead');
  const body = document.getElementById('activationFunnelBody');
  const convWrap = document.getElementById('activationFunnelConversions');
  const convHead = document.getElementById('activationFunnelConvHead');
  const convBody = document.getElementById('activationFunnelConvBody');
  if (!head || !body) return;

  const steps = (data && data.steps) || [];
  const conversionCols = buildFunnelConversionColumns(steps);

  head.innerHTML = '<tr><th class="text-left pb-2 pr-4">Vecka</th>' +
    steps.map(function (s) {
      return '<th class="text-right pb-2 px-2 whitespace-nowrap">' + esc(s.label) +
        '<span class="block text-[10px] font-normal text-text-soft normal-case tracking-normal">antal (% signup)</span></th>';
    }).join('') +
    '</tr>';

  if (!data || !data.cohorts || data.cohorts.length === 0) {
    body.innerHTML = '<tr><td colspan="' + (steps.length + 1) + '" class="text-center text-text-soft py-6">Ingen veckodata ännu</td></tr>';
    if (convWrap) convWrap.classList.add('hidden');
    return;
  }

  body.innerHTML = data.cohorts.map(function (row) {
    const week = row.cohort_week ? String(row.cohort_week).slice(0, 10) : '—';
    const cells = steps.map(function (s) {
      const n = (row.counts && row.counts[s.key]) || 0;
      const pct = (row.rates && row.rates[s.key]) || 0;
      return '<td class="text-right px-2 py-2 tabular-nums">' + n +
        '<span class="text-text-soft text-xs"> (' + pct + '%)</span></td>';
    }).join('');
    return '<tr class="border-t border-sky"><td class="py-2 pr-4 font-medium">' + esc(week) + '</td>' + cells + '</tr>';
  }).join('');

  if (convWrap && convHead && convBody && conversionCols.length > 0) {
    convHead.innerHTML = '<tr><th class="text-left pb-2 pr-4">Vecka</th>' +
      conversionCols.map(function (c) {
        return '<th class="text-right pb-2 px-2 whitespace-nowrap text-xs">' + esc(c.label) + '</th>';
      }).join('') +
      '</tr>';
    convBody.innerHTML = data.cohorts.map(function (row) {
      const week = row.cohort_week ? String(row.cohort_week).slice(0, 10) : '—';
      const conversions = row.conversions || {};
      const cells = conversionCols.map(function (c) {
        const conv = conversions[c.key];
        if (!conv || conv.from_count === 0) {
          return '<td class="text-right px-2 py-2 text-text-soft tabular-nums">—</td>';
        }
        return '<td class="text-right px-2 py-2 tabular-nums font-medium">' + conv.rate_pct + '%' +
          '<span class="text-text-soft text-xs font-normal"> (' + conv.to_count + '/' + conv.from_count + ')</span></td>';
      }).join('');
      return '<tr class="border-t border-sky"><td class="py-2 pr-4 font-medium">' + esc(week) + '</td>' + cells + '</tr>';
    }).join('');
    convWrap.classList.remove('hidden');
  }

  const diagEl = document.getElementById('activationChildAccessDiag');
  if (diagEl && data.childAccessDiagnostics) {
    const diag = data.childAccessDiagnostics;
    const items = (diag.metrics || []).map(function (m) {
      const n = (diag.counts && diag.counts[m.key]) || 0;
      return '<span class="inline-flex items-center gap-1 mr-4 mb-1"><span class="text-text-soft">' +
        esc(m.label) + ':</span> <strong class="tabular-nums">' + n + '</strong></span>';
    }).join('');
    const weeks = diag.window_weeks || 8;
    diagEl.innerHTML = '<p class="text-xs text-text-soft uppercase tracking-wide font-semibold mb-1">Barnåtkomst — mer detaljer</p>' +
      '<p class="text-[11px] text-text-soft mb-2">Senaste ' + weeks + ' veckorna. Huvudtabellen räknar bara när barnet faktiskt kommit in, inte när föräldern klickade vidare.</p>' +
      items;
    diagEl.classList.remove('hidden');
  }
}

async function loadReferralsAdmin() {
  const body = document.getElementById('referralsAdminBody');
  if (!body || body.dataset.loaded === 'true') return;
  try {
    const data = await Auth.api('/api/admin/referrals');
    const rows = data.referrals || [];
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-center text-text-soft py-6">Inga värvningskoder ännu</td></tr>';
    } else {
      body.innerHTML = rows.map(function (row) {
        const last = row.last_signup_at
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