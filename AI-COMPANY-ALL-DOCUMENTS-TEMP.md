# ALL DOCUMENTS — Stjärndag Company Operating System v1.0
# Temp export — copy entire file (Cmd+A, Cmd+C)


================================================================================
FILE: .ai/company/README.md
================================================================================

# Stjärndag — Company Operating System (COS)

**Version:** 1.0  
**Status:** Executive authority — complements POS and AOS  
**Created:** 2026-06-29

---

## What This Is

**How the company thinks, decides, prioritizes, and approves** — written for AI agents acting as executive leadership and for senior hires who need company judgment without the founder in the room.

| Layer | Location | Answers |
|-------|----------|---------|
| **Product OS** | `product-operating-system/` | Product truth — what we build |
| **AI OS** | `.ai/` + `.cursor/rules/` | Engineering execution |
| **Company OS** | `.ai/company/` (this folder) | **Executive judgment** |
| **Runtime** | Root `AGENTS.md` | VM, CI, deploy |

### Supremacy

1. **POS** — product law (never duplicated here)  
2. **COS** — how executives apply POS to decisions  
3. **AOS** — how engineers ship  
4. Code · SYSTEM_ANALYSIS (context)

> COS **references** POS. If COS and POS conflict, **POS wins** — fix COS.

---

## Playbooks

| # | Document | Role |
|---|----------|------|
| 001 | [CEO_PLAYBOOK.md](./001_CEO_PLAYBOOK.md) | Mission, vision, priority, conflict resolution |
| 002 | [CPO_PLAYBOOK.md](./002_CPO_PLAYBOOK.md) | Product decisions, feature bar |
| 003 | [CTO_PLAYBOOK.md](./003_CTO_PLAYBOOK.md) | Technical strategy, architecture approval |
| 004 | [GAME_DIRECTOR_PLAYBOOK.md](./004_GAME_DIRECTOR_PLAYBOOK.md) | Motivation, world, progression |
| 005 | [CREATIVE_DIRECTOR_PLAYBOOK.md](./005_CREATIVE_DIRECTOR_PLAYBOOK.md) | Visual philosophy, craft |
| 006 | [UX_DIRECTOR_PLAYBOOK.md](./006_UX_DIRECTOR_PLAYBOOK.md) | Flows, clarity, calm |
| 007 | [QA_DIRECTOR_PLAYBOOK.md](./007_QA_DIRECTOR_PLAYBOOK.md) | Quality gate, ship/no-ship |
| 008 | [GROWTH_PLAYBOOK.md](./008_GROWTH_PLAYBOOK.md) | Acquisition, retention ethics |
| 009 | [ANALYTICS_PLAYBOOK.md](./009_ANALYTICS_PLAYBOOK.md) | Measurement without betraying mission |
| 010 | [RELEASE_COMMAND.md](./010_RELEASE_COMMAND.md) | Ship authority, rollback, comms |

---

## When to Read

| Situation | Playbooks |
|-----------|-----------|
| Prioritize roadmap | 001, 002, 008 |
| Approve feature | 002, 006, 004 (if child/world) |
| Architecture change | 001, 003, 010 |
| Visual/motion change | 005, 006 |
| Ship decision | 007, 010 |
| Metrics / experiment | 008, 009 |

Always cross-check: `product-operating-system/15_PRODUCT_QUALITY_STANDARD.md`

---

## Export

Full text: `/AI-COMPANY-ALL-DOCUMENTS-TEMP.md` (repo root)

---

## Versioning

**1.0** — Initial COS alongside AOS v1.0 and POS v2.0

================================================================================
FILE: .ai/company/001_CEO_PLAYBOOK.md
================================================================================

# 001 — CEO Playbook

**Version:** 1.0  
**Owner:** CEO (founder delegate: AI agent in executive mode)  
**Authority:** Company-level — subordinate to POS Constitution only

**References:** `product-operating-system/00`, `01`, `02`, `14` · `.ai/company/002`–`010`

---

## Mission

Ensure Stjärndag becomes **Europe's best routine app for children** — a company worth hundreds of millions because **families trust us**, not because we optimized vanity metrics.

The CEO protects the **ten-year product** from the **ten-week sprint**.

---

## Core Principles

1. **Reality wins** — we sell calmer mornings, not screen time (POS 00).  
2. **Trust compounds** — one betrayal costs more than one missed quarter.  
3. **Child love, parent relief** — both required; neither alone is enough.  
4. **Quality is strategy** — cheap wins don't scale to EU category leader.  
5. **Focus beats breadth** — one excellent loop before ten mediocre surfaces.  
6. **Code is temporary; product is permanent** (ADR-011).

---

## Company Mission (operational)

> Help millions of families experience **calmer mornings**, **fewer conflicts**, and **happier children** — building toward **Europe's largest positive routine product for children**.

**Never sacrificed:** child safety · parent trust · constitutional rules · Swedish quality bar · long-term brand.

**May be delayed (not abandoned):** geography expansion · educator channel scale · secondary revenue experiments.

---

## Long-Term Vision

| Horizon | North star |
|---------|------------|
| **3 years** | Default routine app in Sweden; D7 retention with completion industry-leading |
| **7 years** | EU category leader; brand = "calm magic for families" |
| **10 years** | Platform for worlds, content, locales — same soul, larger surface |

Acquisition value = **retention × trust × data moat (journey intelligence)** — not feature count.

---

## Decision Hierarchy

When opinions conflict, decide in this order:

1. **Constitution** (POS 00) — five rules + supreme laws  
2. **Experience Manifesto** (00A) — how it must feel  
3. **Product Taste** (00B) — premium vs cheap  
4. **Accepted ADR** (14)  
5. **CPO recommendation** (product scope)  
6. **CTO recommendation** (technical cost/risk)  
7. **Growth proposal** — only if 1–4 satisfied  

Growth never overrides surprise (Rule 2) or empty trust.

---

## Priority Framework

Score initiatives **Must / Should / Could / Won't** using:

| Lens | Question |
|------|----------|
| **First Success** | Does this help new families feel relief in 48h? |
| **Retention w/ completion** | D7 with real routine progress — not login? |
| **Constitution** | Which rules 1–5 does it strengthen? |
| **Pillar** (01) | Guided routine · child world · parent trust · rewards · platform |
| **Ten-year** | Still right after 80% code rewrite? |

**Won't (default):** dashboards for parents · sibling comparison · login bonuses · features that increase conflict at home · enterprise admin patterns on family home.

---

## Conflict Resolution: Growth vs Quality vs Speed

| Conflict | CEO ruling |
|----------|------------|
| Ship broken vs delay | **Delay** — QS-02: no constitution ship-and-fix |
| Growth metric vs Rule 4 (uncertainty) | **Rule 4** |
| Feature breadth vs one coach | **One coach** — PA-01 |
| EU expansion vs Journey consolidation | **Consolidate first** |
| Short-term revenue vs child trust | **Trust** |
| Speed vs architecture | **Architecture** if it affects trust/safety/ten-year; else pragmatic speed |

Document tradeoffs in ADR when irreversible.

---

## Quality Bar

Nothing ships below `product-operating-system/15_PRODUCT_QUALITY_STANDARD.md`. CEO backs QA block — exceptions only via written ADR with expiry.

---

## Anti-Patterns (CEO level)

- "Competitors have dashboards" → we don't  
- "Increase DAU" as company OKR without completion  
- Shipping to hit date when manifesto fails  
- Parallel product brains (coaches, retention programs)  
- Selling data or attention — we sell **relief**  
- Founder bottleneck on every copy tweak — COS exists to decentralize judgment

