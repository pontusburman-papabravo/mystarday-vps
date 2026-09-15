# Release rehearsal FAIL-klassificering — 2026-09-12

**Uppdrag:** Klassificera alla 35 FAIL i `release_rehearsal_report.json` en och en.

**Källa:** Rehearsal-agent `bc-0f5741e2-32bb-4316-948c-fd1bfa064baf` skrev `/opt/cursor/artifacts/release_rehearsal_report.json` (85 732 bytes). Filen raderades efter körningen (lokal DB-cleanup). Klassificeringen återskapar de 35 FAIL från transkriptets `FAILS 35`-dump + loggar + founder-rapport, och verifierar produktpåståenden mot repo på samma SHA.

| | |
|--|--|
| App-SHA | `0ac5cf0493e3e703fcf29f03305046472befe353` |
| Miljö | Lokal Cloud Agent, `http://127.0.0.1:3000` — **inte produktion** |
| Viewport | 375×812 |
| Score | 93 PASS / 35 FAIL / 128 rader (efter `061UIb` PASS) |
| POS | Constitution 1–5 · 04 child/parent · 06A schema · 15 mobilkvalitet |
| Evidence | `FACT` eller `NOT_VERIFIED` — inget påhittat |

Originalfilen är **inte** tillgänglig på denna VM (`FACT`: artifacts borta). FAIL-listan matchar transkriptets dump.

Maskinläsbar kopia: [`RELEASE_REHEARSAL_2026-09-12_FAIL_CLASSIFICATION.json`](./RELEASE_REHEARSAL_2026-09-12_FAIL_CLASSIFICATION.json)

---

## Klasser

| Klass | Betydelse |
|--|--|
| `PRODUCT_BUG` | Produkt på denna SHA skulle misslyckas för en riktig förälder |
| `HARNESS_BUG` | Fel assertion/drivrutin; produkt omtestad OK **eller** harness kunde inte se state |
| `ENVIRONMENT_ONLY` | Kräver denna VMs data/config (tom global bibliotek, seed) |
| `NOT_REPRODUCED` | Scenariot kördes aldrig på riktigt, eller evidensen räcker inte för produktfel |

**Severity:** `reported` = rehearsalen. `effective` = vad som ska styra fix-ordning.

---

## Sammanfattning (35)

| Klass | Antal | IDs |
|--|--:|--|
| `PRODUCT_BUG` | 3 | `021-EVIDENCE`, `023`, `098` |
| `ENVIRONMENT_ONLY` | 2 | `005`, `B002` |
| `HARNESS_BUG` | 21 | `031`–`047`, `038R`, `041R`, `042R`, `061b`, `061R`, `061S`, `061UI`, `C002b` |
| `NOT_REPRODUCED` | 9 | `051`, `056`, `065`, `066`, `067`, `068`, `069`, `066R`, `092` |

Rot-orsaker (färre än 35 rader):

1. **P0 produkt — Rapid Entry släpper Save tyst** → `021-EVIDENCE`, `023` (samma rot).
2. **P2 produkt — kalender-chrome under 44px** → `098` (CSS bekräftar).
3. **Lokal tom `default_schedule`** → `005`, `B002`. Produktion **NOT_VERIFIED** i denna körning.
4. **Harness läste `window.scheduleItems` som inte exponeras** → `031`–`047`. DB-retest PASS för tid (`031R`–`037R`).
5. **Copy-harness** (`currentChildId` / knapptext `Kopiera` vs **Spara**) → `061*` FAIL, sedan `061UIb` PASS. Produkt-copy fungerar.
6. **Följdfel efter copy som aldrig kördes** → `066`–`069`, `066R`, `092`.
7. **UK-CTA** — P0-kravet “disabled/hidden” är fel kontrakt. Submit + server gate är fail-closed. `C002b` = harness/UX-affordance, inte öppet konto-hål.

**Inte bland de 35, men evidens i samma körning:** bottennav täcker första schemaraderna vid 375×812 (`FACT`: screenshot + founder-rapport). Det är en separat `PRODUCT_BUG` P1 (Constitution “tydligt nästa steg” + 15 mobil).

