# 07 — Reward System

**Version:** 1.0  
**Authority:** Star economy, rewards, Skattkammaren redemption — Reality Wins

---

## Purpose

Define how stars and rewards connect **real-world accomplishments** to **meaningful treats** — without becoming a points economy.

## Scope

Stars, balances, rewards CRUD, redemptions, parent approval, child Skattkammaren. Universe room unlocks cross-reference [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md).

## Definitions

| Term | Definition |
|------|------------|
| **Star** | Proxy for completed effort — not currency for its own sake |
| **Skattkammaren** | In-app treasury where rewards live (child world) |
| **Redemption** | Child spends stars for family-defined reward |
| **Lifetime stars** | Cumulative earned — drives universe unlocks |
| **Balance** | Earned minus approved redemptions |

---

## North Star

> Stars prove the loop works. **The treat in real life** is the reward. Skattkammaren is the **bridge**, not the destination.

Parents define rewards as **real family treats** (movie night, extra story, small toy) — not virtual items only.

---

## Current State (verified)

### Data model

| Table | Role |
|-------|------|
| `daily_log_item` | Completion + `star_value` |
| `reward` | Family-scoped reward definitions |
| `reward_redemption` | Spend + approval state |
| `default_reward` | Global library (admin) |

### API (`src/routes/rewards.js`)

| Endpoint | Actor |
|----------|-------|
| `/api/rewards` CRUD | Parent |
| `/api/me/rewards` | Child list |
| `/api/me/rewards/:id/redeem` | Child spend |
| Approve/deny | Parent |

**Race protection:** `SELECT FOR UPDATE` on redemption — mirrored in tests.

### Balance

`getStarBalance()` = earned − approved/auto redemptions.

### Surfaces (naming collision — see PA docs)

| Surface | Path | Audience |
|---------|------|----------|
| Child Skattkammaren | child world + `child-dashboard-rewards.js` | Child |
| Parent overview | `skattkammaren-parent.html` | Parent |
| Marketing SEO | `skattkammaren.html` | Public |
| Library tab | `library.js` | Parent CRUD |

### Offline

`offline-queue.js` can queue redemptions — sync on reconnect.

---

## Target State

| Area | Target |
|------|--------|
| **Copy** | De-emphasize star counts in child UI |
| **Rewards** | Onboarding seeds 3–5 meaningful default rewards |
| **Approval** | Optional per reward — default auto-approve for low-star items |
| **Analytics** | Track redemption → real-world follow-through (parent survey later) |
| **Tests** | HTTP integration tests in CI gate |
| **Naming** | Analytics events disambiguate `skattkammaren_child` vs `skattkammaren_marketing` |
| **Inflation guard** | Admin alert if family sets all activities to max stars |

---

## Economy Rules

**R-01** Stars awarded only on verified completion (`daily_log_item.completed`).  
**R-02** Stars cannot be purchased with money.  
**R-03** Redemption deducts balance atomically.  
**R-04** Parent can deny redemption — child sees calm explanation.  
**R-05** No trading/gifting stars between children (unless explicit future feature + Decision Log).  
**R-06** Lifetime stars monotonic — never decrease (universe uses separate counter).  
**R-07** Reward cost in stars must feel achievable within ~1 week of normal use for defaults.  
**R-08** Virtual-only rewards allowed but must pair with copy linking to real celebration.

---

## Default Star Values (Current State)

Per-activity `star_value` on template — family editable. Registration seeds ~56 activities with default values from `default_activity_template` or hardcoded fallback.

**Target:** Journey phase `SETTING_UP` suggests balanced defaults — not zero, not inflationary.

---

## Redemption Flow

```
Child completes activities → balance increases
Child opens Skattkammaren → selects reward → redeem request
If approval required → parent notification → approve/deny
Child sees confirmation → REAL WORLD treat happens offline
```

**Critical:** App must never imply the digital redemption replaces the real treat.

---

## Examples

### ✅ Good reward

"Filmkväll på fredag" — 20 stars — parent approves — family actually watches film.

### ❌ Bad reward

"Infinite gems pack" — no real-world anchor.

---

## Anti-patterns

- Star leaderboard between siblings
- Daily star multiplier for logins
- Rewards that only change avatar with no routine link
- Negative stars / punishment deductions

---

## Acceptance Criteria

Reward change complete when:

- [ ] R-01–R-08 preserved
- [ ] Redemption race test updated if logic touched
- [ ] Child + parent surfaces tested
- [ ] Analytics event names disambiguated

---

## Implementation Guidance

Files: `src/routes/rewards.js`, `public/js/child-dashboard-rewards.js`, `public/js/skattkammaren-parent-page.js`, `db/child-universe.js` (lifetime stats).

Promote `rewards.test.js` to HTTP integration — Target milestone.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Motivation |
| [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | Lifetime stars |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child UI |
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Approval |
| [08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md) | Reward CRUD in library |

---

## AI Instructions

Never add star purchase IAP. Any new currency requires Decision Log + CEO approval.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Real-world treat emphasis protects mission |
| **CPO** | Three Skattkammaren surfaces flagged for analytics |
| **CTO** | Race protection documented |
| **Principal Engineer** | CI test gap noted |
| **Senior Game Designer** | R-08 achievability guideline good |
| **UX Director** | Deny flow needs calm copy — implied |
| **Art Director** | N/A |
| **QA Director** | Race test referenced |
| **Security Engineer** | Child redeem scoped to JWT |
| **AI Systems Architect** | R-rules citable |

**Approved:** All roles — v1.0.
