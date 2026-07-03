# Roadmap — Min Värld → Minnesrummet

**Uppdaterad:** 2026-07-03 (efter CAP-007-R1)  
**Syfte:** Gates, mänskliga grindar, och var vi är i kedjan mot första utvärdering.

---

## Var vi är nu

```text
✅ G0  Kärnapp live (prod-miljö)
✅ G1  test:gate 698/698
✅ G2  Plattform + Minnesrum i kod (CAP-003 → CAP-005)
✅ G3  Branch-paritet #539 ↔ #541 (CAP-006-R1)
✅ G3b #539 rebasad på main (CAP-007-R1, d82c09d7)
📍 G4  Merge IRC-bunt till main          ← MÄNNISKA (HRC-DEPLOY-IRC)
⏳ G4b #541 rebas på main               ← agent (CAP-008-R1, annan session)
⏳ G5  Deploy prod                        ← MÄNNISKA
⏳ G6  Dev-flagga testfamilj              ← MÄNNISKA (HRC-FLAG-MH)
🎯 G7  Första utvärdering i prod
⏳ G8  Konst godkänd (HRC-ART-041)       ← valfritt för G7, krävs för polerad UX
⏳ G9  Parent warm_echo (HRC-PARENT-042)  ← separat spår
```

**#539 är merge-ready** (rebasad, test:gate grön). Nästa mänskliga steg: review + merge.

---

## Merge-status (PR)

| PR | Rebasad på main | test:gate | Status |
|----|----------------|-----------|--------|
| #539 IRC-014 | ✅ `0ae9b3b7` | ✅ 698/698 | **Merge-ready** — väntar HAG |
| #541 IRC-016 | ❌ | — | CAP-008-R1 (annan agent) |

---

## Leveranstier (agent vs människa)

```mermaid
flowchart LR
  subgraph Agent["🤖 Agent"]
    ARC["ARC — commit"]
    IRC["IRC — draft PR"]
  end
  subgraph Human["👤 Människa"]
    H1["Merge main"]
    H2["Deploy"]
    H3["Dev-flagga"]
    H4["Konst / produkt"]
  end
  ARC --> IRC --> H1 --> H2 --> H3 --> EVAL["🎯 Utvärderbar"]
  EVAL --> H4 --> POLISH["✨ Polerad"]
```

| Tier | Gate | Vem | Pausar agent? |
|------|------|-----|---------------|
| **ARC** | Commit, refaktor, tester | Agent | Nej |
| **IRC** | Draft PR + `test:gate` | Agent | Nej |
| **HRC** | Merge, deploy, flaggor, konst | **Människa** | Agent fortsätter annat prep |

Källa: `.ai/company/HUMAN_APPROVAL_GATE.md`

---

## Produktspår (gates i detalj)

```mermaid
flowchart TB
  subgraph DONE["✅ Klart"]
    D1["Kärnapp live"]
    D2["CAP-001→005 plattform"]
    D3["IRC-014 Minnesrummet"]
    D4["698/698 test:gate"]
    D5["#539 ↔ #541 paritet"]
    D6["#539 rebasad på main"]
  end
  subgraph NOW["📍 Nu"]
    N1["G4: Merge IRC-bunt"]
    N2["G4b: #541 rebase"]
  end
  subgraph HUMAN["👤 Människa"]
    H1["G4 Merge → main"]
    H2["G5 Deploy prod"]
    H3["G6 memory_hall_playable"]
    H4["G8 Art HRC"]
    H5["G9 warm_echo HRC"]
  end
  subgraph OUT["Utfall"]
    E1["G7 Första utvärdering"]
    E2["G9 Polerad UX"]
  end
  DONE --> NOW
  N1 --> H1 --> H2 --> H3 --> E1
  E1 --> H4 --> E2
  H5 -.-> E2
```

| Gate | Beskrivning | Typ | Status |
|------|-------------|-----|--------|
| G0 | Kärnprodukt live | — | ✅ |
| G1 | `test:gate` grön | Agent | ✅ 698/698 |
| G2 | CAP-003 + IRC-014-R1 + CAP-005 i kod | Agent | ✅ |
| G3 | Branch-paritet #539 ↔ #541 | Agent | ✅ CAP-006-R1 |
| G3b | #539 rebasad på `main` | Agent | ✅ CAP-007-R1 |
| G4 | Merge IRC-007→016 till `main` | 👤 HRC-DEPLOY-IRC | ⏳ #539 redo |
| G4b | #541 rebasad på `main` | Agent | ⏳ CAP-008-R1 |
| G5 | Deploy till prod-miljö | 👤 HRC | ⏳ |
| G6 | `memory_hall_playable` på testfamilj | 👤 HRC-FLAG-MH | ⏳ |
| G7 | **Första utvärdering** (flöde, copy, känsla) | 👤 Du | 🔒 efter G4–G6 |
| G8 | Scen-WebP enligt art-spec | 👤 HRC-ART-041 | ⏳ |
| G9 | Parent `warm_echo` | 👤 HRC-PARENT-042 | ⏳ valfritt |

