# Family Journey — Implementation Contract

**Version:** 0.9  
**Status:** Utkast — väntar på godkännande  
**Föregås av:** [Family Journey Model RFC](./family-journey-model-rfc.md)

Syfte: teknisk sanning för implementation. Om RFC och detta dokument motsäger varandra — RFC vinner på domän, detta dokument vinner på tekniska detaljer.

**Regel:** Ingen ny journey-logik implementeras innan detta contract är godkänt. Buggfixar och orelaterade förändringar påverkas inte.

---

# Scope

## Fas 1 (denna contract)

| Ingår | Ingår inte |
|-------|------------|
| Datamodell: `family.journey_phase`, `family_milestones` | Övriga livsfaser i kod (DISCOVERING, ESTABLISHED_ROUTINE, …) |
| `GET /api/me/journey-context` | Push/e-post-migrering |
| Event-ingestion → milstolpar | Full avveckling av `parent_activation_program` |
| Migreringsplan från activation-program | Experience Registry som separat CMS (Fas 1: statisk JSON i repo) |
| Kodspec för onboarding 5–6, handoff, first_success | Admin-vyer |

## Fas 1 produktmål

```
SETTING_UP  →  FIRST_USE  →  first_success  →  BUILDING_ROUTINE
```

- Omskriv onboarding steg 5–6 (copy + flöde)
- Ersätt "Gå till dashboarden" med "Låt barnet börja"
- Nya milstolpar: `handoff_started`, `handoff_deferred`, `child_logged_in`
- `first_success` som firande-klimax (inte dashboard)

---

# 1. Datamodell

## 1.1 `family.journey_phase`

Kolumn på befintlig `family`-tabell.

```sql
ALTER TABLE family
  ADD COLUMN IF NOT EXISTS journey_phase VARCHAR(32) NOT NULL DEFAULT 'SETTING_UP'
    CHECK (journey_phase IN (
      'DISCOVERING',
      'SETTING_UP',
      'FIRST_USE',
      'BUILDING_ROUTINE',
      'ESTABLISHED_ROUTINE',
      'EXPANDING',
      'INDEPENDENCE'
    ));

CREATE INDEX IF NOT EXISTS idx_family_journey_phase
  ON family (journey_phase);
```

**Skrivregler:**

- Endast domänlagret (`src/lib/journey/`) får uppdatera `journey_phase`
- Klienter läser via Journey Context — aldrig direkt PATCH på fas
- Befintliga familjer backfillas vid migration (se §1.4)

## 1.2 `family_milestones`

Append-only historik.

```sql
CREATE TABLE IF NOT EXISTS family_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  milestone     VARCHAR(64) NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  child_id      UUID REFERENCES child(id) ON DELETE SET NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  source        VARCHAR(32) NOT NULL DEFAULT 'system'
    CHECK (source IN ('system', 'analytics', 'admin', 'backfill')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT family_milestones_unique UNIQUE (family_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_family_milestones_family
  ON family_milestones (family_id, occurred_at);
```

**Milstolpe-nycklar (Fas 1):**

| `milestone` | Beskrivning |
|-------------|-------------|
| `account_created` | Konto registrerat |
| `child_created` | Barn skapat |
| `routine_ready` | Schema sparat |
| `rewards_ready` | Belöningar sparade |
| `handoff_started` | Förälder startade barninloggning |
| `handoff_deferred` | Förälder valde senare |
| `child_logged_in` | Barn autentiserat |
| `child_first_completion` | Första avcheckning (barn) |
| `parent_saw_completion` | Förälder såg completion |
| `first_success` | North Star (se §1.3) |

**Insert-regel:** `ON CONFLICT (family_id, milestone) DO NOTHING` — milstolpar är idempotenta.

**Metadata (exempel):**

```json
{
  "child_id": "uuid",
  "daily_log_item_id": "uuid",
  "activity_name": "Borsta tänder",
  "analytics_event_id": "optional",
  "hours_since_completion": 1.2
}
```

## 1.3 `first_success` — domänregel

```
first_success ⇔ ∃ child_first_completion ∧ ∃ parent_saw_completion
```

- Sätts av domänlagret när **båda** milstolpar finns
- `occurred_at` = senare av de två tidsstämplarna
- Vid `first_success`: `journey_phase` → `BUILDING_ROUTINE`
- **Inte** samma som `parent.onboarding_completed`

