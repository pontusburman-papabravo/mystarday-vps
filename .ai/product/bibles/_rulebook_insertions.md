# Rulebook 03 — Scene Design Standard (SDS) (Part II)

> **Läs varje gång:** *"Skapa ett nytt rum."*  
> **Underordnad:** Rulebook 01 Constitution · Rulebook 02 Topology  
> **Översätts till data:** Rulebook 04 RBS

---

## Purpose

Ett rum är en **riktig plats** — inte en nivå, skärm eller funktionssida.

Platsen fanns innan barnet kom och fortsätter efter att de lämnat. **Rum först, funktion sedan.** Om rummet inte känns boeligt utan sin feature — underkänt.

---

## The Scene Principle

Fem frågor **innan** en pixel ritas:

1. **Varför finns det här?** — känslomässigt jobb, inte feature-lista.
2. **Vem tillbringar tid här?** — barnet, husdjuret, en gäst-NPC?
3. **Vilken känsla ska rummet bära?** — exakt en primär (se Emotional Identity).
4. **Vilka berättelser kan uppstå?** — öppna frågor utan facit.
5. **Hur växer rummet över tid?** — byggdelar, minnen, säsong — inte reset.

Om något svar saknas → **STOP** (Rulebook 08 Stage 1 Vision).

---

## The Five Layers

| Lager | Roll | Exempel |
|-------|------|---------|
| **1. Purpose** | Varför platsen finns | Hem = trygghet · Trädgård = nyfikenhet · Verkstad = kreativitet · Museum = stolthet |
| **2. Structure** | Entré, landmärke, gåyta, interaktionszon, ambientzon, framtida byggplatser — **inga undantag** | Se Rulebook 02 buildable areas |
| **3. Life** | Vinden, gardiner, damm, fåglar, skuggor, ljus, husdjur, NPC-idle — **levande före interaktion** | Rulebook 06 simulation |
| **4. Interaction** | Trovärdigt först, användbart sedan | Bokhylla: barnet *undrar* innan den *öppnar* |
| **5. Growth** | *"Undrar vad det här rummet blir?"* | Tom hylla, halvfärdigt staket, bar gren |

---

## Emotional Identity

**En primär känsla per rum** — korsref Rulebook 02 Emotional Geography.

| Rum | Primär känsla | Barnankare |
|-----|---------------|------------|
| Hem | Comfort | *"Här är jag säker"* |
| Verkstad | Creativity | *"Här kan jag göra"* |
| Trädgård | Wonder | *"Vad gömmer sig?"* |
| Museum | Pride | *"Titta vad jag gjort"* |
| Husdjursrum | Companionship | *"Min kompis bor här"* |
| Sjö | Peace | *"Här andas jag ut"* |

---

## Hero Object · Supporting · Ambient · Interactive

- **Hero object** — exakt ett per rum (spis, forntida ek, arbetsbänk, monter, hundkorg). Story anchor med högsta visuella vikt.
- **Supporting objects** — förstärker hero (verktyg vid bänk, krok vid dörr).
- **Ambient objects** — liv utan gameplay; sällan interaktiva (damm i ljusstråle, gardin).
- **Interactive objects** — uppenbara utan blinkande pilar eller UI-knappar.

---

## Build Slots

Byggplatser ska kännas **naturliga** — inte tomma rutor:

- Saknad blomrabatt · halvfärdigt staket · tom hylla · ledig krok · bar gren.

Korsref Rulebook 05 progression · Rulebook 04 `build_slots[]`.

---

## Story Anchors

| Tid | Exempel |
|-----|---------|
| **Past** | Första fotot på väggen · utsliten matta |
| **Present** | Spisen glöder idag · hunden sover här |
| **Future** | Tom ram väntar · antydd balkongdörr |

---

## Walking Space · Sightlines · Light · Sound · Movement

