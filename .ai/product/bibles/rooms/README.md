# Room Catalog — Production Blueprints

**Version:** 1.0  
**Status:** In progress — `home_hall` pilot  
**Authority:** [WORLD_BIBLE.md Part III RBS](../WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs) → denna katalog → Entity / Animation / Audio / Prompt Bibles → implementation  
**Pack target:** `config/experience-packs/child_se/scenes.json` (ej skapad ännu — LWES Appendix C)

---

## Purpose

Production-ready **room specs** using the Room Blueprint Standard (RBS). Varje fil är single source of truth för ett rum — Design, Art, Engineering, Animation, Audio, AI Gen och QA läser samma YAML.

**Ingen art. Ingen kod. Ingen AI-bild.** förrän RBS-blueprinten är komplett (Part III Definition of Done).

---

## Priority order

Fyll i denna ordning:

| # | `room_id` | Display (sv) | Notes |
|---|-----------|--------------|-------|
| 1 | `home_hall` | Hallen | **Påbörjad** — hem centrum, trädgårdskoppling, comfort + fireplace hero |
| 2 | `hall` | Hall / entré | Yttre hall om separat från `home_hall` — TBD topologi |
| 3 | `bedroom` | Sovrummet | Nav från `home_hall` (LWES §67.2) |
| 4 | `kitchen` | Kök | Morgonhus-frukost progression (WDB) |
| 5 | `garden` | Trädgården | Shipped slice: `child-garden.js` — blueprint TBD |
| 6 | `trophy_room` | Troférum | Nav `door_trophy` från hall |
| 7 | `pet_room` | Husdjursrum | TBD topologi |
| 8 | `workshop` | Verkstaden | Part I topologi — kvarn-landmärke |
| 9 | `museum` | Museet | Glasdom-landmärke |

---

## File convention

| Fil | Innehåll |
|-----|----------|
| `<room_id>.yaml` | Full RBS enligt [`_TEMPLATE.yaml`](./_TEMPLATE.yaml) |
| `<room_id>.md` | Valfritt — Part I checklist-svar, QA-noter, screenshots |

---

## Cursor workflow

1. Läs [World Constitution](../WORLD_BIBLE.md) §1 + [Part I](../WORLD_BIBLE.md#part-i--world-topology--spatial-design) + Part III RBS.
2. Kopiera `_TEMPLATE.yaml` → `<room_id>.yaml`.
3. Fyll **alla** sektioner. Okänt = `TBD` med kommentar — **inte** utelämna sektion.
4. Verifiera Constitution + LWES §22 interaction types.
5. Skapa/uppdatera Entity Bible-rader för hero + interactives.
6. Först därefter: Art Prompt Catalog, assets, `scenes.json`, kod.

---

## Cross-references

| Dokument | Roll |
|----------|------|
| [WORLD_BIBLE.md](../WORLD_BIBLE.md) Part I | Topologi, landmärken, emotional geography |
| [WORLD_BIBLE.md](../WORLD_BIBLE.md) Part III | RBS schema |
| [LIVING_WORLD_ENGINE_SPEC.md](../../LIVING_WORLD_ENGINE_SPEC.md) | Runtime, interaction types, pack schema |
| [WORLD_DESIGN_BIBLE.md](../../WORLD_DESIGN_BIBLE.md) | WDB progression nodes |
| [ENTITY_BIBLE.md](../ENTITY_BIBLE.md) | Per-object rows |
| [docs/child-image-assets.md](../../../docs/child-image-assets.md) | Shipped asset IDs |

---

*Nästa: slutför `home_hall.yaml` → `garden.yaml` (befintlig implementation att dokumentera).*
