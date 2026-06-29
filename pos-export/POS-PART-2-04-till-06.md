**Version:** 1.0  
**Authority:** Visual execution of [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md)

---

## Purpose

Define the visual and interaction language for Stjärndag: tokens, typography, components, motion, and accessibility — so every surface feels **handcrafted**, warm, and polished (Nintendo / Pixar / Apple bar).

## Scope

Parent magic UI, child worlds, shared components, marketing pages served from `public/`. Admin panel follows a **separate ops aesthetic** — functional, not magic — documented briefly here.

## Definitions

| Term | Definition |
|------|------------|
| **Magic UI** | Parent design system (`parent-magic-*`, `dashboard-magic.css`) |
| **Child worlds** | Barnmeny v2 three-world shell |
| **Token** | Named color, spacing, radius, shadow value |
| **Delight budget** | Max ~2s celebration before returning user to next action |

---

## Design North Star

> Everything should feel **handcrafted** — never generic SaaS, never enterprise dashboard, never Material-default.

**Quality bar:** Nintendo responsiveness · Pixar emotional warmth · Apple spacing and polish.

---

## Color Tokens (Current State — verified in CSS)

| Token | Hex / class | Usage |
|-------|-------------|--------|
| **Gold** | `#F5A623` · `bg-gold`, `text-gold` | Primary CTA, stars, warmth |
| **Navy** | `#1B2340` · `bg-navy`, `text-navy` | Text, headers, dark surfaces |
| **Lavender** | Tailwind custom · `border-lavender`, `bg-lavender` | Soft borders, inactive states |
| **Gold light** | `bg-gold-light` | Highlights, coach cards |
| **White / cream** | Card backgrounds in magic view | Content surfaces |

**Splash / native:** Capacitor SplashScreen `#F5A623` — `capacitor.config.ts`.

### Target State

- Centralize tokens in `public/css/tokens.css` (new file) — imported by Tailwind build
- Document dark mode (`parent-theme-light` vs default dark magic) as first-class
- Child world palette per room theme (castle, treehouse, space) — extend without breaking parent tokens

---

## Typography

| Context | Current State | Target State |
|---------|---------------|--------------|
| **Parent** | System stack via Tailwind; semibold headings | Defined scale: display / title / body / caption |
| **Child** | Larger touch targets; emoji as icon language | Minimum 16px body; 44px touch targets |
| **Language** | Swedish primary | i18n-ready; no hardcoded strings in CSS |

**Rules:**
- Headlines: warm, short, Swedish sentence case
- Never all-caps except legal microcopy
- No monospace except code/admin

---

## Spacing & Layout

| Rule | Value / pattern |
|------|-----------------|
| Card radius | `rounded-2xl` (parent magic standard) |
| Card padding | `p-4` minimum |
| Section gap | `mb-4` between actionable cards |
| Safe area | `platform-native.css` — env(safe-area-inset-*) |
| Max content width | Readable on phone; tablet uses side margins |

**Anti-pattern:** Dense table layouts on parent home — forbidden by [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) P-04.

---

## Components

### Parent (Current State)

| Component | Location | Notes |
|-----------|----------|-------|
| Magic shell | `parent-magic-shell.js`, `parent-magic-common.css` | Page class `parent-magic-view` |
| Native tab bar | `native-tab-bar.js`, `nav-config.js` | 6 primary tabs |
| Coach card | `engine-coach.js`, `journey-coach.js` | Target: single `#coachMount` |
| Hub grid | `planning-hub.js`, `rewards-hub.js` | Link grids — acceptable |
| Activity card | `dashboard.js`, `schedule-core.js` | Section cards fm/em/kväll |

### Child (Current State)

| Component | Location |
|-----------|----------|
| World nav | `child-worlds-nav.js` |
| Activity row | `child-today*.js` |
| Skattkammaren room | `child-skatt-house.js` |
| Milestone overlay | `child-dashboard-celebrations.js` |

### Target State components (to design/build)

| Component | Purpose |
|-----------|---------|
| `CoachCard` | Single unified coach — Journey-fed |
| `RoutineActivityTile` | Child tap target — visual-first |
| `WorldRoomFrame` | Consistent room chrome for universe |
| `ApprovalChip` | Parent one-tap approve/deny |

---

## Motion

| Type | Current State | Target State |
|------|---------------|--------------|
| **Celebration** | Confetti, dopamine burst — `child-dashboard-celebrations.js` | Centralized; delight budget enforced |
| **Transitions** | CSS `transition-colors`; soft nav DOM swap | Shared motion tokens (duration, easing) |
| **Haptics** | `platform.js` — native + vibrate fallback | Haptic on child completion only |
| **Reduced motion** | Partial | Respect `prefers-reduced-motion` everywhere |

