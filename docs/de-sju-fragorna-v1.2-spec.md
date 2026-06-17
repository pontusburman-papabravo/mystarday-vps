# De sju frågorna — Spec v1.2

**Skapad:** 2026-06-17  
**Uppdaterad:** 2026-06-17 (produktbedömning + godkännande)  
**Status:** ✅ **Approved for implementation (v1.2)**  
**Feature slug:** `de_sju_fragorna`  
**Produktversion:** v1.2  
**Målgrupp:** Barn som gynnas av ökad förutsägbarhet (bl.a. autism, ADHD) och deras föräldrar  
**Relaterat:** aktivitetsbibliotek, barnvy, delsteg (`activity_sub_step`), `minimal_ui`

---

## 0. Vad det här är (och inte är)

**De sju frågorna** är ett valfritt kontextlager ovanpå befintliga aktiviteter. Varje aktivitet kan kompletteras med svar på sju förutsägbarhetsfrågor — inspirerat av beprövade principer från visuellt stöd, strukturerad pedagogik och TEACCH-inspirerade arbetssätt.

> **Viktig formulering:** Det finns ingen allmänt etablerad eller kliniskt validerad metod som heter exakt *"De sju frågorna"*. Funktionen ska beskrivas som *inspirerad av TEACCH, visuellt stöd och strukturerad pedagogik* — **inte** som en officiell TEACCH-metod eller vetenskapligt validerad sjufrågemetod.

**Rekommenderad produkttext:**

> *De sju frågorna är inspirerade av beprövade principer från TEACCH, visuellt stöd och strukturerad pedagogik. Syftet är att göra aktiviteter mer förutsägbara genom att tydliggöra vad som ska hända, var det ska ske, vem som deltar, hur länge det pågår och vad som händer därefter.*

**Alternativ (kortare):**

> *Ramverket syftar till att minska kognitiv belastning och stödja övergångar mellan aktiviteter genom att ge barnet tydlig kontext kring vad som ska hända.*

| | Delsteg | De sju frågorna |
|--|---------|-----------------|
| Funktion | *Hur* gör jag? (sekvens) | *Vad innebär situationen?* (kontext) |
| Exempel | Borsta → Spotta → Skölj | Var: Badrummet · Vem: Ensam · Sen: Frukost |
| Barnvy | Checklista — avbockningsbar | Informativ panel — ingen avbockning |
| Förälder fyller i | Biblioteket | Biblioteket |

**Mål:** Ge barnet mer kontext kring aktiviteter **utan** att göra schemat mer komplext.

**v1.2 är inte:** AI-genererade svar, lagring på schema-/loggnivå, bildstöd, flerspråk, pedagog-export, eller nya API-endpoints.

---

## 1. Produktbedömning

**Övergripande:** Funktionen är väl avgränsad och redo för implementation.

| Styrka | Motivering |
|--------|------------|
| Tydligt pedagogiskt syfte | Svarar på förutsägbarhetsbehov med etablerad inriktning |
| Liten teknisk scope | En JSONB-kolumn + utökning av befintliga endpoints |
| Återanvänder aktivitetsmallar | Ingen parallell datamodell |
| Inga nya API-endpoints | CRUD via `/api/activities` + berikning i daglogg |
| Feature-gatable | `de_sju_fragorna` — kontrollerad rollout |
| Bygger på delsteg | Kompletterar befintligt koncept utan att ersätta det |

---

## 2. De sju frågorna (ramverket)

| # | Ikon | Fråga | Fältnyckel | Exempel |
|---|------|-------|------------|---------|
| 1 | 📦 | Vad ska jag göra? | `what` | Borsta tänderna |
| 2 | 🧭 | Var ska jag vara? | `where` | Badrummet |
| 3 | 👤 | Vem ska jag vara med? | `who` | Ensam |
| 4 | ⏱️ | Hur länge ska det hålla på? | `how_long` | Cirka 5 minuter |
| 5 | 🕐 | Vad ska hända sen? | `what_next` | Frukost |
| 6 | 🎒 | Vad behöver jag ha? | `what_need` | Tandborste och tandkräm |
| 7 | 💡 | Varför ska jag göra det? | `why` | För att ha friska tänder |

