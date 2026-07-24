# Child Core English — physical QA matrix

**Status:** Not executed in cloud runs. <!-- pragma: allowlist secret --> Product owner approved controlled beta; verify on real devices before enabling the English child flag for live families.

## Preconditions

- Family locale en-GB with english_app and english_child_experience enabled (per-family; default OFF globally).
- QA account: see `docs/qa-test-account.md` (parent review account, child Anna).

## Matrix

| Area | iOS Safari | iOS Capacitor | Android Chrome | Android Capacitor | sv-SE regression |
|------|------------|---------------|----------------|-------------------|------------------|
| Cold start | ☐ | ☐ | ☐ | ☐ | ☐ |
| Force quit + reopen | ☐ | ☐ | ☐ | ☐ | ☐ |
| Child login full flow | ☐ | ☐ | ☐ | ☐ | ☐ |
| Today + activity + steps | ☐ | ☐ | ☐ | ☐ | ☐ |
| Completion + first star | ☐ | ☐ | ☐ | ☐ | ☐ |
| Celebration | ☐ | ☐ | ☐ | ☐ | ☐ |
| Treasure Chest + redeem | ☐ | ☐ | ☐ | ☐ | ☐ |
| My Collection | ☐ | ☐ | ☐ | ☐ | ☐ |
| My People | ☐ | ☐ | ☐ | ☐ | ☐ |
| My Space / settings | ☐ | ☐ | ☐ | ☐ | ☐ |
| Parent gate / PIN | ☐ | ☐ | ☐ | ☐ | ☐ |
| All five tabs + nav labels | ☐ | ☐ | ☐ | ☐ | ☐ |
| Offline completion | ☐ | ☐ | ☐ | ☐ | ☐ |
| Reconnect / no duplicate stars | ☐ | ☐ | ☐ | ☐ | ☐ |
| Accessibility (VoiceOver/TalkBack spot check) | ☐ | ☐ | ☐ | ☐ | ☐ |

## Pass criteria (en-GB + flag ON)

- No visible Swedish **system** copy in central child flows listed above.
- User-created activity/reward names unchanged.
- Star economy and redeem behaviour unchanged vs sv-SE.

## Known gaps / backlog

- Peripheral worlds/scenes not on normal tab navigation.
- Server-generated push/email copy (separate PR).
- Physical QA cells above are unchecked until device runs are logged.
