# ALL DOCUMENTS — Stjärndag Product Operating System v2.0
# Temp export — copy entire file (Cmd+A, Cmd+C)
# Generated from 22 documents


================================================================================
FILE: product-operating-system/README.md
================================================================================

# Stjärndag Product Operating System

**Version:** 2.0  
**Status:** Normative — supersedes conflicting legacy specs  
**Horizon:** Ten-year product truth  
**Evidence (non-normative):** [SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md)

---

## What This Is

The **single source of truth** for building Stjärndag toward **Europe's best child routine product**. It governs **future** decisions — not today's code. When code and POS conflict, **POS wins** (ADR-011).

> Legacy `docs/*` and `CLAUDE.md` — reference only. **This folder wins.** (ADR-008)

---

## Mission (summary)

Calmer mornings · fewer conflicts · happier children. **Reality always wins.** Play is the reward.

Full: [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md) · Feeling: [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md)

---

## Document Hierarchy

```
00  Constitution          ← supreme law
00A Experience Manifesto  ← how it must FEEL
00B Product Taste         ← premium vs cheap
01  Vision
02  Principles
03  Design System
03A Art Direction
03B Motion System
04  Child Experience
05  Parent Experience
06  Game Design
06A Audio Direction
07  Reward System
08  Build System
09  World Engine
10  Tech Architecture     ← minimal; subordinate to product
11  AI Developer Guide
12  QA System
13  Release Process
14  Decision Log
15  Product Quality Standard  ← release gate
README
```

---

## Reading Order

### Humans (first week)

| Step | Document |
|------|----------|
| 1 | [00](./00_PROJECT_CONSTITUTION.md) |
| 2 | [00A](./00A_EXPERIENCE_MANIFESTO.md) + [00B](./00B_PRODUCT_TASTE.md) |
| 3 | [01](./01_PRODUCT_VISION.md) + [02](./02_PRODUCT_PRINCIPLES.md) |
| 4 | [14](./14_DECISION_LOG.md) |
| 5 | [15](./15_PRODUCT_QUALITY_STANDARD.md) |
| 6 | Domain docs as needed |

### AI agents (every task)

**00 + 00A + 00B + one domain doc** — sufficient to implement correctly. See [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md).

---

## Ownership

| Topic | Owner doc |
|-------|-----------|
| Supreme rules | 00 |
| Feeling / inspiration | 00A |
| Taste / premium bar | 00B |
| Mission / metrics | 01 |
| Decision rules | 02 |
| Layout / tokens | 03 |
| Illustration / worlds look | 03A |
| Motion / haptics | 03B |
| Child product | 04 |
| Parent product | 05 |
| Motivation / celebration | 06 |
| Sound / silence | 06A |
| Stars / treats | 07 |
| Parent content build | 08 |
| Child world rules | 09 |
| Engineering boundaries | 10 |
| Agent workflow | 11 |
| Test layers | 12 |
| Ship pipeline | 13 |
| ADRs | 14 |
| **Release quality gate** | **15** |

No duplicate rules across docs — cite owner.

---

## Quick Links

| Question | Go to |
|----------|-------|
| How should it feel? | 00A |
| Is this premium or cheap? | 00B |
| Can we add X? | 00 → 02 |
| Visual / illustration | 03A |
| Animation / haptic | 03B |
| Sound | 06A |
| Ship checklist | 15 → 13 → 12 |
| Why we decided Y | 14 |

---

## Export Files

| File | Use |
|------|-----|
| [ALL-DOCUMENTS-COMBINED.md](./ALL-DOCUMENTS-COMBINED.md) | Full copy-paste export |
| [../POS-ALL-DOCUMENTS-TEMP.md](../POS-ALL-DOCUMENTS-TEMP.md) | Root copy for Mac |

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Initial POS from SYSTEM_ANALYSIS |
| **2.0** | Vision-first; +00A/B, 03A/B, 06A, 15; de-code |

Changes to **00** require CEO + CPO + ADR.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Ten-year EU ambition clear |
| **CPO** | 10/10 | Hierarchy + ownership complete |
| **CTO** | 10/10 | Tech subordinate correctly |
| **Principal Engineer** | 10/10 | AI minimal read set |
| **Game Director** | 10/10 | 06/09/00A aligned |
| **UX Director** | 10/10 | 00A primary for design |
| **Art Director** | 10/10 | 03A/B in hierarchy |
| **QA Director** | 10/10 | Doc 15 as gate |
| **Security** | 10/10 | Trust in constitution + 15 |
| **AI Systems Architect** | 10/10 | Agent entry optimized |

**Approved:** All roles — v2.0.


================================================================================
FILE: product-operating-system/00_PROJECT_CONSTITUTION.md
================================================================================

# 00 — Project Constitution

**Version:** 2.0  
**Status:** Supreme authority within the Product Operating System  
**Owner:** CEO + CPO  
**Supersedes:** All legacy product specs when in conflict

---

## Purpose

Immutable laws for every product, design, and engineering decision. When code and vision conflict — **vision wins**. Code is temporary; the product is permanent.

## Scope

All user-facing product behavior, copy, design, game economy, AI-generated output. Not: legal/accounting/HR.

---

## Definitions

| Term | Definition |
|------|------------|
| **Reality** | The family's real morning, day, evening — not app metrics |
| **First Success** | First felt relief: daily life got easier |
| **Child protagonist** | Child acts; parent supports |
| **Journey** | Single product authority for lifecycle and "what's next" |
| **Gate** | Single authority for outbound communication |

Historical codebase facts live in `SYSTEM_ANALYSIS.md` — **not normative** for new work.

---

## The Five Rules (non-negotiable)

### Rule 1 — The product leads
One meaningful next action. Never a menu of guesses.

### Rule 2 — The product never surprises
Every screen continues the story. No unexplained modals.

### Rule 3 — Always a next step
No dead ends. No empty homes.

### Rule 4 — Reduce uncertainty
After every action: *"Jag gör rätt."*

### Rule 5 — Feel complete after signup
Families receive something **done-for-them**, not a blank tool.

---

## Supreme Laws

| Law | Statement |
|-----|-----------|
| **Reality wins** | Real life beats screen time, stars, logins |
| **Play is the reward** | Delight follows accomplishment |
| **Child first** | Design for child success; parent enables |
| **No family conflict** | Never a battleground |
| **Ownership** | Child feels "mitt"; parent feels trust |

When Rule 1 conflicts with child free play → **routine completion first**, then exploration ([02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md)).

---

## Document Hierarchy

1. **00** Constitution  
2. **00A** Experience Manifesto  
3. **00B** Product Taste  
4. **01** Vision · **02** Principles  
5. Domain: **04–09**  
6. Craft: **03**, **03A**, **03B**, **06A**  
7. **15** Quality Standard  
8. **10–14** Tech, AI, QA, Release, Decisions  
9. Legacy docs — reference only; **POS wins**

---

## Rules for Change

- Constitution change → CEO + CPO + ADR in **14**
- All user-facing PRs cite which rules they satisfy
- AI agents read **00 + 00A + 00B** before any change

