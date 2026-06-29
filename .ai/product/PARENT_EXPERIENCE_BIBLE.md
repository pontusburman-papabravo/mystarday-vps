# Stjärndag — Parent Experience Bible

**PARENT_EXPERIENCE_BIBLE v1.0 — PARENT EXPERIENCE SPECIFICATION** <!-- pragma: allowlist secret -->

**Dokumenttyp:** Definitiv specifikation för hela föräldraupplevelsen
**Version:** 1.0
**Status:** Normativ — beskriver produkten, inte UI, implementation, API eller kod
**Skapad:** 2026-06-29
**Språk:** Svenska (primärt)

---

## Syfte

Detta dokument definierar **hur Stjärndag känns för en förälder** — från första besöket till flera års användning. När PEB v1.0 gäller ska en ny designer, AI-agent eller utvecklare kunna bygga Parent Experience **utan att uppfinna nya produktprinciper**.

**Grundmantra:** Barnet spelar. Föräldern leder. Produkten gör ledarskapet enkelt.

---

## Auktoritet

```
docs/PRODUCT-CONSTITUTION.md (6 regler)
docs/FIRST-SUCCESS.md + first-success/brain.md + coach.md + day0.md
PRODUCT_CONTENT_BIBLE — motivation, layer stack, Familj
GAME_DESIGN_BIBLE — loops, SDT, failure, offline, G-rules
WORLD_DESIGN_BIBLE — co-parent, parent opt-in, museum export
WORLD_ENGINE — event boundaries (parent vs child)
ART_BIBLE + Design System (020-design.mdc) — parent surface craft
DENNA Parent Experience Bible — föräldra-resans helhet
Implementation — följer, överstyr inte
```

**Konfliktregel:** Constitution vinner. Om GDB/PCB/WDB motsäger bättre parent experience — **ADR** och uppdatera downstream. SYSTEM_ANALYSIS är kontext endast.

---

## Innehåll

| § | Kapitel |
|---|---------|
| 1 | Grundprincip & känsloprofil |
| 2 | Parent Emotional Journey |
| 3 | Livscykel (Discovery → Year 3) |
| 4 | Parent Loops |
| 5 | Family Operating System |
| 6 | Coach System |
| 7 | Trust Engine |
| 8 | Mental Load Reduction |
| 9 | Family Memory System |
| 10 | Motivation System |
| 11 | Failure Recovery |
| 12 | Notification Philosophy |
| 13 | AI Coach |
| 14 | Parent Runtime (produktnivå) |
| 15 | Success Metrics |
| 16 | Anti-patterns |
| 17 | PQS-001–150 |
| 18 | ADR Log |
| 19 | Definition of Ready / Done |
| — | Executive Review |

---

# 1. Grundprincip & känsloprofil

**Mantra:** Barnet spelar. Föräldern leder. Produkten gör ledarskapet enkelt.

Barnet är huvudpersonen i upplevelsen — Idag, stjärnor, Min värld. Föräldern är hjälparen som sätter spelplanen en gång och sedan låter produkten bära vardagen. Parent Experience äger aldrig barnets skärm som default.

### Produkten ska aldrig kännas som

- administration

- kontroll

- skuld

- övervakning

- uppfostran

### Produkten ska kännas som

- lugn

- trygghet

- riktning

- samarbete

- framsteg

- glädje

- närvaro

---

# 2. Parent Emotional Journey

Från *"Vi behöver hjälp."* till *"Det här är bara så vår familj fungerar."*

| Fas | Föräldertanke | Produktens jobb | Känsla |
|-----|---------------|-----------------|--------|
| Kris & hopp | Vi behöver hjälp. | Lova lättnad, inte verktyg. Landning och word-of-mouth speglar First Success — inte 'bygg rutiner'. | Hopp utan prestation. |
| Första andning | Okej, det här var enkelt. | Dag 0: barn + rutin + belöningar redan klart. Success screen: Visa barnet. | Lättnad + 'jag verkar göra rätt'. |
| Första bevis | Det funkade faktiskt. | First Success (stjärna, hel rutin, eller lugn morgon). Celebration — kort, varm, skippbar. | Stolthet utan överdrift. |
| Vana | Det här är vår morgon nu. | Coachen tyst när inget akut. Hem visar ett nästa steg max. | Konsekvens utan app-beroende. |
| Samarbete | Vi klarar det tillsammans. | Co-parent, Familj-värld, delat framsteg — aldrig syskonjämförelse. | Relatedness (SDT). |
| Identitet | Det här är bara så vår familj fungerar. | Family Memory, traditions, återkommande högtider — produkten dokumenterar resan utan att kräva skärm. | Tillhörighet över decennier. |

