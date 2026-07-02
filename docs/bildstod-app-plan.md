# Bildstöd-app-plan

| | |
|--|--|
| **Status** | v1.2.3 — godkänd för exekvering (rollout-beslut D7–D8 efter produktägargenomgång, se Appendix E) |
| **Skapad** | 2026-07-02 |
| **Uppdaterad** | 2026-07-02 |
| **Ägare** | Produkt (Pontus) |
| **Utgångspunkt** | 7-panelers bildstöd-poster — används som **gap-analys**, inte som produktmål |
| **Relaterat** | [`bildstod-app-tasklist.md`](./bildstod-app-tasklist.md) · [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) §5–7, §8.2–8.3, §9.8 · [`barnmeny-v2.md`](./barnmeny-v2.md) · [`seo-content-cluster-v1.md`](./seo-content-cluster-v1.md) · [`foraldaraktivering-7-dagar-spec.md`](./foraldaraktivering-7-dagar-spec.md) · [`aktivering-exekveringsplan.md`](./aktivering-exekveringsplan.md) |

---

## 1. Executive summary

### Positionering (låst)

Min Stjärndag är **inte** en app för att skriva ut bildkort.

Min Stjärndag **är** en **interaktiv bildstödsapp** som hjälper barnet genom dagen — med rutiner att bocka av, NU/Nästa/Senare, belöningar och (med Extra stöd) övergångsstöd och känslostöd.

Det är en starkare position än att konkurrera med gratis utskrivbara PDF:er. Utskrifter och arbetsblad tillhör ett **separat spår** (Resursbibliotek) som driver SEO och leder till appen.

### Två produkter — ett varumärke

```
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│  Min Stjärndag (huvudprodukt)       │     │  Resursbibliotek (SEO-motorn)       │
│  ─────────────────────────────      │     │  ─────────────────────────────      │
│  Interaktiv · levande · daglig      │     │  Statisk · utskrivbar · sökbar      │
│                                     │     │                                     │
│  • Visuella rutiner                 │     │  • PDF:er och arbetsblad            │
│  • NU – Nästa – Senare              │     │  • Utskrivbara bildkort             │
│  • Veckoschema (i appen)            │     │  • Morgon-/kvällsscheman            │
│  • Belöningssystem                  │     │  • Först–sedan-kort                 │
│  • Övergångsstöd (Extra stöd)       │     │  • Känslokort (PDF)                 │
│  • Känslostöd (i appen)             │     │  • TEACCH-inspirerade mallar        │
│  • De sju frågorna + timer          │     │  • Timers, belöningsscheman         │
│                                     │     │                                     │
│  Detta säljer vi.                   │     │  Detta hittar oss.                  │
└─────────────────────────────────────┘     └─────────────────────────────────────┘
              │                                           │
              └─────────── CTA: "Slipp skriva ut         │
                            nya scheman varje gång —      │
                            testa Min Stjärndag gratis" ──┘
```

**Delat fundament:** ett gemensamt **bildbibliotek** (illustrationer/piktogram) som matar både appens `icon_key` och Resursbibliotekets PDF:er — en investering, två kanaler.

### Mål

**En definition av "klar":** 100 % på en panel = **samtliga kriterier avkryssade** i §2.1 (inga lösa aggregat-procent). DoD (§11) följer samma regel.

| Spår | Mål |
|------|-----|
| **App (Phase 1–3)** | Panel 1–6: **100 %** enligt §2.1 — alla ☐ → ☑ per panel |
| **Resursbibliotek (Phase R)** | Panel 3–4, 6–7 (utskriftsdel): egna kriterier i §2.1 + §5; hub live · väg till 100+ sidor |
| **Panel 7 (app)** | **Parkerad** — byggs inte i appen |

**Fas → panel (app):**

| Fas | Paneler som ska nå 100 % (§2.1) |
|-----|----------------------------------|
| Phase 1 | 1 (5/5) · 4 (4/4) |
| Phase 2 | 2 (5/5) · 3 app-del (3/4 — kriterium 4 = Resurs R2) |
| Phase 3 | 5 (4/4) · 6 (4/4) |

### Produktvision (ej metric)

Ett barn som inte läser ska förstå *vad som händer nu, vad som kommer sen och hur länge det pågår* — utan att en vuxen förklarar varje morgon.

*(POS: 04 C-02, 00A morning stress test)*

### Relation till aktiveringsprogrammet

| Begrepp | Ägare | Dokument |
|---------|-------|----------|
| **North Star (låst)** | Family Day 14 cohort retention | [`foraldaraktivering-7-dagar-spec.md`](./foraldaraktivering-7-dagar-spec.md) |
| **P0 Activation Event** | `activation_rate_48h` (schema + barnåtkomst + första stjärna inom 48 h) | [`aktivering-exekveringsplan.md`](./aktivering-exekveringsplan.md) |
| **Kapacitet (90 dagar)** | ~75 % activation engine · ~20 % retention · ~5 % growth | `aktivering-exekveringsplan.md` |

**Denna plan är ett tillväxt-/produktspår — inte ett nytt North Star.** Bildstöd-arbetet ska **stödja** P0-aktivering (första stjärnan snabbare), inte konkurrera med 7-dagarsprogrammet om prioritet.

**Attribution Resursbibliotek → aktivering:**

