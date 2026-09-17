'use strict';

/**
 * High-signal hardcoded user-copy scanner + monotonic ratchet.
 *
 * This PR locks existing debt. It does not change runtime fallback.
 * data-i18n HTML with Swedish inner text is still skipped (pre-JS placeholders).
 * Runtime fallback is language-neutral: requested → en-GB → key.
 *
 * Escape hatch (one hit): `i18n-ignore: reason` on the same or previous line.
 * Reason is required. No directory-wide ignores.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');

const BASELINE_PATH = path.join(ROOT, 'config', 'i18n-copy-ratchet-baseline.json');
const BASELINE_VERSION = 1;

const SWEDISH_CHARS = /[åäöÅÄÖ]/;
const WORD_RE = new RegExp(
  [
    'Avbryt',
    'Sparat',
    'Sparar',
    'Spara',
    'Lägg till',
    'Ta bort',
    'Redigera',
    'Välj',
    'Kunde inte',
    'Försök igen',
    'Laddar',
    'Nästa',
    'Tillbaka',
    'Stäng',
    'Familj',
    'Barn',
    'Schema',
    'Inställningar',
    'Belöning',
    'Stjärnor',
    'Mörkt läge',
    'Radera',
    'Är du säker',
  ].join('|')
);

const BRAND_RE = /Min Stjärndag|My Starday|Stjärndag/gi; // pragma: allowlist secret

/** Public hostnames (not credentials). Redacted in committed baseline snippets. */
const PUBLIC_SITE_RE = /mystarday\.(?:se|eu|app)/gi; // pragma: allowlist secret

const SCAN_ROOTS = [
  { dir: 'public', ext: new Set(['.html', '.js', '.svg']) },
  { dir: 'src/routes', ext: new Set(['.js']) },
  { dir: 'src/lib', ext: new Set(['.js']) },
];

const EXCLUDED_PREFIXES = [
  'docs/',
  'test/',
  'tests/',
  'config/i18n/',
  'src/locales/',
  'migrations/',
  'fixtures/',
  'src/routes/admin/',
  'public/admin/',
  'public/en/',
  'public/mockups/',
  'public/v2/', // Class B: static /V2.0 design mockup, not product runtime (title "Mockup"; docs/barnmeny-v2.md)
  'node_modules/',
  'src/routes/surveys/admin.js', // Class B: admin-only survey authoring (/api/admin/surveys)
];

/** Explicit SEO / legal / marketing surfaces — not the in-app product. */
const EXCLUDED_FILES = new Set([
  'public/index.html',
  'public/en.html',
  'public/terms.html',
  'public/privacy.html',
  'public/en-terms.html',
  'public/en-privacy.html',
  'public/en-faq.html',
  'public/en-contact.html',
  'public/en-pricing.html',
  'public/en-how-it-works.html',
  'public/faq.html',
  'public/kontakt.html',
  'public/om-oss.html',
  'public/pedagoger-och-terapeuter.html',
  'public/bildschema-app.html',
  'public/alternativ-bildschema-tavla.html',
  'public/morgonrutin-barn.html',
  'public/beloningssystem-barn.html',
  'public/rutiner-npf-barn.html',
  'public/resurser.html',
  'public/veckoschema-bildstod.html',
  'public/kampanj-host-2026.html',
  'public/kampanj-host-2026-utlottning.html',
  'public/samarbete.html',
  'public/tyck.html',
  'public/sv-tack.html',
  'public/nyheter-arkiv.html',
  'public/viktig-information.html',
  'public/skattkammaren.html',
  'public/pricing-info.html',
  'public/review-subscription-preview.html',
  'public/onboarding-film-preview.html',
  'public/img/stjarnadag-quick-actions-v4/preview/index.html',
  'public/js/dashboard-impersonation.js', // Class B: admin support session chrome
  'public/js/native-debug.js', // Class B: native debug overlay
  'public/js/preview-shell.js', // Class B: review/preview shell
  'public/js/preview-back.js', // Class B: review/preview chrome
  'public/js/preview-guest.js', // Class B: review/preview guest
  'public/js/landing-share.js', // Class C: marketing landing share sheet
  'public/js/landing-founder.js', // Class C: marketing landing founder quote
  'public/js/landing-login-choice.js', // Class C: marketing landing login chooser
]);

