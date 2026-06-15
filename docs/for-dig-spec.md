# För dig — Upptäck & utvecklingsmål

**Skapad:** 2026-06-15  
**Status:** Implementation-ready (Sprint 1–4)  
**Feature slug:** `for_dig`  
**URL:** `/for-dig`  
**Relaterat:** onboarding, `foraldaraktivering_7d`, standardbibliotek, bibliotek, Skattkammaren

---

## 0. Vad det här är (och inte är)

Det här är **inte** ett biblioteksprojekt.

Det är ett **lösningslager** — en egen destination som översätter admin-kurerat innehåll till föräldraproblem.

| | Bibliotek (`/library`) | För dig (`/for-dig`) |
|--|------------------------|----------------------|
| Mental modell | "Bygg scheman och aktiviteter" | "Lös ett problem med mitt barn" |
| Målgrupp | Typ 2: "Låt mig bygga" | Typ 1: "Hjälp mig" |
| Språk | Schema, aktivitet, belöning | Trygga kvällar, självständighet |
| Djup | Expertverktyg | Ingång + aktivering |

**Analogi:** Spotify *Ditt bibliotek* vs *För dig*. Netflix *Min lista* vs *Upptäck*.

Vi bygger **inte** ny backend-kapacitet i V1. Vi paketerar och presenterar det som redan finns:

- `default_schedule` / `default_schedule_item`
- `default_activity_template`
- `default_reward`
- Befintliga copy-endpoints i `src/routes/standard-library.js`
- `child.birthday` för åldersfiltrering

---

## 1. Problembeskrivning

### 1.1 Produktlagren idag

```
Lager 1 — Onboarding          "Hjälp mig komma igång"     ✅
Lager 2 — Aktivering (7 dag)  "Hjälp mig få en vana"      ✅
Lager 3 — Bibliotek           "Hjälp mig bygga vidare"    ✅
         — SAKNAS —           "Hjälp mig lösa ett problem" ❌
```

Efter 2–6 veckors användning byter förälderns fråga:

| Vecka 1 | Vecka 2–6 |
|---------|-----------|
| "Hur fungerar appen?" | "Hur får jag lugnare kvällar?" |
| | "Hur får jag barnet att klä på sig själv?" |
| | "Hur får jag läxorna att fungera?" |

7-dagarsprogrammet (`foraldaraktivering_7d`) svarar på **förälderns vana**, inte på **innehållsbehov**. Det saknas en dedikerad yta för vecka 2+.

### 1.2 Differentiering

Konkurrenter säljer verktyg. Föräldrar köper utfall.

| Marknadsspråk (svagt) | För dig-språk (starkt) |
|-----------------------|------------------------|
| App för scheman och belöningar | Få lugnare kvällar utan tjat |
| Belöningssystem | Hjälp barn bli självständiga |
| Rutinapp | Första lugna kvällen på länge |

### 1.3 Användartyper

**Typ 1 — "Hjälp mig"** (ny eller vecka 2–6)

- Vill inte in i biblioteket
- Tänker i problem: kvällskaos, morgonkaos, läxor
- Behöver `/for-dig`

**Typ 2 — "Låt mig bygga"** (erfaren)

- Vill justera stjärnvärden, skapa egna aktiviteter
- Behöver `/library` oförändrat

**Princip:** Lägg ett lager ovanpå biblioteket. Ta inte bort flikarna.

---

## 2. Mål & icke-mål

### 2.1 Mål

1. Ge föräldrar en **problemorienterad** ingång till befintligt innehåll
2. Minska tid från "jag har ett problem" till "rutinen är igång"
3. Göra produkten personlig via barnets ålder och namn
4. Positionera appen som **utvecklingsverktyg**, inte schemasystem

### 2.2 Icke-mål (V1–V3)

- Community / användargenererat innehåll
- AI-genererade rutiner
- Betyg/recensioner (offentliga)
- Ersätta biblioteket
- Ny komplex datamodell i Sprint 1
- Paket-tabell i Sprint 1 (hårdkodad config räcker)
- Generellt feedbacksystem / NPS / survey-builder (se §19 — lärsystem med tre mikro-ögonblick istället)

---

## 3. Användarresa

### 3.1 Mogen produktkarta