| Steg | UTM / event | Räknas mot |
|------|-------------|------------|
| Organisk trafik `/resurser/*` | `utm_content=resurs-{slug}` | Resursbibliotek-KPI (§8) |
| Registrering från resurs | `sign_up` + `utm_content` | Delad funnel — rapporteras separat |
| Aktivering inom 48 h | Befintlig `activation_rate_48h` | **Aktiveringsprogrammet** äger metricen |

Resursbiblioteket mäts primärt på trafik, nedladdningar och resurs→registrering. En lyft i `activation_rate_48h` attribueras till aktiveringsprogrammet om familjen inte kom via resurs-UTM — annars i gemensam dashboard med `utm_content`-segment.

### Nuvarande användarbas och lanseringsstrategi

| | |
|--|--|
| Registrerade familjer | ~200 |
| Dagligen aktiva | ~20 |

Skalan är fortfarande liten — ändringar i `child-dashboard.js` når i praktiken ett tjugotal familjer per dag, inte tvåhundra. **Beslut (D7, §12):** ingen separat pilotgrupp/staged rollout via `family_features`-admin-API — ship direkt till alla, skyddat av `test:gate` + normal deploy-disciplin (150/190). Bygg inte pilot-tilldelningsverktyg för den här skalan; omvärdera om aktiva familjer växer mot samma storleksordning som registrerade.

**Skalningsnot:** `src/lib/db.js` har idag `max: 5` databas-anslutningar (se `docs/ops-pool-monitoring.md`). Inget att åtgärda vid ~20 aktiva, men bevaka `waitingCount` om tillväxtmålen i denna plan (organisk trafik, virality) faktiskt slår in — det är den komponent som först märker av fler samtidiga familjer, inte appkoden.

---

## 2. Nuläge — panel för panel

### 2.1 Mätkriterier (vad 100 % betyder)

Procenten per panel = andel avkryssade kriterier nedan. Används vid fas-gates — inte subjektiv bedömning.

#### Panel 1 — Bildstöd vardagsrutiner (100 % = 5/5)

| ☑ | Kriterium | Idag |
|---|-----------|------|
| ☑ | Barn ser aktivitetskort med foto, piktogram eller emoji | ✅ |
| ☑ | Förälder kan redigera aktiviteter med visuellt stöd | ✅ (emoji/foto/piktogram) |
| ☑ | Delat bildbibliotek ≥80 nycklar (morgon/kväll/skola/hygien) | ✅ (96 nycklar, `config/pictogram-library.js`) |
| ☑ | `icon_key` väljbar i aktivitets-CRUD | ✅ (PR 1, migration `1809300000000`) |
| ☑ | GET `/api/pictograms` live | ✅ (PR 1) |

**Klar: 100 % (5/5)** — PR 1 levererad 2026-07-02, verifierad mot riktig Postgres (`test:gate` grönt).

#### Panel 2 — NU/Nästa/Senare (100 % = 5/5)

| ☐ | Kriterium | Idag |
|---|-----------|------|
| ☐ | `now_next_later` är default för nya barn | ❌ |
| ☐ | NU + Nästa + Senare synliga i samma vy | ⚠️ (opt-in, "Sedan") |
| ☐ | Minst 2 kommande steg visas | ⚠️ |
| ☐ | Tre-zons-layout (mobil vertikal / tablet horisontell) | ❌ |
| ☐ | Barn förstår nästa steg utan förälder (constitution test) | ⚠️ |

**Idag: ~40 % (2/5)**

#### Panel 3 — Veckoschema (100 % = 4/4)

| ☐ | Kriterium | Idag |
|---|-----------|------|
| ☐ | Förälder: 7-dagarseditor med ikoner | ✅ |
| ☐ | Utskrift/PDF (`print-schema.html`) | ✅ |
| ☐ | Barn: readonly veckoöversikt i appen | ❌ |
| ☐ | Resursbibliotek: statisk veckoschema-PDF | ❌ |

**Idag: ~50 % (2/4)**

#### Panel 4 — Belöningssystem (100 % = 4/4)

| ☑ | Kriterium | Idag |
|---|-----------|------|
| ☑ | Stjärnor från verkliga completions | ✅ |
| ☑ | Skattkammaren med mål + progress | ✅ (progressbar) |
| ☑ | Visuellt stjärnrutnät mot aktivt mål | ✅ (PR 1, `child-rewards-engine.js`) |
| ☐ | Resursbibliotek: utskrivbart belöningsschema-PDF | ❌ (Phase R2, EPIC R2.5) |

**App-del klar: 100 % (3/3), totalt 75 % (3/4)** — kriterium 4 hör till Resursbiblioteket (R2), inte appen.

#### Panel 5 — Övergångsstöd (100 % = 4/4)

| ☐ | Kriterium | Idag |
|---|-----------|------|
| ☐ | Time Timer på NU-kort | ✅ |
| ☐ | Push till förälder före aktivitet | ✅ |
| ☐ | `transition_support`: inline övergångssteg i barnvy | ❌ |
| ☐ | Gated via `teacch` + rollout-flöde (§4.8) | ❌ |

**Idag: ~50 % (2/4)**

#### Panel 6 — Känslostöd (100 % = 4/4)

| ☐ | Kriterium | Idag |
|---|-----------|------|
| ☐ | Post-completion känsloinput (feature `emotion_tracking`) | ⚠️ (1–10-slider) |
| ☐ | Känslokort (8 fasta nycklar) som alternativ till slider | ❌ |
| ☐ | En enda post-completion-yta (inte dubbel modal) | ⚠️ |
| ☐ | Förälderrapport: daglig sammanfattning | ❌ |

