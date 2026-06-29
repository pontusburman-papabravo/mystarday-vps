# ADR-003 — World DSL

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Varje värld ska kunna definieras utan engine-deploy. Illustratörer, studios och AI-agenter behöver ett filformat.

## Problem

World logic inbäddad i JS/HTML förhindrar validering, versioning och parallellt world-byggande.

## Decision

- **Kanonical entry:** `world.yaml` eller `world.json` (YAML parse → JSON).  
- Valideras mot `world-manifest.schema.json` + länkade refs (`progression_ref`, scenes, npcs).  
- `$id` namespace: `urn:stjarndag:world-engine:v1:*` (schemas).  
- Engine laddar manifest vid world load; **Developer Runtime** validerar i CI (`dev.validateManifest`).  
- Inline eller `$ref` till externa filer — samma schema.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| TypeScript world modules | Kräver deploy; språk-låst |
| DB-only world def | Svår git review, dålig studio-handoff |
| Unity/Godot som source | Stack är web/Capacitor-first |

## Trade-offs

+ AI/studio kan generera världar offline.  
− Ref-upplösning och bundle-pipeline krävs.  
− Schema evolution kräver migrator (semver).

## Consequences

- World slug stable across packs (WDB).  
- `scripts/wdb_progression_nodes.py` → export till pack progression JSON, inte hårdkod i klient.  
- Breaking schema → ny ADR + migrator script.

## Migration Strategy

Befintliga seven worlds: generera manifest v1 från WDB progression maps + PCB metadata. Legacy hardcoded unlocks → `unlock_signal` i manifest.

## Related Documents

- `WORLD_DESIGN_BIBLE.md` §4 World Template  
- `WORLD_ENGINE.md` §13 World DSL  
- `.ai/product/world-engine/schemas/world-manifest.schema.json`

## Future Revisions

Procedural/regional world generation hooks; multi-file bundle signing.
