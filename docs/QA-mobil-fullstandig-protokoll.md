# QA — Fullständigt mobiltest (Förälder + Barn)

**Version:** 1.2  
**Datum:** 2026-06-25  
**Miljö:** iPhone 14 Pro-lik viewport (390×844), touch, sv-SE  
**App:** Min Stjärndag (mystarday.se / lokal dev)

---

## 1. Syfte & nivåer

Detta dokument är **masterplanen** för mobil-QA. Det används i **tre nivåer** — olika frekvens, olika djup:

| Nivå | Namn | Omfattning | När |
|------|------|------------|-----|
| **0** | **Release Gate** | ~48 punkter (§0) | Varje release / hotfix — **måste vara grön** |
| **1** | **Full Mobile Regression** | 225 användarflöden (§3) + 14 boot-kontrakt (§Z) | Veckovis / före större leverans |
| **2** | **Exploratory UX Pass** | ~15 heuristiker (§8) | Ad hoc, polish, ny feature |

**Scope (oförändrat):**

- Förälder: fem primärflikar + djup-länkar, barnprofil, inställningar
- Barn: tre världar + Parental Gate
- Flerbarn: två barn, separata PIN, korsflöden

Automatisering:

```bash
npm run qa:mobile-gate   # Release Gate §0 (~43 auto + 13 manuella)
npm run qa:mobile-full   # Gate + full subset + alla §Z
```

Se `docs/QA-mobil-release-gate-runbook.md` (1 sida) och `docs/QA-mobil-v1.2-review.md`.

---

## 0. Release Gate — Core Mobile (måste vara grön)

**Tid:** ~25–40 min manuellt + automatiserad smoke.  
**Regel:** Ett enda `[G]`-fail = **release blocker** (om inte explicit waiver med ticket).

### Gate-lista (56 explicit ID)

| ID | Kategori | Kort beskrivning |
|----|----------|------------------|
| A01 | Infra | `/health` healthy |
| A05 | Infra | Förälder API-login |
| A06 | Infra | Två barn i API |
| A07 | Infra | Barn 1 PIN API (Astrid) |
| A08 | Infra | Barn 2 PIN API (Erik) |
| C01 | Auth | UI-login |
| C02 | Auth | Rollväljare dold |
| C04 | Auth | Bottennav 5 flikar |
| C10 | Auth | Logga ut → `/login` |
| Z01 | Boot | NavConfig + primärnav |
| D01 | Hem | Dashboard laddar |
| D02 | Hem | Båda barnkort |
| D11 | Hem | Handoff barninloggning |
| E01 | Planering | Hub laddar |
| E02 | Planering | → Daglig logg |
| E03 | Planering | → Schema |
| F01 | Daglig logg | Sida laddar |
| F04 | Daglig logg | Bocka av |
| F05 | Daglig logg | Ångra bock |
| F07 | Daglig logg | Pausa dag |
| F08 | Daglig logg | Återuppta dag |
| G01 | Schema | Sida laddar |
| G04 | Schema | Lägg till aktivitet `[M]` |
| G05 | Schema | Redigera aktivitet `[M]` |
| I01 | Belöningar | Hub laddar |
| I03 | Belöningar | Godkänn inlösning |
| I04 | Belöningar | Neka inlösning `[M]` |
| K01 | Familj | Lista laddar |
| K02 | Familj | Båda barn listade |
| K03 | Familj | → Barnprofil `[M]` |
| L01 | Barnprofil | Öppna profil |
| L02 | Barnprofil | Overview |
| L07 | Barnprofil | Setup-tab `[M]` |
| L08 | Barnprofil | Barnvy-handoff `[M]` |
| O01 | Barn login | Barnlogin-sida |
| O03 | Barn login | PIN Astrid → Idag |
| O06 | Barn login | PIN Erik → Idag |
| P01 | Barn Idag | Landning `/child/today` |
| P03 | Barn Idag | Bocka av |
| P04 | Barn Idag | Stjärna efter bock |
| Q01 | Barn värld | Min värld |
| Q04 | Barn värld | Begär belöning |
| R01 | Barn familj | Mina personer |
| S02 | Barn system | Parental Gate `[M]` |
| S04 | Barn system | Byt barn `[M]` |
| S05 | Barn system | Förälder-meny `[M]` |
| S07 | Barn system | Logout `[M]` |
| T01 | Flerbarn | Separata saldon (API) |
| T02 | Flerbarn | Separata scheman `[M]` |
| T04 | Flerbarn | Byte isolerar data `[M]` |
| T05 | Flerbarn | Erik efter Astrid `[M]` |
| U01 | Mobil | Ingen H-scroll |
| U02 | Mobil | Inga JS-crash |
| Z04 | Boot | Specialdagar (dashboard) |
| Z05 | Boot | ScheduleCore |
| Z06 | Boot | Schema modaler |

**Snabbkörning:**

```bash
node scripts/seed-smoke-family.mjs
npm run qa:mobile-gate
# + manuella: docs/QA-mobil-release-gate-runbook.md (G04–G05, I04, K03, L07–L08, S02–S07, T02, T04–T05)
```

---

## 2. Testprotokoll

### 2.1 Förutsättningar

| Krav | Detalj |
|------|--------|
| Enhet / emulator | Mobil viewport 390×844, `hasTouch: true` |
| Språk | Svenska (sv-SE) |
| Cookies | Godkänn cookie-banner vid första sidladdning |
| E-postverifiering | Av (`REQUIRE_EMAIL_VERIFICATION=false` i dev) |
| Familj | Skapas med `scripts/seed-smoke-family.mjs` (idempotent) |

### 2.2 Global mobil-baseline (gäller alla sidor)

Varje `[M]`-test ska **implicit** verifiera detta om inget annat anges:

