| **QA Director** | Reduced motion in acceptance |
| **Security Engineer** | N/A |
| **AI Systems Architect** | G-rules citable |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/07_REWARD_SYSTEM.md
================================================================================

# 07 — Reward System

**Version:** 1.0  
**Authority:** Star economy, rewards, Skattkammaren redemption — Reality Wins

---

## Purpose

Define how stars and rewards connect **real-world accomplishments** to **meaningful treats** — without becoming a points economy.

## Scope

Stars, balances, rewards CRUD, redemptions, parent approval, child Skattkammaren. Universe room unlocks cross-reference [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md).

## Definitions

| Term | Definition |
|------|------------|
| **Star** | Proxy for completed effort — not currency for its own sake |
| **Skattkammaren** | In-app treasury where rewards live (child world) |
| **Redemption** | Child spends stars for family-defined reward |
| **Lifetime stars** | Cumulative earned — drives universe unlocks |
| **Balance** | Earned minus approved redemptions |

---

## North Star

> Stars prove the loop works. **The treat in real life** is the reward. Skattkammaren is the **bridge**, not the destination.

Parents define rewards as **real family treats** (movie night, extra story, small toy) — not virtual items only.

---

## Current State (verified)

### Data model

| Table | Role |
|-------|------|
| `daily_log_item` | Completion + `star_value` |
| `reward` | Family-scoped reward definitions |
| `reward_redemption` | Spend + approval state |
| `default_reward` | Global library (admin) |

### API (`src/routes/rewards.js`)

| Endpoint | Actor |
|----------|-------|
| `/api/rewards` CRUD | Parent |
| `/api/me/rewards` | Child list |
| `/api/me/rewards/:id/redeem` | Child spend |
| Approve/deny | Parent |

**Race protection:** `SELECT FOR UPDATE` on redemption — mirrored in tests.

### Balance

`getStarBalance()` = earned − approved/auto redemptions.

### Surfaces (naming collision — see PA docs)

| Surface | Path | Audience |
|---------|------|----------|
| Child Skattkammaren | child world + `child-dashboard-rewards.js` | Child |
| Parent overview | `skattkammaren-parent.html` | Parent |
| Marketing SEO | `skattkammaren.html` | Public |
| Library tab | `library.js` | Parent CRUD |

### Offline

`offline-queue.js` can queue redemptions — sync on reconnect.

---

## Target State

| Area | Target |
|------|--------|
| **Copy** | De-emphasize star counts in child UI |
| **Rewards** | Onboarding seeds 3–5 meaningful default rewards |
| **Approval** | Optional per reward — default auto-approve for low-star items |
| **Analytics** | Track redemption → real-world follow-through (parent survey later) |
| **Tests** | HTTP integration tests in CI gate |
| **Naming** | Analytics events disambiguate `skattkammaren_child` vs `skattkammaren_marketing` |
| **Inflation guard** | Admin alert if family sets all activities to max stars |

---

## Economy Rules

**R-01** Stars awarded only on verified completion (`daily_log_item.completed`).  
**R-02** Stars cannot be purchased with money.  
**R-03** Redemption deducts balance atomically.  
**R-04** Parent can deny redemption — child sees calm explanation.  
**R-05** No trading/gifting stars between children (unless explicit future feature + Decision Log).  
**R-06** Lifetime stars monotonic — never decrease (universe uses separate counter).  
**R-07** Reward cost in stars must feel achievable within ~1 week of normal use for defaults.  
**R-08** Virtual-only rewards allowed but must pair with copy linking to real celebration.

---

## Default Star Values (Current State)

Per-activity `star_value` on template — family editable. Registration seeds ~56 activities with default values from `default_activity_template` or hardcoded fallback.

**Target:** Journey phase `SETTING_UP` suggests balanced defaults — not zero, not inflationary.

---

## Redemption Flow

```
Child completes activities → balance increases
Child opens Skattkammaren → selects reward → redeem request
If approval required → parent notification → approve/deny
Child sees confirmation → REAL WORLD treat happens offline
```

**Critical:** App must never imply the digital redemption replaces the real treat.

---

