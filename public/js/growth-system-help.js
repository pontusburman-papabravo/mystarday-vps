/**
 * growth-system-help.js — contextual stuck-family help (no global banners).
 * Renders inside help panel and enriches existing handoff surfaces.
 */
(function () {
  'use strict';

  const SHOWN_SESSION_PREFIX = 'msd_system_help_shown_';
  const ENGAGED_SESSION_PREFIX = 'msd_system_help_engaged_';
  const INLINE_SHOWN_PREFIX = 'msd_handoff_inline_cta_shown_';
  const INLINE_ENRICHED_CLASS = 'growth-handoff-inline-enriched';
  const INLINE_CLICK_BOUND_ATTR = 'data-handoff-inline-click-bound';
  const PASSIVE_HINT_ENRICHED_CLASS = 'growth-handoff-passive-hint-enriched';
  const SCHEMA_NO_CHILD_LOGIN = 'schema_no_child_login';

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

  function buildTechnicalContext(surface, data) {
    const ctx = {
      surface: surface || detectSurface(),
      blocking_step: data && data.blockingStep,
      help_type: data && data.help && data.help.helpType,
      route: window.location.pathname || '',
      locale: locale(),
      timestamp: new Date().toISOString(),
    };
    try {
      if (window.Platform && Platform.getInfo) {
        const info = Platform.getInfo();
        if (info && info.platform) ctx.platform = String(info.platform);
      }
    } catch (_) {}
    try {
      if (navigator && navigator.userAgent) {
        ctx.user_agent = navigator.userAgent.slice(0, 500);
      }
    } catch (_) {}
    try {
      if (window.CACHE_NAME) ctx.sw_version = String(window.CACHE_NAME);
    } catch (_) {}
    return ctx;
  }

  function buildCardHtml(help, surface) {
    if (!help) return '';
    const reportLabel = isEnglish() ? 'Report a problem' : 'Rapportera problem';
    return (
      '<div class="help-journey-tip help-journey-tip--coach growth-system-help-card" ' +
      'data-blocking-step="' + esc(help.blockingStep || '') + '" data-surface="' + esc(surface) + '">' +
      '<p class="help-journey-tip-label">' + esc(isEnglish() ? 'Suggested help' : 'Föreslagen hjälp') + '</p>' +
      '<p class="help-journey-tip-headline">' + esc(help.headline) + '</p>' +
      '<p class="help-journey-tip-body">' + esc(help.body) + '</p>' +
      '<button type="button" class="help-journey-tip-cta growth-system-help-cta">' + esc(help.ctaLabel) + '</button>' +
      '<button type="button" class="growth-system-help-report mt-2 w-full text-xs text-slate-500 underline">' +
        esc(reportLabel) + '</button>' +
      '</div>'
    );
  }

  function bindCard(mount, data, surface) {
    const card = mount.querySelector('.growth-system-help-card');
    if (!card) return;
    const cta = card.querySelector('.growth-system-help-cta');
    const report = card.querySelector('.growth-system-help-report');
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
    if (report) {
      report.addEventListener('click', async function () {
        const context = buildTechnicalContext(surface, data);
        await postJson('/api/growth/system-help/support-request', {
          surface: surface,
          context: context,
        });
        report.textContent = isEnglish()
          ? 'Thanks — we received your report with technical details.'
          : 'Tack — vi har tagit emot rapporten med teknisk kontext.';
        report.disabled = true;
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

  function findHandoffParts(rootEl) {
    return {
      titleEl: rootEl.querySelector(
        '.dash-child-handoff-title, .parent-handoff-title, .activation-fs-headline, .journey-coach-headline'
      ),
      subEl: rootEl.querySelector(
        '.dash-child-handoff-sub, .parent-handoff-sub, .activation-fs-body, .journey-coach-body'
      ),
      primaryBtn: rootEl.querySelector(
        '#dashboardChildLoginBtn, [data-action="child-login"], .activation-fs-cta, [data-child-login-cta]'
      ),
      actionsEl: rootEl.querySelector(
        '.dash-child-handoff-actions, .parent-handoff-actions, .activation-fs-coach, .journey-coach-card'
      ),
      pinHintEl: rootEl.querySelector('.activation-fs-pin-hint'),
    };
  }

  function buildInlineEventMetadata(data, help) {
    return {
      blocking_step: data.blockingStep,
      cohort: data.blockingStep,
      help_type: help && help.helpType,
      surface: 'child_handoff',
      cta_action: help && help.ctaAction,
      handoff_variant: 'inline_schema_no_child_login',
    };
  }

  function trackInlineEvent(eventType, metadata) {
    const meta = metadata || {};
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, eventType, meta);
      return Promise.resolve();
    }
    if (!window.Auth || !Auth.api) return Promise.resolve();
    return Auth.api('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, metadata: meta }),
    }).catch(function () {});
  }

  function wasEngagedSession(blockingStep) {
    try {
      return Boolean(sessionStorage.getItem(ENGAGED_SESSION_PREFIX + blockingStep));
    } catch (_) {
      return false;
    }
  }

  function markEngagedSession(blockingStep) {
    try {
      sessionStorage.setItem(ENGAGED_SESSION_PREFIX + blockingStep, String(Date.now()));
    } catch (_) {}
  }

  function recordInlineEngaged(data, help) {
    if (!data || !data.blockingStep) return Promise.resolve();
    if (wasEngagedSession(data.blockingStep)) return Promise.resolve();
    markEngagedSession(data.blockingStep);
    return postJson('/api/growth/system-help/engage', {
      surface: 'child_handoff',
      blocking_step: data.blockingStep,
      cta_action: help && help.ctaAction,
    });
  }

  function bindInlineCtaClick(parts, data, help) {
    if (!parts.primaryBtn) return;
    if (parts.primaryBtn.getAttribute(INLINE_CLICK_BOUND_ATTR) === '1') return;
    parts.primaryBtn.setAttribute(INLINE_CLICK_BOUND_ATTR, '1');
    parts.primaryBtn.addEventListener('click', function () {
      trackInlineEvent('handoff_inline_cta_clicked', buildInlineEventMetadata(data, help));
      recordInlineEngaged(data, help);
    }, { capture: true });
  }

  function wasInlineShownSession(blockingStep) {
    try {
      return Boolean(sessionStorage.getItem(INLINE_SHOWN_PREFIX + blockingStep));
    } catch (_) {
      return false;
    }
  }

  function markInlineShownSession(blockingStep) {
    try {
      sessionStorage.setItem(INLINE_SHOWN_PREFIX + blockingStep, String(Date.now()));
    } catch (_) {}
  }

  function appendSecondaryHelpLink(rootEl, parts) {
    if (rootEl.querySelector('.growth-system-help-handoff-secondary')) return;
    const helpLink = document.createElement('button');
    helpLink.type = 'button';
    helpLink.className =
      'growth-system-help-handoff-secondary mt-2 text-sm text-slate-500 underline text-left w-full';
    helpLink.textContent = isEnglish()
      ? 'Problem with child login?'
      : 'Problem med barninloggningen?';
    helpLink.addEventListener('click', function () {
      if (typeof window.__hbToggle === 'function') window.__hbToggle();
    });
    if (parts.actionsEl && parts.actionsEl.parentNode) {
      parts.actionsEl.parentNode.insertBefore(helpLink, parts.actionsEl.nextSibling);
    } else {
      rootEl.appendChild(helpLink);
    }
  }

  /**
   * schema_no_child_login — inline copy + primary CTA on existing handoff card.
   * Reuses DashboardChildHandoff.startChildLogin(); secondary link opens help panel.
   */
  async function enrichHandoffSchemaNoChildLogin(rootEl, data) {
    if (!rootEl) return;
    const help = data.help;
    const parts = findHandoffParts(rootEl);
    if (!help || !parts.primaryBtn) return;

    const firstEnrich = !rootEl.classList.contains(INLINE_ENRICHED_CLASS);
    rootEl.classList.add(INLINE_ENRICHED_CLASS);

    // Re-apply on parent-i18n-ready / syncPostSchemaHandoffCard re-runs — postSchema
    // copy can overwrite headline after first enrich.
    if (parts.titleEl) parts.titleEl.textContent = help.headline;
    if (parts.subEl) parts.subEl.textContent = help.body;
    parts.primaryBtn.textContent = help.ctaLabel;
    parts.primaryBtn.setAttribute('data-handoff-inline-cta', '1');
    if (parts.pinHintEl) {
      parts.pinHintEl.textContent = '';
      if (parts.pinHintEl.classList && typeof parts.pinHintEl.classList.add === 'function') {
        parts.pinHintEl.classList.add('hidden');
      }
    }
    bindInlineCtaClick(parts, data, help);
    appendSecondaryHelpLink(rootEl, parts);

    if (firstEnrich && !wasInlineShownSession(data.blockingStep)) {
      markInlineShownSession(data.blockingStep);
      await trackInlineEvent('handoff_inline_cta_shown', buildInlineEventMetadata(data, help));
      await recordShown(data);
    }
  }

  /**
   * Enrich existing handoff block — inline CTA for schema_no_child_login only.
   */
  async function enrichHandoff(rootEl) {
    if (!rootEl) return;
    const data = await fetchContext('child_handoff');
    if (!data || !data.eligible || !data.help) return;

    if (data.blockingStep === SCHEMA_NO_CHILD_LOGIN) {
      await enrichHandoffSchemaNoChildLogin(rootEl, data);
      return;
    }

    if (
      rootEl.classList.contains(PASSIVE_HINT_ENRICHED_CLASS)
      || rootEl.querySelector('.growth-system-help-inline')
    ) {
      return;
    }

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
    rootEl.classList.add(PASSIVE_HINT_ENRICHED_CLASS);
    await recordShown(data);
  }

  function isVisibleRoot(el) {
    return Boolean(el && el.classList && !el.classList.contains('hidden'));
  }

  function rootOffersChildLogin(el) {
    if (!isVisibleRoot(el)) return false;
    const parts = findHandoffParts(el);
    return Boolean(parts.primaryBtn);
  }

  /**
   * After Hem's coach ladder settles, enrich the CTA the parent can actually see.
   * Hidden First Success / handoff mounts must not consume the shown event.
   */
  function findVisibleHemHandoffRoot() {
    const doc = typeof document !== 'undefined' ? document : null;
    if (!doc) return null;
    const candidates = [
      doc.getElementById('activationFirstSuccessCoachMount'),
      doc.getElementById('journeyCoachMount'),
      doc.querySelector('.parent-handoff-card'),
      doc.getElementById('dashboardChildHandoff'),
    ];
    for (let i = 0; i < candidates.length; i++) {
      if (rootOffersChildLogin(candidates[i])) return candidates[i];
    }
    return null;
  }

  async function enrichVisibleHem() {
    const root = findVisibleHemHandoffRoot();
    if (!root) return null;
    await enrichHandoff(root);
    return root;
  }

  window.GrowthSystemHelp = {
    detectSurface: detectSurface,
    fetchContext: fetchContext,
    refreshHelpPanel: refreshHelpPanel,
    enrichHandoff: enrichHandoff,
    enrichVisibleHem: enrichVisibleHem,
    findVisibleHemHandoffRoot: findVisibleHemHandoffRoot,
    buildCardHtml: buildCardHtml,
    buildTechnicalContext: buildTechnicalContext,
  };
})();
