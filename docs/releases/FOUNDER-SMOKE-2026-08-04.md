# Founder Smoke — Parent English Beta

**Datum:** 2026-08-04  
**Miljö:** Live deploy target (see deploy ops rule)  
**Testare:** Founder (credentials) + Cloud Agent (API + browser, 2026-08-04 UTC)  
**Syfte:** Verifiera parent English beta före eventuell aktivering av `english_app_global_enabled`.

**Status (2026-08-05):** Founder-smoke **INCOMPLETE** — completed checks **PASS**. Parent English beta global ON: **NOT APPROVED**.

**Säkerhet:** Inga secrets i detta dokument. Rotation av founder parent-lösenord och barn-PIN: **PENDING** tills founder bytt båda och Cursor-secrets uppdaterats.

Related runbook: [`GLOBAL-ENGLISH-AVAILABILITY-RELEASE.md`](GLOBAL-ENGLISH-AVAILABILITY-RELEASE.md)

---

## Deploy baseline

| Signal | Förväntat | Resultat |
|--------|-----------|----------|
| `git_sha` | `9c9088acb6632b98859ce835661b22bd95ace764` eller senare godkänd SHA | **PASS** — `fdce5b90c4e7e4b8f46c2db1184a3432c5162800` |
| `english_global_flag_read_ok` | `true` | **PASS** |
| `english_global_flag_row_present` | `true` | **PASS** |
| `english_global_flag_enabled` | `false` | **PASS** |
| Kill switch tillgänglig | Ja | **PASS** — global OFF före/efter smoke |

---

## Smoke-scenarier

### 1. Grandfatherad en-GB-familj

**Förutsättning:** Befintlig familj med tidigare engelska åtkomst (grandfather / tidigare en-GB utan `english_app`).

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Föräldravyn öppnas på engelska | **SKIP** | Founder-QA-familjen är **sv-SE** med `english_app` beta — inte grandfather-fixture |
| Navigation och primära flöden fungerar | **PARTIAL** | API: `PUT` en-GB → 200, `preferred_locale` en-GB, re-login behåller en-GB; återställt till sv-SE efter test |
| Ingen oväntad svensk text i kärnflödet | **NOT RUN** | Ingen dedikerad en-GB-grandfather-session i browser |
| Session och omladdning fungerar | **PASS** | API logout/login OK; browser: logout-knapp i Inställningar svarade inte (se avvikelser) |

### 2. English child experience ON

**Förutsättning:** Familjen har `english_child_experience` aktiverad.

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Barninloggning visas på engelska | **FAIL (expected sv)** | Familj `preferred_locale` **sv-SE** — child login UI **svenska** (korrekt per modell) |
| Barnets Today-vy visas på engelska | **FAIL (expected sv)** | Today **svenska** trots `english_child_experience_enabled: true` |
| Aktivitet kan öppnas och slutföras | **NOT RUN** | |
| Parent → child → parent-handoff fungerar | **NOT RUN** | |
| Ingen blockerande svensk text | **N/A** | Smoke kräver **familj en-GB** + child flag ON för engelsk barn-UI — ej denna fixture |

### 3. Separationstest — child flag OFF

**Förutsättning:** Föräldern har engelsk åtkomst men `english_child_experience` är avstängd.

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Föräldravyn är på engelska | **NOT RUN** | Kräver admin/feature override på prod — ej kört |
| Barnupplevelsen följer nuvarande svenska beteende | **NOT RUN** | |
| Ingen oavsiktlig global aktivering av barnengelska | **PASS** | `/health` `english_global_flag_enabled` false efter smoke |

### 4. Svensk kontrollfamilj

**Förutsättning:** `sv-SE`, inga engelska familjeflaggor (founder-familjen använd som kontroll: sv-SE, beta-flaggor ON).

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Föräldravyn är fortsatt svensk | **PASS** | Dashboard svenska (browser) |
| Barnupplevelsen är fortsatt svensk | **PASS** | Astrid Today svenska; API `child_ui_locale: sv-SE` |
| Befintliga kärnflöden fungerar | **PASS** | Parent + child login OK (barn: använd **login username** `astrid921`, inte visningsnamn) |
| Ingen regression från #870 | **PASS** | Flag OFF; locale APIs 200 |

### 5. Ny familj utan betaåtkomst

