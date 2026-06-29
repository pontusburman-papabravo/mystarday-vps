
**Never:** copyrighted pop, aggressive EDM, childish “wacky” cartoon sfx wall.

---

## Haptics as Audio Sibling

When sound is off, haptics may carry **confirm** only — see 03B. Never replace silence with vibration spam.

---

## Layering with Motion

| Visual | Audio |
|--------|-------|
| Checkmark | Success sting at 120 ms |
| Confetti | Chime at peak — or silent if reduced motion |
| Room door open | Unlock motif + optional creak (soft) |

Sync tolerance: ±50 ms.

---

## Settings & Respect

- **Master mute** respects system silent mode always
- **Child profile:** sounds off by default until parent enables
- **Night mode (future):** auto-mute after configurable hour
- **Accessibility:** full mute must not break completion feedback — visual mandatory

---

## Anti-Patterns

- Reward sounds louder than speech in room
- Streak loss buzzer
- Voice assistant speaking unprompted
- Ads with sound (N/A — never ads in child UI)

---

## Rules Summary

**AU-02** Visual feedback required without sound.  
**AU-03** One sound per event — no stacking.  
**AU-04** Sounds designed for phone speaker at arm’s length — not headphones blast.  
**AU-05** New sounds need Creative Director approval + asset registry.

---

## Release Criteria

- [ ] Tested with system mute on iOS/Android
- [ ] Default-off verified for child
- [ ] No autoplay on launch
- [ ] [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) audio section pass

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [03B_MOTION_SYSTEM.md](./03B_MOTION_SYSTEM.md) | Sync |
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Celebration |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Contexts |

---

## AI Instructions

1. Do not add sound without AU rules check.
2. Default new features to silent.
3. Pair every sound with visual; never sound-only critical info.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Silence protects brand in homes |
| **CPO** | 10/10 | Default-off respects parents |
| **CTO** | 10/10 | System mute respect required |
| **Principal Engineer** | 10/10 | Asset registry noted |
| **Game Director** | 10/10 | Organic palette fits Nintendo ethic |
| **UX Director** | 10/10 | Surprise rule AU-01 |
| **Art Director** | 10/10 | Timbre matches visual wood/warmth |
| **QA Director** | 10/10 | Device mute in checklist |
| **Security** | 10/10 | N/A |
| **AI Systems Architect** | 10/10 | AU rules citable |

**Approved:** All roles — v2.0.


================================================================================
FILE: product-operating-system/07_REWARD_SYSTEM.md
================================================================================

# 07 — Reward System

**Version:** 2.0  
**Owner:** CPO + Game Director  
**Authority:** Reality wins

---

## Purpose

Stars and Skattkammaren **bridge** real accomplishment to real family treats — not a virtual economy for its own sake.

---

## North Star

> **The treat in real life is the reward. The app is the bridge.**

Parents define **real treats**: filmkväll, extra saga, utflykt — not infinite gems.

---

## Concepts

| Term | Meaning |
|------|---------|
| **Star** | Acknowledgment of effort — diagnostic, not mission |
| **Balance** | Earned minus approved redemptions |
| **Lifetime stars** | Monotonic engagement signal for world unlocks |
| **Redemption** | Request → optional parent approve → **offline treat happens** |

---

## Rules

**R-01** Stars only on verified completion  
**R-02** Stars not purchasable  
**R-03** Redemption atomic — no double spend  
**R-04** Deny with calm child copy  
**R-05** No star trading between children (unless ADR)  
**R-06** Lifetime stars never decrease  
**R-07** Default rewards achievable ~1 week normal use  
**R-08** Virtual rewards must copy-link to real celebration

---

## Flow

Complete activities → balance rises → child picks reward in world → parent approves if required → **family does the thing offline**

Digital must never replace the real treat.

---

## Copy

De-emphasize counts; emphasize **what child achieved** and **what treat means**.

---

## Anti-Patterns

Sibling leaderboard · login multipliers · punishment deductions · pay-to-win stars

---

## Release Criteria

R-01–R-08; child + parent surfaces tested; [15](./15_PRODUCT_QUALITY_STANDARD.md).

---

## AI Instructions

Never star IAP. New currency → CEO + ADR.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/08_BUILD_SYSTEM.md
================================================================================

# 08 — Build System

