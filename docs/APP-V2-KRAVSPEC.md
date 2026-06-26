# App v2 — Kravspecifikation

**Skapad:** 2026-06-26  
**Version:** 0.2 (utkast)  
**Status:** Samlat kravdokument — grund för v2-planering och sprintprioritering  
**Ägare:** Produkt  
**Målgrupp v2:** Barn 4–12 år och deras vårdnadshavare (pedagoger som tillägg)

> Det här dokumentet är **taket** över v2. Detaljer per yta finns i länkade underspecar — de ska inte dupliceras här utan refereras.

---

## Relaterade dokument

| Dokument | Roll i v2 |
|----------|-----------|
| [`barnmeny-v2.md`](./barnmeny-v2.md) | Barnsidans IA, tre världar, migration |
| [`vuxenmeny-v2.md`](./vuxenmeny-v2.md) | Föräldrasidans IA, hubbar, domänmodell |
| [`vuxenmeny-v2-operations-checklist.md`](./vuxenmeny-v2-operations-checklist.md) | Acceptance + KX-rader (förälder) |
| [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) | Tre lager: Idag / Skattkammaren / Familj |
| [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) | Hårda gränser mellan lager |
| [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) | Implementation-grade systemdesign |
| [`implementation-plan-3-layers.md`](./implementation-plan-3-layers.md) | Fasplan tre-lager-refaktor |
| [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) | Paket, komponenter, pedagog, TEACCH |
| [`for-dig-spec.md`](./for-dig-spec.md) | För dig — **redan levererat** (underhåll; ej v2-bygge) |
| [`kravspec-app-webb.md`](./kravspec-app-webb.md) | Auth, roller, säkerhet, plattform |
| [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md) | KPI:er, aktivering, North Star |
| [`admin-v2/ADMIN-V2-DELIVERY.md`](./admin-v2/ADMIN-V2-DELIVERY.md) | Admin v2 (levererat) |
| [`magic-view-rollout.md`](./magic-view-rollout.md) | Magic-vy global rollout |
| [`config/component-feature-map.js`](../config/component-feature-map.js) | Feature → paket → placement |

---

## 0. Sammanfattning (TL;DR)

**App v2** är inte en ny produkt — det är en **konsekvent omorganisering** av samma kärnmotor (schema → aktiviteter → avbockning → stjärnor → belöningar) kring användarens faktiska mentala modell.

| Dimension | v1 (idag) | v2 (mål) |
|-----------|-----------|----------|
| Föräldernav | Feature-lista, dubbla källor (LEGACY/ROLLOUT), Mer/Extra | Fem jobb-flikar: Hem · Planering · Belöningar · För dig · Familj |
| Barnnav | Classic/magic/rollout, 4+ parallella nav-system | Tre världar: Idag · Min värld · Mina personer |
| Ny funktion | Ofta ny flik eller gömd | Placement i befintlig domän |
| Paket | Synlig i menyn | Utökar **djup**, inte bredd |
| Backend | — | **Oförändrad affärslogik** — nya hubbar och routes som tunt lager |

**Strategiskt mål:** Gör det lättare att **aktivera** (första stjärnan), **använda dagligen** (Idag som OS) och **växa in i paket** utan navigationskaos.

**North Star (oförändrad):** Family Day 14-retention — familj aktiv dag 13–15 efter start. Se [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md).

---

## 1. Bakgrund & problem

### 1.1 Varför v2?

Produktens **kärnvärde** fungerar för aktiva familjer (särskilt NPF 4–12). Men informationsarkitekturen har vuxit organiskt:

| Symptom | Konsekvens |
|---------|------------|
| Förälder: Schema, Skatt, Mer, Extra, Familj, Inställningar i olika kombinationer | Användaren navigerar **funktioner**, inte **jobb** |
| Barn: classic vs magic vs package-nav (2–4 flikar) | Dubbel testyta, inkonsekvent startflik |
| `/skattkammaren` = demo + förälder + barn | Förvirrande URL-semantik |
| Barninställningar i drawer + `/child-settings` | Fragmenterad barnadministration |
| Paket synliga som menypunkter | Säljbarhet och UX konkurrerar |

