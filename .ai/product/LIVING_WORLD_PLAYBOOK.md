# Living World Playbook

**Version:** 1.0  
**Dokumenttyp:** Produktmetod — hur världar designas och färdigställs  
**Status:** Normativ för Product, Game Director, Creative Director, UX  
**Språk:** Svenska

---

## Syfte

Detta dokument beskriver **hur en värld byggs** — inte vad en specifik värld innehåller.

Vi har redan:

| Dokument | Roll |
|----------|------|
| Living World Design Principles | Varför världar finns; lagar som aldrig bryts |
| First 100 Hours | Hur upplevelsen tätas över tid i spelaren |
| First Living Object (Fönsterfågeln) | Mönster för levande objekt med relation, inte grind |
| Family Journey-konsolideringen | Familj som ankare — delad stolthet, inte admin |
| PRODUCT_CONTENT_BIBLE | Själ, motivation, emotion jobs |
| WORLD_DESIGN_BIBLE | Leveranskontrakt: progression nodes, WQS, handoff |
| GAME_DESIGN_BIBLE | Loopar, SDT, Experience Packs |

**Playbooken sitter mellan vision och leverans.** Den säkerställer att varje ny värld går igenom samma kvalitetskedja innan WDB-kapitel, art brief och implementation påbörjas.

**Detta dokument innehåller inte:** kod, UI, copy, implementation, tekniska API:er.

---

## Auktoritet

```
POS Constitution + 00A/04/09
        ↓
Living World Design Principles
        ↓
DENNA Playbook (metod + mall)
        ↓
PRODUCT_CONTENT_BIBLE (world soul)
        ↓
WORLD_DESIGN_BIBLE (progression map + WQS)
        ↓
Art Bible · Game Design Bible
        ↓
Implementation
```

**Konflikt:** PCB vinner känsla och etik. Playbooken vinner **process och beslutskedja**. WDB vinner **leveransbar spec**.

---

## När en ny värld får födas

En värld är berättigad endast om **alla** passerar:

| Gate | Fråga | Veto |
|------|-------|------|
| **Constitution** | Minskar den morgonstress / ökar barnets självständighet? | CPO |
| **Differentiation** | Känns den ALDRIG som en befintlig värld (emotion + mekanik)? | Creative Director |
| **Layer stack** | Sitter den på lager 5 (Living World) — inte hoppar över Routine/Reality? | Game Director |
| **Six-month test** | Bygger vi detta om vi hade sex månader kvar? | CEO |
| **Horisont** | Har den djup vid 1v / 1m / 6m / 2år — utan att kännas färdig? | Game Director + CPO |

**Fail → parkera idén.** Ingen "vi fixar känslan i implementation".

---

## Produktpipelinen — steg för steg

Varje värld passerar **tio faser**. Ingen fas får hoppas över. Ingen fas kräver kod.

```
Idé
  ↓
Design Intent
  ↓
Relation
  ↓
Moments
  ↓
Objects
  ↓
Interactions
  ↓
World Feeling
  ↓
Gameplay Analytics
  ↓
QA
  ↓
Release
```

---

### Fas 0 → 1: Idé

**Vad:** En hypotes om ett **vardagsområde** som förtjänar en plats i barnets inre karta.

**Input:** Observation från verkligheten, support, föräldraintervjuer, POS-gap, syskon-/familjdynamik.

**Output:** En sida: *"Vi tror att [vardag] behöver [känsla] och att [värld] kan spegla det."*

**Gate:** CPO Feature Gate (varför finns detta?).

**Anti-mönster:** "Konkurrenten har garage" · "Vi behöver mer content" · värld som bara är dekor för stjärnor.

---

### Fas 1 → 2: Design Intent

**Vad:** Skarpa **emotion job** och **vardagsspegel** — en mening vardera, inga features.

**Frågor att besvara:**

- Vilken känsla ska dominera när barnet står i rummet?
- Vilken verklig morgon/em/evenemang speglar världen?
- Vad ska världen **aldrig** kännas som?

**Output:** Design Intent Statement (max 150 ord) + Differentiation-rad (WDB matrix-format).

**Gate:** Creative Director — unik emotion+mekanik-kvadrant.

**Anti-mönster:** Feature-lista · NPC som uppgiftshanterare · värld utan vardagsankare.