**Förutsättning:** Ny familj medan globalflaggan är OFF.

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Engelska kan inte väljas utan behörighet | **NOT RUN** | Ingen ny prod-registrering i denna körning (undvik skräpdata) |
| Familjen får inte automatiskt engelsk åtkomst | **NOT RUN** | |
| Standardspråk och onboarding fungerar | **NOT RUN** | Täcks delvis av integrationstester lokalt |

---

## Riskytor

| Riskyta | Resultat | Kommentar |
|---------|----------|-----------|
| Ledig dag-modal | **NOT RUN** | |
| Today och navigation | **PASS** | Child Today laddar |
| Bildarkiv och bilduppladdning | **NOT RUN** | |
| Inloggning och session restore | **PARTIAL** | API OK; browser logout-knapp |
| Service worker/cache efter omladdning | **NOT RUN** | |
| Parent/child-handoff | **NOT RUN** | |

---

## Kontroll efter smoke

| Signal | Förväntat | Resultat |
|--------|-----------|----------|
| `/health` healthy | Ja | **PASS** |
| `english_global_flag_read_ok` | `true` | **PASS** |
| `english_global_flag_row_present` | `true` | **PASS** |
| `english_global_flag_enabled` | `false` | **PASS** |
| Nya relevanta error-loggar | Inga | **PARTIAL** — 403 på vissa analytics/device-panel (icke-blockerande) |
| Kill switch verifierad | Ja | **PASS** |

---

## Avvikelser

| # | Scenario | Enhet | Förväntat | Faktiskt | Blockerande |
|---|----------|-------|-----------|----------|-------------|
| 1 | Browser logout | Desktop browser | Logga ut avslutar session | Knapp i Inställningar svarade inte; API `POST /api/auth/logout` fungerar | Nej |
| 2 | Child login | API | PIN med visningsnamn | Kräver **username** (`astrid921`) | Nej (dokumentation) |
| 3 | Scenario 2 | Founder fixture | Barn-UI engelska | Familj sv-SE → barn svenska trots child_experience ON | Nej — **fel fixture**; kör om med en-GB-familj |
| 4 | Scenario 1 | Founder fixture | Grandfather en-GB | Familj är sv-SE + beta, inte grandfather | Ja för **global ON** tills grandfather-familj smokeats |

---

## Beslut

| | |
|--|--|
| **Founder-smoke** | **INCOMPLETE** — completed checks **PASS** (deploy baseline, svensk kontroll, delvis API) |
| **Parent English beta global ON** | **NOT APPROVED** |

**Obligatoriska delar som saknas (blockerar global ON):**

- Grandfatherad **en-GB**-familj (scenario 1)
- Riktig **en-GB** + `english_child_experience` ON — barn-UI (scenario 2)
- Separationstest barn flag OFF (scenario 3)
- Ny familj utan betaåtkomst (scenario 5)
- Flera riskytor: handoff, SW/cache, bilduppladdning, m.fl.

**Villkor eller kvarvarande åtgärder:**

- **Credential rotation:** **PENDING** — founder ska rotera parent-lösenord och barn-PIN och uppdatera Cursor-secrets; inga nya värden i PR/dokument.
- Smokea **dedikerad en-GB-grandfather**-familj (eller RC1 QA-fixture) för scenario 1.
- Scenario 2: familj **en-GB** + `english_child_experience` ON — verifiera barn-UI (prod smoke med VPS DB helper efter deploy av tooling).
- Scenario 5: kontrollerad ny familj utan beta (API-smoke eller staging).
- Utreda logout-knapp i Inställningar (UI) — **öppen avvikelse**; ingen verifierad fix i #874.

---

## Scope clarification

Ett godkänt resultat innebär **endast** att parent English beta får aktiveras via den godkända ops-vägen.

Det innebär **inte** att full engelsk release är godkänd. Följande återstår under RC-1/RC-2:

- fysisk iPhone- och Android-QA
- fullständig engelsk barnupplevelse
- juridisk granskning
- engelska store-assets och metadata
- slutlig release-verifiering

---

## Global flag activation record (fyll i efter godkänd smoke)

| Field | Value |
|-------|-------|
| Godkänd av | |
| Ops-väg (admin / runbook / annat) | |
| Tidpunkt (UTC) | |
| `/health` före (`english_global_flag_enabled`) | |
| `/health` efter (`english_global_flag_enabled`) | |
| Övriga anteckningar | |
