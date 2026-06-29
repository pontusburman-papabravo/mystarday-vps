'use strict';

/**
 * Mobil browsertest — alla barnvärldar som ett barn (4–10 år) på telefon.
 * Flöde: dev-login → Idag → Min värld → Familj → Äventyr (7×75 delar) → Garage.
 */
const puppeteer = require('puppeteer');

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const NAV_OPTS = { waitUntil: 'domcontentloaded', timeout: 30000 };

const ERROR_PHRASES = [
  'Hmm, något gick fel',
  'Kunde inte ladda belöningar',
  'Kunde inte ladda.',
  'Dev-inloggning misslyckades',
];

function fail(msg) {
  const err = new Error(msg);
  err.isSmokeFail = true;
  throw err;
}

async function bodyText(page) {
  return page.evaluate(() => (document.body && document.body.innerText) ? document.body.innerText : '');
}

async function assertNoErrors(page, context) {
  const text = await bodyText(page);
  for (const phrase of ERROR_PHRASES) {
    if (text.includes(phrase)) fail(context + ': hittade feltext «' + phrase + '»');
  }
}

async function waitForHidden(page, selector, timeout = 15000) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return true;
      if (el.hidden) return true;
      const style = window.getComputedStyle(el);
      return style.display === 'none' || style.visibility === 'hidden';
    },
    { timeout },
    selector
  );
}

async function waitForChildShell(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('[data-child-world]').length >= 3,
    { timeout: 20000 }
  );
}

async function tapBottomNav(page, worldId) {
  await waitForChildShell(page);
  const clicked = await page.evaluate((id) => {
    const btn = document.querySelector('[data-child-world="' + id + '"]');
    if (!btn) return false;
    btn.click();
    return true;
  }, worldId);
  if (!clicked) fail('Saknar nav-knapp: ' + worldId);
  await page.waitForFunction(
    (wid) => {
      const active = document.querySelector('[data-child-world="' + wid + '"].is-active');
      return !!active;
    },
    { timeout: 10000 },
    worldId
  );
}

async function devChildLogin(page) {
  await page.goto(BASE + '/child-login', NAV_OPTS);
  const skipBtn = await page.waitForSelector('#clDevSkipBtn', { visible: true, timeout: 10000 });
  await Promise.all([
    page.waitForNavigation({ ...NAV_OPTS }).catch(() => null),
    skipBtn.click(),
  ]);
  await page.waitForFunction(
    () => window.location.pathname.indexOf('/child/') === 0 || window.location.pathname === '/child-dashboard',
    { timeout: 20000 }
  );
  await page.waitForSelector('#childBottomNav', { timeout: 15000 });
  await waitForChildShell(page);
  await assertNoErrors(page, 'Efter dev-login');
}

async function testIdag(page) {
  await page.goto(BASE + '/child/today', NAV_OPTS);
  await page.waitForSelector('#scheduleView, #todayFocusMount', { timeout: 15000 });
  await waitForChildShell(page);
  await page.waitForFunction(
    () => {
      const body = document.body;
      if (!body) return false;
      const t = body.innerText || '';
      return /UPPGIFT|äventyr|delar|schema/i.test(t);
    },
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => {
      const hype = document.getElementById('childBuildHypeMount');
      return hype && hype.innerText && hype.innerText.trim().length > 10;
    },
    { timeout: 15000 }
  );

  const world = await page.evaluate(() => {
    const hype = document.getElementById('childBuildHypeMount');
    const hasScene = hype ? !!hype.querySelector('.cbh-scene') : false;
    const hasMilestones = hype ? !!hype.querySelector('.cbh-milestones') : false;
    return { hasScene, hasMilestones, hypeText: hype ? hype.innerText.slice(0, 120) : '' };
  });
  if (!world.hasScene && !/äventyr|Välj|delar/i.test(world.hypeText)) {
    fail('Idag: saknar bygg-scen eller äventyrsprompt — «' + world.hypeText + '»');
  }
  console.log('OK Idag — bygg-scen:', world.hasScene, 'delmål:', world.hasMilestones);
}

async function testMinVarld(page) {
  await tapBottomNav(page, 'world');
  await page.waitForFunction(
    () => {
      const rv = document.getElementById('rewardsView');
      return rv && !rv.classList.contains('hidden');
    },
    { timeout: 10000 }
  );
  await waitForHidden(page, '#skattkammarLoading', 15000).catch(() => {});
  await page.waitForFunction(
    () => {
      const map = document.querySelector('.skatt-world-map');
      return map && map.querySelectorAll('.skatt-world-pin').length >= 7;
    },
    { timeout: 15000 }
  );
  await assertNoErrors(page, 'Min värld / Skattkammaren');

  const world = await page.evaluate(() => {
    const view = document.getElementById('skattkammarView');
    const map = document.querySelector('.skatt-world-map');
    return {
      textLen: view ? view.innerText.length : 0,
      hasMap: !!map,
      mapPins: map ? map.querySelectorAll('.skatt-world-pin').length : 0,
    };
  });
  if (world.textLen < 20) fail('Skattkammaren: tom vy');
  if (world.mapPins < 7) fail('Min värld: förväntade 7 världar på kartan, fick ' + world.mapPins);
  console.log('OK Min värld — karta med', world.mapPins, 'världar');
  return world;
}

