# Min värld — mobil QA (prod)

**Datum:** 2026-07-07  
**URL:** `/child-login` (prod)  
**Viewport:** iPhone 13 (390×844)  
**Konto:** Anna · PIN `4455` ([`qa-test-account.md`](../qa-test-account.md) → PROD_REVIEW)  
**Resultat:** 6/11 steg passerade (login + Morgonhus OK; trädgård/LOE/minnesrum ej nådda)

Skärmdumpar ligger i [`minvarld-mobile-qa/screenshots/`](minvarld-mobile-qa/screenshots/) och kan visas direkt i GitHub.

## Steg

| # | Steg | OK | Skärmdump |
|---|------|----|-----------|
| 1 | Barninloggning | ✅ | [01-child-login.png](minvarld-mobile-qa/screenshots/01-child-login.png) |
| 2 | Välj Anna | ✅ | [02-select-leo.png](minvarld-mobile-qa/screenshots/02-select-leo.png) |
| 3 | PIN 4455 | ✅ | [03-after-pin.png](minvarld-mobile-qa/screenshots/03-after-pin.png) |
| 4 | Barnvy laddas | ✅ | [04-child-dashboard.png](minvarld-mobile-qa/screenshots/04-child-dashboard.png) |
| 4b | Efter första stjärnan (första körning) | — | [04b-after-first-star.png](minvarld-mobile-qa/screenshots/04b-after-first-star.png) |
| 5 | Min värld / Skattkammaren | ✅ | [05-skattkammaren-flow.png](minvarld-mobile-qa/screenshots/05-skattkammaren-flow.png) |
| 6 | Morgonhuset öppnas | ✅ | [06-morgonhus.png](minvarld-mobile-qa/screenshots/06-morgonhus.png) |
| 7 | Dörr → Trädgården | ❌ | [07-after-door-missing.png](minvarld-mobile-qa/screenshots/07-after-door-missing.png) |
| 10 | Kista → Skattkammaren | ❌ | [10-treasure-chest-skatt.png](minvarld-mobile-qa/screenshots/10-treasure-chest-skatt.png) |
| 11 | Stig → Minnesrummet | ❌ | [11-memory-hall-path.png](minvarld-mobile-qa/screenshots/11-memory-hall-path.png) |

## Kända problem (kort)

- Inga `[data-ao-id]`-hotspots i DOM → dörr/kista/stig gick inte att automatisera.
- Legacy-flikar (Idag / Skattkammaren) syns ovanpå immersiv Morgonhus-vy.
- Header-knappar under 44pt (Byt barn, Logga ut, Förälder).

Maskinläsbar logg: [`minvarld-mobile-qa/qa-report.json`](minvarld-mobile-qa/qa-report.json)
