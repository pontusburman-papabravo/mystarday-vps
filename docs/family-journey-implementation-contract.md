# Family Journey — Implementation Contract

**Appendix till:** [Family Journey Model RFC](./family-journey-model-rfc.md)  
**Fortsättning:** [Fas 2–5 roadmap](./family-journey-fas2-5-roadmap.md)  
**Version:** 1.0-rc  
**Status:** Väntar på RFC workshop-beslut (§7)

Syfte: teknisk sanning — tabeller, API, kodmapping. **Hör inte hemma i RFC-kroppen.**

Om RFC och detta dokument motsäger varandra: RFC vinner på domän, detta dokument vinner på tekniska detaljer.

**Regel:** Ingen ny journey-logik innan RFC workshop-blockers (§7) är beslutade. Buggfixar och orelaterade förändringar påverkas inte.

---

# Scope

## Fas 1 — hårt avgränsad

| Ingår | Ingår inte |
|-------|------------|
| Livsfaser: `SETTING_UP` → `FIRST_USE` → `BUILDING_ROUTINE` | Övriga faser i evaluator |
| Context-scope: onboarding 5–6, handoff, celebration | Dashboard coach, readiness, push |
| `GET /api/me/journey-context` + `GET /api/me/journey-debug` | Full activation-program-avveckling |
| Milstolpar (engång, Fas 1-nycklar) | Upprepbara milstolpar (streak etc.) |
| Evaluator: 3 lager (ingest / phase / context) | Product Engine-sammanslagning |
| Experience Registry: statisk JSON, **per phase** | Registry CMS / admin |

## Fas 1 produktmål

```
SETTING_UP  →  FIRST_USE  →  first_success  →  BUILDING_ROUTINE
```

- Onboarding steg 5–6: "Låt barnet börja" (ej dashboard)
- Milstolpar: `handoff_started`, `handoff_deferred`, `child_logged_in`
- `first_success` = firande-klimax
- `child_first_completion` = separat system-KPI ("value delivered")

---

# 1. Datamodell

## 1.1 `family.journey_phase`

```sql
ALTER TABLE family
  ADD COLUMN IF NOT EXISTS journey_phase VARCHAR(32) NOT NULL DEFAULT 'SETTING_UP'
    CHECK (journey_phase IN (
      'DISCOVERING', 'SETTING_UP', 'FIRST_USE', 'BUILDING_ROUTINE',
      'ESTABLISHED_ROUTINE', 'EXPANDING', 'INDEPENDENCE'
    ));

CREATE INDEX IF NOT EXISTS idx_family_journey_phase ON family (journey_phase);
```

**Skrivregler:** endast `src/lib/journey/phases.js` (via ingest-pipeline).

## 1.2 `family_milestones`

Append-only. **Ingen hård UNIQUE på `(family_id, milestone)`** — flexibilitet för framtida upprepbara milstolpar.

```sql
CREATE TABLE IF NOT EXISTS family_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  milestone     VARCHAR(64) NOT NULL,
  scope_key     VARCHAR(64) NOT NULL DEFAULT '',
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  child_id      UUID REFERENCES child(id) ON DELETE SET NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  source        VARCHAR(32) NOT NULL DEFAULT 'system'
    CHECK (source IN ('system', 'admin', 'backfill')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_milestones_family
  ON family_milestones (family_id, milestone, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_milestones_once
  ON family_milestones (family_id, milestone, scope_key)
  WHERE milestone IN (
    'account_created', 'child_created', 'routine_ready', 'rewards_ready',
    'handoff_started', 'handoff_deferred', 'child_logged_in',
    'child_first_completion', 'parent_saw_completion', 'first_success'
  );
```

| Fält | Syfte |
|------|-------|
| `scope_key` | `''` = familj; `'child:<uuid>'` = per-barn engångsmilstolpe |
| Partial UNIQUE | Endast Fas 1 engångsmilstolpar — upprepbara (t.ex. `streak_day`) utan UNIQUE |

**Insert:** idempotent via `ON CONFLICT` på partial unique index för engångsmilstolpar.

## 1.3 Värde levererat vs erkänt

```
child_first_completion  →  "value delivered"   (system KPI)
parent_saw_completion   →  UX-bro
first_success           →  child_first_completion ∧ parent_saw_completion  ("value acknowledged")
```

