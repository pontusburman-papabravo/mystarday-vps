#!/usr/bin/env node
/**
 * Generates docs/polsia-release-os/ from polsia-sprint-koordinering.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs/polsia-sprint-koordinering.md');
const OUT = path.join(ROOT, 'docs/polsia-release-os');

const KORLISTA = [
  { pos: 1, sprint: '1.1', title: 'Backend auth', id: '2141408', p0: 'P0.2', h: 2, layer: 1, header: 'SPRINT 1.1' },
  { pos: 2, sprint: '1.2', title: 'platform.js', id: '2141409', p0: 'P0.2', h: 3, layer: 1, header: 'SPRINT 1.2' },
  { pos: 3, sprint: '1.3', title: 'login + register UI', id: '2141410', p0: 'P0.2', h: 3, layer: 1, header: 'SPRINT 1.3' },
  { pos: 4, sprint: '1.4', title: 'CSS scaffold + SW', id: '2141411', p0: 'P0.3', h: 1, layer: 1, header: 'SPRINT 1.4' },
  { pos: 5, sprint: '14', title: 'Mandatory runtime layer', id: '2143272', p0: 'P0.6', h: 2, layer: 1, header: 'SPRINT 14' },
  { pos: 6, sprint: '2a', title: 'platform-gating full', id: '2141905', p0: 'P0.3', h: 2, layer: 2, header: 'SPRINT 2a' },
  { pos: 7, sprint: '2b', title: 'pwa-install isNeeded', id: '2141914', p0: 'P0.3', h: 1, layer: 2, header: 'SPRINT 2b' },
  { pos: 8, sprint: '3a', title: 'device_mode + Session Gate', id: '2141844', p0: 'P0.1', h: 2, layer: 2, header: 'SPRINT 3a' },
  { pos: 9, sprint: '3b', title: 'PG-modal + PIN + biometri', id: '2141848', p0: 'P0.1', h: 2, layer: 2, header: 'SPRINT 3b' },
  { pos: 10, sprint: '3c', title: 'Server 403 + feature flag', id: '2141855', p0: 'P0.1', h: 2, layer: 2, header: 'SPRINT 3c' },
  { pos: 11, sprint: '4', title: 'Native tab bar vuxen', id: '2141717', p0: 'P0.4', h: 3, layer: 2, header: 'SPRINT 4 —' },
  { pos: 12, sprint: '5a', title: 'login rollval', id: '2141868', p0: 'P1', h: 1, layer: 2, header: 'SPRINT 5a' },
  { pos: 13, sprint: '5b', title: 'barnväljare + PIN-tavla', id: '2141884', p0: 'P1', h: 2, layer: 2, header: 'SPRINT 5b' },
  { pos: 14, sprint: '5c', title: 'add-child redirect', id: '2141897', p0: 'P1', h: 1, layer: 2, header: 'SPRINT 5c' },
  { pos: 15, sprint: '16', title: 'Capacitor Android smoke', id: '2142930', p0: '—', h: 4, layer: 3, header: 'SPRINT 16' },
  { pos: 16, sprint: '17', title: 'Google backend', id: '2143390', p0: 'P0.2', h: 2, layer: 3, header: 'SPRINT 17' },
  { pos: 17, sprint: '18', title: 'Google native client', id: '2143391', p0: 'P0.2', h: 2, layer: 3, header: 'SPRINT 18' },
  { pos: 18, sprint: '19', title: 'FCM server', id: '2143394', p0: 'Push', h: 2, layer: 3, header: 'SPRINT 19' },
  { pos: 19, sprint: '20', title: 'FCM client', id: '2143395', p0: 'Push', h: 2, layer: 3, header: 'SPRINT 20' },
  { pos: 20, sprint: '21', title: 'Android PG-härdning', id: '2143396', p0: 'P0.1', h: 2, layer: 3, header: 'SPRINT 21' },
  { pos: 21, sprint: '22a', title: 'Deep links server', id: '2143403', p0: 'P0.5', h: 2, layer: 3, header: 'SPRINT 22a' },
  { pos: 22, sprint: '22b', title: 'Deep links client', id: '2143404', p0: 'P0.5', h: 2, layer: 3, header: 'SPRINT 22b' },
  { pos: 23, sprint: '23A', title: 'Binary smoke gate', id: '2143273', p0: '—', h: 2, layer: 4, header: 'SPRINT 23A' },
  { pos: 24, sprint: '23B', title: 'Bugfix containment', id: '2143274', p0: '—', h: 2, layer: 4, header: 'SPRINT 23B' },
  { pos: 25, sprint: 'Gate 24', title: 'Parity gate + Manifest', id: '2143329', p0: '—', h: 1, layer: 4, header: 'GATE 24' },
];

const EXTRA = [
  { file: 'gates/gate-0-native-freeze.md', header: 'SPRINT 0 —', title: 'Gate 0 Native parity freeze', id: '2142916', note: 'Kör före sprint 16 (#15 i kön)' },
  { file: 'sprints/26-dashboard-polish.md', header: 'Dashboard polish', title: 'Dashboard polish', id: '2143405', note: 'Efter #25' },
  { file: 'gates/gate-25-family-delight.md', header: 'GATE 25', title: 'Family Delight', id: null, note: 'Ej deploy' },
];

const FORBIDDEN = `FÖRBJUDET i denna task:
❌ Capacitor.isNativePlatform() i view-filer
❌ Plattformscheck utanför platform.js
❌ Blanda barn-PIN och app-lås-PIN
❌ Scope utanför listan "Gör endast"
❌ Refactor av orelaterade filer`;

function extractPrompt(md, headerPrefix) {
  const lines = md.split('\n');
  const needle = headerPrefix.replace(/^##\s*/, '').split(' —')[0].trim();
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('## ')) continue;
    const h = lines[i].slice(3);
    if (h === needle || h.startsWith(needle + ' ') || h.startsWith(needle + '—')) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  let inBlock = false;
  const block = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ') && i > start + 1) break;
    if (lines[i].trim() === '```') {
      if (!inBlock) inBlock = true;
      else break;
      continue;
    }
    if (inBlock) block.push(lines[i]);
  }
  return block.length ? block.join('\n') : null;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '');
}

