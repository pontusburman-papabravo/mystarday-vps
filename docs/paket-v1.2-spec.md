# Paket — Spec v1.2

**Skapad:** 2026-06-17  
**Uppdaterad:** 2026-06-17 (§9.8 `off` som default — admin aktiverar intresse/köp)  
**Status:** ✅ **Approved for implementation (v1.2)**  
**Produktversion:** v1.2 = **Paket**  
**Teknisk grund:** `family_subscriptions.components` JSONB + `has_component()` + `requireComponent()`

---

## 0. Produktarkitektur

```
Paket
├── Basic                    (basic_app)
├── Familj Rapportering      (reporting)
├── Familj Pedagog           (pedagog)
└── Familj Extra stöd        (teacch)

För dig
└── Ingår i Basic — familjens målyta (inte ett eget paket)
```

**Konceptuellt beslut:** Fyra tydliga säljbara paket. **För dig** är den naturliga ingången till produkten — inte ett femte paket användaren måste förstå.

**Navigation (vid köp):** Paket säljs modulärt, men menyn ska **inte** spegla paketlogiken. Se §6 — arbetsflöden, inte funktionslista.

**Beslutregel vid nya funktioner:** *Vilket problem löser den?* → ska peka på **ett** paket (eller För dig under Basic).

**Positionering (10-sekundersregeln):**

| Problem (kund) | Paket |
|----------------|-------|
| Vardagen fungerar inte | **Basic** |
| Jag vill följa utveckling | **Familj Rapportering** |
| Jag samarbetar med skola/pedagog | **Familj Pedagog** |
| Mitt barn behöver mer struktur | **Familj Extra stöd** |

**Konstitutionell regel:** *Ett paket = ett primärt problem.* Nya features måste stärka det problemet — inte läggas till "för att de finns". Se §14.

---

## 1. Paketöversikt

| Paket | Komponent | Syfte |
|-------|-----------|-------|
| **Basic** | `basic_app` | Få vardagen att fungera |
| **Familj Rapportering** | `reporting` | Följa och dokumentera utveckling |
| **Familj Pedagog** | `pedagog` | Samarbete mellan vuxna |
| **Familj Extra stöd** | `teacch` | Ökad förutsägbarhet och struktur |

| Paket | Äger (internt) |
|-------|----------------|
| Basic | Motivation & vardagsrutiner |
| Rapportering | Insikter & dokumentation |
| Pedagog | Samarbete mellan vuxna |
| Extra stöd | Förutsägbarhet & struktur |

Modulära tillägg — kombinerbara (t.ex. Basic + Rapportering + Extra stöd utan Pedagog).  
`lifetime_free`-familjer behåller `basic_app`; tillägg är separat produktbeslut.

---

## 2. Paket 1 — Basic

| | |
|--|--|
| **Kundnamn** | Basic |
| **Komponent** | `basic_app` |
| **Pris** | 59 SEK/mån (vid betalning) |
| **Löfte** | Hjälper familjen skapa fungerande vardagsrutiner |
| **Målgrupp** | Alla familjer |
| **Status** | ✅ Live |

### 2.1 För dig — familjens målyta

Ingår i Basic. Inte separat paket.

| Område | Innehåll |
|--------|----------|
| **Utvecklingsmål** | Trygga kvällar · Bra morgnar · Självständighet · Skolansvar · Samarbete hemma · Motivation |
| **Funktioner** | Aktivera färdiga rutiner · Åldersanpassade rekommendationer · Favoriter · Mest installerade |

**Feature slug:** `for_dig`

### 2.2 Schema

| Feature slug |
|--------------|
| `veckoschema` |
| `specialdagar` |
| `kalender` |

### 2.3 Aktiviteter & delsteg

| Feature slug |
|--------------|
| `aktivitetsbibliotek` (inkl. delsteg) |

### 2.4 Stjärnor och daglogg

| Feature slug |
|--------------|
| `daglogg` |
| `manuella_stjarnor` |

### 2.5 Belöningar

| Feature slug |
|--------------|
| `beloningssystem` |
| `skattkammar_universum` |

### 2.6 Familj

| Feature slug |
|--------------|
| `familjeinbjudan` |
| `barninloggning` |

### 2.7 Push

| Feature slug |
|--------------|
| `push_notiser` |

### 2.8 UI-identitet

| Fokus |
|-------|
| Rutiner |
| Motivation |
| Självständighet |

**Ton:** varm · lekfull · enkel · motiverande (stjärnor, framsteg, illustrationer).

**Wireframe — förälder (Idag):**

```
Idag — Anna
✓ Borsta tänderna  ✓ Klä på sig  ○ Läxor
+2 stjärnor idag
Nästa: Fotbollsträning
```

**Wireframe — barn:**

```
⭐ 24 stjärnor
NU — Borsta tänderna
[ Starta ]
```

---

## 3. Paket 2 — Familj Rapportering

| | |
|--|--|
| **Kundnamn** | Familj Rapportering |
| **Komponent** | `reporting` |
| **Pris** | 19 SEK/mån (vid betalning) |
| **Löfte** | Förstå utvecklingen över tid och dela den med andra |
| **Målgrupp** | Familjer som samarbetar med skola/vård eller vill följa utveckling |
| **Status** | ⚙️ Feature finns; betalning ej aktiverad |

### 3.1 Innehåll

| Område | Feature slug | Notering |
|--------|--------------|----------|
| Rapporter | `klinisk_rapportering` | Huvudfeature |
| Historik | `klinisk_rapportering` | Ingår |
| PDF-export | `klinisk_rapportering` | Ingår |
| Delningslänkar | `klinisk_rapportering` | Ingår |
| Trender | `klinisk_rapportering` | t.ex. genomförda aktiviteter, stjärnutveckling, observationshistorik |

### 3.2 UI-identitet

| Fokus |
|-------|
| Insikter |
| Dokumentation |
| Uppföljning |

**Ton:** professionell · dataorienterad · diagram och sammanfattningar (inte lekfull som Basic).  
**Ny huvudsektion:** *Rapporter*

**Wireframe — dashboard:**

```
Rapporter — Senaste 30 dagarna
Närvaro: 92%  |  Aktiviteter: +12%  |  Belöningar: 34  |  Svåra övergångar: 5
[ Skapa PDF ]
```

### 3.3 Gating

`requireComponent('reporting')` · UI: `/reports` + `data-feature="klinisk_rapportering"`

---

## 4. Paket 3 — Familj Pedagog

| | |
|--|--|
| **Kundnamn** | Familj Pedagog |
| **Komponent** | `pedagog` |
| **Pris** | TBD |
| **Löfte** | Gör det enkelt för familj och pedagog att arbeta tillsammans |
| **Målgrupp** | Familjer med resurspedagog, elevassistent, specialpedagog eller kontaktperson |
| **Status** | ⚙️ Features delvis live; komponent ej i config |

### 4.1 Innehåll

| Område | Feature slug / kod |
|--------|-------------------|
| Pedagoginbjudan | `pedagog_invite` |
| Pedagogroll | `parent_child.role = pedagog` |
| Pedagoganteckningar | `pedagoganteckningar` |
| Pedagogöversikt | `pedagog_dashboard` *(planerad)* |
| Begränsad åtkomst | Schema · Daglogg · Anteckningar |

**Ingen åtkomst till:** betalning · familjeinställningar · administrativa funktioner · belöningar

### 4.2 UI-identitet

| Fokus |
|-------|
| Samarbete |
| Kommunikation |
| Gemensam bild |

**Ton:** samarbetsverktyg — inte rapportverktyg (det är Rapportering).  
**Ny sektion:** *Samarbete*

**Wireframe:**

```
Samarbete
Emma Larsson — Specialpedagog — Senast aktiv: Idag
Anteckning 15 juni: Övergång till lunch gick bättre idag.
[ Kommentera ]
```

### 4.3 Gating

`requireComponent('pedagog')` · inbjudan endast om familjen har paketet

---

## 5. Paket 4 — Familj Extra stöd

| | |
|--|--|
| **Kundnamn** | Familj Extra stöd |
| **Komponent** | `teacch` |
| **Pris** | TBD |
| **Löfte** | Skapar mer förutsägbarhet och mindre stress i vardagen |
| **Målgrupp** | Barn som gynnas av visuellt stöd, tydliga övergångar och extra struktur |
| **Status** | 📋 Spec klar — troligen det mest emotionella paketet |

**Produkttext:** *Inspirerad av visuellt stöd och strukturerad pedagogik* — inte en officiell TEACCH-metod.

### 5.1 Innehåll v1.2

| Funktion | Feature slug | Not |
|----------|--------------|-----|
| **De sju frågorna** | `de_sju_fragorna` | Med **bild-/symbolstöd** per svar (§7.2) — inte ren text |
| **Visuell timer** | `visual_timer` | Krympande cirkel / Time Timer vid `how_long` — **inte** bara texten "5 minuter" |
| **Läs upp** | `read_aloud` | Talsyntes för aktivitet + ifyllda frågor (§7.5) |

Frågor: Vad? · Var? · Vem? · Hur länge? · Vad händer sen? · Vad behöver jag? · Varför?

**Tillgänglighetskrav (v1.2 P0):** Barn som inte läser ska kunna förstå NU-vyn utan att en vuxen läser högt — via pictogram, visuell timer och valfri uppläsning.

### 5.2 Innehåll v1.3+

| Funktion | Feature slug |
|----------|--------------|
| Distraktionsfri barnvy | `minimal_ui` |
| Övergångsstöd | `transition_support` *(planerad)* |
| Sociala berättelser | `social_stories` *(planerad)* |

*`visual_timer` finns delvis i barnvy idag (`child.visual_timer`) — v1.2 paketerar och **kräver** visuell representation i Extra stöd-läget, kopplat till `how_long`.*

### 5.3 UI-identitet

| Fokus |
|-------|
| Förutsägbarhet |
| Lugn |
| Struktur |

**Ton:** mycket lugnare än Basic — ingen visuell stress, inga stjärnor i kontextvyn.

