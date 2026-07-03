# Open Pull Requests

**Last updated:** 2026-07-03  
**Reconcile with GitHub before acting.**

---

## Draft — awaiting human merge review

| IRC | PR | Branch | Risk | Status | Notes |
|-----|-----|--------|------|--------|-------|
| IRC-007 | #527 | `cursor/cae-governance-a11y-5e52` | Low | Draft | Governance + a11y; SW v489 |
| IRC-008 | #528 | `cursor/lint-public-budget-5e52` | Low | Draft | CI eslint budget |
| IRC-009 | #529 | `cursor/morgonhus-a11y-parity-5e52` | Low | Draft | Morgonhus aria-live; SW v490 |
| IRC-010 | #531 | `cursor/pack-living-slot-guard-5e52` | Low | Draft | Pack structural guard test |
| IRC-011 | #532 | `cursor/loe-timer-edge-tests-5e52` | Low | Draft | LOE timer edge tests |
| IRC-012 | #534 | `cursor/garden-bloom-aria-5e52` | Low | Draft | Garden bloom aria-live; SW v491 |
| IRC-013 | #536 | `cursor/memory-hall-scaffold-5e52` | Low | Draft | **Superseded by IRC-014** — close on merge |
| IRC-014 | #539 | `cursor/memory-hall-bl012-5e52` | Med | Draft | BL-012 + CAP-003/005 — **rebased on main** (CAP-007-R1) |
| IRC-015 | #540 | `cursor/memory-hall-art-spec-bl041-5e52` | Low | Draft | Art spec + handover; no binaries |

---

## In progress (this session)

| IRC | PR | Branch | Status | Notes |
|-----|-----|--------|--------|-------|
| IRC-016 | #541 | `cursor/autonomous-relay-resume-b105` | Draft | Relay + CAP-003/004/005 — **parity with #539** |

---

## Suggested merge order

```
IRC-007 → IRC-008 → IRC-009 → IRC-010 → IRC-011 → IRC-012
  → IRC-014 (rebase main; supersede IRC-013)
  → IRC-015
  → IRC-016
```

Guide: `docs/reports/irc-bundle-2026-07-03.md`

---

## Superseded

| IRC | PR | Superseded by |
|-----|-----|---------------|
| IRC-013 | #536 | IRC-014 (#539) |

---

## Agent rules

- Draft PR ≠ pause for human
- Do not merge protected branches without HAG
- Update this table when opening/closing PRs