## 1.4 Backfill (migration)

| Befintlig signal | Milstolpe | Fas efter backfill |
|------------------|-----------|-------------------|
| `family.created_at` | `account_created` | — |
| `child` finns | `child_created` | — |
| `weekly_schedule` finns | `routine_ready` | — |
| `reward` finns | `rewards_ready` | — |
| `family_activation_state.first_completion_at` | `child_first_completion` | — |
| `parent_seen_completion` finns | `parent_saw_completion` | — |
| Båda completion-milstolpar | `first_success` | `BUILDING_ROUTINE` |
| `child_access_completed_at` | `child_logged_in` (om barn faktiskt loggat in — annars utelämnas) | — |
| Annars: `onboarding_completed` + schema | — | `FIRST_USE` |
| Annars: pågående onboarding | — | `SETTING_UP` |
| `first_success` finns | — | `BUILDING_ROUTINE` |

Familjer med aktivt `parent_activation_program` behåller fas enligt tabell ovan; programmet påverkar inte `journey_phase` i Fas 1.

## 1.5 Relation till `family_activation_state`

| Idag | Blir |
|------|------|
| `family_activation_state` | Ersätts gradvis av `journey_phase`; historik och analys bygger på `family_milestones` |
| `family_milestones` | **Primär historik** för Journey Model |
| `family.journey_phase` | **Primär fas** |

Under övergången (Fas 1): befintliga schedulers och P0-metrics kan läsa `family_activation_state` tills de migreras. Nya features skriver endast milstolpar och uppdaterar `journey_phase` — inte `family_activation_state`.

## 1.6 `onboarding_completed` (oförändrad semantik)

| Fält | Roll |
|------|------|
| `parent.onboarding_completed` | **Auth/infrastruktur** — får lämna `/onboarding` |
| `journey_phase` | **Produkt** — var familjen är |
| `first_success` milstolpe | **North Star KPI** |

I Fas 1: `POST /api/onboarding/complete` sätter fortfarande `onboarding_completed = true`, men onboarding UI ska **inte** presentera det som framgång — klimax är handoff → first_success.

---

# 2. API

## 2.1 `GET /api/me/journey-context`

**Auth:** `requireParent` (samma som övriga `/api/me/*` för förälder)

**Svar:** tunt Journey Context — **ingen copy**.

```json
{
  "phase": "FIRST_USE",
  "milestones": {
    "account_created": "2026-06-28T09:00:00.000Z",
    "routine_ready": "2026-06-28T10:00:00.000Z",
    "rewards_ready": "2026-06-28T10:05:00.000Z"
  },
  "recommended_experiences": ["handoff_to_child"],
  "blocking_experience": "handoff_to_child",
  "celebration": null,
  "priority": "handoff",
  "registry_version": "2026-06-28-v1"
}
```

**Fel:**

| Status | Kropp |
|--------|-------|
| 401 | `{ "error": "Ej inloggad" }` |
| 503 | `{ "error": "journey_disabled", "legacyEndpoint": "/api/family/readiness" }` (feature flag av) |

**Implementation:**

```
src/routes/journey-context.js     → router
src/lib/journey/evaluator.js      → phase + experiences + priority
src/lib/journey/milestones.js     → läs/skriv milstolpar
config/journey-experience-registry.json  → copy (Fas 1)
```

**Feature flag:** `family_journey_context_api` (default `false` tills Fas 1 go-live)

**Klient:** valfritt `GET /api/me/journey-context/experience/:key` som slår upp Registry — eller klienten laddar hela Registry vid appstart (versionerad, cachebar).

## 2.2 `POST /api/me/journey-context/events` (Fas 1 — client intents)

Tunna klientintents som mappas till milstolpar. **Inte** generell analytics-dump.

| `intent` | Milstolpe | Trigger i UI |
|--------|-----------|--------------|
| `handoff_started` | `handoff_started` | Klick "Låt barnet börja" / `DashboardChildHandoff.startChildLogin` |
| `handoff_deferred` | `handoff_deferred` | "Senare" / hoppa över handoff |

Server validerar fas (`FIRST_USE` eller `SETTING_UP`) och idempotens.