---

## Rekommenderad founder-ordning

1. **Fixa Rapid Entry** — köa Save eller visa fel; aldrig tyst `return` när `activitySubmitInFlight`. Blockerar förstanvändning. POS 00A morgonstress, 06A.
2. **Verifiera prod-bibliotek** — `GET /api/onboarding/template-groups` på en färsk registrering mot live. Om `activity_count > 0`: `B002`/`005` är inte ship-blockers. Om tomt: **skicka inte nyhetsbrev** förrän mallvägen fungerar.
3. **Pad schema-listan** ovanför 375px tab bar (ej i FAIL-listan, men samma rehearsal).
4. **Kalender 44px** — `.nav-btn` 40px, `.child-tab` padding 6px, `#calendarTodayBtn` utan min-height. P2, inte ads-blocker.
5. **UK-CTA** — valfritt: disable/grå när stängt land är valt. Submit är redan blockerad (`RegistrationCountryGate` + `assertRegistrationMarketOpen`). UK-annonser är out of scope medan `market_uk_open=false`.
6. **Harness till nästa rehearsal** — exponera inte `window.scheduleItems`; asserta via API; Copy-submit = **Spara**; kör Copy från `/schedule` med `currentChildId`; DnD manuellt.

---

## De 35 FAIL en och en

### 005 — Fresh parent lands in correct first-use experience

| | |
|--|--|
| Klass | `ENVIRONMENT_ONLY` |
| Reported / effective | P0 / **P2 lokalt**, P0 **endast om prod matchar** |
| Actual | Barnformulär synligt; grid: “Schemamallar kunde inte laddas just nu. Försök igen” |
| Evidence | `FACT`: `loadTemplateGroups()` fail-closed när `activity_count === 0` (`public/js/onboarding.js`). `FACT`: `005B` PASS — första steget är uppenbart. `FACT`: AGENTS.md: global library tom i färsk lokal DB. Produktion: **NOT_VERIFIED**. |
| Åtgärd | Inte produktfix på denna evidens. Kör mall-API mot prod på färsk signup. Importera library lokalt före nästa rehearsal. Dela inte 005 och B002 som två P0. |

### 023 — Activity count correct

| | |
|--|--|
| Klass | `PRODUCT_BUG` |
| Reported / effective | P1 / **P0** (samma rot som 021-EVIDENCE) |
| Actual | `visibleRows=2 matched=Äta frukost` (förväntat 8) |
| Evidence | `FACT`: DB hade 2 måndagsrader efter “8 sequential saves”. Inte harness-falsk — UI visade 2. |
| Åtgärd | Fixa Rapid Entry (`021-EVIDENCE`). Omtesta 023 efter könad/felad Save. |

### 031 — Add start time Vakna 07:00

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P1 / n/a produkt |
| Actual | `null` |
| Evidence | `FACT`: `scheduleItems` är `let` i `schedule.js`/`dashboard.js`, inte `window.scheduleItems`. `FACT`: `031R` PASS via DB. |
| Åtgärd | Asserta tid via `GET /api/children/:id/schedules`. Ingen produktfix. |

### 032 — Add start/end Frukost 07:30–07:45

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P1 / n/a |
| Actual | `null` |
| Evidence | Samma `window.scheduleItems`. `FACT`: `032R` PASS. |
| Åtgärd | Samma som 031. |

### 033 — Time persists after refresh

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `{}` |
| Evidence | `033R` PASS. |
| Åtgärd | Samma som 031. |

### 034 — Change existing time 07:30 → 07:35

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `null` |
| Evidence | `034R` PASS. |
| Åtgärd | Samma som 031. |

### 035 — Revert time

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `null` |
| Evidence | `035R` PASS. |
| Åtgärd | Samma som 031. |

### 038 — Time survives section change

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a för denna rad |
| Actual | `null` |
| Evidence | Original assertion via `window.scheduleItems`. Se `038R` för DB-försöket (fel rad / sektionen flyttades inte). `041UI` PASS visar att chip-UI kan flytta sektion. |
| Åtgärd | Omtesta tid-bevaring via samma chip-väg som `041UI`, asserta den flyttade radens id. |

