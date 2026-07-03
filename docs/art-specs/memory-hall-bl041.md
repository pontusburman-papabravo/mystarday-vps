# Art spec — Minnesrummet (BL-041)

**Status:** Spec ready — illustration pending Art HRC  
**Governed by:** `docs/decisions/adr-memory-hall-bl012.md` (BL-012 approved)  
**Does not ship** until assets are approved and committed.

---

## Creative brief (non-negotiable)

| | |
|--|--|
| **What it is** | Child's warm memory room inside Min Värld — a safe place to feel proud |
| **What it is not** | Museum, trophy hall, shop, stats dashboard, leaderboard wall |
| **Primary emotion** | Pride |
| **Secondary** | Warmth, belonging, memory, ownership |
| **Tone** | Calm evening light; handcrafted diorama like Morgonhuset/Trädgården |
| **Avoid** | Gold trophies, glass cases, spotlights, scoreboards, casino sparkle, guilt cues |

Reference worlds: Morgonhuset (`scene@2x.webp`) and Trädgården (`scene-bg` srcset) — same illustration fidelity, softer palette.

---

## Scene composition

Portrait phone, thumb zone bottom third free for back FAB + exhibit row.

```
┌─────────────────────────────┐
│  soft window light (top R)  │  ← memory_hall_window hotspot
│                             │
│   wall with 3–6 frames      │  ← memory_hall_wall + exhibit slots
│   (empty wood frames,       │
│    not trophy cases)        │
│                             │
│  warm floor / rug           │
│                             │
│  [exhibit emoji row]        │  ← dynamic UI overlay (not in art)
│  [Tillbaka FAB]             │
└─────────────────────────────┘
```

Hotspot hit areas must remain clear in CSS (`mu-hotspot--window`, `mu-hotspot--wall`) — do not paint interactive UI chrome into the illustration.

---

## Asset register

| ID | Export name | Path | Dimensions | Notes |
|----|-------------|------|------------|-------|
| `memory-hall-scene` | `scene@2x.webp` | `public/images/child/world/memory-hall/scene@2x.webp` | 860×1280 px (@2x master) | Full room diorama; warm cream/amber; no text |
| `memory-hall-scene-430` | `scene-430.webp` | `public/images/child/world/memory-hall/scene-430.webp` | 430×640 | srcset small |
| `memory-hall-scene-860` | `scene-860.webp` | `public/images/child/world/memory-hall/scene-860.webp` | 860×1280 | srcset medium |
| `memory-hall-scene-1280` | `scene-1280.webp` | `public/images/child/world/memory-hall/scene-1280.webp` | 1280×1920 | srcset large |
| `memory-hall-frame-empty` | `frame-empty@2x.webp` | `public/images/child/world/memory-hall/frame-empty@2x.webp` | 120×120 @2x | Subtle wood frame for empty exhibit slot (optional CSS fallback) |
| `memory-hall-frame-filled` | `frame-glow@2x.webp` | `public/images/child/world/memory-hall/frame-glow@2x.webp` | 120×120 @2x | Soft warm glow when slot has memory — no sparkle burst |

**Art Bible source name:** `stjarndag-memory-hall-scene-v1-@2x.webp` → rename on import per `docs/child-image-assets.md`.

---

## Color palette (guide)

| Token | Hex | Use |
|-------|-----|-----|
| `mu-cream` | `#f7f0e4` | Wall wash (matches morgonhus) |
| `mu-amber` | `#e8c9a0` | Window light spill |
| `mu-wood` | `#c4a882` | Frames, floor boards |
| `mu-shadow` | `rgba(27, 35, 64, 0.12)` | Scene edge depth |

CSS scaffold already uses these in `child-memory-hall.css` — illustration should harmonize, not fight gradients.

---

## Integration checklist (post-approval)

1. Commit WebP files to paths above
2. Add `memory-hall-asset-pipeline.js` mirroring `garden-asset-pipeline.js` OR extend garden pipeline pattern
3. `child-memory-hall.js` — `<picture>` srcset on `.mu-scene-canvas`
4. `child-memory-hall.css` — `.mu-scene.is-illustrated` background like `.mh-scene.is-illustrated`
5. Bump `public/sw.js` + `config/cache-version.json`
6. Update `docs/child-image-assets.md` status → `godkänd`
7. Visual QA: portrait iPhone Safari, reduced-motion, 44pt hotspots still tappable

---

## Acceptance (Art HRC)

- [ ] Child tester (7–10) says "mysigt" / "det är mitt" — not "museum" or "butik"
- [ ] No trophy-case or shop shelving visual language
- [ ] Frames read as "my memories" not "high score"
- [ ] Window hotspot visually distinct from wall
- [ ] Safe on mid-range Android WebView at 60fps (static image + CSS only)