const EXCLUDED_DIR_PREFIXES = [
  'public/resurser/',
  'public/en/resources/',
];

const DATA_I18N_ATTR = /data-i18n(?:-placeholder|-title|-aria-label|-html)?\s*=/;

function posix(rel) {
  return rel.split(path.sep).join('/');
}

function isExcluded(rel) {
  const p = posix(rel);
  if (EXCLUDED_FILES.has(p)) return true;
  if (EXCLUDED_PREFIXES.some((pre) => p.startsWith(pre))) return true;
  if (EXCLUDED_DIR_PREFIXES.some((pre) => p.startsWith(pre))) return true;
  if (p.includes('/__snapshots__/') || p.includes('/fixtures/')) return true;
  return false;
}

function stripBrand(text) {
  return String(text).replace(BRAND_RE, ' ').replace(/\s+/g, ' ').trim();
}

const CODE_LIKE = /\bfunction\s|\bdocument\.|\bconst |\blet |\bvar |\breturn |\(\)\s*=>/;

function looksLikeUserCopy(text) {
  const cleaned = stripBrand(text);
  if (!cleaned) return false;
  if (CODE_LIKE.test(cleaned)) return false;
  if (SWEDISH_CHARS.test(cleaned)) return true;
  return WORD_RE.test(cleaned);
}

function normalizeSnippet(text) {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 160);
}

function hitId(file, rule, snippet, occurrence) {
  const h = crypto.createHash('sha256');
  h.update(`${file}\0${rule}\0${snippet}\0${occurrence}`);
  return h.digest('hex').slice(0, 16);
}

function parseI18nIgnore(line) {
  if (!line) return null;
  const m = String(line).match(/i18n-ignore:\s*(\S(?:.*\S)?)/);
  if (!m) return null;
  const reason = m[1].trim();
  return reason.length >= 2 ? reason : null;
}

function lineIgnored(lines, lineIndex) {
  const cur = lines[lineIndex] || '';
  if (parseI18nIgnore(cur)) return true;
  if (lineIndex > 0 && parseI18nIgnore(lines[lineIndex - 1])) return true;
  return false;
}

function isCommentOrLogLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--')) return true;
  if (/^console\.(log|warn|error|info|debug)\b/.test(t)) return true;
  return false;
}

function readQuoted(src, start) {
  const q = src[start];
  if (q !== "'" && q !== '"' && q !== '`') return null;
  let i = start + 1;
  let out = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      out += src[i + 1] || '';
      i += 2;
      continue;
    }
    if (q === '`' && ch === '$' && src[i + 1] === '{') {
      out += '${…}';
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') depth -= 1;
        i += 1;
      }
      continue;
    }
    if (ch === q) {
      return { value: out, end: i + 1 };
    }
    out += ch;
    i += 1;
    if (out.length > 400) return null;
  }
  return null;
}

function skipWs(src, i) {
  while (i < src.length && /\s/.test(src[i])) i += 1;
  return i;
}

function lineIndexAt(src, pos) {
  let n = 0;
  for (let i = 0; i < pos && i < src.length; i += 1) {
    if (src[i] === '\n') n += 1;
  }
  return n;
}

function collectFile(rel, src, hits) {
  const ext = path.extname(rel).toLowerCase();
  if (ext === '.js') scanJs(rel, src, hits);
  else if (ext === '.html') scanHtml(rel, src, hits);
  else if (ext === '.svg') scanSvg(rel, src, hits);
}

function pushHit(hits, file, rule, snippet, lineIndex, lines) {
  if (!looksLikeUserCopy(snippet)) return;
  if (lineIgnored(lines, lineIndex)) return;
  if (isCommentOrLogLine(lines[lineIndex] || '')) return;
  hits.push({ file, rule, snippet: normalizeSnippet(snippet), lineIndex });
}

