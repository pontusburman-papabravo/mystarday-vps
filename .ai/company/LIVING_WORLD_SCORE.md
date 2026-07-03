# Living World Score (LWS)

**COS v1.4 — child-world KPI (companion to RVS)**  
**Purpose:** Measure whether Min Värld feels *alive* — not just functional.

---

## Rule

> When several solutions are technically correct, prefer the one where the world feels most alive.

LWS is reported nightly alongside RVS in `docs/reports/overnight-report-*.md`.

---

## Dimensions (0–10 each)

| Dimension | Weight | Measures |
|-----------|--------|----------|
| **Aliveness** | 1.5× | World responds to child action; state visible without text |
| **Discovery** | 1.2× | Hidden depth rewards exploration, not grind |
| **Comfort** | 1.3× | Calm, safe, no urgency/FOMO/guilt |
| **Ownership** | 1.2× | Child acts; world remembers (persistence) |
| **Wonder** | 1.0× | Delight moments ≤2s, skippable, reduced-motion safe |
| **Coherence** | 1.0× | Pack + runtime + client tell one story |

**Formula:** `LWS = Σ (score × weight) / Σ weights`

---

## Anti-patterns (score down)

- Stress timers visible as countdown pressure
- Empty state without invitation to explore
- Mechanics that punish absence
- Visual state disconnected from server truth

---

## Related

- [REPOSITORY_VALUE_SCORE.md](./REPOSITORY_VALUE_SCORE.md)
- [STRATEGIC_INTENT.md](./STRATEGIC_INTENT.md)
- POS 09_WORLD_ENGINE · G-01–G-08