Rotorsak i aktiveringsdata (2026-06): **43 % av familjer har aldrig någon aktivitetssignal** — produkten känns som "tom canvas" innan värdet syns. v2 adresserar detta genom tydligare **Hem** (readiness) och barnets **coach-loop** — inte genom nytt För dig-arbete (redan på plats).

### 1.2 Vad v2 inte är

| v2 är | v2 är inte |
|-------|------------|
| Ny navigation och presentation | Omskrivning av schedule/daily-log/rewards-API |
| Hub-sidor som länkar till befintliga routes | Flytt av affärslogik till nya filer |
| En källa för nav (`nav-config.js`, `child-worlds.js`) | React-rewrite (långsiktig target, ej v2-blocker) |
| Inkrementell migration med redirects | Big-bang-lansering |
| Konsekvent 4–12-upplevelse | Ungdoms-/vuxenprodukt (horisont, §3.3) |

---

## 2. Vision

> **Appen hjälper familjen att få vardagen att fungera — barnet vet vad som händer nu, vuxna planerar utan friktion, och belöningar ger mening utan att stjäla fokus från handlingen.**

### 2.1 Produktprinciper (låsta)

1. **Intent före feature** — navigation svarar på användarens fråga, inte systemets modulnamn.
2. **Idag är operativsystemet** — ~80 % av barnets tid ska landa i handling, inte utforskning.
3. **Tre lager, tre mentala modeller** — Idag (göra) · Min värld (bli) · Mina personer (höra till). Blanda aldrig på samma skärm. Se [`separation-contract-barnapp.md`](./separation-contract-barnapp.md).
4. **Paket utökar djup** — TEACCH, rapporter och pedagog läggs som placements i befintliga domäner, inte som nya toppflikar.
5. **Samma data, adaptiv presentation** — stödnivå och ålder ändrar *hur* saker visas, inte *var* de bor.
6. **Coach, inte verktyg** — Hem (läge + nästa steg) och barnets coach-loop guidar till handling. För dig finns redan för 4–12-föräldrar; v2 bygger inte ut den.
7. **Backend-first stabilitet** — befintliga API:er och tabeller återanvänds; v2 är primärt frontend-IA.

### 2.2 Framgångsmått

| KPI | Baslinje | v2-mål (indikatorer) |
|-----|----------|----------------------|
| Aktivering (första stjärnan) | 17 % | ↑ via tydligare Hem/onboarding/barn-inloggning |
| Day 14-retention | ~26 % av aktiverade | ↑ via Idag-fokus + coach |
| Barn: tid till första avbockning | Ej mätt konsekvent | `child_today_first_complete` < 60 s efter login |
| Förälder: hub-adoption | — | `nav_hub_click` planning/rewards > direktlänkar |
| Barnprofil-adoption | — | `/family/child/:id` ≥ 80 % av barnsessioner (fas 3) |
| Supportärenden "var hittar jag…" | Kvalitativ | ↓ efter nav-enhetlighet |

Detaljerad KPI-plan: [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md).

---

## 3. Omfattning

### 3.1 In scope (v2)

| Område | Leverans |
|--------|----------|
| **Föräldernav v2** | `nav-config.js`, fem flikar, hubbar `/planning` + `/rewards` |
| **Barnnav v2** | `child-worlds.js`, tre världar, routes `/child/today` · `/child/world` · `/child/family` |
| **Barnprofil** | `/family/child/:id` samlar schema, framsteg, PIN, inställningar |
| **Settings-sanering** | Konto, GDPR, prenumeration i `/settings` — inte i Familj-fliken |
| **Hem som coach** | Readiness-kort med tydliga nästa steg (nytt v2-arbete) |
| **Barn coach-loop** | Kort bekräftelse efter aktivitet → pekar till NÄSTA |
| **Avveckla** | Classic/magic-nav-split, Mer/Extra-flikar, dubbla LEGACY/ROLLOUT-källor |
| **Redirects** | Permanent redirect-tabell (§11) |
| **Analytics** | Events vid varje UX-förändring (§10) |
| **Paket-placements** | `CAPABILITIES` / `CHILD_CAPABILITIES` när paket aktiveras |

### 3.2 Explicit out of scope (v2)

