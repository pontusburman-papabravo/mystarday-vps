# World Bible v1.0

**Dokumenttyp:** World Bible — identitet, plats och produktkonstitution för Min värld  
**Version:** 1.0  
**Status:** **World Bible v1.0 — Conceptual Foundation complete** (Parts I–V) · **Part VI Room Catalog in progress** (`bibles/rooms/`)  
**Språk:** Svenska (produktröst) · engelska rubriker där angivet  
**Skapad:** 2026-07-02  

---

## Auktoritet

```
World Constitution (§1 nedan)     ← HÖGSTA auktoritet för Min värld
  ↓
POS (product-operating-system/)   ← produktlag; Constitution får inte bryta POS
  ↓
PCB — Product Content Bible       ← världssjäl, motivation, seven worlds
  ↓
World Bible Part I–V              ← topologi, design, blueprints, progression, levande sim — underordnade Constitution
  ↓
WORLD_DESIGN_BIBLE                ← progression nodes, WQS — underordnad identitet
  ↓
LIVING_WORLD_ENGINE_SPEC v1       ← runtime (FROZEN) — underordnad produktidentitet
  ↓
Entity · Animation · Audio · Progression Bibles
  ↓
Implementation
```

**Vid konflikt om Min värld-identitet:** World Constitution vinner över WDB, LWES, Art Bible, gameplay och implementation.  
**Vid konflikt med POS Constitution (regler 1–6):** POS vinner — eskalera till CPO, uppdatera inte Constitution utan ADR.

**Korsreferenser:**

| Dokument | Roll i förhållande till Constitution |
|----------|--------------------------------------|
| [LIVING_WORLD_ENGINE_SPEC.md](../LIVING_WORLD_ENGINE_SPEC.md) | Hur motorn kör — **underordnad** Constitution för produktbeslut |
| [WORLD_DESIGN_BIBLE.md](../WORLD_DESIGN_BIBLE.md) | Progression nodes, WQS — **vad som låses upp**; Constitution är **vem platsen är** |
| [PRODUCT_CONTENT_BIBLE.md](../PRODUCT_CONTENT_BIBLE.md) | Five Feelings-filter (samma fem pelare) · motivation stack |
| [ART_BIBLE.md](../ART_BIBLE.md) | Pixel, ljus, diorama — får aldrig göra platsen till spel eller dashboard |
| [GAME_DESIGN_BIBLE.md](../GAME_DESIGN_BIBLE.md) | Loopar, firanden — underordnade Home Principle |
| [docs/PRODUCT-CONSTITUTION.md](../../docs/PRODUCT-CONSTITUTION.md) | Hela produktens fem+en regler — Constitution operationaliserar Min värld |
| POS **06** Motivation & Game Ethics | G-01–G-08 — reality wins, no grind |
| POS **09** World Building | Unlock-filosofi — Constitution § Golden Rules |
| POS **00A** Experience Manifesto | Välkomnande, inte skuld — Comfort-pelaren |

---

# Rulebook 01 — World Constitution

> **Läs dessa 2–3 sidor först.**  
> Varje människa och varje AI som fattar beslut om Min värld — rum, props, events, progression, implementation — läser Constitution innan något annat i World Bible, WDB eller LWES.

---

## Purpose

Min värld är **inte** ett spel, en belöningsskärm eller ett progressionssystem.

Min värld är **en plats som växer med barnet**.

Allt som finns där ska stärka minst en av fem känslor:

| Känsla | Barnankare |
|--------|------------|
| **Capability** — förmåga | *"Jag klarar det."* |
| **Ownership** — ägande | *"Det här är mitt."* |
| **Comfort** — trygghet | *"Det känns tryggt."* |
| **Curiosity** — nyfikenhet | *"Vad är det?"* |
| **Imagination** — fantasi | *"Tänk om…"* |

Om en funktion, ett rum, en animation eller ett event **inte** stärker minst en av dessa fem — **hör den inte hemma**.

---

## Vision

Barnet ska **aldrig** känna *"jag öppnade en app"*.

Barnet ska känna *"jag kom hem"*.

En bekant plats som **tyst fortsatt leva** medan barnet var borta — inte en tom skärm som väntade på inloggning, inte en kasino-vägg av poäng.

---

## The Five Pillars

### Capability — förmåga

**Verkliga livet först. Det digitala firar verkligheten.**

Min värld speglar vad barnet faktiskt gjort — klätt på sig, borstat tänder, hjälpt till. Stjärnor och byggdelar är **bevis**, inte mål. Digital stolthet utan verklig handling är identitetsbedrägeri (POS G-01, PCB layer stack).

### Ownership — ägande

**Mitt hus. Min hund. Mitt träd. Mitt museum. Mina minnen. Min värld.**

Barnet ska kunna peka och säga *mitt* — inte *upplåst nivå 3*. Platsen ackumulerar personlig historia. Inget känns lånat från en mall som alla har identisk.

### Comfort — trygghet

**Inga straff. Inget dör, går sönder eller försvinner för att barnet var borta en dag.**

Missad dag = välkomnande, inte skuld. Rummet dimmas aldrig som straff. Inga hunger-mätare, inga döda växter, inga "du missade eventet"-skärmar. Trygghet är förutsättning för all lek (POS 00A, Art Bible §25 miss-day-regel).

### Curiosity — nyfikenhet

**Världen viskar *"undrar jag…"* — den ropar aldrig *"du måste…"*.**

Öppna frågor utan facit. Brevlådan med okänd avsändare. Fågelbo som kanske har något i. Motorn ställer frågor; den levererar inte uppdrag. Nyfikenhet inbjuder — den tvingar inte.

### Imagination — fantasi

**Motorn skapar situationer. Barnet skapar berättelser.**

Ingen berättarröst som förklarar allt. Inga quest-loggar. Barnet bestämmer vad brevet betyder, vem som knackade, varför lampan är tänd. Fantasi kräver tomrum — vi fyller inte varje hörn med instruktion.

---

## The Three Golden Rules

### 1. Reality creates the world

```
Aktiviteter → Stjärnor → Byggdelar → Världen växer
```

**Aldrig tvärtom.**

Världen får inte generera stjärnor, inte kräva grind i Min värld för att Idag ska fungera, inte belöna skärmtid med skärmtid. Verkligheten skapar världen — världen skapar aldrig verkligheten (POS 06, PCB layer stack, G-01).

### 2. Child owns the pace

**Inga timers. Ingen FOMO. Inga streak-straff.**

Barnet bestämmer när de besöker, hur länge de stannar, vad de leker med. Världen väntar tålmodigt. Ingen "kom tillbaka om 4 timmar", ingen "du missade dagens event", ingen nedgradering för frånvaro.

### 3. World remembers

**Minnen ackumuleras. Känslan är *"jag har bott här"* — inte *"jag har låst upp saker"*.**

Troféer, foton, säsongsminnen, placerade föremål — permanent spår av ett liv levt i platsen. Unlock-listor och achievement-väggar är fel mental modell.

