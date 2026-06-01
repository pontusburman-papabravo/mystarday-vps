# STJÄRNDAG — Polsia Release OS (produktionspaket)

**Syfte:** Färdigt material för **Polsia AI** — kopiera sprint för sprint, deploya, kör verifiering, signera.  
**Kanon:** Denna mapp. Översikt: [`../polsia-sprint-koordinering.md`](../polsia-sprint-koordinering.md).

## Start (Polsia)

**Läs först:** [`04-redan-klart-i-repo.md`](04-redan-klart-i-repo.md) — vad som redan är gjort i Git.

1. Läs [`00-styrning.md`](00-styrning.md) och [`02-verify-and-tests.md`](02-verify-and-tests.md).
2. Kör sprintfiler i ordning: [`sprints/01-sprint-1.1-backend-auth.md`](sprints/01-sprint-1.1-backend-auth.md) → … → [`sprints/25-sprint-gate-24.md`](sprints/25-sprint-gate-24.md).
3. **Före sprint 16:** [`gates/gate-0-native-freeze.md`](gates/gate-0-native-freeze.md).
4. **Gate 24:** uppdatera [`parity-manifest.md`](parity-manifest.md) (SPOT).
5. **Efter 25:** [`sprints/26-dashboard-polish.md`](sprints/26-dashboard-polish.md) → 9A → 9B → SSE → barn-wow → [`gates/gate-25-family-delight.md`](gates/gate-25-family-delight.md).

## Körordning (25 tasks)

| # | Fil | Polsia |
|---|-----|--------|
| 1–25 | `sprints/01-…` … `sprints/25-…` | Se [`01-korlista.md`](01-korlista.md) |

## Efter varje deploy

```bash
npm run lint
npm run test
npm run polsia:gate0    # från sprint 14 / före Android 16
curl -sSf https://stjarndag.polsia.app/health   # prod röktest
```

## Regenerera filer (utvecklare)

```bash
node scripts/generate-polsia-release-os.mjs
```

## Raw URL (dela till Polsia)

```
https://raw.githubusercontent.com/pontusburman-papabravo/MyStarday-Polsia/cursor/polsia-sprint-koordinering-1a8b/docs/polsia-release-os/README.md
```