---

### Fas 2 → 3: Relation

**Vad:** Hur världen förhåller sig till **barnet**, **familjen**, **andra världar** och **verkligheten**.

**Dimensioner:**

| Relation | Designfråga |
|----------|-------------|
| Barn ↔ värld | Protagonist eller åskådare? |
| Barn ↔ Living Objects | Granne, verktyg, spegel, inget husdjur med skuld? |
| Värld ↔ Idag | Vilken aktivitetsgrupp speglas — utan att duplicera Idag-listan? |
| Värld ↔ Familj | Vad kan delas på familjevägg / projektbord? |
| Värld ↔ andra världar | Korsnod, ljud, silhuett — inte klon |
| Värld ↔ verklighet | Reality → World → tillbaka i livet (PCB layer stack) |

**Output:** Relationskart (ord, inte diagram-krav) + första Living Object-kandidat med livscykelintent.

**Gate:** Game Director — barnet agerar i verkligheten först (P-02).

**Anti-mönster:** Syskon-rankning · bonusfamilj som kalender · värld som kräver föräldarmedling.

---

### Fas 3 → 4: Moments

**Vad:** Auktorerade **ögonblick** — inte system. "Timme 1", "vecka 3", "månad 6" i upplevelsetid.

**Moment-typer:**

| Typ | Syfte | Max per värld vid launch |
|-----|-------|--------------------------|
| **Ankomst** | Första foten innanför | 1 |
| **Erkännande** | "Jag känner igen det här" | 2–3 |
| **Stolthet** | Verklig prestation syns | 3–5 |
| **Nyfikenhet** | Något utanför fokus lockar | 2–4 |
| **Tillhörighet** | Familj / granne / NPC-minne | 1–2 |
| **Horisont** | Inte färdigt — stig kvar | Alltid ≥1 |

**Output:** Moment-lista med trigger i **verklighet eller utforskning** (aldrig login-RNG).

**Gate:** CPO — varje moment kopplat till Constitution-regel.

**Anti-mönster:** Daglig kista · FOMO-countdown · "du missade oss".

---

### Fas 4 → 5: Objects

**Vad:** Fysiska **objekt och rum** som bär moments — inkl. Living Objects med livscykel.

**Objektklasser:**

| Klass | Roll | Exempel |
|-------|------|---------|
| **Threshold** | Första tydliga ingång | Dörr, grind, trappsteg |
| **Mirror** | Spegel av verklig färdighet | Spegel, verktyg, hylla |
| **Build** | Placering = ägande | Matta, bänk, krok |
| **Living** | Lever utan barnets input | Fönsterfågeln, växt, vatten |
| **Secret** | Intjänad undring | Nisch bakom gardin |
| **Horizon** | Synlig men ej nåbar än | Balkong, stig, port |

**Output:** Objektinventarie med emotion beat per objekt + fas (Sprout→Legacy) i **ord**, inte siffror.

**Gate:** WDB readiness — objekt mappar till framtida progression nodes, inte magiska tal.

**Anti-mönster:** 40 likadana prylar · objekt utan vardagsjobb · Living Object som belöningsgrind.

---

### Fas 5 → 6: Interactions

**Vad:** Vad barnet **kan göra** — och vad som är frivilligt.

**Regler (hårda):**

- Ett primärt interaktionsval per besök som default (placera ELLER utforska).
- Lek blockerar aldrig rutin.
- Ingen energi-timer på livsuppgifter.
- Tap/svar ≤ upplevd omedelbarhet (mobil-first).
- Frånvaro straffar inte — välkomnande dim max 15 %.

**Output:** Interaktionsmatris: objekt × gest × respons × obligatorisk/frivillig.

**Gate:** UX Director — 44pt barn, tumme, portrait; reduced-motion-variant finns.

**Anti-mönster:** 15-stegs placement · hover-only · grind för att "väcka" NPC.

---

### Fas 6 → 7: World Feeling

**Vad:** Den **sammansatta känslan** — ljus, ljud, takt, tomrum, tystnad.

**Känslokomponenter:**

| Komponent | Beslut |
|-----------|--------|
| Ljus | Tid på dygnet, nyckelriktning, värme |
| Ljud | Default av för barn; ambient valfritt |
| Rörelse | Idle-lager; aldrig fryst >5 s |
| Tystnad | Giltig fullständig session (WQS-100) |
| Miss day | Välkomnande, inte skuld |
| Säsong | Max 2 props swap; verklig kalender |

