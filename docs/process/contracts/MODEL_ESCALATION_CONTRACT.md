# Model Escalation Contract

Default: **cheapest sufficient model** (model-agnostic principle).

## Escalate when justified

- R3 security-critical reasoning
- Hard cross-domain architecture
- Two failed implementation attempts without verified progress
- Repeated test-fix loop without root cause
- Production incident with unclear cause
- Independent high-risk review

## Do not escalate for

- CSS, copy, mechanical edits
- Clear tests, docs, trivial refactors

## Stuck loop

After two attempts without verified forward movement:

```
STOP → ROOT_CAUSE_NOT_VERIFIED → ESCALATE
```

Do not burn tokens in endless loops.