| Post | Varför | Var dokumenterat |
|------|--------|------------------|
| Omskrivning av `/schedule`, `/library`, `/reports` | Non-goal | `vuxenmeny-v2.md` §0 |
| Ny backend för befintliga flows | Non-goal | `vuxenmeny-v2.md` §0 |
| React SPA-migration | Långsiktig target | `engineering-architecture-barnapp.md` |
| AI-startschema (ACT-1) | Parallellt aktiveringsarbete | `act-1-ai-startschema-spec.md` |
| Referral, SEO-artiklar | Tillväxt, ej IA | `tillvaxt-retention-krav.md` |
| Admin v2 | **Redan levererat** | `admin-v2/ADMIN-V2-DELIVERY.md` |
| **För dig (ny funktionalitet)** | **Redan levererat** för nuvarande målgrupp | `for-dig-spec.md` — v2 behåller fliken, bygger inte ut |
| Stripe / webb-betalning | Borttaget; IAP only | `docs/app-store-iap.md` |

### 3.3 Horisont (ej v2 — framtida utvärdering)

Följande diskuterades som produktutvidgning men **ingår inte i v2-krav**:

| Segment | Krav på framtida version |
|---------|--------------------------|
| Tonåringar 13–17 | Eget konto, integritetsnivåer, dämpad gamification |
| Unga vuxna 18–25 | Självregistrering, NPF/ADHD-positionering, ingen "barnprofil"-UX |
| Vuxna 25+ | Hushållsläge, professionellt stöd (bygg på pedagog-mönstret) |

**För dig och nästa målgrupp:** För dig är utformat för vårdnadshavare till barn 4–12 (problemorienterade familjemål, åldersfiltrering via `child.birthday`). Det **ingår inte** i planen för ungdom/vuxen — där behövs annan coachning (egna mål, integritet, självstyrd planering), inte en vidareutveckling av För dig-fliken.

Teknisk förberedelse i v2 (låg kostnad): `child.birthday` + `child_view_config` kan senare utökas med `age_band` utan nav-refaktor.

---

## 4. Målgrupp & roller

### 4.1 Primär målgrupp

| Persona | Behov | v2-yta |
|---------|-------|--------|
| **Förälder (primary/shared)** | Överblick, planera, belöna, bjuda in | Fem flikar + barnprofil |
| **Barn 4–12** | Veta vad som händer nu, känna progression, trygghet | Tre världar |
| **Pedagog** | Följa tilldelade barn, anteckna, skolaktiviteter | Separat nav (`pedagog_view`) — oförändrat i v2 |
| **Medförälder delad vårdnad** | Se endast sina barn | `parent_child`-länk — oförändrat |

### 4.2 Kontotyper (`account_type`)

| Typ | v2-beteende |
|-----|-------------|
| `family` | Standard föräldravvy |
| `educator` | Redirect till pedagog-översikt; separat nav |
| `dual` | Växling via avatar-meny |

Säkerhetskrav oförändrade: [`kravspec-app-webb.md`](./kravspec-app-webb.md) §0–§2.

---

## 5. Systemarkitektur (v2)

### 5.1 Tre engines (barn)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  IDAG       │────▶│  MIN VÄRLD   │────▶│  MINA       │
│  (action)   │     │  (meaning)   │     │  PERSONER   │
└─────────────┘     └──────────────┘     └─────────────┘
  tasks→complete      stars→unlocks       relation→trygghet