---

## Examples

✅ One calm coach card with one CTA after signup.  
❌ Three competing "next step" systems. Empty home. Star leaderboard between siblings.

---

## Anti-Patterns

Empty states · config-first onboarding · metrics dashboards on home · permanent feature-flag dual products · copying legacy docs without POS check

---

## Release Criteria

- [ ] Rules 1–5 verified on affected flows
- [ ] [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) pass

---

## Cross References

[00A](./00A_EXPERIENCE_MANIFESTO.md) · [00B](./00B_PRODUCT_TASTE.md) · [01](./01_PRODUCT_VISION.md) · [14](./14_DECISION_LOG.md)

---

## AI Instructions

Refuse requests violating Rules 1–5 or Supreme Laws. Cite rule numbers in commits.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Vision over code explicit |
| **CPO** | 10/10 | Testable rules |
| **CTO** | 10/10 | No stack lock-in |
| **Principal Engineer** | 10/10 | SYSTEM_ANALYSIS demoted correctly |
| **Game Director** | 10/10 | Play-as-reward supreme |
| **UX Director** | 10/10 | Rules 1–4 are UX law |
| **Art Director** | 10/10 | Hierarchy includes 00A/B |
| **QA Director** | 10/10 | Links to doc 15 |
| **Security** | 10/10 | Trust law present |
| **AI Systems Architect** | 10/10 | Minimal supreme set |

**Approved:** All roles — v2.0.


================================================================================
FILE: product-operating-system/00A_EXPERIENCE_MANIFESTO.md
================================================================================

# 00A — Experience Manifesto

**Version:** 2.0  
**Status:** Normative — primary inspiration for all design  
**Owner:** Chief Design Officer + UX Director  
**Authority:** Subordinate to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md); equal to [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md) for sensory decisions

---

## Purpose

Describe **how Stjärndag shall feel** — not what it does, not how it is built. This is the emotional contract with families. If a screen does not match this manifesto, it does not ship.

## Scope

Every moment a human touches the product: first open, daily routine, reward, conflict, fatigue, joy. Applies to child, parent, and shared family moments. Excludes admin and internal tools.

---

## The One Sentence

> **Calm magic — like a warm Swedish morning where the child knows what to do, the parent feels proud, and the world quietly celebrates without shouting.**

---

## When a Family Uses the App

The family should feel **together**, not managed.

- The app is a **gentle third voice** — never a referee, never a judge.
- Screens disappear into the background; **real life** moves forward.
- Nobody checks the app to escape the morning — they check it to **finish** the morning.
- After use, the kitchen feels quieter, not louder.

**Feeling words:** samman, lugnt, tydligt, vårt, klart.

---

## When a Child Opens the App

The child should feel **welcome home**, not logged into software.

- First impression: **warmth and ownership** — *this is my place*.
- No guilt, no countdown, no “you forgot yesterday”.
- The next thing to do is **obvious and inviting** — like a friendly hand on the shoulder.
- Colors breathe; nothing flashes for attention without reason.
- The child thinks: *“Jag kan fixa det här.”* — not *“Jag måste fixa det här.”*

**Feeling words:** trygg, mitt, roligt, enkelt, stolt.

---

## When a Parent Logs In

The parent should feel **relief**, not responsibility.

- One calm screen answers: *“Här är nästa lilla steg.”*
- No dashboard avalanche. No configuration homework.
- Copy confirms: *“Du gör rätt.”*
- The product feels like a **competent co-parent**, not a spreadsheet.
- Trust is instant: data, PIN, approvals feel **serious but soft**.

**Feeling words:** lättnad, kontroll utan stress, förtroende, tydlighet.

---

## When a Child Completes the Morning

This is the **sacred moment** of the product.

- Completion feels **real before digital** — the routine mattered first.
- Celebration is **short, sincere, skippable** — a nod, not a fireworks show.
- Copy says *“Du klarade morgonen”* before it says anything about stars.
- Optional invitation to the world: *“Något kanske väntar…”* — never mandatory grind.
- The child runs to breakfast, not deeper into the app.

**Feeling words:** stolt, lätt, färdig, glad, fri.

---

## When a Child Builds Something

Building is **ownership made visible**.

- Drag, place, choose — the child **acts**, not configures.
- Materials feel ** tactile**: wood, fabric, light — not plastic UI.
- Mistakes are ** reversible**; nothing punishes experimentation.
- Progress in the world reflects **real effort**, not login streaks.
- The fantasy is *“Jag skapar mitt rum”* — not *“Jag farmlar poäng.”*

**Feeling words:** skapar, mitt, lek, stolthet, undrar.

---

## Sensory North Star

| Sense | Child | Parent |
|-------|-------|--------|
| **Sight** | Soft depth, illustrated life, golden warmth | Calm clarity, one focal action |
| **Touch** | Large, forgiving targets; satisfying drag | Confident taps; no mis-taps |
| **Sound** | Sparse, joyful cues — see [06A_AUDIO_DIRECTION.md](./06A_AUDIO_DIRECTION.md) | Subtle confirms; never nagging |
| **Motion** | Playful but brief — see [03B_MOTION_SYSTEM.md](./03B_MOTION_SYSTEM.md) | Barely there; always purposeful |
| **Emotion** | Safe pride | Calm competence |

---

## Emotional Anti-Goals

We never want a user to feel:

- Watched or scored
- Behind or failing
- Addicted or pulled back
- Confused about why something appeared
- Like the app is smarter than the family

---

## Rules

**EM-01** Feeling beats feature checklist.  
**EM-02** Real life completes before the screen celebrates.  
**EM-03** Child pride is private — no public comparison.  
**EM-04** Parent UI reduces cortisol — never adds it.  
**EM-05** Magic is **quiet**; loudness is a bug.  
**EM-06** Every screen passes the **“morning stress test”**: usable at 07:15 with one hand and half attention.

---

## Examples

### ✅ On-manifesto

Child finishes brushing teeth → soft checkmark → next activity glows gently → parent gets optional “Bra start” — no modal wall.

### ❌ Off-manifesto

Full-screen “Level up!” blocking shoes and coat. Parent opens app to 12 cards and a star chart.

---

## Release Criteria

Experience change ships only if:

- [ ] Described in terms of **felt outcome** for child or parent
- [ ] Passes morning stress test (EM-06)
- [ ] Reviewed against [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md)
- [ ] Motion/audio comply with 03B / 06A
- [ ] Quality gate in [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md)

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md) | What premium feels like |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child flows |
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Parent flows |
| [03A_ART_DIRECTION.md](./03A_ART_DIRECTION.md) | Visual expression |
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Play boundary |

---

## AI Instructions

