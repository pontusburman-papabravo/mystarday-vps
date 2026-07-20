# Bildstöd-app — Cursor tasklist (v1.3)

**Skapad:** 2026-07-02
**Status:** Alla planerade PR:ar levererade och mergade till `main` 2026-07-02 — PR 0, PR 1, PR 2, PR 3, PR R0, PR R1, PR R2, PR R3 (se checklistor nedan). App-spåret (panel 1–6) är 100 % klart per `bildstod-app-plan.md` §2.1. Kvarstående: EPIC 3.3/D9 (produktägarbeslut — se PR 3-sektionen).

**Plan:** [`bildstod-app-plan.md`](./bildstod-app-plan.md) v1.2.3
**Klar-definition:** 100 % på en panel = alla ☐ → ☑ i plan §2.1

**Branch-prefix:** `cursor/bildstod-` (app) · `cursor/resurser-` (SEO)

**Skala:** ~200 registrerade familjer, ~20 dagligen aktiva (plan §1). Ingen pilotgrupp/staged rollout (D7) — merges går direkt till alla, skyddat av `test:gate` + små PR:ar + snabb `git revert` som säkerhetsnät.

---

## Låsta beslut (från plan §12)

| # | Beslut |
|---|--------|
| D1 | Känslostöd = **Basic** (`emotion_tracking` → `basic_app`) |
| D2 | Ingen separat `/api/me/children/:id/emotion` — utöka `ratings.js` |
| D3 | En post-completion-modal — `mood_input_mode`: `cards` \| `slider` \| `off` |
| D4 | Panel 7 (digitalt arbetssystem) = **parkerad** |
| D5 | `transition_support` = **Extra stöd** (`teacch`); motor före rollout-UI OK |
| D6 | North Star = Family Day 14 (aktiveringsprogram) — inte denna plans metric |
| D7 | Ingen pilotgrupp/staged rollout — ship direkt till alla (~20 aktiva) |
| D8 | Vänta inte med R2/R3 på trafikdata — bygg R0–R3 sammanhängande |
| D9 | Ingen fake-door-CTA för Extra stöd — testa direkt på 3–5 NPF-familjer via `grantComponent()` |

---

## Fas-gates (app)

| Fas klar när | Panel §2.1 |
|--------------|------------|
| Phase 1 | 1 = 5/5 · 4 = 4/4 (app-del; PDF i R2) |
| Phase 2 | 2 = 5/5 · 3 app = 3/4 |
| Phase 3 | 5 = 4/4 · 6 = 4/4 |

---

## PR 0 — Marknadsjustering (Phase 0)

**Mål:** Ärlig copy · inga löften om panel 7 eller köp-live Extra stöd.

**Gate:** Panel — (ingen kod-gate)

**Status:** ✅ Levererat 2026-07-02 (merge `6cf216b`). Audit: [`bildstod-pr0-marketing-audit.md`](./bildstod-pr0-marketing-audit.md).

### EPIC 0.1 — Tvåspårsbudskap

- [x] `public/index.html` — tydliggör app (interaktiv) vs gratis resurser (länk till `/resurser` när live)
- [x] Footer/guider: "Levande schema i appen" vs "Gratis PDF att skriva ut"
- [x] CTA-copy: slipp skriva ut varje vecka

### EPIC 0.2 — Marketing-bildinventering

- [x] Dokumentera `public/images/marketing-seo/` — kolumn: app-skärmdump \| utskriftsillustration
- [x] Flagga bilder som inte matchar verklig app (ersätt i PR 1.5)

### EPIC 0.3 — Panel 7-löften bort

- [x] Sök repo/docs/marketing efter "arbetssystem", "ATT GÖRA", "TEACCH-app"
- [x] Ersätt med "De sju frågorna" / "TEACCH-inspirerade utskrivbara kort"

### EPIC 0.4 — Legal copy

- [x] Guider + reels: endast "TEACCH-inspirerat" — aldrig certifiering

### EPIC 0.5 — Rollout-copy

- [x] Extra stöd: "kommer" / beta-intresse — inte "köp nu" (`PACKAGES_ROLLOUT_MODE=off`)

**PR 0 klar när:** Copy review godkänd · ingen panel-7-app-löfte kvar. **✅ Klar.**

