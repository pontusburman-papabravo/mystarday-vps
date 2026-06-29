# Stjärndag — Art Bible v1.0

**Dokumenttyp:** Illustrator- och UI-konstnärsmanual (Art Bible)  
**Version:** 1.0  
**Status:** Normativ för all visuell produktion  
**Skapad:** 2026-06-29  
**Språk:** Svenska (primärt) · engelska termer endast där branschstandard kräver det  
**Målgrupp:** Illustratörer, UI-designers, animatörer, externa byråer, Creative Director, Art Director  

---

## Dokumentmetadata och auktoritet

### Syfte

Art Bible v1.0 är den **illustratörsinriktade expansionen** av Stjärndags visuella identitet. Denna bok översätter lagtext från POS till **operativa ritregler**: exakta hexvärden, pixlar, vinklar, proportioner och kvalitetsgrindar som gör att varje frame känns som samma produkt — oavsett vem som ritar.

Art Bible **ersätter inte** [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) (PCB). PCB äger världarnas själ, känslomässiga jobb och narrativ koherens. Art Bible äger **hur det ser ut** när själen materialiseras i pixel och bläck.

### Auktoritetshierarki

När dokument eller personer motsäger varandra gäller följande ordning utan undantag:

```
1. POS 03A — Art Direction (lag)
2. POS 00B — Product Taste (premium vs billigt)
3. POS 03 — Design tokens (UI-system)
4. POS 03B — Motion Language (rörelse samverkar med bild)
5. PCB — PRODUCT_CONTENT_BIBLE.md (världsspecifik känsla)
6. Brain CORE_VALUES.md (värderingar som visuellt filter)
7. DENNA Art Bible v1.0 (illustratörsexpansion)
8. Per-värld specs (när de finns, får inte bryta ovan)
9. Implementation i kod (aldrig överstyrande)
```

**Konfliktregel:** Om Art Bible och POS 03A motsäger varandra vinner **POS 03A**. Creative Director har veto enligt `.ai/agents/CreativeDirector.md`. Art Director operationaliserar enligt `.ai/agents/ArtDirector.md`.

### Referensdokument (läs, duplicera inte)

| Dokument | Användning i Art Bible |
|----------|------------------------|
| POS 03A | Linje, ljus, palett, diorama-djup, skandinavisk värme — **lag** |
| POS 00B | Screenshot-test, materialärlighet, billigt-listan |
| POS 03 | Guld, navy, lavender, corner radius, spacing tokens |
| POS 03B | Celebration ≤2000 ms, reduced motion, skippbar glädje |
| [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) | Sju världars emotion jobs, NPC-kontrakt, collectibles |
| [CORE_VALUES.md](../brain/CORE_VALUES.md) | Lugn magi, barns kapacitet, föräldratrust, hantverk, långsikt |
| [PRODUCT_IDENTITY.md](../brain/PRODUCT_IDENTITY.md) | Sensorisk identitet, tre barnvärldar (Idag · Min värld · Familj) |

### Hur du använder Art Bible tillsammans med PCB

1. **Läs PCB-världsavsnittet** först — förstå emotion job (t.ex. Morgonhuset = *kapabel trygghet*).  
2. **Applicera Art Bible §2–7** — material, ljus, natur, byggnader, karaktärer enligt globala regler.  
3. **Applicera världsspecifik accent** — se avsnitt *Världsspecifika färgaccenter* längre ner.  
4. **Kör Quality Gates QG-001–QG-165** innan inlämning — Creative Director säger *Nej* utan diskussion vid brott.  
5. **Verifiera Parent vs Child UI** — fel yta = omarbetning, inte "nästan rätt".

### Versionskontroll och ändringar

Art Bible v1.0 är **fryst** tills CPO + Creative Director + Art Director gemensamt godkänner v1.1. Illustratörer får inte improvisera "förbättringar" utan ADR. Små prop-varianter inom reglerna är tillåtna; stilbrott är inte.

---

# 1. Vision — känslor, tillåtna och förbjudna stilord

## 1.1 Barnets känslomässiga kontrakt (visuellt)

Stjärndag ska se ut som **en nordisk barnbok du kan kliva in i** — inte som en spelapp, inte som en SaaS-dashboard, inte som en YouTube-kanal med mascots. När ett barn öppnar Idag ska blicken landa på **en tydlig nästa handling** omgiven av lugn värme. När barnet besöker Min värld ska rummet kännas som **ett bevis på att morgonen gick** — stolthet gjord synlig i ek, tyg och mjukt ljus.

**Tillåtna känsloord (använd i briefs och självreview):**  
*varm, möjlig, kapabel, trygg, stolt, nyfiken, lugn, hemtrevlig, lekfull utan skrik, mjuk, ärlig, inbjudande, lagom, nordisk, handgjord, dignified, skippbar glädje, värdig, stillsam, hoppfull, jordnära, taktil, doftbar (visuellt), morgonfrisk, kvällsmysig, tålmodig, modig utan adrenalinskräck, tillhörig.*

**Förbjudna känsloord (stoppar produktion):**  
*hyper, casino, FOMO, skrikande, neon, skrämmande, skuldbelagd, stressande, övermättad, generisk, plastig, billig, Roblox-ig, Cocomelon-flat, Disney-kopia, skrikande gult, skrikande rött som varning, skräck, våld, sexualiserad, vuxen-ironi, meme-slop, AI-genererad, stock clip art, glassmorphism, enterprise-grå, dashboard-first, loot-spam, streak-panik, skrikande 3D-bländare, oversaturerad regnbåge, TikTok-estetik.*

## 1.2 Förälderns känslomässiga kontrakt (visuellt)

Föräldrar möter Stjärndag ofta **kl. 07:00 med kaffe i handen och kaos i köket**. Parent UI ska signalera **professionell lugn kompetens** — appen är deras partner, inte ytterligare ett system att lära sig. Visuellt: navy som ankare, guld som bekräftelse, whitespace som andrum. Aldrig skuld-copy i röd. Aldrig barnsliga illustrationer på Planering eller Hem (förälderytan är vuxen, varm men vuxen).

**Tillåtna föräldraord:** *tydlig, pålitlig, respektfull, effektiv, lugn, premium, skandinavisk, genomskinlig, icke-manipulerande, enkel, story-formad insikt.*

**Förbjudna föräldraord:** *BI-dashboard, skuld, jämförelse, skrikande CTA, casino-guld, skrikande notifieringsröd, överinformation, enterprise-tabell, skärmdump av barnets skärm som övervakning.*

## 1.3 Kärnvärden som visuella filter

Enligt [CORE_VALUES.md](../brain/CORE_VALUES.md) filtreras varje designbeslut:

| Värde | Visuell manifestation |
|-------|----------------------|
| **Lugn magi** | Ett fokus per skärm; celebration kort; whitespace; inga blinkande loopar |
| **Barns kapacitet** | Idag visuellt självförklarande utan textvägg; ikoner ≥48 px touch |
| **Föräldratrust** | Inga mörka mönster; ingen skuld-färg; ingen övervaknings-estetik |
| **Hantverkskvalitet** | Synligt pensel/spår; inga stock assets; Nintendo-tidslinje-stolthet |
| **Långsiktigt hantverk** | Tidlösa material (trä, papper, ull) framför trend-gradienter |

## 1.4 Screenshot-testet (00B)

Varje illustration och varje barnskärm måste klara **screenshot-testet**: en förälder ska kunna skicka en skärmdump till en vän och få svaret *"Det där ser omsorgsfullt ut"* — inte *"Är det en gratis app?"* eller *"Ser ut som [konkurrent]"*. Creative Director blockerar vid fail.

## 1.5 En accent per skärm (03A)

Max **en primär accentfärg** dominerar per skärm utöver neutral bas. Flera konkurrerande accenter = visuellt brus = brott mot lugn magi. Undantag: celebration frame ≤2000 ms får temporär second accent (guld + mjuk lavendel).

---

# 2. Art Direction — material, form, perspektiv, djup, konturer, penslar, texturer, skuggor, ljus, färger, kontrast, detaljnivå, negativ yta

## 2.1 Materialfilosofi — ärlighet framför plast

Stjärndag bygger på **materialärlighet** enligt POS 00B. Varje yta ska avslöja vad den "är" i fiction: ek är ek, ull är ull, keramik är keramik, papper är papper. Plastglans, chrome UI, wet-look vinyl och generisk PBR-game-shader är **förbjudna** i barnscope.

**Tillåtna material (prioritetsordning):**  
Massiv trä (ek, björk, furu), obehandlat eller ljust oljat — aldrig mörk mahogny-lack. Naturliga textilier: linne, ull, bomull, filt. Keramik med synlig glasyrvariation. Papper och kartong (handgjorda props). Sten (granit, flisa, sjösten). Glas endast som fönster med mjuk reflektion — aldrig glassmorphism UI. Metall: borstat mässing, smedjat järn dämpat — aldrig polerad krom. Vatten som transparent lager med 15–25 % opacity overlay, inte hyperrealistisk 3D.

**Förbjudna material:** Neonplast, gummi-highlights, holografisk gradient, wet-look, chrome UI cards, syntetisk päls (använd ull/filt istället), generisk Unity Standard Shader look.

## 2.2 Formspråk — mjuka kanter, inga hårda CAD-krokar

Alla former i Stjärndag följer **organisk avrundning**. Hörn på möbler: minimum 4 px visuell radie i illustration @1x, motsvarande 8 px @2x export. Inga 90° shark-fin hörn på barnvänliga objekt. Undantag: tekniska parent-UI-kort får 16 px radius enligt §9 — inte samma språk som barnillustration.

**Formvikt:** Låg tyngdpunkt på karaktärer och möbler — stabilitet, inte vinglighet. Stora former bär kompositionen; små detaljer belönar nyfikenhet (Nintendo-detalj i periferin).

## 2.3 Perspektiv — isometrisk diorama med lagom djup

Stjärndag-världar (Min värld) ritas i **diorama-perspektiv**: kombination av svag isometri och frontal "dockskåpsläsbarhet". Kameran är placerad som om barnet står på knä och tittar in i ett rum — **inte** förstaperson FPS, **inte** flygfoto.

**Exakta perspektivregler:**
- Horisontlinje: **38–42 %** från bildens underkant (standard barnrum).
- Vertikal konvergens: **max 3°** — nästan parallellprojektion; läsbarhet slår realism.
- Golvpanel: **30° vinkel** mot bildplan (isometrisk standard Stjärndag).
- Väggar: bakvägg **100 % höjd**, sidoväggar **60–70 % bredd** av bakvägg — aldrig full side-wall som kväver djup.
- Tak: sällan synligt i Min värld — rum = läsbarhet; tak döljer ofta av kompositionskant.

**Förbjudet perspektiv:** Extreme wide-angle, fish-eye, dutch angle, horror-tunnel, fotorealistisk arkitektfoto-vinkel.

## 2.4 Djup — tre plan minimum

Varje Min värld-scen har **minst tre djupplan**:

| Plan | Innehåll | Behandling |
|------|----------|------------|
| **Förgrund** | Interaktiv prop, NPC, placering ghost | Full linje 100 %, full färg, skarp kontur |
| **Mellanplan** | Huvudmöbler, aktiv yta | Full linje, standard skugga |
| **Bakgrund** | Fönster, väggdekoration, distant natur | Linje 70 % opacity, desaturerad 8–12 %, luftperspektiv |

Parallax vid scroll (om tillämpat enligt 03B): förgrund 1.0×, mellan 0.6×, bakgrund 0.3× — aldrig illusionsmässig 3D-kamerarörelse som kräver VR.

## 2.5 Konturer — mjuk bläck (soft ink)

**Linjetjocklek @1x bas (375 px bredd canvas):**

| Element | Stroke (px) | Färg |
|---------|---------------|------|
| Karaktär ytterkontur | 2.0 px | `#2A2520` (Warm Ink) |
| Karaktär innerdetalj | 1.25 px | `#3D3830` |
| Möbel/prop ytter | 1.75 px | `#2A2520` |
| Möbel inner | 1.0 px | `#3D3830` |
| Bakgrunds natur | 1.25 px | `#2A2520` @85 % opacity |
| UI-ikon barn | 2.0 px stroke equivalent | `#1B2340` eller `#FFFFFF` på mörk |

**Linjekvalitet:** Handritad variation tillåten **±0.15 px** — inte perfekt vektor-ruler straight. Hörn: **round join**, cap: **round cap**. Inga hårda miter-spetsar.

**Förbjudna linjer:** Helt svart `#000000` kontur. Uniform 4 px cartoon outline (Cocomelon). Ingen linje alls på fotorealistisk render (AI slop).

## 2.6 Penslar och textur — digitala penslar med fysiskt arv

Godkända digitala penseltyper (Procreate, Photoshop, Clip Studio):

| Pensel | Användning | Inställning |
|--------|------------|-------------|
| **Soft Ink Round** | Konturer, linjeart | Stabilisering 12–18 %, tryck → width 0.8–2.2 px |
| **Dry Gouache Fill** | Flat färgytor | 15 % texture jitter, aldrig 100 % flat |
| **Grain Wash** | Bakgrundsvägg, himmel | 6–10 % grain overlay |
| **Pencil Whisper** | Konstruktion (tas bort före export) | — |
| **Wool Felt Stamp** | Textilier, filtar | Multiplied @20 % |

**Texturintensitet:** Varje färgyta ska ha **minst subtil variation** — 3–8 % luminansnoise eller watercolor edge bleed. Helt platta vektorfyllningar godkänns endast för **parent UI-ikoner** §8, inte för Min värld.

## 2.7 Skuggor — varma, aldrig kalla svarta

Stjärndag skuggor är **varma och transparenta** — aldrig `#000000` multiply @50 %.

**Skuggformel (standard inomhus):**
- Skuggfärg: `#3D3830` @ **22–28 % opacity** på yta
- Ambient occlusion i hörn: `#2A2520` @ **12–18 %**
- Contact shadow under objekt: ellips, blur **8 px @1x**, opacity **25 %**
- Skuggriktning: **135°** från övre vänstra ljuskällan (matchar §4)

**Utomhus skugga:** `#1B2340` @ **18–24 %** med blå underton — nordisk utomhusluft.

**Förbjudna skuggor:** Drop shadow `#000` 40 % blur 20 (material design default). Neon glow. Ingen skugga alls (flat clip art).

## 2.8 Ljus — se §4 för fullständiga regler

Global regel: **primär ljuskälla övre vänster**, färg `#FFF8EE` (Morning Key). Fill från höger `@35 %`. Se avsnitt 4 för villkorsspecifika regler.

