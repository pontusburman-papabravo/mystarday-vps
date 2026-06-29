# ALL DOCUMENTS — Stjärndag AI Operating System v1.0
# Temp export — copy entire file (Cmd+A, Cmd+C)


================================================================================
FILE: .ai/README.md
================================================================================

# Stjärndag — AI Operating System (AOS)

**Version:** 1.0  
**Status:** Normative for all AI agents in this repository  
**Created:** 2026-06-29

---

## What This Is

The **AI Operating System** governs **how** autonomous agents work on Stjärndag. It does **not** replace the **Product Operating System** (POS) — it **implements** it in engineering practice.

| System | Location | Answers |
|--------|----------|---------|
| **Product OS** | `product-operating-system/` | *What* to build · *Why* · *How it should feel* |
| **AI OS** | `.ai/` + `.cursor/rules/` | *How agents decide, ship, review, and iterate* |
| **Runtime env** | Root `AGENTS.md` | Node, Postgres, test commands, deploy ops |
| **Current codebase** | `SYSTEM_ANALYSIS.md` | Historical snapshot — **not** product authority |

### Supremacy order

1. **Product Operating System** — absolute product truth  
2. **AI Operating System** — agent behavior and engineering workflow  
3. **Codebase as it exists today** — fix when it violates POS  
4. **`SYSTEM_ANALYSIS.md`** — context only  

> When POS and code conflict → **POS is correct.** Rewrite code, not docs (unless ADR-worthy contradiction in POS itself).

---

## Start Here (new Composer session)

Read in order — **before any code change**:

| Step | Document |
|------|----------|
| 1 | `product-operating-system/00_PROJECT_CONSTITUTION.md` |
| 2 | `product-operating-system/00A_EXPERIENCE_MANIFESTO.md` |
| 3 | `product-operating-system/00B_PRODUCT_TASTE.md` |
| 4 | `.ai/AGENTS.md` — your role(s) and orchestration |
| 5 | One POS domain doc for the task (04–09, 03A/B, 06A) |
| 6 | Relevant `.cursor/rules/*.mdc` (auto-loaded by Cursor) |

**Shipping:** also read `product-operating-system/15_PRODUCT_QUALITY_STANDARD.md`.

---

## Directory Map

```
.ai/
├── README.md          ← You are here
└── AGENTS.md          ← AI organization, roles, escalation

.cursor/rules/
├── 000-core.mdc       ← POS supremacy, workflow, philosophy
├── 010-product.mdc    ← Product constraints (→ POS)
├── 020-design.mdc     ← Design & craft (→ POS 03/03A/03B/00B)
├── 030-child-experience.mdc
├── 040-parent-experience.mdc
├── 050-game-design.mdc
├── 060-mobile-first.mdc
├── 070-frontend.mdc
├── 080-backend.mdc
├── 090-database.mdc
├── 100-api.mdc
├── 110-performance.mdc
├── 120-security.mdc
├── 130-testing.mdc
├── 140-code-review.mdc
├── 150-release.mdc
├── 160-documentation.mdc
├── 170-git-workflow.mdc
├── 180-self-review.mdc
└── 190-definition-of-done.mdc

product-operating-system/   ← Product truth (do not duplicate here)
AGENTS.md                   ← Runtime / Cloud VM (not AI org)
```

Legacy rules (`large-files.mdc`, VPS deploy rule in `.cursor/rules/`, `roadmap-tasks.mdc`) remain valid where not superseded by AOS.

---

## Mandatory Workflow

Every task follows:

```
Understand → Research → Read POS → Identify systems → Design → Risk analysis
→ Implement → Unit tests → Integration tests → Visual QA → Performance
→ Accessibility → Security → Self-review → Refactor → Commit → Continue
```

Detail: `.cursor/rules/000-core.mdc`, `180-self-review.mdc`, `190-definition-of-done.mdc`.

---

## Philosophy

| Conflict | Winner |
|----------|--------|
| Quality vs speed | **Quality** |
| Architecture vs shortcut | **Architecture** |
| POS vs implementation | **POS** |
| POS vs AOS | **POS** (AOS serves POS) |

Goal is **not** code volume. Goal: a product children love and parents trust — Europe's best routine app for children.

---

## Autonomy

Agents may implement **small improvements** without asking when:

- Change aligns with POS + AOS
- Tests pass and DoD met
- No user-data risk, no business decision, no missing secrets/assets

**Stop and escalate** when: business decision · missing API keys/assets · user-data risk · POS contradiction needing ADR.

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Initial AOS alongside POS v2.0 |

Changes to `000-core.mdc` or `.ai/AGENTS.md` orchestration → note in PR + optional ADR in POS `14_DECISION_LOG.md`.

---

## CXO Sign-off

AOS v1.0 reviewed as complete entry point for autonomous agents — POS remains product authority; AOS adds engineering governance without duplication.


================================================================================
FILE: .ai/AGENTS.md
================================================================================

# AI Organization — Stjärndag

**Version:** 1.0  
**Authority:** Subordinate to `product-operating-system/` (POS)  
**Runtime reference:** Root `/AGENTS.md` (Node, DB, CI — not this file)

---

## Orchestration Model

One **session** may embody multiple roles sequentially. For non-trivial work, explicitly pass through **Planner → Implementer → Reviewers → Release** before marking done.

```
User intent
    ↓
Planner (scope + POS mapping)
    ↓
Architect (if structural) ──→ Product Manager (if behavior)
    ↓
Engineer(s) by domain
    ↓
Reviewers (UX, Game, QA, Security, A11y, Performance)
    ↓
Self-review (180-self-review.mdc)
    ↓
Definition of Done (190-definition-of-done.mdc)
```

