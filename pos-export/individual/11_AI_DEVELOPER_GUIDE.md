# 11 — AI Developer Guide

**Version:** 1.0  
**Authority:** Rules for autonomous AI agents working on Stjärndag

---

## Purpose

Enable AI developers to ship **correct, on-brand** changes without founder access — by pointing to POS, codebase facts, and forbidden patterns.

## Scope

All AI-assisted coding in this repository. Humans follow the same rules.

## Definitions

| Term | Definition |
|------|------------|
| **POS** | `/product-operating-system/` |
| **Current State** | What code + flags do today |
| **Target State** | What new work must move toward |
| **Maintenance mode** | Explicit user request to patch legacy only |

---

## Read Order (before every task)

1. [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)
2. Task-relevant domain doc (04–09)
3. [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md)
4. [14_DECISION_LOG.md](./14_DECISION_LOG.md)
5. [../SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md) for Current State facts
6. `AGENTS.md` for environment commands

**If legacy `docs/*` contradicts POS → POS wins.**

---

## Decision Protocol

```
Request → Constitution check → Principle check → Current vs Target
    → If Target-aligned: implement
    → If legacy-only: refuse OR maintenance mode with explicit label
    → If unclear: ask user OR log Open Question in PR — do not guess
```

---

## Current State vs Target State (agent defaults)

| Topic | Default for new work |
|-------|---------------------|
| Home coach | Journey (`journey-coach.js`) only |
| Retention email/push | Journey Gate |
| Paywall | `requireComponent()` per route |
| Child UI | Extend `child-*.js` modules |
| Parent schedule | Share `schedule-core.js` |
| Product docs | Update POS if normative change |

Unless user says **maintenance only**, implement **Target State**.

---

## Environment (Cloud / local)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# DATABASE_URL, JWT_SECRET injected on Cloud
NODE_ENV=development REQUIRE_EMAIL_VERIFICATION=false npm run dev
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
npm install --include=dev --legacy-peer-deps
```

Never run full `npm test` on prod VPS with live email keys.

---

## File Size Rules

Per `.cursor/rules/large-files.mdc`:

- **Never** full-read: `schedule.js`, `dashboard.js`, `child-dashboard.js`, large HTML
- **Grep first**, chunk-read max 200 lines, max one large file per turn
- **New features** → new small files (`dashboard-cta.js` pattern)

---

## Forbidden Actions (without explicit approval)

| Action | Why |
|--------|-----|
| New coach mount on Hem | PA-01 |
| Global subscription middleware | Removed — ADR |
| Child-facing forms/settings | C-01 |
| Star purchase IAP | R-02 |
| Tailwind CDN | DS-05 |
| Copy stale `docs/*` into code without verification | AI risk |
| Full read of 2500+ line files | Rule violation |
| `npm test` on live VPS | AGENTS.md |
| Commit secrets / live deploy URLs | Security |

---

## Required Actions

| Action | When |
|--------|------|
| Cite constitution/principle IDs in PR | User-facing changes |
| Run `test:gate` | Server/journey/auth changes |
| Run `npm run check:css` | Tailwind class changes |
| Bump `public/sw.js` CACHE_NAME | Static asset changes |
| Update Decision Log | Architectural/product decisions |
| Label Current vs Target in PR body | Ambiguous migrations |

---

## Code Patterns

### API route

```javascript
// src/routes/example.js
router.post('/', requireParent, validate(Schema), asyncHandler(async (req, res) => {
  // use db/*.js or authz helpers — not raw ownership SQL
}));
```

### Client module

```javascript
// public/js/example-feature.js — IIFE
(function () {
  'use strict';
  // expose only necessary window.* handlers
})();
```

### Feature flag

Check `db/features.js` / `feature_flag` table — document default in PR.

---

## Testing Map

| Change type | Minimum test |
|-------------|--------------|
| Journey | `npm run test:gate` (journey-* included) |
| Auth | `auth-integration.test.js` |
| Paywall | `paywall-model-contract.test.js` (promote to gate when touched) |
| Engine | `test:engine` |
| Static routes | `app-links-routes.test.js` |

---

## Open Questions Protocol

If POS does not answer:

1. State **Open Question** in PR
2. Do not invent product behavior
3. Prefer smallest technical change
4. Ask user or log in [14_DECISION_LOG.md](./14_DECISION_LOG.md) §Open

---

## Cross References

| Document | Relationship |
|----------|--------------|
| All POS docs | Authority |
| [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | Verification |
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Ship |
| [14_DECISION_LOG.md](./14_DECISION_LOG.md) | ADRs |

---

## AI Instructions (meta)

This document is self-applicable: follow read order, decision protocol, forbidden/required lists on every task.

When completing work: output which POS sections governed the change.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Reduces founder dependency — goal met |
| **CPO** | Target default prevents legacy perpetuation |
| **CTO** | Env + test commands accurate per AGENTS.md |
| **Principal Engineer** | Large file rules referenced |
| **Senior Game Designer** | Forbidden IAP stars correct |
| **UX Director** | N/A |
| **Art Director** | N/A |
| **QA Director** | Testing map linked |
| **Security Engineer** | Secrets + prod test ban |
| **AI Systems Architect** | Self-contained agent playbook |

**Approved:** All roles — v1.0.
