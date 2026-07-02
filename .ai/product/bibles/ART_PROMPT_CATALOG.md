# Art Prompt Catalog — Numbered Production Prompts

**Version:** 1.0 (skeleton)  
**Status:** Numbered prompt sheets — 2–5 A4 per entry  
**Authority:** Entity Bible `art_prompt_id` → this Catalog → Art Bible QG  
**Cross-ref:** [PROMPT_BIBLE.md](./PROMPT_BIBLE.md) schema · [ART_BIBLE.md](../ART_BIBLE.md)

---

## Purpose

**Numbered prompts (0001+)** are the only approved source for illustration generation. Each entry spans 2–5 A4 pages: hero sheet, variants, export specs, QG checklist.

---

## Catalog entry schema

| Field | Required | Notes |
|-------|----------|-------|
| `catalog_id` | ✓ | Zero-padded: `0001`, `0018` |
| `title` | ✓ | Production name |
| `entity_id` | ✓ | Entity Bible link |
| `scene_id` | ✓ | World Bible link |
| `status` | ✓ | draft · review · approved · shipped |
| `sheets` | ✓ | 2–5 A4 sections (see below) |
| `qg_passed` | | Art Bible QG IDs |
| `version` | ✓ | Semver per entry |

### Sheet types (2–5 per entry)

| Sheet | Content |
|-------|---------|
| **A — Hero** | Main prompt per Prompt Bible; full composition |
| **B — Variants** | Alt angles, seasons, damage states |
| **C — Motion** | Frames or motion intent for Animation Bible |
| **D — Export** | Sizes, naming, pivot, alpha rules |
| **E — QG** | Checklist sign-off |

---

## Example — `0001` Home Exterior

```yaml
catalog_id: "0001"
title: Home Exterior — hero facade
entity_id: home_exterior_bg
scene_id: home_exterior
status: draft
version: 0.1.0
sheets:
  A_hero:
    subject: Nordic family house exterior, child-scale warmth, morning
    composition: >
      House centered; door lower third; sky 40%; garden foreground 15%;
      path leading to door; mailbox right of door.
    camera: Child eye height; slight wide; no distortion
    lighting: Golden morning; soft shadows east
    palette: Art Bible exterior_warm_wood, roof_slate_soft, garden_green_muted
    negative: No cars, no brand logos, no scary shadows, no text on house
    emotion: ownership
  B_variants:
    - season_summer: greener garden, open window
    - season_winter: light snow on roof (see evt_snow_morning)
    - time_evening: warm window glow
  C_motion:
    - curtain_window_subtle_sway
    - chimney_smoke_optional
  D_export:
  - scene-bg-430.webp / 860 / 1280 per child-image-assets.md
  - layers: sky, house, foreground_path separate
  - pivot: N/A background
  E_qg:
  - QG-012 palette compliance
  - QG-045 no stock aesthetic
  - QG-102 mobile readability 430px
```

---

## Example — `0018` Dog Golden Retriever

```yaml
catalog_id: "0018"
title: Dog — golden retriever companion
entity_id: dog_companion
scene_id: home_hall
status: draft
version: 0.1.0
sheets:
  A_hero:
    subject: Sitting puppy, calm, nameable companion
    # Full Prompt Bible fill — see PROMPT_BIBLE.md example
  B_variants:
    - idle_pose_set: idle01, idle02, idle03 standing/sitting
    - sleep_pose: curled
  C_motion:
    - walk cycle 8 frames
    - stretch 16 frames
    - greet 14 frames
  D_export:
  - 512×512 sprites; @2x webp
  - naming dog_golden_retriever_v1_*.webp
  E_qg:
  - QG-033 character readability
  - QG-088 reduced motion static fallback exists
```

---

## Numbering rules

| Range | Domain |
|-------|--------|
| 0001–0099 | Home world scenes + hero props |
| 0100–0199 | Home creatures & NPCs |
| 0200–0299 | Garden |
| 0300+ | Reserved per world (see World Bible) |

---

## Definition of Done (per catalog entry)

- [ ] Entity Bible row exists  
- [ ] Prompt Bible sections complete on Sheet A  
- [ ] Art Bible QG checklist signed (Sheet E)  
- [ ] Animation Bible refs for all Sheet C motions  
- [ ] `status: approved` before any AI/human generation run

---

*Do not generate art from chat ideas — only from `status: approved` catalog entries.*