## Examples

### ✅ Good reward

"Filmkväll på fredag" — 20 stars — parent approves — family actually watches film.

### ❌ Bad reward

"Infinite gems pack" — no real-world anchor.

---

## Anti-patterns

- Star leaderboard between siblings
- Daily star multiplier for logins
- Rewards that only change avatar with no routine link
- Negative stars / punishment deductions

---

## Acceptance Criteria

Reward change complete when:

- [ ] R-01–R-08 preserved
- [ ] Redemption race test updated if logic touched
- [ ] Child + parent surfaces tested
- [ ] Analytics event names disambiguated

---

## Implementation Guidance

Files: `src/routes/rewards.js`, `public/js/child-dashboard-rewards.js`, `public/js/skattkammaren-parent-page.js`, `db/child-universe.js` (lifetime stats).

Promote `rewards.test.js` to HTTP integration — Target milestone.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Motivation |
| [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | Lifetime stars |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child UI |
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Approval |
| [08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md) | Reward CRUD in library |

---

## AI Instructions

Never add star purchase IAP. Any new currency requires Decision Log + CEO approval.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Real-world treat emphasis protects mission |
| **CPO** | Three Skattkammaren surfaces flagged for analytics |
| **CTO** | Race protection documented |
| **Principal Engineer** | CI test gap noted |
| **Senior Game Designer** | R-08 achievability guideline good |
| **UX Director** | Deny flow needs calm copy — implied |
| **Art Director** | N/A |
| **QA Director** | Race test referenced |
| **Security Engineer** | Child redeem scoped to JWT |
| **AI Systems Architect** | R-rules citable |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/08_BUILD_SYSTEM.md
================================================================================

# 08 — Build System

**Version:** 1.0  
**Authority:** How parents **create and maintain** routine content (activities, schedules, rewards, images)

---

## Purpose

Define the **Build System** — the product capability for parents to construct family routines. There is **no feature named "Build Mode"** in the codebase; this document names and governs the **Bibliotek (Library)** and related planning tools.

> SYSTEM_ANALYSIS §9: closest equivalent is Library + schedule editor.

## Scope

Parent-side content creation: `library.html`, `schedule.html`, `activities.html`, image tools, standard library import. Not child customization (see [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md)).

## Definitions

| Term | Definition |
|------|------------|
| **Bibliotek** | `/library` — magic + classic tabs for family content |
| **Standard library** | Admin-global templates copied to families |
| **Build action** | Create/edit activity, schedule item, reward, image |
| **Configuration debt** | Each field we ask parents to fill |

---

## North Star

Parents should **build once**, then the product **leads** — build system supports setup, Journey supports daily execution ([05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md)).

Target: **minimize build time** to First Success — pre-fill aggressively.

---

## Current State (verified)

### Entry points

| Path | Module |
|------|--------|
| `/planning` | `planning-hub.js` → links |
| `/library` | `library.html`, `library.js`, `library-magic-hub.js` |
| `/schedule` | `schedule.js` (~2594 lines) |
| `/activities` | Activity management |
| `/library#magic-bilder` | `library-images.js`, crop |

### Library tabs (classic)

Schedule categories · Activities · Rewards · Standard library import

### Magic library shell

`library-magic-hub.js`, `library-magic-schedules.js`, `library-magic-mine.js`

### APIs

| API | Role |
|-----|------|
| `/api/activities` | Family activity templates |
| `/api/standard-library` | Copy from global |
| `/api/schedules/*` | Weekly/special schedules |
| `/api/upload` | Images → R2 or local |

### Onboarding build

`onboarding.js` step 3 — template picker (requires global library in prod).

**Dev gap:** empty `default_schedule` / `default_activity_template` without harvest.

---

## Target State

| Area | Target |
|------|--------|
| **First Success path** | ≤3 build decisions in onboarding; smart defaults |
| **Library UX** | Magic hub only — classic tabs retired |
| **Schedule editor** | Further extract from `schedule.js`; share all logic with dashboard via `schedule-core.js` |
| **Images** | Visual-first activities default — bildschema positioning |
| **AI assist** | Starter plan suggests activities — bounded, parent approves |
| **Build vs run** | Clear mode switch: Planering = build; Hem = run |
| **Content packs** | Importable packs (future) via feature flag + `global-library-import.js` pattern |

---

## Build System Rules

**B-01** Every new field must justify configuration debt (P-06).  
**B-02** Standard library import always offered before blank create.  
**B-03** Drag-and-drop schedule editing allowed for parents — not child.  
**B-04** Image upload supports crop — `library-image-crop.js` pattern.  
**B-05** Destructive deletes require confirm — schedule items support "bara denna dag" exclusion.  
**B-06** Pedagog cannot use build system on family content unless role permits — authz.  
**B-07** Build changes should not silently break child's today view — SSE or refresh hint.  
**B-08** No build actions on Hem — redirect to Planering.

---

## Current vs Target: Parent "build" verbs

| Verb | Current State | Target State |
|------|---------------|--------------|
| Drag/drop schedule | Yes — schedule editor | Keep — parent-only |
| Paint/customize activity image | Partial — upload + crop | Illustration templates |
| Assemble routine | Template picker onboarding | AI starter + one-tap accept |
| Discover content | Standard library browse | Journey-suggested templates |

Child **build** verbs (world decor) — [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) — not this document.

---

## Examples

### ✅ Good build flow

Onboarding: "Vi har satt upp en morgonrutin åt er" → parent adjusts one activity → done.

### ❌ Bad build flow

Empty library → "Skapa aktivitet" with 12 required fields.

---

## Anti-patterns

- Blank slate after registration
- Duplicate schedule logic diverging between dashboard and schedule page
- Building on Hem dashboard
- Requiring global library harvest for local dev tests without seed script

---

## Acceptance Criteria

Build feature complete when:

- [ ] B-01–B-08 satisfied
- [ ] Onboarding path tested with seeded library
- [ ] Schedule changes reflect on child Today within one refresh cycle
- [ ] `schedule-core.js` shared where applicable

---

## Implementation Guidance

Extract schedule logic per REFACTOR Fas 8 pattern — new modules in `public/js/schedule-*.js`.

Harvest/import for dev: `npm run harvest:library` + `import:library` (prod creds) — document in [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md).

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Planering hub |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Rewards tab |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Consumer of build output |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Upload, APIs |

---

## AI Instructions

Do not create `build-mode.js` — extend library/schedule modules. Minimize new required form fields.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Naming "Build System" clarifies mission language vs code |
| **CPO** | Pre-fill target aligns with First Success |
| **CTO** | schedule.js size acknowledged — phased extract |
| **Principal Engineer** | schedule-core sharing explicit |
| **Senior Game Designer** | Parent build vs child build separated — correct |
| **UX Director** | B-08 keeps Hem clean |
| **Art Director** | Image/crop path is visual build — good |
| **QA Director** | Dev library gap noted |
| **Security Engineer** | Upload authz via parent JWT |
| **AI Systems Architect** | Prevents spurious build-mode feature |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/09_WORLD_ENGINE.md
================================================================================

# 09 — World Engine

**Version:** 1.0  
**Authority:** Child universe / Skattkammaren world simulation — play as reward

---

## Purpose

Define how the **world** (rooms, themes, pet, avatar, achievements) evolves in response to **real** child behavior — the engine behind "I want to visit my pet."

## Scope

`src/lib/universe-engine.js`, `src/routes/child-universe.js`, `db/child-universe.js`, client room modules (`child-skatt-house.js`, `child-pet.js`, etc.).

## Definitions

| Term | Definition |
|------|------------|
| **Universe** | Per-child persistent world state |
| **Room** | Skattkammaren area (chest, pet, museum, …) |
| **Theme** | Visual skin: castle, treehouse, space |
| **Unlock rule** | JSON rule evaluated against stats |
| **syncUnlocks** | Server function applying new unlocks |

---

## North Star

The world **changes because life changed** — not because the child grinded app logins.

---

## Current State (verified)

### Server (`universe-engine.js`)

**Room unlock thresholds (lifetime stars):**

| Stars | Rooms |
|------:|-------|
| 0 | chest, dreams, shop |
| 10 | trophy, shelf |
| 15 | avatar |
| 30 | story, collections |
| 50 | pet |
| 100 | museum |

**Themes:**

| Theme | Min lifetime stars |
|-------|-------------------:|
| castle | 0 |
| treehouse | 75 |
| space | 150 |

**Rule types:** `first_completion`, `completions`, `redemptions`, `lifetime_stars`, `streak`

**Flow:** `getUniverseState()` → `syncUnlocks()` merges rooms/themes into `house_config` JSONB.

### API (`child-universe.js`)

GET/PATCH `/api/me/universe` — avatar, house, pet, collectibles.

### Client

`child-universe-client.js`, `child-skatt-house.js` (10 rooms UI), `child-layer-router.js` hash `universe` → rewards tab.

### Feature gate

`skattkammar_universum` → `basic_app` component — `config/component-feature-map.js`.

### Tests

**None dedicated** — SYSTEM_ANALYSIS gap.

---

## Target State

| Area | Target |
|------|--------|
| **Tests** | Golden tests for `evaluateRule()` and threshold edges |
| **Adaptive thresholds** | Optional cohort tuning — not one-size for all ages |
| **Discovery UX** | Subtle "something unlocked" when entering world after completion |
| **Content packs** | New rooms via DB + module plug-in — no monolith edit |
| **Multiplayer** | Family sees each child's world separately — no shared world yet |
| **AI** | Narrative flavor text from Journey phase — bounded |
| **Invalidation** | Keep `ChildUniverse.invalidate()` on completion bus |

---

## World Design Rules

**W-01** Unlocks tied to `evaluateRule` types — no hardcoded client-only unlocks.  
**W-02** Pet room requires sustained engagement (50 stars) — not day one.  
**W-03** Themes are cosmetic — no gameplay advantage.  
**W-04** Achievements/collectibles defined in DB — admin manages definitions.  
**W-05** No paid room skips.  
**W-06** World state survives offline read — server wins on sync conflict.  
**W-07** Museum is late-game — preserves long-term retention without early overwhelm.

---

## Room Narrative (product fiction)

| Room | Child fantasy |
|------|---------------|
| chest | My treasures from stars |
| dreams | What I'm working toward |
| shop | Redeem treats |
| pet | My companion who grows with me |
| museum | Memories of wins |

Copy in Swedish — warm, never competitive.

---

## Examples

### ✅ Good unlock

Child completes first ever activity → `first_completion` → collectible appears in chest.

### ❌ Bad unlock

Daily login → pet food.

---

## Anti-patterns

- Client-side only unlock (bypass API)
- Room that requires IAP stars
- World state that shames incomplete routine

---

## Acceptance Criteria

World change complete when:

- [ ] W-01–W-07 pass
- [ ] Unit tests for changed rules
- [ ] Child world renders on iOS/Android WebView
- [ ] Lifetime stars consistent with reward system — [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md)

---

## Implementation Guidance

Edit thresholds in `ROOM_UNLOCKS` / `THEME_UNLOCKS` only with game design + Decision Log entry.

New room: add to engine array + `child-*` renderer + admin achievement defs if needed.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Motivation |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Lifetime stars |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Min värld |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Extensibility |

---

## AI Instructions

Never add unlock logic only in client JS. Run sync through universe-engine.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Long-term retention via museum — aligned with scale goal |
| **CPO** | Room fiction table helps copy consistency |
| **CTO** | Test gap flagged — priority quick win |
| **Principal Engineer** | Server-authoritative unlocks correct |
| **Senior Game Designer** | Threshold table documented from code — accurate |
| **UX Director** | Discovery UX marked Target |
| **Art Director** | Three themes — art pipeline needed |
| **QA Director** | Demands tests before threshold changes |
| **Security Engineer** | PATCH universe scoped to child JWT |
| **AI Systems Architect** | Rule types enumerable — good for agents |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/10_TECH_ARCHITECTURE.md
================================================================================

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


================================================================================
FILE: product-operating-system/11_AI_DEVELOPER_GUIDE.md
================================================================================

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

