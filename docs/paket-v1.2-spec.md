# Paket — Spec v1.2

**Skapad:** 2026-06-17  
**Uppdaterad:** 2026-06-17 (paketidentitet + UI/UX-löften)  
**Status:** ✅ **Approved for implementation (v1.2)**  
**Produktversion:** v1.2 = **Paket**  
**Teknisk grund:** `family_subscriptions.components` JSONB + `has_component()` + `requireComponent()`

---

## 0. Vad v1.2 är

**Produktversion v1.2 heter Paket** — den kommersiella och tekniska uppdelningen i modulära tillägg ovanpå en gemensam grund.

| Begrepp | Betydelse |
|---------|-----------|
| **v1.2 Paket** | Hela paketmodellen — denna spec |
| **Basic, Rapportering, Pedagog, Extra stöd** | De fyra paketen *inom* v1.2 |
| **Komponent-slug** | `basic_app`, `reporting`, `pedagog`, `teacch` |
| **Feature slug** | Operativ flagga i `features` / `family_features` |

### 0.1 Produktstrategi — varje paket äger ett område

Om målet är att sälja fyra separata paket ska varje paket kännas som **ett eget löfte till familjen**, inte bara en samling funktioner. UI/UX bör förstärka paketens identitet.

| Paket | Äger | Guidande fråga |
|-------|------|----------------|
| **Basic** | Motivation & vardagsrutiner | *Hjälper vardagen att fungera?* |
| **Rapportering** | Insikter & dokumentation | *Förstår vi mönster över tid?* |
| **Pedagog** | Samarbete mellan vuxna | *Delar alla vuxna samma bild?* |
| **Extra stöd** | Förutsägbarhet & struktur | *Minskar det stress och osäkerhet?* |

**Beslutregel vid nya funktioner:** *Vilket problem löser den?* — svaret ska nästan automatiskt peka på **ett** paket. Då hålls produkt, prissättning och UI konsekvent över tid.

### 0.2 Teknisk modell

```
family_subscriptions.components = [
  { component: 'basic_app', ... },
  { component: 'reporting', ... },
  { component: 'pedagog', ... },
  { component: 'teacch', ... }
]
```

Middleware: `requireComponent()` — `src/middleware/require-component.js`.  
Config: `config/subscription-components.js`.

---

## 1. Paket 1 — Basic

| | |
|--|--|
| **Löfte** | Hjälper familjen att få vardagen att fungera |
| **Målgrupp** | Alla familjer |
| **Komponent** | `basic_app` |
| **Pris (indikativt)** | ~59 SEK/mån |
| **Status** | ✅ Live |

### 1.1 Innehåll

| Funktion | Feature slug |
|----------|--------------|
| Flera barn | `barninloggning` |
| Veckoschema | `veckoschema` |
| Aktiviteter & delsteg | `aktivitetsbibliotek` |
| Stjärnor & daglogg | `daglogg`, `manuella_stjarnor` |
| Belöningar / Skattkammaren | `beloningssystem`, `skattkammar_universum` |
| Kalender & specialdagar | `kalender`, `specialdagar` |
| Push | `push_notiser` |
| Familjeinbjudan | `familjeinbjudan` |
| Onboarding | `onboarding` |

### 1.2 UI/UX-identitet

Basic ska kännas:

| Egenskap | Uttryck |
|----------|---------|
| **Varm** | Mjuka former, välkomnande copy |
| **Lekfull** | Emoji, stjärnor, illustrationer |
| **Enkel** | Få val per skärm, tydlig hierarki |
| **Motiverande** | Framsteg synligt, positiv förstärkning |

**Visuell ton:** färger · illustrationer · stjärnor · framsteg  
**Fokus:** motivation och rutiner

### 1.3 Wireframe — förälder (Idag)

```
Idag

Anna
✓ Borsta tänderna
✓ Klä på sig
○ Läxor

+2 stjärnor idag

Nästa aktivitet:
Fotbollsträning
```

### 1.4 Wireframe — barn

```
⭐ 24 stjärnor

NU
Borsta tänderna

[ Starta ]
```