**Output:** Feeling Brief (1 sida) — refererar Art Bible, duplicerar inte pixelregler.

**Gate:** Creative Director screenshot-test utan UI-krom (00B).

**Anti-mönster:** Arcade-puls i lugnt rum · horror · kasino-språk · identisk palette som annan värld.

---

### Fas 7 → 8: Gameplay Analytics

**Vad:** **Vilka beslut** produktteamet måste kunna fatta efter launch — inte vilken kod som skrivs.

**Principer (009 Analytics):**

- Analytics speglar — styr inte milestones.
- Inga PII / barninnehåll i events.
- Varje målmetrik har en **guardrail** (t.ex. tid i värld ↑ men First Success ska inte ↓).

**Per värld — minimum:**

| Kategori | Exempelfråga |
|----------|-------------|
| **Discovery** | Hittar barnet världen utan popup? |
| **Return** | Kommer de tillbaka frivilligt efter vecka 1? |
| **Depth** | Når de timme-20-moment utan grind? |
| **Trust** | Sjunker completion på Idag när världen öppnas? |
| **Family** | Delas stolthet till familjevägg (opt-in)? |
| **Silence** | Finns sessioner med noll placement men ≥30 s vistelse? |

**Output:** Analytics Brief — hypotes, metrics, guardrails, event-intent (namn i ord, implementation senare).

**Gate:** Analytics + CPO sign-off på guardrails.

**Anti-mönster:** Sidvisningar · login-streak · barnprofilering · vanity utan beslut.

---

### Fas 8 → 9: QA

**Vad:** **Produkt-QA** — inte bara buggar. "Förråder upplevelsen löftet?"

**Constitution Test (urval):**

| # | Fråga |
|---|-------|
| 1 | Barnet är protagonist — rutin på Idag, världen firar |
| 2 | En nästa steg — inte tio lika viktiga |
| 3 | Ingen överraskande modal vid login |
| 4 | Frånvaro bestraffas inte |
| 5 | Syskon ser parallell stolthet, inte rankning |
| 6 | Världen känns inte färdig efter intensiv vecka |
| 7 | Reduced motion / tystnad respekteras |
| 8 | Förälder ser lugn, inte dashboard i barnvy |

**Output:** QA Product Sign-off + WQS-subset checklist (WDB §17) markerad Ja/Nej.

**Gate:** QA Director veto på P0/P1 produktbrott.

**Anti-mönster:** Ship för att art är klar · hoppa över mid-range Android · desktop-only känsla.

---

### Fas 9 → 10: Release

**Vad:** **När** världen möter barn — inte hur deploy funkar.

**Release-dimensioner:**

| Dimension | Produktbeslut |
|-----------|---------------|
| **Era** | Vilken fas i First 100 Hours öppnas världen? |
| **Reveal** | In-world discovery — aldrig login-kasino |
| **Ceremoni** | Milstolpe firas ≤2 s, skippbar |
| **Flag** | Gradvis rollout per familj om risk |
| **Kommunikation** | Förälder informeras om *vardag*, inte features |
| **Horisont** | Vilka noder är med dag 1 vs append-later |

**Output:** Release Note (produkt) + "vad vi inte lovar"-lista.

**Gate:** Release Command — QA veto, CPO scope, POS §15.

**Anti-mönster:** Fredagslaunch · allt på en gång · löfte om "klart" content.

---

## De nio obligatoriska frågorna

Varje värld har **ett ifyllt svar** innan WDB-kapitel skrivs.

| # | Fråga | Ägare |
|---|-------|-------|
| 1 | **Varför finns världen?** | CPO |
| 2 | **Vilken känsla ska dominera?** | Creative Director |
| 3 | **Vilken vardag speglar den?** | Game Director |
| 4 | **Vilka Living Objects ingår?** | Game Director |
| 5 | **Vilka Moments vill vi skapa?** | CPO + Game |
| 6 | **Vad hoppas vi barnet berättar hemma?** | CPO |
| 7 | **Hur vet vi att världen lyckats?** | Analytics + CPO |
| 8 | **Vilka Gameplay Analytics behövs?** | Analytics |
| 9 | **Hur får världen djup efter 1v / 1m / 6m / 2år?** | Game Director |

