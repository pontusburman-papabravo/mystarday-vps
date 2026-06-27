# Observer-only weekly dashboard (NO ACTIONS)

> Ren observationsvy. Får **inte** leda till ändringar — bara förståelse.

Varje vecka, en fråga:

> “Håller separationen mellan lager i verkligt beteende?”

**Relaterat:** [DAY-14-SEMANTIC-REVIEW.md](DAY-14-SEMANTIC-REVIEW.md) · [OPERATIONAL-TRUTH.md](OPERATIONAL-TRUTH.md) · [L1-OPERATOR-CARD.md](L1-OPERATOR-CARD.md)

**Admin (läs-only):** Experiment → L1 beslut (coach) — banner, checklist, beslutslogg, governance health. Inga nya knappar behövs.

---

## Designprincip

> Dashboarden ska göra det omöjligt att lura sig själv med enskilda lyckade beslut.

Den visar **mönster** — inte exempel, inte story, inte status som beslut.

---

## Icke-förhandlingsbara regler

1. **Ingen action kopplad** — inga knappar, rekommendationer eller “next steps”
2. **Ingen tolkning i UI** — bara vad som hände, hur ofte, hur det fördelas (inga “detta är OK/problem”)
3. **Ingen normalisering av avvikelse** — endast signaler

---

## 1. Decision source attribution (vem “vann”?)

**Titta på:** alla viktiga beslut (release, delay, override) denna vecka.

| Källa | Exempel |
|-------|---------|
| L1-panel | Loggrad + override/medvetet ★-val |
| Checklist | “10/10 så vi …” utan L1-rad |
| Banner | “grön/röd banner så vi …” |
| Implicit | Ingen loggad källa |

**Mät:** andel där L1 är tydlig källa vs UI/implicit.

**Röd flagga:** checklist/banner används som beslutskälla oftare än L1.

**Var i admin:** beslutslogg · override notes · veckans interna kommentarer.

---

## 2. Semantic bleed index (språklig blandning)

**Titta på:** hur människor *beskriver* systemet denna vecka.

| Uttryck | Fel lager |
|---------|-----------|
| “vi följde checklistan” | execution → beslut |
| “bannern sa att vi var redo” | status → beslut |
| “L1 visar status” | beslut → status |

**Mät:** antal fall per vecka · trend (upp / stabil / ner).

**Röd flagga:** UI-termer ersätter L1 i beslutsprat.

**Var:** Slack, mötesanteckningar, override-fält — inte automatiskt i systemet.

---

## 3. Override pressure (spänning i beslutsmodellen)

**Titta på:**

- L1-rekommendation vs faktisk handling
- override-frekvens
- riktning (alltid “go” trots caution? alltid HOLD?)

**Mät:** override rate · riktningsbias.

**Röd flagga:** L1 är formellt aktiv men påverkar inte utfall.

**Var i admin:** governance health → decision gravity, override rate, ACCEPT-UNKNOWN rate.

---

## 4. Narrative consistency (3-vägs alignment)

| Källa | Innehåll |
|-------|----------|
| Banner | readiness state (READY / NEAR / NOT READY) |
| L1 logg | beslutstyp |
| Faktisk handling | release / delay / override / ignore |

**Leta efter:** full alignment · eller systematisk drift (samma lager avviker varje gång).

**Röd flagga:** två lager matchar, ett avviker konsekvent.

**Var i admin:** banner (överst) · senaste beslut · vad som faktiskt hände utanför admin.

---

## 5. Non-adoption of L1 (tyst frånvaro)

**Titta på:**

- viktiga beslut utan L1-nämnande
- actions “utan systemet”
- release/delay utan loggrad

**Inte fel i sig** — men:

- ökar → L1 blir irrelevant
- stabil låg nivå → L1 är stöd, inte flaskhals

**Röd flagga:** majoriteten av viktiga beslut sker utanför L1.

**Var:** jämför beslutslogg (antal rader/vecka) med faktiska release/delay-beslut.

---

## Vecko-översikt (en ruta — fyll i manuellt)

Kopiera varje måndag (eller efter veckoreview 15 min):

```
VECKA: YYYY-Www
SEPARATION HEALTH (observer only)

Decision source:     L1 | MIXED | UI-DOMINATED
Semantic bleed:      LOW | MEDIUM | HIGH
Override pressure:   LOW | MEDIUM | HIGH
Narrative match:     GOOD | FRAGMENTED | BROKEN
L1 adoption:         HIGH | PARTIAL | LOW

NOTES (max 3 bullets, beteende only):
-
-
-
```

**Ingen action-rad.** Om du känner dig manad att skriva “fix X” — stopp, det är fel lager.

---

## Befintliga admin-proxies (automatiskt, läs-only)

Dessa **stödjer** observation men ersätter inte manuell vecko-ruta:

| Proxy | Admin-fält | Kopplad dimension |
|-------|------------|-------------------|
| Override rate % | governance health | Override pressure |
| Follow recommendation % | governance health | Override pressure (invers) |
| ACCEPT-UNKNOWN % | governance health | Narrative / osäkerhetshantering |
| Beslut 7d (antal rader) | beslutslogg | L1 adoption |
| Coach/conflict 7d | metrics row | Observability (ej beslut) |

Tolka inte proxyn som GO/NO-GO — bara input till vecko-rutan.

---

## Hur du använder den (mentalt)

Varje vecka, en fråga:

> “Är beslut fortfarande L1-burna, eller har UI blivit beslutsmotor igen?”

Om du måste tänka länge → separationen är instabil (oavsett grön banner).

---

## Koppling till dag 7 / dag 14

| Tidpunkt | Verktyg |
|----------|---------|
| Dag 7 | Tre signaler i [DAY-14-SEMANTIC-REVIEW.md](DAY-14-SEMANTIC-REVIEW.md) |
| Dag 14 | Go/No-Go rubric + 2-min shortcut |
| Vecka 2+ | Denna observer-only ruta (varje vecka) |

Dag 14 beslut ska **inte** baseras på en veckas data ensam — men vecko-rutan bygger mönster över tid.

---

## En rad

> Observera tills systemet bevisar eller motbevisar sin egen modell — ändra inget för att “fixa” en veckas siffra.
