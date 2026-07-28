# i18n PDF & Print Audit

Audit date: 2026-07-28. Scope: all PDF generation and browser-print paths in `/workspace`.

## Implementation status (PR: `fix(i18n): localize schedule PDF and print resources`)

| Area | Status |
|------|--------|
| `/print-schema` UI chrome | **Done** — `config/i18n/print-schema-{sv-SE,en-GB}.json`, `data-i18n` on `print-schema.html`, `initParentAppI18n(user.preferred_locale)` |
| Schedule PDF HTML (`print-schema-core.js`) | **Done** — `pt()` / `LocaleDateTime` for weekdays, ranges, titles, filenames; user activity names unchanged |
| PDF filenames | **Done** — `min-stjarndag-veckoschema-*` / `my-starday-weekly-schedule-*`, Stockholm date, safe slug |
| HTML escaping | **Done** — existing `esc()` / `escapeHtml` on user fields |
| STRICT audit tier | **Done** — print-schema files in `scripts/audit-hardcoded-swedish.js` |
| Unit tests | **Done** — `test/i18n-print-schema.test.js` |
| E2E | **Done** — `test/e2e/i18n-print-schema.test.js` (preview chrome + system copy; client-side PDF — no `application/pdf` response) |
| Professional report PDF (`report-pdf.js`) | **Not in this PR** — still Swedish-only server PDFKit |
| Resurser PDFs (`resurser-pdf.js`, static PDFs) | **Not in this PR** |
| Child dashboard `window.print()` title | **Not in this PR** |

## Generation model summary

| Mechanism | Used for | Runtime |
|-----------|----------|---------|
| **html2canvas + jsPDF** (CDN) | Live family schedule PDF (`/print-schema`), playful professional report PDF | Browser |
| **PDFKit** (`pdfkit` npm) | Resursbibliotek static PDFs, formal professional report API | Server (build script or request) |
| **`window.print()`** | Day view (Today), child dashboard, resurser bildkort pages, pedagog landing, professional report | Browser |
| **Committed `.pdf` files** | `/resurser/pdf/*.pdf` (22 files) | Static via `express.static` |
| **Puppeteer / Playwright** | E2E i18n smoke, marketing screenshots, journey QA | Test/dev only — not user-facing PDF export |

**Puppeteer is not used for user-facing PDF export.** The live schedule PDF uses client-side rasterization (html2canvas → jsPDF).

---

## 1. Routes

| Route / endpoint | Handler | Purpose | Generation |
|------------------|---------|---------|------------|
| `GET /print-schema` | SPA fallback in `src/routes/index.js` → `public/print-schema.html` | Schedule PDF picker + preview | Browser (page loads JS) |
| `GET /api/public/report/:publicId/pdf` | `src/routes/public.js` | Formal 2-page professional report download | Server PDFKit |
| `GET /api/public/report/:publicId/playful` | `src/routes/public.js` | JSON viewModel for playful PDF | Data only; PDF in browser |
| `GET /r/:publicId` | `src/routes/index.js` → `professional-report.html` | Shared report viewer | Browser print + playful PDF |
| `GET /resurser/pdf/<slug>` | `src/routes/public-pages.js` + `config/resurser-r*.js` | PDF landing HTML (download links) | Static HTML |
| `GET /resurser/pdf/<name>.pdf` | `express.static` on `public/` | Pre-built resurs PDF files | Static binary |
| `GET /en/resources/pdf/*` | EN mirror HTML under `public/en/resources/` | English PDF landing pages | Static HTML |
| `GET /planning` → link | `public/js/planning-hub.js` | Nav to `/print-schema` | — |

No dedicated route named `/print-schema-PDF` (capital PDF). Canonical path is `/print-schema`.

Query params on `/print-schema`: `childId`, `scope=my` (custody “mina dagar”).

---

## 2. Core schedule export (`print-schema`)

### Files

| Path | Locale | Swedish examples (hardcoded) | Generation |
|------|--------|------------------------------|------------|
| `public/print-schema.html` | **Yes** (`data-i18n`, `initParentAppI18n`) | Fallback Swedish in HTML until JS applies locale | Browser shell |
| `public/js/print-schema.js` | **Yes** (`pt()`, `I18n.get`) | — | Browser orchestration |
| `public/js/print-schema-core.js` | **Yes** (`pt()`, `LocaleDateTime`, `PERIODS_FALLBACK` offline only) | Offline fallbacks only | Browser HTML build + html2canvas/jsPDF |

