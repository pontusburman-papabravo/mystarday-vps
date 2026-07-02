# Bildstöd-app — Cursor tasklist (v1.2)

**Skapad:** 2026-07-02
**Status:** PR 0, PR 1, PR R0 levererade och mergade till `main` 2026-07-02 (se checklistor nedan). Nästa: PR 2 (app) + PR R1 (resurser).

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
- [ ] `public/resurser/bilder/` — PNG/SVG per nyckel när design levererat (fasad OK i Phase 1 — kvarstår, design ej levererad än)
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

### EPIC 2.1 — Default `now_next_later`

- [ ] Onboarding + `add child`: default `child.view_type = 'now_next_later'`
- [ ] Migration/backfill: endast **nya** barn (inte tvinga befintliga)
- [ ] `child-settings.js`: behåll `day_sections` som alternativ

### EPIC 2.2 — Tre-zons-layout

- [ ] `public/js/child-dashboard.js` — `renderNowNextLaterZones()`
- [ ] Mobil: vertikal NU → Nästa → Senare
- [ ] Tablet (`min-width`): horisontell tre-zon om plats
- [ ] Minst 2 kommande steg när data finns

### EPIC 2.3 — "Senare"-copy

- [ ] Barn-UI: "Sedan" → "Senare"
- [ ] `public/js/help-bubble.js` — uppdatera förklaring
- [ ] API bakåtkompatibilitet om `sedan` finns i JSON

### EPIC 2.4 — Barn: readonly veckoöversikt

- [ ] Ny `public/js/child-week-overview.js` (IIFE)
- [ ] Data från befintligt veckoschema-API för inloggat barn
- [ ] Mån–sön med ikoner; idag markerad
- [ ] Entry: diskret "Hela veckan"-länk — **inte** ny bottom-nav (C-01, barnmeny-v2)
- [ ] Test: barn-token kan läsa, inte skriva schema

### EPIC 2.5 — Constitution QA

- [ ] Manuellt: 00A morning stress test — barn förstår nästa steg utan förälder
- [ ] Dokumentera i PR (15 §A)

**PR 2 klar när:** §2.1 panel 2 = 5/5 · panel 3 kriterier 1–3 = 3/3.

---

## PR 3 — Övergångar (Extra stöd) + känslostöd (Basic) (Phase 3)

**Mål:** Panel 5 = 4/4 · panel 6 = 4/4.

**Förutsättning:** Produktägare bekräftar rollout-läge före merge av synlig Extra stöd-UI (D5). **Läs plan §4.9 (gating-kodsanning) före 3.1.**

### EPIC 3.1 — Övergångsmotor + inline UI

**Gating (låst — ingen ny `hasFeature()`-helper):**

- Server: `requireFeature('transition_support')` från `src/middleware/feature-gate.js` (→ `db/features.hasAccess`, inkl. `teacch` via `component-feature-map.js`)
- Klient: samma slug-gate som `emotion_tracking` (accessible features-lista)
- `requireComponent('teacch')` separat **behövs inte** om `requireFeature` används

- [ ] Seed `transition_support` i `features` + status enligt paket-spec
- [ ] `src/lib/transition-support.js` — beräkna fas från `scheduled_start` − now
- [ ] Faser: Snart → Om 5 min → Om 1 min → Nu (inline i NU-kort, ingen modal)
- [ ] `public/js/child-dashboard.js` — render övergångstext + koppling till Time Timer
- [ ] `requireFeature('transition_support')` på nya routes
- [ ] Test: `test/transition-support.test.js`

### EPIC 3.2 — Förälderinställningar lead-tider

- [ ] `child-settings.js` — lead-tider per barn (5/3/1 min eller plan-default)
- [ ] Spara på `child` JSONB eller befintlig settings-kolumn
- [ ] Endast synligt om familj har `teacch`

### EPIC 3.3 — Direkttest på riktiga NPF-familjer (D9 — ingen fake-door-UI)