Vid `first_success`: `journey_phase` → `BUILDING_ROUTINE`.

## 1.4 Explicit fasmaskin

`src/lib/journey/phases.js`:

```js
const TRANSITIONS = {
  SETTING_UP: ['FIRST_USE'],
  FIRST_USE: ['BUILDING_ROUTINE'],
  BUILDING_ROUTINE: ['ESTABLISHED_ROUTINE'],
};

function derivePhase(milestones) {
  if (milestones.first_success) return 'BUILDING_ROUTINE';
  if (milestones.routine_ready && milestones.rewards_ready) return 'FIRST_USE';
  return 'SETTING_UP';
}
```

Fas 1 implementerar endast `SETTING_UP` → `FIRST_USE` → `BUILDING_ROUTINE`.

## 1.5 Backfill

| Signal | Milstolpe | Fas |
|--------|-----------|-----|
| `family.created_at` | `account_created` | — |
| `child` finns | `child_created` | — |
| `weekly_schedule` | `routine_ready` | — |
| `reward` | `rewards_ready` | — |
| `family_activation_state.first_completion_at` | `child_first_completion` | — |
| `parent_seen_completion` | `parent_saw_completion` | — |
| Båda completion | `first_success` | `BUILDING_ROUTINE` |
| `onboarding_completed` + schema, ej first_success | — | `FIRST_USE` |
| Annars | — | `SETTING_UP` |

## 1.6 `family_activation_state`

Ersätts gradvis. Fas 1: befintliga schedulers får läsa den; **nya features skriver inte hit**.

## 1.7 `onboarding_completed`

| Fält | Roll |
|------|------|
| `parent.onboarding_completed` | Auth/routing only — **`DO NOT USE FOR PRODUCT LOGIC`** |
| `journey_phase` | Produkt |
| `first_success` | North Star KPI (acknowledged) |
| `child_first_completion` | System KPI (delivered) |

Lägg kommentar i `src/routes/onboarding.js` och `src/routes/auth/session.js`:

```js
// DO NOT USE onboarding_completed FOR PRODUCT LOGIC — use journey_phase / milestones
```

---

# 2. Domänlager — tre funktioner (inte monolit)

```
src/lib/journey/
  ingest.js      → backend events → milestones (skrivväg)
  phases.js      → derivePhase(milestones) → journey_phase
  evaluator.js   → deriveContext(phase, milestones) → JourneyContext
```

**Regel:** `evaluator.js` anropar inte DB direkt — tar milestones + phase som input (rent, testbart).

```js
// evaluator.js — konceptuellt
function deriveContext({ phase, milestones }) {
  if (phase === 'FIRST_USE' && !milestones.child_logged_in) {
    return {
      phase,
      milestones,
      recommended_experiences: ['handoff_to_child'],
      blocking_experience: 'handoff_to_child',
      celebration: null,
      priority: 'handoff',
      reason: ['child_not_logged_in'],
    };
  }
  if (milestones.first_success && !milestones._celebration_shown) {
    return {
      phase: 'BUILDING_ROUTINE',
      milestones,
      recommended_experiences: ['celebrate_first_success'],
      blocking_experience: null,
      celebration: 'celebrate_first_success',
      priority: 'celebration',
      reason: ['first_success_achieved'],
    };
  }
  // ...
}
```

---

# 3. API

## 3.1 `GET /api/me/journey-context`

```json
{
  "phase": "FIRST_USE",
  "milestones": {
    "routine_ready": "2026-06-28T10:00:00.000Z",
    "rewards_ready": "2026-06-28T10:05:00.000Z"
  },
  "recommended_experiences": ["handoff_to_child"],
  "blocking_experience": "handoff_to_child",
  "celebration": null,
  "priority": "handoff",
  "reason": ["child_not_logged_in"],
  "registry_version": "2026-06-28-v1"
}
```

Ingen copy i svar.

## 3.2 `GET /api/me/journey-debug` (Fas 1 — obligatorisk)

Stöd och utveckling. Kräver `requireParent` + admin eller icke-produktionsmiljö (eller feature flag).

