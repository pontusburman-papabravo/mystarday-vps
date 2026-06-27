# Dag 7 & dag 14 — review-agenda (exakt)

> **Frysperiod:** ingen systemutveckling (utom bugfix), inga nya lager/signal/regler under 7+14 dagar.  
> Observation får **inte** påverka systemet — bara loggas.

**Exit-fråga (efter 7–14 dagar):** Kan vi identifiera beslutsägare utan förklaring i >90% av fallen?  
Ja → separation fungerar · Nej → semantic collapse pågår

**Admin:** Experiment → L1 beslut (coach)

Relaterat: [DAY-14-SEMANTIC-REVIEW.md](DAY-14-SEMANTIC-REVIEW.md) · [OBSERVER-WEEKLY-DASHBOARD.md](OBSERVER-WEEKLY-DASHBOARD.md) · [OPERATIONAL-TRUTH.md](OPERATIONAL-TRUTH.md)

---

# Blind drift mode (hela observationsperioden)

Systemet gör bara tre saker:

1. Logga beslut (L1)
2. Visa banner / checklist / L1
3. **Inte** förändras baserat på observation

Ingen löpande re-arkitektur mellan dag 7 och dag 14.

---

# 📅 DAG 7 — 30 min (OBSERVATION ONLY)

## 0. Setup (2 min)

Öppna **exakt** detta — inget mer, inga extra dashboards:

- [ ] L1 decision log (alla beslut senaste 7 dagar)
- [ ] Go-live checklist (status + history)
- [ ] Banner state (readiness nu + om du noterat ändringar)
- [ ] 5 senaste viktiga beslut (release / delay / override)

## 1. Decision source scan (8 min)

Gå igenom senaste **10–20** beslut. Markera per beslut:

- [ ] L1
- [ ] Checklist
- [ ] Banner
- [ ] Implicit (saknar källa)

**Leta efter:** vem som faktiskt “äger beslutet”.

**Output (mentalt):** `L1 dominerar` · `blandat` · `UI dominerar`

## 2. Semantic bleed check (7 min)

Läs:

- 10 loggrader
- 5 interna anteckningar / overrides / kommentarer

**Leta efter språk:**

- “vi följde bannern”
- “checklistan sa…”
- “vi var klara så…”

**Output:** `låg` · `medel` · `hög` bleed

## 3. Override & pressure (7 min)

Titta på:

- L1 recommendations vs faktiskt utfall
- Override rate (governance health)
- Riktning (alltid override åt samma håll?)

**Fråga:** används L1 som **input** eller som **etikett**?

**Output:** `LOW` · `MEDIUM` · `HIGH` override pressure

## 4. Narrative alignment (6 min)

För **3–5 cases**, jämför:

| | |
|--|--|
| Banner state | |
| L1 decision | |
| Faktisk handling | |

**Leta efter:** alignment · eller systematisk avvikelse

**Output:** `GOOD` · `FRAGMENTED` · `BROKEN`

## 5. Quick judgment (5 min)

Svara bara:

1. Fungerar separationen just nu? **ja / nej / osäker**
2. Var känns friktionen störst?

**Inga beslut idag.** Ingen STABLE. Ingen ACT.

---

## DAG 7 OUTPUT (en rad — kopiera)

```
DAY7 SUMMARY:
Decision ownership: L1 | MIXED | UI-DOMINATED
Semantic bleed: LOW | MEDIUM | HIGH
Override pressure: LOW | MEDIUM | HIGH
Narrative alignment: GOOD | FRAGMENTED | BROKEN
Overall: STABLE | LEANING RISK | EARLY DRIFT
```

Spara i anteckningar eller som kommentar i L1 override-fält — **inte** som systemändring.

---

# 📅 DAG 14 — 45 min (BESLUTSPUNKT)

Dag 14 = inte bara observation → **go / conditional / no-go**

## 0. Setup (5 min)

Öppna:

- [ ] Full 14-dagars L1 logg
- [ ] Override-historik (governance health + loggrader)
- [ ] Release / deploy events (utanför admin om behövs)
- [ ] Banner history (anteckningar från dag 7–14)
- [ ] Checklist completion history (X/10 över tid)

## 1. Decision authority audit (10 min)

För varje **viktigt** beslut:

**Fråga:** vem styrde faktiskt?

Klassificera: `L1-ledd` · `UI-ledd` · `implicit`

**Output:** % L1 dominance (uppskattning räcker)

## 2. Conflict trace (10 min)

Alla fall där:

- L1 ≠ handling
- Checklist ≠ L1
- Banner ≠ handling

**Identifiera:** mönster eller enstaka avvikelse

## 3. Semantic collapse test (8 min)

**Fråga:** har lagren börjat bli “språkligt samma sak”?

**Tecken:**

- samma ord för alla lager
- ingen skillnad mellan “status” och “beslut”

**Output:** bleed `LOW` · `MEDIUM` · `HIGH`

## 4. Narrative truth test (7 min)

För **5 konkreta** fall — jämför:

| | |
|--|--|
| Vad systemet säger (banner/checklist) | |
| Vad L1 säger | |
| Vad som faktiskt gjordes | |

**Fråga:** finns en konsekvent verklighetsmodell?

**Output:** `GOOD` · `FRAGMENTED` · `BROKEN`

## 5. Final system call (5 min)

Svara **EN**:

- [ ] **GO**
- [ ] **CONDITIONAL GO**
- [ ] **NO-GO**

Validera mot [DAY-14-SEMANTIC-REVIEW.md](DAY-14-SEMANTIC-REVIEW.md) (rubric + 2-min shortcut om tiden är knapp).

---

## DAG 14 OUTPUT (obligatorisk — spara som L1-beslut)

```
DECISION: GO | CONDITIONAL GO | NO-GO

REASONING:
- Decision authority: L1 | MIXED | UI
- Semantic bleed: LOW | MEDIUM | HIGH
- Narrative consistency: GOOD | FRAGMENTED | BROKEN

KEY OBSERVATION:
1–3 meningar om faktisk systembeteende

FINAL CALL:
STABLE | CONTINUE LEARNING | INVESTIGATE | ACT | KILL
```

Skriv in i admin → L1 beslut → spara beslut (med override om rubric ≠ rekommendation).

---

# Kritisk princip (båda dagarna)

Du utvärderar **inte** systemet som design.

Du utvärderar om människor fortfarande kan separera beslutslager **utan att tänka på det**.

---

# Vad du ignorerar (båda dagarna)

| Ignorera | Varför |
|----------|--------|
| Coach CTR, conflict-nivåer som “bra/dåligt” | Produkt, inte separation |
| “Vi borde fixa X i UI” | Frysperiod |
| Enskilda lyckade beslut | Mönster, inte anekdoter |
| Governance-completeness | Redan komplett |

---

# Tidslinje

| Dag | Session | Längd | Utfall |
|-----|---------|-------|--------|
| 1 | Start blind drift | — | Första loggrad |
| 7 | Denna agenda § DAG 7 | 30 min | DAY7 SUMMARY (en rad) |
| 8–13 | Vecko-ruta om måndag | 5 min | [OBSERVER-WEEKLY-DASHBOARD.md](OBSERVER-WEEKLY-DASHBOARD.md) |
| 14 | Denna agenda § DAG 14 | 45 min | GO / CONDITIONAL / NO-GO + L1-logg |

---

# En rad

> Sluta bygga. Mät verkligheten utan att röra den.
