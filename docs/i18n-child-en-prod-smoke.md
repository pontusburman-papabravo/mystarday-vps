# English child experience — prod smoke (Pontus@burman.cc)

**Account:** `Pontus@burman.cc` · child **Astrid**  
**Do not use:** the App Store review demo account for this smoke.

**Prerequisite:** #764 deployed (`public/sw.js` → `stjarndag-v716` or newer).

---

## Feature flag (`english_child_experience`)

English child UI requires family `preferred_locale = en-GB` **and** `english_child_experience` on the family (`family_features`).

- **Only change flags on `Pontus@burman.cc` when you intend QA** — this is the founder account.
- **Document** any flag change (who, when, why) in this file or the PR comment.
- **Revert** the flag after smoke if it was enabled only for QA and not for product rollout.

```sql
-- Check (prod)
SELECT f.preferred_locale,
       EXISTS (SELECT 1 FROM family_features ff
               WHERE ff.family_id = f.id AND ff.feature_slug = 'english_child_experience') AS english_child
FROM family f
JOIN parent p ON p.family_id = f.id
WHERE LOWER(p.email) = LOWER('Pontus@burman.cc');

-- Enable for QA only (document before running)
-- INSERT INTO family_features (family_id, feature_slug)
-- SELECT p.family_id, 'english_child_experience' FROM parent p
-- WHERE LOWER(p.email) = LOWER('Pontus@burman.cc')
-- ON CONFLICT DO NOTHING;

-- Revert after QA
-- DELETE FROM family_features ff
-- WHERE ff.feature_slug = 'english_child_experience'
--   AND ff.family_id = (SELECT family_id FROM parent WHERE LOWER(email) = LOWER('Pontus@burman.cc'));
```

---

## Smoke checklist

| # | Area | Pass criteria |
|---|------|----------------|
| 1 | Login | Parent `Pontus@burman.cc` → child Astrid (PIN) |
| 2 | My space | English title, Appearance, Dark mode, Log out |
| 3 | Themes | Theme picker save + badge |
| 4 | Celebrations | Milestone overlays — English copy |
| 5 | Unlocks / first-star | Chrome if active — English |
| 6 | Trophies / streaks | Collection, medals, streak copy |
| 7 | Offline / loading | No Swedish “Laddar…” in active views |
| 8 | Reload | On `/child/settings` or `/child/today` — session survives, no `child-login` bounce |
| 9 | **Read-aloud** | Open teacch NU card with English activity text → 🔊 read aloud → **TTS uses en-GB** (not Swedish voice for English text). Verify in browser devtools or by listening; `utter.lang` must not be `sv-SE` when child UI is en-GB. |
| 10 | **Title / aria** | Tab through child shell or use screen reader — no leaked Swedish in `title`, `aria-label`, or `aria-labelledby` on active chrome (bottom nav, header, modals). User-created names OK. |
| 11 | System copy | No Swedish system strings in active child views |

**E2E / test:gate** use isolated `@example.com` families — they do not affect prod.

---

## After green smoke

1. Next PR: `fix(i18n): localize push notifications and non-auth emails`
2. `child-read-aloud.js` locale fix should land before or with that package (see #766).
3. PDF / resurser after communications package.
