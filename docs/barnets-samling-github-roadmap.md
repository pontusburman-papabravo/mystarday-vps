# Barnets samling — GitHub roadmap

**Aktiv fallback:** labels + roadmap-issue (ingen project-scope krävs)  
**Spec:** [barnets-samling-vision.md](barnets-samling-vision.md) · [npf-arkitektur-v1.md](npf-arkitektur-v1.md)

> Kör `./scripts/setup-barnets-samling-labels.sh` — eller **Actions → Setup Barnets samling labels** (körs automatiskt vid merge till `main`).

**Roadmap-issue:** `Barnets samling v1 roadmap` (skapas/uppdateras av skriptet)

---

## Labels (ersätter Project/milestone tills vidare)

| Label | Syfte |
|-------|--------|
| `barnets-samling` | Alla issues i initiativet |
| `phase-a` … `phase-e` | Fas |
| `ready` | Kan påbörjas nu (#583) |
| `blocked` | Väntar på #583 (#594, #588–#593) |

### Tilldelning

| # | Labels |
|---|--------|
| **583** (PR) | `barnets-samling`, `phase-a`, `ready` |
| **594**, **588–593** | `barnets-samling`, `phase-a`, `blocked` |
| **584** | `barnets-samling`, `phase-b` |
| **585** | `barnets-samling`, `phase-c` |
| **586** | `barnets-samling`, `phase-d` |
| **587** | `barnets-samling`, `phase-e` |

**Blocker-kommentar** på #594 och #588–#593: *"Blocked by #583…"*

---

## Scope: Barnets samling v1

| # | Typ | Titel |
|---|-----|--------|
| **583** | PR | Rollout / feature gate `barnets_samling` |
| **594** | Epic | Fas A: Nav + rollout |
| **588** | Ticket | Nav: fyra flikar |
| **589** | Ticket | Labels/copy: bort med "Min värld" |
| **590** | Ticket | Hub bort som ingång |
| **591** | Ticket | Skattkammaren egen flik/route |
| **592** | Ticket | Regression belöningsflöde |
| **593** | Ticket | Göm/avlänka gammal värld |
| **584** | Epic | Fas B: Min samling v1 |
| **585** | Epic | Fas C: Skattkammaren v1 |
| **586** | Epic | Fas D: Minneskort + hylla + diplom |
| **587** | Epic | Fas E: Årsbok + visuell polish |

---

## Blocker

**PR #583 blockerar all Fas A-implementation** (#594, #588–#593).

Fas A ska inte påbörjas förrän feature gate är mergad till `main`.

Fas B–E epics (#584–#587) väntar på Fas A.

---

## Ordning (label `ready` / `blocked`)

| # | Start |
|---|-------|
| 583 PR | `ready` |
| 594, 588–593 | `blocked` → `ready` efter #583 merge |
| 584–587 | väntar på Fas A |

---

## Setup

### Label-fallback (aktiv — ingen project-scope)

```bash
./scripts/setup-barnets-samling-labels.sh
```

Eller **Actions → Setup Barnets samling labels → Run workflow** (triggas automatiskt vid merge av skriptet till `main`).

Skriptet (idempotent):

1. Skapar labels `barnets-samling`, `phase-a`–`phase-e`, `blocked`, `ready`
2. Sätter labels på #583, #594, #588–#593, #584–#587
3. Kommenterar blocker på Fas A-issues
4. Uppdaterar #594 med checklist (#583 först)
5. Skapar/uppdaterar roadmap-issue `Barnets samling v1 roadmap`

Efter #583 merge: kör `./scripts/barnets-samling-post-583-merge.sh` (eller **Actions → Barnets samling post-583**).

Det skriptet:
- Stänger test-issues #596, #597
- Tar bort `blocked`, lägger `ready` på #594 och #588–#593
- Kommenterar på #594: *"Feature gate merged. Fas A kan börja."*

**Fas A-ordning:** #588 → #589 → #590 → #591 → #592 → #593  
**Inga Fas B–E tickets** förrän Fas A är klar.

### Project/milestone (pausad)

Kräver `project` + `repo` scope — se `./scripts/setup-barnets-samling-github.sh`.

---

## Efter Fas A

Fas A är **klar** (#588–#593). **Fas B (#584)**, **Fas C (#585)** och **Fas D (#586)** klara. Nästa: **Fas E (#587)**.

**Plan:** [barnets-samling-fas-d-plan.md](barnets-samling-fas-d-plan.md)

**Status:** **Klar** (efter merge) · epic **#586**

### Fas D — Minneskort + hylla + diplom ✓

| Epic | Innehåll |
|------|----------|
| **#586** | Minneskort, belöningshylla, diplom i Min samling |

**Gate ON:** `/child/collection` → Fas B + minneskort/hylla/diplom från `redemptions` (read-only) + universe.  
**Tester:** `barnets-samling-memory.test.js` i `test:gate`.

### Fas C — Skattkammaren v1 ✓

| Epic | Innehåll |
|------|----------|
| **#585** | Aktivt mål + progress + fem statusar + historik + NPF-copy + regression |

**Gate ON:** `/child/treasure` → spendable saldo, mål, progress, statuskort, historik, redeem oförändrat.  
**Gate OFF:** legacy Skattkammaren oförändrat.  
**Tester:** `barnets-samling-treasure-v1.test.js` + `#592` regression i `test:gate`.

### Fas B — Min samling v1 (vägg + glas + streak) ✓

| Ticket | Titel | PR |
|--------|-------|-----|
| **584** | Epic: Min samling v1 | — |
| **#615** | B1 Route + shell | #621 |
| **#616** | B2 Stjärnglas / totalt intjänade stjärnor | #622 |
| **#617** | B3 Trofévägg / medaljer | #623 |
| **#618** | B4 Streak-kedja | #624 |
| **#619** | B5 NPF-copy + tomstatus | #625 |
| **#620** | B6 Regression/gate-test | #626 |

**Gate ON:** `/child/collection` → stjärnglas (`lifetime_stars`) + trofévägg (`achievements`) + streak-kedja (`stats.streak`). Ingen `ChildCollections`, ingen spendable saldo.  
**Gate OFF:** legacy oförändrat.  
**Tester:** `barnets-samling-*.test.js` (8 filer) i `test:gate`.

### Fas E (nästa)

| # | Epic |
|---|------|
| **587** | Fas E: Årsbok + visuell polish |