**Alternativ:** dessa kan triggas server-side från befintliga analytics-ingest — se §3.

## 2.3 Befintliga API:er (oförändrade i Fas 1)

| API | Förändring |
|-----|------------|
| `POST /api/onboarding/complete` | Ev. emit `routine_ready` om ej redan satt |
| `GET /api/family/first-success` | Parallell körning — ej borttagen |
| `/api/me/activation-program/*` | Oförändrad tills avveckling |

---

# 3. Event-ingestion

## 3.1 Princip

Befintliga analytics-events är **källor** till milstolpar. Analytics behåller sina namn; domänlagret översätter.

```
Event (analytics_events eller hook)
        ↓
journey/ingest.js
        ↓
family_milestones (idempotent insert)
        ↓
evaluator → ev. journey_phase update
        ↓
ev. first_success derivation
```

## 3.2 Mappning (Fas 1)

| Källa | Event / hook | Milstolpe | Plats idag |
|-------|--------------|-----------|------------|
| Registrering | `family` INSERT | `account_created` | `register.js` |
| Onboarding | barn skapat | `child_created` | `onboarding.js` route |
| Onboarding | schema sparat | `routine_ready` | `onboarding.js` route |
| Onboarding | belöning sparad | `rewards_ready` | `onboarding.js` route |
| Klient / handoff | `handoff_started` intent | `handoff_started` | **ny** — onboarding 5–6, `dashboard-child-handoff.js` |
| Klient | `handoff_deferred` intent | `handoff_deferred` | **ny** — onboarding |
| Barn auth | `child_login_success` | `child_logged_in` | `child-login.js` → analytics |
| Barn check-off | `child_first_completion` | `child_first_completion` | `activation-program-aha.js` hook *(avprogrammeras från program-krav)* |
| Förälder aha | `parent_first_completion_seen` | `parent_saw_completion` | `activation-program-aha.js` *(avprogrammeras från program-krav)* |
| Domän | båda finns | `first_success` | `journey/evaluator.js` |

## 3.3 Avkoppling från activation-program

Idag kräver `maybeTrackChildFirstCompletion` och `maybeTrackParentFirstCompletionSeen` aktivt `parent_activation_program`.

**Fas 1-ändring:**

1. Behåll analytics-eventnamn (`child_first_completion`, `parent_first_completion_seen`)
2. Flytta milstolpe-skrivning till `journey/ingest.js` — **utan** program-krav
3. `activation-program-aha.js` anropar journey-ingest efter analytics (eller journey-ingest lyssnar på samma hook)

```js
// journey/ingest.js — konceptuellt
async function onChildFirstCompletion({ familyId, childId, dailyLogItemId, activityName }) {
  await insertMilestone(familyId, 'child_first_completion', { child_id, daily_log_item_id, activity_name });
  await maybeDeriveFirstSuccess(familyId);
}
```

## 3.4 `parent_saw_completion` vs `parent_seen_completion`

| Begrepp | Lager |
|---------|-------|
| `parent_seen_completion` (tabell) | Operativ dedup — vilka items förälder dismissat |
| `parent_saw_completion` (milstolpe) | Domän — förälder såg **första** completion |

Milstolpen sätts vid första `parent_first_completion_seen` analytics-event (eller första `parent_seen_completion` insert om analytics saknas).

---

# 4. Migrering från `parent_activation_program`

## 4.1 Målbild (ej Fas 1-kod)

7-dagarsprogrammets **innehåll** (daglig coach-copy, påminnelser, reflektion) blir `recommended_experiences` under livsfas `BUILDING_ROUTINE` — styrt av Registry-regler, inte `program_type` + `effective_day`.

## 4.2 Fas 1 — coexistens

| Komponent | Fas 1 |
|-----------|-------|
| `parent_activation_program` tabell | Kvar |
| `/api/me/activation-program/*` | Kvar |
| `activation-program-banner.js` | Kvar för enrolled familjer |
| `activation-program-aha-card.js` | **Dual:** visa firande via Journey Context `celebration` när flag på; fallback till nuvarande poll |
| Enrollment efter onboarding | Kvar (ActivationProgramEnrollChoice) — **ej** blockerande för handoff |

## 4.3 Fas 2+ — avvecklingssteg

