# Child Core English — physical QA matrix

**Status:** **BLOCKED** — no physical iOS/Android devices available in cloud agent (2026-07-25). API-level smoke only; all cells below are **NOT TESTED** until real device runs. <!-- pragma: allowlist secret -->

**Legend:** PASS · FAIL · BLOCKED · NOT TESTED

## Preconditions

- Family locale en-GB with `english_app` and `english_child_experience` enabled (per-family; default OFF globally).
- QA account: see `docs/qa-test-account.md` (parent review account, child Anna).
- Native beta build required for permission-dialog and update-path rows (iOS build 29 / Android versionCode 9).

## Matrix

| Area | iOS Safari | iOS Capacitor | Android Chrome | Android Capacitor | sv-SE regression |
|------|------------|---------------|----------------|-------------------|------------------|
| Cold start | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | API PASS |
| Force quit + reopen | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Child login full flow | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | API PASS |
| Today + activity + steps | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Completion + first star | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Celebration | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Treasure Chest + redeem | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| My Collection | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| My People | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| My Space / settings | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Parent gate / PIN | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| All five tabs + nav labels | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| World / scene (playable hub) | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Scene hints + unlock messages | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Offline completion | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Reconnect / no duplicate stars | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Native permission copy | BLOCKED | BLOCKED | BLOCKED | BLOCKED | N/A |
| Opposite OS/family locale | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| App update from store build | BLOCKED | BLOCKED | BLOCKED | BLOCKED | N/A |
| Accessibility (VoiceOver/TalkBack) | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

## API smoke (live site, 2026-07-25)

| Check | Result |
|-------|--------|
| Parent login (review account) | PASS |
| Child login (Anna) | PASS |
| `english_child_experience_enabled` | false (correct) |
| `child_ui_locale` with en-GB family | sv-SE (correct while flag OFF) |
| Health / SW v675 | PASS |

## Pass criteria (en-GB + flag ON)

- No visible Swedish **system** copy in central child flows listed above.
- User-created activity/reward names unchanged.
- Star economy and redeem behaviour unchanged vs sv-SE.

## English Child activation

**BLOCKED** — device smoke not PASS. Flag remains OFF for all families.

See `docs/i18n-beta-rollout-plan.md` for activation SQL (after approval only).

## Related docs

- Native beta builds: `docs/i18n-store-beta-builds.md`
- Server communications: `docs/i18n-server-communications.md` (merged #721)
- Screenshots: `docs/i18n-beta-screenshot-plan.md`
