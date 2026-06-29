# Quality Index

**Version:** 1.0  
**Used by:** All agents on every PR · complements QA Director veto

---

## Purpose

Replace subjective "looks good" with **scored dimensions**. Each reviewer agent assigns 0–10. Floors are **hard BLOCK** — PR cannot merge below floor.

---

## Dimensions

| # | Dimension | Owner agent | Floor | 10 means |
|---|-----------|-------------|-------|----------|
| 1 | Architecture | CTO + Principal Engineer | **9** | Clear boundaries, no duplicate systems, ten-year sound |
| 2 | Maintainability | Principal Engineer | **9** | Easier to read than before; tested; no debt added |
| 3 | Performance | Performance Lead | — | No hot-path regression; mobile-fast |
| 4 | Accessibility | Accessibility Lead | **9** | WCAG AA on touched paths; reduced motion |
| 5 | Security | Security Lead | **10** | Authz complete; no secrets; child scope enforced |
| 6 | UX | UX Director | — | One primary action; no dead ends |
| 7 | Visual Design | Creative Director | — | Handcrafted; not generic |
| 8 | Animation | Art Director + Game Director | — | 03B timing; skippable |
| 9 | Game Feel | Game Director | **9** | Fair; intrinsic; world as reward |
| 10 | Child Delight | Game Director | **9** | Child wants to return tomorrow |
| 11 | Parent Delight | CPO | **9** | Stress down; trust up |
| 12 | Nintendo Score | Game Director | **9** | Fair play; no casino; respect player |
| 13 | Apple Quality | CEO + Security | **9** | Privacy; polish; no dark patterns |
| 14 | Long-term Product Value | CEO + CPO | — | Compounds mission; not vanity |
| 15 | Technical Debt | Principal Engineer | — | Net debt reduced or unchanged |

---

## Hard BLOCK floors (no merge)

```
Architecture      < 9  → BLOCK
Maintainability   < 9  → BLOCK
Security          < 10 → BLOCK
Accessibility     < 9  → BLOCK
Child Delight     < 9  → BLOCK
Parent Delight    < 9  → BLOCK
Game Feel         < 9  → BLOCK
Nintendo Score    < 9  → BLOCK
Apple Quality     < 9  → BLOCK
```

**Rule QI-01:** QA Director enforces floors. No waiver on Security 10. Other floors waive only P2+ with CEO + domain agent documented (max one release).

---

## Scoring guide (0–10)

| Score | Meaning |
|-------|---------|
| 0–3 | Broken · reject |
| 4–6 | Below bar · must fix |
| 7–8 | Good · fix if below floor |
| 9 | Ship bar |
| 10 | Reference quality · rare |

---

## PR template (required section)

```markdown
## Quality Index
| Dimension | Score | Owner | Notes |
|-----------|-------|-------|-------|
| Architecture | | Principal | |
| … | | | |

**Floors:** pass / BLOCK (list)
```

---

## N/A rules

Backend-only PR: Visual, Animation, Game Feel, Child Delight may be **n/a** with justification. Security and Maintainability never n/a.

---

## Aggregation

- **Ship score:** minimum of scored dimensions with floors  
- **Excellence flag:** no dimension below 9 and at least three 10s  

---

## Relation to runtime

`QA_ENGINE` binary gates must pass **before** Quality Index filled. Index adds nuance; gates add automation.