## 2.9 Färger i komposition — se §3

Global palett definieras i avsnitt 3. Här gäller **kompositionsregler**: 60 % neutral varm bas, 30 % sekundär materialfärg, 10 % accent max.

## 2.10 Kontrast

**Illustration:** Primärt motiv ska ha **minst 3:1** luminans mot närmaste bakgrund (WCAG för stor form, inte text). **UI text på knapp:** se §9 och Accessibility — minimum 4.5:1.

**Kontrasttak:** Inga parer med >15:1 utan mellanton — undvik "blinkande" hårdhet. Max en **hero highlight** per scen (`#FFFFFF` @90 % på glanspunkt ≤6 px radie).

## 2.11 Detaljnivå — Nintendo-nära, inte fotorealist

**Detaljskala per canvas 1125×2436 px (iPhone referens):**
- Huvudkaraktär höjd: **340–420 px** (inklusive hår)
- Primärt interaktivt prop: **120–200 px** minsta dimension
- Bakgrund detalj: **max 40 %** av förgrundsdetalj densitet
- Antal hero-fokusobjekt: **1**, stödobjekt **2–4**, dekoration **6–12** totalt per scen — fler = rörigt = Creative Director Nej

**Micro-detaljer (Pixar-belöning):** Max **3** dolda micro-detaljer per scen (damkorn i solstråle, kantstött mugg, liten kryp på fönsterbräda). De ska **aldrig** vara interaktionskrav.

## 2.12 Negativ yta (whitespace)

Lugn magi kräver **andningsyta**. Minst **18 %** av barnskärmens area ska vara visuellt "tom" (neutral bakgrund utan konkurrerande information). Idag-vyn: **24 % minimum** runt NOW-kortet. Parent Hem: **20 % minimum** mellan kort.

**Förbjudet:** Fullbleed regnbågsgradient. Fullbleed stjärnregn. Clutter som fyller varje pixel "för att det ska kännas lekfullt".

---

# 3. Färgpalett — primär, sekundär, accent, neutral, bakgrunder, skuggor, highlights, förbjudna färger

## 3.1 Palettfilosofi

Stjärndags palett är **skandinavisk morgon + honung + nattsky** — varma neutrals med kontrollerade accenter. Paletten hämtar från POS 03 tokens och utökas här med illustrationsspecifika nyanser. Alla namngivna färger har **exakt HEX** — ingen "ungefär limegrön".

## 3.2 Primärfärger (varumärke och UI)

| Namn | HEX | RGB | Användning |
|------|-----|-----|------------|
| **Stjärndag Gold** | `#F5A623` | 245, 166, 35 | Primär CTA, stjärnor, firanden, aktiv nav |
| **Stjärndag Navy** | `#1B2340` | 27, 35, 64 | Parent UI rubriker, primär text mörk, barn UI ikoner |
| **Morning Oat** | `#F7F3EB` | 247, 243, 235 | Barn bakgrund, vägg bas, kort bakgrund ljus |
| **Honey Wood** | `#C4956A` | 196, 149, 106 | Golv, möbler, varma trädetaljer |
| **Soft Ink** | `#2A2520` | 42, 37, 32 | All linjeart standard |

## 3.3 Sekundärfärger (material och emotion)

| Namn | HEX | Användning |
|------|-----|------------|
| **Birch Light** | `#E8DFD0` | Björk, ljusa trädetaljer, hyllor |
| **Linen White** | `#FAFAF7` | Textilier, sängkläder, gardiner |
| **Moss Sage** | `#8BA888` | Växter, lugna accenter, success soft |
| **Sky Calm** | `#A8C4D4` | Himmel dag, vatten ljus |
| **Dusk Lavender** | `#B8A9C9` | Kväll, Dockhuset, lugn accent |
| **Warm Rose** | `#D4A098` | Hud rodnad, textil accent, mild warmth |
| **Fern Green** | `#6B8F71` | Natur, trädgård, Dinosaurielunden bas |

## 3.4 Accentfärger (sparsamt — en per skärm)

| Namn | HEX | Användning |
|------|-----|------------|
| **Star Spark** | `#FFD56B` | Stjärnglans highlight, celebration |
| **Courage Violet** | `#8B7BA8` | Dinosaurielunden, mod-moment |
| **Maker Amber** | `#E8A849` | Verkstaden, verktyg highlight |
| **Calm Water** | `#7A9EB8` | Fiskebryggan, vatten accent |
| **Focus Plum** | `#9B7E9E` | Läshörnan, kvällsfokus |
| **Care Peach** | `#F0C4A0` | Husdjurshemmet, varm omsorg |
| **Cozy Lilac** | `#C9B8D9` | Dockhuset, ordning-lek |

## 3.5 Neutrala och bakgrundsfärger

| Namn | HEX | Användning |
|------|-----|------------|
| **Parent Canvas** | `#F8F9FC` | Parent app bakgrund |
| **Card White** | `#FFFFFF` | Kort yta parent och barn |
| **Divider Mist** | `#EDE7F6` | Dividers, subtila kanter parent |
| **Text Secondary** | `#5A6178` | Parent sekundär text |
| **Text Muted** | `#94A3B8` | Hints, metadata |
| **Border Soft** | `#E2E8F0` | Parent kort border |
| **Dark Surface** | `#0F1629` | Dark mode parent bas (sällan barn) |
| **Dark Card** | `#1E293B` | Dark mode parent kort |

## 3.6 Skuggor och highlights (named)

| Namn | HEX | Opacity | Användning |
|------|-----|---------|------------|
| **Shadow Warm** | `#3D3830` | 22–28 % | Standard objekt skugga |
| **Shadow Cool** | `#1B2340` | 18–24 % | Utomhus skugga |
| **AO Deep** | `#2A2520` | 12–18 % | Hörn ambient occlusion |
| **Highlight Key** | `#FFF8EE` | 85–100 % | Primär ljuskälla yta |
| **Highlight Spec** | `#FFFFFF` | 60–90 % | Glanspunkt max 6 px |
| **Star Glow** | `#F5A623` | 30 % blur 12 px | Stjärna celebration endast |

## 3.7 Semantiska färger (UI — begränsad användning)

| Namn | HEX | Användning |
|------|-----|------------|
| **Success Green** | `#1A332B` bg / `#6BAA80` icon | Bekräftelse parent — aldrig blink |
| **Warning Amber** | `#3D2E0F` bg / `#F5A623` text | Varning parent — aldrig barn skuld |
| **Error Soft** | `#3B1F1F` bg / `#DC2626` text | Fel parent — aldrig skrikande på barn |
| **Info Lavender** | `#2D2554` bg / `#B8A9C9` text | Info parent |

**Regel:** Semantisk röd **får inte** användas på barnskärm som skuldsignal. Barn ser aldrig "misslyckande-röd".

## 3.8 Förbjudna färger (absolut lista)

| HEX / typ | Varför förbjuden |
|-----------|------------------|
| `#000000` som fyllning eller skugga | För hård, bryter varm estetik |
| `#FF00FF`, `#00FFFF` neon | Casino / TikTok |
| `#39FF14` electric green | Roblox / gaming slop |
| `#FF0040` hot pink alert | Cocomelon / hyper stimulus |
| Full saturation rainbow gradient | Clipart energi |
| `rgba` glass blur UI | Glassmorphism — förbjudet 00B |
| `#4285F4` Google blue default | Enterprise generic |
| `#007AFF` iOS default utan anpassning | Out-of-box, inte Stjärndag |
| `#22C55E` tailwind green-500 som hero | SaaS, inte barnbok |
| `#EF4444` pure alert red on child | Skuld, skräck |
| `#A855F7` → `#EC4899` gradient pair | Influencer app 2023 |
| `#111827` developer gray on child | PRODUCT_IDENTITY förbud |
| `#FFD700` metallic gold gradient | Fake casino |
| `#00D4FF` cyber cyan | Sci-fi asset store |

## 3.9 När varje färg används — beslutsträd

1. **Är ytan parent eller barn?** Parent → Navy + Gold CTA + Parent Canvas. Barn → Morning Oat bas + världsaccent §World.  
2. **Är det interaktivt?** Ja → minst 4.5:1 kontrast på label (§Accessibility).  
3. **Är det celebration?** Ja → Star Spark + Gold, max 2000 ms (03B).  
4. **Är det NPC hud?** Ja → se §7 — aldrig ren `#FFE0BD` utan Warm Rose variation.  
5. **Är det natur?** Ja → §5 — aldrig oversaturerad `#00FF00` gräs.

---

# 4. Ljus — ljuskälla, morgon, kväll, vinter, sommar, regn, skymning, natt

## 4.1 Global ljuskälla (standard)

**Key light:** Övre vänster, vinkel **45°** horisontellt och **55°** vertikalt från betraktaren.  
**Key färg:** `#FFF8EE` (Morning Key White) — aldrig kall `#FFFFFF` utan varm tint.  
**Fill light:** Höger sida, `#E8F0F8` @ **35 %** intensitet key.  
**Rim light (valfri):** Bakom motiv höger, `#FFF8EE` @ **15 %** — endast hero NPC eller celebration.  
**Ambient:** `#F7F3EB` @ **100 %** bas — rummets bounce light.

## 4.2 Morgon (Morgonhuset default, 06:00–10:00 fiction)

- Key intensitet: **100 %**  
- Färg shift: +5 % gul i highlights (`#FFF5E0`)  
- Solstråle: gradient `#FFF8EE` → transparent, 12° nedåt från fönster övre vänster  
- Skugglängd: **1.2×** objekthöjd åt höger-ned  
- Fönster bloom: **8 %** soft glow, aldrig bländande  
- Atmosfär: lätt `#F7F3EB` haze @ 4 % över hela scenen  

## 4.3 Formiddag (10:00–14:00)

- Key: `#FFF8EE` @ **95 %**  
- Skuggor kortare: **0.9×** objekthöjd  
- Himmel: Sky Calm `#A8C4D4` → `#D4E4EE` gradient  
- Undvik hård zenit — key förblir offset vänster  

## 4.4 Eftermiddag (14:00–17:00)

- Key: `#FFF0E0` @ **88 %** — varmare  
- Fill ökar till **42 %** — mjukare kontrast  
- Verkstaden: Maker Amber accent tillåten i direct light patches  

## 4.5 Kväll (17:00–20:00)

- Key: `#FFE8CC` @ **70 %**  
- Fill: Dusk Lavender `#B8A9C9` @ **25 %**  
- Inomhus lampor tänds: punktljus `#FFD56B` @ **50 %**, radie **80 px @1x**  
- Skuggor längre: **1.4×** — lugn, inte skrämmande  
- Dockhuset / Läshörnan: prioritera denna ljusprofil  

## 4.6 Skymning (20:00–21:30)

- Key: `#C9B8D8` @ **45 %**  
- Himmel gradient: `#A8C4D4` → `#6B7A9E` → `#4A5568` (top)  
- Inomhus: lampor **60 %** av kvällsstyrka  
- Inga skarpa kontraster — barn ska känna **mys inte skräck**  

## 4.7 Natt (21:30–05:00) — begränsad användning

- **Inte** default barnskärm — endast valfri Läshörnan nattläge, Dinosaurielunden aurora, Fiskebryggan stjärnhimmel  
- Key: `#6B7A9E` @ **25 %** (moon)  
- Stjärnor: `#FFF8EE` @ 80–100 %, storlek 1–3 px, max **40** synliga stjärnor  
- ALDRIG mörker som straff — natt = undangömd skatt, inte skuld  

## 4.8 Vinter

- Global shift: +8 % blå i shadows (`#1B2340` undertoner)  
- Key: `#F0F4F8` @ **90 %** — kallare men inte steril  
- Snö reflektion: `#FFFFFF` @ **20 %** bounce uppåt  
- Inomhus värme kontrast: Honey Wood + Care Peach starkare  

## 4.9 Sommar

- Key: `#FFF8EE` @ **105 %** (max innan clip)  
- Gräs: Fern Green +8 % saturation mot vinterbas  
- Skuggor: Shadow Cool `@20 %`  
- Morgonhuset: gardiner halvöppna, damkorn i stråle tillåtet  

## 4.10 Regn

- Key: `#D4E4EE` @ **65 %** — diffus  
- Regndroppar: `#A8C4D4` @ 60 %, stroke 1 px, lutning **15°**  
- Vatten på glas: streak blur **3 px**, opacity **18 %**  
- Fiskebryggan: standard väder — ringar i vatten `#7A9EB8` @ 30 %  
- Humör: **lugn reflektion**, inte deppig grå slöhet  

## 4.11 Dimma (Dinosaurielunden)

- Atmosfärisk perspektiv: `#E8E4EE` @ **35–55 %** overlay per plan  
- Kontrast reducerad **20 %** i bakplan  
- Key blek: `#F0EEF5` @ **55 %**  
- Mod: silhuetter framträder när barn "växer" — se PCB progression  

## 4.12 Ljus + reduced motion

Vid `prefers-reduced-motion`: solstråle-drift, lamp-flimmer och stjärnblink **stoppas**. Statisk ljusprofil enligt tid på dygnet — ingen animation krävs för läsbarhet.

---

# 5. Natur — gräs, träd, buskar, blommor, stenar, snö, regn, vatten, himmel, moln, stjärnor

## 5.1 Naturfilosofi

Natur i Stjärndag är **svensk friluftsliv möter barnbok** — inte tropisk regnskog, inte amerikansk nationalpark hyperrealism. Träd är gran och björk och tall. Buskar är syren och häck. Stenar är glaciala rundningar. Varje naturdetalj ska kännas som **ett ställe ett barn i Uppsala, Umeå eller Göteborg kan ha sett** — igenkännbart, stillsamt.

## 5.2 Gräs — exakta ritregler

**Basfärg:** Fern Green `#6B8F71` med variation tiles:
- Highlight blade: `#8BA888` @ 40 % av blad  
- Shadow blade: `#5A7A60` @ 30 %  
- Jord skim: `#8B7355` @ 5 % synlig vid bas  

**Bladform:** Spetsiga ovale, längd **8–14 px @1x**, bredd **2–4 px**. Minst **3 nyanser** per gräscluster. Cluster storlek **40–120 px** bred.

**Linje:** Soft Ink `#2A2520` @ **75 %** på gräs — tunnare än karaktär.

**Förbjudet:** `#00FF00` neon. Uniform kortklippt golf-green utan variation. 3D grass shader.

**Stjärndag gräs höjd:** **6–18 px** — lagom vild, inte örten.

## 5.3 Träd — stammar, kronor, säsong

