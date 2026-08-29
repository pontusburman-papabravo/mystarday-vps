# Test Execution Model (L1–L6)

Canonical verification levels for repos using the global process core.

| Level | Name | Command / artifact | When |
|-------|------|-------------------|------|
| **L1** | Agent fast check | `npm run test:changed` | During implementation — minimal relevant tests from changed paths |
| **L2** | Domain gate | `npm run test:domain -- <domain>` | After L1 when domain-specific regression is needed |
| **L3** | PR gate | `npm run test:gate` + `npm run lint:public` | Before merge — canonical CI |
| **L4** | Full regression | `npm test` / `npm run test:full` | Pre-release or high-risk exploratory runs |
| **L5** | Release preflight | `npm run release:preflight` | Exact-SHA CI evidence reuse + Gate A/B/C |
| **L6** | Store manual delta | `npm run release:store-delta` | Filtered human store actions from canonical checklist |

## L1 — Changed-files router

- Config: `config/test-routing.json` + `config/process/global-core.json` + project overlay
- Unknown **critical/shared/unmapped** paths → **R3 / HIGH** + **L3** (fail-safe; never "no test needed")
- Unknown non-critical docs → L1 smoke broaden
- Output: machine-readable JSON (`changedFiles`, `domains`, `riskHints`, `recommendedLevel`, `tests`, `reason`)

## L2 — Domain gates

Broad domains (8) plus Parent Experience overlays:

```
auth-security · payments-iap · i18n-markets-legal · planning-schedule
child-experience · parent-experience · db-migrations · native-platform
family-authz · account-deletion · child-access · push-recipients · for-dig
parent-home · family-ui · settings · notifications · rewards
```

- L1 uses **explicit `l1Tests`** per domain (not arbitrary test array order)
- Overlapping test files are deduplicated at execution time
- Wall-clock timing reported per domain (no hard SLO yet)

## L3 — PR gate

Unchanged from CI: `test:gate` + `lint:public`. Required before merge.

## L4 — Full regression

Outside normal agent loop. Use for release confidence or after large refactors.

## L5 — Release preflight

`npm run release:preflight` — Gate A technical + Gate B/C compliance with exact-SHA CI reuse (Phases 0–2).

## L6 — Store manual delta

`npm run release:store-delta` — produces 4–15 relevant manual actions, not the full 50+ checklist.

- Source of truth: `docs/release/STORE_SUBMISSION_CHECKLIST.md`
- Unknown paths → `MANUAL_REVIEW_REQUIRED`, never auto-PASS

## Risk classes (R0–R3)

| Class | Default verification |
|-------|---------------------|
| R0 Trivial | L1 |
| R1 Normal | L1 + relevant L2 |
| R2 Cross-cutting | L1 + multi-domain L2 + L3 |
| R3 Critical | Broad L2 + L3 + explicit release review |

Path-based suggestion via `config/process/global-core.json`. Explicit `--min-risk` cannot be auto-downgraded.

## Architecture

```
GLOBAL CORE (config/process/global-core.json)
        ↓
PROJECT OVERLAY (config/process/overlays/family-app.json)
        ↓
ROUTER ENTRY (config/test-routing.json)
```

See also: `docs/process/GLOBAL_CORE.md`, `.cursor/rules/131-test-execution-model.mdc`
