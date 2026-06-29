# Workflow — Performance

**Version:** 1.0  
**Roles:** Performance · Architect · QA Director

---

## Input

- Reported slowness or profiler output
- Hot path identification (route · query · render loop)
- Baseline metrics (before)

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Measure** | Reproduce · timestamp · query explain |
| 2 | **Hypothesis** | Single bottleneck targeted |
| 3 | **Fix** | Query index · cache · batch · animation budget |
| 4 | **Measure again** | Same conditions · document after |
| 5 | **Regression** | Gate + no UX behavior change |
| 6 | **PR** | Before/after numbers in description |

---

## Output

- Metric improvement evidence
- No product behavior regression
- Optional: perf note in `docs/` if operator-relevant

---

## Quality Gates

- [ ] Measurable improvement or documented tradeoff
- [ ] MO-07 not regressed (POS 15)
- [ ] Celebrations still ≤2s and non-blocking
- [ ] 60 fps on touched animations

---

## Stop Conditions

- Fix requires product behavior change → CPO
- Fix requires architecture change → Level 3 ADR
- Cannot measure → do not merge speculative optimisations
- Cuts motion below manifesto bar → Parent Experience review