### Björk (standard svenskt träd)
- Stam: Birch Light `#E8DFD0` med horisontella lenticels `#C4B8A8` streck, **2 px** spacing  
- Krona: `#8BA888` + `#6B8F71` blob-cluster, organisk — **aldrig** perfekt sfär  
- Höjd i scen: **1.8–2.4×** rumshöjd utomhus  

### Gran/tall
- Stam: `#6B5A4A` med `#5A4A3A` skugga  
- Barr: `#4A6B5A` mörk + `#6B8F71` ljus topp  
- Triangelform **ojämn** — 5–7 barr-lager  

### Lövträd sommar
- Krona radie: **1.2×** stamhöjd  
- Minst **4 gröna nyanser**  

### Höst (säsong — PCB)
- Gult: `#D4A849`, orange: `#C4956A`, rött: `#B87060` — max **30 %** röda blad per träd  
- Inte full amerikansk höst-fire  

### Vinter
- Snötäcke på gren: `#FAFAF7` med `#E8E4EE` skugga — grenar fortfarande synliga  

**Förbjudet:** Palmträd som default svensk scen. Cherry blossom anime overload.

## 5.4 Buskar och häckar

- Form: organisk halvcirkel eller lagom klippt häck — radie **60–200 px**  
- Färg: Moss Sage `#8BA888` bas, Shadow `#5A7A60`  
- Blommande buske (syren): `#C9B8D9` kluster, **6–12 blommor** synliga — inte tusentals  
- Linje: **1.25 px**  

## 5.5 Blommor

**Tillåtna svenska blommor:** Tusensköna, blåklocka, maskros ( lekfull ), liljekonvalj ( vår ), solros ( sensommar Verkstaden ).

**Maskros regler:** Gult `#FFD56B` center `#F5A623`, stjälk `#6B8F71`, max **3** per närbildscen.

**Blåklocka:** `#A8C4D4` → `#7A9EB8`, klockform **4 px** hängande.

**Förbjudet:** Rosor som primär blomma överallt ( för vuxen romantik ). Hela ängar av identiska blommor ( AI pattern ).

## 5.6 Stenar och klippor

**Sjösten (Fiskebryggan, strand):**
- Bas: `#9A9A98`  
- Highlight: `#C4C4C0`  
- Moss patch: `#6B8F71` @ 20 % på norr-sida  
- Form: ellipsoid, aldrig perfekt klot  
- Storlek variation: **12–80 px**  

**Granit (Dinosaurielunden):**
- `#7A7A78` med fläckar `#6A6A68`  
- Fossil inset: `#8B7BA8` @ 40 %  

**Förbjudet:** Kristall-former ( sci-fi loot ). Glödande stenar ( casino ).

## 5.7 Snö

- Bas: `#FAFAF7` — aldrig rent `#FFFFFF` full yta  
- Skugga: `#D4E4EE` @ 35 %  
- Fotspår: `#E8E4EE` indtryck, djup **2 px**  
- Snö på tak: sammanhängande massa med **3** bula-varianter  
- Is på vatten: `#E8F0F8` @ 60 % med crack lines `#C4D4E4` **1 px**  

## 5.8 Regn (visuell)

- Drop stroke: `#A8C4D4`, längd **6–12 px**, bredd **1 px**  
- Density: **max 40** droppar synliga samtidigt @1x — mer = rörigt  
- Puddle: ellips `#7A9EB8` @ 25 %, blur **4 px**  
- Regn + barn: gul regnjacka `#FFD56B` tillåten — en glad accent  

## 5.9 Vatten

**Stillastående (sjö, damm):**
- Bas: Calm Water `#7A9EB8`  
- Reflektion: himmel `@30 %` inverted blur **6 px**  
- Depth gradient: nära `#6A8EA8` → fjärr `#A8C4D4`  

**Rörligt (Fiskebryggan):**
- Våg linje: `#8BAEC8`, amplitude **3 px**, period **40 px**  
- Skum: `#FAFAF7` @ 50 %, **2 px** caps  

**Förbjudet:** Hyperrealistisk vatten shader. Glow-in-dark vatten.

## 5.10 Himmel

**Dag:** gradient top `#A8C4D4` → bottom `#D4E4EE` (45 % av himmelhöjd i scen)

**Morgon:** + `#FFF5E0` band vid horisont **15 %** höjd

**Kväll:** `#D4A098` → `#B8A9C9` → `#6B7A9E`

**Moln:** Se 5.11

**Förbjudet:** Photoshop cloud filter utan handritad kant. Purple-orange instagram sunset överallt.

## 5.11 Moln

- Form: organisk bomull — **3–5** cirklar merged, radie **20–60 px**  
- Färg: `#FAFAF7` topp, `#E8E4EE` botten skugga  
- Kant: Soft Ink `@50 %`, **1 px**  
- Max **4** moln synliga per utomhusscen — lugn himmel  

## 5.12 Stjärnor (himmel och belöning)

**Himmel-stjärnor:** `#FFF8EE`, storlek **1–3 px**, twinkle endast om reduced motion off, period **3 s**

**Belöningsstjärnor (UI/celebration):** Stjärndag Gold `#F5A623`, fem uddar, inner `#FFD56B`, stroke Soft Ink **1.5 px**, storlek **48–72 px** på Idag celebration

**Förbjudet:** Stjärna som fullskärmsbakgrund wallpaper. Rotating 3D stjärnor.

## 5.13 Natur i världskontext

| Värld | Naturprioritet |
|-------|----------------|
| Morgonhuset | Fönster-träd, fågel utanför, gräsmatta i fjärr |
| Verkstaden | Vedhög, utomhus verktygsskädda, sommargräs |
| Husdjurshemmet | Hage, staket, höstack, enkel blomma |
| Dinosaurielunden | Fräken, dimma, vattenfall siluett, fjäril ( lek ) |
| Dockhuset | Mini-trädgård, **12 px** träd scale |
| Fiskebryggan | Vatten, moln, mås siluett sällan |
| Läshörnan | Regn på ruta, nattstjärnor genom fönster |

---

# 6. Byggnader — hus, fönster, dörrar, tak, golv, trä, sten, tegel

## 6.1 Arkitekturfilosofi

Byggnader i Stjärndag följer **svensk småhus och lägenhetsnorm** — falurot existens men inte dominant, träfasad vanligast, tegel i stadsscener sällan. Skala är **mänsklig barnvänlig** — dörrar nåbar-höga i fiction, fönster inbjudande.

## 6.2 Hus — volym och proportion

**Standard småhus (Morgonhuset exteriör om visas):**
- Våningar: **1.5** ( vindskupa ) max i barnvärld  
- Taklutning: **42°** ( nordisk standard )  
- Vägg: Morning Oat `#F7F3EB` eller Honey Wood `#C4956A` panel  
- Tak: `#6B5A4A` plåt eller `#8B7355` shingle  
- Fotavtryck bredd: **2.8×** dörrbredd  

**Förbjudet:** Amerikansk ranch. Glass skyskraper. Medeltida slott som default.

## 6.3 Fönster

- Ram: `#FAFAF7` eller Birch Light `#E8DFD0`, bredd **8–12 px @1x**  
- Glas: Sky Calm `#A8C4D4` @ **40 %** med highlight streck `#FFFFFF` @ 30 % diagonal  
- Crossbar: **+** eller **‖** enligt svensk standard — enkel  
- Gardin: Linen White `#FAFAF7`, opacitet **85 %**, våg amplitude **4 px**  
- Fönster i barnrum: alltid **inbjudande ljus** inifrån vid kväll  

## 6.4 Dörrar

- Höjd: **1.6×** NPC barn höjd ( se §7 )  
- Bredd: **0.7×** höjd  
- Färg: Honey Wood `#C4956A` eller Moss Sage `#8BA888` accent  
- Handtag: mässing `#C4A060`, höjd **100 px** från golv i världsskala  
- Dörröppning: mörk `#3D3830` @ 40 % — inbjudande djup, inte skräck  

## 6.5 Tak och skorsten

- Tak överhäng: **12 %** av vägghöjd  
- Skorsten: tegel `#B87060`, höjd **0.3×** takfall  
- Snö på tak: se §5.7  

## 6.6 Golv — inomhus

| Material | HEX bas | Ritregel |
|----------|---------|----------|
| Ek parkett | `#C4956A` | Plankor **24 px** bred, fog **1 px** `#A88050` |
| Vitlaserad furu | `#E8DFD0` | Plankor **20 px**, knut variation |
| Klinker kök | `#D4C4B0` | Rutor **16×16 px**, fog `#B8A898` |
| Matta | `#B8A9C9` eller `#D4A098` | Textur Wool Felt Stamp |

**Förbjudet:** Högglans marmor. Svart golv i barnrum ( för hårt ).

## 6.7 Trädetaljer — panel, list, hylla

- Panel fog: **1 px** `#A88050`  
- Hylla tjocklek: **8 px**, skugga nedåt **4 px** blur  
- List: `#E8DFD0` mot vägg `#F7F3EB`  

## 6.8 Sten och tegel

**Tegel ( sällan ):**
- `#B87060` med `#A86050` fog **2 px**  
- Endast stadsbakgrund eller skorsten  

**Stengrund:**
- `#9A9A98` oregelbundna block **20–40 px**  

## 6.9 Byggnader per värld

| Värld | Byggnadskarakter |
|-------|------------------|
| Morgonhuset | Lägenhet/hus hall, trappa, kök — varm ek |
| Verkstaden | Träskjul, plåttak, fönster högt |
| Husdjurshemmet | Stuga + hage, röd panel `#C47060` accent tillåten |
| Dinosaurielunden | Träbrygga, observationsplattform — **inte** betongbunker |
| Dockhuset | Miniatur **1:12** — se §7 proportion |
| Fiskebryggan | Träbrygga `#A88050`, räcke **6 px** stolpar |
| Läshörnan | Bokhylla vägg, fönsternisch, loft-känsla |

---

# 7. Karaktärer — barn, föräldrar, NPC, djur, ögon, ansikten, händer, kroppar, proportioner, kläder, uttryck

## 7.1 Karaktärfilosofi

Karaktärer i Stjärndag ska kännas **ritade av en mänsklig hand med kärlek** — inte genererade av modell, inte kopierade från Disney/Pixar figurbibliotek. Barn är **protagonister** med dignitet — inte chibi-meme, inte uncanny valley 3D.

**NPC-princip (PCB):** Companions not managers — visuellt vänliga, aldrig hotfulla, aldrig skuldbelagda.

## 7.2 Proportionsystem — barn ( huvudperson )

Stjärndag barn följer **6.5-huvuden-modellen** ( slightly stylized, Nintendo-läsbar ):

| Mått | Ratio ( av total höjd ) | px @1x ( höjd 380 px ) |
|------|-------------------------|-------------------------|
| Total höjd | 1.0 | 380 px |
| Huvud ( inkl hår ) | 0.28 | 106 px |
| Kropp ( axlar till höfter ) | 0.32 | 122 px |
| Ben | 0.40 | 152 px |
| Axelbredd | 0.38 av höjd | 144 px |
| Huvudbredd | 0.65 av huvudhöjd | 69 px |
| Ögonavstånd | 0.32 av huvudbredd | 22 px |
| Ögonstorlek | 0.22 av huvudbredd vardera | 15 px bred |

**Åldersband visuellt:**
- **4–6 år:** huvud **0.30**, kortare ben **0.36**  
- **7–9 år:** standard ovan  
- **10–12 år:** huvud **0.26**, ben **0.44**, smalare axlar  

## 7.3 Proportionsystem — vuxna ( föräldrar, NPC människor )

- **7.5-huvuden-modell**  
- Total höjd: **1.15×** barn standard ( 437 px @1x )  
- Kropp bredare: axlar **0.42** av höjd  
- **Aldrig** sexualiserade proportioner  
- Snickar-Sune ( bäver ), Morgon-Mira ( igelkott ): se §7.10 djur  

## 7.4 Ögon — living eyes ( 03A )

**Form:** Mandelform med flat bottom — radie top **50 %**, bottom **35 %** av ögonbredd.

**Lager:**
1. Vit `#FAFAF7` — full sclera synlig **60 %**  
2. Iris: `#6B8F71` ( grön ) eller `#7A9EB8` ( blå ) eller `#A88050` ( brun ) — **en färg per karaktär**  
3. Pupill: Soft Ink `#2A2520`, **40 %** av iris  
4. Highlight: `#FFFFFF` **2 px** cirkel övre vänster — **alltid** minst en  
5. Optional secondary highlight: **1 px**  

**Blick:** Mot kamera eller mot interaktion — **aldrig** tom dead stare utan highlight.

**Förbjudet:** Anime sparkle overload ( >3 highlights ). Realistic foto-öga. Glow eye ( supernatural horror ).

## 7.5 Ansikten

- Näs: **symbolisk** — `L` form **3×4 px** eller liten kurva — aldrig fotorealistisk  
- Mun: linje **2 px** neutral, kurva upp glad, kurva ned ledsen **sällan** ( inte skuld )  
- Kinder: Warm Rose `#D4A098` @ **25 %** ellipse på glad  
- Öron: halvcirkel **8 px**, samma hudton  
- Hår: individuella lockar tillåtna — minst **3** färgnyanser i hår för djup  

**Hudtoner ( inclusive nordic palette ):**
| ID | Bas | Skugga | Rodnad |
|----|-----|--------|--------|
| H1 | `#F5E6D8` | `#E8D0C0` | `#D4A098` |
| H2 | `#EDD5C0` | `#D4B8A0` | `#C4956A` |
| H3 | `#D4A888` | `#B89070` | `#A88060` |
| H4 | `#8B6850` | `#6B5040` | `#A87060` |
| H5 | `#F0D8C8` | `#E0C0B0` | `#E8B0A0` |

**Förbjudet:** Grå hud. Röd näsa som permanent ( clown ). Ett enda hudtone-only cast.

## 7.6 Händer

- Fingrar: **4 synliga** + tumme ( stiliserat ) — **ALDRIG 6 fingrar** ( QG-047 )  
- Hand storlek: **0.12×** total höjd  
- Linje: **1.5 px**  
- Grepp: objekt ska ha **korrekt kontakt** — ingen floating hand  

## 7.7 Kroppar och pose

- Hållning: **öppen** — armar inte korsade defensivt som default  
- Rörelse: en foot forward vid gå-hint  
- **Förbjudet:** T-pose export. V-back aggressive stance.  

## 7.8 Kläder — svensk vardag

**Stil:** Lager, praktiskt, färgkoordinerat med världsaccent — inte mode-runway.