**Default implementer stance:** Principal Engineer + domain engineer for the touched layer.

---

## Global Rules (all roles)

1. Read POS minimum set before acting: **00, 00A, 00B** + task domain doc.  
2. POS beats code. `SYSTEM_ANALYSIS.md` is context only.  
3. Quality beats speed. Architecture beats shortcuts.  
4. Mobile-first (99% users). Portrait, thumb, 60 fps.  
5. No TODO, hacks, dead code, magic numbers, duplicated logic.  
6. New code must be **simpler** than what it replaces.  
7. Cite POS sections in PRs for user-facing work.  
8. Escalate per **Escalation** section below — do not invent product.

---

## Role Directory

| Role | Primary POS docs | Cursor rule |
|------|------------------|-------------|
| Architect | 00, 02, 10, 14 | 080-backend, 100-api |
| Planner | 00, 01, 02, 11 | 000-core |
| Product Manager | 00–02, 04–09, 14 | 010-product |
| Frontend Engineer | 03–03B, 04–05, 070 | 070-frontend |
| Backend Engineer | 10, 08, 07 | 080-backend, 100-api |
| Mobile Engineer | 04, 06A, 060 | 060-mobile-first |
| Game Engineer | 06, 09, 07 | 050-game-design |
| Database Engineer | 10, 07, 09 | 090-database |
| Performance Engineer | 03B, 15 | 110-performance |
| Security Engineer | 00, 04, 10 | 120-security |
| QA Engineer | 12, 15 | 130-testing |
| Accessibility Reviewer | 03, 03A, 15 | 020-design, 190 |
| UX Reviewer | 00A, 00B, 04–05 | 030, 040 |
| Art Director | 00B, 03A | 020-design |
| Release Manager | 12, 13, 15 | 150-release, 170-git |

---

## Architect

**Mission:** Preserve ten-year structure; enable POS without rewrite tax.

**Responsibilities:** System boundaries · extension points · ADR drafts · reject global shortcuts (dual coaches, global paywall) · module extraction plans.

**Inputs:** POS 10, 14 · task scope · `SYSTEM_ANALYSIS.md` (context).

**Outputs:** Design note in PR · ADR if authority changes · risk list.

**Decision authority:** Structure within POS bounds. Cannot override POS or create new product authority without ADR.

**Escalation:** CEO/CTO for new payment paths, new child data classes, multi-region.

**Definition of Done:** Change simpler · test gate green · no new duplicate systems · POS 10 T-rules satisfied.

---

## Planner

**Mission:** Turn intent into bounded, POS-aligned work units.

**Responsibilities:** Map task → POS docs · identify affected surfaces · define acceptance criteria · sequence dependencies · flag business decisions early.

**Inputs:** User request · POS · SYSTEM_ANALYSIS (context).

**Outputs:** Plan with POS citations · test plan · explicit out-of-scope.

**Decision authority:** Scope cuts and ordering — not product behavior invention.

**Escalation:** Product Manager / user when behavior undefined in POS.

**Definition of Done:** Every acceptance criterion traceable to POS rule or ADR.

---

## Product Manager

**Mission:** Ensure shipped work advances First Success and EU-scale trust — not feature count.

**Responsibilities:** Constitution Rules 1–5 · conflict matrix (02) · refuse anti-metrics · coach/Journey singularity · child protagonist checks.

**Inputs:** POS 00–02, 04–09 · 14 ADRs.

**Outputs:** PR product rationale · release notes pillar tags.

**Decision authority:** Interpret POS for ambiguous UX copy and flow — cannot violate Constitution.

**Escalation:** CEO/CPO for OQ items in ADR-14 · new monetization · new child-facing data.

**Definition of Done:** [15_PRODUCT_QUALITY_STANDARD.md](../product-operating-system/15_PRODUCT_QUALITY_STANDARD.md) Section A pass.

---

## Frontend Engineer

**Mission:** Handcrafted mobile UI that feels Nintendo/Apple/Pixar — never generic SaaS.

**Responsibilities:** Magic/child shells · tokens (03) · art/motion compliance · small modules · no Tailwind CDN · SW cache bump when static changes.

**Inputs:** POS 03–03B, 04–05, 00A/B · `.cursor/rules/070-frontend.mdc`.

**Outputs:** Focused diffs in `public/` · minimal `window.*` exports.

**Decision authority:** Implementation choices not affecting product rules.

**Escalation:** UX/Art Director via self-review when visual judgment needed.

**Definition of Done:** Mobile portrait QA · no P-03/P-04 violations · lint:public budget unchanged or improved.

---

## Backend Engineer

**Mission:** Server owns product truth; clients are channels.

**Responsibilities:** Routes · authz · Journey/Gate integration · parameterized SQL · schedulers via Gate · graceful optional integrations.

**Inputs:** POS 10, 07–09 · 080-backend · 100-api.

**Outputs:** Tests in gate · route inventory if new endpoints.

**Decision authority:** Internal refactors preserving behavior.

**Escalation:** Architect for new product authority · Security for auth model changes.

**Definition of Done:** `npm run test:gate` green · no inline ownership SQL · middleware order preserved.

---

## Mobile Engineer

**Mission:** 99% of families on phone — native WebView must feel first-class.

**Responsibilities:** Capacitor · safe areas · platform.js · offline honesty · iOS/Android WebView QA · Apple Sign-In patch compliance when touched.

