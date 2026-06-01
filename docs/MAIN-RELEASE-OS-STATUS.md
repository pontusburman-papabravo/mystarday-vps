# Vad som ligger på `main` (Release OS)

**Senast verifierat:** `main` @ **`c93dff7`** (PR #45 + sprint 2 mergade).

## På main idag (efter #45)

| Område | Filer / beteende |
|--------|------------------|
| Session Gate | `device-mode.js`, `session-gate.js`, `parental-gate.js` |
| Native UI | `native-tab-bar.js`, `platform-gating.css`, middleware inject |
| Observability | `crash-reporter.js`, `GET /api/app-config` |
| Auth | Apple onboarding redirect, `POST /api/auth/google` (befintligt konto) |
| Barn API | `child-parent-api-block.js` |
| SW | **v167** |
| 5b | PIN haptik |
| 18 | Google UI + `google-auth-ui.js` |
| 19 | FCM `sendFCM` |
| 22a/b | well-known + `deep-link-router.js` |
| 26 | `dashboard-polish` |

## Fortfarande enhet / Polsia

- Capacitor `npx cap sync` + Android/iOS-mappar
- `SENTRY_DSN`, `FCM_SERVER_KEY`, `ANDROID_SHA256_CERT_FINGERPRINT`, `GOOGLE_WEB_CLIENT_ID`
- Gate 24 parity-signering
