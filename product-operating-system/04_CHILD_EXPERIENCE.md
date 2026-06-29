# 04 — Child Experience

**Version:** 1.0  
**Authority:** Child-facing product behavior; subordinate to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)

---

## Purpose

Define how children interact with Stjärndag: worlds, flows, interactions, offline behavior, and quality bar — so children **love** the app while **real life** improves.

## Scope

Child JWT experience: login, `child-dashboard.html` shell, three worlds, offline, celebrations. Excludes parent configuration (see [08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md)).

## Definitions

| Term | Definition |
|------|------------|
| **Barnmeny v2** | Three-world child navigation (`child-worlds.js`, `V2_ENABLED=true`) |
| **Today** | Schedule + activity completion world |
| **Min värld** | Skattkammaren / universe — reward exploration |
| **Mina personer** | Family hall — caregivers, siblings |
| **PIN gate** | Parent exit via `child-system-menu.js` + `parental-gate.js` |

---

## Child Experience North Star

Children should think:
- "I want to **build**."
- "I want to **visit my pet**."
- "I wonder **what changed**."

Never: "I need **more points**."

---

## Current State (verified)

### Shell & routing

| Item | Implementation |
|------|----------------|
| **Single HTML shell** | `public/child-dashboard.html` + 30+ JS modules |
| **Routes** | `/child/today`, `/child/world`, `/child/family` (+ legacy redirects) |
| **Auth** | `POST /api/auth/child-login`; child JWT 8h |
| **View config** | Per-child `child_view_config.view_mode` (classic vs magic) |
| **Header controls** | 🔄 Byt barn · ⚙️ Förälder (PIN) · 🚪 Logga ut |

### Today world

| Feature | File(s) |
|---------|---------|
| Day tabs | `child-today*.js` |
| NOW / NEXT / LATER | Schedule presentation |
| Complete activity | Tap → API → stars |
| Photo/visual cards | `child-dashboard-photo-cards.js`, `activity-visual.js` |
| Offline read | `offline-store.js` |
| Offline write queue | `offline-queue.js` |
| Rating modal | Optional post-completion |

### Min värld (universe)

| Feature | File(s) |
|---------|---------|
| Universe API | `child-universe-client.js` → `/api/me/universe` |
| Rooms | `child-skatt-house.js` (10 rooms) |
| Avatar, pet, museum | `child-avatar.js`, `child-pet.js`, etc. |
| Layer routing | `child-layer-router.js` (hash aliases) |

### Celebrations

| Feature | File(s) |
|---------|---------|
| Milestones 25/50/75% | `child-dashboard-celebrations.js` |
| Confetti | Celebrations module + **duplicate** in `child-dashboard.js` (debt) |

### Offline (PWA)

SW precaches child-critical assets; API network-only. Native app **unregisters SW** — requires network.

---

## Target State

| Area | Target |
|------|--------|
| **Interaction** | Drag/assemble in world; tap-complete on Today (acceptable) |
| **Navigation** | v2 bottom nav only — legacy tabs removed from HTML |
| **Celebrations** | Single module; delight budget ≤2s |
| **Copy** | Stars mentioned less than routine success |
| **Build fantasy** | Room customization feels like building — furniture/decor slots |
| **Discovery** | Post-completion "something changed in your world" — not push notification |
| **Offline native** | Read-only cache or honest offline message — no silent failures |
| **Accessibility** | Full WCAG audit on child flows |
| **Screen time** | No engagement loops; session ends naturally after routine |

---

## World Structure

```
┌─────────────────────────────────────────┐
│           child-dashboard.html           │
├─────────────────────────────────────────┤
│  Header: Byt barn | Förälder | Logga ut │
├─────────────────────────────────────────┤
│                                          │
│   [ Active world content ]               │
│                                          │
├─────────────────────────────────────────┤
│  Bottom nav: Idag | Min värld | Familj   │
└─────────────────────────────────────────┘
```

| World | Primary action | Secondary |
|-------|----------------|-----------|
| **Idag** | Complete next activity | See progress |
| **Min värld** | Explore / customize | Redeem rewards — [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) |
| **Familj** | See people | Emotional connection |

---

## Interaction Rules

**C-01** No forms (text inputs) except PIN login page.  
**C-02** No schedules editing in child UI.  
**C-03** One primary action visible on Today — the next activity.  
**C-04** Celebrations never block parent-approved redemptions flow.  
**C-05** Pet/room visits require no payment or secondary currency.  
**C-06** Sibling comparison forbidden — no leaderboards.  
**C-07** Exit to parent requires PIN when parent PIN set.  
**C-08** Child API deny-by-default on server — never bypass in client only.

---

## Login Flow

| Step | Current State |
|------|---------------|
| Parent logged in | Child picker from session |
| No parent session | Manual name + PIN on `child-login.html` |
| Lockout | Exponential backoff; parent notified at 3 fails |

Target: unchanged mechanics; improved illustration and error copy (reduce fear).

---

## Examples

### ✅ Good child moment

Child taps "Äta frukost" → checkmark + small star burst → "Nästa: Borsta tänder" highlighted.

### ❌ Bad child moment

Modal: "Du har 3 stjärnor kvar till nästa nivå!" before showing routine.

---

## Anti-patterns

- Dashboard of stats on child home
- Generic card grid without illustration
- Forcing child through Skattkammaren before routine
- Loot-box random rewards
- Duplicate navigation (legacy tabs + bottom nav)

---

## Acceptance Criteria

Child feature complete when:

- [ ] Tested on iOS WebView + Android WebView + mobile Safari
- [ ] Works offline for Today read + completion queue (PWA)
- [ ] No C-01–C-08 violations
- [ ] Celebrations respect delight budget
- [ ] `child-access-integration.test.js` patterns still pass for API scope

---

## Implementation Guidance

**Key files:** `public/child-dashboard.html`, `public/js/child-shell.js`, `public/js/child-worlds.js`, `src/middleware/child-parent-api-block.js`.

**Do not** add new global `window.*` handlers without documenting in [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md).

**Universe invalidation:** `ChildUniverse.invalidate()` on task complete via `child-event-bus.js` — preserve this pattern.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Celebration rules |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Redemption in world |
| [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | Unlock logic |
| [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) | Visual standards |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Child JWT, offline |

---

## AI Instructions

1. Never add child-facing configuration screens.
2. Prefer extending `child-*.js` modules over growing `child-dashboard.js`.
3. Test child API paths against allowlist in `child-parent-api-block.js`.
4. Label PRs `child-surface` for QA routing — [12_QA_SYSTEM.md](./12_QA_SYSTEM.md).

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Child love + real life linked via Today-first structure |
| **CPO** | Three worlds map to routine / reward / belonging |
| **CTO** | Current file map accurate; consolidation debt acknowledged |
| **Principal Engineer** | Offline + deny-by-default called out |
| **Senior Game Designer** | Target drag/build in world — realistic phased |
| **UX Director** | C-03 one-primary-action is strong rule |
| **Art Director** | Photo cards and rooms need visual QA checklist |
| **QA Director** | Acceptance includes integration test reference |
| **Security Engineer** | PIN gate + API block correct |
| **AI Systems Architect** | Module map prevents child-dashboard.js bloat |

**Approved:** All roles — v1.0.
