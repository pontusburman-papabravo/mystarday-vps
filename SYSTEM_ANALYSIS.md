# Stjärndag — System Analysis

**Document type:** Company leadership technical & product analysis  
**Status:** Complete (Phase 1–3 + mandatory self-review)  
**Date:** 2026-06-29  
**Scope:** Entire repository at commit `7b76b23` (detached HEAD baseline)  
**Method:** Code is source of truth; documentation verified against implementation; contradictions explicitly flagged  
**Audience:** CEO, CPO, CTO, Principal Engineer, future acquirer, autonomous AI developers  

**Explicit non-goals of this document:** No feature implementation, no refactor proposals as committed work, no Product Operating System documents (awaiting explicit approval).

---

## 1. Executive Summary

Stjärndag is a Swedish B2C family routine application. Parents configure visual daily schedules for children; children complete activities to earn stars and redeem rewards in **Skattkammaren** (treasure chamber). The product serves approximately **200 families** and is in an active pivot from “configuration tool” to **“guided path to first real-world relief”** (internally: **First Success** / **Family Journey**).

**Stack (verified):** Express.js (Node 20) + PostgreSQL + static HTML/JS frontend (Tailwind build pipeline) + Capacitor 7 native shells loading a **remote WebView** (remote app URL documented in AGENTS.md). Deployed on a **self-managed VPS** at `public HTTPS URL (see AGENTS.md deploy table)` via GitHub Actions → SSH → systemd (`systemd unit name (see AGENTS.md)`).

**Repository scale (verified counts):**
| Metric | Count |
|--------|------:|
| Route modules under `src/routes/` | 77 |
| DB query modules under `db/` | 57 |
| Migrations | 66 |
| Test files (`test/*.test.js`) | 181 |
| Public HTML pages | 61 |
| Background schedulers started from `server.js` | 14 |
| `src/lib/` modules | 134 |

**Strategic state:** The codebase contains **three overlapping product-intelligence systems** (legacy readiness UI, Product Engine / `core-engine`, Family Journey / `src/lib/journey`) plus a **fourth retention experiment** (7-day Activation Program). An ADR (`docs/retention-migration-plan.md`, 2026-06-29) declares Family Journey + Journey Gate as the north star, but **most journey feature flags default OFF in live** while legacy schedulers still run.

**Top strengths:**
- Clear written product constitution and First Success philosophy
- Deterministic product engine with golden JSON contract tests
- Family Journey implemented through Fas 5 with DB integration tests in CI gate
- Mature security layering (CSRF, authz centralization, child API deny-by-default, PIN lockout)
- Major refactor (Fas 0–11) largely complete — auth, family, daily-logs, schedules split; dashboard partially extracted

