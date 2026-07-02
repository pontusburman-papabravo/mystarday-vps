# Audio Bible — Room Audio Layers

**Version:** 1.0 (skeleton)  
**Status:** Production template — one profile per scene + shared stems  
**Authority:** World Bible `audio_profile_id` → this Bible → implementation  
**Cross-ref:** Art Bible audio tokens · LWES Part III ambient amplitude

---

## Purpose

Defines **layered audio** per scene: always-on ambient, reactive one-shots, and event stingers. No scene ships without a declared profile.

---

## Audio profile schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `profile_id` | string | ✓ | Matches World Bible |
| `scene_id` | string | ✓ | |
| `master_gain` | number | ✓ | 0.0–1.0; calm scenes ≤0.7 |
| `layers` | layer[] | ✓ | See layer schema below |
| `duck_on_interact` | bool | | Lower ambient during beats |
| `night_variant_id` | string | | Optional alternate profile |

### Layer schema

| Field | Type | Notes |
|-------|------|-------|
| `layer_id` | string | Unique within profile |
| `type` | enum | loop · one_shot · reactive |
| `stem_ref` | string | File or semantic stem ID |
| `gain` | number | Relative to master |
| `pan` | number | Optional L/R |
| `trigger` | string | always · wind · interact · event |
| `cooldown_ms` | int | For one_shots |

---

## Example — `home_hall` (day)

```yaml
profile_id: home_hall_day
scene_id: home_hall
master_gain: 0.65
duck_on_interact: true
night_variant_id: home_hall_night
layers:
  - layer_id: amb_room_tone
    type: loop
    stem_ref: audio/home/hall_room_tone_warm.wav
    gain: 0.35
    trigger: always

  - layer_id: amb_birds_distant
    type: loop
    stem_ref: audio/home/birds_distant_morning.wav
    gain: 0.20
    trigger: always
    # Heard through window — links to home_exterior birds

  - layer_id: floor_creak
    type: one_shot
    stem_ref: audio/home/floor_board_creak_soft.wav
    gain: 0.25
    trigger: interact
    cooldown_ms: 45000

  - layer_id: curtains_breeze
    type: loop
    stem_ref: audio/home/curtains_light_rustle.wav
    gain: 0.15
    trigger: wind
    # Tied to weather layer when windy

  - layer_id: dog_pant_soft
    type: reactive
    stem_ref: audio/creatures/dog_pant_soft.wav
    gain: 0.30
    trigger: entity:dog_companion:near

  - layer_id: mailbox_clink
    type: one_shot
    stem_ref: audio/home/mailbox_metal_soft.wav
    gain: 0.40
    trigger: event:package_arrived
    cooldown_ms: 0
```

---

## Example — `home_exterior` (day)

```yaml
profile_id: home_exterior_day
scene_id: home_exterior
master_gain: 0.60
layers:
  - layer_id: amb_garden_birds
    type: loop
    stem_ref: audio/garden/birds_chirp_sparse.wav
    gain: 0.30
    trigger: always

  - layer_id: amb_grass_wind
    type: loop
    stem_ref: audio/garden/grass_wind_light.wav
    gain: 0.20
    trigger: always

  - layer_id: door_wood_knock_parent
    type: one_shot
    stem_ref: audio/home/door_knock_gentle.wav
    gain: 0.35
    trigger: event:parent_gift
```

---

## Rules

1. **No sound-only critical info** — POS a11y.  
2. **Loops MUST be seamless** — no audible seam on 60s repeat.  
3. **One-shots respect Director** calmness budget.  
4. **Night variants** required for scenes with day/night cycle.

---

*Stems listed in `public/audio/` manifest when implementation begins.*
