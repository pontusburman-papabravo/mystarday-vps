# För dig — Upptäck & utvecklingsmål

**Skapad:** 2026-06-15  
**Status:** Roadmap V1–V5 · Engineering Sprints 1–5 (Sprint 1 implementation-ready)  
**Feature slug:** `for_dig`  
**URL:** `/for-dig`  
**Relaterat:** onboarding, `foraldaraktivering_7d`, standardbibliotek, bibliotek, Skattkammaren

> **Produktvision (10/10):** [`for-dig-vision.md`](for-dig-vision.md)  
> **Agent-uppdrag (implementation):** [`for-dig-agent-prompt.md`](for-dig-agent-prompt.md) · kort: [`for-dig-agent-prompt-short.md`](for-dig-agent-prompt-short.md)  
> **Helrutin (scheduleName-merge):** [`helrutin-semantik-spec.md`](helrutin-semantik-spec.md) · ADR: [`helrutin-semantik-adr.md`](helrutin-semantik-adr.md)

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

### 2.2 Icke-mål (V1–V5)

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

Se **§21** för fullständig V1–V5 × Sprint 1–5-matris.

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
    ↓
Mina favoriter + Mest installerade (Sprint 5 / V3 + V5)
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

**V1 (Sprint 1):**

```
/for-dig
├── Hälsning + fokusfråga ("Vad vill du fokusera på just nu?")
├── Utvecklingsmål (6 kort)
│   ├── Primära (Aktivera-knapp — Sprint 2)
│   └── Sekundära (Utforska → detalj)
├── Rekommenderat för [barn] (enkel åldersfiltrering)
└── Länk: "Visa hela biblioteket" → /library
```

**V3 + V5 (Sprint 5) — utökad:**

```
/for-dig
├── Hälsning + fokusfråga
├── Mina favoriter (V3)
├── Mest installerade (V5)
├── Utvecklingsmål (6 kort)
├── Rekommenderat för [barn] (V4)
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

## 6. Sprint 1 — MVP (V1: Startsida & statisk config)

**Produktversion V1** levererar `/for-dig` som problemorienterad ingång: hälsning, fokusfrågan *"Vad vill du fokusera på just nu?"*, sex utvecklingsmål från hårdkodad `for-dig-config.js`, Utforska-detaljvy och enkel åldersfiltrerad rekommendationssektion (statiska `highlightActivities` — ingen copy-logik ännu). **Aktivera** kan vara stub eller disabled tills Sprint 2.

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

## 7. Sprint 2 — Aktiveringsflöde (V2: Paket, copy & intent)

**Produktversion V2** kopplar **Aktivera** till befintlig standardbibliotek-copy (`schedule` + `activityNames` + `rewardNames`), barnväljare, bekräftelse och success-toast. Vid lyckad aktivering visas **intent-feedback** (§19.2 A) — första steget i lärsystemet.

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

### 7.4 Helrutin-semantik — sektionsspecifik merge (v1)

**Status:** Designspec klar (2026-07-01). **Implementation:** separat PR — ej i designspec-PR.

**Normativa dokument:**

| Dokument | Innehåll |
|----------|----------|
| [`helrutin-semantik-spec.md`](helrutin-semantik-spec.md) | Sektioner, append/replace, konflikter, preview-copy, DoD |
| [`helrutin-semantik-adr.md`](helrutin-semantik-adr.md) | Låsta beslut |

**Sammanfattning (v1):**

- Mål med `scheduleName` (**helrutin**) får **aldrig** ersätta hela dagen.
- Paket påverkar endast **en sektion**: `morgon`, `kvall`, eller `dag` (produkt: **Skola** för skolansvar).
- **Append** om målsektionen är tom; **replace (sektion)** om den redan har aktiviteter.
- Övriga sektioner på samma dag **behålls alltid**.
- Preview före aktivering ska säga exakt vilken sektion som ändras och vad som behålls.

| Mål | `scheduleName` | `scheduleSection` |
|-----|----------------|-------------------|
| Trygga kvällar | Kvällsrutin | `kvall` |
| Bra morgnar | Kort morgon | `morgon` |
| Skolansvar | Skola vardag | `dag` (copy: Skola) |

**Idag (pre-fix):** `copySchedule` med `overwrite: true` raderar alla items på valda dagar — se ADR §1.

**Content-sync (#476):** stängd. Avslut: [`for-dig-content-sync-476-closure.md`](for-dig-content-sync-476-closure.md).

---

## 8. Sprint 3 — Personifiering & data (V4 + V5-förberedelse)

**Produktversion V4** gör *"Rekommenderat för [barn]"* till en riktig personaliseringsmotor: åldersfiltrering, dölj mål utanför spann, sortering per barn, redan-aktiverad-indikator. **V5-förberedelse:** `for_dig_goal_install` + aggregat för *"Mest installerade"* / *"Populärt just nu"* (full data-driven sortering i Sprint 5).

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

## 9. Sprint 4 — Navigation (ingen ny V-version)

**Status (v1):** **Deferred till v1.1** — se `docs/decisions/for-dig-sprint4-defer.md`. Metrics enligt §9.1 ej verifierade; ingen nav-omläggning i v1 Completion Program.

**Engineering Sprint 4** är ren produktnavigering — ingen ny produktversion. Flyttar För dig till primär bottom nav och Bibliotek under *Mer* när metrics motiverar det (§9.1). Befintliga användare påverkas av synlighet, inte av ny funktionalitet (§22).

### 9.1 Förutsättning

Mätning visar att För dig används.

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

## 9.5 Sprint 5 — Favoriter & populär sortering (V3 + V5)

**Produktversion V3** introducerar **Mina favoriter** på `/for-dig` och utökar `is_favorite` till utvecklingsmål, scheman och belöningar — inte bara aktiviteter. **Produktversion V5** fullföljer data-driven discovery med sektionen *"Mest installerade"* sorterad på `install_count` från `for_dig_goal_install`.

### 9.5.1 V3 — Mina favoriter

**Placering på `/for-dig`:**

```
Mina favoriter
  ⭐ Trygga kvällar          [Aktivera]
  ⭐ Kvällsrutin (schema)    [Öppna schema]
  ⭐ Extra saga (belöning)   [Öppna Skattkammaren]
