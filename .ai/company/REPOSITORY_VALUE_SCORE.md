# Repository Value Score (RVS)

**COS v1.3 — nightly KPI**  
**Purpose:** Optimize for outcomes, not activity.

---

## Rule

> Success is not measured by commits, PRs, or documents written.  
> Success is measured by **repository value created overnight**.

Every morning report must include RVS with **delta vs previous night**.

---

## Dimensions (0–10 each)

| Dimension | Weight | Measures |
|-----------|--------|----------|
| **Child experience** | 1.5× | Calmer mornings, clearer child action, world delight |
| **Product quality** | 1.2× | POS alignment, constitution compliance, no regressions |
| **Architecture** | 1.2× | Simpler systems, reuse, pack-driven design |
| **Test coverage** | 1.0× | Gate green, meaningful tests on touched risk |
| **Documentation** | 0.8× | Knowledge graph, ADRs, accurate maps |
| **Technical debt** | 1.0× | Debt removed minus debt introduced |
| **Performance** | 0.8× | Routine path, mobile 60fps, no regressions |
| **Accessibility** | 0.8× | Touch, contrast, reduced motion |

**Formula:**

```
RVS = Σ (dimension_score × weight) / Σ weights
```

Report as **X.X / 10** with **Δ** (change since last report).

---

## Scoring guide

| Score | Meaning |
|-------|---------|
| 9–10 | Material child or architecture win; gate green; POS cited |
| 7–8 | Solid incremental improvement; no new debt |
| 5–6 | Maintenance only; neutral value |
| 3–4 | Activity without proportional value |
| 0–2 | Regressions, debt, or idle night |

---

## Anti-patterns (do not optimize)

- Commit count
- PR count
- Lines of code
- Document volume without product impact

---

## Example (morning report snippet)

```markdown
## Repository Value Score

| Dimension | Score | Δ | Notes |
|-----------|-------|---|-------|
| Child experience | 8 | +1 | Garden LOE tap loop |
| Product quality | 9 | 0 | POS §6 pack-driven |
| Architecture | 9 | +1 | Reusable LOE runtime |
| Test coverage | 8 | +1 | Timer edge tests |
| Documentation | 9 | +1 | HAG v1.3 ARC tier |
| Technical debt | 8 | +1 | Removed hardcoded scenery |
| Performance | 8 | 0 | No routine-path change |
| Accessibility | 8 | 0 | Hotspots unchanged |

**RVS: 8.5 / 10** (Δ +0.4)
```

---

## Related

- [HUMAN_APPROVAL_GATE.md](./HUMAN_APPROVAL_GATE.md)
- `docs/reports/overnight-report-YYYY-MM-DD.md`
