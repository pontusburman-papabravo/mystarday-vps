# RC-1 i18n release requirements

**PR:** #775 (`cursor/planning-calendar-library-i18n-fbe1`)  
**Status:** Merge after full manual journey passes (see R4).

---

## R1 — System data ≠ user data

| Origin | Activity rule | Reward rule |
|--------|---------------|-------------|
| Registration / standard-library copy / admin seed | `source = 'admin'` (or legacy `NULL` before column) | `source_default_id` set, `modified_by_family = false` |
| User creates | `source = 'user'` | no `source_default_id` |
| Family edits | `source = 'user'` on any PUT (icon/name/etc.) | `modified_by_family = true` on any PUT |
| Standard-library API | `CONTENT_SCOPE.STANDARD_LIBRARY` — always localize | same |

**Never:** `translations[name] || name` without origin verification.

### Prod audit (pre-merge spot-check)

```sql
-- Distribution — expect mostly admin/user; NULL = legacy seeds (still localized)
SELECT COALESCE(source, '(null)') AS source, COUNT(*) FROM activity_template GROUP BY 1 ORDER BY 2 DESC;

-- Rewards customized by families — must not localize
SELECT COUNT(*) FROM reward WHERE modified_by_family = true;

-- User activities that could collide with Swedish standard names
SELECT id, family_id, name, source
FROM activity_template
WHERE LOWER(name) IN ('middag', 'bad', 'frukost')
  AND source IS DISTINCT FROM 'user'
LIMIT 20;
```

Legacy rows with `source IS NULL` are treated as system-seeded (registration era). New code paths set `source='admin'` explicitly. Optional future backfill: only after per-family review.

---

## R2 — Locale parity

- `audit:i18n:strict` = 0  
- `audit:i18n:baseline` = 0  
- `test:e2e:i18n` = 23 pass, 0 skip, 0 fail  
- Swedish families (`preferred_locale = sv-SE`) unchanged

---

## R3 — Child handoff + logout

- Parent logout → login page in last family language (UI seed only; no `sd_locale_explicit_choice` on logout)  
- Child handoff preserves family locale when `english_child_experience` is on  
- Logging into a **different** account does not overwrite that family's DB locale

---

## R4 — Language switching (release blocker)

Språkbyte i Settings är lika kritiskt som login för engelsk lansering.

### Automated (green in CI)

- `test/e2e/i18n-settings-locale-switch.test.js`
  - sv-SE → en-GB → reload → logout → English login
  - en-GB → sv-SE → reload → logout → Swedish login

### Manual journey A — English → Swedish → English

1. Log in (English)
2. Settings → switch to **Swedish** — verify nav/modals/toasts Swedish immediately
3. **Calendar** — no half-localized chrome
4. **Today** — selected child loads correctly
5. **Library** — standard schedules/activities/rewards localized per family locale
6. **Schedule** — same
7. Settings → Profile & account — Swedish copy
8. **Logout** → login page **Swedish**
9. Log in again → still Swedish after reload

### Manual journey B — reverse

Repeat A in reverse (Swedish family → English in Settings → full path → logout → English login).

### Manual journey C — child path

After journey A or B:

1. Parent **child handoff**
2. Child login
3. Child **Today** — photo activity + sub-steps visible (no overflow clip)
4. **Treasure Chest** — goals/rewards use `display_name`
5. Child logout → parent logout → login language matches last family choice

### Manual journey D — user data guard

1. English family
2. Create activity named **Middag** (user-created)
3. Verify it stays **Middag** everywhere (not "Dinner")
4. Edit a system reward icon only → verify `modified_by_family` stops English rename

### Manual stress test (race / cache)

On Settings, rapidly:

```
English → Swedish → English → reload → logout → login
```

Repeat 3–4 times. No half-Swedish/half-English chrome, no blank Calendar/Today, no duplicate toasts.

---

## Merge sign-off

| Check | Owner |
|-------|-------|
| R1 audit query reviewed on staging/prod sample | Release |
| R4 journeys A–D passed on real phone (iOS + Android WebView) | QA |
| R4 stress test passed | QA |
| `test:gate` + `test:e2e:i18n` green on branch | CI |

**Do not merge #775 until R4 manual journeys pass.**