```

**Beteende:**

- Favoritmarkering (★) på lösningskort, biblioteksrader och schema-/belöningsrader
- Favoriter visas överst på För dig-sidan, före fokusfrågan eller direkt under hälsningen
- Tom state: *"Spara favoriter med stjärnan — då hittar du dem här."*
- Max 12 favoriter synliga; resten bakom *"Visa alla favoriter"*

### 9.5.2 Utökning av `is_favorite`

| Entitet | Idag | Sprint 5 |
|---------|------|----------|
| `activity_template` | `is_favorite BOOLEAN` ✅ | Oförändrat — redan i bibliotek |
| `weekly_schedule` | saknas | Ny kolumn `is_favorite BOOLEAN DEFAULT false` |
| `reward` | saknas | Ny kolumn `is_favorite BOOLEAN DEFAULT false` |
| Utvecklingsmål (config) | saknas | Ny tabell `for_dig_goal_favorite` (family_id, parent_id, goal_slug) |

**API:**

```
PATCH /api/activities/:id        { is_favorite: true }   — befintligt
PATCH /api/schedules/:id         { is_favorite: true }   — nytt
PATCH /api/rewards/:id           { is_favorite: true }   — nytt
POST  /api/for-dig/favorites     { goal_slug }           — toggle mål-favorit
GET   /api/for-dig/favorites     → { goals[], schedules[], rewards[], activities[] }
```

**Analytics:** `for_dig_favorite_toggle` med `entity_type`, `entity_id`, `goal_slug`.

### 9.5.3 V5 — Mest installerade

Bygger på `for_dig_goal_install` (Sprint 3):

```
Mest installerade just nu
  1. 🌙 Trygga kvällar      — 89 familjer
  2. ☀️ Bra morgnar         — 67 familjer
  3. 🎒 Skolansvar          — 41 familjer
