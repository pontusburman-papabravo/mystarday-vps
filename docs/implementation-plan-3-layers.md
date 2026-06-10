# Implementation plan — 3-layers architecture refactor

> **Syfte:** Cursor execution plan för Today / Universe / Family separation.
>
> **Kontrakt:** [`separation-contract-barnapp.md`](./separation-contract-barnapp.md)
>
> **Senast uppdaterad:** 2026-06-10

---

## Global rules (alla faser)

- Never mix Today (Action), Universe (Progression), Family (Relationship)
- No cross-imports between layers
- Routes: `/today` · `/universe` · `/family` (→ `child-dashboard#layer`)
- If unsure → **disable UI, not delete logic**

---

## Fas 1 — Clean Today layer ✅

**Goal:** Today = pure action screen.

| Task | Status | Kod |
|------|--------|-----|
| Hide calendar, progress ring, stats | ✅ | `child-today-focus.js`, `.today-focus-mode` CSS |
| TodayHeader + GoalSummary (1 line) | ✅ | `child-today-focus.js` |
| TaskList max 5 | ✅ | `child-today-tasks.js` |
| RewardTeaser (+N ⭐) | ✅ | `child-today-tasks.js` |
| QuestCTA (bottom) | ✅ | `child-today-tasks.js` |

**Test checklist:**
- [ ] User sees ONLY tasks + minimal goal
- [ ] No calendar visible
- [ ] No star dashboard on Today
- [ ] Task list ≤ 5 items
- [ ] 5-sec test: "What do you do here?" → "do tasks"

---

## Fas 2 — Universe isolation ✅ (interim)

**Goal:** Skattkammaren self-contained.

| Task | Status | Kod |
|------|--------|-----|
| Route isolation | ✅ | `child-layer-router.js`, `#universe` hash |
| House + rooms structure | ✅ | `child-skatt-house.js` + room modules |
| Progression UI in universe only | ✅ | `renderSkattkammaren`, universe tab |
| No tasks in universe | ✅ | Route guards hide `#scheduleView` |

**Test checklist:**
- [ ] `/universe` has zero task references visible
- [ ] Star balance only in universe
- [ ] Cannot complete tasks from universe

---

## Fas 3 — Family V0 (event-sourced, real) ✅

**Goal:** Event-sourced family memory — real persistence, zero child UI writes.

| Task | Status | Kod |
|------|--------|-----|
| `/family` route | ✅ | `index.js` redirect + `#family` hash |
| DB tables | ✅ | `family_project`, `family_event`, `family_chest` |
| GET `/api/me/family` | ✅ | `src/routes/family-hall.js` |
| Event-driven writes | ✅ | `family-event-engine.js` ← activity completion |
| UI from API only | ✅ | `child-family-client.js` + `child-family-hall.js` |
| Parent project create | ✅ | `POST /api/family/projects` (parent only) |
| Feature flag gate | ✅ | `familjehallen_v0` |

**Test checklist:**
- [ ] Family page loads real API data
- [ ] Story updates after child completes task (event stream)
- [ ] Chest aggregates from completions (not manual UI)
- [ ] No mock arrays in frontend
- [ ] Child UI has no write buttons

---

## Fas 4 — Event pipe ✅ (client interim)

**Goal:** Single event coupling point.

| Task | Status | Kod |
|------|--------|-----|
| `ActivityCompletedEvent` model | ✅ | `child-event-bus.js` |
| Emit on task complete | ✅ | `child-dashboard.js` hook |
| Universe handler (invalidate) | ✅ | `child-event-bus.js` listener |
| No direct cross-writes | ✅ | Today → event → Universe cache |

**Future:** Server-side event handler returning `unlockEvents[]` in completion response.

---

## Fas 5 — Navigation hardening ✅ (interim)

**Goal:** Lock mental model in UI.

| Task | Status | Kod |
|------|--------|-----|
| 3-tab bottom nav | ✅ | Idag · Skattkammaren · Familj |
| Route guards | ✅ | `child-layer-router.js`, CSS `[data-child-layer]` |
| Path aliases | ✅ | `/today`, `/universe`, `/family` |

**Remaining (React Phase 5):** True React Router, remove tab-state monolith.

---

## Final acceptance criteria

| Criterion | Status |
|-----------|--------|
| Each screen explainable in one sentence | ⚠️ User test pending |
| No UI element in more than one layer | ✅ Enforced via guards |
| Removing Family does not break Today/Universe | ✅ |
| Removing Universe does not break Today | ✅ |
| Event bus is only coupling point | ✅ Client-side |

---

## File map (new modules)

| Layer | Files |
|-------|-------|
| Contract | `docs/separation-contract-barnapp.md` |
| Router | `child-layer-router.js` |
| Today | `child-today-focus.js`, `child-today-tasks.js` |
| Universe | `child-skatt-house.js`, room modules |
| Family | `child-family-hall.js` |
| Events | `child-event-bus.js` |

---

*One line: **Doing / Becoming / Belonging** — coupled only by events.*