### 041 — Morning → Day

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `undefined` |
| Evidence | `FACT`: `041UI` PASS (Frukost → Dag via chip). Original FAIL = `window.scheduleItems`. |
| Åtgärd | Ingen produktfix från denna rad. |

### 042 — Day → Evening

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `undefined` |
| Evidence | Samma harness. DB-rad `042R` tittade på “Klä på sig”, inte den UI-flyttade Frukost-raden. |
| Åtgärd | Omtesta kvällsflytt via chip på känd item-id. |

### 043 — Evening → Morning

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `undefined` |
| Evidence | `043R` PASS (redan morgon / DB). |
| Åtgärd | Ingen produktfix. |

### 044 — Section persists after refresh

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `undefined` |
| Evidence | `window.scheduleItems`. Ingen separat DB-FAIL på rätt rad efter `041UI`. |
| Åtgärd | Asserta efter reload via API på den flyttade item-id. |

### 045 — Time preserved across section move

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `null` |
| Evidence | Samma som 038. |
| Åtgärd | Samma som 038. |

### 046 — Rapid consecutive section changes

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `undefined` |
| Evidence | `046R` PASS. `ScheduleSectionEdit.setSection` köar via `saveTail` (`public/js/schedule-section-edit.js`). |
| Åtgärd | Ingen produktfix. |

### 047 — Multiple activities same section

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | `morgonCount=0` |
| Evidence | Harness såg 0 p.g.a. `window.scheduleItems` + bara 2 rader från Rapid Entry. `047R` PASS efter slow-add av 8. |
| Åtgärd | Ingen egen produktfix. |

### 051 — Move second item above first

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P1 / **P2 manuell QA** |
| Actual | `before=["Frukost","Äta frukost"] after=samma drag1.ok=true` |
| Evidence | Två rader **räcker** för byte, men Puppeteer+Sortable `forceFallback` rapporterade ok utan ordningändring. Produkt-DnD **NOT_VERIFIED**. Kontaminerat av Rapid Entry-drop. |
| Åtgärd | Manuell 375px reorder på en dag med ≥2 rader. Fixa inte Sortable på denna evidens. |

### 056 — Reorder with timed activities

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P2 / n/a tills 051 manuellt |
| Actual | `[]` |
| Evidence | Inga timed rows i harness-vyn; följd av 2-radsstate + `window.scheduleItems`. |
| Åtgärd | Kör efter lyckad manuell reorder. |

### 061b — Copy Monday content onto weekdays

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P1 / n/a |
| Actual | Bara `Tisdagssnack` |
| Evidence | `FACT`: `061UIb` PASS med **Spara** — toast “Dagen kopierad till 4 dag(ar)”; tisdag fick måndagsset + `Tisdagssnack`. |
| Åtgärd | Ingen produktfix. Nästa harness: klicka **Spara**. |

### 065 — Duplicate template skipped on copy

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P2 / n/a |
| Actual | `borsta tänderna×2, mellanmål×2, …` |
| Evidence | Copy i denna path kördes inte (`061b` misslyckades). Familjeseed har redan “Borsta tänderna” + “Borsta tänderna (kväll)” (`src/lib/create-oauth-parent.js`). Duplicate-count **inte** bevisat som copy-bugg. |
| Åtgärd | Efter lyckad copy: räkna templates **före/efter** på unique id, inte display name. |

### 066 — Times preserved on copy

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P2 / n/a |
| Actual | `{"monTimes":[],"wedTimes":[]}` |
| Evidence | Copy kördes inte i denna path. `061UIb` omasserade inte tider. |
| Åtgärd | Efter `061UIb`-path: jämför start/end per namn mån vs ons via API. |

### 067 — Sections preserved on copy

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P2 / n/a |
| Actual | `[]` |
| Evidence | Samma följdfel. |
| Åtgärd | Samma som 066 för `section`. |