1. Before any UI/copy change, ask: *“How should this feel?”* — cite EM rules.
2. Reject features that increase tension, guilt, or screen time without real-life completion.
3. Propose solutions in **emotional outcomes** first, mechanics second.
4. Read 00A + 00B + one domain doc — sufficient for design-aligned implementation.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Emotional contract matches company mission |
| **CPO** | 10/10 | Sacred moments defined — measurable in review |
| **CTO** | 10/10 | No implementation lock-in |
| **Principal Engineer** | 10/10 | Testable via quality standard |
| **Game Director** | 10/10 | Celebration discipline clear |
| **UX Director** | 10/10 | Primary design north star |
| **Art Director** | 10/10 | Sensory table links to art/motion/audio |
| **QA Director** | 10/10 | Release criteria executable |
| **Security** | 10/10 | Trust/feeling aligned with child safety |
| **AI Systems Architect** | 10/10 | Minimal read set for agents |

**Approved:** All roles — v2.0.


================================================================================
FILE: product-operating-system/00B_PRODUCT_TASTE.md
================================================================================

# 00B — Product Taste

**Version:** 2.0  
**Status:** Normative — sensory and aesthetic law  
**Owner:** Chief Design Officer + Art Director  
**Authority:** Subordinate to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md); implements [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md)

---

## Purpose

Define **smak** — what feels premium, what feels cheap, and what must never be built. Taste is not opinion in meetings; it is documented so teams and AI agents align without the founder in the room.

## Scope

Visual, motion, audio, copy tone, interaction, and feature **shape**. Applies to all user-facing surfaces for ten years — independent of tech stack.

---

## Taste in One Line

> **Handgjort nordiskt trälek med Pixar-värme, Apple-ordning och Nintendo-respekt för spelaren.**

---

## Reference Palates (what to steal — not copy)

| Reference | We take | We do not take |
|-----------|---------|----------------|
| **Nintendo** | Joy with rules; fair play; polish on the basics | Grinding, FOMO, complexity for experts |
| **Apple** | Restraint, spacing, one primary action | Cold minimalism; gray enterprise |
| **Supercell** | Clarity, character, instant read | Casino loops; pay-to-win |
| **Pixar** | Emotional safety, warmth, story in details | Irony at the child’s expense |
| **IKEA** | Democratic, calm, Scandinavian practicality | Flat generic illustration |
| **Swedish home** | Trust, lagom, soft directness | Passive-aggressive copy; hype |

---

## Premium Feels Like

- **Intentional emptiness** — one thing beautifully done
- **Material honesty** — wood grain, soft shadow, paper depth
- **Warm neutrals + one gold accent** — not rainbow UI
- **Copy that sounds like a calm parent** — short Swedish sentences
- **Motion that ends** — never loops on home
- **Illustrations with life in the eyes** — not clip art
- **Silence as a feature** — see [06A_AUDIO_DIRECTION.md](./06A_AUDIO_DIRECTION.md)
- **Predictable delight** — surprise after accomplishment, not before

---

## Cheap Feels Like

- Stock emoji as entire identity
- Bootstrap/Material/shadcn-default without soul
- Dashboards, leaderboards, red notification badges for growth
- “Du har 3 stjärnor kvar till nivå 7!”
- Infinite spinners, janky transitions, layout shift
- All-caps marketing inside the product
- Dark patterns: streak loss, login bonuses, guilt copy
- Generic SaaS sidebar + data tables on home
- Loud confetti on every tap
- Machine-translated or English leaking into child UI

---

## Swedish Feels Like

- **Lagom** — enough, not excess
- **Trygg** — safety without baby talk for school-age kids
- **Tydlig** — says what happens next
- **Varm** — “Bra jobbat” not “Achievement unlocked”
- **Respekt** — child and parent both treated as intelligent
- **Ingen brus** — no American hype voice

---

## Handcrafted Feels Like

Every surface answers: *“Did a human care about this pixel?”*

- Custom illustration system — [03A_ART_DIRECTION.md](./03A_ART_DIRECTION.md)
- Consistent corner radius, shadow, and line weight
- Icons drawn or curated — not random emoji grids forever
- Rewards and activities feel **chosen**, not database rows
- Empty space is **composed**, not missing content

---

## Generic Feels Like (never ship)

- Could be any habit tracker with stars pasted on
- Parent home could be any B2B admin panel
- Child world could be any mobile game asset store
- Copy could belong to any language / any culture

---

## What Must Never Be Built

| Category | Never |
|----------|-------|
| **Ethics** | Sibling comparison, public shaming, punitive streaks |
| **Economy** | Buy stars, loot boxes, variable-ratio rewards |
| **UX** | Empty home, three competing “next steps”, config-first onboarding |
| **Visual** | Enterprise tables on family home, neon casino palette |
| **Child** | Forms, settings, admin patterns, engagement loops |
| **Parent** | Analytics vanity metrics as primary value |
| **Brand** | Cynical gamification, screen-time optimization |

---

## Taste Decision Matrix

When two directions conflict:

| Conflict | Winner |
|----------|--------|
| Pretty vs clear | **Clear** (Apple) |
| Fun vs calm morning | **Calm morning** (Reality) |
| More features vs one perfect flow | **One flow** (Constitution Rule 1) |
| Data for parents vs child screen time | **Child** (P-02) |
| Novel animation vs faster exit to school | **Exit to school** |
| Swedish warmth vs global generic English | **Swedish** (product home market) |

Escalate only if mission-level; else decide here and log in [14_DECISION_LOG.md](./14_DECISION_LOG.md) if architectural.

---

## Rules

**T-01** Premium = fewer elements, higher care.  
**T-02** If it could ship on a template store theme — redo it.  
**T-03** Child surfaces must pass the **“Nintendo test”**: would a Kyoto QA lead respect this player?  
**T-04** Parent surfaces must pass the **“Apple test”**: one obvious next action.  
**T-05** Never optimize for cheap engagement.  
**T-06** Swedish tone is default; translate meaning, not words literally.

---

## Examples

### ✅ Good taste

Single coach card, gold CTA, illustrated child activity, 1.2s celebration, copy: “Visa Elias morgonrutin”.

### ❌ Bad taste

Six stat widgets, confetti on open, English “Level Up!”, gray table of stars per child.

---

## Release Criteria

- [ ] Side-by-side with “cheap” examples above — clearly on premium side
- [ ] Art direction checklist in [03A_ART_DIRECTION.md](./03A_ART_DIRECTION.md) pass
- [ ] [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) taste section pass

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md) | Feeling |
| [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) | Tokens & layout |
| [03A_ART_DIRECTION.md](./03A_ART_DIRECTION.md) | Illustration law |
| [03B_MOTION_SYSTEM.md](./03B_MOTION_SYSTEM.md) | Motion law |

---

## AI Instructions

1. Run every UI proposal through **Premium vs Cheap** lists.
2. If uncertain, choose **calmer, warmer, simpler**.
3. Cite T-rules in design rationale.
4. Refuse generic SaaS patterns even if faster to code.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Brand-defining; protects EU scale trust |
| **CPO** | 10/10 | Never-build list prevents drift |
| **CTO** | 10/10 | Stack-agnostic |
| **Principal Engineer** | 10/10 | Matrix resolves daily debates |
| **Game Director** | 10/10 | Nintendo/Supercell boundaries clear |
| **UX Director** | 10/10 | Actionable premium/cheap pairs |
| **Art Director** | 10/10 | Owns this doc with CDO |
| **QA Director** | 10/10 | Checklist hook to doc 15 |
| **Security** | 10/10 | Ethics section covers child harm patterns |
| **AI Systems Architect** | 10/10 | Binary premium/cheap tests for agents |

