# Museum / Minneshallen — HRC-adjacent prep (BL-029)

**Status:** Reversible scaffold only — creative direction blocked (BL-012).  
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
| Playable worlds | `routine_home` + `garden` | Pack-driven scenes with feature gates |

**Naming collision:** `museum` = skatt stats room. Playable world 3 scaffold uses slug **`memory_hall`** to avoid API/JS conflicts.

---

## Scaffold delivered (IRC-013)

| Layer | Artifact | Gate |
|-------|----------|------|
| Feature | `memory_hall_playable` (`dev`, no allowlist) | Always 503 until admin grants |
| Pack | `worlds.json` → `memory_hall` ambient_scenery | Structural labels only |
| Exhibits | `exhibits.json` → slot_types + empty slots | Schema only; content HRC |
| Server | `src/lib/memory-hall-playable.js`, `GET /api/me/memory-hall` | `hasLivingWorldAccess` |
| Client | `child-memory-hall.js` + CSS | **Not** mounted in `child-dashboard.html` |
| Tests | `test/memory-hall-playable.test.js` | Empty/disabled states |

---

## Open creative questions (HRC — human decides)

1. **World identity:** Is world 3 a separate place (Minneshallen), an extension of garden path, or the morgonhus `routine_home_museum_frame` feature?
2. **Entry mechanic:** Door from garden? Path hotspot? Progression node unlock? Parent opt-in export?
3. **Content model:** Trophies only? Photos? Milestone ghosts? NPC curator?
4. **Tone:** Celebration vs calm reflection — POS comfort rule applies (no guilt for absence).
5. **Persistence:** New DB table vs reuse `child-progression-node` vs read-only aggregates from `daily_log`.

---

## Art-spec queue (no assets committed)

| Asset ID | View | Notes |
|----------|------|-------|
| `memory-hall-scene` | Full scene `@2x.webp` | Diorama, calm lighting; reuse garden/morgonhus aspect |
| `memory-hall-entry` | Hotspot | Entry arch / doorway |
| `memory-hall-wall` | Hotspot | Empty frames for future exhibits |
| `memory-hall-exhibit-empty` | State token | Placeholder frame glow |

---

## API contract (draft)

```
GET /api/me/memory-hall
503 { error }           — feature off (default)
200 {
  enabled: true,
  world_slug: "memory_hall",
  display_name: string,
  first_enter_message: string,
  ambient_message: string,
  scenery: [{ scenery_id, label_sv, hotspot_class, ambient_message_sv }],
  exhibits: []           — future: trophy/photo slots
}
```

---

## Exhibit resolver (draft interface)

```javascript
// Future: src/lib/memory-hall-exhibit-resolver.js
resolveExhibitContent(childId, exhibitViews) → exhibitViews with content filled
// trophy → child_achievement rows
// milestone_frame → parent opt-in export (HRC)
```

Blocked until BL-012 defines slot content rules.

---

## After human approval checklist

- [ ] BL-012 creative direction locked
- [ ] Final copy in experience pack (replace scaffold labels)
- [ ] Scene art + exhibit tokens
- [ ] Entry transition from garden/morgonhus (if chosen)
- [ ] Allowlist test family → `family_features`
- [ ] Mount `child-memory-hall.js` in child dashboard + SW precache
- [ ] Living World Score review (comfort + wonder)
