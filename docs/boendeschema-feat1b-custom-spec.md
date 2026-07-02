# FEAT-1B — Eget boendemönster (`custom`)

| | |
|--|--|
| **Status** | Godkänd (v0.3 — implementation-ready) |
| **Prioritet** | P2 |
| **Paket** | Basic (`basic_app`) |
| **Typ** | Produktspec — utökning av FEAT-1 |
| **Relaterat** | [boendeschema-spec.md](./boendeschema-spec.md) · [boendeschema-adr.md](./boendeschema-adr.md) |
| **Förutsättning** | FEAT-1 stängt (v1: `alternate_weeks`, `alternate_weekends`) |
| **Följer** | FEAT-1C — `custody_override` (undantag ovanpå grundschema) |

---

## Bakgrund

FEAT-1 levererade boendeschema med två vanliga grundmönster:

- **Varannan vecka** — hela kalenderveckor växlar mellan två hem
- **Varannan helg** — vardagar på bashem, helger växlar

Det täcker många familjer, men inte alla. I praktiken finns återkommande mönster som:

- byter hem mitt i veckan (t.ex. ons–sön hos ett hem, mån–tis hos det andra)
- har en **egen cykel** som inte är 7+7 eller fre–sön
- följer ett domstolsbeslut som beskriver ett **normalt** veckomönster, inte varje lov och helgdag

I domänspecen (BC-5) är `custom` redan reserverat som v2-mönster. Schedule Engine är byggd för nya `pattern_type` + `configuration` **utan databasmigrering**. Det som saknas är produktdefinition, UI, validering och tester.

---

## Syfte

Familjer med delad vårdnad ska kunna beskriva sitt **normala, återkommande** boendemönster även när det inte passar "varannan vecka" eller "varannan helg".

Boendeschemat ska fortsatt användas för att:

- visa rätt aktiviteter för rätt hem och förälder
- ge korrekt banner och bytesdag-info på Hem
- styra schemafiltrering i kalender och veckovy
- ge båda hemmen samma struktur utan A/B-jargong

Systemet ska förbli **hemcentrerat** — användaren väljer hem per dag, inte "vecka A/B".

---

## Mål

### Produktmål

| # | Mål |
|---|-----|
| M1 | Förälder kan välja **Eget mönster** per barn utöver de två befintliga valen |
| M2 | Mönstret ska vara **förutsägbart och upprepat** — samma cykel varje gång från ankardatum |
| M3 | Varje kalenderdag har **exakt ett aktivt hem** — aldrig null i v2 (samma princip som v1) |
| M4 | Konfiguration ska vara **begriplig för stressad förälder** — inte kräva juridisk eller teknisk kunskap |
| M5 | Vanliga familjer utan boendeschema ska **inte påverkas** |
| M6 | FEAT-1B ska **inte** försöka lösa lov, högtider eller enstaka byten — det reserveras för FEAT-1C |

### Tekniska mål

| # | Mål |
|---|-----|
| T1 | Nytt mönster som `patterns/custom.js` + `registerPattern()` — ingen motor-omskrivning |
| T2 | Ingen ny databasmigration — endast `pattern_type: 'custom'` + utökad `configuration` JSONB |
| T3 | Alla befintliga konsumenter via **CustodyContext** — ingen ny datumlogik i UI |
| T4 | `resolveCustodyDateSync()` returnerar korrekt `activeHome`, `activePeriod`, `nextTransition` för custom |
| T5 | Motorn förblir kompatibel med FEAT-1C: overrides kan läggas ovanpå utan omskrivning |
| T6 | `test:gate` grön med dedikerade enhetstester |

### Icke-mål (v2.0)

- Fri kalenderredigering dag för dag utan upprepad cykel
- Lov, högtider, resor, sjukdom, enstaka byten (→ FEAT-1C)
- Preset-mönster `223`, `3443`, `5225` (separata features)
- Automatisk import från domstolsbeslut eller PDF
- Fler än **två hem** i cykeln (v2.0 begränsar till befintliga `custody_home`)

---

## Kärnprincip: grundschema vs verklighet

> **`custom` beskriver bara normalveckan.** Lov, högtider, resor, sjukdom, enstaka byten och domstolsbeslut för särskilda datum hanteras **inte** i `custom`, utan som **undantag/overrides** ovanpå grundschemat.

| Lager | Roll | Exempel |
|-------|------|---------|
| **Grundschema** (`custom`, `alternate_*`) | Barnets normala, återkommande mönster | "Ons hos Erik annars hos Anna" varje cykel |
| **Undantag** (`custody_override`) | Verkligheten när den avviker | Sportlov hos mamma, jul hos pappa, en tisdag bytt |

**Konsekvens för resolve:**

```text
resolved custody day =
  custody_override om det finns för datumet
  annars custom / alternate-pattern
  annars inget boendeschema (fallback)
```

FEAT-1B ska **inte** försöka lösa sportlov/jul/påsk. Den måste designas så att FEAT-1C kan lägga overrides ovanpå **utan att skriva om motorn** — pipeline-ordningen är redan låst i ADR (override → pattern → fallback).

