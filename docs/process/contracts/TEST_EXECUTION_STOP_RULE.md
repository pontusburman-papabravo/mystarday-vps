# Test Execution Stop Rule

During implementation, the agent must **actively monitor test execution health**.

If any individual test command:

- exceeds its normal expected duration materially,
- produces no meaningful output for **>5 minutes**,
- waits on a DB advisory lock,
- requires repeated manual reruns,
- or exceeds **2×** the recent known runtime for that test level,

the agent must **stop treating it as a normal test failure**.

## Required response

1. **Stop** the stuck run safely (specific PID — never broad `pkill -f`)
2. **Identify** exact process/PID ownership
3. **Classify** the issue as one of:
   - `PRODUCT_CODE`
   - `TEST_HARNESS`
   - `DB_LOCK` / `RESOURCE_LEAK`
   - `CI_INFRA`
   - `NOT_YET_DETERMINED`
4. **Inspect** lifecycle/cleanup paths (`setupTestDb()`, `listenApp()`, advisory lock release)
5. **Run** the smallest isolated reproducer
6. **Avoid** broad process killing or timeout inflation
7. **Avoid** unrelated code changes while diagnosing
8. **Report** the diagnosis before continuing implementation

The agent must **never** spend repeated long cycles rerunning a hanging suite without narrowing the cause first.

## DB-backed tests

- Advisory lock waits are **diagnostic signals**, not reasons to increase timeout
- Every `setupTestDb()` must have **guaranteed cleanup**
- Every `listenApp()` must have **guaranteed close**
- Leaked test resources are treated as **TEST_HARNESS blockers**

## Retry limits

| Situation | Max automatic retry |
|-----------|---------------------|
| Normal deterministic test failure | **1** rerun |
| Hang / lock wait / resource leak | **0** blind reruns |

## R3 hang policy

For **R3** work, any hang or resource leak is itself a **blocker**.

The agent must **not** continue product implementation while the test harness is in an unknown or contaminated state.

Before resuming:

- all test processes from the failed run must be **accounted for**
- DB lock state must be **clean**
- isolated reproducer must **complete** or yield a **concrete diagnosis**

## Diagnosis report format

```
TEST_EXECUTION_STOP
level: L1|L2|L3|L4
command: <exact command>
symptom: hang|lock_wait|no_output|2x_runtime|repeated_rerun
classification: PRODUCT_CODE|TEST_HARNESS|DB_LOCK|CI_INFRA|NOT_YET_DETERMINED
pids: [<pid>, ...]
next: <smallest reproducer or cleanup step>
resume_allowed: yes|no
```

`resume_allowed: no` until harness state is verified clean (mandatory for R3).
