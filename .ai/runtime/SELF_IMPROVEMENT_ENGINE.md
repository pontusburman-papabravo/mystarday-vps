# SELF_IMPROVEMENT_ENGINE

**Version:** 1.0  
**Role:** Continuous codebase improvement when primary mission completes or idle  
**Invoked:** WORKFLOW Phase 14 · between missions

---

## Purpose

Composer must **never stop at "good enough"** when long-term product value remains on the table. Automatically find, prioritize, and queue improvements — not random refactors.

---

## Activation Conditions

Run when **any** true:

1. Primary mission reached WORKFLOW Phase 13 (PR open) with capacity remaining  
2. User message: "continue" · "improve" · "what's next" · idle  
3. test:gate green + no open BLOCK reviews  
4. Explicit debt sprint mission  

**Rule SI-01:** Do not start improvement missions if primary mission BLOCK gates open.

---

## Discovery Scan (ordered)

Execute scans — record findings in **Improvement Backlog** — default: `.ai/knowledge/BACKLOG.md` (update after each mission):

| # | Scan | Method | Finds |
|---|------|--------|-------|
| 1 | **Technical debt** | Grep TODO/FIXME/hack · large files list | Deferred work |
| 2 | **Duplicated logic** | Grep similar route handlers · copy-paste patterns | Dedupe targets |
| 3 | **Inconsistent UX** | Compare child header/nav patterns across pages | UX drift |
| 4 | **Outdated docs** | SYSTEM_ANALYSIS vs routes · stale comments | Doc fixes |
| 5 | **Architecture violations** | Global middleware · client authz · dual coaches | Structural fixes |
| 6 | **Missing tests** | test:gate coverage gaps · auth routes without contract tests | Test additions |
| 7 | **Slow components** | Large JS files · sync loops in hot paths | Perf targets |
| 8 | **Accessibility issues** | Missing labels · small targets in touched areas | A11y fixes |
| 9 | **Animation inconsistencies** | Celebration timing ≠ 03B | Motion alignment |
| 10 | **Design inconsistencies** | Off-palette · non-03A patterns in child UI | Visual debt |

**Rule SI-02:** Scans are read-only until item prioritized and promoted to mission.

---

## Prioritization Formula

Score each finding **Impact × Confidence / Effort** (1–5 each):

| Factor | 5 = | 1 = |
|--------|-----|-----|
| **Impact** | First Success / child trust / security | Admin cosmetic |
| **Confidence** | Proven user pain or failing test | Guess |
| **Effort** | ≤1 hour | Multi-day |

**Priority bands:**

| Score | Action |
|-------|--------|
| ≥40 | Promote to next mission immediately |
| 20–39 | Queue top 3 for session |
| 10–19 | Backlog note |
| <10 | Drop |

**Tie-break:** Security > child path > parent path > admin > docs.

---

## Improvement Mission Types

Promoted items become missions via MISSION_ENGINE:

| Type | Example |
|------|---------|
| `bugfix` | Flaky test · authz gap |
| `refactor` | Extract module per Fas 8 pattern |
| `debt` | Remove duplicate SQL |
| `feature` | Only if POS-aligned AND passes CPO gate — rare for idle |

**Rule SI-03:** Idle improvement default type is `refactor` or `debt` — not feature creep.

---

## Bounded Improvement Rules

| Rule | Detail |
|------|--------|
| SI-B01 | One improvement mission at a time |
|  SI-B02 | Each must pass full WORKFLOW (no shortcut) |
| SI-B03 | Max 3 idle improvements per session unless user asks more |
| SI-B04 | Never "improve" by expanding frozen governance |
| SI-B05 | SW bump only when static assets touched |

---

## Category → TASK_ROUTER mapping

| Finding category | Routed to |
|------------------|-----------|
| Duplicated logic | Principal + domain engineer |
| Missing tests | QA + domain engineer |
| Slow child path | Performance + Frontend |
| Animation drift | Game + Frontend |
| Design drift | Creative + Frontend |
| Architecture smell | Architect + CTO lens |
| A11y | Accessibility + Frontend |
| Stale SYSTEM_ANALYSIS | docs mission — runtime only update if approved |

---

## Stop Conditions

Stop self-improvement loop when:

- User ends session  
- BLOCK gate fails on improvement mission  
- 3 improvements completed in session  
- Backlog score <20 for all remaining items  
- Founder escalation open  

---

## Anti-Patterns

- Rewriting working code for style only  
- New features disguised as cleanup  
- Mass rename without mission  
- Updating frozen POS/AOS/COS/PCB without contradiction ADR  
- Running npm test full suite on live VPS with email keys  

---

## Example Idle Cycle

```
1. Mission complete: fix child PIN gate
2. SELF_IMPROVEMENT scan finds duplicate PIN check in client
3. Score: Impact 4 · Confidence 5 · Effort 2 → 10 → band 20–39
4. New mission: refactor — server-only PIN authority
5. Full WORKFLOW → PR #2
6. Scan again → no item ≥20 → stop
```

---

## Completion

Self-improvement cycle complete when backlog top items under threshold or session limits hit — documented in final PR comment or session summary.
