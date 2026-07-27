/**
 * Child readonly week overview (bildstöd PR 2).
 * Data: GET /api/me/weekly-schedule — read-only, no schedule mutations.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  const PANEL_ID = 'childWeekOverviewPanel';
  const BACKDROP_ID = 'childWeekOverviewBackdrop';

  function esc(text) {
    if (typeof window.escHtml === 'function') return window.escHtml(text);
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function activityIcon(activity) {
    if (window.ActivityVisual && typeof ActivityVisual.inline === 'function') {
      return ActivityVisual.inline(activity);
    }
    return activity.icon || '⭐';
  }

  function ensureShell() {
    if (document.getElementById(PANEL_ID)) return;

    const style = document.createElement('style');
    style.textContent = `
      #${BACKDROP_ID} {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(27,35,64,0.45);
        z-index: 10040;
      }
      #${BACKDROP_ID}.cwo-open { display: block; }
      #${PANEL_ID} {
        display: none;
        position: fixed;
        left: 50%;
        bottom: 0;
        transform: translateX(-50%);
        width: 100%;
        max-width: 520px;
        max-height: 82vh;
        background: #fff;
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -8px 40px rgba(27,35,64,0.18);
        z-index: 10041;
        overflow: hidden;
        flex-direction: column;
      }
      #${PANEL_ID}.cwo-open { display: flex; }
      .cwo-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid #EDE7F6;
        flex-shrink: 0;
      }
      .cwo-title {
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        font-size: 1rem;
        color: #1B2340;
        margin: 0;
      }
      .cwo-close {
        min-width: 44px;
        min-height: 44px;
        border: none;
        border-radius: 50%;
        background: #EDE7F6;
        font-size: 1.25rem;
        font-weight: 700;
        color: #1B2340;
        cursor: pointer;
      }
      .cwo-body {
        overflow-y: auto;
        padding: 12px 16px 24px;
        flex: 1;
      }
      .cwo-day {
        border-radius: 14px;
        padding: 10px 12px;
        margin-bottom: 8px;
        border: 1px solid #EDE7F6;
        background: #FAFAFE;
      }
      .cwo-day--today {
        border-color: #F5A623;
        background: linear-gradient(180deg, #FFF9EE 0%, #fff 70%);
        box-shadow: 0 2px 10px rgba(245,166,35,0.12);
      }
      .cwo-day-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .cwo-day-name {
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        font-size: 0.9rem;
        color: #1B2340;
      }
      .cwo-today-badge {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #B45309;
        background: #FEF3C7;
        padding: 2px 8px;
        border-radius: 999px;
      }
      .cwo-icons {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .cwo-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #fff;
        border: 1px solid #EDE7F6;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }
      .cwo-empty {
        font-size: 0.8rem;
        color: #9AA0B8;
      }
      .cwo-loading, .cwo-error {
        text-align: center;
        padding: 24px 12px;
        color: #5A6178;
        font-size: 0.9rem;
      }
      @media (min-width: 768px) {
        #${PANEL_ID} {
          bottom: 48px;
          border-radius: 20px;
          max-height: 75vh;
        }
      }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.addEventListener('click', close);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', t('weekOverview.ariaLabel'));
    panel.innerHTML =
      '<div class="cwo-header">' +
        '<h2 class="cwo-title">📅 ' + esc(t('weekOverview.title')) + '</h2>' +
        '<button type="button" class="cwo-close" aria-label="' + esc(t('weekOverview.close')) + '">×</button>' +
      '</div>' +
      '<div class="cwo-body" id="childWeekOverviewBody"></div>';

    panel.querySelector('.cwo-close').addEventListener('click', close);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  function renderDays(days) {
    if (!days || !days.length) {
      return '<p class="cwo-empty">' + esc(t('weekOverview.empty')) + '</p>';
    }
    return days.map(function (day) {
      const todayClass = day.isToday ? ' cwo-day--today' : '';
      const todayBadge = day.isToday
        ? '<span class="cwo-today-badge">' + esc(t('weekOverview.todayBadge')) + '</span>'
        : '';
      let iconsHtml = '';
      if (!day.activities || day.activities.length === 0) {
        iconsHtml = '<p class="cwo-empty">' + esc(t('weekOverview.noActivities')) + '</p>';
      } else {
        iconsHtml = '<div class="cwo-icons">' + day.activities.map(function (act) {
          return '<span class="cwo-icon" title="' + esc(act.name) + '">' + activityIcon(act) + '</span>';
        }).join('') + '</div>';
      }
      return '<div class="cwo-day' + todayClass + '">' +
        '<div class="cwo-day-head">' +
          '<span class="cwo-day-name">' + esc(day.dayName) + '</span>' +
          todayBadge +
        '</div>' +
        iconsHtml +
      '</div>';
    }).join('');
  }

  function open() {
    ensureShell();
    const panel = document.getElementById(PANEL_ID);
    const backdrop = document.getElementById(BACKDROP_ID);
    const body = document.getElementById('childWeekOverviewBody');
    if (!panel || !backdrop || !body) return;

    body.innerHTML = '<p class="cwo-loading">' + esc(t('weekOverview.loading')) + '</p>';
    panel.classList.add('cwo-open');
    backdrop.classList.add('cwo-open');

    const fetchFn = window.Auth && typeof Auth.api === 'function'
      ? function (url) { return Auth.api(url); }
      : function (url) {
        return fetch(url, { credentials: 'include' }).then(function (r) {
          if (!r.ok) throw new Error(t('weekOverview.loadFailed'));
          return r.json();
        });
      };

    fetchFn('/api/me/weekly-schedule')
      .then(function (data) {
        body.innerHTML = renderDays(data && data.days);
      })
      .catch(function () {
        body.innerHTML = '<p class="cwo-error">' + esc(t('weekOverview.loadFailed')) + '</p>';
      });
  }

  function close() {
    const panel = document.getElementById(PANEL_ID);
    const backdrop = document.getElementById(BACKDROP_ID);
    if (panel) panel.classList.remove('cwo-open');
    if (backdrop) backdrop.classList.remove('cwo-open');
  }

  window.ChildWeekOverview = {
    open: open,
    close: close,
  };
})();