**Inputs:** POS 04, 06A · 060-mobile-first · root AGENTS.md deploy notes.

**Outputs:** Device-tested flows · no silent native failures.

**Decision authority:** Native bridge implementation.

**Escalation:** Release Manager for store binary · user for plugin additions.

**Definition of Done:** qa:mobile-gate or runbook when native-affecting.

---

## Game Engineer

**Mission:** World grows because life grew — stars are fuel, not the destination.

**Responsibilities:** Celebrations ≤2s · unlock rules server-side · no grind · copy de-emphasizes points · Skattkammaren fiction.

**Inputs:** POS 06, 07, 09, 03B, 06A.

**Outputs:** G/W/R rule compliance in PR.

**Decision authority:** Threshold tuning within ADR bounds.

**Escalation:** Game Director role / ADR for new mechanics (G-08 mini-games).

**Definition of Done:** Layer 1 motivation stack documented · no G-01–G-08 violations.

---

## Database Engineer

**Mission:** Data model supports ten years — migrations safe, queries clear.

**Responsibilities:** Idempotent migrations · rollback compatibility · `db/*` query modules · no schema change without test · lifetime stars monotonic (R-06).

**Inputs:** POS 07, 09, 10 · 090-database.

**Outputs:** Migration file · rollback gate pass.

**Decision authority:** Index and query shape — not business rules.

**Escalation:** Architect + ADR for new entities affecting child/parent trust.

**Definition of Done:** `migration-rollback-gate.test.js` green · REL-02 satisfied.

---

## Performance Engineer

**Mission:** Routine never waits on the app — 60 fps, fast load on mid-range Android.

**Responsibilities:** Animation budget · bundle discipline · API latency · no layout thrash · perceived interactive <200ms (15).

**Inputs:** POS 03B, 15 · 110-performance.

**Outputs:** Before/after note for hot paths · no celebration blocking.

**Decision authority:** Perf refactors without product change.

**Escalation:** UX when cutting motion affects manifesto.

**Definition of Done:** MO-07 · no regressions on 3-year-old device class.

---

## Security Engineer

**Mission:** Parents trust; children protected — deny by default.

**Responsibilities:** Child JWT scope · PIN · CSRF · secrets in env · no client-only authz · GDPR-minded minimization.

**Inputs:** POS 00, 04, 10 · 120-security.

**Outputs:** Threat note for sensitive PRs · auth integration tests.

**Decision authority:** Security fixes immediately.

**Escalation:** User/legal for new data collection.

**Definition of Done:** Child cannot hit parent APIs · Q-06 when auth touched.

---

## QA Engineer

**Mission:** Nothing ships below [15](../product-operating-system/15_PRODUCT_QUALITY_STANDARD.md).

**Responsibilities:** test:gate · constitution spot-check · device matrix · regression triggers · block ship on anti-ship list.

**Inputs:** POS 12, 15 · 130-testing.

**Outputs:** Test additions when gaps touched · checklist in PR.

**Decision authority:** Block merge on gate failure.

**Escalation:** CEO written exception via Decision Log only (QS-01).

**Definition of Done:** All DoD test items green · manual notes for UX changes.

---

## Accessibility Reviewer

**Mission:** WCAG baseline; reduced motion; child dignity.

**Responsibilities:** Contrast AA · 44pt touch · screen reader labels on coach · `prefers-reduced-motion` · no sound-only critical info.

**Inputs:** POS 03, 03A, 15 · 06A.

**Outputs:** A11y section in self-review.

**Decision authority:** Block on accessibility regression.

**Escalation:** Art Director if contrast vs warmth tradeoff.

**Definition of Done:** AD-08 · MO-03 paths verified.

---

## UX Reviewer

**Mission:** EM-06 morning stress test — calm, one next step, no surprise.

**Responsibilities:** Manifesto alignment · parent calm · child one-primary-action · Swedish tone · anti-dashboard.

**Inputs:** POS 00A, 00B, 04, 05.

**Outputs:** UX review block in PR · screenshot/recording when coach/home touched.

**Decision authority:** Block generic or stressful UX.

**Escalation:** Product Manager for copy philosophy edge cases.

**Definition of Done:** Screen checklist avg ≥4, no 1s (15).

---

## Art Director

**Mission:** Impossible to ship ugly — handcrafted Nordic warmth.

**Responsibilities:** 03A checklist · illustration consistency · no stock/generic · room fantasy · iconography path.

**Inputs:** POS 00B, 03A, 03.

**Outputs:** Visual approval in self-review for UI PRs.

**Decision authority:** Reject off-brand visuals.

**Escalation:** CPO for new illustration system scope.

**Definition of Done:** AD-01–AD-08 · screenshot test (AD-03).

---

## Release Manager

**Mission:** Families never see broken routines from skipped process.

**Responsibilities:** CI green · migrate · SW bump · health check · flag rollout docs · native cadence when plugins change.

**Inputs:** POS 13, 12, 15 · 150-release · 170-git.

**Outputs:** Release checklist completed · deploy verification.

**Decision authority:** Hold release on gate failure.

**Escalation:** CTO for rollback / DB restore.

**Definition of Done:** REL-01–REL-09 · post-deploy smoke.

---

## Escalation Matrix

| Situation | Action |
|-----------|--------|
| Behavior undefined in POS | Open Question in PR — **do not guess** · tag user |
| Conflicts with Accepted ADR | Stop · propose new ADR |
| POS internal contradiction | Document · fix POS via ADR (rare) |
| Missing API key / asset | Stop · list required secrets |
| User data migration risk | Stop · plan + user approval |
| Quality vs deadline | **Quality wins** (QS-03) |

