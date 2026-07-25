# English Beta — Rollout Plan (Sweden only)

## Preconditions (go/no-go)

All must be **PASS** before any `english_child_experience` activation:

| Gate | Required |
|------|----------|
| Native beta builds on TestFlight + Play Internal | Yes |
| Physical device smoke (iOS + Android) | Yes |
| Child Core pack parity audit | Yes (9/9) |
| Server Communications P0 deployed | Yes (#721) |
| No P0 data loss / duplicate stars | Yes |
| Rollback tested on test family | Yes |
| Language issue reporting works | Yes |

## Cohort stages

| Stage | Families | Activation | Decision maker |
|-------|----------|------------|----------------|
| 0 | 0 | All flags OFF | — |
| 1 | 1 internal test | `english_child_experience` ON | Product owner after device PASS |
| 2 | 3–5 approved | Per-family flag | Explicit approval per family |
| 3 | 10–20 English Beta | Opt-in invite | After stage 2 clean week |
| 4 | Broader Sweden opt-in | In-app beta offer | Separate product decision |

**Do not auto-advance cohorts.**

## Test family activation (stage 1)

**Candidate:** QA account from `docs/qa-test-account.md` (family with Anna). <!-- pragma: allowlist secret -->

**Pre-check:**
```
preferred_locale = en-GB
english_app = ON
english_child_experience = OFF
country_code = SE
```

**Activation (after device smoke PASS only):**
```sql
INSERT INTO family_features (family_id, feature_slug)
SELECT f.id, 'english_child_experience'
FROM family f
JOIN parent p ON p.family_id = f.id
WHERE p.email = '<review-account-email>'
ON CONFLICT DO NOTHING;
```

**Rollback:**
```sql
DELETE FROM family_features ff
USING family f, parent p
WHERE ff.family_id = f.id AND p.family_id = f.id
  AND p.email = '<review-account-email>'
  AND ff.feature_slug = 'english_child_experience';
```

## Observability (no PII)

Log/monitor: locale, platform, app version, SW version, `english_child_experience`, missing i18n keys, visible Swedish fallback, child route, completion/reward errors.

Do **not** log: child names, PINs, activity names, reward names, free text.

## Current status (2026-07-25)

| Item | Status |
|------|--------|
| Device smoke | **BLOCKED** — no physical devices in cloud agent |
| Test family activation | **BLOCKED** — awaiting device smoke |
| Native builds | **BLOCKED** — no Xcode/Android SDK in cloud agent |
| Cohort 2+ | **Not started** |

## Next phase

**P-i18n-Beta-Feedback-and-Stabilisation** after stage 1 PASS.