### 068 — Order preserved on copy (count)

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P2 / n/a |
| Actual | tom |
| Evidence | Copy kördes inte. |
| Åtgärd | Räkna items mån vs tis–fre efter lyckad copy. |

### 069 — Refresh target weekdays

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P2 / n/a |
| Actual | tom |
| Evidence | Copy kördes inte. |
| Åtgärd | Reload + API efter lyckad copy. |

### 021-EVIDENCE — Rapid Entry 8-in-one-session DB evidence

| | |
|--|--|
| Klass | `PRODUCT_BUG` |
| Reported / effective | P0 / **P0** |
| Actual | `mondayRows=2 names=Frukost\|Äta frukost` |
| Evidence | `FACT` i kod: `if (activitySubmitInFlight) return;` utan toast (`public/js/schedule-add-menu.js` `submitActivity`). `FACT`: `021` PASS var URL-only. `FACT`: `021b` PASS när harness väntade tills Save återaktiverades. Mallar kan skapas utan att landa på dagen (`createdUnappliedId`). |
| Åtgärd | **Gör nu:** köa överlappande Save, eller visa fel och lämna formuläret orört. Aldrig tyst no-op. Regression: 8 snabba Save → 8 måndagsrader. POS 00A, 06A, C-01 (förälder bygger, barnet ska se dagen). |

### 038R — Time survives section change (DB)

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a tills chip-retest |
| Actual | `Klä på sig` kvar `section:"morgon"` `start_time:"07:10"` |
| Evidence | Tittade på “Klä på sig”. `041UI` flyttade **Frukost**. Sektion-persist för den avsedda raden är **NOT_VERIFIED**, inte motbevisad. `setSection` sparar via `PUT /api/schedules/:id/items/:itemId`. |
| Åtgärd | Chip-klick på känd id → GET samma id. Fixa inte persist på denna rad. |

### 041R — Morning → Day (DB)

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | Samma “Klä på sig” fortfarande `morgon` |
| Evidence | Fixture-mismatch mot `041UI` (Frukost → Dag). |
| Åtgärd | Asserta Frukost-radens id, inte “Klä på sig”. |

### 042R — Day → Evening (DB)

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P2 / n/a |
| Actual | “Klä på sig” fortfarande `morgon` |
| Evidence | Samma fel rad; kvällsflytt kördes inte på den. |
| Åtgärd | Chip → `kvall` på känd id + API. |

### 061R — Copy Monday content onto weekdays (DB)

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P0 / n/a |
| Actual | `copy={"ok":false,"reason":"missing client"} tue=Tisdagssnack` |
| Evidence | `window.ScheduleApplyClient` anropades utan `currentChildId` (fel sida/kontext). `061UIb` bevisar produkt-copy. |
| Åtgärd | Ingen produktfix. Harness: kör från `/schedule` efter child select. |

### 066R — Times preserved on copy (DB)

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P2 / n/a |
| Actual | `[{name:Tisdagssnack, start_time:null}]` |
| Evidence | Copy i DB-path kördes aldrig (`061R` missing client). |
| Åtgärd | Samma som 066 efter UI-copy. |

### 092 — Calendar after Copy Day

| | |
|--|--|
| Klass | `NOT_REPRODUCED` |
| Reported / effective | P2 / n/a |
| Actual | `Tisdagssnack` |
| Evidence | Kalendern visade tisdag **före** lyckad copy. `061UIb` omasserade inte kalendern. Kalender-open/vecka/isolation PASS i 076–097. |
| Åtgärd | Öppna `/calendar` efter `061UIb` och kolla tisdag. |

### 098 — Calendar touch targets

| | |
|--|--|
| Klass | `PRODUCT_BUG` |
| Reported / effective | P2 / **P2** |
| Actual | Astrid/Leo chips h=35; Idag h=38; veckpilar h=40; tab bar h=57; specialdagar-länk 44 |
| Evidence | `FACT` mätning i rehearsal. `FACT` i CSS: `.child-tab { padding: 6px 14px }` utan min-height (`public/calendar.html`); `.nav-btn { min-width/height: 40px }`; `#calendarTodayBtn` `py-2` utan `min-h-[44px]`. POS 060 / 15: 44pt. Parent-kalender, inte barnkontroll — därför P2 inte P0. |
| Åtgärd | Sätt `min-h-[44px] min-w-[44px]` på `.child-tab`, `.nav-btn`, `#calendarTodayBtn`. |