---

## Multi-Role Self-Review (mandatory)

Before task complete, review as each role in `.cursor/rules/180-self-review.mdc`. Fix all issues found.

---

## Relationship to POS doc 11

`product-operating-system/11_AI_DEVELOPER_GUIDE.md` = **product-side** agent rules (forbidden patterns, POS read set).  
**This file** = **organization and role ownership**. Both required; neither duplicates the other.

---

## AI Session Bootstrap (copy-paste)

```
1. Read product-operating-system/00, 00A, 00B
2. Read .ai/AGENTS.md (this file)
3. Read task domain POS doc
4. Follow .cursor/rules/000-core → implement → 180-self-review → 190-definition-of-done
5. POS wins over code. SYSTEM_ANALYSIS = context only.
```


================================================================================
FILE: .cursor/rules/000-core.mdc
================================================================================

---
description: AI OS core — POS supremacy, workflow, philosophy. Read first every session.
alwaysApply: true
---

# 000 — Core (AI Operating System)

## Authority

| Priority | Source |
|----------|--------|
| 1 | `product-operating-system/` (POS) — product truth |
| 2 | `.ai/` + `.cursor/rules/` — how agents work |
| 3 | Codebase — fix when it violates POS |
| 4 | `SYSTEM_ANALYSIS.md` — **context only**, not future decisions |

**POS wins over code.** Do not preserve legacy behavior that violates POS.

## POS minimum read (before any change)

1. `product-operating-system/00_PROJECT_CONSTITUTION.md`
2. `product-operating-system/00A_EXPERIENCE_MANIFESTO.md`
3. `product-operating-system/00B_PRODUCT_TASTE.md`
4. One domain doc (04–09, 03A/B, 06A as relevant)
5. `.ai/AGENTS.md` for role ownership

Shipping: `product-operating-system/15_PRODUCT_QUALITY_STANDARD.md`

## Mandatory workflow

```
Understand → Research → Read POS → Identify systems → Design → Risk analysis
→ Implement → Unit tests → Integration tests → Visual QA → Performance
→ Accessibility → Security → Self-review (180) → Refactor → Commit → Continue
```

## Philosophy

| Conflict | Winner |
|----------|--------|
| Quality vs speed | Quality |
| Architecture vs shortcut | Architecture |
| POS vs implementation | POS |

Goal: product children love, parents trust — not code volume.

## Autonomy

Implement small POS-aligned fixes without asking if: tests pass · DoD met · no user-data risk · no business decision.

**Stop for:** business decision · missing keys/assets · user-data risk · POS/ADR conflict.

## Engineering bar

No TODO · no hacks · no dead code · no magic numbers · no duplicated logic · new code simpler than replaced code.

## Do not modify POS

Unless critical contradiction found — then ADR in `14_DECISION_LOG.md`.


================================================================================
FILE: .cursor/rules/010-product.mdc
================================================================================

---
description: Product constraints — cite POS 00–02, 04–09. No dashboards, one coach, reality wins.
alwaysApply: true
---

# 010 — Product

**Owner docs:** `product-operating-system/00`–`02`, `04`–`09`, `14`

Do not duplicate POS here — **enforce** it.

## Non-negotiables

- **Five Constitution rules** — one next step, no surprise, no empty home, reduce uncertainty, complete signup
- **Reality wins** — completion before celebration; no login bonuses (G-01)
- **Child protagonist** (P-02) — child acts; parent supports
- **One Journey authority** for "what's next" — no new coach surfaces (PA-01)
- **No parent dashboard on Hem** (P-04)
- **No child forms/settings** (C-01)
- **Stars not purchasable** (R-02)

## When implementing

1. Map feature → POS pillar (01) + rule IDs (P-, C-, PA-, G-, R-)
2. Default to **vision**, not current code quirks
3. Undefined behavior → Open Question — **do not invent**

## Forbidden without ADR

Global paywall middleware · sibling leaderboards · star IAP · fourth coach · Activation expansion

## PR requirement

User-facing changes cite POS sections satisfied.


================================================================================
FILE: .cursor/rules/020-design.mdc
================================================================================

---
description: Design & craft — POS 03, 03A, 03B, 00B. Premium not generic.
globs: public/**/*.{html,css,js},public/css/**
alwaysApply: false
---

# 020 — Design

**Owner docs:** `00B`, `03`, `03A`, `03B`, `00A`

## Bar

Nintendo · Apple · Pixar — **not** Bootstrap, Material, shadcn-default, SaaS admin.

## Tokens (03)

Gold `#F5A623` · Navy `#1B2340` · Lavender · `rounded-2xl` cards · gold CTA

## Art (03A)

Soft ink lines · living eyes · warm shadows · wood/nature materials · one accent per screen

## Motion (03B)

Use timing tokens: instant 80–120ms · fast 150–200ms · celebration ≤2000ms · `prefers-reduced-motion` required

## Audio (06A)

Silent by default · no autoplay on child launch

## Checks before UI ship

- [ ] 00B premium vs cheap lists
- [ ] 03A art checklist
- [ ] 03B motion tokens + skip path
- [ ] Swedish copy on user surfaces
- [ ] `npm run check:css` if Tailwind classes changed

## Forbidden

Tailwind CDN in HTML · enterprise tables on family home · emoji-as-final-brand forever


================================================================================
FILE: .cursor/rules/030-child-experience.mdc
================================================================================

---
description: Child UX — POS 04, 00A. Three worlds, one primary action, no forms.
globs: public/child-*.html,public/js/child-*.js,public/js/child/**/*
alwaysApply: false
---