---

## Djuphorisont — samma värld, fyra tidsskalor

| Skala | Intent | Kännetecken | Förbjudet |
|-------|--------|-------------|-----------|
| **1 vecka** | Igenkänning | Få objekt, stora moments, ett Living Object möte | Färdigkänsla |
| **1 månad** | Rot | Rutin speglas i rummet; första hemlighet; familjekoppling | Grind-wall |
| **6 månader** | Grannskap | Korslänkar; säsong; omarrangering som lek | "100 % complete" |
| **2 år** | Arv | Minnen, syskonspår, legacy-noder, nya kanter append-only | Barnet växer ur utan nostalgivärde |

**Regel:** Varje skala lägger till **periferi**, inte bara **centrum**.

---

## Universell världsmall

Alla framtida världar fyller i denna mall. Kopiera sektionen per värld.

---

### WORLD BRIEF — [Namn]

**Slug (internt):** `________`  
**Status:** Draft / Review / Approved / Live  
**Senast uppdaterad:** ________

#### A. Design Intent

| Fält | Svar |
|------|------|
| Varför finns världen? (1) | |
| Dominerande känsla (2) | |
| Vardagsspegel (3) | |
| Känns ALDRIG som | |
| POS-regler | |

#### B. Relation

| Relation | Beskrivning |
|----------|-------------|
| Barn ↔ värld | |
| Familj | |
| Andra världar | |
| Verklighet → värld → liv | |

#### C. Living Objects

| Objekt | Livscykel (kort) | Skuld? (Ja/Nej) |
|--------|------------------|-----------------|
| | | |

#### D. Moments

| Tid / trigger | Moment | Emotion |
|---------------|--------|---------|
| Timme ~1 | | |
| Timme ~5 | | |
| Timme ~20 | | |
| Timme ~60 | | |
| Timme ~100 | | |

#### E. Objects & Interactions

| Objekt | Klass | Primär interaktion | Frivillig lek |
|--------|-------|--------------------|---------------|
| | | | |

#### F. World Feeling

| Ljus | Ljud | Idle | Miss day | Säsong |
|------|------|------|----------|--------|
| | | | | |

#### G. Hemma-berättelsen (6)

*"Vi hoppas barnet säger: ___"*

#### H. Framgång (7)

| Signal | Guardrail |
|--------|-----------|
| | |

#### I. Gameplay Analytics (8)

| Hypotes | Metric intent | Guardrail |
|---------|---------------|-----------|
| | | |

#### J. Djuphorisont (9)

| 1 vecka | 1 månad | 6 månader | 2 år |
|---------|---------|-----------|------|
| | | | |

#### K. Pipeline-signoff

| Fas | Signerad | Datum |
|-----|----------|-------|
| Design Intent | | |
| Relation | | |
| Moments | | |
| Objects | | |
| Interactions | | |
| World Feeling | | |
| Analytics | | |
| QA | | |
| Release | | |

---

## Exempel — fem världar

Nedan: **ifyllda briefs** på metanivå. Inte copy. Inte UI. Inte implementation.

---

### 1. Morgonhuset

**Slug:** `routine_home` · **Era:** Första världen efter First Success

#### A. Design Intent

| Fält | Svar |
|------|------|
| **Varför finns världen?** | Produkten föddes i morgonstress. Världen gör morgonfärdigheter **synliga stolthet** istället för nagelning. |
| **Dominerande känsla** | Kapabel trygghet — *"Jag klarar morgonen."* |
| **Vardagsspegel** | Självvård, påklädning, frukost, avfärd — FM-rutinen på Idag. |
| **Känns ALDRIG som** | Verkstad, hage, dockskåp, arcade. |
| **POS-regler** | P-02 protagonist, G-01 reality first, C-01 inga barnformulär här. |

#### B. Relation

Barnet **äger** rummet. Familjen ser stolthet via Familjegårdens vägg — frivilligt. Fönsterfågeln är ** granne**, inte husdjur. Verkstaden teasas med ljud/silhuett. Verklig morgon → objekt i rummet → barnet går ut stoltare.

#### C. Living Objects