- **Walking space** — 30–40 % öppen yta; avsiktligt tomrum (Imagination-pelaren).
- **Sightlines** — nära, medium, fjärr; antyd värld bortom rutan (Window Test).
- **Light composition** — **en** dominerande ljuskälla per rum.
- **Sound identity** — rumsspecifik ljudbild (verkstad: verktyg · museum: tyst eko · trädgård: fåglar).
- **Movement identity** — signaturrörelse som "hjärtslag" (gardiner, rök, vatten).

---

## Discovery Density · Return Value · Build Progression

| Typ | Antal |
|-----|-------|
| Obvious | 1 |
| Optional | 2 |
| Ambient | 3 |
| Rare | 1 |

**Return value** — naturliga förändringar vid återbesök, inte respawn-belöningar.

**Build progression** — synlig evolution: tom vägg → tavla → hylla → växter → trofé → minne.

---

## Child Perspective · Screenshot Rule

- **Child perspective** — barnets ögonhöjd känslomässigt; världen lite större än barnet.
- **Screenshot Rule** — varje hörn avsiktligt; inget "billigt" tomma mittpartiet.

---

## Scene Checklist

Innan godkännande — svara ja på alla sju:

1. Stärker rummet minst en Constitution-pelare?
2. Finns hero, stöd, ambient och avsiktligt tomrum?
3. Klarar Window Test och Neighborhood Test (Rulebook 02)?
4. Primär känsla unik och tydlig?
5. Byggplatser känns naturliga, inte UI-rutor?
6. Story anchors past/present/future definierade?
7. Inget brott mot Golden Rules eller Home Principle?

---

## Definition of Done (Rulebook 03)

- [ ] Fem Scene Principle-frågor besvarade skriftligt
- [ ] Five Layers dokumenterade
- [ ] Hero object utpekat
- [ ] Discovery density fördelad
- [ ] Scene Checklist = 7/7 ja
- [ ] Redo för Rulebook 04 RBS YAML

---

## Final Principle

> **Barnet ska kunna stanna i rummet utan att göra något — och ändå känna att de är någonstans.**  
> Om platsen bara känns när man trycker — är det en skärm, inte ett rum.

---

# Rulebook 05 — World Progression & Evolution (Part IV)

> **Underordnad:** Constitution Golden Rules · POS R-02 (stjärnor ej köpbara) · Rulebook 02 Expansion Philosophy

---

## Purpose

Världen växer **med barnet** — barnet bygger ett liv, inte en unlock-lista.

*"Titta hur mycket min värld har förändrats"* — inte *"Jag är nivå 7"*.

---

## Core Philosophy

- **Lager — inte nivåer.** Tillväxt läggs ovanpå, rivs sällan.
- **Verkliga livet lämnar permanent spår.** Digital stolthet utan verklig handling = identitetsbrott (G-01).
- **Visuellt minne av resan** — världen **är** save-filen.

---

## Four Progression Loops

```
Loop 1 — Stjärnor     → valuta för belöningar UTANFÖR världen (Skattkammaren). ALDRIG förbrukade av byggande.
Loop 2 — Byggdelar    → intjänas genom att leva (Idag), inte köpas med stjärnor. Barnet behåller BÅDA.
Loop 3 — Samlingar    → går aldrig ut; berättelser, inte statistik.
Loop 4 — Levande värld → rum utvecklas (tom hall → spis → hundkorg → minnen på väggen).
```

---

## Visible Progress · Progression Philosophy

**"Vad har förändrats?"** — inte *"Vilket nummer ökade?"*

| Permanent | Tillfälligt |
|-----------|-------------|
| Byggnader, möbler, museum, husdjursfamilj, minneshylla, trädgård, träd | Snö, blommor, pölar, fotspår, ånga |

**Memory growth** — första husdjursfoto, födelsedagsbild, föräldraband; belöningen tar slut, minnet stannar (Reward Principle).

---

## Evolution by Zone

