# Fas B — manuell GitHub-uppföljning

Bot-token kunde **skapa** issues men inte redigera labels, kommentarer eller epic #584 efteråt.

## Issues (skapade)

| Ticket | # | Labels (önskat) |
|--------|---|-----------------|
| B1 Route + shell | **#615** | `barnets-samling`, `phase-b`, `ready` |
| B2 Stjärnglas | **#616** | `barnets-samling`, `phase-b`, `blocked` |
| B3 Trofévägg | **#617** | `barnets-samling`, `phase-b`, `blocked` |
| B4 Streak-kedja | **#618** | `barnets-samling`, `phase-b`, `blocked` |
| B5 NPF-copy | **#619** | `barnets-samling`, `phase-b`, `blocked` |
| B6 Regression | **#620** | `barnets-samling`, `phase-b`, `blocked` |

## Manuellt (1 min)

1. **Labels** på #615–#620 enligt tabellen ovan.
2. **Epic #584** — uppdatera checklista:
   - [ ] #615 B1 · [ ] #616 B2 · [ ] #617 B3 · [ ] #618 B4 · [ ] #619 B5 · [ ] #620 B6
3. **Kommentar** på #616–#620: `Blocked by #615 until B1 is merged.`
4. **#616–#618** — kropparna kan behöva fixas (backticks strippades vid skapande). Korrekt text finns i [barnets-samling-fas-b-plan.md](barnets-samling-fas-b-plan.md).

## PRs

| PR | Innehåll |
|----|----------|
| **#613** | Plan/spec (behåll som doc-PR) |
| B1 PR | Implementation #615 (branch `cursor/barnets-samling-b1-shell-3df2`) |
