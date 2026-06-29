# 10 — Tech Architecture

**Version:** 1.0  
**Authority:** Technical boundaries and extensibility — implements [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) engineering principles

---

## Purpose

Document the **approved architecture** for Stjärndag: what exists, what may be extended, and what requires ADR before change. Supports iPhone, Android, Web, offline, future AI/worlds/multiplayer **without rewrites**.

## Scope

Server, database, client, mobile, deploy, integrations. Not visual design (03) or QA process (12).

## Definitions

| Term | Definition |
|------|------------|
| **Remote WebView** | Capacitor loads live site URL — not bundled SPA |
| **Query layer** | `db/*.js` modules (partial adoption) |
| **Product authority** | Journey Context + Gate — Target State |
| **Facts layer** | DB → collector → engine/journey |

---

## Architecture Overview

```
Clients (PWA / Capacitor iOS/Android / Admin)
        │
        ▼
Express (app.js) ─ middleware chain ─ registerRoutes()
        │
        ├── src/routes/ (77 modules)
        ├── src/lib/ (134 modules, schedulers)
        ├── src/core-engine/ (Product Engine — transitional)
        ├── src/lib/journey/ (Family Journey — Target authority)
        └── db/*.js → src/lib/db.js (pg pool)
        │
        ▼
PostgreSQL (66 migrations)
        │
External (optional): Resend, R2/local uploads, RevenueCat, VAPID, APNs, FCM
```

---

## Current State (verified)

### Runtime

| Item | Value |
|------|-------|
| Node | 20 (`.nvmrc`) |
| Entry | `server.js` → `createApp()` in `app.js` |
| Schedulers | 14 started in `server.js` |
| Static | `public/` + `/uploads` |
| Health | `GET /health` — static JSON |

### Middleware order (security-critical)

1. Resend webhook (raw body)
2. JSON, cookies, request ID
3. `restoreParentSession` → `optionalAuth` → `globalLimiter`
4. Platform HTML inject, security headers
5. Maintenance (IAP exempt)
6. `/api`: CSRF → impersonation block → child API block → apiLimiter
7. Routes → static → 404

### Auth

| Layer | File |
|-------|------|
| JWT | `src/middleware/auth.js` |
| Authz | `src/middleware/authz.js` |
| Child block | `child-parent-api-block.js` |
| CSRF | `csrf.js` |
| Subscription components | `require-component.js` |

### Mobile

Capacitor 7 — `capacitor.config.ts` remote URL; iOS in repo; Android generated via `cap:sync:android`. `platform.js` unregisters SW on native.

### Deploy

GitHub Actions → VPS SSH → `npm ci` → migrate → systemd restart. See `AGENTS.md`, `.github/workflows/deploy.yml`.

### Product intelligence (transitional)

| System | Status |
|--------|--------|
| Family Journey | Implemented Fas 1–5; flags mostly OFF |
| Product Engine | `/api/family/first-success`; shadow mode |
| Readiness | Legacy |
| Activation Program | Active enrollments |

---

## Target State

| Area | Target |
|------|--------|
| **Product authority** | Journey + Gate only — [14_DECISION_LOG.md](./14_DECISION_LOG.md) ADR-001 |
| **Schedulers** | All retention comms through Gate |
| **Query layer** | Routes use `db/*` — no inline SQL in routes |
| **Rate limits** | Redis-backed for multi-instance |
| **Job runner** | Central queue vs 14 setTimeout loops |
| **OpenAPI** | Generated route inventory |
| **CSP** | Enforced not report-only |
| **Bundling** | Optional esbuild for JS — phased |
| **Multi-instance** | Advisory locks → shared job ownership |

---

## Extension Points (build without rewrite)

| Future need | Extension mechanism |
|-------------|---------------------|
| **Content packs** | `global-library-import.js`, feature flags, migrations |
| **New worlds/rooms** | `universe-engine` arrays + client room module |
| **New Journey phases** | `phases.js`, registry JSON, migration for milestones |
| **New billing component** | `config/component-feature-map.js`, `requireComponent()` |
| **AI coaching** | Facts collector + presentation adapter — never in UI |
| **Multiplayer/family sync** | SSE today; family-scoped IDs ready |
| **i18n** | `src/lib/i18n.js` — expand locales |
| **Native features** | `platform.js` facade + Capacitor plugins |

---

## Layer Rules

**T-01** Business logic in server — not in HTML inline scripts.  
**T-02** Product decisions in Journey/Engine — UI is dumb channel.  
**T-03** Child cannot hit parent APIs — server enforced.  
**T-04** Parameterized SQL only.  
**T-05** New routes mount in `src/routes/index.js` with order comment if sensitive.  
**T-06** Migrations idempotent; timestamp prefix in `migrations/`.  
**T-07** SW cache version bump on static asset changes — CI gate.  
**T-08** Secrets never committed — env vars only.  
**T-09** Third-party keys optional — graceful degradation.  
**T-10** Large files: extract modules — see `.cursor/rules/large-files.mdc`.

---

## Key Directories

| Path | Owns |
|------|------|
| `src/routes/` | HTTP handlers |
| `src/middleware/` | Cross-cutting HTTP |
| `src/lib/` | Services, schedulers, journey |
| `src/core-engine/` | Product Engine (transitional) |
| `db/` | SQL query modules |
| `public/js/` | Client IIFE modules |
| `migrations/` | Schema deltas |
| `test/` | Node test runner |

---

## Anti-patterns

- New global subscription middleware in `app.js`
- Duplicate authz (`childAccess.js` pattern)
- Business logic in `public/admin` without API
- Cron-less scheduler duplication without advisory lock
- Tailwind CDN

---

## Acceptance Criteria

Architecture change approved when:

- [ ] Decision Log entry if structural
- [ ] T-01–T-10 preserved
- [ ] `test:gate` green
- [ ] Route inventory updated if routes added (`npm run dump:routes`)
- [ ] No new product authority without sunset plan

---

## Implementation Guidance

Read `SYSTEM_ANALYSIS.md` before structural work. Prefer Target State patterns.

Node 20 in all shells: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent workflow |
| [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | test:gate |
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Deploy |
| [14_DECISION_LOG.md](./14_DECISION_LOG.md) | ADRs |

---

## AI Instructions

1. Read middleware order before new `/api` routes.
2. Do not reintroduce Stripe or global paywall.
3. Mount-order sensitive: `/api/me` child routers before catch-alls.
4. Use `db/*` for new queries.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Extension table shows acquisition-ready platform story |
| **CPO** | Journey target authority clear |
| **CTO** | Accurate Current State from SYSTEM_ANALYSIS |
| **Principal Engineer** | T-rules and mount order protect regressions |
| **Senior Game Designer** | Universe extension path clear |
| **UX Director** | N/A |
| **Art Director** | N/A |
| **QA Director** | test:gate referenced |
| **Security Engineer** | Middleware chain documented |
| **AI Systems Architect** | Directory map + T-rules essential for agents |

**Approved:** All roles — v1.0.