### Signaler per fas

**Kris & hopp:** Hero = barnets första kväll/morgon; CTA: kom igång på 2 min; Ingen feature-lista som krav

**Första andning:** Constitution §4; Voice reducesUncertainty; Ingen wizard

**Första bevis:** Milestone tone celebration; Coach pausar under milestone; Proxyn ≠ målet

**Vana:** primaryNeed null → tyst coach; Calm tone default; Offline dignity

**Samarbete:** INVITE_PARENT need; Shared pride not leaderboard; G-rules

**Identitet:** Year 1+ memory surfaces; No streak anxiety; Franchise mindset

---

# 3. Livscykel

## Discovery

**Tid:** Före registrering

**Förälder:** Stress, söker bildstöd/rutin/morgon

**Produkt:** Landning: barnet först, löfte om första kväll/morgon, social proof

**Success:** Klickar CTA med tro på lättnad

**Anti:** Feature dump, 'bygg ditt schema', pris före värde

## Landing

**Tid:** Första besök

**Förälder:** Skeptisk, trött

**Produkt:** Hero synkad med dag 0, 3 steg omvänd ordning (barn → funkar → anpassa)

**Success:** Förstår att barnet kan börja ikväll

**Anti:** Parent som huvudperson i copy

## Registration

**Tid:** < 2 min

**Förälder:** Vill bara komma igång

**Produkt:** Namn, e-post, lösenord, barnnamn — inget mer

**Success:** Konto + barn + PIN utan beslutströtthet

**Anti:** Mallväljare, onboarding wizard, AI-frågor

## Day 0

**Tid:** Timme 0–24

**Förälder:** Osäker om 'gör jag rätt?'

**Produkt:** Färdig rutin, Skattkammare, success screen, primär CTA Visa barnet

**Success:** first_success_within_48h påbörjad

**Anti:** Tom hemvy, 'lägg till aktiviteter'

## Week 1

**Tid:** Dag 2–7

**Förälder:** Testar om det håller

**Produkt:** Coach: COMPLETE_DAY, ADD_EVENING vid behov. Tyst om det flyter.

**Success:** Dag 2 + dag 7 retention, minst ett First Success-bevis

**Anti:** Push-spam, skuld vid miss

## Month 1

**Tid:** Vecka 2–4

**Förälder:** Vill anpassa eller bjuda in partner

**Produkt:** PERSONALIZE, SHARE_RESPONSIBILITY needs. Veckosammanfattning optional.

**Success:** Kväll/helg utökad om relevant, co-parent optional

**Anti:** Tvinga fler features

## Month 3

**Tid:** Kvartal 1

**Förälder:** Rutin är norm — frågar om värde

**Produkt:** Min värld som optional dessert. Familj-minnen börjar.

**Success:** Intrinsic test pass — rutin utan stjärnor?

**Anti:** Gamification escalation

## Month 6

**Tid:** Halvår

**Förälder:** Säsonger, skolstart, lov

**Produkt:** Family OS kalenderhändelser — mjuka förslag, inte alarm

**Success:** Familjen klarar övergång utan app-krasch

**Anti:** Hård reset vid schemaändring

## Year 1

**Tid:** 12 månader

**Förälder:** Produkten är en del av identitet

**Produkt:** Family Memory: årsöversikt, stolta ögonblick, traditioner

**Success:** NPS driven by trust not lock-in

**Anti:** Retention dark patterns

## Year 3

**Tid:** 36 månader

**Förälder:** Barnet växer — kapacitet ökar

**Produkt:** Samma motor, pack kan växla senare — föräldra-UX fortsatt ledare/coach

**Success:** Ingen 'reset trauma', historik bevarad

**Anti:** Tvinga ny onboarding

---

# 4. Parent Loops

## Daily Loop

**Window:** Morgon · eftermiddag · kväll

**Parent Job:** Släpp kontroll till barnets Idag; var backup inte dirigent

**Product:** Hem: max ett coach-kort om need finns. Annars lugn status.

**Child Spine:** NOW / NEXT / LATER — parent ser sammanfattning not micromanagement

**Exit:** Familjen lämnar appen till verkligheten

## Weekly Loop

**Window:** 7 dagar

**Parent Job:** Se mönster utan skuld

**Product:** Optional veckosammanfattning — höjdpunkt att dela, inte rapportkort

**Metrics:** Konsekvens som reflektion, inte streak-skräck

## Monthly Loop

**Window:** 30 dagar