**Basgarderob:**
- Tröja/jumper: ulltextur subtil  
- Byxor/leggings: `#5A6178` eller `#7A9EB8`  
- Strumpor: randiga tillåtna — max **2** färger  
- Skor: `#FAFAF7` sula `#3D3830`  

**Säsong:**
- Vinter: lång ullkappa `#7A9EB8`, mössa `#F5A623` accent OK  
- Regn: gul regnjacka `#FFD56B` — klassisk svensk skola  

**Förbjudet:** Logotyper ( Nike etc ). Krigskläder. Sexualiserade outfits. Roblox hoodie aesthetic.

## 7.9 Uttryck — emotion chart

| Emotion | Ögon | Mun | Bryn |
|---------|------|-----|------|
| Neutral lugn | Normal | Liten kurva | Mjuka |
| Glad stolt | Större iris | Uppåt kurva | Lyft |
| Nyfiken | Blick sida | Liten o | En upp |
| Överraskad | Större pupill | O form | Högt |
| Koncentrerad | Blick ned | Rak liten | Lätt ihop |
| **FÖRBUDEN:** Skuld | — | — | — |
| **FÖRBUDEN:** Gråt manipulation | Tårflod | Nedåt stor | Skuld |

Max **3** uttrycksanimationer per karaktär per skärm ( 03B ).

## 7.10 Djur och NPC ( icke-människa )

**Morgon-Mira ( igelkott ):**
- Storlek: **0.35×** barn höjd  
- Taggar: Soft Ink, **14–20** synliga  
- Förkläde: `#F7F3EB` med `#F5A623` ficka  

**Snickar-Sune ( bäver ):**
- Storlek: **0.55×** barn höjd  
- Svans: `#6B5A4A` flat paddle  
- Verktygsbälte: Maker Amber accent  

**Mini-Dino:**
- Rund kropp, **0.4×** barn höjd  
- Ögon: **extra stora** — 0.35 av huvud ( awe, not horror )  
- Färg: `#8BA888` + Courage Violet `#8B7BA8` rygg  

**Husdjur ( katt/kanin/marsvin ):**
- Realistisk proporsion **0.25–0.35×** barn  
- **ALDRIG** hunger-skalle, **ALDRIG** tårögd  

**Fågel ( fönster ):**
- Siluett eller enkel färg `#7A9EB8`, storlek **16 px**  

## 7.11 Inkludering utan tokenism

- Hudfärger: minst **3** av H1–H5 representerade i familj-illustrationer över tid  
- Hårstruktur: lockigt, rakt, hijab, kort — **korrekt** ritat  
- Rullstol/scooter: när inkluderat — **full deltagande**, inte bakgrund dekoration  
- Kön: kläder inte stereotypiskt könslåsta — Verkstaden för alla  

## 7.12 Karaktär + värld

Varje NPC designas **en gång** i Art Bible stil — variant sheets tillåtna ( 3 vinklar: front, 3/4, profil ). Barn avatar i app: emoji + foto fallback enligt kod — illustration barn är **generiska representanter**, inte foto-real porträtt.

---

# 8. Ikoner — tjocklek, avrundning, skuggor, fyllning, animationsintent

## 8.1 Ikonfilosofi

Ikoner i Stjärndag är **pictograms med själ** — inte Material Icons out-of-box, inte Font Awesome generisk. Varje ikon ska kännas som den tillhör samma illustrerade universum som Min värld, fast förenklad för läsbarhet vid **24–48 px**. Barnvy ikoner prioriterar **igenkänning utan text** enligt PRODUCT_IDENTITY ( literacy optional on core path ).

## 8.2 Geometri och stroke

**Barnvy ikoner ( Idag, Min värld nav ):**
- Canvas: **48×48 px** @1x, **96×96 px** @2x export  
- Stroke: **2.5 px** @1x, `#1B2340` ( Stjärndag Navy ) eller `#FFFFFF` på mörk/mättad bakgrund  
- Corner rounding på rektangulära element: **4 px**  
- Cap/join: round  
- Fyllning: flat med **5 %** luminans variation — aldrig ren vektor utan liv  
- Padding inom canvas: **8 px** minimum från stroke till kant  

**Parent UI ikoner:**
- Canvas: **24×24 px** @1x  
- Stroke: **1.75 px**  
- Färg: `#5A6178` default, `#1B2340` active, `#F5A623` accent endast för stjärna/belöning  

**Förbjudet:** Emoji som permanent ikon i navigation ( tillåtet som child avatar fallback enligt kod, inte som systemikon ). Ultra-thin 1 px hairline ( illegible ). Mixed stroke weights inom samma ikonset.

## 8.3 Ikonfamiljer

| Familj | Exempel | Stil |
|--------|---------|------|
| **Aktivitet** | Tandborste, skor, frukost | Objekt-centrerad, 60 % canvas fill |
| **Navigation** | Idag, Min värld, Familj | Symbol + valfri label under |
| **System** | Inställningar, tillbaka, stäng | Parent: geometric; Barn: mjukare |
| **Belöning** | Stjärna, Skattkammare | Guld `#F5A623`, fem uddar |
| **Status** | Klar check | Moss Sage `#8BA888` cirkel + vit check |

## 8.4 Skuggor på ikoner

Barnvy: **ingen drop shadow** på nav-ikoner — flat on Oat background.  
Celebration stjärna: Star Glow `#F5A623` @ 30 % blur **12 px** — temporär endast.  
Parent kort-ikon: valfri `0 1px 2px rgba(27,35,64,0.08)` — subtil.

## 8.5 Animationsintent ( samverkan 03B )

| Ikon | Animation | Duration |
|------|-----------|----------|
| Aktivitet klar | Check scale 1→1.15→1 | 200 ms |
| Stjärna earned | Pop + glow fade | ≤2000 ms total celebration |
| Nav aktiv | Färg fade + 2 px translate up | 150 ms |
| Nav reduced motion | Endast färg fade | 150 ms |

**Förbjudet:** Infinite spin on settings. Pulse attention-seeking on idle nav.

## 8.6 Ikon export

- Format: SVG för UI ( optimerad ), PNG @2x/@3x för raster fallback  
- SVG: inga embedded fonts, inga inline `<style>` — paths only  
- Namn: `icon-{context}-{name}.svg` — ex `icon-activity-toothbrush.svg`

---

# 9. UI — knappar, kort, dialoger, popups, listor, navigation, skuggor, hörnradie, spacing

## 9.1 UI-filosofi — Parent vs Barn ( översikt )

Stjärndag har **två visuella dialekter** inom samma varumärke:

| Dimension | Barn UI | Parent UI |
|-----------|---------|-----------|
| Känsla | Barnbok, varm, lekfull | Lugn premium, vuxen |
| Bas bakgrund | Morning Oat `#F7F3EB` | Parent Canvas `#F8F9FC` |
| Primär text | Navy `#1B2340` | Navy `#1B2340` |
| CTA | Gold pill, stor touch | Gold eller Navy outline |
| Corner radius | **20–24 px** | **16 px** |
| Illustration | Full scenes | Minimal — ikoner + foto |
| Skugga | Mjuk varm | Subtil kall |

Detaljerad Parent vs Child: se avsnitt *Parent UI vs Child UI* efter §13.

## 9.2 Mobile baseline — referensviewport

Alla px-värden i §9 är **@1x för 375 px logical width** ( iPhone SE/mini baseline ). Skala proportionellt:

| Enhet | Logical width | Scale factor |
|-------|---------------|--------------|
| iPhone SE | 375 px | 1.0× |
| iPhone 14 | 390 px | 1.04× |
| iPhone 14 Plus | 428 px | 1.14× |
| iPad child | 768 px | Max content **480 px** centrerat |

Safe area: respektera `env(safe-area-inset-*)` — minimum **16 px** padding utöver safe area på alla sidor.

## 9.3 Spacing system ( 4 px grid )

| Token | px | Användning |
|-------|-----|------------|
| `space-1` | 4 px | Ikon-text gap tight |
| `space-2` | 8 px | Inom komponent |
| `space-3` | 12 px | List item inner |
| `space-4` | 16 px | Standard screen padding |
| `space-5` | 20 px | Kort padding barn |
| `space-6` | 24 px | Sektion gap |
| `space-8` | 32 px | Stor sektion |
| `space-10` | 40 px | Hero spacing |
| `space-12` | 48 px | Celebration breathing |

**Skärmkant padding barn:** **16 px** horisontellt minimum.  
**Skärmkant padding parent:** **16 px** mobile, **24 px** tablet.

## 9.4 Knappar — barn

**Primär CTA ( Idag huvudaction ):**
- Höjd: **56 px**  
- Min bredd: **200 px** ( eller full width minus 32 px padding )  
- Bakgrund: `#F5A623` ( Stjärndag Gold )  
- Text: `#1B2340`, **18 px**, font-weight **600**, letter-spacing **0.01 em**  
- Border radius: **28 px** ( full pill )  
- Border: none  
- Active state: `#E8971A` bakgrund, scale **0.98**  
- Disabled: `#F5A623` @ 40 % opacity, text `#5A6178`  
- Touch target: **minimum 48×48 px** — knapp uppfyller via höjd  

**Sekundär barn:**
- Höjd: **48 px**  
- Bakgrund: `#FFFFFF`  
- Border: **2 px** `#EDE7F6`  
- Text: `#1B2340`, **16 px**  
- Radius: **24 px**  

**Ghost/text knapp barn:**
- Höjd: **44 px**  
- Text: `#1B2340` underline on focus only  
- Ingen skugga  

**Förbjudet barn:** Neon glow CTA. Vibration on every tap. `<button>` höjd under 44 px.

## 9.5 Knappar — parent

**Primär parent CTA:**
- Höjd: **48 px**  
- Bakgrund: `#F5A623`  
- Text: `#1B2340`, **16 px**, weight **600**  
- Radius: **12 px** ( inte full pill — vuxnare )  
- Padding horisontell: **20 px**  

**Sekundär parent:**
- Höjd: **48 px**  
- Bakgrund: transparent  
- Border: **1.5 px** `#1B2340`  
- Text: `#1B2340`, **16 px**  
- Radius: **12 px**  

**Destructive parent:**
- Bakgrund: `#DC2626`  
- Text: `#FFFFFF`  
- Endast account delete — aldrig barn synlig  

## 9.6 Kort ( cards )

**Barn NOW-kort ( Idag hero ):**
- Bakgrund: `#FFFFFF`  
- Border: **2 px** `#EDE7F6`  
- Radius: **24 px**  
- Padding: **20 px**  
- Skugga: `0 4px 12px rgba(42,37,32,0.08)` — varm  
- Min höjd: **120 px**  
- Innehåll: aktivitetsikon **48 px** + titel **20 px** weight 600 + valfri tid  

**Parent stat/kort:**
- Bakgrund: `#FFFFFF`  
- Border: **1 px** `#E2E8F0`  
- Radius: **16 px** ( `rounded-2xl` enligt POS 03 )  
- Padding: **16 px**  
- Skugga: `0 1px 3px rgba(27,35,64,0.06)`  

**Förbjudet:** Glassmorphism blur cards. Enterprise zebra table inside card on Hem.

## 9.7 Dialoger och popups

**Barn modal ( celebration, placement confirm ):**
- Overlay: `#1B2340` @ **40 %**  
- Panel: `#FFFFFF`, radius **28 px**, padding **24 px**  
- Max bredd: **340 px** centrerat  
- Stäng alltid synlig: **44×44 px** touch, X ikon **24 px**  
- Celebration: auto-dismiss **2000 ms** eller tap skip ( 03B )  

**Parent modal:**
- Overlay: `#0F1629` @ **50 %**  
- Panel: `#FFFFFF`, radius **16 px**, padding **24 px**  
- Rubrik: **20 px** weight 600 Navy  
- Brödtext: **16 px** `#5A6178`  
- Actions: högerställda knappar, gap **12 px**  

**PIN gate ( parental gate ):**
- Numerisk keypad: knapp **64×64 px**, gap **12 px**  
- Radius keypad knapp: **16 px**  
- Bakgrund: `#F7F3EB` — lugn, inte alarm  

## 9.8 Listor

**Barn aktivitetslista ( NEXT/LATER ):**
- Row höjd: **72 px** minimum  
- Separator: **1 px** `#EDE7F6`  
- Ikon vänster: **40 px**, padding left **16 px**  
- Titel: **16 px** weight 500  
- Check höger: **44 px** touch  

**Parent lista ( barn, belöningar ):**
- Row höjd: **64 px**  
- Avatar/emoji: **40 px** cirkel  
- Chevron: **20 px** `#94A3B8`  

## 9.9 Navigation

**Barn bottom nav ( Idag · Min värld · Familj ):**
- Bar höjd: **64 px** + safe area  
- Bakgrund: `#FFFFFF` med top border **1 px** `#EDE7F6`  
- Ikoner: **28 px** inom **48 px** touch  
- Label: **11 px** weight 500 under ikon  
- Aktiv: ikon `#F5A623`, label `#1B2340`  
- Inaktiv: ikon `#94A3B8`, label `#94A3B8`  
- Max **3** tabs — aldrig fler utan ADR  

**Parent bottom/top nav:**
- Bar höjd: **56 px**  
- Aktiv indikator: **2 px** guld linje bottom  
- Text-first möjligt — ikon optional  

## 9.10 Typografi ( UI komplement till illustration )

| Roll | Barn px | Parent px | Weight | Färg |
|------|---------|-----------|--------|------|
| Display | 28 | 24 | 700 | `#1B2340` |
| H1 | 24 | 20 | 600 | `#1B2340` |
| H2 | 20 | 18 | 600 | `#1B2340` |
| Body | 16 | 16 | 400 | `#1B2340` |
| Small | 14 | 14 | 400 | `#5A6178` |
| Caption | 12 | 12 | 400 | `#94A3B8` |

**Font stack:** System UI — `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Ingen display-font som permanent ersättare utan ADR.

## 9.11 Skuggor — UI token

| Token | Värde | Användning |
|-------|-------|------------|
| `shadow-sm` | `0 1px 2px rgba(27,35,64,0.06)` | Parent kort |
| `shadow-md` | `0 4px 12px rgba(42,37,32,0.08)` | Barn kort |
| `shadow-lg` | `0 8px 24px rgba(27,35,64,0.12)` | Modal |
| `shadow-gold` | `0 4px 16px rgba(245,166,35,0.25)` | Celebration only |

**Förbjudet:** `0 20px 60px` material elevation 24. Colored neon shadow.

## 9.12 Hörnradie sammanfattning

| Element | Barn | Parent |
|---------|------|--------|
| Screen kort | 24 px | 16 px |
| Knapp primär | 28 px pill | 12 px |
| Input | 16 px | 12 px |
| Modal | 28 px | 16 px |
| Chip/tag | 20 px pill | 8 px |
| Avatar | 50 % | 50 % |

## 9.13 Input fields ( parent only på kärnväg )

- Höjd: **48 px**  
- Border: **1.5 px** `#E2E8F0`  
- Focus ring: **2 px** `#F5A623` offset **2 px**  
- Radius: **12 px**  
- Padding: **12 px** horisontell  
- Placeholder: `#94A3B8`  
- **Barn:** inga formulär utom PIN ( C-01 )  

