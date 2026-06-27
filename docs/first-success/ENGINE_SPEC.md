# Product Engine — specification

> Operativsystem för beteendedriven produktlogik. Engine = sanning. Policy = strategi. UI = projektion. Feedback = lärande.

Se [FIRST-SUCCESS.md](../FIRST-SUCCESS.md) för mission och [PRODUCT-CONSTITUTION.md](../PRODUCT-CONSTITUTION.md) för produktregler.

---

## 1. Grundidé

Vi bygger inte en app för rutiner. Vi bygger en **motor för familjemomentum**.

> First Success = första gången familjen upplever att vardagen blev enklare.

Produkten optimerar för upplevd lättnad — inte konfiguration.

---

## 2. Arkitekturprincip

Deterministisk beslutsmotor:

```
Facts → Inference → State → Needs → Policy → Actions → Presentation
                              ↑
                    Outcome Feedback Loop
```

| Regel | Betydelse |
|-------|-----------|
| UI, push, onboarding, rewards | **Dumma renderare** |
| All produktlogik | **Central Engine** |
| Inga kanaler | Får läsa rå DB eller fatta egna produktbeslut |

---

## 3. Lager

### 1. Facts (`src/core-engine/1-facts/`)

* `collectFamilyFacts(familyId)` — **enda** DB-läsningen för produktbeslut
* Inga ad-hoc queries utanför detta lager

### 2. Inference (`2-inference/`)

Härledda sanningar: `isNewUser`, `hasFirstSuccess`, `isStagnant`, `hasActiveLoop`

### 3. State (`3-state/`)

Stabila milstolpar: `REGISTERED` → `ROUTINE_READY` → `CHILD_SEEN` → `FIRST_ACTIVITY` → … → `UNCERTAINTY_FALLBACK`

### 4. Needs (`4-needs/`)

Domänbehov — beskriver familjen, inte produkten:

* `NEEDS_CLARITY`
* `NEEDS_MOMENTUM`
* `NEEDS_CONSISTENCY`
* `NEEDS_CUSTOMIZATION`
* `NEEDS_WINBACK`

### 5. Policy (`5-policy/`)

Versionerade rulesets mappar need → action:

* `SHOW_CHILD`, `ADD_EVENING`, `INVITE_CO_PARENT`, `SIMPLIFY_ROUTINE`, …
* Experiment (`v2_fast_path_experiment`) **endast här** — aldrig i state/needs

### 6. Presentation (`6-presentation/adapters/`)

Dumma kanaler: `coach`, `push`, `ui` — konsumerar Engine-output utan egen logik

### 7. Outcome (`outcome/`)

`recordOutcome({ familyId, directiveId, actionTaken, latencyMs })` — feedback loop

---

## 4. Engine output (kontrakt)

```json
{
  "timestamp": "2026-06-02T18:00:00.000Z",
  "policy": {
    "id": "control_fam-first-003_NEEDS_CONSISTENCY",
    "name": "ADD_EVENING",
    "validityWindow": { "startHour": 17, "endHour": 21, "expiresAt": "..." },
    "uiTokens": { "theme": "ENCOURAGEMENT", "intensity": "HIGH", "tags": ["BUILD_ROUTINE"] }
  },
  "milestone": "first_success",
  "trace": {
    "coreState": "FIRST_ACTIVITY",
    "evaluatedNeed": "NEEDS_CONSISTENCY",
    "activePolicy": "ADD_EVENING",
    "rulesTriggered": ["first_activity_exists", "no_evening_routine", "state:FIRST_ACTIVITY"],
    "policySet": "v2_first_success_control"
  }
}
```

**Inget** `headline`, `body`, `cta`, `route` i Engine-output.

---

## 5. Kritiska designregler

### UI får aldrig innehålla produktlogik

Allt går via `ProductEngine.evaluate(facts, context)`.

### Determinism

Brain/Engine får **aldrig** läsa: UI, feature flags, locale, copy, experimentvarianter.

Samma facts + samma context → identisk output. Policy-ID:n är deterministiska (inga `Date.now()`).

### Parametriserad timing (push)

Engine ger `validityWindow`. Push-teamet får inte tolka timing själva.

### Emotionella tokens (inte UI-logik)

Engine skickar `uiTokens.theme`, `intensity`, `tags`. UI reagerar — beslutar inte.

### Experiment som policy, inte kod

```json
{ "policySet": "v2_first_success_control", "variant": "FAST_PATH" }
```

Inga ad-hoc `if (experiment)` i routes eller dashboard.

---