**Idag: ~25 % (1/4)** — befintlig slider är delmängd, inte målbild.

#### Panel 7 — Arbetssystem (app)

**Parkerad** — 0 % i appen är avsiktligt. 100 % för panel 7 = Resursbibliotek med TEACCH-inspirerade utskrivbara kort (§5.2).

### 2.2 Översikt

| # | Panel | Mätt idag | Var det hör hemma |
|---|-------|----------:|-------------------|
| 1 | Bildstöd – vardagsrutiner | **~40 %** | **App** |
| 2 | Nu – Nästa – Senare | **~40 %** | **App** |
| 3 | Veckoschema med bildstöd | **~50 %** | **App** + **Resursbibliotek** |
| 4 | Belöningssystem – stjärnschema | **~50 %** | **App** + **Resursbibliotek** |
| 5 | Stöd vid övergångar | **~50 %** | **App** (Extra stöd) + **Resursbibliotek** |
| 6 | Känslokort / känslostöd | **~25 %** | **App** (Basic) + **Resursbibliotek** |
| 7 | TEACCH – arbetssystem | **Parkerad** | **Resursbibliotek** endast |

**App-spår (panel 1–6):** ~42 % idag (vägt mot §2.1) → **100 %** vid Phase 3 DoD (alla kriterier avkryssade per panel 1–6).

**Fas-gates (app):** Phase 1 klar när panel 1 + 4 = 100 % · Phase 2 klar när panel 2 = 100 % och panel 3 app-del = 3/4 · Phase 3 klar när panel 5 + 6 = 100 %.

**Panel 7:** NU + Nästa + Senare + De sju frågorna + timer + sub_steps + avbockning löser samma problem som digitalt ATT GÖRA → GÖR → KLAR. **Parkerat** tills ≥5 betalande familjer + ADR.

### 2.3 Befintlig kodbas (referens)

| Område | Filer |
|--------|-------|
| Barnvy rutiner | `public/js/child-dashboard.js`, `child-dashboard-photo-cards.js` |
| NU/Nästa/Sedan | `child-dashboard.js`; kräver `view_type: now_next_later` |
| Känslo-slider (idag) | `child-dashboard.js` (`openRatingModal`, rad ~1443+); gate `emotion_tracking` |
| Känslo-API (idag) | `src/routes/ratings.js` — `POST /api/me/daily-log-items/:itemId/rate` (score 1–10) |
| Känslo-API (planerad ej) | `offline-queue.js` pekar på `POST /api/me/children/:id/emotion` — **finns inte i `src/routes/`** |
| Veckoschema | `public/js/schedule.js`, `public/print-schema.html` |
| Belöningar | `public/js/child-dashboard-rewards.js`, `child-rewards-engine.js` |
| Extra stöd | `public/js/child-seven-questions.js`, `config/seven-questions-pictograms.js` |
| Feature-registrering känsla | `scripts/seed-features.js` — slug `kanslo_tracking` / gate `emotion_tracking` (status `dev`, migration `1769500000000`) |
| `transition_support` | `config/component-feature-map.js` rad 35 → `teacch` |
| Paket-rollout | `PACKAGES_ROLLOUT_MODE` default `off` — `migrations/1806800000000_packages_v12_foundation.js` |
| Gating (server) | `src/middleware/require-component.js` (`requireComponent`) · `src/middleware/feature-gate.js` (`requireFeature` → `db/features.hasAccess`) — se §4.9 |
| SEO-guider (alla 6) | `/bildschema-app`, `/beloningssystem-barn`, `/morgonrutin-barn`, `/rutiner-npf-barn`, `/alternativ-bildschema-tavla`, `/veckoschema-bildstod` |
| Marketing-bilder | `public/images/marketing-seo/` |
| SEO-tester | `test/seo-pages.test.js` |

---

## 3. Produktprinciper (låsta)

*POS-regler citeras — inte omskrivna. Källa: `010-product.mdc`, `product-operating-system/04`, `00A`.*

| Princip | POS / regel | Konsekvens i denna plan |
|---------|-------------|-------------------------|
| Barnet är protagonist | **P-02** | Känslo- och övergångsstöd = barnåtgärder i Idag-vyn |
| Verklighet före firande | **G-01**, **R-02** | Stjärnor från completions; inga login-bonusar |
| Ingen överraskningsmodal | **00A**, Constitution 2 | **En** post-completion-yta för känsla; övergångar inline i NU |
| Inget barn-formulär | **C-01** | Barn redigerar inte veckoschema |
| Extra stöd = lugnare | `paket-v1.2` §5.3 | Inga stjärnor som dominerar NU när `teacch` aktivt |
| App ≠ utskrift | Denna plan §1 | Resursbibliotek för PDF; app för levande schema |
| Panel 7 parkerad | Denna plan Appendix A | TEACCH-inspirerat endast som utskrift |
| Delat bildbibliotek | `paket-v1.2` §7.2 | En illustration — app + PDF |
| Mobil först | **060-mobile-first** | Porträtt, tumme, 44pt barnkontroller |
| Paket-gating | ADR-005, `paket-v1.2` §9.8 | `requireFeature('transition_support')` för `transition_support` — inte fri app-feature (se §4.9) |

---

## 4. Målbild — appen (Phase 1–3)

### 4.1 Visuella rutiner → mål **100 %** (5/5 kriterier)

