# ADR-009 — Feature Flag Strategy

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Product Engine experiments (Coach action mapping, day0 variants) ska A/B-testas utan Brain-ändring (`coach.md`). Ops behöver kill switches.

## Problem

Feature flags i Brain eller core progression bryter determinism och Constitution alignment. Flags utan policy skapar permanent undantag.

## Decision

- **Flags live in:** `feature_flag` table + env overrides; **Coach/presentation layer** primary consumer.  
- **Brain:** reads **facts only** — never flags (brain.md determinism rule).  
- **Core progression / G-rules:** **not flaggable** — permanent behavior needs ADR.  
- **Naming:** `snake_case`; prefix `exp_` for experiments, `ops_` for kill switches.  
- **Lifecycle:** experiment → measure → promote to default **or remove** within 90 days; stale flags CI-fail.  
- **RevenueCat/IAP webhooks:** exempt from maintenance global limiter (existing ops pattern) — document in runbook, not new flag.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| LaunchDarkly-only | Vendor lock; DB flags sufficient v1 |
| Flags everywhere in UI | Unbounded debt |

## Trade-offs

+ Safe Coach A/B.  
− Requires flag hygiene audits.  
− Must not hide ethics violations behind flag.

## Consequences

- `npm run test:gate` runs with flags default-off unless test fixtures set.  
- PR template: list flags touched + expiry date.  
- Admin UI for ops flags; experiment flags via admin or config deploy.

## Migration Strategy

Inventory existing flags; classify exp vs ops; delete unused.

## Related Documents

- `docs/first-success/coach.md` — experiment on Coach  
- `docs/first-success/brain.md` — flags forbidden in Brain  
- `CLAUDE.md` — `feature_flag` table

## Future Revisions

Per-family flags via `family_features`; percentage rollouts.