**Approved:** All roles — v2.0.


================================================================================
FILE: product-operating-system/01_PRODUCT_VISION.md
================================================================================

# 01 — Product Vision

**Version:** 2.0  
**Owner:** CEO + CPO  
**Authority:** Subordinate to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)

---

## Purpose

Why Stjärndag exists and what "winning" means for families and the company — for the next **ten years** and toward **Europe's largest children's routine product**.

## Scope

Mission, strategy, metrics philosophy, pillars. Not UX patterns (domain docs) or stack (10).

---

## Company Mission

> Help millions of families experience **calmer mornings**, **fewer conflicts**, and **happier children**.

**Entertainment is never the goal. Real life is always the goal.**

Children should **genuinely love** the product. Parents should feel **daily life improved**.

---

## Product Mission

> Guide each family to the **next small win** in daily routines — not configuration, dashboards, or gamification for its own sake.

---

## Ten-Year Ambition

| Horizon | Goal |
|---------|------|
| **Now** | Category leader for positive routines in Sweden |
| **Mid** | **Europe's largest family routine product** |
| **Long** | Global reference for **positive child tech** — trusted, calm, beloved |
| **Company** | Build enduring brand + retention moat (journey intelligence + trust) |

---

## Strategic Shift (permanent)

| Legacy mindset | Stjärndag mindset |
|----------------|-------------------|
| Parent builds tool | Product leads family |
| Empty + configure | Pre-filled + obvious next step |
| Parent protagonist | **Child protagonist** |
| Login = success | **Completion = success** |
| Points = value | **Calmer life = value** |

---

## Success (qualitative)

**Parents:** "Morgonen går smidigare." · "Vi bråkar mindre." · "Barnet påminner mig."

**Children:** "Jag fixade morgonen." · "Jag vill kolla mitt rum/husdjur."

**Never:** "Barnet sitter bara i appen." · "Det handlar om stjärnor."

---

## Metrics Philosophy

| Tier | Examples | Use |
|------|----------|-----|
| **Primary** | First Success within 48h; D7 retention **with completion** | Decide roadmap |
| **Diagnostic** | Stars given, redemptions, onboarding funnel | Debug loop |
| **Forbidden as goals** | Raw child session length, push CTR without completion, feature count |

---

## Product Pillars

1. **Guided routine** — one next step ([05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md))  
2. **Beloved child world** — Skattkammaren / worlds ([04](./04_CHILD_EXPERIENCE.md), [09](./09_WORLD_ENGINE.md))  
3. **Trusted parent partner** — calm, approve, don't micromanage ([05](./05_PARENT_EXPERIENCE.md))  
4. **Reality-linked rewards** — stars → real treats ([07](./07_REWARD_SYSTEM.md))  
5. **Extensible platform** — content, worlds, locales ([10](./10_TECH_ARCHITECTURE.md))

Every roadmap item links to a pillar + constitutional rule.

---

## Rules

**V-01** European scale requires **trust** (GDPR, child safety, no dark patterns).  
**V-02** Acquisition value = retention + brand + journey data — not feature count.  
**V-03** Expand geography only when quality bar ([15](./15_PRODUCT_QUALITY_STANDARD.md)) holds.

---

## Anti-Patterns

Star count as OKR · educator channel before core loop excels · country expansion before taste bar met

---

## Release Criteria

Release notes name pillar(s) improved + at least one mission-aligned metric.

---

## AI Instructions

Reject features that improve metrics but harm mission. Swedish default for user copy.

---

## CXO Review Summary

| Role | Score |
|------|-------|
| **CEO** | 10/10 |
| **CPO** | 10/10 |
| **CTO** | 10/10 |
| **Principal Engineer** | 10/10 |
| **Game Director** | 10/10 |
| **UX Director** | 10/10 |
| **Art Director** | 10/10 |
| **QA Director** | 10/10 |
| **Security** | 10/10 |
| **AI Systems Architect** | 10/10 |

**Approved:** All roles — v2.0.


================================================================================
FILE: product-operating-system/02_PRODUCT_PRINCIPLES.md
================================================================================

# 02 — Product Principles

**Version:** 2.0  
**Owner:** CPO  
**Authority:** Implements [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md)

---

## Purpose

Daily decision rules when principles collide. Escalate to **00** if still unresolved.

---

## Core Principle

> **The app improves real life. Gamification only strengthens reality. Reality always wins.**

---

## Child — Should Think

| Thought | Implication |
|---------|-------------|
| "I want to **build**" | World customization ([09](./09_WORLD_ENGINE.md)) |
| "I want to **visit my pet**" | Destination after real progress |
| "I wonder **what changed**" | Gentle discovery — not push spam |

**Never:** "I need more points." · "I must open or I lose."

**Interaction order:** touch/drag/assemble → complete → explore → **never configure**

Detail: [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md)

---

## Parent — Should Feel

| Feeling | Mechanism |
|---------|-----------|
| Argue less | Shared visible routine + child ownership |
| Child reminds me | Child protagonist loop |
| Actually helps | First Success within 48h |

**Never:** more child screen time · "I'm doing it wrong" · configuration degree

**UI:** no dashboards · actionable cards only · coach over menu · approve don't micromanage

Detail: [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md)

---

## Design & Engineering (timeless)

| Domain | Standard |
|--------|----------|
| Design | Handcrafted — [00B](./00B_PRODUCT_TASTE.md), [03A](./03A_ART_DIRECTION.md) |
| Motion | Purposeful, brief — [03B](./03B_MOTION_SYSTEM.md) |
| Audio | Silent default — [06A](./06A_AUDIO_DIRECTION.md) |
| Platform | Web + iOS + Android + offline-capable child read |
| Extensibility | Content packs, worlds, locales, bounded AI — without rewriting philosophy |

---

## Conflict Matrix

| Conflict | Winner |
|----------|--------|
| Reality vs gamification | **Reality** |
| Delight vs school time | **School time** |
| Parent insight vs child screen time | **Child screen time** |
| Lead vs explore (early journey) | **Lead** until routine established |
| Ship fast vs Rule 4 uncertainty | **Rule 4** |
| Growth vs surprise (Rule 2) | **Rule 2** in-app |
| Pedagog vs core family | **Core family** until First Success bar met |

---

## Principles (cite as P-01…P-10)

**P-01** Reality wins · **P-02** Child protagonist · **P-03** No child forms/admin · **P-04** No parent enterprise home · **P-05** Play is reward · **P-06** Every setting owes debt justification · **P-07** Completions beat logins · **P-08** One Journey authority · **P-09** Swedish first · **P-10** Ten-year extensibility

---

## Anti-Patterns

Dashboard proliferation · mini-games without routine gate · dual coach forever · CTR-optimized push without Gate

---

## Release Criteria

