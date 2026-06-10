# Engineering architecture — barnapp (Today / Universe / Family)

> **Syfte:** Implementation-grade system design. Styr frontend ownership, API-gränser, dataflöde och migration.
>
> **Relaterat:** [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) (produkt) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) (hårda gränser) · [`implementation-plan-3-layers.md`](./implementation-plan-3-layers.md) (fasplan)
>
> **Senast uppdaterad:** 2026-06-10

---

## 0. Stack reality vs target

| | **Nu (`main`)** | **Target** |
|--|-----------------|------------|
| Frontend | Express static HTML + vanilla JS modules (`public/js/`) | React SPA (Capacitor shell) |
| Routing | Multi-page + tab state in `child-dashboard.js` | React Router, 3 root routes |
| State | Module globals + `ChildUniverse` cache | Zustand stores + TanStack Query |
| Backend | Express route modules (`src/routes/`) | Same Express API, realigned namespaces |

**Regel:** All ny barn-logik i **små moduler** tills React-migration. Ingen ny logik i `child-dashboard.js` (>25k tokens).

---

## 1. System model (3 engines)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TODAY          │     │  UNIVERSE        │     │  FAMILY         │
│  behavior       │────▶│  reward          │────▶│  memory         │
│  engine         │     │  engine          │     │  engine         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
   tasks → complete       stars → unlocks          aggregates → story
```

| Engine | Layer | Owns | Must NOT own |
|--------|-------|------|--------------|
| **Today** | Action | Tasks, daily progress, quest CTA | Universe rooms, collectibles, family projects |
| **Universe** | Meaning | Stars, rooms, avatar, pet, history | Task checklist, family aggregation |
| **Family** | Relation | Projects, family chest, shared story | Individual XP comparison, task execution |

---

## 2. Target frontend structure (React)

```
src/app/
├── layout/
│   ├── AppShell.tsx
│   └── Navigation.tsx          # 3 roots only
│
├── today/                      # 🟡 ACTION LAYER
│   ├── TodayPage.tsx
│   └── components/
│       ├── TodayHeader.tsx
│       ├── TaskList.tsx
│       ├── TaskItem.tsx
│       ├── GoalSummary.tsx     # compact teaser only
│       ├── RewardTeaser.tsx    # "+3 ⭐ when done"
│       └── QuestCTA.tsx        # → /universe
│
├── universe/                   # 🌈 MEANING LAYER
│   ├── UniversePage.tsx
│   ├── house/
│   │   ├── HouseView.tsx
│   │   └── RoomRouter.tsx
│   └── rooms/
│       ├── StarChest.tsx
│       ├── TrophyRoom.tsx
│       ├── CollectionRoom.tsx
│       ├── AvatarRoom.tsx
│       ├── PetRoom.tsx
│       ├── StoryBook.tsx
│       ├── MuseumRoom.tsx
│       ├── DreamWall.tsx       # goals
│       └── ShopRoom.tsx
│
├── family/                     # 🏡 RELATION LAYER (V0)
│   ├── FamilyPage.tsx
│   ├── FamilyHall.tsx
│   ├── FamilyProjects.tsx      # mock / read-only V0
│   ├── FamilyChest.tsx
│   └── FamilyStory.tsx
│
├── profile/
│   └── ProfilePage.tsx
│
└── shared/
    ├── components/
    ├── hooks/
    └── lib/
```

### Navigation model (non-negotiable)

```
BOTTOM NAV — exactly 3 roots:

  🟡 Idag          →  /today
  🌈 Skattkammaren →  /universe
  🏡 Familj        →  /family
```

**Forbidden entry points:** calendar as root, dashboard shortcuts to universe stats, duplicate "home" screens.

---

## 3. Current codebase mapping (vanilla JS → target)

### Today layer

| Target (React) | Current file | Status |
|----------------|--------------|--------|
| `TodayPage` | `public/child-dashboard.html` + `child-dashboard.js` | ⚠️ Monolith — split ongoing |
| `TodayHeader` / `GoalSummary` | `child-today-focus.js` | ✅ |
| `TaskList` / `TaskItem` | `child-dashboard.js` → `renderActivities()` | ⚠️ In monolith |
| `RewardTeaser` | — | ❌ Not built |
| `QuestCTA` | `child-today-focus.js` → `#ctfSkattBtn` | ✅ |
| Warmth / narrative | `child-dashboard-warmth.js` | ✅ → belongs in Universe `StoryBook` |

### Universe layer

