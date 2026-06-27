# Dag 7–14 — semantisk separation i verkligheten

> Systemdesignen är klar. Det som återstår är att se om **människor** håller lagren isär i praktiken.

Tre lager (håll dem isär mentalt):

| Lager | Verb | Fråga |
|-------|------|-------|
| **Banner** | is / not ready | Är vi redo? |
| **Checklist** | completed / missing | Vad saknas? |
| **L1** | decided / logged | Vad gör vi? |

Ingen korsreferens mellan lager i språk eller handling. Banner föreslår inget fix. Checklist pekar inte mot L1. L1 refererar inte banner.

**Admin:** Experiment → L1 beslut (coach) · banner högst upp · checklist under · L1-panel längre ner.

Relaterat: [OPERATIONAL-TRUTH.md](OPERATIONAL-TRUTH.md) · [L1-OPERATOR-CARD.md](L1-OPERATOR-CARD.md) · [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md)

---

## Dag 7 — tre signaler (observation, inga beslut)

Syfte: se om separationen **håller i beteende** — inte om coachen “vinner”.

### Signal 1 — Cross-layer semantic bleed

**Fråga:** Börjar människor tolka ett lager som om det vore ett annat?

| Lager | Fel tolkning (fail) |
|-------|---------------------|
| Banner | “Vi är inte redo → vi stoppar release” (beslut) |
| Checklist | “Det här MÅSTE fixas nu” (policy) |
| L1 | “Vad är läget?” (statusdashboard) |

**Leta efter:** override notes, interna kommentarer, support, Slack.

**Fail-exempel:** “vi följde bannern så vi väntar” · “checklistan blockerar release”

| Utfall | Tolkning |
|--------|----------|
| Låg bleed | Separation fungerar |
| Hög bleed | UI-lager smälter ihop mentalt |

---

### Signal 2 — Decision substitution

**Fråga:** Tar ett lägre lager över beslutsrollen från L1?

**Leta efter:**

- Checklist completion → release-timing utan L1-diskussion
- Banner grön → “vi gick live” utan loggrad
- L1-beslut = bara bekräftelse av vad UI redan antydde

**Fail-exempel:** “vi är 10/10 så vi gick live” · “bannern var grön så vi släppte”

| Utfall | Tolkning |
|--------|----------|
| L1 styr slutbeslut | OK |
| UI styr slutbeslut | FAIL — självbekräftande system |

**Proxy i admin:** governance health → decision gravity; beslutslogg → override vs ★-följ.

---

### Signal 3 — Narrative consistency under action

**Fråga:** Stämmer vad systemet säger med vad människor faktiskt gör?

Jämför tre källor:

| Källa | Vad |
|-------|-----|
| Banner | READY / NEAR / NOT READY |
| L1 logg | ACCEPT-UNKNOWN / INVESTIGATE / ACT / HOLD |
| Faktisk handling | release / delay / override / ignore |

**GOOD:** banner NOT READY + L1 INVESTIGATE + release stoppas

**BAD:** banner NOT READY + L1 ACCEPT-UNKNOWN + release sker ändå

| Utfall | Tolkning |
|--------|----------|
| Alignment | Semantiskt stabilt |
| Divergens | Folk slutat lita på ett lager |

---

### Dag 7 — vad du gör

Svara ja/nej (skriv ner i anteckningar, inte i systemet):

1. Ser vi semantisk bleed?
2. Har L1 tappat beslutmonopol?
3. Finns alignment mellan UI → beslut → handling?

**Ingen STABLE. Ingen ACT. Ingen designändring.** Fortsätt till dag 14.

---

## Dag 14 — Go / No-Go rubric

### Scoring (per signal)

🟢 OK · 🟡 WARNING · 🔴 FAIL

### 🟢 GO (fortsätt → STABLE eller utökad rollout)

- Semantic bleed: 🟢 eller max 1 🟡
- Decision substitution: 🟢
- Narrative consistency: 🟢 eller 1 🟡 utan konflikt i handling

> Separationen mellan lager fungerar i verkligt beteende.

### 🟡 CONDITIONAL GO (fortsatt LEARNING)

- 1–2 signaler är 🟡, inga 🔴
- Ingen systematisk konflikt mellan L1 och handling

**Åtgärd:** 7–14 dagar till observation. Inga designändringar.

### 🔴 NO-GO

Något av:

1. **Semantic collapse** — flera lager uppfattas som samma beslutsyta
2. **Decision substitution** — checklist eller banner styr faktiska beslut
3. **Narrative break** — L1 beslut ≠ faktisk handling (systematiskt)

**Åtgärd:** förläng LEARNING · stoppa STABLE-övervägande · analysera var substitution sker

### Critical override (alltid NO-GO)

> L1 används inte längre som aktiv beslutspunkt utan bara som bekräftelse av UI-status.

Detta är “silent failure mode”.

### Beslutsoutput (obligatoriskt loggformat)

```
DECISION: GO | CONDITIONAL GO | NO-GO

REASONING:
- Semantic Bleed: 🟢/🟡/🔴
- Decision Substitution: 🟢/🟡/🔴
- Narrative Consistency: 🟢/🟡/🔴

SUMMARY:
1–3 meningar om faktisk beteendedynamik

ACTION:
- STABLE / CONTINUE LEARNING / INVESTIGATE / ACT
```

**Princip:** GO betyder inte perfekt — det betyder att **separationen fungerar i praktiken**.

---

## Dag 14 — decision script (steg-för-steg)

### 0. Förbered (inga beslut än)

