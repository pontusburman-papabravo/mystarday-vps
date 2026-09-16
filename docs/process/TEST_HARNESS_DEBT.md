# Test harness debt registry

Tracked **TEST_HARNESS** / **RESOURCE_LEAK** / **DB_LOCK** issues — not product defects. See [`contracts/TEST_EXECUTION_STOP_RULE.md`](./contracts/TEST_EXECUTION_STOP_RULE.md).

**Do not** fix product/widget behavior to silence these; fix isolation, cleanup, or determinism in the test harness.

| ID | Status | Test | Symptom | Classification | Evidence | Notes |
|----|--------|------|---------|----------------|----------|-------|
| TH-001 | OPEN | `test/r45b-widget-server-parity.integration.test.js` — `R4.5b: parent bind sets completed_by parent + widget_ios` | `POST /api/widget/complete-action` returns **409** instead of **200** (`completeRes.status`) under full `npm test` | `TEST_HARNESS` | CI fail run `33261235924` @ `d053d85b` (1002/1003 pass); same-SHA pass run `33261238952` | Intermittent on PR #1112 docs-only branch. **Out of scope:** widget route/product behavior. **In scope:** `listenApp()` / `setupTestDb()` cleanup, idempotency-key isolation, parallel full-suite contention. |

## When to add a row

- Same test fails and passes on the **same commit** without code changes
- Failure is `409` / advisory lock / hung process / leaked server — not an assertion on product semantics
- Isolated reproducer or smallest failing file is identified

## Resolution checklist (TH-001)

- [ ] Reproduce with `NODE_ENV=test node --test test/r45b-widget-server-parity.integration.test.js` (isolated)
- [ ] If only fails in full `npm test`, treat as suite contamination — audit harness cleanup
- [ ] Fix harness only; do not change widget bind/complete semantics unless separate product bug is proven