**Version:** 2.0  
**Owner:** CPO  
**Authority:** Parents construct routines; product runs them ([05](./05_PARENT_EXPERIENCE.md))

---

## Purpose

How families **create** routines, activities, rewards, and visuals — once — then Journey leads daily life. Not a separate "Build Mode" product; **Bibliotek + planering** is the build system.

---

## North Star

**Build once, run forever.** Minimize configuration debt (P-06). First Success ≤3 meaningful build decisions.

---

## Build vs Run

| Mode | Mindset | Feeling |
|------|---------|---------|
| **Build** (Planering) | Setup, templates, images | "We shape our week" |
| **Run** (Hem / child) | Execute, approve, celebrate | "Today flows" |

Never build on Hem (B-08).

---

## Capabilities

- Activity library — visual-first (bildschema positioning)
- Schedule composition — drag/drop for **parents only**
- Reward definitions — real treats
- Image upload + crop — personality on cards
- Template import — smart defaults before blank slate
- Bounded AI suggest — parent always approves

---

## Rules

**B-01** New field must justify debt  
**B-02** Offer templates before empty create  
**B-03** Drag schedule = parent only  
**B-04** Destructive delete confirms; support "just this day" exceptions  
**B-05** Pedagog role respects authz boundaries  
**B-06** Build changes reflect on child Today quickly  
**B-07** No monolithic editor UX — modular over time  
**B-08** No build actions on Hem

---

## Anti-Patterns

Blank slate after signup · 12-field create forms · duplicate schedule logic diverging · config-first onboarding

---

## Release Criteria

Onboarding path tested with seeded templates; B-01–B-08; child sees updates.

---

## AI Instructions

Do not invent parallel "build mode" routes. Minimize required fields.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/09_WORLD_ENGINE.md
================================================================================

# 09 — World Engine

**Version:** 2.0  
**Owner:** Game Director + Art Director  
**Authority:** Play as reward ([06](./06_GAME_DESIGN.md))

---

## Purpose

The child's **persistent world** evolves because **real life** changed — pet, rooms, themes, collectibles.

---

## North Star

> **The world changes because life changed — not because the child grinded logins.**

---

## Fiction

| Space | Child fantasy |
|-------|---------------|
| **Treasury** | My earned treasures |
| **Dreams** | What I'm working toward |
| **Treat shop** | Redeem real rewards |
| **Pet** | Companion who grows with me |
| **Museum** | Memories of wins — late game |

Swedish warm copy — never competitive.

---

## Unlock Philosophy

| Horizon | Examples |
|---------|----------|
| **Early** | First completions → chest, dreams |
| **Mid** | Sustained routine → pet, avatar depth |
| **Late** | Long arc → museum, premium themes |

Thresholds tunable by cohort — must stay **achievable without grind**. Server-authoritative; no client-only unlocks.

---

## Themes

Castle · treehouse · space — **cosmetic only**, no gameplay advantage.

---

## Rules

**W-01** Unlocks map to real behavior types (completion, redemption, streak gentle)  
**W-02** Pet = sustained engagement — not day one  
**W-03** No paid room skips  
**W-04** Offline read OK; server wins sync conflict  
**W-05** Discovery subtle — enter world after progress, not notification spam

---

## Anti-Patterns

Login rewards for pet · IAP stars for rooms · shame for incomplete routine · client-only unlock

---

## Release Criteria

W-01–W-05; renders on mobile WebViews; [03A](./03A_ART_DIRECTION.md) room fantasy.

---

## AI Instructions

All unlock logic server-side. Threshold changes → Game Director + ADR.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/10_TECH_ARCHITECTURE.md
================================================================================

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


================================================================================
FILE: product-operating-system/11_AI_DEVELOPER_GUIDE.md
================================================================================

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


================================================================================
FILE: product-operating-system/12_QA_SYSTEM.md
================================================================================

# 12 — QA System

**Version:** 2.0  
**Owner:** QA Director  
**Authority:** Verifies [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md)

---

## Purpose

Quality verification before families see change — automated + human constitution test.

---

## Layers

```
4 Manual — Constitution + taste review ([15](./15_PRODUCT_QUALITY_STANDARD.md))
3 Mobile smoke — native WebView protocol
2 Full suite — pre-release optional
1 CI gate — required merge ([AGENTS.md](../AGENTS.md))
0 Lint + CSS/build checks
```

