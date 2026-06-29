# Family Journey — Prod Rollout

Rollout guide for Family Journey Fas 1–5 on the live VPS (see deploy rules in AGENTS.md).

## Prerequisites

- Migration `1808920000000_family_journey.js` (Fas 1) applied
- Migration `1808930000000_journey_fas2_5.js` (Fas 2–5) applied
- Deploy branch merged to `main` (GitHub Actions deploy)

## Feature flags (default OFF except noted)

| Flag | Default | Phase |
|------|---------|-------|
| `family_journey_context_api` | OFF | 1 |
| `family_journey_ingest_enabled` | OFF | 1 |
| `family_journey_evaluator_enabled` | OFF | 1 |
| `family_journey_onboarding_v1` | OFF | 1 |
| `family_journey_debug_api` | OFF | 1 |
| `family_journey_registry_v2` | OFF | 2 |
| `family_journey_handoff_v2` | OFF | 2 |
| `family_journey_parent_ack_v1` | OFF | 2 |
| `family_journey_coach_v1` | OFF | 3 |
| `family_journey_established_phase` | OFF | 3 |
| `family_journey_engine_shadow` | OFF | 3 |
| `activation_program_new_enrollments` | **ON** | 4 sunset |
| `activation_program_api_deprecated` | OFF | 4 |
| `activation_program_ui_removed` | OFF | 4 |
| `family_journey_expanding_phase` | OFF | 5 |
| `family_journey_independence_phase` | OFF | 5 |
| `family_journey_push_v1` | OFF | 5 |
| `family_journey_add_child_v1` | OFF | 5 |

## Recommended rollout order

### Wave 1 — Fas 1 (shadow)

1. Enable `family_journey_ingest_enabled`
2. Enable `family_journey_evaluator_enabled`
3. Enable `family_journey_context_api`
4. Verify `GET /api/me/journey-context` for test families
5. Enable `family_journey_debug_api` temporarily if needed

### Wave 2 — Fas 2 (parent ack + handoff)

1. `family_journey_registry_v2`
2. `family_journey_parent_ack_v1`
3. `family_journey_handoff_v2`
4. `family_journey_onboarding_v1` (onboarding CTA)

### Wave 3 — Fas 3 (coach + established)

1. `family_journey_established_phase`
2. `family_journey_coach_v1` (Engine coach yields)
3. `family_journey_engine_shadow` (compare logs)

### Wave 4 — Fas 4 (activation sunset)

1. `activation_program_new_enrollments` → **OFF**
2. `activation_program_ui_removed`
3. `activation_program_api_deprecated` (410 on program API)

### Wave 5 — Fas 5 (expanding + push)

1. `family_journey_expanding_phase`
2. `family_journey_add_child_v1`
3. `family_journey_independence_phase`
4. `family_journey_push_v1`

## Go / No-Go per wave

Gå vidare till nästa wave **endast** när alla kriterier för aktuell wave är uppfyllda. Vid No-Go: håll kvar wave, undersök, abort vid behov (se nedan).

| Wave | Go vidare när… |
|------|----------------|
| **1** | Inga `[journey/ingest]`-fel i loggar; `GET /api/me/journey-context` returnerar giltig JSON för 3+ testfamiljer; inga 5xx på journey-routes; milestones skrivs idempotent (dubbel event → en rad) |
| **2** | Handoff end-to-end: dashboard-banner syns när Context säger handoff; barn kan logga in; parent-ack-modal visas vid första completion; onboarding CTA "Låt barnet börja" fungerar |
| **3** | Journey-coach renderar på Hem; Engine-coach yieldar när `coach_v1` ON; `[journey-engine-shadow]` visar inga oväntade avvikelser på testfamiljer; nightly eval kör utan fel |
| **4** | Inga nya activation-program enrollments skapas; befintliga aktiva program fortsätter fungera; activation UI dold/ersatt där flag säger; 410 endast när avsiktligt |
| **5** | Add-child → `EXPANDING` + handoff på testfamilj; push-projektion loggar utan fel; `INDEPENDENCE` når endast avsedda testfamiljer |

**No-Go:** Stanna i wave, samla loggar + `journey-debug`, fixa eller rollback innan nästa flagga slås på.

## Abort criteria

**Stäng av omedelbart** den wave som just aktiverades (samt ev. context API om 5xx) om något av följande inträffar:

- `journey-context` returnerar **5xx** för normala inloggade föräldrar (inte bara 503 när flag OFF)
- Felaktig `journey_phase` eller `blocking_experience` på **verifierade testfamiljer** (jämför `journey-debug` med förväntat tillstånd)
- Milestones skrivs **inte idempotent** (dubbla rader eller korrupt milestone-map)
- Onboarding eller barninloggning **blockeras** — familjer kan inte slutföra kärnflödet
- Inconsistent state utan fail-safe: Context utan giltig JSON eller fel `phase` för kända milestones

**Abort-åtgärd:** Disable senast aktiverade flagga(er) i wave → verifiera health → incident i loggar innan retry.

## Golden path (end-to-end checklist)

Kör manuellt på **en ny testfamilj** efter deploy och efter varje wave som påverkar UX:

```
□ Ny familj registrerad
□ Onboarding klar (barn + schema + belöning)
□ journey_phase: FIRST_USE (routine_ready + rewards_ready)
□ Handoff-banner / CTA synlig (wave 2+)
□ Barn loggar in (child_logged_in milestone)
□ Barn klarar första aktivitet (child_first_completion)
□ Förälder bekräftar (parent_saw_completion / parent-ack-modal)
□ first_success deriverad → BUILDING_ROUTINE
□ Celebration visas en gång (celebration_dismissed)
□ Coach/handoff enligt Context — inget Engine/Journey-konflikt (wave 3+)
```

Markera varje steg i `GET /api/me/journey-debug` mot förväntad `phase_derivation` och `context_derivation`.

## Verification

```bash
# Health after deploy (on VPS)
curl -s http://127.0.0.1:3000/health

# Journey context (authenticated parent cookie required)
curl -s -b cookies.txt http://127.0.0.1:3000/api/me/journey-context

# Debug (dev/admin only)
curl -s -b cookies.txt http://127.0.0.1:3000/api/me/journey-debug
```

## Rollback

**Migrationer rullas inte tillbaka i produktion.** Rollback sker **endast via feature flags**.

Disable flags in reverse order. Ingest/evaluator can stay ON — UI surfaces hide when context API is OFF (503).

For activation sunset rollback: re-enable `activation_program_new_enrollments` and disable `activation_program_api_deprecated`.

## Monitoring

- `[journey/ingest]` — milestone write errors
- `[journey-engine-shadow]` — Engine vs Journey divergence (Fas 3)
- `[journey-phase-eval]` — nightly established/independence milestones
- `[journey-push]` — push projection job

## Invariants

- `onboarding_completed` auth flag — **never** use for product logic
- `first_success` = derived from `child_first_completion` ∧ `parent_saw_completion`
- Inconsistent milestone state → `SETTING_UP`, `blocking_experience: null`
- `journey_phase` is derived — **never** update it directly outside the Journey domain (`ingest.js` / `recomputePhase`)
