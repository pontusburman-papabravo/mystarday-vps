'use strict';

/**
 * Browser smoke: garage preview + workshop tools (puppeteer).
 */
const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('http://127.0.0.1:3000/child/garage?preview=1', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#garageApp', { visible: true, timeout: 15000 });

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
    return { tools, arenaH, carW, hint: document.getElementById('gwHint')?.textContent || '' };
  });

  if (workshop.tools < 6) throw new Error('Expected 6+ tools on wall, got ' + workshop.tools);
  if (workshop.arenaH < 120) throw new Error('Arena too small: ' + workshop.arenaH);
  if (workshop.carW < 80) throw new Error('Car too small: ' + workshop.carW);

  console.log('OK garage workshop', workshop);
  if (errors.length) console.warn('page errors:', errors);

  await browser.close();
}

run().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