---

## Branch-paritet (#539 ↔ #541)

Verifierat 2026-07-03 (CAP-006-R1): produktkod-diff `public/`, `config/`, `test/` = **0 rader**.

| Feature | #539 `memory-hall-bl012-5e52` | #541 `autonomous-relay-resume-b105` |
|---------|-------------------------------|-------------------------------------|
| CAP-003 `enterWorld`/`exitWorld` | ✅ | ✅ |
| IRC-014-R1 `memory_hall` registry | ✅ | ✅ |
| CAP-005 asset-pipeline wiring | ✅ | ✅ |
| Rebasad på main | ✅ `d82c09d7` | ⏳ CAP-008-R1 |
| Senaste SHA (prod-kod) | `d82c09d7` | `3059ddf7` (pre-rebase) |

Handoff-docs kan skilja sig mellan grenarna; produktkod var synkad före #539-rebase.

---

## Senast genomfört — CAP-007-R1 (2026-07-03)

Rebase av `cursor/memory-hall-bl012-5e52` (#539) på `origin/main` (`0ae9b3b7`) — 9 commits.

**Konflikter lösta (4 lager):**

| Lager | SW-version |
|-------|------------|
| CAP-001/002 | v494 (main + precache) |
| CAP-003 | v494 |
| IRC-014-R1 | v495 |
| CAP-005 | v496 (slutlig) |

**Övrigt:**

- `docs/route-inventory-pre-split.md` regenererad (1098 rader)
- `test:gate` — 698/698 grön
- Push: `d82c09d7` (force-with-lease)
- PR #539 uppdaterad — **merge-ready pending human review**

---

## Tidigare — CAP-006-R1 (2026-07-03)

Cherry-pick av CAP-005-commit `3059ddf7` från relay till #539. Paritet bekräftad (0-line diff prod-kod).

---

## IRC-bunt — föreslagen merge-ordning (människa)

Se även `docs/reports/irc-bundle-2026-07-03.md`.

```text
IRC-007 (#527)  governance + a11y
    ↓
IRC-008 (#528)  CI lint
    ↓
IRC-009 (#529)  morgonhus a11y
    ↓
IRC-010–012     pack guards, LOE-tester, garden aria
    ↓
IRC-014 (#539)  Minnesrummet  ← huvudslicen, rebasad, merge-ready
    ↓
IRC-015 (#540)  art-spec (inga binärer)
    ↓
IRC-016 (#541)  relay-plattform  ← rebase pågår (CAP-008-R1)
    ↓
👤 Merge → 👤 Deploy → 👤 Flagga → 🎯 Utvärdera
```

---

## Mänskliga grindar (HRC) — öppna

| ID | Beslut | Blockerar |
|----|--------|-----------|
| HRC-DEPLOY-IRC | Merge IRC-bunt till `main` | G4 |
| HRC-DEPLOY | Deploy live | G5 |
| HRC-FLAG-MH | Allowlista testfamilj för `memory_hall_playable` | G6, G7 |
| HRC-ART-041 | Godkänn + committa scen-WebP | G8 (polerad UX) |
| HRC-PARENT-042 | Godkänn `warm_echo` copy/flow | G9 |

Källa: `.ai/knowledge/OPEN_BLOCKERS.md`

---

## Agent — vad som återstår

| ID | Uppgift | Status |
|----|---------|--------|
| CAP-008-R1 | Rebase #541 på main | ⏳ annan agent |

Övrig oblockerad capability-kö tom. Under HRC-väntan: merge-guider, docs — **inte** merge/deploy/flaggor/konst.

---

## Relaterade dokument

- `.ai/knowledge/OPEN_PRS.md` — IRC-tabell
- `.ai/knowledge/OPEN_BLOCKERS.md` — HRC-lista
- `docs/art-specs/memory-hall-bl041.md` — konst (väntar HRC)
- `docs/decisions/adr-memory-hall-bl012.md` — kreativ riktning (godkänd)