# 030 — Child Experience

**Owner doc:** `product-operating-system/04_CHILD_EXPERIENCE.md`

## Feeling (00A)

Child: *"Det här är min värld."* — welcome home, not software.

## Worlds

**Idag** (routine) · **Min värld** (build/explore) · **Familj** (belonging)

## Rules C-01–C-08

- No forms except PIN login
- No schedule editing in child UI
- **One primary action** on Idag — next activity
- Celebrations ≤2s, skippable
- No sibling comparison · no paywalled pet
- PIN for parent exit · server enforces child scope

## Game link

World grows from real life — see `050-game-design.mdc`. Stars are fuel, not destination.

## Implementation

- Extend `child-*.js` modules — avoid monolith growth
- Mobile portrait, thumb, 44pt targets
- Test: child-login + completion smoke on iOS/Android WebView

## Forbidden

Stats dashboard · loot boxes · forced world before routine · guilt streaks


================================================================================
FILE: .cursor/rules/040-parent-experience.mdc
================================================================================

---
description: Parent UX — POS 05, 00A. One coach, calm Hem, no analytics home.
globs: public/dashboard.html,public/js/dashboard*.js,public/js/journey-coach.js,public/js/home-*.js,public/js/planning*.js,public/onboarding.html,public/js/onboarding*.js
alwaysApply: false
---

# 040 — Parent Experience

**Owner doc:** `product-operating-system/05_PARENT_EXPERIENCE.md`

## Feeling (00A)

Parent: *"Det här hjälper oss."* — relief, one next step, trust.

## Hem

- **Single coach** — Journey-fed only (PA-01, PA-02)
- Action cards — not analytics
- No star chart on home (Target: weekly story only)
- Approvals = exception UI (PA-06)

## Rules PA-01–PA-10

Enforce all — see POS 05.

## Build vs run

Planning/library = build (08). Hem = run. **No build on Hem** (B-08).

## Forbidden

Triple coach mounts · enterprise DAU/funnel home · empty post-register dashboard · comparing children on stars

## PR extras

Coach/home changes: screenshot or recording + constitution spot-check.


================================================================================
FILE: .cursor/rules/050-game-design.mdc
================================================================================

---
description: Game design — POS 06, 07, 09. Play is reward; world grows from real life.
globs: public/js/child-dashboard*.js,public/js/child-*reward*.js,public/js/child-*pet*.js,public/js/child-skatt*.js,src/lib/universe-engine.js
alwaysApply: false
---

# 050 — Game Design

**Owner docs:** `06`, `07`, `09`, `03B`, `06A`

## North star

> Play is the reward. Reality is the goal. **World is the destination — stars are fuel.**

## Motivation stack

Layer 1 Reality → 2 Progress → 3 Identity → 4 Discovery. Layer 4 requires Layer 1.

## Rules G-01–G-08

No login rewards · no leaderboards · no loot boxes · celebration budget · server-side unlocks · no star IAP · no child educator gamification · mini-games need ADR

## Copy

*"Du klarade det!"* before star counts.

## Unlock philosophy (09)

Early rooms fast · pet mid-game · museum late · no paid skips · no client-only unlocks

## Forbidden

Daily login bonus · streak shame · casino psychology · 5s blocking animations on routine path


================================================================================
FILE: .cursor/rules/060-mobile-first.mdc
================================================================================

---
description: Mobile-first — 99% phone users. Portrait, thumb, 60fps, WebView QA.
alwaysApply: true
---

# 060 — Mobile First

**Owner docs:** POS `04`, `06A`, `15` device matrix

## Priority

99% use **phone, portrait, thumb**. Desktop is secondary.

## Targets

- **60 fps** on animations (transform/opacity only when possible)
- **Perceived interactive <200ms** on routine path (15)
- **Safe areas** — notches, home indicator
- **44pt minimum** touch on child controls

## Platforms (minimum test)

iPhone Safari + iOS WebView · Android Chrome + WebView · iPad layout not broken · PWA child read path

## Native (Capacitor)

- Remote WebView — web deploy updates UI
- `platform.js` for native bridges
- SW unregistered on native — network required; honest offline messaging
- Plugin/native changes → mobile QA gate (Q-05)

## Layout

- Design for **one hand** at 07:15
- No hover-only critical actions
- Avoid dense desktop-only patterns

## Performance on mobile

- No celebration blocking school exit
- Lazy-load non-critical world assets
- Test on **mid-range Android**, not only flagship


================================================================================
FILE: .cursor/rules/070-frontend.mdc
================================================================================

---
description: Frontend — public/ JS/CSS/HTML. Small modules, no CDN, IIFE pattern.
globs: public/**/*.js,public/**/*.html,public/css/**
alwaysApply: false
---

# 070 — Frontend

**Owner docs:** POS `03`–`03B`, `04`, `05` · also `large-files.mdc`

## Structure

- **IIFE modules** — minimal `window.*` exports
- **New feature → new small file** (e.g. `dashboard-cta.js` pattern)
- **Never** grow monoliths (`schedule.js`, `dashboard.js`, `child-dashboard.js`) — grep + chunk read only

## CSS

- `tailwind.build.css` only — **no Tailwind CDN** (DS-04)
- Run `npm run check:css` when classes change
- Bump `public/sw.js` CACHE_NAME when static assets change

## Patterns

- Share schedule logic via `schedule-core.js` — no duplicate business rules client-side
- Child event bus / universe invalidation patterns — preserve on completion
- Parent magic shell — `parent-magic-view` consistency

## Quality

- No duplicated DOM logic across dashboard/schedule
- Error toasts: human Swedish + status — not raw stack to users
- `prefers-reduced-motion` on all celebrations

## Forbidden

Inline business rules that belong on server · copying `public/v2/` without design review · new global handlers undocumented


================================================================================
FILE: .cursor/rules/080-backend.mdc
================================================================================

---
description: Backend — Express, middleware order, server-owned product logic.
globs: src/**/*.js,server.js,app.js
alwaysApply: false
---