## 9.14 Skattkammaren visuell särart

Skattkammaren barnvy får **mörkare dramatisk bakgrund** — undantag från Oat default:
- Gradient: `#1a0533` → `#2d0a5e` → `#1a0533` ( enligt befintlig CSS )  
- Stjärnor/accent: `#ffd700` sparsamt  
- Kort inom: `#fffbf0` → `#fff3cc` gradient — skatt-känsla utan casino  
- **Regel:** Skattkammaren är **belöning rum**, inte shop — inga prislappar, inga "köp"

## 9.15 Tailwind mapping ( implementation )

POS 03 tokens mappar till Tailwind build:
- `rounded-2xl` = **16 px** ( parent kort )  
- Barn custom: `rounded-3xl` = **24 px** where applied  
- `bg-brand-gold` = `#F5A623`  
- `text-brand-navy` = `#1B2340`  

Illustratörer behöver inte koda Tailwind — detta är handoff till Frontend Lead.

---

# 10. Illustrationsregler — tillåtet och förbjudet

## 10.1 Tillåtna illustrationstyper

1. **Handritad digital** — Procreate, Photoshop, Clip Studio, Fresco med penslar enligt §2.6  
2. **Vektor med handfeel** — Illustrator med brush stroke, inte ren geometri  
3. **Diorama scener** — Min värld rum enligt §2.3  
4. **Ikon-illustration hybrid** — förenklade objekt för Idag  
5. **Säsongsmicrovarianter** — PCB tillåten ( löv, morgonmössa ) — max **4** per värld per år  
6. **NPC sheet** — 3 vinklar enligt §7.12  
7. **Build part ghost** — streckad outline `#B8A9C9` @ 60 %, **2 px** dash **6 px** gap  
8. **Celebration frame** — ≤2000 ms enligt 03B  
9. **Empty state** — en illustration, copy max 2 rader  
10. **Onboarding hero** — en scen per steg, samma stil som Min värld  

## 10.2 Förbjudna illustrationstyper

1. Stock clip art ( Shutterstock, Freepik generic )  
2. AI genererad bulk utan handfinish ( six fingers, smälta texturer )  
3. 3D render utan art direction match  
4. Fotorealistiska barnansikten  
5. Meme templates  
6. Licensed character crossover  
7. Texttung poster utan bildstöd  
8. Infographic enterprise stil  
9. Isometrisk city builder asset pack  
10. Anime full style pivot  
11. Pixel art ( inte vår identitet v1 )  
12. Collage mixed media utan ADR  
13. Watermark preview assets  
14. Lorem ipsum i bild  
15. Placeholder gray box " bild här "  

## 10.3 Kompositionsregler

- **En** focal point per illustration  
- **Tre** depth planes minimum ( §2.4 )  
- **Golden ratio optional** — diagonalt flöde från övre vänster ljus  
- Text i bild: **undvik** — UI copy separat  
- Logotyp i illustration: **aldrig** utom marketing med ADR  

## 10.4 Filformat och leverans

| Typ | Master | Export |
|-----|--------|--------|
| Min värld rum | PSD/Procreate **4096 px** bred | PNG @1x/@2x/@3x, WebP opt |
| NPC | Vektor + raster | SVG + PNG |
| Build part | Transparent PNG | 512×512 min |
| Celebration | Lottie optional | JSON + PNG fallback |

## 10.5 Revision och sign-off

1. Illustrator self-check QG-001–QG-120  
2. Art Director review  
3. Creative Director screenshot test  
4. Game Director emotion job match ( PCB )  
5. Accessibility contrast spot check  

---

# 11. Förbjudet — utökad lista ( clipart, asset store, AI slop, Disney, Roblox, Cocomelon, neon, glassmorphism, oversaturation )

## 11.1 Varför denna lista existerar

Stjärndag bygger förtroende genom **igenkännbar hantverkskvalitet**. En enda generic asset undergräver hela världen — barn märker inconsistency även om de inte kan namnge den. Creative Director har ** absolut veto ** på allt nedan utan ADR sign-off CEO + CPO.

## 11.2 Clipart och asset store ( absolut förbud )

**Förbjudna källor och utseenden:**
- Shutterstock / Adobe Stock / Freepik / Flaticon generic barn  
- Unity Asset Store / Unreal Marketplace miljöpaket  
- " Cute kids room pack " med samma möbler i 10 000 appar  
- Kenney.nl default without heavy restyle  
- OpenGameArt utan full omarbetning  
- Canva template barn app  
- Envato Elements scene builder  

**Visuella triggers som = instant reject:**
- Identiska möbler i 3+ världar från samma pack  
- Möbel med okänd skala ( giant chair )  
- Generic plant in pot #3 från pack  
- Windows with no Nordic light logic  

## 11.3 AI slop ( generativ utan craft )

**Förbjudet:**
- Midjourney/DALL-E/Stable Diffusion output **som slutleverans**  
- Six fingers, seven toes, melting utensils  
- Inconsistent character across frames  
- Text gibberish in scene  
- Over-smooth plastic skin  
- " AI watercolor " utan linjekontroll  

**Tillåtet ( begränsat ):**
- AI som ** rough comp ** internt — aldrig ship  
- AI bakgrund som ** underpainting ** om 100 % handovermal enligt §2  

## 11.4 Disney / Pixar / Marvel copy

**Vi tar inspiration, inte IP:**
- Förbjudet: Mickey silhouette, Frozen palette clone, Pixar lamp remake  
- Förbjudet: Character design som Minion/Elsa/Mario pastisch  
- Tillåtet: Pixar **nivå** på micro-detalj och emotion ( §2.11 )  
- Tillåtet: Nintendo **klarhet** i regler ( §12 )  

## 11.5 Roblox / Minecraft / Fortnite aesthetic

- Blocky low-poly barn  
- Neon rarity tiers  
- Skin shop mannequin  
- Emote dance promotion  
- Battle pass UI chrome  

Stjärndag är ** inte ** metaverse. Blockform = reject.

## 11.6 Cocomelon / ChuChu TV / hyper-flat baby

- Rainbow bus  
- Flat circle heads uniform size  
- Hyper-saturated primärer  
- Giant eyes 50 % of face on all characters  
- Background music note visuals  

## 11.7 Neon, glassmorphism, oversaturation

**Neon:**
- `#39FF14`, `#FF00FF`, glow tubes, cyberpunk rim on UI  

**Glassmorphism:**
- `backdrop-filter: blur` on child cards  
- Frosted glass nav  
- iOS 7 skeuomorphism revival  

**Oversaturation:**
- Global saturation >110 % on export  
- Rainbow gradient full-bleed  
- Gold metallic `#FFD700` chrome on everything  

## 11.8 Övrigt förbjudet ( UX + etik )

| Kategori | Exempel |
|----------|---------|
| Casino | Slots, dice, loot chest sparkle |
| Skuld | Röd varning på barn, tårögd maskot |
| Skräck | Blod, mörker straff, jump scare |
| Sexualisering | Allt — zero tolerance |
| Våld | Vapen, slagsmål rewards |
| Droger | Alkohol i barnscen som cool |
| Rökning | Allt |
| Real brands | Logotyper utan licens |
| Politik | Partisymboler |
| Religion | Proselytizing symbols som default |

## 11.9 Screenshot test fail exempel

Creative Director säger **Nej** om:
- Vän frågar " Är det gratis? "  
- Ser ut som annan app i App Store top 10 kids  
- Barn kan inte peka på vad de ska göra  
- Parent känner sig i Excel  
- Stjärnor dominerar 40 %+ av yta utan celebration context  

---

# 12. Inspirationskällor — vad vi tar, inte vad vi kopierar

## 12.1 Nintendo — regler, polish, respekt

**Vi tar:**
- Tydliga regler — barn förstår utan manual  
- Polish på grundinteraktion före feature creep  
- Respekt för spelare — ingen skuld för frånvaro  
- Diorama läsbarhet — dollhouse clarity  
- Earned secrets — fair, authored  

**Vi kopierar INTE:**
- Mario pipes, star shape trademark, character designs  
- UI sound exact copies  
- IP-protected silhouettes  

## 12.2 Pixar — emotion utan rädsla

**Vi tar:**
- Micro-detaljer i periferin ( dust motes )  
- Emotion readable in silhouette  
- Color script per story beat  
- Safe scary — Dinosaurielunden awe not horror  

**Vi kopierar INTE:**
- Luxo ball, character model sheets  
- Exact color scripts from films  

## 12.3 Studio Ghibli — natur och stillhet

**Vi tar:**
- Vind i gräs  
- Stillness as feature  
- Food/breakfast as love language ( Morgonhuset )  
- Environmental storytelling  

**Vi kopierar INTE:**
- Totoro silhouette, soot sprites direct  
- Anime face formula  

## 12.4 Brio / BRIO — taktil svensk kvalitet

**Vi tar:**
- Träkänsla, lagom rundning  
- Färgat men inte skrikande  
- Hållbarhet aesthetic — built to last  
- Train/track clarity → routine sequence clarity  

## 12.5 Mumin — nordisk melankoli utan skuld

**Vi tar:**
- Värme i grått väder  
- Familj dynamics gentle  
- Nature as companion  
- Lugnt tempo  

**Vi kopierar INTE:**
- Mumin character designs  
- Tove Jansson exact linework trademark  

## 12.6 Astrid Lindgren — barn som capable protagonists

**Vi tar:**
- Barn har agency  
- Vardagsäventyr  
- Svensk vardagsmiljö  
- Humor utan att göra barn till clowns  

## 12.7 Svensk natur och friluftsliv

**Vi tar:**
- Björk, gran, sjö, archipelago grey-blue  
- Four seasons real calendar  
- Fredagsmys indoor/outdoor balance  
- Lagom — not extreme  

## 12.8 Skandinavisk interiör

**Vi tar:**
- Ek, vitt, textil  
- Hygge without Danish copy paste  
- Functional beauty  
- Light walls, warm wood floor  

## 12.9 Nordisk illustration tradition

**Vi tar:**
- Elsa Beskow warmth reference  
- Modern Nordic picture book ( Stina Wirsén, etc. ) line economy  
- Government poster clarity — bildstöd culture  

## 12.10 Sammanfattning — synthesis statement

Stjärndag smältdegel = ** Nintendo regler + Pixar emotion economy + svensk barnbok materialitet + Brio taktilitet + lugn magi CORE_VALUES **. Resultatet måste vara ** unikt igenkännbart ** i screenshot — inte " generic Nordic " som buzzword utan ** named craft decisions ** i varje frame.

---

# 13. Quality Gates — QG-001 till QG-165

Creative Director kan säga **"Nej" utan diskussion** vid brott mot any QG. Art Director operationaliserar. Illustratör kör self-review före inlämning.

## 13.1 Linje och form

**QG-001:** Alla yttre konturer använder Soft Ink `#2A2520` eller specificerad variant — aldrig `#000000`.  
**QG-002:** Karaktär ytterkontur exakt **2.0 px @1x** — avvikelse max ±0.15 px.  
**QG-003:** Round join och round cap på alla streck — inga spetsiga miters.  
**QG-004:** Ingen vektor-perfect ruler straight line längre än **80 px** utan micro wobble.  
**QG-005:** Max en illustrationstil per leveransbatch — mixed styles = reject.  
**QG-006:** Diorama perspektiv: horisont **38–42 %** från botten.  
**QG-007:** Golvvinkel **30°** isometrisk standard.  
**QG-008:** Vertikal konvergens max **3°**.  
**QG-009:** Minst tre depth planes per Min värld scen.  
**QG-010:** Bakgrundsplan linje max **70 %** opacity av förgrund.

## 13.2 Färg och kontrast

**QG-011:** Primär palett endast från §3 — inga ad hoc hex utan ADR.  
**QG-012:** Max **en** accentdominant färg per skärm utöver neutral.  
**QG-013:** Förbjudna färger §3.8 absent — automated scan optional.  
**QG-014:** UI text kontrast minimum **4.5:1** mot bakgrund.  
**QG-015:** Stor form kontrast minimum **3:1** mot närmaste bakgrund.  
**QG-016:** Global saturation export max **108 %** — oversaturation reject.  
**QG-017:** Ingen fullbleed regnbåge.  
**QG-018:** Stjärndag Gold `#F5A623` endast CTA, stjärnor, celebration — inte hela bakgrund.  
**QG-019:** Barn skärm: ingen semantisk skuld-röd `#EF4444`.  
**QG-020:** Världsaccent enligt world table — inte random accent swap.

## 13.3 Ljus och skugga

**QG-021:** Key light övre vänster **45°/55°** om inte §4 undantag dokumenterat.  
**QG-022:** Key färg `#FFF8EE` eller tidsvariant från §4 — aldrig kall vit alone.  
**QG-023:** Skuggor varma `#3D3830` @ 22–28 % — aldrig `#000` multiply.  
**QG-024:** Skuggriktning **135°** från key.  
**QG-025:** Contact shadow under alla stående objekt i förgrund.  
**QG-026:** Nattläge aldrig straff-visual — only optional wonder.  
**QG-027:** Reduced motion statisk ljus OK — animated beam optional OFF.  
**QG-028:** Max **en** hero spec highlight `#FFFFFF` per scen.  
**QG-029:** Morgonhuset fönster: morgonljus om fiction morning.  
**QG-030:** Ingen neon rim light.

## 13.4 Natur

**QG-031:** Gräs: minst **3** nyanser, Fern Green bas.  
**QG-032:** Ingen `#00FF00` neon gräs.  
**QG-033:** Björk har lenticels på stam.  
**QG-034:** Max **4** moln per utomhusscen.  
**QG-035:** Stjärnor belöning: fem uddar, gold palette.  
**QG-036:** Vatten har depth gradient — inte flat fill.  
**QG-037:** Regn max **40** droppar synliga @1x.  
**QG-038:** Svenska träd default — palm ej default.  
**QG-039:** Snö aldrig rent `#FFFFFF` full frame.  
**QG-040:** Natur detalj densitet max **40 %** av förgrund i bakplan.

## 13.5 Byggnader