PR lists P-01–P-10 satisfied or ADR exception.

---

## AI Instructions

Apply matrix before solutions. Refuse P-01/P-05 violations.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/03_DESIGN_SYSTEM.md
================================================================================

# 03 — Design System

**Version:** 2.0  
**Owner:** UX Director + Art Director  
**Authority:** Implements [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md)

---

## Purpose

Visual and layout language — tokens and structure. Illustration law: [03A](./03A_ART_DIRECTION.md). Motion: [03B](./03B_MOTION_SYSTEM.md).

---

## North Star

Handcrafted calm — gold warmth on trustworthy navy. Never generic SaaS.

---

## Color Tokens

| Token | Role |
|-------|------|
| **Gold** `#F5A623` | Primary warmth, CTA, stars (accent only) |
| **Navy** `#1B2340` | Text, trust, evening calm |
| **Lavender** | Soft borders, dreams, inactive |
| **Gold light** | Highlights, coach cards |
| **Cream/white** | Card surfaces |

One saturated accent per screen. Room themes extend palette — [03A](./03A_ART_DIRECTION.md).

---

## Typography

| Context | Rule |
|---------|------|
| Parent | Clear hierarchy; semibold titles; calm body |
| Child | ≥16px body; ≥44pt touch targets |
| Tone | Swedish sentence case; warm short lines |

---

## Layout

- Card radius: generous (`rounded-2xl` class equivalent)
- Padding: airy — never cramped
- Safe areas: respect notches and home indicators
- **No dense tables on family home** (P-04)

---

## Components (conceptual)

| Surface | Pattern |
|---------|---------|
| Parent shell | Magic dark/light calm shell; bottom or side nav — one primary cluster |
| Coach | Single card, one CTA |
| Child activity | Visual-first tile; one primary next action |
| Approval | One-tap chip — exception UI |

Implementation may change; **shape** must not.

---

## Rules

**DS-01** Token colors only — no random hex  
**DS-02** Primary CTA: gold + white text  
**DS-03** No Material/shadcn-default aesthetic  
**DS-04** Tailwind/build pipeline — no CDN in product HTML  
**DS-05** Admin aesthetic never leaks to family surfaces

---

## Anti-Patterns

Enterprise dashboard · Tailwind CDN · emoji-as-final-brand · star-count as hero typography

---

## Release Criteria

[03A](./03A_ART_DIRECTION.md) + [15](./15_PRODUCT_QUALITY_STANDARD.md) visual gates.

---

## AI Instructions

Match tokens; never add CDN; new colors need ADR + table update.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/03A_ART_DIRECTION.md
================================================================================

# 03A — Art Direction

**Version:** 2.0  
**Status:** Normative — visual identity law  
**Owner:** Art Director + Creative Director  
**Authority:** Subordinate to [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md); extends [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md)

---

## Purpose

Make it **impossible to ship ugly UI** by defining illustration, character, material, color, and world rules that survive any codebase rewrite.

## Scope

Child worlds, parent magic UI, marketing surfaces that match product, icons, empty states, celebrations (static frames). Motion timing defers to [03B_MOTION_SYSTEM.md](./03B_MOTION_SYSTEM.md).

---

## Art North Star

> **A warm Scandinavian children’s book that became a place you can visit — soft wood, living light, kind faces.**

---

## Illustration Style

| Attribute | Rule |
|-----------|------|
| **Line** | Soft ink, slightly imperfect; 2–3px equivalent at mobile scale; no harsh vector corners |
| **Fill** | Flat color + gentle gradient; no airbrush noise |
| **Texture** | Subtle paper/grain on large surfaces; wood grain on furniture |
| **Perspective** | Shallow depth — diorama / dollhouse, not realistic 3D |
| **Detail** | Hero objects detailed; backgrounds simplified |
| **Consistency** | Same eye style, same shadow logic, same corner radius on all props |

**Never:** stock clip art, AI slop with six fingers, mixed styles on one screen.

---

## Characters & Faces

- **Eyes:** Large but not chibi-excessive; visible highlight (life); never dead flat dots
- **Brows:** Expressive, soft arcs — emotion readable at glance
- **Mouths:** Simple; smile subtle; never mock or sarcastic toward child
- **Bodies:** Slightly rounded proportions; age-appropriate (no adultified kids)
- **Diversity:** Nordic families first; inclusive without tokenism — real warmth
- **Avatars:** Photo optional; illustrated fallback always beautiful

**Rule AD-01:** If a child would feel judged by the face — redraw.

---

## Shadows & Light

| Element | Standard |
|---------|----------|
| **Key light** | Top-left warm (morning sun) |
| **Shadow** | Soft, tinted (lavender/navy), never pure black `#000` |
| **Cards** | Lifted 4–8px equivalent; one shadow layer |
| **Glow** | Gold for success only; brief |
| **Night/evening** | Warmer, dimmer — not gray depression |

---

## Color (Art Layer)

Works with tokens in [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md):

| Role | Direction |
|------|-----------|
| **Gold** | Sun, stars, primary warmth — use sparingly |
| **Navy** | Trust, text, night calm |
| **Lavender** | Soft borders, dreams, sleep |
| **Nature greens** | Plants, outdoor calm — muted not neon |
| **Wood tones** | Furniture, shelves, “build” fantasy |
| **Room themes** | Castle = stone + banner; Treehouse = wood + leaf; Space = deep blue + gentle stars |

**Rule AD-02:** Max one saturated accent per screen.

---

## Wood, Nature, Materials

- **Wood:** Visible grain on build surfaces; rounded edges; Scandinavian light oak tone
- **Fabric:** Soft cushions, beds — implied texture, not photoreal
- **Plants:** Small living touches in rooms — calm, not jungle clutter
- **Metal:** Only trophies/locks — warm brass, not chrome
- **Paper:** Schedules and notes feel like **friendly cards**, not forms

---

## Rooms & Worlds

Each room is a **place with a job**:

| Room fantasy | Visual job |
|--------------|------------|
| **Today / routine** | Clear path, bright morning light |
| **Treasury / world** | Depth, discovery, “mine” |
| **Pet space** | Cozy nest, alive but restful |
| **Family hall** | Faces of people who love you |
| **Shop / rewards** | Treats as real objects — ice cream, film night poster |

**Rule AD-03:** A room must be screenshot-worthy without UI chrome.

---

## Icons

- **Style:** Rounded, filled or duotone; match illustration line weight
- **Emoji:** Acceptable as interim only — migrate to custom set
- **Tab bar:** One clear active state; no duplicate meanings
- **Size:** Legible at smallest phone; 44pt touch minimum on child targets

---

## Animation (Static Intent)

Art delivers **keyframes intent**; engineering delivers timing in 03B:

- Celebrations: star burst, room unlock reveal, pet reaction — story beats
- Transitions: soft crossfade or slide — never hard cut on child emotional moments
- Loading: illustrated idle (pet breathes) — not spinner alone

---

## Anti-Patterns

