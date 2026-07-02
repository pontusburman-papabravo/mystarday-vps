# World Production Contracts (WPC)

**Status:** Canonical  
**Authority:** Absolute  
**Applies to:** Every Room · Entity · Feature · Animation · Interaction  
**Version:** 1.0  
**Updated:** 2026-07-02  

---

## Svenskt sammanhang

**World Production Contracts (WPC)** är det **sista regeldokumentet** innan implementation av Min värld. WPC definierar vad som är **tillåtet** — inte vad som är önskvärt.

Varje rum, entitet, animation och interaktion måste passera WPC innan kod skrivs. Maskinläsbar spec: [`wpc.contracts.yaml`](./wpc.contracts.yaml). Snabb rumsgate: [`WPC-ROOM-CHECKLIST.md`](./WPC-ROOM-CHECKLIST.md).

WPC **ersätter WPT som primär gate**. Room Blueprint Standard (RBS) i [`_TEMPLATE.room.yaml`](./_TEMPLATE.room.yaml) och [`_TEMPLATE.room.md`](./_TEMPLATE.room.md) förblir som **författarmall** — underordnad WPC.

**Nästa steg efter WPC:** 100-home production spec (innehållsarbete, inte regeländring).

---

## Purpose

WPC är en uppsättning **oföränderliga produktionskontrakt** för Min värld.

| Princip | Betydelse |
|---------|-----------|
| **Kontrakt, inte rekommendationer** | Bryt = ADR i `product-operating-system/14_DECISION_LOG.md` |
| **Pre-code gate** | Ingen implementation, asset eller animation utan WPC-granskning |
| **Maskinverifierbar** | [`wpc.contracts.yaml`](./wpc.contracts.yaml) + `npm run check:wpc` |
| **Underordnad POS** | WPC får aldrig bryta POS (särskilt G-01, R-02) |
| **Överordnad implementation** | Kod som bryter WPC är fel — inte dokumentet |

---

## Contract Philosophy

Kontrakt fungerar som **fysik** i Min värld:

- De beskriver vad som *kan* och *inte kan* hända — inte hur vackert det ser ut.
- De är **binära**: uppfyllt eller inte. "Nästan" räknas inte.
- De **ackumuleras inte** — ett brott i ett rum riskerar hela världens trovärdighet.
- De **skyddar barnet** från skuld, grind, FOMO och identitetsbedrägeri.
- De **skyddar teamet** från ad-hoc-beslut under deadline.

Om ett kontrakt känns obekvämt vid implementation — **stoppa och eskalera**. Kontraktet är avsiktligt.

---

## Contract Categories

| Kategori | ID-prefix | Omfattning |
|----------|-----------|------------|
| **Spatial** | SPC | Rumslig kontinuitet, landmärken, tomrum |
| **Interaction** | INC | Hur barnet rör sig och agerar |
| **Visual / Art** | ART | Material, ljus, perspektiv |
| **Audio** | AUD | Ljudkällor, tystnad, musik |
| **Animation** | ANI | Rörelse, vikt, easing |
| **Memory** | MEM | Permanens, minnen, progression som försvinner |
| **Simulation** | SIM | Levande värld utan press |
| **Progression** | PRG | Stjärnor, byggdelar, verklighet före digitalt |
| **Pet** | PET | Husdjur utan skuld eller död |
| **Accessibility** | ACC | Färg, rörelse, reaktionstid |
| **Performance** | PERF | 60 fps, osynlig streaming |
| **Architecture** | ARC | Motor, data, återanvändning |
| **AI** | AI | Agentbeteende vid implementation |

---

## Spatial Contracts (SPC)

### SPC-001 — Every room has an entrance

**Varje rum har en tydlig ingång.**

Barnet ska alltid veta *var de kom in*. Ingen teleport utan fysisk eller visuell dörr, port, stig eller passage. Ingången är en del av rumslig kontinuitet (World Bible Part I, Physical Continuity).