| Basic | Extra stöd |
|-------|------------|
| ⭐ Stjärnor · 🎁 Skattkammare | NU + kontext |
| Motivation | Förutsägbarhet |

**Wireframe — De sju frågorna (v1.2):**

```
[🔊 Läs upp]                                    NU — Borsta tänderna

📍 Var?     [🚿 pictogram]  Badrummet          ← bild primär, text sekundär
👤 Vem?     [👤 pictogram]  Själv
⏱ Hur länge?  [○○○○● krympande cirkel]         ← visuell timer, inte bara "5 min"
➡ Sen?    [🥣 pictogram]  Frukost
🎒 Behöver? [🪥🧴 pictogram] Tandborste, tandkräm

[ ✓ Klar! ]
```

Tomma rader döljs. Pictogram hämtas från `icon_key` / aktivitetsbibliotek (§7.2).

**Wireframe — distraktionsfri (v1.3+):**

```
NU — Borsta tänderna
[ Klar ]
(inga menyer · inga stjärnor · inga sidfunktioner)
```

### 5.4 Gating

`requireComponent('teacch')` + per-feature flags

---

## 6. Navigation — arbetsflöden (inte paketknappar)

### 6.1 Grundprincip

När användaren har tillgång till flera paket (särskilt **alla fyra**) får menyn **inte** bli en funktionslista med 12 entry points. Paket säljs modulärt — men navigeras som **vardagslogik**.

| Fel (paketlogik) | Rätt (arbetsflöde) |
|------------------|---------------------|
| "Vilket paket innehåller detta?" | **"Vad vill jag göra nu?"** |
| En knapp per feature | Rollerad + kontextbaserad navigation |
| För dig som egen flik | För dig som modul i Idag |

**Stort grepp:** från *feature navigation* → *mental model navigation*.

### 6.2 Full åtkomst — ny huvudmeny (förälder)

**Bottom nav: max 5 items** (oförändrad mobilregel). **Inställningar** flyttas till **top-right** — inte i bottom nav.

| # | Flik | Syfte (arbetsflöde) | Paket som matar innehåll |
|---|------|---------------------|--------------------------|
| 1 | **Idag** | Allt som händer *nu* | Basic + Extra stöd (overlay) |
| 2 | **Rutiner** | Planera och strukturera vardagen | Basic |
| 3 | **Utveckling** | Förstå och följa över tid | Rapportering |
| 4 | **Samarbete** | Dela och kommunicera med andra vuxna | Pedagog |
| 5 | **Barn / Stöd** | Barnläge + behovsbaserat stöd | Basic + Extra stöd |

**⚙️ Inställningar** (top-right): konto · familjeinställningar · abonnemang · barnhantering · (tidigare *Mer*)

### 6.3 Innehåll per flik

#### 1. Idag *(ersätter Hem + delar av För dig)*

| Innehåll | Källa |
|----------|-------|
| Dagens rutiner | Basic |
| NU / NÄSTA | Basic + Extra stöd overlay |
| Snabb start av aktiviteter | Basic |
| Stjärnor idag | Basic |
| Snabb status per barn | Basic |
| **För dig-modul** *(ej egen flik)* | Basic |

**För dig inuti Idag** — modul, inte navigation:

```
Fortsätt utveckla
Rekommenderade rutiner
Nästa steg för ditt barn
```

Undvik duplicerad navigation + innehåll.

#### 2. Rutiner *(= Schema + aktivitetsbibliotek)*

| Innehåll |
|----------|
| Veckoschema |
| Specialdagar |
| Aktivitetsbibliotek |
| Delsteg |
| Mallar |

Basic *lever som system* här — inte som feed.

#### 3. Utveckling *(= Rapportering)*

| Innehåll |
|----------|
| Rapporter |
| Historik |
| PDF-export |
| Trender |
| Observationer |

Helt separat **analytiskt läge** — professionell ton (§3).

#### 4. Samarbete *(= Pedagog)*

| Innehåll |
|----------|
| Pedagoginbjudningar |
| Anteckningar |
| Gemensam vy |
| Begränsad åtkomst (schema/logg) |

Ska kännas som **extern yta** — inte familjeinterna inställningar.

#### 5. Barn / Stöd *(dynamisk hub)*

Kontextbaserad beroende på barn och aktiva paket:

| Om familjen har… | Hubben visar |
|------------------|--------------|
| **Extra stöd** (`teacch`) | De sju frågorna · visuell timer · övergångsstöd · minimal UI-läge |
| **Basic only** | Skattkammare · belöningar · genväg till barnvy |

Ersätter dagens separata *Skatt*-flik och delar av *För dig*.

### 6.6 Nav-hierarki (informationsarkitektur)

Varje funktion har **exakt en primär ingångspunkt**. Sekundära genvägar (t.ex. Idag → schema) är tillåtna men får inte duplicera hela moduler.

```
Idag                          Rutiner
├── Dagens rutiner            ├── Veckoschema
├── NU / NÄSTA                ├── Specialdagar
├── Stjärnor idag             ├── Aktivitetsbibliotek
├── Snabb status per barn     ├── Delsteg
└── För dig (modul)           └── Mallar

Utveckling                    Samarbete
├── Rapporter                 ├── Pedagoginbjudningar
├── Historik                  ├── Anteckningar
├── PDF-export                ├── Gemensam vy
├── Trender                   └── Begränsad åtkomst
└── Observationer

Barn / Stöd                   Inställningar (top-right)
├── Genväg barnvy             ├── Konto
├── Skattkammare (Basic)      ├── Familjeinställningar
└── Extra stöd-hub (teacch)    ├── Abonnemang
                              └── Barnhantering
```

| Regel | Beskrivning |
|-------|-------------|
| **En ingång** | Varje feature-slug har en primär flik/modul (denna tabell) |
| **Ingen parallell väg** | Samma modul får inte ha egen bottom-nav-flik *och* Idag-kort med samma scope |
| **Barn max 2 val** | Barnläge: Idag · Skatt — inga fler samtidiga nav-val (§14.6) |

### 6.4 Mappning — gammal → ny meny

| Idag (nuvarande) | Ny struktur |
|------------------|-------------|
| Hem | **Idag** |
| Schema | **Rutiner** |
| För dig | **Inuti Idag** (modul) |
| Skatt | **Barn / Stöd** |
| Mer | **Inställningar** (top-right) |
| *(nytt vid full access)* | **Utveckling** |
| *(nytt vid full access)* | **Samarbete** |

### 6.5 Delvis åtkomst — se allt, använd det du betalat

**Princip:** Användaren ska kunna **se alla paket** (och alla huvudflikar) men **inte använda** dem förrän de betalats. Det som visas utan köp är **mockade exempel** — inte familjens riktiga data — med en enkel **Köp nu**-knapp.

| Tillstånd | Vad användaren ser | Vad användaren kan göra |
|-----------|-------------------|-------------------------|
| **Aktivt paket** | Riktig data, full funktion | Allt inom paketet |
| **Ej köpt paket** | Förhandsvisning med mock-exempel | Läsa/skrolla demo · **Köp nu** |
| **Basic** | Alltid aktivt (eller ingår) | Full åtkomst |

**Bottom nav:** alla fem flikar **syns alltid** (arbetsflödesmodellen är konstant). Flikar utan köpt paket öppnar **preview-läge**, inte tom sida eller dold flik.

```
[ Idag ] [ Rutiner ] [ Utveckling🔒 ] [ Samarbete🔒 ] [ Barn/Stöd ]
                         ↑
              mockad rapportvy + [ Köp nu ]
```

#### Preview-läge per flik (ej köpt)

| Flik | Mock-exempel (statiskt) | CTA |
|------|-------------------------|-----|
| **Utveckling** | Demo-dashboard: närvaro 92%, aktiviteter +12%, exempel-PDF | Köp Familj Rapportering |
| **Samarbete** | Demo-pedagogkort, exempelanteckning | Köp Familj Pedagog |
| **Barn / Stöd** (teacch-del) | Demo NU-kort med De sju frågorna ifyllda | Köp Familj Extra stöd |

**Regler för mock-data:**

| Regel | Detalj |
|-------|--------|
| Tydligt märkt | Banner: *"Exempel — så här kan det se ut"* |
| Ingen riktig data | Mock får **inte** blanda in familjens barnnamn, loggar eller observationer |
| Ingen write | Inga spara/export/delning-knappar som fungerar — endast Köp nu |
| En CTA | En primär **Köp nu** per preview-yta (sekundär: *Läs mer*) |
| Efter köp | Samma vy byter till riktig data utan nav-omläggning |

#### Teknisk gating (oförändrad)

- **UI preview:** alltid tillgänglig (läs/mock)
- **API & write:** `requireComponent()` → 403 `COMPONENT_MISSING` + `upgrade_url`
- **Barnläge:** preview av Extra stöd gäller föräldravyn; barn ser aldrig låsta paket

**Skilj från:** döda/låsta flikar (❌) · tom upgrade-modal vid varje klick (❌) · feature-lista utan kontext (❌)

### 6.6 Barnläge vs föräldraläge

Implicit **mode** — olika nav, samma app:

| 👩 Förälder | 👶 Barn (inloggad) |
|-------------|-------------------|
| Idag | Idag (NU/NÄSTA) |
| Rutiner | — |
| Utveckling | — |
| Samarbete | — |
| Barn / Stöd | Skatt / Stöd (enkel vy) |
| Inställningar (top-right) | — |

Barn ser aldrig Utveckling, Samarbete eller administrativa inställningar.

### 6.7 Kort sammanfattning — full access

```
Bottom nav (förälder, alla paket):
  Idag        → action
  Rutiner     → struktur
  Utveckling  → insikt
  Samarbete   → extern vuxen
  Barn/Stöd   → behov + barnläge

Top-right:
  Inställningar → meta (konto, familj, abonnemang)
```

---

## 7. De sju frågorna — detaljspec (Extra stöd v1.2)

### 7.1 Ramverk & fältnycklar

