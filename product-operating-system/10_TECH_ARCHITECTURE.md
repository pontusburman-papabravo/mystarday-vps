# 10 — Technical Architecture

**Rule namespace:** T-01–T-07

---

## Stack

Express.js + PostgreSQL · static MPA frontend (`public/`) · Capacitor remote WebView · VPS deploy

---

## Principles

| ID | Rule |
|----|------|
| T-01 | Business logic on server — UI is channel |
| T-02 | One Journey / Product Engine authority — no parallel brains |
| T-03 | Child cannot hit parent APIs — middleware enforced |
| T-04 | Parameterized SQL via `db/*.js` |
| T-05 | Migrations idempotent, rollback-compatible one release |
| T-06 | Secrets in env only |
| T-07 | Optional integrations degrade gracefully |

---

## Critical paths

| System | Location |
|--------|----------|
| Routes | `src/routes/` |
| Authz | `src/middleware/authz.js` |
| Journey | `src/lib/journey/` |
| Core Engine | `src/core-engine/` |
| Experience packs | `config/experience-packs/` |
| Platform runtime | `src/lib/platform-runtime/` |

---

## Middleware order

Do not reorder without Architect review — see `.cursor/rules/080-backend.mdc`.

---

## Forbidden

Global subscription middleware · second coach API · Stripe revival without ADR · client-only authz

---

## Target vs current

`docs/engineering-architecture-barnapp.md` describes React target — **current truth is MPA**. Migrate via ADR, not assumption.