```

**Hård regel:** Ingen skärm blandar engines. Detaljer: [`separation-contract-barnapp.md`](./separation-contract-barnapp.md).

### 5.2 Fyra domäner (vuxen)

| Domän | Parent intent | v2-nav |
|-------|---------------|--------|
| `home` | *Här är läget* | Hem |
| `planning` | *Jag vill planera* | Planering (hub) |
| `rewards` | *Stjärnor och belöningar* | Belöningar (hub) |
| `for_you` | *Vad rekommenderar ni?* | För dig *(befintlig flik — behåll i nav, ej v2-bygge)* |
| `family` | *Vilka är med?* | Familj |
| `child_profile` | *Allt om ett barn* | `/family/child/:id` |
| `settings` | *Mitt konto* | Avatar → Inställningar |
| `pedagog_view` | *Mina elever* | Separat universum |

### 5.3 Capabilities-modellen

Varje funktion deklareras med **obligatoriska fält**:

```js
{
  id: 'reports',              // stabil nyckel
  feature: 'reporting',       // access gate (null = basic)
  domain: 'child_progress',   // parent intent
  placements: ['child_profile', 'rewards_hub'],  // var UI kan visas
  label: 'Rapporter',
  href: '/reports',
}
```

**Access** (har familjen köpt?) och **visibility** (ska vi visa nu?) är separata lager. Se `vuxenmeny-v2.md` §3.

Barn motsvarighet: `CHILD_CAPABILITIES` med exakt **en** `primaryPlacement` per capability.

### 5.4 Tekniska källor (single source of truth)

| Fil | Äger |
|-----|------|
| `public/js/nav-config.js` | Förälder: `PRIMARY_NAV`, `CAPABILITIES`, hubbar |
| `public/js/child-worlds.js` | Barn: `CHILD_WORLDS`, etiketter, paths |
| `public/js/child-capabilities.js` | Barn: feature-placements |
| `public/js/child-placements.js` | Barn: visibility per placement |
| `config/component-feature-map.js` | Feature → paket → komponent |

**Konsumenter** (ska läsa config, inte hårdkoda):

- `native-tab-bar.js`
- `parent-magic-shell.js` / `parent-magic-auto.js`
- `mobile-nav.js`
- `child-shell.js` (mål)
- `child-layer-router.js` (hash-fallback under migration)

---

## 6. Funktionella krav

### 6.1 Föräldervy

#### FR-P-01 Primärnav

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-01.1 | Exakt fem bottenflikar: Hem, Planering, Belöningar, För dig, Familj | Samma på native, mobil webb, desktop sidebar |
| FR-P-01.2 | Ingen Mer- eller Extra-flik | `nav-config.js` är enda källan |
| FR-P-01.3 | Inställningar endast via avatar-meny | Inte i bottennav |
| FR-P-01.4 | Notiser via header-klocka | `placement: header_notifications` |

#### FR-P-02 Planeringshub (`/planning`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-02.1 | Tunn hub som länkar till befintliga routes | `/schedule`, `/calendar`, `/activities`, `/library`, `/assign-schedule` |
| FR-P-02.2 | TEACCH visas här när köpt + aktiverat | `feature: teacch`, `placement: planning_hub` |
| FR-P-02.3 | Ingen duplicerad schedule-logik | Hub = länkar + kort beskrivning |

#### FR-P-03 Belöningshub (`/rewards`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-03.1 | Tunn hub för stjärnor, belöningar, kista, museum | Länkar till befintliga vyer |
| FR-P-03.2 | Inloggad förälder: `/skattkammaren` → redirect `/rewards` | Aldrig loop |
| FR-P-03.3 | Publik demo: `/skattkammaren?demo=1` oförändrad | Barn/demo ej påverkad |

#### FR-P-04 Hem (coach-lager)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-04.1 | Statuskort per barn: Idag X/Y, ⭐, varningar (PIN saknas, etc.) | `home-readiness.js` |
| FR-P-04.2 | Kort leder till **handling** (inte bara info) | `readiness_action_click` event |
| FR-P-04.3 | Distinkt från För dig: Hem = läge, För dig = rekommendation | Produktcopy granskad |

#### FR-P-05 För dig (redan levererat — regressionskrav)

För dig är **på plats** för målgruppen 4–12. v2 ska **inte** planera ny funktionalitet här — bara behålla fliken i `PRIMARY_NAV` och säkerställa att nav-migrationen inte bryter befintlig route.

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-05.1 | Fliken kvar i femfliks-nav | `/for-dig` nåbar från alla plattformar |
| FR-P-05.2 | Ingen v2-scope för nya mål, Aktivera-flöden eller V3–V5 i `for-dig-spec.md` | Underhåll vid behov, separat spår |
| FR-P-05.3 | Ej relevant för nästa målgrupp (13+) | Horisont §3.3 — ersätts av annan modell, inte För dig v2 |

#### FR-P-06 Familj & barnprofil

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-06.1 | `/family` visar barn, vuxna, pedagoger — inte kontoinställningar | PIN/GDPR flyttat till settings |
| FR-P-06.2 | `/family/child/:id` samlar allt om ett barn | Schema, framsteg, PIN, vy, foto |
| FR-P-06.3 | Framsteg som domän: stjärnor, historik, rapporter, mål | Rapporter under Framsteg, inte Belöningar |
| FR-P-06.4 | `/child-settings` → redirect barnprofil | Permanent efter fas 7 |
| FR-P-06.5 | Barn-drawer avvecklas när analytics OK | ≥ 80 % adoption 14 dagar |

#### FR-P-07 Inställningar

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-07.1 | Grupperad meny: Profil, Notiser, Säkerhet, App, Data, Prenumeration | Magic settings-meny |
| FR-P-07.2 | `/upgrade` → `/settings#prenumeration` | Redirect |
| FR-P-07.3 | Pedagog-växling i avatar-meny (dual) | Inte i Familj-fliken |