| Zon | Evolution (exempel) |
|-----|---------------------|
| **Hus** | Hall: tom → matta → kapstok → ram → trofé |
| **Trädgård** | Organisk vecka-för-vecka — frö, grodd, blomma |
| **Museum** | Verkliga prestationer — inte slump-achievements |
| **Husdjur** | Relationer — inte levels |
| **Upptäckt** | Barnet märker mer — inte låsta områden |
| **Förälder** | Semesterfoto, konsertbiljett som minnen i fiction |
| **Tema** | Stol → tron → rymdstol — samma plats, ny hud |
| **Säsong** | Samma värld, igenkännbar genom årstider |

---

## Milestone Philosophy · Long-Term Vision

Milstolpar är **tysta** — inte fyrverkerier som blockerar morgonrushen (≤2s firande).

Ingen värld går att återskapa exakt — minnen gör varje barns hem unikt.

---

## Progression Anti-Patterns

**Aldrig:** streak-straff · FOMO · energi-mätare · loot boxes · grind · stjärnor som byggvaluta · achievement-vägg som primär navigation.

---

## Definition of Done (Rulebook 05)

- [ ] Alla fyra loopar respekterade i design
- [ ] POS R-02 verifierad — inga köpbara stjärnor
- [ ] `build_slots[]` kopplade till WDB nodes — inga magiska tal
- [ ] Permanent vs tillfällig tillväxt dokumenterad per rum
- [ ] Inga progression anti-patterns

---

## Final Principle

> **Framgång mäts i tillhörighet — inte i completion percentage.**  
> Barnet ska minnas platsen som ett liv — inte som en lista de kryssade av.

---

# Rulebook 06 — Living World Simulation (Part V)

> **Korsref:** [LWES Part IV Living Intelligence](../LIVING_WORLD_ENGINE_SPEC.md) · Director · calmness meter · Rulebook 05 loops

---

## Purpose

Världen är **aldrig statisk**.

*"Vad hände idag?"* — inte *"Vad låste jag upp?"* Platsen fortsatte leva medan barnet var borta.

---

## Core Philosophy · The Living World Rule

Världen väntar inte på interaktion — moln, fåglar, blommor, husdjur, ljus rör sig.

**Varje besök:** bekant **och** annorlunda **och** möjlig — alla tre samtidigt.

---

## Daily · Weekly · Seasonal Difference

| Horisont | Exempel |
|----------|---------|
| **Daglig** | En blomma · hund sover på ny plats · bo i buskage · fjäril |
| **Veckovis** | Växt växer · ny bräda på bro · träd får blad · museum får objekt |
| **Säsong** | Verklig förändring — inte bara overlay (träd, ljus, ljud, djur) |

---

## Weather · Time · Routines

- **Väder** — regn, vind, snö påverkar atmosfär och djur — **aldrig** svårighetsgrad.
- **Tid på dygnet** — morgon/eftermiddag/kväll/natt; inget otillgängligt, bara annorlunda.
- **Husdjursrutin** — oberoende val: *"Luna gör något annorlunda idag"*.
- **NPC-rutin** — promenad, läsning, trädgårdsarbete — bebott känsla.

---

## Story Seeds · Parent · Achievement Simulation

**Story seeds** — paket, fjäder, drake, fotspår, vattenkanna — **aldrig förklarade**.

**Föräldersimulation** — presenter, brev, ballonger naturligt inbäddade (Parent Principle).

**Achievement simulation** — tyst erkännande (granne planterar blommor, nya böcker, städat hus) — inte popup-quest.

---

## Garden Ecology · World Memory · Calmness

Korsref Rulebook 07 för full ekologi. Här: **ekosystemkedjor** (fåglar→fjädrar→museum, blommor→bin).

**World memory** — senaste besök, husdjursplatser, dekorationer; mjuk anpassning.

**Calmness protection** — stressig gård → lugnare idag; barnet blir aldrig utmattat (LWES Director).