| Fråga | Fältnyckel |
|-------|------------|
| Vad ska jag göra? | `what` |
| Var ska jag vara? | `where` |
| Vem ska jag vara med? | `who` |
| Hur länge? | `how_long` |
| Vad händer sen? | `what_next` |
| Vad behöver jag? | `what_need` |
| Varför? | `why` |

Dölj tomma fält. Kortare svar i barnvy. Delsteg = Basic (hur); sju frågor = Extra stöd (kontext).

### 7.2 Datamodell & API

```sql
ALTER TABLE activity_template
  ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

**Varje svar är ett objekt — inte en ren textsträng.** Ren text räcker inte för barn som inte läser.

```json
{
  "version": 1,
  "where": {
    "text": "Badrummet",
    "icon_key": "bathroom",
    "emoji": "🚿",
    "image_url": null
  },
  "who": {
    "text": "Själv",
    "icon_key": "alone",
    "emoji": "👤",
    "image_url": null
  },
  "how_long": {
    "text": "5 minuter",
    "minutes": 5
  },
  "what_next": {
    "text": "Frukost",
    "activity_template_id": "uuid-breakfast",
    "icon_key": null,
    "emoji": null
  },
  "what_need": {
    "text": "Tandborste, tandkräm",
    "items": [
      { "text": "Tandborste", "icon_key": "toothbrush", "emoji": "🪥" },
      { "text": "Tandkräm", "icon_key": "toothpaste", "emoji": "🧴" }
    ]
  }
}
```

| Fält (rot) | Typ | Syfte |
|------------|-----|-------|
| `version` | number | Schemaversion — börja på `1`; krävs för framtida migreringar |

| Fält per svar | Typ | Syfte |
|---------------|-----|-------|
| `text` | string | Föräldredigering + uppläsning (max 500 tecken) |
| `icon_key` | string? | Nyckel till pictogram-bibliotek |
| `emoji` | string? | Fallback-symbol |
| `image_url` | string? | **Egen familjebild** (foto på badrum, mamma, …) — *rekommenderad nivå* för maximal tillgänglighet (§14.1) |
| `activity_template_id` | uuid? | Referens till aktivitetsmall — `what_next` (och senare `where`/`who`) ärver emoji, namn, bild |
| `minutes` | number? | Endast `how_long` — driver visuell timer |
| `items` | array? | Endast `what_need` — flera objekt med egna symboler |

**Pictogram-bibliotek (v1.2):** `config/seven-questions-pictograms.js` — stabilt schema från dag ett:

```javascript
{
  key: 'bathroom',
  label: 'Badrum',
  category: 'place',       // place | person | object | activity
  emoji: '🚿',
  image_url: '/pictograms/bathroom.svg',
  locale: { sv: 'Badrum' } // v1.3+ lokalisering
}
```

~40 seedade pictogram. Kategorier möjliggör sökning, filtrering och framtida egna bilder utan schemaändring.

**Koppling till aktivitetsbibliotek:** `activity_template_id` på `what_next` (v1.2 P0) — NÄSTA ärver automatiskt ikon, namn och metadata från nästa aktivitet. Samma mönster kan utökas till `where`/`who` i v1.3.

**Barnvy — renderingsprioritet (obligatorisk):**

```
1. image_url     → familjefoto (störst)
2. icon_key      → pictogram från bibliotek
3. emoji         → explicit eller auto-genererad från icon_key/kategori
4. (aldrig)      → enbart text utan visuellt stöd
```

Om endast `text` finns: `normalizeSevenQuestions()` tilldelar **auto emoji-fallback** från kategori/heuristik — barnet ska aldrig möta en ren textrad. Föräldervy visar mjuk uppmaning: *"Lägg till bild för bättre stöd"* (inte blockerande fel).

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET/POST/PUT | `/api/activities` | `seven_questions` (objekt per fält) |
| GET | `/api/children/me/daily-log` | Berika från `activity_template` |
| GET | `/api/pictograms` *(ny)* | Lista tillgängliga `icon_key` + URL/emoji |

### 7.3 Tekniska krav

```javascript
const QUESTION_ORDER = [
  'what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why',
];
```

`normalizeSevenQuestions(input)` — trimma `text`, sätt `version: 1` om saknas, ta bort tomma fält, validera `icon_key` mot bibliotek, `minutes` 1–120 för `how_long`, max 500 tecken per `text`, tillämpa auto emoji-fallback om inget visuellt finns.

**Bakåtkompatibilitet:** Legacy-sträng (`"Badrummet"`) → `{ text: "Badrummet", emoji: "📍" }` (kategori-heuristik). Aldrig text-only i barnvy.

### 7.4 Barnvy — NU-kort

```
1. Aktivitetsnamn
2. Delsteg (Basic, om aktivt)
3. De sju frågorna (Extra stöd, om aktivt)
4. Klar
```

NÄSTA-kort synligt (övergångsstöd). Redigering i biblioteket (progressive disclosure).

### 7.5 Tillgänglighet — icke-läsande barn (v1.2 P0)

Tre **kritiska broar** mellan text och visuell förståelse — utan dessa fungerar Extra stöd inte för målgruppen.

| # | Bro | v1.2-krav | Spec |
|---|-----|-----------|------|
| 1 | **Bild-/symbolstöd** | Varje ifyllt svar har pictogram (§7.2) | Utan `icon_key`/`emoji`/`image_url` = ofullständigt svar i barnvy |
| 2 | **Visuell timer** | `how_long` → krympande cirkel (befintlig Time Timer) | Texten "5 minuter" är **sekundär** — aldrig enda representationen |
| 3 | **Läs upp** | `read_aloud` — högtalarikon på NU-kortet | Web Speech API (web) · native TTS (iOS/Android) · läser aktivitet + ifyllda frågor |

**Läs upp — beteende:**

```
[🔊]  →  "Nu ska du borsta tänderna.
          Du ska vara i badrummet.
          Du är själv.
          Det tar ungefär fem minuter."