| Target (React) | Current file | Status |
|----------------|--------------|--------|
| `UniversePage` / `HouseView` | `child-skatt-house.js` | ✅ |
| `RoomRouter` | `ChildSkattHouse.showRoom()` | ✅ |
| `StarChest` | `renderChestRoom()` | ✅ |
| `TrophyRoom` | `child-achievements.js` | ✅ |
| `CollectionRoom` | `child-collections.js` | ✅ |
| `AvatarRoom` | `child-avatar.js` | ✅ |
| `PetRoom` | `child-pet.js` | ✅ |
| `StoryBook` | `child-dashboard-warmth.js` (historik) | ✅ |
| `MuseumRoom` | `child-museum.js` | ✅ |
| `DreamWall` / `ShopRoom` | `child-dashboard.js` → `renderSkattkammaren()` | ⚠️ Legacy HTML in monolith |
| API client | `child-universe-client.js` | ✅ |

### Family layer

| Target (React) | Current file | Status |
|----------------|--------------|--------|
| `FamilyPage` | — | ❌ |
| `FamilyHall` | — | ❌ Prototype only |
| `FamilyChest` / `FamilyProjects` | — | ❌ |
| `FamilyStory` | `family-museum.js` (parent `/family`) | ⚠️ Stats only, not narrative |
| API | `GET /api/family/museum` | ✅ Read-only |

### Profile / system

| Target | Current |
|--------|---------|
| `ProfilePage` | `child-settings.html`, `settings.html`, `family.html` |
| SSE sync | `child-dashboard-sse.js` |
| Auth | `auth.js`, `child-login.js` |

---

## 4. React component tree (runtime)

```
<App />
 └── <AppShell />
      ├── <Navigation />           # Today | Universe | Family
      └── <Routes />
           │
           ├── /today
           │    └── <TodayPage>
           │         ├── <TodayHeader />
           │         ├── <GoalSummary />      # max 1 line goal
           │         ├── <TaskList>
           │         │    └── <TaskItem />*   # max 3–5 visible
           │         ├── <RewardTeaser />     # per-task ⭐ hint
           │         └── <QuestCTA />         # secondary only
           │
           ├── /universe
           │    └── <UniversePage>
           │         └── <HouseView>
           │              └── <RoomRouter>
           │                   ├── <StarChest />
           │                   ├── <TrophyRoom />
           │                   ├── <CollectionRoom />
           │                   ├── <AvatarRoom />
           │                   ├── <PetRoom />
           │                   ├── <StoryBook />
           │                   ├── <MuseumRoom />
           │                   ├── <DreamWall />
           │                   └── <ShopRoom />
           │
           ├── /family
           │    └── <FamilyPage>
           │         └── <FamilyHall>
           │              ├── <FamilyProjects />   # V0: mock
           │              ├── <FamilyChest />       # V0: read-only aggregate
           │              └── <FamilyStory />
           │
           └── /profile
                └── <ProfilePage />
```

### Component responsibility rules

#### `TodayPage`

```typescript
// ALLOWED imports
import { useTodayStore } from '@/stores/todayStore';
import { completeTask } from '@/api/today';

// FORBIDDEN imports
// ❌ useUniverseStore
// ❌ useFamilyStore
// ❌ room unlock UI
```

- **Only:** what to do NOW
- **State:** `tasks`, `progress`, `minimalGoal`
- **Forbidden:** universe data, family data, collectibles, history

#### `UniversePage`

- **Only:** progression over time
- **State:** stars, rooms, collectibles, avatar, pet, history
- **Forbidden:** tasks, daily checklist, family projects

#### `FamilyPage`

- **Only:** shared narrative
- **State:** projects, story, family chest (aggregate)
- **Forbidden:** individual XP comparison, task execution, daily flow

---

## 5. State ownership

### Target (React)

```typescript
// stores/todayStore.ts
interface TodayStore {
  tasks: Task[];
  completed: number;
  total: number;
  minimalGoal: GoalTeaser | null;
  completeTask: (id: string) => Promise<CompleteResult>;
}

// stores/universeStore.ts
interface UniverseStore {
  house: HouseConfig;
  rooms: RoomId[];
  avatar: AvatarConfig;
  pet: Pet | null;
  collectibles: Collectible[];
  achievements: Achievement[];
  refresh: () => Promise<void>;
}

// stores/familyStore.ts  (V0: read-only)
interface FamilyStore {
  museum: FamilyMuseumStats | null;
  projects: FamilyProject[];  // mock until Phase 4
  chestTotal: number;         // 0 until Phase 3 backend
}
```