**Surprise frequency** — regnbåge, meteor, vit uggla förblir **sällsynta**.

---

## Simulation Boundaries · Invisible Simulation

**Aldrig:** rädsla · förlust · straff · deadlines · brådska.

**Osynlig simulation** — inget *"Laddar dagens händelser"*; barnet kliver in i dagens värld.

---

## Living World Metrics (per session)

Recognition · Curiosity · Comfort · Surprise · Belonging — kvalitativ QA, inte analytics-grind.

---

## Definition of Done (Rulebook 06)

- [ ] `simulation:` sektion i room YAML ifylld
- [ ] Daglig/veckovis kandidat listade
- [ ] Calmness weight satt
- [ ] Inga simulation boundary-brott
- [ ] LWES Director-kompatibel — ingen custom motor per rum

---

## Final Principle

> **Världen ska redan ha väntat på barnet när de öppnar dörren.**  
> Inte som en belöningsskärm — som en plats som andats vidare.

---

# Rulebook 07 — World Ecology & Environmental Storytelling (Part VI)

> **Korsref:** Rulebook 06 Garden Ecology · Rulebook 03 Story Anchors · Rulebook 02 Landmarks

---

## Purpose

Allt ska kännas **upptäckt** — inte konstruerat.

*"Självklart att det finns här"* — inte *"Varför la designern dit det?"*

---

## Philosophy

Inget existerar isolerat: blomma → trädgård → hem → grannskap → värld.

---

## Environmental Storytelling

Spår av liv **utan dialog eller tutorial:**

- Utsliten matta · sprucken kruka · fotspår · fågelholk · vattenkanna · gungställning.

---

## Cause and Effect · Ecosystems

| Orsak | Verkan |
|-------|--------|
| Fågelholk | Fåglar |
| Blommor | Fjärilar |
| Träd | Skugga |
| Hundkorg | Husdjur sover |
| Spis | Varmt ljus |

**Kedjor:** Blommor → bin → fåglar → fjädrar → museum. System matar system.

---

## Natural Placement · Visual History · Living Nature

- **Natural placement** — bänk under äldsta trädet med sjöutsikt — inte slumpmässig bänk.
- **Visual history** — färsk färg, gammalt trä, utsliten stig, mossa, solblekt staket.
- **Living nature** — växer, rör sig, blommar — aldrig dekorativt statisk.

---

## Human · Child · Animal Presence

| Spårtyp | Exempel |
|---------|---------|
| **Mänsklig närvaro** | Stövlar · tekopp · öppen bok · halsduk · spade |
| **Barnets närvaro** | Leksak på golvet · trofé · teckning · samlingshylla |
| **Djurekologi** | Fåglar/träd · katter/värme · hundar/lukt · fjärilar/blommor · fisk/skuggor |

---

## Seasonal · Sound · Light · Weather · Time Ecology

Samma globala säsong (Rulebook 02). Varje ljud har trovärdig källa. Ljus följer dygn. Väder lämnar spår (pölar, löv, dimma). Tid = atmosfär — inte tillgänglighetsgrind.

---

## Growth · Memory · Discovery · Maintenance · Emotional · Future Ecology

- **Growth** — gradvis — inte hopp mellan stadier.
- **Memory** — ballonger, souvenirer, husdjursfoto, gåvor som dekoration.
- **Discovery** — ihåligt träd, lös golvbräda, dold stig — naturligt, inte artificiellt.
- **Maintenance** — sned ram, ojämna stenar — **bebott**, inte försummat.
- **Emotional** — bevis på omsorg: blommor, filtar, varmt ljus, ordnade hyllor.
- **Future** — rök, fågel bortom skärmen, stig in i skogen, båt som lämnar hamn.

---

## World Ecology Checklist

Varje rum måste svara på sex frågor:

1. Vad berättar miljön utan ord?
2. Vilka orsak-verkan-kedjor finns?
3. Var ser man mänsklig och barnslig närvaro?
4. Var kommer ljud och ljus ifrån?
5. Vad antyder framtiden bortom kameran?
6. Känns allt *naturligt placerat*?

---

## Definition of Done (Rulebook 07)

- [ ] `ecology:` sektion i room YAML ifylld
- [ ] World Ecology Checklist = 6/6
- [ ] Inga isolerade dekorobjekt utan fiction
- [ ] Korsref Rulebook 06 utan duplicerad garden-logik

---

## Final Principle

> **Bevis på liv — inte dekoration.**  
> Om barnet kan förklara *varför* saken finns utan att hitta på — har ekologin lyckats.

---

# Rulebook 08 — Production Pipeline (Part VII)

> **Sista regelkapitlet.** Efter detta: **inga fler filosofiska kapitel** — bara Production Specifications (HALF 2). **Inget Part VIII utan ADR.**

---

## Purpose

**Samma skapandeprocess** för varje rum, objekt, entitet och feature.

Kvalitet genom **konsekvens** — inte genom att varje teammedlem improviserar.

---

## Golden Rule

> **Designat först · implementerat sedan · polerat tredje · godkänt sist.**

Aldrig tvärtom.

---

## Production Stages

```
Vision → Specification → Review → Prototype → Implementation → Art → Animation → Audio → Polish → QA → Ship
```

| Stage | Namn | Kärna |
|-------|------|-------|
| 1 | **Vision** | Varför · känsla · pelare — stopp om inget svar |
| 2 | **Specification** | Rum, entitet, NPC, husdjur, byggdel, achievement, minne, dekoration — **inget före spec** |
| 3 | **Review** | Constitution · LWES · Art Bible · dubblett? · komplexitet? · generaliserbart? |
| 4 | **Prototype** | Interaktion · flöde · navigation · känsla — **inte grafik** |
| 5 | **Engineering** | LWES only — ingen custom-arkitektur · inget rumspecifikt engine |
| 6 | **Art** | Efter gameplay godkänt — konst löser visuellt, inte gameplay |
| 7 | **Animation** | Levande · tyngd · andas · reagerar — inte "för att det går" |
| 8 | **Audio** | Känsla — inte volym · källa? · ska det finnas? · är tystnad starkare? |
| 9 | **Polish** | Tar bort friktion — **inte** features |
| 10 | **QA** | Funktion · a11y · prestanda · konsekvens · känslokvalitet · WQS |

---

## Stage 1 — Vision

**Varför finns det?** Vilken **känsla**? Vilken **pelare** (Capability · Ownership · Comfort · Curiosity · Imagination)?

Om inget tydligt svar → **STOP**. Eskalera — uppfinn inte.

---

## Stage 2 — Specification

Rum · entitet · NPC · husdjur · byggdel · achievement · minne · dekoration.

**Inget före spec.** Rulebook 04 RBS YAML · Entity Bible-rad · WDB-nyckel.

---

## Stage 3 — Review

- Constitution (Rulebook 01) — fem pelare + Golden Rules
- LWES — inga nya interaction types utan ADR
- Art Bible — diorama, pixel, motion caps
- **Dubblett?** — finns det redan?
- **Komplexitet?** — enklare alternativ?
- **Generaliserbart?** — data, inte `if (sceneId)`

---

## Stage 4 — Prototype

Interaktion · flöde · navigation · emotion — gråbox eller wireframe.

**Inte grafik.** Barnet ska känna platsen innan pixlar shippar.

---

## Stage 5 — Engineering

**LWES only.** Pack JSON · `scenes.json` · Director · inga rumsspecifika motor-grenar.

---

## Stage 6 — Art

Efter **gameplay godkänt**. Art löser **visuellt** — ändrar inte regler.

Prompt Manifest → Art Prompt Catalog → assets.

---

