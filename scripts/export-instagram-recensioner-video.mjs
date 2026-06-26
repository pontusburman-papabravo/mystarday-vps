#!/usr/bin/env node
/**
 * Export Instagram recensioner video from SOURCE images + hook overlays.
 *
 * Place originals in docs/marketing/instagram-recensioner/source/
 * See source/README.md for filenames.
 *
 * Usage:
 *   npm run instagram:recensioner
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'docs', 'marketing', 'instagram-recensioner', 'source');
const OUT_DIR = path.join(ROOT, 'docs', 'marketing', 'instagram-recensioner');

const W = 1080;
const H = 1920;
const SEC_PER_SLIDE = Number(process.env.SEC_PER_SLIDE || 5);

const SOURCE_KEYS = [
  '01-recensioner',
  '02-fardiga-scheman',
  '03-landing',
  '04-hem',
  '05-schema-anna',
  '06-rutiner',
];

/** 6 bilder, en per slide — berättande ordning */
const SLIDES = [
  {
    name: '01-recensioner',
    images: ['01-recensioner'],
    hook: 'När inkorgen får en att gråta av lättnad... 🥹',
  },
  {
    name: '02-schema-anna',
    images: ['05-schema-anna'],
    hook: 'Från konstant tjat till att barnen bockar av själva! ✨',
  },
  {
    name: '03-fardiga-scheman',
    images: ['02-fardiga-scheman'],
    hook: 'Färdiga mallar för morgon, kväll och lov – kopiera med ett klick. 📋',
  },
  {
    name: '04-rutiner',
    images: ['06-rutiner'],
    hook: 'Aktivera morgon- eller kvällsrutin direkt från För dig. ☀️🌙',
  },
  {
    name: '05-hem',
    images: ['04-hem'],
    hook: 'Allt samlat för föräldern – schema, stjärnor och översikt. 📊',
  },
  {
    name: '06-cta-landing',
    images: ['03-landing'],
    hook: 'Gör som hundratals andra familjer. Testa gratis på mystarday.se 🚀',
  },
];

const EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

function resolveSource(baseName) {
  for (const ext of EXTS) {
    const p = path.join(SOURCE_DIR, baseName + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function isLandscape(imagePath) {
  try {
    const out = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${imagePath}"`,
      { encoding: 'utf8' }
    ).trim();
    const [w, h] = out.split(',').map(Number);
    return w > h;
  } catch {
    return false;
  }
}

function checkSources() {
  const required = new Set(SOURCE_KEYS);
  const missing = [];
  const resolved = {};

  for (const key of SOURCE_KEYS) {
    const p = resolveSource(key);
    if (p) resolved[key] = p;
    else if (required.has(key)) missing.push(key);
  }

  if (missing.length) {
    console.error('\n❌ Saknar källbilder i docs/marketing/instagram-recensioner/source/\n');
    for (const m of missing) {
      console.error(`   ${m}.png  (eller .jpg)`);
    }
    console.error('\nKopiera dina 6 bilder från chatten/skärmdumparna enligt source/README.md\n');
    process.exit(1);
  }

  return resolved;
}

function buildCompositorHtml(imagePaths, hook) {
  const toSrc = (p) => 'file://' + p.split(path.sep).join('/');

  function slideBg(p) {
    const src = toSrc(p);
    if (isLandscape(p)) {
      return (
        '<div class="bg bg-landscape">' +
        `<img class="bg-blur" src="${src}" alt="">` +
        `<img class="bg-fg" src="${src}" alt="">` +
        '</div>'
      );
    }
    return `<div class="bg bg-portrait"><img src="${src}" alt=""></div>`;
  }

  const bgHtml = slideBg(imagePaths[0]);

  const hookEsc = hook
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #0f1629; }
    .bg { position: absolute; inset: 0; }
    .bg-portrait img {
      width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block;
    }
    .bg-landscape { background: #1b2340; overflow: hidden; }
    .bg-landscape .bg-blur {
      position: absolute; inset: -48px;
      width: calc(100% + 96px); height: calc(100% + 96px);
      object-fit: cover; filter: blur(36px) brightness(0.42) saturate(1.15);
    }
    .bg-landscape .bg-fg {
      position: absolute; left: 28px; right: 28px; top: 48px; bottom: 290px;
      width: calc(100% - 56px); height: calc(100% - 338px);
      object-fit: contain; object-position: center center;
    }
    .hook {
      position: absolute; left: 0; right: 0; bottom: 0; z-index: 10;
      padding: 72px 48px 80px;
      background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(15,22,41,0.88) 28%, rgba(15,22,41,0.97) 100%);
    }
    .hook p {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 44px; font-weight: 700; line-height: 1.32;
      color: #fff; text-align: center;
      text-shadow: 0 3px 20px rgba(0,0,0,0.6);
      max-width: 960px; margin: 0 auto;
    }
  </style>
</head>
<body>
  ${bgHtml}
  <div class="hook"><p>${hookEsc}</p></div>
</body>
</html>`;
}

async function renderSlide(browser, slide, resolved) {
  const imagePaths = slide.images.map((key) => resolved[key]);
  const html = buildCompositorHtml(imagePaths, slide.hook);
  const tmpHtml = path.join(OUT_DIR, `.tmp-${slide.name}.html`);
  fs.writeFileSync(tmpHtml, html);

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 300));

  const outPath = path.join(OUT_DIR, `${slide.name}.png`);
  await page.screenshot({ path: outPath, type: 'png' });
  await page.close();
  fs.unlinkSync(tmpHtml);

  return outPath;
}

async function main() {
  console.log('Instagram recensioner — export från källbilder\n');
  const resolved = checkSources();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files'],
  });

  const paths = [];
  try {
    for (const slide of SLIDES) {
      const out = await renderSlide(browser, slide, resolved);
      paths.push(out);
      console.log(`  ✓ ${slide.name}.png`);
    }
  } finally {
    await browser.close();
  }

  const mp4Path = path.join(OUT_DIR, 'instagram-recensioner.mp4');
  const inputs = paths.map((p) => `-loop 1 -t ${SEC_PER_SLIDE} -i "${p}"`).join(' ');
  const scales = paths.map((_, i) => `[${i}:v]scale=${W}:${H},setsar=1:1[v${i}]`).join(';');
  const concat = paths.map((_, i) => `[v${i}]`).join('') + `concat=n=${paths.length}:v=1:a=0[out]`;

  execSync(
    `ffmpeg -y ${inputs} -filter_complex "${scales};${concat}" -map "[out]" -c:v libx264 -pix_fmt yuv420p -r 30 -aspect 9:16 -movflags +faststart "${mp4Path}"`,
    { stdio: 'inherit' }
  );

  console.log(`\n✓ ${mp4Path}`);
  console.log(`  ${paths.length} slides × ${SEC_PER_SLIDE}s = ${paths.length * SEC_PER_SLIDE}s (${W}×${H}, 9:16)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