function buildSprintMd(item, prompt) {
  const s = slug(item.sprint);
  const fn = item.pos ? `sprints/${pad(item.pos)}-sprint-${s}.md` : item.file;

  const verifyBlock = getVerifyBlock(item);

  return `# Sprint ${item.sprint} — ${item.title}

| Fält | Värde |
|------|--------|
| **Kö-position** | ${item.pos ?? '—'} |
| **Polsia** | #${item.id} |
| **P0** | ${item.p0} |
| **Timmar (plan)** | ${item.h} |
| **Layer** | ${item.layer ?? '—'} |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

\`\`\`
${prompt || `Uppgift: Sprint ${item.sprint} — ${item.title}\nPolsia: #${item.id}\n\nSe docs/polsia-sprint-koordinering.md för full spec.`}

${FORBIDDEN}
\`\`\`

---

## Verifiering efter deploy (Polsia kör)

${verifyBlock}

---

## Signering i PR

- [ ] Scope = endast denna sprint
- [ ] npm test + npm run lint (se [02-verify-and-tests.md](../02-verify-and-tests.md))
- [ ] SW bump om klient/HTML ändrats
- [ ] Commit-hash noterad i Polsia-svar
`;
}

function getVerifyBlock(item) {
  const base = `\`\`\`bash
cd /workspace  # Polsia: repo root
npm run lint
node --test test/
\`\`\``;

  if (item.sprint === 'Gate 24' || item.header?.includes('GATE 24')) {
    return `1. Uppdatera [parity-manifest.md](../parity-manifest.md) — 6/6 ✅ iOS + Android
2. Inga nya features — endast parity-fixar om ❌`;
  }
  if (item.sprint === '23A') {
    return `Manuell matris 6×PASS/FAIL på fysisk Android (låg/mellanpris). Se prompt.`;
  }
  if (item.sprint === '23B') {
    return `Förutsättning: 23A GREEN. Re-kör 23A efter fix.`;
  }
  if (item.sprint === '0' || item.header?.includes('SPRINT 0')) {
    return `\`\`\`bash
npm run polsia:gate0
\`\`\``;
  }
  if (['1.1', '17', '19', '3c'].includes(item.sprint)) {
    return base + '\n\nFokus: backend-routes — `node --test test/auth.test.js` om auth rörts.';
  }
  return base;
}

function main() {
  const md = fs.readFileSync(SRC, 'utf8');
  fs.mkdirSync(path.join(OUT, 'sprints'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'gates'), { recursive: true });

  for (const item of KORLISTA) {
    const prompt = extractPrompt(md, item.header);
    const content = buildSprintMd(item, prompt);
    const outPath = path.join(OUT, `sprints/${pad(item.pos)}-sprint-${slug(item.sprint)}.md`);
    fs.writeFileSync(outPath, content);
  }

  for (const ex of EXTRA) {
    const prompt = extractPrompt(md, ex.header);
    const fake = { sprint: ex.title, title: ex.title, id: ex.id || '—', p0: '—', h: '—', pos: null, file: ex.file };
    let content = buildSprintMd(fake, prompt);
    if (ex.note) content = `> **${ex.note}**\n\n` + content;
    fs.writeFileSync(path.join(OUT, ex.file), content);
  }

  fs.copyFileSync(
    path.join(ROOT, 'docs/parity-manifest.md'),
    path.join(OUT, 'parity-manifest.md')
  );

  console.log('Generated', KORLISTA.length, 'sprints + extras →', OUT);
}

main();