### SPC-002 — Physical connections, not menus

**Fysiska förbindelser krävs. Menyer ersätter aldrig navigation.**

Rum kopplas via `navigation.edges[]` (LWES Part IX) — inte via app-menyer, hub-listor eller osynliga länkar. Föräldragated systemmeny (PIN) listar inte världens rum som app-sektioner (World Bible §1).

### SPC-003 — Landmark required

**Minst ett landmärke per rum (`count: 1`).**

Ett igenkännbart visuellt ankare — *"där är jag"*. Samma landmärke på väg tillbaka. Landmärket är inte dekor; det orienterar barnet (World Bible Emotional Geography).

### SPC-004 — Minimum empty space

**Minst 30 % tomt utrymme (`min_empty_space_percent: 30`).**

Fantasi kräver tomrum (Constitution § Imagination). Rum får inte vara fullproppade med props, hotspots och UI. Tomhet är en funktion — inte brist på budget.

### SPC-005 — Build slots pre-exist visually

**Byggplatser syns innan de fylls.**

`build_slots[]` ska vara visuellt närvarande som tomma platser, fundament eller markerade zoner — inte magiskt materialisera vid unlock. Barnet ska kunna *förutse* var världen kan växa (World Bible Buildable Areas).

---

## Interaction Contracts (INC)

### INC-001 — LWES pipeline only

**Alla interaktioner går via LWES interaction pipeline.**

Inga ad-hoc `onclick`-flöden utanför `interaction-runtime.js`. Typer begränsade till LWES §22. Director gate (Appendix I) gäller alla förslag.

### INC-002 — No direct rendering hacks

**Interaktioner modifierar inte rendering direkt.**

Hotspot → interaction beat → emotional runtime → rendering pass. Inga `element.style.left = …` i interaktionshanterare. Separation of concerns (LWES Part II).

### INC-003 — Ends in calm

**Varje interaktion slutar i lugn.**

Efter klick, öppning eller upptäckt återgår scenen till calmness_target — inte ny hype, inte kedjad animation. Firande ≤2s, skippbart (G-08, MO-03).

### INC-004 — No punishment surprises

**Inga straff-överraskningar.**

Inget "du missade", inget plötsligt mörker, inget skrämsel för frånvaro. Comfort-pelaren (Constitution § Comfort, POS 00A).

### INC-005 — Understandable without reading

**Förståeligt utan att läsa text.**

Barn 4–10 ska förstå vad som är klickbart och vad som händer via form, rörelse och ljud — inte instruktionstext. Text är komplement, inte gate.

---

## Progression Contracts (PRG)

> **POS R-02:** Stjärnor är inte köpbara. WPC utökar detta till världsbyggande.

### PRG-001 — Stars are not spent on building

**Stjärnor spenderas inte på byggande i Min värld.**

Stjärnor är **bevis** på verklig handling (Constitution Golden Rule 1). De är bränsle i motivation stack — inte valuta i en byggshop. Världen växer via byggdelar som *speglar* stjärnor, inte via att "spendera" stjärnor i världen.

### PRG-002 — Build parts not purchasable

**Byggdelar kan inte köpas.**

Ingen IAP, inget köp med stjärnor, inget pay-to-skip för byggdelar. Progression kommer från verkliga aktiviteter → WDB progression nodes. **R-02 gäller hela ekonomin** — inget köpbart som ersätter verklighet.

### PRG-003 — Progress always visible

**Framsteg är alltid synligt.**

Barnet ska se vad som växt, vad som väntar, vad som hör hemma — utan dolda grind-listor. Synlighet ≠ achievement-vägg; det är *"jag har bott här"* (Constitution § World remembers).

### PRG-004 — Meaningful things never disappear

**Meningsfulla saker försvinner inte.**

