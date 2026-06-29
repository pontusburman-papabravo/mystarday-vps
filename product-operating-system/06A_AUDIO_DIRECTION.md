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
