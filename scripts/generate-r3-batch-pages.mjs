#!/usr/bin/env node
/**
 * Generate config/resurser-r3-pages-batch2.js — 80 long-tail pages (≥300 words each).
 * Run: node scripts/generate-r3-batch-pages.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function countSwedishWords(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0).length;
}

function r3PagePlainText(page) {
  const parts = [page.lead || ''];
  for (const section of page.sections || []) {
    if (section.h2) parts.push(section.h2);
    for (const p of section.paragraphs || []) parts.push(p);
    for (const b of section.bullets || []) parts.push(b);
  }
  return parts.join(' ').replace(/<[^>]+>/g, ' ');
}

const DOWNLOADS = ['morgonschema', 'kvallsschema', 'kanslor', 'overgangar', 'teacch-inspirerat', 'skola', 'hygien', 'beloningsschema', 'veckoschema'];

const TOPICS = [
  ['bildschema-lakarbesok-barn', 'bildschema läkarbesök barn', 'läkarbesök', 'hygien', ['/rutiner-npf-barn', '/resurser/overgangar', '/bildschema-app']],
  ['bildschema-tandlakare-barn', 'bildschema tandläkare barn', 'tandläkare', 'hygien', ['/resurser/hygien', '/rutiner-npf-barn', '/bildschema-app']],
  ['bildschema-frisor-barn', 'bildschema frisör barn', 'frisörbesök', 'hygien', ['/resurser/overgangar', '/bildschema-app', '/resurser']],
  ['bildschema-simskola-barn', 'bildschema simskola barn', 'simskola', 'skola', ['/resurser/skola', '/beloningssystem-barn', '/bildschema-app']],
  ['bildschema-fotboll-barn', 'bildschema fotbollsträning barn', 'fotbollsträning', 'veckoschema', ['/veckoschema-bildstod', '/resurser/skola', '/bildschema-app']],
  ['bildschema-dagis-avhamtning', 'bildschema dagis avhämtning', 'avhämtning på dagis', 'overgangar', ['/resurser/overgangar', '/morgonrutin-barn', '/bildschema-app']],
  ['bildschema-skolstart-hosten', 'bildschema skolstart hösten', 'skolstart', 'skola', ['/resurser/skola', '/morgonrutin-barn', '/bildschema-app']],
  ['bildschema-laxor-barn', 'bildschema läxor barn', 'läxläggning', 'skola', ['/resurser/skola', '/beloningssystem-barn', '/bildschema-app']],
  ['bildschema-skalning-barn', 'bildschema skalning barn', 'tandborstning och skölj', 'hygien', ['/resurser/hygien', '/morgonrutin-barn', '/bildschema-app']],
  ['bildschema-dusch-kvall', 'bildschema dusch kväll barn', 'kvällsdusch', 'kvallsschema', ['/resurser/kvall', '/resurser/hygien', '/bildschema-app']],
];

// Expand to 80 unique topics programmatically
const CONTEXTS = [
  'morgon', 'kväll', 'helg', 'lov', 'resa', 'flyg', 'tåg', 'bil', 'butik', 'köpcentrum',
  'restaurang', 'kalas', 'soverover', 'kusin', 'mormor', 'farfar', 'syskon', 'lekdejt',
  'parken', 'skogen', 'badhus', 'bibliotek', 'kyrkan', 'idrott', 'musik', 'piano',
  'dans', 'ridning', 'gymnastik', 'handboll', 'innebandy', 'skridskor', 'skidor', 'camping',
  'hotell', 'stuga', 'sommarlov', 'sportlov', 'jullov', 'påsklov', 'höstlov', 'förskoleklass',
  'fritids', 'musikskola', 'läxhjälp', 'grupparbete', 'prov', 'utvecklingssamtal', 'öppet hus',
  'skolavslutning', 'skolfoto', 'klassresa', 'utflykt', 'skogsmulle', 'naturvetenskap',
  'matlagning', 'bakning', 'handla mat', 'städa rum', 'tvätt', 'disk', 'sortera leksaker',
  'packa väska', 'packa ryggsäck', 'byta om', 'idrottskläder', 'regnkläder', 'vinterkläder',
  'sommarkläder', 'skor på', 'jacka av', 'handtvätt', 'toalett', 'nattning', 'saga',
  'musik innan sömn', 'nattlampa', 'mardröm', 'vakna', 'frukost själv', 'smörgås',
  'gröt', 'juice', 'vänta på buss', 'cykla', 'sparka boll', 'gung', 'rutschkana',
];

const AUDIENCES = ['adhd', 'autism', 'npf', 'språkstörning', 'ångest', 'selectiv ätning', 'sömnproblem'];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildEntries() {
  const entries = [];
  const usedSlugs = new Set();

  function add(entry) {
    if (usedSlugs.has(entry.slug)) return;
    usedSlugs.add(entry.slug);
    entries.push(entry);
  }

  for (const [slug, intent, topic, download, related] of TOPICS) {
    add(makePage(slug, intent, topic, download, related));
  }

  for (const ctx of CONTEXTS) {
    if (entries.length >= 80) break;
    const slug = slugify(`bildschema-${ctx}-barn`);
    const intent = `bildschema ${ctx} barn`;
    const download = DOWNLOADS[entries.length % DOWNLOADS.length];
  const related = ['/bildschema-app', '/morgonrutin-barn', '/resurser'];
    add(makePage(slug, intent, ctx, download, related));
  }

  let i = 0;
  while (entries.length < 80) {
    const aud = AUDIENCES[i % AUDIENCES.length];
    const ctx = CONTEXTS[(i * 3) % CONTEXTS.length];
    const slug = slugify(`bildstod-${aud}-${ctx}`);
    const intent = `bildstöd ${aud} ${ctx}`;
    const download = DOWNLOADS[(i + 2) % DOWNLOADS.length];
    add(makePage(slug, intent, `${aud} och ${ctx}`, download, ['/rutiner-npf-barn', '/bildschema-app', '/resurser']));
    i += 1;
  }

  return entries.slice(0, 80);
}

function makePage(slug, intent, topic, downloadSlug, relatedSlugs) {
  const title = intent.charAt(0).toUpperCase() + intent.slice(1) + ' — gratis mall';
  const h1 = intent.charAt(0).toUpperCase() + intent.slice(1);
  const description = `Praktiskt bildstöd för ${topic}: tydliga steg, färre konflikter och lugnare övergångar. Gratis PDF och tips för hem och skola.`;

  const lead = `Ett <strong>bildschema</strong> för <strong>${topic}</strong> gör osynliga steg synliga. Barn som behöver förutsägbarhet får se vad som händer nu, härnäst och sist — utan att föräldern behöver upprepa samma instruktioner hela tiden.`;

  const sections = [
    {
      h2: `Varför bildstöd hjälper vid ${topic}`,
      paragraphs: [
        `Många barn blir stressade när ${topic} känns som en enda stor uppgift. När rutinen delas upp i små, konkreta steg minskar motståndet. Barnet kan peka på schemat istället för att fråga om och om igen — vilket avlastar både barn och vuxen.`,
        `Forskning och erfarenhet från NPF-vardag visar att visuellt stöd fungerar bäst när det är enkelt, konsekvent och placerat där barnet faktiskt ser det. Ett papper på kylskåpet eller en app med samma steg ger samma trygghet: ordningen ändras inte i smyg.`,
        `För ${topic} är det särskilt viktigt att markera start, mitt och slut. Ett tydligt sista steg — till exempel "klar" eller "färdig" — hjälper barnet att veta när det är dags att gå vidare till nästa aktivitet.`,
      ],
      bullets: [
        'Dela upp i tre till fem steg — inte fler',
        'Samma ordning varje gång tills rutinen sitter',
        'Markera tydligt när momentet är klart',
      ],
    },
    {
      h2: 'Så bygger du schemat steg för steg',
      paragraphs: [
        `Börja med att skriva ner allt som brukar hända kring ${topic}, även små delmoment vuxna tar för givna. Välj sedan de viktigaste stegen och sätt dem i kronologisk ordning. Varje steg ska vara en handling barnet kan känna igen: "ta på skor", inte bara "gör dig redo".`,
        `Använd bilder, symboler eller enkla ord — det viktiga är att barnet förstår utan att du behöver förklara med rösten varje gång. Om ett steg ofta misslyckas, dela upp det ytterligare. "Borsta tänder" kan bli "krama tandkräm", "borsta uppifrån", "spotta", "skölj".`,
        `Testa schemat minst två veckor innan du ändrar ordning. Barn med behov av struktur hinner vänja sig vid sekvensen; för tidiga ändringar skapar ny osäkerhet. När rutinen sitter kan du lägga till belöning eller kort paus mellan steg om det motiverar.`,
      ],
    },
    {
      h2: 'Tips när det strular',
      paragraphs: [
        `Om barnet vägrar ett steg — pausa och fråga inte "varför" under stress. Peka på schemat och säg vilket steg ni är på. Ibland räcker det att visa nästa bild för att barnet ska hitta tillbaka till kedjan.`,
        `Undvik att lägga skuld på barnet när ${topic} tar tid. Bildstöd handlar om att göra förväntningar synliga, inte om att pressa snabbare. Firande ska kopplas till att steg är avklarade, inte till att vara "duktig" generellt.`,
        `Behöver du ändra planen akut — till exempel vid sjukdom eller sen ankomst — uppdatera schemat eller säg högt vilka steg ni hoppar över. Överraskningar utan förklaring är det som oftast triggar utbrott.`,
      ],
      bullets: [
        'Peka på schema istället för att upprepa verbalt',
        'Dela upp svåra steg i mindre delar',
        'Förklara när planen måste ändras',
      ],
    },
    {
      h2: 'Från utskrift till levande schema',
      paragraphs: [
        `Gratis PDF-mallar är ett bra sätt att komma igång med ${topic}. Skriv ut, laminera och häng på barnets ögonhöjd. Nackdelen är att du måste skriva ut på nytt när rutinen ändras — därför väljer många familjer en app där samma steg finns i mobilen och barnet kan bocka av själv.`,
        `Min Stjärndag är byggt för vardagsrutiner hemma: morgon, kväll, skola och belöningar i samma loop. Du kan börja med papper och flytta över när ni vet vilka steg som fungerar. Principen är densamma — förutsägbarhet och ett steg i taget.`,
        `Oavsett format: håll schemat kort, uppdatera det ärligt när verkligheten ändras, och låt barnet vara delaktigt i att markera klart. Då blir ${topic} mindre en kamp och mer en delad rutin.`,
      ],
    },
  ];

  return {
    slug,
    intent,
    title,
    description,
    h1,
    lead,
    sections,
    relatedSlugs,
    downloadSlug,
  };
}

const entries = buildEntries();
assertWordCounts(entries);

const outPath = path.join(ROOT, 'config/resurser-r3-pages-batch2.js');
const body = `'use strict';

/** Auto-generated batch 2 — ${entries.length} long-tail pages. Regenerate: node scripts/generate-r3-batch-pages.mjs */
const R3_PAGES_BATCH2 = ${JSON.stringify(entries, null, 2)};

module.exports = { R3_PAGES_BATCH2 };
`;

fs.writeFileSync(outPath, body, 'utf8');
console.log(`Wrote ${entries.length} pages to ${outPath}`);

function assertWordCounts(pages) {
  for (const page of pages) {
    const words = countSwedishWords(r3PagePlainText(page));
    if (words < 300) {
      console.error(`${page.slug}: only ${words} words`);
      process.exit(1);
    }
  }
}
