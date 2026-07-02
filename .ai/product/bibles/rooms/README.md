# Room Catalog — DEPRECATED

> **⚠️ Canonical location moved:** [`docs/world/`](../../../docs/world/README.md)  
> **Rulebook (frozen):** [WORLD_BIBLE.md Part III RBS](../WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Do not add new room YAML here.**

---

## Migration map

| Legacy reference | Canonical path |
|------------------|----------------|
| `home_hall` pilot | [`docs/world/data/101-hall.yaml`](../../../docs/world/data/101-hall.yaml) |
| `home_exterior` | [`docs/world/data/100-home.yaml`](../../../docs/world/data/100-home.yaml) |
| `_TEMPLATE.yaml` (planned) | [`docs/world/_TEMPLATE.room.yaml`](../../../docs/world/_TEMPLATE.room.yaml) |
| Room catalog index | [`docs/world/README.md`](../../../docs/world/README.md) |

---

## Why deprecated

Creative Director course change (2026-07-02): **Production Specifications** live in `docs/world/` as a **world database** with dual YAML + Markdown per room. World Bible Part IV remains the **schema authority** in `.ai/product/bibles/WORLD_BIBLE.md`; concrete room data moved to `docs/world/data/`.

---

## Historical notes

This folder previously held Part IV room catalog stubs (`home_hall` first). Pack target remains `config/experience-packs/child_se/scenes.json` (LWES Appendix C).

**Priority order** (unchanged intent — see numbered catalog in `docs/world/README.md`):

1. Home (100) + Hall (101)  
2. Garden (110) — shipped slice `child-garden.js`  
3. Bedroom, kitchen, bathroom, attic (102–105)  
4. Workshop, museum, trophy, pet house, reading corner, forest, lake (120–180)  

---

*Redirect only. Edit room contracts in `docs/world/`.*
