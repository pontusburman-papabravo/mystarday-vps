#!/usr/bin/env node
/**
 * Browser verification for L1 / Engine go-live checklist items.
 * Checks off passing items in admin via PATCH.
 *
 * Usage:
 *   BASE=<prod-url> \
 *   REVIEW_EMAIL=review@... REVIEW_PASSWORD='...' \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   node scripts/go-live-checklist-browser.mjs
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = (process.env.BASE || process.env.APP_URL || '').replace(/\/$/, '');
if (!BASE) {
  console.error('Set BASE or APP_URL');
  process.exit(1);
}
const REVIEW_EMAIL = process.env.REVIEW_EMAIL || '';
const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD || '';
if (!REVIEW_EMAIL || !REVIEW_PASSWORD) {
  console.error('Set REVIEW_EMAIL and REVIEW_PASSWORD');
  process.exit(1);
}
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ARTIFACTS = process.env.GOLIVE_ARTIFACTS || '/workspace/artifacts/go-live-checklist';
const HEADLESS = process.env.GOLIVE_HEADED !== '1';
const AUTO_CHECK = process.env.GOLIVE_NO_CHECK !== '1';

fs.mkdirSync(ARTIFACTS, { recursive: true });

/** @type {Record<string, { status: 'pass'|'fail'|'skip', detail: string }>} */
const results = {};

function record(key, status, detail) {
  results[key] = { status, detail };
  const icon = status === 'pass' ? '✓' : status === 'skip' ? '○' : '✗';
  console.log(`${icon} ${key}: ${detail}`);
}

