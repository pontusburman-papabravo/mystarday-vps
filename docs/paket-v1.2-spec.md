# Paket — Spec v1.2

**Skapad:** 2026-06-17  
**Uppdaterad:** 2026-06-17 (navigationsarkitektur §6)  
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

### 6.5 Delvis åtkomst (inte alla paket)

Bottom nav visar **endast flikar användaren har tillgång till** — inga låsta paketknappar i huvudnav.

| Komponenter aktiva | Synliga flikar (exempel) |
|--------------------|--------------------------|
| `basic_app` only | Idag · Rutiner · Barn/Stöd |
| + `reporting` | + Utveckling |
| + `pedagog` | + Samarbete |
| + `teacch` | Barn/Stöd utökas med stödverktyg |

Saknad komponent → flik dold (eller upgrade-prompt vid djup länk, inte i bottom nav).

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

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET/POST/PUT | `/api/activities` | `seven_questions` |
| GET | `/api/children/me/daily-log` | Berika från `activity_template` |

### 7.3 Tekniska krav

```javascript
const QUESTION_ORDER = [
  'what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why',
];
```

`normalizeSevenQuestions(input)` — trimma, ta bort tomma, ignorera okända nycklar, max 500 tecken.

### 7.4 Barnvy — NU-kort

```
1. Aktivitetsnamn
2. Delsteg (Basic, om aktivt)
3. De sju frågorna (Extra stöd, om aktivt)
4. Klar
```

NÄSTA-kort synligt (övergångsstöd). Redigering i biblioteket (progressive disclosure).

---

## 8. Tekniskt paketregister

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

### 8.1 Feature-slug → komponent (register)

| Komponent | Feature slugs |
|-----------|---------------|
| `basic_app` | `for_dig`, `veckoschema`, `specialdagar`, `kalender`, `aktivitetsbibliotek`, `daglogg`, `manuella_stjarnor`, `beloningssystem`, `skattkammar_universum`, `familjeinbjudan`, `barninloggning`, `push_notiser`, `onboarding` |
| `reporting` | `klinisk_rapportering` |
| `pedagog` | `pedagog_invite`, `pedagoganteckningar`, `pedagog_dashboard` |
| `teacch` | `de_sju_fragorna`, `minimal_ui`, `visual_timer`, `transition_support`, `social_stories` |

*(Planerade slugs i kursiv logik: `pedagog_dashboard`, `transition_support`, `social_stories` — lägg till i `seed-features.js` vid implementation.)*

---

## 9. Uppgraderingssidan

Fyra löfteskort — rubrik = nytta, inte funktionsdump:

| Kort | Rubrik | Checklista (kort) |
|------|--------|-------------------|
| Basic | Vardagens grundfunktioner | Schema · Belöningar · För dig · Flera barn |
| Rapportering | Följ utveckling över tid | Rapporter · Historik · PDF · Delningslänkar |
| Pedagog | Samarbeta med pedagoger | Inbjudan · Anteckningar · Delad översikt |
| Extra stöd | Ökad förutsägbarhet | De sju frågorna · Visuellt stöd · Övergångsstöd |

Basic markerat *Ingår* för nya användare. Tillägg kombinerbara.

---

## 10. Rollout v1.2

| Steg | Leverans |
|------|----------|
| 1 | Paketspec + register (denna fil) ✅ |
| 2 | `pedagog` + `teacch` i `subscription-components.js` |
| 3 | Feature → komponent-mapping i gating |
| 4 | Uppgraderingssida — fyra kort |
| 5 | De sju frågorna (Extra stöd P0) |
| 7 | Navigationsomläggning enligt §6 (iterativt; kan efterlöpa paket-gating) |
| 8 | Betalning separat |

---

## 11. Acceptanskriterier

- [ ] Fyra paket med löfte, komponent, feature-register
- [ ] För dig dokumenterat under Basic — inte femte paket
- [ ] `pedagog_dashboard`, `transition_support`, `social_stories` planerade under rätt paket
- [ ] De sju frågorna: datamodell + lugn barnvy-ton + `teacch`-gating
- [ ] Uppgraderingssida enligt §9
- [ ] Navigation: arbetsflödesflikar vid full access (§6); För dig ej egen bottom-tab
- [ ] Delvis åtkomst: endast relevanta flikar synliga
- [ ] Inställningar i top-right, inte bottom nav

---

## 12. Beslut

| # | Beslut |
|---|--------|
| A | v1.2 = Paket — fyra säljbara moduler |
| B | **För dig ∈ Basic** — familjens målyta, inte eget paket |
| C | Feature-slug-register per komponent (§7.1) |
| D | De sju frågorna = Extra stöd v1.2; övrigt Extra stöd = v1.3+ |
| E | Nya funktioner → ett paket via beslutregeln (§0) |
| F | **Meny = arbetsflöden** vid köp — inte paketknappar (§6) |
| G | För dig = modul i Idag — aldrig egen huvudflik |
| H | Bottom nav max 5; Inställningar top-right |

---

*Spec v1.2 Paket — godkänd för implementation.*