---

## 2. Paket 2 — Familj Rapportering

| | |
|--|--|
| **Löfte** | Förstå mönster och dela utveckling |
| **Målgrupp** | Familjer som samarbetar med skola/vård eller vill följa utveckling över tid |
| **Komponent** | `reporting` |
| **Pris (indikativt)** | ~19 SEK/mån (TBD) |
| **Status** | ⚙️ Feature finns; betalning ej aktiverad |

### 2.1 Innehåll

| Funktion | Feature slug |
|----------|--------------|
| Klinisk rapportering | `klinisk_rapportering` |
| Observationer & historik | (del av klinisk_rapportering) |
| Export & PDF | (del av klinisk_rapportering) |
| Delningslänkar | (del av klinisk_rapportering) |

### 2.2 UI/UX-identitet

Mer **professionellt** än Basic. Mindre lekfullt. Mer **dataorienterat**.

| Egenskap | Uttryck |
|----------|---------|
| **Ny huvudsektion** | *Rapporter* (egen nav/flik när paketet är aktivt) |
| **Visuell ton** | diagram · statistik · sammanfattningar |
| **Fokus** | insikter |

**Skillnad mot Basic:** inga stjärn-animationer i rapportvy; neutral palett; tabeller och trender.

### 2.3 Wireframe — dashboard

```
Rapporter
Dashboard
Senaste 30 dagarna

Närvaro: 92%

Genomförda aktiviteter:  +12%
Belöningar:              34
Svåra övergångar:        5
```

### 2.4 Wireframe — export

```
Generera rapport

Period:
[ Senaste månaden ]

Innehåll:
✓ Schema
✓ Daglogg
✓ Observationer

[ Skapa PDF ]
```

### 2.5 Gating

- API: `requireComponent('reporting')`
- UI: `/reports` + `data-feature="klinisk_rapportering"`

---

## 3. Paket 3 — Familj Pedagog

| | |
|--|--|
| **Löfte** | Samarbete mellan familj och pedagog |
| **Målgrupp** | Familjer med resurspedagog, specialpedagog, elevassistent eller kontaktperson |
| **Komponent** | `pedagog` |
| **Pris (indikativt)** | TBD |
| **Status** | ⚙️ Features finns; komponent ej i config |

### 3.1 Innehåll

| Funktion | Feature slug / kod |
|----------|-------------------|
| Pedagoginbjudan | `pedagog_invite` |
| Pedagogroll | `parent_child.role = pedagog` |
| Anteckningar | `pedagoganteckningar` |
| Pedagogöversikt | pedagog-vy |
| Begränsad åtkomst | read-only schema + logg |

### 3.2 UI/UX-identitet

**Samarbetsverktyg** — inte rapportverktyg (det är Rapportering).

| Egenskap | Uttryck |
|----------|---------|
| **Ny sektion** | *Samarbete* |
| **Visuell ton** | professionell · trygg · samarbete |
| **Fokus** | samma information till alla vuxna runt barnet |

**Pedagogvy — ingen åtkomst till:** betalning · familjeinställningar · belöningar

### 3.3 Wireframe — samarbete

```
Samarbete
Pedagogkort
Aktiva pedagoger

Emma Larsson
Specialpedagog

Senast aktiv: Idag

Anteckningar
15 juni
Övergång till lunch gick bättre idag.

[ Kommentera ]
```

### 3.4 Wireframe — pedagogvy

```
Schema
Daglogg
Anteckningar

(ingen åtkomst till betalning, inställningar, belöningar)
```

### 3.5 Gating

- `requireComponent('pedagog')` på pedagogroutes
- Inbjudan skapas endast om familjen har paketet

---

## 4. Paket 4 — Familj Extra stöd

| | |
|--|--|
| **Löfte** | Mer förutsägbarhet. Mindre stress. |
| **Målgrupp** | Barn som gynnas av visuellt stöd, tydliga övergångar och extra struktur |
| **Komponent** | `teacch` |
| **Pris (indikativt)** | TBD |
| **Status** | 📋 Spec klar — troligen det **mest emotionella** paketet |

