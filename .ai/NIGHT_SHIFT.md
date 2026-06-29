# Night Shift

**Version:** 1.0  
**Applies when:** No human is available to answer escalations within the session  
**Goal:** Safe, productive autonomous progress without product or trust risk

---

## Mission

Ship **low-risk engineering value** overnight: bugs fixed, tests added, ADRs implemented, internals improved. Open PRs for human review at dawn. **Never** change what the product *is*.

---

## Allowed (✅)

| Category | Examples |
|----------|----------|
| **ADR execution** | Implement accepted ADRs from `14_DECISION_LOG.md` |
| **Tests** | Write tests · improve coverage · fix flaky tests |
| **Quality tooling** | Run lint · formatting · static analysis |
| **Performance** | Profile · optimize hot paths (no product behavior change) |
| **Bug discovery** | Hunt bugs · write repro tests |
| **Bug fixes** | Fix confirmed bugs within existing product rules |
| **Refactoring** | Internal code structure · extract modules · dedupe |
| **Documentation** | Improve dev docs · fix stale comments · ADR drafts (not accept) |
| **CI / DX** | Improve pipelines · dev scripts · agent tooling |
| **PRs** | Open draft PRs with full MORNING_REPORT sections |

---

## Forbidden (🚫)

| Category | Why |
|----------|-----|
| **Constitution changes** | Level 4 — human only |
| **Product Vision changes** | Level 4 |
| **UX principles changes** | Level 4 — see POS 00A |
| **Game Design changes** | Level 4 — see POS 06 |
| **Parent Experience changes** | Level 4 — see POS 04–05 |
| **Monetization changes** | Level 4 — IAP, paywall, pricing |
| **Security policy changes** | Level 4 — auth model, data classes |
| **Architecture without ADR** | Level 3 — draft ADR + stop, or implement only if ADR accepted |
| **Merge to main** | Human approval required always |

---

## Night Shift Workflow

```
1. Read .ai/AGENTS.md + this file
2. Pick work from: open issues · ADR backlog · test gaps · lint debt · known bugs
3. Classify every decision → DECISION_MODEL.md
4. If any Level 3–4 → STOP, document blocker in MORNING_REPORT
5. Execute: SPEC → IMPLEMENT → TEST → VERIFY → RED TEAM → BUG HUNT → FIX → REGRESSION
6. Open PR (draft OK) — never merge
7. Write MORNING_REPORT.md sections in PR body
```

---

## Work Selection Priority

1. P0/P1 bugs with clear repro and POS-safe fix
2. Accepted ADR implementation
3. Test coverage for recently changed code
4. Lint / static analysis cleanups
5. Performance regressions with measured before/after
6. Refactoring with zero behavior change
7. Documentation accuracy fixes

**Do not start** ambiguous features, new surfaces, or behavior changes not specified in POS + ADR.

---

## PR Requirements (night)

- Title: `night: <concise description>`
- Draft PR preferred
- Body must include all [MORNING_REPORT](MORNING_REPORT.md) sections
- Link POS / ADR citations
- List any Level 3 items as **blocked pending ADR**
- `npm run test:gate` green (or explain why not runnable)

---

## Stop Immediately If

Any condition in [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md) — document in MORNING_REPORT Blockers section and do not proceed.

---

## Handoff

At session end, ensure:

- [ ] All commits pushed to feature branch
- [ ] PR open (or Blockers documented if work incomplete)
- [ ] MORNING_REPORT complete in PR description
- [ ] No uncommitted secrets or debug code
- [ ] No changes to forbidden categories