| Objekt | Livscykel | Skuld? |
|--------|-----------|--------|
| **Fönsterfågeln** | Skugga → möte → närvaro → morgonvän → säsong → granne för livet | Nej |
| **Morgonljuset** | Följer verklig FM-completion; ångar, dämpas aldrig straffande | Nej |

#### D. Moments

| Trigger | Moment | Emotion |
|---------|--------|---------|
| Första besök | Första foten innanför; spöke av nästa del | Tillhörighet |
| ~Timme 5 | Fågeln landar; något ändrats sedan igår | Igenkänning |
| ~Timme 20 | Spegelhörna; Mira firar utan uppgift | Stolthet |
| ~Timme 60 | Frukosthörna komplett; dörrljus vid avfärd | Kapabelhet |
| ~Timme 100 | Fågeln flyger mot horisont — stig kvar | Nyfikenhet |

#### E. Objects & Interactions

Threshold: dörr, matta. Mirror: spegel. Build: kapstok, frukosthörna. Living: fågel, ljus. Horizon: balkongkrok, museum-ram. Primärt: placera en del ELLER utforska fönster/dörr.

#### F. World Feeling

Varm ek, svalt golv, ljus från vänster. Tystnad giltig. Miss day: dämpat, välkomnande. Höst: löv på matta.

#### G. Hemma-berättelsen

*"Jag har ett eget morgonhus — och fågeln kom tillbaka idag."*

#### H. Framgång

Frivilliga återbesök utan att FM-completion sjunker. Barn refererar morgonhus i verklig tal.

#### I. Analytics

Discovery in-world. Return vecka 2. Guardrail: First Success oförändrad. Silence-sessioner räknas som frisk signal.

#### J. Djuphorisont

| 1v | 1m | 6m | 2år |
|----|----|----|-----|
| Matta, fågel-skugga | Spegel, kapstok, hemlig nisch | Frukost komplett, korsminiatyr i Mitt rum | Museum, syskonkrok, säsongscykler |

---

### 2. Trädgården

**Slug:** `garden_yard` (konceptuell) · **Era:** Efter Morgonhuset rot — ofta månad 1–2

#### A. Design Intent

| Fält | Svar |
|------|------|
| **Varför finns världen?** | Barn möter **naturens takt** — inte människans morgonklocka. Balanserar inomhus-rutin med utomhus tålamod. |
| **Dominerande känsla** | Mjuk nyfikenhet — *"Det växer om jag tar hand om det."* |
| **Vardagsspegel** | Klä på sig för utomhus, hjälpa till i trädgård/balkong, samla löv, vattna, promenad. |
| **Känns ALDRIG som** | Dinosaurie-expedition, fiskebrygga, verkstad. |
| **POS-regler** | Reality first; inget växt-Tamagotchi som dör. |

#### B. Relation

Barnet är **trädgårdsmästare i liten skala**. Syskon har parallella rabatter, inte bästa blomma. Familj: projektbord får frön/recept från verklig plantering. Morgonhuset syns genom fönster — inne/ute-koppling.

#### C. Living Objects

| Objekt | Livscykel | Skuld? |
|--------|-----------|--------|
| **Rosenbusken** | Knopp → blad → blomma → vila på vintern → återkomst | Nej |
| **Igelfamiljen** | Sällsynt besök vid kvälls-rutiner | Nej |

#### D. Moments

| Trigger | Moment | Emotion |
|---------|--------|---------|
| Första besök | Grind öppnas; vind i gräs | Frihet |
| ~Timme 5 | Första frö i jord (speglar verklig aktivitet) | Ägande |
| ~Timme 20 | Rosen öppnar kronblad efter streak av utomhus-dagar | Belöning |
| ~Timme 60 | Hemlig stig bakom buske | Undring |
| ~Timme 100 | Säsongsskifte barn inte sett förut | Horisont |

#### E–J. (sammanfattat)

Känsla: grönt, vindsway, dämpad färg. Hemma: *"Min blomma växte — den i appen också."* Framgång: utomhusaktiviteter ↑ utan press. Djup: 1v en rabatt → 2år flera zoner + syskonspår + årstidsarkiv.

---

### 3. Garaget (Verkstaden)

**Slug:** `workshop` · **Era:** Vecka 2–3 efter First Success

#### A. Design Intent