function scanJs(rel, src, hits) {
  const lines = src.split('\n');
  scanJsPatterns(rel, src, lines, hits);
}

function scanJsPatterns(rel, src, lines, hits) {
  const callNames = [
    ['showToast', 'showToast'],
    ['confirm', 'confirm'],
    ['alert', 'alert'],
  ];
  for (const [fn, rule] of callNames) {
    const re = new RegExp(`\\b${fn}\\s*\\(`, 'g');
    let m;
    while ((m = re.exec(src))) {
      const argStart = skipWs(src, m.index + m[0].length);
      const quoted = readQuoted(src, argStart);
      if (!quoted) continue;
      pushHit(hits, rel, rule, quoted.value, lineIndexAt(src, m.index), lines);
    }
  }

  const assignRe = /\.(textContent|innerText|innerHTML)\s*=\s*/g;
  let am;
  while ((am = assignRe.exec(src))) {
    const qpos = skipWs(src, am.index + am[0].length);
    const quoted = readQuoted(src, qpos);
    if (!quoted) continue;
    const rule = am[1] === 'innerHTML' ? 'innerHTML' : 'textContent';
    pushHit(hits, rel, rule, quoted.value, lineIndexAt(src, am.index), lines);
  }

  const fallbackHelpers = /\b(tx|localizedOr)\s*\(/g;
  let hm;
  while ((hm = fallbackHelpers.exec(src))) {
    let i = skipWs(src, hm.index + hm[0].length);
    const first = readQuoted(src, i);
    if (first) i = first.end;
    else {
      while (i < src.length && src[i] !== ',' && src[i] !== ')') i += 1;
    }
    i = skipWs(src, i);
    if (src[i] !== ',') continue;
    i = skipWs(src, i + 1);
    const second = readQuoted(src, i);
    if (!second) continue;
    pushHit(hits, rel, 'helper-fallback', second.value, lineIndexAt(src, hm.index), lines);
  }

  const orRe = /\|\|\s*/g;
  let om;
  while ((om = orRe.exec(src))) {
    const quoted = readQuoted(src, skipWs(src, om.index + 2));
    if (!quoted) continue;
    pushHit(hits, rel, 'or-fallback', quoted.value, lineIndexAt(src, om.index), lines);
  }

  const serverRe = /\b(error|message|userMessage)\s*:\s*/g;
  let sm;
  while ((am = serverRe.exec(src))) {
    const quoted = readQuoted(src, skipWs(src, am.index + am[0].length));
    if (!quoted) continue;
    pushHit(hits, rel, 'server-message', quoted.value, lineIndexAt(src, am.index), lines);
  }

  const throwRe = /\bthrow new Error\s*\(/g;
  while ((sm = throwRe.exec(src))) {
    const quoted = readQuoted(src, skipWs(src, sm.index + sm[0].length));
    if (!quoted) continue;
    pushHit(hits, rel, 'throw-error', quoted.value, lineIndexAt(src, sm.index), lines);
  }

  const placeholderJs = /\bplaceholder\s*=\s*/g;
  let pm;
  while ((pm = placeholderJs.exec(src))) {
    const quoted = readQuoted(src, skipWs(src, pm.index + pm[0].length));
    if (!quoted) continue;
    pushHit(hits, rel, 'placeholder', quoted.value, lineIndexAt(src, pm.index), lines);
  }

  const ariaRe = /\baria-label\s*=\s*/g;
  while ((pm = ariaRe.exec(src))) {
    const quoted = readQuoted(src, skipWs(src, pm.index + pm[0].length));
    if (!quoted) continue;
    pushHit(hits, rel, 'aria-label', quoted.value, lineIndexAt(src, pm.index), lines);
  }

  const titleAttr = /(?:\btitle|\.title)\s*=\s*/g;
  while ((pm = titleAttr.exec(src))) {
    const quoted = readQuoted(src, skipWs(src, pm.index + pm[0].length));
    if (!quoted) continue;
    pushHit(hits, rel, 'title', quoted.value, lineIndexAt(src, pm.index), lines);
  }
}

function scanHtml(rel, src, hits) {
  const lines = src.split('\n');
  const withoutScripts = src.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block, offset) => {
    scanJsPatterns(rel, block, src.split('\n'), hits);
    return ' '.repeat(block.length);
  });

  const attrRules = [
    ['placeholder', /placeholder\s*=\s*(["'])([\s\S]*?)\1/gi],
    ['aria-label', /aria-label\s*=\s*(["'])([\s\S]*?)\1/gi],
    ['title', /\btitle\s*=\s*(["'])([\s\S]*?)\1/gi],
  ];
  for (const [rule, re] of attrRules) {
    let m;
    while ((m = re.exec(withoutScripts))) {
      const lineNo = lineIndexAt(src, m.index);
      const tagStart = src.lastIndexOf('<', m.index);
      const tagEnd = src.indexOf('>', m.index);
      const tag = tagStart >= 0 && tagEnd > tagStart ? src.slice(tagStart, tagEnd + 1) : '';
      if (DATA_I18N_ATTR.test(tag)) continue;
      pushHit(hits, rel, rule, m[2], lineNo, lines);
    }
  }

  const textRe = /<([a-zA-Z][\w:-]*)(\s[^>]*)?>([^<]*)/g;
  let tm;
  while ((tm = textRe.exec(withoutScripts))) {
    const tagName = tm[1].toLowerCase();
    if (tagName === 'script' || tagName === 'style' || tagName === 'code' || tagName === 'pre') continue;
    const attrs = tm[2] || '';
    if (DATA_I18N_ATTR.test(attrs)) continue;
    const text = tm[3];
    if (!looksLikeUserCopy(text)) continue;
    pushHit(hits, rel, 'html-text', text, lineIndexAt(src, tm.index), lines);
  }
}

function scanSvg(rel, src, hits) {
  const lines = src.split('\n');
  const re = /<(title|desc)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(src))) {
    pushHit(hits, rel, `svg-${m[1].toLowerCase()}`, m[2], lineIndexAt(src, m.index), lines);
  }
}

function walk(absDir, relPrefix, files, exts) {
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = posix(path.join(relPrefix, entry.name));
    if (isExcluded(rel)) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(abs, rel, files, exts);
    } else if (exts.has(path.extname(entry.name).toLowerCase())) {
      files.push(rel);
    }
  }
}

function finalizeHits(rawHits) {
  const counts = new Map();
  const out = [];
  for (const h of rawHits) {
    const key = `${h.file}|${h.rule}|${h.snippet}`;
    const n = (counts.get(key) || 0) + 1;
    counts.set(key, n);
    out.push({
      id: hitId(h.file, h.rule, h.snippet, n),
      path: h.file,
      rule: h.rule,
      snippet: h.snippet,
    });
  }
  out.sort((a, b) => (a.path + a.rule + a.id).localeCompare(b.path + b.rule + b.id));
  return out;
}

function scanRepo(rootDir = ROOT) {
  const files = [];
  for (const spec of SCAN_ROOTS) {
    walk(path.join(rootDir, spec.dir), spec.dir, files, spec.ext);
  }
  files.sort();
  const raw = [];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    collectFile(rel, src, raw);
  }
  return finalizeHits(raw);
}

function loadBaseline(baselinePath = BASELINE_PATH) {
  if (!fs.existsSync(baselinePath)) return null;
  const data = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  return data;
}

function validateBaselineFormat(baseline) {
  if (!baseline || typeof baseline !== 'object') return 'baseline missing or not an object';
  if (baseline.version !== BASELINE_VERSION) return `unsupported baseline version ${baseline.version}`;
  if (!Array.isArray(baseline.hits)) return 'baseline.hits must be an array';
  for (const hit of baseline.hits) {
    if (!hit || typeof hit.id !== 'string' || !hit.path || !hit.rule || typeof hit.snippet !== 'string') {
      return 'baseline hit missing id/path/rule/snippet';
    }
  }
  return null;
}

function compareRatchet(currentHits, baseline) {
  const formatError = validateBaselineFormat(baseline);
  if (formatError) {
    return { ok: false, formatError, newHits: currentHits, removedHits: [], currentCount: currentHits.length, baselineCount: 0 };
  }
  const baseIds = new Set(baseline.hits.map((h) => h.id));
  const curIds = new Set(currentHits.map((h) => h.id));
  const newHits = currentHits.filter((h) => !baseIds.has(h.id));
  const removedHits = baseline.hits.filter((h) => !curIds.has(h.id));
  return {
    ok: newHits.length === 0,
    formatError: null,
    newHits,
    removedHits,
    currentCount: currentHits.length,
    baselineCount: baseline.hits.length,
  };
}

function snippetForBaseline(snippet) {
  return String(snippet)
    .replace(BRAND_RE, '[brand]')
    .replace(PUBLIC_SITE_RE, '[site]');
}

function serializeBaseline(hits) {
  const safeHits = hits.map((h) => ({
    id: h.id,
    path: h.path,
    rule: h.rule,
    snippet: snippetForBaseline(h.snippet),
  }));
  return `${JSON.stringify({
    version: BASELINE_VERSION,
    generated_by: 'scripts/lib/i18n-copy-ratchet.js',
    note: 'Monotonic ratchet: hits may disappear, never grow without --force-raise. data-i18n Swedish inner HTML is pre-JS placeholder debt. Brand/site tokens in snippets are product copy, not credentials.',
    hits: safeHits,
  }, null, 2)}\n`;
}

function writeBaseline(hits, baselinePath, opts = {}) {
  const existing = fs.existsSync(baselinePath) ? loadBaseline(baselinePath) : { version: BASELINE_VERSION, hits: [] };
  const prevCount = Array.isArray(existing.hits) ? existing.hits.length : 0;
  if (hits.length > prevCount && !opts.forceRaise) {
    const err = new Error(
      `Refusing to write baseline: current ${hits.length} > previous ${prevCount}. Pass --force-raise to grow debt.`
    );
    err.code = 'I18N_RATCHET_FORCE_RAISE_REQUIRED';
    err.currentCount = hits.length;
    err.previousCount = prevCount;
    throw err;
  }
  fs.writeFileSync(baselinePath, serializeBaseline(hits));
  return { previousCount: prevCount, currentCount: hits.length };
}

module.exports = {
  ROOT,
  BASELINE_PATH,
  BASELINE_VERSION,
  EXCLUDED_FILES,
  EXCLUDED_PREFIXES,
  parseI18nIgnore,
  scanRepo,
  loadBaseline,
  validateBaselineFormat,
  compareRatchet,
  serializeBaseline,
  writeBaseline,
  looksLikeUserCopy,
  findUnregisteredDomains,
};

function findUnregisteredDomains(fragmentDir, registeredDomains, locales = ['sv-SE', 'en-GB']) {
  if (!fs.existsSync(fragmentDir)) {
    return { missingFiles: [], unregistered: [], missingPartner: [] };
  }
  const registered = new Set(registeredDomains);
  const files = fs.readdirSync(fragmentDir).filter((f) => f.endsWith('.json'));
  const unregistered = [];
  const missingPartner = [];
  const byDomain = {};
  for (const file of files) {
    const m = file.match(/^(.*)-(sv-SE|en-GB)\.json$/);
    if (!m) continue;
    const domain = m[1];
    const locale = m[2];
    byDomain[domain] = byDomain[domain] || {};
    byDomain[domain][locale] = true;
    if (!registered.has(domain)) unregistered.push({ domain, file });
  }
  for (const domain of registeredDomains) {
    for (const locale of locales) {
      if (!byDomain[domain] || !byDomain[domain][locale]) {
        missingPartner.push({ domain, locale, file: `${domain}-${locale}.json` });
      }
    }
  }
  return { unregistered, missingPartner, domainsOnDisk: Object.keys(byDomain).sort() };
}