```

- En tryckning = hela NU-kontexten (aktivitet + alla ifyllda sju frågor)
- Språk: svenska (`sv-SE`)
- Respekterar `prefers-reduced-motion` / systemets "läs inte automatiskt"
- Gated: `requireComponent('teacch')` + `hasFeature('read_aloud')`
- **Fallback:** Om TTS ej tillgänglig (webbläsare/enhet) → **dölj högtalarknappen** — aldrig visa knapp som ger felmeddelande i barnvy

**Visuell timer — beteende (Extra stöd):**

- Aktiveras när `how_long.minutes` eller `start_time`/`end_time` finns
- Samma SVG-cirkel som idag i `child-dashboard.js` (`initTimeTimers`)
- Vid `teacch`: timer **alltid synlig** när tidsfält finns — förälder kan inte lämna barnet med enbart text
- Paketeras under `visual_timer` i `teacch`-komponenten

**Barn-nav — strikt nedstängning (§13.4):**

| Läge | Bottom nav |
|------|------------|
| Barn Basic | **Endast** Idag · Skatt — inga Rutiner, Mer, Inställningar |
| Barn Extra stöd (NU aktiv) | **Dölj bottom nav** tills aktivitet är avklarad — barnet ska inte kunna "villa bort sig" |
| Efter ✓ Klar | Visa Idag · Skatt igen |

---

## 8. Tekniskt paketregister

Målbild för `config/subscription-components.js`:

```javascript
// Priser/metadata — själva köpet sker via IAP (RevenueCat), inte Stripe (§9.7)
const PACKAGE_COMPONENT_MAP = {
  basic_app: {
    name: 'Basic',
    price_monthly_sek: 59,
    rc_product_id: null, // App Store / Play Console via RevenueCat
  },
  reporting: {
    name: 'Familj Rapportering',
    price_monthly_sek: 19,
    rc_product_id: null,
  },
  pedagog: {
    name: 'Familj Pedagog',
    price_monthly_sek: null,
    rc_product_id: null,
  },
  teacch: {
    name: 'Familj Extra stöd',
    price_monthly_sek: null,
    rc_product_id: null,
  },
};
```

*Befintlig export `STRIPE_COMPONENT_MAP` kan bytas namn vid implementation — innehållet är paketmetadata, inte betalningskanal.*

**Betalning:** endast plattforms-IAP (§9.7). Ingen Stripe-checkout, inga kortformulär, inga externa betalningslänkar i appen.

### 8.2 Gating — två nivåer

| Nivå | API | Syfte |
|------|-----|-------|
| **Komponent** | `hasComponent('teacch')` / `requireComponent('teacch')` | Paketköp — "har familjen Extra stöd?" |
| **Feature** | `hasFeature('visual_timer')` / `requireFeature('read_aloud')` | Finmaskig rollout inom paket (v1.3: `social_stories`, `minimal_ui` utan nytt paket) |

Middleware i `src/middleware/require-component.js` utökas med `requireFeature(slug)` som kollar `family_features` + komponent-mapping (§8.1).

```javascript
// Exempel
if (hasComponent('teacch') && hasFeature('de_sju_fragorna')) { … }
if (hasFeature('read_aloud') && ttsAvailable) { showSpeakerButton(); }
```

### 8.3 Feature-slug → komponent (register)

| Komponent | Feature slugs |
|-----------|---------------|
| `basic_app` | `for_dig`, `veckoschema`, `specialdagar`, `kalender`, `aktivitetsbibliotek`, `daglogg`, `manuella_stjarnor`, `beloningssystem`, `skattkammar_universum`, `familjeinbjudan`, `barninloggning`, `push_notiser`, `onboarding` |
| `reporting` | `klinisk_rapportering` |
| `pedagog` | `pedagog_invite`, `pedagoganteckningar`, `pedagog_dashboard` |
| `teacch` | `de_sju_fragorna`, `visual_timer`, `read_aloud`, `minimal_ui`, `transition_support`, `social_stories` |

*(Planerade slugs i kursiv logik: `pedagog_dashboard`, `transition_support`, `social_stories` — lägg till i `seed-features.js` vid implementation.)*

---

## 9. Uppgradering & förhandsvisning (Köp nu)

### 9.1 Uppgraderingssidan (`/upgrade`)

Fyra löfteskort — rubrik = nytta. **Alla fyra syns alltid**, även paket som redan är köpta.

| Kort | Rubrik | Tillstånd (intressefas) | Tillstånd (köp-live) |
|------|--------|-------------------------|------------------------|
| Basic | Vardagens grundfunktioner | *Ingår* / aktiv | *Ingår* / aktiv |
| Rapportering | Följ utveckling över tid | Preview + **Anmäl intresse** | Preview + **Köp nu** eller *Aktivt* |
| Pedagog | Samarbeta med pedagoger | Preview + **Anmäl intresse** | Preview + **Köp nu** eller *Aktivt* |
| Extra stöd | Ökad förutsägbarhet | Preview + **Anmäl intresse** | Preview + **Köp nu** eller *Aktivt* |

**Intressefas:** inga priser (kr/mån) på kort eller preview — se §9.8.

Varje ej köpt kort visar **en mockad miniatyr** (skärmdump eller inline-demo) — inte bara en checklista.

### 9.2 Köp nu — enhetligt beteende

**CTA-läge styrs av rollout-fas (§9.8):** under *intressefas* visas **Jag är intresserad** istället för Köp nu.

| Element | Spec |
|---------|------|
| **Knapp (köp-live)** | `Köp nu` (primär) — när `PACKAGES_ROLLOUT_MODE=purchase` |
| **Knapp (intressefas)** | Se godkänd copy §9.8 — t.ex. *Anmäl intresse för beta* |
| **Placering** | Preview-banner (top) · bottom sticky på mobil · uppgraderingskort |
| **Klick (intressefas)** | `POST /api/subscription/interest` → bekräftelse *"Tack! Vi har noterat ditt intresse."* |
| **Klick (native iOS, köp-live)** | Öppna RevenueCat/StoreKit — **Apple** plattformsbetalning (App Store) |
| **Klick (native Android, köp-live)** | Öppna RevenueCat/Play Billing — **Google** plattformsbetalning (Play Store) |
| **Klick (webb/PWA, köp-live)** | **Ingen checkout** — *"Öppna i appen för att köpa"* |
| **Efter köp** | Webhook → `family_subscriptions.components` → preview ersätts av riktig vy |

### 9.3 Preview-mockar (innehåll)

Statiskt exempelinnehåll — fiktiva namn och siffror:

**Utveckling (reporting):**
```
Exempel — så här kan det se ut
Senaste 30 dagarna · Närvaro: 92% · Aktiviteter: +12%
[ Köp Familj Rapportering ]
```

**Samarbete (pedagog):**
```
Exempel
Emma Larsson, specialpedagog — "Övergång till lunch gick bättre idag."
[ Köp Familj Pedagog ]
```

**Extra stöd (teacch):**
```
Exempel — De sju frågorna
NU: Borsta tänderna · Var? Badrummet · Sen? Frukost
[ Köp Familj Extra stöd ]
```

### 9.4 Var preview visas

| Yta | Beteende |
|-----|----------|
| Bottom nav-flik (ej köpt) | Fullskärms-preview med mock |
| Uppgraderingssida | Miniatyr + Köp nu per kort |
| Djup länk till låst feature | Redirect till preview eller upgrade med `?paket=` |
| Inställningar → Abonnemang | Alla paket med status Aktivt / Köp nu |

Tillägg kombinerbara. Totalpris vid flerval på upgrade-sidan.

### 9.5 Kontextuella uppgraderingspunkter (konvertering)

Utöver passiv preview — visa CTA när användaren naturligt behöver paketet:

| Paket | Trigger | Copy (exempel) | CTA (intressefas) |
|-------|---------|----------------|-------------------|
| **Rapportering** | ≥14 dagar med aktivitetsdata | *"Du har registrerat aktiviteter i två veckor…"* | Jag är intresserad av Rapportering |
| **Pedagog** | Förälder försöker bjuda in extern vuxen | *"Vill du samarbeta med pedagog?"* | Jag är intresserad av Pedagog |
| **Extra stöd** | Förälder redigerar aktivitet / sju frågor | *"Lägg till visuellt stöd…"* | Jag är intresserad av Extra stöd |

Vid `PACKAGES_ROLLOUT_MODE=purchase` → samma triggers med **Köp nu** istället.

Triggers är **icke-blockerande** i v1.2 (banner/modal med dismiss) — men ska loggas i `analytics_events` för A/B.

### 9.6 Centralt preview-register

En källa för all mock-data — samma innehåll i bottom-nav-preview, `/upgrade` och djup länkar:

```javascript
// config/preview-data.js
module.exports = {
  reporting: { /* statisk rapport, trender, PDF-miniatyr */ },
  pedagog:   { /* fiktiv pedagog, anteckning */ },
  teacch:    { /* NU-kort med sju frågor + pictogram */ },
};
```

**Regel:** Ingen familjedata i preview. Alla vyer importerar från `preview-data.js` — inte hårdkodad demo per sida.

### 9.7 Betalning — endast Apple / Google (plattforms-IAP)

**Beslut:** Betalning sker **enbart** via respektive appbutiks betalning — inte via webben, Stripe eller egna kortformulär.

| Plattform | Betalning | Teknik | Tillåtet i UI |
|-----------|-----------|--------|---------------|
| **iOS-app** | Apple (App Store) | RevenueCat + StoreKit | Native köpdialog; Face ID / Apple Pay som betalmetod på Apples sida |
| **Android-app** | Google (Play Store) | RevenueCat + Play Billing | Native köpdialog; Google Pay som betalmetod på Googles sida |
| **Webb / PWA** | **Ingen** | — | Preview + Köp nu → *Öppna i appen*; **aldrig** Stripe-länk eller kortfält |

**Motivering:**
- Apple App Store Review Guideline 3.1.1 — digitala abonnemang i iOS-app ska via IAP
- Google Play Billing Policy — motsvarande för Android
- En köpväg per plattform — familjens `family_subscriptions` synkas via RevenueCat webhook (befintlig `src/routes/iap.js`)

**Köpflöde (native):**

```
Köp nu → iap-manager.js → Purchases.purchasePackage()
  → iOS: StoreKit (Apple)  /  Android: Play Billing (Google)
  → RevenueCat webhook → family_subscriptions.components
```

**Fyra paket i v1.2** mappas till RevenueCat *offerings/packages* (ett eller flera produkt-ID:n per komponent — produktbeslut vid IAP-setup).

**Förbjudet överallt i native:**
- Stripe Checkout / Polsia Stripe-proxy i appen
- Länkar till webb-betalning (`upgrade.html` med kortbetalning)
- Text som uppmanar att betala utanför App Store / Play Store

**Webb/PWA — Köp nu-beteende:**

```
┌─────────────────────────────────────┐
│ Köp Familj Rapportering i appen     │
│                                     │
│ Betalning sker via App Store eller  │
│ Google Play — öppna familjeappen   │
│ i appen för att slutföra köpet.     │
│                                     │
│ [ Öppna appen ]  [ App Store ]      │
└─────────────────────────────────────┘
```

**Admin / livstidsgratis:** `lifetime_free` och manuell komponenttilldelning i admin kvarstår — utan IAP.

**Referens:** `docs/app-store-iap.md` · `src/routes/iap.js` · `public/js/iap-manager.js`

### 9.8 Intressefas — fake door / smoke test före köp-live

**Beslut:** Alla delar i v1.2 **kan byggas i kod** — men **synlig funktion styrs av admin** via `PACKAGES_ROLLOUT_MODE`. Familjer går inte live med Rapportering, Pedagog eller Extra stöd förrän datat motiverar det. Under intressefasen ser **alla familjer** (inkl. `lifetime_free`) mock-preview och kan anmäla intresse via en **beta-väntelista** — inte en trasig köpknapp.

*Produktmetod: **fake door test** / **smoke test** — validera köpintention och paketprioritet innan IAP och full implementation.*

| Fas | `PACKAGES_ROLLOUT_MODE` | CTA | Vad familjer får |
|-----|-------------------------|-----|------------------|
| **Av** *(default vid deploy + App Review)* | `off` | — | **Ingen ny UI** — appen beter sig exakt som idag |
| **Intressefas** *(admin aktiverar)* | `interest` | **Anmäl intresse för beta** *(ej "Köp")* | Mock-preview · väntelista · ingen write · ingen IAP · **inga priser** |
| **Köp-live** *(admin aktiverar)* | `purchase` | **Köp nu** | Preview → IAP (§9.7) eller aktivt paket |

**Default:** `off`. All v1.2-kod kan ligga i produktion utan att användare ser något — tills admin (Pontus) sätter `interest` eller `purchase`.

**Full funktion per familj:** Oberoende av rollout-läge kan admin tilldela komponenter i `family_subscriptions` (t.ex. ge `teacch` till en testfamilj) — då får familjen riktig funktion utan mock.

**Varför:** Mät efterfrågan bland befintliga föräldrar innan IAP-produkter, priser och support kapas — utan att påverka pågående App Review.

#### Godkänd copy (intressefas)

| ❌ Använd inte | ✅ Använd istället |
|---------------|-------------------|
| Köp nu | **Anmäl intresse för beta** |
| Lås upp / Aktivera | **Håll mig uppdaterad** |
| Pris (t.ex. 19 kr/mån) | *(ingen prisinfo)* |
| "Funktionen är inte klar" | *"Förhandsvisning — lanseras under [period]"* |

**Primär CTA per paket (rekommenderat):**

| Paket | Knapptext |
|-------|-----------|
| Rapportering | Anmäl intresse för beta |
| Pedagog | Anmäl intresse för beta |
| Extra stöd | Anmäl intresse för beta |

Alternativ: *Håll mig uppdaterad* · *Ansök om tidig tillgång*.

#### Vad alla familjer ser (intressefas)

Preview-sidan är en **förhandsvisning + väntelista** — inte en placeholder med död knapp.

```
┌─────────────────────────────────────┐
│ Förhandsvisning — Familj Rapportering │
│                                     │
│ Så här kan det se ut när funktionen  │
│ lanseras. Exempeldata — inte din familj. │
│                                     │
│ [ mockad dashboard ]                │
│                                     │
│ Vi bjuder in familjer till stängd   │
│ beta. Anmäl intresse så meddelar vi │
│ när er familj kan aktivera det.     │
│                                     │
│ [ Anmäl intresse för beta ]         │
└─────────────────────────────────────┘
        ↓ klick