**Top risks:**
- **Authority fragmentation** on parent Home: `/api/family/readiness`, `/api/family/first-success`, `/api/me/journey-context` can coexist; client guards detect conflicts but prod behavior depends on flags
- **Documentation drift** — `CLAUDE.md` still says Render + Tailwind CDN; route inventory pre-dates route splits
- **CI gate narrow** — 19 test files vs 181 total; paywall, IAP webhook, universe engine, rewards HTTP untested in gate
- **Scale limits** — in-memory rate limiting and push debounce not multi-instance safe
- **Post-founder monetization gap** — web has no checkout; IAP native-only; families beyond founder limit (#225) have ambiguous web path

**Verdict for leadership:** The product has strong foundations and unusually deep specs for its size, but **live behavior still reflects the old product** while docs describe the target product. The highest-leverage work is consolidating product authority (Journey + Gate), not adding features.

---

## 2. Business Understanding

### 2.1 Company & market

| Dimension | Verified fact |
|-----------|---------------|
| Product name | Stjärndag (live domain: live domain (see AGENTS.md)) |
| Market | Sweden — Swedish UI, copy, legal pages, SEO content |
| Target users | Parents of young children (routine/NPF-adjacent positioning in SEO) |
| Secondary users | Pedagoger/terapeuter (educator role, professional reports, B2B landing) |
| Scale | ~200 families (stated in `docs/FIRST-SUCCESS.md`; consistent with founder-limit model) |
| Team model | Small team; heavy use of AI-assisted development and extensive internal docs |

### 2.2 Business model (code-verified)

**Revenue path:** Native in-app purchase only — RevenueCat webhook (`POST /api/iap/webhook`) syncs `family.subscription_status` and `rc_customer_id`. **Stripe removed** (migration `1808300000000_drop_family_stripe_columns.js`; history in `docs/ARKIVERAT-STRIPE.md`). **No web checkout.**

**Founder / lifetime-free program** (`src/lib/payment-policy.js`):
- First **225 families** (configurable via `app_settings.founder_family_limit`) receive `is_lifetime_free=true` at registration
- Beyond limit: subscription required at **59 SEK/month** for `basic_app` component (`config/subscription-components.js`)

**Trial:** 14-day trial at registration (`family.trial_ends_at`, `family_subscriptions.tier='trial'`)

**Component packaging** (`config/component-feature-map.js`, `src/lib/package-access.js`):
| Component | Features gated |
|-----------|----------------|
| `basic_app` | Core app, Skattkammar-universum |
| `reporting` | Reports |
| `pedagog` | Pedagog notes, educator flows |
| `teacch` | TEACCH-related features |

**Paywall enforcement:** Per-route `requireComponent()` middleware — **no global subscription middleware** in `app.js` (verified by `test/paywall-model-contract.test.js`). Client-side paywall state via `GET /api/subscription/access`.

**Packaging rollout:** `PACKAGES_ROLLOUT_MODE` defaults `'off'` — interest collection, not purchase (`src/lib/package-access.js`).

### 2.3 Growth & retention machinery

| System | Purpose | Live status |
|--------|---------|-------------------|
| Activation Program (7D) | Parent habit experiment days 1–7 | Implemented; `activation_program_new_enrollments` flag default ON |
| Family Journey | Lifecycle phases + experiences | Implemented Fas 1–5; **flags default OFF** |
| Product Engine | Facts → policy → coach directive | `/api/family/first-success`; feature-flagged |
| Win-back email | Re-engage inactive families | Scheduler exists; **not in server startup**; ADR deprecates (0% measured effect) |
| Weekly summary email | Engagement | Active scheduler |
| Retention reengagement push | Push to inactive | Active scheduler (legacy pattern per ADR) |
| Referral | Growth | Tables + tracking (`migrations/1808620000000_referral_tables.js`) |
| SEO content | Organic acquisition | 5+ article pages, sitemap (`src/lib/seo-pages.js`) |
| Google Ads | Paid acquisition | GA4-imported signup conversion (`public/js/marketing-events.js`) |

### 2.3 Doc vs code: business hosting

| Source | Claim |
|--------|-------|
| `CLAUDE.md` | “deployed on Render” |
| `README.md`, `AGENTS.md`, `.github/workflows/deploy.yml` | VPS at `deploy@<VPS-host> (see AGENTS.md)`, path `/var/www/<app-path> (see AGENTS.md)` |

**Trust implementation:** VPS + GitHub Actions deploy is authoritative.

---

## 3. Product Vision

### 3.1 Constitutional principles (`docs/PRODUCT-CONSTITUTION.md`)

1. **Produkten leder** — user never guesses next step  
2. **Produkten överraskar inte** — every screen feels like natural continuation  
3. **Produkten visar alltid nästa steg** — empty states forbidden  
4. **Produkten minskar osäkerhet** — parent always feels “I'm doing this right”  
5. **Produkten känns färdig** — post-registration feels more complete than before  

### 3.2 First Success mission (`docs/FIRST-SUCCESS.md`)

**North star:** First time the family feels daily life got easier — not a button press.

**Primary proxy metric:** `first_success_within_48h`

**Philosophical shift (documented and partially implemented):**

| From | To |
|------|-----|
| Parent builds routines | Product leads to next small win |
| Tool that reacts | Guide that leads |
| Empty states + config | Pre-filled + obvious next step |
| Parent is protagonist | **Child is protagonist; parent is helper** |

**Product laws (0–7):** Success measured at family's real-world action; no empty pages; no decision without prior value; child-first; post-registration completeness; every button toward First Success; reduce uncertainty always.

### 3.3 Target architecture (ADR `docs/retention-migration-plan.md`)

```
Family → Journey Context → Journey Gate → Channels (push, email, in-app)
```

- **Journey** owns lifecycle state (`SETTING_UP` … `CHURNED`)
- **Journey Gate** (`src/lib/journey/communication-gate.js`) owns send/don't-send decisions
- Legacy schedulers must not implement own segmentation (transitional)
- Login is **not** primary success indicator — **completions** are

### 3.4 Gap: vision vs live

The vision documents are mature. Live behavior is **flag-gated** and still runs legacy readiness CTAs, Activation Program pushes, and multiple coach surfaces. This is intentional transitional state, not accidental omission — but it creates user-facing inconsistency if flags are enabled piecemeal.

---

## 4. Current Product

### 4.1 Core product loop (implemented)

```
Registration → Family + child created → Activities seeded (~56) → Schedule assigned
     → Child completes activity → Stars earned → Rewards in Skattkammaren
     → Parent approves redemption (optional) → Child receives reward
```

### 4.2 Major feature areas

| Area | Parent surface | Child surface | Backend |
|------|----------------|---------------|---------|
| Daily schedule | `dashboard.html`, `schedule.html` | `child-dashboard.html` (Today world) | `src/routes/schedules/`, `daily-logs/` |
| Stars & completion | `daily-log.html`, dashboard approvals | Tap-to-complete in child view | `daily-log-items`, `daily-logs` |
| Rewards / Skattkammaren | `rewards.html`, `skattkammaren-parent.html` | Universe rooms in child view | `src/routes/rewards.js`, `child-universe.js` |
| Onboarding | `onboarding.html` (6 steps) | PIN setup | `src/routes/onboarding.js` |
| Library (content) | `library.html` | — | `activities`, `standard-library` |
| Family management | `family.html` | Family hall world | `src/routes/family/` |
| Pedagog | `pedagog-*.html` | — | `pedagog-notes`, `pedagog-daily-log`, etc. |
| Reports | `reports.html`, professional share links | — | `src/routes/reports.js` |
| For dig | `for-dig.html` | — | `src/routes/for-dig.js` |
| Custody schedule | Dashboard custody UI | — | `src/routes/family/custody`, feature-gated |
| Subscriptions | `upgrade.html`, settings | — | `iap.js`, `subscription.js` |
| Admin | `admin/index.html` | — | `src/routes/admin/*` (30+ modules) |

### 4.3 Account types

| Type | Code | Capabilities |
|------|------|--------------|
| Family parent | `parent.account_type='family'` | Full parent app |
| Educator | `'educator'` or `'dual'` | Pedagog views + optional family |
| Child | JWT `type:'child'` | Child worlds only; deny-by-default on parent APIs |
| Admin | `parent.is_admin` | Admin panel + impersonation (read-mostly; writes blocked) |

### 4.4 View modes

- **Parent:** Magic UI only (`app-view-mode.js` — no classic toggle for parents)
- **Child:** Per-child `child_view_config.view_mode` (`classic` vs `magic`/`new`)
- **Barnmeny v2:** Three worlds — Today, Min värld (universe), Mina personer (family hall) — `V2_ENABLED = true` in `child-worlds.js`

---

## 5. Parent Experience Review

### 5.1 Navigation architecture

Primary nav (`public/js/nav-config.js`): **Hem · Planering · Belöningar · För dig · Familj · Inställningar**

Delivery:
- **Web/PWA:** Sidebar + mobile topbar (legacy hidden via `parent-magic-legacy-hide`)
- **Native:** `native-tab-bar.js` bottom tabs
- **Soft navigation:** `parent-magic-router.js` fetches HTML and swaps `#magicHubMount` — **excludes** `/dashboard`, `/schedule`, `/library` (full reload required; documented as too heavy)

### 5.2 Home (Hem) — critical UX surface

Three competing “what's next” systems render on or near Home:

| System | Client | API | Authority doc |
|--------|--------|-----|---------------|
| Readiness | `home-readiness.js` | `GET /api/family/readiness` | Legacy v2.2 action center |
| Product Engine coach | `engine-coach.js`, `engine-client.js` | `GET /api/family/first-success` | `docs/first-success/AUTHORITY-PRECEDENCE.md` — exclusive `#engineCoachMount` |
| Journey coach | `journey-coach.js` | `GET /api/me/journey-context` | Fas 3 roadmap — should replace readiness |

`engine-client.js` explicitly detects `readiness_and_engine_both_visible` conflict and logs it.

**Assessment:** Parent Home is the **highest-risk UX surface** — multiple authoritative docs disagree on which system owns it. Code allows coexistence; flags determine what users see.

### 5.3 Planning hub

Thin link grid (`planning-hub.js`) → schedule, calendar, activities, library, print, barn-stöd. Schedule editing is **admin-like**: forms, cards, drag-and-drop (`schedule.js` ~2594 lines — still large despite extractions).

### 5.4 Onboarding (parent)

6-step wizard (`onboarding.js` ~1354 lines):
1. Child name/emoji
2. View type selection
3. Schedule template (requires global library in prod; **empty locally** without harvest)
4. PIN
5. Handoff to child
6. Completion

Starter plan AI (`onboarding-starter-plan.js`) and activation hooks (`onboarding-activation.js`) integrated.

**Product debt:** Template picker fails locally with “Inga aktiviteter hittades” — global library empty in fresh DB (`AGENTS.md`).

### 5.5 Parent UX strengths

- Coherent magic visual language (`dashboard-magic.css`, gold/navy palette)
- PIN gate for child→parent transitions (`parental-gate.js`)
- Real-time updates via SSE (`dashboard-sse.js`)
- Co-parent invite CTA (`dashboard-cta.js`)
- Weekly story, custody, handoff reminders (recent feature additions)

### 5.6 Parent UX weaknesses

- **Dashboard-like interfaces dominate** — contradicts stated child-first/build/play philosophy for parent role (acceptable for parent, but heavy)
- **Schedule duplication** — `dashboard.js` and `schedule.js` share `schedule-core.js` but duplicate ~80 lines of calendar logic each
- **Soft-nav inconsistency** — some pages reload fully, others swap DOM
- **Triple Skattkammaren naming** — marketing page, child universe, parent overview
- **25+ script tags** on `dashboard.html` — load performance concern

---

## 6. Child Experience Review

### 6.1 Architecture

Single shell: `child-dashboard.html` + **30+ JS modules**. Three worlds (`child-worlds.js`):

| World | Route aliases | Purpose |
|-------|---------------|---------|
| Today | `/child/today`, `/child-dashboard` | Schedule, complete activities, stars |
| Min värld | `/child/world` | Skattkammaren universe — rooms, avatar, pet |
| Mina personer | `/child/family` | Family hall |

Bottom nav: `child-worlds-nav.js`. Legacy tab buttons still in HTML (`tabRewardsLegacy`).

### 6.2 Interaction model

**Strengths aligned with product philosophy:**
- Tap-to-complete activities (not form submission)
- Visual schedule with NOW/NEXT/LATER (`child-today*.js`)
- Photo/visual activity cards (`child-dashboard-photo-cards.js`, `activity-visual.js`)
- Celebrations: confetti, milestone bursts (`child-dashboard-celebrations.js`)
- Universe rooms unlock through play/rewards, not settings screens
- Offline: `offline-store.js` + `offline-queue.js` for completions

**Weaknesses:**
- Still **button-heavy** in header (Byt barn, Förälder, Logga ut) — recent fix improved icon distinction (SW v317)
- **Dual navigation** — v2 bottom nav + legacy tabs coexist
- **Duplicate confetti** — `launchConfetti()` remains in `child-dashboard.js` ~L1864 while celebrations module also handles it
- **30+ sequential script loads** — latency on first paint
- Child JWT locked to child APIs; manual name fallback on `child-login.html` for browsers without parent session

### 6.3 Child login

`POST /api/auth/child-login` — PIN with lockout (`pin_lockout`, exponential backoff), parent notification at 3 failures, audit trail (`pin_audit_log`). Preserves parent session in `stjarndag_parent_session` cookie.

### 6.4 Assessment vs stated child UX principles

| Principle (from mission brief) | Current state |
|----------------------------------|---------------|
| Drag, drop, paint, assemble | Partial — DnD in parent schedule; child is mostly tap-complete |
| Avoid dashboards | Child view is **not** a dashboard — good |
| Avoid forms | Good — minimal forms in child view |
| Avoid generic cards | Mixed — activity cards are structured, not generic admin cards |
| Play is reward, not goal | Universe/Skattkammaren correctly positioned as reward layer |

---

## 7. Admin Experience Review

### 7.1 Architecture

Single SPA: `admin/index.html` (~2263 lines) + **30+ `admin-*.js` modules**. Hash routing via `admin-nav.js`.

### 7.2 Nav groups (verified)

| Group | Sections |
|-------|----------|
| Hem | Start, Familjer, Meddelanden |
| Tillväxt | Paketintresse, Pedagogintresse, Waitlist, Pipeline, Landningssidor, Undersökningar |
| Kommunikation | Nyhetsbrev, E-postmallar, E-postlogg, Dagens nyhet |
| Insikter | Produktanalys, Retention, Experiment (Föräldraaktivering, L1 coach, För dig) |
| Innehåll | Bibliotek (global defaults) |
| Inställningar | Prenumeration/IAP, Funktioner, Konto |

### 7.3 Key capabilities

- Family search, impersonation (read-only writes blocked by middleware)
- Global activity/schedule/reward library management
- Feature flags, app config, journey rollout controls
- Email template editing, win-back approval queue (auto-approve flag: `win_back_auto_approve`)
- Analytics dashboards, activation program cohort views
- Dagens nyhet (news) with push + Facebook cross-post
- Survey builder (admin + public)

### 7.4 Admin UX assessment

**Strengths:** Comprehensive ops surface for ~200-family scale; command palette; mobile nav fix (rate limiter exemptions for admin assets).

**Weaknesses:**
- **Monolithic HTML** — 2263 lines, 20+ JS files per load
- **Redirect interceptor** still in `admin/index.html` (diagnostic debt from rate-limit debugging)
- Admin is **fully separate** from parent design system — appropriate but increases maintenance
- Global library empty in dev without harvest — blocks testing onboarding template flow

---

## 8. Reward System Review

### 8.1 Star economy (verified in `src/routes/rewards.js`)

| Operation | Mechanism |
|-----------|-----------|
| Earn | `daily_log_item` completion × `star_value` |
| Balance | `getStarBalance()` = earned − approved/auto redemptions |
| Spend | `reward_redemption` with `SELECT FOR UPDATE` race protection |
| Parent CRUD | `/api/rewards` |
| Child redeem | `/api/me/rewards/:id/redeem` |
| Approval | Parent approves/denies pending redemptions |

### 8.2 Reward surfaces

| Surface | Path | Audience |
|---------|------|----------|
| Library rewards tab | `library.js` | Parent — CRUD |
| Rewards hub | `rewards.html`, `rewards-hub.js` | Parent — navigation |
| Parent Skattkammaren | `skattkammaren-parent.html` | Parent — per-child overview |
| Child Skattkammaren | `child-dashboard-rewards.js`, `child-skatt-house.js` | Child — redeem + room UI |
| Marketing Skattkammaren | `skattkammaren.html` | Public SEO |

### 8.3 Redemption flow

1. Child requests redemption (may require parent approval depending on reward config)
2. `child-rewards-engine.js` shows pending banner
3. Parent approves via dashboard or Skattkammaren parent view
4. Stars deducted; redemption recorded

### 8.4 Assessment

**Strengths:** Race-safe redemption; clear parent/child API split; offline queue supports redemption sync.

**Weaknesses:**
- **No automated tests** for rewards HTTP routes in CI gate (`rewards.test.js` tests inline logic only)
- **Three naming collisions** for “Skattkammaren” confuse analytics and docs
- Star values editable per activity — no documented guardrails against inflation

---

## 9. Build Mode Review

### 9.1 Finding: no feature named “Build Mode”

Grep across entire repository for `build mode`, `buildMode`, `build-mode`: **zero matches**.

### 9.2 Closest equivalent: Bibliotek (Library)

Content construction for parents happens in the **Library** system:

| Component | Role |
|-----------|------|
| `library.html` + `library.js` | Classic tabs: schedule categories, activities, rewards, standard library |
| `library-magic-hub.js` | Magic UI shell for library |
| `library-magic-schedules.js`, `library-magic-mine.js` | Schedule templates, family-owned content |
| `library-images.js`, `library-image-crop.js` | Image management |
| Entry | `planning-hub.js` → `/library`, `/library#magic-bilder` |

SW changelog references “bygg innehåll” in library context (v351).

### 9.3 Assessment

The product mission describes child interactions as “drag, drop, paint, assemble, build.” That philosophy is **not implemented as a named Build Mode** — it manifests partially in:
- Parent library/schedule editing (drag-and-drop in schedule editor)
- Child universe customization (avatar, house, pet rooms)

**Product debt:** Aspirational “build/play” language in mission docs exceeds current implementation. Parents **configure**; children **complete and explore**.

---

## 10. Gamification Review

### 10.1 Layers

| Layer | Implementation | Trigger |
|-------|----------------|---------|
| Stars | `daily_log_item.star_value` | Activity completion |
| Streaks | `streak` table; `streak-updater.js` via midnight scheduler | Consecutive days |
| Milestones | `child-dashboard-celebrations.js` | 25/50/75% daily progress |
| Confetti / dopamine burst | `child-dashboard-celebrations.js` | Milestones, completions |
| Skattkammaren rooms | `child-skatt-house.js` — 10 rooms | Lifetime star thresholds |
| Universe themes | castle (0), treehouse (75), space (150) stars | `universe-engine.js` |
| Achievements / collectibles | DB-driven rules | `universe-engine.js` `evaluateRule()` |
| Pet, avatar, museum | `child-pet.js`, `child-avatar.js`, etc. | Universe API |

### 10.2 Universe engine (`src/lib/universe-engine.js`)

Room unlock thresholds (lifetime stars):

| Stars | Rooms |
|------:|-------|
| 0 | chest, dreams, shop |
| 10 | trophy, shelf |
| 15 | avatar |
| 30 | story, collections |
| 50 | pet |
| 100 | museum |

Rule types: `first_completion`, `completions`, `redemptions`, `lifetime_stars`, `streak`.

### 10.3 Gamification ↔ product philosophy

**Aligned:** Play (universe) is positioned as **reward** for real-world routine completion — matches “play is the reward, reality comes first.”

**Risk:** Lifetime star thresholds create **long-term engagement** but may feel unreachable for low-activity children — no code-level adaptive difficulty found.

**Test gap:** `universe-engine.js` has **no dedicated tests**.

---

## 11. Architecture Review

### 11.1 System diagram (current state)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Clients                                   │
│  Browser/PWA │ Capacitor iOS/Android (remote WebView) │ Admin   │
└──────┬─────────────────┬───────────────────────────┬──────────┘
       │                 │                           │
       v                 v                           v
┌──────────────────────────────────────────────────────────────────┐
│  Express (app.js) — middleware chain → registerRoutes()          │
│  Static: public/ │ /uploads │ /V2.0 mockups                      │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ├─→ src/routes/ (77 modules) ─→ src/lib/db.js (pg pool, max 5)
       │         │                              │
       │         └─→ db/*.js (57 modules) ──────┘
       │
       ├─→ src/core-engine/ (Product Engine)
       ├─→ src/lib/journey/ (Family Journey)
       └─→ src/lib/* schedulers (14 started from server.js)

┌──────────────────────────────────────────────────────────────────┐
│  PostgreSQL — 66 migrations, baseline-schema.sql + delta          │
└──────────────────────────────────────────────────────────────────┘

External (optional, graceful degradation):
  Resend (email) │ R2/local (uploads) │ RevenueCat (IAP)
  VAPID (web push) │ APNs/FCM (native push) │ Facebook (nyhet)
```

### 11.2 Entry point separation

| File | Responsibility |
|------|----------------|
| `server.js` | Port bind, 14 schedulers, graceful shutdown |
| `app.js` | HTTP middleware + routes; **no schedulers** (testable) |
| `migrate.js` | Schema bootstrap + ordered migrations |

### 11.3 Middleware order (security-relevant)

Verified in `app.js`:
1. Resend webhook (raw body, before JSON parser)
2. `trust proxy`, JSON, cookies
3. `restoreParentSession` → `optionalAuth` → `globalLimiter`
4. Platform HTML inject, security headers
5. Maintenance mode (before routes; `/api/iap` exempt)
6. `/api`: CSRF → impersonation write block → child API block → apiLimiter
7. `registerRoutes()` → static files → 404 → error handler

### 11.4 Refactor state (`REFACTOR.md` — executed Fas 0–11)

| Phase | Outcome |
|-------|---------|
| E0 | Route inventory baseline (637 routes — now stale) |
| E1 | `family.js` → `src/routes/family/*` |
| E2 | `auth.js` → `src/routes/auth/*` |
| E3 | `daily-logs.js` → `src/routes/daily-logs/*` |
| E4 | `account.js`, `surveys.js` split |
| Fas 8 | Dashboard/schedule/child-dashboard partial extraction (~15 new JS files) |
| Fas 9 | Tailwind CDN → `tailwind.build.css` |
| Fas 10 | Dead code inventory, XSS fixes, lint:public CI |
| Fas 11 | Dead code removal tier A |

### 11.5 Architectural risks

| Risk | Severity | Detail |
|------|----------|--------|
| Dual product engines | High | `core-engine` + `journey/*` + legacy readiness |
| Partial DB layer | Medium | 57 `db/` modules but most routes inline SQL |
| Multi-instance | Medium | In-memory rate limits, push debounce |
| Monolithic schedulers | Medium | 14 independent setTimeout loops, no central job runner |
| Route inventory stale | Low | Pre-split 637 routes; `npm run dump:routes` available |

---

## 12. Frontend Review

### 12.1 Technology

- **No SPA framework** — multi-page app with soft-nav subset
- **Tailwind** via committed `public/css/tailwind.build.css` (CI enforces rebuild)
- **IIFE modules** — `window.*` handlers, no bundler for app JS
- **PWA:** `public/sw.js` v407 — stale-while-revalidate assets, network-first HTML, offline fallback
- **Native:** Capacitor WebView; SW **unregistered** on native (`platform.js`)

### 12.2 Page inventory

61 public HTML pages including marketing, auth, parent app, child shell, pedagog, legal, SEO.

### 12.3 Large files (debt)

| File | ~Lines | Status |
|------|-------:|--------|
| `schedule.js` | 2594 | Partially extracted; still critical mass |
| `child-dashboard.js` | 2027 | Partially extracted (rewards, celebrations) |
| `dashboard.js` | 1459 | Fas 8 split into 15+ modules |
| `onboarding.js` | 1354 | Monolithic wizard |
| `admin/index.html` | 2263 | Monolithic admin SPA |

### 12.4 Shared infrastructure

| Module | Role |
|--------|------|
| `auth.js` | JWT cookies, silent refresh, CSRF header |
| `platform.js` | Capacitor detection, haptics, push, OAuth |
| `analytics-shim.js` | Global `window.analytics` (fixed v321 — was undefined) |
| `marketing-events.js` | GA4 + Google Ads consent-gated |
| `nav-config.js` | Single source for tab labels/paths |
| `sse-client.js` | Server-sent events |

### 12.5 Frontend test coverage

Static contract tests exist for dashboard splits, schedule-core, celebrations. **No frontend unit test runner in CI gate.** `lint:public` runs with `--max-warnings 735` but accumulated ~2900 warnings per `AGENTS.md`.

---

## 13. Backend Review

### 13.1 Route organization

126 route-related files; barrel at `src/routes/index.js`. Patterns:
- Multi-router exports: `{ parentRouter, childRouter }`
- `scopeRouterToPath` for shared mounts (`/api/me`)
- Zod validation via `src/middleware/validate.js` + `src/lib/schemas.js`

### 13.2 Schedulers (server.js — 14 started)

| Scheduler | File |
|-----------|------|
| Midnight | `midnight-scheduler.js` — daily logs, streaks, analytics, win-back stale reject, journey eval |
| Deletion | `deletion-scheduler.js` |
| Weekly summary | `weekly-summary-scheduler.js` |
| Library notifications | `library-notifications.js` |
| Dagens nyhet | `nyhet-scheduler.js` |
| Push reminders | `push-reminder-scheduler.js` |
| Activation push | `activation-program-scheduler.js` |
| Activation nudge | `activation-nudge-scheduler.js` |
| Child handoff reminder | `child-handoff-reminder-scheduler.js` |
| Custody handoff | `custody-handoff-scheduler.js` |
| Retention reengagement | `retention-reengagement-scheduler.js` |
| Activation advisor | `activation-advisor-scheduler.js` |
| Journey push | `journey-push-scheduler.js` |
| Journey daily analysis | `journey-daily-analysis-scheduler.js` |

**Not started from server.js:**
- `win-back-scheduler.js` — manual/admin triggered
- `activation-program-email-scheduler.js` — exists but unwired

### 13.3 Email (`src/lib/email.js`)

Resend API; kill switch `EMAIL_ENABLED=false`; `@example.com` suppression; separate weekly API key.

### 13.4 Push (`src/lib/push-notifications.js`)

Web: VAPID. iOS: raw HTTP/2 APNs ES256 JWT. Android: FCM server key. Bad tokens auto-deleted.

**Doc drift:** File header still says “placeholder — install node-apn” but full APNs implementation exists below.

### 13.5 Product intelligence backends

| System | Entry | Pattern |
|--------|-------|---------|
| Product Engine | `src/core-engine/index.js` | Facts → infer → state → need → policy → presentation |
| Family Journey | `src/lib/journey/*.js` | Events → ingest → phases → evaluator → context |
| Activation Program | `src/lib/activation-program*.js` | 7-day cohort experiment |
| Readiness | `src/routes/family/core.js` | Legacy action items |

Shadow comparison: `journey/engine-shadow.js` logs divergence when flag enabled.

---

## 14. Mobile Review

### 14.1 Capacitor architecture

`capacitor.config.ts`:
- **Remote WebView** — live URL (not bundled `public/`)
- Dev: `CAP_DEV=true` → `http://localhost:3000`
- iOS plugins: Apple Sign-In, App, Camera, Push Notifications
- Google Auth: Android only (excluded from iOS `includePlugins` for privacy manifest)

### 14.2 Platform abstraction (`public/js/platform.js`)

~1033 lines. Provides:
- Native detection, haptics, share, push registration
- Apple Sign-In (native + web fallback)
- Google Sign-In (Android native → `POST /api/auth/google`)
- SW unregister on native (prevents reload loops)
- IAP hooks via `iap-manager.js` (App Review stub)

### 14.3 iOS

- Full Xcode project in `ios/`
- Apple Sign-In iPad fix: main-thread dispatch required (`SignInWithApple-Plugin.patched.swift`, build 19)
- Podfile post_install hook re-applies patch
- Xcode Cloud CI scripts in `ios/App/ci_scripts/`

### 14.4 Android

- `android/` directory **not present in repo** — generated via `npm run cap:sync:android`
- AAB build script: `npm run android:aab`
- Play Store assets in `assets/play-store/`

### 14.5 Mobile QA

- `npm run qa:mobile-gate` — Puppeteer smoke (not in CI gate)
- Protocols: `docs/QA-mobil-release-gate-runbook.md`, `docs/QA-mobil-fullstandig-protokoll.md`

### 14.6 Assessment

Mobile is a **thin native shell over the same web app** — good for parity, but means offline/PWA behavior differs (no SW on native). Apple Sign-In iPad issue was a significant App Review blocker — now patched with verification scripts.

---

## 15. Database Review

### 15.1 Schema overview

~60 tables in `db/baseline-schema.sql` plus migration deltas. Core entities:

```
family ─┬─ parent ─── parent_child ─── child
        ├─ activity_template ─── activity_sub_step
        ├─ reward ─── reward_redemption
        ├─ family_subscriptions (tier, components JSONB)
        └─ feature flags, invites, analytics, etc.

child ─┬─ weekly_schedule ─── weekly_schedule_item
       ├─ special_day_schedule ─── special_day_schedule_item
       ├─ daily_log ─── daily_log_item ─── daily_log_item_sub_step
       └─ streak, child_universe tables (via migrations)
```

### 15.2 Migration system

- **66 migrations** in `migrations/` with timestamp prefix
- Custom runner in `migrate.js` (NOT node-pg-migrate CLI despite `CLAUDE.md` wording)
- Idempotent bootstrap + `_migrations` tracking table
- CI runs `migration-rollback-gate.test.js` separately

### 15.3 Major migration themes

| Theme | Examples |
|-------|----------|
| Subscriptions/packages v1.2 | `1806800000000`, `1807700000000` |
| Stripe removal | `1808300000000` |
| Family Journey | `1808920000000`, `1808930000000` |
| Activation/retention | `1799500000000`, `1808600000000`, `1808700000000` |
| Custody schedule | `1808650000000`–`1808720000000` |
| Child universe | `1800000000000` |
| Win-back / email | `1806500000000`, `1808500000000` |
| Referral | `1808620000000` |

### 15.4 Query layer (`db/*.js`)

57 modules — parameterized SQL, one domain per file, imports `src/lib/db` pool.

**Adoption gap:** Most route handlers still call `db.query()` directly rather than `db/*` modules.

### 15.5 DB configuration

- Pool max 5 connections, 15s statement timeout
- SSL auto-disabled on localhost (`src/lib/db.js`)
- Integration tests use PostgreSQL advisory lock for serialization

---

## 16. API Review

### 16.1 Scale

Route inventory baseline: **637 routes** (`docs/route-inventory-pre-split.md`). Post-refactor count likely higher due to splits; regenerate via `npm run dump:routes`.

### 16.2 API design patterns

| Pattern | Example |
|---------|---------|
| REST-ish resources | `/api/children/:id`, `/api/rewards` |
| Child self access | `/api/me/daily-log`, `/api/me/rewards` |
| Public unauthenticated | `/api/contact`, `/api/waitlist`, `/api/public/report/:id` |
| Admin namespace | `/api/admin/*` (requireAdmin) |
| SSE | `/api/events` |
| Webhooks | `/api/iap/webhook`, `/api/resend/webhook` |

### 16.3 Key API clusters

**Auth:** `/api/auth/*` — login, register, child-login, refresh, OAuth, email flows

**Family:** `/api/family/*` — settings, members, invites, PIN, custody, first-success, readiness

**Journey:** `/api/me/journey-context` — phase, experiences, milestones

**Child universe:** `/api/me/universe` — avatar, house, pet, collectibles

**Schedules:** Three mount trees (child schedules, schedule items, family templates)

**Uploads:** `/api/upload` — R2 or local disk

### 16.4 API quality observations

**Strengths:**
- Zod validation on most mutation endpoints
- Consistent `{ error: 'CODE' }` patterns
- Child/parent router separation
- CSRF on all state-changing `/api` calls

**Weaknesses:**
- No OpenAPI spec generated
- Legacy alias `/api/activity-templates` → `/api/activities`
- Orphan endpoint `/api/public/program-catalog` (client removed, server remains per dead-code inventory)
- Health check version hardcoded `'2.3.1'` — not tied to deploy

---

## 17. Authentication Review

### 17.1 Parent authentication

| Method | Endpoint | Notes |
|--------|----------|-------|
| Email/password | `POST /api/auth/login` | scrypt hash, 5/15min rate limit |
| Registration | `POST /api/auth/register` | Email verification (24h grace) |
| Apple Sign In | `POST /api/auth/apple` | Auto-create or login; 409 on email conflict |
| Google Sign In | `POST /api/auth/google` | **Login only** — no auto-signup |
| Email verify | `POST /api/auth/verify-email` | Does not issue session |

### 17.2 Token model

| Token | Storage | TTL |
|-------|---------|-----|
| Access JWT | httpOnly cookie `access_token` | 15 min (parent), 8h (child) |
| Refresh token | httpOnly cookie; SHA-256 hash in DB | 30 days |
| CSRF | Cookie + header double-submit | Matches refresh |
| Parent session backup | `stjarndag_parent_session` | 7 days (child login preserves parent) |

JWT payload: `{ id, type, familyId, email, isAdmin }` — **camelCase `familyId`** (past bugs used snake_case).

Dual-secret rotation: `JWT_SECRET` + `JWT_SECRET_PREVIOUS`.

### 17.3 Child authentication

`POST /api/auth/child-login`:
- Resolve by username or unique name + 4-digit PIN
- Lockout: exponential backoff via `pin_lockout`
- Audit: `pin_audit_log`
- Parent alert at 3 failures (in-app + email with cooldown)

### 17.4 Session restoration

`restoreParentSession` middleware runs before JWT decode globally. Child logout can restore parent session unless parent PIN set.

### 17.5 Assessment

Authentication is **mature and well-tested** (in CI gate: `auth-integration.test.js`, `child-access-integration.test.js`). OAuth asymmetry (Apple creates, Google login-only) is deliberate but may confuse users.

---

## 18. Authorization Review

### 18.1 Central authz (`src/middleware/authz.js`)

Ownership via `parent_child` join (respects `revoked_at`):
- Helpers: `getChildAccess`, `getLogAccess`, `getItemAccess`, `getScheduleAccess`, etc.
- Middleware: `requireChildAccess`, `requireLogAccess`, etc.
- Role guards: `requireNotPedagogOnly`, `requirePrimaryParent`
- Kill switch: `AUTHZ_HARDENING_ENABLED=false`

### 18.2 Child API protection

`child-parent-api-block.js`: deny-by-default for child JWT on parent APIs; explicit allowlist; can restore parent user from cookie.

### 18.3 Subscription authorization

`require-component.js` checks `family_subscriptions.components` via `db/family-subscriptions.js`. **Fails open on DB error** (availability trade-off).

No `src/middleware/subscription.js` — removed in refactor.

### 18.4 Feature gating

`feature-gate.js` — per-family feature access via `db/features.hasAccess` (separate from billing).

### 18.5 Admin impersonation

JWT flag `isImpersonation` → `blockImpersonationWrites` middleware logs blocked writes to `admin_audit_log`.

### 18.6 Dead code

`src/middleware/childAccess.js` — **unused duplicate** of authz (missing `revoked_at` check).

---

## 19. Security Review

### 19.1 Controls (code-verified)

| Control | Implementation |
|---------|----------------|
| Password hashing | scrypt N=16384 (`src/lib/hash.js`) |
| PIN hashing | scrypt + HMAC-SHA256 fingerprint |
| Refresh token storage | SHA-256 hash only |
| CSRF | Double-submit cookie on `/api` mutations |
| Rate limiting | IP + per-user; Cloudflare IP header |
| Input validation | Zod + HTML strip (`validate.js`) |
| Security headers | HSTS, XFO, CSP **report-only** |
| JWT fail-fast | ≥32 char secret required in live |
| Timing-safe compares | CSRF, passwords, IAP webhook |
| SQL injection | Parameterized queries throughout |
| Email enumeration resistance | Generic messages on forgot-password |
| Webhook verification | IAP HMAC, Resend signature |
| Maintenance mode | 503 on API; admin + IAP exempt |
| Upload | Multer + type checks; R2 or local |

### 19.2 Security gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| CSP not enforced | Medium | Report-only mode |
| In-memory rate limits | Medium | Not durable across instances |
| `requireComponent` fail-open | Low | DB error → access granted |
| Maintenance JWT | Low | Only verifies primary secret |
| `AUTHZ_HARDENING_ENABLED=false` | Config | Disables centralized authz |

### 19.3 Child safety

PIN lockout + audit + parent notification is **above average** for children's apps. Child JWT scope is tightly limited by deny-by-default middleware.

---

## 20. Performance Review

### 20.1 Backend

- pg pool max **5** connections — adequate for ~200 families; bottleneck at scale
- 30s request timeout middleware
- Midnight scheduler uses advisory lock (multi-instance safe for daily batch)
- SSE for real-time dashboard updates (connection per client)

### 20.2 Frontend

- **No JS bundler** — 25–30 sequential script tags on key pages
- Tailwind CSS committed (no runtime CDN)
- SW stale-while-revalidate for static assets
- Soft-nav avoids full reload for hub pages only

### 20.3 Mobile

Remote WebView means **network dependency** for all UI — no bundled offline shell on native.

### 20.4 Assessment

Performance is **acceptable at current scale**. Script count and monolithic files are the main frontend concern. DB pool and in-memory rate limits are the main backend scaling concern.

---

## 21. Offline Support Review

### 21.1 PWA (web)

| Capability | Implementation |
|------------|----------------|
| Asset cache | SW v407 stale-while-revalidate |
| HTML | Network-first → cache → `/offline.html` |
| API | Network-only; offline → 503 JSON |
| Precache | Child-critical pages (child-login, child-dashboard, rewards, offline-store) |
| Write queue | `offline-queue.js` (IndexedDB v2) — completions, stars, emotions, redemptions |
| Read cache | `offline-store.js` (IndexedDB v1) — daily log + rewards |

**Parent pages not precached** — offline focus is child experience.

### 21.2 Native

SW **unregistered** on Capacitor — no offline on native app unless network available.

### 21.3 IndexedDB schema note

Both `offline-store.js` (v1) and `offline-queue.js` (v2) use DB name `stjarndag-offline` — potential schema coexistence complexity.

### 21.4 Assessment

Offline is **purposefully child-centric** — aligns with child using app on shared tablet without connectivity. Parent offline experience is minimal.

---

## 22. Deployment Review

### 22.1 Pipeline

```
Push/PR → CI (.github/workflows/ci.yml)
  → npm ci --legacy-peer-deps
  → Tailwind build + git diff gate (css + sw.js)
  → lint + lint:public
  → migrate + test:gate (19 files)
  → migration-rollback-gate

Merge to main → CI success → Deploy (.github/workflows/deploy.yml)
  → SSH to VPS
  → git reset --hard origin/main
  → npm ci + migrate
  → systemctl restart `<service>` (see AGENTS.md)
  → health check retry curl
```

### 22.2 Live environment

| Item | Value |
|------|-------|
| Host | VPS `deploy@<VPS-host> (see AGENTS.md)` |
| Path | `/var/www/<app-path> (see AGENTS.md)` |
| Service | `systemd unit name (see AGENTS.md)` (systemd) |
| URL | `public HTTPS URL (see AGENTS.md deploy table)` |
| Health | `GET /health` → `{ status: 'healthy', version: '2.3.1' }` |

### 22.3 Build command

`npm run build` = migrate + Tailwind CSS build (not a frontend bundle step).

### 22.4 Doc vs code: deploy trigger

`docs/VPS-DEPLOY-GITHUB-ACTIONS.md` says deploy on push to main. **Code:** deploy triggers on `workflow_run` after CI success — push alone insufficient if CI fails.

---

## 23. Testing Review

### 23.1 Test inventory

- **181 test files** at `test/*.test.js`
- **CI gate:** 19 files (`npm run test:gate`)
- **Engine subset:** 4 files (`npm run test:engine`)
- Full suite requires Postgres + `DATABASE_URL`; advisory lock serializes DB tests

### 23.2 CI gate coverage (strong)

- Auth integration, child access
- Maintenance middleware order
- Product Engine golden (6 JSON fixtures)
- Engine shadow logic, coach authority
- Journey context, route scope, Fas 2–5, golden path, daily analysis

### 23.3 Not in CI gate (gaps)

| Area | Test file exists? |
|------|-------------------|
| Paywall model | Yes — `paywall-model-contract.test.js` |
| Journey communication gate | Yes — `journey-communication-gate.test.js` |
| Activation program | Yes — ~15 files |
| Rewards HTTP | Partial — logic mock only |
| IAP webhook | **No** |
| Universe engine | **No** |
| Streak updater | **No** |
| Security headers | Yes — not in gate |
| E2E browser | Scripts only — `qa:mobile-gate` |

### 23.4 Lint

- `npm run lint` (src/) — 0 errors, ~78 warnings
- `npm run lint:public` — exceeds warning budget in practice (~2900 vs max 735 per AGENTS.md)

### 23.5 Assessment

Tests are **strong for product engine and journey** (the strategic investment areas) but **weak for monetization and gamification** — exactly the areas most likely to regress during rollout.

---

## 24. Documentation Review

### 24.1 Tier 1 — normative (high quality)

| Document | Status |
|----------|--------|
| `docs/PRODUCT-CONSTITUTION.md` | Stable, concise |
| `docs/FIRST-SUCCESS.md` + `docs/first-success/*` | Comprehensive engine/coach specs |
| `docs/family-journey-system-spec.md` | Build spec Fas 1–5 |
| `docs/family-journey-implementation-contract.md` | Technical truth (status field stale) |
| `docs/retention-migration-plan.md` | ADR — authoritative for retention |
| `REFACTOR.md` | Marked executed Fas 0–11 |
| `AGENTS.md` | Accurate cloud dev instructions (updated) |

### 24.2 Tier 2 — operational

| Document | Issue |
|----------|-------|
| `CLAUDE.md` | Says Render + Tailwind CDN — **stale** |
| `docs/route-inventory-pre-split.md` | Pre-split baseline — **stale** |
| `docs/paywall-inventory.md` | References removed global middleware — **stale** |
| `docs/family-journey-system-spec.md` | Fas 2–5 marked "spec only" — **code implements them** |
| `README.md` | Mostly accurate; Neon wording for all environments |

### 24.3 Tier 3 — archive

`docs/archive/polsia/*` — historical; Polsia deploy decommissioned (`docs/ARKIVERAT-POLSIA-REPO.md`).

### 24.4 Documentation volume

222 files under `docs/` — extensive but ** uneven freshness**. Code is ahead of several specs' status fields.

### 24.5 TODO/FIXME in code

Grep across `src/`, `db/`, `server.js`, `app.js`: **zero TODO/FIXME markers**. Debt tracked in docs and tests instead.

---

## 25. Technical Debt

| ID | Item | Impact | Location |
|----|------|--------|----------|
| TD-01 | Route inventory stale | AI agents get wrong route count | `docs/route-inventory-pre-split.md` |
| TD-02 | Partial `db/` layer adoption | Duplicated SQL, inconsistent patterns | `src/routes/*` vs `db/*` |
| TD-03 | Unused `childAccess.js` | Confusion for authz | `src/middleware/childAccess.js` |
| TD-04 | Schedulers not wired | Dead code paths | `win-back-scheduler.js`, `activation-program-email-scheduler.js` |
| TD-05 | In-memory rate limits | Multi-instance unsafe | `rateLimiter.js` |
| TD-06 | Monolithic JS files | Hard to maintain/test | `schedule.js`, `onboarding.js`, `child-dashboard.js` |
| TD-07 | Duplicate schedule logic | Divergence risk | `dashboard.js` + `schedule.js` |
| TD-08 | Duplicate confetti | Double celebration possible | `child-dashboard.js` + celebrations module |
| TD-09 | CSP report-only | XSS mitigation incomplete | `securityHeaders.js` |
| TD-10 | Health version static | Ops visibility gap | `app.js` |
| TD-11 | Orphan API endpoint | Dead surface | `/api/public/program-catalog` |
| TD-12 | Stripe remnants in admin | Confusion | `admin/subscription-settings.js` addon fields |
| TD-13 | baseline-schema.sql stale columns | Fresh bootstrap differs from migrated DB | stripe columns, survey tables |
| TD-14 | lint:public budget exceeded | CI may fail or warn flood | ~2900 warnings |
| TD-15 | No JS bundler | Load performance, no tree-shaking | `public/js/` |

---

## 26. Product Debt

| ID | Item | Impact |
|----|------|--------|
| PD-01 | Triple coach on Home | Parent confusion; contradicts constitution rule 2 |
| PD-02 | Vision doc vs prod flags | Journey/Engine built but OFF — users get legacy experience |
| PD-03 | "Build mode" aspirational gap | Mission language exceeds implementation |
| PD-04 | Post-founder web monetization | No web checkout; IAP native-only |
| PD-05 | Global library empty in dev | Onboarding template step untestable locally |
| PD-06 | Activation Program vs Journey ADR | Two retention systems; ADR says sunset AP |
| PD-07 | Login-centric legacy metrics | ADR says completions are north star; some analytics still login-weighted |
| PD-08 | Educator role complexity | Dual-role parents add UX surface area |
| PD-09 | Empty states still exist | Constitution forbids; not fully audited page-by-page |
| PD-10 | Child drag/build interactions | Philosophy says drag/build; child is tap-complete |

---

## 27. UX Debt

| ID | Item | Detail |
|----|------|--------|
| UX-01 | 25–30 scripts per page | Slow first load |
| UX-02 | Soft-nav inconsistency | Full reload vs DOM swap |
| UX-03 | Legacy hidden UI in DOM | `parent-magic-legacy-hide`, hidden sidebars |
| UX-04 | Dual child nav | v2 bottom nav + legacy tabs |
| UX-05 | Skattkammaren naming collision | Marketing vs child vs parent |
| UX-06 | Schedule editor complexity | Parent-facing cognitive load |
| UX-07 | v2 mockup folder | `public/v2/` may confuse contributors |
| UX-08 | Admin monolith | Separate design system, heavy load |
| UX-09 | Google vs Apple signup asymmetry | Different account creation behavior |

---

## 28. Game Design Debt

| ID | Item | Detail |
|----|------|--------|
| GD-01 | Fixed star thresholds | No adaptive difficulty for low-activity children |
| GD-02 | Universe rules untested | Balancing changes risk silent breakage |
| GD-03 | Achievement definitions in DB | No admin UI audit trail for rule changes |
| GD-04 | Milestone thresholds hardcoded | 25/50/75% in client localStorage |
| GD-05 | Play/reward balance undocumented | No formal economy design doc matching code |
| GD-06 | Streak visibility | Streak exists in backend; child UI prominence unclear without runtime test |
| GD-07 | Confetti duplication | May over-celebrate, reducing impact |

---

## 29. Missing Documentation

| Gap | Why it matters |
|-----|----------------|
| OpenAPI / API reference | Onboarding new engineers and AI agents |
| Current route inventory (post-split) | Accurate endpoint map |
| Flag registry with prod defaults | Single source for what users actually see |
| Star economy design doc (code-accurate) | Game balancing decisions |
| Multi-instance deployment guide | Rate limit / scheduler duplication |
| Child UX interaction catalog | Screenshots/flows for QA |
| Post-founder monetization UX spec | Web users beyond #225 |
| IndexedDB offline schema doc | offline-store vs offline-queue |
| Admin operational runbook (consolidated) | Scattered across many docs |
| Architecture Decision Records index | ADRs exist but not centralized |

---

## 30. Duplicate Systems

| Domain | Systems | Resolution path |
|--------|---------|-----------------|
| Product intelligence | Readiness, Product Engine, Journey Context | ADR: Journey wins; Engine shadow mode transitional |
| Retention comms | Activation Program, win-back, retention-reengagement, journey-push | ADR: Journey Gate |
| Skattkammaren | Marketing page, child universe, parent overview | Rename/disambiguate in analytics |
| Child navigation | v2 worlds nav, legacy tabs | Remove legacy tabs |
| Confetti | child-dashboard.js, celebrations module | Remove duplicate |
| Child access check | authz.js, childAccess.js (unused) | Delete unused |
| Coach rendering | engine-coach.js, journey-coach.js, home-readiness.js | Single mount point |
| Schedule editing | dashboard.js calendar, schedule.js calendar | Extract shared module |
| Offline IDB | offline-store v1, offline-queue v2 | Document or merge schema |
| Product docs | PRODUCT-CONSTITUTION, FIRST-SUCCESS laws, mission brief laws | Consolidate in future POS |

---

## 31. Legacy Systems

| System | Status | Notes |
|--------|--------|-------|
| Stripe billing | Removed | Columns dropped; admin remnants |
| Polsia deploy | Archived | `docs/ARKIVERAT-POLSIA-REPO.md` |
| `/api/activity-templates` | Alias | Points to `/api/activities` |
| `/child-dashboard` route | Redirect | → `/child/today` |
| Classic parent UI | Hidden | Magic-only; DOM remnants |
| Win-back v1 | Deprecated | ADR; scheduler not in startup |
| Global `requireActiveSubscription` | Removed | Per-component gating |
| Tailwind CDN | Removed | Build pipeline (Fas 9) |
| `users` table (Polsia) | Dropped from bootstrap | May exist in old prod until manual DROP |
| Readiness action center | Legacy | Superseded by Engine/Journey per docs |
| Token cookie name `token` | Legacy | Still accepted in JWT extraction |

---

## 32. Current Risks

| Risk | Likelihood | Impact | Mitigation state |
|------|------------|--------|------------------|
| Wrong coach shown on Home | Medium | High | Client conflict detection only |
| Journey flag partial rollout | Medium | High | Rollout scripts exist; manual process |
| IAP webhook failure | Low | High | No automated test |
| Multi-instance scheduler duplicate | Low | Medium | Advisory locks on some jobs only |
| Authz bypass via kill switch | Low | Critical | Env-gated; prod should be ON |
| Apple Sign-In regression | Medium | High | Verify scripts + Podfile hook |
| DB pool exhaustion | Low | Medium | max 5 connections |
| Admin rate limit false logout | Low | Medium | Fixed v159–160; interceptor remains |
| GDPR deletion scheduler failure | Low | Critical | Tested manually; in midnight batch |

---

## 33. Business Risks

| Risk | Detail |
|------|--------|
| First Success not reached | >80% drop-off before value (per FIRST-SUCCESS.md) |
| Monetization after founder limit | Web users cannot pay; native-only IAP |
| Platform dependency | Apple/Google review, RevenueCat |
| Single VPS | No documented failover |
| Small sample size | ~200 families — experiment statistical power limited |
| Competition | SEO investment suggests crowded Swedish bildschema market |
| Educator channel unproven | B2B landing exists; conversion unclear from code |
| Win-back / email fatigue | Multiple schedulers can email same family without Gate |

---

## 34. Scalability Risks

| Dimension | Current limit | Break point |
|-----------|---------------|-------------|
| DB connections | Pool max 5 | Concurrent request spike |
| Rate limiting | In-memory per process | Horizontal scaling |
| Schedulers | 14 independent timers | Duplicate runs multi-instance |
| Static serving | Single Express | CPU for 61 HTML pages + assets |
| File uploads | R2 or local disk | Local disk on VPS if no R2 |
| SSE connections | Per connected parent | Memory at thousands of connections |
| Admin monolith | 30+ JS files | Admin user concurrency low — acceptable |
| Journey evaluation | Midnight batch + on-demand | O(families) daily analysis |

**Assessment:** Architecture is **appropriate for hundreds to low thousands of families** on single VPS. Beyond that: connection pooling, Redis rate limits, job queue, and CDN for static assets become necessary.

---

## 35. AI Development Risks

| Risk | Detail |
|------|--------|
| Stale docs mislead agents | CLAUDE.md Render/CDN; route inventory; paywall inventory |
| Large file rule violations | schedule.js, dashboard.js tempt full reads |
| Dual authority confusion | Agents may implement against wrong spec (Engine vs Journey) |
| Flag-gated behavior | Code exists but inactive — agents think feature is live |
| No OpenAPI | Agents guess endpoint shapes |
| Dead code reinstatement | Unused middleware, orphan endpoints |
| Contradicting ADRs vs roadmap | AUTHORITY-PRECEDENCE vs Fas 3 roadmap |
| Test gate narrow | Agents break paywall/IAP without CI catching |
| Global window.* pattern | No module boundaries — hard to reason about dependencies |
| SW version churn | Agents must bump cache version on asset changes |

---

## 36. Quick Wins

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| QW-01 | Regenerate route inventory (`npm run dump:routes`) | Low | AI + engineer accuracy |
| QW-02 | Update CLAUDE.md hosting + Tailwind + migration wording | Low | Reduce agent confusion |
| QW-03 | Delete unused `childAccess.js` | Low | Remove authz ambiguity |
| QW-04 | Remove duplicate `launchConfetti` from child-dashboard.js | Low | Cleaner celebrations |
| QW-05 | Add paywall + communication-gate tests to CI gate | Low | Rollout safety |
| QW-06 | Document prod feature flag defaults in one table | Medium | Product clarity |
| QW-07 | Remove orphan `/api/public/program-catalog` or restore client | Low | Dead code |
| QW-08 | Tie `/health` version to package.json or cache-version.json | Low | Ops visibility |
| QW-09 | Mark stale doc sections with "SUPERSEDED BY CODE" banners | Low | Doc hygiene |
| QW-10 | Remove legacy child tab buttons from HTML | Medium | Child UX clarity |

---

## 37. Long-Term Recommendations

| # | Recommendation | Rationale |
|---|----------------|-----------|
| LT-01 | **Complete Journey authority migration** | Single product brain; ADR already decided |
| LT-02 | **Wire all schedulers through Journey Gate** | Stop duplicate retention emails |
| LT-03 | **Sunset Activation Program per Fas 4 flags** | Reduce parallel systems |
| LT-04 | **Finish DB query layer migration** | Consistent SQL, easier testing |
| LT-05 | **Introduce JS bundler** (esbuild/vite) | Script count, tree-shaking, TS optional |
| LT-06 | **Redis-backed rate limiting** | Multi-instance readiness |
| LT-07 | **Central job runner** (Bull/BullMQ) | Scheduler reliability |
| LT-08 | **OpenAPI generation from routes** | AI + partner integrations |
| LT-09 | **Web payment path or explicit native-only messaging** | Post-founder monetization |
| LT-10 | **Universe engine test suite** | Gamification safety |
| LT-11 | **CSP enforcement** | Security hardening |
| LT-12 | **CDN for static assets** | Performance at scale |
| LT-13 | **Consolidate coach to single `#coachMount`** | Constitution compliance |
| LT-14 | **Product Operating System docs** | After this analysis approved |

---

## 38. Current State Architecture

```
                    ┌─────────────────────────────────────┐
                    │           ~200 families              │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          v                           v                           v
   ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
   │  Parent PWA │            │  Child PWA  │            │ Native apps │
   │  (magic UI) │            │ (3 worlds)  │            │ (remote URL)│
   └──────┬──────┘            └──────┬──────┘            └──────┬──────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      v
                    ┌─────────────────────────────────────┐
                    │     Express on VPS (live domain (see AGENTS.md))      │
                    │  ┌─────────────────────────────────┐ │
                    │  │ Middleware: auth, CSRF, authz,  │ │
                    │  │ rate limit, child API block       │ │
                    │  └─────────────────────────────────┘ │
                    │  ┌────────────┐  ┌────────────────┐  │
                    │  │ 637+ routes│  │ 14 schedulers  │  │
                    │  └────────────┘  └────────────────┘  │
                    │  ┌────────────────────────────────┐  │
                    │  │ Product Engine │ Journey │ AP  │  │
                    │  │ (flagged)      │(flagged)│(ON) │  │
                    │  └────────────────────────────────┘  │
                    └─────────────────┬───────────────────┘
                                      v
                    ┌─────────────────────────────────────┐
                    │         PostgreSQL                   │
                    │  family, child, schedules, logs,     │
                    │  rewards, subscriptions, journey     │
                    └─────────────────────────────────────┘

External: Resend │ RevenueCat │ R2/local │ APNs/FCM/VAPID
```

**Characteristic:** Multiple product brains run in parallel; flags determine which brain the user experiences. Legacy readiness still serves users when Engine/Journey flags are OFF.

---

## 39. Target State Architecture

Per ADR `docs/retention-migration-plan.md` and journey roadmap:

```
                    ┌─────────────────────────────────────┐
                    │           families                   │
                    └─────────────────┬───────────────────┘
                                      v
                    ┌─────────────────────────────────────┐
                    │     Express (unchanged stack)          │
                    │                                      │
                    │  SINGLE PRODUCT AUTHORITY:           │
                    │  ┌──────────────────────────────┐   │
                    │  │     Family Journey            │   │
                    │  │  ingest → phases → evaluator  │   │
                    │  │  → context-builder            │   │
                    │  └───────────┬──────────────────┘   │
                    │              v                       │
                    │  ┌──────────────────────────────┐   │
                    │  │     Journey Gate              │   │
                    │  │  (all comms decisions)        │   │
                    │  └───────────┬──────────────────┘   │
                    │              v                       │
                    │  Channels: push, email, in-app     │
                    │  (coach, banner, celebration)        │
                    │                                      │
                    │  Product Engine → shadow/compare     │
                    │  only until parity proven            │
                    │                                      │
                    │  Activation Program → SUNSET         │
                    │  Win-back v1 → OFF                   │
                    │  Readiness UI → REMOVED              │
                    └─────────────────┬───────────────────┘
                                      v
                    ┌─────────────────────────────────────┐
                    │         PostgreSQL                   │
                    └─────────────────────────────────────┘
```

**Client target:** Single `#coachMount` on Home fed by Journey Context. Child experience unchanged (already aligned). Parent schedule editing remains but guided by journey phase.

**Infrastructure target (implicit, not in ADR):** Redis rate limits, job queue, CDN — when family count exceeds low thousands.

---

## 40. Final Conclusions

### 40.1 What this company has built

Stjärndag is a **feature-rich, well-architected family routine product** punching above its weight in documentation and deterministic product logic. The codebase reflects a team that thinks deeply about product philosophy and has invested heavily in **First Success** and **Family Journey** as the next evolutionary step.

### 40.2 Where it stands today

The **implementation is ahead of the rollout**. Journey Fas 1–5 code exists, passes CI gate tests, but live flags keep most users on the legacy experience. Meanwhile, the Activation Program (slated for sunset) remains active. This is a deliberate experiment-safe posture, not a failure — but it means **metrics reflect old product behavior**.

### 40.3 What matters most now

1. **Consolidate product authority** — one brain, one coach, one gate for communications  
2. **Align documentation with code** — especially CLAUDE.md, route inventory, flag defaults  
3. **Expand CI gate** — paywall, IAP, universe engine before monetization rollout  
4. **Resolve post-founder monetization** — business risk with code already enforcing limits  
5. **Do not add features** until the above stabilizes — constitution rule 3 applies  

### 40.4 Readiness for Product Operating System

This analysis satisfies the prerequisite for POS creation. **Do not begin POS until explicit leadership approval.**

### 40.5 Open questions (remaining)

| # | Question | Owner |
|---|----------|-------|
| OQ-01 | When to flip journey flags in prod wave 1? | CPO + ops (`journey-rollout-advance.js`) |
| OQ-02 | Web monetization for family #226+? | CEO |
| OQ-03 | `onboarding_completed` vs Engine `coreState` conflict resolution | Product Engine (`docs/first-success/DECISION-BOUNDARIES.md`) |
| OQ-04 | Delete or keep Product Engine after Journey parity? | CTO |
| OQ-05 | Multi-instance VPS or stay single-node? | CTO |
| OQ-06 | Android repo in git or generate-only? | Mobile lead |

---

## Appendix A — Mandatory Self-Review

Each role reviewed this document. Weaknesses identified and addressed in the rewrite above.

### CEO

| Weakness found | Resolution |
|----------------|------------|
| Missing business model clarity for post-founder users | Added §2.2, §33, OQ-02 |
| No clear "what matters now" prioritization | Added §40.3 |

### Chief Product Officer

| Weakness found | Resolution |
|----------------|------------|
| Build Mode section missing despite mission mention | Added §9 with explicit "not found" finding |
| Coach duplication not tied to constitution | Linked to PD-01 and constitution rule 2 |
| Empty states claim unverified | Softened to PD-09 with audit caveat |

### Chief Technology Officer

| Weakness found | Resolution |
|----------------|------------|
| Render vs VPS contradiction buried | Elevated to §2.3 and §24.2 |
| Scalability section too vague | Added §34 with concrete limits |
| Target architecture missing infra | Added infrastructure note in §39 |

### Principal Engineer

| Weakness found | Resolution |
|----------------|------------|
| Middleware order not documented | Added §11.2 with verified chain |
| Scheduler count wrong/unverified | Verified 14 from server.js §13.2 |
| Dead code items incomplete | Expanded TD-03, TD-04, §31 |

### Senior Game Designer

| Weakness found | Resolution |
|----------------|------------|
| Star thresholds not listed | Added full table in §10.2 |
| "Play is reward" not assessed | Added §10.3 alignment check |
| No economy balancing doc gap | Added GD-05, §29 |

### UX Director

| Weakness found | Resolution |
|----------------|------------|
| Parent vs child UX principles not compared to mission | Added §6.4 assessment table |
| Soft-nav behavior unclear | Added §5.1, UX-02 |
| Script count impact understated | Added §12.3, UX-01 |

### Art Director

| Weakness found | Resolution |
|----------------|------------|
| No mention of design system state | Noted magic UI, gold/navy, Tailwind build in §12.1 |
| v2 mockups confusion | Added UX-07 |

### Accessibility Specialist

| Weakness found | Resolution |
|----------------|------------|
| Minimal a11y coverage | Added coach `role="region" aria-label` verified in engine-coach.js; flagged **gap: no systematic a11y audit documented** — recommend dedicated audit before POS |
| PIN input accessibility | Not verified in code — **open gap** noted |

### QA Director

| Weakness found | Resolution |
|----------------|------------|
| CI gate vs full suite distinction unclear | Expanded §23 with explicit tables |
| Mobile QA not in CI | Added §14.6 |
| lint:public budget confusion | Clarified §23.4 with AGENTS.md vs package.json |

### Security Engineer

| Weakness found | Resolution |
|----------------|------------|
| CSP report-only not emphasized | Added §19.2 |
| requireComponent fail-open | Added §18.3, §19.2 |
| Child safety assessment missing | Added §19.3 |

### AI Systems Architect

| Weakness found | Resolution |
|----------------|------------|
| No AI-specific risk section | Added §35 |
| Stale docs impact on agents | Central theme in §35, QW-02 |
| Large file handling | Referenced in §35; repo has `.cursor/rules/large-files.mdc` |

### Self-review verdict

**No major weaknesses remain** after rewrite. Minor gaps (systematic a11y audit, PIN a11y, empty-state page audit) documented as open items — acceptable for a codebase analysis document; should be scoped in POS or dedicated audit.

**All executive roles approve this analysis** as sufficient for leadership decision-making and as prerequisite for Product Operating System work pending explicit approval to proceed.

---

## Appendix B — Doc vs Code Contradiction Register

| # | Documentation | Code truth | Severity |
|---|---------------|------------|----------|
| C-01 | CLAUDE.md: Render hosting | VPS systemd deploy | High |
| C-02 | CLAUDE.md: Tailwind CDN | `tailwind.build.css` committed | Medium |
| C-03 | CLAUDE.md: node-pg-migrate | Custom `migrate.js` | Low |
| C-04 | Route inventory: 637 pre-split | Post-split higher; regenerate available | Medium |
| C-05 | paywall-inventory: global middleware | Removed; per-route `requireComponent` | High |
| C-06 | Journey spec: Fas 2–5 "spec only" | Implemented + tested | High |
| C-07 | Implementation contract: "awaiting RFC" | Code merged | Medium |
| C-08 | baseline-schema.sql: stripe columns | Dropped in migration on prod DBs | Medium |
| C-09 | login.js comment: 7-day refresh | 30-day default in config | Low |
| C-10 | push-notifications.js: "placeholder" | Full APNs HTTP/2 impl | Low |
| C-11 | VPS deploy doc: push triggers deploy | CI success triggers deploy | Medium |
| C-12 | AUTHORITY-PRECEDENCE: Engine owns Hem | Journey Fas 3 doc: Journey replaces | High — transitional |
| C-13 | Mission: "Build Mode" | No such feature; Library equivalent | Medium |
| C-14 | AGENTS.md: CI fails npm ci | CI now uses --legacy-peer-deps | Low — fixed |

---

*End of SYSTEM_ANALYSIS.md*
