# Parallelism Contract

> **PARALLELIZE WALL-CLOCK TIME, NOT UNCERTAINTY.**

## Rule

After `SCOPE_LOCKED`, ask:

> Can wall-clock time be reduced through safe independent workstreams?

## Good parallel candidates

- Independent implementation slices
- Tests for locked behavior
- External compliance research (read-only)
- Documentation after locked behavior
- Independent review

## Bad parallel candidates

- Same critical files
- Same unclear requirements
- Shared auth/session model changes
- Shared DB schema changes
- Two writers in one core module

## Subagent brief

Each subagent receives:

```
GOAL · ALLOWED · EXPECTED_TESTS · READ_ONLY · FORBIDDEN
DEPENDENCIES · EXPECTED_OUTPUT · STOP_CONDITION
```

## Orchestrator duties

1. Dependency graph
2. Identify independent workstreams
3. Start subagents with separated write scopes
4. Collect evidence
5. Detect conflicts
6. Integrate
7. Run shared verification

No parallel implementation before Scope Locked when requirements can diverge.