## Stage 7 — Animation

Levande · tyngd · andas · reagerar.

Animation för **mening** — inte för att motorn kan (Art Bible motion tokens).

---

## Stage 8 — Audio

Känsla — inte volym.

Frågor: Var kommer ljudet ifrån? Ska det finnas? Är tystnad starkare?

Audio Bible layers per rum.

---

## Stage 9 — Polish

Tar bort **friktion** — inte features.

Mikro-timing · easing · ljudduckning · touch-targets · safe areas.

---

## Stage 10 — QA

| Gate | Innehåll |
|------|----------|
| Funktion | Alla interactives · navigation · persistence |
| A11y | 44pt · kontrast · `prefers-reduced-motion` |
| Prestanda | 60 fps · first paint · texture budget |
| Konsekvens | Rulebook 01–07 · LWES · Art Bible |
| Känslokvalitet | Olle-test · Living World Metrics |
| **WQS** | [WORLD_DESIGN_BIBLE.md](../WORLD_DESIGN_BIBLE.md) WQS-001–200 applicable subset · POS 15 |

---

## Production Artifacts

Varje feature lämnar:

- Spec (RBS YAML)
- ADR (om arkitektur ändras)
- Assets (semantic IDs)
- Animationer (semantic clips)
- Audio (profiles)
- Tester (gate + integration där risk)
- Docs (Entity/Audio/Animation Bible-rader)
- Save migration (om persistence ändras)

---

## Feature Readiness

Innan implementation startar:

- [ ] Vision dokumenterad (pelare + känsla)
- [ ] Spec komplett eller TBD explicit
- [ ] Dependencies identifierade (WDB, LWES pack, assets)
- [ ] Assets planerade (manifest — inte ad-hoc)
- [ ] Risker listade (prestanda, a11y, migration)

---

## Feature Completion

Innan ship:

- [ ] Kod + pack data
- [ ] Art + animation + audio
- [ ] QA + prestanda + a11y
- [ ] WQS applicable gates = ja
- [ ] `rulebook_gates.pipeline_approved: true` i room YAML

---

## Change Management

Varje ändring efter ship — fråga:

1. **Varför?** (business vs polish)
2. **Känsla?** (stärker eller urvattnar pelare?)
3. **Tydlighet?** (barnet förstår utan tutorial?)
4. **Komplexitet?** (enklare än innan?)
5. **Märker barnet?** (förändring vs förvirring)
6. **Bekantskap?** (Spatial Memory bevarad?)

---

## Technical Debt

Tillåtet endast om:

- **Tillfälligt** — med exit-datum
- **Dokumenterat** — ADR eller issue
- **Tilldelat** — ägare namngiven
- **Schemalagt** — i sprint/roadmap
- **Osynligt för barnet** — aldrig placeholder-asset i produktion

---

## Production Anti-Patterns

| Anti-pattern | Varför fel |
|--------------|------------|
| Implementera först | Ingen känslodiagnos |
| Special-case per rum | Motor-explosion |
| Duplicera system | Underhållshelvete |
| Placeholders i prod | Bryter 00B premium-känsla |
| *"Polish later"* | Polish shippar aldrig |

---

## Final Approval

Alla måste signera (self-review 180):

- Creative / Design
- Engineering
- Art
- A11y
- Performance
- WQS (applicable subset)

---

## Definition of Done (Rulebook 08)

- [ ] Alla tio Production Stages passerade dokumenterat
- [ ] Production Artifacts kompletta
- [ ] Feature Readiness vid start · Feature Completion vid ship
- [ ] Inga Production Anti-Patterns
- [ ] Final Approval — alla hattar gröna
- [ ] SW bump om static assets (150-release)

---

## Final Principle

> **Disciplinerat hantverk slår inspiration varje gång.**  
> Barnet ska känna magi — teamet ska känna process. Magin kommer från att vi aldrig hoppar över ett steg.

---