| # | Krav | Oracle (pass/fail) |
|---|------|---------------------|
| M1 | Ingen horisontell scroll | `document.documentElement.scrollWidth ≤ viewport + 2px` |
| M2 | Bottennav (förälder/barn) | Synlig, inte täckt av keyboard eller safe-area |
| M3 | Touch-targets | Primära knappar/flikar ≥44×44 px |
| M4 | Sticky header | Täcker inte aktivt fokusfält eller modal-CTA |
| M5 | Safe-area | Innehåll inte klippt vid notch/home-indikator |
| M6 | Svenska texter | Wrap utan overflow; inga avklippta knappetiketter |
| M7 | Loading | Spinner/skeleton försvinner ≤15 s; CTA disabled under save |
| M8 | Console | Inga nya `pageerror` / röda nätverksfel (500) på sidan |

### 2.3 Testfamilj (credentials)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
export BASE="http://127.0.0.1:3000"   # eller https://mystarday.se
export SMOKE_PARENT_EMAIL="qa.mobil@test.stjarndag.local"
export SMOKE_PARENT_PASSWORD from secret store
export SMOKE_CHILD_NAME="Astrid"
export SMOKE_CHILD_PIN="4829"
export SMOKE_CHILD2_NAME="Erik"
export SMOKE_CHILD2_PIN="7391"
node scripts/seed-smoke-family.mjs
```

| Roll | Användarnamn | PIN / lösenord |
|------|---------------|----------------|
| Förälder | `qa.mobil@test.stjarndag.local` | `SMOKE_PARENT_PASSWORD (secret store)` |
| Barn 1 | Astrid | `4829` |
| Barn 2 | Erik | `7391` |

> **Prod:** Skapa aldrig testkonton utan godkännande. PIN `FOUNDER_CHILD_PIN` är globalt upptagen — använd unika PIN.

### 2.4 Körordning

| Steg | Nivå | Aktivitet |
|------|------|-----------|
| 1 | Alla | Seed familj (2 barn) |
| 2 | 0 | `smoke-mobile-full-qa.mjs` + manuella Gate `[G]`-rader |
| 3 | 1 | Full regression §3 (resterande `[M]`) + §Z boot |
| 4 | 2 | Exploratory §8 (valfritt) |
| 5 | Alla | Rapport §5 |

### 2.5 Godkännandekriterier

| Nivå | Krav |
|------|------|
| **Release Gate (§0)** | 100 % av `[G]` gröna; inga P0 JS-crash |
| **Full regression** | ≥95 % av §3 gröna; alla P0 gröna; P1-fel med ticket |
| **Exploratory** | Findings loggas; inget krav på pass rate |

### 2.6 Failure evidence (obligatoriskt vid ❌)

Vid varje underkänt test ska följande sparas i `artifacts/mobile-full-qa/failures/<ID>/`:

| Artefakt | Innehåll |
|----------|----------|
| Screenshot | Hela viewport + ev. modal |
| `context.json` | test-ID, URL, viewport, valt barn, datum i UI, roll (förälder/barn) |
| Console | Relevanta `pageerror` / röda nätverksanrop (status + URL) |
| Build | `/health` version, SW `CACHE_NAME`, git commit |
| Ticket | Länk till issue |

### 2.7 Automatisering

```bash
npm run qa:mobile-gate    # QA_MODE=gate — Release Gate auto
npm run qa:mobile-full    # QA_MODE=full — regression subset + §Z
SMOKE_HEADED=1 SMOKE_SLOW_MS=80 npm run qa:mobile-full
```

Artifacts: `artifacts/mobile-full-qa/` (`results.json`, `gate-results.json`, `rapport.md`, screenshots).

ID-registry: `scripts/lib/qa-gate-ids.mjs` · Gate-flöden: `scripts/lib/mobile-qa-gate-flows.mjs`.

### 2.8 Ägarskap per kategori

| Kategori | Primär owner | Vid fail — eskalera till |
|----------|--------------|--------------------------|
| A, B, U | Platform / infra | Backend + deploy |
| C, N | Auth / platform | `auth.js`, session |
| D | Frontend parent (Hem) | `dashboard-*`, home-hub |
| E, F, G | Planering / domain | `daily-log.js`, `schedule.js` |
| H | Bibliotek | `library-*`, activities API |
| I | Belöningar | `rewards.js`, redemptions API |
| J | Tillväxt / För dig | `for-dig` routes |
| K, L | Familj / barnprofil | `family.js`, `family-child` |
| M | Rapporter (gated) | `reports.js` |
| O–S | Barn experience | `child-*`, parental-gate |
| T | Flerbarn (tvärgående) | Den kategori där felet syns |
| V | Degraded / edge | Berörda team ovan |
| Z | Client contracts | Frontend build / split-moduler |

### 2.9 Seed/data-kontrakt

| Profil | Script | Syfte |
|--------|--------|-------|
| **happy** (default) | `seed-smoke-family.mjs` | Gate + regression — 2 barn, aktiviteter idag |
| **empty-day** | Manuell / framtida seed | V01 tom dag |
| **pending-reward** | happy + stjärnor | I03/I04 — barn måste ha affordable reward |

### 2.10 Known flaky areas

| Område | Mitigation |
|--------|------------|
| Onboarding redirect | Script → `/dashboard` |
| Child-login utan session | Manual name fallback |
| Q04 utan saldo | Seed stjärnor eller manuell I03 |
| T01 båda 0 stjärnor | OK för smoke; manuell ≠ om krävs |
| Prod PIN 1112 | Använd 4829/7391 |
| Cookie-banner | Godkänn vid första sidladdning |
| SW-cache | Verifiera `CACHE_NAME` i `/sw.js` |

---

## 3. Full Mobile Regression — användarflöden (225 st)

**Förkortningar:** `[G]` = Release Gate · `[A]` = automatiserbar · `[M]` = manuell · `[Z]` = se §Z (boot-kontrakt)

### A — Setup & infrastruktur (7)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| A01 | ✓ | P0 | [A] | `GET /health` | JSON `status: "healthy"`, `version` satt |
| A02 | | P0 | [A] | PWA-smoke (manifest + ikon) | `/manifest.json` 200 + namn innehåller Stjärndag; `/icon-192.png` 200 |
| A03 | | P0 | [A] | `GET /sw.js` | 200; `CACHE_NAME` matchar repo |
| A05 | ✓ | P0 | [A] | Förälder login API | POST login → 200, session-cookie satt |
| A06 | ✓ | P0 | [A] | Två barn i API | `GET /api/children` → array length ≥2 |
| A07 | ✓ | P0 | [A] | Barn 1 PIN API | POST child-login Astrid → 200 |
| A08 | ✓ | P0 | [A] | Barn 2 PIN API | POST child-login Erik → 200 |

### B — Publik & cookie (5)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| B01 | | P1 | [A] | `/` landning | 200; minst en primär CTA synlig above fold |
| B02 | | P1 | [A] | `/login` | `#email`, `#password`, `#submitBtn` synliga |
| B03 | | P1 | [A] | `/child-login` | Profilväljare, manuellt namn **eller** PIN-steg |
| B04 | | P1 | [A] | Cookie-banner | Klick "Godkänn alla" → banner borta (ej `display:none` på `#cb-banner` kvar) |
| B06 | | P2 | [M] | Footer Guider-länkar | Minst 3 interna länkar → 200, ingen 404 |