| Leverans | Beskrivning |
|----------|-------------|
| Delat bildbibliotek | `config/pictogram-library.js` — matar app + Resursbibliotek |
| `icon_key` i aktivitets-CRUD | Progressive disclosure i aktivitetsbiblioteket |
| GET `/api/pictograms` | Per `paket-v1.2-spec.md` §7.2 |
| Barnvy | `activity-visual.js` prioritetskedja oförändrad i princip |

### 4.2 NU – Nästa – Senare → mål **100 %** (5/5)

| Leverans | Beskrivning |
|----------|-------------|
| Standardvy | `now_next_later` som default för nya barn |
| Tre zoner | NU (stor) + Nästa + Senare |
| Copy | "Sedan" → "Senare" i barn-UI |
| Constitution test | 00A morning stress test — barn förstår nästa steg |

### 4.3 Veckoschema → mål **100 %** (4/4)

| Leverans | Beskrivning |
|----------|-------------|
| Förälder | Befintlig 7-dagarseditor |
| Barn | Readonly veckoöversikt |
| Resursbibliotek | Statisk veckoschema-PDF (Phase R2) |

### 4.4 Belöningssystem → mål **100 %** (4/4)

| Leverans | Beskrivning |
|----------|-------------|
| Stjärnrutnät | I Skattkammaren — samma completion-data |
| Basic | **Inte** låst bakom Extra stöd (`beloningssystem` → `basic_app`) |

### 4.5 Övergångsstöd → mål **100 %** (4/4) — **Familj Extra stöd (`teacch`)**

| Leverans | Beskrivning |
|----------|-------------|
| Feature slug | `transition_support` — redan i `component-feature-map.js` → `teacch` |
| Gating | Se §4.9 — `requireFeature('transition_support')` (inte fristående `hasFeature()`) |
| UI | Inline i NU-vyn: Snart → Om 5 min → Om 1 min → Nu |
| Timer + `read_aloud` | Kopplat till befintlig Time Timer |
| Push till förälder | Komplement (redan `basic_app`) |

**Inte Basic.** Övergångsstöd är kärnan i Extra stöd-paketets löfte (`paket-v1.2` §5.2, planerad v1.3+).

**Rollout-koppling (`PACKAGES_ROLLOUT_MODE`):**

| Läge | Beteende för `transition_support` |
|------|-----------------------------------|
| `off` (default idag) | Kod kan finnas; **ingen synlig UI** för familjer utan admin-tilldelad `teacch` |
| `interest` | Fake-door / mock-preview + beta-väntelista per `paket-v1.2` §9.8 |
| `purchase` | Full funktion för familjer med `teacch` |

**Phase 3-beslut (låst):** Bygg motor + UI bakom feature-gaten (§4.9). Fullständig användar-UX prioriteras när rollout ≥ `interest` **eller** admin tilldelar `teacch` till testfamiljer. Undvik att polera köp-live-UI medan `off` utan testfamiljer.

### 4.6 Känslostöd → mål **100 %** (4/4) — **Basic (`basic_app`)**

**Detta är inte en ny feature** — det är färdigställande av befintlig `emotion_tracking` / `kanslo_tracking` (`seed-features.js`, migration `1769500000000`, status `dev`).

| Beslut | Värde |
|--------|-------|
| Paket | **`basic_app`** — känsloregistrering hör till rutin-/feedback, inte Extra stöd |
| `component-feature-map.js` | Lägg till `emotion_tracking: 'basic_app'` vid implementation |
| Feature-flagga | Behåll `emotion_tracking` som slug (matchar `child-dashboard.js` rad 1834) |

#### Befintligt vs mål — en kanonisk väg

| Aspekt | Idag (skarpt) | Mål (Phase 3) |
|--------|---------------|---------------|
| UI | 1–10-slider i `#ratingModal` | **Samma modal** — förälder väljer läge |
| Läge | Endast slider | `mood_input_mode`: `cards` \| `slider` \| `off` |
| Känslokort | — | **8 fasta nycklar:** Glad, Arg, Ledsen, Trött, Orolig, Stolt, Rädd, Stressad |
| API | `POST /api/me/daily-log-items/:itemId/rate` | **Utöka samma route** med valfri `emotion_key` |
| Datamodell | `daily_log_item`-rating (score) | score **eller** emotion_key — **inte** separat emotion-tabell |
| `offline-queue.js` | `EMOTION_TOGGLE` → obefintlig route | **Avveckla** eller peka om till ratings-route |

**Princip:** Ersätt slider med kort **eller** visa kort — **aldrig båda efter samma avbockning** (00A / ingen överraskningsmodal).

**Skilj på:** interaktiv känsloinput i appen ≠ utskrivbara känslokort-PDF (Resursbibliotek, Phase R2).

#### Förälderrapport (kriterium 4/4)

| Leverans | Beskrivning |
|----------|-------------|
| Daglig sammanfattning | Förälder ser barnets känsloregistreringar per dag (emoji/nyckel + antal) |
| Placering | Idag-vy eller befintlig rapportyta — **inte** ny dashboard på Hem (P-04) |
| Data | Aggregerat från `daily_log_item`-ratings (`emotion_key` / score) |
| Epic | **3.8** — täcker sista kriteriet i §2.1 panel 6 |

*Matchar `seed-features.js` acceptance: "daglig sammanfattning för föräldrar".*

### 4.7 Panel 7 — Arbetssystem → **PARKERAD** (app)

Se Appendix A. TEACCH-inspirerat material = Resursbibliotek §5.2.

