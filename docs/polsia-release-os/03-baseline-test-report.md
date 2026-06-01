# Baseline — tester vid paketbygge (2026-05-28)

Kör lokalt: `npm run polsia:release-os:check`

| Check | Resultat | Anteckning |
|-------|----------|------------|
| `npm run test` | **144 pass / 2 fail** | Fail: `upload.test.js` — `sanitizeFilename` (2 cases) |
| `npm run lint` | **33 errors, 79 warnings** | Pre-existing; Polsia bör inte öka fel räkning per sprint |
| `npm run polsia:gate0` | **FAIL** | `Capacitor.isNativePlatform` i `platform-theme.js`, `iap-manager.js` → **Sprint 1.2 / Gate 0** |

**Mål för produktion:** gate0 grön före sprint 16; test 146/146; lint enligt team-beslut (max-warnings 0 kräver städ-sprint).