---

## PR 1 — App-kärna: bildbibliotek + stjärnrutnät (Phase 1)

**Mål:** Panel 1 + 4 app-del → 100 % (§2.1).

**Status:** ✅ Levererat 2026-07-02 (merge `bbd5d61`). Byggd av Composer 2.5-agent, granskad + verifierad mot riktig Postgres 16 (96/96 test, `test:gate` grönt) innan merge. Två fel hittade och fixade under granskning: SW cache-version-kollision med en samtidig `main`-refaktor (v471 → v472), och en test som skickade en relativ `image_url`-path (appkoden var korrekt — `image_url` är alltid absolut URL i denna kodbas).

### EPIC 1.1 — Delat bildbibliotek v1

- [x] Skapa `config/pictogram-library.js` — extrahera/utöka från `config/seven-questions-pictograms.js`
- [x] ≥80 nycklar: morgon, kväll, skola, hygien (+ abstract/emotion) — varje nyckel: `label` + minst `emoji` (96 nycklar levererade)
- [x] Kategorier för sök/filter (samma struktur som plan §5.2 startset)
- [x] Design Kit v1 inkopplad — `public/assets/min-stjarndag-design-kit/` + mapping i `config/pictogram-library.js` (SVG light; PNG-fasad `/resurser/bilder/` ej längre primär)
- [x] Enhetstest: varje nyckel har `label`, `emoji` eller `imagePath`

**Designkapacitet:** ≥80 nycklar med bara `label` + `emoji` räcker för Phase 1-gate — custom illustration är inte blockerande. Riktvärde: första ~40 illustrationerna ≈ 3–5 designerdagar, kan köras parallellt med kod/R1 (se plan §6).

### EPIC 1.2 — `icon_key` i aktivitets-CRUD

- [x] Migration: `activity_template.icon_key` (`migrations/1809300000000_activity_template_icon_key.js`)
- [x] `src/routes/activities.js` — validera `icon_key` mot bibliotek vid save
- [x] `public/js/dashboard-activity-modal.js` + `schedule-activity-modals.js` — pictogram-väljare (progressive disclosure)
- [x] `public/js/activity-visual.js` — prioritet: `image_url` > `icon_key` > `emoji` (verifierad intakt)

### EPIC 1.3 — GET `/api/pictograms`

- [x] Ny route `src/routes/pictograms.js`
- [x] `GET /api/pictograms` — lista `{ key, label, category, emoji, url }`
- [x] Auth: parent session (samma som aktivitetsbibliotek)
- [x] Test: `test/pictograms-api.test.js`

### EPIC 1.4 — Stjärnrutnät i Skattkammaren

- [x] `public/js/child-dashboard-rewards.js` — rutnät ifyllda/tomma stjärnor mot aktivt mål
- [x] `public/js/child-rewards-engine.js` — data: `filled` / `target` från verkliga completions
- [x] Belönings-emoji/bild under rutnätet
- [x] Ingen ny stjärnekonomi — samma data som idag (G-01)
- [x] Mobil: läsbart på iPhone SE (CSS i `child-dashboard.html`)

### EPIC 1.5 — App-marketing screenshots

- [ ] Fånga staging-skärmdumpar för `marketing-seo/` (barnvy, NU-kort, Skattkammaren) — **kvarstår, kräver mänsklig capture på staging**
- [ ] Ersätt generiska rutnät där de överdriver appen

### EPIC 1.6 — Tester

- [x] `test/bildstod-core.test.js` — pictogram library, icon_key save, stjärnrutnät render-logik
- [x] `npm run test:gate` grön (verifierat mot riktig Postgres, inte bara mock)
- [x] SW bump (`stjarndag-v472`) — `tailwind.build.css` ombyggd (`npm run check:css` grönt)

**PR 1 klar när:** §2.1 panel 1 = 5/5 · panel 4 app-kriterier 1–3 = 3/3 (stjärnrutnät). **✅ Klar.** Kvarstår utanför gaten: EPIC 1.1 illustrationer (design) + EPIC 1.5 (screenshots).

---

## PR 2 — NU/Nästa/Senare + barnens vecka (Phase 2)

**Mål:** Panel 2 = 5/5 · panel 3 app = 3/4.