### HTML generation

- `buildPrintHtml()` in `print-schema-core.js` builds inline HTML + CSS string (7-column grid, custody border colors, section emoji labels 🌅☀️🌆🌙).
- `writePrintDocument()` / `openPrintWindow()` for legacy `window.print()` path (iframe/popup fallback).
- `downloadPdf()` renders hidden DOM → html2canvas (scale 2) → jsPDF A4 landscape.

### Headers / footers

- **Header:** child avatar + `{name} — Schema|Mina dagar` + period label + date range (`fmtRangeLabel`, Swedish locale).
- **Footer:** none on schedule PDF (single rasterized page).
- **Legend:** section emoji only (not a separate legend block); weekday names in day column headers.

### Filename & document title

- PDF filename: `{prefix}-{sanitizedChildName}-{YYYY-MM-DD}.pdf` where prefix is locale-keyed (`min-stjarndag-veckoschema` / `my-starday-weekly-schedule`).
- Print window `<title>`: `{Schema|Mina dagar} — {childName}`.
- jsPDF document metadata: not explicitly set (image-only page).

### Entry points (i18n partial)

| Path | Locale | Notes |
|------|--------|-------|
| `public/schedule.html` | **Yes** (`schedule.chrome.createPdf`, `createPdfTitle`) | Link to `/print-schema` |
| `public/js/schedule.js` | **No** | Sets `schedulePrintLink.href` with `childId` |
| `public/daily-log.html` | **Yes** (`today.shell.*` print keys) | Day = `window.print()`; week/my → `/print-schema` |
| `public/js/daily-log.js` | **Partial** (`pt()` for toasts/doc titles in legacy `printWeek`/`printMyDaysWeek`; active week/my use redirect) | `goPrintSchemaPdf()` navigates to print-schema |
| `config/i18n/today-sv-SE.json` / `today-en-GB.json` | **Yes** | `printBtn`, `printDay`, `printWeek`, `printMyDays`, `printWeekDocTitle`, `weekOverview.*` |
| `config/i18n/planning-sv-SE.json` / `planning-en-GB.json` | **Yes** | `planning.links.printSchema` |
| `public/js/planning-hub.js` | **Yes** (i18n keys) | Link `/print-schema` |

### Analytics

- Event `print_schema_exported` — `public/js/print-schema.js`, `public/js/daily-log.js`, allowlist in `src/routes/analytics.js`.

### Tests

- `test/print-schema-core.test.js` — VM loads core, custody flatten tests.
- `test/custody-feat1b.test.js` — wiring + html2canvas presence.

---

## 3. Today / daily-log print paths

| Path | Active? | Locale | Generation |
|------|---------|--------|------------|
| **Print day** — `printDay()` + `@media print` in `daily-log.html` | **Yes** | Shell i18n; print header populated in JS | Browser `window.print()` on current page |
| **Print week / my days** — `goPrintSchemaPdf()` | **Yes** | i18n menu labels | Redirect to `/print-schema` |
| `printWeek()` / `printMyDaysWeek()` in `daily-log.js` | **Dead code** (no HTML onclick) | Uses `pt('today.weekOverview.*')`, `LocaleDateTime` when available | Would open popup + `window.print()` |

### Print CSS — `public/daily-log.html`

- `@media print` block (~lines 168–230): hides nav, print menu, child tabs; shows `.print-header`, `.print-checkbox`, B&W activity cards.
- `@page { size: A4 portrait; margin: 12mm }`.

### Headers (day print)

- `.print-header`: child emoji, name, date (`printChildName`, `printDate` in `daily-log.js`).

---

## 4. Child dashboard print

| Path | Locale | Generation |
|------|--------|------------|
| `public/child-dashboard.html` | **No** | `window.print()` on 🖨️ button; `title="Skriv ut"` |
| `@media print` in same file | — | Hides sub-steps, header actions, star values; compact layout |

No PDF export on child view. No QR/barnlogin in print output.

---

## 5. Professional share report

### Viewer — `public/professional-report.html`

| Aspect | Detail |
|--------|--------|
| Locale | **No** — hardcoded Swedish (`MONTHS_SV`, "Genererad", "Sammanfattning från vårdnadshavare", footer) |
| Browser print | `window.print()` + extensive `@media print` CSS |
| Playful PDF | `downloadPlayfulPdf()` — html2canvas + jsPDF portrait custom size |
| Filename | `rapport-{childName}-{YYYY-MM-DD}.pdf` |
| Formal PDF fallback | API `GET /api/public/report/:publicId/pdf` (not wired to primary button; `btnPdf` → playful only) |

