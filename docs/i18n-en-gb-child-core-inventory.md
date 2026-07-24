# P-i18n-Child-Core-C — inventory (planning only)

**Status:** Not implemented. Create after PR #713 and #715 are merged and deployed.

**Gate:** `english_child_experience` feature flag (use existing `family_features` / `feature_flag` system; create flag in child phase if absent).

---

## Surfaces to map

| Surface | Route / entry | Primary files | Notes |
|---------|---------------|---------------|-------|
| Child login | `/child-login` | `public/child-login.html`, `public/js/child-login.js` | Name+PIN, manual fallback |
| Child auth / link | API + session | `src/routes/auth/child-login.js` | PIN lockout copy |
| Child Today | `/child-dashboard` | `public/child-dashboard.html`, `public/js/child-dashboard.js` | Activity cards, sections |
| Sub-steps | In-card UI | `child-dashboard.js`, celebrations | |
| Complete / undo | Card actions | `child-dashboard.js`, daily-log API | |
| Star feedback | Post-complete | `child-dashboard-celebrations.js` | First star, milestones |
| Celebration | Confetti/burst | `child-dashboard-celebrations.js` | ≤2s, skippable (G-01) |
| Treasure Chest | `/skattkammaren` | child rewards engine | Not parent Skattkammaren |
| Bottom navigation | Child nav | `child-system-menu.js`, worlds nav | |
| My Collection | Barnets samling | collection modules | |
| My People | Mina personer | person modules | |
| My Space | Child theme/space | theme picker | |

---

## Copy classes

| Class | Action |
|-------|--------|
| Static HTML shell | `data-i18n` + early apply |
| Dynamic JS | `cpt()` / child pack |
| API errors | Server i18n where exists |
| User-authored activity names | **Do not translate** |
| System activities | Locale if architecture supports |
| Assets with baked text | Audit separately |
| Offline/sync messages | Honest messaging per POS |

---

## Recommended phase tickets

1. **C1 — Child login + session** — shell, PIN errors, lockout, aria
2. **C2 — Child Today core** — sections, cards, complete/undo, empty states
3. **C3 — Star + celebration** — first star, milestone copy, reduced motion
4. **C4 — Treasure Chest entry** — rewards grid chrome (not parent hub)
5. **C5 — Child nav + worlds** — bottom nav, system menu, My Collection/People/Space labels
6. **C6 — Child experience pack** — `config/i18n/child-{sv-SE,en-GB}.json` behind `english_child_experience`

---

## Feature flag strategy

- Reuse `english_app` for parent; add **`english_child_experience`** for child pack
- Default OFF for all families; enable per-family via `family_features` for QA
- Child routes check flag + `preferred_locale` before loading en-GB child fragments
- Do not show English child UI when flag OFF even if `preferred_locale = en-GB`

---

## Risks

| Risk | Mitigation |
|------|------------|
| Child cannot read English | Flag OFF by default; parent controls |
| Mixed parent EN + child SV | Expected until flag ON |
| Celebration blocking exit | POS G-01 tests |
| PIN/security copy wrong | Server-authoritative errors |
| Large `child-dashboard.js` | Chunk extract like parent phase |

---

## Recommended next prompt

> Implement **P-i18n-Child-Core-C** starting from `origin/main` after Planning-Family deploy. Create `english_child_experience` flag if missing. Localize Child Login + child Today P0/P1 + first-star celebration behind the flag. Do not touch parent Planning/Family surfaces. Journey 20/20 and migrations 0003/0004 immutable.