Placerade föremål, troféer, minnen, namngivna husdjur — permanent. Ingen seasonal wipe av personlig historia. Undo av misstag ≠ försvinnande av mening.

### PRG-005 — Real life precedes digital

**Verkligheten före det digitala.**

Aktiviteter → Stjärnor → Byggdelar → Världen växer. Aldrig tvärtom (G-01, Constitution Golden Rule 1). Digital firande utan verklig handling är identitetsbedrägeri.

---

## Memory Contracts (MEM)

### MEM-001 — Named pets keep names

**Namngivna husdjur förlorar aldrig sina namn.**

Barnets val av namn är permanent minne. Ingen reset, ingen "ditt husdjur heter nu X igen".

### MEM-002 — Memories are permanent

**Minnen är permanenta.**

Troféer, foton, säsongsminnen, story anchors — ackumuleras. Världen glömmer inte barnets historia.

### MEM-003 — World remembers meaningful events

**Världen minns meningsfulla händelser.**

Ritualer, milstolpar, första gången — sparas i world state (`ARC-005`). Inte som quest log — som *spår av ett liv*.

### MEM-004 — Child never loses meaningful progress

**Barnet förlorar aldrig meningsfullt framsteg.**

Ingen nedgradering, ingen "du var borta så vi nollställde". Frånvaro = välkomnande (Comfort), inte straff.

---

## Simulation Contracts (SIM)

### SIM-001 — World always breathing

**Världen andas alltid.**

Ambient rörelse, ljus, ljud — även när barnet inte interagerar. `ambient-engine.js` + Director. Inte statisk bakgrundsbild.

### SIM-002 — World does not pressure

**Världen pressar inte spelaren.**

Inga timers, inga "kom tillbaka om X", inga urgency-indikatorer. Child owns the pace (Constitution Golden Rule 2).

### SIM-003 — Weather does not affect difficulty

**Väder påverkar inte svårighet.**

Väder är atmosfär — inte gameplay modifier. Regn gör inte rutiner svårare eller låser innehåll.

### SIM-004 — No randomness for its own sake

**Ingen slump för slumps skull.**

Varje variation har narrativ eller ambient syfte. Director budget — inte loot box-känsla.

---

## Pet Contracts (PET)

### PET-001 — Pets cannot die

**Husdjur kan inte dö.**

Ingen Tamagotchi-död, ingen "ditt husdjur saknar dig så mycket att det dog".

### PET-002 — Pets cannot become sick

**Husdjur kan inte bli sjuka.**

Ingen vård-mätare, ingen skuld för frånvaro. Husdjur är tröst — inte ansvar.

### PET-003 — Pets create no guilt

**Husdjur skapar inte skuld.**

Ingen dialog som "du har inte besökt mig på tre dagar". PET-004 gäller istället: glad att se barnet, alltid.

### PET-004 — Happy to see child

**Husdjur är glada att se barnet.**

Välkomnande animation/ljud vid ankomst — aldrig sura eller passiva straff.

### PET-005 — No personality via statistics

**Ingen personlighet via dold statistik.**

Husdjurets "humör" är uttryckt i animation — inte osynliga meters som driver beteende barnet inte förstår.

---

## Audio Contracts (AUD)

### AUD-001 — Sound requires physical source

**Ljud kräver fysisk källa.**

Fågel → fågel, dörr → dörr, vind → träd. Inga disembodied UI-ljud i världen. Se [AUDIO_BIBLE.md](../../.ai/product/bibles/AUDIO_BIBLE.md).

### AUD-002 — Silence is valid

**Tystnad är giltigt.**

Inte varje rum behöver musik eller ambient. `silence_min_after_hero_ms` i Director. Tystnad = trygghet, inte tomhet.

### AUD-003 — Music does not replace emotion

**Musik ersätter inte emotion.**

Ljus, form och animation bär känslan. Musik förstärker — dominerar inte. Ingen generisk "happy loop" som maskerar flat design.

---