async function testFamilj(page) {
  await tapBottomNav(page, 'family');
  await page.waitForFunction(
    () => {
      const fv = document.getElementById('familyView');
      return fv && fv.getAttribute('data-active') === 'true';
    },
    { timeout: 10000 }
  );
  await page.waitForFunction(
    () => {
      const hall = document.getElementById('familyHallMount');
      return hall && hall.innerText.trim().length > 10;
    },
    { timeout: 15000 }
  );
  await assertNoErrors(page, 'Familj');

  const family = await page.evaluate(() => {
    const hall = document.getElementById('familyHallMount');
    return { text: hall ? hall.innerText.slice(0, 80) : '' };
  });
  console.log('OK Familj —', family.text.replace(/\s+/g, ' ').trim());
  return family;
}

async function testAdventures(page) {
  await page.goto(BASE + '/child/adventures', NAV_OPTS);
  await waitForHidden(page, '#advLoading', 15000);
  await page.waitForSelector('#advGrid:not([hidden]) .adv-card', { timeout: 15000 });
  await assertNoErrors(page, 'Äventyr');

  const adv = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.adv-card'));
    return {
      count: cards.length,
      slugs: cards.map((c) => c.getAttribute('data-slug')),
      partsLabels: cards.map((c) => {
        const meta = c.querySelector('.adv-card-meta');
        return meta ? meta.textContent : '';
      }),
      names: cards.map((c) => c.querySelector('.adv-card-name')?.textContent || ''),
    };
  });

  if (adv.count !== 7) fail('Äventyr: förväntade 7 kort, fick ' + adv.count);
  const badParts = adv.partsLabels.filter((t) => !/75\s*delar/.test(t));
  if (badParts.length) fail('Äventyr: alla kort ska visa 75 delar — fel: ' + badParts.join(' | '));

  console.log('OK Äventyr — 7 kort med 75 delar:', adv.names.join(', '));
  return adv;
}

async function testGarage(page) {
  await page.goto(BASE + '/child/garage?preview=1', NAV_OPTS);
  await page.waitForSelector('#garageApp', { visible: true, timeout: 15000 });
  await assertNoErrors(page, 'Garage');

  const washBtn = await page.waitForSelector('[data-action="wash"]', { timeout: 10000 });
  await washBtn.click();
  await page.waitForSelector('#garageWorkshop:not([hidden])', { timeout: 5000 });

  const workshop = await page.evaluate(() => {
    const wall = document.getElementById('gwToolWall');
    const tools = wall ? wall.querySelectorAll('.gw-tool').length : 0;
    const arena = document.getElementById('gwArena');
    const arenaH = arena ? arena.getBoundingClientRect().height : 0;
    const car = document.querySelector('.gw-car-img');
    const carW = car ? car.getBoundingClientRect().width : 0;
    const colors = document.querySelectorAll('#colorRow .garage-color, .garage-colors button').length;
    return { tools, arenaH, carW, colors };
  });

  if (workshop.tools < 6) fail('Garage verkstad: förväntade 6+ verktyg, fick ' + workshop.tools);
  if (workshop.arenaH < 120) fail('Garage verkstad: för liten arena (' + workshop.arenaH + 'px)');
  if (workshop.carW < 80) fail('Garage: bilen för liten (' + workshop.carW + 'px)');

  console.log('OK Garage — verkstad', workshop.tools, 'verktyg, bil', Math.round(workshop.carW), 'px');
  return workshop;
}

async function testNavRoundtrip(page) {
  await page.goto(BASE + '/child/today', NAV_OPTS);
  await waitForChildShell(page);
  await tapBottomNav(page, 'world');
  await tapBottomNav(page, 'family');
  await tapBottomNav(page, 'today');
  await assertNoErrors(page, 'Nav-runda Idag→Värld→Familj→Idag');
  console.log('OK Nav-runda med bottenmenyn');
}

async function step(name, fn) {
  try {
    return await fn();
  } catch (e) {
    throw new Error('[' + name + '] ' + e.message);
  }
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport(MOBILE);

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const results = {};
  try {
    await step('dev-login', () => devChildLogin(page));
    results.idag = await step('idag', () => testIdag(page));
    results.world = await step('min-varld', () => testMinVarld(page));
    results.family = await step('familj', () => testFamilj(page));
    results.nav = await step('nav-runda', () => testNavRoundtrip(page));
    results.adventures = await step('adventures', () => testAdventures(page));
    results.garage = await step('garage', () => testGarage(page));
  } finally {
    await browser.close();
  }

  if (pageErrors.length) {
    console.warn('JS-fel i sidan (icke-blockerande):', pageErrors);
  }

  console.log('\n✅ Alla barnvärldar OK på mobil (390×844)');
  return results;
}

run().catch((e) => {
  console.error('\n❌ FAIL:', e.message);
  process.exit(1);
});
