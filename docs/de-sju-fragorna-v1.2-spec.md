# De sju frågorna — Spec v1.2

**Skapad:** 2026-06-17  
**Status:** Spec klar · ej implementerad  
**Feature slug:** `de_sju_fragorna`  
**Produktversion:** v1.2  
**Målgrupp:** Barn med behov av förutsägbarhet (ADHD, autism, TEACCH-inspirerad pedagogik) och deras föräldrar  
**Relaterat:** aktivitetsbibliotek, barnvy, delsteg (`activity_sub_step`), `minimal_ui`

---

## 0. Vad det här är (och inte är)

**De sju frågorna** är ett strukturerat ramverk som ger barn tydlig kontext kring varje aktivitet i schemat. Varje aktivitet kan besvaras utifrån sju förutsägbarhetsfrågor — samma mentala modell som används inom TEACCH och visuell strukturering i skola/förskola.

| | Delsteg | De sju frågorna |
|--|---------|-----------------|
| Syfte | *Hur* görs aktiviteten? (sekvens) | *Varför, var, med vem, hur länge…* (kontext) |
| Exempel | Borsta tänder → Spotta → Skölj | Var: Badrummet · Med vem: Ensam · Sen: Frukost |
| Barnvy | Checklista under aktiviteten | Informativ panel — ingen avbockning |
| Förälder fyller i | Delsteg i biblioteket | Sju valfria textfält i biblioteket |

**v1.2 är inte:** AI-genererade svar, per-schema-överstyrningar, bildstöd, flerspråk, eller pedagog-export. Det är en **enkel, valfri kontextlager** ovanpå befintliga aktiviteter.

---

## 1. De sju frågorna (ramverket)

| # | Ikon (referens) | Fråga | Fältnyckel | Exempel |
|---|-----------------|-------|------------|---------|
| 1 | 📦 | Vad ska jag göra? | `what` | Borsta tänderna |
| 2 | 🧭 | Var ska jag vara? | `where` | I badrummet |
| 3 | 👤 | Vem ska jag vara med? | `who` | Ensam / Med mamma |
| 4 | ⏱️ | Hur länge ska det hålla på? | `how_long` | Cirka 5 minuter |
| 5 | 🕐 | Vad ska hända sen? | `what_next` | Frukost i köket |
| 6 | 🎒 | Vad behöver jag ha? | `what_need` | Tandborste och tandkräm |
| 7 | 💡 | Varför ska jag göra det? | `why` | För att ha fina tänder |

**Princip:** Endast ifyllda fält visas för barnet. Tomma fält döljs — barnet ser aldrig en ofullständig lista med tomma rader.

**Koppling till aktivitetsnamn:** Fält 1 (*Vad ska jag göra?*) kan lämnas tomt om aktivitetsnamnet redan är tydligt. Om tomt → barnvy visar inte fråga 1 (namnet på kortet räcker).

---

## 2. Problembeskrivning

### 2.1 Nuvarande lucka

Barnvyn visar idag **vad** (aktivitetsnamn + ikon) och **när** (tid), samt valfria **delsteg**. Den svarar inte konsekvent på:

- Var ska jag vara?
- Med vem?
- Vad händer efteråt?
- Varför ska jag göra det?

För barn som behöver visuell struktur är detta ofta viktigare än exakt klockslag.

### 2.2 Mål med v1.2

| Aktör | Mål |
|-------|-----|
| **Förälder** | Kunna ge kontext per aktivitet utan att bygga om schemat |
| **Barn** | Se tydliga svar på sju frågor vid NU-aktiviteten — utan extra tryck |
| **Produkt** | Differentiera mot generiska rutinappar; stärka ADHD/autism-positionering tillsammans med `minimal_ui` |

---

## 3. Scope v1.2

### 3.1 Ingår i v1.2

| Område | Leverans |
|--------|----------|
| Datamodell | `seven_questions` JSONB på `activity_template` |
| Förälder | Redigering i aktivitetsmodalen i `/library` |
| Barn | Expanderbar panel på NU- och NÄSTA-kort i barnvy |
| API | Läs/skriv via befintlig `/api/activities` |
| Feature gate | `de_sju_fragorna` (börja i `dev`, dogfood per familj) |
| Tomma fält | Döljs i barnvy |
| Auto-expand | NU-kort expanderar panelen automatiskt om minst ett fält är ifyllt (samma princip som delsteg) |

### 3.2 Ingår inte i v1.2 (senare versioner)

