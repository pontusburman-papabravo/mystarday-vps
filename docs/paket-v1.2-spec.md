# Paket — Spec v1.2

**Skapad:** 2026-06-17  
**Uppdaterad:** 2026-06-17  
**Status:** ✅ **Approved for implementation (v1.2)**  
**Produktversion:** v1.2 = **Paket**  
**Teknisk grund:** `family_subscriptions.components` JSONB + `has_component()` + `requireComponent()`

---

## 0. Vad v1.2 är

**Produktversion v1.2 heter Paket** — det är den kommersiella och tekniska uppdelningen av appen i modulära tillägg ovanpå en gemensam grund.

| Begrepp | Betydelse |
|---------|-----------|
| **v1.2 Paket** | Hela paketmodellen — denna spec |
| **Basic, Rapportering, Pedagog, TEACCH** | De fyra paketen *inom* v1.2 |
| **Komponent-slug** | Tekniskt namn i `family_subscriptions.components` |
| **Feature slug** | Operativ flagga i `features` / `family_features` |

v1.2 är **inte** synonymt med TEACCH eller De sju frågorna. TEACCH är **ett av fyra paket**.

---

## 1. Översikt — fyra paket

Appen säljs som **modulära tillägg** ovanpå grundfunktionalitet. Varje paket har egen komponent-slug och kopplade feature flags.

| # | Paket (kundnamn) | Komponent-slug | Kort beskrivning | Status |
|---|------------------|----------------|------------------|--------|
| 1 | **Basic** | `basic_app` | Flera barn, schema, stjärnor, belöningar | ✅ Live |
| 2 | **Familj Rapportering** | `reporting` | Rapporter, delningslänkar, export | ⚙️ Feature finns |
| 3 | **Familj Pedagog** | `pedagog` | Externa pedagoger, anteckningar | ⚙️ Feature finns |
| 4 | **Familj Extra stöd** | `teacch` | TEACCH-inspirerat stöd för förutsägbarhet | 📋 Spec klar |

### 1.1 Principer

| Princip | Beskrivning |
|---------|-------------|
| Basic räcker för de flesta | Schema + stjärnor + belöningar = kärnloopen |
| Tillägg = tydligt värde | Varje paket löser ett avgränsat problem |
| Kan kombineras | T.ex. Basic + Rapportering + TEACCH utan Pedagog |
| Dubbel gating | Komponent (`has_component`) för betalning; feature flag för rollout/dev |
| lifetime_free | Grundarfamiljer behåller `basic_app`; tillägg är separat produktbeslut |

### 1.2 Teknisk modell (befintlig)

```
family_subscriptions
  ├── tier: lifetime_free | trial | paid
  └── components: [
        { component: 'basic_app', granted_at, expires_at },
        { component: 'reporting', ... },
        { component: 'pedagog', ... },
        { component: 'teacch', ... }
      ]
```

Middleware: `requireComponent('reporting')` — se `src/middleware/require-component.js`.  
Config: `config/subscription-components.js` (idag: `basic_app`, `reporting`).

**v1.2 leverans (teknik):** lägg till `pedagog` och `teacch` i config; dokumentera feature-mapping per paket; koppla gating i UI/API.

---

## 2. Paket 1 — Basic

| | |
|--|--|
| **Kundnamn** | Basic (ingår i grund) |
| **Komponent** | `basic_app` |
| **Pris (indikativt)** | ~59 SEK/mån (när betalning aktiveras) |
| **Status** | ✅ Live — alla familjer |

### Innehåll

| Funktion | Feature slug |
|----------|--------------|
| Flera barn | `barninloggning`, child CRUD |
| Veckoschema | `veckoschema` |
| Stjärnor & daglogg | `daglogg`, `manuella_stjarnor` |
| Belöningar / Skattkammaren | `beloningssystem`, `skattkammar_universum` |
| Aktivitetsbibliotek | `aktivitetsbibliotek` |
| Delsteg | (del av aktivitetsbibliotek) |
| Specialdagar & kalender | `specialdagar`, `kalender` |
| Onboarding | `onboarding` |
| Familjeinbjudan (medförälder) | `familjeinbjudan` |
| Push | `push_notiser` |

**Alla nya familjer** får `basic_app` vid registrering (trial + komponent).

---

## 3. Paket 2 — Familj Rapportering

| | |
|--|--|
| **Kundnamn** | Familj Rapportering |
| **Komponent** | `reporting` |
| **Pris (indikativt)** | ~19 SEK/mån (TBD) |
| **Status** | Feature live; komponent i config; betalning ej aktiverad |

### Innehåll

| Funktion | Feature slug |
|----------|--------------|
| Klinisk rapportering | `klinisk_rapportering` |
| Professionella delningslänkar | (del av klinisk_rapportering) |
| PDF/export, observationshistorik | (del av klinisk_rapportering) |

### Gating

- API: `requireComponent('reporting')` på rapportroutes
- UI: `/reports` — `data-feature="klinisk_rapportering"` + komponentcheck

### v1.2-aktivitet (paketnivå)

- [ ] Säkerställ att alla rapportfeatures mappas till `reporting`
- [ ] Upgrade-UI visar Rapportering som tillägg (när `STRIPE_ENABLED`)

---

## 4. Paket 3 — Familj Pedagog

| | |
|--|--|
| **Kundnamn** | Familj Pedagog |
| **Komponent** | `pedagog` |
| **Pris (indikativt)** | TBD |
| **Status** | Features finns; komponent **ej** i config än |

### Innehåll

