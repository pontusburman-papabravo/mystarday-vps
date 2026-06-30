# TRADGARDEN_FAMILY_TEST_PROTOCOL

**Dokumenttyp:** Familjetest- och releaseprotokoll — tidig utrullning med riktiga familjer  
**Roll:** Game Director + Parent Experience Lead  
**Underlag:** [TRADGARDEN_SPRINT_PLAN.md](./TRADGARDEN_SPRINT_PLAN.md) · [TRADGARDEN_WORLD_BRIEF.md](./TRADGARDEN_WORLD_BRIEF.md)  
**Scope:** Sprint 0–2 endast  
**Version:** 1.0  
**Datum:** 2026-06-30

**Medvetet uteslutet:** ny vision · nya världar · implementation · kod · UI-copy · SQL

**Mål:** Trygg, mänsklig, mobilvänlig test med riktiga familjer **så tidigt som möjligt** — inte perfekt värld.

**Primär miljö:** Mobiltelefon · PWA · mobil Safari · mobil Chrome · portrait · en tumme · ofta **hallen** (snabb öppning, kort session).

---

## Översikt — releasegrindar

| Gate | Sprint | Familjer | Minsta varaktighet | Vetoägare |
|------|--------|----------|-------------------|-----------|
| **G0** | 0 — Ankomst | **Pontus-familjen** (1) | 3 dagar, ≥2 sessioner | Game Director |
| **G1** | 1 — Planteringslådan | **5 familjer** | 5 dagar | Game Director + Parent Experience |
| **G2** | 2 — Första fröet | **20 familjer** | 7 dagar | Game Director + CPO |

**Princip:** Ingen bredare rollout förrän föregående gate är **green**. Yellow = begränsad fortsättning med fixlista. Red = paus. Stop = veto, ingen nästa sprint.

---

## Globala testregler (alla sprintar)

### Vad familjer aldrig ska göra

- Kryssa i formulär medan barnet tittar  
- Jämföra syskon högt ("din bror har redan…")  
- Tvinga barnet tillbaka till trädgården  
- Förklara "hur man vinner" eller "vad man måste göra varje dag"  
- Testa medvetet missad dag **som skuld-experiment** i samma vecka som första besök  
- Sitta med desktop / iPad som primär enhet (endast mobil räknas i protokollet)

### Vad Product gör istället för Pontus

- Läser **Trädgården Test Dashboard** (se §4) — inte databas  
- Ringer/max **en** kort avstämning per familj endast vid yellow/red  
- Samlar **ljudinspelning nej** — förälderns korta fritext (valfritt) räcker

### Mänsklig trygghet — absoluta förbud i testdesign

| Förbjudet i test | Varför |
|------------------|--------|
| Ledande skuldfrågor | *"Glömde du trädgården?"* |
| Prestionsformulär | *"Hur många dagar i rad?"* |
| Syskon-ranking | *"Vem kom längst?"* |
| FOMO-instruktioner | *"Öppna innan midnatt"* |
| Förälder som domare | *"Gjorde du rätt?"* |
| Barn närvarande vid förälder-debrief | Barn ska inte höra utvärdering |

### Trygghetslarm (omedelbar stop)

Om **någon** familj rapporterar (eller Product observerar):

- Barn gråter / skäms kring trädgården  
- Barn säger *"jag måste"* / *"jag glömde"* om trädgården  
- Förälder: *"ännu en sak att sköta"*  
- Syskonfight utlöst av trädgården  

→ **Stop** oavsett gate-färg. Game Director + CPO inom 24 h.

---

# 1. Testprotokoll per sprint

---

## Sprint 0 — Ankomst

**Gate G0 · Pontus-familjen · 3 dagar**

### Förutsättning (system, inte familj)

- Morgonhuset Root uppnått för testbarnet  
- Trädgården unlockad för familjen via rollout-flag (Pontus allowlist)  
- Ingen instruktion skickad om *var* trädgården finns — endast: *"Använd appen som vanligt på mobilen."*

### Vad familjen ska göra