```json
{
  "phase": "FIRST_USE",
  "phase_derivation": {
    "rule": "routine_ready && rewards_ready && !first_success",
    "milestones_considered": ["routine_ready", "rewards_ready", "first_success"]
  },
  "context_derivation": {
    "rule": "FIRST_USE && !child_logged_in → handoff_to_child",
    "reason": ["child_not_logged_in"]
  },
  "milestones_raw": [
    { "milestone": "routine_ready", "occurred_at": "...", "source": "system" }
  ],
  "flags": {
    "context_api": true,
    "ingest_enabled": true,
    "evaluator_enabled": true
  }
}
```

## 3.3 `POST /api/me/journey-context/events`

Klientintents → backend milestone (inte analytics-dump):

| `intent` | Milstolpe |
|----------|-----------|
| `handoff_started` | `handoff_started` |
| `handoff_deferred` | `handoff_deferred` |

Server validerar fas och idempotens.

## 3.4 `GET /api/me/journey-context/registry` (Fas 1)

Server levererar Registry — även om filen ligger i repo initialt. Förbereder server-driven Fas 2.

```json
{
  "version": "2026-06-28-v1",
  "phases": {
    "FIRST_USE": {
      "handoff_to_child": { "tone": "coach", "headline": "...", "cta": "Låt barnet börja" }
    },
    "BUILDING_ROUTINE": {
      "celebrate_first_success": { "tone": "celebration", "headline": "...", "cta": "Toppen!" }
    }
  }
}
```

---

# 4. Event-ingestion

## 4.1 Princip

```
Backend route / domänhook
        ↓
journey/ingest.js          ← enda skrivväg för milstolpar
        ↓
family_milestones
        ↓
phases.derivePhase → UPDATE family.journey_phase
        ↓
evaluator.deriveContext
```

**Analytics:** skrivs parallellt för observability — **matar inte** milstolpar direkt. Undantag: befintliga hooks i `activation-program-aha.js` refaktoreras till att anropa `ingest.js` (samma kodväg som backend).

## 4.2 Mappning (Fas 1)

| Källa | Hook | Milstolpe | Plats |
|-------|------|-----------|-------|
| Registrering | `family` INSERT | `account_created` | `register.js` |
| Onboarding | barn skapat | `child_created` | `onboarding.js` |
| Onboarding | schema | `routine_ready` | `onboarding.js` |
| Onboarding | belöning | `rewards_ready` | `onboarding.js` |
| Handoff intent | POST events | `handoff_started` / `handoff_deferred` | `journey-context.js` |
| Barn login | POST child-login success | `child_logged_in` | `src/routes/auth/child-login.js` |
| Check-off | completion hook | `child_first_completion` | daily-logs route → `ingest.js` |
| Aha dismiss | parent saw | `parent_saw_completion` | aha route → `ingest.js` |
| Domän | derive | `first_success` | `ingest.js` |

`child_login_success` analytics behålls — men milstolpe sätts i **child-login route**, inte från klient-analytics.

---

# 5. Activation-program — coexist + sunset

## 5.1 Fas 1

| Komponent | Fas 1 |
|-----------|-------|
| `parent_activation_program` | Kvar |
| `/api/me/activation-program/*` | Kvar |
| `activation-program-aha-card.js` | Dual: Context `celebration` när flag på |
| Ny enrollment | Kvar — ej blockerande för handoff |

## 5.2 Sunset (låst)

**Max 2 release-cykler** efter Fas 1 go-live:

| Cykel | Åtgärd |
|-------|--------|
| +0 (Fas 1) | Coexist; nya familjer får Journey handoff |
| +1 | `ACTIVATION_PROGRAM_ENABLED=false` för nya enrollments |
| +2 | Banner/aha enbart via Context; program-API deprecated |
| +3 | Tabell arkiverad (data kvar för kohort) |

Ny KPI: `family_milestones.first_success` — inte `activation_program_completed`.

---

# 6. Feature flags

| Flag | Default | Effekt |
|------|---------|--------|
| `family_journey_context_api` | `false` | Master: API 503 |
| `family_journey_onboarding_v1` | `false` | Nya steg 5–6 |
| `family_journey_ingest_enabled` | `false` | Kill-switch: inga nya milstolpar |
| `family_journey_evaluator_enabled` | `false` | Kill-switch: tom/fallback Context |
| `family_journey_debug_api` | `false` | Debug-endpoint (admin/dev) |

