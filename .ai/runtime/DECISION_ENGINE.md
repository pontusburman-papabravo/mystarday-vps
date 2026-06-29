# DECISION_ENGINE

**Version:** 1.0  
**Role:** Deterministic approve / veto for every significant choice  
**Invoked:** PLANNING (pre-check) · IMPLEMENTATION (per decision) · REVIEW (final)

---

## Purpose

Remove founder judgment from routine decisions. Every choice passes the **Seven Questions** or receives an explicit **BLOCK** with resolution path.

---

## The Seven Questions (mandatory)

Each decision record must answer all seven. **Fail any applicable = BLOCK.**

| # | Question | Pass condition | N/A when |
|---|----------|----------------|----------|
| Q1 | **Is this better for the child?** | Improves capability, independence, delight, or safety; never guilt/shame/comparison | Pure admin/backend with zero child effect |
| Q2 | **Is this better for the parent?** | Reduces stress, confusion, or nagging; builds trust | Pure child delight with no parent surface |
| Q3 | **Does this align with POS?** | Cite section; no Constitution violation | Never N/A for user-facing |
| Q4 | **Does it reduce complexity?** | Fewer concepts, files, or branches vs status quo | Replacement requires temporary dual path — must have expiry |
| Q5 | **Does it improve long-term maintainability?** | Easier to test, read, extend in 2 years | — |
| Q6 | **Would Apple ship this?** | Privacy clear · no dark patterns · native-quality polish on touched surfaces | Backend-only |
| Q7 | **Would Nintendo be proud of this?** | Fair · no casino · child respected · delight skippable | Non-child non-game backend |

**Rule D-01:** N/A requires one-sentence justification in decision log.

---

## Decision Record Template

```markdown
### Decision: [short title]
- **Context:** …
- **Options considered:** A · B · C
- **Chosen:** B
| Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 |
|----|----|----|----|----|----|-----|
| ✓ | ✓ | ✓ | ✓ | ✓ | N/A | ✓ |
- **POS refs:** …
- **Reviewer flags:** none | [role]: concern
```

---

## Deterministic Scoring

When multiple options pass all questions, tie-break **in order**:

1. **Smaller diff** (lines + files)  
2. **Fewer new dependencies**  
3. **Better test coverage path**  
4. **POS-explicit pattern** over novel pattern  
5. **Deletion** over addition  

**Rule D-02:** If still tied → choose option that removes duplicate system.

---

## Automatic BLOCK Triggers

No scoring — immediate BLOCK:

| Trigger | Source |
|---------|--------|
| Violates Constitution Rules 1–5 | POS 00 |
| G-01–G-08 violation | POS 06 |
| W-01–W-05 violation | POS 09 |
| C-01–C-08 violation | POS 04 |
| Global paywall on child path | ADR / COS 003 |
| Client-only auth or unlock | AOS 120, COS 003 |
| Login reward / loot box / shame streak | COS 004 |
| Secret in repo | AOS 120 |
| Duplicated coach / journey brain | POS 02, COS 002 |
| PCB world fiction break | PCB world bible |
| Adds TODO/hack without ticket | AOS 000 |

---

## Escalation Matrix

| Situation | Escalate to | Runtime action |
|-----------|-------------|----------------|
| Q3 fail but user insists | Founder + ADR draft | Stop Phase 4 |
| Q6/Q7 conflict (parent analytics vs child) | CPO lens in REVIEW | CPO wins child |
| Q4 vs Q5 conflict (quick hack vs maintainable) | CTO lens | Maintainable wins unless P0 |
| New monetization | CEO playbook | Stop |
| New child data field | CEO + Security | Stop |

---

## Decision Points (when to invoke)

| When | Required |
|------|----------|
| Scope approval | All 7 on mission scope |
| Architecture fork (2+ designs) | Per option + tie-break |
| Dependency add (npm, service) | All 7 + CTO |
| UX copy child-facing | Q1, Q3, Q7 |
| UX copy parent-facing | Q2, Q3 |
| Delete vs deprecate | Q4, Q5 |
| Ship with known P2 | QA + CPO waive documented |

---

## Integration

- **MISSION_ENGINE** — defaults must pass Q1–Q3  
- **PLANNING_ENGINE** — plan blocked if scope fails  
- **IMPLEMENTATION_ENGINE** — mid-build forks re-run engine  
- **REVIEW_ENGINE** — reviewers cite Q1–Q7 failures as BLOCK  
- **QA_ENGINE** — automatic BLOCK triggers overlap  

---

## Anti-Patterns

- "We'll fix complexity later" (Q4 fail)  
- "Parents asked for dashboard" without Q2 stress proof  
- "Industry standard" without Q3 POS cite  
- Waiving Q7 for "just this once" on child UI  

---

## Completion

Decision Engine satisfied when every recorded decision in mission has seven answers and zero unresolved BLOCK triggers.
