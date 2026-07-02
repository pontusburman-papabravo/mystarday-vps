# Organizational Knowledge Index

**Maintained by:** CTO / Org Health  
**Updated:** 2026-07-02 (MO002 — Home pack refactor)  
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
| **Garden** | Ambient scenery | ⚠️ | Still hardcoded `AMBIENT_SCENERY` — next refactor target |
| **Garden** | Living objects | ✅ | `living-objects.json` sunflower loop |
| **Platform runtime** | Orchestrator | ✅ | Flag default OFF |

**Reference implementation pattern:** progression nodes + unlock_feedback + ambient_props in pack → playable module reads pack only.

---

## Repository map (world systems)

```
config/experience-packs/child_se/
  manifest.json · progression.json · worlds.json · living-objects.json
src/lib/
  morgonhus-playable.js    ← Home scene builder
  garden-playable.js       ← Garden ambient (refactor pending)
  platform-runtime/        ← Progression unlock pipeline
  living-world-access.js   ← Feature gate per world
public/js/
  child-morgonhus.js · child-garden.js · child-world.js
src/routes/
  morgonhus.js · garden.js (if exists)
```

---

## Open gaps

| ID | Gap | Priority | Next mission |
|----|-----|----------|--------------|
| GAP-005 | Garden AMBIENT_SCENERY hardcoded | P1 | Garden pack refactor (vertical slice) |
| GAP-002 | lint:public CI budget | P2 | Engineering debt |
| GAP-003 | PCB worlds 3–7 not in pack | P3 | Human creative |

---

## Backlog

`.ai/knowledge/BACKLOG.md`