```
Onboarding
    ↓
7-dagarsprogram (valfritt)
    ↓
För dig (/for-dig)          ← NY
    ↓
Schema (/schedule)
    ↓
Bibliotek (/library)        ← expertverktyg, sekundär nav (Sprint 4)
```

### 3.2 Koppling till 7-dagarsprogrammet

Programmet och För dig ska **komplettera**, inte konkurrera.

| Aktiveringsdag | Nuvarande CTA | Framtida koppling |
|----------------|---------------|-------------------|
| Dag 4 | "Redigera schema" → `/schedule` | Kan peka till För dig: "Vill du prova en kvällsrutin?" |
| Dag 5 | "Öppna Skattkammaren" | Behåll — stärker belöningskopplingen i lösningskort |

---

## 4. Information architecture

### 4.1 URL & namn

| Internt (dev) | Externt (UI) | URL |
|---------------|--------------|-----|
| Lösningslager / solutions | **För dig** | `/for-dig` |

**Inte** `/losningar` — logiskt för oss, inte nödvändigtvis för föräldern.

Alternativt alias `/upptack` kan redirecta till `/for-dig` om A/B-testas senare.

### 4.2 Framtida navigation (Sprint 4 — efter mätning)

```
Primär nav:
  🏠 Hem  |  📅 Schema  |  ✨ För dig  |  👨‍👩‍👧 Familj  |  ⋯ Mer

Under Mer:
  📚 Bibliotek
  ⚙️ Inställningar
```

**Sprint 1:** Lägg till sidlänk i sidebar + eventuell dashboard-CTA. Flytta inte bibliotek från bottom nav förrän data finns.

### 4.3 Sidstruktur

```
/for-dig
├── Hälsning + fokusfråga
├── Utvecklingsmål (6 kort)
│   ├── Primära (Aktivera-knapp)
│   └── Sekundära (Utforska → detalj)
├── Rekommenderat för [barn] (åldersfiltrerat)
└── Länk: "Visa hela biblioteket" → /library
```

---

## 5. Copy-principer

### 5.1 Sälj resultat, inte implementation

| ❌ Systemspråk | ✅ Föräldraspråk |
|----------------|-----------------|
| Installera paket | Aktivera kvällsrutinen |
| Kopiera till bibliotek | Kom igång med morgonrutinen |
| 1 schema, 4 aktiviteter, 2 belöningar | Första lugna kvällen på länge |

### 5.2 Varje lösningskort ska visa

1. **Utvecklingsmål** (rubrik) — t.ex. "Trygga kvällar"
2. **Löfte** (en rad) — t.ex. "Mindre stress vid läggdags"
3. **Åldershint** — t.ex. "För barn 3–5 år"
4. **Resultat** (checklista) — vad barnet får hjälp med
5. **Skattkammare-koppling** — stjärnor/vecka + exempelbelöningar
6. **CTA** — "Aktivera kvällsrutinen" eller "Utforska"

### 5.3 Strukturera som utvecklingsmål, inte tekniska kategorier

| Utvecklingsmål | Inte |
|----------------|------|
| Trygga kvällar | Schema > Kväll |
| Självständighet | Aktiviteter > Hygien |
| Bra morgnar | Bibliotek > Morgon |

---

## 6. Sprint 1 — MVP (hårdkodat)

### 6.1 Leverans

| Fil | Ansvar |
|-----|--------|
| `public/for-dig.html` | Sida, layout, auth-gate |
| `public/js/for-dig-config.js` | Hårdkodade utvecklingsmål + metadata |
| `public/js/for-dig.js` | Render, aktivering, personifiering |
| `public/css/for-dig.css` | Valfritt — kan använda befintlig warmth/magic-stil |
| `scripts/seed-features.js` | Feature slug `for_dig` |
| `public/sw.js` | CACHE_NAME bump |

### 6.2 Startsida — wireframe

```
Hej Anna 👋

Vad vill du fokusera på just nu?

┌─────────────────────────────────────┐
│ 🌙 Trygga kvällar                   │
│ Mindre stress vid läggdags.         │
│ För barn 3–5 år.                    │
│                                     │
│ Hjälper barnet att:                 │
│ ✓ Varva ner                         │
│ ✓ Komma ihåg tandborstningen        │
│ ✓ Följa läggdagsrutinen             │
│ ✓ Känna stolthet över sina stjärnor │
│                                     │
│ Barn brukar tjäna ⭐ 15–25/vecka    │
│ 🏆 Extra saga  🍦 Glass  🎬 Filmkväll│
│                                     │
│ [ Aktivera kvällsrutinen ]          │
└─────────────────────────────────────┘

… (5 fler kort, se §6.3)

─────────────────────────────────────
För Astrid (4 år) — Rekommenderat just nu
  · Kvällsrutin
  · Borsta tänder själv
  · Klä på sig själv

─────────────────────────────────────
Visa hela biblioteket →
```