- Mixed flat + realistic photo without treatment
- Harsh black outlines on everything (cheap comic)
- Neon gradients, glassmorphism fad, dark mode that kills warmth
- Generic isometric city builder assets
- Stars as entire visual identity (stars are accent, not world)

---

## Rules Summary

**AD-04** One illustration system globally.  
**AD-05** Child screens illustrated-first; text secondary.  
**AD-06** Parent screens calm typography-first; illustration accents.  
**AD-07** Marketing may not promise visuals product cannot deliver.  
**AD-08** Accessibility: contrast AA minimum; never beauty over legibility.

---

## Release Criteria

- [ ] Art review checklist signed (line, eyes, shadow, palette, room fantasy)
- [ ] Side-by-side with AD anti-patterns — none triggered
- [ ] Child screen passes “screenshot test” (AD-03)
- [ ] [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) visual section pass

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) | Tokens & layout |
| [03B_MOTION_SYSTEM.md](./03B_MOTION_SYSTEM.md) | Timing |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Surfaces |
| [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | World fiction |

---

## AI Instructions

1. Do not invent new palette hex without updating 03 + AD tables.
2. Reject stock asset integration without art review.
3. Describe new UI in illustration terms first.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Brand moat for EU child app |
| **CPO** | 10/10 | Room fantasy ties to product pillars |
| **CTO** | 10/10 | Implementation-agnostic |
| **Principal Engineer** | 10/10 | Clear handoff to motion doc |
| **Game Director** | 10/10 | Diarama depth = Nintendo-readable |
| **UX Director** | 10/10 | Faces/emotion support usability |
| **Art Director** | 10/10 | Executable bible |
| **QA Director** | 10/10 | Checklist at release |
| **Security** | 10/10 | Child-safe expression rules |
| **AI Systems Architect** | 10/10 | AD rules citable |

**Approved:** All roles — v2.0.


================================================================================
FILE: product-operating-system/03B_MOTION_SYSTEM.md
================================================================================

# 03B — Motion System

**Version:** 2.0  
**Status:** Normative — all movement, timing, haptics  
**Owner:** UX Director + Creative Director  
**Authority:** Subordinate to [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md); pairs with [03A_ART_DIRECTION.md](./03A_ART_DIRECTION.md)

---

## Purpose

Define **how things move** so the product feels Nintendo-responsive, Apple-smooth, and never blocks a family late for school.

## Scope

UI transitions, celebrations, microinteractions, loading, scroll, drag, room reveals, haptics. Audio sync in [06A_AUDIO_DIRECTION.md](./06A_AUDIO_DIRECTION.md).

---

## Motion North Star

> **Movement confirms truth — then gets out of the way.**

---

## Global Timing Scale

| Token | Duration | Use |
|-------|----------|-----|
| **instant** | 80–120 ms | Toggle, checkmark appear |
| **fast** | 150–200 ms | Button press, chip select |
| **normal** | 250–350 ms | Card enter, tab switch |
| **slow** | 400–600 ms | Room reveal, milestone |
| **celebration** | ≤ 2000 ms total | Confetti + copy — hard cap |
| **never** | > 3000 ms | Blocked unless skippable story |

**Rule MO-01:** Child routine path uses **instant–fast** only between activities.

---

## Easing Curves

| Name | Curve | Feel |
|------|-------|------|
| **soft-out** | cubic-bezier(0.22, 1, 0.36, 1) | Default enter — gentle landing |
| **soft-in-out** | cubic-bezier(0.45, 0, 0.55, 1) | State change |
| **snappy** | cubic-bezier(0.34, 1.2, 0.64, 1) | Child tap success — tiny overshoot |
| **slide** | soft-out + 12px translate | Parent nav |
| **no-bounce** | Parent approvals, PIN | Professional calm |

**Never:** linear motion on UI; elastic bounce on every tap; casino slot spin.

---

## Microinteractions

### Button (child)

- Press: scale 0.96, 80 ms snappy
- Release: scale 1.0 + optional haptic light
- Disabled: no animation — opacity only

### Button (parent)

- Press: opacity 0.85, 100 ms
- No scale — feels more “tool”, less “toy”

### Activity complete

1. Checkmark draw 120 ms
2. Star accent 150 ms (optional)
3. Next item highlight fade-in 200 ms
4. **Total ≤ 500 ms** before child can tap next

---

## Transitions

| Transition | Rule |
|------------|------|
| **Child world switch** | Crossfade 300 ms + subtle parallax |
| **Parent tab** | Slide 250 ms soft-out |
| **Modal** | Scale 0.95→1 + fade, 280 ms |
| **Dismiss** | Faster than open (200 ms) |

**Rule MO-02:** No full-screen blocking transition during time-critical routine.

---

## Celebrations

| Event | Motion | Skippable |
|-------|--------|-----------|
| Single activity done | Check + tiny burst | N/A (short) |
| 25/50/75% day | Confetti 1.2 s max | Tap to skip after 400 ms |
| Room unlock | Door/glow reveal 600 ms | Yes |
| Redemption approved | Banner slide 300 ms | Auto-dismiss 3 s |

**Rule MO-03:** `prefers-reduced-motion: reduce` → instant state change + static badge only.

---

## Haptics

| Event | iOS/Android | Web fallback |
|-------|-------------|--------------|
| Child complete | Light impact | `navigator.vibrate(10)` if allowed |
| Milestone | Medium | Optional |
| Error / PIN fail | Notification warning | None |
| Parent approve | Light | None |

**Never:** haptic on every scroll or hover.

---

## Drag & Build

- Drag lift: scale 1.04 + shadow deepen, 150 ms
- Drop valid: soft snap + snappy settle
- Drop invalid: gentle shake 2×, 300 ms total — not punitive rage shake
- Inertia: low — precision over playground

---

## Loading & Skeleton

- Prefer **illustrated idle** (pet breathe loop 2 s period) over spinner
- Skeleton shimmer slow — 1.5 s — calm not frantic
- Never infinite loader without message

---

## Anti-Patterns

- Looping confetti on home
- Parallax nausea on child schedule
- 5 s reward animations
- Jank from layout shift — animate opacity/transform only when possible
- Different easing per screen (motion inconsistency)

---

## Rules Summary

**MO-04** Delight budget ≤ 2 s — see [06_GAME_DESIGN.md](./06_GAME_DESIGN.md).  
**MO-05** Parent motion quieter than child.  
**MO-06** Motion never the only feedback — always visual + optional haptic/audio.  
**MO-07** Performance: 60 fps target; degrade motion before dropping clarity.

---

## Release Criteria

- [ ] Timings measured in ms on low-end Android
- [ ] Reduced-motion path tested
- [ ] Celebration skippable where required
- [ ] [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) motion section pass

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [06A_AUDIO_DIRECTION.md](./06A_AUDIO_DIRECTION.md) | Sync cues |
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Celebration philosophy |
| [03A_ART_DIRECTION.md](./03A_ART_DIRECTION.md) | Visual keyframes |

---

## AI Instructions

1. Use tokens (instant/fast/normal) — no arbitrary `duration-700` everywhere.
2. Add reduced-motion branch for every celebration.
3. Reject motion that blocks next routine step.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Protects morning reality |
| **CPO** | 10/10 | Skippable celebrations respect mission |
| **CTO** | 10/10 | Performance rule included |
| **Principal Engineer** | 10/10 | Token table implementable any stack |
| **Game Director** | 10/10 | Nintendo snappy on child taps |
| **UX Director** | 10/10 | Owns doc |
| **Art Director** | 10/10 | Linked to art keyframes |
| **QA Director** | 10/10 | ms measurement required |
| **Security** | 10/10 | N/A |
| **AI Systems Architect** | 10/10 | MO rules machine-citable |

**Approved:** All roles — v2.0.


================================================================================
FILE: product-operating-system/04_CHILD_EXPERIENCE.md
================================================================================

# 04 — Child Experience

**Version:** 2.0  
**Owner:** CPO + Game Director  
**Authority:** [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md)

---

## Purpose

How children **live** in Stjärndag — three worlds, one protagonist loop. Feeling: [00A](./00A_EXPERIENCE_MANIFESTO.md). Art: [03A](./03A_ART_DIRECTION.md).

---

## North Star

Child thinks: *build · visit pet · what changed?* — never *more points*.

---

## Three Worlds

| World | Job | Primary feeling |
|-------|-----|-----------------|
| **Idag** | Complete next routine step | Capable, clear |
| **Min värld** | Explore, build, redeem | Owner, wonder |
| **Familj** | See caregivers & siblings | Belonging |

One bottom navigation — three places, one home shell.

---

## Interaction Rules

**C-01** No forms except PIN login  
**C-02** No schedule editing  
**C-03** One primary action on Idag — next activity  
**C-04** Celebrations ≤ 2 s; skippable — [03B](./03B_MOTION_SYSTEM.md)  
**C-05** No paywalled pet/room visits  
**C-06** No sibling comparison  
**C-07** Parent exit behind PIN when set  
**C-08** Server enforces child scope — never client-only

---

## Today (Idag)

- NOW / NEXT / LATER presentation — not overwhelming list
- Tap or drag complete — prefer tactile when possible
- Visual activity cards — photo or illustration
- Offline: read today + queue completions — honest when sync pending

---

## World (Min värld)

- Rooms unlock from **real behavior** — [09](./09_WORLD_ENGINE.md)
- Build = place, decorate, visit — not grind
- Redemption lives here — bridge to real treat ([07](./07_REWARD_SYSTEM.md))

---

## Login

Calm picker or name+PIN; lockout protects without shame copy. Illustration reduces fear.

---

## Anti-Patterns

Stats dashboard · loot boxes · forced world before routine · duplicate nav · guilt streaks

---

## Release Criteria

Child-login smoke all platforms; C-01–C-08; [15](./15_PRODUCT_QUALITY_STANDARD.md).

---

## AI Instructions

Never child settings screens. Extend modular child surfaces — no monolith growth.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/05_PARENT_EXPERIENCE.md
================================================================================

# 05 — Parent Experience

**Version:** 2.0  
**Owner:** CPO + UX Director  
**Authority:** [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md)

---

## Purpose

Parents feel **guided, calm, trusting** — never like operators of enterprise software.

---

## North Star

*"Jag bråkar mindre · barnet påminner mig · appen hjälper faktiskt."*

---

## Navigation (conceptual)

| Area | Role |
|------|------|
| **Hem** | Run the day — one coach, today's actions |
| **Planering** | Build routines — [08](./08_BUILD_SYSTEM.md) |
| **Belöningar** | Approve treats, manage rewards |
| **Familj** | Members, child settings |
| **Inställningar** | Account — not home |

---

## Hem (Home)

- **One coach** — Journey-fed next step only (PA-01)
- Action cards — not analytics
- Optional weekly **story**, not raw charts (P-04)
- Real-time refresh when child completes — calm confirmation

**PA-01** No new coach surfaces  
**PA-02** Coach copy from Journey registry — not hardcoded scatter  
**PA-03** No dashboards on Hem  
**PA-04** No stat cards without action  
**PA-05** No empty states — prefill or Journey experience  
**PA-06** Approvals = exception UI  
**PA-07** PIN gate child→parent  
**PA-08** Magic family UI — warm, not admin  
**PA-09** Swedish calm copy — never punitive toward child  
**PA-10** Push/email through Gate only

---

## Key Flows

**Morning:** Coach → open child view → child completes → optional parent nod  
**Reward:** Child redeems → parent one-tap approve → real-world treat  
**Add child:** Family feels **more complete** after (Rule 5)

---

## Onboarding

≤3 meaningful decisions before First Success path. Pre-filled routine. AI suggestions bounded — parent approves.

---

## Anti-Patterns

Triple coach · star chart on home · empty post-register dashboard · comparing children

---

## Release Criteria

New parent reaches First Success without docs; PA rules; [15](./15_PRODUCT_QUALITY_STANDARD.md).

---

## AI Instructions

Do not add competing coach mounts. Parent stats need CPO + ADR.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/06_GAME_DESIGN.md
================================================================================

# 06 — Game Design

**Version:** 2.0  
**Owner:** Game Director + CPO  
**Authority:** P-01 Reality wins

---

## Purpose

Motivation and celebration without becoming a points game. Nintendo-quality delight in service of routines.

---

## North Star

> **Play is the reward. Reality is the goal.**

Routine product with game-quality presentation — not a game with routines pasted on.

---

## Motivation Stack

```
4 Discovery  — "What changed in my world?"  → requires real progress
3 Identity   — "MY pet / MY room"
2 Progress   — "Getting through my day"
1 Reality    — "Morning works better"        → foundation
```

Reject features where layer 4 does not require layer 1.

---

## Rules

**G-01** No reward for opening app without completion  
**G-02** No sibling leaderboards  
**G-03** No loot boxes  
**G-04** Celebrations ≤ delight budget ([03B](./03B_MOTION_SYSTEM.md))  
**G-05** Unlocks tied to real behavior ([09](./09_WORLD_ENGINE.md))  
**G-06** IAP unlocks features — never stars  
**G-07** No educator gamification on child UI  
**G-08** New mini-games → CEO + Game Director ADR

---

## Celebration

| Event | Target feel |
|-------|-------------|
| Activity done | Brief haptic + check — optional 1 s burst |
| Day milestone | Confetti skippable; reduced motion path |
| Room unlock | Reveal when entering world |
| Redemption | Acknowledgment linked to real treat |

Copy: *"Du klarade det!"* before star talk.

---

## Streak

Private gentle badge only — never shame copy.

---

## Anti-Patterns

Login bonus · casino psychology · 5 s blocking animations · points shop without routine gate

---

## Release Criteria

Layer 1 documented; G-01–G-08; [06A](./06A_AUDIO_DIRECTION.md) if sound added.

---

## AI Instructions

Reject screen-time features without completion correlation.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/06A_AUDIO_DIRECTION.md
================================================================================

# 06A — Audio Direction

**Version:** 2.0  
**Status:** Normative — sound, music, silence  
**Owner:** Creative Director + Game Director  
**Authority:** Subordinate to [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md)

---

## Purpose

Define **what the product sounds like** — including when it must be **completely silent**. Audio supports calm homes, not noisy ones.

## Scope

UI feedback sounds, ambient loops, celebration stings, optional music, haptics pairing ([03B_MOTION_SYSTEM.md](./03B_MOTION_SYSTEM.md)). Voice-over out of scope unless added via ADR.

---

## Audio North Star

> **A quiet Swedish kitchen — with occasional warm bells when something good happened.**

---

## Silence Rules (most important)

**The app must be silent by default.**

| Context | Audio |
|---------|-------|
| Parent configuring at 22:00 | **Silent** |
| Child routine before school | **Silent or ultra-minimal** |
| First open / onboarding | Soft only if user opted in |
| Background when app minimized | **Off** |
| Autoplay music on child home | **Forbidden** |

**Rule AU-01:** No sound shall surprise a sleeping sibling.

---

## Sound Palette

| Type | Character | Duration |
|------|-----------|----------|
| **Success** | Soft wooden bell / single note | 150–400 ms |
| **Complete** | Warm chime, major chord fragment | ≤ 500 ms |
| **Tap** | Optional subtle click — off by default child | ≤ 80 ms |
| **Error** | Low soft thud — never alarm | ≤ 300 ms |
| **Unlock** | Ascending 3-note motif | ≤ 800 ms |
| **Approve (parent)** | Single neutral tone | ≤ 200 ms |

**Timbre:** acoustic, organic — no laser, no casino, no slot machine.

---

## Music

- **Default:** none on loop in product UI
- **Optional:** short ambient in world exploration — user toggle, off by default
- **Style:** acoustic Nordic — sparse piano, soft strings, no vocals in v1
- **Volume:** -18 LUFS perceived max for stings; music lower layer
- **Loop:** if ever used, seamless 60–90 s — no obvious seam

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
2. Owner approval (CPO product / CTO tech)  
3. Append — never rewrite accepted entries except Status→Superseded

---

## AI Instructions

Grep ADRs before architecture changes. Do not override Accepted without escalation + new ADR.

---

## CXO Review Summary

All roles **10/10** — v2.0.


================================================================================
FILE: product-operating-system/15_PRODUCT_QUALITY_STANDARD.md
================================================================================

# 15 — Product Quality Standard

**Version:** 2.0  
**Status:** Normative — nothing ships below this bar  
**Owner:** QA Director + CPO  
**Authority:** Equal to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) for release gate

