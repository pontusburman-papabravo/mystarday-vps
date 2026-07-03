# IRC Bundle — 2026-07-03 (draft merge guide)

**For human review.** Merge order suggested bottom-up (dependencies).

| IRC | PR | Branch | Risk | Merge notes |
|-----|-----|--------|------|-------------|
| IRC-007 | #527 | `cursor/cae-governance-a11y-5e52` | Low | Governance + a11y tests; SW v489 |
| IRC-008 | #528 | `cursor/lint-public-budget-5e52` | Low | CI only; eslint --fix |
| IRC-009 | #529 | `cursor/morgonhus-a11y-parity-5e52` | Low | CSS a11y; SW v490 |
| IRC-010 | #531 | `cursor/pack-living-slot-guard-5e52` | Low | Test only |
| IRC-011 | #532 | `cursor/loe-timer-edge-tests-5e52` | Low | Test + structural guard |
| IRC-012 | #534 | `cursor/garden-bloom-aria-5e52` | Low | Child aria-live; SW v491 |
| IRC-013 | #536 | `cursor/memory-hall-scaffold-5e52` | Low | BL-029 + BL-029b exhibit schema; migration `180951` |

## Pre-merge checklist

- [ ] `NODE_ENV=test npm run test:gate` on merged result
- [ ] `npm run check:governance`
- [ ] `npm run migrate` on staging (not prod without approval)
- [ ] SW/cache-version: take highest (v491+) then bump once if conflicts
- [ ] Route inventory regenerated if API routes merged

## Post-merge human decisions (HRC)

- [ ] BL-012 — World 3 creative direction (see `docs/adr-draft-memory-hall-world.md`)
- [ ] Allowlist test family for `memory_hall_playable` if scaffold QA needed
- [ ] IRC bundle deploy to live hosts

## Scores at checkpoint

- RVS 9.2 / 10
- LWS 8.8 / 10
