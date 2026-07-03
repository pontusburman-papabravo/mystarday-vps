# ADR — Memory Hall (Minnesrummet) creative direction

**ID:** ADR-memory-hall-bl012  
**Date:** 2026-07-03  
**Status:** Accepted (human approved BL-012)

---

## Context

World 3 in Min Värld needed creative direction. Codebase already had unrelated "museum" surfaces (Skattkammaren stats room, parent Familjemuseum). Playable worlds Morgonhuset and Trädgården established the pack-driven pattern.

---

## Decision

1. **Separate playable world** `memory_hall` — displayed as **Minnesrummet** (warm memory room, not museum).
2. **Primary emotion:** Pride. Secondary: warmth, belonging, memory, ownership.
3. **Content:** Meaningful memories, achievements as proud moments, remembered rewards — **no** aggregate stats, leaderboards, shop, trophy spam, streak pressure, or shame for absence.
4. **Entry:** Garden path (`garden_path`) gates to Minnesrummet when `memory_hall_playable` dev feature is allowlisted.
5. **Exhibit model:** Dynamic `proud_moment` + `remembered_gift` slots (max 6 visible), pack `exhibits.json` schema for future authored slots.
6. **Rollout:** Dev feature gate only — no live family rollout without separate HRC.

**Rejected:** Skattkammaren museum room upgrade (option C); morgonhus-only frame (option B) as sole world 3.

---

## Consequences

- Slug `memory_hall` retained; display copy uses Minnesrummet.
- `child-museum.js` (Skatt stats) unchanged — different surface.
- Art: scene illustration still pending; scaffold uses CSS placeholders.
- Parent export / milestone frames: future `warm_echo` slots require separate parent opt-in HRC.

---

## POS alignment

- 04 Child — protagonist explores; calm feedback
- 06 Game — world as reward; no grind/FOMO
- 09 World — pack-driven third world
- 15 Quality — reduced motion, 44pt touch, aria-live calm