---

## The World Promise

> **Det här lovar vi barnet:**
>
> 1. **Det här är ditt hem** — inte ett spel du ska vinna.  
> 2. **Ditt riktiga liv betyder något här** — det du gör på riktigt växer din värld.  
> 3. **Inget dåligt händer för att du var borta** — platsen välkomnar dig tillbaka.  
> 4. **Du bestämmer tempot** — ingen stressar dig, inget försvinner om du väntar.  
> 5. **Platsen minns dig** — dina saker, dina minnen, din historia stannar kvar.  
> 6. **Föräldrar älskar dig genom världen — men kliver aldrig in i ditt rum.**

---

## The Home Principle

**En värld — inte tio.**

Teman, rum och berättelser kan variera (slott, trädkoja, rymdskepp), men det är **samma hem**. Barnet ska inte känna att de byter app när de byter tema. Navigation är promenad i ett sammanhängande ställe — inte flikar mellan separata produkter (LWES §116, Art Bible diorama).

---

## Themes

**Utseende — inte mekanik.**

Ett slott och en trädkoja **spelar identiskt**. Tema byter hud, ljus, props och copy — aldrig regler, ekonomi eller progressionstakt. Tema är inbjudan till fantasi, inte gameplay-variant.

---

## The Living World Principle

**Andas — inte progressar.**

Världen lever: ljus som skiftar, djur som rör sig, ljud som kommer och går. Men liv ≠ grind. "Levande" betyder att platsen känns närvarande — inte att barnet måste logga in för att "mata" eller "rädda" något. Andning är långsam, skippbar, meningsbärande (Art Bible §25, LWES Director).

---

## The Reward Principle

**Belöningar utanför. Minnen innanför.**

Glass i verkligheten → ett inramat minne på väggen i Min värld. Skattkammaren och föräldrarnas godkända belöningar lever **utanför** hemmet — i verkligheten. Inuti hemmet lagras **minnet** av glädjen, inte själva glassen som consumable. Digitalt firande förbereder; verklig belöning fullbordar (PCB rewards, POS 07).

---

## The Parent Principle

**Föräldrar påverkar fantasins kanter — de kliver aldrig in direkt.**

Paket vid dörren. Brev i lådan. Rosett på trädet. Föräldern kan lägga en överraskning i fiction — men föräldern har **inget avatar**, ingen röst i rummet, ingen "föräldrapanel" i barnets värld. De stöttar berättelsen utifrån; de äger inte berättelsen (POS C-01, P-02).

---

## The Child Principle

**Bygger ett liv — inte slutför mål.**

Barnet samlar inte achievements. Barnet **bor**. De placerar sin matta, hänger sitt minne, besöker sin hund, undrar över brevet. Framgång mäts i tillhörighet — inte i completion percentage.

---

## The Designer Principle

**Fråga *"vilken känsla saknas?"* — inte *"vilken feature ska vi lägga till?"*.**

Varje designreview börjar med de fem pelarna. Saknas trygghet? Fixa comfort — lägg inte till en minigame. Saknas ägande? Ge en placeringsyta — lägg inte till poäng. Feature-förslag utan känslodiagnos avvisas.

---

## The AI Principle

**AI måste fråga vilken pelare som stärks — och avvisa om svaret är inget.**

Ingen agent, ingen illustratör-pipeline, ingen kodgenerator får skapa rum, entitet, event eller animation "för att det är coolt". Obligatorisk gate: *Capability · Ownership · Comfort · Curiosity · Imagination — vilken?* Om **ingen** → stopp. Se [AODS.md](../AODS.md) och [bibles/README.md](./README.md).

---

## The Final Principle

**Min värld ska minnas åratal senare som en plats som bara tillhörde dem.**

Inte som en app de slutade använda. Inte som ett spel de "klarade". En plats — som ett barndomsrum man minns i doft och ljus.

Det är skillnaden mellan ett **spel** och ett **hem** (LWES §62).

---

# Rulebook 02 — World Topology & Spatial Design (Part I)