### C — Förälder: inloggning & session (8)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| C01 | ✓ | P0 | [A] | UI-login | Redirect till `/dashboard` (eller `/onboarding` → dashboard) |
| C02 | ✓ | P0 | [A] | Rollväljare dold | `#role-selection` saknas eller `display:none` |
| C04 | ✓ | P0 | [M] | Bottennav 5 flikar | Synliga etiketter: Hem · Planering · Belöningar · För dig · Familj; aktiv flik markerad |
| C05 | | P1 | [A] | Auth API smoke | `GET /api/auth/me` 200 + email; `POST /api/auth/refresh` 200 |
| C07 | | P1 | [M] | Felaktigt lösenord | Inline-fel visas; sidan reloadar inte; inget `[object Object]` |
| C08 | | P1 | [A] | Barnflöde separat | `/child-login` i ny context utan förälder-cookie fungerar |
| C09 | | P2 | [A] | `/upgrade` redirect | → `/dashboard` eller `/settings#prenumeration` |
| C10 | ✓ | P0 | [A] | Logga ut | Efter logout: URL `/login` eller `/`; `/api/auth/me` → 401 |

### D — Hem / Dashboard (15)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| D01 | ✓ | P0 | [A] | Sida laddar | HTTP 200; body >80 tecken; inga pageerror |
| D02 | ✓ | P0 | [A] | Båda barnkort | Text innehåller "Astrid" **och** "Erik" |
| D03 | | P0 | [M] | Expandera barnkort | Klick expand → status idag + stjärnor + paus syns; collapse återställer |
| D06 | | P1 | [M] | Ge stjärnor-modal | Öppna → modal synlig → Avbryt stänger utan sidbyte |
| D07 | | P1 | [M] | Kopiera dag-modal | Öppna → minst ett datumfält → stäng utan fel |
| D09 | | P1 | [M] | Pausa dag | Efter paus: barnkort visar paus/ledig; daglig logg samma state |
| D10 | | P1 | [M] | Återuppta dag | Paus-indikator borta; aktiviteter tillbaka i logg |
| D11 | ✓ | P1 | [A] | Handoff barn | Element med `[data-action="child-login"]` eller länk `/child-login` |
| D12 | | P2 | [M] | Aktiveringsbanner | Flag på → banner med CTA; flag av → ingen banner |
| D13 | | P2 | [M] | Systemmeddelande | Om aktivt: banner läsbar + går att stänga/markera |
| D14 | | P1 | [A] | Notis-ikon | `a[href="/notifications"]` i header |
| D15 | | P1 | [A] | Avatar → settings | Klick avatar/meny → `/settings` |
| D16 | | P2 | [M] | Dela schema | Share-sheet **eller** kopiera-länk-toast; ingen crash |
| D17 | | P1 | [M] | Tidslinje-vy | 1) FM/EM/Kväll-rubriker syns · 2) aktivitet under rätt sektion · 3) tom sektion = tom state, ej layoutbrott · 4) tillbaka till standardvy behåller valt barn |
| D18 | | P1 | [M] | Side-by-side vy | 1) Växling utan pageerror · 2) samma barn fortfarande valt · 3) inga överlappande kolumner utanför viewport |

### E — Planering hub (9)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| E01 | ✓ | P0 | [A] | Hub laddar | `/planning` 200, planeringskort synliga |
| E02 | ✓ | P0 | [A] | → Daglig logg | Navigering till `/daily-log` |
| E03 | ✓ | P0 | [A] | → Schema | Navigering till `/schedule` |
| E04 | | P1 | [A] | → Bibliotek / Kalender / Tilldela | Respektive URL laddar 200 |
| E08 | | P1 | [M] | Hub-kort touch | Ett tryck navigerar; inget dubbelkrav |
| E09 | | P2 | [M] | TEACCH / barn-stöd (gated) | Ej köpt → dold eller upgrade-CTA; köpt → länk fungerar |
| E10 | | P1 | [A] | Schema = hard nav | `/schedule` full page load (inte soft-nav spinner) |