1. Sluta ny enrollment (`ACTIVATION_PROGRAM_ENABLED=false`)
2. Mappa dag 1–7 copy → Registry-nycklar `building_routine_day_1` … `_7`
3. Evaluator: om `phase === BUILDING_ROUTINE` && inga `handoff_*` kvar → rekommendera daglig experience
4. Arkivera tabell (soft — behåll för historisk kohortanalys)

## 4.4 Analytics-kontinuitet

Befintliga events behålls för Day 14-kohort:

- `activation_program_started`
- `child_first_completion` (metadata `program_id` valfritt efter avkoppling)
- `parent_first_completion_seen`

Nya rapporter kan gruppera på `family_milestones.first_success` istället för `activation_program_completed`.

---

# 5. Fas 1 — kodleverans

## 5.1 Nya filer

| Fil | Ansvar |
|-----|--------|
| `migrations/*_family_journey.js` | `journey_phase` + `family_milestones` |
| `db/family-milestones.js` | CRUD milstolpar |
| `src/lib/journey/evaluator.js` | Context-beräkning |
| `src/lib/journey/ingest.js` | Event → milstolpe |
| `src/lib/journey/phases.js` | Fasövergångsregler |
| `src/routes/journey-context.js` | API |
| `config/journey-experience-registry.json` | Copy (Fas 1) |
| `public/js/journey-context-client.js` | Fetch + Registry lookup |
| `public/js/journey-celebration.js` | Firande-modal från `celebration` key |
| `test/journey-context.test.js` | Domän + API |

## 5.2 Befintliga filer — ändringar

### `public/onboarding.html` + `public/js/onboarding.js`

| Nu | Efter |
|----|-------|
| Steg 5: "Så loggar ni in" (informativt) | Steg 5: handoff-förberedelse — PIN synlig, **primär CTA: "Låt barnet börja"** |
| Steg 6: "Nästan klart!" + inbjudan + "Gå till dashboarden" | Steg 6: valfri medförälder-inbjudan; **primär CTA: "Låt barnet börja"** (ej dashboard) |
| `step6Btn` → `/dashboard` | `step6Btn` → `handoff_started` → child-login flow |
| `onboarding_completed` vid steg 6 | Sätts **före** handoff (infrastruktur) men UI firar inte onboarding — väntar på Context |

**Copy (Registry-nycklar):**

| Nyckel | Rubrik | CTA |
|--------|--------|-----|
| `handoff_to_child` | `[Barn] är redo` | Låt barnet börja |
| `handoff_defer_confirm` | Barnet kommer igång snabbare om ni testar nu | Fortsätt ändå / Tillbaka |
| `celebrate_first_success` | `[Barn] klarade sin första uppgift!` | Toppen! |

### `public/js/dashboard-child-handoff.js`

- Behåll UX (native/mobile)
- Vid `startChildLogin()`: emit `handoff_started` (intent eller analytics)
- Om Journey Context API aktiv: visa endast när `recommended_experiences` innehåller `handoff_to_child` eller `priority === 'handoff'`
- **Ingen egen dismiss-logik som produktbeslut** — dismiss = `handoff_deferred` endast om användaren explicit väljer senare

### `src/lib/activation-program-aha.js`

- `maybeTrackChildFirstCompletion`: ta bort krav på aktivt program för milstolpe (behåll analytics metadata om program finns)
- Anropa `journey/ingest` efter analytics
- `maybeTrackParentFirstCompletionSeen`: samma

### `public/js/activation-program-aha-card.js`

- När `family_journey_context_api` på: poll `/api/me/journey-context` för `celebration === 'celebrate_first_success'` istället för `/api/me/activation-program/new-completions`
- Fallback till nuvarande beteende när flag av

### `public/js/onboarding-activation.js`

- **Avvecklas i Fas 1** till förmån för Journey Context-styrd handoff
- Flaggor `activation_child_handoff_v1` / `activation_first_star_guide_v1` ersätts av `family_journey_context_api`

### `public/js/child-login.js`

- Befintlig `child_login_success` analytics behålls
- Server-side: barn-login route emitter `child_logged_in` milstolpe (säkrare än endast klient)

## 5.3 Fasövergångar (Fas 1-regler)

```
account_created                                    → SETTING_UP
routine_ready ∧ rewards_ready                      → FIRST_USE
first_success                                      → BUILDING_ROUTINE
```

