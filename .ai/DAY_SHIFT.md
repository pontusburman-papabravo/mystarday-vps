# Day Shift

**Version:** 1.0 · **Frozen** — changes via [GOVERNANCE.md](GOVERNANCE.md)
**Applies when:** Human is available for questions, review, and Level 4 decisions  
**Goal:** Collaborative delivery with faster feedback loops and broader scope

---

## Mission

Execute user-directed work with full team OS compliance. Humans resolve ambiguity; agents implement, verify, and propose.

---

## Additional Autonomy (vs Night Shift)

| Category | Day shift |
|----------|-----------|
| **New features** | Allowed when POS + user spec define behavior |
| **ADR drafting** | Agent drafts; human accepts before implementation of Level 3 items |
| **Product clarification** | Agent may ask human and wait (blocking OK) |
| **UX judgment calls** | Escalate to human / CPO role review when POS ambiguous |
| **Scope negotiation** | Agent proposes cuts; human approves |
| **PR merge** | Human merges — agent never merges to main |

Night shift forbidden items remain forbidden without explicit human instruction.

---

## Day Shift Workflow

```
1. Read .ai/AGENTS.md + this file
2. Clarify spec with human if ambiguous (Level 4 topics → must ask)
3. PLAN → cite POS sections → identify roles
4. SPEC → IMPLEMENT → TEST → VERIFY → RED TEAM → BUG HUNT → FIX → REGRESSION
5. PR with checklist + POS citations
6. Respond to human review feedback
7. MORNING_REPORT sections in PR if work spans sessions
```

---

## Human Collaboration Rules

1. **Ask early** on Level 4 — do not implement and revert.
2. **Propose options** with tradeoffs for Level 3 — include ADR draft.
3. **One question batch** — group clarifications, don't drip-feed.
4. **Show evidence** — screenshots, test output, profiler results.
5. **Respect veto** — human override on product is final.

---

## Decision Handling

**Canonical source:** [DECISION_MODEL.md](DECISION_MODEL.md) — same levels 1–4 as night shift.

| Level | Day shift behavior |
|-------|-------------------|
| 1–2 | Same as night — proceed (+ PR note for L2) |
| 3 | Draft ADR → human review → implement after acceptance |
| 4 | Stop → ask → wait |

Night shift forbidden items remain forbidden without explicit human instruction.

---

## PR Requirements (day)

- Conventional commit messages
- PR body: what · why · POS refs · test evidence · risks
- Self-review per `.cursor/rules/180-self-review.mdc`
- Definition of Done per `.cursor/rules/190-definition-of-done.mdc`

---

## Still Forbidden (even day shift)

Unless human gives **explicit written instruction** in the session:

- Merge to `main`
- Constitution / vision / monetization / security policy changes
- Architecture contradicting accepted ADR
- Shipping below quality gate to meet deadline (quality wins — QS-03)