```

- Sortering: `COUNT(DISTINCT family_id)` senaste 90 dagarna (konfigurerbart i admin)
- Visa endast om ≥3 mål har `install_count >= 5` (undvik tom/skammande lista tidigt)
- Badge på kort: *"Populärt"* om målet är topp-3 globalt
- Admin: aggregerad vy i befintlig För dig-admin (§19.5) — flik *Installationer*

### 9.5.4 Filer (Sprint 5)

| Fil | Ansvar |
|-----|--------|
| `migrations/*_for_dig_favorites.js` | `for_dig_goal_favorite` + kolumner på schedule/reward |
| `db/for-dig-favorites.js` | CRUD favoriter, aggregerad install_count |
| `src/routes/for-dig.js` | `GET/POST /favorites`, utöka activate med install-logg |
| `public/js/for-dig.js` | Mina favoriter-sektion, ★-toggle, Mest installerade |
| `public/js/library.js` | ★ på schema- och belöningsrader |
| `public/css/for-dig.css` | Favorit- och populär-badges |

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

Se **§22** för detaljerad plan per sprint (befintliga användare, kommunikation).

1. `dev` — endast familjer med `family_features.for_dig` (Sprint 1–2)
2. Intern dogfood → utökad dogfood (Sprint 2)
3. `live` — alla familjer (Sprint 3)
4. Sprint 4 nav — efter metrics, alla `live`-användare
5. Sprint 5 favoriter + populärt — direkt `live`, ingen separat gate

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
| `for_dig_favorite_toggle` | Favorit togglad (Sprint 5) | `entity_type`, `entity_id`, `goal_slug`, `is_favorite` |
| `for_dig_install_logged` | Install registrerad (Sprint 3+) | `goal_slug`, `child_id` |

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
3. **ADHD-stöd:** Eget mål i V2+ när admin-innehåll finns
4. **Alias `/upptack`:** A/B mot `/for-dig`?
5. **Favoriter-gräns:** 12 synliga räcker, eller paginering direkt? (Sprint 5)
6. **Populärt-fönster:** 90 dagar default — justerbart i admin? (Sprint 5)

---

## 17. Implementation-checklista

Checklistan täcker alla fem engineering-sprints mappade till produktversioner V1–V5 (se §21).

### Sprint 1 — V1: Startsida & statisk config

**Mål:** Föräldern ser problemorienterad ingång med sex mål — utan backend-aktivering.

- [ ] `docs/for-dig-spec.md` (denna fil, inkl. §21–§22)
- [ ] `public/for-dig.html` — auth-gate, layout, script-tags
- [ ] `public/js/for-dig-config.js` — alla 6 mål med `scheduleName`, `activityNames`, `rewardNames`, `highlightActivities`
- [ ] `public/js/for-dig.js` — render hälsning, fokusfråga, 6 kort, Utforska-detaljvy (inline/modal)
- [ ] `public/css/for-dig.css` — kort, CTA 44px, mörkt läge (valfritt om befintlig CSS räcker)
- [ ] Feature `for_dig` i `scripts/seed-features.js` (`status: 'dev'`)
- [ ] Sidebar-länk *För dig* på `dashboard.html`, `library.html`, ev. `schedule.html`
- [ ] Dashboard-CTA (valfritt): *"Vad vill du fokusera på?"* → `/for-dig`
- [ ] Enkel *Rekommenderat för [barn]* — `calcAge()` + filtrera config `ageMin`/`ageMax`, visa `highlightActivities` (statiska strängar)
- [ ] Aktivera-knapp: disabled eller toast *"Kommer snart"* tills Sprint 2
- [ ] `public/sw.js` — CACHE_NAME bump
- [ ] Analytics: `for_dig_page_view`, `for_dig_goal_expand`
- [ ] Manuell test: §14.1 (oinloggad redirect, 6 kort, birthday-rekommendation, feature gate)

### Sprint 2 — V2: Paket, copy & intent-feedback

**Mål:** Aktivera kopierar innehåll till barnets schema; intent samlas in direkt efter.

- [ ] Aktiverings-orchestrator i `for-dig.js` (eller `POST /api/for-dig/:slug/activate`)
- [ ] Barnväljare-modal om flera barn
- [ ] Bekräftelsedialog (*"Aktivera … för [barn]?"*) med `overwrite: true`-varning
- [ ] Spinner + success-toast per mål (målspecifik copy)
- [ ] Sekundär CTA *"Visa schema"* → `/schedule?child=…`
- [ ] `days`-mapping per mål (§7.2 tabell)
- [ ] Namn-matchning mot `default_schedule` / aktiviteter / belöningar
- [ ] Vänligt fel vid tomt admin-bibliotek (inte 500)
- [ ] Analytics: `for_dig_activate_click`, `for_dig_activate_success`, `for_dig_activate_fail`
- [ ] Migration `for_dig_goal_feedback` (§19.3)
- [ ] `db/for-dig-goal-feedback.js` — insert intent/outcome/suggestion
- [ ] `src/routes/for-dig.js` — `POST /api/for-dig/feedback`
- [ ] Intent-modal efter success-toast (§19.2 A) — obligatoriskt 1-klick, fem val
- [ ] Analytics: `for_dig_feedback_intent`
- [ ] `test/for-dig-config.test.js` — config-validering
- [ ] Integrationstest: aktivering mot standard-library (mock DB)

### Sprint 3 — V4 + V5-förberedelse: Personifiering, install_count & lärsystem

**Mål:** *Rekommenderat för [barn]* blir smart; install-logg startar; outcome + admin-UI live.

- [ ] Migration `for_dig_goal_install` (§8.2)
- [ ] Logga install vid lyckad aktivering (`goal_slug`, `family_id`, `child_id`)
- [ ] *Rekommenderat för [barn]* — dölj mål utanför ålder, sortera relevanta först
- [ ] Redan aktiverad-indikator (heuristik: schedule-namn i barnets veckoschema)
- [ ] Ev. `child.schema_type` i sortering om satt
- [ ] Förhandsvisning *Populärt just nu* — enkel topp-3 om data finns (full V5 i Sprint 5)
- [ ] 7-dagars outcome-banner på dashboard (§19.2 B) — mönster `activation-program-banner.js`
- [ ] `GET /api/for-dig/feedback/pending` — mål som väntar på outcome
- [ ] Villkorlig fritext efter outcome (§19.2 C)
- [ ] *Föreslå förbättring* på varje lösningskort (§19.2 D)
- [ ] Analytics: `for_dig_feedback_outcome`, `for_dig_feedback_suggestion`
- [ ] Admin-sektion **För dig** i `public/admin/index.html` (§19.5)
- [ ] `public/admin/admin-for-dig.js` — KPI, tabell, citatvägg, väntar på outcome
- [ ] `src/routes/admin/for-dig.js` — `GET /api/admin/for-dig/stats`, `/responses`
- [ ] `db/for-dig-goal-feedback.js` — `getAdminStats()`, `listResponses()`
- [ ] Acceptanskriterier admin (§19.5) — alla checkboxar

### Sprint 4 — Navigation (ingen V-version)

**Mål:** För dig blir primär nav-flik; Bibliotek flyttas under *Mer* — endast efter metrics.

- [ ] Verifiera metrics (§9.1): page views vecka 2+, aktiverings-rate, bibliotek-trend
- [ ] `dashboard.html` bottom nav: **Bibliotek** → **För dig** (`/for-dig`)
- [ ] `public/js/platform-tab-bar.js` — Bibliotek under *Mer*
- [ ] Sidebar: För dig prominent, Bibliotek under *Avancerat*
- [ ] Uppdatera deep links / onboarding-CTA som pekade på `/library` där det passar
- [ ] `public/sw.js` — cache bump
- [ ] Kommunikation till befintliga användare (§22.4) — dagens nyhet eller in-app-banner
- [ ] Analytics: jämför `for_dig_page_view` före/efter nav-byte

### Sprint 5 — V3 + V5: Favoriter & Mest installerade

**Mål:** Föräldrar sparar favoriter; populära mål visas data-drivet.

- [ ] Migration: `for_dig_goal_favorite` + `is_favorite` på `weekly_schedule` och `reward`
- [ ] `db/for-dig-favorites.js` — toggle, lista per familj/förälder
- [ ] `PATCH` endpoints för schedule/reward `is_favorite`
- [ ] `GET/POST /api/for-dig/favorites`
- [ ] *Mina favoriter*-sektion överst på `/for-dig` (§9.5.1)
- [ ] ★-toggle på lösningskort, biblioteksaktiviteter, scheman, belöningar
- [ ] Tom state + *Visa alla favoriter* vid >12
- [ ] *Mest installerade*-sektion med `install_count` aggregat 90d (§9.5.3)
- [ ] *Populärt*-badge på topp-3 mål
- [ ] Admin-flik *Installationer* i `admin-for-dig.js`
- [ ] Analytics: `for_dig_favorite_toggle`
- [ ] Manuell test: favorit sparas, syns på För dig + bibliotek, Mest installerade sorteras korrekt

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
| `src/routes/for-dig.js` | Parent: feedback + pending |
| `src/routes/admin/for-dig.js` | Admin: stats + svar-lista |
| `public/admin/admin-for-dig.js` | Admin-gränssnitt — presentera alla svar |

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

**Admin (kräver `requireAdmin`):**

```
GET /api/admin/for-dig/stats
→ {
    goals: [{
      slug, title,
      intent_count, outcome_count, suggestion_count,
      outcome_positive,  // score 3–4
      outcome_neutral,   // score 2
      outcome_negative,  // score 1
      intent_breakdown: { mindre_tjat: N, ... }
    }],
    totals: { families_with_feedback, responses_7d }
  }

GET /api/admin/for-dig/responses?goal_slug=&phase=&outcome_min=&limit=50&offset=0
→ {
    rows: [{
      id, created_at,
      goal_slug, goal_title,
      phase, intent_reason, intent_label,   // svensk etikett
      outcome_score, outcome_emoji,         // 😊 🙂 😐 🙁
      free_text,
      child_name, child_age,
      parent_email,                         // för manuell uppföljning
      family_id
    }],
    total
  }
```

Validering:

- `intent_reason` måste vara ett av de fem tillåtna värdena
- `outcome_score` måste vara 1–4
- `free_text` max 500 tecken
- Upsert `free_text` på befintlig outcome-rad om uppföljning kommer direkt efter score

### 19.5 Admin-gränssnitt — presentera alla svar

**Krav:** Alla svar från intent-, outcome- och suggestion-frågorna ska vara **läsbara i admin** — inte bara via SQL. Detta är primär källa för produktinsikt vid 140 familjer.

#### Placering

Ny admin-sektion: **För dig** (`#for-dig` i `public/admin/index.html`)

- Sidebar-länk efter **Föräldraaktivering** / **Retention**
- Mönster: samma layout som `admin-activation-program.js` (KPI-kort + tabeller)

#### Vy 1 — Översikt per utvecklingsmål

KPI-kort per `goal_slug`:

```
🌙 Trygga kvällar
  42 aktiveringar (intent)
  27 svar efter 7 dagar (outcome)
  14 positiva (😊/🙂)  ·  8 neutrala  ·  5 negativa
  6 förbättringsförslag
```

Under kortet: **intent-fördelning** (horisontell stapel eller lista):

| Anledning | Antal |
|-----------|-------|
| Mindre tjat | 18 |
| Tydligare rutiner | 12 |
| … | |

Klick på mål → filtrerar Vy 2 till det målet.

#### Vy 2 — Alla svar (tabell)

Sorterbar tabell med en rad per feedback-post:

| Datum | Mål | Fas | Svar | Fritext | Barn | Ålder | Förälder |
|-------|-----|-----|------|---------|------|-------|----------|
| 2026-06-10 | Trygga kvällar | outcome | 😊 | "Nu går läggningen utan bråk." | Astrid | 4 år | anna@… |
| 2026-06-03 | Trygga kvällar | intent | Mindre tjat | — | Astrid | 4 år | anna@… |
| 2026-06-08 | Bra morgnar | suggestion | — | "Behöver helg-variant" | — | — | erik@… |

**Filter:**

- Mål (`goal_slug`)
- Fas (`intent` | `outcome` | `suggestion`)
- Outcome (`positiva` = 3–4, `neutrala` = 2, `negativa` = 1)
- Endast rader med fritext
- Senaste 7 / 30 / 90 dagar

**Åtgärder per rad:**

- Kopiera e-post (för manuell uppföljning)
- Länk till familj i admin (impersonation / familj-vy om finns)

#### Vy 3 — Citatvägg (marknadsföring)

Automatisk lista: alla `free_text` där `phase = outcome` och `outcome_score >= 3`, senaste först.

```
"Nu går läggningen utan bråk."        — Trygga kvällar, 4 år, 2026-06-10
"Hon borstar tänderna själv nu."       — Självständighet, 5 år, 2026-06-08
```

Knapp **Kopiera alla** för att klistra in i marknadsmaterial.

#### Vy 4 — Väntar på outcome

Lista familjer med `intent` men utan `outcome` efter ≥7 dagar — kandidater för manuellt mejl (§19.6).

#### Etiketter i admin (svenska)

| `intent_reason` | Visas som |
|-----------------|-----------|
| `mindre_tjat` | Mindre tjat |
| `tydligare_rutiner` | Tydligare rutiner |
| `sjalvstandighet` | Självständighet |
| `mindre_stress` | Mindre stress |
| `annat` | Annat |

| `outcome_score` | Visas som |
|-----------------|-----------|
| 4 | 😊 Stor förbättring |
| 3 | 🙂 Lite bättre |
| 2 | 😐 Ingen skillnad |
| 1 | 🙁 Fungerar inte |

#### Filer (admin)

| Fil | Ansvar |
|-----|--------|
| `public/admin/index.html` | Sektion `#for-dig`, sidebar-länk, script-tag |
| `public/admin/admin-for-dig.js` | Ladda stats, render KPI, tabell, citatvägg |
| `db/for-dig-goal-feedback.js` | `getAdminStats()`, `listResponses(filters)` |
| `src/routes/admin/for-dig.js` | `GET /stats`, `GET /responses` |

#### Acceptanskriterier (admin)

- [ ] Admin ser aggregerad intent/outcome per mål utan SQL
- [ ] Varje enskilt svar (inkl. fritext) syns i tabell
- [ ] Positiva citat samlas på en vy för marknadsföring
- [ ] Förälder-e-post visas för manuell uppföljning (admin-only)
- [ ] Filter på mål, fas och outcome fungerar
- [ ] Tomt state: "Inga svar ännu" — inte fel

### 19.6 Manuell uppföljning

Bygg en lista över familjer som **faktiskt använt** lösningarna (intent + outcome). Admin-vyn **Väntar på outcome** (§19.5) är startpunkten — kontakta manuellt:

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

| Sprint | Produktversion | Feedback-leverans |
|--------|----------------|-------------------|
| Sprint 1 | V1 | — (ingen feedback ännu) |
| Sprint 2 | V2 | Intent-modal + migration + parent API |
| Sprint 3 | V4 (+ V5 prep) | Outcome-banner + föreslå förbättring + **admin-gränssnitt (§19.5)** |
| Sprint 4 | — | Ingen ny feedback — nav-byte endast |
| Sprint 5 | V3 + V5 | Admin-flik *Installationer*; favoriter påverkar inte feedback-flödet |

Uppskattad insats:

- Parent feedback (intent/outcome/suggestion): **2–3 timmar**
- Admin-gränssnitt (stats + tabell + citatvägg): **3–4 timmar**

---

## 20. Sammanfattning

För dig är **inte** ny funktionalitet under huven. Det är översättningen från:

> *"Här är våra scheman, aktiviteter och belöningar"*

till:

> *"Här är lösningen på ditt problem — och så här bra kan det bli för barnet."*

**Produktroadmap V1–V5** bygger i lager: statisk ingång (V1) → aktivering + intent (V2) → favoriter (V3) → barnspecifik rekommendation (V4) → populär sortering (V5). **Engineering Sprints 1–5** mappar dit med Sprint 4 som ren navigationsomläggning. Se §21 för fullständig matris.

Högsta UX-avkastning per utvecklingstimme: en sida, sex hårdkodade mål, befintlig copy-logik, föräldraspråk — plus ett lärsystem som svarar *"hjälpte det?"* istället för *"gillar du det?"*.

---

## 21. Master roadmap (V1–V5 × Sprints 1–5)

### 21.1 Produktversioner — översikt

| Version | Namn | Kärnlöfte | Primär sprint |
|---------|------|-----------|---------------|
| **V1** | Startsida | *"Vad vill du fokusera på just nu?"* — 6 utvecklingsmål, statisk config | Sprint 1 |
| **V2** | Aktivera | Paket kopplade till copy-logik; intent-feedback vid aktivering | Sprint 2 |
| **V3** | Favoriter | *Mina favoriter* + `is_favorite` på mål, scheman, belöningar | Sprint 5 |
| **V4** | Rekommenderat | *"Rekommenderat för [barn]"* — åldersfiltrering, redan aktiverad, smart sortering | Sprint 3 |
| **V5** | Populärt | *"Mest installerade"* — data-driven sortering via `install_count` | Sprint 3 (prep) + Sprint 5 (full) |

**OBS:** Sprint 4 har ingen motsvarande V-version — det är navigationsomläggning efter mätning.

### 21.2 Matris — V-version × Engineering Sprint

|  | **Sprint 1** | **Sprint 2** | **Sprint 3** | **Sprint 4** | **Sprint 5** |
|--|:---:|:---:|:---:|:---:|:---:|
| **V1** Startsida & 6 mål | ● **Primary** | ○ underhåll | ○ underhåll | ○ underhåll | ○ underhåll |
| **V2** Aktivera + copy | ○ stub/disabled | ● **Primary** | ○ underhåll | — | — |
| **V3** Mina favoriter | — | — | — | — | ● **Primary** |
| **V4** Rekommenderat för [barn] | ◐ enkel filter | ◐ oförändrat | ● **Primary** | — | ○ underhåll |
| **V5** Mest installerade | — | — | ◐ install_count + preview | — | ● **Primary** |
| **Nav** Primär flik För dig | — | — | — | ● **Primary** | — |
| **Feedback** Intent | — | ● intent | — | — | — |
| **Feedback** Outcome + admin | — | — | ● outcome + §19.5 | — | ○ install-flik |

**Förklaring:** ● Primary = huvudleverans · ◐ Delvis = förberedelse eller enkel variant · ○ Underhåll = bugfix/copy · — = ej i scope

### 21.3 Engineering Sprints — sammanfattning

| Sprint | Produktversion(er) | Leverans i ett stycke |
|--------|-------------------|------------------------|
| **1** | V1 | `/for-dig`-sida, `for-dig-config.js` med 6 mål, Utforska-detaljvy, enkel åldersrekommendation, feature gate, sidebar-länk. Aktivera stub. |
| **2** | V2 | Copy-orchestrator mot standardbibliotek, barnväljare, bekräftelse/toast, `for_dig_goal_feedback` + intent-modal. |
| **3** | V4, V5 prep | Smart *Rekommenderat för [barn]*, `for_dig_goal_install`, redan aktiverad-badge, outcome-banner, admin För dig-UI (§19.5), förhandsvisning populärt. |
| **4** | — (nav) | Bottom nav: För dig ersätter Bibliotek; Bibliotek under *Mer*. Kräver metrics (§9.1). |
| **5** | V3, V5 | `for_dig_goal_favorite`, `is_favorite` på schema/belöning, *Mina favoriter*-sektion, *Mest installerade* med full sortering. |

### 21.4 Beroendekedja

```
V1 (Sprint 1) ──► V2 (Sprint 2) ──► V4 (Sprint 3) ──► V5 full (Sprint 5)
                      │                    │
                      └──── intent ────────┴──── outcome + admin
                                           │
Sprint 4 (nav) ◄── metrics ────────────────┘ (parallellt efter Sprint 3)

V3 (Sprint 5) ◄── kan starta efter Sprint 2; oberoende av Sprint 4
```

### 21.5 Uppskattad insats per sprint

| Sprint | Insats (indikativt) | Blockerare |
|--------|---------------------|------------|
| 1 | 1–2 dagar | Feature gate, tom admin-bibliotek lokalt |
| 2 | 2–3 dagar | `default_schedule` namn synkade med config |
| 3 | 3–4 dagar | Sprint 2 live; admin-mönster från aktiveringsprogram |
| 4 | 0,5–1 dag | Metrics + produktbeslut |
| 5 | 2–3 dagar | Sprint 3 `install_count`; migration för favoriter |

---

## 22. Befintliga användare — rollout per sprint

### 22.1 Princip

Befintliga familjer (~140+) ska **aldrig** få en trasig eller tom upplevelse. Varje sprint har tydlig feature-gate-, synlighets- och kommunikationsplan.

### 22.2 Vad de ser — sprint för sprint

| Sprint | Feature gate | Vad befintliga användare ser | Vad de *inte* ser ännu |
|--------|--------------|------------------------------|-------------------------|
| **1** | `for_dig` = `dev` | Endast familjer med `family_features.for_dig`: ny sidebar-länk *För dig*, startsida med 6 mål. Aktivera disabled/stub. | Intent, outcome, favoriter, primär nav |
| **2** | `dev` → utökad dogfood | Dogfood-familjer: **Aktivera** fungerar; intent-modal efter aktivering. Övriga: oförändrat. | Outcome-banner, admin-insikt, favoriter |
| **3** | `dev` → **`live`** (alla) | Alla inloggade föräldrar: `/for-dig` med smart rekommendation, aktivering, outcome-banner (7d), *Föreslå förbättring*. Sidebar-länk för alla. | Favoriter, *Mest installerade* (full), primär nav |
| **4** | `live` | Alla: **För dig** i bottom nav (ersätter Bibliotek). Bibliotek under *Mer*. | Ingen ny funktion — endast synlighet |
| **5** | `live` | Alla: *Mina favoriter*, ★ på bibliotek/schema/belöning, *Mest installerade*-sektion. | — |

### 22.3 Rollout-steg (feature flag)

1. **Sprint 1:** `status: 'dev'` — 3–5 interna familjer via `family_features`
2. **Sprint 2:** Utöka dogfood till ~15 familjer; samla intent-data
3. **Sprint 3:** `status: 'live'` i `seed-features.js` — alla nya + befintliga familjer får åtkomst automatiskt (ingen `family_features`-rad krävs)
4. **Sprint 4:** Nav-byte för **alla** `live`-användare samtidigt (undvik A/B på nav — förvirrande)
5. **Sprint 5:** Direkt `live` — favoriter och populärt kräver ingen separat gate

### 22.4 Kommunikation per sprint

| Sprint | Kanal | Budskap (exempel) |
|--------|-------|-------------------|
| **1** | — | Ingen extern kommunikation (intern dogfood) |
| **2** | Slack/mejl till dogfood | *"Testa Aktivera på För dig — vi vill veta varför ni valde målet (1 klick)."* |
| **3** | Dagens nyhet + valfri push | *"Nytt: För dig hjälper dig lösa kvällskaos, morgonkaos och mer — utan att bygga schema själv."* |
| **3** | Dashboard-banner (7d) | Outcome-fråga — ingen separat nyhet behövs |
| **4** | Dagens nyhet | *"För dig finns nu direkt i menyn. Biblioteket finns kvar under Mer."* |
| **5** | Dagens nyhet (kort) | *"Spara favoriter med stjärnan — och se vad andra familjer aktiverar mest."* |

### 22.5 Risker för befintliga användare

| Risk | Sprint | Mitigering |
|------|--------|------------|
| Aktivera skriver över anpassat schema | 2+ | Bekräftelsedialog; tydlig copy om `overwrite` |
| Power users hittar inte Bibliotek | 4 | Bibliotek kvar under *Mer*; dagens nyhet 48h före nav-byte |
| Tom *Mest installerade*-lista | 5 | Visa sektion endast om ≥3 mål med `install_count >= 5` |
| Förvirring mellan Bibliotek och För dig | 3 | Tydlig *"Visa hela biblioteket"*-länk; olika språk (problem vs verktyg) |

### 22.6 Onboarding vs befintliga

| Användartyp | Första kontakt med För dig |
|-------------|---------------------------|
| Ny registrering (post Sprint 3) | Dashboard-CTA vecka 2 eller efter onboarding |
| Befintlig aktiv familj | Dagens nyhet Sprint 3 + sidebar-länk |
| Befintlig inaktiv familj | Win-back-mejl kan länka till `/for-dig` med konkret mål (t.ex. kvällsrutin) |
| Pedagog-only-konto | Ingen åtkomst (`requireNotPedagogOnly` — samma som bibliotek) |
