# Helrutin — Sektionsspecifik schema-merge (v1)

| | |
|--|--|
| **Status** | Accepted — designspec (implementation i separat PR efter merge) |
| **Typ** | Produktspec — normativ för helrutin / `scheduleName`-aktivering |
| **Feature** | För dig (`for_dig`) · helrutin-paket |
| **ADR** | [helrutin-semantik-adr.md](./helrutin-semantik-adr.md) |
| **Relaterat** | [for-dig-spec.md](./for-dig-spec.md), [for-dig-vision.md](./for-dig-vision.md) |

---

## 1. Vad det här är

**Helrutin** = ett färdigt rutinpaket från standardbiblioteket (`default_schedule`) som aktiveras via För dig-mål med `scheduleName`.

Exempel: *Trygga kvällar* → `scheduleName: 'Kvällsrutin'`.

Helrutin skiljer sig från **aktivitetspaket** (`activityNames`), som redan läggs till med append-logik i vald sektion.

### 1.1 Problem idag (pre-fix)

`copySchedule` i `for-dig-activate.js` med `overwrite: true` **raderar alla** `weekly_schedule_item` på valda dagar och ersätter hela dagen. Det strider mot:

- För dig-visionen (*"vad händer när jag trycker Aktivera?"*)
- Constitution **ingen överraskning** — föräldern förlorar morgon/dag när hen aktiverar kvällsrutin
- Risk i [for-dig-spec.md §22.5](./for-dig-spec.md#225-risker-för-befintliga-användare): *Aktivera skriver över anpassat schema*

### 1.2 v1-löfte

> **Aktivering av en helrutin påverkar endast en definierad sektion per dag. Morgon, skola och kväll utanför målsektionen lämnas orörda.**

---

## 2. Sektioner (v1)

Appen har tre **schemasektioner** i datamodellen och UI (`schedule-core.js`):

| Nyckel (DB/API) | UI-etikett | Produktnamn (För dig) | Tidsintervall |
|-----------------|------------|------------------------|---------------|
| `morgon` | Morgon | **Morgon** | Familjens `morning_start`–`morning_end` |
| `dag` | Dag | **Skola** när paketet är skolrelaterat; annars **Dag** | `day_start`–`day_end` |
| `kvall` | Kväll | **Kväll** | `evening_start`–`evening_end` |

**Regel S1:** Helrutin v1 opererar alltid på exakt **en** sektion per aktivering (`targetSection`).

**Regel S2:** Produktcopy säger *Skola* (inte *Dag*) för skolrelaterade mål — datanyckeln förblir `dag`.

**Regel S3:** Paketets `default_schedule_item`-rader filtreras till `targetSection` innan merge. Rader i andra sektioner i samma biblioteksschema **ignoreras** (paket ska inte läcka över sektionsgräns).

### 2.1 Mål → sektion (v1, låst)

| För dig-mål | `scheduleName` | `targetSection` | Copy-etikett |
|-------------|----------------|-----------------|--------------|
| Trygga kvällar | Kvällsrutin | `kvall` | Kväll |
| Bra morgnar | Kort morgon | `morgon` | Morgon |
| Skolansvar | Skola vardag | `dag` | Skola |

Konfigurationsfält (framtida implementation): `scheduleSection` på mål med `scheduleName` — obligatoriskt när `scheduleName` finns.

Aktivitetsmål (`activityNames` utan `scheduleName`) behåller befintlig append-logik; se §6.

### 2.2 Sektionsidentitet — hur replace vet vad som ska ersättas

Aktiviteter tillhör **inte** bara en veckodag — varje `weekly_schedule_item` har en **`section`**-kolumn (`morgon` | `dag` | `kvall`).

Samma dag kan alltså innehålla tre oberoende listor:

```text
Måndag
├── Morgon   (section = morgon)   — Borsta tänderna, Klä på sig
├── Dag      (section = dag)      — Skolan, Läxor
└── Kväll    (section = kvall)    — Läsa bok, Packa väska
```

**Regel S4:** Replace identifierar målgruppen med `weekly_schedule_item.section = targetSection` (efter normalisering, se §2.3). Veckodag (`day_of_week`) avgör *vilken dag*; `section` avgör *vilken del av dagen*.

**Regel S5:** Aktivering av **Trygga kvällar** (`targetSection = kvall`) ersätter **endast** raden under Kväll i exemplet ovan. Morgon- och dag-items har andra `section`-värden och **rörs aldrig**.

**Regel S6:** UI-gruppering i Schema (`schedule-core.js` → `SECTIONS`) och DB-värdet ska vara samma nyckel. Merge-motorn använder DB-värdet, inte visuell ordning.

### 2.3 Normalisering (legacy)

| `section` i DB | Tolkas som |
|----------------|------------|
| `morgon` | `morgon` |
| `dag` | `dag` |
| `kvall` | `kvall` |
| `NULL` / tom sträng | `dag` (legacy-rader) |

Normalisering sker i `normalizeSection()` — samma funktion i preview, merge och persist.

---

## 3. Append vs replace

### 3.1 Definitioner

| Läge | Vad som händer i `targetSection` | Övriga sektioner |
|------|----------------------------------|------------------|
| **Append** | Paketets aktiviteter läggs till i sektionen. Redan inlagda aktiviteter (samma `activity_template_id`) hoppas över. | Orörda |
| **Replace (sektion)** | Alla befintliga `weekly_schedule_item` med `section = targetSection` på valda dagar tas bort. Paketets aktiviteter för sektionen infogas. | Orörda |

**Aldrig i v1:** dag-ersättning (`DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = …` utan sektionsfilter).

### 3.2 Vilket läge gäller?

| Situation på valda dagar (`scheduleDays`) | Läge | Motivering |
|-------------------------------------------|------|------------|
| `targetSection` har **inga** aktiviteter | Append | Inget att skriva över — infogning räcker |
| `targetSection` har **minst en** aktivitet | Replace (sektion) | Paketet är en helrutin — föräldern förväntar sig att rutinen ersätter tidigare kväll/morgon/skola i **den** sektionen |
| Aktivitet finns i **annan** sektion än `targetSection` | Append i målsektion | Ingen konflikt — andra sektioner behålls implicit |

**Regel M1:** Beslutet append vs replace fattas **per barn × dag × sektion**, inte globalt för hela aktiveringen.

**Regel M2:** Replace tar endast bort rader där `weekly_schedule_item.section = targetSection`. Rader med `section IS NULL` behandlas som `dag` (legacy).

**Regel M3:** Efter replace behålls `weekly_schedule`-raden (veckodag); endast items i målsektionen påverkas.

### 3.3 Sortordning

Efter merge i `targetSection`:

1. Behåll paketets `sort_order` från `default_schedule_item` (relativ ordning inom sektionen).
2. Vid append: nya items får `sort_order` efter befintlig max i sektionen, i paketordning.
3. Vid replace: sektionens ordning = paketordning.

---

## 4. Konfliktregler

### 4.0 Sammanfattning (v1)

| Situation | Resultat |
| --------- | -------- |
| Sektionen är tom | **Append** — paketets aktiviteter läggs in i `targetSection` |
| Sektionen innehåller paketaktiviteter (tidigare aktivering) | **Replace (sektion)** — efter preview; endast `targetSection` skrivs om |
| Sektionen innehåller egna aktiviteter (manuellt tillagda) | **Preview** visar ersättning; efter bekräftelse **replace (sektion)** endast i `targetSection` |
| Övriga sektioner på samma dag | **Oförändrade** — inga deletes utanför `targetSection` |

Paket- vs egna aktiviteter styrs **inte** av olika merge-läge i v1 — båda leder till replace när sektionen inte är tom. Skillnaden är förälderns förväntan; preview ska vara tydlig i båda fallen.

### 4.1 Detektering (preview + activate)

För varje `(childId, dayOfWeek)` i `scheduleDays`:

```
existingInSection = weekly_schedule_item
  WHERE child + day + section = targetSection

packageItems = default_schedule_item
  WHERE schedule = scheduleName AND section = targetSection
```

| `existingInSection` | `packageItems` | Resultat |
|---------------------|----------------|----------|
| tom | ≥1 | Append |
| ≥1 | ≥1 | Replace (sektion) |
| tom | 0 | Fel 503 — tomt paket i sektionen |
| ≥1 | 0 | Fel 503 — tomt paket i sektionen |

### 4.2 Aktivitetsmallar (bibliotek)

| Konflikt | Regel |
|----------|-------|
| Aktivitet med samma namn finns i familjen | Återanvänd befintlig `activity_template` (samma som idag) |
| `for_dig_goal_slug` | Uppdateras till aktuellt mål vid aktivering (befintligt beteende) |
| Stjärnvärden | `starOverrides` från Anpassa-steget gäller; annars mallens värde |

### 4.3 Daglig logg / historik

| Händelse | v1-beteende |
|----------|-------------|
| Replace tar bort item som redan loggats idag | Befintlig `daily_log_item` behålls (historik); borttaget item syns inte i **framtida** schema |
| Nytt item tillagt | Synkas via befintlig `syncDailyLogWithSchedule` efter commit |

**Regel K1:** Aktivering får inte radera avklarade stjärnor från dagens logg.

### 4.4 Flerbarn

Samma regler appliceras **per barn** oberoende. Preview listar barn och aggregerar beslut (t.ex. *"Ersätter kvällsrutinen på vardagar för Astrid och Hugo"*).

### 4.5 Idempotens

| Scenario | Beteende |
|----------|----------|
| Aktivera samma mål igen, replace-läge | Paketet skrivs om i sektionen (samma slutresultat) |
| Aktivera samma mål igen, append-läge med alla dupes | Inga nya rader; success med *"finns redan"* |
| Aktivera annat mål i samma sektion | Replace enligt nytt pakets `targetSection` |

---

## 5. Preview-copy (före aktivering)

Preview ska svara på Jenny-frågan: *"Vad händer när jag trycker Aktivera?"* ([for-dig-vision.md](./for-dig-vision.md))

### 5.1 Struktur (oförändrad API-yta)

`POST /api/for-dig/:slug/plan` returnerar `headline`, `promise`, `decisions[]`, `details` — copy uppdateras semantiskt, inte strukturellt.

### 5.2 Obligatoriska budskap

| Element | Krav |
|---------|------|
| `details.section_label` | *Morgon*, *Kväll* eller *Skola* — aldrig generisk *Rutin* för `scheduleName`-mål |
| `details.days_label` | Oförändrat (*vardagar*, *alla dagar*, …) |
| `decisions` (max 3) | Minst en rad om **vad som ändras** och en om **vad som behålls** |

### 5.3 Copy-matris — `scheduleName`-mål

**Ingen befintlig aktivitet i målsektionen:**

| Signal | Svenska (exempel) |
|--------|-------------------|
| `add` | Lägger in kvällsrutinen i **kvällssektionen** |
| `keep` | Morgon och skola behålls |
| `safe` | Du kan ändra efteråt under Schema |

**Befintlig aktivitet i målsektionen (replace):**

| Signal | Svenska (exempel) |
|--------|-------------------|
| `replace` | Ersätter **kvälls**aktiviteterna på valda dagar |
| `keep` | Morgon och skola påverkas inte |
| `safe` | Du kan ändra efteråt under Schema |

**Skolansvar-specifik:**

| Signal | Svenska (exempel) |
|--------|-------------------|
| `replace` / `add` | … i **skolsektionen** (vardagar) |
| `keep` | Morgon och kväll behålls |

### 5.4 Detaljpanel (`details.items`)

- Lista endast aktiviteter från paketet **i målsektionen** (filtrerad preview).
- Visa ikon, namn, stjärnor — som idag.
- Fotnot: *"Justera stjärnor under Anpassa."*

### 5.5 Förbjuden copy

- ❌ *"Ersätter schemat"* / *"Ersätter veckoschemat"* utan sektionsprecision
- ❌ *"Skriver över allt på måndag"*
- ❌ Tekniska termer: `overwrite`, `weekly_schedule_item`, `section`

---

## 6. Aktivitetspaket (ej helrutin)

Mål med endast `activityNames` (t.ex. Självständighet, Samarbeta hemma) följer **append** i `scheduleSection` (default `dag`):

- Befintlig helrutin-semantik ändras **inte** för dessa mål.
- Preview behåller: *"Lägger till N aktiviteter"* + *"Befintligt schema behålls"*.

---

## 7. `mergeScheduleSection()` — rent API-kontrakt

Pure function i `src/lib/merge-schedule-section.js`. **Ingen** kännedom om UI, För dig-aktivering, PostgreSQL eller HTTP.

### 7.1 Input

```ts
interface ScheduleItem {
  activityTemplateId: string;
  section?: string | null;      // normaliseras via normalizeSection()
  sortOrder?: number;
  startTime?: string | null;
  endTime?: string | null;
}

interface MergeScheduleSectionInput {
  /** Alla aktiviteter för en veckodag (alla sektioner). */
  existingItems: ScheduleItem[];
  /** Målsektion: morgon | dag | kvall */
  targetSection: string;
  /** Paketets aktiviteter — redan filtrerade till targetSection. */
  packageItems: ScheduleItem[];
}
```

### 7.2 Output

```ts
interface MergeScheduleSectionResult {
  /** Hela dagens schema efter merge (alla sektioner). */
  items: ScheduleItem[];
  /** append | replace */
  mode: 'append' | 'replace';
  /** Antal borttagna rader i targetSection (0 vid append). */
  removedInSection: number;
  /** Antal nya rader i targetSection efter merge. */
  addedInSection: number;
}
```

### 7.3 Regler (motorn)

1. `packageItems.length === 0` → returnera `existingItems` oförändrat; anroparen (DB-lager) ska behandla som fel 503.
2. `targetSection` tom efter normalisering → throw / error i anroparen före merge.
3. Items utanför `targetSection` i `existingItems` kopieras oförändrade till output.
4. **Append:** inga items i `targetSection` → lägg till `packageItems`; hoppa över dupes (`activityTemplateId` redan i sektionen).
5. **Replace:** minst ett item i `targetSection` → ersätt hela sektionslistan med `packageItems` (paketordning = `sortOrder`).

### 7.4 Hjälpare (samma modul)

| Funktion | Syfte |
|----------|--------|
| `normalizeSection(section)` | Legacy `NULL` → `dag` |
| `planMergeMode(existingItems, targetSection)` | `'append' \| 'replace'` utan att mutera |

### 7.5 DB-adapter (for-dig-activate — inte i motorn)

1. Läs `existingItems` för `(childId, dayOfWeek)`.
2. Anropa `mergeScheduleSection`.
3. `DELETE` endast rader i `targetSection` om `mode === 'replace'`.
4. `INSERT` nya rader från merge-resultatet i `targetSection`.
5. Rör aldrig rader i andra sektioner.

---

## 8. Scope-gränser (v1)

### 8.1 Ingår

- `src/lib/merge-schedule-section.js` (pure)
- Sektionsspecifik persist i `for-dig-activate.js`
- Uppdaterad preview i `buildActivationPlanPreview`
- Config: `scheduleSection` på helrutin-mål
- Enhetstester för merge-regler

### 8.2 Ingår inte (v1)

- Ändra `family.js` `applySchedulePackage` (bibliotek → *Applicera schema* med hel-dag-confirm) — separat beslut
- Flera sektioner i ett enda För dig-mål
- Användarval append vs replace i UI
- Undo / återställning
- Boendeschema-filter (FEAT-1) — helrutin lägger items i veckoschema; custody-filter vid visning är redan engine-ägd
- Ny databastabell

---

## 9. Acceptanskriterier (DoD)

Implementation (senare PR) är klar när:

- [ ] Aktivering av Kvällsrutin på dag med befintlig morgon **behåller** morgon-items
- [ ] Aktivering med befintliga kvälls-items **ersätter endast** kvällssektionen
- [ ] Preview visar korrekt sektionsetikett och keep/replace-budskap
- [ ] Tomt paket i sektion → 503 med vänligt fel (inte tyst 0-items)
- [ ] `test/for-dig-activate*.test.js` täcker append, replace, multi-barn, legacy `section IS NULL`
- [ ] Manuell QA: tre helrutin-mål på barn med delvis ifyllt schema

---

## 10. Dokumenthistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-07-01 | 1.0 | Initial designspec — post FEAT-1 QA |
| 2026-07-01 | 1.1 | Sektionsidentitet §2.2, konflikttabell §4.0, mergeScheduleSection API §7 |
