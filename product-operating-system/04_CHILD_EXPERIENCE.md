# 04 — Child Experience

**Rule namespace:** C-01–C-08

---

## Worlds

**Idag** (routine) · **Min värld** (build/explore) · **Familj** (belonging)

Skattkammaren: reward bridge inside star loop — see 00A.

---

## Rules

| ID | Rule |
|----|------|
| C-01 | No forms/settings in child UI (PIN login excepted) |
| C-02 | No schedule editing in child UI |
| C-03 | **One primary action** on Idag — next activity |
| C-04 | Celebrations ≤2s, skippable |
| C-05 | No sibling comparison |
| C-06 | No paywalled pet |
| C-07 | PIN for parent exit; server enforces child scope |
| C-08 | No stats dashboard in child UI |

---

## Implementation

- Small modules in `public/js/child-*.js` — no monolith growth
- Mobile portrait, 44pt touch targets
- Server owns unlocks, stars, progression

---

## Forbidden

Loot boxes · forced world before routine · guilt streaks · educator gamification in child loop