### F — Daglig logg (16)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| F01 | ✓ | P0 | [A] | Sida laddar | 200; barnväljare eller aktiv lista synlig |
| F02 | | P0 | [M] | Välj Astrid | Lista uppdateras till Astrids aktiviteter (namn/antal ändras) |
| F03 | | P0 | [M] | Välj Erik | Annat innehåll än F02 (minst ett ID/namn skiljer sig) |
| F04 | ✓ | P0 | [M] | Bocka av | Aktivitet → completed UI; stjärna/saldo +1 inom 3 s |
| F05 | ✓ | P0 | [M] | Ångra avbockning | Completed UI borta; stjärna/saldo −1 |
| F06 | | P1 | [M] | Hel sektion klar | Alla i sektion completed; ingen halv-state kvar |
| F07 | ✓ | P0 | [M] | Pausa dag | Banner/text "Ledig/pausad"; inga checkboxes aktiva |
| F08 | ✓ | P0 | [M] | Återuppta dag | Checkboxes tillbaka; paus-banner borta |
| F09 | | P1 | [M] | Backfill igår | Datum igår → spara avbockning → finns kvar efter reload |
| F10 | | P1 | [M] | Bump-tid +15 | Visad tid ökar ~15 min; persisted efter reload |
| F11 | | P2 | [M] | Föräldrabetyg | Rating sparas; syns vid reload |
| F12 | | P2 | [M] | Skriv ut | `window.print` eller print-preview öppnas |
| F13 | | P1 | [M] | D&D ordning | Drag → drop → ordning ändrad efter reload |
| F14 | | P1 | [A] | Deep link childId | URL behåller `childId`; rätt barn förvalt |
| F15 | | P1 | [A] | Deep link date | URL behåller `date=`; rätt dag i UI |
| F16 | | P2 | [M] | Engångsaktivitet | Ny rad syns idag; finns ej imorgon |

### G — Schema (16)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| G01 | ✓ | P0 | [A] | Sida laddar | 200; veckogrid eller tom-state; inga pageerror |
| G02 | | P0 | [M] | Välj Astrid | Veckokolumner visar Astrids aktiviteter |
| G03 | | P0 | [M] | Välj Erik | Schema skiljer sig från G02 |
| G04 | ✓ | P0 | [M] | Lägg till aktivitet | Modal → spara → aktivitet syns i grid samma dag |
| G05 | ✓ | P0 | [M] | Redigera aktivitet | Ändra titel/tid → spara → ändring kvar efter reload |
| G06 | | P1 | [M] | Ta bort aktivitet | Bekräftelse → borta från grid + reload |
| G07 | | P1 | [M] | "Bara denna dag" | Borta en dag; kvar andra dagar i veckan |
| G08 | | P1 | [M] | Kopiera dag | Källa → mål → måldag matchar källans items |
| G09 | | P1 | [M] | Kopiera till syskon | Eriks dag får kopia av Astrids items |
| G12 | | P1 | [M] | Infoga dag | Insert-modal → ny dag får items |
| G13 | | P1 | [M] | Specialdagar | 1) Kalender öppnas · 2) välj datum → redigera · 3) sparad override syns i grid · 4) ingen dubbel aktivitet samma slot |
| G14 | | P2 | [M] | Byt dag (swap) | Dag A ↔ B innehåll bytt; övriga dagar orörda |
| G15 | | P1 | [M] | Familjevecka | `?view=family` visar flera barn; scroll OK |
| G16 | | P1 | [M] | Engångsaktivitet | Syns en dag; försvinner nästa vecka |
| G17 | | P1 | [M] | Återkommande | Valda dagar får samma item; ej valda dagar utan |
| G18 | | P2 | [M] | Skriv ut | Print-preview utan klippt grid |

### H — Bibliotek & aktiviteter (12)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| H01 | | P0 | [A] | Hub laddar | `[data-library-section="standard"]` + `mine` synliga |
| H02 | | P0 | [M] | Skapa aktivitet | Ny rad i "Mina"; syns i schema-picker |
| H03 | | P0 | [M] | Redigera aktivitet | Ändrat namn efter reload |
| H04 | | P1 | [M] | Delsteg | ≥1 delsteg sparat; syns i barnvy om aktivitet används |
| H05 | | P1 | [M] | Skapa belöning | Belöning i lista + kan väljas i rewards |
| H06 | | P1 | [M] | Kopiera standard | Import toast/confirm → aktivitet i "Mina" |
| H08 | | P1 | [M] | Kategorier | CRUD: skapa → listad → radera borta |
| H09 | | P1 | [M] | Ordna belöning | Drag ordning → persisted |
| H10 | | P1 | [A] | `/activities` | 200; lista eller tom-state |
| H11 | | P2 | [M] | Sök/filter | Sökterm minskar lista; rensa återställer |
| H13 | | P2 | [M] | Emoji på aktivitet | Emoji syns i bibliotek **och** schema |
| H14 | | P2 | [M] | Radera aktivitet | Confirm → borta; ej i schema-picker |