**Status:** ✅ Levererat 2026-07-02 (merge `646ef7b`, commit `0e1d298`). Verifierad mot riktig Postgres, `test:gate` grönt.

### EPIC 2.1 — Default `now_next_later`

- [x] Onboarding + `add child`: default `child.view_type = 'now_next_later'`
- [x] Migration/backfill: endast **nya** barn (inte tvinga befintliga)
- [x] `child-settings.js`: behåll `day_sections` som alternativ

### EPIC 2.2 — Tre-zons-layout

- [x] `public/js/child-dashboard.js` — `renderNowNextLaterZones()`
- [x] Mobil: vertikal NU → Nästa → Senare
- [x] Tablet (`min-width`): horisontell tre-zon om plats
- [x] Minst 2 kommande steg när data finns

### EPIC 2.3 — "Senare"-copy

- [x] Barn-UI: "Sedan" → "Senare"
- [x] `public/js/help-bubble.js` — uppdatera förklaring
- [x] API bakåtkompatibilitet om `sedan` finns i JSON

### EPIC 2.4 — Barn: readonly veckoöversikt

- [x] Ny `public/js/child-week-overview.js` (IIFE)
- [x] Data från befintligt veckoschema-API för inloggat barn
- [x] Mån–sön med ikoner; idag markerad
- [x] Entry: diskret "Hela veckan"-länk — **inte** ny bottom-nav (C-01, barnmeny-v2)
- [x] Test: barn-token kan läsa, inte skriva schema

### EPIC 2.5 — Constitution QA

- [x] Manuellt: 00A morning stress test — barn förstår nästa steg utan förälder (visuell QA, se `public/images/marketing-seo/morgonschema-bildstod.png`)
- [x] Dokumentera i PR (15 §A) — `docs/bildstod-pr2-constitution-qa.md`

**PR 2 klar när:** §2.1 panel 2 = 5/5 · panel 3 kriterier 1–3 = 3/3. **✅ Klar.**

---

## PR 3 — Övergångar (Extra stöd) + känslostöd (Basic) (Phase 3)

**Mål:** Panel 5 = 4/4 · panel 6 = 4/4.

**Förutsättning:** Produktägare bekräftar rollout-läge före merge av synlig Extra stöd-UI (D5). **Läs plan §4.9 (gating-kodsanning) före 3.1.**

**Status:** ✅ Levererat 2026-07-02 (merge till `main`, commit `0752ab9`). Verifierad mot riktig Postgres, `test:gate` grönt. **EPIC 3.3 medvetet exkluderad** — kräver produktägarbeslut, se nedan.

### EPIC 3.1 — Övergångsmotor + inline UI

**Gating (låst — ingen ny `hasFeature()`-helper):**

- Server: `requireFeature('transition_support')` från `src/middleware/feature-gate.js` (→ `db/features.hasAccess`, inkl. `teacch` via `component-feature-map.js`)
- Klient: samma slug-gate som `emotion_tracking` (accessible features-lista)
- `requireComponent('teacch')` separat **behövs inte** om `requireFeature` används

- [x] Seed `transition_support` i `features` + status enligt paket-spec
- [x] `src/lib/transition-support.js` — beräkna fas från `scheduled_start` − now
- [x] Faser: Snart → Om 5 min → Om 1 min → Nu (inline i NU-kort, ingen modal)
- [x] `public/js/child-dashboard.js` (+ `child-dashboard-activities.js`) — render övergångstext + koppling till Time Timer
- [x] `requireFeature('transition_support')` på nya routes
- [x] Test: `test/transition-support.test.js`

### EPIC 3.2 — Förälderinställningar lead-tider

- [x] `child-settings.js` — lead-tider per barn (`transition_lead_minutes`, default `[5, 1]`)
- [x] Spara på `child` JSONB (`transition_lead_minutes`)
- [x] Endast synligt om familj har `teacch`

### EPIC 3.3 — Direkttest på riktiga NPF-familjer (D9 — ingen fake-door-UI)

**BLOCKERAT PÅ PRODUKTÄGARE** — vilka riktiga familjer som får `teacch` är ett affärsbeslut, inte något en agent avgör autonomt.

