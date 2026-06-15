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

  function isNativeShell() {
    return (window.Platform && Platform.isNative && Platform.isNative()) ||
      document.body.classList.contains('has-native-tab-bar') ||
      document.documentElement.classList.contains('platform-native');
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

  function familySubtitle(children) {
    if (!children.length) return 'Lägg till barn för att komma igång';
    var done = children.reduce(function (s, c) { return s + (c.today_completed || 0); }, 0);
    var total = children.reduce(function (s, c) { return s + (c.today_total || 0); }, 0);
    if (total > 0 && done === total) return 'Alla aktiviteter klara idag — bra jobbat!';
    if (total > 0) return done + ' av ' + total + ' aktiviteter klara i familjen idag';
    var stars = children.reduce(function (s, c) { return s + (c.stars_today || 0); }, 0);
    if (stars > 0) return stars + ' stjärnor tjänade idag';
    return 'Följ familjens stjärnor och schema här';
  }

  function findNextActivity(children) {
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c.today_is_paused) continue;
      var items = c.today_items || [];
      for (var j = 0; j < items.length; j++) {
        if (!items[j].completed) {
          return { child: c, item: items[j] };
        }
      }
    }
    return null;
  }

  function pickScheduleChild(children) {
    var withItems = children.filter(function (c) { return (c.today_items || []).length > 0; });
    if (withItems.length) return withItems[0];
    return children[0] || null;
  }

  function renderRing(done, total) {
    var r = 18;
    var circ = 2 * Math.PI * r;
    var pct = total > 0 ? done / total : 0;
    var offset = circ - pct * circ;
    return '<svg class="parent-ring" viewBox="0 0 44 44" aria-hidden="true">' +
      '<circle cx="22" cy="22" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"/>' +
      '<circle cx="22" cy="22" r="' + r + '" fill="none" stroke="#ffcc33" stroke-width="4"' +
      ' stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"' +
      ' stroke-linecap="round" transform="rotate(-90 22 22)"/></svg>';
  }

  function rewardProgress(c) {
    var reward = c.nearest_reward;
    if (!reward || !reward.star_cost) return 0;
    var bal = c.star_balance || 0;
    return Math.min(100, Math.round((bal / reward.star_cost) * 100));
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

    var labels = series.map(function (p, i) {
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
    var parentInitial = user && user.name ? user.name.charAt(0).toUpperCase() : '👤';
    var next = findNextActivity(children);
    var scheduleChild = pickScheduleChild(children);
    var enc = encouragementCopy(children);
    var weekSeries = buildWeekSeries(children);

    var ctaHtml = '';
    if (next) {
      ctaHtml =
        '<div class="parent-glass-card parent-cta-card">' +
        '<span class="parent-cta-icon" aria-hidden="true">👋</span>' +
        '<div class="parent-cta-text">' +
        '<p class="parent-cta-title">' + escHtml(capName(next.child.name)) + ' är redo för nästa aktivitet</p>' +
        '<p class="parent-cta-sub">' + escHtml(next.item.icon || '') + ' ' + escHtml(next.item.name) + '</p>' +
        '</div>' +
        '<button type="button" class="parent-cta-btn" data-action="open-schedule" data-child-id="' + escHtml(next.child.id) + '">Öppna schema →</button>' +
        '</div>';
    }

    var scheduleHtml = '';
    if (scheduleChild) {
      var items = scheduleChild.today_items || [];
      var done = scheduleChild.today_completed || 0;
      var total = scheduleChild.today_total || 0;
      var listHtml = items.length
        ? items.slice(0, 6).map(function (item) {
          var cls = 'parent-schedule-item';
          if (item.completed) cls += ' is-done';
          else if (item.status === 'NÄSTA' || item.status === 'NU') cls += ' is-next';
          return '<li class="' + cls + '"><span>' + escHtml(item.icon || '📋') + '</span><span class="truncate">' +
            escHtml(item.name) + '</span></li>';
        }).join('')
        : '<li class="parent-schedule-item"><span>📋</span><span>Inget schema idag</span></li>';

      scheduleHtml =
        '<div class="parent-glass-card parent-schedule-card">' +
        '<div class="parent-schedule-card-head">' +
        '<h3>Dagens schema</h3>' +
        '<a class="parent-schedule-link" href="/schedule?child=' + encodeURIComponent(scheduleChild.id) + '">Visa alla</a>' +
        '</div>' +
        '<ul class="parent-schedule-list">' + listHtml + '</ul>' +
        '<div class="parent-schedule-progress">' +
        renderRing(done, total) +
        '<div class="parent-ring-label">' + done + '/' + total + ' klara idag<span>' + escHtml(capName(scheduleChild.name)) + '</span></div>' +
        '</div></div>';
    }

    var starsHtml = children.map(function (c) {
      var prog = rewardProgress(c);
      return '<article class="parent-star-card" data-action="expand-child" data-child-id="' + escHtml(c.id) + '">' +
        '<div class="parent-star-card-top">' + renderAvatar(c, 36) +
        '<div><div class="parent-star-card-name">' + escHtml(capName(c.name)) + '</div>' +
        '<div class="parent-star-count">' + (c.star_balance || 0) + ' ⭐ totalt</div></div></div>' +
        '<div class="parent-star-bar-track"><div class="parent-star-bar-fill" style="width:' + prog + '%"></div></div>' +
        '</article>';
    }).join('');

    mount.innerHTML =
      '<div class="parent-home-hub">' +
      '<header class="parent-hub-header">' +
      '<div class="parent-hub-greeting-wrap">' +
      '<h1 class="parent-hub-greeting">' + escHtml(timeGreeting()) + '</h1>' +
      '<p class="parent-hub-sub">' + escHtml(familySubtitle(children)) + '</p>' +
      '</div>' +
      '<div class="parent-hub-header-actions">' +
      '<a href="/notifications" class="parent-hub-icon-btn" aria-label="Notiser">🔔</a>' +
      '<a href="/settings" class="parent-hub-icon-btn" aria-label="Profil">' + escHtml(parentInitial) + '</a>' +
      '</div></header>' +
      '<div class="parent-hub-hero">' +
      '<div class="parent-hub-family-avatar" aria-hidden="true">👨‍👩‍👧</div>' +
      '<div class="parent-hub-mascot" aria-hidden="true">⭐</div>' +
      '</div>' +
      ctaHtml +
      '<div class="parent-quick-grid">' +
      '<button type="button" class="parent-quick-tile" data-action="give-stars"><span class="parent-quick-tile-icon">⭐</span><span class="parent-quick-tile-label">Ge extra stjärnor</span></button>' +
      '<button type="button" class="parent-quick-tile" data-action="once-task"><span class="parent-quick-tile-icon">📋</span><span class="parent-quick-tile-label">Engångsaktivitet</span></button>' +
      '<button type="button" class="parent-quick-tile" data-action="ledig-dag"><span class="parent-quick-tile-icon">🏠</span><span class="parent-quick-tile-label">Ledig dag</span></button>' +
      '<button type="button" class="parent-quick-tile" data-action="stats"><span class="parent-quick-tile-icon">📊</span><span class="parent-quick-tile-label">Statistik</span></button>' +
      '</div>' +
      '<div class="parent-hub-row">' +
      '<div class="parent-glass-card parent-handoff-card">' +
      '<p class="parent-handoff-title">🔒 Dags för barnet att logga in?</p>' +
      '<p class="parent-handoff-sub">Byt till barnets vy med PIN-kod</p>' +
      '<div class="parent-handoff-actions">' +
      '<button type="button" class="parent-handoff-primary" data-action="child-login">👶 Barnet loggar in</button>' +
      '<button type="button" class="parent-handoff-secondary" data-action="parent-logout">Logga ut</button>' +
      '</div></div>' +
      scheduleHtml +
      '</div>' +
      '<section class="parent-stars-section">' +
      '<div class="parent-stars-section-head">' +
      '<h3>Våra stjärnor</h3>' +
      '<span class="parent-stars-filter">Senaste 7 dagarna</span>' +
      '</div>' +
      '<div class="parent-stars-scroll">' + (starsHtml || '<p class="text-sm opacity-70">Inga barn tillagda</p>') + '</div>' +
      '</section>' +
      '<section class="parent-glass-card parent-week-section">' +
      '<h3>Veckans framsteg</h3>' +
      renderWeekChart(weekSeries) +
      '<div class="parent-glass-card parent-encourage-card">' +
      '<span class="emoji" aria-hidden="true">' + enc.emoji + '</span>' +
      '<div><h4>' + escHtml(enc.title) + '</h4><p>' + escHtml(enc.sub) + '</p></div>' +
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
      } else if (action === 'once-task' && typeof window.openOnceTaskModal === 'function') {
        window.openOnceTaskModal();
      } else if (action === 'ledig-dag' && typeof window.openLedigDagModal === 'function') {
        window.openLedigDagModal();
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
      } else if (action === 'parent-logout') {
        if (window.DashboardChildHandoff && DashboardChildHandoff.parentLogout) {
          DashboardChildHandoff.parentLogout();
        } else if (typeof window.logout === 'function') {
          window.logout();
        }
      } else if (action === 'expand-child') {
        var childId = btn.getAttribute('data-child-id');
        if (childId) window.location.href = '/schedule?child=' + encodeURIComponent(childId);
      }
    };
  }

  window.DashboardHomeHub = {
    render: render,
    shouldUse: shouldUse,
  };
})();