---

## Rules

**Q-01** Gate green before main  
**Q-02** User-facing PR notes manual flows  
**Q-03** Child changes → child completion smoke  
**Q-04** Coach changes → Hem screenshot/recording  
**Q-05** Native plugin → mobile gate  
**Q-06** Auth changes → integration tests  
**Q-07** Migrations → rollback test  
**Q-08** No live email keys in tests  
**Q-09** Apple Sign-In native → verify patch script when applicable  
**Q-10** Flag rollout → ops runbook check

---

## Constitution Test (UX releases)

| Rule | Test |
|------|------|
| 1 | One next step on Hem |
| 2 | No surprise modals |
| 3 | No empty Hem |
| 4 | Progress confirmed after onboarding action |
| 5 | Post-register feels complete |

---

## Known Gaps (expand gate over time)

Paywall contract · Journey Gate comms · universe rules · IAP webhook — add tests when touched.

---

## Anti-Patterns

Merge failing gate · test on live DB with real email · skip mobile for Capacitor changes

---

## Release Criteria

Document updates when gate composition changes + ADR.

---

## AI Instructions

Run gate after server changes; propose tests when touching gaps.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/13_RELEASE_PROCESS.md
================================================================================

# 13 — Release Process

**Version:** 2.0  
**Owner:** CTO + QA Director  
**Authority:** Safe path to families

---

## Purpose

Merge → CI → deploy → verify. Native binaries when plugins/permissions change.

---

## Pipeline (conceptual)

```
PR → CI (lint, css, migrate, test gate, migration rollback)
Merge main → deploy → migrate → restart → health check
Capacitor UI updates with web deploy; store binary when native changes
```

Detail: `AGENTS.md`, deploy workflows — operational, not product.

---

## Rules

**REL-01** No merge without CI  
**REL-02** Backward-compatible migrations one release  
**REL-03** Cache bust static assets on change  
**REL-04** Journey flag waves follow ops runbook  
**REL-05** Native plugin → mobile QA  
**REL-06** Email-heavy tests without live keys  
**REL-07** Post-deploy health + log spot check  
**REL-08** UX releases → constitution test ([12](./12_QA_SYSTEM.md))  
**REL-09** Must pass [15](./15_PRODUCT_QUALITY_STANDARD.md)

---

## Rollback

Revert on main → pipeline redeploys. Irreversible migration → DB restore procedure. Flag off for flag incidents.

---

## Checklists

**Pre-merge:** CI green · gate local if server · migration reviewed · quality standard · ADR if needed

**Post-deploy:** health · login smoke · flags as intended · logs clean · TestFlight if binary changed

---

## Anti-Patterns

Deploy without migrate · enable Journey without retiring duplicate coaches · uncommitted VPS edits

---

## AI Instructions

Prefer GitHub Actions deploy over manual SSH. Health check after restart per AGENTS.md.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/14_DECISION_LOG.md
================================================================================

# 14 — Decision Log

**Version:** 2.0  
**Owner:** CEO + CPO + CTO  
**Authority:** Append-only architectural record

---

## Purpose

**Why** decisions were made — so teams and AI do not re-litigate. Product philosophy lives in 00–15; this file records **forks in the road**.

## Format

| Field | Content |
|-------|---------|
| **ID** | ADR-NNN |
| **Date** | ISO |
| **Status** | Accepted / Superseded / Proposed |
| **Decision** | What |
| **Motivation** | Why |
| **Consequences** | Actions |
| **Links** | POS docs |

---

## ADR-001 — Family Journey as sole product authority

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** One lifecycle brain (**Journey**) and one outbound brain (**Gate**) for "what's next" and communications.

**Motivation:** Overlapping coach systems confuse users and agents. Completions beat logins.

**Consequences:** Retire duplicate coaches; wire comms to Gate; no new coach surfaces (PA-01).

**Links:** [00](./00_PROJECT_CONSTITUTION.md), [05](./05_PARENT_EXPERIENCE.md)

---

## ADR-002 — Reality wins over gamification

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** Stars, streaks, unlocks are proxies for real routine success — not goals.

**Links:** [01](./01_PRODUCT_VISION.md), [06](./06_GAME_DESIGN.md), [07](./07_REWARD_SYSTEM.md)