### 6.3 Sex utvecklingsmål (V1)

| Slug | Rubrik | Löfte | Ålder | CTA-typ | Backend-källa (namn) |
|------|--------|-------|-------|---------|----------------------|
| `trygga-kvallar` | Trygga kvällar | Mindre stress vid läggdags | 3–5 | Aktivera | `default_schedule`: **Kvällsrutin** |
| `bra-morgnar` | Bra morgnar | Kom iväg utan tjat | 3–6 | Aktivera | `default_schedule`: **Kort morgon** |
| `sjalvstandighet` | Självständighet | Hjälp barnet göra mer själv | 3–7 | Utforska → Aktivera | `default_activity_template` (namnlista) |
| `skolansvar` | Skolansvar | Läxor, väskor och ansvar | 6–9 | Utforska → Aktivera | `default_schedule`: **Skola vardag** |
| `samarbete-hemma` | Samarbete hemma | Hjälpa till och ta ansvar | 4–9 | Utforska | Aktivitetsnamn + ev. belöningar |
| `motivation` | Motivation | Belöningar som håller motivationen uppe | alla | Utforska → Aktivera | `default_reward` (namnlista) |

**Aktivera** = primär CTA på kortet (Sprint 1–2).  
**Utforska** = expanderar detaljvy med resultat + Skattkammare-info + aktiveringsknapp (Sprint 1).

### 6.4 Rekommendationer per barn (Sprint 1 — enkel)

Visa sektion om familjen har minst ett barn med `birthday`:

```javascript
function calcAge(birthday) {
  const b = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}
```

Filtrera `for-dig-config.js` goals där `ageMin <= age <= ageMax`.  
Visa 3 `highlightActivities` (hårdkodade strängar per mål) — matchas mot standardbibliotek vid aktivering i Sprint 2.

Flera barn: visa ett block per barn (max 3), sorterat `sort_order`, `created_at`.

### 6.5 Personlig hälsning

- Hämta förälderns förnamn från e-post local-part (`anna@…` → "Anna") eller `"där"` som fallback
- Alternativ: lägg till `display_name` senare — **inte** blocker för V1

---

## 7. Sprint 2 — Aktiveringsflöde

### 7.1 UX

1. Förälder trycker **"Aktivera kvällsrutinen"**
2. Om flera barn → välj barn (modal)
3. Bekräftelse: *"Aktivera kvällsrutinen för Astrid? Rutinen läggs in i veckoschemat."*
4. Spinner → success-toast: *"Kvällsrutinen är igång för Astrid! 🌙"*
5. Valfri sekundär CTA: "Visa schema" → `/schedule?child=…`

### 7.2 Tekniskt (återanvänd befintligt)

Orchestrator i `for-dig.js` (eller tunn `POST /api/for-dig/:slug/activate` i Sprint 2b):

```
1. GET /api/standard-library/schedules
   → hitta scheduleId via scheduleName i config

2. POST /api/standard-library/schedules/:id/copy
   body: { child_id, days: [1,2,3,4,5,6,6], overwrite: true }
   — kväll: alla dagar [0,1,2,3,4,5,6] eller bara vardagar beroende på mål

3. Om config.activityNames:
   GET /api/standard-library → matcha namn → POST …/activities/copy-batch

4. Om config.rewardNames:
   GET /api/standard-library/rewards → matcha → POST …/rewards/copy-batch
```

**Dagar per mål:**

| Mål | `days` |
|-----|--------|
| Trygga kvällar | `[0,1,2,3,4,5,6]` (alla dagar) |
| Bra morgnar | `[1,2,3,4,5]` (vardagar) |
| Skolansvar | `[1,2,3,4,5]` |

Om `default_schedule` saknas lokalt (tomt admin-bibliotek): visa vänligt fel + länk till bibliotek/admin, inte tekniskt 500.

### 7.3 Idempotens

