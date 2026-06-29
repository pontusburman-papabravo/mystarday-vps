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
