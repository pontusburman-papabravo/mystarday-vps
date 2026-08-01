/**
 * dashboard-home-hub.js — Parent home magic layout (Hem 10/10).
 * Priority ladder: undantag → status → coach → handoff → vecka.
 */
(function () {
  'use strict';

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function dayLabels() {
    if (window.LocaleDateTime && typeof LocaleDateTime.weekDayLabelsMondayFirst === 'function') {
      return LocaleDateTime.weekDayLabelsMondayFirst();
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function capName(name) {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function isOverviewVisible() {
    const editor = document.getElementById('scheduleEditorView');
    const list = document.getElementById('childrenListView');
    if (editor && !editor.classList.contains('hidden')) return false;
    if (list && list.classList.contains('hidden')) return false;
    return true;
  }

  function shouldUse() {
    if (!isOverviewVisible()) return false;
    if (window.AppViewMode && !AppViewMode.isAllowed()) return false;
    if (window.AppViewMode && !AppViewMode.isMagic()) return false;
    // P-i18n-Home-B: en-GB + english_app ON always uses localized magic hub.
    if (window.ParentHomeLocaleGate && ParentHomeLocaleGate.forceMagicHub()) return true;
    if (window._stjarndagFeatures && window._stjarndagFeatures.parent_home_magic === false) return false;
    return true;
  }

  function isAndroidFlatMode() {
    return document.documentElement.classList.contains('is-native-android');
  }

  function magic3dClass(base) {
    return isAndroidFlatMode() ? base : base + ' magic-3d-card';
  }

  function timeGreeting() {
    if (window.DashboardDailySummary && typeof window.DashboardDailySummary.timeGreeting === 'function') {
      return window.DashboardDailySummary.timeGreeting();
    }
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return pt('home.greeting.morning');
    if (h >= 11 && h < 17) return pt('home.greeting.afternoon');
    if (h >= 17 && h < 22) return pt('home.greeting.evening');
    return pt('home.greeting.default');
  }

  function getChildStatus(c) {
    if (c.today_is_paused) return { text: pt('home.status.paused'), icon: '🏠' };
    const items = c.today_items || [];
    const total = c.today_total || 0;
    const done = c.today_completed || 0;
    if (total > 0 && done === total) return { text: pt('home.status.allDone'), icon: '✅' };
    if (total === 0) return { text: pt('home.status.noSchedule'), icon: '📋' };
    const next = items.find(function (item) { return !item.completed; });
    if (next) return { text: next.name, icon: next.icon || '📋' };
    return { text: pt('home.status.progressDone', { done: done, total: total }), icon: '⭐' };
  }

  function progressLabel(c) {
    if (c.today_is_paused) return '';
    const total = c.today_total || 0;
    const done = c.today_completed || 0;
    if (total === 0) return '';
    return done + '/' + total;
  }

  /**
   * Home read-only mode — daily log / child profile owns check-off (B-08).
   * Barn med aktiviteter idag → dagens daglig logg; annars barnprofil.
   */
  function childRowHref(c) {
    const total = c.today_total || 0;
    if (total > 0) {
      const today = new Date().toISOString().slice(0, 10);
      return '/daily-log?childId=' + encodeURIComponent(c.id) + '&date=' + encodeURIComponent(today);
    }
    return '/family/child/' + encodeURIComponent(c.id);
  }

  function findFocusChild(children) {
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (c.today_is_paused) continue;
      const items = c.today_items || [];
      for (let j = 0; j < items.length; j++) {
        if (!items[j].completed) return c.id;
      }
    }
    return children.length ? children[0].id : null;
  }

  function buildWeekSeries(children) {
    const today = new Date();
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const series = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      const dateStr = d.toISOString().slice(0, 10);
      let totalCompleted = 0;
      children.forEach(function (c) {
        const hist = c.history || [];
        const row = hist.find(function (h) { return h.date === dateStr; });
        if (row) totalCompleted += row.completed || 0;
        else if (dateStr === today.toISOString().slice(0, 10)) {
          totalCompleted += c.today_completed || 0;
        }
      });
      series.push({
        label: dayLabels()[i],
        value: totalCompleted,
        isToday: dateStr === today.toISOString().slice(0, 10),
        isFuture: d > today && dateStr !== today.toISOString().slice(0, 10),
      });
    }
    return series;
  }

  function renderWeekChart(series) {
    if (!series.length) return '';
    let max = 1;
    series.forEach(function (p) { if (p.value > max) max = p.value; });

    const w = 280;
    const h = 80;
    const padX = 12;
    const padY = 10;
    const step = (w - padX * 2) / (series.length - 1 || 1);

    const points = series.map(function (p, i) {
      const x = padX + i * step;
      const y = h - padY - (p.isFuture ? 0 : (p.value / max) * (h - padY * 2));
      return { x: x, y: y, p: p };
    });

    const polyline = points.map(function (pt) { return pt.x + ',' + pt.y; }).join(' ');
    const area = polyline + ' ' + (padX + (series.length - 1) * step) + ',' + h + ' ' + padX + ',' + h;

    const labels = series.map(function (p) {
      return '<span class="' + (p.isToday ? 'is-today' : '') + '">' + escHtml(p.label) + '</span>';
    }).join('');

    return '<div class="parent-week-chart">' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="parentWeekGlow" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffcc33" stop-opacity="0.35"/>' +
      '<stop offset="100%" stop-color="#ffcc33" stop-opacity="0"/></linearGradient></defs>' +
      '<polygon points="' + area + '" fill="url(#parentWeekGlow)"/>' +
      '<polyline points="' + polyline + '" fill="none" stroke="#ffcc33" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      points.filter(function (pt) { return !pt.p.isFuture; }).map(function (pt) {
        return '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="3.5" fill="#ffcc33"/>';
      }).join('') +
      '</svg></div>' +
      '<div class="parent-week-labels">' + labels + '</div>';
  }

  function renderAvatar(child, size) {
    if (typeof window.renderChildAvatar === 'function') {
      return window.renderChildAvatar(child, size || 32);
    }
    return '<span>' + escHtml(child.emoji || '⭐') + '</span>';
  }

  function renderReadyRow(children, focusId) {
    if (!children.length) {
      return '<p class="parent-ready-empty">' + escHtml(pt('home.status.emptyChildren')) + '</p>';
    }
    return children.map(function (c) {
      const status = getChildStatus(c);
      const progress = progressLabel(c);
      const active = c.id === focusId ? ' is-active' : '';
      const href = childRowHref(c);
      const name = capName(c.name);
      return '<a href="' + escHtml(href) + '" class="' + magic3dClass('parent-ready-child') + active + ' no-underline" data-child-id="' + escHtml(c.id) + '" aria-label="' + escHtml(pt('home.status.viewActivitiesAria', { name: name })) + '">' +
        (active ? '<span class="parent-ready-badge" aria-hidden="true">⭐</span>' : '') +
        '<div class="parent-ready-avatar">' + renderAvatar(c, 44) + '</div>' +
        '<div class="parent-ready-name">' + escHtml(name) + '</div>' +
        '<div class="parent-ready-task">' + escHtml(status.icon) + ' ' + escHtml(status.text) + '</div>' +
        (progress ? '<div class="parent-ready-progress">' + escHtml(progress) + '</div>' : '') +
        '<span class="parent-ready-chevron" aria-hidden="true">→</span>' +
        '</a>';
    }).join('');
  }

  function offsetIsoDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function retroactiveLogHref(children) {
    let date = offsetIsoDate(-1);
    let childId = null;
    if (children.length === 1) {
      childId = children[0].id;
      if (children[0].latest_incomplete_date) date = children[0].latest_incomplete_date;
    } else {
      const withIncomplete = children.filter(function (c) {
        return (c.incomplete_past_days || 0) > 0;
      });
      if (withIncomplete.length === 1) {
        childId = withIncomplete[0].id;
        if (withIncomplete[0].latest_incomplete_date) date = withIncomplete[0].latest_incomplete_date;
      }
    }
    const params = new URLSearchParams();
    if (childId) params.set('childId', String(childId));
    params.set('date', date);
    return '/daily-log?' + params.toString();
  }

  function quickActionIcon(key, emojiFallback) {
    if (window.IconSystem && IconSystem.isQuickActionV4 && IconSystem.isQuickActionV4(key)) {
      return '<span class="parent-quick-tile-icon">' + IconSystem.quickAction(key, emojiFallback) + '</span>';
    }
    if (window.IconSystem && IconSystem.has(key)) {
      return '<span class="parent-quick-tile-icon">' + IconSystem.hub(key) + '</span>';
    }
    return '<span class="parent-quick-tile-icon" aria-hidden="true">' + emojiFallback + '</span>';
  }

  function renderQuickActions(children) {
    const logHref = escHtml(retroactiveLogHref(children));
    return '<div class="parent-quick-grid" role="group" aria-label="' + escHtml(pt('home.quickActions.aria')) + '">' +
      '<a href="' + logHref + '" class="parent-quick-tile parent-quick-tile-link no-underline">' +
      quickActionIcon('registrera-i-efterhand', '📝') +
      '<span class="parent-quick-tile-label">' + escHtml(pt('home.quickActions.retroactive')) + '</span></a>' +
      '<button type="button" class="parent-quick-tile" data-action="once-task">' +
      quickActionIcon('engangsaktivitet', '📋') +
      '<span class="parent-quick-tile-label">' + escHtml(pt('home.quickActions.onceTask')) + '</span></button>' +
      '<button type="button" class="parent-quick-tile" data-action="give-stars">' +
      quickActionIcon('extra-stjarnor', '⭐') +
      '<span class="parent-quick-tile-label">' + escHtml(pt('home.quickActions.extraStars')) + '</span></button>' +
      '<button type="button" class="parent-quick-tile" data-action="ledig-dag">' +
      quickActionIcon('ledig-dag', '🏠') +
      '<span class="parent-quick-tile-label">' + escHtml(pt('home.quickActions.dayOff')) + '</span></button>' +
      '</div>';
  }

  /** Move readiness + coach mounts into hub slots (priority ladder). */
  function relocateMounts(hubRoot) {
    const readinessSlot = hubRoot.querySelector('#parentHubReadinessSlot');
    const coachSlot = hubRoot.querySelector('#parentHubCoachSlot');
    const readiness = document.getElementById('homeReadinessMount');
    const engine = document.getElementById('engineCoachMount');
    const journey = document.getElementById('journeyCoachMount');

    if (readiness && readinessSlot) readinessSlot.appendChild(readiness);
    if (coachSlot) {
      if (engine) coachSlot.appendChild(engine);
      if (journey) coachSlot.appendChild(journey);
    }
  }

  /** Restore mounts to classic DOM order for engine-coach contract tests. */
  function restoreMounts() {
    const hub = document.getElementById('parentHomeHubMount');
    const engine = document.getElementById('engineCoachMount');
    const journey = document.getElementById('journeyCoachMount');
    const readiness = document.getElementById('homeReadinessMount');
    if (!hub) return;
    if (engine) hub.insertAdjacentElement('afterend', engine);
    if (journey && engine) engine.insertAdjacentElement('afterend', journey);
    if (readiness) {
      const after = journey || engine || hub;
      after.insertAdjacentElement('afterend', readiness);
    }
  }

  function render(stats) {
    const mount = document.getElementById('parentHomeHubMount');
    if (!mount) return false;

    if (!shouldUse()) {
      document.body.classList.remove('parent-magic-dashboard');
      mount.classList.add('hidden');
      mount.innerHTML = '';
      restoreMounts();
      return false;
    }

    document.body.classList.add('parent-magic-dashboard');
    mount.classList.remove('hidden');

    const children = (stats && stats.children) ? stats.children : [];
    const focusId = findFocusChild(children);
    const weekSeries = buildWeekSeries(children);

    mount.innerHTML =
      '<div class="parent-home-hub' + (isAndroidFlatMode() ? '' : ' magic-3d-scene') + '">' +
      '<div id="parentHubDailySummaryMount" class="parent-hub-daily-summary" aria-live="polite"></div>' +
      '<div class="parent-hub-greeting-block">' +
      '<h1 class="parent-hub-greeting">' + escHtml(timeGreeting()) + '</h1>' +
      '<p class="parent-hub-sub">' + escHtml(pt('home.sub')) + '</p>' +
      '</div>' +
      renderQuickActions(children) +
      '<div id="parentHubReadinessSlot" class="parent-hub-readiness-slot" aria-live="polite"></div>' +
      '<section class="parent-ready-section parent-glass-card">' +
      '<div class="parent-ready-head">' +
      '<h2>' + escHtml(pt('home.ready.title')) + (children.length > 1 ? ' <span class="parent-ready-count">' + escHtml(pt('home.ready.childrenCount', { count: children.length })) + '</span>' : '') + '</h2>' +
      '</div>' +
      '<div class="parent-ready-scroll">' + renderReadyRow(children, focusId) + '</div>' +
      '</section>' +
      '<div id="parentHubCoachSlot" class="parent-hub-coach-slot" aria-live="polite"></div>' +
      '<section class="parent-glass-card parent-handoff-card parent-handoff-large">' +
      '<div class="parent-handoff-lock" aria-hidden="true">🔒</div>' +
      '<div class="parent-handoff-copy">' +
      '<p class="parent-handoff-title">' + escHtml(pt('home.handoff.title')) + '</p>' +
      '<p class="parent-handoff-sub">' + escHtml(pt('home.handoff.sub')) + '</p>' +
      '</div>' +
      '<div class="parent-handoff-actions">' +
      '<button type="button" class="parent-handoff-primary" data-action="child-login">' + escHtml(pt('home.handoff.childLogin')) + '</button>' +
      '<button type="button" class="parent-handoff-secondary" data-action="parent-logout">' + escHtml(pt('home.handoff.parentLogout')) + '</button>' +
      '</div></section>' +
      '<section class="parent-glass-card parent-week-section">' +
      '<div class="parent-ready-head">' +
      '<h3>' + escHtml(pt('home.weekStory.title')) + '</h3>' +
      '</div>' +
      renderWeekChart(weekSeries) +
      '</section>' +
      '</div>';

    const hubRoot = mount.querySelector('.parent-home-hub');
    if (hubRoot) relocateMounts(hubRoot);

    bindActions(mount);

    void (async function refreshHemLadder() {
      if (window.JourneyContextClient) {
        try {
          const ctx = await JourneyContextClient.fetchContext();
          if (ctx?.signup_journey?.active) {
            const handoff = mount.querySelector('.parent-handoff-card');
            if (handoff) handoff.classList.add('hidden');
          }
        } catch (_) { /* non-critical */ }
      }
      if (window.HomeReadiness && typeof HomeReadiness.reload === 'function') {
        await HomeReadiness.reload();
      }
      if (window.EngineCoach && typeof EngineCoach.load === 'function') {
        await EngineCoach.load({ force: true }).catch(function () {});
      }
      if (window.JourneyCoach && typeof JourneyCoach.pollCoach === 'function') {
        await JourneyCoach.pollCoach();
      }
    }());

    return true;
  }

  function bindActions(mount) {
    function handleAction(action, _btn) {
      if (action === 'child-login') {
        if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
          DashboardChildHandoff.startChildLogin();
        } else if (window.Auth && Auth.logout) {
          Auth.logout({ childFlow: true });
        } else {
          window.location.href = '/child-login';
        }
        return;
      }
      if (action === 'parent-logout') {
        if (window.DashboardChildHandoff && DashboardChildHandoff.parentLogout) {
          DashboardChildHandoff.parentLogout();
        } else if (typeof window.logout === 'function') {
          window.logout();
        }
        return;
      }
      if (action === 'once-task') {
        if (typeof window.openOnceTaskModal === 'function') {
          void Promise.resolve(window.openOnceTaskModal()).catch(function (err) {
            console.error('[HUB] openOnceTaskModal failed:', err);
          });
        }
        return;
      }
      if (action === 'give-stars') {
        if (typeof window.openGiveStarsQuick === 'function') window.openGiveStarsQuick();
        return;
      }
      if (action === 'ledig-dag') {
        if (typeof window.openLedigDagModal === 'function') window.openLedigDagModal();
        return;
      }
    }

    mount.querySelectorAll('button[data-action]').forEach(function (btn) {
      if (btn.dataset.hubBound === '1') return;
      btn.dataset.hubBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        handleAction(btn.getAttribute('data-action'), btn);
      });
    });
  }

  window.DashboardHomeHub = {
    render: render,
    shouldUse: shouldUse,
    restoreMounts: restoreMounts,
    relocateMounts: relocateMounts,
  };
})();