| Fält | Svar |
|------|------|
| **Varför finns världen?** | Många barn bygger identitet genom **händerna** — inte bara morgon. |
| **Dominerande känsla** | Maker-stolthet — *"Jag fixade något."* |
| **Vardagsspegel** | Hjälpa hemma, bygga, laga, måla, LEGO, pyssel, "hjälp pappa/mamma". |
| **Känns ALDRIG som** | Husdjurshem, dockhus, morgonhus. |
| **POS-regler** | Kompetens utan tävling; inga köpbara verktyg. |

#### B. Relation

Verktyg som **troféer**, inte shop. Familj: färdigt projekt på bordet. Morgonhus: hammarljud teaser. Barn fixar i verkligheten → projekt syns på bänk.

#### C. Living Objects

| Objekt | Livscykel | Skuld? |
|--------|-----------|--------|
| **Bänkljuset** | Tänds efter maker-aktivitet; flicker idle | Nej |
| **Projekthästen** (påhängd träleksak) | Får band/sticker efter delade familjeprojekt | Nej |

#### D. Moments

| Trigger | Moment | Emotion |
|---------|--------|---------|
| Första besök | Bänk tom; silhuett av verktyg på vägg | Potential |
| ~Timme 5 | Första del på plats — tillfredsställande snap | Kompetens |
| ~Timme 20 | Projekt halvvägs; radio-hum valfritt | Flow |
| ~Timme 60 | Färdigt objekt barn "ger" till Familj | Generositet |
| ~Timme 100 | Nytt projekttyp teasas på hylla | Horisont |

#### E–J. (sammanfattat)

Hem: *"Jag byggde hyllan — den står i garaget i spelet."* Analytics: maker-aktiviteter korrelerar med besök; guardrail: ej mindre FM. Djup: 1v en hylla → 2år projektarkiv + syskonverktyg.

---

### 4. Köket

**Slug:** `kitchen_nook` (kan vara Morgonhus-nod ELLER egen värld) · **Era:** När frukost/måltidsrutin etablerad

#### A. Design Intent

| Fält | Svar |
|------|------|
| **Varför finns världen?** | Måltid är **familjens mötespunkt** — inte bara "ät frukost"-checkbox. |
| **Dominerande känsla** | Varm gemenskap — *"Vi lagar/intar tillsammans."* |
| **Vardagsspegel** | Frukost, mellanmål, hjälpa till med mat, duka av, handla. |
| **Känns ALDRIG som** | Skattkammar-shop, restaurang-arcade, chokladgrind. |
| **POS-regler** | R-02 inga köpbara stjärnor; mat som verklig belöning via förälder. |

#### B. Relation

Tät **Familj-koppling** — projektbord och kök delar recept. Syskon: varsin stol vid bord, gemensam gryta. Verklig bakning → receptkort i världen.

#### C. Living Objects

| Objekt | Livscykel | Skuld? |
|--------|-----------|--------|
| **Kitteln** | Ånga efter måltids-aktivitet; aldrig krav | Nej |
| **Kylskåpsmagneten** | Barnets ritning från verkligheten dyker upp över tid | Nej |

#### D. Moments

| Trigger | Moment | Emotion |
|---------|--------|---------|
| Första besök | Doft/kittel-ljud; tom bricka | Inbjudan |
| ~Timme 5 | Skål på hylla placerad | Ordning |
| ~Timme 20 | Hemlig bricka efter hjälp-i-kök-streak | Överraskning |
| ~Timme 60 | Familjerecept på vägg | Tillhörighet |
| ~Timme 100 | Säsongsmat (t.ex. sommarbär) | Förnyelse |

#### E–J. (sammanfattat)

Hem: *"Vi bakade — receptet finns i vårt kök."* Framgång: familjemåltidsminnen utanför skärmen nämns. Djup: 1v bricka → 2år receptbok + syskonbidrag + högtidsmenyer.

---

### 5. Biblioteket (Läshörnan)

**Slug:** `reading_nook` · **Era:** Kvälls-/wind-down när FM/EM etablerat

#### A. Design Intent

| Fält | Svar |
|------|------|
| **Varför finns världen?** | Barn behöver **nedvarvning med stolthet** — inte skärm som belöning för utmattning. |
| **Dominerande känsla** | Fokuserad ro — *"Jag kan varva ner med något mitt."* |
| **Vardagsspegel** | Kvällsrutin, läsning, sagostund, tandborstning kväll, lugn aktivitet. |
| **Känns ALDRIG som** | Morgonhus-hype, dinosaurie-action, verkstad. |
| **POS-regler** | Ingen läs-streak med skuld; tystnad giltig. |