**Rollback:** stäng `ingest` + `evaluator` utan att stänga API — klienter får legacy fallback.

---

# 7. Fas 1 — kodändringar

## 7.1 Nya filer

| Fil | Ansvar |
|-----|--------|
| `migrations/*_family_journey.js` | schema |
| `db/family-milestones.js` | CRUD |
| `src/lib/journey/ingest.js` | milestone-skrivväg |
| `src/lib/journey/phases.js` | `derivePhase`, `TRANSITIONS` |
| `src/lib/journey/evaluator.js` | `deriveContext` |
| `src/lib/journey/reason-codes.js` | `ReasonCode` enum |
| `src/routes/journey-context.js` | context + debug + events + registry |
| `config/journey-experience-registry.json` | copy per phase |
| `public/js/journey-context-client.js` | fetch + render |
| `public/js/journey-celebration.js` | celebration modal |
| `test/journey-context.test.js` | ingest, phase, context, API |

## 7.2 Befintliga filer

| Fil | Ändring |
|-----|---------|
| `onboarding.js` / `.html` | Steg 5–6; CTA "Låt barnet börja"; Context-driven |
| `dashboard-child-handoff.js` | `handoff_started` via POST events; visa endast om Context säger |
| `activation-program-aha.js` | Anropa `ingest.js`; ta bort program-krav för milstolpe |
| `activation-program-aha-card.js` | Poll Context `celebration` när flag på |
| `onboarding-activation.js` | Avvecklas Fas 1 |
| `child-login.js` + `child-login.js` route | Milstolpe server-side |
| `onboarding.js` route | `DO NOT USE` kommentar kring `onboarding_completed` |

## 7.3 Flöde

```
Onboarding 1–4 → 5–6 (PIN, valfri inbjudan)
        ↓
POST /api/onboarding/complete  (onboarding_completed=true, journey_phase=FIRST_USE)
        ↓
[Låt barnet börja] → handoff_started → /child-login
        ↓
child-login route → child_logged_in
        ↓
check-off → child_first_completion
        ↓
aha dismiss → parent_saw_completion → first_success → BUILDING_ROUTINE
        ↓
celebrate_first_success (modal)
```

## 7.4 Testkrav

| Test | Assert |
|------|--------|
| `derivePhase` | milestones → rätt fas |
| `deriveContext` | FIRST_USE utan login → `reason: child_not_logged_in` |
| Ingest idempotens | Dubbel handoff → en rad |
| `first_success` | completion + saw → milstolpe + fas |
| Debug endpoint | Visar derivation rules |
| Flag rollback | ingest av → inga nya milestones, legacy UX |
| Partial UNIQUE | Engångsmilstolpe dupliceras inte; framtida repeatable tillåten |

Kör: `npm run test:gate` (med test-miljö) + `test/journey-context.test.js`.

---

# 8. Godkännandechecklista

Workshop-blockers (RFC §7):

- [ ] Context = SSOT för Fas 1-ytor (JA)
- [ ] Två KPI: `child_first_completion` + `first_success` (JA)
- [ ] `onboarding_completed` kvar med DO NOT USE (JA)
- [ ] Activation sunset max 2 cykler (JA)
- [ ] Registry statisk Fas 1, server API levererar (JA)
- [ ] Debug endpoint från start (JA)
- [ ] Evaluator i 3 lager (JA)
- [ ] Milestones utan hård global UNIQUE (JA)

**Efter godkännande:** en PR, alla flags av tills produktägare aktiverar.

---

# 9. Filreferens

| Område | Filer |
|--------|-------|
| Onboarding | `public/js/onboarding.js`, `public/onboarding.html` |
| Handoff | `public/js/dashboard-child-handoff.js` |
| Aha | `src/lib/activation-program-aha.js`, `public/js/activation-program-aha-card.js` |
| Events | `src/routes/auth/child-login.js`, `db/analytics.js` |
| Activation (sunset) | `src/lib/activation-program.js`, `db/parent-activation-program.js` |
| Legacy | `db/family-activation-state.js` |
| Parallell | `src/routes/family/first-success.js`, `src/core-engine/` |