> **Formulering:** Inspirerad av TEACCH, visuellt stöd och strukturerad pedagogik — **inte** en officiell TEACCH-metod.

### 4.1 Innehåll per version

| Funktion | Version | Feature slug |
|----------|---------|--------------|
| **De sju frågorna** | v1.2 | `de_sju_fragorna` |
| Distraktionsfri barnvy | v1.3+ | `minimal_ui` |
| Övergångsstöd | v1.3+ | (ny) |
| Visuella nedräkningar | v1.3+ | (ny) |
| Förberedelsekort | v1.3+ | (ny) |
| Sociala berättelser | v1.3+ | (ny) |

### 4.2 UI/UX-identitet

**Mycket lugnare än Basic.** Ingen visuell stress. Ingen överflödig information.

| Basic (motivation) | Extra stöd (förutsägbarhet) |
|--------------------|------------------------------|
| ⭐ Stjärnor | — |
| 🎉 Belöningar | — |
| 🎁 Skattkammare | — |
| Färgstark, lekfull | Dämpad, strukturerad |
| Många UI-element | Ett fokus: NU + kontext |

**Visuell ton:** lugn · förutsägbar · tydlig · minimalt  
**Fokus:** vad händer nu, var, med vem, vad händer sen

### 4.3 Wireframe — barnvy med De sju frågorna (v1.2)

```
NU
Borsta tänderna

📍 Var?
   Badrummet

👤 Med vem?
   Själv

⏱ Hur länge?
   5 minuter

➡ Vad händer sen?
   Frukost

[ Klar ]
```

Alternativ kompakt kontext (utan expand):

```
NU
Borsta tänderna

Var?           Badrummet
Med vem?       Mamma
Vad händer sen? Frukost

[ Klar ]
```

### 4.4 Wireframe — distraktionsfri vy (v1.3+)

```
NU
Borsta tänderna

[ Klar ]

(inga menyer · inga stjärnor · inga poäng · inga sidfunktioner)
```

### 4.5 Gating

- `requireComponent('teacch')` + feature flags per funktion
- Dogfood: `family_features` utan betalning

---

## 5. Uppgraderingssidan — fyra paketkort

På `/upgrade` (eller motsvarande) visas **fyra tydliga kort** — varje kort = ett löfte, inte en funktionslista i första hand.

```
┌─────────────────────┐  ┌─────────────────────┐
│ Basic               │  │ Familj Rapportering │
│ Vardagens           │  │ Följ utveckling     │
│ grundfunktioner     │  │ över tid            │
│                     │  │                     │
│ ✓ Schema            │  │ ✓ Rapporter         │
│ ✓ Belöningar        │  │ ✓ Historik          │
│ ✓ Aktiviteter       │  │ ✓ PDF-export        │
│ ✓ Flera barn        │  │ ✓ Delningslänkar    │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│ Familj Pedagog      │  │ Familj Extra stöd   │
│ Samarbeta med       │  │ Ökad                │
│ pedagoger           │  │ förutsägbarhet      │
│                     │  │                     │
│ ✓ Pedagoginbjudan   │  │ ✓ De sju frågorna   │
│ ✓ Anteckningar      │  │ ✓ Distraktionsfri vy│
│ ✓ Delad översikt    │  │ ✓ Visuellt stöd     │
│ ✓ Begränsad åtkomst │  │ ✓ Övergångsstöd     │
└─────────────────────┘  └─────────────────────┘
```

**Copy-princip per kort:** rubrik = löfte · underrubrik = målgruppsnytta · checklista = bevis.

**Beteende:**

| Situation | UI |
|-----------|-----|
| Familj har Basic | Basic markerat "Ingår" · övriga "Lägg till" |
| Kombinationer | Visa totalpris · inget "allt eller inget" |
| lifetime_free | Basic alltid aktiv · tillägg separat |

---

## 6. De sju frågorna — detaljspec (Extra stöd, v1.2 P0)

### 6.1 Ramverket

