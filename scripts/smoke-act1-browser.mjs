#!/usr/bin/env node
/**
 * ACT-1 full browser smoke — run after deploy when user says "testa nu".
 * Usage:
 *   SMOKE_EMAIL=pontus@burman.cc SMOKE_PASSWORD='…' node scripts/smoke-act1-browser.mjs
 */
const puppeteer = require('puppeteer');

const base = process.env.APP_URL || 'https://mystarday.se';
const email = process.env.SMOKE_EMAIL || process.env.PR2_EMAIL;
const password = process.env.SMOKE_PASSWORD || process.env.PR2_PASSWORD;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = [
  { id: 'mobil', width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: 'ipad', width: 1024, height: 1366, isMobile: true, hasTouch: true },
  { id: 'dator', width: 1440, height: 900, isMobile: false, hasTouch: false },
];

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#email');
  await page.evaluate((c) => {
    document.getElementById('email').value = c.email;
    document.getElementById('password').value = c.password;
  }, { email, password });
  await page.click('#submitBtn');
  await page.waitForFunction(() => !location.pathname.includes('/login'), { timeout: 25000 });
}

async function runDevice(device) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: device.width, height: device.height, isMobile: device.isMobile, hasTouch: device.hasTouch });
  const checks = [];

  async function check(name, fn) {
    try {
      checks.push({ name, ok: true, detail: await fn() });
    } catch (e) {
      checks.push({ name, ok: false, err: e.message });
    }
  }

  await check('login', async () => {
    await login(page);
    return page.url();
  });

  await check('library_hub', async () => {
    await page.goto(`${base}/library`, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(2000);
    const ok = await page.evaluate(() => ({
      standard: !!document.querySelector('[data-library-section="standard"]'),
      mine: !!document.querySelector('[data-library-section="mine"]'),
      err: /Kunde inte ladda/i.test(document.body.innerText),
    }));
    if (ok.err) throw new Error('library load error');
    if (!ok.standard || !ok.mine) throw new Error('missing cards');
    return ok;
  });

  await check('mina_bibliotek_scheman', async () => {
    await page.goto(`${base}/library#magic-mine`, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(2500);
    const t = await page.evaluate(() => document.body.innerText);
    if (/Kunde inte ladda scheman/i.test(t)) throw new Error('schema error');
    return /Förskola|Scheman|barn/i.test(t) ? 'ok' : t.slice(0, 60);
  });

  if (device.id === 'mobil') {
    await check('bottom_nav_hem', async () => {
      await page.evaluate(() => {
        const a = [...document.querySelectorAll('a[href="/dashboard"]')].find((el) => /hem/i.test(el.textContent || '') || el.getAttribute('href') === '/dashboard');
        if (a) a.click();
      });
      await page.waitForFunction(() => location.pathname.includes('dashboard'), { timeout: 15000 });
      return page.url();
    });
  }

  await check('planning_schedule_back', async () => {
    await page.goto(`${base}/planning`, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1500);
    const link = await page.$('a[href*="schedule"]');
    if (!link) throw new Error('no schedule link');
    await link.click();
    await sleep(3000);
    const info = await page.evaluate(() => ({
      url: location.pathname,
      back: /Till planering/i.test(document.body.innerText),
    }));
    if (!info.url.includes('schedule')) throw new Error(info.url);
    if (!info.back) throw new Error('no back nav');
    return info;
  });

  await check('family_custody', async () => {
    await page.goto(`${base}/family`, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(2000);
    return page.evaluate(() => ({
      section: !!document.getElementById('custodyScheduleSection'),
      visible: !document.getElementById('custodyScheduleSection')?.classList.contains('hidden'),
    }));
  });

  await check('pr3_starter_plan_asset', async () => {
    const has = await page.evaluate(async () => {
      const r = await fetch('/js/onboarding-starter-plan.js', { cache: 'no-store' });
      const t = await r.text();
      return r.ok && t.includes('goToStep(5)') && t.includes('starter_plan_saved');
    });
    if (!has) throw new Error('starter-plan JS missing PR3 markers');
    return 'ok';
  });

  await check('onboarding_activation_asset', async () => {
    const has = await page.evaluate(async () => {
      const r = await fetch('/js/onboarding-activation.js', { cache: 'no-store' });
      const t = await r.text();
      return r.ok && t.includes('patchStep6Btn');
    });
    if (!has) throw new Error('activation JS missing PR2 markers');
    return 'ok';
  });

  await browser.close();
  return { device: device.id, checks, failed: checks.filter((c) => !c.ok).length };
}

(async () => {
  if (!email || !password) {
    console.error('Set SMOKE_EMAIL and SMOKE_PASSWORD');
    process.exit(2);
  }

  const devices = [];
  for (const d of DEVICES) {
    devices.push(await runDevice(d));
  }

  let sw = 'unknown';
  try {
    const t = await fetch(`${base}/sw.js`, { cache: 'no-store' }).then((r) => r.text());
    sw = t.match(/CACHE_NAME = '(stjarndag-v\d+)'/)?.[1] || sw;
  } catch (_) { /* ignore */ }

  const totalFail = devices.reduce((n, d) => n + d.failed, 0);
  console.log(JSON.stringify({ sw, devices, totalFail }, null, 2));
  process.exit(totalFail > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