┌─────────────────────────────────────┐
│ Tack!                               │
│ Vi har lagt till er familj på       │
│ väntelistan för beta.               │
│ Du får en notis när funktionen      │
│ blir tillgänglig.                   │
└─────────────────────────────────────┘
```

| Flik / paket | Innehåll | CTA |
|--------------|----------|-----|
| **Utveckling** (reporting) | Mock-rapport, trender | Anmäl intresse för beta |
| **Samarbete** (pedagog) | Mock-pedagog | Anmäl intresse för beta |
| **Barn/Stöd** → Extra stöd (teacch) | Mock De sju frågorna | Anmäl intresse för beta |
| **Basic** | Full funktion | — |

**Gäller även `lifetime_free`.**

| Regel | Beskrivning |
|-------|-------------|
| En knapp per preview | Primär CTA — **aldrig** Köp nu i intressefas |
| **Inga priser** | Varken på preview, `/upgrade` eller triggers |
| Ingen write | API/write fortfarande `requireComponent()` — 403 |
| Barnläge | Barn ser **inte** intresse-CTA eller tilläggspreview |
| Dubbelklick | *"Ni står redan på väntelistan"* (mjuk bekräftelse) |
| Sekundär | Valfri kort kommentar (max 280 tecken) |

#### Apple App Review & Google Play (kritiskt)

Intressefasen får **inte** se ut som en trasig IAP-knapp.

| Riktlinje | Risk | Åtgärd |
|-----------|------|--------|
| **Apple 2.1** App Completeness | Knapp → "vi bygger detta" = **avvisning** | Frama som **beta-väntelista** med fungerande bekräftelse |
| **Apple 3.1.1** In-App Purchase | "Köp" eller pris utan StoreKit = **avvisning** | Inga kommersiella ord; inga priser i intressefas |
| **Google Play** | Liknande policy | Samma copy och UX |

**Strategi inför granskning:**

1. **Nuvarande submission:** `PACKAGES_ROLLOUT_MODE=off` — appen förblir **100 % oförändrad** för granskaren; v1.2-kod får finnas men är inaktiv
2. **Efter godkännande:** admin sätter `interest` i ny uppdatering (t.ex. v1.1) med beta-väntelista-copy ovan
3. **App Review Notes (vid `interest`):** *"New sections are preview/waitlist for upcoming features. No purchases. Users can register interest for a future beta."*

**Native builds:** Skicka med `off` till review om osäkert. Vid `interest` i review-build: rätt beta-copy, **aldrig** Köp nu eller priser.

#### Datainsamling

**API:**

```
POST /api/subscription/interest
Body: { "component": "reporting" | "pedagog" | "teacch", "source": "preview_nav", "comment": null }
```

**Lagring:** tabell `package_interest` (se tidigare schema).

**Analytics (primär KPI för intressefas):**

```javascript
event_type: 'interest_registered',  // alias: package_interest_registered
metadata: {
  paket: 'teacch',           // reporting | pedagog | teacch
  source: 'bottom_nav_preview'  // preview_nav | upgrade | contextual_trigger
}
```

**North Star under intressefas:** konvertering *preview → intresseanmälan* per paket (§15).

#### Admin & beslut

| Vy | Innehåll |
|----|----------|
| Admin → Paketintresse | Antal familjer per komponent · lista · export CSV |
| Intern dashboard | Intresse-% av aktiva familjer · ranking per paket |

**Beslut att gå köp-live:** När intresse + strategi motiverar → `PACKAGES_ROLLOUT_MODE=purchase`, IAP (§9.7), priser synliga, CTA = Köp nu. Väntelistefamiljer kan prioriteras till beta *(valfritt)*.

#### Teknisk växling

| Env / feature flag | Värde |
|--------------------|-------|
| `PACKAGES_ROLLOUT_MODE` | `off` *(default)* \| `interest` \| `purchase` |
| `PACKAGES_PURCHASE_ENABLED` | `false` i `off` och intressefas · `true` vid köp-live |
| `PACKAGES_SHOW_PRICES` | `false` i `off` och intressefas · `true` vid köp-live |

**Admin:** samma flaggor kan sättas via `feature_flag` i admin (överstyr env). Env är fallback om flagga saknas.

**Klientbeteende per läge:**

| `rollout_mode` | Nav v1.2 | Preview-shell | Intresse-CTA | IAP |
|----------------|----------|---------------|--------------|-----|
| `off` | Nej — nuvarande nav | Monteras inte | Nej | Nej |
| `interest` | Ja | Ja (mock + beta-copy) | Ja | Nej |
| `purchase` | Ja | Ja (mock eller aktivt) | Nej — Köp nu | Ja (native) |

`preview-shell.js` och `native-tab-bar.js` läser `/api/subscription/access` → `rollout_mode` + `show_prices` → monterar inget när `off`.

#### Minimal smoke test (snabbaste vägen live)

För att mäta intresse **utan** att bygga hela v1.2:

| Epic | Leverans |
|------|----------|
| **E1** | `package-access` + `/api/subscription/access` |
| **E2** | `preview-data.js` + `preview-shell.js` (beta-copy, intresse-CTA) |
| **E4** | Nav förälder — nya flikar öppnar preview |
| **E10** | `interest_registered` analytics + `package_interest` API |

*Epic E6–E9 (Extra stöd full implementation) väntar på intressedata.*

**Rekommenderad körning:** smoke test **2 veckor** → dashboard visar vilket paket som prioriteras → bygg det paketet först.

**Byggordning full v1.2:** §16 oförändrad — intressefas är deploy-läge, inte kortare scope om ni väljer full build parallellt.

---

## 10. Rollout v1.2 (översikt)

**Detaljerad plan:** §16.  
**Princip:** Bygg paketering och preview **före** nav-omläggning och Extra stöd-UI.

| Fas | Epics | Leverans |
|-----|-------|----------|
| **0** | 1 | Access-brygga (`package-access`, `/api/subscription/access`) |
| **1** | 2–3 | Preview-shell + `/upgrade` (4 paket, IAP på native) |
| **2** | 4–5 | Nav förälder + barn (§6) |
| **3** | 6–9 | Extra stöd: datamodell, bibliotek, barnvy, TTS |
| **4** | 10–11 | Analytics §15 + kontextuella triggers §9.5 |
| **5** | 12 | IAP-produkter App Store + Play Console (§9.7) — **efter** intressefas |

**Rekommenderad go-to-market:** (1) Deploy v1.2-kod med `off` → godkänn gratis app i review · (2) Admin sätter `interest` → ship smoke test (E1+E2+E4+E10) · (3) Mät 2 v · (4) Bygg vinnande paket · (5) Admin sätter `purchase` + IAP.

---

## 11. Acceptanskriterier

- [ ] Fyra paket med löfte, komponent, feature-register
- [ ] För dig dokumenterat under Basic — inte femte paket
- [ ] `pedagog_dashboard`, `transition_support`, `social_stories` planerade under rätt paket
- [ ] `hasComponent()` + `hasFeature()` tvånivå-gating (§8.2)
- [ ] `seven_questions.version` + `activity_template_id` på `what_next` (§7.2)
- [ ] Pictogram-schema med `key`, `category`, `image_url` (§7.2)
- [ ] Auto emoji-fallback — barnvy aldrig text-only (§7.2)
- [ ] `config/preview-data.js` — en mock-källa (§9.6)
- [ ] Betalning endast via Apple (iOS) / Google (Android) IAP — ingen webb-checkout (§9.7)
- [ ] TTS: dölj högtalare om ej tillgänglig (§7.5)
- [ ] Nav-hierarki: en primär ingång per feature (§6.6)
- [ ] AI-princip §14.12 dokumenterad — inga autonoma AI-skrivningar utan föräldragodkännande
- [ ] Success metrics §15 — NSM + paket-KPI:er instrumenterade i `analytics_events`
- [ ] Uppgradering & preview enligt §9 (alla paket synliga, mock + Köp nu)
- [ ] Navigation: arbetsflödesflikar (§6); alla 5 flikar synliga; ej köpta = preview-läge
- [ ] Mock-data tydligt märkt; ingen familjedata i preview
- [ ] API/write blockerat via `requireComponent()` tills köp
- [ ] Inställningar i top-right, inte bottom nav eller Idag-grid
- [ ] Design enligt §13: en nav-väg, Extra stöd som NU-overlay, minimal barn-nav
- [ ] `PACKAGES_ROLLOUT_MODE=off` som default — ingen synlig förändring vid deploy/review
- [ ] Intressefas §9.8 — beta-väntelista, inga priser, Apple-säker copy, `interest_registered`

---

## 12. Beslut

| # | Beslut |
|---|--------|
| A | v1.2 = Paket — fyra säljbara moduler |
| B | **För dig ∈ Basic** — familjens målyta, inte eget paket |
| C | Feature-slug-register per komponent (§7.1) |
| D | Extra stöd v1.2 = De sju frågorna + pictogram + visuell timer + Läs upp; `minimal_ui` m.m. = v1.3+ |
| E | Nya funktioner → ett paket via beslutregeln (§0) |
| F | **Meny = arbetsflöden** vid köp — inte paketknappar (§6) |
| G | För dig = modul i Idag — aldrig egen huvudflik |
| H | Bottom nav max 5; Inställningar top-right |
| I | **Se allt, använd det du betalat** — mock-preview + Köp nu (§6.5, §9) |
| J | Mock = statiskt exempel; aldrig familjens riktiga data i preview |
| K | Extra stöd = overlay på barnets NU-vy — inte separat app med egen nav (§13) |
| L | Idag har en nav-väg — inte grid + bottom nav som dubbel huvudmeny (§13) |
| M | **Svar på sju frågor = objekt med pictogram** — ren text räcker inte i barnvy (§7.2) |
| N | **Visuell timer ∈ v1.2** under `teacch` — `how_long` får aldrig vara text-only (§7.5) |
| O | **Läs upp (`read_aloud`) ∈ v1.2** — TTS som komplement till pictogram (§7.5) |
| P | **Barn-nav strikt** — Basic: Idag+Skatt; Extra stöd under aktivitet: dölj nav (§7.5) |
| Q | **Ett paket = ett problem** — positioneringstabell §0 |
| R | **En primär nav-ingång** per feature (§6.6) |
| S | **`hasComponent` + `hasFeature`** — tvånivå-gating (§8.2) |
| T | **`seven_questions.version`** + `activity_template_id` på `what_next` (§7.2) |
| U | **Centralt `preview-data.js`** — en mock-källa (§9.6) |
| V | **Kontextuella uppgraderingspunkter** — inte bara passiv preview (§9.5) |
| W | **North Star** = genomförda aktiviteter/barn/vecka; retention = ≥3 dagar/vecka (§15) |
| X | **AI får föreslå, aldrig automatiskt ändra** utan föräldragodkännande (§14.12) |
| Y | **Betalning endast via Apple/Google IAP** — ingen Stripe/webb-checkout (§9.7) |
| Z | **Intressefas före köp-live** — fake door / beta-väntelista (§9.8) |
| AA | **Apple-säker intresse-copy** — inga priser, inga "Köp"-ord i intressefas (§9.8) |
| AB | **`off` som default** — all v1.2-kod deploybar utan synlig effekt; admin aktiverar `interest` / `purchase` (§9.8) |

---

## 13. Designprinciper & mockup-granskning

*Referens: treläges-mockup (Föräldarläge · Barnläge · Extra stöd-läge), 2026-06-17.*

### 13.1 Tre lägen — rätt modell

| Läge | Syfte | Målgrupp |
|------|-------|----------|
| **Föräldarläge** | Full översikt, alla arbetsflöden | Förälder |
| **Barnläge** | Enkel vy — fokus på nuet | Barn (Basic-ton) |
| **Extra stöd (barn)** | Lugn struktur — De sju frågorna | Barn med `teacch` |

**Viktigt:** Tre lägen är *upplevelser*, inte tre paket. Paket säljs kommersiellt; lägen styrs av roll + aktiva komponenter.

### 13.2 Designprinciper (gäller implementation)

| # | Princip |
|---|---------|
| 1 | **En primär nav-väg** — bottom nav (5 flikar) är huvudnavigering; Idag duplicerar inte hela menyn |
| 2 | **Idag = action** — checklista, stjärnor, NU/NÄSTA, För dig-modul; inte sex jämbördiga kort |
| 3 | **Inställningar top-right** — kugghjul/avatar; aldrig sjätte kort i grid eller bottom nav |
| 4 | **Extra stöd = overlay** — De sju frågorna visas *inuti* barnets NU-vy, inte som separat app med egen meny |
| 5 | **Barn = minimal nav** — Idag + Skatt/Stöd; ingen Rutiner, Utveckling, Samarbete eller Mer |
| 6 | **En primär handling (barn)** — ✓ Klar; inga konkurrerande knappar |
| 7 | **Färg = arbetsflöde** — konsekvent palett: Rutiner (teal) · Utveckling (blå) · Samarbete (lila) · Barn/Stöd (grön) · Extra stöd (dämpad blå) |
| 8 | **Preview synlig** — ej köpta flikar visar mock + Köp nu (§9), inte tom eller dold |

### 13.3 Föräldarläge — mockup

**Det som fungerar:**

- Idag överst: checklista, +stjärnor, barnväljare
- Fem bottom-flikar: Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd
- Färgkodade områdeskort med kort beskrivning — tydlig paketidentitet utan paketknappar

**Justera:**

| Problem | Rekommendation |
|---------|----------------|
| Grid **och** bottom nav visar samma fem områden | **Alternativ A (rekommenderat):** Idag = bara dagens action + För dig-modul; bottom nav = enda huvudnav |
| Inställningar som grått kort i grid | Flytta till **top-right** (header) |
| För dig-modul saknas | Lägg under checklistan: *"Fortsätt utveckla" · "Rekommenderade rutiner"* |

**Målbild — Idag (förälder):**

```
[Anna ▾]                              [🔔] [⚙️]

