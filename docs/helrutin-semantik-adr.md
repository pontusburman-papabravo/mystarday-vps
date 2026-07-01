# ADR — Helrutin: sektionsspecifik merge (v1)

| | |
|--|--|
| **Status** | Accepted (design) — implementation följer i separat PR |
| **Gäller från** | 2026-07-01 |
| **Typ** | Architecture Decision Record |
| **Spec** | [helrutin-semantik-spec.md](./helrutin-semantik-spec.md) |
| **Ersätter** | Implicit hel-dag-beteende i `copySchedule` / for-dig-spec §7.4 utkast |

---

## Kontext

För dig aktiverar färdiga rutiner via `scheduleName` genom att kopiera `default_schedule` till barnets `weekly_schedule`.

Nuvarande implementation (`for-dig-activate.js` → `copySchedule`):

```sql
-- Vid overwrite: hela dagen raderas
DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1
```

Detta motsäger produktvisionen och skapar supportrisk för befintliga familjer med anpassade scheman.

Content-sync (#476) är stängd. Nästa steg är **semantik**, inte mer innehåll.

---

## Beslut

### 1. Helrutin ≠ hel dag (v1)

**`scheduleName`-aktivering får aldrig ersätta en hel veckodag.**

All merge sker inom en **`targetSection`**: `morgon` | `dag` | `kvall`.

### 2. Ett paket → en sektion

| Pakettyp | Sektionsomfång |
|----------|----------------|
| Helrutin (`scheduleName`) | Exakt en sektion per mål (config: `scheduleSection`) |
| Aktivitetspaket (`activityNames`) | En sektion via befintlig `scheduleSection` (append) |

Paketitems från `default_schedule_item` utanför `targetSection` importeras **inte**.

### 3. Append vs replace (låst)

| Tillstånd i `targetSection` på aktuell dag | Läge |
|--------------------------------------------|------|
| Tom | **Append** |
| Har aktiviteter | **Replace (sektion)** — radera endast items i `targetSection`, infoga paket |

Inget användarval i v1. Preview måste visa vilket läge som gäller **innan** bekräftelse.

### 4. Sektionsspråk

| DB-nyckel | Föräldercopy |
|-----------|--------------|
| `morgon` | Morgon |
| `kvall` | Kväll |
| `dag` | **Skola** för skolrelaterade mål; annars Dag |

Produkttermen **Skola** mappas till DB `dag` — ingen fjärde sektionskolumn i v1.

### 5. Konflikt med befintliga aktiviteter

- **Inom sektion:** replace (se §3).
- **Utanför sektion:** ingen åtgärd — explicit *keep*-budskap i preview.
- **Dubbletter (append):** hoppa över samma `activity_template_id` på samma dag.
- **Dagens logg:** historik bevaras; schemaändring påverkar framtida dagar.

### 6. Preview är kontrakt

`buildActivationPlanPreview` ska beräkna merge-läge per barn och returnera:

- `details.section_label` — humanläsbar sektion
- `decisions` — minst *vad som ändras* + *vad som behålls*

Felaktig preview = blockerande bugg (förtroendeprodukt).

### 7. Implementation-yta (nästa PR)

| Fil | Ändring |
|-----|---------|
| `src/lib/for-dig-activate.js` | Ersätt dag-`DELETE` med `mergeScheduleSection()` |
| `src/lib/for-dig-config.js` | `scheduleSection` på helrutin-mål |
| `test/for-dig-activate*.test.js` | Sektions-merge |
| `public/js/for-dig-config.js` | Synka config |

**Ej i första PR:** endast dokumentation.

### 8. Medvetet undantag

`family.js` → `applySchedulePackage` behåller hel-dag-beteende med explicit confirm (*"ersätter barnets nuvarande veckoschema"*). Det är biblioteks-UX, inte För dig-aktivering. Harmoniserings-ADR kan komma senare.

---

## Konsekvenser

### Positiva

- Föräldrar kan aktivera kvällsrutin utan att förlora morgon/skola
- Preview blir sanningsenlig → högre aktiveringskonvertering
- Mindre risk för befintliga ~140+ familjer (for-dig-spec §22.5)

### Negativa / begränsningar

- Replace i sektion kan fortfarande ta bort manuellt kuraterad kväll — men **förväntat** och **kommunicerat**
- Paket med items i flera sektioner kräver flera mål eller framtida multi-section-stöd

---

## Alternativ (avvisade)

| Alternativ | Varför nej |
|------------|------------|
| Hel dag med `overwrite` | För destruktivt; redan identifierat i prod-QA / användarfeedback |
| Alltid append | Dubletter och trasig rutinordning; helrutin ska vara komplett paket |
| Användarval append/replace | Ökar kognitiv belastning; strider mot *"appen gör jobbet"* |
| Ny tabell `schedule_package_install` | Onödig komplexitet i v1 — merge i befintliga tabeller räcker |

---

## Verifiering

Design: denna spec + ADR.

Implementation (senare):

```bash
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
```

Plus manuell För dig-QA: aktivera kvällsrutin på barn med ifylld morgon → morgon kvar.

---

## Dokumenthistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-07-01 | 1.0 | Accepted design — post FEAT-1, pre-implementation |
