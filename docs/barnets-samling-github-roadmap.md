# Barnets samling — GitHub roadmap

**Milestone:** `Barnets samling v1`  
**Project:** `Barnets samling`  
**Spec:** [barnets-samling-vision.md](barnets-samling-vision.md) · [npf-arkitektur-v1.md](npf-arkitektur-v1.md)

> Kör `./scripts/setup-barnets-samling-github.sh` lokalt för att skapa milestone + project och skriva ut direktlänkar.

---

## Milestone: Barnets samling v1

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

## Project: Barnets samling

### Statusar

`Backlog` · `Ready` · `In progress` · `Review` · `Done`

### Ordning (överst → underst)

| # | Startstatus |
|---|-------------|
| 583 PR | **Ready** |
| 594 Fas A epic | Backlog → Ready efter #583 merge |
| 588 | Backlog |
| 589 | Backlog |
| 590 | Backlog |
| 591 | Backlog |
| 592 | Backlog |
| 593 | Backlog |
| 584–587 epics | Backlog |

---

## Setup

### Alternativ A — GitHub Actions (rekommenderat)

1. Gå till **Actions → Setup Barnets samling GitHub → Run workflow**
2. Om `GITHUB_TOKEN` saknar project-scope: lägg till repo secret `BARNETS_SAMLING_SETUP_TOKEN` (PAT med `project` + `repo`)

### Alternativ B — lokalt

```bash
./scripts/setup-barnets-samling-github.sh
```

Kräver `gh auth login` med `project` + `repo` scope (repo owner).

Skriptet:

1. Skapar milestone `Barnets samling v1` och tilldelar alla issues + PR #583
2. Skapar project `Barnets samling` och länkar repot
3. Lägger till items i ordning ovan + sorterar via GraphQL
4. Sätter status: **#583 → Ready**, övriga → **Backlog**
5. Sätter **#583 blockerar** Fas A-tickets (GraphQL `addBlockedBy`, med UI-fallback)
6. Skriver ut milestone- och project-URL

Om Status-fältet saknar Backlog/Ready: justera kolumner manuellt till  
`Backlog` · `Ready` · `In progress` · `Review` · `Done`

Efter #583 merge: flytta PR till **Done**, sätt #594 till **Ready**.

---

## Efter Fas A

Bryt ner #584–#587 i implementation tickets. Lägg till i samma milestone + project.
