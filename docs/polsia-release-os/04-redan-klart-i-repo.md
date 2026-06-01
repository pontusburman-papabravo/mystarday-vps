# Redan implementerat i repo (Polsia: gör mindre / verifiera bara)

**Syfte:** Minska Polsia-arbete. Efter deploy: kör `npm run polsia:release-os:check` + manuell röktest.

| Sprint | Polsia ID | Status i repo | Polsia gör |
|--------|-----------|---------------|------------|
| 1.1 | #2141408 | ✅ `_jwkToPem` (createPublicKey), CSRF apple exempt, `is_lifetime_free` | Deploy + signera TEST |
| 1.2 | #2141409 | ✅ `Platform.*`, DOM `is-native`, `isAppleSignInAvailable`, `isGoogleSignInAvailable` stub | Ladda platform.js på **saknade** sidor om audit visar gap |
| 1.3 | #2141410 | ◐ Apple via `isAppleSignInAvailable` login/register | `email_conflict` modal, Google-knapp Android sprint 18 |
| 1.4 | #2141411 | ✅ `platform-gating.css` scaffold + middleware injicerar | SW bump vid deploy |
| 14 | #2143272 | ○ | Sentry/Crashlytics — **kvar för Polsia** |
| 2a | #2141905 | ◐ Minimal gating CSS | Full PWA-dölj i settings/landing |
| Gate 0 | #2142916 | ✅ `npm run polsia:gate0` grön | Signera audit i PR |

## Automatiska tester (ska vara gröna före Polsia deploy)

```
npm run test          → 146/146
npm run polsia:gate0  → OK
```

**Lint:** kan ha befintliga varningar — öka inte error-räkning per sprint.

## Polsia börjar här om allt ovan är deployat

**Sprint 14** (#2143272) eller första sprint som **inte** är ✅ i tabellen ovan.