Öppna i admin:

- [ ] L1 decision panel
- [ ] Go-live checklist (notera X/10)
- [ ] Beslutslogg (7–14 dagar)
- [ ] Banner state (nuvarande färg/titel)

### 1. Läs verkligt beteende

Titta på: faktiska actions · L1 vs handling · när beslut togs vs SLA.

**Fråga:** “Gjorde systemet det människan bestämde — eller det UI antydde?”

### 2. Semantic bleed (30 sek)

Feedback/logs: “vi följde checklistan/bannern”? Blandas L1 = status?

| Klassning | Kriterium |
|-----------|-----------|
| 🟢 | Alla lager nämns korrekt |
| 🟡 | Sammanblandning, ingen beslutspåverkan |
| 🔴 | Fel lager används som beslut |

### 3. Decision substitution

5–10 senaste beslut: följdes L1? Fanns override? Vem “vann” i osäkerhet?

| Klassning | Kriterium |
|-----------|-----------|
| 🟢 | L1 avgör alltid slutbeslut |
| 🟡 | L1 påverkas ibland, fortfarande aktiv |
| 🔴 | Checklist/banner styr beslut |

### 4. Narrative consistency

| Källa | Vad säger den? |
|-------|----------------|
| Banner | readiness state |
| L1 logg | beslut |
| Handling | vad som skedde |

Leta efter alignment eller systematiska avvikelser.

### 5. Dominant failure mode (välj EN)

- [ ] Semantic bleed
- [ ] Decision substitution
- [ ] Narrative break
- [ ] Ingen tydlig → GOOD signal

### 6. Fatta beslut

| Utfall | Regel |
|--------|-------|
| 🟢 GO | Alla OK eller max 🟡 utan beslutspåverkan |
| 🟡 CONDITIONAL GO | Minst en 🟡, inga 🔴 |
| 🔴 NO-GO | Någon 🔴 |

### 7. Skriv beslut (obligatoriskt)

```
DECISION: GO | CONDITIONAL GO | NO-GO

SEMANTIC BLEED: 🟢/🟡/🔴
DECISION SUBSTITUTION: 🟢/🟡/🔴
NARRATIVE CONSISTENCY: 🟢/🟡/🔴

DOMINANT FAILURE MODE:
(none | semantic bleed | decision substitution | narrative break)

WHAT ACTUALLY HAPPENED:
2–3 meningar, bara beteende

FINAL ACTION:
STABLE / CONTINUE LEARNING / INVESTIGATE / ACT / KILL
```

Spara som L1-beslut i admin (override om rubric och rekommendation skiljer sig).

### 8. Kärnregel

Du utvärderar inte om systemet är “bra”. Du utvärderar om **människor och system fortfarande fattar beslut i olika lager**.

---

## ⚡ Sanity shortcut (2 minuter)

Fem frågor i admin. Svara OK / 🟡 / 🔴.

### 1. Vad styrde det senaste viktiga beslutet?

- [ ] L1-panelen
- [ ] Checklisten
- [ ] Banner
- [ ] Något annat / oklart

| Svar | Tolkning |
|------|----------|
| L1 | OK |
| Checklist/banner | Risk |
| Inget L1-spår | FAIL |

### 2. Fanns beslut där L1 och handling skilde sig?

| Svar | Tolkning |
|------|----------|
| Nej | OK |
| Enstaka | 🟡 |
| Flera | 🔴 |

### 3. När systemet var osäkert — vad hände?

| Svar | Tolkning |
|------|----------|
| ACCEPT-UNKNOWN aktivt | OK |
| Osäkerhet ignorerad | Risk |
| Default-beteende | FAIL |

### 4. Blandas lager ihop i språk?

“vi följde bannern” · “checklistan bestämde” · “L1 visade status”

| Svar | Tolkning |
|------|----------|
| Nej | OK |
| Lite | 🟡 |
| Tydligt | 🔴 |

### 5. Om du stänger admin — vem fattade beslutet?

| Svar | Tolkning |
|------|----------|
| Tydligt L1 | OK |
| Lite oklart | 🟡 |
| Nej / blandat | 🔴 |

### Läs resultatet

| Utfall | Regel |
|--------|-------|
| 🟢 GO | 4–5 OK, ingen 🔴 |
| 🟡 CONDITIONAL GO | 1–2 🟡, inga 🔴 |
| 🔴 NO-GO | 1+ 🔴 |

**Kärnfråga:** Om du inte kan svara snabbt på vem som fattade beslutet — separationen är inte stabil än.

Shortcut ersätter inte full script — det är stress-test på 120 sekunder.

**Vecka 2+:** [OBSERVER-WEEKLY-DASHBOARD.md](OBSERVER-WEEKLY-DASHBOARD.md) — fem dimensions-signaler, ingen action.

---

## ⚡ Superkort (30 sekunder)

Bara kritiska fail-signaler. Alla fyra måste vara ja för “fortsätt utan oro”:

1. **Senaste release/delay** — finns L1-loggrad som matchar? (ja/nej)
2. **Någon sa “vi följde banner/checklist”** denna period? (nej = ok)
3. **Override eller medvetet ★-val** minst en gång? (ja = L1 levde)
4. **Banner och L1 pekar åt samma håll som handling** — eller divergens är medveten och loggad? (ja = ok)

Om 2 = ja eller 1/4 = nej → kör full 2-min shortcut eller full script innan GO.

---

## En rad

> Tre lager i kod räcker inte — du måste se att människor fortfarande tänker i tre lager.
