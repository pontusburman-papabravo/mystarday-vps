#!/usr/bin/env node
/**
 * Build English mirrors of Swedish public HTML pages.
 * - Attribute-aware path replacement (href, content, canonical, og:url)
 * - Google Translate for body text (cached, batched by unique strings)
 * Usage: node scripts/mirror-public-pages-en.mjs [--no-translate] [--check]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { translate } from '@vitalets/google-translate-api';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const CACHE_PATH = path.join(ROOT, 'data', 'en-translate-cache.json');

const { MIRROR_ENTRIES, buildLangRoutesMap, HAND_TRANSLATED_EN_FILES } = require('../config/en-public-mirror');
const { sortedUiPhrases } = require('../config/en-ui-phrases');

const CHECK_ONLY = process.argv.includes('--check');
const NO_TRANSLATE = process.argv.includes('--no-translate');
const CACHED_ONLY = process.argv.includes('--cached-only');
const uiPhrases = sortedUiPhrases();

let translateCache = {};
if (fs.existsSync(CACHE_PATH)) {
  translateCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
}

function saveCache() {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(translateCache, null, 2), 'utf8');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function buildPathReplacements() {
  const pairs = MIRROR_ENTRIES.flatMap((e) => [[e.sv, e.en]]);
  pairs.sort((a, b) => b[0].length - a[0].length);
  return pairs;
}

const PATH_REPLACEMENTS = buildPathReplacements();

function replaceUrlPath(urlPath) {
  let out = urlPath;
  for (const [sv, en] of PATH_REPLACEMENTS) {
    if (out === sv || out.startsWith(`${sv}/`) || out.startsWith(`${sv}?`)) {
      out = en + out.slice(sv.length);
      break;
    }
  }
  return out;
}

function replacePathsInHtml(html) {
  let out = html.replace(/(href|content|action)=(["'])(\/[^"']*)\2/gi, (match, attr, quote, urlPath) => {
    const qIdx = urlPath.indexOf('?');
    const base = qIdx === -1 ? urlPath : urlPath.slice(0, qIdx);
    const query = qIdx === -1 ? '' : urlPath.slice(qIdx);
    const replaced = replaceUrlPath(base) + query;
    return `${attr}=${quote}${replaced}${quote}`;
  });
  out = out.replace(/(href|content)="\[REDACTED\](\/[^"]*)"/g, (m, attr, p) => {
    return `${attr}="__SITE_URL__${replaceUrlPath(p)}"`;
  });
  out = out.replace(/(href|content)="__SITE_URL__(\/[^"]*)"/g, (m, attr, p) => {
    return `${attr}="__SITE_URL__${replaceUrlPath(p)}"`;
  });
  return out;
}

function protectBlocks(html) {
  const blocks = [];
  const protectedHtml = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    const idx = blocks.length;
    blocks.push(block);
    return `__BLOCK_${idx}__`;
  });
  return { protectedHtml, blocks };
}

function restoreBlocks(html, blocks) {
  let out = html;
  blocks.forEach((block, i) => {
    out = out.replace(`__BLOCK_${i}__`, block);
  });
  return out;
}

function applyUiPhrases(text) {
  const brandSv = ['Min', 'Stj', '\u00e4', 'rn', 'dag'].join('');
  let out = text.replace(new RegExp(brandSv, 'g'), 'My Starday');
  for (const [sv, en] of uiPhrases) {
    out = out.split(sv).join(en);
  }
  return out;
}

function extractTextSegments(html) {
  const segments = new Set();
  const re = />([^<]+)</g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1];
    const text = raw.trim();
    if (!text) continue;
    if (/^[\d\s\W]+$/.test(text)) continue;
    if (text.startsWith('__BLOCK_')) continue;
    if (/^(https?:|mailto:|tel:)/.test(text)) continue;
    segments.add(raw);
  }
  return [...segments];
}

function needsTranslation(text) {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  if (/^[\d\s\W]+$/.test(trimmed)) return false;
  if (/[åäöÅÄÖ]/.test(trimmed)) return true;
  const svWords = /\b(och|att|det|är|för|med|som|kan|ska|inte|från|till|varje|alla|mer|hur|vad|när|varför|barn|schema|stjärn|gratis|ladda|skriv|morgon|kväll)\b/i;
  return svWords.test(trimmed);
}

async function translateString(svText, retries = 0) {
  const trimmed = svText.trim();
  if (!trimmed || trimmed.length < 2) return svText;
  if (!needsTranslation(trimmed)) return svText;
  if (translateCache[trimmed]) return svText.replace(trimmed, translateCache[trimmed]);

  try {
    const { text } = await translate(trimmed, { from: 'sv', to: 'en' });
    translateCache[trimmed] = text;
    await new Promise((r) => setTimeout(r, 900));
    return svText.replace(trimmed, text);
  } catch (err) {
    const isRateLimit = String(err.message).includes('Too Many Requests');
    if (isRateLimit && retries < 5) {
      const wait = 15000 * (retries + 1);
      console.warn(`Rate limited — waiting ${wait / 1000}s before retry…`);
      await new Promise((r) => setTimeout(r, wait));
      return translateString(svText, retries + 1);
    }
    console.warn(`Translate failed for "${trimmed.slice(0, 50)}…": ${err.message}`);
    return svText;
  }
}

function applyTranslations(html, segmentMap) {
  let out = html;
  const sorted = [...segmentMap.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [original, translated] of sorted) {
    if (original !== translated) {
      out = out.split(original).join(translated);
    }
  }
  return out;
}

function sanitizeSiteUrls(html) {
  return html
    .replace(/\[REDACTED\](\/[^"'\s<]*)/g, '__SITE_URL__$1')
    .replace(/content="\[REDACTED\]/g, 'content="__SITE_URL__');
}
  if (html.includes('hreflang=')) return html;
  const site = '__SITE_URL__';
  const block = `  <link rel="alternate" hreflang="sv" href="${site}${svPath === '/' ? '/' : svPath}">
  <link rel="alternate" hreflang="en" href="${site}${enPath}">
  <link rel="alternate" hreflang="x-default" href="${site}/">`;
  const canonicalIdx = html.indexOf('<link rel="canonical"');
  if (canonicalIdx !== -1) {
    const lineEnd = html.indexOf('\n', canonicalIdx);
    return html.slice(0, lineEnd + 1) + block + '\n' + html.slice(lineEnd + 1);
  }
  const headIdx = html.indexOf('<head>');
  if (headIdx === -1) return html;
  return html.slice(0, headIdx + 6) + '\n' + block + '\n' + html.slice(headIdx + 6);
}

function injectLangSwitcher(html) {
  if (html.includes('public-lang-switcher.js')) return html;
  const script = '  <script src="/js/public-lang-switcher.js?v=2"></script>\n';
  const cookieIdx = html.indexOf('cookie-banner.js');
  if (cookieIdx !== -1) {
    const lineEnd = html.indexOf('\n', cookieIdx);
    return html.slice(0, lineEnd + 1) + script + html.slice(lineEnd + 1);
  }
  const headEnd = html.indexOf('</head>');
  if (headEnd === -1) return html;
  return html.slice(0, headEnd) + script + html.slice(headEnd);
}

function finalizeHtml(html, entry) {
  let body = sanitizeSiteUrls(html);
  body = injectHreflang(body, entry.en, entry.sv);
  body = injectLangSwitcher(body);
  const site = '__SITE_URL__';
  const enCanonical = entry.en === '/' ? `${site}/` : `${site}${entry.en}`;
  if (body.includes('rel="canonical"')) {
    body = body.replace(
      /<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="${enCanonical}">`
    );
  }
  return body;
}

function preprocessHtml(svHtml) {
  let html = svHtml;
  html = html.replace(/lang="sv"/g, 'lang="en"');
  html = html.replace(/lang="sv-SE"/g, 'lang="en"');
  const { protectedHtml, blocks } = protectBlocks(html);
  let body = replacePathsInHtml(protectedHtml);
  body = applyUiPhrases(body);
  body = restoreBlocks(body, blocks);
  return body;
}

async function buildSegmentTranslations(allSegments) {
  const unique = new Set();
  for (const seg of allSegments) {
    const trimmed = seg.trim();
    if (!trimmed || trimmed.length < 2) continue;
    if (/^[\d\s\W]+$/.test(trimmed)) continue;
    unique.add(trimmed);
  }

  const toTranslate = [...unique].filter((s) => !translateCache[s] && needsTranslation(s));
  console.log(`Translating ${toTranslate.length} new strings (${unique.size} unique, ${Object.keys(translateCache).length} cached)…`);

  let done = 0;
  for (const sv of toTranslate) {
    await translateString(sv);
    done += 1;
    if (done % 50 === 0) {
      saveCache();
      console.log(`  … ${done}/${toTranslate.length}`);
    }
  }
  saveCache();

  const segmentMap = new Map();
  for (const seg of allSegments) {
    const trimmed = seg.trim();
    const en = translateCache[trimmed] || trimmed;
    segmentMap.set(seg, seg.replace(trimmed, en));
  }
  return segmentMap;
}

function writeLangRoutesJs() {
  const map = buildLangRoutesMap();
  const content = `/** Generated by scripts/mirror-public-pages-en.mjs — do not edit manually */\nwindow.PUBLIC_LANG_ROUTES = ${JSON.stringify(map, null, 2)};\n`;
  const outPath = path.join(PUBLIC, 'js', 'public-lang-routes.js');
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`Wrote ${outPath} (${Object.keys(map).length} routes)`);
}

async function main() {
  const preprocessed = [];
  const allSegments = [];

  for (const entry of MIRROR_ENTRIES) {
    const srcPath = path.join(PUBLIC, entry.fileSv);
    if (!fs.existsSync(srcPath)) continue;
    if (HAND_TRANSLATED_EN_FILES.has(entry.fileEn)) continue;
    const svHtml = fs.readFileSync(srcPath, 'utf8');
    const html = preprocessHtml(svHtml);
    const { protectedHtml, blocks } = protectBlocks(html);
    const segments = extractTextSegments(protectedHtml);
    allSegments.push(...segments);
    preprocessed.push({ entry, html, blocks, segments });
  }

  let segmentMap = new Map();
  if (NO_TRANSLATE) {
    for (const seg of allSegments) segmentMap.set(seg, seg);
  } else if (CACHED_ONLY) {
    for (const seg of allSegments) {
      const trimmed = seg.trim();
      const en = translateCache[trimmed] || seg;
      segmentMap.set(seg, seg.replace(trimmed, en));
    }
    console.log(`Applied ${Object.keys(translateCache).length} cached translations only`);
  } else if (!CHECK_ONLY) {
    segmentMap = await buildSegmentTranslations(allSegments);
  } else {
    for (const seg of allSegments) segmentMap.set(seg, seg);
  }

  let created = 0;
  const errors = [];

  for (const { entry, html, blocks, segments } of preprocessed) {
    if (HAND_TRANSLATED_EN_FILES.has(entry.fileEn)) continue;
    const destPath = path.join(PUBLIC, entry.fileEn);

    const { protectedHtml } = protectBlocks(restoreBlocks(html, blocks));
    let body = applyTranslations(protectedHtml, segmentMap);
    body = restoreBlocks(body, blocks);
    body = finalizeHtml(body, entry);

    if (CHECK_ONLY) {
      if (!fs.existsSync(destPath)) errors.push(`Missing mirror: ${entry.fileEn}`);
      continue;
    }

    ensureDir(destPath);
    fs.writeFileSync(destPath, body, 'utf8');
    created += 1;
  }

  if (!CHECK_ONLY) {
    writeLangRoutesJs();
  }

  console.log(`Mirror: ${created} files written, ${Object.keys(translateCache).length} cached phrases`);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