---

## ADR-003 — Child protagonist, parent helper

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** Primary loop = child action; parent supports.

**Links:** [04](./04_CHILD_EXPERIENCE.md), [05](./05_PARENT_EXPERIENCE.md)

---

## ADR-004 — Build System = Bibliotek + Planering

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** No separate "Build Mode" product name/route — build lives in library + planning.

**Links:** [08](./08_BUILD_SYSTEM.md)

---

## ADR-005 — Per-component paywall

**Date:** 2026-06-23 · **Status:** Accepted

**Decision:** Gate features via components — no global subscription middleware.

**Links:** [10](./10_TECH_ARCHITECTURE.md)

---

## ADR-006 — Store IAP only (no web checkout)

**Date:** 2026-06-23 · **Status:** Accepted

**Decision:** Native billing via store + RevenueCat; Stripe removed.

**Consequences:** Web monetization gap — OQ-001.

**Links:** [01](./01_PRODUCT_VISION.md), [10](./10_TECH_ARCHITECTURE.md)

---

## ADR-007 — Remote native shell

**Date:** Pre-POS · **Status:** Accepted

**Decision:** Native apps load live web UI — one UI codebase; binary for store/plugins.

**Links:** [10](./10_TECH_ARCHITECTURE.md), [04](./04_CHILD_EXPERIENCE.md)

---

## ADR-008 — POS supersedes legacy docs

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** `/product-operating-system/` normative over `docs/*`, `CLAUDE.md`. `SYSTEM_ANALYSIS.md` = historical evidence only.

**Links:** [00](./00_PROJECT_CONSTITUTION.md), [11](./11_AI_DEVELOPER_GUIDE.md)

---

## ADR-009 — Win-back v1 deprecated

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** Do not re-enable legacy win-back; re-engage via Gate with evidence.

**Links:** [05](./05_PARENT_EXPERIENCE.md)

---

## ADR-010 — Activation Program sunset

**Date:** 2026-06-29 · **Status:** Accepted (planned)

**Decision:** Sunset parallel 7-day program when Journey phase parity reached — one retention brain.

**Links:** [01](./01_PRODUCT_VISION.md)

---

## ADR-011 — POS v2: vision-first, code-agnostic

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** Product Operating System v2 describes **ten-year product truth**, not current codebase layout. When code and POS conflict, **rewrite code**. Remove Current/Target implementation tables from normative docs.

**Motivation:** POS must steer 80% rewrites and EU scale; code-centric docs expire in months.

**Consequences:** Agents read 00/00A/00B + domain doc; SYSTEM_ANALYSIS demoted; quality bar in doc 15.

**Links:** [00](./00_PROJECT_CONSTITUTION.md), [11](./11_AI_DEVELOPER_GUIDE.md), [15](./15_PRODUCT_QUALITY_STANDARD.md)

---

## ADR-012 — Experience Manifesto as design supreme court

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md) is primary inspiration for designers and UX review — equal to taste doc for sensory calls.

**Links:** [00A](./00A_EXPERIENCE_MANIFESTO.md), [03A](./03A_ART_DIRECTION.md)

---

## ADR-013 — Product Quality Standard blocks release

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) is mandatory gate — QA may block regardless of sprint.

**Links:** [15](./15_PRODUCT_QUALITY_STANDARD.md), [12](./12_QA_SYSTEM.md), [13](./13_RELEASE_PROCESS.md)

---

## Open Questions

| ID | Question | Owner |
|----|----------|-------|
| **OQ-001** | Web monetization post-founder limit? | CEO |
| **OQ-002** | Journey prod wave 1 timing? | CPO |
| **OQ-003** | Retire Product Engine entirely? | CTO |
| **OQ-004** | Adaptive universe thresholds by age? | Game Director |
| **OQ-005** | Multi-instance / Redis threshold? | CTO |
| **OQ-006** | Onboarding vs engine state conflict? | CPO |

---

## Superseded

| Item | By |
|------|-----|
| POS v1 code-centric tables | ADR-011 |
| `docs/PRODUCT-CONSTITUTION.md` alone | POS 00 |
| Global paywall middleware | ADR-005 |
| Stripe | ADR-006 |

---

## How to Add

1. Draft ADR-NNN in PR  