Idag
✓ Borsta tänderna  ✓ Klä på sig  ○ Läxor
+2 stjärnor idag                    [Skatt]

── Fortsätt utveckla ──          ← För dig-modul (Basic)
Rekommenderad rutin: Trygga kvällar
[Aktivera]

(bottom nav: Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd)
```

### 13.4 Barnläge — mockup

**Det som fungerar (9/10):**

- NU stort med illustration
- NÄSTA synligt (övergångsstöd)
- En grön **✓ Klar!**-knapp
- Stjärnor diskret (⭐ 24) — motivation utan att dominera

**Justera:**

| Problem | Rekommendation |
|---------|----------------|
| Rutiner i barn-bottom nav | **Dölj** — barn planerar inte schema |
| Mer i bottom nav | **Dölj** — bryter mot distraktionsfrihet |
| Skatt + Stöd som separata flikar | Överväg **2 flikar:** Idag · Skatt (Stöd = del av Idag när teacch aktivt) |

**Målbild — barn-bottom nav (Basic):**

```
[ Idag ]  [ Skatt ]
```

**Med teacch:** samma — Extra stöd är innehåll på Idag, inte egen flik.

### 13.5 Extra stöd — mockup (barn)

**Det som fungerar (9/10):**

- Vertikal lista med De sju frågorna + ikoner
- Lugn blå palett — tydlig skillnad mot Basic
- En **✓ Klar!**-knapp
- Inga stjärnor/poäng i kontextlistan

**Största greppet:**

Extra stöd-skärmens *innehåll* är rätt — men det ska vara **hur NU-kortet ser ut** när `teacch` är aktivt, inte ett tredje läge med egen bottom nav.

```
Barn utan teacch:     NU + illustration + timer + Klar
Barn med teacch:      NU + sju frågor-lista + Klar  (samma skärm, lugnare ton)
```

**Målbild — NU med Extra stöd:**

```
[🔊]                                              NU — Borsta tänderna

📍 Var?     [🚿]  Badrummet          ← pictogram stort, text liten
👤 Vem?     [👤]  Själv
⏱ Hur länge?  [○○●●● timer-ring]
➡ Sen?    [🥣]  Frukost
🎒 Behöver? [🪥][🧴]
💡 Varför?  [😁]  För friska tänder

NÄSTA — Frukost

[ ✓ Klar! ]

