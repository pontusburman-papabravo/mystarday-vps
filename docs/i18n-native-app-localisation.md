# Native app localisation (iOS + Android shell)

## Resource structure

| Platform | Swedish | English (UK) | German |
|----------|---------|----------------|--------|
| iOS app | `ios/App/App/sv.lproj/` | `ios/App/App/en-GB.lproj/` | `ios/App/App/de.lproj/` |
| iOS widget | `ios/App/WidgetRoutine/sv.lproj/` | `ios/App/WidgetRoutine/en-GB.lproj/` | `ios/App/WidgetRoutine/de.lproj/` |
| Android (templates) | `scripts/android/l10n/res/values-sv/` | `scripts/android/l10n/res/values-en-rGB/` | `scripts/android/l10n/res/values-de/` |

`CFBundleLocalizations` on the app and the widget extension is written from the public locale catalog by `scripts/sync-native-locales.js`. Widget copy is `NSLocalizedString` keys. A new public language adds a `.lproj`, not a language branch in Swift.

Android generated project (`android/`, gitignored) receives copies via:

```bash
npm run cap:sync:android
node scripts/install-android-l10n.mjs
```

## Locale contract

1. **App start (pre-login):** OS locale selects native permission strings and app display name.
2. **WebView:** `public/js/i18n.js` loads bundles from `/api/i18n/:lang`.
3. **After login:** `family.preferred_locale` is canonical — see `public/js/native-locale-contract.js`.
4. **Language switch in settings:** updates WebView via `locale-changed`; native shell updates on next app start if live native refresh is unavailable.
5. **Logout** does not overwrite server locale.
6. **New device** fetches locale from server on login.
7. **Reinstall** not required for language change.

## Build

### iOS

- Ensure `CFBundleLocalizations` includes `sv` and `en-GB` in `Info.plist`.
- Open `ios/App/App.xcworkspace` in Xcode; verify `InfoPlist.strings` and `Localizable.strings` variant groups.

### Android

- Run Capacitor sync, then `node scripts/install-android-l10n.mjs`.
- Merge permission rationale into manifest if Capacitor regenerates defaults.

## Physical QA (not executed in cloud)

| Scenario | iOS | Android |
|----------|-----|---------|
| Swedish OS + Swedish family | ☐ | ☐ |
| English OS + Swedish family | ☐ | ☐ |
| Swedish OS + English family | ☐ | ☐ |
| English OS + English family | ☐ | ☐ |
| Cold start / force quit | ☐ | ☐ |
| Camera / photo permission prompt | ☐ | ☐ |
| Notification channel names | ☐ | ☐ |

## Known gaps / backlog

- Server-generated push notification body copy (parent/child) — separate PR.
- Email templates — existing parent i18n track.
- Full Android project not committed (`/android/` gitignored); templates live under `scripts/android/l10n/`.
- Android widget `values-en-rGB` now has **full key parity** with default `values/strings.xml` (no allowlist).

## Child locale

The child experience follows `family.preferred_locale`. `english_child_experience` is not the language switch.