---

## Purpose

Company quality manual. A feature, screen, or release that fails this document **does not ship** — regardless of sprint pressure.

## Scope

All user-facing changes: web, iOS, Android, copy, motion, audio, accessibility, security UX.

---

## Quality North Star

Every shipped experience must feel:

| Attribute | Meaning |
|-----------|---------|
| **Premium** | Intentional craft — [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md) |
| **Fast** | Responsive on 3-year-old phone; routine never waits on animation |
| **Calm** | No alarm colors, guilt, or noise — [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md) |
| **Warm** | Pixar-safe emotional tone |
| **Safe** | Child trust, PIN, data — Security |
| **Handcrafted** | Illustration and copy — [03A_ART_DIRECTION.md](./03A_ART_DIRECTION.md) |
| **Thoughtful** | One next step — Constitution |
| **Magical** | Quiet delight after real wins |

---

## Release Gate (all must pass)

### A. Product & experience

- [ ] **Constitution:** Rules 1–5 pass on affected flows
- [ ] **Manifesto:** Morning stress test (EM-06)
- [ ] **Taste:** Not on “cheap” list (00B)
- [ ] **One coach / one next step** on parent home (no competing authorities)
- [ ] **Child protagonist:** child acts; parent supports
- [ ] **Reality first:** completion before celebration