(ingen bottom nav medan aktivitet pågår)
```

Dölj tomma rader. NÄSTA kvar för övergångsstöd. **Utan pictogram = ofullständig implementation** — inte godkänd för release.

### 13.9 Tillgänglighetsgranskning — icke-läsande barn (2026-06-17)

*Referens: mockup `paket-v1.2-nav.png` + extern granskning.*

**Det som fungerar:**

| Styrka | Varför |
|--------|--------|
| NU / NÄSTA-separation | Kronologisk sekvens utan läsning |
| Aktivitetsikoner (emoji/illustration) | Barn förstår rutiner utan text |
| Nedtonad stress i Extra stöd | Inga stjärnor/poäng i kontextvyn |
| En primär handling | ✓ Klar — inget valkaos |

**Kritiska luckor (åtgärdade i §7.5):**

| Problem i mockup/spec | Åtgärd |
|-----------------------|--------|
| Sju frågor = textvägg | Objekt-datamodell + pictogram per svar (§7.2) |
| "5 minuter" abstrakt | Visuell timer flyttad till v1.2 (§5.1) |
| Ingen uppläsning | `read_aloud` tillagt (§7.5) |
| Rutiner/Mer i barn-nav | Strikt Idag+Skatt; dölj nav under aktiv NU (§13.4) |

**Rekommenderad prioritering vid implementation:**

1. Pictogram-datamodell + barnvy-rendering (blockerande)
2. Visuell timer kopplad till `how_long` (blockerande)
3. Läs upp (hög prioritet — komplement till bildstöd)
4. `minimal_ui` (v1.3 — helbild + en knapp för mest utmanade barn)

### 13.6 Preview-skärm (ej i mockup — ska skissas)

För ej köpta paket i **föräldarläge**:

```
┌─────────────────────────────────────┐
│ Exempel — så här kan Utveckling     │
│ se ut                               │
│                                     │
│ [mockad dashboard, statisk data]    │
│                                     │
│ [ Köp Familj Rapportering ]         │
└─────────────────────────────────────┘
```

Samma mönster för Samarbete och Extra stöd (§9.3).

### 13.7 Mockup vs spec — checklista

| Mockup | Spec | Åtgärd |
|--------|------|--------|
| Idag som hub | ✅ | Behåll |
| För dig-modul | Modul i Idag | Lägg till under checklista |
| Inställningar-kort | Top-right | Flytta till header |
| Grid + bottom nav | En nav-väg | Förenkla Idag |
| Extra stöd = eget läge | Overlay på NU | Integrera innehåll |
| Preview / Köp nu | §9 | Skissa preview-skärmar |
| Barn: Rutiner, Mer | Minimal nav | Ta bort från barnläge |

### 13.8 Sammanfattande dom

| Del | Betyg | Beslut |
|-----|-------|--------|
| Föräldarläge (Idag-feed) | 8/10 | Behåll innehåll; förenkla nav |
| Barnläge | 9/10 | Nära målbild; minska flikar |
| Extra stöd-innehåll | 7/10 → 9/10 | Integrera i NU **med pictogram + timer + Läs upp** |
| Paketstrategi i UI | 7/10 | Lägg till preview-skärmar |
| Tillgänglighet icke-läsande | — | §7.5 + §14.1 — pictogram, timer, TTS, familjefoto |

---

## 14. Produktprinciper (oföränderliga regler)

*Konstitutionella regler — gäller alla versioner. När teamet växer är det dessa som avgör om produkten fortfarande känns sammanhållen om två år.*

| # | Princip |
|---|---------|
| **14.1** | **Barn ska kunna använda produkten utan att läsa** — pictogram, timer, TTS och familjefoto (`image_url`) är tillgänglighetslager, inte nice-to-have |
| **14.2** | **Varje funktion tillhör exakt ett paket** (eller För dig under Basic) |
| **14.3** | **Varje funktion har exakt en primär navigationsväg** (§6.6) |
| **14.4** | **Extra stöd är alltid ett lager ovanpå vardagen** — aldrig en separat app med egen nav |
| **14.5** | **Preview visar värde, inte funktionslistor** — mockad upplevelse med Köp nu |
| **14.6** | **Barn får aldrig fler än två navigationsval samtidigt** — Idag · Skatt; dölj nav under aktiv NU |
| **14.7** | **Ett paket = ett primärt problem** — inget feature creep utan problemkoppling (§0) |
| **14.8** | **Barnvy visar aldrig text utan visuellt stöd** — auto emoji-fallback minimum; familjefoto = rekommenderad nivå |
| **14.9** | **Gating på två nivåer** — komponent (paket) + feature (rollout) (§8.2) |
| **14.10** | **Samma preview-data överallt** — `preview-data.js`, aldrig familjens riktiga data (§9.6) |
| **14.11** | **Betalning endast i appen** — Apple (iOS) eller Google (Android); webb visar preview och hänvisar till appen (§9.7) |

### 14.12 AI-princip (framtidssäkring)

*Gäller all framtida AI-funktionalitet — byggs inte i v1.2, men beslutet tas nu för att undvika senare kaos.*

| Regel | Beskrivning |
|-------|-------------|
| **AI får föreslå** | Rutiner, schemaförändringar, rapporter, observationer, stödmaterial |
| **AI får aldrig automatiskt ändra** | Schema, rapporter, `seven_questions`, belöningar eller stödmaterial utan explicit godkännande från förälder |
| **AI-output är utkast** | Alltid preview + *Godkänn* / *Avvisa* — aldrig tyst skrivning till `activity_template`, `weekly_schedule` eller `daily_log` |
| **Barndata** | AI får inte tränas på familjens data utan separat samtycke (GDPR) |

Exempel på framtida features som omfattas: AI-rutiner · AI-förslag i För dig · AI-sammanfattade rapporter · AI-observationer.

### 14.13 Vägen till 10/10 — luckor täppta

| Dimension | Före | Nu |
|-----------|------|-----|
| Produktstrategi | 9.5 | **10** — §0 + §14.7 ✅ |
| Informationsarkitektur | 9 | **10** — §6.6 ✅ |
| Tillgänglighet | 9 | **10** — §7.2 + §14.8 ✅ |
| Implementerbarhet | 8.5 | **10** — §7.2 + §8.2 ✅ |
| Monetisering | 9 | **10** — §9.5 ✅ |
| Styrning & uppföljning | — | **10** — §15 + §14.12 ✅ |

---

## 15. Success metrics

*Specen definierar vad produkten är, hur den fungerar och hur den säljs. Detta avsnitt definierar **hur vi vet att den fungerar**.*

### 15.1 North Star Metric

**Primär NSM (v1.2):**

> **Antal genomförda aktiviteter per barn och vecka**

Mäter kärnvärdet: barnet genomför rutiner, föräldern ser framsteg, produkten används i vardagen.

**Stödjande retention-metric:**

> **Andel familjer aktiva ≥ 3 dagar/vecka**

Mäter vanemönster och churn-risk. Använd som komplement — inte som primärt optimeringsmål om det konkurrerar med djup användning (kvalitet före frekvens).

### 15.2 KPI per paket

| Paket | KPI | Mätdefinition | Mål (initialt) |
|-------|-----|---------------|----------------|
| **Basic** | Aktiv rutin | % familjer med ≥1 avklarad aktivitet/dag i 30 dagar efter onboarding | Baseline → +10% efter 90 dagar |
| **Basic** | För dig-engagemang | % familjer som klickar För dig-modulen ≥1 gång/vecka | ≥25% av aktiva |
| **Rapportering** | Rapportanvändning | Antal skapade/exporterade rapporter per familj och månad | ≥1/månad bland köpare |
| **Pedagog** | Aktiva relationer | Antal familjer med ≥1 accepterad pedagoginbjudan + aktiv inom 30 dagar | Baseline efter lansering |
| **Extra stöd** | Sju frågor-täckning | % schemalagda aktiviteter med ≥3 ifyllda `seven_questions`-fält (inkl. pictogram) | ≥60% bland teacch-köpare |
| **Extra stöd** | Visuellt stöd | % svar med `image_url` eller `icon_key` (ej enbart auto-fallback) | ≥40% inom 60 dagar |
| **Monetisering** | Konvertering preview → köp | % familjer som köper efter kontextuell trigger (§9.5) |
| **Intressefas** | Registrerat intresse | Antal familjer per komponent i `package_interest` (§9.8) |
| **Intressefas** | Intresse-rate | % aktiva familjer med ≥1 intresse / paket | Baseline → A/B-test |
| **Tillgänglighet** | Läs upp-användning | % NU-sessioner med teacch där `read_aloud` används | Baseline (valfritt) |

### 15.3 Datainsamling

Befintlig infrastruktur: `analytics_events` (anonymiserat, `family_id` UUID) + `analytics_daily_snapshots`.

| Event (exempel) | `event_type` | `metadata` |
|-----------------|--------------|------------|
| Aktivitet avklarad | `activity_completed` | `{ child_id_hash, source: 'child'|'parent' }` |
| Rapport exporterad | `report_exported` | `{ format: 'pdf' }` |
| Pedagog kopplad | `pedagog_linked` | `{ invite_accepted: true }` |
| Sju frågor visad | `seven_questions_shown` | `{ fields_filled: 3 }` |
| Preview → köp | `upgrade_from_preview` | `{ paket: 'reporting' }` |
| Intresse registrerat | `interest_registered` | `{ paket: 'reporting', source: 'bottom_nav_preview' }` |
| Kontextuell trigger | `upgrade_trigger_shown` | `{ trigger: '14_day_reporting' }` |

**Regel:** KPI:er beräknas i midnight-scheduler till `analytics_daily_snapshots` — inte ad hoc i produktionsqueries.

### 15.4 Granskningsrytm

| Intervall | Aktivitet |
|-----------|-----------|
| Veckovis | NSM + aktiva familjer (internt dashboard) |
| Månadsvis | KPI per paket — beslut om iteration |
| Per release | Acceptanskriterier §11 + relevanta KPI:er gröna innan "klar" |

---

## 16. Implementationsplan

*Hur v1.2 byggs i kod — kopplar spec, designmockups och befintlig kodbas.*

### 16.1 Nuläge vs mål

| Område | Finns idag | v1.2 mål |
|--------|------------|----------|
| `family_subscriptions` + `has_component()` | ✅ | + `pedagog`, `teacch` i register |
| `requireComponent()` | ✅ | Använd på alla paket-gatade routes; `lifetime_free` = endast `basic_app` |
| `requireFeature()` + `hasAccess()` | ✅ | Koppla till komponenter via `component-feature-map` (§8.2) |
| Föräldernav | Hem · Schema · För dig · Skatt · Mer | Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd (§6) |
| Barnnav | 4 flikar | Idag · Skatt; dölj under aktiv NU med teacch (§7.5) |
| Betalning | RevenueCat IAP (iOS/Android), ej webb | Fyra paket via IAP; webb = preview only (§9.7) |
| `visual_timer` | ✅ på `child` | Paketerat under teacch i Extra stöd-NU |
| Rapporter | `requireFeature('klinisk_rapportering')` | + `requireComponent('reporting')` + preview |
| De sju frågorna | — | Migration, API, bibliotek, barnvy (§7) |
| Preview-register | — | `config/preview-data.js` (§9.6) |

**Kritisk insikt:** Två gating-system (`requireComponent` vs `requireFeature`) pratar inte ihop idag. **Fas 0** måste länka dem innan UI byggs.

### 16.2 Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend                                                     │
│  native-tab-bar.js · preview-shell.js · child-seven-       │
│  questions.js · iap-manager.js · features-cache.js            │
└──────────────────────────┬──────────────────────────────────┘
                           │ GET /api/subscription/access
┌──────────────────────────▼──────────────────────────────────┐
│ Backend                                                      │
│  package-access.js · requireComponent() · requireFeature()    │
│  family_subscriptions · features / family_features          │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/iap/webhook
┌──────────────────────────▼──────────────────────────────────┐
│ RevenueCat → App Store (iOS) / Play Billing (Android)        │
└─────────────────────────────────────────────────────────────┘

Config: subscription-components.js · component-feature-map.js
        preview-data.js · seven-questions-pictograms.js
```

**Regel:** `hasComponent('teacch')` = familjen har köpt paketet. `hasFeature('de_sju_fragorna')` = feature rollout inom paketet. Klienten hämtar **båda** från ett API.

### 16.3 Fas 0 — Fundament (backend, inget synligt UI)

| # | Leverans | Filer |
|---|----------|-------|
| 0.0 | Rollout-läge `off` som default + admin-flaggor | `feature_flag` seed, `src/lib/package-access.js` |
| 0.1 | `pedagog` + `teacch` i paketregister | `config/subscription-components.js` |
| 0.2 | Feature → komponent-mapping | `config/component-feature-map.js` *(ny)* |
| 0.3 | Enhetlig access-modul | `src/lib/package-access.js` *(ny)* |
| 0.4 | Uppdatera `hasAccess()` — komponent krävs för icke-CORE features | `db/features.js` |
| 0.5 | Fixa `lifetime_free` — ge `basic_app`, inte alla paket | `src/middleware/require-component.js` |
| 0.6 | API för klient | `GET /api/subscription/access` *(ny route)* |

