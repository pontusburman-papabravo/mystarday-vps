#!/usr/bin/env node
/**
 * audit-child-pack-parity.mjs
 *
 * Compares config/experience-packs/child_se vs child_en:
 * - file structure parity
 * - recursive JSON key/schema shape
 * - Swedish-looking strings remaining in child_en
 * - empty required string values
 * - normal Child Core navigation reachability (from runtime source files)
 *
 * Usage: node scripts/audit-child-pack-parity.mjs [--json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PACKS_ROOT = path.join(ROOT, 'config/experience-packs');
const SE_DIR = path.join(PACKS_ROOT, 'child_se');
const EN_DIR = path.join(PACKS_ROOT, 'child_en');

const JSON_OUT = process.argv.includes('--json');

/** Common Swedish function words / UI fragments (lowercase match). */
const SWEDISH_WORDS = new Set([
  'och', 'att', 'det', 'din', 'ditt', 'dina', 'de', 'den', 'dem', 'dig', 'du',
  'här', 'där', 'väntar', 'vänta', 'inte', 'för', 'från', 'till', 'med', 'utan',
  'som', 'när', 'var', 'vad', 'hur', 'varför', 'eller', 'men', 'än', 'nu',
  'sedan', 'efter', 'innan', 'över', 'under', 'mellan', 'mot', 'vid', 'på',
  'av', 'om', 'en', 'ett', 'era', 'ert', 'er', 'vi', 'ni', 'jag', 'han', 'hon',
  'hen', 'henne', 'honom', 'sig', 'sin', 'sitt', 'sina', 'mina', 'min', 'mitt',
  'ditt', 'dina', 'vår', 'vårt', 'våra', 'deras', 'hennes', 'hans',
  'hej', 'tack', 'bra', 'fint', 'fin', 'gör', 'göra', 'gjorde', 'kommer', 'kom',
  'går', 'gå', 'ser', 'se', 'såg', 'vet', 'veta', 'känns', 'känner', 'känna',
  'lite', 'mycket', 'mer', 'mest', 'hela', 'alla', 'något', 'någon', 'några',
  'ingen', 'inget', 'inga', 'allt', 'alltid', 'aldrig', 'kanske', 'just', 'bara',
  'också', 'redan', 'fortfarande', 'igen', 'tillsammans', 'hemma', 'hem',
  'morgon', 'kväll', 'dag', 'idag', 'imorgon', 'igår', 'barn', 'barnet',
  'förälder', 'familj', 'stjärna', 'stjärnor', 'belöning', 'belöningar',
  'rutin', 'rutiner', 'aktivitet', 'aktiviteter', 'schema', 'schemat',
  'skattkammaren', 'samling', 'personer', 'värld', 'världen', 'trädgården',
  'morgonhuset', 'minnesrummet', 'dörren', 'dörren', 'hallen', 'sovrummet',
  'köket', 'badrummet', 'vinden', 'stigen', 'himlen', 'fönstret', 'väggen',
  'tillbaka', 'in', 'ut', 'genom', 'runt', 'titta', 'börja', 'börjar',
  'fortsätt', 'klart', 'redo', 'än', 'ännu', 'ännu', 'stolt', 'stolt över',
  'tryggt', 'varmt', 'mjuk', 'mjuka', 'ljus', 'ljuset', 'gräset', 'brisen',
  'ute', 'utanför', 'innanför', 'därute', 'därinne', 'någon', 'någons',
  'bettyder', 'betyder', 'menar', 'säger', 'svarar', 'lyssna', 'hör',
  'välkommen', 'välkomna', 'välkomstmatta', 'morgonljus',
]);

/** Keys treated as human-facing copy that must not be empty when present in schema. */
const REQUIRED_STRING_KEY_PATTERNS = [
  /^label_sv$/,
  /^display_name_sv$/,
  /^exit_label_sv$/,
  /^ambient_message_sv$/,
  /^gate_message_sv$/,
  /^first_unlock_message$/,
  /^name_sv$/,
  /^emotional_beat$/,
  /^headline(_template)?$/,
  /^body(_template)?$/,
  /^cta$/,
  /^world_hint$/,
  /^child_message$/,
  /^title(_template)?$/,
  /^message(_template)?$/,
  /^description(_sv)?$/,
];

/** Keys whose string values in child_en should be checked for Swedish leakage. */
const LOCALIZABLE_STRING_KEY_PATTERNS = [
  /_sv$/,
  /_template$/,
  /^headline$/,
  /^body$/,
  /^cta$/,
  /^world_hint$/,
  /^child_message$/,
  /^message$/,
  /^first_unlock_message$/,
  /^emotional_beat$/,
  /^ambient_message$/,
  /^gate_message/,
  /^exit_label/,
  /^display_name/,
  /^name_/,
  /^label/,
  /^title/,
  /^description/,
];