- [x] Läsverktyg levererat: `scripts/find-npf-candidate-families.js` — rankar kandidater på pedagog-koppling, pedagoganteckningar och `de_sju_fragorna`-användning (`activity_template.seven_questions`), exkluderar familjer som redan har `teacch`
- [ ] Produktägare kör scriptet mot produktions-DB och väljer 3–5 familjer
- [ ] `grantComponent(familyId, 'teacch')` via adminpanelens familjekomponent-UI (`src/routes/admin/family-components.js`) för dessa familjer manuellt
- [ ] Samla muntlig/skriftlig feedback: hjälper `transition_support` faktiskt i praktiken?
- [ ] Bygg **inte** mock-preview/beta-väntelista-CTA (§9.8-flödet) förrän feedbacken är positiv — spar EPIC 3.3:s ursprungliga scope till efter valideringen
- [ ] Om `PACKAGES_ROLLOUT_MODE` fortfarande `off`: ingen synlig UI för övriga familjer

### EPIC 3.4 — Känslokort i `ratingModal`

- [x] `mood_input_mode` på child: `cards` \| `slider` \| `off` (föräldraval i `child-settings.js`)
- [x] 8 fasta nycklar: glad, arg, ledsen, trött, orolig, stolt, rädd, stressad (`config/emotion-keys.js`)
- [x] **En** modal efter avbockning — kort **eller** slider, aldrig båda (D3, 00A) — `setRatingModalMode()` togglar block i samma modal
- [x] Gate: `emotion_tracking` feature-flagga (befintlig i `child-dashboard.js`)

### EPIC 3.5 — Utöka `ratings.js`

- [x] `POST /api/me/daily-log-items/:itemId/rate` — valfri `emotion_key` (enum 8 nycklar)
- [x] Migration: `rating.emotion_key` kolumn (`1809500000000_bildstod_pr3.js`)
- [x] Validering: `emotion_key` **eller** `score` 1–10, inte obligatoriskt båda
- [x] Test: `test/ratings-emotion-key.test.js`

### EPIC 3.6 — Feature-map

- [x] `config/component-feature-map.js` — `emotion_tracking: 'basic_app'`
- [x] Verifiera `db/features.hasAccess('emotion_tracking')` beter sig som Basic (ingen komponent-spärr)

### EPIC 3.7 — Offline-queue städning

- [x] `public/js/offline-queue.js` — `CHILD_RATE`-action hanterar `emotion_key` (ersätter äldre `EMOTION_TOGGLE`-koncept)
- [x] Test: offline completion + rating sync (`test/offline-queue-rating.test.js`)

### EPIC 3.8 — Förälderrapport daglig känslosammanfattning

- [x] `GET /api/children/:childId/mood-summary?date=` — aggregera ratings per dag (`src/routes/mood-summary.js`)
- [x] Föräldervy: integrerad i befintlig daglig logg (`public/js/daily-log.js`) — **inte** ny dashboard på Hem (P-04)
- [x] Visa emoji/nyckel + antal; ingen PII i analytics
- [x] Test: summary endpoint authz (parent scope only) — `test/mood-summary-authz.test.js`
- [x] Matchar `seed-features.js` acceptance för `kanslo_tracking`

**PR 3 klar när:** §2.1 panel 5 = 4/4 · panel 6 = 4/4 · `test:gate` grön · self-review (180). **✅ Klar** (EPIC 3.1–3.2, 3.4–3.8). EPIC 3.3 är ett fristående, blockerat produktbeslut — se ovan.

---

## PR R0 — Resursbibliotek grund (Phase R0)

**Mål:** `/resurser` hub live · routing · CTA-mall.

**Status:** ✅ Levererat 2026-07-02 (merge `f781348`). Byggd av Composer 2.5-agent, verifierad mot riktig Postgres (94/94 test).

### EPIC R0.1 — Informationsarkitektur

- [x] Dokumentera URL-träd: hub, kategori, bildkort, pdf, long-tail (plan §5.3)
- [x] `config/resurser-pages.js` — resurs-registry (separat fil, inte i `seo-pages.js`)

### EPIC R0.2 — Sidmall

- [x] `public/resurser.html` hub
- [x] Delad partial/layout: intro · kategoriplaceholders ("kommer snart") · CTA · relaterade länkar
- [x] Återanvänd SEO-guide CSS/Tailwind-mönster från `bildschema-app.html`

