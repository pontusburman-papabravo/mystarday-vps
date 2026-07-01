/**
 * dashboard-home-hub.js — Parent home mockup layout (mobile / native).
 * Reads dashboardStats; minimal coupling to dashboard.js.
 */
(function () {
  'use strict';

  const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

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
    if (window._stjarndagFeatures && window._stjarndagFeatures.parent_home_magic === false) return false;
    return true;
  }

  function timeGreeting() {
    if (window.DashboardDailySummary && typeof window.DashboardDailySummary.timeGreeting === 'function') {
      return window.DashboardDailySummary.timeGreeting();
    }
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'God morgon!';
    if (h >= 11 && h < 17) return 'Hej!';
    if (h >= 17 && h < 22) return 'God kväll!';
    return 'Hej!';
  }

  function getChildStatus(c) {
    if (c.today_is_paused) return { text: 'Ledig idag', icon: '🏠' };
    const items = c.today_items || [];
    const total = c.today_total || 0;
    const done = c.today_completed || 0;
    if (total > 0 && done === total) return { text: 'Allt klart!', icon: '✅' };
    if (total === 0) return { text: 'Inget schema', icon: '📋' };
    const next = items.find(function (item) { return !item.completed; });
    if (next) return { text: next.name, icon: next.icon || '📋' };
    return { text: done + '/' + total + ' klara', icon: '⭐' };
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
      var dateStr = d.toLocaleDateString('sv-SE');
      var totalCompleted = 0;
      children.forEach(function (c) {
        const hist = c.history || [];
        const row = hist.find(function (h) { return h.date === dateStr; });
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
      return '<p class="parent-ready-empty">Lägg till barn under Familj för att se status här.</p>';
    }
    return children.map(function (c) {
      const status = getChildStatus(c);
      const active = c.id === focusId ? ' is-active' : '';
      return '<button type="button" class="parent-ready-child magic-3d-card' + active + '" data-action="open-schedule" data-child-id="' + escHtml(c.id) + '">' +
        (active ? '<span class="parent-ready-badge" aria-hidden="true">⭐</span>' : '') +
        '<div class="parent-ready-avatar">' + renderAvatar(c, 44) + '</div>' +
        '<div class="parent-ready-name">' + escHtml(capName(c.name)) + '</div>' +
        '<div class="parent-ready-task">' + escHtml(status.icon) + ' ' + escHtml(status.text) + '</div>' +
        '</button>';
    }).join('');
  }

  function renderCoParentCta(stats) {
    if (!stats || stats.parent_count === undefined || stats.parent_count >= 2) return '';
    if (window._stjarndagFeatures && !window._stjarndagFeatures.medforalder_cta) return '';
    try {
      const raw = localStorage.getItem('medforalder_cta_dismissed');
      if (raw) {
        const parsed = JSON.parse(raw);
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

  function renderHead(stats, children, focusId, scheduleHref) {
    return '<div class="parent-home-hub magic-3d-scene">' +
      '<div id="parentHubDailySummaryMount" class="parent-hub-daily-summary" aria-live="polite"></div>' +
      '<header class="parent-hub-top">' +
      '<div class="parent-hub-family-avatar" aria-hidden="true">👨‍👩‍👧</div>' +
      '</header>' +
      '<div class="parent-hub-greeting-block">' +
      '<h1 class="parent-hub-greeting">' + escHtml(timeGreeting()) + '</h1>' +
      '<p class="parent-hub-sub">Så här ser dagen ut.</p>' +
      '<div class="parent-hub-mascot" aria-hidden="true">⭐</div>' +
      '</div>' +
      '<section class="parent-ready-section parent-glass-card">' +
      '<div class="parent-ready-head">' +
      '<h2>Redo för nästa aktivitet' + (children.length > 1 ? ' <span class="parent-ready-count">(' + children.length + ' barn)</span>' : '') + '</h2>' +
      '<div class="parent-ready-head-links">' +
      '<a class="parent-schedule-link" href="/daily-log">Fyll i i efterhand →</a>' +
      '<a class="parent-schedule-link" href="' + scheduleHref + '">Visa schema →</a>' +
      '</div></div>' +
      '<div class="parent-ready-scroll">' + renderReadyRow(children, focusId) + '</div>' +
      '</section>' +
      '</div>';
  }

  function renderFooter(stats, weekSeries) {
    return '<div class="parent-home-hub-footer">' +
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
      renderCoParentCta(stats) +
      '<section class="parent-glass-card parent-week-section">' +
      '<div class="parent-ready-head">' +
      '<h3>Veckans berättelse</h3>' +
      '<a class="parent-schedule-link" href="/daily-log">Fyll i glömda dagar →</a>' +
      '</div>' +
      renderWeekChart(weekSeries) +
      '</section>' +
      '</div>';
  }

  function render(stats) {
    const headMount = document.getElementById('parentHomeHubMount');
    const footerMount = document.getElementById('parentHomeHubFooterMount');
    if (!headMount) return false;

    if (!shouldUse()) {
      document.body.classList.remove('parent-magic-dashboard');
      headMount.classList.add('hidden');
      headMount.innerHTML = '';
      if (footerMount) {
        footerMount.classList.add('hidden');
        footerMount.innerHTML = '';
      }
      return false;
    }

    document.body.classList.add('parent-magic-dashboard');
    headMount.classList.remove('hidden');

    const children = (stats && stats.children) ? stats.children : [];
    const focusId = findFocusChild(children);
    const weekSeries = buildWeekSeries(children);
    const scheduleHref = focusId ? '/schedule?child=' + encodeURIComponent(focusId) : '/schedule';

    headMount.innerHTML = renderHead(stats, children, focusId, scheduleHref);
    bindActions(headMount);

    if (footerMount) {
      footerMount.classList.remove('hidden');
      footerMount.innerHTML = renderFooter(stats, weekSeries);
      bindActions(footerMount);
    }

    if (window.HomeReadiness && typeof window.HomeReadiness.reload === 'function') {
      window.HomeReadiness.reload();
    }

    return true;
  }

  function bindActions(mount) {
    function handleAction(action, btn) {
      if (action === 'give-stars') {
        if (typeof window.openGiveStarsQuick === 'function') {
          window.openGiveStarsQuick();
          return;
        }
        if (typeof window.showToast === 'function') {
          showToast('Kunde inte öppna stjärnor — ladda om sidan', 'error');
        }
        return;
      }
      if (action === 'backfill-log') {
        window.location.href = '/daily-log';
        return;
      }
      if (action === 'once-task') {
        if (typeof window.openOnceTaskModal === 'function') {
          window.openOnceTaskModal();
          return;
        }
        if (typeof window.showToast === 'function') {
          showToast('Kunde inte öppna engångsaktivitet — ladda om sidan', 'error');
        }
        return;
      }
      if (action === 'ledig-dag') {
        if (typeof window.openLedigDagModal === 'function') {
          window.openLedigDagModal();
          return;
        }
        if (typeof window.showToast === 'function') {
          showToast('Kunde inte öppna ledig dag — ladda om sidan', 'error');
        }
        return;
      }
      if (action === 'today-schedule') {
        window.location.href = '/schedule';
        return;
      }
      if (action === 'messages') {
        window.location.href = '/notifications';
        return;
      }
      if (action === 'stats') {
        const starHist = document.getElementById('starHistorySection');
        if (starHist && !starHist.classList.contains('hidden')) {
          starHist.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        const week = mount.querySelector('.parent-week-section');
        if (week) {
          week.scrollIntoView({ behavior: 'smooth', block: 'start' });
          week.classList.add('parent-week-highlight');
          window.setTimeout(function () { week.classList.remove('parent-week-highlight'); }, 1800);
          return;
        }
        window.location.href = '/reports';
        return;
      }
      if (action === 'open-schedule') {
        const cid = btn.getAttribute('data-child-id');
        window.location.href = cid ? '/schedule?child=' + encodeURIComponent(cid) : '/schedule';
        return;
      }
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
      if (action === 'invite-coparent') {
        if (typeof window.openCoParentInviteModal === 'function') {
          openCoParentInviteModal();
        } else if (typeof window.openMedforalderCtaInvite === 'function') {
          openMedforalderCtaInvite();
        } else if (typeof window.showToast === 'function') {
          showToast('Kunde inte öppna inbjudan — gå till Familj', 'error');
        }
        return;
      }
      if (action === 'parent-logout') {
        if (window.DashboardChildHandoff && DashboardChildHandoff.parentLogout) {
          DashboardChildHandoff.parentLogout();
        } else if (typeof window.logout === 'function') {
          window.logout();
        }
      }
    }

    mount.querySelectorAll('[data-action]').forEach(function (btn) {
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
  };
})();