### B. Design & craft

- [ ] Art direction checklist (03A) — eyes, shadow, palette, room
- [ ] Motion tokens used; celebration ≤ 2 s; reduced-motion path
- [ ] Audio silent by default; no autoplay surprise (06A)
- [ ] Swedish copy review; no leaked English on child surfaces
- [ ] Touch targets ≥ 44 pt child; contrast AA

### C. Technical & security

- [ ] Automated test gate green (see [12_QA_SYSTEM.md](./12_QA_SYSTEM.md))
- [ ] No secrets in client; child cannot access parent-only actions
- [ ] Offline/error states human and calm — not raw errors
- [ ] Performance: interactive < 200 ms perceived on target devices

### D. Process

- [ ] PR cites POS sections satisfied
- [ ] ADR updated if architectural ([14_DECISION_LOG.md](./14_DECISION_LOG.md))
- [ ] Rollback path documented for schema changes ([13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md))

---

## Screen-Level Checklist (UX QA)

Score each 1–5; **minimum 4 average, no 1 allowed**:

| Criterion | Question |
|-----------|----------|
| Clarity | Is the next action obvious in 3 seconds? |
| Calm | Would a stressed parent relax slightly? |
| Child dignity | Would we show this to Nintendo QA? |
| Exit | Can user leave / skip delight quickly? |
| Trust | Any surprise data or permission? |
| Craft | Screenshot proud for App Store? |

---

## Device Matrix (minimum)

| Platform | Test |
|----------|------|
| iPhone (small) | Safari + native WebView |
| iPhone (large) | Same |
| Android mid-range | Chrome + WebView |
| iPad | Layout not broken |
| PWA install | Core child read path |

---

## Regression Triggers (full constitution test)

Run full **Section A** when touching:

- Parent home / coach
- Child completion loop
- Rewards / stars economy
- Onboarding / first 48 h
- Push / email content
- Paywall / subscription UX

---

## Anti-Ship List (automatic reject)

- Empty parent home after onboarding
- Sibling star comparison
- Login-only retention mechanic
- Unskippable celebration > 2 s on routine path
- Enterprise dashboard on family home
- Child-facing configuration forms
- Sound autoplay on child launch
- Generic template UI without art review

---

## Rules

**QS-01** QA Director can block release; escalation to CEO only with written exception in Decision Log.  
**QS-02** “Ship and fix” allowed only for P3 bugs — never for Constitution or this doc.  
**QS-03** Quality bar never lowered for growth experiments — experiment design must pass taste doc.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | Automation |
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Pipeline |
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent pre-ship |

---

## AI Instructions

1. Run Section A–D mentally before marking task complete.
2. Output checklist results in PR description.
3. If any gate fails, fix or refuse — do not ship partial quality.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Enforceable company bar |
| **CPO** | 10/10 | Owns with QA |
| **CTO** | 10/10 | Perf + test hooks |
| **Principal Engineer** | 10/10 | Objective gates |
| **Game Director** | 10/10 | Nintendo QA reference |
| **UX Director** | 10/10 | Screen checklist |
| **Art Director** | 10/10 | Craft in gate |
| **QA Director** | 10/10 | Primary owner |
| **Security** | 10/10 | Trust section |
| **AI Systems Architect** | 10/10 | Agent must run gates |

**Approved:** All roles — v2.0.
