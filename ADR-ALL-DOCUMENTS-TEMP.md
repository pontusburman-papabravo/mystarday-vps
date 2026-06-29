# ADR — All Documents (TEMP export)

**Generated:** 2026-06-29 · **Source:** `.ai/adr/` · **Not normative** — use individual ADR files in repo.

---


---

<!-- FILE: .ai/adr/ADR-000-README.md -->

# ADR-000 — Architecture Decision Records

**Status:** Accepted  
**Date:** 2026-06-29

---

## Syfte

`.ai/adr/` är **teknisk sanningskälla under implementation**. ADR dokumenterar *varför* vi byggde så — inte *hur produkten ska kännas* (Product OS / biblar) eller *hur varje rad kod ser ut* (repo).

| Lager | Sanningskälla |
|-------|----------------|
| Product OS + biblar | Vad & varför (produkt) |
| **ADR** | Tekniska beslut & gränser |
| Kod + schemas | Implementation |

---

## Format

Filnamn: `ADR-NNN-kort-slug.md` (t.ex. `ADR-004-progression-nodes.md`).

Varje ADR **måste** innehålla:

1. **Context** — teknisk situation  
2. **Problem** — vad som måste lösas  
3. **Decision** — valt beslut (imperativ)  
4. **Alternatives Considered** — kort lista  
5. **Trade-offs** — vad vi accepterar  
6. **Consequences** — effekt på kod, drift, team  
7. **Migration Strategy** — befintlig kod / data  
8. **Related Documents** — länkar, inte kopierad text  
9. **Future Revisions** — när ADR ska omprövas  

Header-fält: `Status`, `Date`, `Deciders` (valfritt), `Supersedes` / `Superseded by` (vid behov).

---

## Status

| Status | Betydelse |
|--------|-----------|
| **Proposed** | Under review — implementera inte som norm |
| **Accepted** | Gäller — implementation ska följa |
| **Superseded** | Ersatt av ny ADR — läs `Superseded by` |
| **Deprecated** | Inte längre relevant — behåll för historik |

Endast **Accepted** ADR är normativa för implementation.

---

## Beslutsprocess

1. **Identifiera** teknisk vägval som påverkar >1 modul eller är svår att ångra.  
2. **Skriv** ADR som `Proposed` — länka Product OS / biblar.  
3. **Review** CTO + ägare av berörda runtime (se WORLD_ENGINE när mergad).  
4. **Acceptera** → merge; uppdatera `Related Documents` i biblar endast om ADR *operationaliserar* — duplicera inte.  
5. **Konflikt** med Product OS → **ändra Product OS via ADR-förslag**, skapa inte parallell sanning i ADR.

---

## Länk till Product OS

| Product-källa | ADR använder för |
|---------------|------------------|
| `docs/PRODUCT-CONSTITUTION.md` §6 | Progression, inga magiska tal |
| `GAME_DESIGN_BIBLE.md` §2, Appendix B/C | Engine / pack / events |
| `WORLD_DESIGN_BIBLE.md` §2–3 | Progression nodes, unlock_signal |
| `WORLD_ENGINE.md` | Runtime-gränser, DSL, schemas |
| `PARENT_EXPERIENCE_BIBLE.md` | Parent approval, offline dignity |
| `docs/first-success/brain.md`, `coach.md` | Need/action — implementation split |

ADR **refererar** — citerar max 1 rad. Detaljer stannar i källan.

---

## Cursor / implementation

1. Innan arkitekturändring: `grep` + läs relevant **Accepted** ADR.  
2. PR beskriver: `ADR-NNN: [decision summary]` + hur diff följer den.  
3. Bryt inte Accepted ADR utan ny ADR som **Supersedes** den gamla.  
4. Feature flags (ADR-009) för experiment — permanent beteende kräver ADR eller bibel-alignment.  
5. Schemas i `.ai/product/world-engine/schemas/` (WORLD_ENGINE) validerar manifest — ADR pekar dit.

---

## AI-agenter — uppdatera ADR

**Skapa ny ADR när:** ny runtime-gräns, ny sync-modell, pack-format breaking change, plugin-kontrakt.

**Uppdatera inte ADR när:** bugfix, copy, enstaka endpoint — kod räcker.

**Process:**

