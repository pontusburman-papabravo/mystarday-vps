# Organizational Knowledge Index

**Maintained by:** CTO / Org Health  
**Updated:** 2026-07-02 (MO002 — Home + Garden pack refactor)  
**Purpose:** Living map — update after each mission

---

## Authority stack

| Layer | Location | Status |
|-------|----------|--------|
| POS | `product-operating-system/` | ✅ |
| COS | `.ai/company/ORGANIZATION.md` | ✅ v1.1 |
| PCB + bibles | `.ai/product/` | ✅ |
| Registry | `config/governance-registry.json` | ✅ 7 rules |
| Knowledge | `.ai/knowledge/` | ✅ |

---

## Min Värld — vertical slice status (MO002)

| Slice | Component | Status | Notes |
|-------|-----------|--------|-------|
| **Home** | Progression nodes | ✅ | `progression.json` — welcome_mat, first_light |
| **Home** | Ambient props | ✅ | Pack-driven `worlds.json` ambient_props (v1.0.2) |
| **Home** | Server scene | ✅ | `morgonhus-playable.js` — no hardcoded AMBIENT_PROPS |
| **Home** | Client scene | ✅ | `child-morgonhus.js` |
| **Home** | QA | ✅ | `morgonhus-playable.test.js` + structural pack tests |
| **Garden** | Ambient scenery | ✅ | Pack-driven `worlds.json` ambient_scenery (v1.0.3) |
| **Garden** | Server scene | ✅ | `garden-playable.js` — `buildSceneryFromPack()` |
| **Garden** | Client scene | ✅ | `child-garden.js` — dynamic `hotspot_class` from pack |
| **Garden** | QA | ✅ | `garden-playable-scene.test.js` + structural pack tests |
| **Garden** | Living objects | ✅ | `living-objects.json` sunflower loop |
| **Platform runtime** | Orchestrator | ✅ | Flag default OFF |

**Reference implementation pattern:** progression nodes + unlock_feedback + ambient_props / ambient_scenery in pack → playable module reads pack only → client renders pack-driven classes.

---

## Repository map (world systems)

```
config/experience-packs/child_se/
  manifest.json · progression.json · worlds.json · living-objects.json
src/lib/
  morgonhus-playable.js    ← Home scene builder (ambient_props)
  garden-playable.js       ← Garden ambient (ambient_scenery)
  platform-runtime/        ← Progression unlock pipeline
  living-world-access.js   ← Feature gate per world
public/js/
  child-morgonhus.js · child-garden.js · child-world.js
src/routes/
  morgonhus.js · garden.js
```

---

## Open gaps

| ID | Gap | Priority | Next mission |
|----|-----|----------|--------------|
| GAP-006 | Shared world-ambient helper (gate + scenery) | P2 | Extract after 3rd world |
| GAP-002 | lint:public CI budget | P2 | Engineering debt |
| GAP-003 | PCB worlds 3–7 not in pack | P3 | Human creative |

---

## Backlog

`.ai/knowledge/BACKLOG.md`
