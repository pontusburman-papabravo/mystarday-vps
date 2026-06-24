/**
 * dashboard-home-hub.js — Parent home mockup layout (mobile / native).
 * Reads dashboardStats; minimal coupling to dashboard.js.
 */
(function () {
  'use strict';

  var DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

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
    var editor = document.getElementById('scheduleEditorView');
    var list = document.getElementById('childrenListView');
    if (editor && !editor.classList.contains('hidden')) return false;
    if (list && list.classList.contains('hidden')) return false;
    return true;
  }

  function shouldUse() {
    if (!isOverviewVisible()) return false;
    if (window.AppViewMode && !AppViewMode.isAllowed()) return false;
    if (window.AppViewMode && !AppViewMode.isMagic()) return false;
    if (window._stjarndagFeatures && window._stjarndagFeatures.parent_home_magic === false) return false;
    return true;
  }

  function timeGreeting() {
    if (window.DashboardDailySummary && typeof window.DashboardDailySummary.timeGreeting === 'function') {
      return window.DashboardDailySummary.timeGreeting();
    }
    var h = new Date().getHours();
    if (h >= 5 && h < 11) return 'God morgon!';
    if (h >= 11 && h < 17) return 'Hej!';
    if (h >= 17 && h < 22) return 'God kväll!';
    return 'Hej!';
  }

  function getChildStatus(c) {
    if (c.today_is_paused) return { text: 'Ledig idag', icon: '🏠' };
    var items = c.today_items || [];
    var total = c.today_total || 0;
    var done = c.today_completed || 0;
    if (total > 0 && done === total) return { text: 'Allt klart!', icon: '✅' };
    if (total === 0) return { text: 'Inget schema', icon: '📋' };
    var next = items.find(function (item) { return !item.completed; });
    if (next) return { text: next.name, icon: next.icon || '📋' };
    return { text: done + '/' + total + ' klara', icon: '⭐' };
  }

  function findFocusChild(children) {
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c.today_is_paused) continue;
      var items = c.today_items || [];
      for (var j = 0; j < items.length; j++) {
        if (!items[j].completed) return c.id;
      }
    }
    return children.length ? children[0].id : null;
  }

  function buildWeekSeries(children) {
    var today = new Date();
    var dow = today.getDay();
    var mondayOffset = dow === 0 ? -6 : 1 - dow;
    var series = [];

    for (var i = 0; i < 7; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      var dateStr = d.toLocaleDateString('sv-SE');
      var totalCompleted = 0;
      children.forEach(function (c) {
        var hist = c.history || [];
        var row = hist.find(function (h) { return h.date === dateStr; });
        if (row) totalCompleted += row.completed || 0;
        else if (dateStr === today.toLocaleDateString('sv-SE')) {
          totalCompleted += c.today_completed || 0;
        }
      });
      series.push({
        label: DAY_LABELS[i],
        value: totalCompleted,
        isToday: dateStr === today.toLocaleDateString('sv-SE'),
        isFuture: d > today && dateStr !== today.toLocaleDateString('sv-SE'),
      });
    }
    return series;
  }

  function renderWeekChart(series) {
    if (!series.length) return '';
    var max = 1;
    series.forEach(function (p) { if (p.value > max) max = p.value; });

    var w = 280;
    var h = 80;
    var padX = 12;
    var padY = 10;
    var step = (w - padX * 2) / (series.length - 1 || 1);

    var points = series.map(function (p, i) {
      var x = padX + i * step;
      var y = h - padY - (p.isFuture ? 0 : (p.value / max) * (h - padY * 2));
      return { x: x, y: y, p: p };
    });

    var polyline = points.map(function (pt) { return pt.x + ',' + pt.y; }).join(' ');
    var area = polyline + ' ' + (padX + (series.length - 1) * step) + ',' + h + ' ' + padX + ',' + h;

    var labels = series.map(function (p) {
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

  function encouragementCopy(children) {
    var allDone = children.length > 0 && children.every(function (c) {
      var t = c.today_total || 0;
      return t > 0 && (c.today_completed || 0) === t;
    });
    if (allDone) {
      return { emoji: '🌟', title: 'Bra jobbat!', sub: 'Alla barn har klarat dagens schema' };
    }
    var stars = children.reduce(function (s, c) { return s + (c.stars_today || 0); }, 0);
    if (stars >= 5) {
      return { emoji: '✨', title: 'Stjärnig dag!', sub: stars + ' stjärnor samlade idag' };
    }
    return { emoji: '💛', title: 'Fortsätt så!', sub: 'Små steg varje dag blir stora framsteg' };
  }

  function renderAvatar(child, size) {
    if (typeof window.renderChildAvatar === 'function') {
      return window.renderChildAvatar(child, size || 32);
    }
    return '<span>' + escHtml(child.emoji || '⭐') + '</span>';
  }

  function renderReadyRow(children, focusId) {
    if (!children.length) {
      return '<p class="parent-ready-empty">Lägg till barn under Familj för att se status här.</p>';
    }
    return children.map(function (c) {
      var status = getChildStatus(c);
      var active = c.id === focusId ? ' is-active' : '';
      return '<button type="button" class="parent-ready-child magic-3d-card' + active + '" data-action="open-schedule" data-child-id="' + escHtml(c.id) + '">' +
        (active ? '<span class="parent-ready-badge" aria-hidden="true">⭐</span>' : '') +
        '<div class="parent-ready-avatar">' + renderAvatar(c, 44) + '</div>' +
        '<div class="parent-ready-name">' + escHtml(capName(c.name)) + '</div>' +
        '<div class="parent-ready-task">' + escHtml(status.icon) + ' ' + escHtml(status.text) + '</div>' +
        '</button>';
    }).join('');
  }

  function renderActionGrid() {
    var actions = [
      { action: 'give-stars', icon: '⭐', label: 'Ge extra stjärnor' },
      { action: 'backfill-log', icon: '📝', label: 'Fyll i i efterhand' },
      { action: 'once-task', icon: '📋', label: 'Engångsaktivitet' },
      { action: 'ledig-dag', icon: '🏠', label: 'Ledig dag' },
      { action: 'today-schedule', icon: '📅', label: 'Dagens schema' },
      { action: 'stats', icon: '📊', label: 'Statistik' },
      { action: 'messages', icon: '💬', label: 'Meddelanden' },
    ];
    return actions.map(function (a) {
      return '<button type="button" class="parent-action-tile magic-3d-card" data-action="' + escHtml(a.action) + '">' +
        '<span class="parent-action-icon" aria-hidden="true">' + a.icon + '</span>' +
        '<span class="parent-action-label">' + escHtml(a.label) + '</span></button>';
    }).join('');
  }

  function renderCoParentCta(stats) {
    if (!stats || stats.parent_count === undefined || stats.parent_count >= 2) return '';
    if (window._stjarndagFeatures && !window._stjarndagFeatures.medforalder_cta) return '';
    try {
      var raw = localStorage.getItem('medforalder_cta_dismissed');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts < 7 * 24 * 60 * 60 * 1000) return '';
      }
    } catch (_) { /* show CTA */ }
    return '<section class="parent-glass-card parent-coparent-cta">' +
      '<div class="parent-coparent-cta-inner">' +
      '<span class="parent-coparent-cta-icon" aria-hidden="true">👨‍👩‍👧</span>' +
      '<div class="parent-coparent-cta-copy">' +
      '<strong>Bjud in en medförälder</strong>' +
      '<span>Så slipper ni fråga varandra om schemat</span>' +
      '</div>' +
      '<button type="button" class="parent-coparent-cta-btn" data-action="invite-coparent">Bjud in</button>' +
      '</div></section>';
  }

  function render(stats) {
    var mount = document.getElementById('parentHomeHubMount');
    if (!mount) return false;

    if (!shouldUse()) {
      document.body.classList.remove('parent-magic-dashboard');
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return false;
    }

    document.body.classList.add('parent-magic-dashboard');
    mount.classList.remove('hidden');

    var children = (stats && stats.children) ? stats.children : [];
    var user = (window.Auth && Auth.getUser) ? Auth.getUser() : null;
    var focusId = findFocusChild(children);
    var enc = encouragementCopy(children);
    var weekSeries = buildWeekSeries(children);
    var scheduleHref = focusId ? '/schedule?child=' + encodeURIComponent(focusId) : '/schedule';

    mount.innerHTML =
      '<div class="parent-home-hub magic-3d-scene">' +
      '<header class="parent-hub-top">' +
      '<div class="parent-hub-family-avatar" aria-hidden="true">👨‍👩‍👧</div>' +
      '</header>' +
      '<div class="parent-hub-greeting-block">' +
      '<h1 class="parent-hub-greeting">' + escHtml(timeGreeting()) + '</h1>' +
      '<p class="parent-hub-sub">Här är en översikt av er familjs framsteg. ✨</p>' +
      '<div class="parent-hub-mascot" aria-hidden="true">⭐</div>' +
      '</div>' +
      renderCoParentCta(stats) +
      '<section class="parent-ready-section parent-glass-card">' +
      '<div class="parent-ready-head">' +
      '<h2>Redo för nästa aktivitet' + (children.length > 1 ? ' <span class="parent-ready-count">(' + children.length + ' barn)</span>' : '') + '</h2>' +
      '<div class="parent-ready-head-links">' +
      '<a class="parent-schedule-link" href="/daily-log">Fyll i i efterhand →</a>' +
      '<a class="parent-schedule-link" href="' + scheduleHref + '">Visa schema →</a>' +
      '</div></div>' +
      '<div class="parent-ready-scroll">' + renderReadyRow(children, focusId) + '</div>' +
      '</section>' +
      '<div class="parent-action-grid">' + renderActionGrid() + '</div>' +
      '<section class="parent-glass-card parent-handoff-card parent-handoff-large">' +
      '<div class="parent-handoff-lock" aria-hidden="true">🔒</div>' +
      '<div class="parent-handoff-copy">' +
      '<p class="parent-handoff-title">Dags för barnet att logga in?</p>' +
      '<p class="parent-handoff-sub">Byt till barnets vy med PIN-kod — eller logga ut helt.</p>' +
      '</div>' +
      '<div class="parent-handoff-actions">' +
      '<button type="button" class="parent-handoff-primary" data-action="child-login">👶 Barnet loggar in</button>' +
      '<button type="button" class="parent-handoff-secondary" data-action="parent-logout">Logga ut</button>' +
      '</div></section>' +
      '<section class="parent-glass-card parent-week-section">' +
      '<div class="parent-ready-head">' +
      '<h3>Veckans framsteg</h3>' +
      '<a class="parent-schedule-link" href="/daily-log">Fyll i glömda dagar →</a>' +
      '</div>' +
      renderWeekChart(weekSeries) +
      '<div class="parent-encourage-inline">' +
      '<span class="emoji" aria-hidden="true">' + enc.emoji + '</span>' +
      '<div><strong>' + escHtml(enc.title) + '</strong><span>' + escHtml(enc.sub) + '</span></div>' +
      '</div></section>' +
      '</div>';

    bindActions(mount);
    return true;
  }

  function bindActions(mount) {
    mount.onclick = function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');

      if (action === 'give-stars' && typeof window.openGiveStarsQuick === 'function') {
        window.openGiveStarsQuick();
      } else if (action === 'backfill-log') {
        window.location.href = '/daily-log';
      } else if (action === 'once-task' && typeof window.openOnceTaskModal === 'function') {
        window.openOnceTaskModal();
      } else if (action === 'ledig-dag' && typeof window.openLedigDagModal === 'function') {
        window.openLedigDagModal();
      } else if (action === 'today-schedule') {
        window.location.href = '/schedule';
      } else if (action === 'messages') {
        window.location.href = '/notifications';
      } else if (action === 'stats') {
        var week = mount.querySelector('.parent-week-section');
        if (week) week.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'open-schedule') {
        var cid = btn.getAttribute('data-child-id');
        window.location.href = cid ? '/schedule?child=' + encodeURIComponent(cid) : '/schedule';
      } else if (action === 'child-login') {
        if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
          DashboardChildHandoff.startChildLogin();
        } else if (window.Auth && Auth.logout) {
          Auth.logout({ childFlow: true });
        } else {
          window.location.href = '/child-login';
        }
      } else if (action === 'invite-coparent') {
        if (typeof window.openCoParentInviteModal === 'function') {
          window.openCoParentInviteModal();
        } else if (typeof window.openMedforalderCtaInvite === 'function') {
          window.openMedforalderCtaInvite();
        }
      } else if (action === 'parent-logout') {
        if (window.DashboardChildHandoff && DashboardChildHandoff.parentLogout) {
          DashboardChildHandoff.parentLogout();
        } else if (typeof window.logout === 'function') {
          window.logout();
        }
      }
    };
  }

  window.DashboardHomeHub = {
    render: render,
    shouldUse: shouldUse,
  };
})();