| Aktör | Gör |
|-------|-----|
| **Förälder** | Inget särskilt. Vanlig morgon med Idag. Låt barnet hitta Min värld själv om hen vill. |
| **Barn** | Fritt — samma som vanligt. Ingen uppmaning att "testa nya grejen". |
| **Product** | Observerar dashboard 3 dagar. Max 1 mjuk ping till förälder dag 3: *"Hur kändes veckan? Inget formulär — svara gärna med en mening."* |

**Sessionstyp att fånga:** minst en **hall-session** (öppna appen snabbt, stå, gå vidare).

### 2-sekundersregeln — barn

Vid första möte med trädgården ska barnet inom **2 sekunder** förstå:

| Förståelse | Signal |
|------------|--------|
| *"Det här är ett nytt ställe"* | Grind/gräs skiljer sig från Morgonhuset |
| *"Jag får gå in"* | Grind eller ingång är uppenbar att trycka |
| *"Inget är fel om jag bara tittar"* | Ingen röd varning, ingen nedåt-pil som stressar |

### 2-sekundersregeln — förälder

Om föräldern tittar på skärmen ska hen inom **2 sekunder** förstå:

| Förståelse | Signal |
|------------|--------|
| *"Det här är lugnt innehåll"* | Ingen kasino-animation, ingen countdown |
| *"Mitt barn behöver inte hjälp nu"* | Inga PIN-lås eller svåra val i trädgården |
| *"Det här är inte en ny syssla"* | Ingen lista, inget "dag 1/7" |

### Vad vi observerar

| Källa | Observation |
|-------|-------------|
| **Dashboard** | Hittade barnet trädgården utan popup? Tid i världen. Interaktioner. Återbesök. Fastnade? |
| **Förälder (valfritt)** | En mening: lugnt / stressigt / vet inte vad det var |
| **Barn (endast om barnet själv berättar)** | Spontan kommentar hemma — loggas ordagrant av förälder till Product |

### Vad vi INTE frågar om

- Hur många gånger barnet öppnade appen  
- Om barnet "borde" gått dit oftare  
- Jämförelse med syskon eller andra barn  
- Betyg / NPS / stjärnor  
- Om morgonrutinen blev sämre  

### Green light (G0)

Alla måste vara sant:

- [ ] Barnet hittade trädgården **eller** medvetet valde bort utan föräldernag (båda OK)  
- [ ] Om besök: session ≥20 s **eller** tydlig interaktion (grind)  
- [ ] Ingen skuld-signal från barn eller förälder  
- [ ] Dashboard: ingen fastna-signal  
- [ ] Idag-completion oförändrad eller bättre (guardrail)  
- [ ] Game Director: minst ett Wonder Moment möjligt (vind, grind, fjärran fågelbad)

### Yellow (G0)

- Barn hittade inte trädgården på 3 dagar **men** morgonflöde OK → discovery-fix, inte innehålls-panic  
- Session <15 s upprepat **men** barnet uttrycker nyfikenhet hemma  
- Förälder: "vet inte vad det var" — neutral, inte negativt  

**Åtgärd:** justera discovery (karta/glimt), inte fler features. Ny G0 efter fix.

### Red (G0)

- Förälder: stress / förvirring / "ännu en grej"  
- Barn lämnar upprepade gånger <10 s **och** uttrycker tråkigt  
- Idag-completion sjunker märkbart  

**Åtgärd:** paus rollout. Sprint 0 revision.

### Stop (G0)

- Skuld, skam, syskonfight  
- Kasino-popup eller login-belöning observerad  
- Barn slutar vilja öppna appen helt  

**Åtgärd:** Game Director **STOPP**. Ingen G1.

---

## Sprint 1 — Planteringslådan

**Gate G1 · 5 familjer · 5 dagar**

**Familjsammansättning (obligatorisk mix):**

| # | Profil |
|---|--------|
| 1 | Pontus-familjen (fortsättning) |
| 2 | Ett barn, 6–8 år |
| 3 | Ett barn, 9–11 år |
| 4 | Två syskon (båda med egen barnvy) |
| 5 | Barn med NPF-vardag (förälder självidentifierar — ingen diagnos i data) |

### Vad familjen ska göra

