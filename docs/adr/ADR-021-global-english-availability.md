# ADR-021 — Global English availability

**Status:** Accepted (2026-08-04)  
**Related:** ADR-017, `docs/GLOBAL-ENGLISH-BETA-SOURCE-AUDIT-2026-08-04.md`

## Context

English UI (en-GB) shipped behind per-family `english_app` (`features` + `family_features`, status `dev`). New registrations and explicit opt-in paths could grant `english_app`, but most existing families could not select English in settings without admin assignment.

Product decision: **English should be selectable for all families** when globally enabled, without auto-changing anyone’s language.

## Decision

### Global flag

| Key | Table | Default | Role |
|-----|-------|---------|------|
| `english_app_global_enabled` | `feature_flag` | **OFF** | Kill switch / rollout gate for **new** English selection for authenticated families |

**Global English Availability gör engelska valbart för alla familjer. Den ändrar inte automatiskt en befintlig familjs språk.**

### Central semantics (`src/lib/i18n-flags.js`)

| Function | Behavior |
|----------|----------|
| `isEnglishAppEnabled(familyId)` | Pre-auth (`null`) → `true`. Global ON → `true`. Global OFF → `hasAccess(english_app)` OR `preferred_locale = en-GB` (grandfather active en-GB UI). |
| `canSelectEnglishLocale(familyId)` | Pre-auth → `true`. Global ON → `true`. Global OFF → `hasAccess(english_app)` only (no grandfather for **new** selection). |

Flag read errors: **fail closed** (`enabled` treated as `false`). Server logs `[ENGLISH_GLOBAL_FLAG_READ_FAILED]` with the DB error message. `/health` exposes `english_global_flag_read_ok`, `english_global_flag_enabled`, and `english_global_flag_read_error` when the read fails (overall `status` remains `healthy` — English gate is fail-closed, not a process crash).

Reads do **not** mutate `family_features`.

### Relations

| Mechanism | Role when global ON |
|-----------|----------------------|
| `english_app` (`family_features`) | Optional; still inserted on explicit en-GB choice for rollback to per-family beta |
| `english_language_offer` | Existing-family **prompt only**; does not gate basic English access |
| `english_child_experience` | **Unchanged** — separate gate for `child_en` / English child UI |

### Kill switch OFF fallback (families already on en-GB)

- Stored `preferred_locale = en-GB` **unchanged**
- `isEnglishAppEnabled` remains `true` (grandfather) so parent UI does not break
- `canSelectEnglishLocale` is `false` without `english_app` row — blocks **new** switches to en-GB (e.g. sv → en after revert)
- Child UI follows `english_child_experience` as before (`child_se` vs `child_en`)

### Rollback

1. `UPDATE feature_flag SET enabled = false WHERE key = 'english_app_global_enabled';`
2. No migration down required for normal ops
3. Families on en-GB keep UI via grandfather rule until they change locale or receive `english_app` row

Migration: `1810170000000_english_app_global_enabled_flag.js`

## Release

See `docs/releases/GLOBAL-ENGLISH-AVAILABILITY-RELEASE.md`. Enable flag only after smoke; default at deploy is OFF.