### 4.8 Relation till Paket v1.2 (sammanfattning)

| Feature | Slug | Komponent | Rollout-beroende | Fas |
|---------|------|-----------|------------------|-----|
| De sju frågorna | `de_sju_fragorna` | `teacch` | Ja | Redan delvis live |
| Visuell timer | `visual_timer` | `teacch` | Ja | Redan delvis live |
| Övergångsstöd | `transition_support` | `teacch` | **Ja** — UI synlig per §9.8 | Phase 3 |
| Känslostöd | `emotion_tracking` | **`basic_app`** *(beslut)* | Nej — Basic för alla | Phase 3 |
| Sociala berättelser | `social_stories` | `teacch` | Ja | Ej i denna plan |

**Regel:** Ett paket = ett primärt problem (`paket-v1.2` §1). Känslostöd passar Basic; övergångsstöd passar Extra stöd.

*`emotion_tracking` → `basic_app` synkad i [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) §8.3 (beslut D1).*

### 4.9 Gating — kodsanning (läs före Phase 3)

`paket-v1.2-spec.md` §8.2 nämner `hasFeature()` / `requireFeature()` i `require-component.js` — **det stämmer inte exakt mot kod idag.**

| Lager | Finns idag | Fil |
|-------|------------|-----|
| Komponent | `requireComponent('teacch')` | `src/middleware/require-component.js` |
| Feature (server) | `requireFeature(slug)` | `src/middleware/feature-gate.js` → `db/features.hasAccess()` |
| Feature (klient) | slug-lista / `hasAccess`-liknande API | t.ex. `child-dashboard.js` gate på `emotion_tracking` |
| **Finns inte** | fristående `hasFeature()`-helper | paket-specens pseudokod — **bygg inte ny** |

`db/features.hasAccess(familyId, featureSlug)` gör redan tvånivå-gatingen: den slår upp komponenten via `component-feature-map.js` (`getComponentForFeature`) och kollar att familjen har komponenten aktiv, **innan** den kollar själva feature-flaggan. Det betyder att `requireFeature(slug)` ensam räcker — den behöver inte kombineras med en separat `requireComponent()`-check på samma route.

**Praktisk konsekvens för Phase 3:**

| Feature | Server-gate | Klient-gate |
|---------|-------------|-------------|
| `transition_support` | `requireFeature('transition_support')` på nya routes (räcker — inkluderar `teacch` via map) | slug i accessible features (samma mönster som `emotion_tracking`) |
| `emotion_tracking` | `requireFeature('emotion_tracking')` om dedikerad route; ratings-route kan använda befintlig child-auth | befintlig gate i `child-dashboard.js` |

Dubbel `requireComponent('teacch')` + `requireFeature(...)` är **valfritt** på samma route — `requireFeature` räcker när slug är mappad till `teacch`.

**Före EPIC 3.1:** seeda `transition_support` i `features` + `component-feature-map.js` (finns) + verifiera `hasAccess` med testfamilj som har `teacch`.

---

## 5. Målbild — Resursbibliotek (Phase R)

### 5.1 Syfte

När någon söker *bildschema pdf*, *TEACCH bildkort*, *bildstöd autism skriva ut* eller *känslokort barn* ska de landa i **vårt** bibliotek — och möta CTA:

> *Vill du slippa skriva ut nya scheman varje gång? Testa Min Stjärndag gratis.*

### 5.2 Kategorier (första vågen)

Varje kategori = illustrationer + färdiga PDF-mallar + landningssida.

#### Morgon
Vakna · Toalett · Tvätta händer · Borsta tänder · Klä på sig · Frukost · Packa väskan · Skola

#### Kväll
Middag · Duscha · Pyjamas · Borsta tänder · Läsa bok · Sova

#### Känslor (8 fasta — samma nycklar som app §4.6)
Glad · Arg · Ledsen · Trött · Orolig · Stolt · Rädd · Stressad

#### Skola
Rast · Idrott · Matematik · Svenska · Matsal · Bibliotek

#### Hygien
Tvätta händer · Hårborstning · Naglar · Medicin

#### Övergångar
Snart · Om fem minuter · Nu · Färdig · Vänta

#### TEACCH-inspirerat
Först · Sedan · Klar · Paus · Arbeta · Vila · Hjälp

### 5.3 Sidtyper

| Typ | URL-mönster | Exempel |
|-----|-------------|---------|
| Hub | `/resurser` | Översikt alla kategorier |
| Kategori | `/resurser/{kategori}` | `/resurser/morgon` |
| Bildkort | `/resurser/bildkort/{kategori}` | `/resurser/bildkort/kanslor` |
| PDF-mall | `/resurser/pdf/{mall}` | `/resurser/pdf/morgonschema` |
| Long-tail SEO | `/resurser/{sökintent}` | `/resurser/bildkort-adhd` |

### 5.4–5.5

Oförändrat från v1.1 (sidinnehåll, teknik, PDF v1 statisk).

### 5.6 Relation till befintlig SEO

Alla **6 guider** länkar till resurser:

| Guide | Resurs-länk (exempel) |
|-------|----------------------|
| `/bildschema-app` | `/resurser/pdf/bildschema` |
| `/morgonrutin-barn` | `/resurser/pdf/morgonschema` |
| `/beloningssystem-barn` | `/resurser/pdf/beloningsschema` |
| `/rutiner-npf-barn` | `/resurser/bildkort/overgangar` |
| `/alternativ-bildschema-tavla` | `/resurser` (hub) |
| `/veckoschema-bildstod` | `/resurser/pdf/veckoschema` |

