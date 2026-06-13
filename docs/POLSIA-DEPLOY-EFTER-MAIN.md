# Polsia — en deploy räcker (ingen kod i chat)

> **ARKIVERAT (juni 2026).** Polsia-deploy är avvecklat. Se [`ARKIVERAT-POLSIA-REPO.md`](ARKIVERAT-POLSIA-REPO.md) och [`VPS-ANDROID-ENV.md`](VPS-ANDROID-ENV.md).

**Status:** Polsia har **inte** deployat än → en enda deploy av senaste **`main`** från `MyStarday-Polsia` täcker allt nedan.

## Källa

- Repo: `https://github.com/pontusburman-papabravo/MyStarday-Polsia`
- Branch: **`main`**
- Render: manuell deploy **Clear build cache** om möjligt

## Efter deploy på servern

```bash
npm run migrate
npm test
```

## Verifiering (prod)

| Check | Förväntat |
|-------|-----------|
| `GET /health` | 200 |
| `GET /api/app-config` | 200 |
| `GET /sw.js` | `stjarndag-v169` eller nyare |
| `GET /api/auth/login-picker-children` | 200 + JSON-array (tom utan session) |

## Innehåll i denna deploy (sammanfattning)

- Release OS (device-mode, session-gate, native-tab-bar, …)
- Barnlista / `parent_child`-backfill-migration
- **Byt barn** i barnvy + **Byt användare** i inställningar
- `GET /api/auth/login-picker-children` (namn + avatar på barnväljaren)
- `avatar_url` i barninloggningssvar

## Polsia behöver INTE

- Separat “manuellt DB-jobb” om migration `1792000000000_child_sort_order_and_parent_child_backfill` körs
- Ny engineering-task för varje rad ovan — bara **denna deploy**

## Env (oförändrat)

Se `docs/polsia-release-os/ENV_FOR_POLSIA_DASHBOARD.md` — Pontus sätter nycklar; deploy kan köras utan alla native-nycklar.

## Browser smoke (valfritt)

`docs/polsia-release-os/BROWSER_SMOKE_TASK.md` — uppdatera SW-version i tabell till v169+ efter deploy.