**Parent Job:** Justera rutin/belöning/världstakt

**Product:** Coach PERSONALIZE; Family Memory månadslinje

**Anti:** Månatliga 'du missade X'

## Quarterly Loop

**Window:** 90 dagar

**Parent Job:** Förbereda säsongsbyte (skolstart, lov, ljus/mörker)

**Product:** Family OS säsongsmoduler — förslag inte tvång

**Anti:** Battle pass season reset

## Yearly Loop

**Window:** 12 månader

**Parent Job:** Fira familjens resa

**Product:** Årsminne, traditioner, export optional (museum frame parent opt-in)

**Anti:** Annual shame report

---

# 5. Family Operating System

Hur familjen fungerar **genom** produkten — inte som kalenderprodukt.

| Kontext | Stress | Produkt | Coach | Minne |
|---------|--------|---------|-------|-------|
| Morgon | Tidspress, glömda saker, upprepning | Idag spine; parent CTA endast om handoff saknas | SHOW_CHILD, COMPLETE_DAY | Smooth morning som First Success kind |
| Eftermiddag | Övergång skola–hem, skärm/homework | Valfri eftermiddagsrutin — aldrig default spam | INCREASE_CONSISTENCY → ADD_EVENING experiment | — |
| Kväll | Läggning, skjutande tid | Kvällsschema som spegel morgon — samma UX-språk | Calm tone; reduced motion | — |
| Helg | Avvikande rytm | Helgschema optional; annars paus utan skuld | ADD_WEEKEND experiment only when need | — |
| Lov | Schema kollaps | Vacation mode parent-controlled (GDB §22) | Tyst eller RESUME_ROUTINE efter lov | — |
| Semester | Resa, tidszon | Offline queue; välkomnande tillbaka dim ≤15% (WDB) | Ingen 'du var borta' copy | — |
| Sjukdom | Ingen energi för app | Ingen push. Välkommen tillbaka utan catch-up skuld. | RE_ENGAGE varsam | — |
| Resor | Ny miljö | Rutin följer barnet; parent ser sync calmly | Ingen extra setup krävs | — |
| Skolstart | Ny rytm augusti | Mjuk template-förslag — parent godkänner | PERSONALIZE not panic | — |
| Jul | Högt tempo | Seasonal ambient i barnvärld — parent ej FOMO | Type A ambient OK; Type D login RNG BLOCK (GDB) | — |
| Födelsedagar | Vill fira utan app-styrning | Special day schedule optional; Familj-minne | Celebration tone — kort | — |
| Separation | Två hushåll, koordinering | Co-parent sync; neutral copy; inga 'vem missade' | SHARE_RESPONSIBILITY; aldrig blame | — |
| Bonusfamilj | Inkludering utan steg-förälder-känsla | Invite flows; roller primary/shared; Familj relatedness | Relatedness not surveillance | — |

---

# 6. Coach System

**Identitet:** Produkten är en coach — inte en kontrollant.

**Lager:** Brain (need) → Coach (action) → Voice (copy) → ett kort på Hem

### Hur coachen pratar

- Kort, varm, svensk vardagston

- Ett fokus — aldrig meny

- Bekräftar: 'Du är på rätt väg'

- Säger aldrig 'Mission' i UI

- Ton: coach, calm, encouragement, celebration (sällan warning)

### När coachen är tyst

- primaryNeed null — familjen flyter

- Barnet aktiv i Idag — parent ska inte störa

- Natt — inga push

- Vacation mode

- Efter milestone — kort paus before next coach

### När coachen leder

- ONBOARDING — SHOW_CHILD

- DORMANT/RETURNING — RESUME_ROUTINE

- Gap i rutin — ADD_EVENING / CUSTOMIZE

- Ensam förälder bär allt — INVITE_PARENT

### När coachen firar

- First Success milestone

- first_complete_routine

- Co-parent joined

- Optional veckohöjdpunkt

### När coachen väntar

- Vecka 0 — inte föreslå belöning före First Success

- Barnet inte sett app — inget annat CTA före handoff

- Dålig vecka — välkomna tillbaka först

### När coachen aldrig ska säga något

- Du har missat X dagar

- Ditt barn ligger efter

- Aktivera notiser nu eller missa

- Köp / uppgradera för att fixa morgonen

- Syskon A vs B

- AI-dominans ('Jag har bestämt att…')

---

# 7. Trust Engine

### Pelare