### 6.2 Barnvy

#### FR-B-01 Primärvärldar (Barnregeln)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-01.1 | Exakt tre världar: Idag, Min värld, Mina personer | Ingen fjärde primärvärld |
| FR-B-01.2 | Ny funktion får **inte** skapa ny värld | Code review + §Barnregel i `barnmeny-v2.md` |
| FR-B-01.3 | Login → animation (max 2 s) → **Idag** | Aldrig Hem/Min värld som start |
| FR-B-01.4 | `CHILD_WORLDS` är enda IA-källa | Ingen classic/magic/rollout-nav-split |

#### FR-B-02 Idag (`/child/today`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-02.1 | NU / NÄSTA / SEN eller dagsektioner — max 5 synliga uppdrag | `child-today-focus.js`, `child-today-tasks.js` |
| FR-B-02.2 | Delsteg (sub_steps) inline eller expanderbara | Befintlig daily-log |
| FR-B-02.3 | Ingen kalender, statistik eller universum på Idag-skärmen | Separation contract |
| FR-B-02.4 | Kompakt mål (1 rad) tillåtet | `goal_preview` |
| FR-B-02.5 | CTA till Min värld sekundär — inte konkurrerande | QuestCTA längst ner |

#### FR-B-03 Min värld (`/child/world`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-03.1 | All progression: stjärnor, rum, avatar, samlingar, museum | Internt: Skattkammaren |
| FR-B-03.2 | Ingen task-checklist här | Route guard |
| FR-B-03.3 | Känns som belöning för handling — inte huvuddestination | Inte default efter login |

#### FR-B-04 Mina personer (`/child/family`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-04.1 | "De som hjälper mig" — personer först | Ingen social graph |
| FR-B-04.2 | Familjeprojekt / berättelse när live | `familjehallen_v0` |
| FR-B-04.3 | Barn kan inte skriva familjedata | Read-only child UI |

#### FR-B-05 Coach-loop

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-05.1 | Kort bekräftelse efter avklarad aktivitet | Ej chat-bot |
| FR-B-05.2 | Leder till NÄSTA steg — aldrig till meny | `today_coach_post_activity` |
| FR-B-05.3 | Valfritt att expandera; `aria-live` för a11y | WCAG-granskning |

#### FR-B-06 Adaptivt stöd

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-06.1 | Samma `daily_log` data, olika rendering per barn | `child_view_config` |
| FR-B-06.2 | Stöd ändrar upplevelse — aldrig informationsarkitektur | TEACCH = overlay på Idag |
| FR-B-06.3 | Personliga etiketter per ålder inom 4–12 | `labels.young` / `default` / `personal` |

#### FR-B-07 System & säkerhet

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-07.1 | Byt barn, logga ut bakom vuxenikon + Parental Gate | `parental-gate.js` |
| FR-B-07.2 | `session-gate.js` inkluderar `/child/*` | Förälder blockeras på barnroutes |
| FR-B-07.3 | Barn-session: endast child JWT | Ingen `/api/family/*` |

#### FR-B-08 Presentation

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-08.1 | `presentationMode`: mobile, tablet, desktop, native | Styr placering, inte antal världar |
| FR-B-08.2 | Tema/färger via `child_view_config` — inte separat app | Magic = utseende, inte IA |

### 6.3 Pedagogläge

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-ED-01 | Separat nav-universum — inga föräldraflikar | `PEDAGOG_PRIMARY_NAV` |
| FR-ED-02 | Pedagog skapar endast `source='educator'` data | Konstitutionell regel i `paket-v1.2-spec.md` |
| FR-ED-03 | v2 ändrar inte pedagog-IA | Endast ev. deep-link-uppdateringar |

