# Family Journey — System Spec (Fas 1–5)

**Typ:** Autonom build-spec (overnight prompt)  
**Version:** 1.0-rc  
**Status:** Låst — inga nya produktbeslut krävs under implementation

**Relaterade dokument:**

| Dokument | Roll |
|----------|------|
| [family-journey-model-rfc.md](./family-journey-model-rfc.md) | Domän, principer, problem |
| [family-journey-implementation-contract.md](./family-journey-implementation-contract.md) | Fas 1 teknisk sanning |
| [family-journey-fas2-5-roadmap.md](./family-journey-fas2-5-roadmap.md) | Fas 2–5 detaljerad DoD |

Om konflikt: **detta dokument vinner på exekveringsordning och governance**; RFC vinner på domänbegrepp; contract/roadmap vinner på fil-/API-detaljer per fas.

---

# Implementation status (repo)

| Fas | Kod | Docs | Aktivering |
|-----|-----|------|------------|
| **1** | ✅ Implementerad (`src/lib/journey/*`, migration `1808920000000`) | Contract | Flags default OFF |
| **2** | ⬜ Spec only | Roadmap §Fas 2 | Efter Fas 1 go-live |
| **3** | ⬜ Spec only | Roadmap §Fas 3 | Efter Fas 2 DoD |
| **4** | ⬜ Spec only | Roadmap §Fas 4 | Efter Fas 3 DoD |
| **5** | ⬜ Spec only | Roadmap §Fas 5 | Efter Fas 4 DoD |

---

# OVERNIGHT BUILD PROMPT — FAMILY JOURNEY SYSTEM (FAS 1–5)

Du implementerar ett komplett produktionssystem för Family Journey Model.

Systemet är en **deterministisk state machine** som ersätter fragmenterade produktbeslut med en central domänmodell.

---

## GLOBAL PRINCIPER (GÄLLER ALLA FASER)

### 1. Single Source of Truth

- Journey Context är enda UX-beslutslager
- UI får **aldrig** göra egna produktbeslut

### 2. Append-only truth

- Milestones är aldrig muterbara (utom metadata för `celebration_shown` på `first_success`)
- Historik är permanent

### 3. Determinism

- Samma input (milestones + phase) → samma output (context)
- `evaluator.js` har ingen DB-access

### 4. No hidden logic

- Ingen implicit UI-logik
- Ingen analytics-driven product logic
- Analytics speglar — matar inte milestones (undantag: befintliga hooks refaktoreras till `ingest.js`)

### 5. Fail-safe

Om osäker eller inkonsistent state:

```
phase = SETTING_UP
blocking_experience = null
reason = ['INCONSISTENT_STATE']
```

API returnerar alltid giltig JSON. Aldrig crash.

---

## GEMENSAM ARKITEKTUR

```
events → ingest.js → family_milestones → phases.js → evaluator.js → context → API → UI render
```

| Lager | Modul | Skriv? | DB? |
|-------|-------|--------|-----|
| Write | `src/lib/journey/ingest.js` | ✅ milestones | Ja |
| Phase | `src/lib/journey/phases.js` | ✅ `journey_phase` | Via ingest |
| Project | `src/lib/journey/evaluator.js` | ❌ | Nej |
| Explain | `GET /api/me/journey-debug` | ❌ | Ja (read) |
| Copy | Experience Registry | Admin/DB | Ja |
| Render | `journey-context-client.js` + ytor | ❌ | Nej |

---

## CORE MODULES (ALLA FASER)

| Modul | Ansvar |
|-------|--------|
| `ingest.js` | Enda skrivväg för milestones |
| `phases.js` | Explicit state machine (`TRANSITIONS`) |
| `evaluator.js` | UX projection (`deriveContext`) |
| `reason-codes.js` | Maskinläsbara skäl |
| `flags.js` | Feature flags kill switches |
| `src/routes/journey-context.js` | context + debug + events + registry |
| `db/family-milestones.js` | CRUD |
| Registry | Experience definitions per phase |

**HARD RULE:** Om någon modul försöker:

- compute UX i frontend
- bypass milestones
- introducera implicit state

→ **reject change**

---

## PRE-REQUISITES (LÅSTA DEFAULTS)

| ID | Beslut | Default |
|----|--------|---------|
| **P1** | Handoff scope | Per barn: `scope_key = 'child:<uuid>'` |
| **P2** | Engine vs Journey | Engine read-only signal; **Journey owns UX** |
| **P3** | Add-child | Fas `EXPANDING` only |
| **P4** | Pedagog role | No journey participation (`priority: none`) |

Inga ytterligare beslut krävs för autonom build.

---

## FEATURE FLAGS — namnkarta

Prompt-namn → repo `feature_flag.key`:

| Fas | Prompt (koncept) | Repo key |
|-----|------------------|----------|
| 1 | context API | `family_journey_context_api` |
| 1 | ingest | `family_journey_ingest_enabled` |
| 1 | evaluator | `family_journey_evaluator_enabled` |
| 1 | onboarding UI | `family_journey_onboarding_v1` |
| 1 | debug | `family_journey_debug_api` |
| 2 | registry v2 | `family_journey_registry_v2` |
| 2 | handoff v2 | `family_journey_handoff_v2` |
| 2 | parent ack | `family_journey_parent_ack_v1` |
| 3 | coach | `family_journey_coach_v1` |
| 3 | established phase | `family_journey_established_phase` |
| 3 | engine shadow | `family_journey_engine_shadow` |
| 4 | activation off | `activation_program_api_deprecated` |
| 4 | program UI removed | `activation_program_ui_removed` |
| 5 | expanding | `family_journey_expanding_phase` |
| 5 | independence | `family_journey_independence_phase` |
| 5 | push | `family_journey_push_v1` |
| 5 | add-child | `family_journey_add_child_v1` |

**Alla flags default OFF** tills produktägare aktiverar per fas.

**Rollback:** Stäng `ingest` + `evaluator` → klienter får legacy fallback; API kan vara ON.

---

# FAS 1 — FOUNDATION

## Mål

Deterministisk core state machine + onboarding + handoff + `first_success`.

## Scope

| ✅ Ingår | ❌ Ingår inte |
|----------|---------------|
| Onboarding steg 5–6 | Activation-program-ändringar |
| `handoff_to_child` | Push |
| Child login → `child_logged_in` | Registry CMS |
| `first_success` + celebration | Dashboard coach redesign |

## Domänregler

```
first_success = child_first_completion ∧ parent_saw_completion  (derived in ingest only)
FIRST_USE → BUILDING_ROUTINE after first_success
blocking_experience = handoff_to_child when FIRST_USE ∧ ¬child_logged_in
onboarding_completed = auth/routing only — DO NOT USE FOR PRODUCT LOGIC
```

## Livsfaser (Fas 1)

```
SETTING_UP → FIRST_USE → BUILDING_ROUTINE
```

## DoD

- [x] Kan gå `SETTING_UP` → `FIRST_USE` → `first_success` → `BUILDING_ROUTINE`
- [x] `GET /api/me/journey-debug` förklarar phase + context
- [x] UI använder endast API (`journey-context-client.js`)
- [x] Ingen ny produktlogik i onboarding/dashboard utöver Context-fetch

## Testkrav

- [x] Milestone idempotens
- [x] Deterministic phase transitions
- [x] `first_success` derivation
- [x] Context correctness (`handoff`, `celebration`, fail-safe)
- [x] Flag OFF → API 503

**Testfil:** `test/journey-context.test.js` (i `test:gate`)

## Detaljer

→ [family-journey-implementation-contract.md](./family-journey-implementation-contract.md)

---

# FAS 2 — JOURNEY CONTROL PLANE

## Mål

Full UX-kontroll via Context. Parent-ack **utan** activation-program.

## Scope

| ✅ Ingår | ❌ Ingår inte |
|----------|---------------|
| DB registry (server-driven experiences) | Coach på Hem |
| `parent_saw_completion` utan program | Push |
| Handoff 100% Context-styrt | Activation sunset (endast förberedelse +1) |

## Domänregler

- Engine får **inte** påverka UX
- Journey Context är enda UI-källa för handoff + ack
- `blocking_experience: parent_ack_completion` när completion finns, parent ej sett

## Feature flags (aktivering)

1. `family_journey_ingest_enabled`
2. `family_journey_evaluator_enabled`
3. `family_journey_context_api`
4. `family_journey_registry_v2`
5. `family_journey_handoff_v2`
6. `family_journey_parent_ack_v1`
7. `activation_program_new_enrollments` → OFF (sunset cykel +1)

## DoD

- [ ] Parent ack fungerar utan aktivt activation-program
- [ ] Handoff-banner visas **iff** `blocking_experience === 'handoff_to_child'`
- [ ] Registry server-driven med JSON-fallback
- [ ] Native + webb samma Context
- [ ] `test/journey-fas2.test.js` grön

## Testkrav

- `parent_saw_completion` utan program enrollment
- Handoff correctness per `child:<uuid>` scope
- Registry resolution deterministic

## Detaljer