## Animation Contracts (ANI)

### ANI-001 — Motion for existence, not show

**Rörelse för existens — inte för show.**

Ambient rörelse bevisar att världen lever. Inte flashiga effekter för att dölja statisk scen. Se [ANIMATION_BIBLE.md](../../.ai/product/bibles/ANIMATION_BIBLE.md).

### ANI-002 — Believable weight

**Trovärdig vikt.**

Objekt faller, svänger och stannar med fysisk trovärdighet — inom 2.5D-stil. Ingen floaty UI-känsla i världsobjekt.

### ANI-003 — No snapping

**Ingen snapping till position.**

Mjuka övergångar. `snapping_allowed: false` — position changes via easing eller fysik-liknande interpolation.

### ANI-004 — Easing required

**Easing krävs.**

Alla rörelser har in/out curves — inte linear instant. `prefers-reduced-motion` ger statisk fallback (ACC-002), inte hård snap.

---

## Art / Visual Contracts (ART)

### ART-001 — No decorative-only assets

**Inga rent dekorativa assets utan syfte.**

Varje prop stärker minst en av fem känslor (LWES §0 filter). Ingen "fill the corner" clutter. Se [ART_BIBLE.md](../../.ai/product/ART_BIBLE.md).

### ART-002 — Lighting defines emotion

**Ljus definierar emotion.**

Primär känsla per rum uttrycks via ljuskällor — inte bara färgfilter. `lighting_contract` i RBS.

### ART-003 — Materials consistent

**Material konsekventa.**

Samma trä, sten, tyg ser likadant ut i hela världen. Nordic warm diorama 2.5D — inte mixad stil per rum.

### ART-004 — No perspective changes

**Inga perspektivbyten.**

Fast 2.5D-kamera genom hela Min värld. Ingen första-person, ingen isometrisk växling per rum.

---

## Accessibility Contracts (ACC)

### ACC-001 — Essential not color-dependent

**Väsentligt information beror inte på färg.**

Kontrast AA (POS 03). Hotspots igenkännbara via form + rörelse — inte bara grön/röd.

### ACC-002 — Reduced motion supported

**Reduced motion stöds.**

`prefers-reduced-motion` → statiska frames, inga partiklar, inga panorer. MO-03, 03B.

### ACC-003 — No reaction speed dependency

**Inget väsentligt beror på reaktionshastighet.**

Inga quick-time events, inga tidsbegränsade klick i världen. Barn bestämmer tempo.

---

## Performance Contracts (PERF)

### PERF-001 — Target 60 fps

**Mål: 60 fps på mid-range Android.**

Transform/opacity animationer. Ingen celebration som blockerar skolutgång (060-mobile-first).

### PERF-002 — No visible loading

**Ingen synlig laddning i världen.**

Inga spinners, inga "laddar rum…" i barnvy. First paint <200ms target (RBS `performance_budget`).

### PERF-003 — Streaming invisible

**Streaming är osynligt.**

Asset pipeline laddar i bakgrunden. Barnet ser färdig scen — inte pop-in av texturer.

### PERF-004 — Optimization never changes gameplay

**Optimering ändrar aldrig gameplay.**

LOD, culling, reduced quality — samma interaktioner och utfall. Perf ≠ feature cut.

---

## Architecture Contracts (ARC)

### ARC-001 — No room-specific engine logic

**Ingen rumspecifik motorlogik.**

Förbjudet: `if (sceneId === 'garden')` i `public/js/living-world/` (LWES Appendix). Rumsskillnad = data (pack/scene JSON), inte kodgrenar.

### ARC-002 — No duplicated systems

**Inga duplicerade system.**

En event bus, en interaction runtime, en navigation runtime. DRY — underhållbart på 10 år.

### ARC-003 — Reusable becomes component

**Återanvändbart blir komponent.**

Andra gången samma beteende uppstår → extrahera till `living-world/` modul — inte copy-paste.

