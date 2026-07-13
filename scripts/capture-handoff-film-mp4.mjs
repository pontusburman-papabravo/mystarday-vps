#!/usr/bin/env node
/**
 * Capture onboarding handoff film preview as MP4 (mobile portrait).
 * Usage: node scripts/capture-handoff-film-mp4.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import puppeteer from 'puppeteer';

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const URL = `${BASE.replace(/\/$/, '')}/onboarding/film-preview`;
const OUT_DIR = path.join(process.cwd(), 'tmp', 'handoff-film-capture');
const OUT_MP4 = path.join(process.cwd(), 'public', 'onboarding', 'handoff-film.mp4');
const FPS = 10;
const DURATION_MS = 28000;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MP4), { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#onboardingHandoffFilm', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 500));

  const frameMs = 1000 / FPS;
  const frames = Math.ceil(DURATION_MS / frameMs);
  for (let i = 0; i < frames; i += 1) {
    const file = path.join(OUT_DIR, `frame-${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: file, type: 'png' });
    await new Promise((r) => setTimeout(r, frameMs));
  }
  await browser.close();

  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${OUT_DIR}/frame-%04d.png" -vf "scale=780:1688" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUT_MP4}"`,
    { stdio: 'inherit' }
  );
  console.log(`✓ ${OUT_MP4}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
