# 03 — Design System

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