**TanStack Query** for server state; Zustand for UI-local + optimistic updates.

### Current (vanilla JS interim)

| Store (target) | Current equivalent |
|----------------|-------------------|
| `todayStore` | `child-dashboard.js` globals + `ChildTodayFocus` |
| `universeStore` | `ChildUniverse` cache (`child-universe-client.js`) |
| `familyStore` | `FamilyMuseum.mount()` one-shot fetch |

**Rule:** `ChildUniverse.invalidate()` after task complete; never read universe in Today render path.

---

## 6. Data flow

### Core loop (target contract)

```
TaskItem.onComplete()
    │
    ▼
POST /api/today/activity/:id/complete    ← target namespace
    │  (today: PUT /api/me/daily-log-items/:id/complete)
    ▼
Response {
  childStarsDelta: number;
  familyStarsDelta?: number;      // Phase 3+, omitted in V0
  unlockEvents?: UnlockEvent[];   // Phase 1+
  today: { completed, total };
  universe?: UniversePatch;       // optional inline refresh
}
    │
    ├──▶ todayStore.apply(result)
    ├──▶ universeStore.applyUnlocks(result.unlockEvents)
    └──▶ familyStore.applyAggregate(result.familyStarsDelta)  // future
```

### Architectural rules

| Rule | Meaning |
|------|---------|
| **No cross-layer UI mixing** | Today never shows room unlock modals |
| **Data flows upward only** | `tasks → universe`; universe does not drive Today layout |
| **Family aggregates only** | Family never shows per-child leaderboards |
| **One screen = one mental model** | See informationsarkitektur §8 |

---

## 7. Backend structure

### Target API namespaces

```
/api/today/                         # ACTION (child)
  GET  /today                       # tasks + progress + minimal goal
  POST /activity/:id/complete       # single completion endpoint

/api/universe/                      # MEANING (child) — alias of /api/me today
  GET  /me/universe
  PATCH /me/avatar
  PATCH /me/house
  POST /me/pet

/api/family/                        # RELATION (parent + child read)
  GET  /family
  GET  /family/museum
  GET  /family/projects             # Phase 4
  POST /family/event                # Phase 4 — disabled V0
```

### Current API (live mapping)

| Target | Current endpoint | File |
|--------|------------------|------|
| `GET /today` | `GET /api/me/daily-log?date=` | `daily-logs.js` |
| `POST /activity/complete` | `PUT /api/me/daily-log-items/:id/complete` | `daily-logs.js` |
| `GET /universe` | `GET /api/me/universe` | `child-universe.js` |
| `PATCH /avatar` | `PATCH /api/me/avatar` | `child-universe.js` |
| `PATCH /house` | `PATCH /api/me/house` | `child-universe.js` |
| `POST /pet` | `POST /api/me/pet` | `child-universe.js` |
| `GET /family/museum` | `GET /api/family/museum` | `child-universe.js` |
| Goals | `GET /api/me/goal` | `goals.js` |
| Rewards shop | `GET /api/me/rewards` | `rewards.js` |

### Refactor plan (backend)

1. **Phase 1:** Add `GET /api/today` aggregator (wraps daily-log + goal teaser) — no breaking change
2. **Phase 2:** Add `unlockEvents[]` to completion response (from `universe-engine.syncUnlocks`)
3. **Phase 3:** Add `family_stars` column + delta in completion response (feature-flagged)
4. **Phase 4:** `family_projects`, `family_contributions` tables + CRUD

---

## 8. Domain model (database)

### Live tables

```sql
-- ACTION
child
daily_log / daily_log_item
child_reward_goal
manual_star_grant

-- MEANING
child.avatar_config JSONB
child.house_config JSONB
achievement_definition / child_achievement
collectible_catalog / child_collectible
child_pet

-- RELATION (minimal)
family
-- GET /api/family/museum computes aggregates from daily_log_item + reward_redemption
```

### Future tables (Phase 3–4)

```sql
-- family_star_balance on family (aggregate, not per-child economy)
ALTER TABLE family ADD COLUMN family_star_balance INTEGER DEFAULT 0;

family_project (
  id, family_id, title, icon, target_stars,
  status, created_at
);

family_project_milestone (
  id, project_id, label, assignee_type,  -- 'child'|'parent'
  assignee_id, completed_at
);

family_contribution (
  id, family_id, parent_id, type,       -- 'dinner'|'story'|'outing'
  stars_granted, created_at
);

family_event (           -- narrative log
  id, family_id, event_type, payload JSONB, created_at
);
```

