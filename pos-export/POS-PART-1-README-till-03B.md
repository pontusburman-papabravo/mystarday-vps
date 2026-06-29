# ALL DOCUMENTS — Stjärndag Product Operating System v2.0


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