**Koppling till aktivitetsnamn:** Fält 1 (`what`) kan lämnas tomt om aktivitetsnamnet redan är tydligt. Barnvy visar då inte fråga 1 — namnet på kortet räcker.

**Dölj tomma fält:** Barnet ska aldrig se en frågerad utan innehåll. Visa endast ifyllda frågor.

---

## 3. Pedagogisk och vetenskaplig grund

### 3.1 Väl förankrat

Funktionen ligger nära etablerade principer inom visuellt stöd, strukturerad pedagogik och TEACCH-inspirerade arbetssätt. Särskilt starkt stöd för:

- Vad ska jag göra?
- Var ska jag vara?
- Hur länge?
- **Vad händer sedan?** — övergångar mellan aktiviteter skapar ofta stress och osäkerhet

### 3.2 Målgrupp — utan diagnoskoppling

Funktionen kan vara hjälpsam för olika skäl:

| Perspektiv | Typiska behov |
|------------|---------------|
| Autism | Struktur, tydlig kontext, förutsägbarhet |
| ADHD | Övergångar, tidsuppfattning, tydliga nästa steg |

**Positionering i produkt:** *"För barn som gynnas av ökad förutsägbarhet"* — koppla inte specifika frågor hårt till specifika diagnoser.

---

## 4. Scope v1.2

### 4.1 Ingår

| Område | Leverans |
|--------|----------|
| Datamodell | `activity_template.seven_questions` JSONB |
| Normalisering | `normalizeSevenQuestions()` (server + klient) |
| Ordning | `QUESTION_ORDER` (fast, oberoende av JSON-nyckelordning) |
| Förälder | Redigering i aktivitetsmodalen i `/library` (progressive disclosure) |
| Barn | Panel på NU/NÄSTA-kort; NÄSTA-kort synligt hela tiden (befintligt + förstärkt) |
| API | Utökning av befintlig `/api/activities` + berikning i barnets daglogg |
| Feature gate | `de_sju_fragorna` (`dev` → dogfood → `live`) |

### 4.2 Ingår inte (senare versioner)

| Feature | Version |
|---------|---------|
| Lagring på `weekly_schedule_item` eller `daily_log_item` | v1.3+ |
| Redigering från schemavyn | v1.3 |
| Auto-ifyllnad `how_long` från tidsintervall | v1.3 |
| Mallar i standardbiblioteket | v1.4 |
| Bildstöd per fråga | v2.0 |
| Pedagog-export | v2.0 |

---

## 5. Datamodell

### 5.1 Kolumn

