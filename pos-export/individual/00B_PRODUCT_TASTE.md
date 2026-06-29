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