### 6.4 Onboarding & aktivering

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-ON-01 | Onboarding utanför v2-nav — engångsflöde | `magic-view-rollout.md` |
| FR-ON-02 | Efter onboarding: landa i Hem med readiness-kort | "Nästa steg" synligt |
| FR-ON-03 | Barn-inloggning tydlig från Hem | `dashboard-child-handoff.js` |
| FR-ON-04 | ACT-1 (AI-startschema) kompletterar v2 — ej blocker | Parallellt spår |

### 6.5 Paket & monetisering

| Paket | Komponent | v2-placering |
|-------|-----------|--------------|
| Basic | `basic_app` | Hela kärnnav |
| Familj Rapportering | `reporting` | Barnprofil → Framsteg |
| Familj Pedagog | `pedagog` | Familj + separat vy |
| Familj Extra stöd | `teacch` | Idag-overlay + Planeringshub |

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-PK-01 | Köp ändrar inte antal nav-flikar | Placements only |
| FR-PK-02 | `GET /api/subscription/access` styr access-lager | Oförändrat API |
| FR-PK-03 | Prenumeration i settings — inte Extra-flik | Fas 4 |

---

## 7. Icke-funktionella krav

### 7.1 Säkerhet & behörighet

Oförändrade krav från [`kravspec-app-webb.md`](./kravspec-app-webb.md):

- `parent_child` + `revoked_at IS NULL` på alla child-scoped routes
- CSRF på muterande vuxen-requests
- Parental Gate på delad enhet
- `requirePrimaryParent` för känsliga operationer

### 7.2 Tillgänglighet (a11y)

| Krav | Detalj |
|------|--------|
| NFR-A11Y-01 | `aria-current` på aktiv nav/värld |
| NFR-A11Y-02 | Coach-loop: `aria-live="polite"` |
| NFR-A11Y-03 | Touch targets ≥ 44 px (native + mobil) |
| NFR-A11Y-04 | Fokusfälla i modaler och Parental Gate |

### 7.3 Prestanda

| Krav | Detalj |
|------|--------|
| NFR-PERF-01 | Idag ska vara interaktiv < 2 s efter child-login (P95) |
| NFR-PERF-02 | Hub-sidor < 50 KB extra JS (tunna) |
| NFR-PERF-03 | SW `CACHE_NAME` bump vid varje v2-release |

### 7.4 Plattform

| Plattform | Krav |
|-----------|------|
| iOS/Android native | Tab bar läser `nav-config.js`; safe-area |
| Mobil webb/PWA | Hamburger + samma fem flikar |
| Desktop | Sidebar = samma IA som tab bar |
| Offline | Befintlig daily-log-kö oförändrad |

Se [`plattform-webb-ios-android.md`](./plattform-webb-ios-android.md).

### 7.5 Analytics

| Event | När |
|-------|-----|
| `nav_hub_click` | Hub-flik klickad |
| `readiness_action_click` | Hem-kort → handling |
| `child_profile_section` | Sektion öppnad i barnprofil |
| `child_world_view` | Barn byter värld |
| `today_coach_shown` / `_dismissed` | Coach-loop |
| `page_view` | Route-migration (före/efter baseline) |

Ingen PII i `analytics_events`. Befintlig tabell återanvänds.

---

## 8. Datamodell & API (begränsningar)

v2 **introducerar inga obligatoriska nya tabeller** för kärnnav. Befintliga entiteter räcker:

| Entitet | v2-användning |
|---------|---------------|
| `child` | `birthday`, `view_type`, `child_view_config` |
| `child_view_config` | `view_mode`, element-flags, framtida `age_band` |
| `parent` | `account_type`, `preferred_view_mode` |
| `parent_child` | Roller, granular åtkomst |
| `family_subscriptions` | Paket-access |
| `daily_log` / `daily_log_item` | Idag-engine |
| `analytics_events` | v2-mätning |

**API:er som inte får brytas:** `/api/me/daily-log`, `/api/children`, `/api/subscription/access`, `/api/auth/*`.

Nya endpoints tillåtna för v2-stöd (tunna):

- `GET /api/family/readiness` (förslag — aggregering för Hem)
- Befintliga routes oförändrade i path och kontrakt

