# Founder Smoke — Parent English Beta

**Datum:** 2026-08-04  
**Miljö:** Live deploy target (see deploy ops rule)  
**Testare:** Founder  
**Syfte:** Verifiera parent English beta före eventuell aktivering av `english_app_global_enabled`.

Related runbook: [`GLOBAL-ENGLISH-AVAILABILITY-RELEASE.md`](GLOBAL-ENGLISH-AVAILABILITY-RELEASE.md)

---

## Deploy baseline

| Signal | Förväntat | Resultat |
|--------|-----------|----------|
| `git_sha` | `9c9088acb6632b98859ce835661b22bd95ace764` eller senare godkänd SHA | |
| `english_global_flag_read_ok` | `true` | |
| `english_global_flag_row_present` | `true` | |
| `english_global_flag_enabled` | `false` | |
| Kill switch tillgänglig | Ja | |

---

## Smoke-scenarier

### 1. Grandfatherad en-GB-familj

**Förutsättning:** Befintlig familj med tidigare engelska åtkomst.

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Föräldravyn öppnas på engelska | | |
| Navigation och primära flöden fungerar | | |
| Ingen oväntad svensk text i kärnflödet | | |
| Session och omladdning fungerar | | |

### 2. English child experience ON

**Förutsättning:** Familjen har `english_child_experience` aktiverad.

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Barninloggning visas på engelska | | |
| Barnets Today-vy visas på engelska | | |
| Aktivitet kan öppnas och slutföras | | |
| Parent → child → parent-handoff fungerar | | |
| Ingen blockerande svensk text | | |

### 3. Separationstest — child flag OFF

**Förutsättning:** Föräldern har engelsk åtkomst men `english_child_experience` är avstängd.

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Föräldravyn är på engelska | | |
| Barnupplevelsen följer nuvarande svenska beteende | | |
| Ingen oavsiktlig global aktivering av barnengelska | | |

### 4. Svensk kontrollfamilj

**Förutsättning:** `sv-SE`, inga engelska familjeflaggor.

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Föräldravyn är fortsatt svensk | | |
| Barnupplevelsen är fortsatt svensk | | |
| Befintliga kärnflöden fungerar | | |
| Ingen regression från #870 | | |

### 5. Ny familj utan betaåtkomst

**Förutsättning:** Ny familj medan globalflaggan är OFF.

| Kontroll | Resultat | Kommentar |
|----------|----------|-----------|
| Engelska kan inte väljas utan behörighet | | |
| Familjen får inte automatiskt engelsk åtkomst | | |
| Standardspråk och onboarding fungerar | | |

---

## Riskytor

| Riskyta | Resultat | Kommentar |
|---------|----------|-----------|
| Ledig dag-modal | | |
| Today och navigation | | |
| Bildarkiv och bilduppladdning | | |
| Inloggning och session restore | | |
| Service worker/cache efter omladdning | | |
| Parent/child-handoff | | |

---

## Kontroll efter smoke

| Signal | Förväntat | Resultat |
|--------|-----------|----------|
| `/health` healthy | Ja | |
| `english_global_flag_read_ok` | `true` | |
| `english_global_flag_row_present` | `true` | |
| `english_global_flag_enabled` | `false` | |
| Nya relevanta error-loggar | Inga | |
| Kill switch verifierad | Ja | |

---

## Avvikelser

Dokumentera varje avvikelse med:

- scenario
- enhet och webbläsare/appversion
- steg för att återskapa
- förväntat resultat
- faktiskt resultat
- skärmbild eller loggreferens
- blockerande eller icke-blockerande

---

## Beslut

| | |
|--|--|
| **Founder-smoke** | PASS / PASS WITH NON-BLOCKING ISSUES / FAIL |
| **Parent English beta global ON** | APPROVED / NOT APPROVED |

**Villkor eller kvarvarande åtgärder:**

—

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
