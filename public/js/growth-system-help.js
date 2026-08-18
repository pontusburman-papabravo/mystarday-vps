/**
 * growth-system-help.js — contextual stuck-family help (no global banners).
 * Renders inside help panel and enriches existing handoff surfaces.
 */
(function () {
  'use strict';

  const SHOWN_SESSION_PREFIX = 'msd_system_help_shown_';

  function locale() {
    try {
      if (window.I18n && I18n.getLocale) return I18n.getLocale();
      if (document.documentElement && document.documentElement.lang) {
        return document.documentElement.lang;
      }
    } catch (_) {}
    return 'sv-SE';
  }

  function isEnglish() {
    return locale().indexOf('en') === 0;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function detectSurface() {
    const path = window.location.pathname || '';
    if (path.indexOf('/onboarding') === 0) return 'onboarding';
    if (path.indexOf('/child-login') === 0) return 'child_login';
    if (path.indexOf('/schedule') === 0) return 'schedule';
    if (path.indexOf('/daily-log') === 0) return 'daily_log';
    if (path === '/' || path.indexOf('/dashboard') === 0) return 'dashboard';
    if (path.indexOf('/child-profile') === 0 || path.indexOf('/settings') === 0) return 'settings_pin';
    return 'help_panel';
  }

  async function fetchContext(surface) {
    if (!window.Auth || !Auth.api) return null;
    const qs = new URLSearchParams();
    qs.set('surface', surface || detectSurface());
    qs.set('locale', locale());
    try {
      return await Auth.api('/api/growth/system-help/context?' + qs.toString());
    } catch (_) {
      return null;
    }
  }

  async function postJson(path, body) {
    if (!window.Auth || !Auth.api) return null;
    try {
      return await Auth.api(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
    } catch (_) {
      return null;
    }
  }

  function markShownSession(blockingStep) {
    try {
      sessionStorage.setItem(SHOWN_SESSION_PREFIX + blockingStep, String(Date.now()));
    } catch (_) {}
  }

  function wasShownSession(blockingStep) {
    try {
      return Boolean(sessionStorage.getItem(SHOWN_SESSION_PREFIX + blockingStep));
    } catch (_) {
      return false;
    }
  }

  async function recordShown(data) {
    if (!data || !data.blockingStep) return;
    if (wasShownSession(data.blockingStep)) return;
    markShownSession(data.blockingStep);
    await postJson('/api/growth/system-help/shown', {
      blocking_step: data.blockingStep,
    });
  }

  function runCtaAction(action) {
    switch (action) {
      case 'open_onboarding':
        window.location.href = '/onboarding';
        return;
      case 'start_child_login':
        if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
          DashboardChildHandoff.startChildLogin();
          return;
        }
        window.location.href = '/child-login';
        return;
      case 'open_daily_log':
        window.location.href = '/daily-log';
        return;
      case 'open_schedule':
        window.location.href = '/schedule';
        return;
      case 'open_child_profile':
        window.location.href = '/settings#children';
        return;
      default:
        return;
    }
  }

  function buildCardHtml(help, surface) {
    if (!help) return '';
    const supportLabel = isEnglish() ? 'I need help from the team' : 'Jag behöver hjälp';
    return (
      '<div class="help-journey-tip help-journey-tip--coach growth-system-help-card" ' +
      'data-blocking-step="' + esc(help.blockingStep || '') + '" data-surface="' + esc(surface) + '">' +
      '<p class="help-journey-tip-label">' + esc(isEnglish() ? 'Suggested help' : 'Föreslagen hjälp') + '</p>' +
      '<p class="help-journey-tip-headline">' + esc(help.headline) + '</p>' +
      '<p class="help-journey-tip-body">' + esc(help.body) + '</p>' +
      '<button type="button" class="help-journey-tip-cta growth-system-help-cta">' + esc(help.ctaLabel) + '</button>' +
      (help.showSupportRequest
        ? '<button type="button" class="growth-system-help-support mt-2 w-full text-xs text-slate-500 underline">' +
          esc(supportLabel) + '</button>'
        : '') +
      '</div>'
    );
  }

  function bindCard(mount, data, surface) {
    const card = mount.querySelector('.growth-system-help-card');
    if (!card) return;
    const cta = card.querySelector('.growth-system-help-cta');
    const support = card.querySelector('.growth-system-help-support');
    if (cta) {
      cta.addEventListener('click', async function () {
        await postJson('/api/growth/system-help/engage', {
          surface: surface,
          blocking_step: data.blockingStep,
          cta_action: data.help && data.help.ctaAction,
        });
        runCtaAction(data.help && data.help.ctaAction);
        if (typeof window.__hbClose === 'function') window.__hbClose();
      });
    }
    if (support) {
      support.addEventListener('click', async function () {
        await postJson('/api/growth/system-help/support-request', { surface: surface });
        support.textContent = isEnglish()
          ? 'Thanks — we have registered your request.'
          : 'Tack — vi har registrerat din förfrågan.';
        support.disabled = true;
      });
    }
  }

  /**
   * Render into help panel mount (primary surface — no auto-popup).
   */
  async function refreshHelpPanel(mountEl) {
    if (!mountEl) return null;
    const surface = 'help_panel';
    const data = await fetchContext(surface);
    if (!data || !data.eligible || !data.help) {
      return null;
    }
    const html = buildCardHtml(
      Object.assign({ blockingStep: data.blockingStep }, data.help),
      surface
    );
    mountEl.innerHTML = html;
    mountEl.style.display = html ? 'block' : 'none';
    if (html) {
      bindCard(mountEl, data, surface);
      await recordShown(data);
    }
    return data;
  }

  /**
   * One-line hint for existing handoff block — not a new banner layer.
   */
  async function enrichHandoff(rootEl) {
    if (!rootEl) return;
    const data = await fetchContext('child_handoff');
    if (!data || !data.eligible || !data.help) return;
    if (rootEl.querySelector('.growth-system-help-inline')) return;

    const hint = document.createElement('button');
    hint.type = 'button';
    hint.className = 'growth-system-help-inline mt-2 text-sm text-indigo-700 underline text-left';
    hint.textContent = isEnglish() ? 'Need help with login?' : 'Behöver du hjälp med inloggning?';
    hint.addEventListener('click', function () {
      if (typeof window.__hbToggle === 'function') {
        window.__hbToggle();
      }
    });
    rootEl.appendChild(hint);
    await recordShown(data);
  }

  window.GrowthSystemHelp = {
    detectSurface: detectSurface,
    fetchContext: fetchContext,
    refreshHelpPanel: refreshHelpPanel,
    enrichHandoff: enrichHandoff,
    buildCardHtml: buildCardHtml,
  };
})();