---

## 9. Design

### 9.1 Designtokens (oförändrade)

| Token | Värde |
|-------|-------|
| Navy | `#1B2340` |
| Gold | `#F5A623` |
| Lavender | `#EDE7F6` |
| Typsnitt | Outfit + Plus Jakarta Sans |

### 9.2 Visuell ton per yta

| Yta | Ton |
|-----|-----|
| Förälder | Ljus, professionell, lugn |
| Barn Idag | Tydlig, låg kognitiv belastning |
| Barn Min värld | Rikare, belönande — sekundär |
| För dig (befintlig) | Varm, handlingsorienterad — underhåll, ej v2-utveckling |
| Hem / barn coach | Tydlig, låg friktion |

### 9.3 Mockups & referenser

| Mockup | Fil |
|--------|-----|
| Föräldra-dashboard | `docs/mockups/foraldra.html` |
| Barnvy | `docs/mockups/barnvy.html` |
| Belöningar | `docs/mockups/beloningar.html` |

---

## 10. Leveransplan (samlad)

v2 levereras **inkrementellt**. Förälder och barn kan vara i olika faser kortvarigt — men `nav-config` + `child-worlds` ska vara synkade i principer före fas 3.

### Fas 0 — Lås arkitektur

| Leverans | Förälder | Barn |
|----------|----------|------|
| Config-filer | `nav-config.js` | `child-worlds.js`, `child-capabilities.js` |
| Konsumenter kopplade | tab-bar, magic-shell, mobile-nav | layer-router (läs config) |
| Beteende | Oförändrat synligt | Oförändrat synligt |

### Fas 1 — Synlig v2-nav

| Leverans | Förälder | Barn |
|----------|----------|------|
| Nytt primärnav | 5 flikar | 3 världar |
| Bort | Mer, Extra, dubbla källor | classic/magic nav-split |
| Start | Hem | Idag |

### Fas 2 — Hubbar & moduler

| Leverans | Förälder | Barn |
|----------|----------|------|
| Hubbar | `/planning`, `/rewards` | — |
| Modulsplit | — | `child-shell.js` ersätter orchestrator |
| Redirect | `/skattkammaren` → `/rewards` (förälder) | — |

### Fas 3 — Profiler & routes

| Leverans | Förälder | Barn |
|----------|----------|------|
| Barnprofil | `/family/child/:id` | — |
| Routes | — | `/child/today`, `/child/world`, `/child/family` |
| Analytics baseline | 2 veckor före/efter | `child_world_view` |

### Fas 4 — Coach & stöd

| Leverans | Förälder | Barn |
|----------|----------|------|
| Coach | `home-readiness.js` (förälder) | Coach-loop på Idag (barn) |
| Settings | Sanering | — |
| Adaptivt stöd | — | `child-support-layer` |

### Fas 5 — Paket-placements

Nya `CAPABILITIES` / `CHILD_CAPABILITIES` rader. Ingen nav-refaktor.

### Fas 6 — Städning

| Åtgärd |
|--------|
| Permanent redirects |
| Ta bort drawer, `/child-settings`, Extra/Mer |
| Avveckla `child-dashboard.js` som orchestrator (behåll shim) |

### Sprint-översikt (låst ordning)

| Sprint | Fokus | Detaljspec |
|--------|-------|------------|
| 0 | Config | `barnmeny-v2.md` §9, `vuxenmeny-v2.md` §8 |
| 1 | Synlig nav | Båda § Sprint 1 |
| 2 | Hubbar + moduler | Båda § Sprint 2 |
| 3 | Barnprofil + routes | `vuxenmeny-v2.md` § Sprint 3, `barnmeny-v2.md` § Sprint 3 |
| 4 | Settings + coach | Båda § Sprint 4 |
| 5 | Readiness + adaptivt stöd | Båda § Sprint 5 |
| 6+ | Paket + städ | Fas 6–7 |

---

## 11. Redirects (sammanfattning)