1. Skriv `Proposed` ADR med alla 9 sektioner.  
2. Om ändring **motsäger** bibel → öppna issue/PR som föreslår bibel-ADR, vänta på accept.  
3. Efter accept: sätt status `Accepted`, datum, ev. `Supersedes: ADR-00X`.  
4. Markera gammal ADR `Superseded by: ADR-00Y`.  
5. Commit message: `docs(adr): ADR-NNN [title] accepted`.

**Förbjudet:** duplicera hela kapitel från GDB/WDB/PEB in i ADR.

---

## Index (v1)

| ADR | Titel |
|-----|-------|
| [ADR-001](ADR-001-experience-pack-architecture.md) | Experience Pack Architecture |
| [ADR-002](ADR-002-core-engine-boundaries.md) | Core Engine Boundaries |
| [ADR-003](ADR-003-world-dsl.md) | World DSL |
| [ADR-004](ADR-004-progression-nodes.md) | Progression Nodes |
| [ADR-005](ADR-005-event-bus.md) | Event Bus |
| [ADR-006](ADR-006-offline-first.md) | Offline First |
| [ADR-007](ADR-007-parent-approval-model.md) | Parent Approval Model |
| [ADR-008](ADR-008-save-and-sync.md) | Save & Sync |
| [ADR-009](ADR-009-feature-flag-strategy.md) | Feature Flag Strategy |
| [ADR-010](ADR-010-plugin-architecture.md) | Plugin Architecture |


---

<!-- FILE: .ai/adr/ADR-001-experience-pack-architecture.md -->

# ADR-001 — Experience Pack Architecture

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Stjärndag ska stödja flera målgrupper (barn v1; tonår/vuxen/stöd senare) utan motor-fork. Fiction, copy och pacing varierar; completion och save ska vara gemensamma.

## Problem

Hårdkodad barn-copy i server/klient blockerar pack-byte och skapar dubbel underhåll.

## Decision

- **Experience Pack** = semver manifest (`pack_id`, `audience_band`, `locale`, `fiction_manifest`, `ui_skin`, `pacing`, `worlds[]`, `copy_tables`).  
- v1 shippar endast **`child_se`** — övriga packs schema-only tills ADR revideras.  
- Pack laddas via **Pack Runtime**; byte byter presentation + manifest refs, **inte** DB per audience.  
- Pack **får inte** override Product Constitution eller G-rules (GDB).

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Separata appar per ålder | Fork, dubbel sync, fragmenterad data |
| Feature flags som enda mekanism | Ingen tydlig fiction/copy-gräns |
| i18n-only | Räcker inte för pacing/reading level |

## Trade-offs

+ En deploy, en save-modell.  
− Pack-validering måste vara strikt CI-gate.  
− Större manifest-yta att versionera.

## Consequences

- `experience-pack.schema.json` (WORLD_ENGINE) är kontrakt.  
- Integration test: swap pack i staging utan migration.  
- All age-specific copy i pack — grep-gate: inga `if (age<13)` i core routes.

## Migration Strategy

Befintlig `child_se`-upplevelse mappas till manifest v1.0.0. Nya packs append-only tills CPO godkänner live pack.

## Related Documents

- `GAME_DESIGN_BIBLE.md` §2, Appendix C  
- `WORLD_ENGINE.md` — Pack Runtime  
- `docs/first-success/coach.md` — experiment på Coach, inte pack-etik

## Future Revisions

Revidera vid första **live** icke-`child_se` pack eller breaking manifest semver major.


---

<!-- FILE: .ai/adr/ADR-002-core-engine-boundaries.md -->

# ADR-002 — Core Engine Boundaries

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Spelplattformen delas i 25 runtimes (WORLD_ENGINE). Core Runtime orchestrerar; domänlogik för rutin/stjärnor/progression ska vara age-agnostic.

## Problem

Oklar gräns mellan engine, pack, och Express-routes leder till fiction i backend och magic numbers i klient.

## Decision

**Core Engine äger:**

- Auth/session, child/parent context  
- Activity completion → verified events  
- Progression rule evaluation (`unlock_signal` → node_id)  
- Save/sync orchestration hooks  
- Event bus emit (Appendix B + extensions)  

**Core Engine äger INTE:**