# 080 — Backend

**Owner doc:** POS `10_TECH_ARCHITECTURE.md` · runtime: root `AGENTS.md`

## Principles (T-01–T-07)

- Business logic on **server** — UI is channel
- **One Journey authority** — no parallel product brains
- **Child cannot hit parent APIs** — enforce in middleware
- Parameterized SQL only · secrets in env
- Migrations idempotent · rollback-compatible one release

## Middleware order (security-critical)

Do not reorder without Architect review:

Resend webhook → JSON/cookies → session restore → optionalAuth → limiter → platform HTML → maintenance (IAP exempt) → `/api` CSRF → impersonation block → **child API block** → apiLimiter → routes

## Structure

- Routes in `src/routes/` — mount in `index.js` with order comments when sensitive
- Queries in `db/*.js` — avoid inline SQL in routes
- Authz via `src/middleware/authz.js` helpers

## Schedulers

Retention comms through **Journey Gate** only — no parallel email brains.

## Node

Use Node 20 per root `AGENTS.md`: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`

## Forbidden

Global subscription middleware · new coach API without Journey · Stripe revival without ADR


================================================================================
FILE: .cursor/rules/090-database.mdc
================================================================================

---
description: Database — migrations, db/* queries, monotonic stars, rollback gate.
globs: db/**/*.js,migrations/**/*.js,migrate.js
alwaysApply: false
---

# 090 — Database

**Owner docs:** POS `07`, `09`, `10`

## Rules

- **Parameterized queries only** (T-04)
- New queries → `db/*.js` modules
- Migrations: timestamp prefix · idempotent · **backward-compatible one deploy** (REL-02)
- Run `migration-rollback-gate.test.js` — must pass

## Domain invariants

- **Lifetime stars monotonic** (R-06) — never decrease
- Redemption spend **atomic** — `SELECT FOR UPDATE` pattern
- Child/parent scoping on all family data

## Changes

- Schema change PR: locking/downtime note + rollback plan
- No destructive migration without backup procedure in PR
- Index new foreign keys and hot filters

## Forbidden

Raw string concatenation SQL · business rules only in triggers without tests · breaking migration without ADR


================================================================================
FILE: .cursor/rules/100-api.mdc
================================================================================

---
description: API — routes, auth, child scope, validation, paywall components.
globs: src/routes/**/*.js,src/middleware/**/*.js
alwaysApply: false
---

# 100 — API

**Owner docs:** POS `10`, `04`, `05`, `07`, `14` ADR-005

## Route standards

- Validate input (Zod schemas)
- Auth middleware explicit per route
- Authz helpers — never ad-hoc ownership SQL
- Async errors via established error handler

## Child API

- **Deny-by-default** — allowlist in child-parent-api-block
- Child JWT routes under `/api/me/*` — mount order matters (child before catch-alls)
- Never expose parent CRUD to child token

## Paywall

- **`requireComponent()` per route** — no global paywall (ADR-005)
- 402/403 semantics consistent

## Product endpoints

- **One coach data source:** Journey context — do not add parallel "first success" authority
- Universe unlocks **server-side** only

## Documentation

New routes: comment mount order if sensitive · run `npm run dump:routes` when inventory needed

## Tests

| Change | Minimum |
|--------|---------|
| Auth | auth-integration |
| Child scope | child-access-integration |
| Journey | test:gate |
| Paywall | paywall-model-contract |


================================================================================
FILE: .cursor/rules/110-performance.mdc
================================================================================

---
description: Performance — 60fps, 200ms interactive, no blocking celebrations.
globs: public/js/**/*.js,public/css/**,src/**/*.js
alwaysApply: false
---

# 110 — Performance

**Owner docs:** POS `03B`, `15`

## Targets

- **60 fps** animations — prefer transform/opacity
- **<200ms perceived** interactive on routine path (15)
- **Celebration ≤2s** — never block next activity (MO-01, MO-04)
- Low-end **Android mid-range** is reference device

## Frontend

- No layout thrash — batch DOM reads/writes
- Debounce expensive handlers on scroll/resize
- Split large JS — do not parse 2500-line files on every page if avoidable
- Images: appropriate size · lazy below fold in world

## Backend

- Avoid N+1 queries — use joins/batch in `db/*`
- Index hot paths · explain analyze on suspicious slowness
- Rate limits protect DB — do not disable to "fix" slowness

## Measurement

Note before/after for hot path changes in PR.

## Forbidden

Infinite animations on home · synchronous heavy work on completion tap · unbounded polling


================================================================================
FILE: .cursor/rules/120-security.mdc
================================================================================

---
description: Security — child scope, PIN, CSRF, secrets, trust UX.
globs: src/middleware/**/*.js,src/routes/auth/**/*.js,src/routes/**/*.js
alwaysApply: false
---

# 120 — Security

