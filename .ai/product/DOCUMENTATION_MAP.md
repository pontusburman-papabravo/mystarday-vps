# Product Documentation Map

**Version:** 1.0  
**Updated:** 2026-07-02  
**Purpose:** Status och läsordning för alla normativa produktdokument

---

## Läsordning — Min värld

1. **[bibles/WORLD_BIBLE.md](./bibles/WORLD_BIBLE.md) §1 — World Constitution** (2–3 sidor) — **högsta auktoritet** för Min värld-identitet  
2. **[bibles/WORLD_BIBLE.md](./bibles/WORLD_BIBLE.md) Part I — World Topology** — topologi, landmärken, ny-område-checklista (**obligatorisk** vid nya rum)  
3. **[bibles/WORLD_BIBLE.md](./bibles/WORLD_BIBLE.md) Part III — RBS** — hur ett rum specificeras i data  
4. [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) — världssjäl, motivation, seven worlds  
5. [WORLD_DESIGN_BIBLE.md](./WORLD_DESIGN_BIBLE.md) — progression nodes, WQS  
6. [LIVING_WORLD_ENGINE_SPEC.md](./LIVING_WORLD_ENGINE_SPEC.md) — runtime (FROZEN v1.0)  
7. [bibles/rooms/](./bibles/rooms/README.md) — **Room catalog** (konkreta RBS YAML)  
8. [bibles/](./bibles/README.md) — Production Bibles (entiteter, prompts, audio)

---

## Dokumentstatus

| Dokument | Fil | Status | Anteckning |
|----------|-----|--------|------------|
| **World Bible** | [bibles/WORLD_BIBLE.md](./bibles/WORLD_BIBLE.md) | **In progress** | Constitution + **Part I–III complete** · Part IV room catalog started |
| Product Content Bible | [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) | v1.0 normativ | Master world soul |
| World Design Bible | [WORLD_DESIGN_BIBLE.md](./WORLD_DESIGN_BIBLE.md) | v1.0 LIVE | Progression nodes; underordnad Constitution |
| Living World Engine Spec | [LIVING_WORLD_ENGINE_SPEC.md](./LIVING_WORLD_ENGINE_SPEC.md) | v1.0 **FROZEN** | Runtime only; underordnad Constitution för produktbeslut |
| Art Bible | [ART_BIBLE.md](./ART_BIBLE.md) | v1.0 FINAL | Visual contract |
| Game Design Bible | [GAME_DESIGN_BIBLE.md](./GAME_DESIGN_BIBLE.md) | v2 | Loops, Experience Packs |
| Production Bibles | [bibles/README.md](./bibles/README.md) | Skelett | Entity, Animation, Audio, … |
| **Room Catalog** | [bibles/rooms/README.md](./bibles/rooms/README.md) | **In progress** | RBS YAML per rum — `home_hall` pilot |
| Product Constitution | [docs/PRODUCT-CONSTITUTION.md](../docs/PRODUCT-CONSTITUTION.md) | Normativ | Hela produkten — regler 1–6 |

---

## Auktoritet — Min värld (förenklad)

```
World Constitution (World Bible §1)  ← 2–3 sidor, läs först
  ↓
POS
  ↓
PCB
  ↓
World Bible Part I (topology)  ← nya rum: checklista först
  ↓
World Bible Part III (RBS) + bibles/rooms/  ← konkret YAML per scene_id
  ↓
WDB · LWES · Art · GDB · Production Bibles
  ↓
Kod
```

**Constitution** är den enda 2–3-sidiga produktkonstitutionen för Min värld. Den får aldrig motsägas av WDB, LWES eller implementation.

---

*Se även [.ai/product/README.md](./README.md) · [docs/child-worlds-index.md](../docs/child-worlds-index.md)*