---

## 6. Faser och tidslinje

```
SPÅR A — APP
  Phase 0   Marknadsjustering                    1 v
  Phase 1   Polish kärna (panel 1–4)             3–4 v
  Phase 2   NU/Nästa/Senare + barnens veckovy    3–4 v
  Phase 3   Övergångar (teacch) + känsla (Basic) 4–6 v

SPÅR B — RESURSBIBLIOTEK
  Phase R0  Hub + mall                           2 v
  Phase R1  Morgon + Kväll                        3–4 v
  Phase R2  Känslor + Övergångar + TEACCH-insp.  3–4 v
  Phase R3  Long-tail SEO                        löpande

PARKERAT
  Panel 7   Digitalt arbetssystem i appen
```

### Kapacitet och ägarskap

| Spår | Andel | Primär ägare | Sekundär |
|------|-------|--------------|----------|
| App Phase 1–2 | ~40 % | Implementation (backend + child UX) | CPO-gate på UX |
| App Phase 3 | ~20 % | Implementation | CPO + paket-rollout-beslut |
| Resursbibliotek R0–R2 | ~30 % | Growth/Content + Implementation | Design (illustrationer) |
| Design (bildbibliotek, EPIC 1.1) | ~15 % (inom ovan) | Design | Implementation (integration) |
| Aktiveringsprogram (parallellt) | ~10 % koordinering | Aktiveringsägare | — |

*Följer `aktivering-exekveringsplan.md` (~75 % activation) — bildstöd-Phase 1–2 ska **accelerera första stjärnan**, inte flytta activation-teamet till Resurs R3.*

**TASK_ROUTER:** App-epics → implementation-agent. Resurs-epics → growth/content + implementation. Paket/rollout-beslut → produktägare före Phase 3.1 merge.

---

### Phase 0 — Marknadsjustering

| # | Uppgift |
|---|---------|
| 0.1 | Tvåspårsbudskap på landning + guider |
| 0.2 | Inventera `marketing-seo/` |
| 0.3 | Ta bort löften om digitalt arbetssystem |
| 0.4 | Legal: TEACCH endast "inspirerat" |
| 0.5 | Synka copy med `PACKAGES_ROLLOUT_MODE=off` — inga köplöften om Extra stöd |

---

### Phase 1 — Polish app-kärna

| # | Epic |
|---|------|
| 1.1 | Delat bildbibliotek v1 |
| 1.2 | `icon_key` i aktivitets-CRUD |
| 1.3 | GET `/api/pictograms` |
| 1.4 | Stjärnrutnät i Skattkammaren |
| 1.5 | App-marketing screenshots |
| 1.6 | `test/bildstod-core.test.js` |

---

### Phase 2 — NU/Nästa/Senare + veckovy

| # | Epic |
|---|------|
| 2.1–2.5 | Oförändrat från v1.1 |

---

### Phase 3 — Övergångar + känslostöd

| # | Epic | Paket | Rollout |
|---|------|-------|---------|
| 3.1 | Övergångsmotor + inline UI | `teacch` | Synlig per §4.5 |
| 3.2 | Lead-tider i `child-settings.js` | `teacch` | Samma |
| 3.3 | Fake-door / intresse-CTA om `interest` | `teacch` | `paket-v1.2` §9.8 |
| 3.4 | Känslokort i befintlig `ratingModal` | `basic_app` | Oberoende av rollout |
| 3.5 | Utöka `ratings.js` med `emotion_key` | `basic_app` | Ersätter planerad `/emotion`-route |
| 3.6 | `emotion_tracking: 'basic_app'` i feature-map | — | — |
| 3.7 | Avveckla `EMOTION_TOGGLE` i offline-queue | — | Peka om till ratings |
| 3.8 | Daglig känslosammanfattning för förälder | `basic_app` | Idag eller rapporter; aggregering per barn/dag |

**Phase 3 gate:** Panel 5 + 6 = 100 % (§2.1) — kräver 3.1–3.8 enligt paket/rollout för 5, 3.4–3.8 för 6.

**Gating:** läs §4.9 innan 3.1 påbörjas — `requireFeature('transition_support')` räcker, bygg ingen ny `hasFeature()`-helper.

---

### Phase R0 — Resursbibliotek grund

| # | Epic | Leverans |
|---|------|----------|
| R0.1 | Informationsarkitektur | `/resurser` hub |
| R0.2 | Sidmall | SEO-guide-layout + nedladdning + CTA |
| R0.3 | Routing + sitemap | `seo-pages.js` · **utöka** `test/seo-pages.test.js` (inte ny testsvit) |
| R0.4 | UTM-schema | `utm_content=resurs-{slug}` |

---

### Phase R1–R3

Oförändrat från v1.1. R1.6 länkar från alla 6 guider (§5.6).

---

## 7. Prioriteringsmatris

| Insats | Spår | Paket | Prioritet |
|--------|------|-------|-----------|
| Delat bildbibliotek | Båda | — | **P0** |
| NU/Nästa/Senare | App | Basic | **P0** |
| Stjärnrutnät | App | Basic | **P0** |
| Resursbibliotek hub + morgon/kväll | SEO | — | **P0** |
| Känslokort UI + föräldersammanfattning (3.4–3.8) | App | Basic | **P1** |
| Övergångsstöd (`transition_support`) | App | Extra stöd | **P1** *(gated)* |
| Barnens veckovy | App | Basic | **P1** |
| Känslokort PDF | SEO | — | **P1** |
| Long-tail 100+ sidor | SEO | — | **P2** |
| Digitalt arbetssystem | — | — | **Parkerad** |