> **Svarar på:** *Vad är Min värld?*  
> **Underordnad:** World Constitution (§1) — Part I får aldrig motsäga Constitution.  
> **Runtime-data:** [LWES Part V](../LIVING_WORLD_ENGINE_SPEC.md#part-v--data-architecture--engine-contracts) (`scenes.json`, `nav_edges[]`, Appendix C).

---

## Purpose

Min värld är **en sammanhängande plats** — inte en samling skärmar.

Allt som barnet ser, hör och rör finns **någonstans** i världen. Det finns inga "funktionssidor", inga osynliga systemrum, inga belöningslager som bara poppar upp. Skattkammaren är ett rum man går till. Verkstaden är en byggnad man ser röken från. Akvariet är ett hörn vid sjön — inte en separat app.

Part I definierar **topologi, geografi och rumslig kontinuitet** för hela grannskapet. Varje nytt område (t.ex. Akvarium, Observatorium, Läshörna) måste passera checklistan i slutet av detta kapitel innan implementation.

---

## The One World Principle

**Ett värld — en mental karta.**

Barnet ska kunna följa en promenad i huvudet:

```
Hem → Trädgård → Skogsstig → Verkstad → Sjö → Museum → Läshörna
```

Rummen får laddas tekniskt oberoende — men barnet ska **aldrig** känna att de teleporterat. Grannskapet är **ett** ställe med flera zoner, inte flera produkter bakom flikar.

| Fel mental modell | Rätt mental modell |
|-------------------|-------------------|
| "Öppna verkstadsappen" | "Gå till verkstaden" |
| "Tillbaka till menyn" | "Gå hem" |
| "Ny funktion upplåst" | "Det finns en ny stig" |

Korsref: Constitution Home Principle · LWES §117 One World Principle.

---

## Physical Continuity

Tre frågor ska alltid ha ett svar i världen — aldrig i UI:

1. **Var är jag?** — igenkännlig silhuett, landmärke, ljus.
2. **Var kom jag ifrån?** — synlig dörr, stig eller grind bakom mig.
3. **Vart kan jag gå?** — minst en tydlig affordance (dörr, stig, brygga) — inte textknapp.

**Ingen mental teleport.** Övergångar får korsa en tröskel (dörröppning, grind, båt) — inte godtycklig fade utan rumslig ledtråd. `child-living-world-transition.js` och pack `nav_edges[]` ska spegla promenad, inte sidladdning (LWES §118).

---

## World Topology

Grannskapet växer **organiskt** — som ett riktigt område där man bor, inte som en nivåkarta.

```
                         ┌─────────────┐
                         │ Observatorium│  (höjd, utkik)
                         └──────┬──────┘
                                │ stig
    ┌──────────┐    ┌───────────┼───────────┐    ┌───────────┐
    │  Skog    │────│  Trädgård │    Hem    │────│ Verkstad  │
    └────┬─────┘    └─────┬─────┘           └─────┬─────┘
         │                │                         │
         │          ┌─────┴─────┐                   │
         │          │ Lekplats  │                   │
         │          └───────────┘                   │
         │                                          │
         └──────────────────┬───────────────────────┘
                            │
                      ┌─────┴─────┐
                      │    Sjö    │
                      └─────┬─────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴──────┐
        │  Museum   │ │ Akvarium  │ │ Läshörna   │
        │  (dom)    │ │  (hörn)   │ │  (lugn)    │
        └───────────┘ └───────────┘ └────────────┘
```

**Regler:**

- **Hem** sitter i centrum av den kända kartan — inte i ett hörn av UI.
- Nya zoner **ansluter** till befintliga stigar — de "spawnar" inte i tomma listor.
- Avlägsna platser (Observatorium, Skog) nås via **längre promenad** — inte via meny.
- Pack `scenes.json` och `navigation_edges[]` måste återspegla denna graf (LWES Appendix C).

---

## Home Is The Center

**Hem är känslomässigt ankare** — inte en laddningsskärm.

När barnet är vilse, trött eller nyfiket ska de kunna tänka: *"Jag går hem."* Hem ska kännas:

- **Bekant** — layout stabil mellan besök.
- **Välkomnande** — ingen skuld, ingen recap-modal (Constitution Comfort).
- **Orienterande** — från hem ser man eller minns man var andra platser ligger.

Director calmness ≥ 80 i hemscener (LWES §119). Hem är comfort zone i scene schema.

---

## Expansion Philosophy

Världen blir **rikare** — inte större på kartan varje vecka.

Expansion ska kännas som att man upptäckt **ett gömt hörn i grannskapet** man redan bodde i — inte som att man låst upp "nivå 4".

| Rätt expansion | Fel expansion |
|----------------|---------------|
| En stig bakom trädet leder till en glänta | En ny ikon i en funktionsmeny |
| Bryggan får en till planka | Hela kartan byts ut |
| Akvariehörnet syns först när man stannar vid sjön | "Nytt rum"-popup vid inloggning |

Progression nodes (WDB) fyller befintlig topologi — de ritas inte om grannskapet.

---

## Neighborhood Design

Allt ska ligga på **gångavstånd** i fiction.

Barnet ska kunna säga: *"Jag gick till sjön"* — inte *"appen laddade sjövyn"*. Avstånd uttrycks genom:

- Längre promenadanimation eller scroll.
- Synliga landmärken på vägen.
- Ljud som förändras längs stigen.

Grannskapet ska kännas som en **liten by eller förort** — inte en öppen värld i MMO-skal. Promenad mellan närmaste grannar: kort. Till Observatorium eller Skog: en liten expedition.

---

## Landmarks

**Ett landmärke per område** — igenkännbart på långt håll och i minnet.

| Område | Landmärke | Minnesankare |
|--------|-----------|--------------|
| **Hem** | Skorsten med lätt rök | *"Huset med skorstenen"* |
| **Trädgård** | Forntida träd | *"Det stora trädet"* |
| **Verkstad** | Väderkvarn / verkstadsskorsten | *"Kvarnen som snurrar"* |
| **Sjö** | Brygga / pir | *"Bryggan vid vattnet"* |
| **Museum** | Glasdom | *"Kupolen som glittrar"* |
| **Skog** | Hög ek / stigskylt | *"Skogen bakom trädet"* |
| **Lekplats** | Gunga eller rutschkana silhuett | *"Gungorna"* |
| **Läshörna** | Fönster med varmt ljus | *"Rummet med bokhyllan"* |

Landmärken **flyttar inte** mellan besök. De får åldras, dekoreras, få säsong — men position och identitet är stabil (Spatial Memory).

---

## Sightlines

Grannskapet ska kännas **sammanhängande genom sikt**.

Där topologin tillåter ska barnet kunna **se** grannplatser:

| Från | Synligt | Effekt |
|------|---------|--------|
| Trädgård | Slottstorn / hemets skorsten | Orientering |
| Trädgård | Rök från verkstaden | *"Någon har varit där"* |
| Sjön | Fyr eller ljus över vattnet | Längtan, lugn |
| Hem (fönster) | Trädgårdens träd | Kontinuitet |

Sightlines är **löften** — om man ser verkstaden ska man kunna nå den till fots. Synlig plats utan väg = brutet förtroende.

---

## Hidden Areas

**Nyfikenhet — inte progression.**

Dolda platser inbjuder till att titta och undra — de ska inte kräva grind eller stjärnkrav för att *finnas*:

| Typ | Exempel | Känsla |
|-----|---------|--------|
| Halvt dold | Grotta bakom buskage | *"Vad finns där inne?"* |
| Låst visuellt, öppen fiction | Bro utan alla plankor än | *"En dag går det att gå över"* |
| Grind som viskar | Grind till äppelträdgård | Nyfikenhet, inte FOMO |
| Stig uppför kullen | Kullstig till utkik | Belöning för att gå längre |
| Stege till trädkoja | Stege som hänger | Fantasi, inte quest |

Dold ≠ osynlig i data. Pack deklarerar `discoverable: true` utan att visa i UI-listor (LWES Part V).

---

## Buildable Areas

**Osynlig potential** — ytor där barnets byggdelar landar över tid.

Byggbara platser ska finnas från dag ett som **tomma eller halvfärdiga ytor** — inte som tomma menyer. När en byggdel låses upp ska barnet tänka: *"Äntligen blev det klart!"* — inte *"Nu dök en byggnad upp från ingenstans."*

Exempel: välkomstmatta-plats vid dörren, blomlåda vid fönster, hylla i läshörnan, bryggplanka, trädgårdsrabatt.

`build_slots[]` i scene schema kopplar till WDB progression nodes — aldrig magiska tal (Constitution Golden Rule 1, WDB §3).

---

## Density

Varje scen ska kännas **full** — inte **trång**.

Fyra lager i varje vy:

| Lager | Roll | Exempel |
|-------|------|---------|
| **Hero** | Story anchor, landmärke | Forntida trädet |
| **Interactive** | 5–10 meningsfulla ting (LWES §107.1) | Brevlåda, grind, blomlåda |
| **Ambient** | Andning utan krav | Fåglar, löv, rök |
| **Empty space** | Fantasiens tomrum | Gräs att springa på, himmel |

Tomrum är **avsiktligt** — inte produktionslathet. Barnet behöver ytor att projicera lek på (Constitution Imagination).

---

## Traversal

Promenad ska vara **trevlig** — inte **effektiv**.

| Princip | Implementation |
|---------|----------------|
| Kortaste väg ≠ bästa väg | Längre stig längs sjön får finnas parallellt med direktväg |
| Rörelse är lek | Dörrar som öppnas, stigar som scrollar, broar som vibrerar lätt |
| Ingen hastknapp | Barnet ska inte behöva "skip travel" för att inte tröttna |
| Återväg tydlig | Samma landmark på vägen tillbaka |

Effektivitet är för föräldrapanelen — inte för barnets värld.

---

## Emotional Geography

**En primär känsla per plats** — inte fem på en gång.

Känslan är **geografisk**: platsen bär den, barnet känner den genom ljus, ljud, densitet och tomrum. Sekundära känslor max 2 — får inte motsäga primären (scene schema `emotion_job`).

| Plats | Primär känsla | Barnankare |
|-------|---------------|------------|
| **Hem** | Safety (trygghet) | *"Här är jag säker"* |
| **Trädgård** | Curiosity | *"Vad gömmer sig där?"* |
| **Verkstad** | Creativity | *"Här kan jag göra"* |
| **Sjö** | Calm | *"Här andas jag ut"* |
| **Museum** | Pride | *"Titta vad jag gjort"* |
| **Skog** | Wonder | *"Det känns stort"* |
| **Lekplats** | Joy | *"Här hoppar jag"* |
| **Läshörna** | Peace | *"Här är det tyst och bra"* |

Kartlägg till Constitution five pillars där relevant — men **geografisk primärkänsla** styr atmosfär (LWES §118.3, Emotional Runtime).

---

## Spatial Memory

Barnet ska kunna **rita kartan i huvudet** efter några besök.

| Krav | Varför |
|------|--------|
| Möbler och vägar står kvar | Tillit |
| Nya saker dyker upp **på** kartan | Tillväxt känns verklig |
| Samma ingång varje gång | Ingen förvirring |
| Landmärken oförändrade identitet | *"Det stora trädet"* förblir det trädet |

Unlocks visas **in-world** — inte som separat inventory-lista som ersätter minnet (Constitution World remembers).

---

## Exploration

Belöna **att titta** — inte **att grinda**.

| Belöning för utforskning | Inte belöning |
|--------------------------|---------------|
| En fjäril man inte sett förut | +10 poäng för steg |
| Ett ljud bakom stenen | Achievement "utforskare" |
| Utsikt man bara ser om man går hela stigen | Daglig login-räknare |

Nyfikenhet ska kännas som **egen belöning** — Constitution Curiosity-pelaren.

---

## World Scale

Världen ska kännas **större än det spelbara**.

Barnet ska se världar bortom staketet — berg, fåglar som flyger iväg, rök långt borta, båtar på horisonten, stigar som försvinner i skogen. Allt behöver inte vara nåbart idag.

**Skala skapar drömmar** — inte frustration. Horisonten är inbjudan (Future Expansion), inte låst grind med countdown.

---

## Seasonal Geography

**Samma årstid överallt** i grannskapet.

När det snöar snöar det vid hem, trädgård, sjö och skog. När det är höst är löven gula på hela promenaden. Säsongsbyte är **atmosfärisk händelse** — inte per-rum skin som krockar.

World Events Bible och pack `season_profile` styr globalt (LWES Director + Events). En scen får inte ha sommarljus när grannscenen har snö.

---

## Theme Transformation

**Utseende ändras — geografin består.**

Slott, trädkoja, rymdbas eller piratskepp är **hud** på samma topologi:

- Samma antal rum, samma `nav_edges[]`, samma känslokarta.
- Skorsten kan bli torn; kvarn kan bli segelmast — landmärkes **roll** kvarstår.
- Tema får aldrig ändra Golden Rules eller ekonomi (Constitution Themes).

---

## Future Expansion

Reservera **trovärdigt utrymme** i varje zon.

| Reserverat | Syfte |
|------------|--------|
| Tom tomt bakom huset | Framtida växthus / djurhörn |
| Udde vid sjön | Framtida båthus |
| Extravåning i silhuett | Framtida rum utan att riva kartan |
| Stig som försvinner i dimma | Framtida skogszon |

Reserven syns som **horisont eller tom yta** — inte som "låst innehåll"-skylt. Barn ska inte känna FOMO (Constitution Child owns the pace).

---

## Navigation Philosophy

**Minne — inte menyer.**

Barn navigerar genom:

```
Landmärken · Stigar · Dörrar · Synliga mål · Muskelminne
```

Förbjudet som **primär** navigation: flikar, ikonrutnät, hamburgermeny, "tillbaka"-pil utan dörr, URL-känsla (LWES §118.2).

Föräldragated systemmeny (PIN) får finnas för konto — den listar **inte** världens rum som app-sektioner.

---

## The Window Test

> *Kan barnet föreställa sig vad som finns utanför bildrutan?*

Varje scen ska ha antydd värld bortom kameran: fönster med himmel, dörröppning mot ljus, stig som fortsätter, ljud från grannplats.

Om scenen känns som en **sluten bakgrundsbild** — underkänd. Diorama-regeln (Art Bible) kräver liv utanför rutan.

---

## The Neighborhood Test

> *Skulle någon faktiskt vilja bo här?*

Grannskapet ska kännas **boeligt** — inte som en spelplan eller temapark med dekorationer utan logik. Hus har dörrar dit man går. Trädgårdar har stigar som leder någonstans. Verkstäder har rök för att något händer där inne.

Om platsen bara finns "för att featuren behövde en skärm" — underkänd. Varje zon måste ha fiction som klarar grannskapstestet.

---

## Definition of Done (Part I)

Ett nytt område eller en topologiändring är **inte klar** förrän:

- [ ] Området har **exakt position** i topologigrafen (ASCII eller `nav_edges[]`)
- [ ] Minst en **in**- och **ut**-väg med landmark-labels
- [ ] **Ett landmärke** definierat och synligt i första kameraramen
- [ ] **En primär känsla** (Emotional Geography) — max två sekundära
- [ ] **Sightlines** till/från grannar dokumenterade där möjligt
- [ ] **Window Test** och **Neighborhood Test** passerade
- [ ] **Ingen Constitution-brott** (Five Pillars, Golden Rules, Home Principle)
- [ ] Pack-data planerad: `scene_id`, `navigation_edges[]`, `build_slots[]` (LWES Part V / Appendix C)
- [ ] WDB progression nodes placerade **in-world** — inte som abstrakt unlock
- [ ] Säsongs- och temabeteende specificerat
- [ ] Dolda och byggbara ytor antecknade — även om tomma i v1

---

## Final Principle

> **Min värld är gjord av platser — inte knappar.**  
> Om barnet kan beskriva var de är utan att nämna en skärm, har vi lyckats.

---

## Nytt område — obligatorisk checklista (Cursor-gate)

Innan **något** nytt rum, område eller tema implementeras (t.ex. Akvarium, Observatorium, ny skogsglänta) ska Cursor och människor svara **skriftligt** på alla elva frågor. Om fråga 11 är *ja* — **avvisa**; Constitution vinner alltid.

| # | Fråga | Svar krävs |
|---|--------|------------|
| 1 | **Var ligger området i världen?** (topologiposition) | T.ex. *"Akvarium — hörn vid sjön, söder om bryggan, nås från strandstigen"* |
| 2 | **Vilka rum leder dit / från?** | `navigation_edges[]` — minst en in, minst en ut (LWES Appendix C) |
| 3 | **Vad ser barnet på vägen?** (sightlines) | Landmärken, rök, ljus, ljud längs stigen |
| 4 | **Vilken primär känsla?** (emotional geography) | **En** — se tabell ovan |
| 5 | **Vilket landmärke definierar platsen?** | Ett igenkännbart — t.ex. glaskupol för akvarium |
| 6 | **Hur påverkas det av årstider?** | Samma globala säsong som grannskapet |
| 7 | **Finns det utrymme för framtida expansion?** | Reserverad tomt, stig, eller horisont |
| 8 | **Finns det dolda områden för nyfikenhet?** | Grotta, grind, stege — nyfikenhet utan grind |
| 9 | **Var finns byggbara platser?** | `build_slots[]` med WDB-nycklar |
| 10 | **Klarar Window Test och Neighborhood Test?** | Ja/nej med en mening motivering vardera |
| 11 | **Bryter det mot World Constitution?** | **Om ja → STOP.** Om nej → fortsätt till Entity Bible |

**Dataarkitektur:** Svar ska kunna översättas till `scenes.json` utan nya engine-grenar (LWES Part V §63–67). Nytt område = ny data + assets — inte `if (sceneId === 'aquarium')` i motor.

**Exempel — Akvarium:** Hörn vid sjön (1) · in från `lake_shore`, ut till samma eller brygga (2) · ser bryggan och kupol silhuett på vägen (3) · Calm (4) · Glas/kupol vid vattenytan (5) · is på kant vid vinter, skär reflektioner på sommar (6) · udde reserverad för framtida fiskodling (7) · halvt dold grotta under bryggan synlig i vatten (8) · byggbar algplatta / sten (9) · fönster mot djupet + boeligt hörn (10) · nej — stärker Curiosity och Calm, reality-first (11).

---

# Rulebook 04 — Room Blueprint Standard (RBS) (Part III)

> **Det mest använda kapitlet.** Definierar **hur ett rum faktiskt specificeras i data** — inte abstrakt filosofi.  
> **Korsref:** [Part I](#part-i--world-topology--spatial-design) (topologi, landmärken) · Part II SDS (comfort anchors, hero object, story anchors) · [LWES §22 Interaction Types](../LIVING_WORLD_ENGINE_SPEC.md#22-interaction-types) · [Appendix C Scene Pack Schema](../LIVING_WORLD_ENGINE_SPEC.md#appendix-c--scene-pack-schema)  
> **Konkreta rum:** [Part VI — Room Catalog](#part-vi--room-catalog) → [`bibles/rooms/`](./rooms/README.md)  
> **Levande värld:** [Part V — Living World Simulation](#part-v--living-world-simulation)

---

## Purpose

Room Blueprint Standard (RBS) är **single source of truth** för hur ett rum specificeras innan art, animation, audio eller kod.

| Roll | Använder RBS för |
|------|------------------|
| **Design** | Känslokontrakt, densitet, navigation, story anchors |
| **Art** | Hero object, layers, theme variants, asset manifest |
| **Engineering** | `scenes.json`, hotspots, build slots, performance budget |
| **Animation** | Semantic clips per object tier |
| **Audio** | Profile layers, ducking, reactive stems |
| **AI Gen** | Prompt manifest — aldrig fri prompt utan RBS-rad |
| **QA** | Quality Gates + Constitution-check per rum |

Ett rum utan komplett RBS-YAML **får inte** till art-pipeline eller implementation.

---

## Blueprint Philosophy

Ett rum är en **levande plats** — inte en bild, inte en React-komponent, inte en lista assets.

| Rum är | Rum är inte |
|--------|-------------|
| En plats barnet **bor i** | En belöningsskärm |
| Data som motorn **fyller med liv** | Hårdkodad `if (sceneId)` |
| Hero + stöd + ambient + tomrum | 50 hotspots utan hierarki |
| Navigation som **promenad** | Flikar eller URL-hopp |

RBS beskriver **vad som finns, var det finns, hur det känns** — LWES beskriver **hur motorn kör det**.

---

## Room Identity

```yaml
room_identity:
  id: home_hall                    # Pack-unique scene_id; matches scenes.json
  display_name: Hallen             # Child-facing (sv)
  description: >
    Hemmets inre hall — första rummet innanför dörren.
    Varmt ljus, bekanta föremål, vägar till resten av huset och trädgården.
  primary_emotion: Comfort         # Se Emotional Contract
  secondary_emotion: Belonging     # Max 1 i RBS; Part I tillåter max 2 sekundära
  theme_support: [house, castle, treehouse, space, pirate, wizard]
  unlock_condition: always         # WDB key eller always | progression node
```

**Fältregler:**

- `id` — stabil för alltid; byts inte vid tema.
- `display_name` — svenska, barnvänligt; ingen feature-etikett.
- `primary_emotion` — exakt **en**; styr Director, ljus, ljud, pacing (nedan).
- `unlock_condition` — `always` för hem-hall; andra rum kan kräva WDB-nyckel.

---

## Emotional Contract

**En primär känsla per rum.** Motorn använder den för lighting, audio, animation pacing, NPC-val, ambient density och camera calmness.

**Tillåtna värden (sluten lista):**

```
Comfort · Safety · Wonder · Curiosity · Pride · Calm · Joy · Creativity · Belonging · Peace · Adventure
```

| Primär känsla | Motor-effekt (exempel) |
|---------------|------------------------|
| Comfort | Hög calmness_target, varma toner, låg surprise-budget |
| Curiosity | Medel ambient density, fler inspectables, öppna frågor |
| Calm | Minimal rörelse, låg master_gain, långsam pacing |
| Joy | Högre rörelseamplitud inom Art Bible-cap |

**Kartläggning till Constitution five pillars:** RBS-känsla MÅSTE stärka minst en pelare (Capability · Ownership · Comfort · Curiosity · Imagination). Om ingen — **STOP**.

Sekundär känsla får **inte** motsäga primär (t.ex. Adventure primär + Peace sekundär = underkänd).

---

## Spatial Contract

```yaml
spatial_contract:
  layout: wide_2_5d_interior       # Semantic layout id — inte pixelkoordinater i motor
  entrance:
    id: door_from_exterior
    from_scene: home_exterior
    landmark_label_sv: Dörren
    camera_on_enter: gentle_push_in
  landmark:
    id: fireplace_hero
    description: Öppen spis / brasa — silhuett synlig i första kadrar
  walking_area:
    id: hall_floor_center
    description: Fri golv yta framför spisen och mot innerdörrar
  interaction_zones:
    - id: zone_entry_mat
      accepts: [welcome_mat_place]
    - id: zone_fireplace
      accepts: [inspect, activate_lamp]
    - id: zone_inner_doors
      accepts: [navigate]
  ambient_zones:
    - id: zone_window_light
      description: Morgonljus genom fönster — rörligt damm/partiklar
    - id: zone_chimney_smoke
      description: Lätt rök från skorsten — synlig via fönster eller spis
  future_build_zones:
    - id: zone_coat_peg
      description: Tom vägg vid entré — kapstok (WDB routine_home_coat_peg)
    - id: zone_museum_frame
      description: Vägg vid trappa — minnesram (legacy)
  camera_anchor:
    id: hall_fixed_2_5d
    description: Fast barn-ögonhöjd; ingen fri kamera
```

**Korsref Part I:** `landmark` = Emotional Geography landmärke för zonen. `entrance` = Physical Continuity. `future_build_zones` = Buildable Areas + Future Expansion.

---

## Hero Object

Exakt **ett** hero object per rum — story anchor, högsta visuella vikt.

```yaml
hero_object:
  id: fireplace_hero
  description: Varm öppen spis med mjukt glöd — hund sover ofta här (LWES §58.1)
  story_purpose: >
    Barnet associerar hallen med värme och trygghet.
    "Här är det varmt." — inte förklarat i copy.
  interaction_level: inspect_primary   # inspect | activate | open | navigate
```

Part II SDS: hero object får inte konkurrera med navigation eller build slot i samma pixelområde.

---

## Supporting Objects

```yaml
supporting_objects:
  - id: welcome_mat_slot
    description: Plats för välkomstmatta — tom ghost tills WDB unlock
    story_role: ownership
  - id: coat_peg_wall
    description: Kapstok-plats vid entré
    story_role: capability
  - id: window_bird_perch
    description: Fönsterkarm där fågel ibland landar
    story_role: curiosity
  - id: inner_door_bedroom
    description: Dörr mot sovrum
    story_role: navigation
  - id: inner_door_trophy
    description: Dörr mot troférum / minnesvägg
    story_role: navigation
```

---

## Ambient Objects

```yaml
ambient_objects:
  - id: light_dust_motes
    description: Dammpartiklar i fönsterljus
    budget_tier: subtle
  - id: curtain_edge_sway
    description: Gardin som rör sig lätt i drag
    budget_tier: subtle
  - id: chimney_smoke_wisp
    description: Tunn rök — kopplad till Part I landmärke skorsten
    budget_tier: subtle
  - id: floorboard_creak
    description: Living object — sällsynt knarr (audio+ik)
    budget_tier: rare
```

Ambient får **aldrig** kräva tap. Budget: LWES §29, Director Appendix I.

---

## Interactive Objects

Varje rad refererar **LWES §22 / Appendix D** interaction type.

```yaml
interactive_objects:
  - id: door_garden
    interaction_type: Navigate          # §22.9
    target_scene: garden
    landmark_label_sv: Ut till trädgården

  - id: door_bedroom
    interaction_type: Navigate
    target_scene: bedroom
    landmark_label_sv: Sovrummet

  - id: door_trophy
    interaction_type: Navigate
    target_scene: trophy_room
    landmark_label_sv: Troféerna

  - id: welcome_mat_build
    interaction_type: Place               # §22.3
    build_slot: hall_welcome_mat
    progression_key: progression.routine_home.welcome_mat

  - id: first_light_window
    interaction_type: Activate            # §22.7
    progression_key: progression.routine_home.first_light

  - id: mailbox_inner_view
    interaction_type: Inspect             # §22.1
    note: Brevlåda synlig genom fönster/dörr — koppling home_exterior

  - id: dog_companion
    interaction_type: Pet                 # §22.5 Care/Pet
    progression_key: progression.routine_home.npc_mira
```

**Sluten interaction-typ-lista:** `Inspect · Open · Place · Collect · Feed · Pet · Talk · Move · Activate · Navigate` — inga custom utan ADR.

---

## Build Slots

```yaml
build_slots:
  - id: hall_welcome_mat
    location: zone_entry_mat
    required_part: welcome_mat
    theme_variant: welcome_mat_{theme}
    unlock: progression.routine_home.welcome_mat

  - id: hall_coat_peg
    location: zone_coat_peg
    required_part: coat_peg
    theme_variant: coat_peg_{theme}
    unlock: progression.routine_home.coat_peg

  - id: hall_museum_frame
    location: zone_museum_frame
    required_part: museum_frame
    theme_variant: museum_frame_{theme}
    unlock: progression.routine_home.museum
```

Korsref: WDB `routine_home_*` · LWES Appendix C `slots[]`.

---

## Navigation

**Explicit — infereras aldrig.** Varje kant = pack `navigation_edges[]` / hotspot.

```yaml
navigation:
  edges:
    - nav_id: door_from_exterior
      direction: in
      from_scene: home_exterior
      to_scene: home_hall
      transition_profile: door_open_warm
      landmark_label_sv: In genom dörren

    - nav_id: door_garden
      direction: out
      from_scene: home_hall
      to_scene: garden
      transition_profile: door_fade_pan
      landmark_label_sv: Trädgården

    - nav_id: door_bedroom
      direction: out
      from_scene: home_hall
      to_scene: bedroom
      transition_profile: door_soft
      landmark_label_sv: Sovrummet

    - nav_id: door_trophy
      direction: out
      from_scene: home_hall
      to_scene: trophy_room
      transition_profile: door_soft
      landmark_label_sv: Troféerna

  return_anchor: door_from_exterior
  comfort_zone: true                   # Safe return — Part I Home Is The Center
```

Implementation idag: `child-morgonhus.js` dörr → `LivingWorldTransition.enterGarden` när `garden_playable` aktiv.

---

## NPC Contract

```yaml
npc_contract:
  present: true
  npcs:
    - id: dog_companion
      entity_ref: dog_companion
      role: companion
      max_bubbles_per_beat: 3          # LWES §22.6
      emotional_object: true
      default_pose_near: fireplace_hero
      progression_unlock: progression.routine_home.npc_mira
  rules:
    - No guilt dialogue for absence
    - No quest giver behavior
    - Celebrate real wins only (G-01)
```

---

## Pet Contract

```yaml
pet_contract:
  allowed: true
  pets:
    - id: dog_companion
      species: dog
      nameable: true
      hunger_timer: false              # FORBIDDEN — LWES §26
      sick_state: false
      interact_verbs: [pet, call]
      home_anchor: fireplace_hero
```

---

## Camera Contract

**Config only — ingen custom logik per rum.**

```yaml
camera_contract:
  profile_id: hall_fixed_2_5d
  type: fixed_2_5d
  child_eye_height: true
  pan_on_enter: gentle_push_in
  pan_speed: slow
  bounds: scene_rect
  reduced_motion_fallback: static_frame
```

Korsref: LWES Part III Rendering · Art Bible diorama.

---

## Lighting Contract

```yaml
lighting_contract:
  profile_id: home_hall_morning
  primary_source: window_morning_warm
  secondary_source: fireplace_glow
  time_variants:
    - id: morning
      color_temp: warm_gold
    - id: evening
      color_temp: amber_dim
    - id: night
      color_temp: cool_moon_window
  weather_reactive: true               # Atmosphere only — inte gameplay
```

---

## Audio Contract

```yaml
audio_contract:
  profile_id: home_hall_day
  night_variant_id: home_hall_night
  master_gain_max: 0.65
  duck_on_interact: true
  layers_ref: audio_bible/home_hall_day
```

Fullständiga stems → [AUDIO_BIBLE.md](./AUDIO_BIBLE.md) exempel `home_hall`.

---

## Ambient Runtime

```yaml
ambient_runtime:
  director_scene_key: home_hall
  calmness_target: 80
  max_visual_density: 0.65
  opening_grace_ms: 10000
  silence_min_after_hero_ms: 15000
  ambient_ids:
    - light_dust_motes
    - curtain_edge_sway
    - chimney_smoke_wisp
  rare_events:
    - id: window_bird_land
      cooldown_days: 1
      progression_gate: progression.routine_home.bird
```

Korsref: LWES Appendix I `director.json` exempel `home_hall`.

---

## Story Anchors

```yaml
story_anchors:
  past:
    - id: first_foot_inside
      description: Välkomstmattan — första gången barnet klev innanför efter Idag
      progression_key: progression.routine_home.welcome_mat
  present:
    - id: warm_fireplace
      description: Spisen glöder — hunden sover här idag eller imorgon
      entity: fireplace_hero
  future:
    - id: museum_memories
      description: Tom ram väntar på morgonfoto/minnen
      progression_key: progression.routine_home.museum
    - id: balcony_hook
      description: Antydd dörr/uteplats — sommarluft senare
      progression_key: progression.routine_home.balcony
```

---

## Discoveries

Korsref: LWES §23 Discovery Runtime.

```yaml
discoveries:
  common:
    - id: floor_creak_spot
      type: ambient
      interaction: Inspect
  rare:
    - id: window_bird
      type: ambient_discovery
      progression_key: progression.routine_home.bird
  seasonal:
    - id: birthday_banner
      event_ref: evt_birthday_mode
  hidden:
    - id: secret_breakfast_tray
      progression_key: progression.routine_home.secret_tray
      note: Earned explore — kindness flag + bloom
```

---

## Seasonal Variants

```yaml
seasonal_variants:
  global_sync: true                    # Part I Seasonal Geography
  variants:
    - season: winter
      overlay_ids: [frost_window_edge, warm_fire_boost]
    - season: summer
      overlay_ids: [bright_window_wash, curtain_open_wide]
    - season: birthday
      overlay_ids: [banner_subtle, extra_warm_light]
```

---

## Weather Support

**Atmosfär only — påverkar inte gameplay gates.**

```yaml
weather_support:
  inherit_world: true
  effects:
    - weather: rain
      audio: rain_on_roof_soft
      visual: window_droplets
    - weather: wind
      audio: curtains_breeze
      visual: curtain_sway_amplitude_up
    - weather: snow
      visual: frost_window_corner
```

---

## Theme Variants

Samma topologi — annan hud (Constitution Themes).

```yaml
theme_variants:
  house:
    skin_set: house_default
    landmark_label: Skorsten med lätt rök
  castle:
    skin_set: castle_great_hall
    landmark_label: Öppen eldstad i sten
  treehouse:
    skin_set: treehouse_platform_interior
    landmark_label: Eldstad av stenring
  space:
    skin_set: habitat_corridor
    landmark_label: Varmt instrumentpanel-skär
  pirate:
    skin_set: ship_galley_hall
    landmark_label: Lykta och kartbord
  wizard:
    skin_set: tower_entry
    landmark_label: Svävande ljusorb vid "eldstad"
```

---

## Performance Budget

```yaml
performance_budget:
  target_fps: 60
  max_interactive_hotspots: 10
  max_animated_ambient: 4
  max_particle_systems: 2
  texture_memory_mb: 12
  first_paint_ms_target: 200
  reduced_motion_path: true
```

Korsref: POS 03B · Art Bible motion caps · `.cursor/rules/060-mobile-first.mdc`.

---

## Asset Manifest

**Semantic IDs only — aldrig filnamn i logik.**

```yaml
asset_manifest:
  scene_bg: morgonhus_hall_bg
  layers:
    - sky_through_window
    - hall_architecture
    - ground_floor
    - objects_mid
    - foreground_door_frame
  entities:
    - fireplace_hero
    - welcome_mat_slot
    - dog_companion
  theme_resolver: chair_small_pattern
```

Shipped asset idag: `morgonhus-scene` → `public/images/child/morgonhus/scene@2x.webp` (monolit — split layers TBD).

---

## Prompt Manifest

Källa: [PROMPT_BIBLE.md](./PROMPT_BIBLE.md) · [ART_PROMPT_CATALOG.md](./ART_PROMPT_CATALOG.md).

```yaml
prompt_manifest:
  - id: hall_scene_hero
    version: 0.1.0
  art_style: nordic_warm_diorama_2_5d
  negative_prompt: >
    No text on walls, no brand logos, no scary shadows,
    no realistic horror, no empty grey rooms, no stock photo aesthetic
  catalog_ref: TBD                   # Art Prompt Catalog entry när godkänd
```

---

## Animation Manifest

```yaml
animation_manifest:
  idle:
    - dog_idle_01
    - dog_idle_02
    - dog_sleep_fireplace
  ambient:
    - curtain_sway_slow
    - fire_glow_flicker
    - light_dust_drift
  hero:
    - fireplace_ember_pulse
  interaction:
    - welcome_mat_place_snap
    - door_open_garden
    - first_light_glow_on
  celebration:
    - placement_whisper_sparkle
```

Korsref: [ANIMATION_BIBLE.md](./ANIMATION_BIBLE.md).

---

## Quality Gates

Fyra obligatoriska frågor innan ship:

| Gate | Fråga | Owner |
|------|-------|-------|
| **Designer** | Stärker rummet minst en Constitution-pelare med **en** tydlig primär känsla? | UX / Game Director |
| **Artist** | Finns hero, stöd, ambient och avsiktligt tomrum — inget "billigt" tomma mittpartiet? | Art Director |
| **AI** | Kommer varje genererad asset från Prompt Manifest + negativ lista — inget ad-hoc? | AODS gate |
| **Engineer** | Kan hela rummet deklareras i pack utan ny `if (sceneId)` — bara data? | Principal Engineer |

Alla fyra måste vara **ja**. Annars STOP.

---

## Example (Simplified) — `home_hall`

Minimal referens — **full spec:** [`bibles/rooms/home_hall.yaml`](./rooms/home_hall.yaml).

```yaml
room_identity:
  id: home_hall
  display_name: Hallen
  primary_emotion: Comfort
  secondary_emotion: Belonging
  unlock_condition: always

hero_object:
  id: fireplace_hero
  story_purpose: Värme och trygghet vid hemkomst

navigation:
  edges:
    - nav_id: door_garden
      to_scene: garden
    - nav_id: door_bedroom
      to_scene: bedroom

emotional_contract: Comfort
build_slots:
  - id: hall_welcome_mat
    unlock: progression.routine_home.welcome_mat
```

---

## Definition of Done (per room blueprint)

- [ ] Alla RBS-sektioner ifyllda i `bibles/rooms/<room_id>.yaml` (TBD markerat explicit — inte utelämnat)
- [ ] Part I checklista (11 frågor) besvarad i YAML eller companion notes
- [ ] Constitution five pillars + Golden Rules — inget brott
- [ ] Varje `interactive_objects[].interaction_type` ∈ LWES §22
- [ ] Varje `navigation.edges[]` target finns i Part I topologi
- [ ] Entity Bible-rader planerade för hero + interactives
- [ ] Audio + Animation manifests länkade
- [ ] Performance budget inom mobile gate
- [ ] Quality Gates (4 frågor) dokumenterade ja/nej i PR

---

## Final Principle

> **Om datan inte är komplett nog att en främmande agent kan producera rummet utan att fråga "vad menar ni?" — är blueprinten inte klar.**  
> Sluta skriva abstrakta regler. Börja fylla `bibles/rooms/`.

---

# Part IV — Room Catalog

> **Konkreta blueprints — inte ny filosofi.**

| | |
|--|--|
| **Katalog** | [`bibles/rooms/`](./rooms/README.md) |
| **Mall** | [`bibles/rooms/_TEMPLATE.yaml`](./rooms/_TEMPLATE.yaml) |
| **Första rum** | [`bibles/rooms/home_hall.yaml`](./rooms/home_hall.yaml) (påbörjad) |

**Normativt nästa steg:** Fyll room blueprints i prioritetsordning (se `rooms/README.md`) — **komplett RBS före art eller kod.**

Part III RBS är mallen. Part IV är **innehållet**.

---

# Hur du använder detta dokument

1. **World Constitution (§1) är absolut.** Allt som följer i World Bible (kapitel 2–), WDB, LWES, Production Bibles och kod **får aldrig** motsäga Constitution.
2. **Läs Constitution först** — varje session, varje PR som rör Min värld, varje AI-uppdrag.
3. **Part I (topology)** gäller för alla nya områden — fyll **Nytt område-checklistan** innan implementation.
4. **Part III RBS + `bibles/rooms/`** — fyll komplett blueprint före art eller kod.
5. **Konflikt?** Constitution → eskalera. Ändra inte Constitution utan CPO + Game Director + ADR i POS 14.
6. **Five Feelings-filter** i PCB och LWES Appendix J är **samma fem pelare** — olika dokument, samma gate.

---

# Kapitel 2+ — Planerad struktur (underordnad Constitution)

> **Status:** Skelett. Innehåll fylls i per kapitel. Inget kapitel nedan är normativt förrän markerat *COMPLETE*.

| Kapitel | Titel | Äger | Status |
|---------|-------|------|--------|
| **I** | **World Topology & Spatial Design** | Topologi, landmärken, känslokarta, ny-område-gate | **COMPLETE** |
| **II** | **Spatial Design Standard (SDS)** | Comfort anchors, hero object, density, diorama | **COMPLETE** |
| **III** | **Room Blueprint Standard (RBS)** | Data-schema per rum — single source of truth | **COMPLETE** |
| **IV** | **Room Catalog** | [`bibles/rooms/`](./rooms/README.md) — konkreta YAML-blueprints | **In progress** (`home_hall` först) |
| 5–10 | Legacy kapitel (build, memory, events…) | Underordnade Part III/IV | Planerad / ersatt av Production Bibles |

---

## Legacy — Scene entry schema (ersatt av Part III RBS)

> **Normativt schema:** [Part III — RBS](#part-iii--room-blueprint-standard-rbs) och [`bibles/rooms/_TEMPLATE.yaml`](./rooms/_TEMPLATE.yaml).  
> Tabellen nedan behålls som snabbreferens tills alla rum migrerats till YAML-katalogen.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `scene_id` | string | ✓ | Pack-unique; matches `scenes.json` |
| `display_name_sv` | string | ✓ | Child-facing label |
| `world_id` | string | ✓ | Parent world (`home`, `garden`, …) |
| `emotion_job` | enum | ✓ | Primary feeling: capability · ownership · comfort · curiosity · imagination |
| `secondary_feelings` | enum[] | | Max 2; must not contradict primary |
| `first_five_seconds` | string | ✓ | What child sees/hears on enter — no UI chrome |
| `emotional_landmarks` | string[] | ✓ | 2–5 memorable anchors (spatial memory) |
| `story_anchor_entity_id` | string | ✓ | One object children invent stories around |
| `open_questions` | string[] | ✓ | ≥1 unanswered question in scene (no copy answers) |
| `pretend_affordances` | string[] | ✓ | Pretend play verbs without objectives |
| `interactive_count_target` | int | ✓ | Meaningful interactives: 5–10 |
| `build_slots` | slot[] | | `slot_id`, `theme_skin_key`, `unlock_progression_key` |
| `navigation_edges` | nav[] | ✓ | `nav_id`, `target_scene_id`, `landmark_label_sv` |
| `comfort_zone` | bool | | True = safe return anchor |
| `audio_profile_id` | string | ✓ | Links to Audio Bible |
| `wdb_progression_refs` | string[] | | WDB node IDs unlocked from or visible in scene |
| `lwes_pack_fields` | object | | `strengthens_feeling`, `toy_density_target` |

### Exempel — `home_exterior` (legacy snabbref)

```yaml
scene_id: home_exterior
display_name_sv: Mitt hem
world_id: home
emotion_job: ownership
secondary_feelings: [comfort, curiosity]
first_five_seconds: >
  Mjuk morgonljus på husfasaden. Gräsmattan rör sig lätt.
  Dörren är stängd men inbjudande. Ingen text, ingen knapp — bara platsen.
emotional_landmarks:
  - front_door
  - mailbox
  - welcome_mat
  - window_warm_light
  - path_to_garden
story_anchor_entity_id: mailbox
open_questions:
  - who_sent_the_letter
pretend_affordances:
  - pretend_arrival_home
  - pretend_check_mail
interactive_count_target: 7
navigation_edges:
  - nav_id: door_enter
    target_scene_id: home_hall
    landmark_label_sv: Dörren
  - nav_id: path_garden
    target_scene_id: garden
    landmark_label_sv: Trädgården
comfort_zone: true
```

### Definition of Done (per scen)

- [ ] Emotion job passes five feelings filter (Constitution §1 + LWES Appendix J)
- [ ] Ingen Constitution-brott (Golden Rules, Home Principle, Reward Principle)
- [ ] Every `build_slots[]` entry has Entity Bible row (when exists)
- [ ] Every `navigation_edges[]` target exists in World Bible
- [ ] WDB progression keys verified in Progression Bible

---

*World Constitution v1.0 — complete. Part I–III complete. Nästa produktionssteg: fyll [`bibles/rooms/home_hall.yaml`](./rooms/home_hall.yaml) → övriga rum i prioritetsordning.*