| Feature | Motivering | Föreslagen version |
|---------|------------|-------------------|
| Per-schema-överstyrning (samma aktivitet, olika kontext tisdag vs lördag) | Kräver kolumn på `weekly_schedule_item` | v1.3 |
| Bildstöd per fråga | Uppladdning + R2 | v2.0 |
| Förifyllda mallar från standardbibliotek | Admin-arbete i `default_activity_template` | v1.4 |
| Redigering från schemavyn (`schedule.html`) | Scope — bibliotek räcker i v1.2 | v1.3 |
| Pedagogvy / rapportexport | Separat feature | v2.0 |
| Automatisk ifyllnad från tid (`how_long` ← `start_time`/`end_time`) | Nice-to-have | v1.3 |

---

## 4. Användarflöden

### 4.1 Förälder — fylla i kontext

```
Bibliotek → Redigera aktivitet → Sektion "7❓ De sju frågorna"
  → Fyll i valfria fält → Spara
```

- Sektionen visas endast om familjen har `de_sju_fragorna` aktiverat.
- Placering: under delsteg, ovanför Spara-knappen.
- Alla sju fält är valfria; max 500 tecken per fält.
- Hjälptext: *"Valfritt — ger barnet tydlig kontext om vad, var, med vem och varför."*

### 4.2 Barn — se kontext

```
Barnvy (idag) → NU-kort
  → Panel "7❓ De sju frågorna" (expanderad om data finns)
  → Lista med ikon + fråga + svar per ifyllt fält
```

- Ingen avbockning — ren information.
- NÄSTA-kort: panel finns men expanderas inte automatiskt.
- SEDAN/klara kort: panel dold eller hopfälld (produktbeslut vid implementation: **dold om klart**).

### 4.3 Samspel med delsteg

Båda kan vara aktiva på samma aktivitet:

```
┌─────────────────────────────────────┐
│  NU  🪥 Borsta tänderna    07:30   │
│  📋 Delsteg (2/4)          [expand] │
│  7❓ De sju frågorna (5/7)  [expand] │
└─────────────────────────────────────┘
```

**Ordning i kortet:** Delsteg först, sedan De sju frågorna.

---

## 5. Datamodell

### 5.1 Kolumn

```sql
ALTER TABLE activity_template
  ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

### 5.2 JSON-form

```json
{
  "what": "Borsta tänderna",
  "where": "I badrummet",
  "who": "Ensam",
  "how_long": "Cirka 5 minuter",
  "what_next": "Frukost i köket",
  "what_need": "Tandborste och tandkräm",
  "why": "För att ha fina tänder"
}
```

- Endast strängvärden; okända nycklar ignoreras vid normalisering.
- Tomma strängar sparas inte (normaliseras bort).

### 5.3 Var lagras det inte (v1.2)

- Inte på `daily_log_item` — hämtas via join mot `activity_template` vid visning.
- Inte på `weekly_schedule_item` — samma aktivitet = samma kontext överallt.

---

## 6. API

### 6.1 Befintliga endpoints (utökning)

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET | `/api/activities` | Inkludera `seven_questions` |
| POST | `/api/activities` | Acceptera valfri `seven_questions` |
| PUT | `/api/activities/:id` | Acceptera valfri `seven_questions` |

### 6.2 Barnets daglogg

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET | `/api/children/me/daily-log` | Berika varje item med `seven_questions` från `activity_template` |

Ingen ny endpoint i v1.2.

### 6.3 Validering

- Varje svar: `string`, max 500 tecken, trimmas.
- `seven_questions` helt valfritt i create/update.

---

## 7. UI-specifikation

### 7.1 Förälder — bibliotek (`library.html`)

**Sektion:** `7❓ De sju frågorna`  
**Gate:** `data-feature="de_sju_fragorna"`

Layout per rad:

```
[ikon]  [Frågetext som label]
        [textfält, placeholder "Valfritt svar…"]