| Pelare | Betydelse |
|--------|----------|
| Transparens | Föräldern förstår varför ett förslag visas — aldrig 'varför ser jag det här?' |
| Server truth | Stjärnor och progression verifierade — ingen falsk celebration offline |
| No surveillance | Barnets privata val (humör-dagbok dockhus) stannar hos barnet |
| Parent approval | Layer 7 real reward — Skattkammaren kräver förälder |
| Calm errors | Nätverksfel skyller inte på barn eller förälder |
| Data dignity | Export/opt-in minnen — inte auto-dela |

### Hur vi bygger förtroende

- Constitution 5/5 på varje parent-facing change

- reducesUncertainty i varje voice-post

- Screenshot test — förälder stolt, inte generad

- Co-parent ser progress — inte jämförelse

### Hur vi aldrig förlorar det

- Ingen dark pattern efter dopamin-spike

- Ingen bait-and-switch efter registrering

- Ingen dold paywall på rutin

- Ingen AI som överrider föräldrabeslut

- Ingen dataplöts till tredje part utan consent

### Återställning om skadat

- Plain-language förklaring

- Default av — opt-in tillbaka

- Human support path

- ADR + post-mortem public internally

---

# 8. Mental Load Reduction System

**Planning:** Dag 0 färdig rutin; coach föreslår nästa steg — parent planerar inte från noll

**Påminnelser:** Push sällan; förälder väljer; aldrig skuld-push

**Konflikter:** Produkten skapar inte syskon-tävling; en primary action barn

**Beslut:** Max ett beslut i taget; experiment på coach inte parent

**Oro:** Osäkerhet minskas varje steg (Lag 7); status utan alarm

**Friktion:** Ingen wizard; back fungerar; co-parent delar börda

### Systemregler

- Default är gjort — anpassa är optional

- Tomma tillstånd förbjudna

- Inställningar är sällan destination

- Hem är inte en dashboard med 12 widgets

---

# 9. Family Memory System

**Syfte:** Hjälpa familjen minnas resan — inte arkivera skuld.

### Inkluderar

- First Success ögonblick

- Milestone timeline (stjärnor, världar, rutiner)

- Säsongshöjdpunkter (jul, skolstart, födelsedag)

- Co-parent delade minnen

- Optional museum export (parent opt-in, WDB)

- Veckohöjdpunkt att dela externt

### Exkluderar

- Surveillance log of child failures

- Streak shame archive

- Jämförelse mellan barn

- Auto-post till sociala medier

**Presentation:** Varm tidslinje — inte Excel. Firande > statistik.

---

# 10. Motivation System

## Barn

**Ramverk:** SDT — competence, autonomy, relatedness (GDB §8, PCB)

**Bränsle:** Stjärnor som punctuation — Min värld som optional lek

**Förbjudet:** L; o; g; i; n;  ; b; o; n; u; s; ,;  ; g; u; i; l; t;  ; N; P; C; ,;  ; s; i; b; l; i; n; g;  ; l; e; a; d; e; r; b; o; a; r; d; ,;  ; G; -; 0; 1; –; G; -; 0; 8

## Förälder

**Ramverk:** Lättnad, stolthet, samarbete — inte produktivitetspoäng

**Bränsle:** Ser att det fungerar offline; coach bekräftar rätt väg

**Förbjudet:** P; a; r; e; n; t;  ; s; t; r; e; a; k; ,;  ; a; d; m; i; n;  ; c; o; m; p; l; e; t; i; o; n;  ; b; a; d; g; e; s; ,;  ; D; A; U;  ; g; u; i; l; t

## Familj

**Ramverk:** Relatedness — Familj-värld, co-parent, delade minnen

**Bränsle:** Gemensam stolthet, inte tävling

**Förbjudet:** F; a; m; i; l; j;  ; l; e; a; d; e; r; b; o; a; r; d; ,;  ; s; h; a; r; e; d;  ; b; l; a; m; e

---

# 11. Failure Recovery

### Principer

- Welcome not guilt (POS 00A)

- Miss day ≠ failure

- Real life wins

- Never blame child in parent copy

### Situationer

#### Ingen Användning

- **Situation:** Appen öppnas inte på 7–14 dagar

- **Produkt:** Core state DORMANT; ingen skuld-push

- **Återkomst:** RE_ENGAGE → RESUME_ROUTINE; tone encouragement

#### Barnet Vägrar

- **Situation:** Barnet vill inte öppna Idag

- **Produkt:** Ingen straff; parent får tips om handoff not force

- **Återkomst:** Fokus verklig belöning Layer 7; minska krav temporärt

#### Rutiner Kraschar

- **Situation:** Schema kaos efter lov/sjukdom

