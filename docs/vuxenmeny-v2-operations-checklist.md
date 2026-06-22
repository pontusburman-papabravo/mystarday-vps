# Vuxenmeny v2 — Operations-checklist (implementation blueprint v2.1)

> **Syfte:** Komplett operationskarta kopplad till v2-menyn — vad användaren ska kunna göra, var det bor, hur det byggs, och vad som är must-have vs senare.
>
> **Relaterat:** [`vuxenmeny-v2.md`](./vuxenmeny-v2.md) · [`barnmeny-v2.md`](./barnmeny-v2.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Status:** Implementation blueprint v2.1 · 2026-06-21
>
> **Princip (oförändrad):** v2 flyttar **placering och ägarskap** — inte affärslogik. Befintliga routes och API:er återanvänds. Inga omskrivningar av `daily-log.js`, `schedule.js`, rewards-API (non-goal).

---

## Kolumnförklaring

| Kolumn | Betydelse |
|--------|-----------|
| **Pri** | `P0` = måste finnas i första användbara v2-leveransen · `P1` = bör finnas i första releasen · `P2` = efter launch / fallback OK · `Later` = placement reserverad, ej första implementation |
| **Mode** | `move` = flytta/länka/redirect · `compose` = ny hub/wrapper runt befintlig funktion · `build` = ny UI-komponent · `api` = backend krävs · kombinationer t.ex. `compose+build` |
| **Primary** | Source of truth / primär operativ yta |
| **Secondary** | Övriga godkända entréer (minsta antal enligt v2-regel) |
| **Sprint** | Första sprint där raden ska vara klar (enligt [`vuxenmeny-v2.md` §9](./vuxenmeny-v2.md)) |

---

## Menyöversikt v2

```
HEADER:  🔔 Notiser                    👤 Avatar → Inställningar / Logga ut
─────────────────────────────────────────────────────────────────────────
BOTTON/SIDEBAR (alltid samma fem):
  🏠 Hem  |  📅 Planering  |  🎁 Belöningar  |  ✨ För dig  |  👨‍👩‍👧 Familj
─────────────────────────────────────────────────────────────────────────
DJUP:    /family/child/:id  (barnprofil — kanonisk väg för allt barnrelaterat)
SIDOR:   /daily-log, /schedule, /library … (oförändrade, nås via hub eller direkt)
```

---

## Informationsmodeller (låsta beslut som saknades i v2.0)

### A. Förälderns "Att hantera" (action center)

**Inte en ny flik** — en informationsmodell som samma items kan renderas på flera placements.

| Item-typ | Trigger | Primary placement | Secondary |
|----------|---------|-------------------|-----------|
| Väntande inlösning | `pending redemptions` | Hem → Kräver åtgärd | Belöningar-hub, barnprofil → Belöningar |
| Väntande måländring | `pending goal change` | Hem → Kräver åtgärd | Belöningar-hub, barnprofil → Belöningar |
| Barn pausat idag | `today_is_paused` | Hem barnkort | Daglig logg, barnprofil → Översikt |
| Saknar schema idag | `no daily_log` | Hem readiness (P2) | Barnprofil → Schema |
| Saknar PIN | `pin_set === false` | Hem readiness (P2) | Barnprofil → Setup |
| Backfill-behov | `incomplete past days` (P2) | Hem readiness | För dig coach, notis |
| Väntande medförälder-inbjudan | `pending invite` | Familj → Vuxna | Hem CTA |
| Systemmeddelande | admin message | Hem banner | Notiser |

**Implementation:** `home-action-center.js` (ny, P2) läser befintliga API:er — ingen ny domänlogik.

### B. Live parenting vs admin/editing

| Kategori | Exempel | Primary yta |
|----------|---------|-------------|
| **Live parenting** (mitt i dagen, 1–2 tryck) | Pausa dag, bocka av, ge extra stjärnor, bump-tid, dela schema | Hem snabbåtgärder, daglig logg |
| **Editing** (planera veckan) | Lägg till aktivitet, kopiera dag, mallar | `/schedule`, bibliotek |
| **Setup** (sällan) | PIN, vy-läge, reward visibility, foto | Barnprofil → Setup |
| **Historik** (bakåtblick) | Stjärnhistorik, rapporter, vecka | Barnprofil → Framsteg |

**Hem ska alltid exponera live parenting-kontroller** (P0). Schema-redigering ska **inte** dupliceras inline på Hem (deprecated: inbäddad editor → länk).

### C. Progress stack (historik/framsteg)

| Lager | Äger | Innehåll |
|-------|------|----------|
| **Hem** | Teaser | Senaste veckan, varningar, "Se utveckling →" |
| **Belöningar-hub** | Reward-historik | Stjärnor, inlösen, familjekista, museum |
| **Barnprofil → Framsteg** | **Primär** per barn | Stjärnor över tid, pauser, manuella stjärnor, mål, basic historik |
| **Rapporter** | Export/delning | Professionell rapport, aktivitetsvy, observationer |

### D. Setup state machine (förälder, ofullständig familj)

| State | Hem visar | Primary CTA |
|-------|-----------|---------------|
| Inga barn | Tom-state | Lägg till barn |
| Barn, inget schema | Readiness | Skapa schema (Planering / För dig) |
| Schema, inga belöningar | Readiness | Skapa belöning (Belöningar-hub) |
| Belöningar, ingen PIN | Readiness | Sätt PIN (barnprofil Setup) |
| Barnvy ej testad | Aktiveringsprogram | Öppna barnvy |
| Ingen medförälder | CTA (valfritt) | Bjud in |
| Notiser av | Readiness (P2) | Aktivera i Inställningar |

---

## Barnprofil — routing & ownership (låst)

### URL-strategi

| Beslut | Val |
|--------|-----|
| **Kanonisk URL** | `/family/child/:id` (`child_id` UUID — stabilt för push/deep links) |
| **Visningsalias** | Barnnamn som rubrik; slug som valfritt alias i UI (ej i URL v1) |
| **Sektioner** | Query param `?tab=` — **inte** subroutes i v1 |
| **Deep links** | `/child-settings?id=` → `/family/child/:id?tab=setup` |

### Tillåtna `?tab=`-värden

| `tab` | Rubrik | Ownership | Innehållstyp |
|-------|--------|-----------|--------------|
| `overview` | Översikt | **inline** | Status idag, paus, stjärnor, snabbåtgärder (B9), senaste aktivitet |
| `log` | Daglig logg | **link** | CTA → `/daily-log?childId=&date=` (sidan oförändrad) |
| `schema` | Schema | **hybrid** | Veckosammanfattning inline + CTA → `/schedule?child=` |
| `rewards` | Belöningar | **inline** | Extra stjärnor, mål, pending approvals, synlighet — modaler återanvänder `family.js`/`dashboard.js` |
| `progress` | Framsteg | **hybrid** | Stjärnhistorik inline (basic) + länk → `/reports` (gated) |
| `setup` | Barnets inställningar | **inline** | PIN, vy, mood, minimal UI, foto, reward visibility — migrerar från `child-settings.js` |
| `child-view` | Barnvy | **link** | Handoff → barnläge |

**Regel:** Inline = data/actions utan sidbyte. Link = befintlig route. Hybrid = summary + CTA.

### Barnprofil — tre nivåer (informationsmodell)

```
A. Operativt idag     → tab overview + snabbåtgärder + länk log
B. Belöningar & framsteg → tab rewards + tab progress
C. Barnets setup      → tab setup + tab child-view
```

---

## Legacy / fallback / deprecation

| Legacy-yta | Status i v2 | Regel | Sprint |
|------------|-------------|-------|--------|
| Family drawer | **Fallback** | Kvar tills barnprofil parity ≥ 80 % sessioner i 14 dagar | 3→7 |
| `/child-settings` | **Redirect** | → `/family/child/:id?tab=setup` | 3 |
| `/skattkammaren` (inloggad förälder) | **Redirect** | → `/rewards` | 2 |
| `/skattkammaren` (publik/demo) | **Oförändrad** | `?demo=1` / utloggad | — |
| `/upgrade` | **Redirect** | → `/settings#prenumeration` | 4 |
| Family: GDPR/push/delete | **Removed** | Endast `/settings` — får ej återintroduceras på `/family` | 4 |
| Dashboard inbäddad schemaeditor | **Deprecated** | Ersätts av länk → `/schedule?child=` | 3 |
| Magic vs native olika nav | **Removed** | En `nav-config.js` | 1 |
| Mer / Extra bottenflikar | **Removed** | Capabilities + avatar | 6+ |
| `child-package-nav` 2-flik (barn) | **Removed** | `child-worlds.js` (barnmeny v2) | barn sprint |

---

# Föräldraoperationer

## 🏠 Hem

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| H1 | Översikt per barn (status, paus, stjärnor) | P0 | compose | Hem barnkort | Barnprofil → overview | 1 | `GET /api/family/dashboard-stats` |
| H2 | Markera aktivitet klar/ångra (åt barnet) | P0 | move | Daglig logg | Hem expand, barnprofil → log-länk | 1 | `PUT …/complete\|uncomplete` |
| H3 | Pausa dag / återuppta | P0 | move | Daglig logg | Hem snabbknapp, barnprofil overview | 1 | `PUT …/pause\|unpause` |
| H4 | Ge extra stjärnor | P0 | move | Barnprofil → rewards | Hem snabbknapp, Belöningar-hub | 3 | `POST /api/rewards/manual-stars` |
| H5 | Fyll i i efterhand (backfill) | P0 | move | Daglig logg (datumväljare) | Hem snabbknapp, Planering-hub | 1 | navigering |
| H6 | Engångsaktivitet | P0 | move | `/schedule` once-task | Hem snabbknapp, barnprofil overview | 1 | `POST …/once-tasks` |
| H7 | Godkänn/neka inlösning | P0 | move | Belöningar-hub | Hem "Kräver åtgärd", barnprofil rewards | 2 | `PUT …/redemptions/…` |
| H8 | Godkänn/neka måländring | P0 | move | Belöningar-hub | Hem "Kräver åtgärd", barnprofil rewards | 2 | `PUT …/goal-change-requests/…` |
| H9 | Stjärnhistorik (vecka) | P1 | move | Barnprofil → progress | Hem sektion (teaser) | 3 | `GET /api/family/star-history` |
| H10 | Dela dagens schema | P1 | move | Hem expand | Daglig logg | 2 | `Platform.share` |
| H11 | Barnet loggar in (handoff) | P0 | move | Hem handoff-kort | Barnprofil → child-view | 1 | auth childFlow |
| H12 | Lägg till barn | P0 | move | Familj | Hem tom-state | 1 | `POST /api/children` |
| H13 | Bjud in medförälder | P1 | move | Familj → Vuxna | Hem CTA, För dig | 3 | `POST /api/family/invite` |
| H14 | Readiness-varningar (PIN, schema, …) | P2 | api+build | Hem "Kräver åtgärd" | För dig coach | 5 | `GET /api/family/readiness` (ny) |
| H15 | Aktiveringsprogram (dag 1–7) | P1 | move | Hem banner | För dig | 1 | activation-program API |
| H16 | Systemmeddelanden | P1 | move | Hem banner | Notiser | 1 | `/api/messages/*` |
| H17 | Dagens nyhet | P2 | move | Hem banner | — | 2 | dagens-nyhet API |
| H18 | Inbäddad schemaeditor | P0 | **deprecate** | `/schedule?child=` | — | 3 | schedule APIs |
| H19 | Veckans framsteg / statistik | P1 | compose | Hem diagram | Barnprofil progress | 2 | dashboard-stats |
| H20 | Aktiv delningsrapport | P2 | move | Hem banner | Rapporter | 2 | reports |
| **PX1** | **"Kräver åtgärd"-sektion** (aggregerad action center) | P2 | build | Hem topp | Notiser, hubs | 5 | befintliga APIs |
| **PX2** | **Bump-tid +15/+30** (live parenting) | P1 | move | Daglig logg | Hem snabbknapp (P2) | 2 | bump-time API |
| **PX3** | **"Vem behöver mig nu?"** (flerbarns-prioritering) | P2 | compose | Hem sortering | — | 5 | dashboard-stats |
| **PX4** | **Filter: bara barn med varningar** | P2 | build | Hem | — | 5 | readiness |

---

## 📅 Planering

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| P1 | Daglig logg (hela sidan) | P0 | move | `/daily-log` | Planering-hub, Hem H5 | 2 | daily-log |
| P2 | Välj barn i logg | P0 | move | Daglig logg | — | 1 | children |
| P3 | Navigera datum | P0 | move | Daglig logg | — | 1 | `?date=` |
| P4 | Markera klar / ångra | P0 | move | Daglig logg | Hem H2 | 1 | complete |
| P5 | Markera hel sektion klar | P1 | move | Daglig logg | — | 1 | bulk toggle |
| P6 | Pausa/återaktivera dag | P0 | move | Daglig logg | Hem H3, barnprofil | 1 | pause |
| P7 | Justera tid (+15/+30) | P1 | move | Daglig logg | Hem PX2 | 1 | bump-time |
| P8 | Flytta/ordna om aktivitet | P1 | move | Daglig logg | Schema | 1 | reorder |
| P9 | Föräldrabetyg | P1 | move | Daglig logg | Barnprofil progress | 1 | rate |
| P10 | Skriv ut dag/vecka | P2 | move | Daglig logg | — | 2 | print |
| P11 | Veckoschema (editor) | P0 | move | `/schedule` | Planering-hub, barnprofil schema | 2 | schedule |
| P12 | Lägg till/redigera/radera aktivitet | P0 | move | `/schedule` | Bibliotek | 1 | activities |
| P13 | Engångsaktivitet | P0 | move | `/schedule` | Hem H6 | 1 | once-tasks |
| P14 | Återkommande / flera dagar | P0 | move | Schema modal | — | 1 | schedule items |
| P15 | Kopiera dag | P1 | move | Schema | — | 1 | copy-day |
| P16 | Kopiera till syskon | P1 | move | Schema | — | 2 | copy-to-child |
| P17 | Byt dag (swap) | P2 | move | Schema | — | 2 | swap-day |
| P18 | Ta bort hel dag | P1 | move | Schema | — | 1 | DELETE schedule |
| P19 | Infoga schema-mall | P1 | move | Schema | Barnprofil schema | 1 | templates |
| P20 | Familjescheman | P1 | move | Schema + bibliotek | — | 2 | schedule-templates |
| P21 | Specialdagar | P1 | move | Schema | — | 2 | special-days |
| P22 | Tilldela schema | P1 | move | `/assign-schedule` | Planering-hub | 2 | assign |
| P23 | Kalender | P1 | move | `/calendar` | Planering-hub | 2 | calendar |
| P24 | Aktiviteter CRUD | P0 | move | `/library` | Planering-hub | 2 | activities |
| P25 | Kategorier | P1 | move | Bibliotek | — | 2 | categories |
| P26 | Delsteg | P0 | move | Bibliotek modal | — | 1 | sub-steps |
| P27 | 7 frågor / TEACCH-redigering | Later | move | Bibliotek | `/barn-stod` | 6+ | teacch |
| P28 | Kopiera standardbibliotek | P1 | move | Bibliotek Standard | — | 2 | standard-library |
| P29 | TEACCH / Extra stöd (info) | Later | move | Planering-hub (gated) | För dig | 6+ | subscription |
| **PX5** | **Engångsaktivitet till flera barn** | P2 | build | Schema | — | 6+ | once-tasks × N |
| **PX6** | **Pausa alla barns dag** | P2 | api+build | Hem | Familj | 6+ | batch pause |
| **PX7** | **Hoppa över aktivitet idag** (live) | P2 | build | Daglig logg | Hem | 5 | daily-log item |

---

## 🎁 Belöningar

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| R1 | Belöningshub | P0 | compose | `/rewards` hub | — | 2 | — |
| R2 | Hantera belöningar CRUD | P0 | move | `/library` Belöningar | Belöningar-hub | 2 | rewards |
| R3 | Ordna/favoritmarkera | P1 | move | Bibliotek | — | 2 | reorder |
| R4 | Kopiera standardbelöningar | P1 | move | Bibliotek | — | 2 | standard-library |
| R5 | Visa/dölj per barn | P0 | move | Barnprofil → setup/rewards | Bibliotek | 3 | visibility |
| R6 | Sätt målbelöning | P0 | move | Barnprofil → rewards | Family drawer (fallback) | 3 | goals |
| R7 | Ge extra stjärnor | P0 | move | Barnprofil → rewards | Hem H4, hub | 3 | manual-stars |
| R8 | Godkänn inlösning / måländring | P0 | move | Belöningar-hub | Hem H7/H8, barnprofil | 2 | redemptions |
| R9 | Familjekista på/av | P1 | move | Inställningar / hub | — | 4 | family settings |
| R10 | Familjemuseum | P2 | move | Belöningar-hub | Familj (tills rensad) | 3 | museum |
| R11 | Föräldervy skattkammaren | P1 | move | Belöningar-hub | `/skattkammaren-parent` | 2 | child-view |
| R12 | Utveckling över tid | P1 | move | Barnprofil → progress | Belöningar-hub länk | 3 | reports/basic |
| R13 | Stjärnhistorik | P1 | move | Barnprofil → progress | Hem teaser | 3 | star-history |
| **PX8** | **Pending redemptions alla barn** | P1 | compose | Belöningar-hub topp | Hem action center | 2 | pending-requests |
| **PX9** | **Ge bonus till flera barn** | P2 | build | Hem / Familj | — | 6+ | manual-stars × N |
| **PX10** | **Dölj belöning för flera barn** | P2 | build | Bibliotek | — | 6+ | rewards bulk |

---

## ✨ För dig

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| F1 | Bläddra mål/rekommendationer | P0 | move | `/for-dig` | — | 1 | for-dig goals |
| F2 | Aktivera mål | P1 | move | För dig | Hem/För dig-kort | 1 | activate |
| F3 | Favoritmarkera mål | P2 | move | För dig | — | 2 | favorites |
| F4 | Feedback / förslag | P2 | move | För dig | — | 2 | feedback |
| F5 | Utfallsbanner | P2 | move | Global | För dig | 2 | feedback |
| F6 | Paketcoach (pedagog, TEACCH, rapporter) | P1 | move | För dig-kort | Hubs (gated) | 2 | subscription |
| F7 | Bjud in medförälder (coach) | P1 | move | Familj | Hem H13 | 3 | invite |
| F8 | Bygg schema (rekommendation) | P1 | move | För dig → Planering | Barnprofil schema | 2 | navigering |

---

## 👨‍👩‍👧 Familj

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| M1 | Lista barn → profil | P0 | compose | Familj → barnprofil | Hem kort | 3 | children |
| M2 | Lägg till barn | P0 | move | Familj | Hem H12 | 1 | POST children |
| M3 | Omsortera barn | P2 | move | Familj | — | 3 | reorder |
| M4 | Lista vuxna | P0 | move | Familj | — | 3 | members |
| M5 | Bjud in medförälder | P1 | move | Familj | Hem | 3 | invite |
| M6 | Skanna QR | P2 | move | Familj | — | 4 | invite |
| M7 | Återkalla inbjudan | P1 | move | Familj | — | 3 | DELETE invite |
| M8 | Medlemsroll / barnkoppling | P1 | move | Familj | — | 3 | members |
| M9 | Ta bort barn/vuxen | P1 | move | Familj | — | 3 | DELETE |
| M10 | Spara familjenamn | P2 | move | Familj | — | 3 | PUT family |
| M11 | Pedagoger (intresse) | Later | move | Familj-sektion | För dig, `/samarbete` | 6+ | pedagog |
| M12 | Familjemuseum widget | P2 | move | Belöningar-hub | Familj (tills flytt) | 3 | museum |

---

## 🌟 Barnprofil `/family/child/:id`

| ID | Sektion (`?tab=`) | Pri | Mode | Ownership | Primary actions inline | Sprint |
|----|-------------------|-----|------|-----------|------------------------|--------|
| B1 | `overview` | P0 | compose+build | inline | Status, paus, stjärnor idag | 3 |
| B2 | `schema` | P0 | hybrid | summary + link | Veckodagsöversikt → `/schedule?child=` | 3 |
| B3 | `log` | P0 | link | link | CTA → `/daily-log?childId=` | 3 |
| B4 | `rewards` | P0 | inline | inline | Extra stjärnor, mål, approve/deny, synlighet | 3 |
| B5 | `progress` | P1 | hybrid | inline + link | Veckodiagram + länk `/reports` | 3 |
| B6 | `child-view` | P0 | link | link | Handoff barnläge | 3 |
| B7 | `setup` (PIN) | P0 | inline | inline | Sätt/ändra/lås upp PIN | 3 |
| B8 | `setup` (övrigt) | P0 | inline | inline | Vy, mood, minimal UI, foto, visibility | 3 |
| **B9** | **Snabbåtgärder på overview** | **P0** | **build** | **inline** | Pausa · Extra stjärnor · Backfill · Engångsaktivitet | **3** |

---

## 👤 Inställningar / 🔔 Header

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint |
|----|-----------|-----|------|---------|-----------|--------|
| S1 | Inställningar | P0 | move | Avatar | — | 4 |
| S2 | Prenumeration | P1 | move | Inställningar | Avatar | 4 |
| S3 | Förälder-PIN | P1 | move | Inställningar | — | 4 |
| S4 | Konto | P0 | move | Inställningar | — | 4 |
| S5 | Notiser (preferenser) | P1 | move | Inställningar | — | 4 |
| S6 | App (push/PWA) | P1 | move | Inställningar | — | 4 |
| S7 | Veckopåminnelse | P2 | move | Inställningar | — | 4 |
| S8 | Nyhetsbrev | P2 | move | Inställningar | — | 4 |
| S9 | Mörkt läge | P1 | move | Inställningar | — | 4 |
| S10 | Exportera data | P1 | move | Inställningar | — | 4 |
| S11 | Radera konto | P1 | move | Inställningar | — | 4 |
| S12 | Byt pedagogvy | Later | move | Avatar | — | 6+ |
| S13 | Logga ut | P0 | move | Avatar | Sidebar (desktop) | 1 |
| N1 | Notislista | P0 | move | Header 🔔 | `/notifications` | 1 |
| N2 | Markera läst | P1 | move | Notiser | — | 1 |

---

## Capabilities (ej primärflik)

| ID | Operation | Pri | Feature | Placement | Route | Sprint |
|----|-----------|-----|---------|-----------|-------|--------|
| C1 | Rapporter | P1 | `reporting` | barnprofil progress, rewards_hub, home_card | `/reports` | 3+ |
| C2 | Pedagoganteckningar | Later | `pedagoganteckningar` | barnprofil (framtida) | `/pedagog-note` | 6+ |
| C3 | Samarbete (läsa) | Later | `pedagog` | family, for_you_card | `/samarbete` | 6+ |
| C4 | TEACCH / barn-stöd | Later | `teacch` | planning_hub | `/barn-stod` | 6+ |
| C5 | Paketpreview / intresse | P1 | rollout | for_you_card, hub tom-states | `/upgrade` → settings | 2 |
| C6 | Prisinfo | P2 | — | for_you_card | `/pricing-info` | 2 |

---

# Barnoperationer (barnmeny v2)

Kopplat till [`barnmeny-v2.md`](./barnmeny-v2.md). API oförändrat.

## Befintliga (låsta i v2)

| ID | Operation | Pri | Värld | Mode | Primary | Sprint |
|----|-----------|-----|-------|------|---------|--------|
| K1 | Bocka av aktivitet | P0 | ☀️ Idag | move | Idag NU-kort | barn S2 |
| K2 | Delsteg (visa steg) | P0 | ☀️ Idag | move | Idag (adaptivt stöd) | barn S2 |
| K3 | Mood-rating | P0 | ☀️ Idag | move | Efter aktivitet | barn S2 |
| K4 | TEACCH NU-overlay | P1 | ☀️ Idag | move | Fullskärm overlay | barn S3 |
| K5 | Se stjärnor / mål | P0 | 🏰 Min värld | move | Min värld | barn S2 |
| K6 | Universum / rum / husdjur | P1 | 🏰 Min värld | move | Min värld | barn S2 |
| K7 | Lösa in belöning | P0 | 🏰 Min värld | move | Min värld | barn S2 |
| K8 | Se manuella stjärnor | P0 | 🏰 Min värld | move | Min värld (Stjärnfronten) | barn S2 |
| K9 | Se personer (familj) | P0 | ❤️ Mina personer | compose | Personkort | barn S3 |
| K10 | System (byt barn, logout, tema) | P0 | 🔒 Vuxenikon | build | Parental Gate | barn S2 |
| K11 | Presentation (classic/magic tema) | P1 | alla | move | Förälder styr i setup | barn S3 |

## Saknade / ska förtydligas (nya rader)

| ID | Operation | Pri | Värld | Beskrivning | Sprint |
|----|-----------|-----|-------|-------------|--------|
| **KX1** | **Idag: NU vs hela dagen** | P0 | Idag | Default = NU/NÄSTA/SEN; expandera "visa hela dagen" | barn S2 |
| **KX2** | **Visa pausad dag** | P0 | Idag | Tydlig "Ledig idag"-state när förälder pausat | barn S2 |
| **KX3** | **Visa ny/flyttad aktivitet** | P1 | Idag | Toast/badge när förälder lagt till eller bumpat | barn S3 |
| **KX4** | **Feedback: extra stjärnor** | P0 | Min värld | Stjärnfronten + kort animation | barn S2 |
| **KX5** | **Målprogress** | P0 | Min värld | "X av Y stjärnor till [mål]" alltid synlig | barn S2 |
| **KX6** | **Pending inlösning** | P1 | Min värld | "Väntar på godkännande" — inte dold | barn S3 |
| **KX7** | **Avslaget mål/inlösning** | P2 | Min värld | Barnvänlig förklaring (förälder nekat) | barn S4 |
| **KX8** | **Be om belöning / måländring** | P1 | Min värld | Befintlig flow, tydlig CTA | barn S2 |
| **KX9** | **Coach-loop efter aktivitet** | P1 | Idag | Kort "Bra jobbat!" → nästa steg | barn S3 |
| **KX10** | **Adaptivt stöd (sammanhållet)** | P1 | Idag | NU/NÄSTA, delsteg, minimal UI, TEACCH — en `child-support-layer` | barn S3 |
| **KX11** | **Mina personer: vad kan jag göra?** | P1 | Mina personer | Se personer; ev. "vem hjälpte idag" (P2) | barn S3 |
| **KX12** | **Byt barn på delad enhet** | P0 | Vuxenikon | Parental Gate — aldrig fri i nav | barn S2 |

### Barnets agency (vad barnet får påverka)

| Tillåtet | Ej tillåtet |
|----------|---------------|
| Bocka av, delsteg, mood | Pausa dag, backfill, extra stjärnor |
| Be om belöning/måländring | Schema-redigering |
| Välja avatar/rum/husdjur (unlock) | Byt barn utan gate |
| (P2) "Behöver hjälp" / "Gör senare" | Inställningar, logout utan gate |

---

## Sprintordning (sammanfattning)

| Sprint | Förälder — must deliver (P0) | Barn (parallellt) |
|--------|------------------------------|-------------------|
| **1** | Fem flikar, `nav-config.js`, Hem kort, daglig logg/schema routes, avatar logout, notiser | — |
| **2** | Planering-hub, Belöningar-hub, `/skattkammaren` redirect, pending approvals i hub | — |
| **3** | Barnprofil alla P0-tabs + **B9 snabbåtgärder**, family rensad, child-settings redirect | `child-worlds.js`, tre världar, Idag default |
| **4** | Settings/avatar komplett, family GDPR bort | Parental Gate |
| **5** | Readiness H14, action center PX1, Hem live parenting PX2 | Coach-loop KX9, ändringsfeedback KX3 |
| **6+** | Capabilities Later, Mer/Extra borta, flerbarn PX5–PX10 | Min värld polish, KX6–KX7 |

---

## PR-granskningschecklista

```
□ Pri P0-rad utan implementation → blockerande
□ Varje P0 har Primary entry implementerad
□ Varje P0 med Secondary har minst en sekundär entré (utom deprecate-rader)
□ Ingen ny affärslogik i hub-filer (endast länkar + compose)
□ Barnprofil B9 snabbåtgärder finns (P0 Sprint 3)
□ /child-settings → /family/child/:id?tab=setup
□ /skattkammaren (förälder) → /rewards
□ Family utan GDPR/push/delete
□ Drawer fallback tills 80 % barnprofil-adoption
□ nav-config: native-tab-bar + parent-magic-shell + sidebar + mobile-nav
□ Header 🔔 + avatar på native (logout smoke)
□ Inga capabilities som nya primärflikar
□ daily-log.js, schedule.js, rewards-API orörda (non-goal)
□ CACHE_NAME bump i sw.js
□ Analytics: nav_hub_click, child_profile_section, readiness_action_click (Sprint 3+)
```

---

## Relation till andra dokument

| Dokument | Denna checklist |
|----------|-----------------|
| `vuxenmeny-v2.md` | Arkitektur + sprint — denna fil är **operations + acceptance** |
| `barnmeny-v2.md` | Barn-K/KX-rader kompletterar barn-världar |
| `component-feature-map.js` | Feature-gating för C-rader |

*Uppdatera denna fil när nya operationer läggs till — lägg alltid Pri, Mode, Primary/Secondary.*