### I — Belöningar (13)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| I01 | ✓ | P0 | [A] | Hub laddar | `/rewards` 200 |
| I02 | | P0 | [A] | Skattkammaren redirect | Inloggad förälder → URL innehåller `/rewards` |
| I03 | ✓ | P0 | [M] | Godkänn inlösning | Pending → approved; försvinner från pending-lista |
| I04 | ✓ | P0 | [M] | Neka inlösning | Pending → rejected; barn ser avslag (Q13) |
| I05 | | P0 | [M] | Godkänn måländring | Nytt mål aktivt; gammalt ersatt |
| I06 | | P1 | [M] | Extra stjärnor | Saldo +N; syns i barnvy inom 30 s |
| I07 | | P1 | [M] | Sätt mål | Måltext + stjärnkostnad syns i hub + barnvy |
| I08 | | P1 | [M] | Dölj belöning | Ej listad i barnets inlösenlista |
| I09 | | P2 | [M] | Familjekista toggle | Toggle sparad; UI reflekterar on/off |
| I10 | | P2 | [M] | Familjemuseum | 1) Widget/sektion renderas · 2) tom = "ingen data"-text · 3) ingen 500-toast |
| I11 | | P1 | [A] | Pending API | `GET pending-requests` → 200/204, ej 500 |
| I12 | | P1 | [M] | Stjärnhistorik teaser | 1) Diagram **eller** sammanfattningstext · 2) länk till progress · 3) inga NaN/undefined i UI |
| I14 | | P1 | [M] | Touch godkänn | Knapp ≥44 px; ett tryck räcker; ingen dubbel-submit |

### J — För dig (7)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| J01 | | P0 | [A] | Sida laddar | `/for-dig` 200; minst ett mål-/kort |
| J02 | | P1 | [M] | Bläddra mål | Vertikal scroll fungerar; sista kort nåbart |
| J03 | | P1 | [M] | Aktivera mål | CTA → bekräftelse/toast; mål markeras aktivt |
| J04 | | P2 | [M] | Favorit | Stjärna/heart togglad; kvar efter reload |
| J05 | | P2 | [M] | Feedback | Submit → tack-meddelande; formulär nollställs |
| J06 | | P1 | [M] | Paketcoach (gated) | Ej köpt → låst/CTA till settings; köpt → innehåll expanderbart |
| J08 | | P1 | [A] | Goals API | `GET /api/for-dig/goals` → 200 |

### K — Familj (11)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| K01 | ✓ | P0 | [A] | Sida laddar | `/family` 200 |
| K02 | ✓ | P0 | [A] | Båda barn | Astrid + Erik i lista |
| K03 | ✓ | P0 | [M] | → Barnprofil | Klick → `/family/child/<uuid>` |
| K04 | | P1 | [M] | Lägg till barn | Wizard/modal → nytt barn i lista |
| K05 | | P1 | [M] | Bjud in medförälder | Form submit → success-toast; pending invite listed |
| K06 | | P1 | [M] | Återkalla invite | Invite försvinner; token ogiltig |
| K07 | | P2 | [M] | Omsortera barn | Ny ordning efter reload |
| K09 | | P1 | [M] | Lista vuxna | ≥1 vuxen; roll etikett synlig |
| K10 | | P2 | [M] | Pedagog (gated) | Sektion dold eller länk enligt feature |
| K11 | | P1 | [A] | Inga GDPR på /family | Ingen "radera konto"/export på family-sidan |
| K12 | | P1 | [M] | Familjemuseum widget | Render **eller** dold om av; ingen crash |

### L — Barnprofil (13)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| L01 | ✓ | P0 | [A] | Öppna profil | URL `/family/child/<uuid>` |
| L02 | ✓ | P0 | [A] | Overview default | Tab overview aktiv; status idag synlig |
| L03 | | P0 | [M] | Tab log | → `/daily-log?childId=` med rätt UUID |
| L04 | | P0 | [M] | Tab schema | Veckosammanfattning + CTA → schedule |
| L05 | | P0 | [M] | Tab rewards | Extra stjärnor + mål-sektion renderad |
| L06 | | P1 | [M] | Tab progress | Diagram/teaser; länk reports om gated |
| L07 | ✓ | P0 | [M] | Tab setup | PIN-fält + vy-toggle synliga |
| L08 | ✓ | P0 | [M] | Tab child-view | Handoff → child-login eller barnvy |
| L09 | | P0 | [M] | Snabb: pausa | Paus från overview → samma som F07 |
| L10 | | P0 | [M] | Snabb: extra stjärnor | Modal → spara → saldo ökar |
| L11 | | P1 | [M] | Ändra PIN | Ny PIN → child-login fungerar med ny kod |
| L12 | | P1 | [M] | Avatar upload | Bild **eller** emoji-fallback; ingen trasig `<img>` |
| L14 | | P1 | [A] | child-settings redirect | → `/family/child/:id?tab=setup` |

### M — Rapporter (6)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| M01 | | P1 | [A] | Sida laddar | 200 **eller** 403/redirect om ej köpt |
| M02 | | P1 | [M] | Välj barn | Byte barn → data/tidsintervall uppdateras (ej samma rader) |
| M03 | | P1 | [M] | Flikar | Aktiviteter ↔ Observationer utan reload-crash |
| M04 | | P2 | [M] | Delningslänk | Skapa → PIN + utgångsdatum visas; länk kopierbar |
| M05 | | P2 | [M] | Observation | Spara → listed; reload behåller text |
| M06 | | P2 | [M] | Tabell-scroll | Horisontell scroll **inuti** tabell OK; body scrollWidth OK |

### N — Inställningar & notiser (12)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| N01 | | P0 | [A] | Settings laddar | 200; minst Konto + Notiser synliga |
| N02 | | P0 | [M] | Ändra namn | Spara → namn i header uppdaterat |
| N03 | | P1 | [M] | Byt lösenord | Success → login med nytt lösenord |
| N04 | | P1 | [M] | Notispreferenser | Toggle → reload behåller state |
| N05 | | P1 | [M] | Push/PWA | Instruktionstext synlig; inga dead links |
| N07 | | P1 | [M] | Mörkt läge | `html`/body class togglas; kvar efter nav |
| N08 | | P1 | [M] | Förälder-PIN | Sätt PIN → parental gate accepterar |
| N09 | | P1 | [A] | Prenumeration | Sektion renderas eller dold (billing av) |
| N12 | | P0 | [A] | Notiser | `/notifications` 200 |
| N13 | | P1 | [M] | Markera läst | Unread badge −1; rad markerad |
| N14 | | P1 | [A] | Unread API | `GET unread-count` → 200 number |