```sql
ALTER TABLE activity_template
  ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

**Bedömning:** Rätt nivå för v1.2. Alternativet att lagra på schema- eller loggnivå väntar.

### 5.2 JSON-exempel

```json
{
  "where": "I badrummet",
  "who": "Ensam",
  "how_long": "Cirka 5 minuter",
  "what_next": "Frukost",
  "what_need": "Tandborste och tandkräm",
  "why": "För att ha friska tänder"
}
```

(`what` utelämnat — aktivitetsnamnet *Borsta tänderna* räcker.)

---

## 6. Tekniska krav (obligatoriska före implementation)

### 6.1 `QUESTION_ORDER`

Ordningen ska **inte** bero på JSON-objektets nyckelordning. Frontend och backend ska använda samma fasta ordning:

```javascript
const QUESTION_ORDER = [
  'what',
  'where',
  'who',
  'how_long',
  'what_next',
  'what_need',
  'why',
];
```

Placering: `src/lib/seven-questions.js` (server) + `public/js/seven-questions.js` (klient). Labels och ikoner definieras i samma modul.

### 6.2 `normalizeSevenQuestions(input)`

Central normaliseringsfunktion. Används av POST, PUT, eventuella migrationer och tester.

**Beteende:**

| Regel | Detalj |
|-------|--------|
| Trimma | Whitespace i början/slutet |
| Ta bort tomma | Tomma strängar sparas inte |
| Ignorera okända nycklar | Endast `QUESTION_ORDER`-nycklar behålls |
| Max längd | 500 tecken per svar |
| Returvärde | Rent objekt med endast ifyllda fält |

```javascript
// Exempel
normalizeSevenQuestions({
  where: '  I badrummet  ',
  who: '',
  extra: 'ignoreras',
  why: 'a'.repeat(600),
});
// → { where: 'I badrummet', why: 'a'.repeat(500) }
```

### 6.3 API (inga nya endpoints)

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET | `/api/activities` | Inkludera `seven_questions` |
| POST | `/api/activities` | Acceptera valfri `seven_questions` → normalisera |
| PUT | `/api/activities/:id` | Acceptera valfri `seven_questions` → normalisera |
| GET | `/api/children/me/daily-log` | Berika items med `seven_questions` från `activity_template` |

Zod-validering i `src/lib/schemas.js` — `seven_questions` helt valfritt.

---

## 7. UX-specifikation

### 7.1 Grundprincip — två användare

| Roll | Mental modell | UX-princip |
|------|---------------|------------|
| **Förälder** | Administratör | Snabb redigering, återanvändning, minimalt dubbelarbete |
| **Barn** | Konsument | En primär handling, tydlighet, låg kognitiv belastning |

De ska **inte** ha samma UX-principer.

### 7.2 Barnvy — vad barnet behöver

Barnet behöver främst svar på:

1. Vad gör jag **nu**?
2. Hur vet jag att jag är **klar**?
3. Vad händer **sedan**?

### 7.3 Prioriteringsordning — NU-kort

```
1. Aktivitetsnamn (+ ikon, tid)
2. Delsteg (om finns)
3. De sju frågorna (om finns)
4. Klar-knapp
```

**Endast en primär handling:** ✓ Klar. Undvik många sekundära knappar. Panelerna (delsteg, sju frågor) är informativa/expanderbara — inte konkurrerande primäråtgärder.

### 7.4 Visa nästa aktivitet hela tiden

```
NU
🪥 Borsta tänderna

