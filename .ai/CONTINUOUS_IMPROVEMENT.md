# Continuous Improvement

**Version:** 1.0  
**Owner:** AI Operations Lead · [roles/ai-operations.md](roles/ai-operations.md)  
**Rule:** Agents **propose** improvements to Team OS — they **never** self-modify Product OS or Constitution.

---

## Mission

The AI team gets better every week without eroding product truth. Quality trends up; repeated failures trend down.

---

## Improvement Sources

| Source | Captured in | Owner |
|--------|-------------|-------|
| **Lessons Learned** | PR retros · Morning Report "Risker" | Implementing agent |
| **Pattern Discovery** | `.ai/improvements/patterns/` (proposals) | Any agent |
| **Workflow Improvements** | Issue or PR to `.ai/workflows/` | AI Operations |
| **Rule Improvements** | Issue or PR to `.cursor/rules/` | AI Operations + human |
| **Repeated Human Feedback** | `.ai/improvements/feedback-log.md` | AI Operations |
| **Recurring Failure Analysis** | `.ai/improvements/failures/` | QA Director |
| **Technical Debt Discovery** | Issues tagged `tech-debt` | Architect |
| **Product Debt Discovery** | Escalate to human — **not** Team OS | CPO |

---

## Weekly Improvement Loop

```
Monday    — Aggregate AI_METRICS.md signals from prior week
Tuesday   — Pattern review: recurring failures + human feedback
Wednesday — Propose Team OS / workflow / rule changes (PR)
Thursday  — Human review of Level 2+ proposals
Friday    — Executive Retrospective (async, written)
```

Agents running **night shift** may contribute to the loop via Morning Report sections and improvement proposals — not by editing POS.

---

## Executive Retrospective (weekly, written)

Template (append to `.ai/improvements/retros/YYYY-Www.md` or PR comment):

```markdown
## Executive Retrospective — YYYY-Www

### What improved
-

### What regressed
-

### Top 3 failure patterns
1.

### Proposed Team OS changes (links)
-

### Product debt escalations (human only)
-

### Metrics snapshot
See AI_METRICS.md — [link or table]
```

**Participants (hats):** CEO · CPO · CTO · QA Director · AI Operations Lead.

---

## Proposal Rules

Team OS is **frozen** — all changes follow [GOVERNANCE.md §5](GOVERNANCE.md#5-change-process).

| Target | Agent may | Requires |
|--------|-----------|----------|
| `.ai/` (Team OS) | Draft PR only | Executive Review + **human merge** |
| `.ai/workflows/` | Draft PR | Governance §5 |
| `.ai/standards/` | Draft PR | Governance §5 |
| `.ai/roles/` | Draft PR | Governance §5 |
| `.cursor/rules/` | Draft PR | Human merge (adapter layer) |
| `product-operating-system/` | **Never edit** | Human + CPO process |
| `docs/PRODUCT-CONSTITUTION.md` | **Never edit** | Human founder |
| ADR acceptance | Draft only | POS 14 human acceptance |

**Level:** Team OS PATCH/MINOR typically Level 2. MAJOR or decision-authority → Level 3 ADR + Governance Executive Review.

---

## Lessons Learned Format

```markdown
### Lesson: [title]
- **Date:** YYYY-MM-DD
- **Context:** branch/PR/incident
- **What happened:**
- **Root cause:**
- **Prevention:** (workflow · rule · test · doc link)
- **POS impact:** none | escalated
```

Store in `.ai/improvements/lessons/` or PR description for human to file.

---

## Anti-Patterns

- ❌ "Fix" product ambiguity by editing POS without human  
- ❌ Hide recurring failures — log in [AI_METRICS.md](AI_METRICS.md)  
- ❌ Optimize commit count over quality trend  
- ❌ Duplicate a rule in a new doc instead of linking canonical source ([KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md))

---

## References

- Metrics: [AI_METRICS.md](AI_METRICS.md)  
- Knowledge classes: [KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md)  
- Multi-agent handoff: [MULTI_AGENT_COORDINATION.md](MULTI_AGENT_COORDINATION.md)