| Aktör | Gör |
|-------|-----|
| **Förälder** | Vanlig vecka. Om barnet visar trädgården: *"Så fint"* — inte mer. |
| **Barn** | Utforska. Om låda erbjuds: placera om hen vill. |
| **Product** | Dashboard 5 dagar. Ingen familj kontaktas om green. |

### 2-sekundersregeln — barn

| Förståelse | Signal |
|------------|--------|
| *"Det där kan jag sätta dit"* | Låda/ghost tydlig på rabatt |
| *"Det blev mitt"* | Snap/placering känns avslutat |
| *"Jag behöver inte göra mer"* | Ingen pil som tvingar nästa steg |

### 2-sekundersregeln — förälder

| Förståelse | Signal |
|------------|--------|
| *"Det var en sak, inte ett projekt"* | Ett primärt val räcker |
| *"Syskon har inte samma"* | Parallella ytor utan rankning |
| *"Jag behöver inte hålla reda"* | Ingen förälder-action krävs |

### Vad vi observerar

- Placerade barnet lådan? (dashboard)  
- Syskon: båda placerade utan konflikt?  
- Återbesök till trädgården utan placement (legitimt)  
- Hall-session: går placering att göra med en tumme?  
- Spontan hemma-berättelse: *"jag har en låda"*  

### Vad vi INTE frågar om

- Om lådan "borde" stå någon annanstans  
- Om syskon placerade snabbare/långsammare  
- Om barnet borde planterat något (kommer sprint 2)  
- Detaljerad UX-enkät  

### Green light (G1)

- [ ] ≥4/5 familjer: minst ett barn placerade låda **eller** återbesök ≥30 s utan skuld  
- [ ] 0 syskon-rankningssignaler  
- [ ] 0 förälder-stress-signaler  
- [ ] Dashboard fastna-rate <20 % bland besökare  
- [ ] Mobil: placering genomförd på mobil i ≥3/5 familjer utan föräldershjälp  

### Yellow (G1)

- 1 familj fastnade vid placering  
- 1 familj: "bara en låda?" — neutral nyfikenhet, inte avvisande  
- Syskon: en placerade, andra inte — **utan** konflikt  

**Åtgärd:** UX-touch target / tydlighet. Fortsätt till G2 med fix.

### Red (G1)

- ≥2 familjer: IKEA-känsla (för många steg)  
- Syskonfight i ≥1 familj  
- ≥2 familjer: session <10 s upprepat + negativ barnkommentar  

**Åtgärd:** paus G2. Sprint 1 revision.

### Stop (G1)

- Samma som global stop  
- Förälder: "nu ska de sköta en till grej varje dag"  

---

## Sprint 2 — Första fröet

**Gate G2 · 20 familjer · 7 dagar**

**Familjsammansättning:**

| Bucket | Antal |
|--------|-------|
| G1-familjer som fortsätter | 5 |
| Nya: enbart barn | 8 |
| Nya: syskon | 4 |
| Nya: bonusfamilj / delad vård | 2 |
| Nya: minimal utomhusrutin (balkong/stad) | 1 |

### Vad familjen ska göra

| Aktör | Gör |
|-------|-----|
| **Förälder** | Vanlig Idag. Om det finns utomhus-/hjälp-/promenad-aktivitet: markera som vanligt — **ingen extra insats för testet**. |
| **Barn** | Som vanligt. Trädgården efter rutin om hen vill. |
| **Product** | Dashboard 7 dagar. Valfri en-mening debrief till **3 slumpade** familjer endast om yellow. |

**Reality-first:** Familjer instrueras **inte** att fabricera aktiviteter. Frö får utebli — det är data.

### 2-sekundersregeln — barn (med frö)

| Förståelse | Signal |
|------------|--------|
| *"Något ligger i jorden"* | Frö synligt, inte gömt |
| *"Det hänger ihop med något jag gjort"* | Kausalkänsla utan förklarande textvägg |
| *"Jag väntar gärna"* | Ingen countdown, ingen röd jord |

### 2-sekundersregeln — barn (utan frö än)

| Förståelse | Signal |
|------------|--------|
| *"Min låda är tom — det är okej"* | Ingen skamjord, ingen grå död jord |
| *"Något kan komma sen"* | Subtilt hopp, inte FOMO |

### 2-sekundersregeln — förälder