### Source of truth

| Data | Owner table | Read by |
|------|-------------|---------|
| Task completion | `daily_log_item.completed` | Today |
| Child star balance | computed (`getStarBalance`) | Universe |
| Room unlocks | `child.house_config` + `universe-engine` | Universe |
| Achievements | `child_achievement` | Universe |
| Family stats | computed aggregate | Family museum |

---

## 9. Feature flags

Registered in `features` + gated via `family_features` / `featureAccess()`.

| Slug | Default | Phase | Meaning |
|------|---------|-------|---------|
| `skattkammar_universum` | `live` | — | Universe layer enabled |
| `familjehallen_v0` | `dev` | 2 | Family tab + read-only hall UI |
| `familjeprojekt` | `off` | 4 | Family projects gameplay |
| `dual_currency` | `off` | 3 | Family stars in completion response |
| `vuxenbidrag` | `off` | 4 | Parent contribution events |

**V0 rule:** All family gameplay flags `off` or `dev`. UI mock only. `GET /api/family/museum` stays read-only.

```javascript
// Frontend gate pattern
const hall = await FeatureCheck.has('familjehallen_v0');
if (!hall) hideFamilyTab();
```

---

## 10. Migration plan (safe deployment)

### Phase 1 — NOW (vanilla JS)

- [x] Universe modularized (`child-skatt-house.js` + rooms)
- [x] Today focus header (`child-today-focus.js`)
- [x] Extract `TaskList` hooks → `child-today-tasks.js`
- [x] Add `RewardTeaser` per task (`+N ⭐`)
- [x] Hide header progress ring on Today
- [x] Cap visible tasks to 5 (quest log mode)
- [x] Event bus (`child-event-bus.js`) + `ActivityCompletedEvent`
- [x] Layer router (`child-layer-router.js`) + `/today` `/universe` `/family`
- [x] Family shell V0 (`child-family-hall.js`, flag `familjehallen_v0`)
- [ ] 5-second user test

### Phase 2 — Family read-only

- [ ] `FamilyPage` shell (parent: extend `family-museum.js`; child: new tab or gated)
- [ ] `FamilyHall` static mock (projects UI, no backend)
- [ ] Feature flag `familjehallen_v0`

### Phase 3 — Family aggregation (backend only)

- [ ] `family_star_balance` + trigger on child completion
- [ ] Flag `dual_currency` — response field only, no child UI
- [ ] Monitor in admin/analytics

### Phase 4 — Family Hall V0 UI

- [ ] Enable after family user tests pass
- [ ] `family_projects` migration
- [ ] Family chest visible to children (single number, no dual-currency explanation)

### Phase 5 — React migration (optional, parallel)

- [ ] Scaffold `src/app/` with Capacitor
- [ ] Port `child-skatt-house` → `UniversePage` first (strongest layer)
- [ ] Port `child-today-focus` → `TodayPage`
- [ ] Deprecate `child-dashboard.js` monolith last

---

## 11. Forbidden patterns (lint / review checklist)

```diff
- TodayPage imports universeStore
- UniversePage renders TaskList
- FamilyPage shows child star balances side-by-side
- completion handler updates only todayStore (must invalidate universe)
- new feature logic added to child-dashboard.js (>50 lines)
- calendar widget on Today default view
- third "home" tab or duplicate Skattkammaren entry
```

---

## 12. File ownership (who edits what)

| Change type | Allowed files |
|-------------|---------------|
| Today UX | `child-today-*.js`, `child-today-focus.css` |
| Universe room | `child-{room}.js`, `child-skatt-house.js` |
| Universe API | `src/routes/child-universe.js`, `src/lib/universe-engine.js` |
| Family V0 | `family-museum.js`, `src/routes/family*.js` |
| **Do not touch** | `child-dashboard.js` except 1-line hooks |
| SW cache bump | `public/sw.js` on any frontend change |

---

## 13. Success metrics (engineering)

| Metric | Target |
|--------|--------|
| Today bundle hooks in monolith | ≤ 10 call sites |
| Cross-layer imports (when React) | 0 |
| Task complete → universe refresh | < 500ms p95 |
| Feature flag coverage (family) | 100% of new family UI |
| 5-second test pass rate | > 80% children answer "göra uppdrag" |

---

*Detta dokument uppdateras vid Phase-övergångar. Produktregler: [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md).*
