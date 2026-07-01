# För dig content-sync — avslut (#476)

**Status:** Stängd och verifierad i prod (`7995d06`, 2026-07-01)  
**PR:** #476  
**Migration:** `1809180000000_for_dig_library_gaps` (idempotent, körd i prod)

---

## Problem

Innehållsglapp mellan `for-dig-config` och standardbiblioteket (`default_activity_template` / `default_reward`):

- Fuzzy namnmatchning (`includes`) gav över- och underleverans
- Saknade standardobjekt i biblioteket
- Headline för Skolansvar matchade inte paketets omfattning

**Symptom i prod (pre-fix):**

| Mål | Utlovat | Levererat |
|-----|---------|-----------|
| Samarbete hemma | 4 aktiviteter | 1/4 |
| Motivation | 4 belöningar | 2/4 |
| Självständighet | 4 aktiviteter | 5 (dubbel tandborstning) |

---

## Lösning

1. **Synkad config** — exakta prod-namn i `activityNames` / `rewardNames`
2. **Seed** — `Duka av`, `Hämta post`, `Hjälpa till`, `Glass`, `Skärmtid`
3. **Exakt namnmatchning** — `findByNames` utan partial match
4. **Copy** — Skolansvar headline → *Få hela skoldagen att flyta*

---

## Verifiering (prod)

| Mål | Resultat |
|-----|----------|
| Samarbete hemma | 4/4 aktiviteter |
| Motivation | 4/4 belöningar |
| Självständighet | 4/4, en tandborstning |
| Skolansvar | Ny headline live |

---

## Kvarvarande beslut (ej i #476)

Hur `scheduleName`-mål ska hantera befintliga scheman: **hela dagen** vs **endast relevant sektion**.

→ Se `docs/for-dig-spec.md` §7.4. Separat implementation-PR; ingen vidare finputs på content-sync planerad.

---

## Stabilitet

Denna leverans betraktas som **stabil**. Nästa arbete ska ge nytt användarvärde — inte mer finputs på innehållssynken.