| Förståelse | Signal |
|------------|--------|
| *"Appen kräver inte att jag ljuger"* | Frö speglar verklig aktivitet |
| *"Barnet blev inte belönat för skärm"* | Ingen koppling skärmtid → frö |
| *"Vi missade en dag — inget hände"* | Ingen straff vid återkomst |

### Vad vi observerar

- Andel barn med frö efter verklig aktivitet (dashboard + reality-korrelation)  
- Barn utan frö: återbesök utan skuld?  
- Missad dag 2–3 i veckan: välkomnande tillbaka?  
- Farm-signaler: öppnar barn **bara** för trädgården och skippar Idag?  
- Hemma-spontant: *"jag fick ett frö"* / *"kan vi plantera på riktigt?"*  

### Vad vi INTE frågar om

- *"Varför har du inget frö?"* (skuld)  
- *"Har du gjort alla aktiviteter?"* (prestation)  
- *"Är appen värd pengarna?"* (fel fas)  
- Detaljer om exakt vilken aktivitet som triggade (privacy)  

### Green light (G2)

- [ ] ≥70 % av familjer med frö-upplevelse: förälder/barn **neutral eller positiv** kausalkänsla  
- [ ] ≥80 % utan frö: inga skuld-signaler  
- [ ] 0 farm-signaler (Idag skip rate stabil)  
- [ ] 0 stop-signaler  
- [ ] Missad dag: välkomnande beteende i ≥90 % återbesök (dashboard + stickprov 3 familjer)  
- [ ] Mobil hall-test: frö synligt utan zoom i ≥15/20 familjer  

### Yellow (G2)

- 10–30 % förstår inte varför frö kom — **men** inte stressande  
- Enstaka syskon-FOMO utan fight  
- Reality-koppling upplevs som "belöning" hos 2–3 föräldrar (ordet "belöning" — inte kris)  

**Åtgärd:** mjukare spegling, tydligare kausalkänsla utan mer text. CPO review. G3 (Sprint 3) med fix.

### Red (G2)

- ≥30 % förstår inte kausalkoppling **och** barn frustration  
- ≥2 familjer: "måste logga in varje dag"  
- Idag-completion sjunker >10 % i testkohorter  

**Åtgärd:** paus Sprint 3. Reality-first redesign.

### Stop (G2)

- Global stop  
- ≥1 familj: barn upplever frö som **straff** eller **fel** när det uteblir  
- "Farmville" nämnt av förälder eller barn i ≥2 familjer  

---

# 2. Mänsklig trygghet — fördjupning

## Scenarier som testet medvetet täcker

| Scenario | Sprint | Trygg design |
|----------|--------|--------------|
| **Missad dag** | 0–2 | Familj instrueras att leva normalt. Product mäter välkomnande vid återbesök — frågar aldrig "varför var du borta". |
| **Vissna** | *Ej i 0–2* | Nämns inte för familjer. Ingen förberedelse som skapar förväntan om "död blomma". |
| **Låsta objekt** | 0–1 | Tom jord / tom låda ska kännas **redo**, inte **låst**. Ingen grå hänglås-ikon. |
| **Syskon** | 1–2 | Parallella rabatter. Debrief sker per barnvy — förälder jämför inte högt. |
| **Förälder kryssar i efterhand** | 2 | Förälder markerar aktivitet i egen vy **utan** barn tittar. Barn ser frö senare — Product frågar inte barnet om timing. |
| **Barn utan frö** | 2 | Protokollet behandlar detta som **valid data** — inte failure. |

## Förälder-debrief (endast vid yellow/red)

**Max 3 minuter. Barnet närvarar inte.**

Tillåtna frågor:

1. *"Hur kändes det i magen den här veckan med trädgården-delen?"*  
2. *"Sa barnet något spontant?"*  
3. *"Behövde du hjälpa — med vad?"*  

Förbjudna frågor: se § globala regler.

## Barnhörsel

Om barnet råkar höra vuxen prata om testet:

- Förälder ska kunna säga: *"Du gjorde inget fel. Vi kollar bara att trädgården känns bra."*  
- Product skickar denna mening som förslag i välkomst-SMS — inte som krav.

---

# 3. Mobil reality check

