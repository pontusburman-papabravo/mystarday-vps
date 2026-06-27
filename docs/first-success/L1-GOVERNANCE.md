# L1 governance — unknown cause states i drift

> **Inte teknik. Inte fler signaler.**  
> Hur organisationen fattar beslut när modellen medvetet **inte** förklarar varför.

Relaterat: [PROD-STABILITY-MODEL.md](PROD-STABILITY-MODEL.md), [PROD-OPERATING-ENVELOPE.md](PROD-OPERATING-ENVELOPE.md).

---

## Vad systemet är (och inte är)

| | Beslutsobservationssystem (nu) | Beslutsoptimeringssystem (ej nu) |
|---|-------------------------------|----------------------------------|
| Output | Competition, ambiguity, non-adoption, unknown cause | Auto-policy, auto-dölj, auto-copy |
| Tolkning | L1 människa | Algoritm |
| Valid output | *"Vi vet inte varför"* | Kräver full orsakskedja |

**Governance-krav:** organisationen måste acceptera **icke-förklaring som giltigt output** — utan att det blir permanent passivitet.

---

## Meta-risk: epistemic paralysis

När modellen säger *"detta får inte tolkas"* kan teamet:

- sluta fatta beslut vid svag signal
- förlänga LEARNING strukturellt
- aldrig deklarera STABLE trots faktisk stabilitet

**Motgift:** L1 har **explicita beslutstyper** — inte "vänta tills vi förstår allt".

---

## L1-beslutstyper (välj en per review)

| Beslut | När | Vad det betyder |
|--------|-----|-----------------|
| **HOLD** | LEARNING, baselines sätter sig | Ingen produktändring; fortsätt mät |
| **ACCEPT-UNKNOWN** | Non-adoption inom baseline, intent uppfyllt, ingen qualitative drift | STABLE tillåten **utan** orsakstolkning |
| **INVESTIGATE** | Non-adoption ↑ eller qualitative hint | Samla path 3 (support, 3–5 intervjuer) — fortfarande ingen auto-fix |
| **ACT-SURFACE** | Korsvaliderad competition/ambiguity (DRIFT) | L2 minimal B/C eller copy/salience — **efter** beslut |
| **ACT-KILL** | User-visible harm, eskalering | Kill switch / rollback |

**Regel:** Unknown cause **blockar inte** ACCEPT-UNKNOWN eller HOLD. Den blockar bara **orsaksbaserad** auto-åtgärd.

---

## Unknown cause — L1-spelregler

### Får inte göras

- Tolka non-adoption som "coachen fungerar" (success)
- Tolka non-adoption som "coachen misslyckas" (failure) utan intent-gap eller qualitative
- Bygga ny A-yta för att "fixa tystnad"
- Auto-förlänga LEARNING utan datum eller exit-kriterium

### Ska göras

1. **Dokumentera** unknown cause i review-anteckning (en rad)
2. **Klassificera intent-outcome:**
   - Intent uppfyllt trots non-adoption → **ACCEPT-UNKNOWN** kandidat
   - Intent ej uppfyllt + non-adoption ↑ → **INVESTIGATE** eller **ACT-SURFACE** (salience/copy först)
3. **Sätt nästa review-datum** — unknown cause får inte bli öppen loop utan deadline

### Snabb beslutsträd

```
Non-adoption ↑ ?
├─ Nej  → competition/ambiguity axlar styr STABLE/DRIFT
└─ Ja
   ├─ Intent uppfyllt + ingen qualitative → ACCEPT-UNKNOWN → STABLE möjlig
   ├─ Intent ej uppfyllt → INVESTIGATE (1 vecka) → sedan ACT-SURFACE eller HOLD
   └─ Qualitative "förvirring" → DRIFT → L2 zone (Z1/Z2)
```

---

## STABLE utan konservatism

STABLE är **epistemiskt villkorat**, inte **orsakssäkert**.

