# Separation contract — barnapp (Today / Universe / Family)

> **Syfte:** Hårda gränser för UI, routing och dataägande. Varje system äger exakt en mental modell. Ingen skärm får blanda modeller.
>
> **Relaterat:** [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) (produkt) · [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) (implementation)
>
> **Senast uppdaterad:** 2026-06-10

---

## 1. Kärnprincip (HARD RULE)

Varje system äger **exakt en mental modell**. Ingen skärm får blanda modeller.

| System | Mental modell | En rad |
|--------|---------------|--------|
| **Today** | *Vad ska jag göra nu?* | **Doing** |
| **Universe** | *Vad har jag blivit / samlat / låst upp?* | **Becoming** |
| **Family** | *Vad bygger vi tillsammans?* | **Belonging** |

---

## 2. UI-separation (visuellt kontrakt)

### 🟡 TODAY — Action UI

**Mental modell:** *"Vad ska jag göra nu?"*

**UI-ägande:**
- Tasks (enda primära ytan)
- Minimal progress
- Minimal målvisning
- 1 CTA till Skattkammaren

**❌ FÅR INTE FINNAS I TODAY:**
- stjärnrum
- samlingar
- avatar
- hus
- historik
- kalender
- statistik dashboards
- familjelogik

**✅ ENDA DATA SOM FÅR SYNAS:**
- `today.tasks[]`
- `today.progress`
- `today.goal_preview` (1 rad)

**UI-struktur:**

```
[Header: minimal]
Hej Astrid

[Goal]
🎯 47 / 150 ⭐

[Primary action zone]
☐ Task 1
☐ Task 2
☐ Task 3

[Secondary]
💎 Skattkammaren
```

### 🌈 SKATTKAMMAREN — Meaning UI

**Mental modell:** *"Vad har jag blivit / samlat / låst upp?"*

**UI-ägande:**
- alla progression system
- alla belöningar
- alla rum
- avatar + pet
- samlingar
- historik
- museum

**❌ FÅR INTE FINNAS:**
- tasks
- deadlines
- "vad ska jag göra idag"
- checklist UI

**Struktur:**

```
🏠 House (hub)
 ├── ⭐ Star Chest
 ├── 🏆 Trophy Room
 ├── 🧸 Collections
 ├── 🧑 Avatar Room
 ├── 🐾 Pet Room
 ├── 📖 Story Book
 └── 🏛 Museum
```

**Regel:** Allt är retrospektivt eller kosmetisk progression — **inte** actionable.

### 🏡 FAMILY — Relationship UI (V0)

**Mental modell:** *"Vad bygger vi tillsammans?"*

**UI-ägande:**
- familjeprojekt
- familjeberättelse
- familjesamling (skattkista)
- gemensamma mål

**❌ FÅR INTE FINNAS:**
- individuella stjärnor UI
- barn vs vuxen XP-jämförelse
- daily tasks
- universe rooms
- gamified grind

**Struktur:**

```
🏡 Family Hall
 ├── 🎯 Family Projects
 ├── ⭐ Family Chest (auto-aggregate)
 └── 📖 Family Story
```

---

## 3. Routing-separation (EXTREM VIKTIG)

### Routes (HARD BOUNDARIES)

```
/
 ├── /today        → ACTION SYSTEM
 ├── /universe     → PROGRESSION SYSTEM
 ├── /family       → RELATIONSHIP SYSTEM
 └── /profile      → SETTINGS
```

**Nuvarande implementation (interim):** `child-dashboard.html` med tab-state (`schedule` = Today, `rewards` = Universe). Mål: React Router med ovanstående paths.

### 🚫 Cross-routing forbidden

| Förbjudet | Exempel |
|-----------|---------|
| Today visar universe-data | Rum, samlingar, avatar i Idag-vyn |
| Universe visar tasks | Checklista i Skattkammaren |
| Family visar daily checklist | Uppdrag i Familjehallen |

### ✅ Endast tillåtet flöde

```
TODAY → (action completes) → EVENT → UNIVERSE UPDATE

UNIVERSE → no influence on TODAY UI

FAMILY → only aggregates from events
```

---

## 4. Ownership model (data authority)

### 🟡 TODAY OWNER

**Source of truth:**
- `daily_tasks` / `daily_log_item`
- completion state
- daily progress

**ONLY writes:**
- activity completion
- daily logs

### 🌈 UNIVERSE OWNER

**Source of truth:**
- stars (child)
- unlocks
- rooms
- collectibles
- avatar
- pets

**ONLY writes:**
- progression state
- unlock events
- cosmetic state

### 🏡 FAMILY OWNER

**Source of truth:**
- aggregated contributions
- family projects
- story events

**ONLY writes:**
- family events (derived)
- project progress (aggregated)

---

## 5. Event flow (enforced architecture)

### Single source event model

```typescript
interface ActivityCompletedEvent {
  type: 'ActivityCompleted';
  itemId: string;
  childId: string;
  starValue: number;
  completedAt: string;
  unlockEvents?: UnlockEvent[];  // from server, future
}
```

**Triggers:**
- Today updates (task state) — via `loadDay` refresh
- Universe updates (+stars, unlocks) — via `ChildUniverse.invalidate()`
- Family updates (future aggregation)

### 🚫 Rule

**No system may directly mutate another system's state. Only events.**

Implementation (vanilla JS interim): `ChildEventBus.emit('ActivityCompleted', payload)` in `child-event-bus.js`. Listeners subscribe per layer.

---

## 6. Component ownership matrix

| Component | Owns | Cannot touch |
|-----------|------|--------------|
| `TodayPage` / `ChildTodayFocus` + `ChildTodayTasks` | tasks, progress, goal teaser | universe, family |
| `UniversePage` / `ChildSkattHouse` | progression, rooms, avatar | tasks, family |
| `FamilyPage` / `FamilyMuseum` | shared narrative, aggregates | tasks, progression grind |

---

## 7. Review checklist (PR / lint)

```diff
+ Today shows ≤5 actionable tasks in focus mode
+ Today has RewardTeaser (+N ⭐) per incomplete task
+ Today hides header progress ring, calendar, history
+ Completion emits ActivityCompletedEvent
+ Universe listens to event (invalidate cache)
- Today imports or renders universe rooms
- Universe renders task checklist
- Family shows per-child star leaderboard
- Direct cross-store mutation without event
```

---

## 8. Implementation status (`main`)

| Contract item | Status | Kod |
|---------------|--------|-----|
| Today focus header | ✅ | `child-today-focus.js` |
| Task cap 3–5 | ✅ | `child-today-tasks.js` |
| RewardTeaser | ✅ | `child-today-tasks.js` |
| Hide header ring | ✅ | `child-today-focus.css` |
| ActivityCompletedEvent | ✅ | `child-event-bus.js` |
| 3-root bottom nav | ⚠️ | 2 tabs idag; Family V0 ej live |
| `/today` `/universe` routes | ⚠️ | Tab-state; React Phase 5 |
| Family Hall V0 | ❌ | Feature flag `familjehallen_v0` off |

---

## 9. One-line summary

**3 system, 3 UI:s, 3 hjärnor:**

| Today | Universe | Family |
|-------|----------|--------|
| Doing | Becoming | Belonging |

---

*Detta dokument är det formella kontraktet. Produktkontext: [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md). Implementation: [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md).*