`SETTING_UP` → `FIRST_USE` kan ske vid `POST /api/onboarding/complete` om milstolpar saknas men schema finns.

## 5.4 Flödesdiagram (Fas 1)

```
Onboarding steg 1–4 (oförändrat)
        ↓
Steg 5–6: PIN + valfri inbjudan
        ↓
POST /api/onboarding/complete  (onboarding_completed=true)
journey_phase = FIRST_USE
        ↓
[Låt barnet börja] → handoff_started → /child-login
        ↓
child_login_success → child_logged_in
        ↓
Barn checkar av → child_first_completion
        ↓
Förälder ser resultat → parent_saw_completion
        ↓
first_success → BUILDING_ROUTINE
        ↓
celebrate_first_success (modal — INTE /dashboard)
```

## 5.5 Feature flags

| Flag | Default | Effekt |
|------|---------|--------|
| `family_journey_context_api` | `false` | API 503; legacy handoff/onboarding |
| `family_journey_onboarding_v1` | `false` | Nya steg 5–6 + CTAs |

Båda måste vara på för end-to-end Fas 1 i prod.

## 5.6 Testkrav (Fas 1)

| Test | Assert |
|------|--------|
| Milestone idempotens | Dubbel `child_login_success` → en rad |
| `first_success` derivation | completion + saw → milstolpe + fas BUILDING_ROUTINE |
| Context FIRST_USE | Saknar `child_logged_in` → `blocking_experience: handoff_to_child` |
| Context celebration | Efter first_success → `celebration: celebrate_first_success` |
| Backfill | Familj med `first_completion_at` → rätt milstolpar |
| API flag av | 503 + legacyEndpoint |
| Onboarding CTA | `step6Btn` text ≠ "Gå till dashboarden" när flag på |

Kör: `NODE_ENV=test npm run test:gate` + nya journey-tester.

## 5.7 SW / frontend

- Bump `CACHE_NAME` i `public/sw.js` vid JS-ändringar
- Lägg till `journey-context-client.js` i onboarding + dashboard script-listor

---

# 6. Experience Registry (Fas 1)

Statisk fil i repo — `config/journey-experience-registry.json`.

```json
{
  "version": "2026-06-28-v1",
  "experiences": {
    "handoff_to_child": {
      "tone": "coach",
      "headline": "{{child_name}} är redo",
      "body": "Låt barnet logga in med PIN och prova sin första rutin.",
      "cta": "Låt barnet börja",
      "route": "/child-login",
      "presentation": { "modal": false }
    },
    "celebrate_first_success": {
      "tone": "celebration",
      "headline": "{{child_name}} klarade sin första uppgift!",
      "body": "Fira tillsammans — det här är vad rutinen handlar om.",
      "cta": "Toppen!",
      "presentation": { "modal": true, "theme": "celebration" }
    }
  }
}
```

Variabler (`{{child_name}}`) resolves i klient eller thin server helper — **inte** i evaluator.

Framtida: Registry i DB/admin — utanför Fas 1.

---

# 7. Godkännandechecklista

- [ ] RFC godkänd
- [ ] North Star = `first_success` (inte `onboarding_completed`)
- [ ] Journey Context utan copy i API
- [ ] Fas 1 scope accepterat
- [ ] Coexistens med activation-program OK
- [ ] Copy "Låt barnet börja" godkänd
- [ ] Journey Context ägs av central domäntjänst (inga klient-side journey-regler)

**Efter godkännande:** implementera enligt §5 — en PR, feature flags av tills produktägare aktiverar.

---

# 8. Filreferens (befintlig kod)

| Område | Filer |
|--------|-------|
| Onboarding | `public/js/onboarding.js`, `public/onboarding.html` |
| Handoff | `public/js/dashboard-child-handoff.js` |
| Aha / completion | `src/lib/activation-program-aha.js`, `public/js/activation-program-aha-card.js` |
| Events | `public/js/child-login.js`, `db/analytics.js` |
| Activation (coexist) | `src/lib/activation-program.js`, `db/parent-activation-program.js` |
| Legacy (ersätts gradvis) | `db/family-activation-state.js`, `family_activation_state` |
| Parallell motor | `src/routes/family/first-success.js`, `src/core-engine/` |