### STABLE kräver (alla)

| # | Villkor |
|---|---------|
| 1 | ≥2 competition-proxies flat 2v |
| 2 | Non-adoption inom **LEARNING-baseline** (inte noll) |
| 3 | Ingen qualitative drift |
| 4 | L1-beslut dokumenterat: HOLD eller ACCEPT-UNKNOWN |

### STABLE kräver inte

- Förklaring av varför non-adoption sker
- Hög coach CTR
- Noll conflict
- Noll ambiguity

**Poängen:** STABLE betyder *"inga eskalerande drift-signaler inom envelope"* — inte *"vi förstår allt"*.

### Falsk konservatism (undvik)

| Symptom | Korrigering |
|---------|-------------|
| LEARNING > 21d utan ny `release_id` | Tvinga ACCEPT-UNKNOWN eller INVESTIGATE-deadline |
| "Vi förstår inte non-adoption" som skäl att vänta | Om intent uppfyllt → ACCEPT-UNKNOWN |
| STABLE kräver hög CTR | Ta bort — adoption är input, inte gate |

---

## LEARNING — exit så den inte blir permanent

### Standardfönster

| Fas | Varaktighet | Exit |
|-----|-------------|------|
| LEARNING | **14 dagar** efter `release_id` | Automatisk övergång till STABLE-utvärdering i L1 |
| Förlängd LEARNING | Max **+7 dagar** | Kräver skriftlig motivering (ny deploy, låg trafik, INVESTIGATE pågår) |

### LEARNING exit-checklista (dag 14)

- [ ] Baselines satta för ambiguity, bypass, non-adoption
- [ ] Minst 1 L1-review genomförd
- [ ] Beslut: STABLE (ACCEPT-UNKNOWN) | DRIFT | Förlängd LEARNING (+7d, motivering)
- [ ] Om fortfarande unknown cause **utan** intent-gap → ACCEPT-UNKNOWN är **tillåtet** (inte obligatoriskt att förstå)

**Permanent LEARNING är ett governance-fel**, inte en modellbegränsning.

---

## Veckovis L1 (15 min) — operativ mall

| Min | Aktivitet |
|-----|-----------|
| 0–3 | State: LEARNING / STABLE / DRIFT; dagar sedan `release_id` |
| 3–8 | Tre axlar: competition, ambiguity, non-adoption (trend only) |
| 8–11 | Unknown cause: ny? kvarstår? intent outcome? |
| 11–13 | **Välj beslutstyp** (HOLD / ACCEPT-UNKNOWN / INVESTIGATE / ACT-SURFACE / ACT-KILL) |
| 13–15 | Nästa review-datum + ägare |

**Output:** en rad i logg, t.ex.:

```
2026-06-26 | coach_primary_v1 | LEARNING d12 | non-adoption baseline OK | ACCEPT-UNKNOWN pending d14 | @product
```

---

## Ansvarsfördelning

| Roll | Ansvar |
|------|--------|
| **System** | Mäta, logga, aldrig auto-tolka unknown cause |
| **L1 (produkt/eng)** | Beslutstyp, STABLE/DRIFT, ACCEPT-UNKNOWN |
| **L2 (eng)** | Kodändring endast efter L1 ACT-SURFACE |
| **L3** | Engine policy — sista utväg |

---

## Invariants (governance)

1. **Icke-förklaring är giltigt output** — ska inte blockera STABLE om övriga villkor uppfylls
2. **Unknown cause får inte auto-åtgärdas** — endast mänsklig ACT-SURFACE
3. **LEARNING har deadline** — max 21d utan skriftlig förlängning
4. **Epistemisk försikt ≠ passivitet** — ACCEPT-UNKNOWN är ett aktivt beslut

---

## En mening för L1

> **När orsaken är okänd: dokumentera, klassificera intent, välj beslutstyp — vänta inte på att telemetrin ska berätta en historia den medvetet inte kan berätta.**
