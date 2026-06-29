# 05 — Parent Experience

**Version:** 1.0  
**Authority:** Parent-facing product behavior

---

## Purpose

Define how parents experience Stjärndag: navigation, Hem, coaching, planning, approvals — so parents feel **less conflict**, **more trust**, and **guided** — never like they run enterprise software.

## Scope

Parent JWT (`type:'parent'`) magic UI, onboarding, pedagog dual-role surfaces. Admin is out of scope.

## Definitions

| Term | Definition |
|------|------------|
| **Magic shell** | `parent-magic-view` page wrapper + tab bar |
| **Hem** | `/dashboard` — primary home |
| **Coach** | Next-step card — Target: Journey-only |
| **Soft nav** | `parent-magic-router.js` partial page swap |
| **Configuration debt** | Every setting screen |

---

## Parent Experience North Star

Parents should feel:
- "I **argue less**."
- "My child **reminds me**."
- "This app **actually helps**."

Never: "My child wants **more screen time**."

---

## Current State (verified)

### Navigation (`nav-config.js`)

| Tab | Href | Cluster |
|-----|------|---------|
| Hem | `/dashboard` | dashboard, daily-log |
| Planering | `/planning` | schedule, library, calendar, activities |
| Belöningar | `/rewards` | rewards, skattkammaren-parent |
| För dig | `/for-dig` | growth content |
| Familj | `/family` | members, child settings |
| Inställningar | `/settings` | account, notifications |

Native: `native-tab-bar.js`. Web: sidebar hidden via `parent-magic-legacy-hide`.

### Hem (`dashboard.html`)

| Element | Current State |
|---------|---------------|
| Schedule cards | Child tabs + section cards (fm/em/kväll) |
| Coach surfaces | **Up to 3:** readiness, engine, journey — conflict detection in `engine-client.js` |
| Real-time | `dashboard-sse.js` |
| Star history chart | `dashboard-star-history.js` — **product debt** (statistics on home) |
| CTAs | Co-parent invite, share app — `dashboard-cta.js` |
| Soft nav | **Excluded** — full reload for dashboard |

### Onboarding (`onboarding.html`)

6 steps: child → view → template → PIN → handoff → done.  
Starter plan AI: `onboarding-starter-plan.js`.  
**Gap:** global library empty in dev without harvest.

### Planning

Hub → schedule editor (`schedule.js` ~2594 lines), library ([08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md)).

### Approvals

Give stars, pause activities, redemption approve/deny — `dashboard-approvals.js`, `dashboard-card-actions.js`.

---

## Target State

| Area | Target |
|------|--------|
| **Hem coach** | Single `#coachMount` fed by `GET /api/me/journey-context` only |
| **Legacy removal** | `#homeReadinessMount`, `#engineCoachMount` retired |
| **Home content** | Today-oriented actions — not analytics |
| **Statistics** | Weekly story (`dashboard-weekly-story.js`) — no star chart on Hem |
| **Onboarding** | Pre-filled schedule; ≤3 decisions before First Success path |
| **Soft nav** | Expand only if bundle size reduced — not required for v1 Target |
| **Pedagog role** | Hidden until `pedagog` component; never default home |

---

## Coach Authority (critical)

### Current State — fragmented

| System | API | Client |
|--------|-----|--------|
| Readiness | `/api/family/readiness` | `home-readiness.js` |
| Product Engine | `/api/family/first-success` | `engine-coach.js` |
| Journey | `/api/me/journey-context` | `journey-coach.js` |

### Target State — unified

```
Journey Context → single coach card → one CTA → deep link
```

**Rule PA-01:** No new coach surfaces.  
**Rule PA-02:** All "what's next" copy from Journey registry — not hardcoded in HTML.

Per [14_DECISION_LOG.md](./14_DECISION_LOG.md) ADR-001.

---

## Parent UI Rules

**PA-03** No dashboards on Hem — actionable cards only.  
**PA-04** No generic stat cards without recommended action.  
**PA-05** Every empty state replaced with Journey experience or prefill.  
**PA-06** Approvals are exception UI — not home default.  
**PA-07** PIN gate protects child→parent transition (`parental-gate.js`).  
**PA-08** Magic UI only — no classic parent toggle (`app-view-mode.js`).  
**PA-09** Swedish copy; calm tone — never punitive toward child.  
**PA-10** Push/email must pass Journey Gate — [14_DECISION_LOG.md](./14_DECISION_LOG.md).

---

## Key Flows

### Morning (Target narrative)

1. Coach: "Morgonrutin väntar — öppna [barn]s vy"
2. Parent hands device OR child opens own login
3. Child completes — parent gets optional approval notification
4. Coach confirms: "Bra start idag"

### Reward approval

1. Child redeems in Skattkammaren
2. Parent sees pending in Belöningar or notification
3. One-tap approve — [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md)

### Add child

`onboarding.html` or `child-new.html` — must leave family feeling **more complete** (Rule 5).

---

## Examples

### ✅ On-spec Hem

One coach card: "Visa Elias kvällsschema" + button → `/child/today`.

### ❌ Off-spec Hem

Three cards from three systems + 7-day star line chart.

---

## Anti-patterns

- Enterprise analytics (DAU, funnel) on parent home
- Settings link as primary CTA on Hem
- Onboarding that ends on empty dashboard
- Comparing children on star totals

---

## Acceptance Criteria

Parent change complete when:

- [ ] Hem shows ≤1 coach authority (Target) or conflict guard active (Current maintenance)
- [ ] PA-03–PA-10 satisfied
- [ ] Tested: new parent can reach First Success path without docs
- [ ] Journey phase transition if applicable — `journey-context.test.js` green

---

## Implementation Guidance

Files: `public/dashboard.html`, `public/js/dashboard*.js`, `public/js/journey-coach.js`, `src/routes/journey-context.js`.

**Flag rollout:** journey ops runbook in `docs/` — enable journey flags in waves; do not partial-enable coach without removing legacy mounts.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Rules 1–5 |
| [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) | P-04, P-08 |
| [08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md) | Library/planning |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Approvals |
| [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md) | First Success |

---

## AI Instructions

1. Do not add `#homeReadinessMount` or `#engineCoachMount` consumers.
2. Extend `journey-coach.js` for new coach UX.
3. Parent-facing stats require explicit CPO exception in Decision Log.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Coach consolidation is highest-impact parent fix — correctly prioritized |
| **CPO** | Star chart flagged as debt — aligns with anti-statistics principle |
| **CTO** | Current triple-system documented honestly |
| **Principal Engineer** | PA-02 registry-driven copy prevents scatter |
| **Senior Game Designer** | Parent as helper not player — clear |
| **UX Director** | Flow narratives usable for usability tests |
| **Art Director** | Magic shell referenced — consistent with 03 |
| **QA Director** | First Success path in acceptance criteria |
| **Security Engineer** | PIN gate referenced |
| **AI Systems Architect** | Explicit ban on new coach mounts |

**Approved:** All roles — v1.0.
