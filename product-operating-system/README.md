# Product Operating System (POS)

**Version:** 2.0 (restored 2026-07-02)  
**Authority:** Absolute product truth for Stjärndag  
**Supremacy:** POS wins over code, COS, and implementation

---

## What POS is

POS describes **what the company builds** and **how it must feel**. It is not the AI organization's operating system — that is COS (`.ai/company/`).

---

## Read order (minimum before any product change)

| Step | Document |
|------|----------|
| 1 | [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) |
| 2 | [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md) |
| 3 | [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md) |
| 4 | Domain doc for task (04–09, 03A/B, 06A) |
| 5 | [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) before ship |

---

## Document map

| Doc | Topic |
|-----|-------|
| `00` | Constitution (six rules) |
| `00A` | Experience manifesto — child + parent feeling |
| `00B` | Product taste — premium vs cheap |
| `04` | Child experience (Idag · Min värld · Familj) |
| `05` | Parent experience (Hem, coach, planning) |
| `06` | Game design (G-rules, motivation) |
| `07` | Rewards & stars |
| `09` | World engine & unlock philosophy |
| `10` | Technical architecture |
| `14` | Decision log (ADR index) |
| `15` | Product quality standard |

Creative contracts (PCB, WDB, Art Bible): `.ai/product/` — subordinate to POS.

Operational engine specs: `docs/first-success/` — implementation detail under POS.

---

## Rule ID namespaces

| Prefix | Domain |
|--------|--------|
| P- | Parent experience |
| C- | Child experience |
| PA- | Parent authority / coach |
| G- | Game design |
| R- | Rewards / economy |
| T- | Technical architecture |
| QS- | Quality standard |
| REL- | Release |

---

## Changing POS

Rare. Requires ADR in [14_DECISION_LOG.md](./14_DECISION_LOG.md). Agents do not edit POS in feature PRs.