| # | Fråga | Fältnyckel |
|---|-------|------------|
| 1 | Vad ska jag göra? | `what` |
| 2 | Var ska jag vara? | `where` |
| 3 | Vem ska jag vara med? | `who` |
| 4 | Hur länge ska det hålla på? | `how_long` |
| 5 | Vad ska hända sen? | `what_next` |
| 6 | Vad behöver jag ha? | `what_need` |
| 7 | Varför ska jag göra det? | `why` |

| | Delsteg (Basic) | De sju frågorna (Extra stöd) |
|--|-----------------|-------------------------------|
| Svarar på | Hur gör jag? | Vad innebär situationen? |
| Ton | Motiverande | Lugn, informativ |

**Dölj tomma fält.** Kortare svar i barnvy. En primär handling: **Klar**.

### 6.2 NU-kort prioritet (barn)

```
1. Aktivitetsnamn
2. Delsteg (Basic — om aktivt)
3. De sju frågorna (Extra stöd — om aktivt)
4. Klar-knapp
```

NÄSTA-kort synligt hela tiden (övergångsstöd). Panel dold på klara aktiviteter.

### 6.3 Förälder — bibliotek

Progressive disclosure i aktivitetsmodal:

```
▼ Delsteg
▼ De sju frågorna
▼ Avancerat
```

### 6.4 Datamodell

```sql
ALTER TABLE activity_template
  ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

### 6.5 Tekniska krav

**`QUESTION_ORDER`:**

```javascript
const QUESTION_ORDER = [
  'what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why',
];
```

**`normalizeSevenQuestions(input)`** — trimma, ta bort tomma, ignorera okända nycklar, max 500 tecken.

### 6.6 API (inga nya endpoints)

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET/POST/PUT | `/api/activities` | `seven_questions` |
| GET | `/api/children/me/daily-log` | Berika från `activity_template` |

---

## 7. config/subscription-components.js (målbild)

```javascript
const STRIPE_COMPONENT_MAP = {
  basic_app:  { name: 'Basic',               price_monthly_sek: 59 },
  reporting:  { name: 'Familj Rapportering',  price_monthly_sek: 19 },
  pedagog:    { name: 'Familj Pedagog',       price_monthly_sek: null },
  teacch:     { name: 'Familj Extra stöd',   price_monthly_sek: null },
};
```

---

## 8. Rollout v1.2

| Steg | Leverans |
|------|----------|
| 1 | Paketspec med UI/UX-identitet ✅ |
| 2 | `pedagog` + `teacch` i config |
| 3 | Uppgraderingssida — fyra paketkort |
| 4 | De sju frågorna (Extra stöd P0) |
| 5 | Paket-specifik nav/sektioner (Rapporter, Samarbete) — iterativt |
| 6 | Betalning (`STRIPE_ENABLED`) separat |

---

## 9. Acceptanskriterier

### Paketmodell & identitet

- [ ] Varje paket har dokumenterat löfte, målgrupp och visuell ton
- [ ] Nya funktioner mappas till ett paket via beslutregeln (§0.1)
- [ ] Uppgraderingssida visar fyra löfteskort (§5)
- [ ] Fyra komponenter i `subscription-components.js`

### Extra stöd P0 (De sju frågorna)

- [ ] Lugnare barnvy-ton än Basic — inga stjärnor i kontextpanelen
- [ ] `seven_questions` + normalisering + gating på `teacch`
- [ ] Endast ifyllda frågor visas

---

## 10. Beslut

| # | Beslut |
|---|--------|
| A | v1.2 = Paket — fyra löften, inte fyra funktionslistor |
| B | Varje paket äger ett produktområde (§0.1) |
| C | UI/UX ska förstärka paketidentitet — olika ton per paket |
| D | Extra stöd = lugnast; Basic = varmast/lekfullast |
| E | De sju frågorna = v1.2 inom Extra stöd; minimal_ui = v1.3+ |
| F | Uppgraderingssida = fyra kort med löfte + checklista |

---

*Spec v1.2 Paket — godkänd för implementation.*
