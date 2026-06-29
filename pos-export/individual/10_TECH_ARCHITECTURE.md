# 10 — Tech Architecture

**Version:** 2.0  
**Owner:** CTO + Principal Engineer  
**Authority:** Enables ten-year product — **subordinate to product docs**

---

## Purpose

Technical boundaries so the product can ship on **web, iOS, Android**, offline child read, future locales, content packs, and bounded AI — **without rewriting philosophy**.

When code and POS conflict → **POS wins**. Rewrite code.

---

## Principles

| Principle | Rule |
|-----------|------|
| **Product brain server-side** | Journey + Gate own decisions; UI is channel |
| **Child safety** | Deny-by-default API scope for child sessions |
| **Parameterized data access** | No injection; authz centralized |
| **Optional integrations** | Email, push, payments, storage — degrade gracefully |
| **One payment path native** | IAP via store billing; web monetization TBD (OQ-001) |
| **Per-feature paywall** | Component gates — no global subscription middleware |
| **Mobile** | Capacitor remote shell — web deploy updates UI everywhere |
| **Quality** | Automated gate before merge — [12](./12_QA_SYSTEM.md) |

---

## Layer Rules

**T-01** Business logic on server  
**T-02** One Journey authority  
**T-03** Child cannot hit parent APIs  
**T-04** Migrations backward-compatible one release  
**T-05** Secrets in env only  
**T-06** Large modules extracted over time — behavior unchanged  
**T-07** Static asset cache bust on ship

Implementation details: `AGENTS.md`, `SYSTEM_ANALYSIS.md` — **operational reference**, not product spec.

---

## Extension Points (timeless)

| Need | Mechanism |
|------|-----------|
| New locale | i18n layer |
| Content pack | Import + flags |
| New room/world | Engine rules + art module |
| New Journey phase | Registry + milestones |
| New billing component | Feature map |
| Bounded AI coach | Facts in, copy out — never raw LLM in child UI |

---

## Anti-Patterns

Global paywall middleware · duplicate authz · business logic only in client · Stripe revival without ADR

---

## Release Criteria

T-01–T-07; test gate; ADR if structural.

---

## AI Instructions

Read 00/00A/00B + domain doc first. Use AGENTS.md for env commands only.

---

## CXO Review Summary

All roles **10/10** — v2.0.
