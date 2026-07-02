# Animation Bible — Semantic Animation Catalog

**Version:** 1.0 (skeleton)  
**Status:** Production template — one clip definition per semantic animation  
**Authority:** Entity Bible → this Bible → implementation spritesheet  
**Cross-ref:** Art Bible §33–36 · LWES Part III · POS 03B (≤2000 ms, reduced motion)

---

## Purpose

**Semantic IDs** (`dog_idle_01`) map to frame data, timing, and loops. Engine plays by semantic name — never by raw filename in code.

---

## Animation entry schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `animation_id` | string | ✓ | Semantic ID (snake_case) |
| `entity_id` | string | ✓ | Parent entity |
| `display_name` | string | ✓ | Human label |
| `category` | enum | ✓ | idle · locomotion · react · ambient · celebrate |
| `frames` | int | ✓ | Frame count |
| `fps` | number | ✓ | Playback rate |
| `loop` | bool | ✓ | |
| `duration_ms` | int | ✓ | Total; celebrate ≤2000 on routine path |
| `easing` | string | | ease_in_out default |
| `trigger` | string | | ambient_auto · on_interact · on_event |
| `director_tier` | enum | | subtle · medium · hero |
| `reduced_motion_fallback` | string | ✓ | static_frame or crossfade |
| `spritesheet_ref` | string | ✓ | Asset path or catalog sheet ID |
| `audio_sync` | string | | Optional Audio Bible ref on frame N |
| `emotion` | enum | | Primary feeling during clip |

---

## Example — `dog_companion` clips

```yaml
# Idle variants — Director rotates; never simultaneous
- animation_id: dog_idle_01
  entity_id: dog_companion
  display_name: Dog Idle — breathe
  category: idle
  frames: 8
  fps: 8
  loop: true
  duration_ms: 1000
  trigger: ambient_auto
  director_tier: subtle
  reduced_motion_fallback: static_frame_0
  spritesheet_ref: sprites/dog_golden_retriever_v1_idle01.webp
  emotion: calm

- animation_id: dog_idle_02
  entity_id: dog_companion
  display_name: Dog Idle — ear flick
  category: idle
  frames: 12
  fps: 10
  loop: true
  duration_ms: 1200
  trigger: ambient_auto
  director_tier: subtle
  reduced_motion_fallback: static_frame_0
  spritesheet_ref: sprites/dog_golden_retriever_v1_idle02.webp
  emotion: curiosity

- animation_id: dog_idle_03
  entity_id: dog_companion
  display_name: Dog Idle — tail wag slow
  category: idle
  frames: 10
  fps: 10
  loop: true
  duration_ms: 1000
  trigger: ambient_auto
  director_tier: subtle
  reduced_motion_fallback: static_frame_0
  spritesheet_ref: sprites/dog_golden_retriever_v1_idle03.webp
  emotion: comfort

- animation_id: dog_walk
  entity_id: dog_companion
  display_name: Dog Walk
  category: locomotion
  frames: 8
  fps: 12
  loop: true
  duration_ms: 667
  trigger: on_nav_follow
  director_tier: medium
  reduced_motion_fallback: crossfade_to_idle_01
  spritesheet_ref: sprites/dog_golden_retriever_v1_walk.webp
  audio_sync: dog_paw_soft
  emotion: calm

- animation_id: dog_stretch
  entity_id: dog_companion
  display_name: Dog Stretch
  category: ambient
  frames: 16
  fps: 10
  loop: false
  duration_ms: 1600
  trigger: ambient_auto
  director_tier: medium
  reduced_motion_fallback: skip
  spritesheet_ref: sprites/dog_golden_retriever_v1_stretch.webp
  emotion: comfort

- animation_id: dog_sleep
  entity_id: dog_companion
  display_name: Dog Sleep
  category: idle
  frames: 4
  fps: 4
  loop: true
  duration_ms: 1000
  trigger: on_event_night_mode
  director_tier: subtle
  reduced_motion_fallback: static_frame_0
  spritesheet_ref: sprites/dog_golden_retriever_v1_sleep.webp
  emotion: comfort

- animation_id: dog_greet
  entity_id: dog_companion
  display_name: Dog Greet on Enter
  category: react
  frames: 14
  fps: 12
  loop: false
  duration_ms: 1200
  trigger: on_scene_enter_familiarity
  director_tier: medium
  reduced_motion_fallback: skip
  spritesheet_ref: sprites/dog_golden_retriever_v1_greet.webp
  audio_sync: dog_tail_thump
  emotion: belonging
```

---

## Rules

1. **Idle pools:** 3+ variants per ambient creature; Director picks one.  
2. **No animation >2000 ms** on routine interrupt path.  
3. **Every clip** has `reduced_motion_fallback`.  
4. **Celebrate** category requires LWES Appendix H beat linkage.

---

*Spritesheets generated only after Art Prompt Catalog + Art Bible QG pass.*