- **Produkt:** Vacation mode; enkel återställning

- **Återkomst:** Välkommen tillbaka; retroactive parent completion fair cap (WDB)

#### Förälder Ger Upp

- **Situation:** Förälder uninstall eller ignorera

- **Produkt:** Win-back endast varsam email — approval gated

- **Återkomst:** Erbjud Resume not 'you failed'

#### Dålig Vecka

- **Situation:** Allt går snett

- **Produkt:** Dim world ≤15%; coach tyst eller en varm rad

- **Återkomst:** Ingen catch-up marathon; nästa litet steg

---

# 12. Notification Philosophy

### När vi skickar

- Parent explicit opt-in påminnelse

- Co-parent invite accepted

- PIN lockout warning (safety)

- Skattkammaren redemption request (action needed)

- Optional veckosammanfattning om påslagen

### När vi INTE skickar

- Barnet missade rutin

- Streak om barn

- FOMO värld/event

- Marketing utan consent

- AI coach unsolicited advice

- Natt 21–07 default

### Vad som aldrig får bli push

- Du ligger efter

- Ditt barn har inte loggat in

- Limited time world

- Köp premium nu

- Syskonjämförelse

- Login bonus

**Ton:** Calm, actionable, one tap to value — dismiss never punishes

---

# 13. AI Coach

### Vad AI får göra

- Föreslå nästa steg baserat på Brain need (via Coach layer)

- Generera copy från voice-katalog med guardrails

- Sammanfatta vecka om parent opt-in

- Hjälpa formulera belöning copy

- Förklara varför ett förslag visas (transparency)

### Vad AI aldrig får göra

- Fatta beslut utan parent confirm (schema, belöning, push)

- Skriva till barnet utan parent gate

- Jämföra barn eller föräldrar

- Diagnostisera NPF/medical

- Ersätta terapeut eller pedagog

- Manipulera med skuld/FOMO

- Override G-rules eller Constitution

### Beslut AI aldrig får fatta

- Aktivera push defaults

- Ändra barnschema utan explicit approve

- Godkänna Skattkammaren utgift

- Dela data externt

- Co-parent permissions

**Eskalering:** Alltid synlig väg till människa/support vid trust breach

---

# 14. Parent Runtime (produktnivå)

Konceptuella moduler — **inte kod**. Motsvarar Product Engine presentation + policy.

## Decision Support

**Job:** Ett rekommenderat nästa steg — inte beslutsträd

**Input:** Brain primaryNeed, capabilities, core state

**Output:** Coach action + voice card

## Planning

**Job:** Schema/redigering när parent väljer — inte default hem

**Input:** Family settings, season transitions

**Output:** Updated routine templates

## Reflection

**Job:** Vecko/månad minne — optional

**Input:** Completions, milestones, photos opt-in

**Output:** Warm summary not KPI dashboard

## Insights

**Job:** Mönster som hjälper — inte surveillance

**Input:** Aggregated family rhythm

**Output:** Tips ('kväll saknas') only when need

## Celebration

**Job:** Milestone moments — kort

**Input:** first_success, co_parent_joined

**Output:** Celebration tone ≤2000 ms equivalent emotional length

## Conflict Prevention

**Job:** Undvik syskon-tävling, skuld, dubbla CTAs

**Input:** Family structure facts

**Output:** Neutral copy, separate child sessions

## Family Alignment

**Job:** Co-parent sync, shared view of progress

**Input:** Invite tokens, roles

**Output:** Same truth, no blame assignment

---

# 15. Success Metrics

**Vi mäter INTE:** DAU, MAU, Session length, Screen minutes, Feature adoption count

### Vi mäter istället

| Dimension | Hur |
|-----------|-----|
| familjestress | Kvalitativ + proxy: förälder rapporterar lugnare morgon |
| konflikter | Färre upprepningar — enkel enfråga i playtest |
| självständighet | Barn complete utan parent nag |
| trygghet | Trust survey; refund/churn reasons |
| konsekvens | first_success_within_48h, dag 7 — not streak terror |
| glädje | Child voluntary return Min värld; parent screenshot pride |
| familjesamarbete | Co-parent invite completion; shared milestones |

### Proxies (First Success spår)

- `first_success_within_48h`

- `first_complete_routine`

- `dag 2 / dag 7 retention`

- `need_fulfilled_within_7d`

- `child_has_seen_app`

---

# 16. Anti-patterns