| Från | Till | Villkor |
|------|------|---------|
| `/skattkammaren` | `/rewards` | Inloggad förälder |
| `/skattkammaren` | *(oförändrad)* | `?demo=1` eller barnsession |
| `/child-settings` | `/family/child/:id` | Efter fas 3 |
| `/upgrade` | `/settings#prenumeration` | Alltid |
| `/child-dashboard` | `/child/today` | Efter fas 3 (shim under migration) |
| `#schedule` (hash) | `#today` / `/child/today` | Barn hash-fallback |
| `/family-week` | `/schedule?view=family` | Redan live |

Fullständig lista: `vuxenmeny-v2.md` §10, `barnmeny-v2.md` §11.

---

## 12. Acceptanskriterier (v2 klar)

v2 anses **produktionsklar** när alla punkter är uppfyllda:

### Navigation

- [ ] Förälder: en `PRIMARY_NAV`, fem flikar, alla plattformar
- [ ] Barn: en `CHILD_WORLDS`, tre världar, alla plattformar
- [ ] Ingen Mer/Extra/classic-magic-nav-split i produktion
- [ ] Alla redirects fungerar (§11)

### Kärnflöden (röktest)

- [ ] Ny familj: registrera → onboarding → Hem med nästa steg → barn login → Idag → avbocka → stjärna
- [ ] Förälder: Planeringshub → schema → ändring syns på barns Idag
- [ ] Förälder: Belöningshub → belöning → barn ser i Min värld
- [ ] Förälder: För dig fungerar oförändrat (regression — ej v2-leverans)
- [ ] Barn: Parental Gate blockerar vuxenåtgärder
- [ ] Pedagog: oförändrat flöde fungerar
- [ ] Native iOS/Android: tab bar + safe-area

### Mätning

- [ ] Analytics-baseline insamlad före fas 3
- [ ] Barnprofil ≥ 80 % adoption (14 dagar) innan drawer tas bort
- [ ] Inga regressions i Day 14-retention (veckovis kontroll)

### Tekniskt

- [ ] `npm test` grönt
- [ ] `npm run lint` utan nya errors
- [ ] SW version bumpad
- [ ] Inga nya errors i `route-inventory` check

---

## 13. Risker & öppna frågor

| Risk | Sannolikhet | Åtgärd |
|------|-------------|--------|
| `child-dashboard.js` monolit svår att migrera | Hög | `child-shell.js` tidigt (Sprint 2); shim, inte parallell IA |
| Förälder och barn i olika faser förvirrar QA | Medel | Feature-flagg per familj om nödvändigt; tydlig release notes |
| `/skattkammaren`-redirect bryter bokmärken/marknadsföring | Medel | 301 + uppdatera SEO/demo-länkar |
| Barnprofil URL: `slug` vs `id` | Medel | **Beslut krävs Sprint 3** — rekommendation: stabilt `child_id` i URL |
| Analytics otillräcklig för beslut | Medel | Baseline 2 veckor **före** fas 3 |
| Paket-kunder missar nya placements | Låg | Synliggör i hub + Hem, inte ny flik |

### Öppna beslut (kräver produktbeslut)

| # | Fråga | Alternativ | Rekommendation |
|---|-------|------------|----------------|
| D1 | Barnprofil-URL | `/family/child/:id` vs `:slug` | `:id` (stabilt) |
| D2 | Magic view-växlare kvar efter v2? | Behåll tema / ta bort | Behåll som **tema**, inte nav |
| D3 | `child-new.html` | Deprecera nu / senare | Efter barn-routes stabila (fas 3) |
| D4 | Feature-flagg för v2 per familj? | Alla / allowlist | Alla (som magic idag) med `V2_DISABLED` nödstopp |

---

## 14. Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Första samlade kravdokument. Syntes av barnmeny-v2, vuxenmeny-v2, IA, paket, tillväxt. |
| 0.2 | 2026-06-26 | För dig markerat som redan levererat; utanför scope för v2-bygge och nästa målgrupp. |

---

## 15. Nästa steg (team)

1. **Granska utkast 0.2** — produkt + teknik: bekräfta scope, öppna beslut (§13).
2. **Lås D1–D4** — särskilt barnprofil-URL före Sprint 3.
3. **Skapa tickets** från Fas 0/Sprint 0 i befintliga sprint-planer.
4. **Baslinje analytics** — starta `page_view` för `/child-settings`, `/skattkammaren` innan nav-byte.
5. **Uppdatera detta dokument** till v0.2 efter beslut — inte efter implementation.
