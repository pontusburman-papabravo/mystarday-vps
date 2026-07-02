# Entity Database — Future

**Status:** Stub — not active production yet  
**Authority:** [ENTITY_BIBLE.md](../../.ai/product/bibles/ENTITY_BIBLE.md) (skeleton)  
**Parent:** [World Database README](../README.md)

---

## Purpose

Shared **object contracts** reused across rooms — pets, furniture, trees, birds, props. Rooms reference entities by ID; entities do not duplicate per-room YAML.

Dual format (same philosophy as rooms):

| Future path | Content |
|-------------|---------|
| `entities/data/*.yaml` | Machine-readable — dimensions, interaction tier, theme skins, animation refs |
| `entities/specs/*.md` | Human — narrative role, ecology, QA |

---

## Planned entity types

| Spec | YAML contract | Used in rooms |
|------|---------------|---------------|
| `pet.md` | `pet.yaml` schema | hall, garden, pet_house |
| `furniture.md` | `furniture.yaml` | hall, bedroom, kitchen, reading_corner |
| `tree.md` | `tree.yaml` | garden, forest |
| `bird.md` | `bird.yaml` | home, garden, hall (window) |

---

## Cursor workflow (when active)

1. Read entity YAML — canonical stats and interaction tier  
2. Read room YAML — which `build_slots[]` or `interactive_objects[]` reference the entity  
3. Read theme variant resolver — `welcome_mat_{theme}` etc.  
4. Update Entity Bible row + room cross-refs together  

---

## Until then

Define new objects inline in room YAML (`hero_object`, `supporting_objects`) with `TBD` entity refs. Migrate to this catalog when Entity Bible v1 ships.

---

*Pointer only — no entity files created yet.*