- Om aktivitet redan finns i familjen (namn-match) → standard-library hanterar det
- Schema-copy med `overwrite: true` → ersätter befintligt (samma som `family.js` `applySchedulePackage`)

---

## 8. Sprint 3 — Personifiering & data

### 8.1 Förbättrad "För Astrid"

- Sortera mål efter ålder + ev. `child.schema_type` om satt
- Dölj mål utanför åldersspann
- Markera redan aktiverade mål (heuristik: schedule-namn finns i barnets veckoschema)

### 8.2 `install_count` (förberedelse)

Ny kolumn eller tabell — **inte** Sprint 1:

```sql
-- Sprint 3+
CREATE TABLE IF NOT EXISTS for_dig_goal_install (
  goal_slug VARCHAR(64) NOT NULL,
  family_id UUID NOT NULL REFERENCES family(id),
  child_id UUID REFERENCES child(id),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (goal_slug, family_id, child_id)
);
```

Visa: "Populärt just nu" / "Mest aktiverade" — aggregat i admin, föräldrar-vy i För dig.

---

## 9. Sprint 4 — Navigation

**Förutsättning:** Mätning visar att För dig används.

| Metric | Mål (indikativt) |
|--------|------------------|
| % familjer som öppnar `/for-dig` vecka 2+ | > 20% |
| Aktiverings-rate per mål | > 10% av besökare |
| Bibliotek-besök oförändrat eller minskar långsamt | ingen power-user-revolt |

Ändringar:

- `dashboard.html` bottom nav: Byt **Bibliotek** → **För dig**
- `platform-tab-bar.js`: Bibliotek under "Mer"
- Sidebar: För dig prominent, Bibliotek under "Avancerat"

---

## 10. Feature gate & rollout

### 10.1 Feature slug

```javascript
{
  slug: 'for_dig',
  name: 'För dig',
  description: 'Problemorienterad ingång till rutiner och belöningar',
  status: 'dev',  // → 'live' vid launch
  tags: ['growth', 'bibliotek'],
  priority: 'critical',
}
```

### 10.2 Rollout

1. `dev` — endast familjer med `family_features.for_dig`
2. Intern dogfood
3. `live` — alla familjer
4. Sprint 4 nav — efter metrics

### 10.3 Auth

- Kräver inloggad förälder (`requireParent` på eventuella API-routes)
- HTML: redirect till `/login` om ej auth (samma mönster som `/library`)

---

## 11. Analytics

### 11.1 Events (lägg i `analytics_events`)

| Event | När | Metadata |
|-------|-----|----------|
| `for_dig_page_view` | Sidan laddas | `child_count` |
| `for_dig_goal_expand` | Utforska klick | `goal_slug` |
| `for_dig_activate_click` | Aktivera klick | `goal_slug`, `child_id` |
| `for_dig_activate_success` | Copy lyckades | `goal_slug`, `child_id`, `schedule_id` |
| `for_dig_activate_fail` | Copy misslyckades | `goal_slug`, `error` |
| `for_dig_library_link` | "Visa hela biblioteket" | — |
| `for_dig_feedback_intent` | Intent-modal besvarad | `goal_slug`, `intent_reason`, `child_id` |
| `for_dig_feedback_outcome` | 7-dagars check-in besvarad | `goal_slug`, `outcome_score`, `child_id` |
| `for_dig_feedback_suggestion` | Föreslå förbättring skickad | `goal_slug`, `free_text` |

### 11.2 North Star (indikativ)

Familjer som aktiverat ≥1 mål vecka 2–8 har högre retention än kontroll.

### 11.3 North Star — lärande (outcome)

Andel `outcome`-svar med `outcome_score >= 3` (🙂 eller 😊) per `goal_slug` — **inte** sidvisningar eller NPS.

---

## 12. Designriktlinjer

- Återanvänd `dashboard-warmth.css`, `library-magic.css` där det passar
- Mobil först (375px)
- CTA-knappar min 44px touch target
- Mörkt läge via befintlig `theme.js`
- Ingen ny typografi — Outfit + Plus Jakarta Sans

### 12.1 Detaljvy (Utforska)

Expandera kort inline eller modal:

- Full resultatlista
- Skattkammare-sektion (stjärnor/vecka + belöningsikoner)
- Aktivera-knapp
- Länk "Anpassa själv i biblioteket" → `/library`

