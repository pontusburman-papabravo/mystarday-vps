# 14 — Decision Log

**Authority:** Accepted architectural and product decisions  
**Format:** ADR entries — append only

---

## Index

| ID | Date | Title | Location |
|----|------|-------|----------|
| ADR-child-ia-2026-07-02 | 2026-07-02 | Canonical child IA: Idag / Min värld / Familj | This file §1 |
| ADR-boendeschema | 2026-05 | Custody schedule semantics | `docs/boendeschema-adr.md` |
| ADR-helrutin | 2026-05 | Helrutin semantics | `docs/helrutin-semantik-adr.md` |
| ADR-journey-onboarding | 2026-06 | Journey onboarding defer | `docs/decisions/journey-onboarding-defer.md` |
| ADR-for-dig-defer | 2026-06 | För dig defer | `docs/decisions/for-dig-defer.md` |

---

## §1 — Child information architecture (2026-07-02)

**Status:** Accepted  
**Context:** `docs/informationsarkitektur-barnapp.md` listed Idag / Skattkammaren / Familj as three roots. POS rules and brain use Idag / Min värld / Familj.

**Decision:**

- **Canonical three child places:** Idag · Min värld · Familj (POS 00A, 04)
- **Skattkammaren** is the star-reward surface inside the reward loop (Min värld / universe), not a fourth root tab
- **Mina personer** is a Familj sub-surface
- `docs/informationsarkitektur-barnapp.md` is **historical** — superseded for IA by this ADR

**Consequences:**

- New child nav work follows three-root model
- Marketing may still name Skattkammaren — product IA treats it as reward chamber

---

## How to add ADR

1. Append row to index  
2. Add section or linked `docs/*-adr.md`  
3. Reference in PR for architectural changes