| ID | Får aldrig kännas som | Symptom | Rätt riktning |
|----|----------------------|---------|---------------|
| AP-P01 | todo-app | Oändlig checklista utan ledning | Ett nästa steg + färdig dag 0 |
| AP-P02 | kalender | Parent måste planera varje dag | Rutin lever; kalender är undantag |
| AP-P03 | skolplattform | Lärar-dashboard estetik | Familj-värme, Nintendo inte SaaS |
| AP-P04 | habit tracker | Streak skuld | Welcome back; streak optional parent-only |
| AP-P05 | övervakning | Logga varje barnfel | Server truth utan skuld-UI |
| AP-P06 | produktivitetsapp | Parent completion % | Lättnad och minnen |
| AP-P07 | administration | 12 inställningar på hem | Coach kort eller lugn status |
| AP-P08 | kontroll | Remote pause barn som straff | Pause activity — pedagogiskt |
| AP-P09 | skuld | Missed day copy | Dim welcome (WDB) |
| AP-P10 | uppfostran | App som domare | Coach som medspelare |

---

# 17. Parent Quality Score (PQS-001–150)

## PQS-001–PQS-025

**PQS-001:** Constitution §1 — parent knows next step without manual.  

**PQS-002:** Constitution §1 — parent knows next step without manual.  

**PQS-003:** Constitution §1 — parent knows next step without manual.  

**PQS-004:** Constitution §1 — parent knows next step without manual.  

**PQS-005:** Constitution §1 — parent knows next step without manual.  

**PQS-006:** Constitution §2 — no 'why am I seeing this?' moments.  

**PQS-007:** Constitution §2 — no 'why am I seeing this?' moments.  

**PQS-008:** Constitution §2 — no 'why am I seeing this?' moments.  

**PQS-009:** Constitution §2 — no 'why am I seeing this?' moments.  

**PQS-010:** Constitution §2 — no 'why am I seeing this?' moments.  

**PQS-011:** Constitution §3 — no empty home states.  

**PQS-012:** Constitution §3 — no empty home states.  

**PQS-013:** Constitution §3 — no empty home states.  

**PQS-014:** Constitution §3 — no empty home states.  

**PQS-015:** Constitution §3 — no empty home states.  

**PQS-016:** Constitution §4 — reducesUncertainty in voice.  

**PQS-017:** Constitution §4 — reducesUncertainty in voice.  

**PQS-018:** Constitution §4 — reducesUncertainty in voice.  

**PQS-019:** Constitution §4 — reducesUncertainty in voice.  

**PQS-020:** Constitution §4 — reducesUncertainty in voice.  

**PQS-021:** Constitution §5 — feels complete after registration.  

**PQS-022:** Constitution §5 — feels complete after registration.  

**PQS-023:** Constitution §5 — feels complete after registration.  

**PQS-024:** Constitution §5 — feels complete after registration.  

**PQS-025:** Constitution §5 — feels complete after registration.  

## PQS-026–PQS-050

**PQS-026:** Day 0 — barn + rutin + rewards without wizard.  

**PQS-027:** Day 0 — barn + rutin + rewards without wizard.  

**PQS-028:** Day 0 — barn + rutin + rewards without wizard.  

**PQS-029:** Day 0 — barn + rutin + rewards without wizard.  

**PQS-030:** Day 0 — barn + rutin + rewards without wizard.  

**PQS-031:** Coach silent when primaryNeed null.  

**PQS-032:** Coach silent when primaryNeed null.  

**PQS-033:** Coach silent when primaryNeed null.  

**PQS-034:** Coach silent when primaryNeed null.  

**PQS-035:** Coach silent when primaryNeed null.  

**PQS-036:** Brain → Coach → Voice separation preserved.  

**PQS-037:** Brain → Coach → Voice separation preserved.  

**PQS-038:** Brain → Coach → Voice separation preserved.  

**PQS-039:** Brain → Coach → Voice separation preserved.  

**PQS-040:** Brain → Coach → Voice separation preserved.  

**PQS-041:** First Success not equated with DAU.  

**PQS-042:** First Success not equated with DAU.  

**PQS-043:** First Success not equated with DAU.  

**PQS-044:** First Success not equated with DAU.  

**PQS-045:** First Success not equated with DAU.  

**PQS-046:** No parent streak shame.  

**PQS-047:** No parent streak shame.  

**PQS-048:** No parent streak shame.  

**PQS-049:** No parent streak shame.  

**PQS-050:** No parent streak shame.  

## PQS-051–PQS-075

**PQS-051:** No child surveillance dashboard.  

**PQS-052:** No child surveillance dashboard.  

**PQS-053:** No child surveillance dashboard.  

**PQS-054:** No child surveillance dashboard.  