→ [family-journey-fas2-5-roadmap.md](./family-journey-fas2-5-roadmap.md#fas-2--registry-kanaler-parent-ack)

---

# FAS 3 — ROUTINE & COACH LAYER

## Mål

`ESTABLISHED_ROUTINE` + coach på Hem via Context. Engine shadow only.

## Scope

| ✅ Ingår | ❌ Ingår inte |
|----------|---------------|
| `BUILDING_ROUTINE` → `ESTABLISHED_ROUTINE` | Activation removal |
| Coach experiences (`priority: coach`) | Push |
| Engine shadow (log diff, no UI write) | |

## Domänregler

- Coach = Context projection (`recommended_experiences`)
- Engine = read-only signal layer — **aldrig** `#engineCoachMount` när `family_journey_coach_v1` ON
- `blocking_experience` = `null` för coach (rekommendation, inte blockering)

## Feature flags

- `family_journey_coach_v1`
- `family_journey_established_phase`
- `family_journey_engine_shadow`

## DoD

- [ ] Phase transition till `ESTABLISHED_ROUTINE` via scheduler + milestone `established_routine`
- [ ] Hem-coach renderas från Context
- [ ] Ingen Engine UI write när coach flag ON
- [ ] Shadow divergens <5% i staging före prod
- [ ] `test/journey-fas3.test.js` grön

## Testkrav

- Coach triggers deterministic
- No Engine override of UI
- `derivePhase` med `established_routine`

## Detaljer

→ [family-journey-fas2-5-roadmap.md](./family-journey-fas2-5-roadmap.md#fas-3--dashboard-coach-under-context)

---

# FAS 4 — ACTIVATION SUNSET

## Mål

Legacy activation-program borta som UX-system.

## Scope

| ✅ Ingår | ❌ Ingår inte |
|----------|---------------|
| Program API → 410 Gone | DROP program-tabell |
| All celebration via Journey | Push expansion |
| `onboarding-activation.js` bort | Add-child changes |

## Domänregler

- Activation-program är **död** som UX-system
- KPI = `family_milestones.first_success`
- Kohort-data i DB behålls (read-only archive)

## Feature flags

- `activation_program_api_deprecated`
- `activation_program_ui_removed`

## DoD

- [ ] Inga prod-anrop till `/api/me/activation-program/*`
- [ ] Celebrations endast via Journey Context
- [ ] Admin funnel från milestones
- [ ] `test/journey-fas4.test.js` grön

## Testkrav

- Program API returns 410
- No legacy UX hooks active

## Detaljer

→ [family-journey-fas2-5-roadmap.md](./family-journey-fas2-5-roadmap.md#fas-4--activation-program-sunset)

---

# FAS 5 — EXPANSION + AUTONOMY

## Mål

Multi-child, livscykel, push — allt Context-styrt.

## Scope

| ✅ Ingår | ❌ Ingår inte |
|----------|---------------|
| `EXPANDING`, `INDEPENDENCE` | Engine UX reintroduction |
| Push driven by Context | ML personalisering |
| Add-child handoff per barn | |
| `family_activation_state` write-stop | |

## Domänregler

- Schedulers **cannot** decide UX — endast läsa Context
- Add-child → `EXPANDING` + handoff per `child:<uuid>`
- Pedagog-only → P4 skip

## Feature flags

- `family_journey_expanding_phase`
- `family_journey_independence_phase`
- `family_journey_push_v1`
- `family_journey_add_child_v1`

## DoD

- [ ] Multi-child handoff end-to-end
- [ ] Push endast när Context har push experience key
- [ ] `INDEPENDENCE` deterministisk enligt spec
- [ ] `test/journey-fas5.test.js` grön

## Testkrav

- Multi-child correctness
- Scheduler no-logic enforcement (grep + integration)

## Detaljer

→ [family-journey-fas2-5-roadmap.md](./family-journey-fas2-5-roadmap.md#fas-5--full-livscykel--kanaler)

---

# DEBUG & EXPLAINABILITY (ALLA FASER)

**MUST:** `GET /api/me/journey-debug`

Returnerar minst:

```json
{
  "phase": "FIRST_USE",
  "phase_derivation": { "rule": "...", "milestones_considered": [] },
  "context_derivation": { "rule": "...", "reason": [] },
  "milestones_raw": [],
  "flags": {},
  "stored_phase": "FIRST_USE"
}
```

Tillgång: admin, dev/test env, eller `family_journey_debug_api` ON.

---

# EXEKVERINGSORDNING

```
Fas 1 (foundation)     → go-live, flags ON inkrementellt
    ↓ DoD complete
Fas 2 (control plane)  → registry + parent-ack + handoff gate
    ↓
Fas 3 (coach)          → ESTABLISHED_ROUTINE + Hem coach
    ↓
Fas 4 (sunset)         → activation borta
    ↓
Fas 5 (expansion)      → EXPANDING/INDEPENDENCE + push
```

**Förbjudet:** Fas 3 coach + Fas 4 sunset i samma release utan explicit PO-godkännande.

---

# FINAL SUCCESS CRITERIA (hela systemet)

Systemet är komplett när:

1. **Alla UX-beslut** kommer från Journey Context
2. **Ingen client-side product logic** (verifierbar via grep-audit)
3. **Faser är deterministiska** (`phases.js` + tester)
4. **Milestones är append-only truth**
5. **Systemet förklarar sig självt** via `/api/me/journey-debug`
6. **Activation-program** är arkiverat (Fas 4)
7. **Push/schedulers** läser Context (Fas 5)

---

# AGENT INSTRUCTIONS

1. Implementera **en fas i taget** — aldrig hoppa över DoD
2. Vid oklarhet: följ **fail-safe** + **pre-requisites P1–P4** — inga egna antaganden
3. Varje fas: migration → domain → API → hooks → UI → tests → flags OFF → commit
4. Kör `npm run test:gate` före push
5. Bump `public/sw.js` vid klientändringar
6. Uppdatera implementation status-tabellen i detta dokument när fas levereras

---

# Changelog

| Version | Datum | Ändring |
|---------|-------|---------|
| 1.0-rc | 2026-06-28 | Initial system-spec Fas 1–5 + governance |