```javascript
// GET /api/subscription/access — svar
{
  rollout_mode: 'off',   // 'off' | 'interest' | 'purchase' — default 'off'
  show_prices: false,
  purchase_enabled: false,
  components: { basic_app: true, reporting: false, pedagog: false, teacch: false },
  features:   { de_sju_fragorna: false, read_aloud: false, klinisk_rapportering: false, … },
  preview:    { reporting: false, pedagog: false, teacch: false }  // true endast när rollout_mode !== 'off'
}
```

**Tester:** `test/package-access.test.js` — komponent + feature + lifetime_free.

**Exit-kriterium:** Admin kan tilldela komponent → rätt features togglas; API returnerar konsekvent state.

### 16.4 Fas 1 — Preview + intresse (eller köp)

| # | Leverans | Filer |
|---|----------|-------|
| 1.1 | Central mock-data | `config/preview-data.js` |
| 1.2 | Preview-shell (banner, vattenstämpel, CTA växling) | `public/js/preview-shell.js`, `public/css/preview-shell.css` |
| 1.3 | `/upgrade` — fyra löfteskort (§9.1) | `public/upgrade.html` |
| 1.4 | **Intressefas:** `POST /api/subscription/interest` + `package_interest` | `src/routes/subscription.js`, migration |
| 1.5 | CTA: *Jag är intresserad* när `rollout_mode=interest` | `preview-shell.js` |
| 1.6 | **Köp-live:** Native Köp nu → RevenueCat | `public/js/iap-manager.js` |
| 1.7 | Webb Köp nu → öppna appen (§9.7) | `preview-shell.js` |
| 1.8 | Webhook → `family_subscriptions.components` | `src/routes/iap.js` |
| 1.9 | Admin: paketintresse-vy | `public/admin/` |

**Exit-kriterium (intressefas):** Alla familjer ser mock för reporting/pedagog/teacch; klick loggas; ingen IAP; ingen write.

**Exit-kriterium (köp-live):** `PACKAGES_ROLLOUT_MODE=purchase` → Köp nu + sandbox-köp aktiverar komponent.

### 16.5 Fas 2 — Navigation

#### Förälder — `native-tab-bar.js`

| Nu | v1.2 | Route |
|----|------|-------|
| Hem | **Idag** | `/dashboard` |
| Schema | **Rutiner** | `/schedule`, `/library` |
| För dig | *(modul i Idag)* | `/dashboard#fordig` |
| Skatt | *(in i Barn/Stöd)* | — |
| Mer | **Inställningar** | top-right ⚙️ → `/settings` |
| *(ny)* | **Utveckling** | `/reports` (preview om ej köpt) |
| *(ny)* | **Samarbete** | pedagog-hub *(ny eller befintliga sidor)* |
| *(ny)* | **Barn/Stöd** | hub: barnvy-genväg + Extra stöd |

**Filer:** `public/js/native-tab-bar.js`, `public/js/parent-magic-shell.js`, `public/js/dashboard-home-hub.js` (För dig-modul), `public/css/parent-bottom-nav.css`.

**Redirects:** `/for-dig` → `/dashboard#fordig` (bokmärken).

#### Barn — `child-dashboard.html`

| Nu | v1.2 |
|----|------|
| Idag · Schema · Skatt · Mer | **Idag · Skatt** |
| Nav alltid synlig | Dölj nav under aktiv NU + teacch |

**Filer:** `public/child-dashboard.html`, `public/js/child-dashboard.js`, `public/css/child-bottom-nav.css`.

**Exit-kriterium:** 5 flikar förälder; För dig inte i nav; barn max 2 flikar; gamla URL:er redirectar.

### 16.6 Fas 3 — Extra stöd (teacch)

Bygg i denna ordning:

| # | Leverans | Filer |
|---|----------|-------|
| 3.1 | Migration `seven_questions JSONB` | `migrations/` |
| 3.2 | `normalizeSevenQuestions()`, `QUESTION_ORDER` | `src/lib/seven-questions.js` *(ny)* |
| 3.3 | Pictogram-bibliotek (~40 st) | `config/seven-questions-pictograms.js` *(ny)* |
| 3.4 | API: activities + pictograms + daily-log enrich | `src/routes/activities.js`, `src/lib/schemas.js` |
| 3.5 | Förälder: redigering i bibliotek | `public/js/library.js` |
| 3.6 | Barnvy: NU-kort med sju frågor | `public/js/child-seven-questions.js` *(ny)* |
| 3.7 | Visuell timer kopplad till `how_long` | återanvänd `initTimeTimers()` i `child-dashboard.js` |
| 3.8 | Läs upp (TTS) — dölj om ej tillgänglig | `public/js/child-read-aloud.js` *(ny)* |
| 3.9 | Feature-seed | `scripts/seed-features.js` |

**Gating:** `requireComponent('teacch')` på write; read i barnvy om komponent finns.

**Designreferens:** `docs/mockups/paket-v1.2-nav.png` panel 3 · `docs/mockups/barnvy.html` · §13.5.

**Exit-kriterium:** Barn ser pictogram (aldrig text-only); timer vid `how_long`; högtalare om TTS finns; ingen bottom nav under aktivitet.

### 16.7 Fas 4 — Analytics & triggers

| # | Leverans | Var |
|---|----------|-----|
| 4.1 | `activity_completed` — standardisera metadata | befintliga completion-flöden |
| 4.2 | `seven_questions_shown` | `child-seven-questions.js` |
| 4.3 | `upgrade_from_preview` | `preview-shell.js` |
| 4.4 | `upgrade_trigger_shown` | kontextuella banners (§9.5) |
| 4.5 | Midnight snapshot — NSM | befintlig scheduler |

**Kontextuella triggers (§9.5):**

| Paket | Trigger | Hook |
|-------|---------|------|
| Rapportering | ≥14 dagar aktivitetsdata | midnight scheduler |
| Pedagog | pedagoginbjudan | `pedagog_invite` routes |
| Extra stöd | redigera aktivitet / sju frågor | `library.js` |

### 16.8 Fas 5 — IAP-produkter (§9.7)

| # | Leverans |
|---|----------|
| 5.1 | Produkt-ID per paket i App Store Connect + Play Console |
| 5.2 | RevenueCat offerings/packages mappade till `basic_app`, `reporting`, `pedagog`, `teacch` |
| 5.3 | Webhook uppdaterar `family_subscriptions.components[]` med `component` + `expires_at` |
| 5.4 | Sandbox-test iOS + Android |
| 5.5 | App Review — inga webb-betalningstexter i native |

**Målbild RevenueCat:**

```
Offering "v1.2"
  ├── package_basic      → basic_app
  ├── package_reporting  → reporting
  ├── package_pedagog    → pedagog
  └── package_teacch     → teacch
```

Kombinerbara köp = flera packages i samma offering (produktbeslut).

### 16.9 Epics — PR-uppdelning

| Epic | Fas | Beskrivning | Beror på |
|------|-----|-------------|----------|
| **E1** | 0 | package-access + API | — |
| **E2** | 1 | preview-data + preview-shell + intresse-CTA | E1 |
| **E3** | 1 | `/upgrade` 4-paket + interest API | E1, E2 |
| **E3b** | 5 | IAP-köp native (efter intressefas) | E3, admin-beslut |
| **E4** | 2 | Nav förälder (native-tab-bar) | E2 |
| **E5** | 2 | Nav barn (2 flikar, dölj vid NU) | — |
| **E6** | 3 | seven_questions migration + lib | E1 |
| **E7** | 3 | library editor + pictograms | E6 |
| **E8** | 3 | child-seven-questions UI | E6, E7 |
| **E9** | 3 | read_aloud + timer teacch | E8 |
| **E10** | 4 | analytics + triggers | E2, E3 |
| **E11** | 5 | IAP produkter + webhook components | E3 |

**Rekommenderad start:** E1 → E2 → E4 → E10 för **smoke test** (§9.8 minimal path). Full v1.2 enligt §16 parallellt eller efter intressedata.

### 16.10 Visuell implementation

| Yta | Profil | Referens |
|-----|--------|----------|
| Förälder | Ljus bakgrund `#F0F4FF`, navy header, gold accenter | `docs/mockups/foraldra.html` |
| Barn | Mörk `#0F1629`, gold NU, stjärnhimmel | `docs/mockups/barnvy.html` |
| Extra stöd | Pictogram större än text, grön Klar, ingen nav under aktivitet | `docs/mockups/paket-v1.2-nav.png` |
| Preview | Fade + vattenstämpel + gold Köp nu | §9.3, panel 4 i mockup |

**Typsnitt:** Outfit (rubriker) · Plus Jakarta Sans (brödtext).  
**Vid konflikt:** HTML-mockups > design-affisch > improvisation.

### 16.11 Risker

| Risk | Åtgärd |
|------|--------|
| `lifetime_free` fail-open (alla paket) | Explicit `basic_app` only i Fas 0.5 |
| `hasAccess` ignorerar komponenter | `package-access.js` bridge i Fas 0 |
| `child-dashboard.js` växer okontrollerat | All Extra stöd-UI i egna filer (§16.6) |
| Nav bryts på Capacitor iOS/Android | Testa `native-tab-bar.js` på riktiga enheter |
| App Review avvisar webb-betalningstext | §9.7 checklista före submit |
| IAP webhook synkar fel komponent | Idempotent webhook + logg i `iap.js` |

### 16.12 Medvetet inte i v1.2

| Postponerat | Version |
|-------------|---------|
| `minimal_ui` (helbild + en knapp) | v1.3 |
| `transition_support`, `social_stories` | v1.3+ |
| Stripe / webb-checkout | Aldrig (§9.7) |
| AI-rutiner / AI-rapporter | Framtid (§14.12) |

---

*Spec v1.2 Paket — **implementationsklar**. Produktprinciper §14, success metrics §15 och implementationsplan §16 gäller oförändrat över versioner.*
