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
