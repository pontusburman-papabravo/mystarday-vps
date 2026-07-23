# Stabilisation hardening report — PR #709

**Branch:** `cursor/i18n-en-gb-platform-b8ba`  
**Date:** 2026-07-23

## Migration renames

Highest migration on `main`: `1810000000000_family_avatar_private_storage.js`

| Old (invalid future timestamp) | New |
|--------------------------------|-----|
| `1810100000000_family_preferred_locale.js` | `1810000000001_family_preferred_locale.js` |
| `1810100000001_english_app_flag.js` | `1810000000002_english_i18n_feature_flags.js` |
| `1810100000002_journey_registry_locale_en_gb.js` | `1810000000003_journey_registry_locale_en_gb.js` |

`1810000000002` registers `english_app` and `english_child_experience` in `features` (status `dev`, default OFF globally). Per-family access via `family_features`.

## child_en protection

`english_app` alone does **not** select `child_en`. Runtime requires **both**:

- `english_app` ON (family_features)
- `english_child_experience` ON (family_features)

Otherwise `en-GB` families keep `child_se`. Loader falls back to `child_se` if `child_en` pack is missing.

Remove or permanent the `english_child_experience` gate when the English child UX is complete.

## Auth email locale model

| Flow | Resolution |
|------|------------|
| Verification (register) | `family.preferred_locale` at insert time |
| Verification (resend) | `family.preferred_locale` from DB |
| Password reset | 1) `family.preferred_locale` via `parent.family_id` 2) validated `preferred_locale`/`language` on forgot-password body 3) `sv-SE` |

Parent has a single `family_id` today — no multi-family ambiguity.

Implementation: `src/lib/auth-email-locale.js`

## Feature flag QA (per family only)

```sql
-- Enable English parent/auth UI for QA family
INSERT INTO family_features (family_id, feature_slug)
VALUES ('<family-uuid>', 'english_app')
ON CONFLICT DO NOTHING;

-- Enable child_en for internal QA (requires english_app too)
INSERT INTO family_features (family_id, feature_slug)
VALUES ('<family-uuid>', 'english_child_experience')
ON CONFLICT DO NOTHING;

-- Disable both
DELETE FROM family_features
WHERE family_id = '<family-uuid>'
  AND feature_slug IN ('english_app', 'english_child_experience');

-- Status
SELECT ff.feature_slug, ff.enabled_at
FROM family_features ff
WHERE ff.family_id = '<family-uuid>'
  AND ff.feature_slug LIKE 'english%';
```

Do **not** enable globally for live families.

## Audit tiers

| Script | Purpose |
|--------|---------|
| `npm run audit:i18n` | Report strict + baseline + admin/SEO |
| `npm run audit:i18n:strict` | Gate: 0 hits in i18n infrastructure files |
| `npm run audit:i18n:baseline` | Gate: baseline file count must not increase |

Baseline count: see `scripts/audit-hardcoded-swedish-baseline.json`

## Locale compatibility

| Input | normalizeLocale | validateLocale |
|-------|-----------------|----------------|
| sv, sv-SE, sv_se | sv-SE | sv-SE |
| en, en-GB, en_gb | en-GB | en-GB |
| empty / invalid | null | sv-SE |

`/api/i18n/sv`, `/sv-SE`, `/en`, `/en-GB` → 200. Invalid → 400.

Legacy `sv.json` aliased to `sv-SE` in server loader.

## Swedish regression

- `sv-SE` registration still prefers `default_activity_template` DB library when present
- `config/default-content/sv-SE/` used only when DB templates empty (same fallback path as before for empty library)
- All flags OFF: `child_se`, `sv-SE` defaults unchanged

## Test gate comparison

Environment: Cursor Cloud, Node 20, Postgres 16, `NODE_ENV=test`, `REQUIRE_EMAIL_VERIFICATION=false`, Resend keys unset.

| | `origin/main` (`a87915f1`) | Branch (`0bf9689a`) |
|--|--|--|
| Unit (`test:gate:unit`) | 1156 pass / 0 fail | 1204 pass / 0 fail (+48 new i18n tests) |
| DB (`test:gate:db`) | 177 pass / 0 fail | 183 pass / 0 fail (+6 new i18n tests) |
| **Total** | **1333 pass / 0 fail** | **1387 pass / 0 fail** |

**Comparison:** No failures on either ref. The prior branch-only failures (`ios-swedish-localization` expecting iOS build 25, `meta-app-events` privacy marker) were caused by branch base drift — resolved by rebasing onto `origin/main` (iOS build 26 + Meta patch already on main).

Branch fixes included in gate: `dump-routes` (route inventory regenerated), locale matrix / auth-email / child-pack flag tests.

## Commits (hardening pass)

| SHA | Description |
|-----|-------------|
| `aaaaa8ad` | feat(i18n): locale platform, bundles, default content |
| `4d0b65c9` | feat(i18n): auth pages, settings switcher, child_en runtime |
| `0bf9689a` | fix(i18n): harden PR #709 foundation for merge |

## Deploy / SW

- Service worker: `stjarndag-v660` (`config/cache-version.json`, `public/sw.js`)
- New static assets: `public/js/i18n.js`, `locale-switcher.js`, `auth-entry-i18n.js`, locale JSON bundles via `/api/i18n/*`

## Conclusion

**Mergeable as i18n foundation** behind `english_app` + `english_child_experience` flags. English beta and child UX are **not** complete.