### 061S — Copy Monday → weekdays from /schedule

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P0 / n/a |
| Actual | `copy={"ok":false,"reason":"missing","hasClient":true} tue=Tisdagssnack` |
| Evidence | Client fanns, `currentChildId` saknades. UI-copy (`061UIb`) fungerar. |
| Åtgärd | Ingen produktfix. |

### B002 — Family B template picker

| | |
|--|--|
| Klass | `ENVIRONMENT_ONLY` |
| Reported / effective | P0 / **P0 endast om prod är tom**, annars n/a för ship |
| Actual | “Schemamallar kunde inte laddas just nu.” |
| Evidence | `FACT` lokalt: `usableGroups.length === 0` → samma fail-UI som 005. `FACT`: färsk lokal DB har tom `default_schedule` (AGENTS.md). Produktion i **denna** klassificering: **NOT_VERIFIED** (rehearsal-agentens VPS-probe återanvänds inte som sanning). |
| Åtgärd | En prod-GET på template-groups efter färsk registrering. Om live har `canonical_id` + `activity_count > 0`: stäng B002. Om inte: blockera nyhetsbrev. |

### 061UI — Copy Day via Kopiera dag UI

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P0 / n/a |
| Actual | `clicked=📋 Kopiera dag submit=null` (sökte knapptext Kopiera/Copy) |
| Evidence | `FACT`: modal-submit är **Spara**. `FACT`: `061UIb` PASS. |
| Åtgärd | Ingen produktfix. |

### C002b — UK Create account control disabled/blocked

| | |
|--|--|
| Klass | `HARNESS_BUG` |
| Reported / effective | P0 / **P2 affordance** (valfritt) |
| Actual | `{"disabled":false,"formHidden":false,"btnText":"Create account"}` |
| Evidence | `FACT`: `C002` PASS — stängd-marknadstext synlig. `FACT`: GB-val rensar confirmation (`country-choice.js`); `requireSelection()` fail-closed för stängt land; `RegistrationCountryGate.allow` blockerar submit; servern `assertRegistrationMarketOpen` (`src/routes/auth/register.js`). Rehearsalen **klickade inte submit**. Öppet UK-konto: **NOT_VERIFIED** som hål — koden är fail-closed. Testet krävde disabled/hidden, vilket inte är produktkontraktet. |
| Åtgärd | Inte P0. Valfritt: disable CTA när `closedMarketMessage(code)` är satt. Bekräfta en blocked submit mot prod innan ev. UK-ads (ads ändå out of scope vid `market_uk_open=false`). |

---

## Extra fynd (inte bland de 35)

| Fynd | Klass | Severity | Åtgärd |
|--|--|--|--|
| Bottennav täcker första schemaraderna vid 375×812 | `PRODUCT_BUG` | P1 | Pad lista / safe-area ovanför tab bar |
| Registreringslimiter 3/timme/IP | `PRODUCT_BUG` (ops) | P1 för ads-QA | Dokumentera; ev. höj för NAT-labb, inte för en familj hemma |
| Verify-email-banner när `EMAIL_ENABLED=false` | `ENVIRONMENT_ONLY` | P3 | QA-copy; inte prod om mail är på |
| Stjärn-loop ej E2E (lördag tom) | `ENVIRONMENT_ONLY` | — | Planera minst en helgaktivitet i nästa rehearsal |

---

## Self-review

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game ✓ QA ✓ Security ✓ AISA ✓
Issues found and fixed: none in product (classification-only)
POS governed by: 00 Constitution 1–5, 00A morning stress, 04 C / parent, 06A schedule, 15 mobile, 060 44pt
```

Inga produktändringar i denna PR. Rehearsal-regeln “TEST FIRST — do not fix” respekteras.