### EPIC R0.3 — Routing + sitemap

- [x] Registrera route i `src/routes/public-pages.js`
- [x] `/resurser` i `SEO_INDEXABLE_PATHS` → sitemap automatiskt (via `buildSitemapXml()`)
- [x] Utökat `test/seo-pages.test.js` — hub-indexerbarhet + HTTP 200 (inte ny testsvit)

### EPIC R0.4 — UTM-schema

- [x] Hub-CTA: `/register?utm_content=resurs-hub`
- [x] Konvention dokumenterad som kommentar i `config/resurser-pages.js`

**PR R0 klar när:** `/resurser` 200 · test grön · tom hub med CTA-block. **✅ Klar.** Kategori-/bildkort-/PDF-sidor kommer i PR R1/R2.

---

## PR R1 — Morgon + kväll (Phase R1)

**Mål:** Första nedladdningsbara PDF:er · internlänkar från guider.

**Status:** ✅ Levererat 2026-07-02 (commit `da2bd43` + `a7d07bc`). PDF:er är PDFKit-genererade (emoji-fria, `src/lib/resurser-pdf.js`) istället för designade illustrationer — fasad-nivå enligt EPIC 1.1:s designkapacitet-notering, inte de riktiga illustrationerna. Verifierat mot riktig Postgres (607/607 test).

### EPIC R1.1 — Morgon-bildkort

- [x] `public/resurser/bildkort-morgon.html` (8 nycklar, `MORNING_KEYS`)
- [x] PDF: A4-rutnät/kort med morgon-nycklar (PDFKit, `bildkort-morgon.pdf`) — **emoji-fri text**, inte illustrationer (kvarstår när design levererar riktiga bilder)

### EPIC R1.2 — Kväll-bildkort

- [x] `public/resurser/bildkort-kvall.html` (6 nycklar, `EVENING_KEYS`) + `bildkort-kvall.pdf`

### EPIC R1.3 — Morgonschema-PDF

- [x] `/resurser/pdf/morgonschema` — tom mall (`morgonschema.pdf`) + exempel (`morgonschema-exempel.pdf`)
- [x] Nedladdningslänk i `public/resurser/pdf/`

### EPIC R1.4 — Kvällsschema-PDF

- [x] `/resurser/pdf/kvallsschema` — samma mönster (`kvallsschema.pdf` + `kvallsschema-exempel.pdf`)

### EPIC R1.5 — Landningssidor

- [x] 2 kategorisidor (morgon/kväll) + 2 bildkort-sidor + 2 PDF-sidor = 6 indexerbara sidor (matchar PR R1:s morgon+kväll-scope — övriga kategorier från plan §5.2 kommer i R2)
- [x] Meta title/description per sida (svenska)

### EPIC R1.6 — Internlänkar från guider

- [x] `/bildschema-app` → `/resurser` hub + morgon-/kvällsschema-PDF
- [x] `/morgonrutin-barn` → morgonschema-PDF
- [ ] `/beloningssystem-barn` → (placeholder till R2 belöningsschema — oförändrad)
- [ ] `/rutiner-npf-barn` → (placeholder till R2 övergångar — oförändrad)
- [x] `/alternativ-bildschema-tavla` → `/resurser` hub
- [ ] `/veckoschema-bildstod` → (placeholder till R2.6 — oförändrad)
- [x] Utökat `test/seo-pages.test.js` för nya internlänkar

**PR R1 klar när:** ≥6 PDF:er nedladdningsbara · CTA på varje sida · 6 guider länkar (minst hub + morgon). **✅ Klar** (morgon/kväll-scope). Resterande guide-placeholders (beloning/rutiner-npf/veckoschema) väntar medvetet på R2-innehåll.

### EPIC 1.5 (uppföljning från PR 1) — Marketing screenshots

**Status:** ✅ Klar (2026-07-02) — infångade lokalt mot en riktig test­familj efter PR2/R2/PR3/R3.