---

## 13. Konfigurationsformat (`for-dig-config.js`)

```javascript
'use strict';

/** @typedef {Object} ForDigGoal
 * @property {string} slug
 * @property {string} icon
 * @property {string} title
 * @property {string} tagline
 * @property {number} ageMin
 * @property {number} ageMax
 * @property {string[]} outcomes
 * @property {string} starsHint — t.ex. "15–25 stjärnor per vecka"
 * @property {{ icon: string, label: string }[]} rewardExamples
 * @property {'activate'|'explore'} primaryAction
 * @property {string} [activateLabel]
 * @property {string} [scheduleName] — default_schedule.name
 * @property {number[]} [scheduleDays]
 * @property {string[]} [activityNames]
 * @property {string[]} [rewardNames]
 * @property {string[]} highlightActivities — för rekommendationsrad
 */

const FOR_DIG_GOALS = [
  {
    slug: 'trygga-kvallar',
    icon: '🌙',
    title: 'Trygga kvällar',
    tagline: 'Mindre stress vid läggdags.',
    ageMin: 3,
    ageMax: 5,
    outcomes: [
      'Varva ner',
      'Komma ihåg tandborstningen',
      'Följa läggdagsrutinen',
      'Känna stolthet över sina stjärnor',
    ],
    starsHint: '15–25 stjärnor per vecka',
    rewardExamples: [
      { icon: '🏆', label: 'Extra saga' },
      { icon: '🍦', label: 'Glassutflykt' },
      { icon: '🎬', label: 'Filmkväll' },
    ],
    primaryAction: 'activate',
    activateLabel: 'Aktivera kvällsrutinen',
    scheduleName: 'Kvällsrutin',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    highlightActivities: ['Kvällsrutin', 'Borsta tänder', 'Godnattsaga'],
  },
  // … övriga fem mål
];

module.exports = { FOR_DIG_GOALS };
```

Frontend: exportera som `window.ForDigConfig` om IIFE, eller ES module om projektet migrerar.

---

## 14. Testplan

### 14.1 Manuellt

- [ ] Sidan laddas inloggad som förälder
- [ ] Oinloggad → redirect `/login`
- [ ] Hälsning med namn
- [ ] 6 kort renderas
- [ ] Rekommendation för barn med birthday
- [ ] Aktivera kvällsrutin → schema kopieras till valt barn
- [ ] Tomt `default_schedule` lokalt → vänligt fel
- [ ] Feature gate `for_dig` av → redirect eller dold länk
- [ ] Mörkt läge OK
- [ ] Mobil 375px utan overflow

### 14.2 Automatiskt (Sprint 2+)

- `test/for-dig-config.test.js` — config validering (alla scheduleName unika, ageMin ≤ ageMax)
- Integration: aktivering mot standard-library (mock DB)

---

## 15. Risker & mitigering

| Risk | Mitigering |
|------|------------|
| Tomt admin-bibliotek lokalt | Tydligt fel + dokumenterat i AGENTS.md |
| `overwrite: true` förstör anpassat schema | Bekräftelsedialog; copy i Sprint 2 |
| Power users tappar bibliotek i nav | Sprint 4 först efter metrics |
| Namn-matchning aktiviteter/belöningar | Admin håller namn synkade; config uppdateras vid harvest |
| Överlapp med onboarding | Onboarding = första gången; För dig = nästa problem |

---

## 16. Öppna frågor

1. **Förnamn:** E-post-local-part räcker V1, eller vänta på `display_name`?
2. **Kväll alla dagar vs vardagar:** Bekräfta med produktägare
3. **ADHD-stöd:** Eget mål i V2 när admin-innehåll finns
4. **Alias `/upptack`:** A/B mot `/for-dig`?

---

## 17. Implementation-checklista

### Sprint 1
- [ ] `docs/for-dig-spec.md` (denna fil)
- [ ] `public/for-dig.html`
- [ ] `public/js/for-dig-config.js`
- [ ] `public/js/for-dig.js`
- [ ] Feature `for_dig` i `seed-features.js`
- [ ] Sidebar-länk på dashboard/library
- [ ] SW cache bump
- [ ] Analytics: `for_dig_page_view`

