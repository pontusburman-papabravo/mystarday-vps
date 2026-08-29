# Global Process Core

Reusable operating principles for product repos (family app, Turbok) and future projects.

**Machine config:** `config/process/global-core.json`  
**Contracts:** `docs/process/contracts/`

## Principles

1. **Time to market** — maximize verified user/business value per wall-clock time
2. **Fail-safe unknowns** — unmapped critical/shared paths broaden verification; never skip tests by guessing
3. **Evidence over narrative** — `FACT` or `NOT_VERIFIED`; no invented evidence
4. **Scope lock** — no silent expansion; `SCOPE_EXPANSION_REQUIRED` for material scope growth
5. **Stop when done** — no drive-by refactors; report `OPPORTUNITY — NOT IMPLEMENTED`
6. **Parallelize wall-clock, not uncertainty** — parallel agents only after `SCOPE_LOCKED`
7. **External truth** — store/legal/policy from primary sources, not training data alone
8. **Independent review** — implementer review ≠ independent review for high risk

## Test levels

L1 → L6 documented in [`TEST_EXECUTION_MODEL.md`](./TEST_EXECUTION_MODEL.md).

## Risk model (R0–R3)

Canonical in `config/process/global-core.json` → `riskClasses`.

## Agent contracts (Phase 6)

| Contract | Doc |
|----------|-----|
| Scope / blast radius | [`contracts/SCOPE_CONTRACT.md`](./contracts/SCOPE_CONTRACT.md) |
| Evidence | [`contracts/EVIDENCE_CONTRACT.md`](./contracts/EVIDENCE_CONTRACT.md) |
| Stop when done | [`contracts/STOP_CONTRACT.md`](./contracts/STOP_CONTRACT.md) |
| Parallelism | [`contracts/PARALLELISM_CONTRACT.md`](./contracts/PARALLELISM_CONTRACT.md) |
| Context minimization | [`contracts/CONTEXT_CONTRACT.md`](./contracts/CONTEXT_CONTRACT.md) |
| Model escalation | [`contracts/MODEL_ESCALATION_CONTRACT.md`](./contracts/MODEL_ESCALATION_CONTRACT.md) |
| Acceptance immutability | [`contracts/ACCEPTANCE_IMMUTABILITY.md`](./contracts/ACCEPTANCE_IMMUTABILITY.md) |
| No silent fallbacks | [`contracts/NO_SILENT_FALLBACKS.md`](./contracts/NO_SILENT_FALLBACKS.md) |
| Should-we-do-this-now | [`contracts/SHOULD_WE_DO_THIS_NOW.md`](./contracts/SHOULD_WE_DO_THIS_NOW.md) |
| Scope freeze | [`contracts/SCOPE_FREEZE.md`](./contracts/SCOPE_FREEZE.md) |
| External truth | [`contracts/EXTERNAL_TRUTH.md`](./contracts/EXTERNAL_TRUTH.md) |
| Independent review | [`contracts/INDEPENDENT_REVIEW.md`](./contracts/INDEPENDENT_REVIEW.md) |
| Feature lifecycle | [`contracts/FEATURE_LIFECYCLE.md`](./contracts/FEATURE_LIFECYCLE.md) |
| Test execution stop | [`contracts/TEST_EXECUTION_STOP_RULE.md`](./contracts/TEST_EXECUTION_STOP_RULE.md) |

## Project overlays

| Project | Overlay |
|---------|---------|
| family-app | `config/process/overlays/family-app.json` + [`overlays/PROJECT_OVERLAY.md`](./overlays/PROJECT_OVERLAY.md) |
| Turbok | [`overlays/TURBOK_BOOTSTRAP.md`](./overlays/TURBOK_BOOTSTRAP.md) (bootstrap plan only) |

## Cursor rules

- `131-test-execution-model.mdc` — L1–L6 + router commands
- `152-agent-operating-contracts.mdc` — contracts A–N summary

## ROI rule for new automation

Before building process automation, answer:

- What time/risk does this remove?
- What recurring cost does it add?
- Is there a simpler alternative?

If benefit is not concrete → **DO NOT BUILD**.