## 6. Outcome layer (feedback loop)

```json
{
  "familyId": "fam-123",
  "directiveId": "control_fam-123_NEEDS_CONSISTENCY",
  "actionTaken": "IGNORED",
  "latencyMs": 172800000
}
```

Utan outcome → statisk och blind motor. Systemet riskerar att optimera sin egen logik, inte verkligheten.

---

## 7. Explainability (decision trace)

Varje beslut har `trace.rulesTriggered`:

```json
["first_activity_exists", "no_evening_routine", "day_2_post_signup", "state:FIRST_ACTIVITY", "need:NEEDS_CONSISTENCY"]
```

Förhindrar shadow logic i loggar och debug-UI.

---

## 8. Graceful degradation

Vid trasig/saknad data (`_incomplete: true`):

* ingen gissning
* `UNCERTAINTY_FALLBACK` + konservativ policy `SHOW_CHILD`
* `handleFallback` kraschar aldrig klienten

---

## 9. Shadow logic — hot spots & skydd

| Hot spot | Risk |
|----------|------|
| Push scheduler | timing overrides |
| Onboarding wizard | snabbfixar |
| Dashboard | UI-baserade beslut |
| Rewards | engagement hacks |

**Anti-shadow princip:** Det ska alltid vara snabbare, enklare och säkrare att använda Engine än att skriva egen logik.

**CI:** `npm run check:engine-shadow` — blockerar `collectFamilyFacts` och `ProductEngine.evaluate` utanför Engine.

---

## 10. Contract layer (golden tests)

```
test/engine/golden/*.json   Facts + context → expected output
test/engine-golden.test.js  Runner — contracts får inte glida
```

Kör: `npm run test:engine`

### Freeze mode

`ENGINE_MODE=FROZEN` — inga nya states/needs/policies utan explicit review.

---

## 11. Implementation

```
src/core-engine/
├── 1-facts/collector.js
├── 2-inference/infer.js
├── 3-state/machine.js
├── 4-needs/assessor.js
├── 5-policy/engine.js + policies/
├── 6-presentation/adapters/
├── outcome/record-outcome.js
├── trace.js, milestone.js, constants.js
└── index.js                  # ProductEngine.evaluate()
```

TypeScript-typer: `src/core-engine/types.d.ts`

API (framtida): `GET /api/family/first-success` anropar `collectFamilyFacts` → `ProductEngine.evaluate`.

---

## 14. HTTP API

### `GET /api/family/first-success`

Parent auth required (`requireParent` + `requireNotPedagogOnly`).

**Adapter only** — no business logic in route:

1. `collectFamilyFacts(familyId)`
2. `ProductEngine.evaluate(facts, context)`
3. `serializeEngineOutput(output)` — ISO dates only
4. `queueEngineTrace` — async, off request path

Kill switch: feature flag `first_success_engine_api` (default ON). When OFF → `503` + `{ legacyEndpoint: '/api/family/readiness' }`.

Response shape (serialized `EngineOutput`):

```json
{
  "timestamp": "2026-06-02T18:00:00.000Z",
  "policy": {
    "id": "control_fam-123_NEEDS_CONSISTENCY",
    "name": "ADD_EVENING",
    "validityWindow": { "startHour": 17, "endHour": 21, "expiresAt": "..." },
    "uiTokens": { "theme": "ENCOURAGEMENT", "intensity": "HIGH", "tags": ["BUILD_ROUTINE"] }
  },
  "milestone": "first_success",
  "trace": {
    "coreState": "FIRST_ACTIVITY",
    "evaluatedNeed": "NEEDS_CONSISTENCY",
    "activePolicy": "ADD_EVENING",
    "rulesTriggered": ["first_activity_exists", "no_evening_routine"],
    "policySet": "v2_first_success_control"
  }
}
```

Client reads `trace.coreState` as state, `trace.evaluatedNeed` as need. API never adds copy, routes, or policy overrides.

---

## 12. Relation till Brain/Coach-dokument

| Dokument | Motsvarar |
|----------|-----------|
| [brain.md](brain.md) | Domänlager (facts → needs) — konceptuell översikt |
| [coach.md](coach.md) | Presentation + voice-katalog |
| **ENGINE_SPEC.md** | Full teknisk spec + implementation |

---

## 13. Bottom line

Detta är inte en UI-arkitektur. Det är ett **operativsystem för produktlogik**:

* **Engine** = sanning (domän)
* **Policy** = strategi (experiment)
* **Presentation** = projektion (copy, push, UI)
* **Outcome** = lärande