---

## 8. Mätetal

| Metric | Ägare | Baseline | Mål |
|--------|-------|----------|-----|
| **Family Day 14 retention** | Aktiveringsprogram (North Star) | Experiment | Oförändrat — denna plan stödjer, ersätter inte |
| `activation_rate_48h` | Aktiveringsprogram (P0) | ~17 % ever | +10 pp — attribution via UTM |
| Organisk trafik `/resurser/*` | Resursbibliotek | 0 | 1 000 sessions/mån (R2) |
| PDF-nedladdningar | Resursbibliotek | 0 | Per `resurs-{slug}` |
| Resurs → registrering | Resursbibliotek | — | ≥3 % |
| `transition_support` usage | Extra stöd | 0 | Mät när rollout ≥ `interest` |
| Panel-kriterier §2.1 (app) | Denna plan | ~42 % (vägt) | **100 %** panel 1–6 vid Phase 3 DoD |

---

## 9. Marknadsföring

Oförändrat från v1.1 + tillägg:

| Läge | Copy-regel |
|------|------------|
| `PACKAGES_ROLLOUT_MODE=off` | Nämn Extra stöd som "kommer" / beta-intresse — inte "köp nu" |
| Resursbibliotek | Alltid gratis nedladdning + app-CTA |

---

## 10. Risker

| Risk | Åtgärd |
|------|--------|
| Dubbel känslo-modal (slider + kort) | §4.6 — en modal, förälderval |
| Phase 3 byggd utan köpväg | Rollout-gate §4.5; fake-door per §9.8 |
| `emotion_tracking` byggs två gånger | Följ `seed-features.js` + utöka `ratings.js` |
| Metric-konflikt med aktivering | §1 attribution + separata dashboards |
| Bygga ny `hasFeature()`-helper i onödan | §4.9 kodsanning — använd `requireFeature`/`hasAccess` |
| Ändring i `child-dashboard.js` bryter för aktiva familjer utan pilotnät (D7) | `test:gate` grön + self-review (180) obligatoriskt före varje merge; håll PR:ar små (§6 sekvensering) så en trasig ändring är snabb att identifiera och `git revert` |
| R2/R3 byggs utan validerad efterfrågan (D8) | Acceptera som medveten satsning på räckvidd — mät Search Console löpande (R3.3) och nedladdningar per `resurs-{slug}` (§8) för att kunna skala ner om det inte konverterar |

---

## 11. Definition of Done

### App-spår
- [ ] Panel 1, 2, 4, 5, 6: alla kriterier §2.1 avkryssade (100 %)
- [ ] Panel 3: app-kriterier 1–3 avkryssade (3/4); kriterium 4 (statisk vecko-PDF) ingår i Resursbibliotek DoD
- [ ] Panel 7 parkerad
- [ ] `emotion_tracking` mappad till `basic_app`
- [ ] `transition_support` bakom `requireFeature` (§4.9) + rollout
- [ ] `npm run test:gate` grön · Self-review (180) · POS citerat

### Resursbibliotek
- [ ] `/resurser` hub · ≥20 PDF:er (R2)
- [ ] `test/seo-pages.test.js` utökad för `/resurser/*`
- [ ] Alla 6 guider länkar till resurser

---

## 12. Öppna beslut (låsta i v1.2)

| # | Beslut | v1.2 |
|---|--------|------|
| D1 | Känslostöd Basic eller Extra stöd? | **Basic** (`basic_app`) |
| D2 | Separat `/api/me/children/:id/emotion`? | **Nej** — utöka `ratings.js` |
| D3 | Slider + kort samtidigt? | **Nej** — `mood_input_mode` väljer ett |
| D4 | Panel 7 i appen? | **Parkerad** |
| D5 | Phase 3 övergångar före rollout-beslut? | **Motor ja, köp-UI nej** tills `interest` eller testfamiljer |
| D6 | Bygg ny `hasFeature()`-helper? | **Nej** — `requireFeature`/`hasAccess` räcker (§4.9) |
| D7 | Pilotgrupp/staged rollout till delmängd familjer innan bred lansering? | **Nej** — ~20 aktiva av 200 registrerade; `test:gate` + normal deploy-disciplin räcker på den här skalan. Ingen `family_features`-pilotmekanism byggs. |
| D8 | Vänta med Phase R2/R3 tills R0/R1 visat trafik? | **Nej** — bygg R0–R3 som en sammanhängande linje. Medveten satsning på räckvidd/"sticka ut" framför stegvis validering; mät löpande (R3.3) istället för att gata byggstarten. |
| D9 | Fake-door-CTA (EPIC 3.3) för Extra stöd-intresse? | **Nej** — ge `teacch` direkt till 3–5 kända familjer med NPF-behov via `grantComponent()`, samla muntlig feedback innan någon köp-UI byggs. |

---

## 13. Nästa steg

1. **Godkänn v1.2.3** — rollout-beslut D7–D9 efter produktägarens genomgång av rekommendationerna.
2. **Phase 0** — copy + rollout-läge (endast EPIC 0.3 + 0.4, resten löpande). *(Marknadsjustering — audit-underlag tas fram separat och länkas här när klart.)*
3. **Phase 1.1 + R0** parallellt.
4. **Uppdatera `component-feature-map.js`** i samma PR som Phase 3.6 (inte före beslut dokumenterat här).