NÄSTA
🍞 Frukost
```

Övergångsstöd (`what_next` i sju frågor + synligt NÄSTA-kort) anses vara särskilt viktigt. Befintlig NU/NÄSTA-logik i barnvy ska bibehållas och förstärkas — inte döljas bakom sju-frågor-panelen.

### 7.5 Delsteg + sju frågor samtidigt

| | Delsteg | De sju frågorna |
|--|---------|-----------------|
| Svarar på | Hur gör jag? | Vad innebär situationen? |
| Interaktion | Avbockning | Endast läsning |

Båda kan visas. **Ordning:** delsteg först, sedan De sju frågorna.

**Auto-expand på NU:** Delsteg prioriteras (befintligt beteende). Sju-frågor-panelen auto-expanderas om delsteg saknas eller redan är expanderade och minst ett fält är ifyllt.

### 7.6 Kortare svar i barnvy

Föredra kompakt visning:

```
📍 Badrummet
👤 Mamma
⏱ 5 min
🕐 Frukost
```

Framför långa textblock. Frågetitel kan visas mindre eller endast via ikon om svaret är kort nog.

### 7.7 Klara aktiviteter

Panelen **döljs** när aktiviteten är `completed`.

### 7.8 Föräldravy — bibliotek först

Kontext redigeras i **aktivitetsbiblioteket** (`/library`), inte i varje enskilt schemaobjekt. Samma `activity_template` = samma kontext överallt (inkl. vid kopiera schema från syskon).

### 7.9 Progressive disclosure (förälder)

Avancerade sektioner hopfällda som standard i aktivitetsmodalen:

```
▼ Delsteg
▼ De sju frågorna
▼ Avancerat (befintlig feedback_for m.m.)
```

Minskar visuell belastning. Sektionen *De sju frågorna* gate:as med `data-feature="de_sju_fragorna"`.

---

## 8. Feature flag & rollout

| Steg | Status | Vem |
|------|--------|-----|
| 1 | `dev` | Familjer med `family_features` i admin |
| 2 | Dogfood ~5 familjer | Intervjuer: förstår barnet? Förälder fyller i? |
| 3 | `live` | Alla familjer |

---

## 9. Acceptanskriterier v1.2

### Förälder

- [ ] Sju fält i bibliotekets aktivitetsmodal (hopfällbar sektion) när feature är på
- [ ] Spara persisterar normaliserat `seven_questions`; tomma fält lagras inte
- [ ] Sektion dold när feature är av
- [ ] Befintliga aktiviteter utan data oförändrade

### Barn

- [ ] NU-kort: prioritetsordning enligt §7.3
- [ ] Endast ifyllda frågor visas, i `QUESTION_ORDER`
- [ ] En primär handling (Klar); paneler stör inte avbockning
- [ ] NÄSTA-kort synligt (övergångsstöd)
- [ ] Panel dold på klara aktiviteter
- [ ] Ingen panel när feature av eller alla fält tomma

### Teknik

- [ ] `QUESTION_ORDER` delad server/klient
- [ ] `normalizeSevenQuestions()` i POST, PUT, tester
- [ ] Migration idempotent
- [ ] Zod-validering
- [ ] SW cache bump vid frontend-ändring
- [ ] Enhetstester för normalisering och ordning

---

## 10. Analytics (valfritt, ej blockerande)

| Event | När |
|-------|-----|
| `seven_questions_saved` | Förälder sparar med ≥1 fält |
| `seven_questions_panel_opened` | Barn expanderar manuellt |
| `seven_questions_panel_auto_shown` | Auto-expand på NU |

---

## 11. Implementation — filer

| Lager | Filer |
|-------|-------|
| Migration | `migrations/*_activity_seven_questions.js` |
| Server | `src/lib/seven-questions.js`, `src/lib/schemas.js`, `src/routes/activities.js`, `src/routes/daily-logs.js` |
| Förälder | `public/library.html`, `public/js/library.js`, `public/js/seven-questions.js` |
| Barn | `public/js/child-seven-questions.js`, `public/css/child-seven-questions.css`, minimal diff i `child-dashboard.js` |
| Feature | `scripts/seed-features.js` |
| Test | `test/seven-questions.test.js` |

**Stor fil-regel:** `child-dashboard.js` — endast init + hook; logik i `child-seven-questions.js`.

---

## 12. Roadmap efter v1.2

| Version | Fokus |
|---------|-------|
| **v1.2** | Bibliotek + barnvy-panel (denna spec) |
| v1.3 | Schemavy-redigering; schema-nivå override; auto `how_long` |
| v1.4 | Mallar i standardbiblioteket |
| v2.0 | Bild per fråga; pedagog-export |

---

## 13. Beslutade frågor (tidigare öppna)

| # | Beslut |
|---|--------|
| A | Klara aktiviteter: panel dold |
| B | Auto-expand: delsteg prioriteras, sedan sju frågor |
| C | Kopiera schema från syskon: ja implicit (samma `activity_template`) |
| D | Förälderns daglogg: ej v1.2 |
| E | Lagringsnivå v1.2: `activity_template` endast |
| F | TEACCH-formulering: inspirerad av, inte officiell metod |

---

*Spec v1.2 — godkänd för implementation. Senast reviderad efter produktbedömning 2026-06-17.*