### ARC-004 — Configurable becomes data

**Konfigurerbart blir data.**

Knappar, hotspots, beats, ambient IDs — i pack YAML/JSON — inte hårdkodade konstanter.

### ARC-005 — Persistent in world state

**Meningsfull state persisteras i world state.**

Placeringar, minnen, unlocks — `db/child-world-state.js` + `/api/me/world/*`. Inte sessionStorage som sanning.

---

## AI Contracts (AI)

> För AI-agenter och Cursor-sessioner som implementerar Min värld. Se även [AODS.md](../../.ai/product/AODS.md).

### AI-001 — Do not invent mechanics

**Uppfinn inte mekaniker.**

Nya gameplay-loopar kräver GDB + ADR. Implementation följer befintliga LWES-typer.

### AI-002 — Do not invent interaction types

**Uppfinn inte interaktionstyper.**

LWES §22 är slutlistan. Ny typ = LWES ADR — inte agent-beslut.

### AI-003 — Do not create new emotions

**Skapa inte nya känslomål.**

Fem pelare (Capability, Ownership, Comfort, Curiosity, Imagination) är slutlistan. Ingen "sixth feeling" utan Constitution ADR.

### AI-004 — Follow LWES before implement

**Läs LWES före implementation.**

Authority chain: POS → PCB → World Constitution → LWES → WPC → RBS → kod.

### AI-005 — Stop on doc conflict

**Vid dokumentkonflikt — stoppa för människa.**

Gissa inte. Öppna fråga i PR. POS vinner över WPC vid direkt konflikt — eskalera till ADR.

---

## Production Contracts Definition of Done

Ett rum, en entitet eller en feature är **inte redo för implementation** förrän:

- [ ] Alla tillämpliga WPC-kontrakt granskade och listade i `wpc_compliance.contracts_reviewed[]` (room YAML)
- [ ] `npm run check:wpc` grön
- [ ] [`WPC-ROOM-CHECKLIST.md`](./WPC-ROOM-CHECKLIST.md) ifylld (rum)
- [ ] Inga ADR-undantag utan post i `wpc_compliance.adr_exceptions[]`
- [ ] RBS YAML (`docs/world/data/*.yaml`) komplett — inga utelämnade sektioner
- [ ] LWES Part X + WDB applicable WQS passerade vid ship (runtime gate — separat från WPC pre-code gate)
- [ ] Self-review (180) inkluderar WPC-kategori för berörd yta

**WPC = pre-code. WQS = ship.** Båda krävs.

---

## Final Principle

> **Om det känns som ett spel — det är fel.**  
> **Om det känns som hem — det är rätt.**  
> **Om du är osäker — läs WPC, stoppa, fråga.**

---

## Cross-references

| Dokument | Relation till WPC |
|----------|-------------------|
| [World Constitution](../../.ai/product/bibles/WORLD_BIBLE.md) §1 | Identitet — WPC operationaliserar Constitution i produktionskontrakt |
| [LWES](../../.ai/product/LIVING_WORLD_ENGINE_SPEC.md) | Runtime — WPC är pre-code; LWES är how |
| [POS R-02, G-01](../../.cursor/rules/010-product.mdc) | Stjärnor ej köpbara; verklighet före firande — PRG-001/002 |
| [ART_BIBLE.md](../../.ai/product/ART_BIBLE.md) | Visuellt — ART-* kontrakt kompletterar |
| [DOCUMENTATION_MAP.md](../../.ai/product/DOCUMENTATION_MAP.md) | Läsordning |
| [`wpc.contracts.yaml`](./wpc.contracts.yaml) | Maskinläsbar executable spec |
| [`_TEMPLATE.room.yaml`](./_TEMPLATE.room.yaml) | RBS — underordnad WPC |

---

*WPC v1.0 — 52 contracts — canonical pre-implementation gate for Min värld.*