### Sprint 2
- [ ] Aktiverings-orchestrator
- [ ] Barnväljare-modal
- [ ] Bekräftelse + toast
- [ ] Analytics: activate success/fail
- [ ] Intent-modal vid aktivering (§19)
- [ ] Migration `for_dig_goal_feedback`
- [ ] `POST /api/for-dig/feedback`

### Sprint 3
- [ ] `for_dig_goal_install` migration
- [ ] "Populärt just nu"
- [ ] Redan aktiverad-indikator
- [ ] 7-dagars outcome-banner på dashboard (§19)
- [ ] "Föreslå förbättring" på lösningskort (§19)
- [ ] Admin-lista: aktiveringar + outcome per mål (§19)

### Sprint 4
- [ ] Bottom nav-omläggning
- [ ] `platform-tab-bar.js` uppdatering

---

## 19. Feedback & lärande

Med ~140 familjer bygger vi **inte** ett feedbacksystem. Vi bygger ett **lärsystem** — tre mikro-ögonblick inbakade i flödet.

### 19.1 Princip

| ❌ Dålig fråga | ✅ Bra fråga | Vad vi lär oss |
|----------------|-------------|----------------|
| "Tycker du om För dig?" | "Vad hoppas du få hjälp med?" | **Intent** — varför de aktiverade |
| NPS / stjärnbetyg | "Hur har det gått?" (efter 7 dagar) | **Outcome** — fungerade det? |
| Generella feature requests | "Vad blev bättre?" / "Vad saknas?" | **Copy** för marknadsföring + nästa lösning |

**Inte:** Survey-motorn (`surveys`), NPS, community-recensioner, AI-analys av fritext i V1.

**Ja:** En tabell, tre faser, enkel admin-lista, manuell uppföljning med ~10 % av aktiva familjer.

**Befintligt mönster att återanvända:** 7-dagarsprogrammets reflektion (`activation-program-banner.js` → `POST /api/me/activation-program/reflection`). Samma UX-principer — inte samma datamodell.

### 19.2 Tre ögonblick (V1)

#### A. Vid aktivering — intent (obligatoriskt, 1 klick)

Visas direkt efter success-toast *"Kvällsrutinen är igång!"* — liten modal, kräver val innan dismiss:

```
Vi är nyfikna — vad hoppas du att detta ska hjälpa med?

○ Mindre tjat
○ Tydligare rutiner
○ Självständighet
○ Mindre stress
○ Annat
```

Ingen fritext här — minimal friktion.

#### B. Efter 7 dagar — outcome (1 klick)

Dashboard-banner (rekommenderat — samma mönster som aktiveringsprogrammet):

```
Hur har det gått med Trygga kvällar?

😊 Stor förbättring
🙂 Lite bättre
😐 Ingen skillnad
🙁 Fungerar inte
```

**Visa endast om:**

- Målet aktiverades för ≥7 kalenderdagar sedan (`for_dig_goal_install` eller `intent`-radens `created_at`)
- Inget `outcome`-svar finns för `(family_id, child_id, goal_slug)`
- Föräldern är inloggad

#### C. Villkorlig fritext (valfritt)

| Outcome-svar | Uppföljning |
|--------------|-------------|
| 😊 (`4`) eller 🙂 (`3`) | "Vad blev bättre?" (textarea, valfritt) |
| 😐 (`2`) eller 🙁 (`1`) | "Vad saknas?" (textarea, valfritt) |

Sparas i samma rad som `outcome` (uppdatera `free_text`) eller som separat POST direkt efter score.

#### D. På varje lösningskort (alltid tillgänglig)

```
Saknar du något här?  💡 Föreslå förbättring
```

→ textarea → `phase: 'suggestion'`. Ingen 7-dagars-väntan.

### 19.3 Datamodell

**Använd inte** `surveys` / `survey_questions` — overkill för 140 familjer.

```sql
CREATE TABLE for_dig_goal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  child_id UUID REFERENCES child(id) ON DELETE SET NULL,
  goal_slug VARCHAR(64) NOT NULL,
  phase VARCHAR(32) NOT NULL,       -- 'intent' | 'outcome' | 'suggestion'
  intent_reason VARCHAR(64),          -- mindre_tjat | tydligare_rutiner | sjalvstandighet | mindre_stress | annat
  outcome_score SMALLINT,             -- 1=🙁 2=😐 3=🙂 4=😊
  free_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_for_dig_feedback_goal_phase
  ON for_dig_goal_feedback (goal_slug, phase, created_at DESC);

-- Max ett intent + ett outcome per aktivering (barn+mål)
CREATE UNIQUE INDEX idx_for_dig_feedback_intent_unique
  ON for_dig_goal_feedback (family_id, child_id, goal_slug)
  WHERE phase = 'intent' AND child_id IS NOT NULL;

CREATE UNIQUE INDEX idx_for_dig_feedback_outcome_unique
  ON for_dig_goal_feedback (family_id, child_id, goal_slug)
  WHERE phase = 'outcome' AND child_id IS NOT NULL;
```

