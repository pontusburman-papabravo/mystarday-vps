# L1 operatörskort — en sida för veckovis drift

> **Systemet:** visar vad som händer, utan att tro på sig självt.  
> **Du:** bestämmer vad som är sant nog att agera på.

Full kontext: [L1-GOVERNANCE.md](L1-GOVERNANCE.md) · [L1-UNDER-PRESSURE.md](L1-UNDER-PRESSURE.md)  
**Admin:** `#l1beslut` → Experiment → L1 beslut (coach)  
**Dag 7/14:** [DAY-7-14-REVIEW-AGENDA.md](DAY-7-14-REVIEW-AGENDA.md) (30+45 min) · [DAY-14-SEMANTIC-REVIEW.md](DAY-14-SEMANTIC-REVIEW.md)  
**Veckovis (observer only):** [OBSERVER-WEEKLY-DASHBOARD.md](OBSERVER-WEEKLY-DASHBOARD.md)

---

## Du gör (kan inte automatiseras)

| # | Ansvar |
|---|--------|
| 1 | **Beslut under osäkerhet** — ACCEPT-UNKNOWN, INVESTIGATE, ACT, ACT-KILL |
| 2 | **Tolka tystnad** — irrelevans vs osynlig användning (ej data) |
| 3 | **Tradeoffs** — A vs B, enkelhet vs robusthet, tempo vs precision |
| 4 | **Stoppa över-tolkning** — STABLE ≠ “känns bra”; låg conflict ≠ lugnt |

## Systemet gör (ditt jobb att inte ta över)

| # | Automatiskt |
|---|-------------|
| 1 | Observera clicks, paths, timing, conflict, non-adoption |
| 2 | Klassificera *vad* (competition / ambiguity / non-adoption) — inte *varför* |
| 3 | Flagga STABLE-risk, proxy-collapse, unknown state |
| 4 | SLA-påminnelser (d14, d7 investigate, veckoreview) |

---

## Du gör bara tre saker

| När | Beslut |
|-----|--------|
| Osäkerhet **acceptabel** | **ACCEPT-UNKNOWN** (fyra fält i logg) |
| Osäkerhet **måste minskas** | **INVESTIGATE** (max 7d) |
| Något **ska ändras** | **ACT-SURFACE** eller **ACT-KILL** |

Passar inget? → **edge-HOLD** + `reason:` + review-datum.

---

## 15 min / vecka

1. State + dag sedan `release_id`
2. Tre axlar: competition · ambiguity · non-adoption (trend)
3. Intent outcome + qualitative?
4. **Välj beslutstyp** — skriv **en rad**
5. Nästa datum + @ägare

---

## Loggmallar (kopiera)

```
HOLD | coach_primary_v1 | LEARNING d7 | @owner
```

```
ACCEPT-UNKNOWN | coach_primary_v1 | intent:ok | non-adoption:baseline | qual:none | drift:no | @owner
```

```
INVESTIGATE | coach_primary_v1 | reason:"non-adoption up" | deadline:+7d | @owner
```

```
ACT-SURFACE | coach_primary_v1 | zone:Z1 | reason:"bypass up 2w" | @owner
```

```
HOLD | coach_primary_v1 | edge:yes | reason:"low traffic, recheck" | review:+7d | @owner
```

---

## SLA (hårda)

| Punkt | Krav |
|-------|------|
| LEARNING dag 14 | Beslut **samma dag** |
| INVESTIGATE | Avslut inom **7d** |
| Veckoreview | **15 min**, varje vecka |
| Backup L1 | Beslut inom **48h** om primär missar d14 |

---

## Gör inte

| ❌ | ✅ istället |
|----|------------|
| Vänta på perfekt signal | ACCEPT-UNKNOWN om kriterier uppfyllda |
| STABLE utan loggrad | Skriv raden först |
| ACCEPT-UNKNOWN som default | Fylla alla fyra fält aktivt |
| Tolka tystnad som insikt | edge-HOLD eller INVESTIGATE |
| Mer data efter dag 21 | Beslut enligt SLA |

---

## Gränsen (memorera)

**Systemet får inte:** säga vad som är rätt · tolka tystnad · auto-STABLE · ersätta L1.

**Du får inte:** förklara allt med data · evig LEARNING · låta low conflict lura dig.

---

*Utskriftsvänlig. Uppdateras endast vid ny `release_id` eller ändrad beslutstyp.*