- [x] `scripts/capture-marketing-seo-screenshots.mjs` (`npm run capture:marketing-seo`) — Puppeteer, loggar in som riktigt barn/förälderkonto
- [x] **Kört lokalt** mot en manuellt skapad testfamilj (riktigt schema, 4 avklarade aktiviteter, 2 belöningar) — separata browser-kontexter för barn/förälder (en delad sida läckte tidigare barnets localStorage-flagga in i förälderpassen → PIN-gate/utloggad vy istället för Planering/Hem); morgonpasset avklaras automatiskt mellan de två `/child/today`-bilderna så morgon-/kvällsbilden skiljer sig åt; `vardagsrutiner-bildstod.png` pekade om från `/` (publik landningssida) till `/dashboard` (faktisk Hem-coachvy)
- [x] Granska PNG:er och ersätt mockups i `public/images/marketing-seo/` (flaggade i `bildstod-pr0-marketing-audit.md`) — alla 5 bilder visar nu riktigt appinnehåll (NU/NÄSTA/SENARE, stjärnor, belöningar, Planering, Hem-coach)

---

## PR R2 — Utökning kategorier (Phase R2)

**Mål:** Panel 3–4, 6–7 resurs-delar · ≥20 PDF:er totalt.

**Status:** ✅ Levererat 2026-07-02 (merge till `main`). Verifierad mot riktig Postgres, `test:gate` grönt.

### EPIC R2.1 — Känslor

- [x] 8 bildkort + PDF (samma nycklar som app §4.6, `config/emotion-keys.js`)
- [x] `/resurser/bildkort-kanslor` (+ `kanslokort-barn-gratis.html`, `kanslor.html`, `pdf-kanslor.html`)

### EPIC R2.2 — Övergångar + först–sedan

- [x] Övergångskort-PDF (`bildkort-overgangar.pdf`, `overgangsschema.pdf`)
- [x] `/resurser/bildkort-overgangar` — länk från `/rutiner-npf-barn`

### EPIC R2.3 — TEACCH-inspirerat

- [x] Kort-set: `bildkort-teacch-inspirerat.html`, `teacch-inspirerat.html`, `teacch-kort-barn.html`
- [x] Copy: "inspirerat av visuellt stöd" — inte officiell TEACCH

### EPIC R2.4 — Skola + hygien

- [x] Kategorisidor + bildkort-PDF vardera (`bildkort-skola.html`/`.pdf`, `bildkort-hygien.html`/`.pdf`)

### EPIC R2.5 — Belöningsschema-PDF

- [x] Utskrivbart stjärnschema (`pdf-beloningsschema.html`, `beloningsschema.pdf`) — länk från `/beloningssystem-barn`
- [x] §2.1 panel 4 kriterium 4

### EPIC R2.6 — Veckoschema-PDF

- [x] Statisk mall (`pdf-veckoschema.html`, `veckoschema.pdf`) — kompletterar `print-schema.html`
- [x] §2.1 panel 3 kriterium 4 · länk från `/veckoschema-bildstod`

**PR R2 klar när:** Resursbibliotek DoD (plan §11) — hub ≥6 kategorier · ≥20 PDF:er. **✅ Klar.**

---

## PR R3 — Long-tail SEO (Phase R3, löpande)

**Start:** direkt efter R2, ingen trafik-gate (D8 — medveten satsning på räckvidd framför stegvis validering). Mät löpande via R3.3 för att kunna justera kadensen om det inte konverterar.

**Status:** ✅ Första batch levererad 2026-07-02 — 20 long-tail-sidor, generator, tester, Search Console-checklista.

### EPIC R3.1 — Landningspage-generator

- [x] Datafil: `{ intent, title, body, relatedSlugs, downloadSlug }` → `config/resurser-r3-pages-data.js` + `config/resurser-r3.js`
- [x] Build-script: `scripts/generate-resurser-r3-html.mjs` — samma layout som R1/R2 (`seo-article.css`, canonical, CTA, article-events)

### EPIC R3.2 — Skala 50 → 100+ sidor

- [x] Första batch: 20 sidor (kvalitet före kvantitet — se plan §5.6/D8)
- [x] ≥300 ord unik text per sida (assertion i `test/resurser-r3.test.js`)
- [x] Minst 1 nedladdning eller guide-länk per sida (`downloadSlug` + `relatedSlugs`)

### EPIC R3.3 — Search Console

