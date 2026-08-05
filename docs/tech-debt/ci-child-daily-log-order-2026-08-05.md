# CI — `child-daily-log-order` P1 failures on main (2026-08-05)

**Status:** monitor / fix before global English ON  
**Observed:** GitHub Actions on PR #874 head (`18353ff2`) — `test:gate:db` reported **2 fail** in `P1 child daily-log order regression (A–H)`, subtest **G** (parent reorder after child reorder).

## Contract

`test/child-daily-log-order.integration.test.js` — P1 regression for child `/api/me/daily-log` order vs parent `sort_order`. Scenario **G** verifies parent reorder replaces the child's prior custom order (`child_sort_order` cleared on parent `/api/daily-log-items/reorder`).

## Local repro (2026-08-05)

On Cloud Agent VM, isolated file and full `npm run test:gate:db` both **green**. Suggests CI flake, timing, or shared-DB contention — still treated as **hard gate** before `english_app_global_enabled` ON per founder smoke runbook.

## Fix scope

- Harden test G: assert child reorder HTTP 200 before parent reorder (merged in gate PR).
- If CI fails again: capture full TAP from Actions; check advisory lock / parallel DB tests.

## Out of scope

- Global English (#870) — does not cause this contract; does not waive the gate.
