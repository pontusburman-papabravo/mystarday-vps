# P-i18n-Child-Core-C — inventory (runtime verified)

**Status:** **BLOCKED** — prerequisites not met on `origin/main` as of 2026-07-24.

**Verified against:** `origin/main` @ `e73bfe8c` (2026-07-24).

---

## Prerequisite gate (must be true before implementation)

| Check | Result | Evidence |
|-------|--------|----------|
| PR #713 merged + deployed | ❌ | `gh pr view 713` → `state: OPEN`, `mergedAt: null` |
| PR #715 merged + deployed | ❌ | `gh pr view 715` → `state: OPEN`, `mergedAt: null` |
| Physical mobile QA #713 + #715 | ❌ | Not performed in cloud agent; required per project policy |
| `origin/main` has Home/Today/Planning/Library/Family i18n | ⚠️ Partial | Main has `home-*`, `today-*`, `onboarding-*` locale fragments; **no** `planning-*`, `library-*`, `family-*`, `nav-*` fragments (those are in open PR #713/#715) |
| Migration `0003` untouched | ✅ | SHA `42131fc0…` identical on branch and main |
| Migration `0004` untouched | ✅ | SHA `2d6b4a9f…` identical on branch and main |

**Do not start Child Core implementation until #713 and #715 are merged, deployed, and pass physical mobile QA.**

---

## Feature flag (already implemented)

| Item | Location | Notes |
|------|----------|-------|
| `english_child_experience` slug | `migrations/1810000000002_english_i18n_feature_flags.js` | Seeded in `features` table, default OFF |
| Gating logic | `src/lib/i18n-flags.js` | Requires **both** `english_app` AND `english_child_experience` |
| Pack selection | `src/lib/locale.js` → `experiencePackIdForLocale()` | `en-GB` → `child_en` only when flag ON; else `child_se` |
| Child pack resolver | `src/lib/experience-pack.js` → `resolvePackIdForChild()` | DB-backed per child |
| Family API exposure | `src/routes/family/core.js` | `english_child_experience_enabled` in family payload |
| Tests | `test/i18n-child-pack-flags.test.js` | Pack gating integration test exists |

### QA family activation

Use the QA test family documented in `docs/qa-test-account.md` (credentials in `docs/app-store-demo-konto.md`):

```sql
-- Family must already have preferred_locale = 'en-GB'
UPDATE family SET preferred_locale = 'en-GB' WHERE id = '<family_id>';

INSERT INTO family_features (family_id, feature_slug) VALUES
  ('<family_id>', 'english_app'),
  ('<family_id>', 'english_child_experience')
ON CONFLICT DO NOTHING;
```

Both flags required. Swedish families (`preferred_locale = 'sv-SE'`) are unaffected.

---

## Experience packs (partial — not wired to child UI chrome)

| Pack | Path | Schema parity | Child P0 copy |
|------|------|---------------|---------------|
| `child_se` | `config/experience-packs/child_se/` | Baseline | Swedish parent-facing experience strings in `copy.json` |
| `child_en` | `config/experience-packs/child_en/` | ✅ Same files/keys | English `copy.json` exists (3 experience keys) |

**Gap:** Experience packs cover world/scene progression copy, **not** child dashboard chrome (Today, login, nav, cards, steps). Child Core needs **`config/i18n/child-{sv-SE,en-GB}.json`** (or equivalent domain) + `child-app-i18n.js` bootstrap mirroring `parent-app-i18n.js`.

---

## Surfaces — runtime inventory

### 1. Child Login (`/child-login`)

| Area | Files | i18n today | Swedish gaps |
|------|-------|------------|--------------|
| HTML shell | `public/child-login.html` | Partial `data-i18n` via `auth.childLogin.*` in `src/locales/en-GB.json` | PIN step labels, empty states, manual name form, parent gate modal — mostly hardcoded Swedish in HTML |
| Runtime JS | `public/js/child-login.js` | **None** — overwrites `data-i18n` elements via `textContent` | ~25+ strings: greetings (`Hej {name}!`), modals (`Lägg till ett barn`, `Vuxen behövs`), PIN errors, lockout, offline, parent gate (`Föräldralås`), session restore |
| Bootstrap | `public/js/auth-entry-i18n.js` | Loads server locale bundle pre-auth | Child-login JS does not use `authT()` |
| Server errors | `src/routes/auth/child-login.js` | **Hardcoded Swedish** | All `res.status().json({ error: '...' })` strings |

**P0 keys needed:** profile picker, name+PIN, loading, lockout countdown, wrong PIN, offline, add-child flow, parent PIN gate, aria-labels, `1 minute` / `2 minutes` pluralization.

---

### 2. Child Today (`/child-dashboard`, `/child/today`)

| Area | Files | i18n today | Swedish gaps |
|------|-------|------------|--------------|
| HTML shell | `public/child-dashboard.html` | **None** (`lang="sv"`, Swedish `<title>`, header `title=` attrs) | Page title, header tooltips, print/dark mode/switch/logout |
| Core | `public/js/child-dashboard.js` | **None** | `DAY_NAMES`, `DAY_SHORT`, section labels (`Morgon`, `Kväll`), goal chip, NNL headers (`Nästa`, `Nu/Nästa/Senare`), auth gate message |
| Activities | `public/js/child-dashboard-activities.js` | **None** | `DAG_DEL_CONFIG` period labels, card chips (`Nästa`, `Redan`), empty states, one-off labels |
| Photo cards | `public/js/child-dashboard-photo-cards.js` | **None** | Intro tooltip, reward aria, drag handle title |
| Day nav | `public/js/child-dashboard-day-nav.js` | **None** | `DAY_SHORT` Swedish |
| Offline | `public/js/child-dashboard-offline.js` | **None** | Offline empty, retry button |
| Load day | `public/js/child-dashboard-load-day.js` | Audit needed | Loading/saving states |
| Checkoff | `public/js/child-dashboard-checkoff.js` | **None** | Score labels (10 Swedish strings), emotion cards, section complete toast, offline save, rating modal |
| Substeps | `public/js/child-dashboard-substeps.js` | **None** | `Delsteg`, `{done}/{total} klara`, load/save errors, reorder error |
| Celebrations | `public/js/child-dashboard-celebrations.js` | **None** | Milestone messages (25/50/75%), dopamin burst (visual only — no text) |
| Warmth | `public/js/child-dashboard-warmth.js` | **None** | Star count labels, goal hints, redemption story templates |
| Rewards (legacy tab) | `public/js/child-dashboard-rewards.js` | **None** | Full Skattkammaren chrome if reached via legacy path |
| Timers | `public/js/child-dashboard-timers.js` | Audit needed | Timer labels |

**No `child-app-i18n.js` exists.** Child dashboard does not call `I18n.init()` with family locale post-login.

---

### 3. Child navigation

| Area | Files | i18n today | Swedish gaps |
|------|-------|------------|--------------|
| Worlds config | `public/js/child-worlds.js` | **None** | `LEGACY_WORLDS` + `SAMLING_WORLDS` labels: `Idag`, `Min samling`, `Skattkammaren`, `Mina personer`, `Mitt`; back labels |
| Bottom nav | `public/js/child-worlds-nav.js` | **None** | Renders labels from `child-worlds.js` |
| System menu | `public/js/child-system-menu.js` | **None** | `Förälder` button label |
| World hub | `public/js/child-world-hub.js` | **None** | Hub choice labels (`Skattkammaren`, `Bocka av något på Idag först`) |

**Target en-GB nav labels (Barnets samling gate ON):** Today, My Collection, Treasure Chest, My People, My Space.

---

### 4. Treasure Chest entry (P0 scope)

| Area | Files | i18n today | Swedish gaps |
|------|-------|------------|--------------|
| Treasure view | `public/js/child-treasure-view.js` | Minimal | Entry shell |
| Treasure present | `public/js/child-treasure-present.js` | **None** | Status labels, goal copy, star balance (`X av Y stjärnor`), empty states, redeem CTA, history — **40+ strings** |
| Rewards engine | `public/js/child-rewards-engine.js` | **None** | Progress labels, pending approval |
| Dashboard rewards | `public/js/child-dashboard-rewards.js` | **None** | Legacy path — full Swedish |

**P0:** Entry CTA, star balance, empty state, nav label, back — not full reward management.

---

### 5. Server / API

| Endpoint | File | i18n |
|----------|------|------|
| Child login errors | `src/routes/auth/child-login.js` | Swedish only |
| Daily log errors | `src/routes/daily-logs/*` | Audit — likely Swedish |
| Child `/api/auth/me` | Returns child name (user data — do not translate) | OK |

---

## Recommended implementation architecture

```
config/i18n/child-sv-SE.json     ← new domain (mirror parent pattern)
config/i18n/child-en-GB.json
public/js/child-app-i18n.js      ← init after child session; ct() helper
```

1. Child login: extend `auth-entry-i18n` OR use `child-app-i18n` post-picker; replace all `textContent` Swedish in `child-login.js` with `authT()` / `ct()`; server errors via `Accept-Language` or family locale header.
2. Child dashboard: init i18n in `child-dashboard.js` boot after `/api/auth/me`; refactor split modules to use `ct()`.
3. Nav: localize `child-worlds.js` label resolution function (not duplicate world configs).
4. Experience pack: extend `child_en/copy.json` only for world hints on core path; UI chrome stays in i18n JSON domain.
5. Feature flag: child UI checks `english_child_experience_enabled` from `/api/auth/me` or family endpoint before loading `child-en-GB.json`.

---

## Copy classes

| Class | Action |
|-------|--------|
| Static HTML shell | `data-i18n` + early apply via `child-app-i18n.js` |
| Dynamic JS | `ct(key, params)` / `childPlural()` |
| API errors | Server i18n (`src/lib/i18n.js` t()) keyed by family locale |
| User-authored activity names, child names, parent names | **Do not translate** |
| System activities | Locale if `source=admin` (later phase; P0 = UI chrome only) |
| Color keyword rules (`COLOR_RULES_CHILD`) | Swedish keywords OK — match user content language, not UI |
| Offline/sync | Same keys as parent offline pattern |

---

## Test plan (to implement in `test/i18n-child-core.test.js`)

- Child login: sv-SE, en-GB, error messages, offline, session restore, locale persistence, child name untouched
- Today shell: loading, empty, next activity, completed, API error, offline/sync, date/time
- Steps: singular/plural, counter, next/previous, all done, error
- Completion: first star, multiple stars, no duplicate, retry, undo if supported
- Celebration: en-GB copy, sv-SE regression, duration unchanged
- Navigation: five labels, aria-labels, remount, session restore
- Experience pack: schema parity, flag OFF/ON, no visible Swedish in P0 en-GB path
- Integration: Login → Today → Activity → Steps → Complete → Star → Treasure entry (sv-SE + en-GB)

---

## Audit targets (post-implementation)

P0 files for `audit:i18n:strict = 0`:

- `public/child-login.html`, `public/js/child-login.js`
- `public/child-dashboard.html`
- `public/js/child-dashboard.js` + split modules (activities, substeps, checkoff, offline, celebrations, photo-cards, day-nav)
- `public/js/child-worlds.js`, `public/js/child-worlds-nav.js`, `public/js/child-system-menu.js`
- `public/js/child-treasure-present.js` (entry P0 only)
- `config/i18n/child-*.json`

Baseline must not increase above current main.

---

## Out of scope (document as backlog)

- Full My Collection, My People, My Space localization
- Deep Treasure Chest reward management / history
- Full child worlds/scenes copy beyond core path hints
- Child profile, garden, morgonhus, memory hall
- Rating modal deep copy (P1 unless on core path)
- Admin, SEO, legal, payment

---

## Risks

| Risk | Mitigation |
|------|------------|
| `child-login.js` overwrites `data-i18n` | Refactor to `authT()` / stop hardcoded `textContent` |
| Large `child-dashboard.js` ecosystem | Module-by-module; grep + chunk per `large-files.mdc` |
| Server PIN errors in Swedish for en-GB | Add server-side i18n in `child-login.js` route |
| Mixed EN parent + SV child before flag | Expected; flag OFF = Swedish child |
| Celebration blocking (G-01) | No copy/animation duration changes |
| Physical QA required | Do not merge without iOS + Android sign-off |

---

## Recommended next steps

1. Merge PR #713 → deploy → physical mobile QA
2. Rebase PR #715 on `main` → merge → deploy → physical mobile QA
3. Branch `cursor/i18n-child-core-b8ba` from updated `main`
4. Implement per architecture above
5. Bump SW (expect v669+)
6. `test:gate` + `audit:i18n:strict = 0`
7. Physical mobile QA checklist (19 flows × 4 platforms)
