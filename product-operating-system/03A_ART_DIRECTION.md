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