const MIN_STRING_LEN_FOR_WORD_CHECK = 3;
const SWEDISH_CHAR_RE = /[åäöÅÄÖ]/;

/** Words that exist in both languages or cause false positives in English copy. */
const AMBIGUOUS_SWEDISH_WORDS = new Set([
  'under', 'den', 'som', 'att', 'det', 'och', 'var', 'nu', 'mer', 'all', 'bra',
  'fint', 'fin', 'se', 'ser', 'går', 'gå', 'kom', 'kommer', 'lite', 'mer',
  'hela', 'alla', 'något', 'ingen', 'allt', 'bara', 'igen', 'hem', 'dag',
  'mot', 'dig', 'du', 'vi', 'ni', 'er', 'en', 'ett', 'de', 'dem', 'sin',
  'sitt', 'sina', 'min', 'mitt', 'mina', 'din', 'ditt', 'dina', 'vår', 'vårt',
]);

/** Strong signal the string is already English — skip Swedish leakage check. */
const ENGLISH_COPY_RE = /^(the|your|a|an|go|in|out|down|back|welcome|splash|squeak|swoosh|today|first|gentle|empty|morning|outside)\b/i;

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function typeName(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

/**
 * Recursively collect key-path shape mismatches between two JSON values.
 */
function diffSchema(seVal, enVal, keyPath = '$', diffs = []) {
  const seType = typeName(seVal);
  const enType = typeName(enVal);

  if (seType !== enType) {
    diffs.push({ path: keyPath, issue: 'type_mismatch', se: seType, en: enType });
    return diffs;
  }

  if (seType === 'array') {
    if (seVal.length !== enVal.length) {
      diffs.push({ path: keyPath, issue: 'array_length', se: seVal.length, en: enVal.length });
    }
    const max = Math.max(seVal.length, enVal.length);
    for (let i = 0; i < max; i += 1) {
      if (i >= seVal.length) {
        diffs.push({ path: `${keyPath}[${i}]`, issue: 'missing_in_se' });
      } else if (i >= enVal.length) {
        diffs.push({ path: `${keyPath}[${i}]`, issue: 'missing_in_en' });
      } else {
        diffSchema(seVal[i], enVal[i], `${keyPath}[${i}]`, diffs);
      }
    }
    return diffs;
  }

  if (seType === 'object') {
    const seKeys = Object.keys(seVal).sort();
    const enKeys = Object.keys(enVal).sort();
    const seSet = new Set(seKeys);
    const enSet = new Set(enKeys);

    for (const k of seKeys) {
      if (!enSet.has(k)) {
        diffs.push({ path: keyPath, issue: 'missing_key_in_en', key: k });
      }
    }
    for (const k of enKeys) {
      if (!seSet.has(k)) {
        diffs.push({ path: keyPath, issue: 'extra_key_in_en', key: k });
      }
    }
    for (const k of seKeys) {
      if (enSet.has(k)) {
        diffSchema(seVal[k], enVal[k], keyPath === '$' ? k : `${keyPath}.${k}`, diffs);
      }
    }
    return diffs;
  }

  return diffs;
}

function shouldCheckKeyForSwedish(key) {
  return LOCALIZABLE_STRING_KEY_PATTERNS.some((re) => re.test(key));
}

function tokenizeWords(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-zåäö0-9\s'-]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= MIN_STRING_LEN_FOR_WORD_CHECK);
}

function looksSwedish(value, key = '') {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (ENGLISH_COPY_RE.test(trimmed) && !SWEDISH_CHAR_RE.test(trimmed)) return null;

  const reasons = [];

  if (SWEDISH_CHAR_RE.test(trimmed)) {
    reasons.push('contains å/ä/ö');
  }

  const words = tokenizeWords(trimmed);
  const swHits = words.filter((w) => SWEDISH_WORDS.has(w) && !AMBIGUOUS_SWEDISH_WORDS.has(w));
  if (swHits.length >= 2 || (swHits.length >= 1 && SWEDISH_CHAR_RE.test(trimmed))) {
    reasons.push(`swedish_words: ${[...new Set(swHits)].join(', ')}`);
  }

  if (!reasons.length && words.length >= 3) {
    const ratio = swHits.length / words.length;
    if (ratio >= 0.4) {
      reasons.push(`high_swedish_word_ratio: ${(ratio * 100).toFixed(0)}%`);
    }
  }

  if (!reasons.length) return null;

  return {
    key,
    value: trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed,
    reasons,
    score: reasons.length + swHits.length + (SWEDISH_CHAR_RE.test(trimmed) ? 3 : 0),
  };
}

function collectStrings(obj, visitor, keyPath = '$', parentKey = '') {
  if (typeof obj === 'string') {
    visitor(obj, keyPath, parentKey);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => collectStrings(item, visitor, `${keyPath}[${i}]`, parentKey));
    return;
  }
  if (isObject(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const nextPath = keyPath === '$' ? k : `${keyPath}.${k}`;
      if (typeof v === 'string') {
        visitor(v, nextPath, k);
      } else {
        collectStrings(v, visitor, nextPath, k);
      }
    }
  }
}