### Server PDF — `src/lib/report-pdf.js`

| Aspect | Detail |
|--------|--------|
| Locale | **No** — Swedish labels throughout |
| Swedish examples | `Morgon`, `Kväll`, `Sammanfattning från vårdnadshavare`, `OBS: Sammanställning vald av vårdnadshavare…`, `Genererad` |
| Header | Navy bar: brand + child label + date range + generation date |
| Footer | Per page: `{brand} · {domain} · Sid. {n}/{total}` |
| Filename | From `link.label` sanitized → `{label}.pdf` (`Content-Disposition` in `public.js`) |
| Document info | PDFKit `Title`, `Author`, `Creator` |

### Playful mapper — `src/lib/report-playful-mapper.js`

- Section map Swedish: Morgon, Dag, Kväll, Natt — used for playful export viewModel.

---

## 6. Resursbibliotek (static marketing PDFs)

### Server generator — `src/lib/resurser-pdf.js`

| Aspect | Detail |
|--------|--------|
| Locale | **No** |
| Labels | From `config/pictogram-library.js` via `labelsForKeys()` (Swedish pictogram labels) |
| `WEEKDAY_LABELS` | Måndag–Söndag |
| Footer | `writeFooter()` — centered brand + `Sida {n}` at Y=780 |
| Types | `schedule`, `bildkort`, `beloning`, `veckoschema` |
| Swedish body text | e.g. "TEACCH-inspirerat material på papper…", "Mål: _____ stjärnor → Belöning:", "Klipp ut korten · laminera gärna…" |

### Build script — `scripts/generate-resurser-pdfs.mjs`

- Writes 22 PDFs to `public/resurser/pdf/`.
- npm script: `generate:resurser-pdfs`.
- All titles/subtitles in script are Swedish (e.g. "Morgonschema — tom mall").

### Config registries

| Path | Role |
|------|------|
| `config/resurser-r1.js` | R1 category, bildkort, PDF page paths |
| `config/resurser-r2.js` | R2 categories + PDF download link labels (Swedish) |
| `config/resurser-r3.js` | R3 longtail + helg/läx PDF pages |
| `config/resurser-r3-downloads.js` | PDF href map |
| `config/resurser-r3-pdf-keys.js` | Weekend/homework pictogram keys |
| `config/resurser-r1.js` / `resurser-r2` pictogram keys | Feed PDF content |

### Static PDF files (22)

`public/resurser/pdf/*.pdf` — served at `/resurser/pdf/{filename}.pdf`. No runtime generation.

### PDF landing HTML (Swedish)

`public/resurser/pdf-*.html` (11 files) — e.g. `pdf-morgonschema.html`, `pdf-veckoschema.html`. Swedish copy, download lists, no `data-i18n`.

### PDF landing HTML (English mirror)

`public/en/resources/pdf/*.html` (11 files) — EN paths via `public/js/public-lang-routes.js` and `config/en-slug-words.js`.

### Category / longtail pages with print

- **~125** `public/resurser/*.html` + EN mirrors under `public/en/resources/` — SEO articles linking to PDFs.
- **Bildkort pages** (`public/resurser/bildkort-*.html`, `public/resurser/bildkort/*.html`): `onclick="window.print()"` — "Skriv ut denna sida" (SV) / "Print denna sida" (some EN mirrors).
- HTML generators: `scripts/generate-resurser-r2-html.mjs`, `scripts/generate-resurser-r3-html.mjs`.

### Print CSS — `public/css/resurser-print.css`

- `.resurser-print-actions`, bildkort grid print layout.
- `@media print`: hide back link, CTA, cookie banner, print action buttons; 4-column bildkort grid.

---

## 7. Other print surfaces

| Path | Locale | Generation | Notes |
|------|--------|------------|-------|
| `public/pedagoger-och-terapeuter.html` | SV | `window.print()` | `@media print`; alternate PDF meta link to static `.pdf` |
| `public/en/educators-and-therapists.html` | EN | Same | EN mirror |
| `public/en.html` | EN | — | Marketing copy mentions printable PDF |
| `public/reports.html` + `public/js/reports.js` | Partial | QR for share links | **Not** schedule PDF; QR for professional share URL |

---

## 8. QR / barnlogin in print context

