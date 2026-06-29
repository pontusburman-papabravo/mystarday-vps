# Product Content Bible (PCB)

**Version:** 1.0  
**Status:** Highest-priority creative authority for child-facing worlds  
**Frozen upstream:** POS v1.0 · AOS v1.0 · COS v1.0 — do not expand governance unless critical contradiction

---

## What This Is

The **Product Content Bible** defines everything the child experiences inside **Min värld** — the places they build, visit, and discover after real life goes well.

This is **not** technical documentation. No APIs, schemas, or implementation. It is the creative foundation artists, game designers, writers, and engineers use to build worlds **without asking what anything should feel like**.

| System | Location | Role |
|--------|----------|------|
| **POS** | `product-operating-system/` | Product law — motivation, rules, art north star |
| **COS** | `.ai/company/` | Executive judgment |
| **AOS** | `.ai/` | Engineering execution |
| **PCB** | `product-content-bible/` (here) | **World fiction, parts, behaviour, unlock poetry** |

**Hierarchy:** POS > COS > PCB > AOS > code.  
If PCB and POS conflict → **POS wins** — fix PCB.

---

## Worlds in v1.0

| World | File | One-line identity |
|-------|------|-------------------|
| **Routine Home** | [WORLD_ROUTINE_HOME.md](./WORLD_ROUTINE_HOME.md) | The warm morning house where capability lives |
| **Garage** | [WORLD_GARAGE.md](./WORLD_GARAGE.md) | Build, fix, and finish what you start |
| **Pet Home** | [WORLD_PET_HOME.md](./WORLD_PET_HOME.md) | A companion who grows when life goes well |
| **Dinosaur** | [WORLD_DINOSAUR.md](./WORLD_DINOSAUR.md) | Wonder, fossils, and earned prehistoric secrets |
| **Dollhouse** | [WORLD_DOLLHOUSE.md](./WORLD_DOLLHOUSE.md) | Miniature rooms for pretend and control |
| **Fishing** | [WORLD_FISHING.md](./WORLD_FISHING.md) | Patience, water, and quiet evening calm |
| **Study** | [WORLD_STUDY.md](./WORLD_STUDY.md) | A proud nook for focus without school pressure |

**Template:** [WORLD_BIBLE_TEMPLATE.md](./WORLD_BIBLE_TEMPLATE.md)

---

## How to Use This Bible

1. Read POS `04`, `06`, `09`, `03A`, `03B`, `06A` once — rules live there, not repeated here.
2. Open the world bible for your discipline.
3. Every deliverable must trace to a section: visual → Visual language; animation → Animation language; etc.
4. **75 build parts** per world are the minimum content catalog — not a shipping mandate for v1 code.
5. Unlock moments describe **when** fiction changes; thresholds are tuned in product ops, never client-only (W-01).

---

## Shared Rules (reference only)

All worlds inherit without restating full rule text:

- **G-01–G-08** — no login rewards, loot boxes, shame streaks, pay-to-skip rooms  
- **W-01–W-05** — unlocks from real behavior; pet not day-one; discovery on visit  
- **C-01–C-08** — child simplicity, celebrations ≤2s, no paywalled visits  
- **00A** — calm magic; accomplishment before points  
- **03A** — Scandinavian children's book diorama; warm top-left light  

---

## World Differentiation Matrix

Each world must occupy a **distinct emotional job**. Overlap is failure.

| World | Core emotion | Energy | Best age | Unique verb |
|-------|--------------|--------|----------|-------------|
| Routine Home | Capable, safe | Morning medium | 4–10 | *Start the day* |
| Garage | Proud maker | Active | 5–10 | *Fix and finish* |
| Pet Home | Gentle belonging | Soft | 4–9 | *Care and greet* |
| Dinosaur | Awe, discovery | Wonder bursts | 4–8 | *Uncover* |
| Dollhouse | Cozy control | Quiet play | 4–9 | *Arrange* |
| Fishing | Patient calm | Low, evening | 5–11 | *Wait and notice* |
| Study | Focus pride | Still | 6–12 | *Settle and create* |

---

## Cross-Role Review Summary (v1.0)

Reviewed as executive + specialist roles before freeze. Findings incorporated into world docs.

| Role | Verdict | Key action taken |
|------|---------|------------------|
| **CEO** | Approve | Each world maps to mission (calmer mornings); no vanity grind economies |
| **CPO** | Approve | Parent value explicit per world; First Success not blocked by any world |
| **Game Director** | Approve | Progression tied to real behavior; toxic mobile patterns absent; unique reward loops |
| **Creative Director** | Approve | Visual/audio languages distinct; handcrafted bar in every bible |
| **UX Director** | Approve | One primary interaction per visit; no dead-end decoration menus |
| **QA Director** | Approve | Accessibility sections added; no P0 fiction (shame, comparison, gambling) |
| **Child psychologist lens** | Approve | Autonomy + competence supported; Pet Home avoids guilt caregiving; Study avoids school anxiety |

**Duplication removed:** Shared POS rules live in this README only. Per-world docs keep one-line inheritance note, not full G-/W- lists. Build-part numbering schemes are world-unique (no copy-paste props across worlds except abstract categories).

---

## Export

Full text for copy: `/PCB-ALL-DOCUMENTS-TEMP.md` (repo root, generated on commit)

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Seven world bibles + template |

Changes require CPO + Game Director + Creative Director sign-off. Critical POS contradiction → fix PCB, do not edit frozen POS without ADR.