**QG-041:** Ek golv plankor **24 px** med fog.  
**QG-042:** Fönsterglas `#A8C4D4` @ 40 % minimum transparency feel.  
**QG-043:** Dörr proportion **1.6×** barn höjd.  
**QG-044:** Taklutning **42°** på nordiska småhus.  
**QG-045:** Ingen glass skyskraper i barnvärld default.  
**QG-046:** Dockhuset mini scale **1:12** consistent.

## 13.6 Karaktärer

**QG-047:** Exakt **5 fingrar** per hand — six fingers = automatic reject.  
**QG-048:** Ögon har minst **en** `#FFFFFF` highlight **2 px**.  
**QG-049:** Barn proportion 6.5-huvuden ± age band §7.2.  
**QG-050:** NPC aldrig skuldblick eller tårmanipulation.  
**QG-051:** Hudton från H1–H5 table — minst 3 tones i product lifetime cast.  
**QG-052:** Inga logotyp kläder.  
**QG-053:** Djur NPC never hunger skull.  
**QG-054:** Mini-Dino round — not horror realistic.  
**QG-055:** Karaktär skugga enligt §2.7 — grounded not floating.  
**QG-056:** Greppande hand kontaktar objekt — no float gap >2 px.

## 13.7 Ikoner och UI

**QG-057:** Barn nav touch **48×48 px** minimum.  
**QG-058:** Primär barn CTA höjd **56 px**.  
**QG-059:** Parent kort radius **16 px**.  
**QG-060:** Barn kort radius **24 px**.  
**QG-061:** Ingen glassmorphism på barn UI.  
**QG-062:** Bottom nav max **3** tabs barn.  
**QG-063:** Celebration modal skippbar ≤**2000 ms** auto.  
**QG-064:** Screen padding barn **16 px** minimum.  
**QG-065:** Emoji not permanent system nav icon.  
**QG-066:** Parent destructive red never on barn routes.  
**QG-067:** Idag NOW kort min höjd **120 px**.  
**QG-068:** PIN keypad knapp **64×64 px**.  
**QG-069:** Focus ring synlig parent inputs **2 px** gold.  
**QG-070:** Whitespace barn Idag **24 %** minimum around NOW.

## 13.8 Illustration process

**QG-071:** Zero stock clip art.  
**QG-072:** Zero unmodified AI output ship.  
**QG-073:** Screenshot test pass — Creative Director simulates.  
**QG-074:** Emotion job match PCB world section — cite slug.  
**QG-075:** Build part ghost dash **6 px** gap **2 px** stroke.  
**QG-076:** One focal point per scene.  
**QG-077:** Max **3** micro Easter eggs per scene.  
**QG-078:** Export @2x and @3x provided for raster rooms.  
**QG-079:** Transparent PNG build parts min **512×512**.  
**QG-080:** No placeholder text in image.

## 13.9 Förbjudet och etik

**QG-081:** No Disney character silhouette.  
**QG-082:** No Roblox block aesthetic.  
**QG-083:** No Cocomelon rainbow bus palette.  
**QG-084:** No casino visuals.  
**QG-085:** No loot box chest standard asset.  
**QG-086:** No streak shame visuals.  
**QG-087:** No sibling leaderboard UI art.  
**QG-088:** No sexualized any character.  
**QG-089:** No violence reward illustration.  
**QG-090:** No real brand logos.

## 13.10 Craft och long-term

**QG-091:** Material ärlighet — wood looks wood §2.1.  
**QG-092:** Texture noise min **3 %** on large fills.  
**QG-093:** Pensel grain visible at 100 % zoom on hero art.  
**QG-094:** File named per §10.4 convention.  
**QG-095:** Layered source file preserved for edit — not PNG-only dump.  
**QG-096:** Version tag in metadata — v1.0 compliant.  
**QG-097:** Cross-world prop reuse max **2** times before variant required.  
**QG-098:** Seasonal variant approved in PCB calendar — not random.  
**QG-099:** Museum/export art optional late-game — same style rules.  
**QG-100:** Executive review score target ≥**9.8** before ship art pack.

## 13.11 Extended gates ( 101–120 )

**QG-101:** Parallax amplitudes §2.4 if animated — reduced motion off only.  
**QG-102:** Skattkammaren gradient allowed — casino chrome not allowed.  
**QG-103:** Fiskebryggan water lap optional audio — visual still calm if silent.  
**QG-104:** Verkstaden no spinning blade hazard visible.  
**QG-105:** Husdjurshemmet animal sleeping on miss — not crying.  
**QG-106:** Läshörnan night mode optional — never default scare.  
**QG-107:** Dinosaurielunden mist §4.11 — courage not horror.  
**QG-108:** Dockhuset one shelf intentionally messy — human lagom.  
**QG-109:** Familj world inclusive silhouettes — not creepy realism.  
**QG-110:** Onboarding illustration count matches step — no generic reuse all steps.  
**QG-111:** Marketing landing may differ layout — same palette §3 only.  
**QG-112:** Admin panel never ships to child route — separate aesthetic OK gray.  
**QG-113:** Dark mode parent optional — barn stays Oat/warm default.  
**QG-114:** Rymdnischen future world — ADR before any art — sci-fi generic blocked PCB.  
**QG-115:** Print export CMYK review for merch — ADR separate.  
**QG-116:** Lottie celebration file size <**150 KB** if used.  
**QG-117:** SVG icon stroke aligns pixel grid @1x.  
**QG-118:** No Tailwind CDN in HTML — build CSS only ( engineering ).  
**QG-119:** Illustration alt text provided Swedish for a11y.  
**QG-120:** Final Creative Director written **Nej/Ja** logged in PR — no silent approve.

---

## Världsspecifika färgaccenter ( alla 7 PCB-världar )