**Not found** in schedule PDF, print-schema, daily-log print, resurser PDFs, or child dashboard print.

QR elsewhere (out of scope for schedule PDF i18n):

- `public/js/reports.js` — QR for report share URL
- `public/js/family-invite-scan.js` — invite QR paste/scan
- `public/admin/admin-surveys.js` — survey QR modal

No barnlogin instructions embedded in generated schedule or resurs PDF output.

---

## 9. Filename & document title patterns

| Context | Pattern | Locale in pattern |
|---------|---------|-------------------|
| Schedule PDF | `schema-{childName}-{YYYY-MM-DD}.pdf` | Child name as stored |
| Schedule print window title | `{Schema\|Mina dagar} — {childName}` | Swedish suffix |
| Formal report API | `{link.label}.pdf` | Label from DB |
| Playful report | `rapport-{childName}-{YYYY-MM-DD}.pdf` | — |
| Resurs static files | Swedish slugs: `morgonschema.pdf`, `veckoschema-exempel.pdf`, etc. | Swedish filenames |
| PDFKit resurs `info.Title` | Job `title` from build script (Swedish) | Swedish |

Date formatting: `print-schema-core` uses ISO date in filename; `toLocaleDateString('sv-SE')` in body; `report-pdf.js` uses Swedish month abbreviations (`maj`, `okt`, …).

---

## 10. Headers & footers inventory

| Surface | Header | Footer |
|---------|--------|--------|
| print-schema PDF | Child avatar + name + period + range | None |
| print-schema preview | Same | None |
| daily-log day print | Emoji + name + date | None |
| daily-log legacy week popup | Name + "Veckoschema" (i18n key when used) | None |
| report-pdf (server) | Navy bar: brand, child, range, Genererad date | Every page: brand · domain · Sid. n/total |
| resurser-pdf (server) | Title + subtitle in body | `writeFooter`: brand resurs link + Sida n |
| professional-report.html screen | Report header block | "Rapport från …" footer div |
| playful export | Rendered in `playfulExportRoot` | Part of captured image |

---

## 11. i18n gap summary (priority for EN launch)

### Already i18n

- Today print menu labels + week doc titles (`today-*.json`)
- Schedule chrome PDF link (`schedule-*.json`)
- Planning hub print link (`planning-*.json`)
- `daily-log.js` legacy week/my builders use `pt()` + `LocaleDateTime` (dead path for week/my)
- EN public mirrors for resurser routes (`public-lang-routes.js`)

### Not i18n (user-facing print/PDF)

1. **Entire `/print-schema` page** — highest impact for logged-in parents
2. **`print-schema-core.js`** — all layout strings, weekday names, period labels, `sv-SE` dates
3. **`print-schema.js`** — toasts, help modal, errors
4. **`report-pdf.js`** + **professional-report.html** — formal and playful report
5. **`resurser-pdf.js`** + **generate-resurser-pdfs.mjs** — all static marketing PDFs
6. **~125 resurser HTML pages** — body copy (EN mirrors exist but many EN pages still contain Swedish snippets per audit grep)
7. **Child dashboard** print button title
8. **Pictogram labels** in PDFs — sourced from `pictogram-library.js` (verify EN pack)

### Puppeteer / Chromium

| Path | Role |
|------|------|
| `package.json` `puppeteer` devDependency | E2E only |
| `test/e2e/helpers/puppeteer-browser.js` | i18n browser tests |
| `scripts/smoke-child-en-prod*.cjs` | Prod smoke |
| `src/lib/journey/browser-qa.js` | Optional journey QA |
| `scripts/capture-marketing-seo-screenshots.mjs` | Marketing captures |

None of these generate user-facing PDFs for families.

---

## 12. Test coverage

| Test file | Covers |
|-----------|--------|
| `test/print-schema-core.test.js` | Core flatten/build logic |
| `test/custody-feat1b.test.js` | print-schema wiring |
| `test/resurser-r1.test.js`, `test/resurser-r2.test.js`, `test/resurser-r3.test.js` | PDF bytes + routes |
| `test/seo-pages.test.js` | Resurs PDF HTTP 200 + content-type |
| `test/i18n-home-today.test.js` | `print_schema_exported` analytics key |

---

## 13. Related docs (reference)

- `docs/boendeschema-spec.md` — print/PDF outside FEAT-1 scope (BC-13)
- `docs/bildstod-app-tasklist.md` — resurser PDF delivery notes
- `docs/route-inventory-pre-split.md` — `GET /print-schema`
