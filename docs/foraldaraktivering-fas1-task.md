# Fas 1 — Implementation task (Polsia)

**Skapad:** 2026-05-30  
**Spec:** [foraldaraktivering-7-dagar-spec.md](./foraldaraktivering-7-dagar-spec.md) v3.10  
**Invariants:** [activation-program-invariants.md](./activation-program-invariants.md) — alla implementationer måste följa dessa  
**Scope:** Migration + dag-logik + A/B helper  
**Estimat:** ~3h  
**Risk:** Låg

---

## Blocker — gör först (inte del av Fas 1)

**Daglig logg / completion-flöde måste vara stabilt innan Fas 1 startar.**

Experimentet bygger på:

```
Barn checkar av → child_first_completion → parent_first_completion_seen → retention
```

Om daglig logg läcker eller har supportblockers riskerar ett misslyckat experiment att bero på **infrastruktur**, inte hypotesen.

| Prioritet | Åtgärd |
|-----------|--------|
| **P0** | Eskalera / fixa daglig logg-supportärende |
| **P1** | Parallellt: bryt ned Fas 1–4 i tickets (detta dokument + spec) |
| **P2** | Starta Fas 1-kod när completion-flöde verifierat stabilt |

---

## Beslut (låsta v3.10 — svar till Polsia)

### 1. Daglig logg vs 7-dagarsprogram?

**Daglig logg först.** 7-dagarsprogrammet planeras parallellt men implementeras efter stabil kärnloop.

### 2. Pilotfamiljer?

**Nej till 1–5 externa pilotfamiljer.**

| Steg | Vad | Syfte |
|------|-----|--------|
| **Intern smoke** | Egna testkonton + staging | Verifiera enroll, banner, CTA, completion, aha-card, analytics |
| **Produktion smoke** | 3–5 dagar @ 100 % treatment | Detta *är* piloten (§13.2) |
| **Experiment** | 50/50 permanent | Efter smoke |

### 3. Launch-datum?

**Tekniskt launch-kriterium — inte kalenderdatum.**

Sätt `ACTIVATION_PROGRAM_LAUNCH_AT` **först när Fas 1–4 MVP är live och verifierad:**

- [ ] Migrationer körda i prod
- [ ] Enrollment fungerar (`POST /api/onboarding/complete`)
- [ ] Banner fungerar (treatment)
- [ ] Celebratory card (modal) fungerar
- [ ] Analytics kedja verifierad: `started` → `first_banner_seen` → `child_first_completion` → `parent_first_completion_seen`
- [ ] Minst ett komplett testflöde observerat i produktion (intern testfamilj)

**⚠️ Ändra aldrig `LAUNCH_AT` efter första riktiga kohort-enroll.**

### 4. Grupp C (~93 riskfamiljer)?

**Inte `reactivation_3d` nu.** Parallell **research**, inte experiment:

- Export från retention-dashboard
- Manuell analys / intervjuer
- Ev. enkelt win-back-mail (befintlig infrastruktur)
- **Exkludera från onboarding_7d-kohort och Day 14-analys**

Designa `reactivation_3d` **efter** att onboarding_7d bevisat eller motbevisat hypotesen.

---

## Fas 1 — vad som ska byggas

### Mål

Datamodell + ren dag-logik + A/B helper. **Ingen UI, ingen enrollment-hook, ingen banner** (Fas 2–4).

### Deliverables

| # | Deliverable | Fil |
|---|-------------|-----|
| 1 | DB migration | `migrations/*_parent_activation_program.js` |
| 2 | DB queries | `db/parent-activation-program.js` |
| 3 | Dag-logik (Luxon) | `src/lib/activation-program.js` |
| 4 | A/B + smoke | `src/lib/activation-program-enroll.js` |
| 5 | Unit-tester (DST) | `test/activation-program.test.js` |
| 6 | Dependency | `luxon` i `package.json` |

### Migration — tabeller

**`parent_activation_program`** — se spec §7.1:

- Axlar: `status` + `cohort_arm` (separata)
- `program_type`: `onboarding_7d` | `reactivation_3d`
- `last_seen_day`, `first_banner_seen_at`
- Unique partial index: en `active` rad per family

**`parent_seen_completion`** — se spec §7.3 (skapas i Fas 1 eller Fas 2; rekommendation: **Fas 1** så migration är komplett)

### `src/lib/activation-program.js`

```js
getCalendarDay(program, timezone)       // uncapped — expiry, Day 14
getEffectiveProgramDay(program, timezone) // cap 7 (onboarding_7d) / 3 (reactivation_3d)
maybeExpireProgram(program, timezone)   // calendar_day > EXPIRY_DAY → expired
```

- Använd **luxon** (inte manuell DST)
- Timezone från `family.timezone`, default `Europe/Stockholm`

### `src/lib/activation-program-enroll.js`

```js
assignCohortArm(familyId)  // hashToPercent, smoke-aware (§13.2)
isPostLaunchEnrollment()   // NOW >= ACTIVATION_PROGRAM_LAUNCH_AT
hashToPercent(familyId)    // deterministisk 0–99
```

Env (defaults dokumenterade, **sätts inte i Fas 1 prod-deploy**):

- `ACTIVATION_PROGRAM_LAUNCH_AT` — sätts vid MVP go-live
- `ACTIVATION_PROGRAM_TREATMENT_PCT=50`
- `ACTIVATION_PROGRAM_SMOKE_TEST_DAYS=3`
- `ACTIVATION_PROGRAM_EXPIRY_DAY=21`

### Tester (obligatoriska)

| Test | Förväntat |
|------|-----------|
| Enroll kl 23:30 lokal tid | Fortfarande dag 1 |
| Midnatt rollover | Lokal timezone, inte UTC |
| DST mars | luxon hanterar |
| DST oktober | luxon hanterar |
| `calendar_day > 21` | `maybeExpireProgram` → `expired` |
| `effective_day` cap | Dag 10 → effective_day 7, calendar_day 10 |

Kör: `node --test test/activation-program.test.js`

---

## Fas 1 — explicit OUT OF SCOPE

- Enrollment hook i `onboarding.js` (Fas 4)
- Banner / celebratory card (Fas 2–3)
- API routes `/api/me/activation-program` (Fas 2–3)
- Analytics events (Fas 2+)
- Push scheduler (Fas 5)
- Admin dashboard (Fas 6)
- Feature flag seed / `ACTIVATION_PROGRAM_ENABLED` i prod (Fas 4)

---

## Acceptanskriterier (Fas 1 done)

1. Migration körbar via `npm run migrate` utan fel
2. `getCalendarDay()` + `getEffectiveProgramDay()` — inget `current_day` i DB
3. `maybeExpireProgram()` lazy-ready (anropas i Fas 3 GET)
4. `assignCohortArm()` deterministisk + smoke-test-logik (§13.2)
5. Alla DST-tester gröna
6. `db/parent-activation-program.js` med CRUD: create, getByFamily, updateStatus, updateLastSeenDay
7. Ingen prod-deploy med `ACTIVATION_PROGRAM_ENABLED=true` (vänta Fas 4)

---

## Efter Fas 1 — ordning

```
Fas 1  Migration + dag-logik + A/B        ← detta task
Fas 2  Aha-tracking + celebratory modal
Fas 3  Dashboard-banner + dag 1 preview
Fas 4  Auto-enrollment + LAUNCH_AT + feature flag
       ↓
Intern smoke (staging)
       ↓
Prod deploy Fas 1–4 (flag off eller smoke 100%)
       ↓
Sätt ACTIVATION_PROGRAM_LAUNCH_AT
       ↓
3–5 dag smoke @ 100% treatment
       ↓
50/50 experiment
       ↓
Day 14-kohort → analys (aha opportunity → conversion → retention)
       ↓
Ev. reactivation_3d (Grupp C)
```

---

## Referens

Full experimentdesign: [foraldaraktivering-7-dagar-spec.md](./foraldaraktivering-7-dagar-spec.md)
