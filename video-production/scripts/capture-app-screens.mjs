#!/usr/bin/env node
/**
 * Capture barnvy UI frames from public/v2/child.html for app-screen scenes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'app-screens');
const HTML = path.resolve(ROOT, '..', 'public', 'v2', 'child.html');

async function capture() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`file://${HTML}`, { waitUntil: 'networkidle0' });

  await page.screenshot({ path: path.join(OUT, 'morning-list.png'), fullPage: false });

  await page.evaluate(() => {
    const cards = document.querySelectorAll('.activity-card');
    if (cards[0]) {
      cards[0].classList.add('done');
      const meta = cards[0].querySelector('.act-meta');
      if (meta) meta.innerHTML = '<span class="act-time">07:30</span><span>Klar ✓</span>';
    }
  });
  await page.screenshot({ path: path.join(OUT, 'check-star.png') });

  await page.evaluate(() => {
    document.querySelectorAll('.activity-card').forEach((c, i) => {
      if (i < 2) c.classList.add('done');
      if (i === 2) c.classList.add('active');
    });
  });
  await page.screenshot({ path: path.join(OUT, 'next-activity.png') });

  await page.evaluate(() => {
    const btn = document.querySelector('.treasure-btn:not([disabled])');
    if (btn) btn.textContent = 'Lös in';
  });
  await page.screenshot({ path: path.join(OUT, 'redeem.png'), clip: { x: 0, y: 400, width: 390, height: 440 } });

  await browser.close();
  console.log('App screens saved to', OUT);
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
