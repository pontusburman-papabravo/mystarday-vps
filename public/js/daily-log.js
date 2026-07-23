

    function pt(key, params) {
      return window.pt ? window.pt(key, params) : key;
    }

    function getStarLabels() {
      const labels = window.ptGet ? ptGet('today.rating.labels') : null;
      if (Array.isArray(labels) && labels.length >= 6) return labels;
      return ['', 'Hard 😓', 'Okay 😐', 'Good 😊', 'Great 😄', 'Fantastic! 🌟'];
    }

    function getCategoryRules() {
      return [
        { cls: 'cc-hygien',  label: pt('today.categories.hygien'),  color: '#60A5FA', keywords: ['tänder','borsta','tvätta','duscha','dusch','bad','badrum','toalett','blöja','klä','kläder','hygien','hår','kamm','nagel'] },
        { cls: 'cc-mat',     label: pt('today.categories.mat'),     color: '#FBBF24', keywords: ['frukost','lunch','middag','mellanmål','mat','äta','dricka','frukt','snack','kvällsmat'] },
        { cls: 'cc-skola',   label: pt('today.categories.skola'),   color: '#A78BFA', keywords: ['skola','förskola','läxor','läxa','läsa','räkna','aktivitet','inlämning','lektion','pedagog','lärare'] },
        { cls: 'cc-lek',     label: pt('today.categories.lek'),     color: '#34D399', keywords: ['lek','leka','spel','spela','pussel','rita','måla','musik','sjunga','bygga','lego','docklek','utomhus'] },
        { cls: 'cc-rorelse', label: pt('today.categories.rorelse'), color: '#F87171', keywords: ['träna','träning','sport','gym','simning','simma','cykel','cykla','promenad','gå','springa','dans','dansa','yoga','fotboll','idrott'] },
        { cls: 'cc-vila',    label: pt('today.categories.vila'),    color: '#94A3B8', keywords: ['sova','sovstund','vila','tupplur','natt','pyjamas','läggdags','kvällsrutin'] },
        { cls: 'cc-social',  label: pt('today.categories.social'),  color: '#FB923C', keywords: ['kompi','kompis','besök','samling','träffa','möte','telefon','video','ring'] },
      ];
    }

    // ── State ─────────────────────────────────────────────
    let currentChildId = null;
    let currentDateStr = getTodayStr();
    let currentLog = null;
    let currentItems = [];
    let currentSectionTimes = {};
    let children = [];
    let custodyPrintEnabled = false;
    let itemRatings = {}; // itemId -> { child_score, child_comment, parent_score, parent_comment }

    // Per-child feature flags (read from children array on child select)
    let currentChildTimeAdjustment = true;
    let currentChildColorCoding = true;

    // Undo snapshot for bump-time (one level)
    let bumpTimeSnapshot = null;

    // Undo snapshot for completion (one level — latest only)
    let undoCompleteTimer = null;
    let undoCompleteState = null; // { itemId, itemName }

    // ── Rating state ──────────────────────────────────────
    let ratingItemId = null;
    let ratingScore = 0;
    function starLabel(n) { return getStarLabels()[n] || ""; }

    // ── Color coding ──────────────────────────────────────
    function getActivityColorClass(name) {
      if (!name) return '';
      const lower = name.toLowerCase();
      for (const rule of getCategoryRules()) {
        if (rule.keywords.some(kw => lower.includes(kw))) return rule.cls;
      }
      return '';
    }

    // ── Date helpers ──────────────────────────────────────

    function toIsoDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function normalizeIsoDate(dateStr) {
      if (!dateStr) return toIsoDate(new Date());
      const iso = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
      if (iso) return iso[1];
      const parsed = new Date(dateStr);
      if (!Number.isNaN(parsed.getTime())) return toIsoDate(parsed);
      return toIsoDate(new Date());
    }

    function getTodayStr() {
      return toIsoDate(new Date());
    }

    function offsetDate(dateStr, days) {
      const d = new Date(normalizeIsoDate(dateStr) + 'T12:00:00');
      d.setDate(d.getDate() + days);
      return toIsoDate(d);
    }

    function formatDateDisplay(dateStr) {
      if (window.LocaleDateTime && typeof LocaleDateTime.formatDateHeader === 'function') {
        return LocaleDateTime.formatDateHeader(normalizeIsoDate(dateStr), getTodayStr());
      }
      return normalizeIsoDate(dateStr);
    }

    // ── Auth & Init ───────────────────────────────────────

    document.addEventListener('DOMContentLoaded', async () => {
      if (!Auth.requireAuth()) return;

      const user = Auth.getUser();
      if (typeof window.initParentAppI18n === 'function') {
        await initParentAppI18n(user?.preferred_locale);
      }

      document.addEventListener('parent-i18n-ready', () => {
        if (currentChildId) loadLog();
        else loadChildren();
      });

      document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
      // logoutBtn2 removed — logout only in sidebar/hamburger menu now

      const urlParams = new URLSearchParams(window.location.search);
      const paramDate = urlParams.get('date');
      if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)) {
        currentDateStr = paramDate;
      }

      if (urlParams.get('print') === '1') {
        const cid = urlParams.get('childId');
        window.location.replace('/print-schema' + (cid ? '?childId=' + encodeURIComponent(cid) : ''));
        return;
      }

      await loadChildren();
      await loadCustodyPrintOption();
    });

    function openPrintMenuHint() {
      const menu = document.getElementById('printMenu');
      const btn = document.getElementById('printBtn');
      if (menu && menu.classList.contains('hidden')) togglePrintMenu();
      if (btn) {
        btn.classList.add('ring-2', 'ring-gold', 'ring-offset-2');
        setTimeout(function () { btn.classList.remove('ring-2', 'ring-gold', 'ring-offset-2'); }, 4000);
      }
    }

    function trackPrintExport(format) {
      const meta = { format: format, source: 'daily_log' };
      if (currentChildId) meta.child_id = currentChildId;
      if (window.analytics && typeof window.analytics.track === 'function') {
        window.analytics.track('print_schema_exported', meta);
      } else {
        apiFetch('/api/analytics/event', {
          method: 'POST',
          body: JSON.stringify({ event_type: 'print_schema_exported', metadata: meta }),
        }).catch(function () {});
      }
    }

    async function loadCustodyPrintOption() {
      try {
        const data = await apiFetch('/api/family/custody').then((r) => {
          if (r.status === 404) return null;
          if (!r.ok) throw new Error('custody');
          return r.json();
        });
        custodyPrintEnabled = Boolean(data && data.patterns && data.patterns.length > 0);
        const btn = document.getElementById('printMyDaysBtn');
        if (btn) btn.classList.toggle('hidden', !custodyPrintEnabled);
      } catch (_) {
        custodyPrintEnabled = false;
      }
    }

    async function loadChildren() {
      try {
        const res = await apiFetch('/api/children');
        if (!res.ok) {
          let msg = pt('today.errors.loadChildren');
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {}
          showToast(msg + ' (status ' + res.status + ')', 'error');
          console.warn('[daily-log] loadChildren failed — status', res.status, 'url', res.url);
          return;
        }
        children = await res.json();

        const tabs = document.getElementById('childTabs');
        if (!children.length) {
          tabs.innerHTML = '<p class="text-text-soft text-sm">' + escHtml(pt('today.noChildren')) + '</p>';
          document.getElementById('logContent').innerHTML = `
            <div class="text-center py-16 bg-sky rounded-2xl">
              <p class="text-6xl mb-4">👨‍👩‍👧</p>
              <p class="font-heading font-bold text-navy text-xl mb-2">${escHtml(pt('today.empty.noChildrenTitle'))}</p>
              <p class="text-text-soft text-sm mb-6">${escHtml(pt('today.empty.addFirstChild'))}</p>
              <a href="/dashboard" class="inline-block px-6 py-3 bg-gold text-white font-heading font-bold rounded-xl hover:bg-yellow-500 transition-colors">${escHtml(pt('today.empty.goToDashboard'))}</a>
            </div>`;
          return;
        }

        tabs.innerHTML = children.map(c => `
          <button
            class="child-tab px-5 py-2 rounded-full font-semibold border-2 transition-colors"
            style="min-height:44px"
            data-id="${c.id}"
            onclick="selectChild('${c.id}')">
            ${renderChildAvatar(c, 24)} ${escHtml(c.name)}
          </button>
        `).join('');

        // Auto-select child from URL param, or first child
        const urlParams = new URLSearchParams(window.location.search);
        const paramChildId = urlParams.get('childId');
        const targetChild = paramChildId && children.find(c => c.id === paramChildId) ? paramChildId : children[0].id;
        selectChild(targetChild);
      } catch (err) {
        console.error('[daily-log] loadChildren error:', err);
        showToast(pt('today.errors.loadChildren'), 'error');
      }
    }

    function selectChild(childId) {
      currentChildId = childId;
      // Update tab styles
      document.querySelectorAll('.child-tab').forEach(btn => {
        const active = btn.dataset.id === childId;
        btn.className = `child-tab px-5 py-2 rounded-full font-semibold border-2 transition-colors ${
          active ? 'bg-gold border-gold text-navy' : 'bg-white border-lavender text-navy hover:border-gold'
        }`;
      });
      // Read per-child feature flags
      const child = children.find(c => c.id == childId);
      currentChildTimeAdjustment = child ? child.time_adjustment !== false : true;
      currentChildColorCoding    = child ? child.color_coding    !== false : true;
      // Clear any leftover undo snapshot when switching child/day
      bumpTimeSnapshot = null;
      loadLog();
    }

    // ── Log loading ───────────────────────────────────────

    async function loadLog() {
      if (!currentChildId) return;
      renderLogLoading();

      try {
        const dateParam = normalizeIsoDate(currentDateStr);
        currentDateStr = dateParam;
        const res = await apiFetch(`/api/children/${currentChildId}/daily-log?date=${encodeURIComponent(dateParam)}`);
        if (!res.ok) {
          let msg = pt('today.errors.loadLog');
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch (_) { /* ignore */ }
          throw new Error(msg + ' (status ' + res.status + ')');
        }
        const data = await res.json();

        currentLog = data.log;
        currentItems = data.items || [];
        currentSectionTimes = data.section_times || {};

        // Load ratings for all items in parallel
        itemRatings = {};
        const itemIds = (data.items || []).map(i => i.id);
        if (itemIds.length > 0) {
          const results = await Promise.allSettled(
            itemIds.map(id =>
              apiFetch(`/api/daily-log-items/${id}/ratings`)
                .then(r => r.json()).then(r => ({ id, r })).catch(() => null)
            )
          );
          for (const res of results) {
            if (res.status === 'fulfilled' && res.value) {
              const { id, r } = res.value;
              if (r && !r.error) itemRatings[id] = r;
            }
          }
        }

        renderLog(data);
        await loadMoodSummary();
      } catch (err) {
        console.error('[daily-log] loadLog error:', err);
        renderLogError(err);
      }
    }

    // ── Render ────────────────────────────────────────────

    function renderLogLoading() {
      document.getElementById('logContent').innerHTML = `
        <div class="text-center py-16 text-text-soft">
          <p class="text-4xl mb-3 animate-pulse">⏳</p>
          <p class="font-semibold">${escHtml(pt('today.loading'))}</p>
        </div>`;
    }

    function renderLogError(err) {
      const detail = err && err.message ? `<p class="text-sm mt-2 opacity-70">${escHtml(err.message)}</p>` : '';
      document.getElementById('logContent').innerHTML = `
        <div class="text-center py-16 text-text-soft">
          <p class="text-4xl mb-3">❌</p>
          <p class="font-semibold">${escHtml(pt('today.errors.loadLog'))}</p>
          ${detail}
          <button type="button" id="retryLoadLogBtn" class="mt-4 px-6 py-2 bg-sky rounded-xl font-semibold text-navy hover:bg-lavender transition-colors" style="min-height:44px">${escHtml(pt('today.retry'))}</button>
        </div>`;
      const retry = document.getElementById('retryLoadLogBtn');
      if (retry) retry.addEventListener('click', loadLog);
    }

    function renderLog(data) {
      const { log, items = [], section_times } = data;
      const total = items.length;
      const completed = items.filter(i => i.completed).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isToday = currentDateStr === getTodayStr();

      const sectionOrder = ['morgon', 'dag', 'kvall', 'natt'];
      const sectionEmojis = { morgon: '🌅', dag: '☀️', kvall: '🌆', natt: '🌙' };
      const sectionLabels = {
        morgon: pt('sections.morgon'),
        dag: pt('sections.dag'),
        kvall: pt('sections.kvall'),
        natt: pt('sections.natt'),
      };

      // Build sections from items
      const grouped = {};
      for (const item of items) {
        if (!grouped[item.section]) grouped[item.section] = [];
        grouped[item.section].push(item);
      }

      // ── Date navigation bar ──────────────────────────────
      const dateNavHtml = `
        <div class="flex items-center gap-2 sm:gap-3 bg-white dark:bg-navy-soft rounded-2xl p-3 shadow-sm border border-lavender">
          <button
            onclick="navigateDate(-7)"
            class="nav-btn rounded-xl bg-lavender hover:bg-sky text-navy transition-colors text-xs font-bold"
            title="${escHtml(pt('today.nav.prevWeek'))}"
            aria-label="${escHtml(pt('today.nav.prevWeek'))}"
            style="min-width:44px;min-height:44px;padding:0 10px">
            ‹‹
          </button>
          <button
            onclick="navigateDate(-1)"
            class="nav-btn rounded-xl bg-sky hover:bg-lavender text-navy transition-colors"
            title="${escHtml(pt('today.nav.prevDay'))}"
            aria-label="${escHtml(pt('today.nav.prevDay'))}"
            style="min-width:44px;min-height:44px;padding:0 8px">
            ◀
          </button>
          <div class="flex-1 text-center">
            <div class="font-heading font-bold text-navy text-base">${formatDateDisplay(currentDateStr)}</div>
          </div>
          <button
            onclick="navigateDate(1)"
            class="nav-btn rounded-xl bg-sky hover:bg-lavender text-navy transition-colors"
            title="${escHtml(pt('today.nav.nextDay'))}"
            aria-label="${escHtml(pt('today.nav.nextDay'))}"
            style="min-width:44px;min-height:44px;padding:0 8px">
            ▶
          </button>
          <button
            onclick="navigateDate(7)"
            class="nav-btn rounded-xl bg-lavender hover:bg-sky text-navy transition-colors text-xs font-bold"
            title="${escHtml(pt('today.nav.nextWeek'))}"
            aria-label="${escHtml(pt('today.nav.nextWeek'))}"
            style="min-width:44px;min-height:44px;padding:0 10px">
            ››
          </button>
          <input
            type="date"
            id="datePicker"
            value="${currentDateStr}"
            class="nav-btn rounded-xl bg-sky hover:bg-lavender text-navy transition-colors text-xs px-2 border-0 outline-none cursor-pointer"
            onchange="navigateToDate(this.value)"
            title="${escHtml(pt('today.nav.pickDate'))}"
            style="max-width:44px;min-width:44px;padding:0 4px;color:transparent"
            aria-label="${escHtml(pt('today.nav.pickDate'))}">
          ${isToday ? '' : `<button onclick="navigateToDate('${getTodayStr()}')" class="nav-btn rounded-xl bg-gold text-navy font-semibold text-xs px-3 transition-colors hover:bg-yellow-300" style="min-width:auto">${escHtml(pt('today.nav.todayBtn'))}</button>`}
        </div>`;

      // ── Progress bar ─────────────────────────────────────
      const progressHtml = total > 0 ? `
        <div class="bg-white dark:bg-navy-soft rounded-2xl p-4 shadow-sm border border-lavender">
          <div class="flex justify-between items-center mb-2">
            <span class="font-semibold text-navy">${completed === total && total > 0 ? escHtml(pt('today.progress.allDone')) : escHtml(pt('today.progress.completedOf', { completed, total }))}</span>
            <span class="text-text-soft text-sm font-semibold">${pct}%</span>
          </div>
          <div class="w-full bg-lavender rounded-full h-3">
            <div class="progress-bar-fill bg-gold rounded-full h-3" style="width:${pct}%"></div>
          </div>
        </div>
        <div id="moodSummaryBlock" class="hidden"></div>` : `<div id="moodSummaryBlock" class="hidden"></div>`;

      // ── Retroactive entry banner (shown for past dates only) ─────────
      const isPast = currentDateStr < getTodayStr();
      const retroBannerHtml = (isPast && !log.is_paused) ? `
        <div class="bg-gold-light border border-gold rounded-2xl px-4 py-3 flex items-start gap-3">
          <span class="text-xl flex-shrink-0 mt-0.5">📝</span>
          <div>
            <div class="font-semibold text-navy text-sm">${escHtml(pt('today.retrofill.title'))}</div>
            <div class="text-xs text-text-soft mt-0.5">${escHtml(pt('today.retrofill.description'))}</div>
          </div>
        </div>` : '';

      // ── Pause banner ─────────────────────────────────────
      const pauseBannerHtml = log.is_paused ? `
        <div id="pauseOverlay" class="paused-overlay">
          <div class="flex items-center gap-3">
            <span class="text-3xl">😴</span>
            <div>
              <div class="font-heading font-bold text-navy">${escHtml(pt('today.pause.dayTitle'))}</div>
              <div class="text-text-soft text-sm">${escHtml(pt('today.pause.banner'))}</div>
            </div>
          </div>
          <button
            onclick="togglePause(false)"
            class="mt-3 w-full px-4 py-2 bg-white border-2 border-gold rounded-xl font-semibold text-navy hover:bg-gold-light transition-colors"
            style="min-height:44px">
            ${escHtml(pt('today.pause.reactivate'))}
          </button>
        </div>` : '';

      // ── Bump-time bar (time_adjustment toggle) ────────────
      const hasUncompleted = items.some(i => !i.completed && i.start_time);
      const bumpBarHtml = (currentChildTimeAdjustment && !log.is_paused && items.length > 0) ? `
        <div id="bumpBar" class="bg-white dark:bg-navy-soft rounded-2xl px-4 py-3 shadow-sm border border-lavender">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">⏩</span>
              <div>
                <div class="font-semibold text-navy text-sm">${escHtml(pt('today.bump.title'))}</div>
                <div class="text-xs text-text-soft">${escHtml(pt('today.bump.adjustHint'))}</div>
              </div>
            </div>
            <div class="bump-bar">
              ${[5, 10, 15, 30].map(m => `
                <button
                  onclick="bumpTime(${m})"
                  class="bump-btn bg-sky text-navy hover:bg-lavender"
                  title="${escHtml(pt('today.bump.minutesTitle', { minutes: m }))}">
                  +${m} min
                </button>`).join('')}
              <button
                id="undoBumpBtn"
                onclick="undoBumpTime()"
                class="bump-btn bg-lavender text-text-soft hover:bg-coral ${bumpTimeSnapshot ? '' : 'opacity-40 cursor-not-allowed'}"
                ${bumpTimeSnapshot ? '' : 'disabled'}
                title="${escHtml(pt('today.nav.undoBump'))}">
                ${escHtml(pt('today.bump.undoBtn'))}
              </button>
            </div>
          </div>
        </div>` : '';

      // ── Color legend (color_coding toggle) ────────────────
      const colorLegendHtml = currentChildColorCoding ? `
        <div class="flex items-center gap-2 flex-wrap text-xs text-text-soft">
          <span class="font-semibold text-navy">${escHtml(pt('today.legend.colorCoding'))}</span>
          ${getCategoryRules().map(r => `
            <span class="flex items-center gap-1 px-2 py-0.5 rounded-full" style="background:${r.color}22;border-left:3px solid ${r.color}">
              ${r.label}
            </span>`).join('')}
        </div>` : '';

      // ── Sections ─────────────────────────────────────────
      let sectionsHtml = '';

      if (items.length === 0) {
        const isToday = currentDateStr === getTodayStr();
        sectionsHtml = `
          <div class="text-center py-14 bg-sky rounded-2xl">
            <p class="text-6xl mb-4">${isToday ? '🌟' : '📅'}</p>
            <p class="font-heading font-bold text-navy text-xl mb-2">${escHtml(isToday ? pt('today.empty.noActivitiesToday') : pt('today.empty.noScheduleDay') + '!')}</p>
            <p class="text-text-soft text-sm mt-1 mb-6">${escHtml(isToday ? pt('today.empty.addToWeekSchedule') : pt('today.empty.noScheduleSelected'))}</p>
            <a href="/schedule" class="inline-block px-6 py-3 bg-gold text-white font-heading font-bold rounded-xl hover:bg-yellow-500 transition-colors">${escHtml(pt('today.empty.goToWeekSchedule'))}</a>
          </div>`;
      } else {
        for (const sec of sectionOrder) {
          const secItems = grouped[sec] || [];
          if (secItems.length === 0) continue;

          const timeStr = sectionTimeStr(sec);
          const secCompleted = secItems.filter(i => i.completed).length;
          const secUncompleted = secItems.filter(i => !i.completed).length;

          sectionsHtml += `
            <div class="space-y-2">
              <div class="section-header">
                <span class="text-xl">${sectionEmojis[sec]}</span>
                <span class="font-heading font-bold text-navy">${sectionLabels[sec]}</span>
                ${timeStr ? `<span class="text-xs text-text-soft bg-sky rounded-full px-3 py-1">${timeStr}</span>` : ''}
                <span class="ml-auto text-xs text-text-soft">${secCompleted}/${secItems.length}</span>
                ${secUncompleted > 0 ? `
                  <button
                    onclick="completeAllInSection('${sec}')"
                    class="shrink-0 ml-2 px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold border border-green-200 transition-colors"
                    style="min-height:36px"
                    title="${escHtml(pt('today.activity.completeAllInSection', { section: sectionLabels[sec] }))}">
                    ${escHtml(pt('today.activity.completeAllBtn'))}
                  </button>` : ''}
              </div>
              <div class="space-y-2 sortable-section" id="sec-${sec}">
                ${secItems.map(item => renderActivityCard(item)).join('')}
              </div>
            </div>`;
        }
      }

      // ── Actions bar ──────────────────────────────────────
      const actionsHtml = !log.is_paused ? `
        <div id="pauseActionsBtn" class="pt-2">
          <button
            onclick="togglePause(true)"
            class="w-full px-4 py-3 border-2 border-dashed border-lavender text-text-soft rounded-xl font-semibold hover:border-gold hover:text-navy transition-colors text-sm"
            style="min-height:44px">
            ${escHtml(pt('today.pause.pauseBtn'))}
          </button>
        </div>` : '';

      document.getElementById('logContent').innerHTML = `
        <div class="space-y-4">
          <!-- Print header (visible only in print) -->
          <div class="print-header hidden-print">
            <span class="text-3xl" id="printChildEmoji"></span>
            <div>
              <div class="font-heading font-bold text-lg" id="printChildName"></div>
              <div class="text-sm text-text-soft" id="printDate"></div>
            </div>
          </div>
          ${dateNavHtml}
          ${retroBannerHtml}
          ${pauseBannerHtml}
          ${progressHtml}
          ${bumpBarHtml}
          ${colorLegendHtml}
          ${sectionsHtml}
          ${actionsHtml}
        </div>`;
      // Populate print header
      const child = children.find(c => c.id == currentChildId);
      const pe = document.getElementById('printChildEmoji');
      const pn = document.getElementById('printChildName');
      const pd = document.getElementById('printDate');
      if (pe) pe.innerHTML = child ? renderChildAvatar(child, 40) : '';
      if (pn) pn.textContent = child ? child.name : pt('today.childFallback');
      if (pd) pd.textContent = formatDateDisplay(currentDateStr);

      // Initialize drag and drop after rendering
      initParentDnD();
    }

    function renderActivityCard(item) {
      const completedClass = item.completed ? 'completed' : '';
      const checkClass = item.completed ? 'checked' : '';
      const colorClass = currentChildColorCoding ? getActivityColorClass(item.name) : '';
      const timeHtml = item.start_time ? `<span class="text-xs text-text-soft">${item.start_time}${item.end_time ? '–' + item.end_time : ''}</span>` : '';
      const starHtml = `<span class="text-xs text-text-soft">⭐ ${item.star_value}</span>`;
      const rating = itemRatings[item.id];
      const feedbackFor = item.feedback_for || 'both';

      // Rating badges — child score shown as n/10, parent as stars
    let ratingHtml = '';
      if (rating && (rating.child_score || rating.child_emotion_key || rating.parent_score)) {
        if (rating.child_emotion_key) {
          ratingHtml += `<span class="text-xs bg-gold-light text-navy px-1.5 py-0.5 rounded font-semibold" title="${escHtml(pt('today.rating.childMood'))}">🧒 ${escHtml(rating.child_emotion_key)}</span>`;
        } else if (rating.child_score) {
          ratingHtml += `<span class="text-xs bg-gold-light text-navy px-1.5 py-0.5 rounded font-semibold"
            title="Barnets betyg${rating.child_comment ? ': ' + rating.child_comment : ''}"
            onclick="event.stopPropagation()">
            🧒 ${rating.child_score}/10
            ${rating.child_comment ? `<span class="text-text-soft font-normal ml-1">"${escHtml(rating.child_comment)}"</span>` : ''}
          </span>`;
        }
        if (rating.parent_score) {
          ratingHtml += `<span class="text-xs bg-mint text-navy px-1.5 py-0.5 rounded" title="${escHtml(pt('today.rating.parentScore'))}" onclick="event.stopPropagation()">
            👨‍👩‍👧 ${'⭐'.repeat(rating.parent_score)}
            ${rating.parent_comment ? `<span class="text-text-soft font-normal ml-1">"${escHtml(rating.parent_comment)}"</span>` : ''}
          </span>`;
        }
      }

      // Only show rate button for parent if feedback_for allows it
      const parentCanRate = feedbackFor === 'both' || feedbackFor === 'parent';
      const rateBtn = (item.completed && parentCanRate) ? `
        <button
          class="flex-shrink-0 px-2 py-1 text-xs rounded-lg border ${rating && rating.parent_score ? 'bg-mint border-teal-200 text-teal-700' : 'bg-sky border-lavender text-text-soft hover:border-gold hover:text-gold'} transition-colors"
          onclick="event.stopPropagation(); openParentRating('${item.id}', '${escHtml(item.name)}')"
          title="${escHtml(rating && rating.parent_score ? pt('today.activity.changeRating') : pt('today.activity.setRating'))}">
          ${rating && rating.parent_score ? '⭐' + rating.parent_score : escHtml(pt('today.activity.rate'))}
        </button>` : '';

      return `
        <div
          class="activity-card ${completedClass} ${colorClass} bg-white dark:bg-navy-soft rounded-2xl p-4 shadow-sm border border-lavender flex items-center gap-3 group"
          id="card-${item.id}"
          data-item-id="${item.id}">
          <!-- Desktop: drag handle (hidden on mobile, drag-handle class enables SortableJS) -->
          <div class="drag-handle shrink-0 flex items-center justify-center w-6 cursor-grab active:cursor-grabbing text-text-soft hover:text-navy opacity-0 group-hover:opacity-100 transition-opacity select-none dl-drag-desktop" title="${escHtml(pt('today.activity.dragReorder'))}">⠿</div>
          <!-- Mobile: ↑/↓ reorder buttons (hidden on desktop via CSS) -->
          <div class="dl-reorder-mobile shrink-0 flex flex-col gap-0.5">
            <button class="dl-move-btn" onclick="moveItemInSection('${item.id}', -1)" aria-label="Flytta upp" title="Flytta upp">▲</button>
            <button class="dl-move-btn" onclick="moveItemInSection('${item.id}', 1)" aria-label="Flytta ner" title="Flytta ner">▼</button>
          </div>
          <div class="print-checkbox"></div>
          <div class="text-3xl flex-shrink-0">${item.icon || '📌'}</div>
          <div class="flex-1 min-w-0">
            <div class="activity-name font-semibold text-navy truncate">${escHtml(item.name)}</div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              ${timeHtml}
              ${starHtml}
              ${item.completed && item.completed_at ? `<span class="text-xs text-green-600">✓ ${formatTime(item.completed_at)}</span>` : ''}
              ${ratingHtml}
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${rateBtn}
            <button
              class="check-btn ${checkClass} flex-shrink-0"
              onclick="toggleItem('${item.id}', ${!item.completed})"
              title="${escHtml(item.completed ? pt('today.activity.undoMark') : pt('today.activity.markDone'))}"
              aria-label="${escHtml(item.completed ? pt('today.activity.undoMark') : pt('today.activity.markDone'))}">
              ${item.completed ? '✓' : ''}
            </button>
          </div>
        </div>`;
    }

    function sectionTimeStr(sec) {
      const st = currentSectionTimes;
      if (!st) return '';
      const map = {
        morgon: [st.morning_start, st.morning_end],
        dag: [st.day_start, st.day_end],
        kvall: [st.evening_start, st.evening_end],
        natt: [st.night_start, st.night_end],
      };
      const [s, e] = map[sec] || [];
      if (!s || !e) return '';
      return `${s}–${e}`;
    }

    function formatTime(isoStr) {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    }

    // ── Drag & Drop (SortableJS) ──────────────────────────

    let _parentSortables = [];

    function initParentDnD() {
      if (typeof Sortable === 'undefined') return;

      // Destroy old instances before re-creating
      _parentSortables.forEach(s => s.destroy());
      _parentSortables = [];

      document.querySelectorAll('.sortable-section').forEach(el => {
        const s = new Sortable(el, {
          animation: 200,
          handle: '.drag-handle',
          draggable: '.activity-card',
          forceFallback: true,
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          onEnd: async function(evt) {
            if (evt.from !== evt.to) return;
            const cards = Array.from(evt.from.querySelectorAll('.activity-card'));
            const ordered_ids = cards.map(c => c.dataset.itemId).filter(Boolean);
            if (ordered_ids.length === 0) return;
            try {
              await apiFetch('/api/daily-log-items/reorder', {
                method: 'PUT',
                body: JSON.stringify({ ordered_item_ids: ordered_ids }),
              });
            } catch (err) {
              showToast(pt('today.errors.saveOrder'), 'error');
            }
          },
        });
        _parentSortables.push(s);
      });
    }

    // ── Mobile reorder: ↑/↓ buttons (alternative to drag for touch) ──
    // Finds the card's section container and swaps it with its neighbour.
    // Persists via the same reorder endpoint that SortableJS uses.
    async function moveItemInSection(itemId, direction) {
      const card = document.getElementById('card-' + itemId);
      if (!card) return;
      const section = card.closest('.sortable-section');
      if (!section) return;
      const cards = Array.from(section.querySelectorAll('.activity-card'));
      const idx = cards.indexOf(card);
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= cards.length) return;
      // DOM swap for immediate feedback
      const target = cards[targetIdx];
      if (direction < 0) section.insertBefore(card, target);
      else section.insertBefore(target, card);
      // Persist new order
      const ordered_ids = Array.from(section.querySelectorAll('.activity-card')).map(c => c.dataset.itemId).filter(Boolean);
      try {
        await apiFetch('/api/daily-log-items/reorder', {
          method: 'PUT',
          body: JSON.stringify({ ordered_item_ids: ordered_ids }),
        });
      } catch (err) {
        showToast(pt('today.errors.saveOrder'), 'error');
      }
    }
    // ── Mood summary (parent Idag / daily-log — not Hem dashboard) ──

    async function loadMoodSummary() {
      const block = document.getElementById('moodSummaryBlock');
      if (!block || !currentChildId) return;
      try {
        const res = await apiFetch(
          `/api/children/${currentChildId}/mood-summary?date=${encodeURIComponent(currentDateStr)}`
        );
        if (!res.ok) {
          block.classList.add('hidden');
          block.innerHTML = '';
          return;
        }
        const data = await res.json();
        renderMoodSummary(data);
      } catch {
        block.classList.add('hidden');
      }
    }

    function renderMoodSummary(data) {
      const block = document.getElementById('moodSummaryBlock');
      if (!block) return;
      const emotions = data.emotions || [];
      const scoreCount = data.scores && data.scores.count ? data.scores.count : 0;
      if (emotions.length === 0 && !scoreCount) {
        block.classList.add('hidden');
        block.innerHTML = '';
        return;
      }
      const chips = emotions.map((e) =>
        `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-lavender text-navy text-xs font-semibold">${escHtml(e.emoji)} ${escHtml(e.label)} ×${e.count}</span>`
      ).join('');
      const scoreLine = scoreCount
        ? `<span class="text-xs text-text-soft">${escHtml(pt('today.emotions.sliderResponses', { count: scoreCount, suffix: scoreCount === 1 ? pt('today.emotions.sliderSuffixOne') : pt('today.emotions.sliderSuffixMany') }))}${data.scores.avg != null ? escHtml(pt('today.emotions.sliderAvg', { avg: data.scores.avg })) : ''}</span>`
        : '';
      block.className = 'bg-white dark:bg-navy-soft rounded-2xl p-4 shadow-sm border border-lavender';
      block.innerHTML = `
        <div class="text-xs font-bold text-text-soft uppercase tracking-wider mb-2">${escHtml(pt('today.emotions.title'))}</div>
        <div class="flex flex-wrap gap-2">${chips || '<span class="text-xs text-text-soft">' + escHtml(pt('today.emotions.noCards')) + '</span>'}</div>
        ${scoreLine ? `<div class="mt-2">${scoreLine}</div>` : ''}`;
    }

    // ── Navigation ─────────────────────────────────────────

    function navigateDate(offset) {
      currentDateStr = offsetDate(currentDateStr, offset);
      bumpTimeSnapshot = null;
      loadLog();
    }

    function navigateToDate(dateStr) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
      currentDateStr = dateStr;
      bumpTimeSnapshot = null;
      loadLog();
    }

    // Expose for inline handlers and magic shell
    window.selectChild = selectChild;
    window.loadLog = loadLog;
    window.navigateDate = navigateDate;
    window.navigateToDate = navigateToDate;
    window.moveItemInSection = moveItemInSection;

    // ── Complete all in section ────────────────────────────

    async function completeAllInSection(sec) {
      const secItems = currentItems.filter(i => i.section === sec && !i.completed);
      if (secItems.length === 0) return;
      // Call toggleItem sequentially to preserve API semantics
      for (const item of secItems) {
        await toggleItem(item.id, true);
      }
    }
    window.completeAllInSection = completeAllInSection;

    // ── Toggle item complete ──────────────────────────────

    async function toggleItem(itemId, newState) {
      const endpoint = newState ? 'complete' : 'uncomplete';
      try {
        const res = await apiFetch(`/api/daily-log-items/${itemId}/${endpoint}`, { method: 'PUT' });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        if (
          endpoint === 'complete' &&
          window.MetaAppEvents &&
          typeof MetaAppEvents.handleServerMilestones === 'function'
        ) {
          MetaAppEvents.handleServerMilestones(updated && updated.meta_milestones);
        }

        // Update local state
        const idx = currentItems.findIndex(i => i.id === itemId);
        if (idx !== -1) {
          currentItems[idx] = { ...currentItems[idx], ...updated };
        }

        // Re-render the specific card
        const card = document.getElementById(`card-${itemId}`);
        if (card) {
          const item = currentItems.find(i => i.id === itemId);
          if (item) {
            card.outerHTML = renderActivityCard(item);
          }
        }

        // Re-render progress bar
        updateProgressBar();

        // Undo snackbar for completions (3s auto-dismiss)
        if (newState) {
          const item = currentItems.find(i => i.id === itemId);
          clearUndoCompleteTimer();
          undoCompleteState = { itemId, itemName: item ? item.name : pt('today.activity.defaultName') };
          undoCompleteTimer = setTimeout(() => {
            clearUndoCompleteTimer();
          }, 3000);
          showUndoSnackbar(item ? item.name : pt('today.activity.defaultName'));
        } else {
          showToast(pt('today.activity.undoneToast'));
        }
      } catch {
        showToast(pt('today.errors.updateActivity'), 'error');
      }
    }

    function clearUndoCompleteTimer() {
      if (undoCompleteTimer) {
        clearTimeout(undoCompleteTimer);
        undoCompleteTimer = null;
      }
      undoCompleteState = null;
    }

    function showUndoSnackbar(itemName) {
      // Remove existing undo snackbar if any
      const existing = document.getElementById('undo-complete-snackbar');
      if (existing) existing.remove();

      const snackbar = document.createElement('div');
      snackbar.id = 'undo-complete-snackbar';
      snackbar.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-navy text-white px-5 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-3 max-w-xs';
      snackbar.innerHTML = `
        <span>✅ <strong>${escHtml(itemName)}</strong></span>
        <button
          onclick="undoLastComplete()"
          class="shrink-0 px-3 py-1 bg-gold text-navy rounded-lg font-bold text-xs hover:bg-yellow-400 transition-colors"
          style="min-height:32px">
          ${escHtml(pt('today.snackbar.undo'))}
        </button>`;

      document.body.appendChild(snackbar);
    }

    async function undoLastComplete() {
      if (!undoCompleteState) return;
      clearUndoCompleteTimer();
      const snackbar = document.getElementById('undo-complete-snackbar');
      if (snackbar) snackbar.remove();

      // Call uncomplete endpoint
      try {
        const res = await apiFetch(`/api/daily-log-items/${undoCompleteState.itemId}/uncomplete`, { method: 'PUT' });
        if (!res.ok) throw new Error();
        const updated = await res.json();

        const idx = currentItems.findIndex(i => i.id === undoCompleteState.itemId);
        if (idx !== -1) currentItems[idx] = { ...currentItems[idx], ...updated };

        const card = document.getElementById(`card-${undoCompleteState.itemId}`);
        if (card) {
          const item = currentItems.find(i => i.id === undoCompleteState.itemId);
          if (item) card.outerHTML = renderActivityCard(item);
        }
        updateProgressBar();
        showToast(pt('today.activity.undoneToast'));
      } catch {
        showToast(pt('today.errors.undo'), 'error');
      }
    }
    window.undoLastComplete = undoLastComplete;

    function updateProgressBar() {
      const total = currentItems.length;
      const completed = currentItems.filter(i => i.completed).length;
      if (total === 0) return;
      const pct = Math.round((completed / total) * 100);

      const bar = document.querySelector('.progress-bar-fill');
      if (bar) bar.style.width = pct + '%';

      const label = document.querySelector('.progress-bar-fill')?.closest('.bg-white')?.querySelector('.font-semibold');
      if (label) {
        label.textContent = completed === total && total > 0
          ? pt('today.progress.allDone')
          : pt('today.progress.completedOf', { completed, total });
      }

      const pctLabel = document.querySelector('.progress-bar-fill')?.closest('.bg-white')?.querySelector('.text-text-soft');
      if (pctLabel) pctLabel.textContent = pct + '%';
    }

    // ── Pause/Unpause ─────────────────────────────────────

    async function togglePause(pause) {
      if (!currentLog) return;
      const confirm = window.confirm(pause
        ? pt('today.pause.confirmPause')
        : pt('today.pause.confirmUnpause'));
      if (!confirm) return;

      try {
        const endpoint = pause ? 'pause' : 'unpause';
        const res = await apiFetch(`/api/daily-logs/${currentLog.id}/${endpoint}`, { method: 'PUT' });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        currentLog = { ...currentLog, ...updated };
        showToast(pause ? pt('today.pause.pausedToast') : pt('today.pause.unpausedToast'));

        // Update pause banner in-place
        const pauseOverlay = document.getElementById('pauseOverlay');
        const pauseActionsBtn = document.getElementById('pauseActionsBtn');
        const bumpBar = document.getElementById('bumpBar');
        if (pause) {
          if (pauseOverlay) pauseOverlay.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="text-3xl">😴</span>
              <div>
                <div class="font-heading font-bold text-navy">${escHtml(pt('today.pause.dayTitle'))}</div>
                <div class="text-text-soft text-sm">${escHtml(pt('today.pause.banner'))}</div>
              </div>
            </div>
            <button
              onclick="togglePause(false)"
              class="mt-3 w-full px-4 py-2 bg-white border-2 border-gold rounded-xl font-semibold text-navy hover:bg-gold-light transition-colors"
              style="min-height:44px">
              ${escHtml(pt('today.pause.reactivate'))}
            </button>`;
          if (bumpBar) bumpBar.classList.add('hidden');
          if (pauseActionsBtn) pauseActionsBtn.classList.add('hidden');
        } else {
          if (pauseOverlay) pauseOverlay.innerHTML = '';
          if (bumpBar) bumpBar.classList.remove('hidden');
          if (pauseActionsBtn) pauseActionsBtn.classList.remove('hidden');
        }
      } catch {
        showToast(pt('today.errors.changeStatus'), 'error');
      }
    }

    // ── Bump time (Skjut fram) ────────────────────────────

    async function bumpTime(minutes) {
      if (!currentLog) return;
      try {
        const res = await apiFetch(`/api/daily-logs/${currentLog.id}/bump-time`, {
          method: 'PUT',
          body: JSON.stringify({ minutes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fel');

        if (data.updated === 0) {
          showToast('Inga ej avbockade aktiviteter med tider att justera', 'error');
          return;
        }

        // Save snapshot for undo
        bumpTimeSnapshot = data.snapshot;

        // Update local item times
        for (const updated of data.items) {
          const idx = currentItems.findIndex(i => i.id === updated.id);
          if (idx !== -1) {
            currentItems[idx] = { ...currentItems[idx], start_time: updated.start_time, end_time: updated.end_time };
          }
        }

        // Re-render all activity cards to show new times
        for (const item of currentItems) {
          const card = document.getElementById(`card-${item.id}`);
          if (card) card.outerHTML = renderActivityCard(item);
        }

        // Enable undo button
        const undoBtn = document.getElementById('undoBumpBtn');
        if (undoBtn) {
          undoBtn.disabled = false;
          undoBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        }

        showToast(pt('today.bump.moved', { count: data.updated, suffix: data.updated === 1 ? pt('today.bump.movedOne') : pt('today.bump.movedMany'), minutes }));
      } catch (err) {
        showToast(err.message || 'Kunde inte justera tider', 'error');
      }
    }

    async function undoBumpTime() {
      if (!currentLog || !bumpTimeSnapshot) return;
      try {
        const res = await apiFetch(`/api/daily-logs/${currentLog.id}/bump-time-undo`, {
          method: 'PUT',
          body: JSON.stringify({ snapshot: bumpTimeSnapshot }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fel');

        // Clear snapshot
        bumpTimeSnapshot = null;

        // Update local item times
        for (const restored of data.items) {
          const idx = currentItems.findIndex(i => i.id === restored.id);
          if (idx !== -1) {
            currentItems[idx] = { ...currentItems[idx], start_time: restored.start_time, end_time: restored.end_time };
          }
        }

        // Re-render all activity cards
        for (const item of currentItems) {
          const card = document.getElementById(`card-${item.id}`);
          if (card) card.outerHTML = renderActivityCard(item);
        }

        // Disable undo button
        const undoBtn = document.getElementById('undoBumpBtn');
        if (undoBtn) {
          undoBtn.disabled = true;
          undoBtn.classList.add('opacity-40', 'cursor-not-allowed');
        }

        showToast(pt('today.bump.undoToast'));
      } catch (err) {
        showToast(err.message || pt('today.errors.undo'), 'error');
      }
    }

    // ── Utilities ─────────────────────────────────────────

    function escHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // showToast is now in /js/toast.js

    // Use the global window.apiFetch (defined in auth.js) which handles
    // CSRF tokens, auth headers, and token refresh automatically.
    // A previous local apiFetch was missing CSRF headers, causing 403 errors
    // on all PUT/POST requests from this page.
    const apiFetch = window.apiFetch;

    // ── Print functions ──────────────────────────────────

    function togglePrintMenu() {
      document.getElementById('printMenu').classList.toggle('hidden');
    }
    function closePrintMenu() {
      document.getElementById('printMenu').classList.add('hidden');
    }
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dd = document.getElementById('printDropdown');
      if (dd && !dd.contains(e.target)) closePrintMenu();
    });

    function goPrintSchemaPdf(scope) {
      if (!currentChildId) { showToast(pt('today.errors.selectChild'), 'error'); return; }
      let url = '/print-schema?childId=' + encodeURIComponent(currentChildId);
      if (scope === 'my') url += '&scope=my';
      trackPrintExport(scope === 'my' ? 'my_days' : 'week');
      window.location.href = url;
    }

    function printDay() {
      trackPrintExport('day');
      window.print();
    }

    async function printWeek() {
      if (!currentChildId) { showToast(pt('today.errors.selectChild'), 'error'); return; }
      const child = children.find(c => c.id === currentChildId);
      const childName = child ? child.name : pt('today.childFallback');
      const childAvatarHtml = child ? renderChildAvatar(child, 32) : '';

      // Calculate Monday of current week
      const current = new Date(currentDateStr + 'T12:00:00');
      const dow = current.getDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(current);
      monday.setDate(current.getDate() + mondayOffset);

      const DAY_NAMES_SHORT = (window.LocaleDateTime && LocaleDateTime.weekDayLabelsSundayFirst)
        ? LocaleDateTime.weekDayLabelsSundayFirst()
        : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const DAY_NAMES_FULL = DAY_NAMES_SHORT.map((_, i) => {
        const d = new Date('2024-01-07T12:00:00');
        d.setDate(d.getDate() + i);
        return (window.LocaleDateTime && LocaleDateTime.weekdayLong)
          ? LocaleDateTime.weekdayLong(d) : DAY_NAMES_SHORT[i];
      });
      const SECTION_ORDER   = ['morgon', 'dag', 'kvall', 'natt'];
      const sectionLabelEmoji = (sec) => (window.LocaleDateTime && LocaleDateTime.sectionLabelWithEmoji)
        ? LocaleDateTime.sectionLabelWithEmoji(sec)
        : sec;

      // Fetch all 7 days
      const dayPromises = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        dayPromises.push(
          apiFetch(`/api/children/${currentChildId}/daily-log?date=${dateStr}`)
            .then(r => r.json())
            .then(data => ({ dateStr, date: d, items: data.items || [], log: data.log }))
            .catch(() => ({ dateStr, date: d, items: [], log: null }))
        );
      }

      showToast(pt('today.weekOverview.preparing'));
      const days = await Promise.all(dayPromises);

      // Build compact A4-landscape week grid
      const mondayStr = (window.LocaleDateTime && LocaleDateTime.monthDayYear) ? LocaleDateTime.monthDayYear(monday) : monday.toISOString().slice(0,10);
      const sundayDate = new Date(monday);
      sundayDate.setDate(monday.getDate() + 6);
      const sundayStr = (window.LocaleDateTime && LocaleDateTime.monthDay) ? LocaleDateTime.monthDay(sundayDate) : sundayDate.toISOString().slice(0,10);

      // One column per day
      const dayColumns = days.map(day => {
        const dayIdx = day.date.getDay();
        const dayShort = DAY_NAMES_SHORT[dayIdx];
        const dayFull  = DAY_NAMES_FULL[dayIdx];
        const dayNum   = day.date.getDate();
        const monthNum = day.date.getMonth() + 1;

        let colHtml = `<div style="border:1px solid #ccc;border-radius:4px;overflow:hidden;display:flex;flex-direction:column;">
          <div style="background:#1B2340;color:white;padding:4px 6px;font-size:9px;font-weight:700;font-family:Outfit,sans-serif;line-height:1.2;">
            ${escHtml(dayFull)}<br><span style="font-size:8px;opacity:0.8;">${dayNum}/${monthNum}</span>
          </div>
          <div style="padding:4px;flex:1;">`;

        if (day.items.length === 0) {
          colHtml += `<div style="color:#aaa;font-size:7px;padding:4px 2px;font-style:italic;">–</div>`;
        } else {
          const grouped = {};
          for (const item of day.items) {
            const sec = item.section || 'dag';
            if (!grouped[sec]) grouped[sec] = [];
            grouped[sec].push(item);
          }
          for (const sec of SECTION_ORDER) {
            if (!grouped[sec]) continue;
            colHtml += `<div style="font-size:6.5px;color:#888;font-weight:700;margin:4px 0 2px;text-transform:uppercase;letter-spacing:0.3px;">${sectionLabelEmoji(sec)}</div>`;
            for (const item of grouped[sec]) {
              const check = item.completed ? '☑' : '☐';
              const timeStr = item.start_time ? `<span style="color:#888;"> ${item.start_time}</span>` : '';
              colHtml += `<div style="display:flex;align-items:baseline;gap:2px;padding:1.5px 0;font-size:7.5px;line-height:1.3;border-bottom:1px solid #f0f0f0;">
                <span style="flex-shrink:0;">${check}</span>
                <span style="flex-shrink:0;">${item.icon || ''}</span>
                <span style="flex:1;word-break:break-word;">${escHtml(item.name)}${timeStr}</span>
              </div>`;
            }
          }
        }

        colHtml += `</div></div>`;
        return colHtml;
      }).join('');

      const printStyles = `
        @page { size: A4 landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1B2340; }
        .week-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #1B2340; }
        .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
      `;

      const weekHtml = `
        <div class="week-header">
          <span style="font-size:1.6em;">${childAvatarHtml}</span>
          <div>
            <h1 style="font-family:Outfit,Arial,sans-serif;font-size:13px;margin:0;color:#1B2340;">${escHtml(pt('today.weekOverview.weekScheduleTitle', { name: childName }))}</h1>
            <p style="color:#5A6178;margin:2px 0 0;font-size:9px;">${mondayStr} – ${sundayStr}</p>
          </div>
        </div>
        <div class="week-grid">${dayColumns}</div>
      `;

      // Open print window
      const printWin = window.open('', '_blank', 'width=1100,height=700');
      printWin.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8">' +
        '<title>Veckoschema \u2014 ' + escHtml(childName) + '<\/title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">' +
        '<style>' + printStyles + '<\/style>' +
        '<\/head><body>' + weekHtml + '<\/body><\/html>');
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 800);
      trackPrintExport('week');
    }

    async function printMyDaysWeek() {
      if (!currentChildId) { showToast(pt('today.errors.selectChild'), 'error'); return; }
      if (!custodyPrintEnabled) { showToast(pt('today.errors.custodyDisabled'), 'error'); return; }

      const child = children.find(c => c.id === currentChildId);
      const childName = child ? child.name : pt('today.childFallback');
      const childAvatarHtml = child ? renderChildAvatar(child, 32) : '';

      showToast(pt('today.weekOverview.preparingCustody'));
      const calRes = await apiFetch(
        `/api/children/${currentChildId}/calendar-week?weekOffset=0&myDays=1`
      );
      if (!calRes.ok) { showToast(pt('today.errors.loadWeek'), 'error'); return; }
      const cal = await calRes.json();

      const myDays = (cal.days || []).filter((d) => d.activities && d.activities.length > 0);
      if (!myDays.length) {
        showToast(pt('today.weekOverview.noMyDays'), 'error');
        return;
      }

      if (window.analytics && typeof window.analytics.track === 'function') {
        window.analytics.track('custody_view_filtered', { source: 'print_my_days', days: myDays.length });
      }

      const DAY_NAMES_FULL = (window.LocaleDateTime && LocaleDateTime.weekDayLabelsSundayFirst)
        ? LocaleDateTime.weekDayLabelsSundayFirst().map((_, i) => {
          const d = new Date('2024-01-07T12:00:00');
          d.setDate(d.getDate() + i);
          return LocaleDateTime.weekdayLong(d);
        }) : [];
      const SECTION_ORDER = ['morgon', 'dag', 'kvall', 'natt'];
      const sectionLabelEmoji = (sec) => (window.LocaleDateTime && LocaleDateTime.sectionLabelWithEmoji)
        ? LocaleDateTime.sectionLabelWithEmoji(sec) : sec;

      const dayColumns = myDays.map((day) => {
        const d = new Date(day.date + 'T12:00:00');
        const dayFull = DAY_NAMES_FULL[day.dayOfWeek] || day.dayName;
        const borderColor = day.custody?.color || '#1B2340';
        let colHtml = `<div style="border:2px solid ${borderColor};border-radius:4px;overflow:hidden;display:flex;flex-direction:column;">
          <div style="background:${borderColor};color:white;padding:4px 6px;font-size:9px;font-weight:700;line-height:1.2;">
            ${escHtml(dayFull)}<br><span style="font-size:8px;opacity:0.9;">${escHtml(day.date)}</span>
          </div><div style="padding:4px;flex:1;">`;

        const grouped = {};
        for (const item of day.activities) {
          const sec = item.section || 'dag';
          if (!grouped[sec]) grouped[sec] = [];
          grouped[sec].push(item);
        }
        for (const sec of SECTION_ORDER) {
          if (!grouped[sec]) continue;
          colHtml += `<div style="font-size:6.5px;color:#888;font-weight:700;margin:4px 0 2px;">${sectionLabelEmoji(sec)}</div>`;
          for (const item of grouped[sec]) {
            const check = item.completed ? '☑' : '☐';
            colHtml += `<div style="font-size:7.5px;padding:1.5px 0;border-bottom:1px solid #f0f0f0;">
              ${check} ${item.icon || ''} ${escHtml(item.name)}
            </div>`;
          }
        }
        colHtml += '</div></div>';
        return colHtml;
      }).join('');

      const weekHtml = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;border-bottom:2px solid #1B2340;padding-bottom:6px;">
          <span style="font-size:1.6em;">${childAvatarHtml}</span>
          <div>
            <h1 style="font-family:Outfit,Arial,sans-serif;font-size:13px;margin:0;">${escHtml(pt('today.weekOverview.myDaysTitle', { name: childName }))}</h1>
            <p style="font-size:9px;color:#5A6178;margin:2px 0 0;">${escHtml(cal.weekStart)} – ${escHtml(cal.weekEnd)}</p>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(${myDays.length},1fr);gap:5px;">${dayColumns}</div>`;

      const printWin = window.open('', '_blank', 'width=1100,height=700');
      printWin.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mina dagar</title><style>@page{size:A4 landscape;margin:8mm;}body{margin:0;font-family:Arial,sans-serif;}</style></head><body>' + weekHtml + '</body></html>');
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 800);
      trackPrintExport('my_days');
    }

    // ── Parent Ratings ────────────────────────────────────

    function openParentRating(itemId, itemName) {
      ratingItemId = itemId;
      ratingScore = 0;
      document.getElementById('parentRatingName').textContent = itemName || pt('today.activity.defaultName');
      document.getElementById('parentRatingComment').value = '';
      document.getElementById('parentRatingSubmit').disabled = true;
      document.getElementById('parentRatingLabel').textContent = '';

      // Pre-fill if already rated
      const existing = itemRatings[itemId];
      if (existing && existing.parent_score) {
        ratingScore = existing.parent_score;
        document.getElementById('parentRatingComment').value = existing.parent_comment || '';
        document.getElementById('parentRatingSubmit').disabled = false;
        document.getElementById('parentRatingLabel').textContent = starLabel(ratingScore);
      }

      // Reset star buttons
      document.querySelectorAll('.parent-star-btn').forEach(b => {
        const s = parseInt(b.dataset.star);
        const on = ratingScore && s <= ratingScore;
        b.style.filter = on ? 'none' : 'grayscale(0.7)';
      });

      document.getElementById('parentRatingModal').classList.remove('hidden');
    }

    function selectParentStar(n) {
      ratingScore = n;
      document.querySelectorAll('.parent-star-btn').forEach(b => {
        const s = parseInt(b.dataset.star);
        b.style.filter = s <= n ? 'none' : 'grayscale(0.7)';
      });
      document.getElementById('parentRatingLabel').textContent = starLabel(n);
      document.getElementById('parentRatingSubmit').disabled = false;
    }

    function closeParentRating() {
      document.getElementById('parentRatingModal').classList.add('hidden');
      ratingItemId = null;
    }

    async function submitParentRating() {
      if (!ratingItemId || !ratingScore) return;
      const comment = document.getElementById('parentRatingComment').value.trim();
      try {
        const res = await apiFetch(`/api/daily-log-items/${ratingItemId}/rate`, {
          method: 'POST',
          body: JSON.stringify({ score: ratingScore, comment: comment || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fel');

        // Update cached rating
        if (!itemRatings[ratingItemId]) itemRatings[ratingItemId] = {};
        itemRatings[ratingItemId].parent_score = ratingScore;
        itemRatings[ratingItemId].parent_comment = comment;

        closeParentRating();

        // Re-render the affected card
        const item = currentItems.find(i => i.id === ratingItemId);
        const card = document.getElementById(`card-${ratingItemId}`);
        if (item && card) {
          card.outerHTML = renderActivityCard(item);
        }

        showToast('⭐ Betyg sparat!');
      } catch (err) {
        showToast(err.message || 'Kunde inte spara betyg', 'error');
      }
    }
  