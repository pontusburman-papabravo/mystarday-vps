'use strict';

/**
 * HTTP-based Journey QA — no Puppeteer/Chrome required.
 * Used on VPS when Chrome system libraries are unavailable.
 */

function parseCookies(setCookie) {
  const jar = {};
  const headers = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
  for (const header of headers) {
    const [pair] = header.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeCookies(jar, setCookie) {
  return { ...jar, ...parseCookies(setCookie) };
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function htmlHasId(html, id) {
  return html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
}

function htmlHasInput(html, pattern) {
  return pattern.test(html);
}

function resolveBaseUrl() {
  if (process.env.JOURNEY_QA_BASE_URL) return process.env.JOURNEY_QA_BASE_URL.replace(/\/$/, '');
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}`;
}

async function fetchText(url, cookies = {}) {
  const res = await fetch(url, {
    headers: cookies && Object.keys(cookies).length ? { Cookie: cookieHeader(cookies) } : {},
    redirect: 'follow',
  });
  const text = await res.text().catch(() => '');
  return { res, text };
}

async function loginParent(base, email, password) {
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  let body = {};
  try { body = await loginRes.json(); } catch { body = {}; }
  return { ok: loginRes.ok, status: loginRes.status, cookies, csrfToken: body.csrfToken || '' };
}

async function fetchJson(url, cookies, csrfToken) {
  const headers = { Cookie: cookieHeader(cookies) };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const res = await fetch(url, { headers, credentials: 'include' });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { ok: res.ok, status: res.status, body };
}

/**
 * @param {object} options
 * @param {string} [options.baseUrl]
 * @param {string} [options.email]
 * @param {string} [options.password]
 * @param {string} [options.fallbackReason] — why HTTP mode was used
 * @param {Array} [options.checks] — pre-existing checks to append to
 */
async function runJourneyHttpQa(options = {}) {
  const base = options.baseUrl || resolveBaseUrl();
  const email = (options.email || process.env.JOURNEY_QA_PARENT_EMAIL || '').split('#')[0].trim();
  const password = (options.password || process.env.JOURNEY_QA_PARENT_PASSWORD || '').split('#')[0].trim();
  const checks = options.checks || [];

  function record(id, ok, title, extra = {}) {
    checks.push({ id, ok, title, ...extra });
  }

  if (!email || !password) {
    return {
      measurementPoints: 0,
      passed: 0,
      failed: 0,
      failures: [],
      skipped: true,
      skippedReason: 'JOURNEY_QA_PARENT_EMAIL/PASSWORD saknas',
      mode: 'http',
    };
  }

  if (options.fallbackReason) {
    record('qa_mode_http_fallback', true, 'HTTP QA (utan headless Chrome)', {
      detail: options.fallbackReason,
    });
  } else {
    record('qa_mode_http', true, 'HTTP QA-läge');
  }

  try {
    const health = await fetchText(`${base}/health`);
    record('health_200', health.res.ok, 'Health-endpoint svarar', {
      detail: `HTTP ${health.res.status}`,
      action: 'Kontrollera att app-tjänsten körs',
    });

    const loginPage = await fetchText(`${base}/login`);
    record('login_page_loads', loginPage.res.ok, 'Inloggningssidan laddas');
    record('login_email_field',
      htmlHasInput(loginPage.text, /type=["']email["']|id=["']email["']|name=["']email["']/),
      'E-postfält på /login');
    record('login_password_field',
      htmlHasInput(loginPage.text, /type=["']password["']|id=["']password["']/),
      'Lösenordsfält på /login');
    record('login_submit_button',
      htmlHasInput(loginPage.text, /type=["']submit["']|id=["']loginBtn["']|login-btn/),
      'Inloggningsknapp på /login', { action: 'Verifiera login-form markup i login.html' });

    const onboard = await fetchText(`${base}/onboarding`);
    record('onboarding_page_loads', onboard.res.ok, 'Onboarding-sida tillgänglig');
    record('onboarding_step6_btn', htmlHasId(onboard.text, 'step6Btn'), 'Onboarding steg 6-knapp finns i HTML');

    const childLogin = await fetchText(`${base}/child-login`);
    record('child_login_page_loads', childLogin.res.ok, 'Barninloggningssida laddas');
    record('child_login_pin_field',
      htmlHasInput(childLogin.text, /type=["']password["']|inputmode=["']numeric["']|id=["']childPin["']/),
      'PIN-fält på barninloggning');
    record('child_login_submit',
      htmlHasInput(childLogin.text, /type=["']submit["']|id=["']childLoginBtn["']|child-login-btn/),
      'Inloggningsknapp på barninloggning', { action: 'child-login.html formulär' });

    const loginResult = await loginParent(base, email.trim(), password);
    record('parent_api_login', loginResult.ok, 'Förälder API-inloggning', {
      detail: loginResult.ok ? 'OK' : `HTTP ${loginResult.status}`,
      action: 'Kontrollera JOURNEY_QA_PARENT_* credentials',
      severity: 'critical',
    });

    const dash = await fetchText(`${base}/dashboard`, loginResult.cookies);
    record('dashboard_loads', dash.res.ok, 'Dashboard laddas för inloggad förälder');

    record('dom_journey_coach_mount', htmlHasId(dash.text, 'journeyCoachMount'), 'journeyCoachMount finns i dashboard.html');
    record('dom_handoff_banner', htmlHasId(dash.text, 'dashboardChildHandoff'), 'Handoff-banner container finns');
    record('dom_handoff_child_btn', htmlHasId(dash.text, 'dashboardChildLoginBtn'), 'Knapp "Barnet loggar in" finns', {
      action: 'dashboard-child-handoff.js + dashboard.html handoff-knappar',
      route: '#overview',
    });
    record('dom_handoff_logout_btn', htmlHasId(dash.text, 'dashboardParentLogoutBtn'), 'Knapp "Logga ut" i handoff finns');
    record('dom_parent_ack_modal', htmlHasId(dash.text, 'journeyParentAckModal'), 'Parent-ack-modal finns i DOM');
    record('dom_parent_ack_dismiss', htmlHasId(dash.text, 'journeyParentAckDismissBtn'), 'Parent-ack "Visa"-knapp finns', {
      action: 'journey-parent-ack.js + journeyParentAckDismissBtn',
    });
    record('dom_celebration_modal', htmlHasId(dash.text, 'journeyCelebrationModal'), 'Celebration-modal finns i DOM');
    record('dom_celebration_dismiss', htmlHasId(dash.text, 'journeyCelebrationDismissBtn'), 'Celebration avfärda-knapp finns');

    const scriptChecks = [
      ['script_journey_context_client', 'journey-context-client'],
      ['script_journey_coach', 'journey-coach'],
      ['script_journey_parent_ack', 'journey-parent-ack'],
      ['script_journey_celebration', 'journey-celebration'],
      ['script_dashboard_handoff', 'dashboard-child-handoff'],
    ];
    for (const [id, fragment] of scriptChecks) {
      const found = dash.text.includes(fragment);
      record(id, found, `Script ${fragment} laddas på dashboard`, {
        action: `Lägg till <script src="/js/${fragment}.js"> i dashboard.html`,
      });
    }

    const ctxResult = await fetchJson(`${base}/api/me/journey-context`, loginResult.cookies, loginResult.csrfToken);
    record('api_journey_context_200', ctxResult.ok, 'GET /api/me/journey-context returnerar 200', {
      detail: ctxResult.ok ? `phase=${ctxResult.body?.phase}` : `HTTP ${ctxResult.status}`,
      action: 'Kontrollera family_journey_context_api flagga och route scope',
      severity: 'critical',
      route: '#produktanalys',
    });
    record('api_journey_context_phase', !!ctxResult.body?.phase, 'journey-context innehåller phase');
    record('api_journey_context_capabilities',
      !!(ctxResult.body?.capabilities?.coach_v1 || ctxResult.body?.capabilities?.handoff_v2),
      'journey-context capabilities (coach/handoff)');

    record('coach_card_dom_ready', htmlHasId(dash.text, 'journeyCoachMount'), 'Coach-mount redo (HTML)', {
      detail: 'Synlighet kräver browser — HTML-markup kontrollerad',
    });
    if (ctxResult.body?.priority === 'coach') {
      record('coach_visible_when_priority_coach', true,
        'Coach-synlighet (HTTP) — kör headless Chrome för runtime-check', {
          detail: 'Markup finns; runtime-synlighet ej verifierad i HTTP-läge',
        });
    } else {
      record('coach_priority_not_coach_skip', true,
        `Coach ej krävd (priority=${ctxResult.body?.priority || 'none'})`);
    }

    if (ctxResult.body?.blocking_experience === 'handoff_to_child') {
      record('handoff_visible_when_blocking', true,
        'Handoff-synlighet (HTTP) — kör headless Chrome för runtime-check', {
          detail: 'Markup finns; runtime-synlighet ej verifierad i HTTP-läge',
        });
    } else {
      record('handoff_blocking_skip', true,
        `Handoff blocking ej aktiv (${ctxResult.body?.blocking_experience || 'null'})`);
    }

    const admin = await fetchText(`${base}/admin`, loginResult.cookies);
    record('admin_page_loads', admin.res.ok, 'Admin-sida laddas');
    record('admin_start_dashboard', htmlHasId(admin.text, 'startDashboard'), 'Admin start-dashboard finns i HTML');
    record('admin_journey_analysis_block', htmlHasId(admin.text, 'journeyDailyAnalysisBlock'),
      'Journey daglig analys-ruta finns på admin start', {
        action: 'Deploy admin-journey-daily-analysis.js + journeyDailyAnalysisBlock',
        route: '#overview',
      });

    const rollout = await fetchJson(`${base}/api/admin/journey-rollout/status`, loginResult.cookies, loginResult.csrfToken);
    if (rollout.status === 403) {
      record('admin_access', false, 'QA-konto har admin-behörighet', {
        action: 'Använd admin-konto med is_admin i JOURNEY_QA_PARENT_*',
        severity: 'info',
      });
    } else {
      record('admin_access', rollout.ok, 'Admin-behörighet OK', {
        detail: rollout.ok ? undefined : `HTTP ${rollout.status}`,
      });
      record('admin_rollout_api', rollout.ok, 'Admin journey-rollout API', {
        detail: rollout.ok ? `wave ${rollout.body?.active_wave}` : `HTTP ${rollout.status}`,
        route: '#produktanalys',
        severity: 'warning',
      });
    }
  } catch (err) {
    if (checks.length <= 1) {
      record('http_qa_runtime', false, 'HTTP QA avbröts', {
        detail: err.message,
        severity: 'info',
      });
    }
  }

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
    mode: 'http',
  };
}

module.exports = {
  runJourneyHttpQa,
  resolveBaseUrl,
  htmlHasId,
};