---

## Beslutsregel: grundschema vs undantag

`custom` används endast för barnets normala, återkommande boendemönster.

Tillfälliga eller datumstyrda avvikelser ska **inte** modelleras genom att ändra `cycle_weeks`, eftersom det skulle förstöra grundmönstret framåt och bakåt.

Exempel på avvikelser som ska hanteras av `custody_override` (FEAT-1C):

- sportlov
- jullov
- påsklov
- midsommar
- resa
- sjukdom
- enstaka byte av dag
- domstolsbeslut som gäller ett specifikt datumintervall

**Resolve-prioritet (låst — samma som ADR):**

1. `custody_override` för aktuellt datum
2. återkommande grundschema (`custom`, `alternate_weeks`, `alternate_weekends`)
3. inget boendeschema (fallback till legacy veckoschema)

**Produktspråk:**

| Begrepp | Betyder |
|---------|---------|
| **Grundschema / normalvecka** | Det som gäller "vanligtvis" — `custom` eller övriga mönster |
| **Undantag** | När verkligheten avviker ett datum eller intervall — FEAT-1C |

---

## Låst produktbeslut (v2.0)

### Vad "eget" betyder

**Eget = upprepad veckocykel** som beskriver **normalveckan**.

Föräldern definierar **1–4 kalenderveckor** som upprepas i följd från `anchor_date`. Varje vecka anger aktivt hem för **måndag–söndag**.

Exempel (2-veckors cykel):

| Vecka i cykel | Mån | Tis | Ons | Tor | Fre | Lör | Sön |
|---------------|-----|-----|-----|-----|-----|-----|-----|
| Vecka 1 | Anna | Anna | Erik | Erik | Erik | Erik | Anna |
| Vecka 2 | Erik | Erik | Anna | Anna | Anna | Anna | Erik |

Cykeln upprepas oändligt. Ankardatum = första dagen i **cykelns vecka 1, måndag**.

### UI-copy (låst)

Vid val av **Eget mönster**:

> *Det här är barnets normala veckomönster. Lov, högtider och enstaka byten läggs senare som undantag, utan att ändra grundschemat.*

(Hjälptext under veckogrid — inte modal, inte blockerande.)

### Varför veckocykel (inte fri kalender)

| Alternativ | Bedömning |
|------------|-----------|
| Veckocykel 1–4 veckor | Täcker de flesta "egna" normalmönster · testbart · mobilvänligt |
| Fri målning i kalender | Stort UI-jobb · risk att förväxlas med undantag · svårt att validera |
| Ändra `cycle_weeks` för lov | **Förbjudet** — förstör grundmönster · använd override i FEAT-1C |

---

## Domänmodell

### `pattern_type`

```
custom
```

### `configuration` (JSONB)

```json
{
  "cycle_weeks": [
    {
      "mon": "uuid-home-a",
      "tue": "uuid-home-a",
      "wed": "uuid-home-b",
      "thu": "uuid-home-b",
      "fri": "uuid-home-b",
      "sat": "uuid-home-b",
      "sun": "uuid-home-a"
    },
    {
      "mon": "uuid-home-b",
      "tue": "uuid-home-b",
      "wed": "uuid-home-a",
      "thu": "uuid-home-a",
      "fri": "uuid-home-a",
      "sat": "uuid-home-a",
      "sun": "uuid-home-b"
    }
  ]
}
```

| Fält | Typ | Regler |
|------|-----|--------|
| `cycle_weeks` | array, 1–4 element | Varje element = en kalendervecka i normalcykeln |
| `mon` … `sun` | uuid | Måste referera till befintligt `custody_home` i familjen |
| Alla sju dagar | obligatoriska | Ingen dag får sakna hem |

**Ankare:** `anchor_date` måste vara en **måndag** (valideras server-side). Cykelindex = veckor sedan ankarets måndag modulo `cycle_weeks.length`.

### `activePeriod` för custom

Segmentet med **samma hem som idag**, inom cykeln:

- Om hem byts onsdag → `activePeriod` = måndag–tisdag den veckan
- Om hem är konstant hela veckan → `activePeriod` = måndag–söndag

(Samma semantik som ADR E5 för övriga mönster.)

### Kompatibilitet med FEAT-1C

När `custody_override` implementeras:

- `loadCustodyContext()` laddar `overrides[]` från DB (idag: tom array)
- `OverrideResolver` körs **före** `PatternResolver` — custom påverkas inte
- `nextTransition` ska räkna hela kedjan (override kan flytta bytesdatum)
- Ingen ändring i `patterns/custom.js` krävs för att stödja undantag

---

## Funktionella krav

### BC-14 Mönsterväljare (utökning)

På `/family#boendeschema`, per barn:

| Värde | Etikett |
|-------|---------|
| `alternate_weeks` | Varannan vecka |
| `alternate_weekends` | Varannan helg (fre–sön) |
| `custom` | **Eget mönster** |

### BC-15 Konfigurations-UI

När `custom` är valt:

1. Visa låst hjälptext (se UI-copy ovan)
2. Välj **antal veckor i cykeln** (1, 2, 3 eller 4)
3. Visa **veckogrid** per cykelvecka: mån–sön × hemväljare (färg + namn)
4. Ankardatum (måndag) — samma fält som övriga mönster

**Mobil:** en vecka i taget, flikar "Vecka 1 / Vecka 2". Minst 44pt touch på hemväljare.

**Får inte finnas i FEAT-1B:** UI för att "justera en vecka för lov" eller redigera enskilda datum i cykeln — det tillhör FEAT-1C.

### BC-16 Validering (API)

`PUT /api/family/custody/pattern/:childId`:

- `pattern_type === 'custom'` kräver `configuration.cycle_weeks`
- 1 ≤ `cycle_weeks.length` ≤ 4
- Varje dag måste vara giltigt `custody_home_id` i familjen
- `anchor_date` måste vara måndag
- Minst två olika hem i cykeln (annars: uppmuntra att stänga av boendeschema)

### BC-17 Schedule Engine

Ny modul: `src/lib/custody-schedule-engine/patterns/custom.js`

```js
resolveCustom(schedule, homesById, dateStr) → {
  activeHome,
  patternType: 'custom',
  activePeriod: { start, end }
}
```

Registreras i `patterns/index.js`. Pipeline-ordning oförändrad.

### BC-18 Konsumenter (oförändrat kontrakt)

Ska fungera utan kodändring utöver att tolerera `patternType: 'custom'`:

- Dashboard-banner (`custody-banner.js`)
- Kalender/veckovy (`schedule-custody.js`, `dashboard-custody.js`)
- Handoff/påminnelser (`custody-notify.js`, `custody-handoff-scheduler.js`)
- Context API (`custody-context-api.js`)

### BC-19 Analytics

| Event | När |
|-------|-----|
| `custody_schedule_updated` | Befintlig — metadata: `pattern_type: 'custom'`, `cycle_length` |

---

## Behörigheter

Oförändrat från FEAT-1:

- Endast förälder (ej pedagog-only) kan spara boendeschema
- Barn ser **inte** boendeschema-inställningar (C-01)

---

## Acceptanskriterier

- [ ] Förälder kan skapa och spara ett 2-veckors custom-mönster
- [ ] Hjälptext om grundschema vs undantag visas vid eget mönster
- [ ] `resolveCustodyDate()` returnerar rätt hem för 14+ dagar (cykel verifierad)
- [ ] Enhetstest: override-hook + custom pattern i samma `ctx` — override vinner på överlappande datum (förberedelse för FEAT-1C, kan mocka `overrides[]`)
- [ ] Banner och kalender korrekt för custom
- [ ] `alternate_weeks` / `alternate_weekends` oförändrade
- [ ] `test:gate` grön
- [ ] Manuell QA: cykler 1v, 2v, 4v + byte mitt i vecka

---

## Risker

| Risk | Mitigering |
|------|------------|
| Förälder modellerar lov i `cycle_weeks` | Tydlig copy · produktutbildning · FEAT-1C för verkliga undantag |
| Förvirring custom vs undantag | Beslutsregel i spec · samma ordning i ADR |
| `nextTransition` scan 60 dagar | Öka till minst längsta cykel × 7 |
| Felkonfigurerat mönster | Server-validering · inga luckor |

---

## Leveransplan (teknisk)

| PR | Innehåll |
|----|----------|
| **PR-A** | Denna spec (+ ev. ADR-tillägg om en rad om custom/override) |
| **PR-B** | `patterns/custom.js` + API-validering + enhetstester |
| **PR-C** | UI veckogrid + hjälptext i `custody-settings.js` + manuell QA |

---

## Relation till övriga features

```
FEAT-1   alternate_weeks | alternate_weekends     ✅ klart
FEAT-1B  custom (normalvecka / veckocykel)       ← denna spec
FEAT-1C  custody_override (undantag ovanpå)       följer — samma motor
FEAT-1D  presets 223 / 3443 / 5225               valfritt
```

**Modell i ett:** `custom` = basmönster · `override` = verkligheten när den avviker.

---

## Låsta beslut från öppna frågor

### OQ-1: Ankardatum i UI

**Beslut:** Ja, UI auto-snappar valt datum till närmaste måndag.

Om användaren väljer en annan veckodag visas förklaring:

> Cykeln börjar alltid på en måndag. Datumet har justerats till måndagen i samma vecka.

Servern validerar fortfarande att `anchor_date` är måndag.

### OQ-2: Förhandsvisning

**Beslut:** Nej, inte blockerande för v2.0.

Förhandsvisning av kommande 4 veckor flyttas till v2.1.

### OQ-3: Cykel med bara ett hem

**Beslut:** Nej.

`custom` måste innehålla minst två olika hem. Om alla dagar pekar på samma hem ska användaren uppmanas att stänga av boendeschema istället.

---

## Versionshistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-07-01 | 0.1 | Första utkast |
| 2026-07-01 | 0.2 | Beslutsregel grundschema vs undantag; custom = normalvecka; FEAT-1C-kompatibilitet |
| 2026-07-01 | 0.3 | OQ-1–3 låsta — redo för implementation |