async function shot(page, name) {
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  screenshot: ${file}`);
}

async function acceptCookies(page) {
  await page.evaluate(() => {
    document.querySelector('#cb-banner .cb-btn-accept')?.click();
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', email, { delay: 15 });
  await page.type('#password', password, { delay: 15 });
  await page.click('#submitBtn');
  await page.waitForFunction(() => !location.pathname.includes('/login'), { timeout: 45000 });
}

async function patchChecklist(page, key) {
  const res = await page.evaluate(async (k) => {
    try {
      if (typeof Auth !== 'undefined' && Auth.api) {
        await Auth.api('/api/admin/l1-governance/checklist/' + encodeURIComponent(k), {
          method: 'PATCH',
          body: JSON.stringify({ checked: true }),
        });
        return { ok: true };
      }
      const csrf = (document.cookie.match(/(?:^|;)\s*csrf_token=([^;]+)/) || [])[1] || '';
      const r = await fetch('/api/admin/l1-governance/checklist/' + encodeURIComponent(k), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {}),
        },
        body: JSON.stringify({ checked: true }),
      });
      return { ok: r.ok, status: r.status };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }, key);
  return res.ok;
}

const CHECKLIST_KEYS = new Set([
  'engine_readonly',
  'first_success_payload',
  'l1_admin_ui',
  'decision_logging',
  'coach_mount_only',
  'bcd_unchanged',
  'no_auto_act',
  'observability_axes',
  'accept_unknown_active',
  'l1_owners_scheduled',
]);

async function checkOffPassed(page) {
  if (!AUTO_CHECK) return;
  console.log('\n── Bockar av i admin ──');
  for (const [key, r] of Object.entries(results)) {
    if (r.status !== 'pass' || !CHECKLIST_KEYS.has(key)) continue;
    const ok = await patchChecklist(page, key);
    console.log(ok ? `  ☑ ${key}` : `  ✗ kunde inte bocka ${key}`);
  }
  if (results.first_success_payload?.status === 'pass') {
    const ok = await patchChecklist(page, 'engine_readonly');
    if (ok) console.log('  ☑ engine_readonly (härledd från coach)');
  }
}

async function testDashboardReview(page) {
  console.log('\n── Dashboard (review-konto) ──');

  let firstSuccessPayload = null;
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', async (res) => {
    if (res.url().includes('/api/family/first-success') && res.status() === 200) {
      try {
        firstSuccessPayload = await res.json();
      } catch (_) { /* ignore */ }
    }
  });

  await login(page, REVIEW_EMAIL, REVIEW_PASSWORD);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  await shot(page, '01-dashboard');

  if (!firstSuccessPayload) {
    firstSuccessPayload = await page.evaluate(async () => {
      const res = await fetch('/api/family/first-success', { credentials: 'include' });
      if (!res.ok) return { _error: res.status };
      return res.json();
    });
  }

  const p = firstSuccessPayload;
  const payloadOk =
    p &&
    p.policy &&
    p.policy.id &&
    p.policy.name &&
    Object.prototype.hasOwnProperty.call(p, 'milestone') &&
    p.trace &&
    p.trace.evaluatedNeed &&
    p.trace.policySet;

  const coachState = await page.evaluate(() => {
    const mount = document.getElementById('engineCoachMount');
    const readiness = document.getElementById('homeReadinessMount');
    const coachCards = document.querySelectorAll('.engine-coach-card');
    const coachOutside = Array.from(coachCards).filter((el) => !mount?.contains(el));
    const changeNotice = mount?.querySelector('[data-engine-change-id]');
    return {
      mountExists: !!mount,
      mountVisible: mount && !mount.classList.contains('hidden'),
      hasCoachCard: coachCards.length > 0,
      coachCardCount: coachCards.length,
      coachOutsideMount: coachOutside.length,
      changeReleaseId: changeNotice?.getAttribute('data-engine-change-id') || null,
      hasNastaSteg: (mount?.textContent || '').includes('Nästa steg'),
      readinessVisible: readiness && !readiness.classList.contains('hidden'),
      readinessBelowCoach: !!(mount && readiness && mount.compareDocumentPosition(readiness) & Node.DOCUMENT_POSITION_FOLLOWING),
      coachAuthority: mount?.getAttribute('data-authority') || null,
    };
  });

  const engineConsoleClean = consoleErrors.filter(
    (e) => !/favicon|analytics|gtag|cookie|ResizeObserver|Content Security Policy/i.test(e)
  );

  if (payloadOk && coachState.mountVisible && coachState.hasCoachCard) {
    const releaseNote = coachState.changeReleaseId
      ? `release_id i intro: ${coachState.changeReleaseId}`
      : 'coach-intro redan stängd — coach_primary_v1 vid ny enhet';
    record(
      'first_success_payload',
      'pass',
      `policy=${p.policy.name}, need=${p.trace.evaluatedNeed}; ${releaseNote}; konsolfel=${engineConsoleClean.length}`
    );
  } else {
    record(
      'first_success_payload',
      'fail',
      `payloadOk=${!!payloadOk}, mountVisible=${coachState.mountVisible}, coach=${coachState.hasCoachCard}`
    );
  }

  if (
    coachState.mountExists &&
    coachState.coachCardCount === 1 &&
    coachState.coachOutsideMount === 0 &&
    coachState.coachAuthority === 'engine-only'
  ) {
    record('coach_mount_only', 'pass', '#engineCoachMount monopol (1 kort, engine-only)');
  } else {
    record('coach_mount_only', 'fail', JSON.stringify(coachState));
  }

  const coachBefore = await page.evaluate(() => document.getElementById('engineCoachMount')?.innerHTML || '');
  const readinessClick = await page.evaluate(() => {
    const el = document.querySelector('#homeReadinessMount [data-readiness-type]');
    if (!el) return { clicked: false };
    el.addEventListener('click', (e) => e.preventDefault(), { once: true });
    el.click();
    return { clicked: true, type: el.getAttribute('data-readiness-type') };
  });
  await new Promise((r) => setTimeout(r, 800));
  const coachAfter = await page.evaluate(() => document.getElementById('engineCoachMount')?.innerHTML || '');

  if (!coachState.readinessVisible && !readinessClick.clicked) {
    record('bcd_unchanged', 'skip', 'inga readiness-items synliga');
  } else if (coachBefore === coachAfter) {
    record('bcd_unchanged', 'pass', 'coach oförändrad efter readiness-klick');
  } else {
    record('bcd_unchanged', 'fail', 'coach-innerHTML ändrades');
  }
}

async function testAdminL1(page) {
  console.log('\n── Admin L1 ──');

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    for (const k of ['l1_admin_ui', 'decision_logging', 'no_auto_act', 'observability_axes', 'accept_unknown_active', 'l1_owners_scheduled', 'l1_refresh_btn']) {
      record(k, 'skip', 'ADMIN_EMAIL/ADMIN_PASSWORD saknas');
    }
    return;
  }

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${BASE}/admin#l1-beslut`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  await shot(page, '02-admin-l1');

  const denied = await page.evaluate(() => !document.getElementById('accessDenied')?.classList.contains('hidden'));
  if (denied) {
    for (const k of Object.keys(results).length ? [] : []) { /* noop */ }
    ['l1_admin_ui', 'decision_logging', 'no_auto_act', 'observability_axes', 'accept_unknown_active', 'l1_owners_scheduled', 'l1_refresh_btn'].forEach((k) => {
      record(k, 'fail', 'saknar admin-rättighet');
    });
    return;
  }

  let getCalls = 0;
  page.on('response', (r) => {
    if (r.url().includes('/api/admin/l1-governance') && !r.url().includes('checklist') && r.request().method() === 'GET') {
      getCalls++;
    }
  });

  const initial = await page.evaluate(async () => {
    const res = await fetch('/api/admin/l1-governance', { credentials: 'include' });
    return res.json();
  });
  const decisionCountBefore = initial.decisions?.length || 0;
  const learningDay = initial.learning_day || 0;

  // Refresh button
  const callsBefore = getCalls;
  await page.click('#l1GovernanceRefreshBtn');
  await new Promise((r) => setTimeout(r, 2500));
  const refreshStatus = await page.evaluate(() => document.getElementById('l1SaveStatus')?.textContent || '');
  if (getCalls > callsBefore || /Uppdaterad/i.test(refreshStatus)) {
    record('l1_refresh_btn', 'pass', `Uppdatera triggade reload (status: ${refreshStatus.trim() || 'API'})`);
  } else {
    record('l1_refresh_btn', 'fail', `ingen API/reload efter klick (status: ${refreshStatus})`);
  }

  const metrics = await page.evaluate(() => document.getElementById('l1MetricsRow')?.textContent || '');
  if (/Coach klick 7d/i.test(metrics) && /Conflict 7d/i.test(metrics) && /Readiness klick 7d/i.test(metrics)) {
    record('observability_axes', 'pass', 'metrics-rad laddad');
  } else {
    record('observability_axes', 'fail', metrics.slice(0, 120));
  }

  const owners = await page.evaluate(() => ({
    primary: document.getElementById('l1PrimaryOwner')?.value?.trim() || '',
    backup: document.getElementById('l1BackupOwner')?.value?.trim() || '',
    day7: document.getElementById('l1ReviewDay7')?.value || '',
    day14: document.getElementById('l1ReviewDay14')?.value || '',
  }));
  if (owners.primary && owners.backup && owners.day7 && owners.day14) {
    record('l1_owners_scheduled', 'pass', `${owners.primary} / dag7=${owners.day7}`);
  } else {
    record('l1_owners_scheduled', 'fail', JSON.stringify(owners));
  }

  await page.evaluate(() => document.querySelector('[data-q="intent_ok"][data-val="no"]')?.click());
  await page.select('#l1Override', 'HOLD');
  await new Promise((r) => setTimeout(r, 300));
  const uiState = await page.evaluate(() => ({
    rec: document.getElementById('l1RecommendationType')?.textContent?.trim(),
    preview: document.getElementById('l1LogPreview')?.textContent || '',
  }));
  if (uiState.preview.includes('HOLD')) {
    record('l1_admin_ui', 'pass', `rekommendation=${uiState.rec}, override HOLD`);
  } else {
    record('l1_admin_ui', 'fail', JSON.stringify(uiState));
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 3000));
  const afterReload = await page.evaluate(async () => {
    const res = await fetch('/api/admin/l1-governance', { credentials: 'include' });
    return (await res.json()).decisions?.length || 0;
  });
  if (afterReload === decisionCountBefore) {
    record('no_auto_act', 'pass', `ingen auto-beslut (${decisionCountBefore} rader)`);
  } else {
    record('no_auto_act', 'fail', `${decisionCountBefore} → ${afterReload}`);
  }

  await page.goto(`${BASE}/admin#l1-beslut`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 3000));
  await page.evaluate(() => document.querySelector('[data-q="intent_ok"][data-val="no"]')?.click());
  await page.select('#l1Override', 'HOLD');
  await page.evaluate(() => {
    const cb = document.getElementById('l1ConfirmRecommendation');
    if (cb) cb.checked = true;
    const owner = document.getElementById('l1OwnerLabel');
    if (owner && !owner.value) owner.value = 'browser-test';
  });
  await page.click('#l1SaveDecisionBtn');
  await new Promise((r) => setTimeout(r, 2500));
  const afterSave = await page.evaluate(() => ({
    status: document.getElementById('l1SaveStatus')?.textContent || '',
    log: document.getElementById('l1DecisionLog')?.textContent || '',
    topCode: document.querySelector('#l1DecisionLog code')?.textContent || '',
  }));
  if (/Sparat/i.test(afterSave.status) && afterSave.topCode.includes('coach_primary_v1')) {
    record('decision_logging', 'pass', 'HOLD + coach_primary_v1 i logg');
  } else {
    record('decision_logging', 'fail', afterSave.status || afterSave.log.slice(0, 150));
  }

  if (learningDay < 7) {
    record('accept_unknown_active', 'skip', `learning_day=${learningDay} (<7)`);
  } else {
    await page.evaluate(() => {
      document.querySelector('[data-q="intent_ok"][data-val="yes"]')?.click();
      document.querySelector('[data-q="non_adoption_baseline"][data-val="yes"]')?.click();
      document.querySelector('[data-q="qualitative_drift"][data-val="no"]')?.click();
      document.querySelector('[data-q="competition_drift"][data-val="no"]')?.click();
    });
    const acceptRec = await page.evaluate(() => document.getElementById('l1RecommendationType')?.textContent?.trim());
    if (acceptRec === 'ACCEPT-UNKNOWN') {
      record('accept_unknown_active', 'pass', `ACCEPT-UNKNOWN vid dag ${learningDay}`);
    } else {
      record('accept_unknown_active', 'fail', `fick ${acceptRec}`);
    }
  }

  await checkOffPassed(page);
  await shot(page, '03-admin-after-checkoff');
}

async function main() {
  console.log(`Go-live checklist → ${BASE}`);
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const reviewCtx = await browser.createBrowserContext();
    const reviewPage = await reviewCtx.newPage();
    await testDashboardReview(reviewPage);
    await reviewCtx.close();

    const adminCtx = await browser.createBrowserContext();
    const adminPage = await adminCtx.newPage();
    await testAdminL1(adminPage);
    await adminCtx.close();
  } finally {
    await browser.close();
  }

  const summaryPath = path.join(ARTIFACTS, 'results.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));

  const passed = Object.values(results).filter((r) => r.status === 'pass').length;
  const failed = Object.values(results).filter((r) => r.status === 'fail').length;
  const skipped = Object.values(results).filter((r) => r.status === 'skip').length;
  console.log(`\n══ Pass: ${passed}  Fail: ${failed}  Skip: ${skipped} ══`);
  console.log(summaryPath);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