```

Stil: lätt avgränsad box (`sq-editor`), blå frågetitlar — visuellt i linje med referensbilden men anpassad till appens Tailwind-tema.

### 7.2 Barn — barnvy (`child-dashboard`)

**Trigger-knapp:**

```
7❓ De sju frågorna    5/7    ▾
```

- `5/7` = antal ifyllda fält (badge, inte krav att alla ska fyllas).
- Expanderad vy: vertikal lista med streckad avdelare mellan rader (som referensbilden).

**Auto-expand:** På NU-kort, om `count(filled) > 0` och inga delsteg redan auto-expanderats — expandera sju-frågor-panelen. Om både delsteg och sju frågor finns: delsteg auto-expanderas först (befintligt beteende); sju frågor auto-expanderas om delsteg saknas eller redan är expanderade.

**Feature gate:** Barnvy läser `/api/features`; om `de_sju_fragorna` saknas → ingen panel, ingen API-belastning för visning.

### 7.3 Tillgänglighet

- Frågetitlar som synliga labels (inte bara ikoner).
- Panelen är informativ — ska inte blockera avbockning av aktiviteten.
- `onclick="event.stopPropagation()"` på panelen så klick inte togglar aktiviteten.

---

## 8. Feature flag & rollout

| Steg | `de_sju_fragorna` | Vem ser det |
|------|-------------------|-------------|
| 1 | `dev` | Familjer med `family_features` manuellt i admin |
| 2 | Dogfood ~5 familjer | Intervjuer: förstår barnet panelen? |
| 3 | `live` | Alla familjer (valfritt: default av tills opt-in i barninställningar — **ej** i v1.2) |

**Seed i `scripts/seed-features.js`:**

```javascript
{
  slug: 'de_sju_fragorna',
  name: 'De sju frågorna',
  status: 'dev',
  tags: ['barnvy', 'accessibility', 'pedagogik'],
  // ...
}
```

---

## 9. Acceptanskriterier v1.2

### Förälder

- [ ] Redigera aktivitet visar sju fält när feature är påslagen
- [ ] Spara persisterar `seven_questions`; tomma fält lagras inte
- [ ] Fält döljs helt när feature är av för familjen
- [ ] Befintliga aktiviteter utan data fungerar oförändrat

### Barn

- [ ] NU-kort visar expanderbar panel när minst ett fält är ifyllt
- [ ] Endast ifyllda frågor visas — aldrig tomma rader
- [ ] Panelen stör inte avbockning
- [ ] Auto-expand på NU vid första visning (om data finns)
- [ ] Ingen panel när feature är av eller alla fält tomma

### Teknik

- [ ] Migration idempotent (`ADD COLUMN IF NOT EXISTS`)
- [ ] Zod-validering på API
- [ ] SW cache bump vid frontend-ändring
- [ ] Enhetstester för normalisering (`normalizeSevenQuestions`)

---

## 10. Analytics (valfritt i v1.2)

| Event | När | Syfte |
|-------|-----|-------|
| `seven_questions_saved` | Förälder sparar med ≥1 fält | Adoption |
| `seven_questions_panel_opened` | Barn expanderar panelen manuellt | Engagemang |
| `seven_questions_panel_auto_shown` | Auto-expand på NU | A/B mot manuell expand |

**Ej blockerande** för v1.2-lansering.

---

## 11. Implementation — filer (referens, ej gjort)

När v1.2 ska byggas, föreslagen uppdelning:

| Lager | Filer |
|-------|-------|
| Migration | `migrations/*_activity_seven_questions.js` |
| Server | `src/lib/seven-questions.js`, `src/lib/schemas.js`, `src/routes/activities.js`, `src/routes/daily-logs.js` |
| Förälder | `public/library.html`, `public/js/library.js`, `public/js/seven-questions.js` |
| Barn | `public/js/child-seven-questions.js`, `public/css/child-seven-questions.css`, minimal diff i `child-dashboard.js` |
| Test | `test/seven-questions.test.js` |

**Stor fil-regel:** `child-dashboard.js` — endast init-anrop + `sectionHtml`-hook; logik i egen fil.

---

## 12. Versioner efter v1.2 (roadmap)

| Version | Fokus |
|---------|-------|
| **v1.2** | Biblioteksredigering + barnvy-panel (denna spec) |
| v1.3 | Redigering från schemavyn; valfri `how_long` auto från tidsintervall |
| v1.4 | Mallar i standardbiblioteket (admin) |
| v2.0 | Bild per fråga; pedagog-export i rapporter |

---

## 13. Öppna frågor

| # | Fråga | Förslag |
|---|-------|---------|
| A | Ska klara aktiviteter visa panelen? | Nej — dölj när `completed` |
| B | Auto-expand om både delsteg och sju frågor finns? | Delsteg prioriteras; sju frågor expanderas om barnet stänger delsteg eller saknar delsteg |
| C | Kopiera kontext vid "kopiera schema från syskon"? | Ja implicit (samma `activity_template`) |
| D | Visa i förälderns daglogg (`daily-log.js`)? | Ej v1.2 — barnvy räcker |

---

*Denna spec motsvarar produktversion v1.2. Ingen kod ska mergas förrän spec är godkänd.*
