#!/usr/bin/env node
/**
 * Merge static + live full + extended QA into 300-point report.
 *   node scripts/qa-merge-300.mjs
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_ID = `QA-300-MERGE-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

function parseLocalRun() {
  execSync('node scripts/qa-local-run.mjs', { cwd: root, stdio: 'pipe' });
  const md = fs.readFileSync(path.join(root, 'docs/qa-run-local-2026-06-01.md'), 'utf8');
  const map = new Map();
  for (const line of md.split('\n')) {
    const m = line.match(/^\| (QA-\d+) \| [✅❌⏭⚠️]+ (\w+) \|(.*)\|$/);
    if (m) map.set(m[1], { status: m[2], note: m[3].trim() });
  }
  return map;
}

function loadJson(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function statusRank(s) {
  return { pass: 4, partial: 3, fail: 2, skip: 1 }[s] || 0;
}

function parseVpsRun() {
  const glob = fs.readdirSync(path.join(root, 'docs')).filter((f) => f.startsWith('qa-run-vps-') && f.endsWith('.md'));
  glob.sort().reverse();
  const map = new Map();
  if (glob.length === 0) return map;
  const md = fs.readFileSync(path.join(root, 'docs', glob[0]), 'utf8');
  for (const line of md.split('\n')) {
    const m = line.match(/^\| ([^|]+) \| [✅❌⏭⚠️]+ (\w+) \|(.*)\|$/);
    if (!m) continue;
    let rawId = m[1].trim();
    rawId = rawId.replace(/^b2-/, '');
    rawId = rawId.replace(/-html$/, '').replace(/-ui$/, '').replace(/-shared$/, '');
    rawId = rawId.replace(/-\d+$/, '');
    if (!/^QA-\d{3}$/.test(rawId)) continue;
    const existing = map.get(rawId);
    const entry = { status: m[2], note: m[3].trim() };
    if (!existing || statusRank(entry.status) > statusRank(existing.status)) {
      map.set(rawId, entry);
    }
  }
  return map;
}

function merge() {
  const local = parseLocalRun();
  const fullMap = parseVpsRun();
  const full = Object.fromEntries(fullMap);
  if (fs.existsSync(path.join(root, 'docs/qa-run-full-latest.json'))) {
    Object.assign(full, loadJson('docs/qa-run-full-latest.json'));
  }
  const ext = loadJson('docs/qa-run-extended-latest.json');

  const merged = new Map();
  const sources = { extended: 0, full: 0, local: 0, none: 0 };

  for (let n = 1; n <= 300; n++) {
    const id = `QA-${String(n).padStart(3, '0')}`;
    const candidates = [
      ext[id] && { ...ext[id], src: 'extended' },
      full[id] && { ...full[id], src: 'full' },
      local.get(id) && { ...local.get(id), src: 'local' },
    ].filter(Boolean);

    if (candidates.length === 0) {
      merged.set(id, { status: 'skip', note: 'Ej testad', src: 'none' });
      sources.none++;
      continue;
    }
    candidates.sort((a, b) => statusRank(b.status) - statusRank(a.status));
    const best = candidates[0];
    merged.set(id, best);
    sources[best.src]++;
  }

  const summary = { pass: 0, fail: 0, skip: 0, partial: 0 };
  for (const v of merged.values()) summary[v.status]++;

  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(root, `docs/qa-run-300-complete-${date}.md`);
  const lines = [
    `# QA 300 — komplett sammanfogad rapport`,
    '',
    `| Kör-ID | ${RUN_ID} |`,
    `| Datum | ${date} |`,
    '',
    'Prioritet: **extended live** > **full live** > **static local**',
    '',
    '## Sammanfattning',
    '',
    `| ✅ pass | ${summary.pass} |`,
    `| ⚠️ partial | ${summary.partial} |`,
    `| ❌ fail | ${summary.fail} |`,
    `| ⏭ skip | ${summary.skip} |`,
    `| **Totalt** | **300** |`,
    '',
    `Källor: extended=${sources.extended}, full=${sources.full}, local=${sources.local}, none=${sources.none}`,
    '',
    '| ID | Status | Källa | Anteckning |',
    '|----|--------|-------|------------|',
  ];

  for (const [id, v] of [...merged.entries()].sort()) {
    const icon = { pass: '✅', fail: '❌', skip: '⏭', partial: '⚠️' }[v.status];
    lines.push(`| ${id} | ${icon} ${v.status} | ${v.src} | ${(v.note || '').replace(/\|/g, '\\|')} |`);
  }
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log('Merged report:', outPath);
  console.log('Summary:', summary);
  return summary;
}

merge();
