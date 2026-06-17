# Paket — Spec v1.2

**Skapad:** 2026-06-17  
**Uppdaterad:** 2026-06-17 (paketregister + För dig under Basic)  
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

**Beslutregel vid nya funktioner:** *Vilket problem löser den?* → ska peka på **ett** paket (eller För dig under Basic).

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

| Funktion | Feature slug |
|----------|--------------|
| **De sju frågorna** | `de_sju_fragorna` |

Frågor: Vad? · Var? · Vem? · Hur länge? · Vad händer sen? · Vad behöver jag? · Varför?

### 5.2 Innehåll v1.3+

| Funktion | Feature slug |
|----------|--------------|
| Distraktionsfri barnvy | `minimal_ui` |
| Visuella timrar | `visual_timer` *(delvis i barnvy idag — paketeras under teacch)* |
| Övergångsstöd | `transition_support` *(planerad)* |
| Sociala berättelser | `social_stories` *(planerad)* |

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
NU — Borsta tänderna
📍 Var? Badrummet
👤 Med vem? Själv
⏱ Hur länge? 5 minuter
➡ Vad händer sen? Frukost
[ Klar ]
```

**Wireframe — distraktionsfri (v1.3+):**

```
NU — Borsta tänderna
[ Klar ]
(inga menyer · inga stjärnor · inga sidfunktioner)
```

### 5.4 Gating

`requireComponent('teacch')` + per-feature flags

---

## 6. De sju frågorna — detaljspec (Extra stöd v1.2)

### 6.1 Ramverk & fältnycklar

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

### 6.2 Datamodell & API

```sql
ALTER TABLE activity_template
  ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET/POST/PUT | `/api/activities` | `seven_questions` |
| GET | `/api/children/me/daily-log` | Berika från `activity_template` |

### 6.3 Tekniska krav

```javascript
const QUESTION_ORDER = [
  'what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why',
];
```

`normalizeSevenQuestions(input)` — trimma, ta bort tomma, ignorera okända nycklar, max 500 tecken.

### 6.4 Barnvy — NU-kort

```
1. Aktivitetsnamn
2. Delsteg (Basic, om aktivt)
3. De sju frågorna (Extra stöd, om aktivt)
4. Klar
```

NÄSTA-kort synligt (övergångsstöd). Redigering i biblioteket (progressive disclosure).

---

## 7. Tekniskt paketregister

Målbild för `config/subscription-components.js`:

```javascript
const STRIPE_COMPONENT_MAP = {
  basic_app: {
    name: 'Basic',
    price_monthly_sek: 59,
  },
  reporting: {
    name: 'Familj Rapportering',
    price_monthly_sek: 19,
  },
  pedagog: {
    name: 'Familj Pedagog',
    price_monthly_sek: null,
  },
  teacch: {
    name: 'Familj Extra stöd',
    price_monthly_sek: null,
  },
};
```

`STRIPE_ENABLED=false` tills betalning aktiveras. Middleware: `requireComponent()` i `src/middleware/require-component.js`.

### 7.1 Feature-slug → komponent (register)

| Komponent | Feature slugs |
|-----------|---------------|
| `basic_app` | `for_dig`, `veckoschema`, `specialdagar`, `kalender`, `aktivitetsbibliotek`, `daglogg`, `manuella_stjarnor`, `beloningssystem`, `skattkammar_universum`, `familjeinbjudan`, `barninloggning`, `push_notiser`, `onboarding` |
| `reporting` | `klinisk_rapportering` |
| `pedagog` | `pedagog_invite`, `pedagoganteckningar`, `pedagog_dashboard` |
| `teacch` | `de_sju_fragorna`, `minimal_ui`, `visual_timer`, `transition_support`, `social_stories` |

*(Planerade slugs i kursiv logik: `pedagog_dashboard`, `transition_support`, `social_stories` — lägg till i `seed-features.js` vid implementation.)*

---

## 8. Uppgraderingssidan

Fyra löfteskort — rubrik = nytta, inte funktionsdump:

| Kort | Rubrik | Checklista (kort) |
|------|--------|-------------------|
| Basic | Vardagens grundfunktioner | Schema · Belöningar · För dig · Flera barn |
| Rapportering | Följ utveckling över tid | Rapporter · Historik · PDF · Delningslänkar |
| Pedagog | Samarbeta med pedagoger | Inbjudan · Anteckningar · Delad översikt |
| Extra stöd | Ökad förutsägbarhet | De sju frågorna · Visuellt stöd · Övergångsstöd |

Basic markerat *Ingår* för nya användare. Tillägg kombinerbara.

---

## 9. Rollout v1.2

| Steg | Leverans |
|------|----------|
| 1 | Paketspec + register (denna fil) ✅ |
| 2 | `pedagog` + `teacch` i `subscription-components.js` |
| 3 | Feature → komponent-mapping i gating |
| 4 | Uppgraderingssida — fyra kort |
| 5 | De sju frågorna (Extra stöd P0) |
| 6 | Betalning separat |

---

## 10. Acceptanskriterier

- [ ] Fyra paket med löfte, komponent, feature-register
- [ ] För dig dokumenterat under Basic — inte femte paket
- [ ] `pedagog_dashboard`, `transition_support`, `social_stories` planerade under rätt paket
- [ ] De sju frågorna: datamodell + lugn barnvy-ton + `teacch`-gating
- [ ] Uppgraderingssida enligt §8

---

## 11. Beslut

| # | Beslut |
|---|--------|
| A | v1.2 = Paket — fyra säljbara moduler |
| B | **För dig ∈ Basic** — familjens målyta, inte eget paket |
| C | Feature-slug-register per komponent (§7.1) |
| D | De sju frågorna = Extra stöd v1.2; övrigt Extra stöd = v1.3+ |
| E | Nya funktioner → ett paket via beslutregeln (§0) |

---

*Spec v1.2 Paket — godkänd för implementation.*
