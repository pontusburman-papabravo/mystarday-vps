# Pre-deploy baseline (2026-06-01)

**Repo `main` (lokal verifiering):** `b1762ba`+ — innehåller Release OS (v167, `/api/app-config`, device-mode, m.m.)

## Prod före deploy (curl-baseline)

| Check | stjarndag.polsia.app | mystarday.se | Efter deploy |
|-------|----------------------|--------------|--------------|
| `/health` | 200 `2.3.1` | 200 `2.3.1` | 200 |
| `/api/app-config` | **404** | **404** | **200 JSON** |
| `/sw.js` CACHE | **v164** | **v164** | **v167** |
| `/login` | 200 | 200 | 200 |

**Slutsats:** Sprint 1–26 är **inte** live på prod förrän engineering deploy kört.

## Polsia tasks (referens)

| # | Syfte | ID |
|---|--------|-----|
| A | Release OS Deploy → Render | #2144319 |
| B | Browser smoke (efter A) | #2144320 |
| C | Pre-deploy baseline | #2144340 |

**Ordning:** A + C parallellt → **B efter A** → Pontus sätter env → manuell PG/barnläge på enhet.

## Success criteria (deploy KLAR)

- [ ] `GET /api/app-config` → 200 + `parental_gate_enabled`
- [ ] `/sw.js` innehåller `stjarndag-v167`
- [ ] Server: `npm test` + `npm run polsia:gate0` gröna
- [ ] Browser smoke 7/7 (task B)

## Post-deploy curl (kopiera)

```bash
curl -sS https://stjarndag.polsia.app/api/app-config
curl -sS https://stjarndag.polsia.app/sw.js | grep CACHE_NAME
curl -sS https://mystarday.se/api/app-config
```
