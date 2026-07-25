# English Beta — Screenshot Plan

**Status:** Planned — captures require native beta builds on device/simulator.

## Rules

- No real children's personal data (use Anna demo account or anonymised fixtures)
- Same app version (iOS build 29 / Android versionCode 9) for all shots
- **sv-SE screenshots:** zero English system strings visible
- **en-GB screenshots:** zero Swedish system strings visible (except user-created names)
- Follow `docs/app-store-screenshots/README.md` for pixel dimensions

## Required scenes

| # | Scene | sv-SE | en-GB | Device |
|---|-------|-------|-------|--------|
| 1 | Parent Today / Home | ☐ | ☐ | iPhone 6.7" + phone |
| 2 | Planning / schedule | ☐ | ☐ | iPhone |
| 3 | Child Today tab | ☐ | ☐ | iPhone |
| 4 | Activity + steps | ☐ | ☐ | iPhone |
| 5 | Treasure Chest | ☐ | ☐ | iPhone |
| 6 | My Collection | ☐ | ☐ | iPhone |
| 7 | Five child tabs visible | ☐ | ☐ | iPhone |
| 8 | Language / Beta note (optional) | ☐ | ☐ | iPhone |
| 9 | Parent Home (tablet) | ☐ | ☐ | iPad (if Universal) |
| 10 | Child Today (tablet) | ☐ | ☐ | iPad |

## Capture workflow

1. Install TestFlight / Internal Testing build with native l10n
2. Set family `preferred_locale` to target language
3. For en-GB child shots: enable `english_child_experience` on test family only
4. Capture via Xcode Simulator or `docs/app-store-screenshots/NATIVE-CAPTURE.md`
5. Name files: `{platform}-{locale}-{scene}-{width}.png`

## Output paths (suggested)

```
docs/app-store-screenshots/en-GB/
docs/app-store-screenshots/sv-SE/   # refresh if stale
assets/play-store/screenshots/en-GB/
```

## Blockers

- Native beta builds not yet uploaded (see `docs/i18n-store-beta-builds.md`)
- Physical device smoke not complete
