# Scope / Blast-Radius Contract

Every material agent assignment should declare:

```
GOAL
ALLOWED          — production files the agent may change
EXPECTED_TESTS   — tests/docs/config allowed as direct consequence
READ_ONLY        — inspect only
FORBIDDEN        — must not change in this assignment
EXPANSION_POLICY — when supporting work is allowed
STOP_CONDITION   — when to stop
```

## Expansion policy

Safe supporting test/docs work is allowed within `EXPECTED_TESTS`.

Material expansion (product, architecture, security, payment, auth, market, data) requires:

```
SCOPE_EXPANSION_REQUIRED
```

The agent must not expand scope silently.
