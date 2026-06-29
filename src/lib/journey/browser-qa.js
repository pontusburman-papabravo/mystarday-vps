'use strict';

/**
 * Browser QA for Family Journey UI — buttons, modals, scripts, API.
 * Requires puppeteer (devDependency) + JOURNEY_QA_PARENT_EMAIL/PASSWORD.
 */

function resolveBaseUrl() {
  if (process.env.JOURNEY_QA_BASE_URL) return process.env.JOURNEY_QA_BASE_URL.replace(/\/$/, '');
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}`;
}

function loadPuppeteer() {
  try {
    return require('puppeteer');
  } catch {
    return null;
  }
}

/**
 * @typedef {{ id: string, title: string, detail?: string, action?: string, severity?: string, route?: string }} QaFailure
 */

/**
 * @param {Array<{ id: string, ok: boolean, title: string, detail?: string, action?: string, severity?: string, route?: string }>} checks
 */
function finalizeChecks(checks) {
  const failures = checks.filter((c) => !c.ok).map((c) => ({
    id: c.id,
    title: c.title,
    detail: c.detail,
    message: c.detail,
    action: c.action,
    severity: c.severity || 'warning',
    route: c.route,
  }));
  return {
    measurementPoints: checks.length,
    passed: checks.filter((c) => c.ok).length,
    failed: failures.length,
    failures,
    checks: checks.map(({ id, ok, title, detail }) => ({ id, ok, title, detail })),
  };
}

async function runJourneyBrowserQa(options = {}) {
  const base = options.baseUrl || resolveBaseUrl();
  const email = options.email || process.env.JOURNEY_QA_PARENT_EMAIL;
  const password = options.password || process.env.JOURNEY_QA_PARENT_PASSWORD;
  const puppeteer = loadPuppeteer();

  if (!puppeteer) {
    return {
      measurementPoints: 0,
      passed: 0,
      failed: 0,
      failures: [],
      skipped: true,
      skippedReason: 'puppeteer ej installerat',
    };
  }
  if (!email || !password) {
    return {
      measurementPoints: 0,
      passed: 0,
      failed: 0,
      failures: [],
      skipped: true,
      skippedReason: 'JOURNEY_QA_PARENT_EMAIL/PASSWORD saknas',
    };
  }

  const checks = [];
  let browser;
  let page;

  function record(id, ok, title, extra = {}) {
    checks.push({ id, ok, title, ...extra });
  }

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // --- Public / health ---
    const healthRes = await page.goto(`${base}/health`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    record('health_200', healthRes?.ok(), 'Health-endpoint svarar', {
      detail: `HTTP ${healthRes?.status()}`,
      action: 'Kontrollera att app-tjänsten körs',
    });

    const loginNav = await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    record('login_page_loads', loginNav?.ok(), 'Inloggningssidan laddas');

    const loginForm = await page.evaluate(() => ({
      email: !!document.querySelector('input[type="email"], input[name="email"], #email'),
      password: !!document.querySelector('input[type="password"], #password'),
      submit: !!document.querySelector('button[type="submit"], #loginBtn, .login-btn'),
    }));
    record('login_email_field', loginForm.email, 'E-postfält på /login');
    record('login_password_field', loginForm.password, 'Lösenordsfält på /login');
    record('login_submit_button', loginForm.submit, 'Inloggningsknapp på /login', {
      action: 'Verifiera login-form markup i login.html',
    });

    // Onboarding HTML (fetch — avoids client redirect)
    try {
      const onboardRes = await fetch(`${base}/onboarding`);
      const onboardHtml = await onboardRes.text();
      record('onboarding_page_loads', onboardRes.ok, 'Onboarding-sida tillgänglig');
      record('onboarding_step6_btn', onboardHtml.includes('id="step6Btn"') || onboardHtml.includes("id='step6Btn'"),
        'Onboarding steg 6-knapp finns i HTML');
    } catch (err) {
      record('onboarding_page_loads', false, 'Onboarding-sida tillgänglig', { detail: err.message });
      record('onboarding_step6_btn', false, 'Onboarding steg 6-knapp finns i HTML', { detail: err.message });
    }

    // Child login (public)
    const childLoginNav = await page.goto(`${base}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    record('child_login_page_loads', childLoginNav?.ok(), 'Barninloggningssida laddas');
    try {
      const childLoginUi = await page.evaluate(() => ({
        pinInput: !!document.querySelector('input[type="password"], input[inputmode="numeric"], #childPin'),
        submit: !!document.querySelector('button[type="submit"], #childLoginBtn, .child-login-btn'),
      }));
      record('child_login_pin_field', childLoginUi.pinInput, 'PIN-fält på barninloggning');
      record('child_login_submit', childLoginUi.submit, 'Inloggningsknapp på barninloggning', {
        action: 'child-login.html formulär',
      });
    } catch (err) {
      record('child_login_pin_field', false, 'PIN-fält på barninloggning', { detail: err.message });
      record('child_login_submit', false, 'Inloggningsknapp på barninloggning', { detail: err.message });
    }

    // --- API login + dashboard ---
    const loginResult = await page.evaluate(async (cred) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.email, password: cred.password }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, csrf: data.csrfToken || '' };
    }, { email, password });

    record('parent_api_login', loginResult.ok, 'Förälder API-inloggning', {
      detail: loginResult.ok ? 'OK' : `HTTP ${loginResult.status}`,
      action: 'Kontrollera JOURNEY_QA_PARENT_* credentials',
      severity: 'critical',
    });

    const dashNav = await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    record('dashboard_loads', dashNav?.ok(), 'Dashboard laddas för inloggad förälder');

    await new Promise((r) => setTimeout(r, 2000));

    const dashDom = await page.evaluate(() => ({
      coachMount: !!document.getElementById('journeyCoachMount'),
      handoff: !!document.getElementById('dashboardChildHandoff'),
      handoffChildBtn: !!document.getElementById('dashboardChildLoginBtn'),
      handoffLogoutBtn: !!document.getElementById('dashboardParentLogoutBtn'),
      ackModal: !!document.getElementById('journeyParentAckModal'),
      ackDismiss: !!document.getElementById('journeyParentAckDismissBtn'),
      celebrationModal: !!document.getElementById('journeyCelebrationModal'),
      celebrationDismiss: !!document.getElementById('journeyCelebrationDismissBtn'),
      scripts: Array.from(document.querySelectorAll('script[src]')).map((s) => s.getAttribute('src') || ''),
    }));

    record('dom_journey_coach_mount', dashDom.coachMount, 'journeyCoachMount finns i dashboard.html');
    record('dom_handoff_banner', dashDom.handoff, 'Handoff-banner container finns');
    record('dom_handoff_child_btn', dashDom.handoffChildBtn, 'Knapp "Barnet loggar in" finns', {
      action: 'dashboard-child-handoff.js + dashboard.html handoff-knappar',
      route: '#overview',
    });
    record('dom_handoff_logout_btn', dashDom.handoffLogoutBtn, 'Knapp "Logga ut" i handoff finns');
    record('dom_parent_ack_modal', dashDom.ackModal, 'Parent-ack-modal finns i DOM');
    record('dom_parent_ack_dismiss', dashDom.ackDismiss, 'Parent-ack "Visa"-knapp finns', {
      action: 'journey-parent-ack.js + journeyParentAckDismissBtn',
    });
    record('dom_celebration_modal', dashDom.celebrationModal, 'Celebration-modal finns i DOM');
    record('dom_celebration_dismiss', dashDom.celebrationDismiss, 'Celebration avfärda-knapp finns');

    const scriptChecks = [
      ['script_journey_context_client', 'journey-context-client'],
      ['script_journey_coach', 'journey-coach'],
      ['script_journey_parent_ack', 'journey-parent-ack'],
      ['script_journey_celebration', 'journey-celebration'],
      ['script_dashboard_handoff', 'dashboard-child-handoff'],
    ];
    for (const [id, fragment] of scriptChecks) {
      const found = dashDom.scripts.some((src) => src.includes(fragment));
      record(id, found, `Script ${fragment} laddas på dashboard`, {
        action: `Lägg till <script src="/js/${fragment}.js"> i dashboard.html`,
      });
    }

    const ctxResult = await page.evaluate(async () => {
      const res = await fetch('/api/me/journey-context', { credentials: 'same-origin' });
      let body = null;
      try { body = await res.json(); } catch { body = null; }
      return {
        status: res.status,
        ok: res.ok,
        phase: body?.phase,
        priority: body?.priority,
        capabilities: body?.capabilities,
        blocking: body?.blocking_experience,
      };
    });

    record('api_journey_context_200', ctxResult.ok, 'GET /api/me/journey-context returnerar 200', {
      detail: ctxResult.ok ? `phase=${ctxResult.phase}` : `HTTP ${ctxResult.status}`,
      action: 'Kontrollera family_journey_context_api flagga och route scope',
      severity: 'critical',
      route: '#produktanalys',
    });
    record('api_journey_context_phase', !!ctxResult.phase, 'journey-context innehåller phase');
    record('api_journey_context_capabilities', !!(ctxResult.capabilities?.coach_v1 || ctxResult.capabilities?.handoff_v2),
      'journey-context capabilities (coach/handoff)');

    const coachVisible = await page.evaluate(() => {
      const mount = document.getElementById('journeyCoachMount');
      if (!mount) return { exists: false, visible: false, hasCta: false };
      const card = mount.querySelector('.journey-coach-card');
      const cta = mount.querySelector('.journey-coach-cta');
      const hidden = mount.classList.contains('hidden');
      return { exists: true, visible: !hidden && !!card, hasCta: !!cta };
    });
    record('coach_card_dom_ready', coachVisible.exists, 'Coach-mount redo (DOM)', {
      detail: coachVisible.visible ? 'Kort synligt' : 'Dolt — kan vara OK beroende på fas',
    });
    if (ctxResult.priority === 'coach') {
      record('coach_visible_when_priority_coach', coachVisible.visible && coachVisible.hasCta,
        'Coach-kort synligt när priority=coach', {
          action: 'journey-coach.js renderCoach + journey-context priority',
          route: '#produktanalys',
        });
    } else {
      record('coach_priority_not_coach_skip', true, `Coach ej krävd (priority=${ctxResult.priority || 'none'})`);
    }

    if (ctxResult.blocking === 'handoff_to_child') {
      const handoffVisible = await page.evaluate(() => {
        const el = document.getElementById('dashboardChildHandoff');
        return el && !el.classList.contains('hidden');
      });
      record('handoff_visible_when_blocking', handoffVisible, 'Handoff-banner synlig vid blocking=handoff_to_child', {
        action: 'dashboard-child-handoff.js contextWantsHandoff',
      });
    } else {
      record('handoff_blocking_skip', true, `Handoff blocking ej aktiv (${ctxResult.blocking || 'null'})`);
    }

    // --- Admin (same session if user is admin) ---
    try {
      const adminNav = await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      record('admin_page_loads', adminNav?.ok(), 'Admin-sida laddas');

      await page.waitForFunction(
        () => typeof Auth !== 'undefined' && typeof Auth.getToken === 'function' && Auth.getToken(),
        { timeout: 20000 }
      ).catch(() => null);

      await new Promise((r) => setTimeout(r, 2500));

      const adminDom = await page.evaluate(() => {
        const deniedEl = document.getElementById('accessDenied');
        const denied = deniedEl && !deniedEl.classList.contains('hidden');
        return {
          denied,
          startDash: !!document.getElementById('startDashboard'),
          journeyAnalysisBlock: !!document.getElementById('journeyDailyAnalysisBlock'),
        };
      });

      if (adminDom.denied) {
        record('admin_access', false, 'QA-konto har admin-behörighet', {
          action: 'Använd admin-konto med is_admin i JOURNEY_QA_PARENT_*',
          severity: 'info',
        });
      } else {
        record('admin_access', true, 'Admin-behörighet OK');
        record('admin_start_dashboard', adminDom.startDash, 'Admin start-dashboard finns');
        record('admin_journey_analysis_block', adminDom.journeyAnalysisBlock,
          'Journey daglig analys-ruta finns på admin start', {
            action: 'Deploy admin-journey-daily-analysis.js + journeyDailyAnalysisBlock',
            route: '#overview',
          });
        const rolloutData = await page.evaluate(async () => {
          if (typeof Auth === 'undefined' || !Auth.api) return { ok: false, error: 'no Auth' };
          try {
            const data = await Auth.api('/api/admin/journey-rollout/status');
            return { ok: true, wave: data?.active_wave };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        });
        record('admin_rollout_api', rolloutData.ok, 'Admin journey-rollout API', {
          detail: rolloutData.ok ? `wave ${rolloutData.wave}` : rolloutData.error,
          route: '#produktanalys',
          severity: rolloutData.error?.includes('administratör') ? 'info' : 'warning',
        });
      }
    } catch (err) {
      record('admin_page_loads', false, 'Admin-sida laddas', { detail: err.message });
    }
  } catch (err) {
    if (checks.length === 0) {
      record('browser_qa_runtime', false, 'Browser QA avbröts', {
        detail: err.message,
        action: 'Se serverloggar [journey-daily-analysis]',
        severity: 'critical',
      });
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return finalizeChecks(checks);
}

module.exports = { runJourneyBrowserQa, resolveBaseUrl, finalizeChecks };
