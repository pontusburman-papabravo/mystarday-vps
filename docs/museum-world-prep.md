# Museum / Minnesrummet — HRC-adjacent prep (BL-029 / BL-012)

**Status:** BL-012 approved 2026-07-03 — see `docs/decisions/adr-memory-hall-bl012.md`  
**Does not ship to users** until `memory_hall_playable` is allowlisted and product approves content.

---

## Existing code audit

| Surface | Location | Role today |
|---------|----------|------------|
| Skattkammaren room `museum` | `child-skatt-house.js`, `child-museum.js` | Lifetime stats + year story (V4) — **not** playable world |
| Parent Familjemuseum | `family-museum.js`, `GET /api/family/museum` | Parent-facing aggregate stats |
| Universe room unlock | `universe-engine.js` (`museum` @ 100⭐) | Legacy skatt house progression |
| Room art asset | `public/images/child/world/rooms/museum@2x.webp` | Skatt room card illustration |
| WDB progression node | `routine_home_museum_frame` | Future morgonhus feature — export frame, not world 3 |
| Playable worlds | `routine_home` + `garden` + **`memory_hall` (dev)** | Pack-driven scenes with feature gates |

**Naming:** Skatt stats = `museum`. Playable world 3 = **`memory_hall`** / display **Minnesrummet**.

---

## Delivered (IRC-014 / BL-012)

| Layer | Artifact | Gate |
|-------|----------|------|
| ADR | `docs/decisions/adr-memory-hall-bl012.md` | Accepted |
| Feature | `memory_hall_playable` (`dev`, no allowlist) | Always 503 until admin grants |
| Pack | `worlds.json` → Minnesrummet copy; garden path gate | BL-012 pride tone |
| Exhibits | `exhibits.json` → `proud_moment`, `remembered_gift`, `warm_echo` | Dynamic resolver + schema |
| Server | `memory-hall-exhibit-resolver.js`, `memory-hall-playable.js` | Max 6 memories, no stats |
| Client | `child-memory-hall.js`, garden transition, CSS | Dev wiring in child-dashboard |
| Tests | creative-direction, playable, ambient gate, transition | 706 gate green |
| Art spec | `docs/art-specs/memory-hall-bl041.md` | Illustration pending Art HRC |

---

## Art-spec queue

See **`docs/art-specs/memory-hall-bl041.md`** — placeholder-free dimensions, palette, acceptance criteria.

---

## API contract (implemented)

```
GET /api/me/memory-hall
503 { error }           — feature off (default)
200 {
  enabled: true,
  world_slug: "memory_hall",
  display_name: "Minnesrummet",
  tone: "pride",
  first_enter_message: string,
  ambient_message: string,
  scenery: [{ scenery_id, label_sv, hotspot_class, ambient_message }],
  exhibits: [{ slot_id, slot_type, label_sv, content: { emoji, title } }]
}
```

---

## Exhibit resolver (implemented)

`src/lib/memory-hall-exhibit-resolver.js` — `resolveExhibitMemories(childId)`

- `proud_moment` ← `child_achievement` rows
- `remembered_gift` ← recent `reward_redemption` (approved/auto)
- Cap 6 visible; no streak/count/rank fields
- `warm_echo` — pack schema only; parent opt-in HRC (BL-042)

---

## After human approval checklist

- [x] BL-012 creative direction locked
- [x] Pack copy + exhibit slot types
- [x] Entry transition garden → Minnesrummet (dev gate)
- [x] Client mounted behind dev feature
- [ ] Scene art + exhibit frame tokens (BL-041 Art HRC)
- [ ] Parent opt-in `warm_echo` frames (BL-042)
- [ ] Allowlist test family → `family_features`
- [ ] Living World Score review (comfort + wonder)