## Globala mobilkrav (Sprint 0–2)

| Krav | Standard |
|------|----------|
| **Tumme** | Alla primära interaktioner nås med nedre tumme i portrait |
| **Touch** | Minsta barn-target motsvarar 44pt-känsla — inga små prickar |
| **Skärm** | Viktigaste objektet i ingångsframen — inte klippt på iPhone SE-storlek |
| **Hover** | Inget kräver hover, högerklick eller desktop-meny |
| **Hallen** | Kallstart → barnvy → trädgård på ≤3 medvetna tryck (efter unlock) |
| **Nätverk** | Snabb öppning: skeleton eller stillbild — inte evig spinner utan förklaring |
| **Rotation** | Portrait primary; landscape får inte krascha eller gömma grind |
| **Safe area** | Grind/låda inte under home indicator |

## Per sprint — mobil

### Sprint 0

| Måste fungera | Får inte |
|---------------|----------|
| Grind synlig utan scroll | Grind gömd i bottennav som kräver scroll |
| Vind/idle synlig direkt | Tom vit yta 2 s+ |
| Tryck på grind ger respons ≤ perceived instant | Fördröjd respons utan feedback |
| Fågelbad läsbart i periferi | Kräver pinch-zoom |
| Lämna trädgården utan modal | "Är du säker?"-stress |

### Sprint 1

| Måste fungera | Får inte |
|---------------|----------|
| Låda + rabatt i samma frame | Placering kräver drag över hela skärmen |
| Placering med ett tryck eller en enkel gest | Fler än 3 steg |
| Syskon: tydlig "min yta" | Identiska lådor ovanpå varandra |
| Jord läsbar på liten skärm | Text i jorden |

### Sprint 2

| Måste fungera | Får inte |
|---------------|----------|
| Frö synligt utan zoom | Frö endast synligt efter scroll |
| Tom jord fortfarande OK utan frö | Skamfärg / "tomt"-skylt |
| Frö-respons vid tryck kort | Lång animation som blockerar exit |
| Hall-session: se frö på 5 s besök | Kräver 30 s för att se status |

---

# 4. Minimal Pontus-kontroll — Trädgården Test Dashboard

**Product läser dashboard. Pontus behöver inte öppna databas.**

Dashboard är **en sida** med familj-anonymiserade rader (Familj A, B, …) och aggregat.

## Per familj — rad som systemet ska visa

| Fält | Betydelse | Green | Yellow | Red |
|------|-----------|-------|--------|-----|
| **Kom in** | Minst en session i testperioden | Ja | — | Nej efter 3 dagar |
| **Öppnade trädgården** | Min värld → trädgård | Ja / medvetet nej | Hittade inte | Krasch |
| **Interagerade** | ≥1 tap i trädgården | Ja | Nej men återkom | 0 trots 3+ besök |
| **Kom tillbaka** | ≥2 separata dagar med besök | Önskat | 1 dag OK sprint 0 | — |
| **Tid i världen** | Summad sessionstid | ≥20 s totalt | 10–20 s | <10 s upprepat |
| **Fastnade** | Spinner / ingen exit / PIN-loop | Nej | En gång | Upprepat |
| **Idag-guardrail** | Completion vs baseline | Stabil | −5 % | −10 % |
| **Frö (S2)** | Frö sett | Korrelerar aktivitet | Utan aktivitet OK | Frö utan aktivitet |
| **Skuld-signal** | Förälder flaggat / support | Nej | — | Ja |
| **Senaste** | Senaste besök | <48 h under test | — | — |

## Aggregat — överst på sidan

| Widget | Visar |
|--------|-------|
| **Familjer i test** | 1 / 5 / 20 |
| **Dagar kvar** | Nedräkning testperiod |
| **Gate status** | Green / Yellow / Red / Stop |
| **Fastna-rate** | % av besök |
| **Återbesök-rate** | % med 2+ dagar |
| **Skuld-flaggor** | Antal (ska vara 0) |
| **Rekommendation** | En mening: *"Gå till G1"* / *"Pausa — discovery"* |

## Vad Pontus gör

