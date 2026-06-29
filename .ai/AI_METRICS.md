# AI Metrics

**Version:** 1.0  
**Owner:** AI Operations Lead · [roles/ai-operations.md](roles/ai-operations.md)  
**Purpose:** Measure quality trend — **not** maximize commit volume.

---

## Philosophy

| Good signal | Bad signal |
|-------------|------------|
| Fewer regressions | More commits |
| Shorter review cycles | Skipped tests |
| Higher autonomous completion (safe work) | Silent product invention |
| Debt removed | Feature creep |

Aggregate weekly in [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md) Executive Retrospective.

---

## Core Metrics

| Metric | Definition | Source | Target trend |
|--------|------------|--------|--------------|
| **PR Lead Time** | First commit → PR ready for human | GitHub PR | ↓ |
| **Review Time** | PR ready → human first review | GitHub PR | ↓ |
| **Autonomous Completion %** | Night PRs merged without Level 4 blocker / total night PRs | Morning Reports | ↑ (safe scope) |
| **Regression Rate** | Post-merge bugs / merged PRs | Issues · QA | ↓ |
| **Bug Escape Rate** | Live bugs / total bugs found | Incidents · QA | ↓ |
| **Test Coverage** | Gate tests · touched-path coverage | CI · `test:gate` | ↑ or stable |
| **Human Interruptions** | Level 4 escalations / agent sessions | Escalation log | ↓ (better specs) |
| **Architecture Violations** | PRs blocked for ADR/missing ADR | Review notes | ↓ |
| **Security Findings** | P0–P2 security issues per PR | Security review | ↓ |
| **Documentation Coverage** | Behavior PRs with doc updates / total behavior PRs | PR checklist | ↑ |
| **Morning Report Quality** | Reports passing quality bar / total | [MORNING_REPORT.md](MORNING_REPORT.md) | ↑ |
| **Executive Review Findings** | Open items from weekly retro | `.ai/improvements/retros/` | ↓ |
| **Technical Debt Removed** | Lines/modules removed · debt issues closed | PRs · issues | ↑ |
| **Velocity** | Merged PRs per week (weighted by scope) | GitHub | stable — not max |
| **Quality Trend** | Composite: regressions ↓ + gate green ↑ + escalations ↓ | Weekly rollup | ↑ |

---

## Measurement Methods

### Per PR (owner agent records in description)

```markdown
## AI Metrics
| Metric | Value |
|--------|-------|
| Decision levels used | L1: n · L2: n · L3: n · L4: n |
| Gate | pass/fail |
| Human escalation | yes/no |
| Files touched | n |
| Debt removed | yes/no — note |
```

### Weekly rollup (AI Operations)

File: `.ai/improvements/metrics/YYYY-Www.md` or Executive Retrospective appendix.

---

## Quality Trend (composite)

Score components 0–2 each week (higher = better):

| Component | 0 | 1 | 2 |
|-----------|---|---|---|
| Regressions | >2 | 1–2 | 0 |
| Gate failures on merge | >1 | 1 | 0 |
| Level 4 from ambiguity | >3 | 1–3 | 0 |
| Morning reports incomplete | >50% | 10–50% | <10% |
| Architecture violations merged | any | — | none |

**Quality Trend ↑** = total score week-over-week increases.

---

## Anti-Metrics (do not optimize)

- Raw commit count  
- Lines added  
- PR count without scope weighting  
- Speed at expense of gate green  
- Closed escalations by guessing product  

---

## Roles & Accountability

| Metric area | Accountable hat |
|-------------|-----------------|
| Regression / escape | QA Director |
| Security findings | Security |
| Architecture violations | Architect |
| Documentation coverage | Documentation |
| Morning report quality | AI Operations |
| Quality trend | CEO (weekly retro) |

---

## References

- Improvement loop: [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md)  
- Multi-agent: [MULTI_AGENT_COORDINATION.md](MULTI_AGENT_COORDINATION.md)  
- Reporting: [MORNING_REPORT.md](MORNING_REPORT.md)
