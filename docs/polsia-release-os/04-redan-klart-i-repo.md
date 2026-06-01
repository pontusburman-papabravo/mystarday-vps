# Redan implementerat i repo (Polsia: gör mindre / verifiera bara)

**Syfte:** Minska Polsia-arbete. Efter deploy: kör `npm run polsia:release-os:check` + manuell röktest.  
**Deploy-lista:** [`docs/polsia-deploy-manifest.md`](../polsia-deploy-manifest.md)

| Sprint | Polsia ID | Status i repo | Polsia gör |
|--------|-----------|---------------|------------|
| 1.1 | #2141408 | ✅ | Deploy + signera TEST |
| 1.2 | #2141409 | ✅ | Verifiera platform inject på alla sidor |
| 1.3 | #2141410 | ✅ | Apple modal, onboarding_completed redirect |
| 1.4 | #2141411 | ✅ | SW v166 vid deploy |
| 14 | #2143272 | ✅ | Sätt `SENTRY_DSN` + test-crash på enhet |
| 2a | #2141905 | ✅ | Röktest native utan PWA-text |
| 2b | #2141914 | ✅ | — |
| 3a | #2141844 | ✅ | Force-close barnläge-test |
| 3b | #2141848 | ✅ | PG + biometri plugin (18+) manuellt |
| 3c | #2141855 | ✅ | Barn-JWT 403 + session-gate |
| 4 | #2141717 | ✅ | 5-fliks tab bar native |
| 5a | #2141868 | ◐ | Rollval finns — polish mockup |
| 5b–5c | #2141884… | ◐ | child-login 3-vy finns |
| Gate 0 | #2142916 | ✅ | `npm run polsia:gate0` |
| 16 | #2142930 | ○ | Capacitor Android build lokalt |
| 17 | #2143390 | ✅ | Google backend (befintligt konto) |
| 18 | #2143391 | ◐ | Google native plugin ej i package.json |
| 19–20 | #2143394… | ◐ | sendFCM/sendAPNs — env i prod |
| 21–22b | #2143403… | ○ | Deep links — ej denna batch |
| 23A–23B | #2143273… | ○ | Android release signering |
| Gate 24 | #2143329 | ○ | Parity manifest manuell på enheter |
| 26 | #2143405 | ◐ | skeleton.js på dashboard |

## Automatiska tester

```
npm run test          → 149/149
npm run polsia:gate0  → OK
```

## Polsia: börja med

1. **Deploy** enligt [`polsia-deploy-manifest.md`](../polsia-deploy-manifest.md)  
2. **Sprint 18** — Google Auth Capacitor-plugin om Android login krävs  
3. **Gate 24** — manuell parity på iOS + Android