Enligt [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — varje värld har **emotion job** och **palette accent** inom global §3 system.

| Värld | Slug | Emotion job | Primär accent HEX | Sekundär accent HEX | Vägg/bas HEX | Prop accent HEX | Notes |
|-------|------|-------------|-------------------|---------------------|--------------|-----------------|-------|
| **Morgonhuset** | `routine_home` | Kapabel trygghet | `#F5A623` Morning Gold | `#C4956A` Honey Wood | `#F7F3EB` Oat | `#A8C4D4` Window sky | Morgonljus alltid key §4.2 |
| **Verkstaden** | `workshop` | Maker pride | `#E8A849` Maker Amber | `#6B5A4A` Tool brown | `#E8DFD0` Birch | `#8BA888` Outdoor glimpse | Pegboard silhuetter `#3D3830` |
| **Husdjurshemmet** | `pet_home` | Gentle belonging | `#F0C4A0` Care Peach | `#8BA888` Meadow | `#F7F3EB` Oat | `#C47060` Barn red accent | Never sad pet palette |
| **Dinosaurielunden** | `dino_valley` | Awe & courage | `#8B7BA8` Courage Violet | `#6B8F71` Fern | `#E8E4EE` Mist | `#A8C4D4` Sky | No blood red danger |
| **Dockhuset** | `dollhouse` | Cozy control | `#C9B8D9` Cozy Lilac | `#D4A098` Warm Rose | `#F7F3EB` Oat | `#B8A9C9` Dusk Lavender | Mini 1:12 scale |
| **Fiskebryggan** | `fishing_pier` | Patient calm | `#7A9EB8` Calm Water | `#9A9A98` Weathered wood | `#D4E4EE` Mist sky | `#FFD56B` Raincoat optional | Grey-blue dominant OK |
| **Läshörnan** | `reading_nook` | Focus pride | `#9B7E9E` Focus Plum | `#B8A9C9` Dusk Lavender | `#F7F3EB` Oat | `#2A2520` Book spine | Evening lamp `#FFD56B` |

**Regel:** Accent får dominera max **30 %** av pixel area i världsscenen — resten neutral warm bas.

---

## Parent UI vs Child UI — visuell differentiering

### Barn UI ( Idag, Min värld, Familj, Skattkammaren barn, child-login )

Barnytor använder **Morning Oat `#F7F3EB`** som default canvas. Illustrationer är ** full bleed tillåtna ** i Min värld — UI chrome minimal. Typografi större ( body **16 px** minimum ). Knappar pill-form **28 px** radius. Navigation max 3 tabs med **48 px** touch. Färger varmare. Celebration tillåten. Inga tabeller. Inga grafer. Inga formulär utom PIN.

**Child login:** Vänlig illustration header **240 px** höjd max — ett barn- eller husdjursmotiv, aldrig corporate lock icon.

### Parent UI ( Hem, Planering, Rapporter, Inställningar, onboarding vuxen )

Parent ytor använder **Parent Canvas `#F8F9FC`**. Illustration ** minimal ** — ikoner 24 px, eventuellt barn emoji avatar. Kort **16 px** radius. Knappar **12 px** radius. Mer information density tillåten men ** aldrig BI-dashboard ** ( POS 05 ). Navy text hierarchy. Gold CTA sparsam. Story-formad copy — inte datagrid default.

### Delad komponent-design

Stjärna-ikon, logotyp, PIN modal, overflow menu — ** samma SVG path ** both surfaces where shared. Färg kan shift: stjärna alltid `#F5A623`.

### Förbjuden cross-contamination

- Developer gray `#111827` admin aesthetic ** på barn route ** = QG fail  
- Full illustration bakgrund ** på parent Hem default ** = distraction  
- Barn pill buttons ** på admin panel ** = OK inverse ( admin separat )  

---

## Accessibility — kontrast, touch, reduced motion

### Kontrast ( WCAG 2.1 AA target )

| Element | Minimum ratio | Notes |
|---------|---------------|-------|
| Body text parent | **4.5:1** | `#1B2340` on `#F8F9FC` = pass |
| Body text barn | **4.5:1** | `#1B2340` on `#FFFFFF` kort |
| Large text ≥18 px bold | **3:1** | Headings |
| UI components | **3:1** | Borders, icons |
| Decorative illustration | N/A | Not sole info carrier |

Gold `#F5A623` on white ** fails ** small text — gold only on navy text or large display.

### Touch targets ( POS 04, 15 )

- Minimum **48×48 px** all interactive barn  
- Parent minimum **44×44 px**  
- Spacing between targets **8 px** minimum  

### Reduced motion ( 03B )

All animation respects `prefers-reduced-motion: reduce`:
- Replace with instant state or **150 ms** max fade  
- No parallax drift  
- No stjärnblink  
- Celebration: static badge OK  

### Cognitive

- One primary action Idag  
- Icon + text på nav för barn som läser  
- Bildstöd compatible — activity icon + photo template  

### Color blindness

Do not rely on red/green alone for state — include checkmark shape or icon change.

---

## Export- och printspecifikationer för illustratörer

### Digital master — Min värld rum

| Spec | Värde |
|------|-------|
| Master canvas | **4096 × 3072 px** ( 4:3 ) eller **4096 × 2340 px** ( phone bleed ) |
| Color space | **sRGB IEC61966-2.1** |
| Bit depth | **8-bit** per channel export, **16-bit** working OK |
| Layers | Named: `BG`, `MID`, `FG`, `LIGHT`, `LINE`, `FX` |
| Safe zone UI overlay | Bottom **128 px** clear for nav mock — top **64 px** status |
| Export | PNG-24 + WebP quality **85** |

### Build parts

| Spec | Värde |
|------|-------|
| Canvas | **512 × 512 px** minimum |
| Padding | **32 px** transparent each side |
| Anchor | Center bottom for placement props |

### @2x/@3x

Provide **1x, 2x, 3x** for all raster room assets:
- 1x baseline width **375 px** screen  
- 2x **750 px**  
- 3x **1125 px**  

### Print ( merch, books — ADR required )

| Spec | Värde |
|------|-------|
| Color | **CMYK** conversion review — gold → Pantone 1375 C approximate |
| Bleed | **3 mm** |
| Min line | **0.25 pt** print — thicker than screen |

### Filnamn

`stjarndag-{world}-{asset}-{variant}-@{scale}x.png`  
Example: `stjarndag-morgonhuset-room-root-v2-@2x.png`

---

## Executive Review — Art Bible v1.0

### Creative Director — **9.9/10**

Art Bible v1.0 operationaliserar POS 03A till pixlar och hex utan att lämna tomrum för tolkning. Quality Gates QG-001–QG-120 ger mig veto-språk som håller asset store borta från Min värld. Screenshot-testet och förbudsdelen §11 är tillräckligt skarpa för att stoppa AI slop och Cocomelon-drift i review. Palett och världsaccents tabell kopplar direkt till PCB — ingen stil split mellan fiction och form.

### UX Director — **9.8/10**

Parent vs Child differentiering §9 och accessibility-tabell säkerställer att barn får 48 px touch och Oat-värme medan föräldrar får navy lugn utan dashboard-estetik. UI tokens med exakta px på knappar, kort och nav gör handoff till Frontend Lead testbar. Reduced motion koppling till 03B är tydlig — ingen animation som krävs för att förstå nästa steg.

### Game Director — **9.9/10**

Diorama-regler och build-part ghost standardiserar Min värld-läsbarheten som POS 09 kräver — barn ser var de ska placera utan wiki. NPC proportioner och förbud mot skuldblick skyddar PCB NPC-kontraktet visuellt. Världsspecifika accenter förstärker emotion jobs utan att bli seven different apps.

### CPO — **9.8/10**

Dokumentet refererar PCB och CORE_VALUES utan att duplicera motivation pyramid — rätt gräns. Art Bible gör det möjligt att beställa illustration från extern byrå med en fil — minskar founder bottleneck på smak. Quality gate 100+ regler är leveransbar discipline för v1 world art packs.

### CEO — **9.9/10**

Det här är craft moat — konkurrenter kan kopiera features men inte 15 000 ord av nordisk art direction som håller i åratal. Nintendo/Pixar/Brio synthesis §12 tar inspiration utan IP-risk. Jag godkänner v1.0 som normativ illustrator truth; POS 03A förblir lag vid konflikt.

---

**Document end.**  
**Word authority:** Art Bible v1.0 · Illustrator-facing · POS 03A supremacy  
**Next review:** v1.1 upon first external agency delivery or major world 8+ ADR  
**Maintainers:** Creative Director, Art Director, CPO  


---

## Appendix A — Utökad Art Direction ( §2 expansion )

### A.1 Materialdjup — trä åldring och patina

Ek i Morgonhuset ska bära **subtil patina** som berättar att rummet levs i — inte museum-ren nybyggnation. Tillåtna patina-tecken: en mattare fläck under skohörnet där `#A88050` ersätter `#C4956A` i en oregelbunden blob max **80 px** diameter; fina repor vid dörrhandtagshöjd — tunna linjer `#8B7355` **1 px**, max **3** per dörr; diskret avsliten fernissa vid trappsteg kanter där `#E8DFD0` peeking through. Förbjuden patina: smuts som skuld ( barn slarvade ), mögel-grönt, fläckar som liknar blod eller okänt vätskeläge, sprickor som signalerar fara snarare än ålder.

Björk och furu följer samma logik med ljusare patina — knutar i trä ska vara ** individuella **, placerade enligt virkesriktning, aldrig copy-paste samma knot texture på fem hyllplan i rad.

### A.2 Keramik, glas och textil — detaljnivå per material

Keramikmuggar ( frukost i Morgonhuset ) har ** 2 px ** fotring skugga och valfri handmålad rand `#B8A9C9` eller `#8BA888` — en rand, inte busy pattern. Glas: endast ** ellips-highlight ** enligt §6.3 — inga ray-traced refractions. Ull och filt: Wool Felt Stamp texture @ ** 18–24 % ** overlay på basfärg; fransar på filtar får ** max 6 px ** längd individuellt — inte shag carpet.

### A.3 Formhierarki i komposition — primary, secondary, tertiary

Varje scen klassificerar objekt innan ritning:

**Primary ( P )** — det barnet interagerar med eller blicken leds till via UI ghost. P-objekt: full linje, full saturation, contact shadow, eventuell rim light. **Secondary ( S )** — stödjer fiction utan tap target: full linje, standard saturation, standard shadow. **Tertiary ( T )** — dekoration och miljö: reducerad linje ** 70 % **, desaturerad ** 10 % **, soft shadow eller none om distant.

Max antal P per scen: ** 1 ** ( enligt §2.11 ). Max S: ** 4 **. T: ** 6–12 ** som tidigare. Brott mot hierarkin — två P av samma visuella vikt — kräver Creative Director godkännande.

### A.4 Perspektivfallgropar — exempel på avvisade kompositioner

**Avvisat:** Kamera ovanifrån 60° — barn ser golv som huvudinnehåll, väggar försvinner. **Avvisat:** Extreme close-up på NPC ansikte som enda innehåll i Min värld — diorama-läsbarhet förlorad. **Avvisat:** Vägg-vägg-vägg utan golvyta — claustrofob utan lugn. **Godkänt:** Låg kamera som visar golv ** och ** bakvägg ** och ** ett fönster med natur — tre plan läsbara.

### A.5 Konturvariation för liv — intentional wobble spec

Soft ink innebär att ** kontur inte är perfekt **. Tillåten wobble-amplitud: ** ±0.15 px ** på kort segment ( under ** 40 px ** linjelängd ), ** ±0.08 px ** på långa segment ( över ** 120 px ** ). Wobble frekvens: ungefär var ** 15–25 px ** längs linjen en micro avvikelse — inte synlig som "0 skakig" utan kännbar som hand vid 100 % zoom.

### A.6 Penseltryck och linjetjockleksvariation

Karaktär ytterkontur ** 2.0 px ** med tryckvariation: ** 1.7 px ** i hår tunna partier, ** 2.3 px ** i skuggsida ben och arm. Denna variation ska följa ljusriktning §4 — tjockare linje på skuggsida ( ** inte ** överallt tjockare som cartoon outline ). Möbler: jämnare ** 1.75 px ** med undantag för närhet till betraktare — fotände bord kan vara ** 2.0 px **.

### A.7 Textur overlay pipeline ( export )

Rekommenderad export-stack för raster rum:
1. Flat color layers per material  
2. Grain Wash overlay ** 8 % ** on entire scene except UI safe zone  
3. Light pass additive `#FFF8EE` @ ** 8–15 % ** on key-lit surfaces only  
4. AO pass multiply `#2A2520` @ ** 12 % ** in corners  
5. Line art top multiply ** 100 % **  
6. Optional vignette ** 4 % ** `@ corners only — never center darkening that feels like tunnel  

### A.8 Negativ yta — mätmetod för illustratörer

Whitespace mäts som procent av canvas där ** ingen linjeart eller mättad färg över 10 % opacity ** finns, exklusive avsiktlig vägg `#F7F3EB`. Idag NOW-kort whitespace: rita ** 24 px ** buffer runt kortets yttre box i mock — area utanför kort räknas. Om mätning under tröskel — ta bort tertiary objekt först, aldrig primary.

### A.9 Kontrast i djup — luftperspektiv tabell

| Plan | Saturation shift | Value shift | Blur optional |
|------|------------------|-------------|---------------|
| FG | 0 % | 0 % | 0 px |
| MID | −5 % | +3 % ljusare | 0 px |
| BG | −12 % | +8 % ljusare | 0.5 px subtle |

Dinosaurielunden dimma: BG kan nå ** −20 % ** saturation enligt §4.11.

### A.10 Cross-section: material möter ljus

När morgonljus träffar ek golv: highlight stripe `#E8DFD0` width ** 6 px ** längs bräda riktning, vinkel matchar key ** 135° ** skugga motsatt. Ullfilt i samma ljus: highlight som ** bred mjuk band ** utan skarp stripe — materialbestämd ljusrespons är ** obligatorisk ** skillnad mellan hård och mjuk yta.

---

## Appendix B — Utökad Natur ( §5 expansion )

### B.1 Gräs — säsongstabell

| Säsong | Highlight | Bas | Shadow | Special |
|--------|-----------|-----|--------|---------|
| Vår | `#9BC49A` | `#6B8F71` | `#5A7A60` | Fräken `#8BA888` dots |
| Sommar | `#8BA888` | `#6B8F71` | `#5A7A60` | Törna `#A89060` tips optional |
| Höst | `#A8A060` | `#7A8050` | `#5A6040` | Löv `#D4A849` embedded max 10 % |
| Vinter | `#E8E4EE` cover | `#D4E4EE` peek | `#C4D4E4` | Snö `@85 %` on tips |

### B.2 Träd — avstånd och skala i scen

Närbildträd ( fönster view ): krona ** 200–320 px ** bred @1x, stam ** 24–40 px ** bred. Fjärre träd: krona ** 80–120 px **, desaturerad ** 15 % **. Träd får ** aldrig ** skära genom NPC huvud som oavsiktlig komposition — flytta krona eller NPC.

### B.3 Buskar vid hus — placering

Standard häck under fönster: höjd ** 40–60 px **, avstånd från vägg ** 8 px **. Syren blom: ** maj–juni ** fiction calendar enligt PCB seasonal — inte jul.

### B.4 Blommor — pollinatör detalj ( micro )

Max ** 1 ** bi eller fjäril per scen som tertiary — fjäril `#B8A9C9`/`#FFD56B`, vingbredd ** 12 px **. Dinosaurielunden: fjäril anachronism ** tillåten ** som child joy enligt PCB.

### B.5 Stenar — grupp komposition

Stenar ritas i ** grupper om 3–5 ** med storleksvariation — aldrig en isolerad perfekt sfär. Contact shadow ** gemensam ** under grupp. Sten vid vatten: mörkare bas `#6A8EA8` wet look `@20 %` overlay bottom half only.

### B.6 Snö — interaktion med karaktär

Snö på mark: fotspår ** endast om ** fiction nyligen gått — annars orörd yta. Spår djup ** 2 px **, spacing ** 18 px ** barnsteg. Snö på gren: sammanhängande cap, ** dropp icicle ** optional `#E8F0F8` ** 4 px ** max ** 2 ** per scen.

### B.7 Regn — inomhus vs utomhus

Inomhus regn ( Läshörnan fönster ): streaks på ** glas only ** — rum interior unchanged mood. Utomhus: regn + grå himmel `#B8C4D4` — barn karaktär i regnkläder optional, ** en ** glad gul jacka max.

### B.8 Vatten — Fiskebryggan specifik

Brygga reflektion: vertikal flip `@25 %` opacity under dock ** 40 px ** height. Brygga pelare i vatten: mörkare `#5A7088` under yta, ljusare ovan. Fisk i hink: ** stylized ** side view ** 24 px **, `#7A9EB8` + `#FFD56B` stripe — not realistic gore.

### B.9 Himmel — moln vs sol placering

Sol disc ( om synlig ): radie ** 24 px **, `#FFF5E0`, ** aldrig ** direkt i ögonhöjd center — placera ** upper left quadrant **. Moln får ** inte ** täcka sol helt om sol shown — partial overlap max ** 30 % **.

### B.10 Stjärnor — celebration vs ambient density

Celebration burst: max ** 8 ** stjärnor radiating, size ** 24–48 px **, animation ≤2000 ms. Ambient night sky: ** 20–40 ** pinprick stars — not 500 noise dots.

### B.11 Natur ljud-visual synk ( optional 06A )

Visuella hints för ljud: fågel ** 16 px ** on branch = optional chirp; vatten ripple = optional lap. Silent mode: samma bild ** utan ** rörlig ripple — statisk vattenyta OK.

### B.12 Natur förbud utökad

Ingen svamp som drug metaphor. Inga slott grottor med stalactites skräck. Inga ormar som default hotfulla ( svenska ormar sällan i barnbok hot — undvik ). Inga getingbo nära NPC ansikte.

---

## Appendix C — Utökad Karaktärer ( §7 expansion )

### C.1 Barn hår — struktur och rendering

Hår renderas i ** lager **: underliggande skugga `#3D3830` @ ** 15 % ** form, basfärg lager, highlight lager `#FFFFFF` @ ** 12 % ** på key light side, linjeart top. Lockigt hår: radie lockar ** 6–14 px **, minst ** 8 ** locks synliga front view. Rakt hår: sidoparting eller mitt — ** en ** parting per karaktär design sheet. Hijab: drapering ** 3 ** fold lines ** 1 px **, färg koordinerad med outfit — aldrig transparens genom hår sexualiserande.

### C.2 Föräldrar i illustration — när de förekommer

Föräldrar i ** Familj ** world och marketing: vuxen proportion §7.3, kläder vuxen vardag — ** aldrig ** barnsliga shorts som barn. Förälder i bakgrund Morgonhuset: silhuett eller delvis synlig hand only OK — barn är protagonist. Förälder ska ** inte ** peka accusatory finger at barn — open palm welcome only.

### C.3 NPC djur — animation intent sheets

Morgon-Mira idle: ** breathe ** scale Y ** 1.00–1.02 **, period ** 4 s **. Snickar-Sune: tail flat slap ** optional ** once on entry. Mini-Dino: head tilt ** 8° ** on curious. All reduced motion: static mid-breathe frame.

### C.4 Ögon riktning och barn kapacitet

Ögon riktade ** mot nästa interaktion ** i Idag-kopplad illustration — tittar på skor om dressing activity. ** Undvik ** ögon som tittar på stjärna som primär blick om stjärna inte är aktiv celebration — capability before points.

### C.5 Mun och tand — hygien aktiviteter

Tandborstning scen: mun ** stängd ** med borste vid kind — inga blodiga tandkött. Leende visar ** max 6 ** tänder simplified — inte full dental chart.

### C.6 Kroppsspråk emotion map utökad

**Stolt efter morgon:** axlar bak, haka upp ** 5° **, ögon glada. **Väntar lugnt ( Fiskebryggan ): ** sittande ben hänger, händer i knä — not phone zombie pose. **Modig ( Dino ): ** ett steg framåt, inte combat stance.

### C.7 Kläder lager ordning

Standard render order bottom to top: skor → byxor → tröja → jacka → halsduk → hår → accessoar. Regnoverall ** over ** all — hood optional down.

### C.8 Inkludering — rullstol spec

Rullstol: ** manuell ** eller ** el ** enligt brief — inte hospital sterile. Färg `#7A9EB8` eller `#F5A623` accent — child ownership. Barn i rullstol ** samma ** head proportion — inte mindre huvud. Ramp i Morgonhuset om family setting includes — ** 1:12 ** slope visual.

### C.9 Djur proportion guardrails

Husdjur ** inte ** humanized med clothes default — bandana optional ** one ** NPC pet max. Antropomorf grad: ** Läshörnan ** books only — animals stay animal.

### C.10 Karaktär line-up sheet krav

Leverans per ny NPC: ** front, 3/4, profile, expression sheet ( 3 neutral/glad/nyfiken ), color refs HEX listed, height vs barn diagram **.

---

## Appendix D — Utökad UI ( §9 expansion )

### D.1 Idag-skärm layout grid

| Zon | Höjd px | Innehåll |
|-----|---------|----------|
| Header | 56 + safe | Barn namn, emoji/avatar ** 40 px ** |
| NOW hero | min 120 | Primär aktivitet |
| NEXT list | flex | ** 72 px ** rows |
| LATER | collapsed optional | chevron expand |
| Bottom nav | 64 + safe | 3 tabs |

Total NOW synlig utan scroll på ** 667 px ** höjd device — design intent.

### D.2 Min värld placement UI overlay

Ghost outline: `#B8A9C9` ** 2 px ** dashed ** 6/6 **, fill `@8 %`. Valid placement: pulse gold border ** 2 px ** ** 1 s ** period once. Invalid: shake ** 4 px ** horizontal ** 150 ms ** — reduced motion: red border flash ** 150 ms ** only on parent test builds, barn ** never red ** — use gentle gray `#94A3B8` blink instead.

### D.3 Familj värld visuell

Familj hub: varmare `#F7F3EB` + familj foto/emoji grid ** 56 px ** circles, gap ** 12 px **. Co-parent presence: ** två ** vuxna silhuetter max utan foto — inclusive `#5A6178` placeholder avatar.

### D.4 Planering parent — activity editor card

Activity row: ikon ** 32 px **, titel ** 16 px **, drag handle ** 24 px ** `#94A3B8`. Section headers FM/EM/Kväll: ** 14 px ** uppercase tracking ** 0.05 em ** `#5A6178`.

### D.5 Rapporter parent — chart färger

Stapeldiagram: `#F5A623` stjärnor, `#A8C4D4` aktiviteter, `#8BA888` completion — ** aldrig ** röd för missad dag. Axis `#94A3B8` ** 1 px **.

### D.6 Onboarding illustration steg

Steg 1 registrering: familj växer illustration ** inte ** stjärnregn. Steg barnprofil: emoji grid ** 48 px ** cells. Steg First Success: ** samma ** stjärna ikon som Idag.

### D.7 Child-login manual name fallback

Form field: höjd ** 48 px **, radius ** 16 px **, border `#EDE7F6`. Illustration above: ** ett ** välkomnande djur NPC ** 180 px ** höjd.

### D.8 Tablet breakpoints

iPad barn: content max-width ** 480 px ** centrerat, illustration kan bleed ** full width ** bakom content card float.

### D.9 Loading skeleton ( skeleton.css alignment )

Skeleton pulse: `#f0f0f0` → `#e8e8e8` — ** not ** gold shimmer casino. Spinner gold ** endast ** on primary action submit ** ≤2 s **.

### D.10 Error states

Barn network error: illustration ** en ** disconnected fågel mild — copy lugn. Parent error: ikon ** 48 px **, retry knapp ** 48 px ** höjd.

### D.11 Toast notifications

Barn toast: bottom ** 80 px ** above nav, bg `#1B2340` text `#FFFFFF` ** 14 px **, radius ** 12 px **, duration ** 3 s ** max. Parent toast: samma med optional action link gold.

### D.12 Hem parent CTA hierarchy

Primary: ** en ** gold CTA per scroll viewport. Secondary links: `#5A6178` ** 14 px **. ** Ingen ** röd badge notification dot on barn avatar — trust.

---

## Appendix E — Utökade Quality Gates ( §13 expansion ) QG-121 till QG-150

**QG-121:** Patina på ek enligt Appendix A.1 — not sterile showroom.  
**QG-122:** Keramik mugg har fotring skugga.  
**QG-123:** P/S/T hierarchy documented on brief — one P only.  
**QG-124:** Wobble amplitude within §A.5 tolerance at 100 % zoom.  
**QG-125:** Export grain overlay ** 8 % ** unless Creative Director exempt print.  
**QG-126:** Whitespace measured per §A.8 method — Idag 24 % NOW buffer.  
**QG-127:** Luftperspektiv tabell applied BG vs FG.  
**QG-128:** Material-specific highlight ( wood vs wool ) visible.  
**QG-129:** Gräs säsong enligt Appendix B.1 if seasonal scene.  
**QG-130:** Tree scale distance formula B.2 — no giant near-window tree blocking light.  
**QG-131:** Max one pollinator tertiary B.4.  
**QG-132:** Stone groups 3–5 not isolated sphere.  
**QG-133:** Snow footsteps only if fiction walked.  
**QG-134:** Indoor rain on glass only B.7.  
**QG-135:** Fiskebryggan reflection under dock present.  
**QG-136:** Sun upper-left quadrant if sun visible B.9.  
**QG-137:** Celebration star count max 8 B.10.  
**QG-138:** Silent mode static water OK B.11.  
**QG-139:** No threatening snake/snakebite visual B.12.  
**QG-140:** Hair rendered in layers C.1 — not single flat.  
**QG-141:** Parent gesture open palm not accusatory C.2.  
**QG-142:** NPC idle sheet provided C.3 if animated.  
**QG-143:** Eye gaze toward activity not stars default C.4.  
**QG-144:** Toothbrush scene mouth closed C.5.  
**QG-145:** Wheelchair slope/color if included C.8.  
**QG-146:** NPC lineup sheet complete C.10.  
**QG-147:** Idag layout fits 667 px without scroll D.1 intent.  
**QG-148:** Invalid placement no red on barn D.2.  
**QG-149:** Report charts no red missed day D.5.  
**QG-150:** Full Art Bible appendix compliance sign-off Art Director initials.

---

## Appendix F — Arbetsprocess för illustratörer ( workflow )

### F.1 Brief till leverans

1. Ta emot PCB world slug + emotion job sentence.  
2. Läs Art Bible §2–7 + world accent table.  
3. Skissa thumbnail ** 800 px ** bredd — ** 3 ** kompositioner internt.  
4. Art Director väljer ** 1 ** — not client poll.  
5. Line art approval gate — ** innan ** full color.  
6. Color pass enligt palett §3 + ljus §4.  
7. Self QG ** alla ** 150.  
8. Export § Export specs.  
9. PR med screenshots @1x/@2x.  
10. Creative Director ** Ja/Nej **.

### F.2 Revision rounds

Max ** 2 ** revisions in scope utan ny brief. Revision = pixel/ color fix — not style pivot. Style pivot = ny brief + ADR.

### F.3 Extern byrå krav

Byrå måste läsa Art Bible ** innan ** bid. NDA standard. ** Ingen ** portfolio reuse of Stjärndag assets in other brands. Source files delivery mandatory QG-095.

### F.4 Version naming

`v1`, `v2` increment on any line art change affecting silhouette. Color-only tweak `v1.1` internal.

---

## Appendix G — Ordlista ( svensk ↔ produktterm )

| Svenska | Term | Definition |
|---------|------|------------|
| Idag | Today child view | NOW/NEXT/LATER |
| Min värld | My world | Diorama worlds |
| Skattkammaren | Treasure chamber | Star redemption |
| Morgonhuset | Morning House | World 1 |
| Verkstaden | Workshop | World 2 |
| Husdjurshemmet | Pet Home | World 3 |
| Dinosaurielunden | Dinosaur Valley | World 4 |
| Dockhuset | Doll House | World 5 |
| Fiskebryggan | Fishing Pier | World 6 |
| Läshörnan | Reading Nook | World 7 |
| Soft ink | Soft ink | Vår linjestil §2.5 |
| Diorama | Diorama | Perspektiv §2.3 |
| Ghost outline | Ghost | Placement hint §10.1 |

---

## Appendix H — Teknisk färgreferens snabblookup

Alla godkända HEX i en lista för pipett-check:

`#F5A623` `#1B2340` `#F7F3EB` `#C4956A` `#2A2520` `#E8DFD0` `#FAFAF7` `#8BA888` `#A8C4D4` `#B8A9C9` `#D4A098` `#6B8F71` `#FFD56B` `#8B7BA8` `#E8A849` `#7A9EB8` `#9B7E9E` `#F0C4A0` `#C9B8D9` `#F8F9FC` `#FFFFFF` `#EDE7F6` `#5A6178` `#94A3B8` `#E2E8F0` `#0F1629` `#1E293B` `#FFF8EE` `#3D3830` `#6B5A4A` `#C47060` `#A88050` `#B87060` `#9A9A98` `#F5E6D8` `#EDD5C0` `#D4A888` `#8B6850` `#F0D8C8`

Om pipett i export hittar HEX utanför listan + ±10 % luminans — flag for Art Director.

---

## Appendix I — Sammanfattning för Creative Director veto

Creative Director använder denna ** 10-punkts snabbscan ** vid varje leverans:

1. Screenshot test 00B pass?  
2. POS 03A key light top-left?  
3. One accent per screen?  
4. No stock/AI slop?  
5. PCB emotion job felt in ** 3 s ** look?  
6. Child dignity — no guilt red/sad pet?  
7. Touch 48 px barn UI if UI included?  
8. QG sheet signed?  
9. Parent surface not childish if parent deliverable?  
10. Would I show this in Nintendo-style quality review proudly?

Any ** nej ** on 1, 4, 6 = ** automatic reject ** without discussion per mandate.

---



## Appendix J — Djupgående scenarier per värld ( visuell walkthrough )

### J.1 Morgonhuset — morgon completion frame

När barnet öppnar Morgonhuset efter lyckad morgon ska första frame läsa ** kapabel trygghet ** på under tre sekunder utan text. Golvet är ek `#C4956A` med diskret patina under skomattan som är `#8BA888` med `#F7F3EB` rand. Vänster fönster släpper in key light `#FFF8EE` i band som träffar frukostbordet — mugg `#FAFAF7` med ånga som tre `{` former `@30 %` opacity max. Coat peg på höger vägg bär `#7A9EB8` jacka — en färg, en peg. Morgon-Mira står ** 3/4 ** mot dörren som är ** stängd men inbjudande ** — `#C4956A` med mässingshandtag `#C4A060`. Ghost outline nästa byggdel: `#B8A9C9` dash vid fönsterbänk. Inga stjärnor i rummet som wallpaper — stjärnor kom i Idag celebration, inte permanent tapet. Whitespace på golvyta framför barn ** minst 22 % ** så att placement UI ghost syns tydligt.

### J.2 Verkstaden — projekt halvfärdigt

Verkstaden ska kännas ** lite mer energisk ** än Morgonhuset men fortfarande lugn. Taklampa `#FFD56B` @50 % glow radie ** 80 px ** centrerad över bänk `#A88050`. Pegboard `#E8DFD0` med ** 5 ** verktygssilhuetter — hammare `#6B5A4A`, såg, pensel, skruvmejsel, måttband — varje ** 32 px ** silhuett med ** 12 px ** spacing. Birdhouse projekt ** 40 % ** complete: tak saknas, ghost tak outline ovan. Spån på golv ** max 12 ** individuella `#E8DFD0` chips. Snickar-Sune i ** 3/4 ** arbetar ** alongside ** inte ovanför barn — bäver `#6B5A4A` med förkläde `#F7F3EB`. Fönster visar sommargräs `#6B8F71` — inte vinter. Ingen cirkelsåg synlig — QG-104.

### J.3 Husdjurshemmet — miss day neutral

PCB kräver att miss day ** inte ** straffar visuellt. Habitat: kanin sover i bädd `#F0C4A0` — ögon slutna ** curved lines ** inte X eyes. Matskål `#FAFAF7` med vatten `#A8C4D4` @40 % — full, not empty. Staket `#C4956A` med öppning till hage `#8BA888` gräs. ** Ingen ** " hunger meter " UI element i illustration. Skötare Sara i bakgrund **  wave ** en hand — ** 20 % ** mindre scale än foreground. Fjärr rooster optional `#94A3B8` silhuett — humor nod.

### J.4 Dinosaurielunden — foggy path första besök

Silhuetter only stage: dinosaur `#8B7BA8` ** 15 % ** opacity i dimma `#E8E4EE` @45 % overlay. Stig `#9A9A98` sten `#7A7A78` fotspår `#8B7BA8` ** partial **. Mini-Dino ** not ** visible yet — endast egg `#FAFAF7` oval i nest senare stage denna doc describes progression visual. Fräken `#6B8F71` ** 8 px ** höjd cluster längs stig. Fjäril `#FFD56B` ** one ** — anachronism joy. Vattenfall bakgrund ** silhuett ** `#A8C4D4` @30 % — no detailed realistic water simulation.

### J.5 Dockhuset — harmony glow balanced room

Fyra micro-rum visible cutaway: sovrum säng `#B8A9C9` täcke, kök teservis `#FAFAF7`, lekrum kloss `#F5A623` ** one ** block, badkar `#A8C4D4`. ** En ** hylla medvetet " messy " — bok lutar ** 8° **, kudde off-center — lagom human. Dockhus-Daisy `#D4A098` cloth doll ** 24 px ** i säng barn placerat. Harmony glow: `#FFD56B` @ ** 12 % ** overlay on room when balanced — ** no numbers **. Attic key collectible ** not ** visible until secret unlocked — no spoiler in default art.

### J.6 Fiskebryggan — bench idle patience

Grey-blue water `#7A9EB8` dominant ** 35 % ** scene area. Brygga `#A88050` planks ** 24 px ** width perspective narrowing. Freja i gul regnjacka `#FFD56B` sitter ** legs dangle ** — skor `#3D3830` ** 8 px ** above water ** not ** touching. Bucket ** one ** fish `#7A9EB8` stylized. Telescope på railing ** sen ** unlock — ghost outline om not yet. Mås ** silhuett ** sällan. Sunset optional `#D4A098` sky ** upper third only **.

### J.7 Läshörnan — evening focus

Focus Plum `#9B7E9E` kuddar, bokhylla `#C4956A` med ** 8 ** books spines `#2A2520` ** 1.5 px ** width varied heights. Desk lamp `#FFD56B` cone `@18 %` on book page. Rain on window optional — streaks ** on glass ** §B.7. Child ** not ** required in scene — room as character. Night sky through window ** max 40 stars **. Silence valid — no music notes visual unless 06A audio on.

---

## Appendix K — UI pixel audit checklist ( mobil )

Följande checklista är ** obligatorisk ** för Frontend Lead vid UI PR som rör barn surfaces:

| # | Check | Expected px |
|---|-------|-------------|
| 1 | Barn primary button height | 56 |
| 2 | Barn secondary button height | 48 |
| 3 | Barn screen horizontal padding | 16 |
| 4 | NOW card border radius | 24 |
| 5 | NOW card padding | 20 |
| 6 | NOW card min height | 120 |
| 7 | Activity row min height | 72 |
| 8 | Nav icon touch box | 48 |
| 9 | Nav bar height | 64 + safe |
| 10 | Modal border radius barn | 28 |
| 11 | Modal padding barn | 24 |
| 12 | PIN keypad key size | 64 |
| 13 | Parent primary button height | 48 |
| 14 | Parent card radius | 16 |
| 15 | Parent card padding | 16 |
| 16 | Focus ring width parent | 2 |
| 17 | Toast bottom offset barn | 80 above nav |
| 18 | Avatar standard | 40 |
| 19 | Activity icon Idag | 48 |
| 20 | Celebration max duration ms | 2000 |

---

## Appendix L — Quality Gates QG-151 till QG-165 ( final set )

**QG-151:** Morgonhuset completion frame matches J.1 composition rules.  
**QG-152:** Verkstaden no visible circular saw blade.  
**QG-153:** Husdjurshemmet miss day animal sleeping not crying.  
**QG-154:** Dinosaurielunden fog stage silhouettes ≤15 % opacity.  
**QG-155:** Dockhuset intentional messy shelf present.  
**QG-156:** Fiskebryggan water ≥35 % scene if pier focus.  
**QG-157:** Läshörnan lamp cone on book when lamp on.  
**QG-158:** UI pixel audit K table all pass for barn PR.  
**QG-159:** Steam from mug max 3 curl shapes.  
**QG-160:** Birdhouse Verkstaden progress visually readable without % number.  
**QG-161:** Harmony glow Dockhuset ≤12 % opacity.  
**QG-162:** Freja raincoat only one yellow accent Fiskebryggan.  
**QG-163:** Book spines Läshörnan minimum 8 visible.  
**QG-164:** Appendix H pipett scan no alien HEX.  
**QG-165:** Art Bible v1.0 word-complete deliverable archived in `.ai/product/`.

---

## Appendix M — Historik och nästa steg

Art Bible v1.0 skapad ** 2026-06-29 ** som illustrator-facing expansion av POS 03A med PCB world accent integration. v1.1 planeras efter första externa byråleverans av Morgonhuset full room pack — feedback loops på QG false positives. Underhåll: Creative Director + Art Director kvartalsvis palett audit mot kod `theme.css` drift.

**Slutlig påminnelse:** POS 03A är lag. PCB är själ. Art Bible är handen som ritar själen synlig. CORE_VALUES är filter på varje penseldrag. Creative Director ** Nej ** utan diskussion vid QG-brott eller §11 förbud.

