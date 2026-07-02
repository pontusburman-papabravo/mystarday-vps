# Entity Bible — Objects & NPCs

**Version:** 1.0 (skeleton)  
**Status:** Production template — one row per entity before art or code  
**Authority:** World Bible scene → this Bible → Animation Bible → Prompt Catalog  
**Cross-ref:** LWES §68, Appendix G · Art Bible §25–41

---

## Purpose

Every **object, creature, NPC, build slot, and navigation node** in Min värld gets one normative entry. No entity ships from an idea — only from this catalog.

---

## Entity entry schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `entity_id` | string | ✓ | Unique within scene (or global for persistent NPCs) |
| `scene_id` | string | ✓ | Host scene |
| `display_name_sv` | string | | Child-nameable; blank = environmental |
| `type` | enum | ✓ | LWES Appendix G: Creature, Decoration, BuildSlot, NavigationNode, … |
| `components` | string[] | ✓ | Closed enum: Renderable, Interactable, Animated, Persistent, Pet, … |
| `layer` | string | ✓ | Compositing layer (Art Bible + LWES Part III) |
| `position` | object | ✓ | `{ x, y }` normalised 0–1 or `slot_id` |
| `theme_skin_key` | string | ✓ | Resolves art variant per world theme |
| `interact_verbs` | string[] | | Appendix D verbs: pet, open, sit, … |
| `emotion_on_interact` | enum | | Single primary (Appendix H.1) |
| `persistence` | enum | ✓ | persistent · session · ephemeral |
| `nameable` | bool | | Child can assign name (LWES §108.2) |
| `emotional_object` | bool | | MUST NOT disappear without explicit action |
| `story_role` | string | | story_anchor · ambient · reward · navigation |
| `animation_refs` | string[] | | Animation Bible semantic IDs |
| `audio_refs` | string[] | | Audio Bible one-shot / loop IDs |
| `art_prompt_id` | string | | Art Prompt Catalog number (e.g. `0042`) |
| `progression_unlock` | string | | WDB / Progression Bible key |
| `metadata` | object | | Pack-opaque extensions |

---

## Example — `dog_companion` (Hunden)

```yaml
entity_id: dog_companion
scene_id: home_hall
display_name_sv: ""                    # Child names via naming flow
type: Creature
components:
  - Renderable
  - Interactable
  - Animated
  - Persistent
  - Pet
  - LivingObject
layer: mid_ground
position: { x: 0.42, y: 0.68 }
theme_skin_key: dog_golden_retriever_v1
interact_verbs: [pet, call, follow_hint]
emotion_on_interact: comfort
persistence: persistent
nameable: true
emotional_object: true
story_role: story_anchor
animation_refs:
  - dog_idle_01
  - dog_idle_02
  - dog_idle_03
  - dog_walk
  - dog_stretch
  - dog_sleep
  - dog_greet
audio_refs:
  - dog_pant_soft
  - dog_tail_thump
  - dog_sniff
art_prompt_id: "0018"
progression_unlock: progression.routine_home.npc_mira   # arrives with companion beat
metadata:
  pet_species: dog
  follows_child: soft                     # familiarity weight, not engagement score
  pretend_affordances: [pretend_feed, pretend_sleep_beside]
  director_tier: medium                   # LWES Director budget
  copy_rules: no_speech                   # behaviour only, never dialogue
```

---

## Definition of Done (per entity)

- [ ] All `components[]` valid per LWES Appendix G
- [ ] Animation Bible clips exist for each `animation_refs[]`
- [ ] Art Prompt Catalog entry approved (QG pass)
- [ ] Interact beats declared (LWES Appendix H.2) if rewarded
- [ ] World Bible scene lists entity in interactive budget

---

*No entity in `scenes.json` without a row here.*
