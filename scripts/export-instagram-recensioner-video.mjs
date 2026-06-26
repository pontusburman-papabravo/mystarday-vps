#!/usr/bin/env node
/**
 * Export Instagram recensioner video (1080×1920, 4×3 sek).
 *
 * Usage:
 *   node scripts/export-instagram-recensioner-video.mjs
 *   npm run instagram:recensioner
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'marketing', 'instagram-recensioner');

const W = 1080;
const H = 1920;
const VIEWPORT_W = 405;
const VIEWPORT_H = 720;
const DPR = W / VIEWPORT_W;
const SEC_PER_SLIDE = Number(process.env.SEC_PER_SLIDE || 3);

const SLIDE_NAMES = [
  '01-recensioner',
  '02-schema-anna',
  '03-scheman-rutiner',
  '04-cta-landing',
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const fileUrl = pathToFileURL(
    path.join(ROOT, 'public', 'mockups', 'instagram-recensioner-storyboard.html')
  ).href;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    deviceScaleFactor: DPR,
  });

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  const slideCount = await page.$$eval('[data-slide]', (els) => els.length);
  const paths = [];

  for (let i = 0; i < slideCount; i++) {
    await page.evaluate((index) => {
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.background = '#000';
      ['.page-header', '.storyboard'].forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
      });
      const player = document.getElementById('player');
      const playerFrame = document.getElementById('playerFrame');
      const slides = document.querySelectorAll('[data-slide]');
      const source = slides[index];
      player.classList.add('active');
      player.style.display = 'flex';
      playerFrame.className = 'frame player-frame';
      playerFrame.innerHTML = source.innerHTML;
      playerFrame.style.width = '100%';
      playerFrame.style.height = '100%';
      playerFrame.style.maxWidth = 'none';
      playerFrame.style.maxHeight = 'none';
      playerFrame.style.borderRadius = '0';
      playerFrame.style.position = 'relative';
      playerFrame.style.overflow = 'hidden';
      playerFrame.style.background = '#F4F6FA';
    }, i);

    await new Promise((r) => setTimeout(r, 200));

    const name = SLIDE_NAMES[i] || `slide-${String(i + 1).padStart(2, '0')}`;
    const outPath = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({
      path: outPath,
      type: 'png',
      clip: { x: 0, y: 0, width: VIEWPORT_W, height: VIEWPORT_H },
    });
    paths.push(outPath);
    console.log(`  ✓ ${name}.png`);
  }

  await browser.close();

  const mp4Path = path.join(OUT_DIR, 'instagram-recensioner.mp4');

  const inputs = paths.map((p) => `-loop 1 -t ${SEC_PER_SLIDE} -i "${p}"`).join(' ');
  const scales = paths.map((_, i) => `[${i}:v]scale=${W}:${H},setsar=1:1[v${i}]`).join(';');
  const concat = paths.map((_, i) => `[v${i}]`).join('') + `concat=n=${paths.length}:v=1:a=0[out]`;

  execSync(
    `ffmpeg -y ${inputs} -filter_complex "${scales};${concat}" -map "[out]" -c:v libx264 -pix_fmt yuv420p -r 30 "${mp4Path}"`,
    { stdio: 'inherit' }
  );

  console.log(`\n✓ ${mp4Path}`);
  console.log(`  ${slideCount} slides × ${SEC_PER_SLIDE}s = ${slideCount * SEC_PER_SLIDE}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