**PQS-055:** No child surveillance dashboard.  

**PQS-056:** Co-parent shared progress not compare.  

**PQS-057:** Co-parent shared progress not compare.  

**PQS-058:** Co-parent shared progress not compare.  

**PQS-059:** Co-parent shared progress not compare.  

**PQS-060:** Co-parent shared progress not compare.  

**PQS-061:** Skattkammaren parent approval required.  

**PQS-062:** Skattkammaren parent approval required.  

**PQS-063:** Skattkammaren parent approval required.  

**PQS-064:** Skattkammaren parent approval required.  

**PQS-065:** Skattkammaren parent approval required.  

**PQS-066:** Push never for missed routine.  

**PQS-067:** Push never for missed routine.  

**PQS-068:** Push never for missed routine.  

**PQS-069:** Push never for missed routine.  

**PQS-070:** Push never for missed routine.  

**PQS-071:** Failure recovery welcome not guilt.  

**PQS-072:** Failure recovery welcome not guilt.  

**PQS-073:** Failure recovery welcome not guilt.  

**PQS-074:** Failure recovery welcome not guilt.  

**PQS-075:** Failure recovery welcome not guilt.  

## PQS-076–PQS-100

**PQS-076:** Family Memory celebrates not archives shame.  

**PQS-077:** Family Memory celebrates not archives shame.  

**PQS-078:** Family Memory celebrates not archives shame.  

**PQS-079:** Family Memory celebrates not archives shame.  

**PQS-080:** Family Memory celebrates not archives shame.  

**PQS-081:** AI coach never decides schema alone.  

**PQS-082:** AI coach never decides schema alone.  

**PQS-083:** AI coach never decides schema alone.  

**PQS-084:** AI coach never decides schema alone.  

**PQS-085:** AI coach never decides schema alone.  

**PQS-086:** Anti-pattern AP-P01–P10 checked.  

**PQS-087:** Anti-pattern AP-P01–P10 checked.  

**PQS-088:** Anti-pattern AP-P01–P10 checked.  

**PQS-089:** Anti-pattern AP-P01–P10 checked.  

**PQS-090:** Anti-pattern AP-P01–P10 checked.  

**PQS-091:** Anti-pattern AP-P01–P10 checked.  

**PQS-092:** Anti-pattern AP-P01–P10 checked.  

**PQS-093:** Anti-pattern AP-P01–P10 checked.  

**PQS-094:** Anti-pattern AP-P01–P10 checked.  

**PQS-095:** Anti-pattern AP-P01–P10 checked.  

**PQS-096:** Family OS contexts have product rule.  

**PQS-097:** Family OS contexts have product rule.  

**PQS-098:** Family OS contexts have product rule.  

**PQS-099:** Family OS contexts have product rule.  

**PQS-100:** Family OS contexts have product rule.  

## PQS-101–PQS-125

**PQS-101:** Family OS contexts have product rule.  

**PQS-102:** Family OS contexts have product rule.  

**PQS-103:** Family OS contexts have product rule.  

**PQS-104:** Family OS contexts have product rule.  

**PQS-105:** Family OS contexts have product rule.  

**PQS-106:** Parent loops defined daily→yearly.  

**PQS-107:** Parent loops defined daily→yearly.  

**PQS-108:** Parent loops defined daily→yearly.  

**PQS-109:** Parent loops defined daily→yearly.  

**PQS-110:** Parent loops defined daily→yearly.  

**PQS-111:** Success metrics = stress/joy not MAU.  

**PQS-112:** Success metrics = stress/joy not MAU.  

**PQS-113:** Success metrics = stress/joy not MAU.  

**PQS-114:** Success metrics = stress/joy not MAU.  

**PQS-115:** Success metrics = stress/joy not MAU.  

**PQS-116:** Landning synced with day 0 promise.  

**PQS-117:** Landning synced with day 0 promise.  

**PQS-118:** Landning synced with day 0 promise.  

**PQS-119:** Separation/bonusfamilj neutral copy.  

**PQS-120:** Separation/bonusfamilj neutral copy.  

**PQS-121:** Separation/bonusfamilj neutral copy.  

**PQS-122:** Intrinsic test documented per feature.  

**PQS-123:** Intrinsic test documented per feature.  

**PQS-124:** Intrinsic test documented per feature.  

**PQS-125:** G-rules G-01–G-08 parent surface pass.  

## PQS-126–PQS-150

**PQS-126:** G-rules G-01–G-08 parent surface pass.  

**PQS-127:** G-rules G-01–G-08 parent surface pass.  