- [x] Månatlig checklista dokumenterad: `docs/resurser-r3-search-console-checklist.md`
- [ ] **Löpande (mänsklig):** sidor med impressions men låg CTR → förbättra title/ingress
- [ ] **Löpande (mänsklig):** index coverage för `/resurser/*`

### EPIC R3.4 — Kadens

- [ ] **Löpande process (ej kod):** 2 nya PDF-mallar + 5 long-tail-sidor per månad (growth-rutin)
- Se `docs/resurser-r3-search-console-checklist.md` kvartalsvis granskning

---

## Parkerat (gör inte utan ADR)

| Epic | Anledning |
|------|-----------|
| Digitalt ATT GÖRA/GÖR/KLAR | Plan Appendix A · D4 |
| `POST /api/me/children/:id/emotion` | D2 — använd ratings |
| Sociala berättelser (`social_stories`) | Paket v1.3+ · ej i denna plan |
| Fristående `hasFeature()`-helper | D6 — `requireFeature`/`hasAccess` räcker (plan §4.9) |

---

## Rekommenderad byggordning

```
PR 0                ✅ Klar (2026-07-02)
PR 1 + PR R0        ✅ Klara (2026-07-02, mergade i ordningen PR0 → R0 → PR1)
PR R1               ✅ Klar (2026-07-02, morgon+kväll — 6 PDF:er, 6 sidor)
PR 2                ← nästa (app — sekventiellt efter PR 1, delar filer med PR 3)
PR 3                (sekventiellt efter PR 2 — 3.1–3.2 motor, 3.3 = direkttest på 3–5 familjer, D9)
PR R2         (direkt efter R1, ingen trafik-gate — D8)
PR R3         (direkt efter R2, löpande — D8, mät med R3.3)
```

---

## Checklista före merge (varje PR)

- [ ] `npm run test:gate` grön
- [ ] POS-regler citerade i commit (P-02, C-01, G-01, P-04 där relevant)
- [ ] Self-review 180 (åtta roller) för user-facing PR
- [ ] SW bump om `public/` assets ändrats
- [ ] Uppdatera §2.1 i planen (kryssa kriterier) vid fas-gate
- [ ] Håll PR:en liten och enskild (D7) — ingen pilotgrupp fångar upp regressioner, så en liten diff + snabb `git revert` är det faktiska säkerhetsnätet för de ~20 aktiva familjerna

---

---

## Changelog

**v1.2 → v1.3 (2026-07-02):** PR R1 (morgon + kväll: 6 PDF:er via `src/lib/resurser-pdf.js`/PDFKit, 6 indexerbara sidor) och EPIC 1.5:s uppföljningsscript (`capture-marketing-seo-screenshots.mjs`) byggda parallellt i en separat live IDE-session medan huvudsessionen granskade/mergade PR0+PR1+R0. Granskat och verifierat på samma sätt (riktig Postgres, 607/607 test, lint 0 fel, `check:css` grönt) innan commit. TODO-länkar till `/resurser` i marknadscopy (från PR 0) upplösta till riktiga länkar nu som R0+R1 är live. PDF:erna är PDFKit-genererad text (emoji-fri), inte färdiga illustrationer — riktig design är fortsatt ett öppet steg.

**v1.1 → v1.2 (2026-07-02):** PR 0, PR 1, PR R0 byggda parallellt av tre isolerade Composer 2.5-agenter (var sin git-worktree/branch), granskade och verifierade mot riktig lokal Postgres 16 innan merge till `main` (inte bara mock-DB/unit-tester). Två integrationsfel hittade och fixade under granskning: (1) SW cache-version-kollision — huvudgrenen landade oberoende på samma `stjarndag-v471` som PR 1 medan agenterna jobbade, vilket hade tystat cache-invalidering för de nya klientfilerna; fixat till v472. (2) En test i PR 1 skickade en relativ `image_url`-path — appkoden (som kräver absolut URL, konsekvent med `object-storage.js` och `family-images.js`) var korrekt, testet fixades. `docs/route-inventory-pre-split.md` och `tailwind.build.css` regenererade efter merge (`npm run dump:routes` / `npm run check:css`). §2.1 panel 1 (5/5) och panel 4 app-del (3/3) uppdaterade i planen.

*Version 1.3 · Synkad med bildstod-app-plan.md v1.2.3*
