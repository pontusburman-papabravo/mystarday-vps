# Vad som ligger på `main` (Release OS)

**Senast verifierat:** merge **PR #45** (`c03a616`) + kommande **PR sprint 2**.

## På main idag (efter #45)

| Område | Filer / beteende |
|--------|------------------|
| Session Gate | `device-mode.js`, `session-gate.js`, `parental-gate.js` |
| Native UI | `native-tab-bar.js`, `platform-gating.css`, middleware inject |
| Observability | `crash-reporter.js`, `GET /api/app-config` |
| Auth | Apple onboarding redirect, `POST /api/auth/google` (befintligt konto) |
| Barn API | `child-parent-api-block.js` |
| SW | v166 (v167 i sprint-2-branch) |

## Sprint 2-branch (denna PR) — tillkommer

| Sprint | Innehåll |
|--------|----------|
| 5b | PIN haptik `Platform.haptics.light()` |
| 18 | Google-knapp login/register + `google-auth-ui.js` |
| 19 | FCM `sendFCM` implementerad |
| 22a | `assetlinks.json` + `apple-app-site-association` |
| 22b | `deep-link-router.js` |
| 26 | `dashboard-polish.css/js` |
| 16, 23 | Checklist-dokument |

## Fortfarande enhet / Polsia

- Capacitor `npx cap sync` + Android/iOS-mappar
- `SENTRY_DSN`, `FCM_SERVER_KEY`, `ANDROID_SHA256_CERT_FINGERPRINT`, `GOOGLE_WEB_CLIENT_ID`
- Gate 24 parity-signering