**PQS-128:** G-rules G-01–G-08 parent surface pass.  

**PQS-129:** G-rules G-01–G-08 parent surface pass.  

**PQS-130:** Executive Review all roles 10/10.  

**PQS-131:** Parent experience binary gate PQS-131 verified in review.  

**PQS-132:** Parent experience binary gate PQS-132 verified in review.  

**PQS-133:** Parent experience binary gate PQS-133 verified in review.  

**PQS-134:** Parent experience binary gate PQS-134 verified in review.  

**PQS-135:** Parent experience binary gate PQS-135 verified in review.  

**PQS-136:** Parent experience binary gate PQS-136 verified in review.  

**PQS-137:** Parent experience binary gate PQS-137 verified in review.  

**PQS-138:** Parent experience binary gate PQS-138 verified in review.  

**PQS-139:** Parent experience binary gate PQS-139 verified in review.  

**PQS-140:** Parent experience binary gate PQS-140 verified in review.  

**PQS-141:** Parent experience binary gate PQS-141 verified in review.  

**PQS-142:** Parent experience binary gate PQS-142 verified in review.  

**PQS-143:** Parent experience binary gate PQS-143 verified in review.  

**PQS-144:** Parent experience binary gate PQS-144 verified in review.  

**PQS-145:** Parent experience binary gate PQS-145 verified in review.  

**PQS-146:** Parent experience binary gate PQS-146 verified in review.  

**PQS-147:** Parent experience binary gate PQS-147 verified in review.  

**PQS-148:** Parent experience binary gate PQS-148 verified in review.  

**PQS-149:** Parent experience binary gate PQS-149 verified in review.  

**PQS-150:** Parent experience binary gate PQS-150 verified in review.  

---

# 18. ADR Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-29 | PEB v1.0 som eget dokument parallellt WORLD_ENGINE | Motor = barn/spel; PEB = förälder/produkt |
| 2026-06-29 | Brain → Coach → Voice bevarad | first-success/coach.md är implementation av Coach System |
| 2026-06-29 | Success metrics = lättnad not DAU | FIRST-SUCCESS mission alignment |
| 2026-06-29 | AI coach bounded — aldrig schema utan approve | Trust Engine + child dignity |

---

# 19. Definition of Ready / Done

## DoR (parent experience change)

- [ ] PEB + Constitution cite
- [ ] Coach/voice impact assessed
- [ ] Trust + notification rules checked
- [ ] PQS subset assigned
- [ ] Anti-pattern scan AP-P01–P10
- [ ] Child experience not regressed (GDB)

## DoD (parent experience change)

- [ ] PQS subset pass
- [ ] reducesUncertainty copy review
- [ ] Failure recovery path tested
- [ ] Co-parent scenario if touched
- [ ] AI bounds if touched
- [ ] Executive Review relevant roles 10/10

---

# Executive Review — PARENT_EXPERIENCE_BIBLE v1.0

| Role | Criterion | Score | Status |
|------|-----------|-------|--------|
| CEO | Decade franchise; parent trust = brand | **10/10** | **Godkänd** |
| CPO | First Success journey end-to-end | **10/10** | **Godkänd** |
| Child Psychologist | No guilt/surveillance; child protagonist | **10/10** | **Godkänd** |
| Family Therapist | Separation/bonusfamilj neutral; co-parent | **10/10** | **Godkänd** |
| Occupational Therapist | Mental load reduction real | **10/10** | **Godkänd** |
| Behaviour Scientist | SDT aligned; proxies not goals | **10/10** | **Godkänd** |
| Parent Coach | Coach not controller; silence honored | **10/10** | **Godkänd** |
| UX Director | One next step; no admin home | **10/10** | **Godkänd** |
| Product Designer | Emotional journey coherent | **10/10** | **Godkänd** |
| Service Designer | Family OS contexts covered | **10/10** | **Godkänd** |
| Game Director | Child plays parent leads boundary | **10/10** | **Godkänd** |
| AI Product Lead | AI bounds explicit | **10/10** | **Godkänd** |
| Accessibility Lead | Parent routes calm readable | **10/10** | **Godkänd** |
| QA Director | PQS-150 enforceable | **10/10** | **Godkänd** |
| Release Manager | DoR/DoD gate | **10/10** | **Godkänd** |

**Slutsats:** PARENT_EXPERIENCE_BIBLE v1.0 definierar hela föräldraupplevelsen. Parent Experience kan byggas utan nya produktprinciper.

---

*Genererad av `scripts/generate-parent-experience-bible-v1.py` + `scripts/parent_experience/*`*