- World fiction, NPC copy, UI skin  
- Coach action mapping (→ Product Engine / `coach.md`)  
- Voice copy (→ voice-katalog)  
- Per-world art assets  

**Gränsregel:** Core känner `event` + `node_id` + `pack_config_key` — aldrig "75 delar" eller fixed star thresholds (Constitution §6).

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Monolith route handlers med all logik | Omöjlig pack/world expansion |
| Full microservices per world | Overkill v1; sync-komplexitet |

## Trade-offs

+ Tydlig testyta (mock events → progression).  
− Kräver disciplin vid nya API:er (engine hook först).

## Consequences

- Nya completion-typer → emit standardiserat event, pack listener optional.  
- `src/core-engine/` (first-success) är implementation av Brain — inte Coach copy.

## Migration Strategy

Refactor incrementellt: flytta age/copy ur routes till pack manifest; behåll befintliga endpoints tills parity-test pass.

## Related Documents

- `WORLD_ENGINE.md` — Core Runtime, Progression Runtime  
- `GAME_DESIGN_BIBLE.md` §2  
- `docs/first-success/ENGINE_SPEC.md`

## Future Revisions

Vid extrahering av client-side World Runtime till separat process eller WASM bundle.


---

<!-- FILE: .ai/adr/ADR-003-world-dsl.md -->

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


---

<!-- FILE: .ai/adr/ADR-004-progression-nodes.md -->

# ADR-004 — Progression Nodes

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Tidigare idé med fixed "75 delar" per värld ersatt av data-driven progression (Constitution §6, WDB §2).

## Problem

Hårdkodade trösklar (`PARTS_REQUIRED`, star counts i engine) kräver deploy för pacing-justering och bryter per-world emotional arcs.

## Decision

- **Progression Node** = minsta unlock-enhet i pack manifest (`node_id`, `order`, `node_type`, `emotional_beat`, `unlock_signal`, `pack_config_key`).  
- **Node count** = manifest-driven; ingen engine quota.  
- **Unlock path:** event → Progression Runtime → evaluate `unlock_signal` via pack rules engine → persist `child_progression_node` (server) → emit `onProgressionNodeUnlocked`.  
- **UI:** visa emotionell progression — inte "X av Y delar".  
- **ADR trigger:** >20% node count change in live world → pacing review (WDB).

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Fixed 75 parts | Motverkar Constitution §6 |
| XP/level integers in core | Magic numbers; guilt metrics |
| Client-only unlock | Trust / offline integrity |

## Trade-offs

+ CPO/Game Director justerar pacing via data.  
− Pack rules engine måste vara deterministisk och testbar.  
− Mer manifest-komplexitet per world.

## Consequences

- Schema: `progression-node.schema.json`, `progression.schema.json`.  
- DB: `child_progression_node(child_id, world_slug, node_id, unlocked_at, metadata JSONB)`.  
- Engine reject load om manifest innehåller numeric threshold constants without `pack_config_key`.

## Migration Strategy

Legacy build-part IDs mappas till `node_id`; one-time migration script; dual-read period om nödvändigt.

## Related Documents

- `docs/PRODUCT-CONSTITUTION.md` §6  
- `WORLD_DESIGN_BIBLE.md` §2–3  
- `scripts/wdb_progression_nodes.py`

## Future Revisions

Cross-world progression edges; seasonal node append-only automation.


---

<!-- FILE: .ai/adr/ADR-005-event-bus.md -->

# ADR-005 — Event Bus

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Core Engine, Experience Packs, analytics och world runtime måste reagera på samma händelser utan tight coupling.

## Problem

Direct function calls mellan routes, client JS och pack logic skapar cykler och age-specific side effects.

## Decision

- **Event Bus** (broadcast): naming `domain.action` (snake_case domains).  
- **Core events (v1 minimum):**  
  `onActivityComplete`, `onStarGranted`, `onProgressionNodeUnlocked`, `onWorldEnter`, `onWorldExit`, `onMilestone`, `onNpcInteraction`, `interaction.completed`, `save.captured`, `sync.completed`.  