function isRequiredStringKey(key) {
  return REQUIRED_STRING_KEY_PATTERNS.some((re) => re.test(key));
}

function findEmptyRequiredStrings(obj, fileLabel, results = []) {
  collectStrings(obj, (value, keyPath, key) => {
    if (!isRequiredStringKey(key)) return;
    if (typeof value === 'string' && value.trim() === '') {
      results.push({ file: fileLabel, path: keyPath, key });
    }
  });
  return results;
}

function findSwedishInEn(obj, fileLabel, results = []) {
  collectStrings(obj, (value, keyPath, key) => {
    if (!shouldCheckKeyForSwedish(key)) return;
    const hit = looksSwedish(value, key);
    if (hit) {
      results.push({ file: fileLabel, path: keyPath, ...hit });
    }
  });
  return results;
}

function readSource(relPath) {
  const full = path.join(ROOT, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function extractLegacyNavWorlds(childWorldsSrc) {
  const blockMatch = childWorldsSrc.match(/const LEGACY_WORLDS\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!blockMatch) return [];
  try {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${blockMatch[1]});`)();
  } catch {
    return [];
  }
}

function extractConstString(src, constName) {
  const re = new RegExp(`const\\s+${constName}\\s*=\\s*['"]([^'"]+)['"]`);
  const m = src.match(re);
  return m ? m[1] : null;
}

function extractExportedSlug(src, exportName) {
  const re = new RegExp(`${exportName}:\\s*['"]([^'"]+)['"]`);
  const m = src.match(re);
  return m ? m[1] : null;
}

function extractWireInScenes(catalogSrc) {
  const scenes = [];
  const re = /"scene_id":\s*"([^"]+)"[\s\S]*?"wire_in":\s*(true|false)/g;
  let m;
  while ((m = re.exec(catalogSrc)) !== null) {
    scenes.push({ scene_id: m[1], wire_in: m[2] === 'true' });
  }
  return scenes;
}

function buildReachabilityReport() {
  const childWorldsSrc = readSource('public/js/child-worlds.js');
  const morgonhusSrc = readSource('src/lib/morgonhus-playable.js');
  const gardenSrc = readSource('src/lib/garden-playable.js');
  const memoryHallSrc = readSource('src/lib/memory-hall-playable.js');
  const catalogSrc = readSource('public/js/living-world-scenes-catalog.js');

  const legacyNav = extractLegacyNavWorlds(childWorldsSrc);
  const navTabs = legacyNav.map((w) => ({
    id: w.id,
    href: w.href,
    tabKey: w.tabKey,
    paths: w.paths,
    labels: w.labels,
  }));

  const playableWorlds = [
    {
      source: 'src/lib/morgonhus-playable.js',
      feature_slug: extractConstString(morgonhusSrc, 'FEATURE_SLUG'),
      world_slug: extractConstString(morgonhusSrc, 'WORLD_SLUG'),
      display_fallback: (morgonhusSrc.match(/display_name[^|]*\|\|\s*'([^']+)'/) || [])[1] || null,
    },
    {
      source: 'src/lib/garden-playable.js',
      feature_slug: extractConstString(gardenSrc, 'FEATURE_SLUG'),
      world_slug: extractExportedSlug(gardenSrc, 'WORLD_SLUG') || 'garden',
      display_fallback: (gardenSrc.match(/display_name[^|]*\|\|\s*'([^']+)'/) || [])[1] || null,
    },
    {
      source: 'src/lib/memory-hall-playable.js',
      feature_slug: extractConstString(memoryHallSrc, 'FEATURE_SLUG'),
      world_slug: extractExportedSlug(memoryHallSrc, 'WORLD_SLUG') || 'memory_hall',
      display_fallback: (memoryHallSrc.match(/display_name[^|]*\|\|\s*'([^']+)'/) || [])[1] || null,
    },
  ];

  const bodySceneClasses = [...childWorldsSrc.matchAll(/'(child-(?:morgonhus|garden|memory-hall)-active)'/g)]
    .map((m) => m[1]);

  const wireInScenes = extractWireInScenes(catalogSrc);
  const reachableScenes = wireInScenes.filter((s) => s.wire_in).map((s) => s.scene_id);

  // Cross-reference pack scenes.json exit targets for playable worlds
  const scenesPack = readJson(path.join(SE_DIR, 'scenes.json'));
  const playableSlugs = new Set(playableWorlds.map((w) => w.world_slug).filter(Boolean));
  const packScenesForPlayableWorlds = (scenesPack.scenes || []).filter((scene) => {
    if (playableSlugs.has(scene.scene_id)) return true;
    if (playableSlugs.has(scene.exit_target)) return true;
    return (scene.hotspots || []).some((h) => playableSlugs.has(h.target_scene));
  }).map((s) => ({
    scene_id: s.scene_id,
    display_name_sv: s.display_name_sv,
    exit_target: s.exit_target,
  }));

  return {
    note: 'Normal Child Core nav = LEGACY_WORLDS (barnets_samling OFF). Playable worlds are feature-gated but wired into /child/world hub.',
    nav_tabs: navTabs,
    body_scene_classes: [...new Set(bodySceneClasses)],
    playable_worlds: playableWorlds,
    wire_in_scenes_from_catalog: reachableScenes,
    pack_scenes_linked_to_playable_worlds: packScenesForPlayableWorlds,
  };
}

function compareFileStructure() {
  const seFiles = listJsonFiles(SE_DIR);
  const enFiles = listJsonFiles(EN_DIR);
  const seSet = new Set(seFiles);
  const enSet = new Set(enFiles);
  return {
    se_files: seFiles,
    en_files: enFiles,
    only_in_se: seFiles.filter((f) => !enSet.has(f)),
    only_in_en: enFiles.filter((f) => !seSet.has(f)),
    shared: seFiles.filter((f) => enSet.has(f)),
    structure_match: seFiles.length === enFiles.length
      && seFiles.every((f, i) => f === enFiles[i])
      && seFiles.every((f) => enSet.has(f)),
  };
}

function auditJsonFile(filename) {
  const sePath = path.join(SE_DIR, filename);
  const enPath = path.join(EN_DIR, filename);
  const se = readJson(sePath);
  const en = readJson(enPath);
  const schemaDiffs = diffSchema(se, en);
  const swedishHits = findSwedishInEn(en, filename);
  const emptyRequired = findEmptyRequiredStrings(en, filename);
  swedishHits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return {
    file: filename,
    schema_diff_count: schemaDiffs.length,
    schema_diffs: schemaDiffs,
    swedish_string_count: swedishHits.length,
    swedish_hits: swedishHits,
    empty_required_count: emptyRequired.length,
    empty_required: emptyRequired,
    parity_ok: schemaDiffs.length === 0 && swedishHits.length === 0 && emptyRequired.length === 0,
  };
}

function printReport(report) {
  const lines = [];
  const hr = '═'.repeat(72);

  lines.push(hr);
  lines.push('CHILD PACK PARITY AUDIT — child_se vs child_en');
  lines.push(hr);

  lines.push('\n## 1. File structure');
  lines.push(`Match: ${report.structure.structure_match ? 'YES' : 'NO'}`);
  lines.push(`child_se (${report.structure.se_files.length}): ${report.structure.se_files.join(', ')}`);
  lines.push(`child_en (${report.structure.en_files.length}): ${report.structure.en_files.join(', ')}`);
  if (report.structure.only_in_se.length) {
    lines.push(`Only in child_se: ${report.structure.only_in_se.join(', ')}`);
  }
  if (report.structure.only_in_en.length) {
    lines.push(`Only in child_en: ${report.structure.only_in_en.join(', ')}`);
  }

  lines.push('\n## 2. Per-file parity summary');
  for (const f of report.files) {
    lines.push(`\n### ${f.file}`);
    lines.push(`  schema diffs: ${f.schema_diff_count}`);
    lines.push(`  swedish strings in child_en: ${f.swedish_string_count}`);
    lines.push(`  empty required strings in child_en: ${f.empty_required_count}`);
    lines.push(`  parity OK: ${f.parity_ok ? 'yes' : 'NO'}`);

    if (f.schema_diff_count > 0) {
      const preview = f.schema_diffs.slice(0, 8);
      for (const d of preview) {
        if (d.issue === 'type_mismatch') {
          lines.push(`    - ${d.path}: type ${d.se} vs ${d.en}`);
        } else if (d.issue === 'array_length') {
          lines.push(`    - ${d.path}: array length ${d.se} vs ${d.en}`);
        } else if (d.issue === 'missing_key_in_en') {
          lines.push(`    - ${d.path}: missing key in en "${d.key}"`);
        } else if (d.issue === 'extra_key_in_en') {
          lines.push(`    - ${d.path}: extra key in en "${d.key}"`);
        } else if (d.issue === 'missing_in_en') {
          lines.push(`    - ${d.path}: missing array item in en`);
        } else if (d.issue === 'missing_in_se') {
          lines.push(`    - ${d.path}: missing array item in se`);
        }
      }
      if (f.schema_diffs.length > preview.length) {
        lines.push(`    … +${f.schema_diffs.length - preview.length} more schema diffs`);
      }
    }

    if (f.empty_required_count > 0) {
      for (const e of f.empty_required.slice(0, 5)) {
        lines.push(`    - empty required: ${e.path} (${e.key})`);
      }
    }
  }

  lines.push('\n## 3. Swedish strings in child_en (counts per file)');
  const totalSw = report.files.reduce((n, f) => n + f.swedish_string_count, 0);
  for (const f of report.files) {
    lines.push(`  ${f.file}: ${f.swedish_string_count}`);
  }
  lines.push(`  TOTAL: ${totalSw}`);

  lines.push('\n## 4. Worst Swedish offenders (sample, top 25)');
  const worst = report.files
    .flatMap((f) => f.swedish_hits.map((h) => ({ file: f.file, ...h })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
  if (!worst.length) {
    lines.push('  (none detected)');
  } else {
    for (const h of worst) {
      lines.push(`  [${h.file}] ${h.path}`);
      lines.push(`    "${h.value}"`);
      lines.push(`    → ${h.reasons.join('; ')}`);
    }
  }

  lines.push('\n## 5. Normal Child Core navigation reachability');
  lines.push(`Note: ${report.reachability.note}`);
  lines.push('\nNav tabs (LEGACY_WORLDS / barnets_samling OFF):');
  for (const tab of report.reachability.nav_tabs) {
    lines.push(`  - ${tab.id}: ${tab.href} (tabKey=${tab.tabKey})`);
  }
  lines.push('\nPlayable world slugs (feature-gated):');
  for (const w of report.reachability.playable_worlds) {
    lines.push(`  - ${w.world_slug} [${w.feature_slug}] via ${w.source}`);
  }
  lines.push('\nBody scene classes (child-worlds.js):');
  lines.push(`  ${report.reachability.body_scene_classes.join(', ')}`);
  lines.push('\nWire-in catalog scenes (living-world-scenes-catalog.js):');
  lines.push(`  ${report.reachability.wire_in_scenes_from_catalog.join(', ')}`);
  lines.push('\nPack scenes linked to playable worlds (scenes.json cross-ref):');
  for (const s of report.reachability.pack_scenes_linked_to_playable_worlds) {
    lines.push(`  - ${s.scene_id} (exit_target=${s.exit_target}) — ${s.display_name_sv}`);
  }

  lines.push('\n## 6. Totals');
  lines.push(`  Files compared: ${report.files.length}`);
  lines.push(`  Files with schema diffs: ${report.files.filter((f) => f.schema_diff_count > 0).length}`);
  lines.push(`  Files with Swedish leakage: ${report.files.filter((f) => f.swedish_string_count > 0).length}`);
  lines.push(`  Files with empty required strings: ${report.files.filter((f) => f.empty_required_count > 0).length}`);
  lines.push(`  Total Swedish strings in child_en: ${totalSw}`);
  lines.push(hr);

  return lines.join('\n');
}

function main() {
  const structure = compareFileStructure();
  const files = structure.shared.map(auditJsonFile);
  const reachability = buildReachabilityReport();

  const report = {
    generated_at: new Date().toISOString(),
    structure,
    files,
    reachability,
    totals: {
      files_compared: files.length,
      schema_diff_files: files.filter((f) => f.schema_diff_count > 0).length,
      swedish_leak_files: files.filter((f) => f.swedish_string_count > 0).length,
      empty_required_files: files.filter((f) => f.empty_required_count > 0).length,
      swedish_strings_total: files.reduce((n, f) => n + f.swedish_string_count, 0),
    },
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(printReport(report));
  }
}

main();