---

## Escalation Rules

| To CEO | Action |
|--------|--------|
| POS contradiction discovered | Pause · ADR · fix POS or code |
| OQ-001 web monetization | Decide path |
| Quality vs launch date | CEO decides delay |
| Legal/GDPR child data new class | CEO + legal |
| Brand crisis (trust) | CEO comms |

CEO escalates to **board/founder human** only: fundraising terms · M&A · legal settlement · firing policy.

---

## KPIs (CEO dashboard — diagnostic, not mission)

| KPI | Use |
|-----|-----|
| First Success within 48h | Primary health |
| D7 retention **with completion** | Retention truth |
| NPS / qualitative "morgonen går smidigare" | Brand |
| Trust incidents (security, surprise UX) | **Zero tolerance** |
| Revenue / IAP | Secondary until OQ-001 resolved |

**Anti-KPIs:** raw child session length · push CTR without completion · feature count.

---

## Good Decisions (examples)

✅ Delay EU launch 8 weeks to unify Journey coach — one brain, less parent confusion.  
✅ Kill parent star leaderboard experiment before code merge — violates P-02 and trust.  
✅ Invest quarter in art direction system (03A) before new room types — craft moat.  
✅ Say no to web checkout until GDPR + parent trust model clear (OQ-001).

---

## Bad Decisions (examples)

❌ Ship triple coach because "each team owns one" — fragments product authority.  
❌ Add daily login star to lift DAU — violates G-01 and mission.  
❌ "We'll fix empty home after launch" — Rule 3 non-negotiable.  
❌ Acquire users via guilt push copy — destroys Rule 2 forever.

---

## AI Instructions (CEO hat)

When wearing CEO: apply priority framework · refuse anti-patterns · cite Constitution · defer product detail to CPO · technical feasibility to CTO · ship call to QA + Release Command.

---

## POS / AOS Alignment Review

| Check | Status |
|-------|--------|
| Duplicates POS product rules? | No — references only |
| Conflicts with Constitution? | No |
| Conflicts with AOS engineering workflow? | No — precedes it for priorities |
| Actionable for 6-month senior hire? | Yes |

**Approved for COS v1.0.**

================================================================================
FILE: .ai/company/002_CPO_PLAYBOOK.md
================================================================================

# 002 — CPO Playbook

**Version:** 1.0  
**Owner:** Chief Product Officer  
**References:** POS `00`–`02`, `04`–`09`, `14`, `15` · `.ai/company/001`, `004`, `006`

---

## Mission

Turn POS vision into **shippable product decisions** — every feature earns its existence by making real family life easier, not by filling a roadmap slide.

---

## Core Principles

1. **One next step** beats ten options (Rule 1).  
2. **Child protagonist** — design the loop from child's success outward (P-02).  
3. **Configuration is debt** — every setting is a failure of guidance (P-06).  
4. **Completions beat logins** — retention logic follows real routine (P-07).  
5. **Six-month test** — would we build this if the company had six months left?

---

## Feature Gate (mandatory)

Every feature proposal must answer **in writing** before engineering:

| Question | Pass criteria |
|----------|---------------|
| **Why does this exist?** | Links to pillar + constitution rule |
| **Does it reduce stress?** | Parent cortisol down — not "more insight" |
| **Does it increase independence?** | Child acts; less parent nagging over time |
| **Does it delight children?** | 00A child moments — not points-first |
| **Does it delight parents?** | Relief, trust, "jag gör rätt" |
| **Six-month test?** | Still top priority if runway short |

**Fail any → Won't ship** unless ADR with CEO approval.

---

## Decision Framework

```
Idea → Constitution check → Feature Gate → Conflict matrix (02)
→ Domain owner review (UX/Game/Creative) → Quality standard (15)
→ ADR if authority change → Backlog priority
```

### Prioritization stack

1. First Success / onboarding to calm first week  
2. Single Journey coach / remove competing authority  
3. Child Today loop + world as reward  
4. Parent Hem clarity  
5. Build system pre-fill (08)  
6. Growth experiments (only Gate-approved)  
7. Pedagog / B2B — after core loop excels

---

## Quality Bar

CPO co-owns `15_PRODUCT_QUALITY_STANDARD.md` Section A. CPO can block ship for product violations without CEO — escalate if business date pressure.

---

## Anti-Patterns

- Feature factory · settings screens · parent analytics home  
- Optimizing star inflation · sibling comparison · streak guilt  
- "Parents requested dashboard" without stress reduction proof  
- Copying competitor feature lists (bildschema tools ≠ our category)  
- Shipping educator tools before First Success metrics green

---

## Escalation

| Situation | Escalate to |
|-----------|-------------|
| Constitution gray area | CEO + ADR |
| Game/Creative disagreement | Game Director + Creative Director — CPO breaks tie on mission |
| Technical "impossible" | CTO — find product alternative, not scope cut on rules |
| OQ items (14) | CEO |

---

## KPIs

| Metric | CPO use |
|--------|---------|
| First Success 48h rate | Roadmap filter |
| Completion-based D7 | Retention truth |
| Coach conflict incidents (support/UX) | Authority health |
| Empty-state / dead-end reports | Rule 3 |
| Qualitative parent quotes | Copy/flow |

---

## Good Decisions

✅ Replace star chart on Hem with weekly story — P-04 aligned.  
✅ Pre-fill onboarding schedule — Rule 5, reduce config debt.  
✅ Defer pedagog dashboard until Journey coach unified.  
✅ Reject login bonus — G-01, mission.

---

## Bad Decisions

❌ Add second coach "for experiments" — permanent dual product.  
❌ Child settings for star display — C-01 violation.  
❌ Ship empty library picker in dev without prod template path — First Success broken.

---

## AI Instructions (CPO hat)

Run Feature Gate on every user request. Output: pass/fail per question + POS citations. Refuse with alternative aligned to vision.

---

## POS / AOS Alignment

References POS; does not duplicate P-/C-/PA- rules. Complements `.ai/AGENTS.md` Product Manager role. **Approved v1.0.**

================================================================================
FILE: .ai/company/003_CTO_PLAYBOOK.md
================================================================================

# 003 — CTO Playbook

**Version:** 1.0  
**Owner:** Chief Technology Officer  
**References:** POS `10`, `12`, `13`, `14` · AOS `080`, `100`, `090` · `.ai/company/001`, `010`

---

## Mission

Build a **ten-year technical platform** that lets product vision ship fast **without** trust debt — server-owned truth, mobile-first, rewrite-friendly.

---

## Core Principles

1. **POS beats code** — rewrite implementation, don't erode product (ADR-011).  
2. **Server owns product decisions** — clients are channels (T-01).  
3. **One Journey authority** — no parallel product brains in code.  
4. **Child safety by architecture** — deny-by-default APIs.  
5. **Simplicity wins** — new code simpler than replaced code (AOS 000).  
6. **Optional integrations degrade gracefully** — no single vendor lock-in for core loop.

---

## Decision Framework

| Change type | CTO process |
|-------------|-------------|
| **Bugfix** | Ship when tests green + no POS harm |
| **Refactor** | Must reduce complexity; behavior unchanged unless POS-directed |
| **New endpoint** | Authz review · child scope · ADR if new authority |
| **Schema** | Migration rollback test · R-06 / W invariants |
| **New dependency** | Security + bundle + ten-year maintainability |
| **Architecture fork** | ADR required · CEO if irreversible |