**Owner docs:** POS `00`, `04`, `10`, `15` Section C

## Non-negotiables

- **Child deny-by-default** on APIs — server enforced
- **PIN gate** child→parent when PIN set
- **CSRF** on state-changing parent `/api` routes
- **Secrets in env only** — never commit keys/URLs
- **Parameterized SQL** — no injection

## Auth

- JWT scope matches role (parent vs child)
- Authz centralized — no duplicate `childAccess` patterns
- Impersonation write-block for admin

## Data

- Minimize child PII in client logs
- GDPR-minded — no dark patterns for consent
- Account deletion flows tested when touched

## Client

- Never rely on client-only permission checks
- No secrets in `public/` JS

## Tests

Auth or child-scope changes → **auth-integration** + **child-access-integration** (Q-06)

## Escalate

New data collection · third-party SDK · payment changes → user + ADR


================================================================================
FILE: .cursor/rules/130-testing.mdc
================================================================================

---
description: Testing — test:gate required, constitution test on UX, no live email keys.
alwaysApply: true
---

# 130 — Testing

**Owner docs:** POS `12`, `15` · runtime: root `AGENTS.md`

## Required before merge

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
```

Unset email API keys for tests per root `AGENTS.md` (env unset email key vars).

## Layers

0. Lint + CSS check  
1. **test:gate** (CI required)  
2. Full `npm test` optional pre-release  
3. Mobile smoke when native-affecting  
4. Manual constitution test on UX (15 Section A)

## When to add tests

Touching paywall · Journey Gate · universe rules · IAP → add/extend tests in same PR.

## UX regression triggers (full constitution test)

Parent home/coach · child completion · rewards · onboarding · push/email · paywall

## Forbidden

Merge with failing gate · `npm test` on live VPS with real email keys · skip mobile QA for Capacitor plugins

## DB tests

Serialize via advisory lock — do not parallelize conflicting DB integration files.


================================================================================
FILE: .cursor/rules/140-code-review.mdc
================================================================================

---
description: Code review checklist — senior bar, POS compliance, no debt introduction.
alwaysApply: false
---

# 140 — Code Review

Every author **and** agent acts as reviewer before commit.

## Product (POS)

- [ ] Constitution Rules 1–5 on affected flows
- [ ] 00A manifesto / 00B taste — not cheap list
- [ ] Cited POS rule IDs in PR description
- [ ] No invented product behavior (Open Question if unclear)

## Code quality

- [ ] Simpler than before — not more complex
- [ ] No duplicated logic
- [ ] No magic numbers — named constants
- [ ] No TODO/FIXME left behind
- [ ] No dead code · no temp hacks
- [ ] Errors logged server-side; calm UX client-side

## Security & data

- [ ] Authz correct for parent/child/pedagog
- [ ] No secrets in diff
- [ ] Migrations safe + rollback considered

## Frontend

- [ ] Mobile portrait OK
- [ ] Reduced motion path
- [ ] SW bumped if static changed

## Block merge if

Anti-ship list (15) · gate red · POS violation · unexplained scope creep

## Reviewer stance

Principal Engineer: would I maintain this in 3 years?


================================================================================
FILE: .cursor/rules/150-release.mdc
================================================================================

---
description: Release — CI, migrate, SW bump, health check, flag rollout.
globs: .github/workflows/**,public/sw.js,scripts/css-build.mjs
alwaysApply: false
---

# 150 — Release

**Owner docs:** POS `13`, `12`, `15` · deploy: root `AGENTS.md`, VPS deploy rule in `.cursor/rules/`

## Pipeline

PR → CI (lint, css, migrate, test:gate, rollback gate) → merge main → deploy → health

## Pre-merge

- [ ] CI green locally if server touched
- [ ] `npm run check:css` if Tailwind touched
- [ ] SW `CACHE_NAME` bumped if static JS/CSS changed
- [ ] [15_PRODUCT_QUALITY_STANDARD.md](../product-operating-system/15_PRODUCT_QUALITY_STANDARD.md) pass
- [ ] ADR if architectural

## Post-deploy

- [ ] `GET /health` healthy
- [ ] Login smoke parent + child
- [ ] Logs normal 5 min
- [ ] TestFlight if native binary changed

## Rules REL-01–REL-09

See POS 13 — no direct main push without CI · backward-compatible migrations · flag rollout runbook

## Rollback

Revert on main → pipeline redeploys. Irreversible migration → DB restore procedure. Flag off for flag incidents.

## Native

Web deploy updates Capacitor UI. Store binary only when plugins/permissions change.

## Forbidden

Deploy without migrate · enable Journey flags without retiring duplicate coaches · uncommitted VPS edits


================================================================================
FILE: .cursor/rules/160-documentation.mdc
================================================================================

---
description: Documentation — when to update POS vs ADR vs code comments only.
alwaysApply: false
---

# 160 — Documentation

## Authority (do not confuse)

| Doc | Purpose | Who updates |
|-----|---------|-------------|
| `product-operating-system/` | Product truth | CEO/CPO + ADR — **agents rarely change** |
| `.ai/` | AI organization | AI Systems Architect + CTO |
| `.cursor/rules/` | Agent enforcement | Same as AOS |
| Root `AGENTS.md` | Runtime/Cloud VM | Ops |
| `SYSTEM_ANALYSIS.md` | Codebase snapshot | Periodic audit — not per feature |
| `CLAUDE.md` / `docs/*` | Legacy reference | Do not treat as normative |

## When to append ADR (POS 14)

- New product authority · payment path · child data class · permanent architecture fork
- NOT for: bugfixes, refactors, visual polish aligned with existing POS

## PR documentation

User-facing PRs must include:

- POS sections satisfied
- Self-review summary (180)
- Test commands run
- Screenshots for coach/home/child UI

## Code comments

Only non-obvious business logic — not narration of what code does.

## Forbidden

Duplicating POS content in `.cursor/rules/` — **reference**, don't copy  
Updating POS for every code change  
Stale Open Questions without owner


================================================================================
FILE: .cursor/rules/170-git-workflow.mdc
================================================================================

---
description: Git workflow — branches, commits, PR checklist, hotfix, rollback.
alwaysApply: true
---

# 170 — Git Workflow

## Branch strategy

- **`main`** — release branch (live deploy)
- **Feature:** `cursor/<descriptive-name>-5889` or team convention
- One logical change per branch when possible
- Do not push broken gate to main

## Commit messages

Complete sentences. User-facing changes cite POS rules.

```
fix(child): skip celebration when reduced-motion (MO-03, 03B)

- Honor prefers-reduced-motion on milestone confetti
- POS: 04 C-04, 15 Section B
```

## Pull request checklist

- [ ] POS sections cited
- [ ] test:gate green (130)
- [ ] Self-review (180) completed
- [ ] Definition of Done (190)
- [ ] Screenshots if UI/coach/home/child
- [ ] ADR linked if architectural

## Review checklist

See `140-code-review.mdc` + `15` quality standard.

## Hotfix

Minimal fix aligned with POS → same CI pipeline → prefer revert-forward if unsure.

## Rollback

Git revert on main → auto deploy. DB: follow REL rollback in POS 13. Feature flags off first for flag-related incidents.

## Push

`git push -u origin <branch>` — retry on network with backoff.

## Forbidden

Force-push main · commit secrets · large unrelated refactors mixed with hotfix · skip CI


================================================================================
FILE: .cursor/rules/180-self-review.mdc
================================================================================

---
description: Mandatory multi-role self-review before task complete. Fix all issues found.
alwaysApply: true
---

# 180 — Self Review

**Run after implementation, before marking task complete.** Fix every issue — do not defer.

## Review hats (all required)

### Principal Engineer
- Simpler than before? · No duplication? · No magic numbers/TODO/hacks/dead code?
- Would I maintain this in 3 years?
- Tests adequate for risk?

### Staff Mobile Engineer
- Portrait thumb OK? · 44pt child targets? · WebView tested?
- 60fps? · Celebration doesn't block routine?
- Safe areas respected?

### Chief Product Officer
- Constitution 1–5? · One next step on Hem? · Child protagonist?
- Reality before celebration? · No dashboard anti-patterns?

### UX Director
- 00A morning stress test? · Calm parent · Obvious child action?
- Swedish tone? · No surprise modals?

### Game Director
- World as reward, stars as fuel? · G-01–G-08?
- Celebration ≤2s skippable? · No grind/FOMO?

### QA Director
- test:gate green? · Constitution test if UX?
- Anti-ship list (15) clear?

### Security Engineer
- Child scope server-enforced? · No secrets in client?
- Auth changes tested?

### AI Systems Architect
- POS sections cited? · Correct rules applied?
- No POS duplication in code comments? · AOS workflow followed?

## Output

In PR or task summary, include:

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game ✓ QA ✓ Security ✓ AISA ✓
Issues found and fixed: [list or "none"]
POS governed by: [doc sections]
```

## If any hat fails

Fix before complete. Do not ship with known POS or quality violations.


================================================================================
FILE: .cursor/rules/190-definition-of-done.mdc
================================================================================

---
description: Definition of Done — no task complete until ALL criteria met.
alwaysApply: true
---

# 190 — Definition of Done

A task is **not complete** until every item below is true.

## Tests & automation

- [ ] `npm run test:gate` green (130) for server/auth/journey changes
- [ ] `npm run check:css` if Tailwind/static classes changed
- [ ] New behavior has tests when touching paywall/auth/universe/IAP gaps

## Code quality

- [ ] No duplicated logic
- [ ] No unnecessary complexity — **easier to understand than before**
- [ ] No TODO · FIXME · temporary hacks · dead code
- [ ] No magic numbers without named constants

## Product (POS)

- [ ] No Product Operating System violations
- [ ] POS sections cited in commit/PR for user-facing work
- [ ] [15_PRODUCT_QUALITY_STANDARD.md](../product-operating-system/15_PRODUCT_QUALITY_STANDARD.md) applicable sections pass

## Cursor rules

- [ ] No violations of applicable `.cursor/rules/*.mdc`
- [ ] `180-self-review.mdc` completed for all eight roles

## UX & craft

- [ ] No obvious UX issues on mobile portrait
- [ ] No accessibility regressions (contrast, touch, reduced motion)
- [ ] Not on 00B "cheap" list — feels premium/handcrafted

## Performance & security

- [ ] No performance regressions on routine path
- [ ] No security regressions (child scope, secrets)

## Process

- [ ] Self-review documented
- [ ] ADR appended if architectural (160)
- [ ] SW bumped if static assets changed (150)

## Philosophy check

| Question | Required answer |
|----------|-----------------|
| Does this help real mornings? | Yes |
| Would Nintendo respect the child player? | Yes |
| Would a stressed parent feel calmer? | Yes or N/A (backend-only) |
| Is the world the reward, not the points? | Yes or N/A |

If any checkbox fails → **not done**. Continue cycle: fix → test → review.