| Funktion | Feature slug / kod |
|----------|-------------------|
| Pedagoginbjudan | `pedagog_invite` |
| Pedagogroll (begränsad åtkomst) | `parent_child.role = pedagog` |
| Pedagoganteckningar | `pedagoganteckningar` |
| Pedagog-översikt | pedagog-vy i appen |
| Begränsad barnvy för extern pedagog | read-only schema + logg |

### Gating (vid implementation)

- `requireComponent('pedagog')` på pedagogroutes
- Pedagoginbjudan skapas endast om familjen har paketet

### v1.2-aktivitet (paketnivå)

- [ ] Lägg till `pedagog` i `subscription-components.js`
- [ ] Dokumentera feature-mapping (denna spec)
- [ ] Full gating kan ske i v1.3 om betalning inte är redo

---

## 5. Paket 4 — Familj Extra stöd (TEACCH)

| | |
|--|--|
| **Kundnamn** | Familj Extra stöd |
| **Komponent** | `teacch` |
| **Pris (indikativt)** | TBD |
| **Status** | Spec klar för första funktionen |

> **Formulering:** Inspirerad av TEACCH, visuellt stöd och strukturerad pedagogik — **inte** en officiell TEACCH-metod.

**Produkttext:**

> *Familj Extra stöd ger verktyg för barn som gynnas av ökad förutsägbarhet i vardagen.*

### Innehåll

| Funktion | Feature slug | Prioritet |
|----------|--------------|-----------|
| **De sju frågorna** | `de_sju_fragorna` | P0 |
| Distraktionsfri barnvy | `minimal_ui` | P1 |
| (Framtida TEACCH-verktyg) | — | v1.2.x+ |

### Gating

- `requireComponent('teacch')` + `de_sju_fragorna` feature flag
- Dogfood: enbart `family_features` utan betalning

---

## 6. De sju frågorna — detaljspec (TEACCH-paketet, P0)

*Hör till paket 4 (TEACCH), inte till hela v1.2.*

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

| | Delsteg (Basic) | De sju frågorna (TEACCH) |
|--|-----------------|--------------------------|
| Svarar på | Hur gör jag? | Vad innebär situationen? |
| Barnvy | Avbockning | Läsning |

**Dölj tomma fält.** Kortare svar föredras i barnvy.

### 6.2 Datamodell

```sql
ALTER TABLE activity_template
  ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

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

### 6.3 Tekniska krav

**`QUESTION_ORDER`** — fast ordning, oberoende av JSON-nycklar:

```javascript
const QUESTION_ORDER = [
  'what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why',
];
```

**`normalizeSevenQuestions(input)`** — trimma, ta bort tomma, ignorera okända nycklar, max 500 tecken. Används i POST, PUT, migrationer, tester.

### 6.4 API (inga nya endpoints)

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET/POST/PUT | `/api/activities` | `seven_questions` |
| GET | `/api/children/me/daily-log` | Berika från `activity_template` |

### 6.5 UX — barn

NU-kort prioritet:

```
1. Aktivitetsnamn
2. Delsteg (Basic)
3. De sju frågorna (TEACCH)
4. Klar-knapp
```

NÄSTA-kort synligt (övergångsstöd). En primär handling. Panel dold på klara aktiviteter.

### 6.6 UX — förälder

Redigering i **biblioteket** (`/library`), progressive disclosure:

```
▼ Delsteg
▼ De sju frågorna
▼ Avancerat
```

---

## 7. config/subscription-components.js (målbild)

```javascript
const STRIPE_COMPONENT_MAP = {
  basic_app:  { name: 'Basic',              price_monthly_sek: 59 },
  reporting:  { name: 'Familj Rapportering', price_monthly_sek: 19 },
  pedagog:    { name: 'Familj Pedagog',      price_monthly_sek: null },
  teacch:     { name: 'Familj Extra stöd',  price_monthly_sek: null },
};
```

Priser TBD. `STRIPE_ENABLED=false` tills betalning aktiveras.

---

## 8. Rollout v1.2 (Paket)

| Steg | Vad |
|------|-----|
| 1 | Denna spec godkänd ✅ |
| 2 | `pedagog` + `teacch` i config (stub) |
| 3 | Feature-mapping dokumenterad (§1–5) |
| 4 | De sju frågorna implementerad (TEACCH P0) |
| 5 | `minimal_ui` kopplad till `teacch` (P1) |
| 6 | Upgrade-sida visar alla fyra paket |
| 7 | Betalning aktiveras separat (`STRIPE_ENABLED`) |

---

## 9. Acceptanskriterier v1.2 (Paket)

### Paketmodell

- [ ] Fyra paket dokumenterade med komponent-slug och feature-mapping
- [ ] `basic_app` + `reporting` + `pedagog` + `teacch` i `subscription-components.js`
- [ ] Tydlig skillnad: v1.2 = Paket, TEACCH = ett paket bland fyra

### TEACCH P0 (De sju frågorna)

- [ ] `seven_questions` JSONB + normalisering + tester
- [ ] Biblioteksredigering + barnvy-panel, gated på `teacch`
- [ ] Ingen påverkan på familjer utan paketet

---

## 10. Beslut

| # | Beslut |
|---|--------|
| A | **v1.2 = Paket** — hela paketuppdelningen |
| B | Fyra paket: Basic, Rapportering, Pedagog, TEACCH |
| C | TEACCH (`teacch`) = Familj Extra stöd, inte hela v1.2 |
| D | De sju frågorna = P0 inom TEACCH-paketet |
| E | Modulära tillägg — kombinerbara |
| F | lifetime_free behåller Basic; tillägg separat |

---

*Spec v1.2 Paket — godkänd för implementation.*
