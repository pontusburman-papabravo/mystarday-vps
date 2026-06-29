# 08 — Build System

**Version:** 1.0  
**Authority:** How parents **create and maintain** routine content (activities, schedules, rewards, images)

---

## Purpose

Define the **Build System** — the product capability for parents to construct family routines. There is **no feature named "Build Mode"** in the codebase; this document names and governs the **Bibliotek (Library)** and related planning tools.

> SYSTEM_ANALYSIS §9: closest equivalent is Library + schedule editor.

## Scope

Parent-side content creation: `library.html`, `schedule.html`, `activities.html`, image tools, standard library import. Not child customization (see [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md)).

## Definitions

| Term | Definition |
|------|------------|
| **Bibliotek** | `/library` — magic + classic tabs for family content |
| **Standard library** | Admin-global templates copied to families |
| **Build action** | Create/edit activity, schedule item, reward, image |
| **Configuration debt** | Each field we ask parents to fill |

---

## North Star

Parents should **build once**, then the product **leads** — build system supports setup, Journey supports daily execution ([05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md)).

Target: **minimize build time** to First Success — pre-fill aggressively.

---

## Current State (verified)

### Entry points

| Path | Module |
|------|--------|
| `/planning` | `planning-hub.js` → links |
| `/library` | `library.html`, `library.js`, `library-magic-hub.js` |
| `/schedule` | `schedule.js` (~2594 lines) |
| `/activities` | Activity management |
| `/library#magic-bilder` | `library-images.js`, crop |

### Library tabs (classic)

Schedule categories · Activities · Rewards · Standard library import

### Magic library shell

`library-magic-hub.js`, `library-magic-schedules.js`, `library-magic-mine.js`

### APIs

| API | Role |
|-----|------|
| `/api/activities` | Family activity templates |
| `/api/standard-library` | Copy from global |
| `/api/schedules/*` | Weekly/special schedules |
| `/api/upload` | Images → R2 or local |

### Onboarding build

`onboarding.js` step 3 — template picker (requires global library in prod).

**Dev gap:** empty `default_schedule` / `default_activity_template` without harvest.

---

## Target State

| Area | Target |
|------|--------|
| **First Success path** | ≤3 build decisions in onboarding; smart defaults |
| **Library UX** | Magic hub only — classic tabs retired |
| **Schedule editor** | Further extract from `schedule.js`; share all logic with dashboard via `schedule-core.js` |
| **Images** | Visual-first activities default — bildschema positioning |
| **AI assist** | Starter plan suggests activities — bounded, parent approves |
| **Build vs run** | Clear mode switch: Planering = build; Hem = run |
| **Content packs** | Importable packs (future) via feature flag + `global-library-import.js` pattern |

---

## Build System Rules

**B-01** Every new field must justify configuration debt (P-06).  
**B-02** Standard library import always offered before blank create.  
**B-03** Drag-and-drop schedule editing allowed for parents — not child.  
**B-04** Image upload supports crop — `library-image-crop.js` pattern.  
**B-05** Destructive deletes require confirm — schedule items support "bara denna dag" exclusion.  
**B-06** Pedagog cannot use build system on family content unless role permits — authz.  
**B-07** Build changes should not silently break child's today view — SSE or refresh hint.  
**B-08** No build actions on Hem — redirect to Planering.

---

## Current vs Target: Parent "build" verbs

| Verb | Current State | Target State |
|------|---------------|--------------|
| Drag/drop schedule | Yes — schedule editor | Keep — parent-only |
| Paint/customize activity image | Partial — upload + crop | Illustration templates |
| Assemble routine | Template picker onboarding | AI starter + one-tap accept |
| Discover content | Standard library browse | Journey-suggested templates |

Child **build** verbs (world decor) — [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) — not this document.

---

## Examples

### ✅ Good build flow

Onboarding: "Vi har satt upp en morgonrutin åt er" → parent adjusts one activity → done.

### ❌ Bad build flow

Empty library → "Skapa aktivitet" with 12 required fields.

---

## Anti-patterns

- Blank slate after registration
- Duplicate schedule logic diverging between dashboard and schedule page
- Building on Hem dashboard
- Requiring global library harvest for local dev tests without seed script

---

## Acceptance Criteria

Build feature complete when:

- [ ] B-01–B-08 satisfied
- [ ] Onboarding path tested with seeded library
- [ ] Schedule changes reflect on child Today within one refresh cycle
- [ ] `schedule-core.js` shared where applicable

---

## Implementation Guidance

Extract schedule logic per REFACTOR Fas 8 pattern — new modules in `public/js/schedule-*.js`.

Harvest/import for dev: `npm run harvest:library` + `import:library` (prod creds) — document in [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md).

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Planering hub |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Rewards tab |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Consumer of build output |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Upload, APIs |

---

## AI Instructions

Do not create `build-mode.js` — extend library/schedule modules. Minimize new required form fields.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Naming "Build System" clarifies mission language vs code |
| **CPO** | Pre-fill target aligns with First Success |
| **CTO** | schedule.js size acknowledged — phased extract |
| **Principal Engineer** | schedule-core sharing explicit |
| **Senior Game Designer** | Parent build vs child build separated — correct |
| **UX Director** | B-08 keeps Hem clean |
| **Art Director** | Image/crop path is visual build — good |
| **QA Director** | Dev library gap noted |
| **Security Engineer** | Upload authz via parent JWT |
| **AI Systems Architect** | Prevents spurious build-mode feature |

**Approved:** All roles — v1.0.
