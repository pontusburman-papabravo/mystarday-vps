# RC-1 i18n release requirements

**PR:** #775 (`cursor/planning-calendar-library-i18n-fbe1`)  
**Status:** Merge after R4-E locale torture test + journeys A–D pass.

---

## R1 — System data ≠ user data

| Origin | Activity rule | Reward rule |
|--------|---------------|-------------|
| Registration / standard-library copy / admin seed | `source = 'admin'` (or legacy `NULL` before column) | `source_default_id` set, `modified_by_family = false` |
| User creates | `source = 'user'` | no `source_default_id` |
| Family edits | `source = 'user'` on any PUT (icon/name/etc.) | `modified_by_family = true` on any PUT |
| Standard-library API | `CONTENT_SCOPE.STANDARD_LIBRARY` — always localize | same |

**Never:** `translations[name] || name` without origin verification.

### Live database audit results (2026-07-29)

**Distribution**

| `source` | Count | Notes |
|----------|-------|-------|
| `NULL` | 6 688 | Legacy registration / library copy era |
| `admin` | 32 | Recent explicit seeds |
| `user` | 0 | Appears after #775 deploy |

**NULL content review (not just counts)**

- Top NULL names (`Borsta tänderna`, `Middag`, `Vakna`, …) appear in **100–330 families** → standard registration seeds.
- Heuristic (name in ≤5 families): **558 NULL rows** likely user-created (`aaa`, `Äta frukost (Adrian)`, …).
- **~6 130 NULL rows** share names with >5 families → treat as system seeds (RC-1 OK).
- Collision on NULL: **1** `MIDDAG` + **1** `FRUKOST` in low-frequency bucket — possible user word picks; post-launch backfill candidate.
- **326** NULL `Middag` rows are **system** dinner activities (seeded name), not the R4 user-create test (`source=user`).

**RC-1 decision:** `NULL` → legacy system is correct for ~91% of NULL rows. ~558 user-like NULL rows accepted as post-launch debt.

### Post-launch backlog (tracked — not forgotten)

**PL-1 — Legacy `activity_template.source` backfill**

After go-live, with analysis and validation on live database samples:

- Backfill `activity_template.source = 'user'` for verified legacy rows with unclear provenance (heuristic start: `source IS NULL` and name appears in ≤5 families).
- Re-run collision query (`middag`, `bad`, `frukost` on non-`user` source).
- Do **not** block RC-1 launch; do **not** fold into i18n program — treat as a small data hygiene release bug.

```sql
-- Post-launch: likely user NULL rows (re-run before backfill)
WITH nf AS (SELECT name, COUNT(*) freq FROM activity_template WHERE source IS NULL GROUP BY name)
SELECT COUNT(*) FROM activity_template a JOIN nf ON nf.name=a.name AND nf.freq <= 5 WHERE a.source IS NULL;
```

```sql
-- Distribution
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
2. Create activity named **Middag** (user-created — must have `source=user` after save)
3. Verify it stays **Middag** everywhere (not "Dinner")
4. Edit a system reward icon only → verify `modified_by_family` stops English rename

### R4-E — Locale torture test (merge gate)

End-to-end path exercising navigation, locale switch, cache, reload, logout, login, handoff, and child shell. **Run on real phone before calling RC-1 green.**

| Step | Action |
|------|--------|
| 1 | Start logged in on **English** |
| 2 | Open **Calendar** |
| 3 | Settings → switch to **Swedish** |
| 4 | **Immediately** go to **Today** (do not wait for idle) |
| 5 | Switch back to **English** |
| 6 | Open **Library** |
| 7 | **Reload** |
| 8 | **Logout** |
| 9 | **Login** (same family) |
| 10 | **Child handoff** |
| 11 | **Child Today** |

**Pass criteria (both passes)**

- No blank Calendar / Today / Library / child views
- No half-Swedish / half-English chrome
- No stale fetch overwriting the new locale
- Child view follows family locale + `english_child_experience` rule
- User-created **Middag** stays **Middag** (not "Dinner") on parent and child Today

**Pass 1 — normal pace**  
Execute all 11 steps at comfortable speed.

**Pass 2 — stress timing**  
Same 11 steps: tap quickly, switch language again before render completes, open the next page early, reload mid-flow. Targets races already seen in Calendar, Today, `parent-i18n-ready`, and child handoff.

Do not add extra steps beyond the 11 above.

### Manual stress test (Settings-only, lighter)

On Settings, rapidly:

```
English → Swedish → English → reload → logout → login
```

Repeat 3–4 times. No half-Swedish/half-English chrome, no blank Calendar/Today, no duplicate toasts.

---

## Merge classification

| Field | Value |
|-------|-------|
| Type | RC release bug |
| Priority | **High** |
| Status | **All automated gates pass.** Remaining acceptance: physical R4-E (pass 1 + pass 2) on real device after deploy. |
| Not | Open development / feature work |

---

## Merge sign-off

| Check | Owner |
|-------|-------|
| R1 prod NULL audit reviewed (see results above) | Release |
| R4 journeys A–D + **R4-E torture test** on real phone (iOS + Android WebView) | QA |
| R4 Settings-only stress test (optional, lighter) | QA |
| `test:gate` + `test:e2e:i18n` green on branch | CI |

**#775:** RC release bug (High). All automated gates pass. Remaining acceptance criterion is the final physical R4-E language-switch torture test on a real device (pass 1 normal + pass 2 stress).

After R4-E passes without new findings: continue RC-1; treat any new issues as ordinary release bugs, not i18n program work.