- Payload: age-agnostic IDs — **no PII** in analytics-bound events.  
- Delivery: queued same tick; handlers **≤2 ms** budget (WORLD_ENGINE).  
- **Message Bus** (point-to-point) för runtime commands (`camera.transitionTo`, `animation.play`) — separat från bus.  
- Experience Packs **subscribe**; engine **emits**. Pack listeners får inte blockera Idag spine.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Redux/global store only | Server truth + offline queue passar dåligt |
| Webhooks-only | Latency; offline |

## Trade-offs

+ Pack swap utan route-ändring.  
− Event schema discipline; versionering vid breaking payload.

## Consequences

- Appendix B (GDB) extended only via ADR + semver event version.  
- `public/js/analytics-shim.js` allowlist för client emit.  
- Contract tests: golden payloads per event.

## Migration Strategy

Legacy direct calls → emit wrapper; deprecate direct imports over 2 releases.

## Related Documents

- `GAME_DESIGN_BIBLE.md` Appendix B  
- `WORLD_ENGINE.md` — Event Bus & Message Bus  
- `src/core-engine/` event definitions (implementation)

## Future Revisions

Event replay for Testing Runtime; cross-tab broadcast on web.


---

<!-- FILE: .ai/adr/ADR-006-offline-first.md -->

# ADR-006 — Offline First

**Status:** Accepted  
**Date:** 2026-06-29

## Context

99,9% mobile users; morgonrutin sker ofta utan stabilt nät. Primary success = offline beteende förbättras (GDB §43, PEB).

## Problem

Online-only completion ger false celebration, tappad trust, och blockerar Idag spine i skolor/flygplan.

## Decision

- **Local snapshot** av last-synced world + routine state för read-only barnvy.  
- **Write queue:** completion ops med `timestamp` + client `operation_id`; flush on reconnect.  
- **Stars/progression unlock:** endast efter **server verify** — ingen offline grant.  
- **UI:** calm sync indicator; errors never blame child (GDB anti-frustration).  
- **Idag check-off:** queue allowed; celebration copy väntar på verify om offline.  
- Capacitor/web: same queue abstraction (Sync Runtime).

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Full offline CRDT all state | Complexity; server authority for stars |
| Online-only with retry spinner | Blocks primary loop |

## Trade-offs

+ Flygplan/skol-wifi fungerar för rutin.  
− Delayed celebration; parent must understand verify lag.  
− Queue conflict handling (see ADR-008).

## Consequences

- Client: offline detector + queue persistence (IndexedDB/local).  
- Server: idempotent completion ingest by `operation_id`.  
- Tests: offline QA matrix mandatory for completion changes.

## Migration Strategy

Existing clients: add queue layer behind existing API calls; feature flag rollout (ADR-009).

## Related Documents

- `GAME_DESIGN_BIBLE.md` §43, QG-431–434  
- `PARENT_EXPERIENCE_BIBLE.md` — offline dignity  
- `WORLD_ENGINE.md` — Save/Sync Runtime

## Future Revisions

Cosmetic-only CRDT zones; background sync on iOS BGTask.


---

<!-- FILE: .ai/adr/ADR-007-parent-approval-model.md -->

# ADR-007 — Parent Approval Model

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Layer 7 real rewards och Skattkammaren kräver förälders relation — appen är budbärare, inte merchant (PCB, G-07, PEB §13).

## Problem

Auto-approved redemptions eller barn-initierade köp bryter trust och Product Constitution §4 (osäkerhet).

## Decision

- **Skattkammaren redemption** = `pending` tills **parent explicit approve** (push optional, in-app queue).  
- **Reward definition** (create/edit/delete) = parent-only route; barn read-only catalog.  
- **Real-world treat** copy: parent-defined text — app skickar notifikation, inte vara.  
- **AI coach** får föreslå belöning copy — **aldrig** godkänna redemption (PEB §13).  
- **PIN gate** för parent settings; child session cannot approve.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Auto-approve under N stjärnor | Underminerar Layer 7 |
| Parent PIN per redemption | Friktion för varje fika |

## Trade-offs

+ Trust + G-07 compliance.  
− Extra parent tap; mitigated by batch approve optional senare (ny ADR).

## Consequences

- API: `POST /api/rewards/redemptions` → pending; `PUT .../approve` parent auth.  
- Push: only `action_needed` class (PEB notifications).  
- UI: warm copy — not transactional (PEB UX-P06).

## Migration Strategy

