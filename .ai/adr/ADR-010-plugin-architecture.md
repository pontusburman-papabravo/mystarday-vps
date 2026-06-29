# ADR-010 — Plugin Architecture

**Status:** Accepted  
**Date:** 2026-06-29

## Context

WORLD_ENGINE defines 25 runtimes with extension points. Future worlds, verbs, and pack-specific rules need bounded extension without core fork.

## Problem

Ad-hoc `require()` hooks or copy-paste runtime logic per world does not scale to AI-generated worlds and external studios.

## Decision

- **Plugin slot types (v1):**  
  1. **Pack rules** — `unlock_signal` resolver functions registered by pack manifest ref  
  2. **Interaction verbs** — manifest registry; unknown verb ignored in release  
  3. **Runtime hooks** — `engine.registerHook(phase, handler_id)` dev/test only unless ADR  
- **Plugins MUST:** validate against JSON Schema; semver; sandbox — no raw DB access bypassing authz.  
- **Plugins MUST NOT:** override Constitution, G-rules, parent approval (ADR-007), or server authority (ADR-008).  
- **Loading:** Pack Runtime resolves plugin refs from manifest at pack load; hot reload dev-only (Developer Runtime).  
- **Third-party/studio:** plugins ship **inside** signed pack bundle — not arbitrary npm at runtime v1.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Full WASM plugin VM | Cost/complexity v1 |
| No plugins — fork per world | Unmaintainable |
| Runtime npm install | Security nightmare |

## Trade-offs

+ Data-driven worlds + controlled code extension.  
− Pack bundle review pipeline needed.  
− Resolver API must stay backward compatible minor semver.

## Consequences

- Document plugin manifest schema extension in WORLD_ENGINE appendix when merged.  
- CI: `validateManifest` + static deny list for forbidden APIs.  
- Security review for new resolver types.

## Migration Strategy

Inline unlock logic in server → extract to `pack_rules` module behind same interface; no behavior change.

## Related Documents

- `WORLD_ENGINE.md` — Pack Runtime, Interaction Runtime extension points  
- `ADR-003` World DSL  
- `ADR-004` Progression Nodes

## Future Revisions

WASM sandbox for studio plugins; marketplace signing.