- [ ] Identifiera 3–5 kända familjer med NPF-behov (fråga direkt, eller familjer som redan använder `de_sju_fragorna`/`visual_timer` mycket)
- [ ] `grantComponent(familyId, 'teacch')` via `db/family-subscriptions.js` för dessa familjer manuellt
- [ ] Samla muntlig/skriftlig feedback: hjälper `transition_support` faktiskt i praktiken?
- [ ] Bygg **inte** mock-preview/beta-väntelista-CTA (§9.8-flödet) förrän feedbacken är positiv — spar EPIC 3.3:s ursprungliga scope till efter valideringen
- [ ] Om `PACKAGES_ROLLOUT_MODE` fortfarande `off`: ingen synlig UI för övriga familjer

### EPIC 3.4 — Känslokort i `ratingModal`

- [ ] `mood_input_mode` på child: `cards` \| `slider` \| `off` (föräldraval i `child-settings.js`)
- [ ] 8 fasta nycklar: glad, arg, ledsen, trött, orolig, stolt, rädd, stressad
- [ ] **En** modal efter avbockning — kort **eller** slider, aldrig båda (D3, 00A)
- [ ] Gate: `emotion_tracking` feature-flagga (befintlig i `child-dashboard.js`)

### EPIC 3.5 — Utöka `ratings.js`

- [ ] `POST /api/me/daily-log-items/:itemId/rate` — valfri `emotion_key` (enum 8 nycklar)
- [ ] Migration om behövs: kolumn på rating-tabell / `daily_log_item`
- [ ] Validering: `emotion_key` **eller** `score` 1–10, inte obligatoriskt båda
- [ ] Test: `test/ratings-emotion-key.test.js`

### EPIC 3.6 — Feature-map

- [ ] `config/component-feature-map.js` — `emotion_tracking: 'basic_app'`
- [ ] Verifiera `db/features.hasAccess('emotion_tracking')` beter sig som Basic (ingen komponent-spärr)

### EPIC 3.7 — Offline-queue städning

- [ ] `public/js/offline-queue.js` — avveckla `EMOTION_TOGGLE` → peka om till ratings-route (§3.5)
- [ ] Test: offline completion + rating sync

### EPIC 3.8 — Förälderrapport daglig känslosammanfattning

- [ ] `GET /api/children/:childId/mood-summary?date=` — aggregera ratings per dag (samma mönster som `observations.js`)
- [ ] Föräldervy: Idag eller befintlig rapportyta — **inte** ny dashboard på Hem (P-04)
- [ ] Visa emoji/nyckel + antal; ingen PII i analytics
- [ ] Test: summary endpoint authz (parent scope only)
- [ ] Matchar `seed-features.js` acceptance för `kanslo_tracking`

**PR 3 klar när:** §2.1 panel 5 = 4/4 · panel 6 = 4/4 · `test:gate` grön · self-review (180).

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

**Förutsättning:** EPIC 1.1 bildbibliotek (delade illustrationer).

### EPIC R1.1 — Morgon-bildkort

- [ ] 8 illustrationer + `public/resurser/bildkort/morgon.html`
- [ ] PDF: A4 rutnät med morgon-nycklar (statisk v1)

### EPIC R1.2 — Kväll-bildkort

- [ ] 6 illustrationer + sida + PDF

### EPIC R1.3 — Morgonschema-PDF

- [ ] `/resurser/pdf/morgonschema` — mall med tomma rutor
- [ ] Nedladdningslänk (statisk fil i `public/resurser/pdf/`)

### EPIC R1.4 — Kvällsschema-PDF

- [ ] `/resurser/pdf/kvallsschema` — samma mönster

### EPIC R1.5 — Landningssidor

- [ ] 4 kategorisidor + 2 PDF-sidor indexerbara
- [ ] Meta title/description per sida (svenska)

### EPIC R1.6 — Internlänkar från guider

- [ ] `/bildschema-app` → resurser
- [ ] `/morgonrutin-barn` → morgonschema-PDF
- [ ] `/beloningssystem-barn` → (placeholder till R2 belöningsschema)
- [ ] `/rutiner-npf-barn` → (placeholder till R2 övergångar)
- [ ] `/alternativ-bildschema-tavla` → `/resurser` hub
- [ ] `/veckoschema-bildstod` → (placeholder till R2.6)
- [ ] Uppdatera `test/seo-pages.test.js` för nya internlänkar

**PR R1 klar när:** ≥6 PDF:er nedladdningsbara · CTA på varje sida · 6 guider länkar (minst hub + morgon).