Existing redemptions grandfathered as approved; new flow default pending from cutover date.

## Related Documents

- `PARENT_EXPERIENCE_BIBLE.md` §13 Parent Reward System  
- `GAME_DESIGN_BIBLE.md` G-07  
- `PRODUCT_CONTENT_BIBLE.md` Layer 7

## Future Revisions

Scheduled approve windows; co-parent approve either parent.


---

<!-- FILE: .ai/adr/ADR-008-save-and-sync.md -->

# ADR-008 — Save & Sync

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Progression, routine completions och family state måste vara konsekventa across devices, co-parents och offline queues (ADR-006).

## Problem

Client-authoritative stars or last-write-wins utan merge log ger data loss och co-parent conflict.

## Decision

- **Server authoritative** for: stars, progression node unlocks, verified completions, subscription flags.  
- **Auto-save** on completion events — no manual save child UI (GDB QG-438–440).  
- **Delta sync:** ordered operations with timestamp; server applies idempotently.  
- **Conflict:** **server wins** progression domain; merge log row for audit (`sync.conflict` event).  
- **Cosmetic state** (placement, optional): client may optimistic UI; server reconcile on sync — future CRDT ADR.  
- **Save format:** semver header; forward migrators only in live; rollback dev-only.  
- **Compression:** snapshot blobs gzip/brotli; size budget per child in config.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Client wins always | Co-parent desync |
| Full snapshot every write | Bandwidth on mobile |
| Event sourcing everywhere | Over-engineering v1 |

## Trade-offs

+ Predictable truth; support kan läsa merge log.  
− Occasional "why did my cosmetic move revert" — document in parent help.

## Consequences

- `Sync Runtime` + `Save Runtime` (WORLD_ENGINE).  
- Retry: exponential backoff client; no blocking Idag spinner.  
- DB migrations for save_version column if client cache used.

## Migration Strategy

Backfill `child_progression_node` from legacy tables; dual-write one release; monitor merge log.

## Related Documents

- `GAME_DESIGN_BIBLE.md` §43, QG-438–442  
- `WORLD_ENGINE.md` — Save Graph, Sync Graph  
- `ADR-006` Offline First

## Future Revisions

CRDT for cosmetic-only entities; end-to-end encrypted family notes ADR.


---

<!-- FILE: .ai/adr/ADR-009-feature-flag-strategy.md -->

# ADR-009 — Feature Flag Strategy

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Product Engine experiments (Coach action mapping, day0 variants) ska A/B-testas utan Brain-ändring (`coach.md`). Ops behöver kill switches.

## Problem

Feature flags i Brain eller core progression bryter determinism och Constitution alignment. Flags utan policy skapar permanent undantag.

## Decision

- **Flags live in:** `feature_flag` table + env overrides; **Coach/presentation layer** primary consumer.  
- **Brain:** reads **facts only** — never flags (brain.md determinism rule).  
- **Core progression / G-rules:** **not flaggable** — permanent behavior needs ADR.  
- **Naming:** `snake_case`; prefix `exp_` for experiments, `ops_` for kill switches.  
- **Lifecycle:** experiment → measure → promote to default **or remove** within 90 days; stale flags CI-fail.  
- **RevenueCat/IAP webhooks:** exempt from maintenance global limiter (existing ops pattern) — document in runbook, not new flag.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| LaunchDarkly-only | Vendor lock; DB flags sufficient v1 |
| Flags everywhere in UI | Unbounded debt |

## Trade-offs

+ Safe Coach A/B.  
− Requires flag hygiene audits.  
− Must not hide ethics violations behind flag.

## Consequences

- `npm run test:gate` runs with flags default-off unless test fixtures set.  
- PR template: list flags touched + expiry date.  
- Admin UI for ops flags; experiment flags via admin or config deploy.

## Migration Strategy

Inventory existing flags; classify exp vs ops; delete unused.

## Related Documents

- `docs/first-success/coach.md` — experiment on Coach  
- `docs/first-success/brain.md` — flags forbidden in Brain  
- `CLAUDE.md` — `feature_flag` table

## Future Revisions

Per-family flags via `family_features`; percentage rollouts.


---

<!-- FILE: .ai/adr/ADR-010-plugin-architecture.md -->

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