| Scenario | Pontus |
|----------|--------|
| All green | Ingenting |
| Yellow | Läser rekommendation; godkänner fix eller eskalerar till Game Director |
| Red / Stop | Samtal med Product + Game Director — inte SQL |

## Vad systemet ska kunna visa efter test (sammanfattning)

1. Familjen kom in  
2. Barnet öppnade världen (eller inte — medvetet val)  
3. Barnet interagerade  
4. Barnet kom tillbaka  
5. Något gick fel (fastna, krasch, skuld-flagga)  
6. familjen fastnade (spinner, loop, kan inte ut)  

**Utan:** råa events, SQL, child_id-listor i mail till Pontus.

---

# 5. Release gates — sammanfattning

## G0 → Sprint 1 (5 familjer)

| Status | Kriterier | Nästa steg |
|--------|-----------|------------|
| **Green** | Alla G0 green | Släpp Sprint 1 till 4 nya familjer + Pontus |
| **Yellow** | Discovery-problem, morgon OK | Fix + ny G0 (1–2 dagar) |
| **Red** | Stress/tråkigt, Idag sjunker | Sprint 0 revision |
| **Stop** | Skuld/kasino/app-avstånd | Game Director STOPP |

## G1 → Sprint 2 (20 familjer)

| Status | Kriterier | Nästa steg |
|--------|-----------|------------|
| **Green** | ≥4/5 green, 0 stop | Släpp Sprint 2 till 15 nya + 5 kvarvarande |
| **Yellow** | 1 familj fastna / neutral "bara låda" | UX-fix, G2 med övervakning |
| **Red** | ≥2 negativa / syskonfight | Paus Sprint 2 |
| **Stop** | Skuld / "ännu en syssla" | STOPP |

## G2 → Sprint 3 (grodd — utanför detta protokoll)

| Status | Kriterier | Nästa steg |
|--------|-----------|------------|
| **Green** | ≥70 % positiv/neutral frö; 0 farm | Game Director godkänner Sprint 3 build |
| **Yellow** | Kausalförvirring 10–30 % | Reality-spegling justeras |
| **Red** | Idag sjunker / utbredd förvirring | Paus |
| **Stop** | Farmville / skuld kring frö | STOPP hela Trädgården |

---

## Testtidslinje (rekommenderad)

```
Dag 0    Implementation klar sprint N → intern smoke (mobil)
Dag 1    Gate öppnas — familjer får inget specialmeddelande
Dag 1–3  G0 Pontus (Sprint 0)
Dag 4    Product läser dashboard → green/yellow/red
Dag 5–9  G1 fem familjer (Sprint 1)
Dag 10   Gate-beslut G1
Dag 11–17 G2 tjugo familjer (Sprint 2)
Dag 18   Gate-beslut G2 → Sprint 3 eller revision
```

**Ingen familj testar två sprintar samma dag** — minst en natt emellan deploy.

---

## Roller

| Roll | Ansvar |
|------|--------|
| **Game Director** | Green/yellow/red/stop · veto |
| **Parent Experience Lead** | Trygghetslarm · förälder-debrief · mobilkrav |
| **Product** | Dashboard · gate-beslut dokumenteras · en-mening debrief |
| **Pontus** | Godkänner yellow-fixar · stop-eskalering — inte daglig QA |
| **Familjer** | Leva normalt · mobil · inga prestationskrav |

---

## Bilaga — en-mening logg (förälder, valfritt)

Product skickar **efter** testperiod om yellow/red. Förälder svarar med en mening i fritext:

| Sprint | Prompt |
|--------|--------|
| 0 | *"Hur kändes det nya stället med gräset — i ett ord om du vill?"* |
| 1 | *"Kändes lådan som något barnet ägde?"* |
| 2 | *"Kändes fröet naturligt eller som en belöning?"* |

**Svar loggas i dashboard — inte i Pontus DM.**

---

## Bilaga — koppling till Sprint Plan

| Protokoll | Sprint Plan moment |
|-----------|-------------------|
| G0 | M1 Första foten i gräset |
| G1 | Planteringslåda + ägande |
| G2 | M2 Första fröet |

---

*TRADGARDEN_FAMILY_TEST_PROTOCOL v1.0 — tidig utrullning. Ingen implementation. Game Director + Parent Experience Lead.*
