# Styrning — Release OS

> **ARKIVERAT (juni 2026).** Polsia-deploy avvecklat — se [`../ARKIVERAT-POLSIA-REPO.md`](../ARKIVERAT-POLSIA-REPO.md).

| Regel | |
|-------|---|
| **Huvudplan** | [`app2.md`](../../app2.md) — vid konflikt vinner app2 |
| **Fas A+** | [`ios-städ.md`](../ios-städ.md) |
| **Android-tillägg** | [`android.md`](../../android.md) |
| **Parity SPOT** | [`parity-manifest.md`](parity-manifest.md) |

## Polsia deploy (arkiverat)

- **Prod (nu):** https://github.com/pontusburman-papabravo/mystarday-vps → https://mystarday.se  
- **Tidigare Polsia:** https://github.com/Polsia-Inc/stjarndag (avvecklat)  
- **En task = ett deploy** — inga sammanslagna sprintar

## Failure policies

| Händelse | Åtgärd |
|----------|--------|
| 23A FAIL | 23B blockerad · 48h · KILL_SWITCH_23A |
| Gate 24 FAIL | Re-open #2143329 · uppdatera parity-manifest |
| Divergens | Beteende → fix nu · Feature-gap → owner |
