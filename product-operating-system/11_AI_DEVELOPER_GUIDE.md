# 11 — AI Developer Guide

**Version:** 2.0  
**Owner:** AI Systems Architect + CTO  
**Authority:** How agents ship on-brand without founder access

---

## Purpose

AI agents implement **correct product** from POS — not from stale code patterns.

---

## Minimum Read Set (every task)

1. [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)  
2. [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md)  
3. [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md)  
4. **One domain doc** (04–09 or task-specific)  
5. [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) if shipping  
6. [14_DECISION_LOG.md](./14_DECISION_LOG.md) if architectural

**POS beats legacy docs and code habits.**

---

## Decision Protocol

```
Request → Constitution → Taste/Manifesto → Domain doc
  → Align with vision? Implement
  → Legacy-only patch? Label "maintenance" + minimal change
  → Unclear? Open Question in PR — do not invent product
```

**Default:** implement **vision**, not existing bugs.

---

## Forbidden (without ADR + approval)

| Action | Why |
|--------|-----|
| New parent coach surface | PA-01 |
| Child forms/settings | C-01 |
| Star IAP | R-02 |
| Dashboard on Hem | P-04 |
| Generic/template UI | 00B |
| Tailwind CDN in product | DS-04 |
| Dark engagement patterns | G-01 |
| Global paywall middleware | ADR-005 |

---

## Required

| Action | When |
|--------|------|
| Cite POS rules in PR | User-facing |
| Run test gate | Server/auth/journey |
| Quality standard checklist | Before complete |
| ADR append | Architecture/product authority |
| Bump static cache version | Client asset changes |

Env commands: `AGENTS.md` only.

---

## Code Guidance (minimal)

- Server owns product decisions; validate auth; parameterized queries  
- Client: small modules; expose minimal globals  
- Prefer new file over 2500-line file growth  
- Grep before editing large legacy files

---

## Testing Map

| Change | Minimum |
|--------|---------|
| Journey/coach | test gate |
| Auth/child scope | auth + child integration tests |
| Paywall | paywall contract test |
| Static routes | link/route tests |

---

## AI Instructions

Output which POS sections governed the change. Refuse off-manifesto requests with rule citation.

---

## CXO Review Summary

All roles **10/10** — v2.0.
