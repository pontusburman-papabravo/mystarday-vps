# RC-1 native device automation (separate gate)

**Status:** planned — not part of PR #803 web gate.

## Gate names

| Verdict | Scope |
|---------|--------|
| **RC-1 AUTOMATED WEB PASS** | Desktop browser smoke + Chromium mobile-browser profiles (viewport/UA) |
| **RC-1 NATIVE DEVICE PASS** | Real iOS + Android Capacitor binaries (future workflow) |
| **RC-1 AUTOMATED FUNCTIONAL PASS** | Web pass **and** native device pass |

Web gate **must not** claim iOS/Android/Capacitor coverage.

## Target stack (to implement)

- iOS: Xcode simulator or physical device farm (e.g. Xcode Cloud, BrowserStack App Automate, or internal Mac runner)
- Android: Emulator or device farm with Espresso/Appium/WebDriverIO against Capacitor WebView
- Install release `.ipa` / `.aab` or CI-built artifacts matching `expected_sha`
- Collect: screenshots, video, device/OS, build number, deploy SHA, pass/fail, network/console logs, locale, session type

## Minimum native flows

- App launch / cold start
- Parent login
- Locale switch
- Parent navigation
- Child picker + child login
- Child Today
- Rewards / goals
- Child logout + parent restore
- App kill/restart
- Upgrade from previous app/SW version (where automatable)
- R1–R3 product areas
- Journeys A–D (per RC-1 release requirements)

## Permissions

System dialogs (photos, notifications) — automate where the driver supports taps; otherwise mark **VISUAL_REVIEW_OPTIONAL** for that assertion only, not for the whole gate.

## Deliverable

Separate PR adding `.github/workflows/rc1-native-device-gate.yml` and runner scripts under `scripts/native-qa/` — blocked on farm credentials and signed build pipeline.