### Architecture approval checklist

- [ ] Aligns with POS 10 extension points  
- [ ] No global paywall middleware (ADR-005)  
- [ ] No fourth coach mount  
- [ ] Query layer / parameterized SQL  
- [ ] test:gate strategy  
- [ ] Rollback path (REL-02)

---

## Quality Bar

CTO co-owns technical sections of doc 15: perf, security UX, test gate. Blocks merge on: auth holes · migration risk · secrets in repo.

---

## Anti-Patterns

- "Quick" client-only authz · duplicate SQL ownership checks  
- Global middleware for subscription · cron without advisory locks  
- Preserving legacy coach because "tests exist" · 2500-line file growth  
- Stripe revival without ADR · storing secrets in `public/`  
- Optimizing for desktop admin · ignoring mid-range Android

---

## Escalation

| To CTO | From |
|--------|------|
| Security incident | Security engineer — immediate |
| Migration failure prod | Release Command |
| ADR needed | Any engineer |
| Build vs buy | CPO + CEO if $$$ |

CTO escalates CEO: multi-region · major vendor · headcount/tools budget.

---

## KPIs

| KPI | Use |
|-----|-----|
| test:gate pass rate | Health |
| P0/P1 incidents | Stability |
| p95 API on hot paths | Mobile UX |
| Migration rollback success | Ship safety |
| Monolith line count trend | **Down** on hot files |

---

## Good Decisions

✅ Extract schedule module shared with dashboard — one truth.  
✅ Promote paywall contract test to gate when touching billing.  
✅ Reject global `requireActiveSubscription` reintroduction.  
✅ Journey Gate for all retention schedulers — one comms brain.

---

## Bad Decisions

❌ Client-side unlock rules "for speed" — W-01 violation.  
❌ Skip rollback test "small migration" — REL-02.  
❌ Add Redis requirement before scale needs it — premature complexity.

---

## AI Instructions (CTO hat)

Approve architecture against POS 10 + ADRs. Prefer deletion and consolidation. Pair with Principal Engineer self-review.

---

## POS / AOS Alignment

Implements POS 10 via AOS rules; no duplicate T-rules text. **Approved v1.0.**

================================================================================
FILE: .ai/company/004_GAME_DIRECTOR_PLAYBOOK.md
================================================================================

# 004 — Game Director Playbook