**Filer:**

| Fil | Ansvar |
|-----|--------|
| `migrations/*_for_dig_goal_feedback.js` | Tabell |
| `db/for-dig-goal-feedback.js` | Insert, list för admin, pending outcome |
| `src/routes/for-dig.js` | `POST /api/for-dig/feedback`, `GET /api/for-dig/feedback/pending` |

### 19.4 API

```
POST /api/for-dig/feedback
Body: {
  goal_slug: string,
  child_id?: uuid,           -- krävs för intent/outcome
  phase: 'intent' | 'outcome' | 'suggestion',
  intent_reason?: string,    -- vid phase=intent
  outcome_score?: 1-4,       -- vid phase=outcome
  free_text?: string         -- vid suggestion eller outcome-uppföljning
}
```

```
GET /api/for-dig/feedback/pending
→ [{ goal_slug, goal_title, child_id, child_name, activated_at }]
  -- mål där intent finns, outcome saknas, activated_at <= now - 7 days
```

Validering:

- `intent_reason` måste vara ett av de fem tillåtna värdena
- `outcome_score` måste vara 1–4
- `free_text` max 500 tecken
- Upsert `free_text` på befintlig outcome-rad om uppföljning kommer direkt efter score

### 19.5 Admin — enkel lista, inte dashboard

Med 140 familjer räcker SQL eller en admin-flik (`admin-for-dig-feedback.js`):

```
Trygga kvällar
  42 intent-svar
  27 outcome-svar
  14 😊/🙂  |  8 😐  |  5 🙁

  Senaste fritexter (positiva):
  "Nu går läggningen utan bråk."
  "Hon borstar tänderna själv nu."

  Senaste fritexter (negativa):
  "Barnet vägrar fortfarande pyjamas."
```

Query-exempel:

```sql
SELECT goal_slug, phase, outcome_score, free_text, created_at
FROM for_dig_goal_feedback
WHERE goal_slug = 'trygga-kvallar'
ORDER BY created_at DESC
LIMIT 50;
```

### 19.6 Manuell uppföljning

Bygg en lista över familjer som **faktiskt använt** lösningarna (intent + outcome). Kontakta manuellt:

> *"Hej! Jag såg att ni testat Trygga kvällar i en vecka. Skulle du vilja berätta hur det gått?"*

**Mål:** 10 % svar på utvalda familjer ger mer insikt än månaders passiv analytics.

**Favoritfråga för intervju** (telefon/mejl — inte i appen V1):

> *"Vad är annorlunda hemma idag jämfört med innan ni började?"*

Använd på familjer som svarat 😊 med fritext. För öppen för 1-klicks-UI i produkten.

### 19.7 Vad vi inte bygger i V1

- Survey-builder i admin
- NPS-widget
- Offentliga recensioner / community
- AI-sammanfattning av fritext
- Koppling till generella `feedback_formular` (bug/feedback — håll För dig separat)

### 19.8 Sprint-koppling

| Sprint | Feedback-leverans |
|--------|-------------------|
| Sprint 2 | Intent-modal + migration + API |
| Sprint 3 | 7-dagars outcome-banner + föreslå förbättring + admin-lista |

Uppskattad insats: **2–3 timmar** backend + UI för intent/outcome-kärnan.

---

## 20. Sammanfattning

För dig är **inte** ny funktionalitet under huven. Det är översättningen från:

> *"Här är våra scheman, aktiviteter och belöningar"*

till:

> *"Här är lösningen på ditt problem — och så här bra kan det bli för barnet."*

Högsta UX-avkastning per utvecklingstimme: en sida, sex hårdkodade mål, befintlig copy-logik, föräldraspråk — plus ett lärsystem som svarar *"hjälpte det?"* istället för *"gillar du det?"*.
