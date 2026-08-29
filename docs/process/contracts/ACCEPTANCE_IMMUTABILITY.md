# Acceptance Criteria Immutability

> **DO NOT MOVE THE GOALPOSTS.**

The agent must not change spec/acceptance criteria because implementation failed.

## Changing an existing test

1. Show why the test is wrong
2. Show canonical behavior/spec
3. Separate testfix from implementationfix

R3 changes require extra caution.

If requirements conflict with reality, report:

```
SPEC_CONFLICT
```

with evidence — do not silently narrow scope.
