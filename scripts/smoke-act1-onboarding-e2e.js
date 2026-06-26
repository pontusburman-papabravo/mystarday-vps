#!/usr/bin/env node
/**
 * ACT-1 full onboarding E2E — register → starter plan → handoff → first star guide.
 * Usage:
 *   APP_URL=https://your-app.example node scripts/smoke-act1-onboarding-e2e.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const base = (process.env.APP_URL || process.env.BASE || '').replace(/\/$/, '');
if (!base) {
  console.error('Set APP_URL or BASE');
  process.exit(2);
}
const ts = Date.now();
const email = process.env.SMOKE_REGISTER_EMAIL || `act1-e2e-${ts}@example.com`;
const password = process.env.SMOKE_REGISTER_PASSWORD || 'Act1Test2026!';
const artifacts = process.env.SMOKE_ARTIFACTS || path.join(process.cwd(), 'artifacts', 'act1-e2e');
const headed = process.env.SMOKE_HEADED === '1';

fs.mkdirSync(artifacts, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
}
function fail(name, err) {
  const msg = err?.message || String(err);
  checks.push({ name, ok: false, err: msg });
  console.log(`  ❌ ${name} — ${msg}`);
}

async function shot(page, name) {
  const file = path.join(artifacts, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function acceptCookies(page) {
  await page.evaluate(() => {
    const btn = document.querySelector('#cb-banner .cb-btn-accept, button.cb-btn-accept');
    if (btn) btn.click();
  });
  await sleep(400);
}

async function main() {
  console.log(`ACT-1 E2E → ${base}`);
  console.log(`Test email: ${email}`);

  const browser = await puppeteer.launch({
    headless: !headed,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  try {
    const regRes = await fetch(`${base}/api/registration-status`);
    const regStatus = await regRes.json();
    if (regStatus.mode === 'maintenance') {
      throw new Error('Registrering stängd (maintenance)');
    }
    pass('registration_open', regStatus.mode || 'ok');

    await page.goto(`${base}/register`, { waitUntil: 'networkidle2', timeout: 60000 });
    await acceptCookies(page);
    await page.waitForSelector('#registerForm:not(.hidden)', { timeout: 20000 });

    await page.type('#name', 'ACT1 Test', { delay: 20 });
    await page.evaluate((em) => {
      document.getElementById('email').value = em;
      document.getElementById('familyName').value = 'ACT1 Testfamilj';
    }, email);
    await page.type('#password', password, { delay: 20 });
    await page.type('#confirmPassword', password, { delay: 20 });
    await page.click('#termsAccepted');
    await page.click('#submitBtn');

    await page.waitForFunction(
      () => location.pathname.includes('/onboarding'),
      { timeout: 30000 }
    );
    pass('register_redirect_onboarding', page.url());
    await shot(page, '01-onboarding-entry');

    // Wait for ACT-1 init
    await sleep(2500);

    const act1Entry = await page.evaluate(async () => {
      const starterVisible = !!document.getElementById('stepStarterPlan') &&
        !document.getElementById('stepStarterPlan').classList.contains('hidden');
      const legacyHidden = document.getElementById('step1')?.classList.contains('hidden');
      const title = document.body.innerText.includes('Skapa ert första schema');
      let cfg = null;
      try {
        const r = await window.apiFetch('/api/family/activation-config');
        cfg = r.ok ? await r.json() : null;
      } catch (_) {}
      return {
        starterVisible,
        legacyHidden,
        title,
        flags: cfg?.flags || null,
        variant: cfg?.activation_variant,
        onboardingEnabled: window.OnboardingStarterPlan?.isEnabled?.() || false,
      };
    });

    if (!act1Entry.flags?.activation_onboarding_v1) {
      fail('activation_onboarding_v1_flag', 'flag off or activation-config failed');
    } else {
      pass('activation_onboarding_v1_flag', act1Entry.flags);
    }

    if (!act1Entry.starterVisible && !act1Entry.title) {
      await shot(page, '02-no-starter-plan');
      fail('starter_plan_ui', `starterVisible=${act1Entry.starterVisible} title=${act1Entry.title}`);
    } else {
      pass('starter_plan_ui', {
        visible: act1Entry.starterVisible,
        legacyHidden: act1Entry.legacyHidden,
        jsEnabled: act1Entry.onboardingEnabled,
      });
    }

    // Q1: child name
    await page.waitForSelector('#spAnswer', { timeout: 15000 });
    await page.evaluate(() => {
      const el = document.getElementById('spAnswer');
      el.value = 'Testbarn';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('spNext').click();
    });
    await sleep(400);

    const choices = ['6-8', 'morgon', 'focus', 'lite', 'normal'];
    for (const val of choices) {
      await page.waitForSelector(`.sp-choice[data-value="${val}"]`, { timeout: 10000 });
      await page.evaluate((v) => {
        document.querySelector(`.sp-choice[data-value="${v}"]`).click();
        document.getElementById('spNext').click();
      }, val);
      await sleep(500);
    }

    // Q7 optional free text — just next
    await page.waitForSelector('#spNext', { timeout: 10000 });
    await page.evaluate(() => document.getElementById('spNext').click());

    // Preview
    await page.waitForSelector('#spSavePlan', { timeout: 60000 });
    const preview = await page.evaluate(() => ({
      text: document.getElementById('starterPlanPreview')?.innerText?.slice(0, 120) || '',
      activities: document.querySelectorAll('#spActivityList li').length,
    }));
    pass('starter_plan_preview', preview);
    await shot(page, '03-preview');

    await page.evaluate(() => document.getElementById('spSavePlan').click());
    await page.waitForFunction(
      () => document.getElementById('step5')?.classList.contains('active'),
      { timeout: 60000 }
    );
    pass('handoff_step5', await page.evaluate(() => ({
      childName: document.getElementById('s5ChildName')?.textContent?.trim(),
      pin: document.getElementById('s5Pin')?.textContent?.trim(),
      handoffEnhanced: document.getElementById('step5')?.dataset?.handoffEnhanced === '1',
    })));
    await shot(page, '04-handoff');

    const handoffBtns = await page.evaluate(() => ({
      openChildLogin: [...document.querySelectorAll('#step5 button')].some((b) => /barninloggning/i.test(b.textContent)),
      copyInfo: [...document.querySelectorAll('#step5 button')].some((b) => /kopiera inloggningsinfo/i.test(b.textContent)),
    }));
    if (handoffBtns.openChildLogin) pass('handoff_child_login_btn', true);
    else fail('handoff_child_login_btn', 'missing Öppna barninloggning');

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('#step5 button')].find((b) => /Nästa/i.test(b.textContent));
      if (btn) btn.click();
    });
    await page.waitForFunction(
      () => document.getElementById('step6')?.classList.contains('active'),
      { timeout: 15000 }
    );
    pass('step6_invite', true);
    await shot(page, '05-step6');

    // Trigger first star guide via step6 button (skip invite flow)
    await page.evaluate(() => document.getElementById('step6Btn').click());
    await page.waitForSelector('#firstStarGuideOverlay', { timeout: 10000 });
    const guide = await page.evaluate(() => ({
      title: document.querySelector('#firstStarGuideOverlay h2')?.textContent?.trim(),
      hasChildLogin: !!document.getElementById('fsgChildLogin'),
    }));
    pass('first_star_guide', guide);
    await shot(page, '06-first-star-guide');

    const finalState = await page.evaluate(async () => {
      const r = await window.apiFetch('/api/family/activation-config');
      return r.ok ? await r.json() : null;
    });
    pass('final_activation_config', {
      funnel_step: finalState?.funnel_step,
      variant: finalState?.activation_variant,
      p0: finalState?.p0_activated_within_48h,
    });
  } catch (e) {
    fail('fatal', e);
    try { await shot(page, '99-error'); } catch (_) {}
  } finally {
    await browser.close();
  }

  const failed = checks.filter((c) => !c.ok);
  const summary = {
    base,
    email,
    artifacts,
    checks,
    failed: failed.length,
  };
  fs.writeFileSync(path.join(artifacts, 'result.json'), JSON.stringify(summary, null, 2));
  console.log('\n' + JSON.stringify(summary, null, 2));
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