---

## Appendix A — Panel 7 (parkerad)

Ett digitalt ATT GÖRA → GÖR → KLAR-system duplicerar NU/Nästa/Senare + sub_steps. Ersättning: De sju frågorna + utskrivbara TEACCH-inspirerade kort i Resursbiblioteket.

---

## Appendix B — Changelog v1.1 → v1.2

| Punkt | Åtgärd |
|-------|--------|
| A1 Paket v1.2 | §4.5, §4.8, rollout-tabell, Phase 3 gated |
| A2 emotion_tracking | §4.6 refererar `seed-features.js` / migration |
| A3 Dubbel känslo-UI | §4.6 kanonisk väg, en modal |
| A4 `/emotion` route | Korrigerat — endast offline-queue-stub |
| A5 North Star | §1 — Family Day 14 vs ledande indikator |
| B6 Mätkriterier | §2.1 checklistor per panel |
| B7 POS-ID | §3 regelkolumn |
| B8 Aktivering | §1 attribution, §6 kapacitet |
| B9 Ägarskap | §6 TASK_ROUTER |
| C Öppna beslut | §12 låsta |
| D Guider, test, 8 känslor | §2.3, §5.2, R0.3 |

---

## Appendix C — Changelog v1.2 → v1.2.1

| Punkt | Åtgärd |
|-------|--------|
| Måldefinition | §1 + §2.2 — en "klar"-definition: 100 % = alla §2.1-kriterier; borttagna aggregat ≥90 % / ~85 % |
| Fas-gates | §1 fas→panel-tabell; §2.2 fas-gates; §6 Phase 3 gate |
| Panel 6 gap | Epic **3.8** förälderrapport; §4.6 kriterium 4/4 |
| Mätetal | §8 panel-rad synkad med DoD |

---

## Appendix D — Changelog v1.2.1 → v1.2.2

| Punkt | Åtgärd |
|-------|--------|
| Gating-kodsanning | Ny §4.9 — `requireFeature`/`hasAccess` (`feature-gate.js`) är den faktiska implementationen, inte en fristående `hasFeature()`-helper. `paket-v1.2-spec.md` §8.2 flaggad som pseudokod, inte exakt kod-referens |
| D1 synk | `emotion_tracking` tillagt under `basic_app` i `paket-v1.2-spec.md` §8.3, med fotnot till denna plan |
| D6 tillagt | §12 — beslut att inte bygga ny `hasFeature()`-helper |
| Designkapacitet | §6 — egen rad för bildbibliotek-design (~15 %); EPIC 1.1 (tasklist) tillåter emoji-fallback i Phase 1 |
| §4.5 / §3 | Gating-rader uppdaterade till att peka på §4.9 istället för föråldrad `requireComponent + hasFeature`-formulering |

---

## Appendix E — Changelog v1.2.2 → v1.2.3

Produktägaren gick igenom en strukturerad rekommendationslista (kostnads-/riskanalys av byggordning) och fattade beslut per punkt.

| Punkt | Beslut | Åtgärd i planen |
|-------|--------|------------------|
| Phase 3 hold | Godkänd | Oförändrat — D5 kvarstår: motor bakom `requireFeature`, ingen köp-UI förrän rollout ≥ `interest` eller testfamiljer |
| Minimal PR 0 | Godkänd | §13 — endast EPIC 0.3 + 0.4 är blockerande, resten löpande |
| Emoji-only bildbibliotek | Godkänd | Oförändrat — redan dokumenterat i §6 / tasklist EPIC 1.1 |
| PR 1 + R0 parallellt | Godkänd | Oförändrat — filöverlapp verifierad = ingen konflikt |
| PR 2 → PR 3 sekventiellt | Godkänd | Oförändrat — delar `child-dashboard.js`/`child-settings.js` |
| Vänta med R2/R3 på trafikdata | **Avvisad** | Nytt beslut **D8** — bygg R0–R3 sammanhängande, medveten satsning på räckvidd |
| Pilotgrupp/staged rollout | **Avvisad** | Nytt beslut **D7** — verklig skala är ~20 aktiva av 200 registrerade (ny delsektion i §1); `test:gate` + normal disciplin ersätter pilotmekanism |
| Hoppa fake-door-UI | Godkänd | Nytt beslut **D9** — `grantComponent()` till 3–5 kända NPF-familjer istället för EPIC 3.3:s intresse-CTA |
| Rollback-brytare i PR 1/2 | Godkänd | Se §10 Risker — mildrat via små PR:ar + `test:gate` istället för familjenivå-flagga (konsekvens av D7) |

**Ny kontext som drev besluten:** verklig användarbas är ~200 registrerade / ~20 dagligen aktiva familjer (§1), inte 200 samtidiga — vilket sänker blast radius för D7 väsentligt jämfört med det ursprungliga antagandet. Produktvision tillagd i bakgrunden för D8/D9: *"en djupare produkt, enkel att förstå och komma igång med, som folk tipsar vänner om och som barn tjatar om att få använda."* Observera (ej i denna plans scope): virality/delning täcks av det separata `docs/referral-program.md` (ej byggt); "barn vill använda appen" drivs primärt av Skattkammar-universumet, inte av bildstöd-arbetet — bildstöd löser *begriplighet*, inte *lockelse*.

---

*Version 1.2.3 · Senast uppdaterad 2026-07-02*
