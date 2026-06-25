#!/usr/bin/env node
/**
 * Export Reels storyboard frames (1080×1920 PNG) + slideshow MP4.
 *
 * Usage:
 *   node scripts/export-reels-assets.mjs
 *   VARIANTS=morgonrutin node scripts/export-reels-assets.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_ROOT = path.join(ROOT, 'docs', 'marketing', 'reels-exports');

const W = 1080;
const H = 1920;
const VIEWPORT_W = 405;
const VIEWPORT_H = 720;
const DPR = W / VIEWPORT_W;
const SEC_PER_SLIDE = Number(process.env.SEC_PER_SLIDE || 4);

const VARIANTS = (process.env.VARIANTS || 'morgonrutin,kvallrutin,npf').split(',').map((s) => s.trim());

const FILES = {
  morgonrutin: 'reels-annons-morgonrutin.html',
  kvallrutin: 'reels-annons-kvallrutin.html',
  npf: 'reels-annons-npf.html',
};

const SLIDE_NAMES = ['01-hook', '02-problem', '03-schema', '04-stjarna', '05-skattkammaren', '06-cta'];

async function exportVariant(browser, variant) {
  const htmlFile = FILES[variant];
  if (!htmlFile) throw new Error(`Unknown variant: ${variant}`);

  const outDir = path.join(OUT_ROOT, variant);
  fs.mkdirSync(outDir, { recursive: true });

  const fileUrl = pathToFileURL(path.join(ROOT, 'public', 'mockups', htmlFile)).href;
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
      ['.page-header', '.controls', '.storyboard'].forEach((sel) => {
        const el = document.querySelector(sel);
        if (el) el.style.display = 'none';
      });
      const player = document.getElementById('player');
      const playerFrame = document.getElementById('playerFrame');
      const slides = document.querySelectorAll('[data-slide]');
      const source = slides[index];
      player.classList.add('active');
      player.style.display = 'flex';
      playerFrame.className = 'frame player-frame ' + Array.from(source.classList)
        .filter((c) => c !== 'frame').join(' ');
      playerFrame.innerHTML = source.innerHTML;
      playerFrame.style.width = '100%';
      playerFrame.style.height = '100%';
      playerFrame.style.maxWidth = 'none';
      playerFrame.style.maxHeight = 'none';
      playerFrame.style.borderRadius = '0';
    }, i);

    await new Promise((r) => setTimeout(r, 150));

    const name = SLIDE_NAMES[i] || `slide-${String(i + 1).padStart(2, '0')}`;
    const outPath = path.join(outDir, `${name}.png`);
    await page.screenshot({
      path: outPath,
      type: 'png',
      clip: { x: 0, y: 0, width: VIEWPORT_W, height: VIEWPORT_H },
    });
    paths.push(outPath);
    console.log(`  ✓ ${variant}/${name}.png`);
  }

  await page.close();

  const mp4Path = path.join(outDir, `reels-${variant}.mp4`);
  const listPath = path.join(outDir, 'ffmpeg-list.txt');
  const listContent = paths.map((p) => `file '${p}'\nduration ${SEC_PER_SLIDE}`).join('\n')
    + `\nfile '${paths[paths.length - 1]}'`;
  fs.writeFileSync(listPath, listContent);

  try {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -vf "scale=${W}:${H}" -c:v libx264 -pix_fmt yuv420p -r 30 "${mp4Path}"`,
      { stdio: 'pipe' }
    );
    console.log(`  ✓ ${variant}/reels-${variant}.mp4`);
  } catch (err) {
    console.warn(`  ⚠ ffmpeg failed for ${variant}:`, err.message?.slice(0, 120));
  }

  fs.unlinkSync(listPath);
  return paths;
}

async function main() {
  console.log('Exporting Reels assets → docs/marketing/reels-exports/\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  try {
    for (const variant of VARIANTS) {
      console.log(`[${variant}]`);
      await exportVariant(browser, variant);
      console.log('');
    }
  } finally {
    await browser.close();
  }

  console.log('Done. Pull docs/marketing/reels-exports/ on your Mac.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