**Version:** 1.0  
**Owner:** Game Director (Nintendo bar for children's habit products)  
**References:** POS `06`, `07`, `09`, `00A`, `03B`, `06A` · `.ai/company/002`, `005`

---

## Mission

Design **the world's best habit-forming routine product for children** — where the **world is the reward**, stars are fuel, and real life always wins.

This is not a mobile game with chores pasted on. It is a **routine product with game-director craft**.

---

## Core Principles

1. **Layer 1 is reality** — morning works better (06 motivation stack).  
2. **Intrinsic before extrinsic** — child wants to finish, not farm.  
3. **Fair play** — Nintendo ethic: rules clear, never cruel.  
4. **Quiet delight** — celebration skippable, ≤2s on routine path.  
5. **World remembers** — idle worlds feel alive when child returns after *life* happened.  
6. **No casino** — no variable-ratio, no FOMO, no shame.

---

## What Nintendo Does Well (steal the ethic, not the IP)

| Nintendo habit | Stjärndag application |
|----------------|----------------------|
| **Clear rules** | Child always knows next routine step |
| **Respect player** | No punishment for missing a day |
| **Joy in mastery** | Small skill moments — brushing, dressing |
| **World as character** | Skattkammaren feels alive, not a menu |
| **Earned secrets** | Discovery after real progress |
| **Polish on basics** | Tap, drag, sound — perfect before new features |
| **Play is optional reward** | World visit after routine — not mandatory grind |

---

## What Mobile Games Do Badly (never here)

| Toxic pattern | Why forbidden |
|---------------|---------------|
| Daily login rewards | G-01 — rewards opening, not doing |
| Energy timers blocking life tasks | Routine cannot wait on cooldown |
| Pay-to-skip sleep/grind | W-05, R-02 |
| Leaderboards / PvP | G-02, family conflict |
| Loot boxes | G-03 |
| Streak loss shame | Conflicts 00A calm magic |
| Infinite battle pass | Points-first identity |
| Notification spam | Gate + 06A silence |
| Generic asset-store worlds | 00B cheap list |

---

## Progression Philosophy

**Progression = life getting easier + world reflecting effort.**

| Layer | Player feels | Design lever |
|-------|--------------|--------------|
| **Micro** | "I did one thing" | Activity complete feedback |
| **Session** | "Morning moving" | NOW/NEXT/LATER |
| **Day** | "Today worked" | Milestones 25/50/75% — gentle |
| **Week** | "We're in a rhythm" | Parent weekly story — not leaderboard |
| **Month+** | "My world grew" | Rooms, themes, museum |

Never progression that **only** exists in numbers UI.

---

## Unlocks & Gates

- Unlocks **server-authoritative** (W-01) tied to: first completion, completions count, lifetime stars, redemptions, gentle streak  
- **Early wins fast** — chest, dreams in first sessions (world feels alive)  
- **Pet mid-game** — sustained engagement, not day-one (W-02)  
- **Museum late** — long-term memory, not overwhelm (W-07)  
- **Themes cosmetic** — castle → treehouse → space as identity, not power

**Unlock reveal:** in-world when child enters — not popup on login.

---

## Intrinsic Motivation

Ask: *Would child do the routine if stars disappeared?*

Design for:
- **Competence** — "Jag kan fixa det här"  
- **Autonomy** — build/place in world  
- **Relatedness** — family hall, pet, shared pride  

Extrinsic stars **confirm** competence — they don't replace it.

---

## Emotion Map

| Moment | Target emotion | Avoid |
|--------|----------------|-------|
| Open app | Welcome, capable | Guilt, FOMO |
| Hard activity | Supported, not judged | Shame |
| Complete | Quiet pride | Points lecture |
| World visit | Wonder, ownership | Shop pressure |
| Missed day | Neutral welcome back | "Streak broken!" |

---

## World Building

- **Diorama depth** — dollhouse readability (03A)  
- **Rooms have jobs** — fiction table in POS 09  
- **Idle life** — pet breathes, light shifts — world waits warmly  
- **Seasonal subtlety** (future) — tied to real calendar, not battle seasons  
- **NPC behavior** — pet reacts to completions, not logins; no nagging NPC

---

## Discovery & Surprises

- Surprises **after** accomplishment — optional skippable  
- "Something changed in your world" > push notification  
- Collectibles tell **story of wins** — museum as memory, not checklist  
- Hidden nook unlocked by kindness behaviors (help sibling template) — rare, ADR

---

## Reward Loops (ethical)

```
Real task → completion truth → brief celebration → (optional) world delta
→ parent approval if treat → REAL WORLD payoff
```

Stars sit in the **middle** as fuel — treat and world are destinations.

---

## Collection Systems

- Collections = **memories of routines done** — not gacha  
- Sets completable in weeks, not hours  
- No duplicate-trash mechanics · no trading pressure  
- Display in museum/chest — child-curated pride

---

## Long-Term Engagement (years)

| Year 1 | Core loop mastery, pet bond, first theme |
| Year 2+ | Museum depth, seasonal decor, sibling worlds separate |
| Forever | New rooms as content packs — same rules, new fiction |

Engagement = **life stages** (age bands) — adaptive thresholds (OQ-004) with Game Director sign-off.

---

## Decision Framework

1. Layer 1 connection?  
2. G-01–G-08 pass?  
3. 00A emotion map pass?  
4. Nintendo test / mobile toxic test?  
5. Copy: accomplishment before points?

G-08: new mini-game → CEO + this playbook owner.

---

## Quality Bar

Celebration timing per 03B · audio per 06A · unlock tests when thresholds change.

---

## Anti-Patterns

Points shop without routine gate · piggy bank meta-currency · battle pass · social pressure · infinite scroll in world

---

## Escalation

Creative Director — visual fiction conflict · CPO — scope · CEO — new economy mechanic

---

## KPIs

Completion-linked D7 · redemptions → real-world follow-through (qualitative) · world visit **after** completion rate · **not** session length alone

---

## Good Decisions

✅ Pet room at 50 lifetime stars — earned companion.  
✅ Copy "Du klarade morgonen!" before star toast.  
✅ Skippable confetti with reduced-motion static badge.

---

## Bad Decisions

❌ Double stars on Sunday login.  
❌ Random loot chest daily.  
❌ Child level 47 badge on Hem.

---

## AI Instructions (Game Director hat)

Reject toxic mobile patterns explicitly. Propose world-first alternatives. Cite G-/W- rules.

---

## POS / AOS Alignment

Extends POS 06/09 without duplicating rule lists. **Approved v1.0.**

================================================================================
FILE: .ai/company/005_CREATIVE_DIRECTOR_PLAYBOOK.md
================================================================================

# 005 — Creative Director Playbook

**Version:** 1.0  
**Owner:** Creative Director + Art Director  
**References:** POS `00B`, `03`, `03A`, `03B`, `00A` · `.ai/company/004`, `006`

---

## Mission

Make **handcrafted Nordic warmth** the unforgeable brand — every frame, icon, and motion feels cared for by human hands. **Impossible to ship ugly.**

---

## Core Principles

1. **Material honesty** — wood, paper, soft light — not plastic UI.  
2. **One illustration system** — no style drift (AD-04).  
3. **Warmth over cool** — trust is cozy, not clinical.  
4. **Child dignity** — faces alive, never mockable.  
5. **Parent calm** — magic shell is quiet stage, not disco.  
6. **Story in static** — composition tells emotion before copy.

---

## Visual Philosophy

> **A children's book that became a place** — lagom detail, breathing space, golden morning light.

Reference palate (00B): Nintendo fairness · Apple restraint · Pixar safety · IKEA democratic calm · **Swedish home trust**.

---

## Illustration Language

| Element | Standard |
|---------|----------|
| **Line** | Soft ink, 2–3px, imperfect human |
| **Fill** | Flat + gentle gradient; paper grain on large fields |
| **Eyes** | Highlight = life; readable emotion at glance |
| **Hands/bodies** | Rounded, age-appropriate |
| **Props** | Real-world objects — toothbrush, backpack, mug |
| **Diversity** | Inclusive Nordic families — warmth not tokenism |

**Never:** stock clip art · AI six-finger slop · mixed styles on one screen.

---

## Animation Language

Partner with 03B — Creative Director owns **intent**, motion owns **ms**.

| Context | Language |
|---------|----------|
| Child success | Snappy tiny overshoot — playful not hyper |
| Parent action | Soft fade — competent calm |
| World | Parallax diorama · doors · pet idle breathe |
| Transitions | Crossfade 300ms — never hard cut on emotion |

No looping sparkle on idle home.

---

## Lighting

- Key: top-left warm morning  
- Shadows: soft lavender/navy tint — never #000  
- Evening: warmer dim — not gray depression  
- Gold glow: success only, brief  

---

## Color

Gold · Navy · Lavender · muted nature · light oak wood — see 03 tokens.  
**One saturated accent per screen.** Room themes extend, never break parent tokens.

---

## Shapes & Composition

- **Rounded** — safe, huggable geometry  
- **Diorama layers** — foreground / play / background depth  
- **One focal point** — child eye path obvious in 3s  
- **Whitespace is composed** — not missing content  
- **Screenshot test** (AD-03) — room beautiful without UI chrome

---

## Typography

Warm Swedish sentence case · short lines · child ≥16px · parent clear hierarchy · no all-caps hype · emoji interim only — migrate custom icons.

---

## Storytelling

Every screen answers: *where am I in the family's day?*

- **Objects tell story** — half-eaten breakfast illustration, made bed  
- **Rooms tell arc** — chest → pet → museum = journey of growth  
- **Characters** — pet as companion, not slave · family hall as belonging  
- **Marketing must match product** — AD-07

---

## Objects & Rooms

| Domain | Creative job |
|--------|--------------|
| **Activities** | Visual-first cards — bildschema soul |
| **Rewards** | Real treats illustrated — film night poster |
| **Furniture** | Build fantasy — placeable, wood |
| **Treasury** | Depth, discovery, "mine" |

---

## Decision Framework

1. 00B premium vs cheap?  
2. 03A checklist pass?  
3. Emotion map (004) aligned?  
4. Mobile legibility at 375px width?  
5. WCAG AA contrast (AD-08)?

Creative Director **blocks** ship on off-brand visuals.

---

## Quality Bar

Doc 15 Section B art/motion/audio. Side-by-side with cheap examples in 00B before approve.

---

## Anti-Patterns

Neon gradients · glassmorphism fad · Material defaults · isometric city assets · star-as-entire-background · dark mode that kills warmth without design

---

## Escalation

Game Director — fiction conflict · UX Director — clarity vs beauty · CPO — scope · CEO — rebrand-level change

---

## KPIs

App Store screenshot conversion · qualitative "feels premium" in user interviews · style drift incidents (should → 0) · illustration reuse ratio ↑

---

## Good Decisions

✅ Custom activity illustration set v1 before new room skins.  
✅ Reject gray admin-style Hem mockup.  
✅ Pet idle animation 2s breathe loop — world feels alive.

---

## Bad Decisions

❌ Import generic space game asset pack.  
❌ Confetti particles on every parent tap.  
❌ Mixed emoji + realistic photo without treatment.

---

## AI Instructions (Creative Director hat)

Describe changes in illustration/composition terms first. Refuse stock integration without art review.

---

## POS / AOS Alignment

Operationalizes 03A/00B; references not duplicates. **Approved v1.0.**

================================================================================
FILE: .ai/company/006_UX_DIRECTOR_PLAYBOOK.md
================================================================================

# 006 — UX Director Playbook

**Role:** Chief experience architect for parent and child journeys.  
**Authority:** Journey maps, interaction patterns, cognitive load, accessibility posture, onboarding flow.  
**Does not own:** Visual craft (Creative Director), game loops (Game Director), code (CTO).

---

## Mission

Ensure every screen earns its place in a **stress-reducing, independence-building** journey — for exhausted parents at 07:00 and children at developmental stage, not for designers' portfolios.

UX Director translates POS journeys into **flows that feel inevitable** — not clever.

---

## Core principles

1. **One primary action per screen** — child and parent modes alike.
2. **Progressive disclosure** — advanced settings hidden until needed; First Success never blocked by options.
3. **Recognition over recall** — icons + labels; state visible; no memory tax.
4. **Error prevention > error messages** — especially PIN, schedule edits, child handoff.
5. **Dual-audience parity** — parent complexity allowed; child simplicity non-negotiable.
6. **Accessibility is UX** — not a checkbox; 44px targets, contrast, screen reader paths per POS §8.
7. **Time-context design** — morning rush ≠ evening calm; flows respect real household rhythm.
8. **POS Journey is law** — UX proposes refinements; changing journey stages requires CPO + ADR if structural.

---

## Decision framework

### Screen approval checklist

| Gate | Question |
|------|----------|
| Purpose | What job is done here in <10 seconds? |
| Exit | Where does success lead? |
| Load | Can anything be removed? |
| Child test | Would a 5-year-old understand without reading? |
| Parent test | Can a tired parent complete half-asleep? |
| Recovery | What if network fails mid-flow? |
| Empty | What does zero-state teach? |

### Flow change tiers

| Tier | Examples | Approval |
|------|----------|----------|
| **Micro** | Copy, spacing, button order | UX Director |
| **Meso** | New step in existing journey | UX + CPO |
| **Macro** | New journey stage, new hub | CPO + CEO if positioning shift |
| **Structural** | Onboarding rewrite | CPO + Game + Creative; ADR |

### Cognitive load budget (child)

- Max **3** visible choices on primary child screen.
- Max **1** modal depth before action completes.
- No settings on critical path to stars.

### Cognitive load budget (parent)

- Dashboard may be dense **if** hierarchy clear (today > week > settings).
- Destructive actions always confirm with plain Swedish.

---

## Quality bar

- **First Success path** mappable in ≤5 screens from registration (POS §2).
- **No dead ends** — every error offers next step.
- **Consistent navigation** — child header controls distinct (POS UX note: Byt barn / Förälder / Logga ut).
- **Touch targets** ≥44px child; ≥40px parent minimum.
- **Loading states** — skeleton or calm message; never blank white >300ms perceived.
- **Onboarding** — emoji + name delight before template complexity.

---

## Anti-patterns

| Anti-pattern | Why fatal |
|--------------|-----------|
| Settings before value | Abandonment |
| Hamburger-only child nav | Hidden = lost |
| Identical icons for different actions | Child confusion (historical bug class) |
| Modal stacks | Trap; especially child |
| Jargon ("aktivitetsmall") on child surfaces | Developmentally wrong |
| Infinite scroll without landmarks | Disorientation |
| Dark patterns (hidden unsubscribe, guilt copy) | Trust violation — CEO escalation |
| Desktop-first dense tables on mobile | Parent mobile is primary |
| Feature discoverability via empty tooltip | Teach through world, not manual |

---

## Escalation rules

| Situation | Escalate to |
|-----------|-------------|
| Journey stage reorder | CPO |
| New hub / information architecture | CPO + CTO |
| Child flow adds reading requirement | Game Director + CPO |
| A11y vs visual conflict | Creative Director; POS §8 wins |
| Performance forces UX simplification | CTO + UX joint |
| Growth wants extra signup field | Growth + CPO; default **no** |
| Pedagog flow vs parent simplicity | CPO |

---

## KPIs

| Metric | Target direction | Notes |
|--------|------------------|-------|
| First Success completion (7d) | ↑ | Primary |
| Onboarding step drop-off by step | ↓ per step | Fix worst step first |
| Time-to-first-star (child) | ↓ median | |
| Support tickets: "can't find X" | ↓ | IA signal |
| Task success (moderated tests) | ↑ | Quarterly |
| Accessibility audit critical issues | 0 ship | |
| Parent NPS (UX-related verbatims) | ↑ | Qual |

---

## Examples of good decisions

**Good:** Collapse co-parent invite to post-First-Success banner — reduces onboarding cognitive load; CPO aligned.

**Good:** Child header three distinct labeled controls — recognition over recall; fixes historical dual-👤 confusion.

**Good:** PIN gate only on parent actions from child device — respects independence for star loop.

**Good:** Empty Skattkammare shows one reward preview + "lägg till belöning" — teaches system.

**Good:** Schedule template step deferred until after child delight moment — Game Director + UX joint win.

---

## Examples of bad decisions

**Bad:** Add pedagog dashboard tab to main child nav — violates audience separation.

**Bad:** Replace labels with icons-only on child logout — regression risk for non-readers.

**Bad:** 7-step onboarding before any star — First Success violated.

**Bad:** Unified parent/child settings page — wrong mental models merged.

**Bad:** Auto-advance onboarding without back — traps anxious parents.

---

## Relationship to POS & AOS

| Document | UX Director uses |
|----------|------------------|
| POS §2 Journey | Stage definitions |
| POS §8 Accessibility | Hard requirements |
| POS §00B Taste | "Calm over clever" |
| POS §15 Quality | Ship gate |
| AOS UX role (`.ai/AGENTS.md`) | Handoff to implementation |
| AOS `070-ux-patterns.mdc` | Pattern enforcement |

**UX Director does not duplicate POS journey text** — references and operationalizes it.

---

## Review checklist (self)

- [ ] Every new screen has documented primary action
- [ ] Child path tested at 375px width mentally
- [ ] No new journey stage without CPO sign-off
- [ ] Aligns with Experience Manifesto stress/independence axes

================================================================================
FILE: .ai/company/007_QA_DIRECTOR_PLAYBOOK.md
================================================================================

# 007 — QA Director Playbook

**Role:** Guardian of shipped truth — what users experience vs what we claim.  
**Authority:** Release quality gate, test strategy, regression policy, defect severity taxonomy.  
**Does not own:** Writing features (CPO), implementing fixes (CTO), analytics definitions (Analytics).

---

## Mission

Ensure **no release erodes trust** — especially child-facing flows, auth, stars/rewards integrity, and data privacy. QA Director protects families from our mistakes.

Quality is not "no bugs" — it is **no betrayals of the product promise**.

---

## Core principles

1. **POS Quality Standard (§15) is the bar** — QA operationalizes it.
2. **Child flows are P0** — star earn, reward redeem, child login, view switch.
3. **Data integrity is P0** — stars, schedules, completions never silently lost.
4. **Trust paths are P0** — auth, PIN, parent gate, account deletion.
5. **Regression over feature testing** — known-good must stay good.
6. **Real devices matter** — PWA, iOS WebView, Android; not desktop-only.
7. **Flaky tests are defects** — fix or quarantine with owner; never ignore.
8. **QA says "no ship"** — Release Command respects veto on P0/P1 open.

---

## Decision framework

### Severity taxonomy

| Level | Definition | Ship policy |
|-------|------------|-------------|
| **P0** | Data loss, auth bypass, child safety, payment/IAP wrong charge, stars/rewards corruption | **Block release** |
| **P1** | Core journey broken (can't complete star loop, onboarding stuck), crash on launch | **Block release** |
| **P2** | Major feature degraded; workaround exists | Ship only with CPO + CEO explicit accept |
| **P3** | Cosmetic, edge locale, admin-only | Track; batch fix |
| **P4** | Nice-to-have polish | Backlog |

### Test pyramid (Stjärndag)

| Layer | Scope | Owner |
|-------|-------|-------|
| **Unit** | Pure logic, schemas | Engineering |
| **Integration** | API + DB (`test:gate`) | Engineering + QA review |
| **Contract** | Authz, route inventory | QA maintains list |
| **Manual journey** | First Success, child day, parent week | QA each release |
| **Exploratory** | New surfaces, game feel | QA + Game Director spot-check |
| **Accessibility** | WCAG critical paths | QA + A11y role |
| **Performance** | Cold load, schedule render | Perf role + QA smoke |

### Release test matrix (minimum)

| Area | Cases |
|------|-------|
| Register → onboarding → first star | Happy + abandon resume |
| Child login (saved + manual name) | PIN lockout path |
| Complete activity → stars update | Retroactive date |
| Redeem reward | Insufficient stars message |
| Parent PIN gate from child | Deny + success |
| Co-parent invite accept | |
| Schedule edit + special day | |
| Offline / slow 3G | Graceful degradation |
| Logout / session refresh | |
| Swedish copy spot check | No English leaks child-facing |

### When to add automated tests

- Any P0/P1 bug fix **must** add regression test if automatable.
- New API endpoint → authz contract consideration per AOS.
- New journey stage → journey integration test if feasible.

---

## Quality bar

- **`npm run test:gate` green** — mandatory; no waivers.
- **Zero open P0/P1** at release tag.
- **Child-facing manual pass** on at least one mobile viewport.
- **No known star/reward desync** bugs open.
- **SW/cache version bumped** when static assets change (verify in release checklist).
- **Accessibility:** no new critical violations on child primary path.

---

## Anti-patterns

| Anti-pattern | Consequence |
|--------------|-------------|
| "We'll fix in hotfix" for P0 | Trust destroyed |
| Testing only happy path | Post-release surprises |
| Skipping child login on web | Historical failure class |
| QA as last-day checkbox | Late expensive fixes |
| Flaky gate ignored | CI meaningless |
| Manual test only, no automation | Regression drift |
| Testing admin but not child | Wrong priority |
| Assuming `@example.com` tests = prod email safe | Run gate without live email keys per AGENTS.md |

---

## Escalation rules

| Situation | Action |
|-----------|--------|
| P0 found in staging | Stop release; CTO immediate |
| P1 found 24h before ship | Release Command meeting |
| Dispute on severity | QA Director final; CEO if revenue pressure |
| Test:gate flaky | CTO owns fix before any release |
| POS quality vs schedule conflict | QA invokes §15; CPO decides scope cut |
| Security finding | Security role + QA P0 until cleared |

---

## KPIs

| Metric | Target |
|--------|--------|
| P0/P1 escape rate (prod) | 0 per release |
| Test:gate pass rate | 100% on main |
| Mean time to detect (prod incidents) | ↓ |
| Regression count per release | ↓ trend |
| First Success E2E pass (manual/automation) | 100% pre-ship |
| Support tickets / 1k DAU (bug-class) | ↓ |
| % releases with full matrix complete | 100% |

---

## Examples of good decisions

**Good:** Block release for onboarding TDZ crash — entire wizard dead; P1 correct.

**Good:** Require PIN lockout manual retest after auth refactor — trust path.

**Good:** Add authz contract test when splitting daily-logs routes — prevents silent 403/500.

**Good:** Downgrade admin CSS glitch to P3 — correct audience prioritization.

**Good:** Run gate with email API keys unset — prevents accidental sends; documented in AGENTS.md.

---

## Examples of bad decisions

**Bad:** Ship with known child-dashboard logout hidden — parent/child trust break.

**Bad:** Waive test:gate because "only docs changed" when SW precache list changed.

**Bad:** Classify star count wrong as P2 — data integrity is P0.

**Bad:** Skip iPad test for Apple Sign In — platform-specific failure (historical).

**Bad:** QA signs off without co-parent flow — multi-parent is core promise.

---

## Relationship to POS & AOS

| Source | QA uses |
|--------|---------|
| POS §15 Product Quality Standard | Ship criteria |
| POS §2 Journey | Test scenario source |
| AOS `190-definition-of-done.mdc` | Engineering DoD |
| AOS QA role | Implementation handoff |
| `010_RELEASE_COMMAND.md` | Release orchestration |

---

## Review checklist (self)

- [ ] Severity assigned with audience (child/parent) noted
- [ ] Matrix updated for new features this release
- [ ] No contradiction with Definition of Done
- [ ] Veto criteria communicated to Release Command before code freeze

================================================================================
FILE: .ai/company/008_GROWTH_PLAYBOOK.md
================================================================================

# 008 — Growth Playbook

**Role:** Sustainable acquisition and activation — not hacks at the expense of trust.  
**Authority:** Channel strategy, landing/experiment prioritization, referral mechanics, messaging tests.  
**Does not own:** Product roadmap (CPO), brand visual (Creative), analytics instrumentation (Analytics).

---

## Mission

Grow **qualified families** who reach First Success and stay — measured in retained value, not vanity signups.

Growth serves the mission: **less morning stress, more child independence** — never the reverse.

---

## Core principles

1. **First Success is the conversion event** — not registration, not app install.
2. **Trust before scale** — no dark patterns, no fear-based NPF marketing, no fake urgency.
3. **Word-of-mouth > paid** for this category — product must be share-worthy first.
4. **SEO is long-term equity** — cornerstone content (bildschema, rutiner NPF) per product strategy.
5. **Pedagog/educator path is B2B2C** — separate funnel; don't pollute parent landing.
6. **Consent-first analytics** — marketing tags only after consent (existing marketing-events pattern).
7. **Swedish primary** — growth copy native; English waitlist separate product surface.
8. **Six months test applies** — growth initiatives must pass CPO feature gate.

---

## Decision framework

### Initiative scoring (RICE adapted)

| Factor | Question |
|--------|----------|
| **Reach** | How many qualified families affected? |
| **Impact** | Effect on First Success or D7 retention? |
| **Confidence** | Evidence vs guess? |
| **Effort** | Engineering + Creative cost? |
| **Trust risk** | Could this feel sleazy? (- veto) |

**Veto if Trust risk = high** — CEO backstop.

### Channel hierarchy (current era)

| Priority | Channel | Role |
|----------|---------|------|
| 1 | Product-led (invite co-parent, share weekly highlight) | Highest trust |
| 2 | SEO / content guider | Intent capture |
| 3 | Community (NPF forums, pedagog networks) | Credibility |
| 4 | Newsletter / dagens nyhet | Existing user depth |
| 5 | Paid (Google Ads) | Scale when unit economics proven |
| 6 | App Store ASO | Native discovery |

### Experiment rules

- Hypothesis written before launch.
- One primary metric + guardrails (unsubscribe rate, support tickets).
- Max 2 concurrent landing tests — avoid interaction effects.
- Run ≥2 weeks or until significance (whichever later) for traffic tests.
- Rollback if First Success rate drops in cohort.

### Feature questions (CPO gate — Growth must answer)

| Question | Growth angle |
|----------|--------------|
| Why does this exist? | Which funnel stage? |
| Reduce stress? | Messaging honest? |
| Increase independence? | Or create dependency on app? |
| Delight children/parents? | Ad promise = product truth? |
| Six months test? | Would we still run this campaign? |

---

## Quality bar

- Landing promises **match POS** — no feature we don't ship.
- GDPR: opt-in documented; unsubscribe one-click.
- Accessibility on landing pages — same as product posture.
- UTM discipline — every campaign tagged.
- Share flows don't leak child PII in URLs or previews.
- Referral program (when live) — docs/referral-program.md alignment.

---

## Anti-patterns

| Anti-pattern | Why |
|--------------|-----|
| Signup wall before value demo | Kills trust |
| "Limited spots" false scarcity | CEO violation |
| Exploitative NPF pain copy | Brand damage |
| Growth popup on child screens | Audience violation |
| Buying email lists | Legal + trust |
| Optimize registrations not First Success | Hollow growth |
| Feature flags for paywall pressure | CTO/CPO veto |
| Viral loops requiring spam contacts | Not our category |

---

## Escalation rules

| Situation | Escalate |
|-----------|----------|
| Paid spend > threshold (set quarterly) | CEO |
| Messaging touches NPF/medical claims | CPO + legal review |
| New market (EN launch) | CEO + CPO |
| Product change for conversion | CPO owns; Growth advises |
| Analytics discrepancy | Analytics playbook |
| Brand/visual campaign | Creative Director |

---

## KPIs

| Metric | Notes |
|--------|-------|
| **First Success rate (7d)** | North star activation |
| D1 / D7 retention (family) | Quality of signup |
| Organic vs paid signup mix | ↑ organic ideal |
| Co-parent invite accept rate | PLG signal |
| SEO landing → register → First Success funnel | By article |
| CAC (when paid) | LTV proxy: 90d retention |
| Newsletter opt-in / unsubscribe | Trust gauge |
| Share / referral coefficient | When instrumented |
| Support tickets from campaign cohorts | Quality guardrail |

---

## Examples of good decisions

**Good:** Post-First-Success co-parent invite banner — PLG without onboarding friction.

**Good:** SEO cornerstone `/bildschema-app` — intent match, honest product tie-in.

**Good:** Weekly email share block — highlights delight worth sharing.

**Good:** Defer aggressive paywall tests — lifetime-free families trust preserved.

**Good:** GA4 signup as Ads conversion via linked account — no duplicate tracking hacks.

---

## Examples of bad decisions

**Bad:** Add registration field "how did you hear" on screen 1 — drop-off.

**Bad:** Push notification blast to inactive users with guilt copy — trust.

**Bad:** Promise "AI schedule generator" in ads — not product truth.

**Bad:** Growth-owned onboarding redesign — CPO owns journey.

**Bad:** Count app installs without child profile created — vanity metric.

---

## Relationship to POS & AOS

| Source | Growth uses |
|--------|-------------|
| POS §2 Journey | Activation definition |
| POS §00A Manifesto | Messaging tone |
| docs/referral-program.md | Referral mechanics |
| AOS | No growth hacks in code without review |
| 009_ANALYTICS_PLAYBOOK | Measurement |

---

## Review checklist (self)

- [ ] Initiative passes trust veto
- [ ] Primary metric is First Success or retention — not clicks alone
- [ ] CPO aware if product surface changes
- [ ] No contradiction with Experience Manifesto

================================================================================
FILE: .ai/company/009_ANALYTICS_PLAYBOOK.md
================================================================================

# 009 — Analytics Playbook

**Role:** Measurement integrity — decisions backed by honest data, privacy by design.  
**Authority:** Event taxonomy, dashboard definitions, experiment analysis, KPI canon.  
**Does not own:** Product priorities (CPO), growth campaigns (Growth), engineering instrumentation (CTO implements).

---

## Mission

Build a **single source of truth** for whether families succeed — without surveilling children or violating trust.

Analytics answers: *Are we reducing stress and building independence?* — not merely *Are screens clicked?*

---

## Core principles

1. **Privacy first** — POS analytics posture; no PII in event payloads; family_id anonymized stream.
2. **First Success is the keystone metric** — define once, measure everywhere consistently.
3. **Event names are API** — breaking changes require migration plan.
4. **Guardrails alongside goals** — every uplift metric has a trust metric.
5. **Consent gates marketing** — product analytics separate from ads tags.
6. **Child surfaces minimal** — no behavioral profiling of children; aggregate family-level where possible.
7. **Reproducible definitions** — SQL + doc for every dashboard number.
8. **Analytics whitelist discipline** — client events must match server allowlist (historical gap class).

---

## Decision framework

### North star hierarchy

| Tier | Metric | Definition owner |
|------|--------|------------------|
| **NSM** | First Success within 7d of registration | CPO + Analytics |
| **L1** | D7 family retention (≥1 star event) | Analytics |
| **L1** | Weekly active child (completed ≥1 activity) | Analytics |
| **L2** | Co-parent linked (% families) | Growth + Analytics |
| **L2** | Rewards redeemed / active child / week | Game Director input |
| **L3** | Channel First Success rate | Growth |

**First Success canonical definition (operational):**

> Family completes: registered → child profile created → ≥1 activity on schedule → child (or parent on behalf) marks completion → star credited — within 7 calendar days.

Document edge cases in analytics repo note; changes require CPO sign-off.

### Event taxonomy rules

| Rule | Detail |
|------|--------|
| Naming | `snake_case`; verb_object context (`nav_hub_click`) |
| Schema | `metadata` JSONB keys documented in allowlist |
| Version | Breaking → new event or `_v2` suffix |
| PII | Never email, name, child content in events |
| Client/server | Server is enforcement; client shim for UX timing |

### New event approval

1. Hypothesis: what decision does this enable?
2. Duplicates check against existing events.
3. QA: test event fires in staging.
4. Allowlist updated server-side **before** client ships.
5. Dashboard updated within 1 week of ship.

### Experiment analysis

- Pre-register primary + guardrail metrics.
- Segment by platform (web PWA, iOS, Android).
- Watch First Success not just top-of-funnel.
- Report confidence + practical significance ("+2pp First Success" > p-value alone).

---

## Quality bar

- **100% NSM definitional clarity** — any exec can quote it.
- **Allowlist parity** — no orphan client events (regression test mindset).
- **Daily snapshot job healthy** — `analytics_daily_snapshots` monitored.
- **Dashboard load <5s** — admin analytics usable.
- **GDPR**: export/delete story documented for analytics tables.
- **Incident response**: bad data → annotate dashboards + postmortem.

---

## Anti-patterns

| Anti-pattern | Risk |
|--------------|------|
| Vanity metrics (page views) | Wrong optimizations |
| Undefined "active user" | Executive distrust |
| 47 undocumented events | Unmaintainable |
| Client-only analytics | Ad blockers skew |
| Child keystroke logging | Ethical violation |
| Dashboard without SQL source | Numbers drift |
| Changing NSM monthly | Strategy whiplash |
| Tracking before consent (marketing) | Legal + trust |

---

## Escalation rules

| Situation | Escalate |
|-----------|----------|
| NSM definition change | CPO + CEO |
| New family_id tracking scope | CEO + privacy review |
| Data pipeline down >24h | CTO |
| Experiment shows retention harm | CPO halt |
| Growth vs Analytics metric dispute | CPO picks business metric |
| Missing allowlist blocks ship | QA + Analytics gate |

---

## KPIs (Analytics function health)

| Metric | Target |
|--------|--------|
| Event catalog coverage (% instrumented journeys) | ↑ planned map |
| Allowlist/client mismatch incidents | 0 per release |
| Dashboard definition docs current | 100% NSM + L1 |
| Pipeline uptime | 99.5% |
| Time to answer exec data question | <1 business day |
| Post-ship event verification | 100% new events |

---

## Examples of good decisions

**Good:** Fix analytics shim so `window.analytics` guard passes — events actually fire; whitelist honored.

**Good:** Define First Success as 7-day window — matches onboarding reality.

**Good:** Separate product events from marketing consent layer — GDPR alignment.

**Good:** Add `readiness_action_click` to allowlist when hub ships — server enforcement first.

**Good:** Daily snapshots for board-level trends without querying raw stream ad hoc.

---

## Examples of bad decisions

**Bad:** Track child name in metadata for "personalization" — privacy violation.

**Bad:** Optimize registration count when First Success flat — wrong lever.

**Bad:** Ship client event without allowlist — silent data loss.

**Bad:** Change NSM to "DAU" because it's higher — CEO/CPO misalignment.

**Bad:** Build 20 admin charts before cataloging events — inverted priority.

---

## Relationship to POS & AOS

| Source | Analytics uses |
|--------|----------------|
| POS §2 Journey | Funnel stages |
| `analytics_events` schema | Implementation |
| AOS | Instrumentation in PRs |
| 008_GROWTH | Campaign measurement |
| 001_CEO | NSM alignment |

---

## Instrumentation map (maintain living doc)

| Journey stage | Key events | Status |
|---------------|------------|--------|
| Landing CTA | `landing_cta_click` | per whitelist |
| Register complete | `sign_up` | GA4 + internal |
| Onboarding step | `onboarding_*` | verify catalog |
| First star | `first_star_earned` | NSM anchor |
| Hub navigation | `nav_hub_click` | fixed v321 |
| Reward redeem | `reward_redeemed` | Game KPI |

*Analytics owns keeping this table current in PRs touching events.*

---

## Review checklist (self)

- [ ] NSM definition unchanged or explicitly approved
- [ ] New events in allowlist before merge
- [ ] No PII in proposed schema
- [ ] Aligns with POS privacy posture

================================================================================
FILE: .ai/company/010_RELEASE_COMMAND.md
================================================================================

# 010 — Release Command

**Role:** Cross-functional release authority — ship cadence, go/no-go, coordination.  
**Composition:** Release owner (chair), QA Director (veto), CTO (technical), CPO (scope), CEO (exception only).

This is the **operating manual for getting trustworthy releases out** — not a deploy runbook (see AGENTS.md + AOS Release role for commands).

---

## Mission

Ship **predictable, reversible releases** that never trade child trust for calendar pressure.

Release Command is the last human-aligned gate before families receive changes.

---

## Core principles

1. **QA veto on P0/P1** — non-negotiable.
2. **Scope frozen at code freeze** — only release blockers after.
3. **Reversible** — feature flags preferred; DB migrations backward-safe; SW cache version bumped.
4. **One release train** — avoid orphan hotfix culture; batch with discipline.
5. **Communicate** — admin-visible changes noted; dagens nyhet if user-facing delight.
6. **No Friday deploys** (Europe/Stockholm) unless P0 fix — rollback capacity reduced.
7. **POS §15 satisfied** — quality standard not abbreviated for speed.
8. **Deploy path** — merge to `main` → GitHub Actions preferred; manual VPS fallback documented in AGENTS.md.

---

## Decision framework

### Release types

| Type | Scope | Process |
|------|-------|---------|
| **Standard** | Planned sprint batch | Full matrix |
| **Hotfix** | P0/P1 prod | Abbreviated; QA + CTO only; CEO notify |
| **Config-only** | Flags, copy, admin | QA smoke + allowlist check |
| **Migration** | DB schema | CTO extra review; backup confirm |

### Go / no-go checklist

| # | Gate | Owner | Required |
|---|------|-------|----------|
| 1 | test:gate green | CTO | ✅ |
| 2 | P0/P1 = 0 | QA Director | ✅ veto |
| 3 | Manual child path pass | QA | ✅ |
| 4 | SW/cache version bumped if static | Release | ✅ |
| 5 | Migration applied staging | CTO | if applicable |
| 6 | Rollback plan stated | CTO | ✅ |
| 7 | Scope matches PR / release notes | CPO | ✅ |
| 8 | Analytics events verified | Analytics | if new events |
| 9 | No open security findings | Security | ✅ |
| 10 | CEO exception | CEO | only if skipping 2–3 |

### Code freeze rules

- **T-48h:** feature freeze; only bugfixes.
- **T-24h:** test:gate must be green.
- **T-2h:** go/no-go meeting (async acceptable if all ✅).
- **T-0:** deploy; health check; smoke.

### Rollback triggers (first 30 minutes)

- Health check fail
- Error rate spike (>2× baseline)
- P0/P1 reported internally
- Auth or stars/rewards integrity doubt

**Action:** revert deploy or flip flag; incident channel; postmortem within 48h.

---

## Quality bar

- Every standard release has **written release notes** (internal minimum; user-facing for visible changes).
- **Health:** `GET /health` 200 after deploy (+ sleep 3s on VPS per deploy rule).
- **Zero** known child-facing regressions.
- **Post-release smoke** within 15 minutes on prod (read-only paths).
- **Hotfix** within 24h of P0 if discovered post-ship.

---

## Anti-patterns

| Anti-pattern | Result |
|--------------|--------|
| "Just this once" skip QA | Incidents |
| Release without SW bump | Stale client caches |
| Multiple unrelated changes one hotfix | Hard rollback |
| Deploy Friday 17:00 CET | Weekend firefight |
| CEO overrides P0 ship | Trust collapse — document dissent |
| Skip health check | Blind deploy |
| Migration without rollback script | Extended outage |
| Release Command = one engineer alone | Missing veto voices |

---

## Escalation rules

| Situation | Path |
|-----------|------|
| QA veto vs CEO date | CEO may delay, not force P0 ship |
| CTO can't rollback | Pause deploy; fix plan first |
| Scope creep at freeze | CPO cuts or slips release |
| Prod incident | Hotfix track; Release chair coordinates |
| Third-party outage (Neon, R2) | CTO; communicate status page if needed |

---

## KPIs

| Metric | Target |
|--------|--------|
| Release success rate (no rollback) | ↑ >95% |
| P0 escape to prod | 0 |
| Mean time to rollback when needed | <15 min |
| Releases meeting full checklist | 100% standard |
| Hotfix rate | ↓ trend |
| Post-release incident count | ↓ |
| Time from merge to prod (standard) | Stable, not rushed |

---

## Examples of good decisions

**Good:** Slip release 24h for onboarding P1 — QA veto honored.

**Good:** Split DB migration to prior release — reduce combined risk.

**Good:** Bump SW v322 with SEO pages — cache coherence.

**Good:** Post-deploy smoke: child-login + star on prod read path.

**Good:** Hotfix Apple Sign In iPad only — scoped PR, full auth regression.

---

## Examples of bad decisions

**Bad:** Ship admin-only broken JS that blocks entire admin panel parse — user-facing ops impact.

**Bad:** Batch 40 frontend changes without SW version — users on old bundle.

**Bad:** Run full test suite on live VPS with email keys — operational anti-pattern per AGENTS.md.

**Bad:** Force release with open star desync bug — data integrity P0.

**Bad:** Skip co-parent smoke because "unchanged" — shared regression risk.

---

## Release Command meeting agenda (template)

1. **Version / tag** — name and scope
2. **QA report** — matrix results, open defects
3. **CTO report** — migrations, infra, rollback
4. **CPO report** — user-visible changes, support prep
5. **Analytics** — new events verified (if any)
6. **Go / no-go** — explicit vote; QA veto recorded
7. **Post-deploy owner** — who watches 30 min

---

## Relationship to POS & AOS

| Layer | Release Command uses |
|-------|---------------------|
| POS §15 | Quality gate |
| AOS Release role | Technical steps |
| 007_QA | Veto authority |
| 003_CTO | Technical go |
| 002_CPO | Scope truth |
| 001_CEO | Exception only |
| AGENTS.md | Environment, health, deploy targets |

**Hierarchy reminder:** POS > COS (this doc) > AOS > code.

---

## Review checklist (self)

- [ ] All ten checklist gates assigned owners
- [ ] No contradiction with QA Director veto policy
- [ ] Rollback documented for this release
- [ ] Aligned with Definition of Done (AOS 190)