---

## PR R2 — Utökning kategorier (Phase R2)

**Mål:** Panel 3–4, 6–7 resurs-delar · ≥20 PDF:er totalt.

### EPIC R2.1 — Känslor

- [ ] 8 bildkort + PDF (samma nycklar som app §4.6)
- [ ] `/resurser/bildkort/kanslor`

### EPIC R2.2 — Övergångar + först–sedan

- [ ] Övergångskort-PDF
- [ ] `/resurser/bildkort/overgangar` — länk från `/rutiner-npf-barn`

### EPIC R2.3 — TEACCH-inspirerat

- [ ] 7 kort: Först, Sedan, Klar, Paus, Arbeta, Vila, Hjälp
- [ ] Copy: "inspirerat av visuellt stöd" — inte officiell TEACCH

### EPIC R2.4 — Skola + hygien

- [ ] Kategorisidor + bildkort-PDF vardera

### EPIC R2.5 — Belöningsschema-PDF

- [ ] Utskrivbart stjärnschema — länk från `/beloningssystem-barn`
- [ ] §2.1 panel 4 kriterium 4

### EPIC R2.6 — Veckoschema-PDF

- [ ] Statisk mall — kompletterar `print-schema.html`
- [ ] §2.1 panel 3 kriterium 4 · länk från `/veckoschema-bildstod`

**PR R2 klar när:** Resursbibliotek DoD (plan §11) — hub ≥6 kategorier · ≥20 PDF:er.

---

## PR R3 — Long-tail SEO (Phase R3, löpande)

**Start:** direkt efter R2, ingen trafik-gate (D8 — medveten satsning på räckvidd framför stegvis validering). Mät löpande via R3.3 för att kunna justera kadensen om det inte konverterar.

### EPIC R3.1 — Landningspage-generator

- [ ] Datafil: `{ intent, title, body, relatedSlugs, downloadSlug }`
- [ ] Build-script eller handcurated batch — inga tunna dubbletter

### EPIC R3.2 — Skala 50 → 100+ sidor

- [ ] Exempel: `bildkort-adhd`, `bildschema-pdf`, `kanslokort-barn`, `bildstod-forskolan`
- [ ] ≥300 ord unik text per sida
- [ ] Minst 1 nedladdning eller guide-länk per sida

### EPIC R3.3 — Search Console

- [ ] Månatlig: sidor med impressions men låg CTR → förbättra title/ingress
- [ ] Index coverage för `/resurser/*`

### EPIC R3.4 — Kadens

- [ ] 2 nya PDF-mallar + 5 long-tail-sidor per månad (growth-rutin)

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
PR 0          ✅ Klar (2026-07-02)
PR 1 + PR R0  ✅ Klara (2026-07-02, mergade i ordningen PR0 → R0 → PR1)
PR 2          ← nästa (app — sekventiellt efter PR 1, delar filer med PR 3)
PR R1         (efter 1.1 bilder — bildbiblioteket finns nu, kan starta)
PR 3          (sekventiellt efter PR 2 — 3.1–3.2 motor, 3.3 = direkttest på 3–5 familjer, D9)
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

**v1.1 → v1.2 (2026-07-02):** PR 0, PR 1, PR R0 byggda parallellt av tre isolerade Composer 2.5-agenter (var sin git-worktree/branch), granskade och verifierade mot riktig lokal Postgres 16 innan merge till `main` (inte bara mock-DB/unit-tester). Två integrationsfel hittade och fixade under granskning: (1) SW cache-version-kollision — huvudgrenen landade oberoende på samma `stjarndag-v471` som PR 1 medan agenterna jobbade, vilket hade tystat cache-invalidering för de nya klientfilerna; fixat till v472. (2) En test i PR 1 skickade en relativ `image_url`-path — appkoden (som kräver absolut URL, konsekvent med `object-storage.js` och `family-images.js`) var korrekt, testet fixades. `docs/route-inventory-pre-split.md` och `tailwind.build.css` regenererade efter merge (`npm run dump:routes` / `npm run check:css`). §2.1 panel 1 (5/5) och panel 4 app-del (3/3) uppdaterade i planen.

*Version 1.2 · Synkad med bildstod-app-plan.md v1.2.3*