**Rules:**
- Motion confirms accomplishment — never blocks next routine step
- No infinite animations on home screens
- Parent UI: subtle; child UI: more expressive

---

## Iconography

| Context | Standard |
|---------|----------|
| Parent nav | Emoji icons in `nav-config.js` — Current State |
| Child | Emoji + illustrated activity images |
| Target | Custom SVG set for nav — emoji fallback for accessibility |

---

## Accessibility (baseline)

| Requirement | Current State | Target State |
|-------------|---------------|--------------|
| Touch targets | ≥44px on child controls | Audit all child flows |
| Contrast | Gold on white/navy — verify WCAG AA | Automated contrast check in CI |
| Screen reader | Coach cards have `role="region"` | Full audit — SYSTEM_ANALYSIS gap |
| PIN entry | Numeric keyboard | Labelled inputs |
| Reduced motion | Incomplete | Required for celebrations |

---

## Admin UI

**Current State:** Separate SPA, dense tables acceptable for operators.  
**Rule:** Admin aesthetic does **not** leak into parent or child surfaces.

---

## Rules

**DS-01** Use magic palette tokens — no ad-hoc hex in new CSS.  
**DS-02** `rounded-2xl` for parent cards unless child world theming overrides.  
**DS-03** Primary CTA: `bg-gold` + white text.  
**DS-04** No generic shadcn/Material/card-dashboard patterns.  
**DS-05** Tailwind via **`tailwind.build.css`** only — no CDN (Current State enforced in CI).  
**DS-06** New pages inject `platform-theme.js` via `platform-html` middleware.  
**DS-07** Celebrations ≤ delight budget — [06_GAME_DESIGN.md](./06_GAME_DESIGN.md).

---

## Examples

### ✅ On-system

Journey coach card: indigo/gold border, one CTA, `rounded-2xl`, Swedish copy.

### ❌ Off-system

Gray Bootstrap table on Hem with sortable columns.

---

## Anti-patterns

- Tailwind CDN in HTML
- `public/v2/` mockups copied to live parent/child surfaces without design review
- Duplicate confetti implementations
- Hidden legacy sidebars still styled in DOM

---

## Acceptance Criteria

UI change is design-system compliant when:

- [ ] Uses token colors (gold/navy/lavender)
- [ ] Passes touch target check on mobile
- [ ] No enterprise dashboard patterns on parent/child
- [ ] Motion has end state within delight budget
- [ ] `npm run check:css` passes if Tailwind classes changed

---

## Implementation Guidance

**Files:**
- `public/css/parent-magic-common.css` — parent dark magic overrides
- `public/css/dashboard-magic.css` — dashboard-specific
- `public/css/platform-native.css` — Capacitor adjustments
- `scripts/css-build.mjs` — Tailwind pipeline

**Process:** Edit Tailwind sources → `npm run css:build` → commit `tailwind.build.css` + bump `public/sw.js` cache version per existing CI gate.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) | Design principles |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child layout |
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Parent layout |
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Motion/celebration |
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | CSS gate in CI |

---

## AI Instructions

1. Never add Tailwind CDN links.
2. Match existing class patterns (`rounded-2xl`, `bg-gold`, `text-navy`).
3. Do not introduce new color hex without adding to token table and Decision Log.
4. Read `large-files.mdc` before editing large HTML/CSS.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Quality bar (Nintendo/Pixar/Apple) is aspirational but actionable via rules |
| **CPO** | Anti-dashboard rules reinforced |
| **CTO** | Tailwind build pipeline documented — matches CI |
| **Principal Engineer** | Token centralization marked Target — reduces drift |
| **Senior Game Designer** | Delight budget linked — good |
| **UX Director** | Component inventory maps to real files |
| **Art Director** | Gold/navy palette codified; room themes flagged for expansion |
| **QA Director** | Acceptance criteria + a11y gap acknowledged |
| **Security Engineer** | N/A visual |
| **AI Systems Architect** | DS-01–07 machine-citable |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/04_CHILD_EXPERIENCE.md
================================================================================

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


================================================================================
FILE: product-operating-system/05_PARENT_EXPERIENCE.md
================================================================================

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


================================================================================
FILE: product-operating-system/06_GAME_DESIGN.md
================================================================================

# 06 — Game Design

**Version:** 1.0  
**Authority:** Play, motivation, and celebration design — subordinate to Reality Wins ([02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) P-01)

---

## Purpose

Define **how** Stjärndag motivates children without becoming a points game — Nintendo-quality delight in service of real routines.

## Scope

Motivation loops, celebrations, progression framing, session design. Economy numbers live in [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) and [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md).

## Definitions