### O — Barn: inloggning (8)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| O01 | ✓ | P0 | [A] | Barnlogin-sida | `/child-login` 200 |
| O02 | | P0 | [M] | Välj Astrid | PIN-steg `#clStepPin.active` |
| O03 | ✓ | P0 | [M] | PIN Astrid | 4829 → `/child/today` inom 5 s |
| O04 | | P0 | [M] | Fel PIN | Feltext; stannar på PIN; ej utelåst vid 1 försök |
| O05 | | P0 | [M] | Välj Erik | Annat barn i picker |
| O06 | ✓ | P0 | [M] | PIN Erik | 7391 → `/child/today`; header visar Erik |
| O07 | | P1 | [M] | Manuellt namn | `#clManualNameForm` → PIN → login OK |
| O08 | | P1 | [A] | Legacy redirect | `/child-dashboard` → `/child/today` |

### P — Barn: ☀️ Idag (14)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| P01 | ✓ | P0 | [A] | Landning Idag | URL `/child/today` |
| P02 | | P0 | [M] | Aktivitetslista | ≥1 aktivitet **eller** tydlig tom-state ("inget schema") |
| P03 | ✓ | P0 | [M] | Bocka av | Completed styling + ev. animation |
| P04 | ✓ | P0 | [M] | Stjärna | Saldo i header/värld +1 |
| P05 | | P1 | [M] | Delsteg expand | Checklista synlig; ≥1 delsteg klickbart |
| P06 | | P1 | [M] | Delsteg bock | Progress "X/Y" uppdateras |
| P07 | | P1 | [M] | Mood-rating | Modal endast om `show_mood_rating`; skip om av |
| P08 | | P1 | [M] | Pausad dag | "Ledig idag"; inga checkboxes |
| P09 | | P1 | [M] | Veckonav | Byta dag → annat datums items |
| P10 | | P2 | [M] | Progress-ring | % matchar completed/total |
| P13 | | P2 | [M] | TEACCH overlay | Fullskärm; Escape → tillbaka Idag |
| P14 | | P2 | [M] | Coach-loop | "Bra jobbat" + knapp till nästa steg |
| P15 | | P1 | [M] | Dagsvy/veckovy | Toggle utan crash; data kvar |
| P16 | | P2 | [M] | Skriv ut | Print dialog |

### Q — Barn: 🏰 Min värld (13)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| Q01 | ✓ | P0 | [A] | Navigera | `/child/world` |
| Q02 | | P0 | [M] | Stjärnsaldo | Siffra matchar API ±0 |
| Q03 | | P0 | [M] | Målprogress | Text "X av Y" eller progressbar |
| Q04 | ✓ | P0 | [M] | Begär belöning | Pending skapas; syns i förälder I03 |
| Q05 | | P1 | [M] | Lösa in flow | Barn pending → förälder godkänner → saldo −kostnad |
| Q06 | | P1 | [M] | Universum hub | 1) Stjärnkistan klickbar utan unlock · 2) ≥1 rum synligt · 3) tillbaka-knapp till hub |
| Q07 | | P1 | [M] | Rum navigation | Hub → rum → tillbaka = hub; URL/hash stabil |
| Q08 | | P1 | [M] | Låst rum | Lås-ikon + unlock-krav (stjärnor); klick blockerad |
| Q09 | | P2 | [M] | Avatar | Redigera om unlockad; annars ⏭ |
| Q10 | | P2 | [M] | Husdjur | Interaktion om unlockad; annars ⏭ |
| Q12 | | P1 | [M] | Manuella stjärnor | Efter I06: Stjärnfronten/lista visar +N |
| Q13 | | P2 | [M] | Pending status | Text "Väntar på godkännande"; ej dubbel-inlösen |
| Q14 | | P2 | [M] | Tema | Byte slott/träd/rymd → bakgrund ändras |

### R — Barn: ❤️ Mina personer (8)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| R01 | ✓ | P0 | [A] | Navigera | `/child/family` |
| R02 | | P0 | [M] | Personkort | ≥1 vuxen: namn + emoji/avatar |
| R03 | | P1 | [M] | Vi tillsammans | Aggregerade stjärnor som siffra; **ingen** redigerbar input |
| R04 | | P1 | [M] | Familjeprojekt | Tom = "inget projekt"-text; med data = titel synlig |
| R05 | | P2 | [M] | Berättelse-feed | Read-only lista; inga edit-knappar för barn |
| R07 | | P2 | [M] | Pedagog (gated) | Extra personkort om pedagog kopplad; annars ⏭ |
| R08 | | P1 | [M] | Scroll smal skärm | Alla kort nåbara; inget klippt under bottennav |

### S — Barn: system & Parental Gate (8)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| S01 | | P0 | [M] | Vuxenikon | Synlig i header (⚙️ eller liknande) |
| S02 | ✓ | P0 | [M] | PG krävs | Systemmeny **ej** öppen utan PIN |
| S03 | | P0 | [M] | Fel PIN | Gate stängd; felmeddelande |
| S04 | ✓ | P0 | [M] | PG OK → byt barn | Barnväljare/lista öppnas |
| S05 | ✓ | P0 | [M] | Byt till Erik | Session visar Erik i header |
| S06 | | P1 | [M] | Mörkt läge via gate | Tema byts; kvar efter stäng menu |
| S07 | ✓ | P0 | [M] | Logga ut | → `/child-login`; cookies rensade |
| S10 | | P1 | [M] | Blockera dashboard | `/dashboard` → redirect child-login/child |

