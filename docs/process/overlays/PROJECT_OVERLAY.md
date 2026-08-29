# Project overlay (family-app)

**Config:** `config/process/overlays/family-app.json`  
**Inherits:** `config/process/global-core.json`

## Critical areas

- Child/adult privilege separation
- Auth/session (parent + child PIN)
- Payment/IAP (RevenueCat; no web checkout)
- Data deletion (Apple 5.1.1(v) / Play policy)
- DB/migrations (backward-compatible deploy)
- Market opening (`market-region.js`, legal routing)
- Privacy/security (no silent tracking posture changes)
- Native store behavior (Capacitor WebView, widgets)

## L2 domains (8)

| Domain | Primary surfaces |
|--------|------------------|
| `auth-security` | `src/routes/auth/`, authz middleware, login/PIN/handoff |
| `payments-iap` | `src/routes/iap.js`, paywall, RevenueCat |
| `i18n-markets-legal` | locales, markets, legal pages |
| `planning-schedule` | schedules, daily logs, custody, for-dig |
| `child-experience` | child dashboard, rewards, celebrations |
| `parent-experience` | dashboard, home, onboarding, settings |
| `db-migrations` | `migrations/`, `migrate.js` |
| `native-platform` | `ios/`, `android/`, Capacitor, SW |

## External systems

- Apple App Store / TestFlight / APNs
- Google Play / FCM
- RevenueCat (sole payment path on native)
- Production flags: `feature_flag`, `app_settings`, `family_features`

## Product-specific principles

- Family adaptability — strong defaults, progressive customization
- Child calm/simple UX — 44pt targets, no child forms/settings
- Accessibility & recoverability
- **Do not** mix technical feature flags with family settings in product copy

## Commands

```bash
npm run test:changed
npm run test:domain -- auth-security
npm run release:store-delta -- --profile apple
```