| Term | Definition |
|------|------------|
| **Intrinsic loop** | Child wants to complete routine for real-world outcome |
| **Extrinsic layer** | Stars, rooms, pet — reinforce intrinsic |
| **Delight budget** | ~2 seconds max celebration before next action |
| **Progress fiction** | Narrative wrapper (Skattkammaren) — not separate game |

---

## Game Design North Star

> **Play is the reward. Reality is the goal.**

The app is **not** a game that happens to have routines — it is a **routine product** with game-quality presentation.

Children should **never** optimize for points at the expense of brushing teeth.

---

## Motivation Stack (Target State)

```
Layer 4: Discovery     — "What changed in my world?"
Layer 3: Identity      — "This is MY pet / MY room"
Layer 2: Progress      — "I'm getting through my day"
Layer 1: Reality       — "Morning works better"
```

All layers must connect to **Layer 1**. If Layer 4 doesn't require Layer 1 progress, reject the feature.

---

## Current State (verified)

| Mechanism | Location | Assessment |
|-----------|----------|------------|
| Star on completion | daily-log pipeline | Core extrinsic — OK if de-emphasized in copy |
| Milestone 25/50/75% | `child-dashboard-celebrations.js` | Good — tied to daily routine |
| Confetti | celebrations + duplicate in child-dashboard | Consolidate |
| Room unlocks | `universe-engine.js` lifetime stars | OK — long horizon |
| Achievements/collectibles | DB-driven rules | Untested — risk |
| Streak | `streak-updater.js` midnight | **Risk:** FOMO if surfaced aggressively |
| Pet | `child-pet.js` | Good reward destination |
| Pending redemption banner | `child-rewards-engine.js` | Links to real treat |

---

## Target State

| Mechanism | Target behavior |
|-----------|-----------------|
| **Celebrations** | Single module; `prefers-reduced-motion` support |
| **Copy** | "Du klarade det!" > "Du fick 3 stjärnor" |
| **Streak** | Private gentle badge — never guilt copy |
| **Unlock pacing** | Early rooms fast (0–10 stars); museum late (100) — tune for 200-family cohort |
| **No grind** | No repeatable meaningless actions for stars |
| **Session end** | After routine complete, world exploration OK — no infinite loop |
| **Adaptive difficulty** | Consider lowering thresholds for low-activity children (Decision Log future) |

---

## Rules

**G-01** No mechanic that rewards opening app without completion.  
**G-02** No sibling leaderboards or comparisons.  
**G-03** No random loot boxes.  
**G-04** Celebrations ≤ delight budget.  
**G-05** Every unlock rule must map to `evaluateRule()` type tied to real behavior — [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md).  
**G-06** No pay-to-win — IAP unlocks features, not stars.  
**G-07** Pedagog/educator gamification forbidden on child UI.  
**G-08** New mini-games require CEO + Game Director approval.

---

## Celebration Design

| Event | Current | Target |
|-------|---------|--------|
| Activity complete | Star + optional rating | Brief haptic + checkmark + optional 1s burst |
| Daily milestone | Confetti at 25/50/75% | Same; reduced motion fallback |
| Room unlock | Server sync | In-world reveal animation when child enters |
| Redemption approved | Banner | Child sees treat acknowledgment — link to real world |

**Anti-pattern:** Full-screen 5s animation blocking "next activity."

---

## Examples

### ✅ Good game design

After completing all morning tasks: "Morgonen klar! Kolla om något hänt i Skattkammaren" — optional, skippable.

### ❌ Bad game design

Daily login bonus star.

---

## Anti-patterns

- Points shop for cosmetic-only items with no routine gate
- "Streak broken!" shame messages
- Achievement pop-ups during time-sensitive school prep
- Variable ratio rewards (casino psychology)

---

## Acceptance Criteria

Game feature approved when:

- [ ] Layer 1 connection documented
- [ ] G-01–G-08 pass
- [ ] Delight budget measured in ms
- [ ] Tested with `prefers-reduced-motion: reduce`
- [ ] Senior Game Designer sign-off in PR (human)

---

## Implementation Guidance

Extend `child-dashboard-celebrations.js` — do not add parallel celebration systems.

Universe rules: edit via admin achievement definitions + `universe-engine.js` — always add tests when changing thresholds (Target — currently gap).

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Surfaces |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Economy |
| [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | Unlocks |
| [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) | Motion |

---

## AI Instructions

Reject features that increase "time in app" without completion correlation. Cite G-rules in review.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Layer stack prevents casino drift |
| **CPO** | Copy guidance supports mission |
| **CTO** | Points to existing modules — no fantasy systems |
| **Principal Engineer** | Test gap on universe rules flagged |
| **Senior Game Designer** | Streak FOMO risk correctly flagged |
| **UX Director** | Skippable exploration — good |
| **Art Director** | Room reveal — art opportunity |