#### B. Relation

Kopplad till **kväll på Idag**, inte FM. Familj: berättelsevägg får kapitel. Lugnt grannskap till Fiskebryggan (tålamod) men känns inomhus-cozy.

#### C. Living Objects

| Objekt | Livscykel | Skuld? |
|--------|-----------|--------|
| **Läslampan** | Värme ökar efter kvälls-läsaktivitet | Nej |
| **Bokstödet** | Ny "bokrygg" efter verkliga lästillfällen | Nej |

#### D. Moments

| Trigger | Moment | Emotion |
|---------|--------|---------|
| Första besök | Lampglow; tom hylla med en bok | Lugn |
| ~Timme 5 | Andra bokrygg syns | Progress |
| ~Timme 20 | Kapitel på familjevägg kopplat till läsning | Stolthet |
| ~Timme 60 | Hemlig läskoja bakom gardin | Undring |
| ~Timme 100 | Säsongsberättelse (vinter/höst) | Förnyelse |

#### E–J. (sammanfattat)

Hem: *"Jag har en egen läshörna — med min bok."* Framgång: kvällsrutin lugnare (föräldrarapporter). Djup: 1v en hylla → 2år bibliotek + syskonböcker + egna "skrivna" kapitel.

---

## Roller i pipelinen

| Roll | Ansvar i Playbook |
|------|-------------------|
| **CPO** | Gate 1, fråga 1/6/7, Constitution |
| **Game Director** | Relation, moments, djuphorisont, fråga 4/5/9 |
| **Creative Director** | Design Intent, World Feeling, differentiation |
| **UX Director** | Interactions, mobil, a11y |
| **Analytics** | Fråga 8, guardrails |
| **QA Director** | Fas 9, WQS veto |
| **Release Command** | Fas 10, scope freeze |

**Ingen roll shippar värld utan ifylld WORLD BRIEF + WDB DoR (§18).**

---

## Definition of Ready / Done (produkt)

### DoR — World Brief klar för WDB

- [ ] Alla 9 frågor besvarade
- [ ] Pipeline fas 1–7 signerade
- [ ] Differentiation-rad unik
- [ ] Living Objects med livscykel + skuld=Nej
- [ ] Moments mappar till First 100 Hours
- [ ] Analytics brief med guardrails
- [ ] Djuphorisont 1v/1m/6m/2år ifylld

### DoD — World Brief klar för Release (produkt)

- [ ] QA Constitution Test pass
- [ ] WQS applicable = Ja (WDB)
- [ ] Analytics events dokumenterade (intent)
- [ ] Release era + reveal-beslut
- [ ] Hemma-berättelse validerad (minst 3 interna "skulle ett barn säga detta?")
- [ ] Append-only horisont dokumenterad

---

## Anti-mönster — metodnivå

| Anti-mönster | Konsekvens |
|--------------|------------|
| Hoppa till WDB utan Brief | Implementation utan själ |
| Fylla mall med features | Checklista, inte värld |
| Copy/UI i Brief | Låser för tidigt |
| En metric utan guardrail | Optimerar fel beteende |
| "Vi fixar känslan sen" | Skuld i launch |
| Samma Living Object i varje värld | Fågeln överallt = utspädning |
| Färdig vid månad 1 | Bryter 100-timmarslöftet |

---

## Appendix — dokumentkedja efter godkänd Brief

| Steg | Output | Ägare |
|------|--------|-------|
| 1 | WORLD BRIEF (denna playbook) | Product |
| 2 | PCB world chapter update | CPO |
| 3 | WDB progression map + nodes | Game Director |
| 4 | Art brief + palette row | Creative Director |
| 5 | GDB loop confirmation | Game Director |
| 6 | Analytics allowlist intent | Analytics |
| 7 | Implementation | Engineering |
| 8 | QA + Release | QA / Release Command |

**Playbooken slutar vid steg 1 godkännande. Resten är andra biblar.**

---

*Living World Playbook v1.0 — Product methodology. Ingen implementation. Ingen kod. Ingen UI. Ingen copy.*