### T — Flerbarn & korsflöden (9)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| T01 | ✓ | P0 | [M] | Separata saldon | Astrid stjärnor ≠ Erik (dashboard eller API) |
| T02 | ✓ | P0 | [M] | Separata scheman | Minst en aktivitet skiljer sig per barn |
| T03 | | P1 | [M] | Kopiera schema | G09 → Erik får Astrids dag |
| T04 | ✓ | P0 | [M] | Barn ser eget | Astrid session: inga Eriks aktivitetsnamn |
| T05 | ✓ | P0 | [M] | Byte barn | Astrid→Erik via PG; PIN; ny identitet |
| T06 | | P1 | [M] | Godkänn rätt barn | Eriks inlösning påverkar ej Astrids saldo |
| T07 | | P1 | [M] | Dashboard båda | Två kort med oberoende status |
| T09 | | P1 | [A] | API ≥2 barn | `GET /api/children` length ≥2 |
| T10 | | P1 | [M] | Två profiler | Unika UUID i URL för Astrid/Erik |

### U — Mobil UX & redirects (10)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| U01 | ✓ | P0 | [A] | Ingen H-scroll | dashboard, schedule, child/today |
| U02 | ✓ | P0 | [A] | Inga pageerror | Kärnsidor clean |
| U03 | | P1 | [A] | Redirects (tabell) | `/today`→`/child/today`; `/universe`→`/child/world`; `/family-week`→schedule |
| U06 | | P1 | [M] | Keyboard vs PIN | Fokus synlig; keyboard täcker inte submit |
| U07 | | P2 | [M] | Safe-area | Bottennav inom safe-area inset |
| U09 | | P2 | [A] | Offline-sida | `/offline.html` 200 |
| U10 | | P1 | [M] | Touch targets | Mät bottennav knapp ≥44 px |
| U11 | | P1 | [M] | Scroll restoration | family → barnprofil → tillbaka ≈ samma scroll |
| U12 | | P1 | [M] | Modal back | Schema modal stäng → samma dag/scroll |

### V — Degraded state & edge (10)

| ID | G | Pri | Typ | Testpunkt | Förväntat resultat (oracle) |
|----|---|-----|-----|-----------|----------------------------|
| V01 | | P1 | [M] | Dashboard tom dag | Barn utan aktivitet idag → tom-state, ej 500 |
| V02 | | P1 | [M] | Child today tom | "Inget att göra"/liknande; inga JS-fel |
| V03 | | P1 | [M] | Rewards tom pending | "Inga väntande" text; hub laddar |
| V04 | | P1 | [M] | Notiser tom | "Inga notiser"; badge 0 |
| V05 | | P2 | [M] | Library tom "Mina" | CTA skapa aktivitet; standard kvar |
| V06 | | P2 | [M] | Family 0 invites | Ingen trasig lista; invite-CTA fungerar |
| V07 | | P1 | [M] | Trasig avatar URL | Fallback emoji/placeholder; ingen broken img |
| V08 | | P2 | [M] | API timeout simulation | Throttle offline 5 s → toast/fel, ej vit skärm |
| V09 | | P2 | [M] | Offline inloggad PWA | Flygplansläge → offline-sida eller cached shell |
| V10 | | P1 | [M] | Dubbeltryck under save | En request; knapp disabled under save |

**Totalt §3: 225 testpunkter** (A01–V10; boot-kontrakt i §Z)

---

## Z — Client boot / contracts (14 st)

**Separat lager** — inte användar-QA utan **release-kontrakt**. Fail här = troligen deploy/bundle-regression.

| ID | G | Pri | Typ | Kontrakt | Oracle |
|----|---|-----|-----|----------|--------|
| Z01 | ✓ | P0 | [A] | NavConfig | `window.NavConfig.PRIMARY_NAV.length === 5` |
| Z02 | | P0 | [A] | Dashboard DnD | `typeof initDragDrop === 'function'` |
| Z03 | | P1 | [A] | Stjärnhistorik | `typeof loadStarHistory === 'function'` |
| Z04 | ✓ | P0 | [A] | Specialdagar | `typeof renderSpecialDaysCalendar === 'function'` |
| Z05 | | P0 | [A] | ScheduleCore | `window.ScheduleCore` eller schedule helpers loaded |
| Z06 | | P1 | [A] | Schema modaler | `openTemplateModal` + `openFillWeekModal` functions |
| Z07 | | P1 | [A] | Library hub | `window.LibraryMagicHub` defined |
| Z08 | ✓ | P0 | [A] | ChildWorlds | `window.ChildWorlds` + 3 världar i config |
| Z09 | ✓ | P0 | [A] | Child bottennav | `#childBottomNav [data-child-world]` count ≥3 |
| Z10 | | P1 | [A] | Daily-log engine | `typeof coalescedLoadDay === 'function'` |
| Z11 | | P1 | [A] | Rewards render | `typeof loadRewards === 'function'` |
| Z12 | | P1 | [A] | No null daily-log | Inga nätverksanrop `daily-log?date=null` |
| Z13 | | P1 | [A] | Child header controls | `#switchChildBtn` + logout/system synliga |
| Z14 | | P1 | [A] | Fas-8 split bundles | `/js/dashboard-*.js` m.fl. → 200 (smoke script) |

---

## 4. Automatiseringsmatris

| Lager | Antal | Script / doc |
|-------|-------|--------------|
| Release Gate `[G]` | 56 explicit | `npm run qa:mobile-gate` (~43 auto + 13 manuella) |
| §3 Användarflöden | 225 | `npm run qa:mobile-full` |
| §Z Boot-kontrakt | 14 | Ingår i full; Z01/Z04–Z06 i gate |
| §8 Exploratory | 15 | Manuell |

---

## 9. Gate ↔ §3 mapping

