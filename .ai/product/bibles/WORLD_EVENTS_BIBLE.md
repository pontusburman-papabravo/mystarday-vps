# World Events Bible — Event Catalog

**Version:** 1.0 (skeleton)  
**Status:** Production template — scripted world beats  
**Authority:** Progression Bible → this Bible → LWES Event Bus (Appendix A)  
**Cross-ref:** LWES §24 Surprise Engine · Director Appendix I

---

## Purpose

Catalog of **discrete world events** — Package arrives, Birthday, Snow, seasonal beats. Each event references entities, animations, audio, and Director budget cost.

---

## Event entry schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `event_id` | string | ✓ | Pack-unique |
| `display_name` | string | ✓ | Internal label |
| `category` | enum | ✓ | discovery · seasonal · parent · ambient · birthday |
| `trigger` | string | ✓ | calendar · parent_scheduled · progression · random_rare |
| `scene_ids` | string[] | ✓ | Where event may appear |
| `entity_refs` | string[] | | Entities involved |
| `animation_refs` | string[] | | |
| `audio_refs` | string[] | | |
| `director_surprise_cost` | int | ✓ | Appendix I budget |
| `cooldown` | string | ✓ | e.g. `30d`, `once_per_child`, `season` |
| `emotion` | enum | ✓ | |
| `copy_rules` | string | | No exposition; show don't tell |
| `skippable` | bool | ✓ | MUST true if blocks exit |
| `lwes_event_name` | string | | Bus event if applicable |

---

## Example entries

### Package delivery

```yaml
event_id: evt_package_arrived
display_name: Package at door
category: discovery
trigger: parent_scheduled OR progression:routine_home_door_threshold
scene_ids: [home_exterior]
entity_refs: [mailbox, package_prop]
animation_refs: [package_land_soft]
audio_refs: [mailbox_clink, package_thud_soft]
director_surprise_cost: 5
cooldown: once_per_trigger
emotion: curiosity
copy_rules: No "you got a package!" — child sees box, invents story
skippable: true
lwes_event_name: DiscoveryEventDelivered
```

### Birthday

```yaml
event_id: evt_birthday_mode
display_name: Birthday day
category: birthday
trigger: calendar:birthday_today
scene_ids: [home_exterior, home_hall]
entity_refs: [birthday_banner, birthday_gift_prop]
animation_refs: [banner_gentle_sway, gift_sparkle_subtle]
audio_refs: [birthday_melody_soft]
director_surprise_cost: 8
cooldown: 365d
emotion: belonging
copy_rules: Warmth not spectacle; ≤2s hero moment; Director birthday_mode flag
skippable: true
lwes_event_name: BirthdayModeActivated
```

### Snow morning

```yaml
event_id: evt_snow_morning
display_name: Snow overlay
category: seasonal
trigger: calendar:winter + weather:snow
scene_ids: [home_exterior, garden]
entity_refs: [snow_overlay, footprint_ephemeral]
animation_refs: [snow_fall_light]
audio_refs: [snow_muffle_ambient]
director_surprise_cost: 3
cooldown: season
emotion: wonder
copy_rules: Footprints ephemeral — fade naturally (LWES temporary memory)
skippable: true
lwes_event_name: WeatherChanged
```

### Letter in mailbox

```yaml
event_id: evt_letter_arrives
display_name: Letter in mailbox
category: discovery
trigger: progression OR ambient_rare
scene_ids: [home_exterior]
entity_refs: [mailbox, letter_prop]
animation_refs: [mailbox_flag_up]
audio_refs: [mailbox_clink]
director_surprise_cost: 4
cooldown: 7d
emotion: curiosity
copy_rules: Letter unreadable — child imagines sender
skippable: true
lwes_event_name: DiscoveryEventDelivered
```

### Shooting star (rare)

```yaml
event_id: evt_shooting_star
display_name: Shooting star
category: ambient
trigger: random_rare
scene_ids: [garden, home_exterior]
entity_refs: [sky_layer]
animation_refs: [shooting_star_trail]
audio_refs: []
director_surprise_cost: 8
cooldown: 30d
emotion: wonder
copy_rules: No prompt to look up — child may miss it; that is OK
skippable: true
lwes_event_name: RareAmbientEvent
```

---

## Rules

1. **Director must approve** — every event has `director_surprise_cost`.  
2. **No FOMO** — rare events can be missed without penalty.  
3. **Parent-scheduled events** (package, gift) require server trigger — never client-only.  
4. Events MUST link to Progression Bible when unlock-gated.

---

*Appendix A event names are normative; new events require LWES-compatible bus entry or ADR.*