| Gate ID | §3 rad | Auto v1.2 |
|---------|--------|-----------|
| Z01 | §Z Z01 | ✓ |
| Z04–Z06 | §Z Z04–Z06 | ✓ |
| F04–F08 | §3 F04–F08 | ✓ API |
| P03–P04 | §3 P03–P04 | ✓ UI |
| Q04 → I03 | §3 Q04 + I03 | ✓ UI kedja |
| G04–G05 | §3 G04–G05 | Runbook |
| S02–S07 | §3 S02–S07 | Runbook (delvis) |
| T02, T04–T05 | §3 T02, T04–T05 | Runbook |

Full lista: `scripts/lib/qa-gate-ids.mjs` (`GATE_IDS`, `GATE_MANUAL_IDS`).

---

## 5. Rapportmall

### 5.1 Testmetadata

| Fält | Värde |
|------|-------|
| Testare | |
| Datum | |
| Nivå körd | Gate / Full / Exploratory |
| Miljö | local / staging / prod |
| BASE URL | |
| App-version | |
| SW-version | |
| Git commit | |
| Automatiserad körning | `artifacts/mobile-full-qa/results.json` |

### 5.2 Sammanfattning

| Metric | Gate | Full §3 | Z boot |
|--------|------|---------|--------|
| Totalt | 48 | 225 | 14 |
| ✅ Pass | | | |
| ❌ Fail | | | |
| Pass rate | | | |

### 5.3 Resultat per kategori

(Fyll per kategori A–V + Z)

### 5.4 Underkännanden

| ID | Beskrivning | Repro | Förväntat | Faktiskt | Evidence path | Ticket |
|----|-------------|-------|-----------|----------|---------------|--------|
| | | | | | `failures/<ID>/` | |

**Evidence checklist:** screenshot · URL · barn/roll · datum · viewport · console · API-status · version · commit

### 5.5 Sign-off

| Roll | Namn | Datum | Gate ☐ | Full ☐ |
|------|------|-------|--------|--------|
| QA | | | | |
| Produkt | | | | |
| Teknik | | | | |

---

## 6. Relaterade filer

| Fil | Syfte |
|-----|-------|
| `scripts/seed-smoke-family.mjs` | Testfamilj (2 barn) |
| `scripts/smoke-mobile-full-qa.mjs` | Gate + full automation |
| `scripts/lib/qa-gate-ids.mjs` | Gate ID registry |
| `scripts/lib/mobile-qa-gate-flows.mjs` | F04/F08, P03/Q04/I03 m.fl. |
| `scripts/lib/mobile-qa-checkpoints.mjs` | Route/checkpoint-definitioner |
| `docs/QA-mobil-release-gate-runbook.md` | 1-sida gate checklist |
| `docs/QA-mobil-v1.2-review.md` | v1.2 review + flaky |
| `docs/vuxenmeny-v2-operations-checklist.md` | Förälder operations |
| `docs/barnmeny-v2.md` | Barn operations |

---

## 7. Migrering v1.1 → v1.2

| v1.1 | v1.2 |
|------|------|
| Gate ~48 (range notation) | 56 explicit ID i §0 |
| `node scripts/smoke-mobile-full-qa.mjs` | `npm run qa:mobile-gate` / `qa:mobile-full` |
| Script ID drift (C03, D04…) | Z01–Z14 synkade |
| Manuella gate i prose | `docs/QA-mobil-release-gate-runbook.md` |
| — | `scripts/lib/qa-gate-ids.mjs` single source |
| — | F04–F08, P03/P04, Q04→I03 auto |
| C10 accepterade `/` | Endast `/login` |

Se även §7 v1.0 → v1.1 nedan.

---

## 7b. Migrering v1.0 → v1.1

| v1.0 ID | v1.1 |
|---------|------|
| C03 | → Z01 |
| D04, D05, D08 | → Z02, Z03, Z04 |
| G10, G11 | → Z06 |
| H12 | → Z07 |
| O09, O10 | → Z08, Z09 |
| P11, P12 | → Z10, Z12 |
| Q11 | → Z11 |
| S08, S09 | → Z13 |
| A04 | Slagen ihop med A02 |
| C05, C06 | Slagna ihop till C05 |
| Nya | V01–V10 degraded; U11–U12 navigation |

---

## 8. Exploratory UX Pass (nivå 2)

**Tid:** ~20 min. Ingen pass/fail-kvot — logga findings.

| # | Heuristik | Leta efter |
|---|-----------|------------|
| X01 | Touch-känsla | Lag, dubbeltryck, felaktig active-state |
| X02 | Scroll-jank | Ryckig bottennav, bounce, nested scroll |
| X03 | Keyboard overlap | Input dold under keyboard (login, PIN, modaler) |
| X04 | Tomstater | Copy empatisk? Tydlig nästa action? |
| X05 | Animationer | Belöning/celebration stör inte flow |
| X06 | Copy-längd | Svenska rubriker klippta på 390 px |
| X07 | Färg/kontrast | Läsbarhet i solljus-läge |
| X08 | Felmeddelanden | Svenska, icke-tekniska, actionable |
| X09 | Modal stack | Stäng ordning; ESC; bakgrund scroll lock |
| X10 | PWA install | Add to home; standalone nav OK |
| X11 | Rotation | Landscape (om stöd) — inget kritiskt klippt |
| X12 | Haptik (native) | Vibrera vid PIN/belöning — ej web blocker |
| X13 | Barn/forälder-gräns | Barn ser aldrig vuxen-settings utan gate |
| X14 | Cognitive load | Max 1 primär CTA per skärm i Idag |
| X15 | Delad enhet | iPad-lik bredd 768 — nav fortfarande tydlig |

---

*Version 1.2 — Gate ID-sync, QA_MODE=gate, core-loop automation, runbook.*
