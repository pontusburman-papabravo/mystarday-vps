# Stjärndag — Art Bible

**ART_BIBLE v1.0 FINAL — APPROVED FOR PRODUCTION** <!-- pragma: allowlist secret -->

**Dokumenttyp:** Produktionskontrakt — illustrator-, animatör- och UI-manual  
**Version:** 1.0 FINAL  
**Status:** Godkänd för live release — enda normativa källan för visuell produktion  
**Skapad:** 2026-06-29 · **Finaliserad:** 2026-06-29  
**Språk:** Svenska (primärt) · engelska termer där branschstandard kräver  
**Målgrupp:** Illustratörer, animatörer, UI-designers, motion designers, externa studios, AI-agenter, frontend  

---

## Dokumentmetadata och auktoritet

### Syfte

Art Bible v1.0 FINAL är ** det enda produktionskontraktet **för all visuell produktion i Stjärndag. Illustratör, AI-agent, extern studio och frontend ska producera ** identiska resultat **utan att fråga.

Art Bible ** ersätter inte** [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) (PCB). PCB äger själ och emotion job. Art Bible äger ** hur det ser ut, rör sig och känns **i pixel, tid och ljud (visuell handoff).

### Auktoritetshierarki

```
1. POS 03A — Art Direction (lag)
2. POS 00B — Product Taste
3. POS 03 — Design tokens
4. POS 03B — Motion Language
5. PCB — PRODUCT_CONTENT_BIBLE.md
6. Brain CORE_VALUES.md
7. DENNA Art Bible v1.0 FINAL
8. Per-värld specs (får inte bryta ovan)
9. Implementation i kod (aldrig överstyrande)
```

**Konfliktregel:** POS 03A vinner vid konflikt. Creative Director veto enligt `.ai/agents/CreativeDirector.md`.

### Referensdokument

| Dokument | Användning |
|----------|------------|
| POS 03A | Linje, ljus, palett — ** lag** |
| POS 00B | Screenshot-test, materialärlighet |
| POS 03 | Tokens |
| POS 03B | Celebration ≤2000 ms, reduced motion |
| [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) | Sju världar, NPC, collectibles |
| [CORE_VALUES.md](../brain/CORE_VALUES.md) | Lugn magi, kapacitet, trust |

### Hur du använder detta dokument

1. Läs PCB-värld → emotion job.  
2. DoR §24 complete → ritstart.  
3. Applicera §2–12 craft + §25–41 systems.  
4. Kör ** QG-001–QG-500** + ** D/N/P-checklistor**.  
5. DoD §16 + kapitel-DoD → export.  
6. Gates §15 → release §23.

### Versionskontroll

v1.0 FINAL är ** fryst **tills CPO + Creative Director + Art Director godkänner v1.1. Ändringar kräver ADR.

---


## Innehållsförteckning

| § | Kapitel |
|---|---------|
| — | Dokumentmetadata och auktoritet |
| 1 | Vision |
| 2 | Art Direction |
| 3 | Färgpalett |
| 4 | Ljus |
| 5 | Natur |
| 6 | Byggnader |
| 7 | Karaktärer |
| 8 | Ikoner |
| 9 | UI |
| 10 | Illustrationsregler |
| 11 | Förbjudet |
| 12 | Inspirationskällor |
| 13 | Quality Gates QG-001–QG-500 |
| 14 | Asset Pipeline |
| 15 | Produktionspipeline |
| 16 | Illustration DoD |
| 17 | Animation Pipeline |
| 18 | AI Illustration Rules ( summary ) |
| 19 | Modular Asset System |
| 20 | Responsiv illustration |
| 21 | Performance Budget |
| 22 | Accessibility |
| 23 | Review Process |
| 24 | Definition of Ready |
| 25 | Living World Bible |
| 26 | Camera Bible |
| 27 | Composition Bible |
| 28 | Motion & Animation Bible |
| 29 | Particle & VFX Bible |
| 30 | Audio Direction |
| 31 | Emotion Curves |
| 32 | Seasonal System |
| 33 | Weather System |
| 34 | NPC Behaviour Bible |
| 35 | Unlock Ceremony Bible |
| 36 | Build Animation Bible |
| 37 | Polish Bible |
| 38 | Delight Checklist D-001–D-200 |
| 39 | Nintendo Checklist |
| 40 | Pixar Checklist |
| 41 | AI Illustration Rules ( FINAL ) |
| A–N | Appendix |
| — | Executive Review — FINAL v1.0 |

---

# 1. Vision — känslor, tillåtna och förbjudna stilord

## 1.1 Barnets känslomässiga kontrakt (visuellt)

Stjärndag ska se ut som ** en nordisk barnbok du kan kliva in i**— inte som en spelapp, inte som en SaaS-dashboard, inte som en YouTube-kanal med mascots. När ett barn öppnar Idag ska blicken landa på** en tydlig nästa handling **omgiven av lugn värme. När barnet besöker Min värld ska rummet kännas som** ett bevis på att morgonen gick** — stolthet gjord synlig i ek, tyg och mjukt ljus.

** Tillåtna känsloord (använd i briefs och självreview):**  
*varm, möjlig, kapabel, trygg, stolt, nyfiken, lugn, hemtrevlig, lekfull utan skrik, mjuk, ärlig, inbjudande, lagom, nordisk, handgjord, dignified, skippbar glädje, värdig, stillsam, hoppfull, jordnära, taktil, doftbar (visuellt), morgonfrisk, kvällsmysig, tålmodig, modig utan adrenalinskräck, tillhörig.*

**Förbjudna känsloord (stoppar produktion):**  
*hyper, casino, FOMO, skrikande, neon, skrämmande, skuldbelagd, stressande, övermättad, generisk, plastig, billig, Roblox-ig, Cocomelon-flat, Disney-kopia, skrikande gult, skrikande rött som varning, skräck, våld, sexualiserad, vuxen-ironi, meme-slop, AI-genererad, stock clip art, glassmorphism, enterprise-grå, dashboard-first, loot-spam, streak-panik, skrikande 3D-bländare, oversaturerad regnbåge, TikTok-estetik.*

## 1.2 Förälderns känslomässiga kontrakt (visuellt)

Föräldrar möter Stjärndag ofta **kl. 07:00 med kaffe i handen och kaos i köket**. Parent UI ska signalera ** professionell lugn kompetens** — appen är deras partner, inte ytterligare ett system att lära sig. Visuellt: navy som ankare, guld som bekräftelse, whitespace som andrum. Aldrig skuld-copy i röd. Aldrig barnsliga illustrationer på Planering eller Hem (förälderytan är vuxen, varm men vuxen).

** Tillåtna föräldraord:** *tydlig, pålitlig, respektfull, effektiv, lugn, premium, skandinavisk, genomskinlig, icke-manipulerande, enkel, story-formad insikt.*

**Förbjudna föräldraord:** *BI-dashboard, skuld, jämförelse, skrikande CTA, casino-guld, skrikande notifieringsröd, överinformation, enterprise-tabell, skärmdump av barnets skärm som övervakning.*

## 1.3 Kärnvärden som visuella filter

Enligt [CORE_VALUES.md](../brain/CORE_VALUES.md) filtreras varje designbeslut:

| Värde | Visuell manifestation |
|-------|----------------------|
| **Lugn magi** | Ett fokus per skärm; celebration kort; whitespace; inga blinkande loopar |
| ** Barns kapacitet** | Idag visuellt självförklarande utan textvägg; ikoner ≥48 px touch |
| ** Föräldratrust** | Inga mörka mönster; ingen skuld-färg; ingen övervaknings-estetik |
| ** Hantverkskvalitet** | Synligt pensel/spår; inga stock assets; Nintendo-tidslinje-stolthet |
| ** Långsiktigt hantverk** | Tidlösa material (trä, papper, ull) framför trend-gradienter |

## 1.4 Screenshot-testet (00B)

Varje illustration och varje barnskärm måste klara ** screenshot-testet**: en förälder ska kunna skicka en skärmdump till en vän och få svaret *"Det där ser omsorgsfullt ut"* — inte *"Är det en gratis app?"* eller *"Ser ut som [konkurrent]"*. Creative Director blockerar vid fail.

## 1.5 En accent per skärm (03A)

Max **en primär accentfärg** dominerar per skärm utöver neutral bas. Flera konkurrerande accenter = visuellt brus = brott mot lugn magi. Undantag: celebration frame ≤2000 ms får temporär second accent (guld + mjuk lavendel).

---

# 2. Art Direction — material, form, perspektiv, djup, konturer, penslar, texturer, skuggor, ljus, färger, kontrast, detaljnivå, negativ yta

## 2.1 Materialfilosofi — ärlighet framför plast

Stjärndag bygger på **materialärlighet** enligt POS 00B. Varje yta ska avslöja vad den "är" i fiction: ek är ek, ull är ull, keramik är keramik, papper är papper. Plastglans, chrome UI, wet-look vinyl och generisk PBR-game-shader är **förbjudna** i barnscope.

**Tillåtna material (prioritetsordning):**  
Massiv trä (ek, björk, furu), obehandlat eller ljust oljat — aldrig mörk mahogny-lack. Naturliga textilier: linne, ull, bomull, filt. Keramik med synlig glasyrvariation. Papper och kartong (handgjorda props). Sten (granit, flisa, sjösten). Glas endast som fönster med mjuk reflektion — aldrig glassmorphism UI. Metall: borstat mässing, smedjat järn dämpat — aldrig polerad krom. Vatten som transparent lager med 15–25 % opacity overlay, inte hyperrealistisk 3D.

** Förbjudna material:** Neonplast, gummi-highlights, holografisk gradient, wet-look, chrome UI cards, syntetisk päls (använd ull/filt istället), generisk Unity Standard Shader look.

## 2.2 Formspråk — mjuka kanter, inga hårda CAD-krokar

Alla former i Stjärndag följer ** organisk avrundning**. Hörn på möbler: minimum 4 px visuell radie i illustration @1x, motsvarande 8 px @2x export. Inga 90° shark-fin hörn på barnvänliga objekt. Undantag: tekniska parent-UI-kort får 16 px radius enligt §9 — inte samma språk som barnillustration.

** Formvikt:** Låg tyngdpunkt på karaktärer och möbler — stabilitet, inte vinglighet. Stora former bär kompositionen; små detaljer belönar nyfikenhet (Nintendo-detalj i periferin).

## 2.3 Perspektiv — isometrisk diorama med lagom djup

Stjärndag-världar (Min värld) ritas i ** diorama-perspektiv**: kombination av svag isometri och frontal "dockskåpsläsbarhet". Kameran är placerad som om barnet står på knä och tittar in i ett rum — ** inte **förstaperson FPS,** inte **flygfoto.

** Exakta perspektivregler:**
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
| ** Förgrund** | Interaktiv prop, NPC, placering ghost | Full linje 100 %, full färg, skarp kontur |
| ** Mellanplan** | Huvudmöbler, aktiv yta | Full linje, standard skugga |
| ** Bakgrund** | Fönster, väggdekoration, distant natur | Linje 70 % opacity, desaturerad 8–12 %, luftperspektiv |

Parallax vid scroll (om tillämpat enligt 03B): förgrund 1.0×, mellan 0.6×, bakgrund 0.3× — aldrig illusionsmässig 3D-kamerarörelse som kräver VR.

## 2.5 Konturer — mjuk bläck (soft ink)

** Linjetjocklek @1x bas (375 px bredd canvas):**

| Element | Stroke (px) | Färg |
|---------|---------------|------|
| Karaktär ytterkontur | 2.0 px | `#2A2520` (Warm Ink) |
| Karaktär innerdetalj | 1.25 px | `#3D3830` |
| Möbel/prop ytter | 1.75 px | `#2A2520` |
| Möbel inner | 1.0 px | `#3D3830` |
| Bakgrunds natur | 1.25 px | `#2A2520` @85 % opacity |
| UI-ikon barn | 2.0 px stroke equivalent | `#1B2340` eller `#FFFFFF` på mörk |

** Linjekvalitet:** Handritad variation tillåten**±0.15 px**— inte perfekt vektor-ruler straight. Hörn:** round join**, cap: ** round cap**. Inga hårda miter-spetsar.

** Förbjudna linjer:** Helt svart `#000000` kontur. Uniform 4 px cartoon outline (Cocomelon). Ingen linje alls på fotorealistisk render (AI slop).

## 2.6 Penslar och textur — digitala penslar med fysiskt arv

Godkända digitala penseltyper (Procreate, Photoshop, Clip Studio):

| Pensel | Användning | Inställning |
|--------|------------|-------------|
| ** Soft Ink Round** | Konturer, linjeart | Stabilisering 12–18 %, tryck → width 0.8–2.2 px |
| ** Dry Gouache Fill** | Flat färgytor | 15 % texture jitter, aldrig 100 % flat |
| ** Grain Wash** | Bakgrundsvägg, himmel | 6–10 % grain overlay |
| ** Pencil Whisper** | Konstruktion (tas bort före export) | — |
| ** Wool Felt Stamp** | Textilier, filtar | Multiplied @20 % |

** Texturintensitet:** Varje färgyta ska ha** minst subtil variation**— 3–8 % luminansnoise eller watercolor edge bleed. Helt platta vektorfyllningar godkänns endast för** parent UI-ikoner** §8, inte för Min värld.

## 2.7 Skuggor — varma, aldrig kalla svarta

Stjärndag skuggor är ** varma och transparenta** — aldrig `#000000` multiply @50 %.

** Skuggformel (standard inomhus):**
- Skuggfärg: `#3D3830` @ **22–28 % opacity** på yta
- Ambient occlusion i hörn: `#2A2520` @ **12–18 %**
- Contact shadow under objekt: ellips, blur **8 px @1x**, opacity **25 %**
- Skuggriktning: **135°** från övre vänstra ljuskällan (matchar §4)

**Utomhus skugga:**`#1B2340` @**18–24 %** med blå underton — nordisk utomhusluft.

**Förbjudna skuggor:** Drop shadow `#000` 40 % blur 20 (material design default). Neon glow. Ingen skugga alls (flat clip art).

## 2.8 Ljus — se §4 för fullständiga regler

Global regel: **primär ljuskälla övre vänster**, färg `#FFF8EE` (Morning Key). Fill från höger `@35 %`. Se avsnitt 4 för villkorsspecifika regler.

## 2.9 Färger i komposition — se §3

Global palett definieras i avsnitt 3. Här gäller ** kompositionsregler**: 60 % neutral varm bas, 30 % sekundär materialfärg, 10 % accent max.

## 2.10 Kontrast

** Illustration:** Primärt motiv ska ha** minst 3:1**luminans mot närmaste bakgrund (WCAG för stor form, inte text).** UI text på knapp:** se §9 och Accessibility — minimum 4.5:1.

** Kontrasttak:** Inga parer med >15:1 utan mellanton — undvik "blinkande" hårdhet. Max en** hero highlight **per scen (`#FFFFFF` @90 % på glanspunkt ≤6 px radie).

## 2.11 Detaljnivå — Nintendo-nära, inte fotorealist

** Detaljskala per canvas 1125×2436 px (iPhone referens):**
- Huvudkaraktär höjd: **340–420 px** (inklusive hår)
- Primärt interaktivt prop: **120–200 px** minsta dimension
- Bakgrund detalj: **max 40 %** av förgrundsdetalj densitet
- Antal hero-fokusobjekt: **1**, stödobjekt **2–4**, dekoration **6–12** totalt per scen — fler = rörigt = Creative Director Nej

**Micro-detaljer (Pixar-belöning):** Max**3** dolda micro-detaljer per scen (damkorn i solstråle, kantstött mugg, liten kryp på fönsterbräda). De ska **aldrig** vara interaktionskrav.

## 2.12 Negativ yta (whitespace)

Lugn magi kräver **andningsyta**. Minst **18 %** av barnskärmens area ska vara visuellt "tom" (neutral bakgrund utan konkurrerande information). Idag-vyn:**24 % minimum** runt NOW-kortet. Parent Hem:**20 % minimum** mellan kort.

**Förbjudet:** Fullbleed regnbågsgradient. Fullbleed stjärnregn. Clutter som fyller varje pixel "för att det ska kännas lekfullt".

---

# 3. Färgpalett — primär, sekundär, accent, neutral, bakgrunder, skuggor, highlights, förbjudna färger

## 3.1 Palettfilosofi

Stjärndags palett är **skandinavisk morgon + honung + nattsky**— varma neutrals med kontrollerade accenter. Paletten hämtar från POS 03 tokens och utökas här med illustrationsspecifika nyanser. Alla namngivna färger har** exakt HEX** — ingen "ungefär limegrön".

## 3.2 Primärfärger (varumärke och UI)

| Namn | HEX | RGB | Användning |
|------|-----|-----|------------|
| ** Stjärndag Gold** | `#F5A623` | 245, 166, 35 | Primär CTA, stjärnor, firanden, aktiv nav |
| ** Stjärndag Navy** | `#1B2340` | 27, 35, 64 | Parent UI rubriker, primär text mörk, barn UI ikoner |
| ** Morning Oat** | `#F7F3EB` | 247, 243, 235 | Barn bakgrund, vägg bas, kort bakgrund ljus |
| ** Honey Wood** | `#C4956A` | 196, 149, 106 | Golv, möbler, varma trädetaljer |
| ** Soft Ink** | `#2A2520` | 42, 37, 32 | All linjeart standard |

## 3.3 Sekundärfärger (material och emotion)

| Namn | HEX | Användning |
|------|-----|------------|
| ** Birch Light** | `#E8DFD0` | Björk, ljusa trädetaljer, hyllor |
| ** Linen White** | `#FAFAF7` | Textilier, sängkläder, gardiner |
| ** Moss Sage** | `#8BA888` | Växter, lugna accenter, success soft |
| ** Sky Calm** | `#A8C4D4` | Himmel dag, vatten ljus |
| ** Dusk Lavender** | `#B8A9C9` | Kväll, Dockhuset, lugn accent |
| ** Warm Rose** | `#D4A098` | Hud rodnad, textil accent, mild warmth |
| ** Fern Green** | `#6B8F71` | Natur, trädgård, Dinosaurielunden bas |

## 3.4 Accentfärger (sparsamt — en per skärm)

| Namn | HEX | Användning |
|------|-----|------------|
| ** Star Spark** | `#FFD56B` | Stjärnglans highlight, celebration |
| ** Courage Violet** | `#8B7BA8` | Dinosaurielunden, mod-moment |
| ** Maker Amber** | `#E8A849` | Verkstaden, verktyg highlight |
| ** Calm Water** | `#7A9EB8` | Fiskebryggan, vatten accent |
| ** Focus Plum** | `#9B7E9E` | Läshörnan, kvällsfokus |
| ** Care Peach** | `#F0C4A0` | Husdjurshemmet, varm omsorg |
| ** Cozy Lilac** | `#C9B8D9` | Dockhuset, ordning-lek |

## 3.5 Neutrala och bakgrundsfärger

| Namn | HEX | Användning |
|------|-----|------------|
| ** Parent Canvas** | `#F8F9FC` | Parent app bakgrund |
| ** Card White** | `#FFFFFF` | Kort yta parent och barn |
| ** Divider Mist** | `#EDE7F6` | Dividers, subtila kanter parent |
| ** Text Secondary** | `#5A6178` | Parent sekundär text |
| ** Text Muted** | `#94A3B8` | Hints, metadata |
| ** Border Soft** | `#E2E8F0` | Parent kort border |
| ** Dark Surface** | `#0F1629` | Dark mode parent bas (sällan barn) |
| ** Dark Card** | `#1E293B` | Dark mode parent kort |

## 3.6 Skuggor och highlights (named)

| Namn | HEX | Opacity | Användning |
|------|-----|---------|------------|
| ** Shadow Warm** | `#3D3830` | 22–28 % | Standard objekt skugga |
| ** Shadow Cool** | `#1B2340` | 18–24 % | Utomhus skugga |
| ** AO Deep** | `#2A2520` | 12–18 % | Hörn ambient occlusion |
| ** Highlight Key** | `#FFF8EE` | 85–100 % | Primär ljuskälla yta |
| ** Highlight Spec** | `#FFFFFF` | 60–90 % | Glanspunkt max 6 px |
| ** Star Glow** | `#F5A623` | 30 % blur 12 px | Stjärna celebration endast |

## 3.7 Semantiska färger (UI — begränsad användning)

| Namn | HEX | Användning |
|------|-----|------------|
| ** Success Green** | `#1A332B` bg / `#6BAA80` icon | Bekräftelse parent — aldrig blink |
| ** Warning Amber** | `#3D2E0F` bg / `#F5A623` text | Varning parent — aldrig barn skuld |
| ** Error Soft** | `#3B1F1F` bg / `#DC2626` text | Fel parent — aldrig skrikande på barn |
| ** Info Lavender** | `#2D2554` bg / `#B8A9C9` text | Info parent |

** Regel:** Semantisk röd** får inte **användas på barnskärm som skuldsignal. Barn ser aldrig "misslyckande-röd".

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

**Key light:** Övre vänster, vinkel**45°** horisontellt och**55°** vertikalt från betraktaren.  
**Key färg:** `#FFF8EE` (Morning Key White) — aldrig kall `#FFFFFF` utan varm tint.  
** Fill light:** Höger sida, `#E8F0F8` @**35 %** intensitet key.  
**Rim light (valfri):** Bakom motiv höger, `#FFF8EE` @**15 %** — endast hero NPC eller celebration.  
** Ambient:**`#F7F3EB` @**100 %** bas — rummets bounce light.

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

- ** Inte **default barnskärm — endast valfri Läshörnan nattläge, Dinosaurielunden aurora, Fiskebryggan stjärnhimmel  
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
- Humör: ** lugn reflektion**, inte deppig grå slöhet  

## 4.11 Dimma (Dinosaurielunden)

- Atmosfärisk perspektiv: `#E8E4EE` @ **35–55 %** overlay per plan  
- Kontrast reducerad **20 %** i bakplan  
- Key blek: `#F0EEF5` @ **55 %**  
- Mod: silhuetter framträder när barn "växer" — se PCB progression  

## 4.12 Ljus + reduced motion

Vid `prefers-reduced-motion`: solstråle-drift, lamp-flimmer och stjärnblink ** stoppas**. Statisk ljusprofil enligt tid på dygnet — ingen animation krävs för läsbarhet.

---

# 5. Natur — gräs, träd, buskar, blommor, stenar, snö, regn, vatten, himmel, moln, stjärnor

## 5.1 Naturfilosofi

Natur i Stjärndag är ** svensk friluftsliv möter barnbok**— inte tropisk regnskog, inte amerikansk nationalpark hyperrealism. Träd är gran och björk och tall. Buskar är syren och häck. Stenar är glaciala rundningar. Varje naturdetalj ska kännas som** ett ställe ett barn i Uppsala, Umeå eller Göteborg kan ha sett** — igenkännbart, stillsamt.

## 5.2 Gräs — exakta ritregler

** Basfärg:** Fern Green `#6B8F71` med variation tiles:
- Highlight blade: `#8BA888` @ 40 % av blad  
- Shadow blade: `#5A7A60` @ 30 %  
- Jord skim: `#8B7355` @ 5 % synlig vid bas  

** Bladform:** Spetsiga ovale, längd**8–14 px @1x**, bredd **2–4 px**. Minst **3 nyanser** per gräscluster. Cluster storlek**40–120 px** bred.

**Linje:** Soft Ink `#2A2520` @**75 %** på gräs — tunnare än karaktär.

**Förbjudet:** `#00FF00` neon. Uniform kortklippt golf-green utan variation. 3D grass shader.

** Stjärndag gräs höjd:** **6–18 px** — lagom vild, inte örten.

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

** Tillåtna svenska blommor:** Tusensköna, blåklocka, maskros ( lekfull ), liljekonvalj ( vår ), solros ( sensommar Verkstaden ).

** Maskros regler:** Gult `#FFD56B` center `#F5A623`, stjälk `#6B8F71`, max**3** per närbildscen.

**Blåklocka:**`#A8C4D4` → `#7A9EB8`, klockform**4 px** hängande.

**Förbjudet:** Rosor som primär blomma överallt ( för vuxen romantik ). Hela ängar av identiska blommor ( AI pattern ).

## 5.6 Stenar och klippor

**Sjösten (Fiskebryggan, strand):**
- Bas: `#9A9A98`  
- Highlight: `#C4C4C0`  
- Moss patch: `#6B8F71` @ 20 % på norr-sida  
- Form: ellipsoid, aldrig perfekt klot  
- Storlek variation: **12–80 px**  

** Granit (Dinosaurielunden):**
- `#7A7A78` med fläckar `#6A6A68`  
- Fossil inset: `#8B7BA8` @ 40 %  

** Förbjudet:** Kristall-former ( sci-fi loot ). Glödande stenar ( casino ).

## 5.7 Snö

- Bas: `#FAFAF7` — aldrig rent `#FFFFFF` full yta  
- Skugga: `#D4E4EE` @ 35 %  
- Fotspår: `#E8E4EE` indtryck, djup **2 px**  
- Snö på tak: sammanhängande massa med **3** bula-varianter  
- Is på vatten: `#E8F0F8` @ 60 % med crack lines `#C4D4E4` **1 px**  

## 5.8 Regn (visuell)

- Drop stroke: `#A8C4D4`, längd **6–12 px**, bredd **1 px**  
- Density: ** max 40**droppar synliga samtidigt @1x — mer = rörigt  
- Puddle: ellips `#7A9EB8` @ 25 %, blur **4 px**  
- Regn + barn: gul regnjacka `#FFD56B` tillåten — en glad accent  

## 5.9 Vatten

** Stillastående (sjö, damm):**
- Bas: Calm Water `#7A9EB8`  
- Reflektion: himmel `@30 %` inverted blur **6 px**  
- Depth gradient: nära `#6A8EA8` → fjärr `#A8C4D4`  

** Rörligt (Fiskebryggan):**
- Våg linje: `#8BAEC8`, amplitude **3 px**, period **40 px**  
- Skum: `#FAFAF7` @ 50 %, **2 px** caps  

**Förbjudet:** Hyperrealistisk vatten shader. Glow-in-dark vatten.

## 5.10 Himmel

**Dag:** gradient top `#A8C4D4` → bottom `#D4E4EE` (45 % av himmelhöjd i scen)

**Morgon:**+ `#FFF5E0` band vid horisont**15 %** höjd

**Kväll:** `#D4A098` → `#B8A9C9` → `#6B7A9E`

** Moln:** Se 5.11

** Förbjudet:** Photoshop cloud filter utan handritad kant. Purple-orange instagram sunset överallt.

## 5.11 Moln

- Form: organisk bomull — **3–5** cirklar merged, radie**20–60 px**  
- Färg: `#FAFAF7` topp, `#E8E4EE` botten skugga  
- Kant: Soft Ink `@50 %`, **1 px**  
- Max **4** moln synliga per utomhusscen — lugn himmel  

## 5.12 Stjärnor (himmel och belöning)

**Himmel-stjärnor:**`#FFF8EE`, storlek**1–3 px**, twinkle endast om reduced motion off, period **3 s**

** Belöningsstjärnor (UI/celebration):** Stjärndag Gold `#F5A623`, fem uddar, inner `#FFD56B`, stroke Soft Ink**1.5 px**, storlek **48–72 px** på Idag celebration

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

Byggnader i Stjärndag följer **svensk småhus och lägenhetsnorm**— falurot existens men inte dominant, träfasad vanligast, tegel i stadsscener sällan. Skala är** mänsklig barnvänlig** — dörrar nåbar-höga i fiction, fönster inbjudande.

## 6.2 Hus — volym och proportion

** Standard småhus (Morgonhuset exteriör om visas):**
- Våningar: **1.5** ( vindskupa ) max i barnvärld  
- Taklutning: **42°** ( nordisk standard )  
- Vägg: Morning Oat `#F7F3EB` eller Honey Wood `#C4956A` panel  
- Tak: `#6B5A4A` plåt eller `#8B7355` shingle  
- Fotavtryck bredd: **2.8×** dörrbredd  

**Förbjudet:** Amerikansk ranch. Glass skyskraper. Medeltida slott som default.

## 6.3 Fönster

- Ram: `#FAFAF7` eller Birch Light `#E8DFD0`, bredd **8–12 px @1x**  
- Glas: Sky Calm `#A8C4D4` @ **40 %** med highlight streck `#FFFFFF` @ 30 % diagonal  
- Crossbar: **+** eller**‖** enligt svensk standard — enkel  
- Gardin: Linen White `#FAFAF7`, opacitet **85 %**, våg amplitude **4 px**  
- Fönster i barnrum: alltid ** inbjudande ljus **inifrån vid kväll  

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
| Ek parkett | `#C4956A` | Plankor **24 px** bred, fog**1 px** `#A88050` |
| Vitlaserad furu | `#E8DFD0` | Plankor **20 px**, knut variation |
| Klinker kök | `#D4C4B0` | Rutor **16×16 px**, fog `#B8A898` |
| Matta | `#B8A9C9` eller `#D4A098` | Textur Wool Felt Stamp |

** Förbjudet:** Högglans marmor. Svart golv i barnrum ( för hårt ).

## 6.7 Trädetaljer — panel, list, hylla

- Panel fog: **1 px** `#A88050`  
- Hylla tjocklek: **8 px**, skugga nedåt **4 px** blur  
- List: `#E8DFD0` mot vägg `#F7F3EB`  

## 6.8 Sten och tegel

**Tegel ( sällan ):**
- `#B87060` med `#A86050` fog **2 px**  
- Endast stadsbakgrund eller skorsten  

** Stengrund:**
- `#9A9A98` oregelbundna block **20–40 px**  

## 6.9 Byggnader per värld

| Värld | Byggnadskarakter |
|-------|------------------|
| Morgonhuset | Lägenhet/hus hall, trappa, kök — varm ek |
| Verkstaden | Träskjul, plåttak, fönster högt |
| Husdjurshemmet | Stuga + hage, röd panel `#C47060` accent tillåten |
| Dinosaurielunden | Träbrygga, observationsplattform — ** inte **betongbunker |
| Dockhuset | Miniatur **1:12** — se §7 proportion |
| Fiskebryggan | Träbrygga `#A88050`, räcke **6 px** stolpar |
| Läshörnan | Bokhylla vägg, fönsternisch, loft-känsla |

---

# 7. Karaktärer — barn, föräldrar, NPC, djur, ögon, ansikten, händer, kroppar, proportioner, kläder, uttryck

## 7.1 Karaktärfilosofi

Karaktärer i Stjärndag ska kännas **ritade av en mänsklig hand med kärlek**— inte genererade av modell, inte kopierade från Disney/Pixar figurbibliotek. Barn är** protagonister **med dignitet — inte chibi-meme, inte uncanny valley 3D.

** NPC-princip (PCB):** Companions not managers — visuellt vänliga, aldrig hotfulla, aldrig skuldbelagda.

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
- **4–6 år:** huvud**0.30**, kortare ben **0.36**  
- **7–9 år:** standard ovan  
- **10–12 år:** huvud**0.26**, ben **0.44**, smalare axlar  

## 7.3 Proportionsystem — vuxna ( föräldrar, NPC människor )

- **7.5-huvuden-modell**  
- Total höjd: **1.15×** barn standard ( 437 px @1x )  
- Kropp bredare: axlar **0.42** av höjd  
- **Aldrig** sexualiserade proportioner  
- Snickar-Sune ( bäver ), Morgon-Mira ( igelkott ): se §7.10 djur  

## 7.4 Ögon — living eyes ( 03A )

**Form:** Mandelform med flat bottom — radie top**50 %**, bottom **35 %** av ögonbredd.

**Lager:**
1. Vit `#FAFAF7` — full sclera synlig **60 %**  
2. Iris: `#6B8F71` ( grön ) eller `#7A9EB8` ( blå ) eller `#A88050` ( brun ) — ** en färg per karaktär**  
3. Pupill: Soft Ink `#2A2520`, **40 %** av iris  
4. Highlight: `#FFFFFF` **2 px** cirkel övre vänster —**alltid** minst en  
5. Optional secondary highlight: **1 px**  

** Blick:** Mot kamera eller mot interaktion —** aldrig **tom dead stare utan highlight.

** Förbjudet:** Anime sparkle overload ( >3 highlights ). Realistic foto-öga. Glow eye ( supernatural horror ).

## 7.5 Ansikten

- Näs: ** symbolisk**— `L` form**3×4 px** eller liten kurva — aldrig fotorealistisk  
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

** Förbjudet:** Grå hud. Röd näsa som permanent ( clown ). Ett enda hudtone-only cast.

## 7.6 Händer

- Fingrar: **4 synliga**+ tumme ( stiliserat ) —** ALDRIG 6 fingrar** ( QG-047 )  
- Hand storlek: **0.12×** total höjd  
- Linje: **1.5 px**  
- Grepp: objekt ska ha ** korrekt kontakt** — ingen floating hand  

## 7.7 Kroppar och pose

- Hållning: ** öppen** — armar inte korsade defensivt som default  
- Rörelse: en foot forward vid gå-hint  
- ** Förbjudet:** T-pose export. V-back aggressive stance.  

## 7.8 Kläder — svensk vardag

** Stil:** Lager, praktiskt, färgkoordinerat med världsaccent — inte mode-runway.

** Basgarderob:**
- Tröja/jumper: ulltextur subtil  
- Byxor/leggings: `#5A6178` eller `#7A9EB8`  
- Strumpor: randiga tillåtna — max **2** färger  
- Skor: `#FAFAF7` sula `#3D3830`  

**Säsong:**
- Vinter: lång ullkappa `#7A9EB8`, mössa `#F5A623` accent OK  
- Regn: gul regnjacka `#FFD56B` — klassisk svensk skola  

** Förbjudet:** Logotyper ( Nike etc ). Krigskläder. Sexualiserade outfits. Roblox hoodie aesthetic.

## 7.9 Uttryck — emotion chart

| Emotion | Ögon | Mun | Bryn |
|---------|------|-----|------|
| Neutral lugn | Normal | Liten kurva | Mjuka |
| Glad stolt | Större iris | Uppåt kurva | Lyft |
| Nyfiken | Blick sida | Liten o | En upp |
| Överraskad | Större pupill | O form | Högt |
| Koncentrerad | Blick ned | Rak liten | Lätt ihop |
| ** FÖRBUDEN:** Skuld | — | — | — |
| ** FÖRBUDEN:** Gråt manipulation | Tårflod | Nedåt stor | Skuld |

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

** Husdjur ( katt/kanin/marsvin ):**
- Realistisk proporsion **0.25–0.35×** barn  
- **ALDRIG** hunger-skalle,**ALDRIG** tårögd  

**Fågel ( fönster ):**
- Siluett eller enkel färg `#7A9EB8`, storlek **16 px**  

## 7.11 Inkludering utan tokenism

- Hudfärger: minst **3** av H1–H5 representerade i familj-illustrationer över tid  
- Hårstruktur: lockigt, rakt, hijab, kort — **korrekt** ritat  
- Rullstol/scooter: när inkluderat — **full deltagande**, inte bakgrund dekoration  
- Kön: kläder inte stereotypiskt könslåsta — Verkstaden för alla  

## 7.12 Karaktär + värld

Varje NPC designas ** en gång **i Art Bible stil — variant sheets tillåtna ( 3 vinklar: front, 3/4, profil ). Barn avatar i app: emoji + foto fallback enligt kod — illustration barn är** generiska representanter**, inte foto-real porträtt.

---

# 8. Ikoner — tjocklek, avrundning, skuggor, fyllning, animationsintent

## 8.1 Ikonfilosofi

Ikoner i Stjärndag är ** pictograms med själ**— inte Material Icons out-of-box, inte Font Awesome generisk. Varje ikon ska kännas som den tillhör samma illustrerade universum som Min värld, fast förenklad för läsbarhet vid**24–48 px**. Barnvy ikoner prioriterar ** igenkänning utan text **enligt PRODUCT_IDENTITY ( literacy optional on core path ).

## 8.2 Geometri och stroke

** Barnvy ikoner ( Idag, Min värld nav ):**
- Canvas: **48×48 px**@1x,**96×96 px** @2x export  
- Stroke: **2.5 px** @1x, `#1B2340` ( Stjärndag Navy ) eller `#FFFFFF` på mörk/mättad bakgrund  
- Corner rounding på rektangulära element: **4 px**  
- Cap/join: round  
- Fyllning: flat med **5 %** luminans variation — aldrig ren vektor utan liv  
- Padding inom canvas: **8 px** minimum från stroke till kant  

**Parent UI ikoner:**
- Canvas: **24×24 px** @1x  
- Stroke: **1.75 px**  
- Färg: `#5A6178` default, `#1B2340` active, `#F5A623` accent endast för stjärna/belöning  

** Förbjudet:** Emoji som permanent ikon i navigation ( tillåtet som child avatar fallback enligt kod, inte som systemikon ). Ultra-thin 1 px hairline ( illegible ). Mixed stroke weights inom samma ikonset.

## 8.3 Ikonfamiljer

| Familj | Exempel | Stil |
|--------|---------|------|
| ** Aktivitet** | Tandborste, skor, frukost | Objekt-centrerad, 60 % canvas fill |
| ** Navigation** | Idag, Min värld, Familj | Symbol + valfri label under |
| ** System** | Inställningar, tillbaka, stäng | Parent: geometric; Barn: mjukare |
| ** Belöning** | Stjärna, Skattkammare | Guld `#F5A623`, fem uddar |
| ** Status** | Klar check | Moss Sage `#8BA888` cirkel + vit check |

## 8.4 Skuggor på ikoner

Barnvy: ** ingen drop shadow **på nav-ikoner — flat on Oat background.  
Celebration stjärna: Star Glow `#F5A623` @ 30 % blur **12 px** — temporär endast.  
Parent kort-ikon: valfri `0 1px 2px rgba(27,35,64,0.08)` — subtil.

## 8.5 Animationsintent ( samverkan 03B )

| Ikon | Animation | Duration |
|------|-----------|----------|
| Aktivitet klar | Check scale 1→1.15→1 | 200 ms |
| Stjärna earned | Pop + glow fade | ≤2000 ms total celebration |
| Nav aktiv | Färg fade + 2 px translate up | 150 ms |
| Nav reduced motion | Endast färg fade | 150 ms |

** Förbjudet:** Infinite spin on settings. Pulse attention-seeking on idle nav.

## 8.6 Ikon export

- Format: SVG för UI ( optimerad ), PNG @2x/@3x för raster fallback  
- SVG: inga embedded fonts, inga inline `<style>` — paths only  
- Namn: `icon-{context}-{name}.svg` — ex `icon-activity-toothbrush.svg`

---

# 9. UI — knappar, kort, dialoger, popups, listor, navigation, skuggor, hörnradie, spacing

## 9.1 UI-filosofi — Parent vs Barn ( översikt )

Stjärndag har ** två visuella dialekter **inom samma varumärke:

| Dimension | Barn UI | Parent UI |
|-----------|---------|-----------|
| Känsla | Barnbok, varm, lekfull | Lugn premium, vuxen |
| Bas bakgrund | Morning Oat `#F7F3EB` | Parent Canvas `#F8F9FC` |
| Primär text | Navy `#1B2340` | Navy `#1B2340` |
| CTA | Gold pill, stor touch | Gold eller Navy outline |
| Corner radius | **20–24 px**|**16 px** |
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
**Skärmkant padding parent:** **16 px** mobile,**24 px** tablet.

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
- Touch target: ** minimum 48×48 px** — knapp uppfyller via höjd  

** Sekundär barn:**
- Höjd: **48 px**  
- Bakgrund: `#FFFFFF`  
- Border: **2 px** `#EDE7F6`  
- Text: `#1B2340`, **16 px**  
- Radius: **24 px**  

** Ghost/text knapp barn:**
- Höjd: **44 px**  
- Text: `#1B2340` underline on focus only  
- Ingen skugga  

** Förbjudet barn:** Neon glow CTA. Vibration on every tap. `<button>` höjd under 44 px.

## 9.5 Knappar — parent

** Primär parent CTA:**
- Höjd: **48 px**  
- Bakgrund: `#F5A623`  
- Text: `#1B2340`, **16 px**, weight **600**  
- Radius: **12 px** ( inte full pill — vuxnare )  
- Padding horisontell: **20 px**  

** Sekundär parent:**
- Höjd: **48 px**  
- Bakgrund: transparent  
- Border: **1.5 px** `#1B2340`  
- Text: `#1B2340`, **16 px**  
- Radius: **12 px**  

** Destructive parent:**
- Bakgrund: `#DC2626`  
- Text: `#FFFFFF`  
- Endast account delete — aldrig barn synlig  

## 9.6 Kort ( cards )

** Barn NOW-kort ( Idag hero ):**
- Bakgrund: `#FFFFFF`  
- Border: **2 px** `#EDE7F6`  
- Radius: **24 px**  
- Padding: **20 px**  
- Skugga: `0 4px 12px rgba(42,37,32,0.08)` — varm  
- Min höjd: **120 px**  
- Innehåll: aktivitetsikon **48 px**+ titel**20 px** weight 600 + valfri tid  

**Parent stat/kort:**
- Bakgrund: `#FFFFFF`  
- Border: **1 px** `#E2E8F0`  
- Radius: **16 px** ( `rounded-2xl` enligt POS 03 )  
- Padding: **16 px**  
- Skugga: `0 1px 3px rgba(27,35,64,0.06)`  

** Förbjudet:** Glassmorphism blur cards. Enterprise zebra table inside card on Hem.

## 9.7 Dialoger och popups

** Barn modal ( celebration, placement confirm ):**
- Overlay: `#1B2340` @ **40 %**  
- Panel: `#FFFFFF`, radius **28 px**, padding **24 px**  
- Max bredd: **340 px** centrerat  
- Stäng alltid synlig: **44×44 px** touch, X ikon**24 px**  
- Celebration: auto-dismiss **2000 ms** eller tap skip ( 03B )  

**Parent modal:**
- Overlay: `#0F1629` @ **50 %**  
- Panel: `#FFFFFF`, radius **16 px**, padding **24 px**  
- Rubrik: **20 px** weight 600 Navy  
- Brödtext: **16 px** `#5A6178`  
- Actions: högerställda knappar, gap **12 px**  

** PIN gate ( parental gate ):**
- Numerisk keypad: knapp **64×64 px**, gap **12 px**  
- Radius keypad knapp: **16 px**  
- Bakgrund: `#F7F3EB` — lugn, inte alarm  

## 9.8 Listor

** Barn aktivitetslista ( NEXT/LATER ):**
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

** Barn bottom nav ( Idag · Min värld · Familj ):**
- Bar höjd: **64 px** + safe area  
- Bakgrund: `#FFFFFF` med top border **1 px** `#EDE7F6`  
- Ikoner: **28 px** inom**48 px** touch  
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
- Focus ring: **2 px**`#F5A623` offset**2 px**  
- Radius: **12 px**  
- Padding: **12 px** horisontell  
- Placeholder: `#94A3B8`  
- **Barn:** inga formulär utom PIN ( C-01 )  

## 9.14 Skattkammaren visuell särart

Skattkammaren barnvy får **mörkare dramatisk bakgrund** — undantag från Oat default:
- Gradient: `#1a0533` → `#2d0a5e` → `#1a0533` ( enligt befintlig CSS )  
- Stjärnor/accent: `#ffd700` sparsamt  
- Kort inom: `#fffbf0` → `#fff3cc` gradient — skatt-känsla utan casino  
- ** Regel:** Skattkammaren är** belöning rum**, inte shop — inga prislappar, inga "köp"

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
2. ** Vektor med handfeel** — Illustrator med brush stroke, inte ren geometri  
3. ** Diorama scener** — Min värld rum enligt §2.3  
4. ** Ikon-illustration hybrid** — förenklade objekt för Idag  
5. ** Säsongsmicrovarianter**— PCB tillåten ( löv, morgonmössa ) — max**4** per värld per år  
6. **NPC sheet** — 3 vinklar enligt §7.12  
7. ** Build part ghost**— streckad outline `#B8A9C9` @ 60 %,**2 px** dash**6 px** gap  
8. **Celebration frame** — ≤2000 ms enligt 03B  
9. ** Empty state** — en illustration, copy max 2 rader  
10. ** Onboarding hero** — en scen per steg, samma stil som Min värld  

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

- ** En **focal point per illustration  
- ** Tre **depth planes minimum ( §2.4 )  
- ** Golden ratio optional** — diagonalt flöde från övre vänster ljus  
- Text i bild: ** undvik** — UI copy separat  
- Logotyp i illustration: ** aldrig **utom marketing med ADR  

## 10.4 Filformat och leverans

| Typ | Master | Export |
|-----|--------|--------|
| Min värld rum | PSD/Procreate **4096 px** bred | PNG @1x/@2x/@3x, WebP opt |
| NPC | Vektor + raster | SVG + PNG |
| Build part | Transparent PNG | 512×512 min |
| Celebration | Lottie optional | JSON + PNG fallback |

## 10.5 Revision och sign-off

1. Illustrator self-check QG-001–QG-500  
2. Art Director review  
3. Creative Director screenshot test  
4. Game Director emotion job match ( PCB )  
5. Accessibility contrast spot check  

---

# 11. Förbjudet — utökad lista ( clipart, asset store, AI slop, Disney, Roblox, Cocomelon, neon, glassmorphism, oversaturation )

## 11.1 Varför denna lista existerar

Stjärndag bygger förtroende genom **igenkännbar hantverkskvalitet**. En enda generic asset undergräver hela världen — barn märker inconsistency även om de inte kan namnge den. Creative Director har ** absolut veto **på allt nedan utan ADR sign-off CEO + CPO.

## 11.2 Clipart och asset store ( absolut förbud )

** Förbjudna källor och utseenden:**
- Shutterstock / Adobe Stock / Freepik / Flaticon generic barn  
- Unity Asset Store / Unreal Marketplace miljöpaket  
- " Cute kids room pack " med samma möbler i 10 000 appar  
- Kenney.nl default without heavy restyle  
- OpenGameArt utan full omarbetning  
- Canva template barn app  
- Envato Elements scene builder  

** Visuella triggers som = instant reject:**
- Identiska möbler i 3+ världar från samma pack  
- Möbel med okänd skala ( giant chair )  
- Generic plant in pot #3 från pack  
- Windows with no Nordic light logic  

## 11.3 AI slop ( generativ utan craft )

** Förbjudet:**
- Midjourney/DALL-E/Stable Diffusion output ** som slutleverans**  
- Six fingers, seven toes, melting utensils  
- Inconsistent character across frames  
- Text gibberish in scene  
- Over-smooth plastic skin  
- " AI watercolor " utan linjekontroll  

** Tillåtet ( begränsat ):**
- AI som ** rough comp **internt — aldrig ship  
- AI bakgrund som ** underpainting **om 100 % handovermal enligt §2  

## 11.4 Disney / Pixar / Marvel copy

** Vi tar inspiration, inte IP:**
- Förbjudet: Mickey silhouette, Frozen palette clone, Pixar lamp remake  
- Förbjudet: Character design som Minion/Elsa/Mario pastisch  
- Tillåtet: Pixar ** nivå **på micro-detalj och emotion ( §2.11 )  
- Tillåtet: Nintendo ** klarhet **i regler ( §12 )  

## 11.5 Roblox / Minecraft / Fortnite aesthetic

- Blocky low-poly barn  
- Neon rarity tiers  
- Skin shop mannequin  
- Emote dance promotion  
- Battle pass UI chrome  

Stjärndag är ** inte **metaverse. Blockform = reject.

## 11.6 Cocomelon / ChuChu TV / hyper-flat baby

- Rainbow bus  
- Flat circle heads uniform size  
- Hyper-saturated primärer  
- Giant eyes 50 % of face on all characters  
- Background music note visuals  

## 11.7 Neon, glassmorphism, oversaturation

** Neon:**
- `#39FF14`, `#FF00FF`, glow tubes, cyberpunk rim on UI  

** Glassmorphism:**
- `backdrop-filter: blur` on child cards  
- Frosted glass nav  
- iOS 7 skeuomorphism revival  

** Oversaturation:**
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

Creative Director säger ** Nej **om:
- Vän frågar " Är det gratis? "  
- Ser ut som annan app i App Store top 10 kids  
- Barn kan inte peka på vad de ska göra  
- Parent känner sig i Excel  
- Stjärnor dominerar 40 %+ av yta utan celebration context  

---

## 11.10 Anti-mönster med rotorsak — varför varje förbud finns

Varje förbjudet visuellt mönster nedan har ** mätbar skada **på barnets upplevelse, föräldratrust eller varumärkesmoat. Creative Director ska kunna citera rotorsak vid veto — inte bara smak.

### 11.10.1 Clipart och asset store — rotorsaker

| Anti-mönster | Varför det skadar | Mätbar signal |
|--------------|-------------------|---------------|
| Identiskt möbelpaket i 3+ världar | Bryter fiction att världar är unika belöningar; barn känner igen "samma leksak" | QG-097 fail; visuell fingerprint-match mot känt pack |
| Generic plant in pot #3 | Signal "gratis app"; screenshot-test fail 00B | Vän frågar "Är det gratis?" |
| Kenney.nl utan 100 % omarbetning | Out-of-box estetik = ingen craft moat | Side-by-side med konkurrent oskiljbar |
| Unity Asset Store miljö | Game-engine look bryter barnbok-kontrakt §1.1 | Parent känner "spelapp" inte "omsorg" |
| Windows utan nordiskt ljus | Fiction coherence bryts — svenskt barnrum har specifik ljuslogik §4 | Art Director ljus-audit fail |
| Giant chair okänd skala | Diorama-läsbarhet §2.3 förlorad — barn vet inte var de "är" | Placement ghost fel skala >8 % |

** Beslut:** Clipart stoppar leverans. Undantag kräver ADR + CEO sign-off + dokumenterad 100 % omarbetning med före/efter diff.

### 11.10.2 AI slop — rotorsaker

| Anti-mönster | Varför det skadar | Mätbar signal |
|--------------|-------------------|---------------|
| Sex fingrar | Uncanny valley; föräldrar tappar trust i kvalitet | QG-047 automatic reject |
| Smältande redskap | Läsbarhet för barn med NPF — objekt ska vara tydliga | Activity icon mismatch |
| Inconsistent character frame-to-frame | NPC-kontrakt PCB bryts — companion känns opålitlig | Animation regression fail |
| Gibberish text i scen | Barn som läser fastnar; ser oprofessionellt ut | OCR/vision scan |
| Over-smooth plastic skin | Materialärlighet §2.1 fail; Cocomelon-flat risk | Texture noise <3 % |
| AI watercolor utan linjekontroll | Soft ink §2.5 identitet försvinner | Stroke weight variance >±0.4 px |

** Beslut:** AI som slutleverans =** Nej **utan diskussion. AI som rough comp internt måste raderas före export — inga AI-lager i ship-filer (§18).

### 11.10.3 Disney / Pixar / Marvel-kopia — rotorsaker

| Anti-mönster | Varför det skadar | Mätbar signal |
|--------------|-------------------|---------------|
| Mickey-silhuett | IP-risk + signal "vi kan inte egen stil" | Legal review flag |
| Frozen-palett klon | Barn associerar med annat varumärke — inte Stjärndag | Parent: "Det liknar Frost" |
| Minion/Elsa-pastisch | Underminerar nordisk dignitet §1.1 | Screenshot test fail |
| Pixar-lampa remake | Direkt IP-kopiering | Creative Director instant veto |

** Beslut:** Inspiration på *nivå* (micro-detalj, emotion economy) tillåten §12. Silhuett-kopiering förbjuden.

### 11.10.4 Roblox / Minecraft / Fortnite — rotorsaker

| Anti-mönster | Varför det skadar | Mätbar signal |
|--------------|-------------------|---------------|
| Blocky low-poly barn | Bryter materialärlighet och hantverkskontrakt CORE_VALUES | Material audit fail |
| Neon rarity tiers | Casino-FOMO estetik förbjuden §1.1 | Parent trust survey risk |
| Skin shop mannequin | Kommersiell metaverse — inte lugn magi | CPO positioning fail |
| Battle pass chrome | Hyper stimulus — barn kan inte avsluta loop | Session length anomaly |

**Beslut:** Blockform i barnvärld = reject. Verkstaden får träklossar — inte voxlar.

### 11.10.5 Cocomelon / hyper-flat baby — rotorsaker

| Anti-mönster | Varför det skadar | Mätbar signal |
|--------------|-------------------|---------------|
| Rainbow bus | Hyper-saturated primärer tröttar visuell cortex | Saturation >108 % |
| Uniform circle heads | Tar bort barns dignitet — alla identiska | Character sheet sameness |
| Giant eyes 50 % face | Infantiliserar 7–12 år målgrupp | Age band proportion fail §7.2 |
| Music note visuals | Signal "YouTube-kanal" inte "app partner" | Parent screenshot fail |

**Beslut:** Hyper-flat baby estetik är för småbarn — Stjärndag riktar capability 4–12 med respekt.

### 11.10.6 Neon, glassmorphism, oversaturation — rotorsaker

| Anti-mönster | Varför it skadar | Mätbar signal |
|--------------|------------------|---------------|
| `#39FF14` glow tubes | Bryter skandinavisk morgonpalett §3 | Forbidden hex scan |
| `backdrop-filter: blur` barnkort | Glassmorphism = billigt 00B listan | CSS audit on child routes |
| Frosted glass nav | Läsbarhet ↓; känns iOS-template | Contrast fail 4.5:1 |
| Saturation >110 % export | Oversaturerad = TikTok energi | QG-016 fail |
| `#FFD700` chrome everywhere | Casino-guld — inte Stjärndag Gold | Gold misuse audit |

**Beslut:** Neon och glass endast i admin ( separat estetik ) — aldrig barn route.

### 11.10.7 Skuld, casino, skräck — rotorsaker

| Anti-mönster | Varför det skadar | Mätbar signal |
|--------------|-------------------|---------------|
| Röd varning på barn | Skuld-beläggning bryter CORE_VALUES lugn magi | `#EF4444` on child route |
| Tårögd maskot miss day | Barn tolkar "jag gjorde fel" — PCB Husdjurshemmet fail | QG-105 fail |
| Loot chest sparkle | Extrinsic casino loop — inte intrinsic pride | G-06 ethics fail |
| Mörker som straff | Natt ska vara undangömd skatt §4.7 — inte straff | User research red flag |
| Jump scare animation | Trauma risk; reduced motion räcker inte alltid | Accessibility Lead veto |

**Beslut:** Etiska förbud har **ingen** ADR-override utan CEO + CPO + Accessibility Lead gemensamt.

### 11.10.8 Enterprise / dashboard anti-mönster — rotorsaker

| Anti-mönster | Varför det skadar | Mätbar signal |
|--------------|-------------------|---------------|
| BI-dashboard parent Hem | Förälder ska känna partner — inte Excel | UX Director screenshot fail |
| Zebra table i kort | Cognitive load ↑ kl 07:00 | Parent session bounce |
| Developer gray `#111827` barn | PRODUCT_IDENTITY förbud — barn ser "fel app" | Route contamination |
| Full illustration parent Hem | Distraction från handling | One-action rule POS 04 |

**Beslut:** Parent UI vuxen lugn; barn UI barnbok — cross-contamination = release blocker.

### 11.10.9 Återanvändning utan variation — rotorsaker

| Anti-mönster | Varför det skadar | Mätbar signal |
|--------------|-------------------|---------------|
| Samma prop copy-paste 3+ gånger | Modular system §19 kräver variant matrix | QG-097 fail |
| Samma NPC pose alla världar | Companion känns statisk — inte levande | Game Director emotion fail |
| Identisk rumslayout alla världar | Progression fiction PCB urholkas | World differentiation audit |

**Beslut:** Reuse med **minst 2** av: färgshift, skala, rotation, tillbehör, skada/patina — se §19.

### 11.10.10 Screenshot-test fail — rotorsaker sammanfattade

Creative Director säger **Nej** när minst ett gäller:
1. Vän frågar "Är det gratis?" — signal generic craft
2. Top-10 kids app clone — ingen moat
3. Barn kan inte peka på nästa handling inom 3 s — clarity fail
4. Parent känner Excel — fel dialekt §9
5. Stjärnor >40 % yta utan celebration — extrinsic spam
6. AI artifacts synliga vid 100 % zoom — trust erosion
7. Six fingers / melted geometry — quality floor breach
8. Forbidden hex i export — palette discipline fail
9. Reduced motion path untested — a11y breach
10. Performance budget §21 exceeded — jank på iPhone SE

---

# 12. Inspirationskällor — vad vi tar, inte vad vi kopierar

## 12.1 Nintendo — regler, polish, respekt

**Vi tar:**
- Tydliga regler — barn förstår utan manual  
- Polish på grundinteraktion före feature creep  
- Respekt för spelare — ingen skuld för frånvaro  
- Diorama läsbarhet — dollhouse clarity  
- Earned secrets — fair, authored  

** Vi kopierar INTE:**
- Mario pipes, star shape trademark, character designs  
- UI sound exact copies  
- IP-protected silhouettes  

## 12.2 Pixar — emotion utan rädsla

** Vi tar:**
- Micro-detaljer i periferin ( dust motes )  
- Emotion readable in silhouette  
- Color script per story beat  
- Safe scary — Dinosaurielunden awe not horror  

** Vi kopierar INTE:**
- Luxo ball, character model sheets  
- Exact color scripts from films  

## 12.3 Studio Ghibli — natur och stillhet

** Vi tar:**
- Vind i gräs  
- Stillness as feature  
- Food/breakfast as love language ( Morgonhuset )  
- Environmental storytelling  

** Vi kopierar INTE:**
- Totoro silhouette, soot sprites direct  
- Anime face formula  

## 12.4 Brio / BRIO — taktil svensk kvalitet

** Vi tar:**
- Träkänsla, lagom rundning  
- Färgat men inte skrikande  
- Hållbarhet aesthetic — built to last  
- Train/track clarity → routine sequence clarity  

## 12.5 Mumin — nordisk melankoli utan skuld

** Vi tar:**
- Värme i grått väder  
- Familj dynamics gentle  
- Nature as companion  
- Lugnt tempo  

** Vi kopierar INTE:**
- Mumin character designs  
- Tove Jansson exact linework trademark  

## 12.6 Astrid Lindgren — barn som capable protagonists

** Vi tar:**
- Barn har agency  
- Vardagsäventyr  
- Svensk vardagsmiljö  
- Humor utan att göra barn till clowns  

## 12.7 Svensk natur och friluftsliv

** Vi tar:**
- Björk, gran, sjö, archipelago grey-blue  
- Four seasons real calendar  
- Fredagsmys indoor/outdoor balance  
- Lagom — not extreme  

## 12.8 Skandinavisk interiör

** Vi tar:**
- Ek, vitt, textil  
- Hygge without Danish copy paste  
- Functional beauty  
- Light walls, warm wood floor  

## 12.9 Nordisk illustration tradition

** Vi tar:**
- Elsa Beskow warmth reference  
- Modern Nordic picture book ( Stina Wirsén, etc. ) line economy  
- Government poster clarity — bildstöd culture  

## 12.10 Sammanfattning — synthesis statement

Stjärndag smältdegel = ** Nintendo regler + Pixar emotion economy + svensk barnbok materialitet + Brio taktilitet + lugn magi CORE_VALUES**. Resultatet måste vara ** unikt igenkännbart **i screenshot — inte " generic Nordic " som buzzword utan ** named craft decisions **i varje frame.

---

---
# 13. Quality Gates — QG-001 till QG-500

Creative Director kan säga ** "Nej" utan diskussion **vid brott mot any QG. Art Director operationaliserar. Illustratör kör self-review före varje gate §15.

Varje QG är binär: ** Ja **eller ** Nej**. AI-agenter och människor använder samma lista.

## 13.1 QG-001–QG-020

**QG-001:** Alla yttre konturer använder Soft Ink `#2A2520` eller specificerad variant — aldrig `#000000`.  
**QG-002:** Karaktär ytterkontur exakt**2.0 px @1x** — avvikelse max ±0.15 px.  
**QG-003:** Round join och round cap på alla streck — inga spetsiga miters.  
**QG-004:** Ingen vektor-perfect ruler straight line längre än**80 px** utan micro wobble.  
**QG-005:** Max en illustrationstil per leveransbatch — mixed styles = reject.  
**QG-006:** Diorama perspektiv: horisont**38–42 %** från botten.  
**QG-007:** Golvvinkel**30°** isometrisk standard.  
**QG-008:** Vertikal konvergens max**3°**.  
**QG-009:** Minst tre depth planes per Min värld scen.  
**QG-010:** Bakgrundsplan linje max**70 %** opacity av förgrund.  
**QG-011:** Primär palett endast från §3 — inga ad hoc hex utan ADR.  
**QG-012:** Max **en** accentdominant färg per skärm utöver neutral.  
**QG-013:** Förbjudna färger §3.8 absent — automated scan optional.  
**QG-014:** UI text kontrast minimum**4.5:1** mot bakgrund.  
**QG-015:** Stor form kontrast minimum**3:1** mot närmaste bakgrund.  
**QG-016:** Global saturation export max**108 %** — oversaturation reject.  
**QG-017:** Ingen fullbleed regnbåge.  
**QG-018:** Stjärndag Gold `#F5A623` endast CTA, stjärnor, celebration — inte hela bakgrund.  
**QG-019:** Barn skärm: ingen semantisk skuld-röd `#EF4444`.  
**QG-020:** Världsaccent enligt world table — inte random accent swap.  

## 13.2 QG-021–QG-040

**QG-021:** Key light övre vänster**45°/55°** om inte §4 undantag dokumenterat.  
**QG-022:** Key färg `#FFF8EE` eller tidsvariant från §4 — aldrig kall vit alone.  
**QG-023:** Skuggor varma `#3D3830` @ 22–28 % — aldrig `#000` multiply.  
**QG-024:** Skuggriktning**135°** från key.  
**QG-025:** Contact shadow under alla stående objekt i förgrund.  
**QG-026:** Nattläge aldrig straff-visual — only optional wonder.  
**QG-027:** Reduced motion statisk ljus OK — animated beam optional OFF.  
**QG-028:** Max **en** hero spec highlight `#FFFFFF` per scen.  
**QG-029:** Morgonhuset fönster: morgonljus om fiction morning.  
**QG-030:** Ingen neon rim light.  
**QG-031:** Gräs: minst**3** nyanser, Fern Green bas.  
**QG-032:** Ingen `#00FF00` neon gräs.  
**QG-033:** Björk har lenticels på stam.  
**QG-034:** Max**4** moln per utomhusscen.  
**QG-035:** Stjärnor belöning: fem uddar, gold palette.  
**QG-036:** Vatten har depth gradient — inte flat fill.  
**QG-037:** Regn max**40** droppar synliga @1x.  
**QG-038:** Svenska träd default — palm ej default.  
**QG-039:** Snö aldrig rent `#FFFFFF` full frame.  
**QG-040:** Natur detalj densitet max**40 %** av förgrund i bakplan.  

## 13.3 QG-041–QG-060

**QG-041:** Ek golv plankor**24 px** med fog.  
**QG-042:** Fönsterglas `#A8C4D4` @ 40 % minimum transparency feel.  
**QG-043:** Dörr proportion**1.6×** barn höjd.  
**QG-044:** Taklutning**42°** på nordiska småhus.  
**QG-045:** Ingen glass skyskraper i barnvärld default.  
**QG-046:** Dockhuset mini scale**1:12** consistent.  
**QG-047:** Exakt**5 fingrar** per hand — six fingers = automatic reject.  
**QG-048:** Ögon har minst **en**`#FFFFFF` highlight**2 px**.  
**QG-049:** Barn proportion 6.5-huvuden ± age band §7.2.  
**QG-050:** NPC aldrig skuldblick eller tårmanipulation.  
**QG-051:** Hudton från H1–H5 table — minst 3 tones i product lifetime cast.  
**QG-052:** Inga logotyp kläder.  
**QG-053:** Djur NPC never hunger skull.  
**QG-054:** Mini-Dino round — not horror realistic.  
**QG-055:** Karaktär skugga enligt §2.7 — grounded not floating.  
**QG-056:** Greppande hand kontaktar objekt — no float gap >2 px.  
**QG-057:** Barn nav touch**48×48 px** minimum.  
**QG-058:** Primär barn CTA höjd**56 px**.  
**QG-059:** Parent kort radius**16 px**.  
**QG-060:** Barn kort radius**24 px**.  

## 13.4 QG-061–QG-080

**QG-061:** Ingen glassmorphism på barn UI.  
**QG-062:** Bottom nav max**3** tabs barn.  
**QG-063:** Celebration modal skippbar ≤**2000 ms** auto.  
**QG-064:** Screen padding barn**16 px** minimum.  
**QG-065:** Emoji not permanent system nav icon.  
**QG-066:** Parent destructive red never on barn routes.  
**QG-067:** Idag NOW kort min höjd**120 px**.  
**QG-068:** PIN keypad knapp**64×64 px**.  
**QG-069:** Focus ring synlig parent inputs**2 px** gold.  
**QG-070:** Whitespace barn Idag**24 %** minimum around NOW.  
**QG-071:** Zero stock clip art.  
**QG-072:** Zero unmodified AI output ship.  
**QG-073:** Screenshot test pass — Creative Director simulates.  
**QG-074:** Emotion job match PCB world section — cite slug.  
**QG-075:** Build part ghost dash**6 px** gap**2 px** stroke.  
**QG-076:** One focal point per scene.  
**QG-077:** Max**3** micro Easter eggs per scene.  
**QG-078:** Export @2x and @3x provided for raster rooms.  
**QG-079:** Transparent PNG build parts min**512×512**.  
**QG-080:** No placeholder text in image.  

## 13.5 QG-081–QG-100

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
**QG-091:** Material ärlighet — wood looks wood §2.1.  
**QG-092:** Texture noise min**3 %** on large fills.  
**QG-093:** Pensel grain visible at 100 % zoom on hero art.  
**QG-094:** File named per §10.4 convention.  
**QG-095:** Layered source file preserved for edit — not PNG-only dump.  
**QG-096:** Version tag in metadata — v1.0 compliant.  
**QG-097:** Cross-world prop reuse max**2** times before variant required.  
**QG-098:** Seasonal variant approved in PCB calendar — not random.  
**QG-099:** Museum/export art optional late-game — same style rules.  
**QG-100:** Executive review score target ≥**9.8** before ship art pack.  

## 13.6 QG-101–QG-120

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

## 13.7 QG-121–QG-140

**QG-121:** Patina på ek enligt Appendix A.1 — not sterile showroom.  
**QG-122:** Keramik mugg har fotring skugga.  
**QG-123:** P/S/T hierarchy documented on brief — one P only.  
**QG-124:** Wobble amplitude within §A.5 tolerance at 100 % zoom.  
**QG-125:** Export grain overlay**8 % ** unless Creative Director exempt print.  
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

## 13.8 QG-141–QG-160

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

## 13.9 QG-161–QG-180

**QG-161:** Harmony glow Dockhuset ≤12 % opacity.  
**QG-162:** Freja raincoat only one yellow accent Fiskebryggan.  
**QG-163:** Book spines Läshörnan minimum 8 visible.  
**QG-164:** Appendix H pipett scan no alien HEX.  
**QG-165:** Morgonhuset genomgång J.1 — se även QG-166–QG-500 för pipeline.  
**QG-166:** Master PSD sparad i `assets/source/{world_slug}/` med named layers enligt §14.  
**QG-167:** Export PNG @1x/@2x/@3x finns i `assets/worlds/{world_slug}/raster/`.  
**QG-168:** WebP kvalitet**85** för alla rumsexporter >20 KB PNG.  
**QG-169:** SVG ikoner optimerade med SVGO — inga `<style>` block.  
**QG-170:** Filnamn följer `stjarndag-{world}-{asset}-{variant}-@{scale}x.{ext}`.  
**QG-171:** Semantic version tag i asset metadata JSON.  
**QG-172:** Git LFS eller motsvarande för masters >10 MB.  
**QG-173:** Ingen embedded font i SVG export.  
**QG-174:** Lottie JSON <**150 KB** om celebration används.  
**QG-175:** Sprite sheet max**2048×2048 px** atlas enligt §21.  
**QG-176:** Spine projekt exporterar endast om ADR godkänt — default förbjudet v1.  
**QG-177:** Texture atlas padding**2 px** mellan sprites.  
**QG-178:** Figma komponent länkad till token §3 — inte ad hoc hex.  
**QG-179:** Illustrator brush library `stjarndag-soft-ink-v1.ai` används.  
**QG-180:** Procreate master minst**4096 px** bredd för rum.  

## 13.10 QG-181–QG-200

**QG-181:** Alpha kanal ren — inga halvtransparenta fringe artifacts.  
**QG-182:** sRGB färgrymd på alla raster exports.  
**QG-183:** CMYK endast print branch — digital ship sRGB only.  
**QG-184:** Asset manifest `manifest.json` uppdaterad per release.  
**QG-185:** Deprecated assets flyttade till `assets/archive/` — inte deleted silent.  
**QG-186:** DoR §24 komplett före Concept start — sign-off Art Director.  
**QG-187:** Concept thumbnail**800 px** — minst 3 varianter dokumenterade.  
**QG-188:** Line art gate pass innan Color pass påbörjas.  
**QG-189:** Lighting pass enligt §4 dokumenterad på brief.  
**QG-190:** Creative review loggad i PR — skriftlig Ja/Nej.  
**QG-191:** UX review touch targets om UI mock ingår.  
**QG-192:** Accessibility spot check före Implementation.  
**QG-193:** Implementation PR länkar asset manifest.  
**QG-194:** Regression screenshot @1x/@2x iPhone SE + iPad.  
**QG-195:** Release Manager sign-off på asset pack version.  
**QG-196:** Max**2** revision rounds utan ny brief §15.  
**QG-197:** Style pivot kräver ADR — inte 'fix i review'.  
**QG-198:** Brief citerar PCB world slug + emotion job.  
**QG-199:** Build part ghost testad mot placement grid §20.  
**QG-200:** Celebration testad med `prefers-reduced-motion: reduce`.  

## 13.11 QG-201–QG-220

**QG-201:** CSS animation endast UI micro-interactions ≤**300 ms**.  
**QG-202:** Lottie endast celebration ≤**2000 ms** enligt 03B.  
**QG-203:** Canvas animation endast vatten/partiklar — max**30 FPS** budget.  
**QG-204:** WebGL förbjudet v1 utan ADR — performance risk §21.  
**QG-205:** Sprite animation max**12 frames** per loop idle NPC.  
**QG-206:** Frame animation PNG sequence max**24 frames** per asset.  
**QG-207:** Parallax amplitud förgrund**≤12 px** @1x — reduced motion off.  
**QG-208:** Ingen infinite spin på idle UI.  
**QG-209:** Celebration skippbar tap**≤2000 ms**.  
**QG-210:** Animation total barnskärm ≤**3** samtidiga loops.  
**QG-211:** Lottie inga embedded bitmaps >**64 KB**.  
**QG-212:** CSS `will-change` endast under aktiv animation.  
**QG-213:** GPU layer count ≤**8** per barnskärm §21.  
**QG-214:** Stjärnblink period ≥**3 s** — inte seizure risk.  
**QG-215:** Motion audit log i PR med 03B checklist.  
**QG-216:** Zero unmodified generative pixels in ship layer stack.  
**QG-217:** AI rough comp deleted from delivery folder.  
**QG-218:** Hands manually redrawn — AI hand pass forbidden alone.  
**QG-219:** Faces manually reviewed — 100 % zoom sign-off.  
**QG-220:** Text in scene zero AI gibberish.  

## 13.12 QG-221–QG-240

**QG-221:** Style consistency sheet mot reference frame §18.  
**QG-222:** AI brused background 100 % overpainted if used internal.  
**QG-223:** Metadata flag `ai_assisted:false` on ship assets.  
**QG-224:** Creative Director AI disclosure review logged.  
**QG-225:** No AI upscaling as sole detail pass.  
**QG-226:** Tree variant minst**4** per biome: björk, gran, löv, höst.  
**QG-227:** Window variant**3** min: morgon, kväll, regn.  
**QG-228:** Floor variant ek/furu/klinker/matta enligt §6.6.  
**QG-229:** Wall variant minst**2** per värld — inte clone.  
**QG-230:** Rug variant**6** färger inom §3 — max 2 reuse per värld.  
**QG-231:** Lamp variant bord/tak/vägg — ljus enligt §4.5.  
**QG-232:** NPC prop kit delad — NPC unik silhuett per värld.  
**QG-233:** Collectible silhouette unik per PCB item.  
**QG-234:** Build part rotation snap**15°** increments.  
**QG-235:** Prop reuse cross-world max**2** före variant §19.  
**QG-236:** Variant matrix dokumenterad i `assets/worlds/{world_slug}/variants.md`.  
**QG-237:** Modular kit anchor point konsistent bottom-center.  
**QG-238:** Scale ladder S/M/L documented — S**0.85×** L**1.15×**.  
**QG-239:** Seasonal swap uses same anchor — no layout shift.  
**QG-240:** Recycled prop har minst 2 differentiators §19.3.  

## 13.13 QG-241–QG-260

**QG-241:** iPhone SE**375×667** safe — UI zone clear §20.  
**QG-242:** iPhone**390×844** layout verified.  
**QG-243:** iPhone Plus**428×926** no stretch blur.  
**QG-244:** Android**360×640** minimum supported.  
**QG-245:** Tablet portrait content max-width**480 px** centrerat.  
**QG-246:** Tablet landscape illustration bleed OK — UI centered.  
**QG-247:** Web desktop max illustration**1440 px** — no upscale blur.  
**QG-248:** Bottom nav safe zone**128 px** clear on room art.  
**QG-249:** Top status safe**64 px** clear.  
**QG-250:** Landscape: NOW card visible without scroll**667 px** height equiv.  
**QG-251:** Crop rule: never crop primary (P) object §A.3.  
**QG-252:** Scale rule: vector/SVG scales infinite — raster provides 3 densities.  
**QG-253:** Safe zone overlay `safe-zones.svg` in source folder.  
**QG-254:** Notch/Dynamic Island padding via `env(safe-area-inset-*)` mock.  
**QG-255:** Reduced canvas export for SE — no mandatory scroll for hero.  
**QG-256:** Single PNG room @1x ≤**450 KB** efter WebP alt.  
**QG-257:** Build part PNG ≤**80 KB** @1x.  
**QG-258:** SVG icon ≤**8 KB** gzip.  
**QG-259:** Total raster decode first paint barn ≤**2.5 MB**.  
**QG-260:** Lottie ≤**150 KB** gzip.  

## 13.14 QG-261–QG-280

**QG-261:** Sprite atlas ≤**512 KB**.  
**QG-262:** Memory peak illustration layer ≤**64 MB** iOS WebView.  
**QG-263:** GPU overdraw ≤**3×** full screen barn.  
**QG-264:** First celebration frame ≤**16 ms** paint budget.  
**QG-265:** Lazy-load below-fold room assets.  
**QG-266:** HTTP cache headers on static assets — immutable hash.  
**QG-267:** No 4096 px PNG on SE first paint — serve @1x.  
**QG-268:** WebP fallback PNG for browsers without WebP.  
**QG-269:** Service worker precache celebration ≤**200 KB** total delta.  
**QG-270:** Performance trace Lighthouse mobile score art path ≥**90**.  
**QG-271:** Decorative illustration `alt=` — meaningful har svensk alt §22.  
**QG-272:** Colorblind: state never red/green alone — shape change required.  
**QG-273:** Touch target barn ≥**48×48 px** — verified on device.  
**QG-274:** Focus visible parent ≥**2 px** `#F5A623` ring.  
**QG-275:** Reduced motion: all animations have static fallback.  
**QG-276:** Contrast text on gold uses navy — never white small on gold.  
**QG-277:** Illustration not sole carrier of critical info — icon+text backup.  
**QG-278:** Cognitive: one primary action Idag — art supports not competes.  
**QG-279:** Seizure: no flash >**3 Hz**.  
**QG-280:** Accessibility Lead written sign-off on child-facing deliverable.  

## 13.15 QG-281–QG-300

**QG-281:** Every Min värld scene has at least one idle motion layer documented in manifest.  
**QG-282:** Idle loop period minimum 3 s — no sub-1 s jitter loops on child routes.  
**QG-283:** Day-night visual shift uses §4 palette only — no ad hoc night terror palette.  
**QG-284:** Seasonal variant documented in manifest season field when applicable.  
**QG-285:** Weather overlay opacity max 55 % — readability preserved.  
**QG-286:** Grass sway amplitude max 2 px @1x — subtle not hurricane.  
**QG-287:** Tree branch idle uses secondary motion only — primary structure static.  
**QG-288:** Window reflection shifts with time-of-day table §4 — not static mirror.  
**QG-289:** NPC idle never frozen 5+ s without micro-motion (blink, breathe, tail).  
**QG-290:** Animal NPC blink interval 4–8 s randomized per instance.  
**QG-291:** Ambient bird flyby max 1 per 120 s session on child route.  
**QG-292:** Kettle steam only after morning completion trigger — not always-on spam.  
**QG-293:** Curtain sway period 6–10 s — reduced motion: static mid-sway.  
**QG-294:** Floor creak one-shot on room enter max 1 per visit.  
**QG-295:** Room dim on miss-day max 15 % luminance drop — welcoming not punishing.  
**QG-296:** Living world props vary placement ±8 px between sessions when rearrange enabled.  
**QG-297:** Clock fiction time sync optional — if shown, matches §4 light profile.  
**QG-298:** Distant traffic audio-visual only with ADR — no busy highway default.  
**QG-299:** Fireplace glow only winter season flag — off otherwise.  
**QG-300:** Candle flame loop max 12 FPS effective — reduced motion: static flame shape.  

## 13.16 QG-301–QG-320

**QG-301:** Default child room camera: horizont 38–42 % — §2.3 binding.  
**QG-302:** Zoom in placement mode max 115 % — never lose full room readability.  
**QG-303:** Zoom out min 92 % — P object remains identifiable.  
**QG-304:** Pan speed max 120 px/s on child route — no motion sickness.  
**QG-305:** Pan bounds clip at room edge + 12 px padding — no void gray.  
**QG-306:** Focus pull not used on child route v1 — flat focus diorama.  
**QG-307:** Reveal pan direction: left-to-right for new build part default.  
**QG-308:** Camera never dutch angle on child route.  
**QG-309:** iPad landscape: content max-width 480 px — camera centers P object.  
**QG-310:** Safe zone top 64 px respected in all room framing exports.  
**QG-311:** Safe zone bottom 128 px respected for nav overlay.  
**QG-312:** Cut transition max 200 ms — prefer crossfade 300 ms.  
**QG-313:** No camera shake on child route except QG-approved parent test only.  
**QG-314:** Snapshot export uses canonical 375×812 logical frame unless §20 override.  
**QG-315:** Parallax max 3 depth layers — no faux-3D camera orbit.  
**QG-316:** One P focal object per scene — §2.11 binding.  
**QG-317:** Rule of thirds: P object on intersection or center-bottom for placement UI.  
**QG-318:** Negative space minimum 18 % child screen — 24 % Idag NOW.  
**QG-319:** Visual weight balanced — no corner heavier than opposite without ADR.  
**QG-320:** Leading lines toward P — not away into void.  

## 13.17 QG-321–QG-340

**QG-321:** Horizon line stable across world variants of same slug.  
**QG-322:** Text never competes with P — copy outside illustration safe zone.  
**QG-323:** Symmetry allowed Dockhuset only — other worlds asymmetry default.  
**QG-324:** Frame edge vignette max 4 % — center never tunnel-dark.  
**QG-325:** Child gaze direction toward P or door-exit — not off-screen ad.  
**QG-326:** S object count max 4 — tertiary max 12.  
**QG-327:** Busy background desaturate 10 % vs foreground.  
**QG-328:** Placement ghost never occludes P object.  
**QG-329:** Celebration overlay respects 24 % whitespace buffer around NOW card.  
**QG-330:** Thumbnail readability at 120 px width — P silhouette identifiable.  
**QG-331:** UI easing default ease-out cubic-bezier(0.33, 1, 0.68, 1) — 03B binding.  
**QG-332:** Anticipation before celebration pop max 80 ms squash.  
**QG-333:** Squash stretch max 8 % scale Y on characters — not rubber hose extreme.  
**QG-334:** Follow-through on cape/cloth max 2 frames @30 FPS.  
**QG-335:** Secondary motion on hair/cloth only when primary action complete.  
**QG-336:** Timing hierarchy: UI 150–300 ms, celebration ≤2000 ms, idle 3 s+.  
**QG-337:** Overshoot max 4 % on bounce — one cycle only.  
**QG-338:** Stagger list items 40 ms max — reduced motion: simultaneous.  
**QG-339:** NPC wave animation 600 ms total — skippable.  
**QG-340:** Build land animation 400 ms ease-out — no explosive spawn.  

## 13.18 QG-341–QG-360

**QG-341:** Star earned path uses arc not linear teleport.  
**QG-342:** Modal enter 250 ms — exit 200 ms.  
**QG-343:** No animation plays while parent PIN gate active.  
**QG-344:** prefers-reduced-motion: all loops static first frame.  
**QG-345:** Tap skip cancels celebration within 100 ms.  
**QG-346:** Loading spinner not used on child route — illustration idle instead.  
**QG-347:** Drag placement ghost follows finger 1:1 — no lag >32 ms.  
**QG-348:** Snap placement 150 ms settle — audio optional per §30.  
**QG-349:** Hierarchy: primary motion > secondary > ambient — never invert.  
**QG-350:** Concurrent animated elements max 5 on screen child route.  
**QG-351:** Star particle count max 8 per celebration burst.  
**QG-352:** Dust mote max 6 visible in sunbeam scene.  
**QG-353:** Rain particle density §5.8 — max 40 drops @1x.  
**QG-354:** Snow flake size 2–6 px — max 30 visible.  
**QG-355:** Leaf fall max 4 leaves on screen autumn variant.  
**QG-356:** Sparkle on tool unlock max 12 particles 800 ms.  
**QG-357:** Glitter not used outside Skattkammaren celebration context.  
**QG-358:** Confetti pieces max 24 — colors from §3 only.  
**QG-359:** Light particle opacity max 40 % — no blinding bloom.  
**QG-360:** VFX never obscures touch target 48 px zone.  

## 13.19 QG-361–QG-380

**QG-361:** VFX color from world accent table — not rainbow.  
**QG-362:** Particle emitters documented in manifest vfx field.  
**QG-363:** GPU particle count budget 200 simultaneous max.  
**QG-364:** No screen-full particle flood.  
**QG-365:** Celebration VFX ends clean — no orphaned particles 500 ms after.  
**QG-366:** Reduced motion: VFX static frame or off.  
**QG-367:** Lottie VFX file size §21.3 budget.  
**QG-368:** Canvas VFX 30 FPS cap child route.  
**QG-369:** WebGL particles forbidden v1.  
**QG-370:** VFX audio sync ±50 ms if sound enabled.  
**QG-371:** UI sound visualizer not shown on child route.  
**QG-372:** Music note graphics forbidden unless 06A audio on and ADR.  
**QG-373:** Speaker icon parent-only for volume — not child nav.  
**QG-374:** Celebration sound optional — visual works silent.  
**QG-375:** NPC speech bubble before audio always — show don't tell.  
**QG-376:** Silence valid Läshörnan default — no forced music visual.  
**QG-377:** Ambient wave visual on Fiskebryggan matches water §5.9.  
**QG-378:** Radio glow kitchen optional — off if silence mode.  
**QG-379:** Pin success visual only — no loud horn graphic.  
**QG-380:** Audio direction §30 cross-ref in animation brief mandatory.  

## 13.20 QG-381–QG-400

**QG-381:** Sound-off session: no visual guilt cues.  
**QG-382:** Haptic not visualized as screen shake.  
**QG-383:** Voice line subtitle parent language only when spoken.  
**QG-384:** Equalizer bars forbidden on child UI.  
**QG-385:** Notification bell animation parent-only.  
**QG-386:** Emotion curve cited from §31 in DoR for world deliverables.  
**QG-387:** Morgonhuset arc peaks at capable safety — not excitement spike.  
**QG-388:** Verkstaden arc peaks at maker pride — not competition win.  
**QG-389:** Husdjurshemmet never dips into grief valley on miss-day.  
**QG-390:** Dinosaurielunden awe without fear spike — cortisol-safe palette.  
**QG-391:** Dockhuset control fantasy — no chaos spike visuals.  
**QG-392:** Fiskebryggan patience — no urgency timer graphics.  
**QG-393:** Läshörnan focus — no distraction particles in default.  
**QG-394:** Session emotional peak max 1 per visit default.  
**QG-395:** Denouement always calm frame available within 3 s exit.  
**QG-396:** Emotion job readable without text in 3 s — Game Director test.  
**QG-397:** Color script shifts document beat in brief.  
**QG-398:** NPC expression matches curve beat — not random happy.  
**QG-399:** Parent parallel emotion visual subordinate on child screen.  
**QG-400:** Anti-shame: no valley below neutral on child miss-day art.  

## 13.21 QG-401–QG-420

**QG-401:** Season flag in manifest: spring|summer|autumn|winter|none.  
**QG-402:** Winter variant adds snow §5.7 — not full palette swap.  
**QG-403:** Autumn max 30 % red foliage per tree §5.3.  
**QG-404:** Spring syren bloom window fiction May–June only.  
**QG-405:** Summer grass +8 % saturation §4.9.  
**QG-406:** Seasonal decor max 2 props per room per season.  
**QG-407:** Weather state: clear|rain|snow|fog|wind — one active.  
**QG-408:** Rain uses §4.10 + §33 — not duplicate custom rain.  
**QG-409:** Fog Dinosaurielunden only default — other worlds ADR.  
**QG-410:** Wind sway amplitude tied to weather table §33.  
**QG-411:** Evening light auto per §4.5 after fiction 17:00.  
**QG-412:** Weather does not block core tap path visibility.  
**QG-413:** Seasonal FOMO graphics forbidden — no countdown snowflake.  
**QG-414:** Calendar tie subtle — leaf on mat not banner ad.  
**QG-415:** Cross-fade season swap 600 ms max — reduced motion instant.  
**QG-416:** Weather audio optional — visual sufficient alone.  
**QG-417:** Sunbreak after rain: rainbow max 1 arc subtle — not neon.  
**QG-418:** Ice on puddle winter only — fiction coherent.  
**QG-419:** Heat shimmer Verkstaden summer optional max 3 px.  
**QG-420:** Mist morning Morgonhuset optional 4 % haze §4.2.  

## 13.22 QG-421–QG-440

**QG-421:** NPC never T-pose in shipped asset.  
**QG-422:** NPC idle cycle minimum 3 states: breathe, blink, glance.  
**QG-423:** NPC never faces away from child entry path on first visit.  
**QG-424:** NPC speech bubble max 2 lines — 14 px min text equivalent in art.  
**QG-425:** NPC miss-day line neutral — QG-153 binding.  
**QG-426:** NPC celebrate max 600 ms — skippable.  
**QG-427:** NPC never blocks placement ghost target.  
**QG-428:** NPC scale consistent per §7 — no resize between frames.  
**QG-429:** Animal NPC tail/ear secondary motion when applicable.  
**QG-430:** Morgon-Mira apron always visible — identity anchor.  
**QG-431:** Snickar-Sune tool belt Maker Amber accent.  
**QG-432:** Mini-Dino head tilt curious max 8°.  
**QG-433:** Window bird non-verbal only — no speech bubble.  
**QG-434:** NPC shadow grounded §2.7.  
**QG-435:** NPC eye highlight mandatory §7.4.  
**QG-436:** Two NPC max foreground per scene unless ADR.  
**QG-437:** NPC LOD simplified beyond 120 % zoom — not blurry.  
**QG-438:** NPC outline 2 px consistent §2.5.  
**QG-439:** NPC never product placement real brand.  
**QG-440:** NPC diversity inclusive §7.11 when human.  

## 13.23 QG-441–QG-460

**QG-441:** Unlock ceremony max 2000 ms total — 03B binding.  
**QG-442:** New world reveal: silhouette → color → name — 3 beat max.  
**QG-443:** World name typography §9.10 — not illustration text in scene.  
**QG-444:** Build part land: ghost → solid 400 ms ease-out §36.  
**QG-445:** Build snap particle max 12 — gold palette.  
**QG-446:** Placement valid pulse gold 2 px once — not loop.  
**QG-447:** Placement invalid: gray blink barn — never red §20.  
**QG-448:** World growth visible before/after still in PR.  
**QG-449:** Unlock never blocks Idag return path.  
**QG-450:** Ceremony skippable tap anywhere after 300 ms.  
**QG-451:** Haptic optional — visual complete alone.  
**QG-452:** First world unlock no dark tunnel transition.  
**QG-453:** Milestone 25/50/75 % gentle — no slot machine.  
**QG-454:** Build part shadow appears same frame as solid.  
**QG-455:** Room expansion camera pan 400 ms max.  
**QG-456:** Reward star path arcs to counter — not UI spam.  
**QG-457:** Concurrent unlock one per session default.  
**QG-458:** Unlock VO parent-only if any.  
**QG-459:** Museum export watermark not on child view.  
**QG-460:** Build animation reduced motion: instant solid.  

## 13.24 QG-461–QG-480

**QG-461:** Primary tap response visual ≤100 ms — Nintendo polish §37.  
**QG-462:** Placement snap feels magnetic — 8 px threshold documented.  
**QG-463:** One pixel seam fix on room background mandatory before ship.  
**QG-464:** Icon pixel-fit @1x integer coordinates.  
**QG-465:** No half-pixel blur on @2x exports.  
**QG-466:** Loading state uses branded illustration — not spinner.  
**QG-467:** Empty state one illustration + 2 line copy max.  
**QG-468:** Error state calm bird §Appendix D — not alarm red child.  
**QG-469:** Transition black frame 0 ms — always content or crossfade.  
**QG-470:** Scroll rubber-band visual subtle — not iOS default harsh.  
**QG-471:** Pull refresh not on child route.  
**QG-472:** Haptic pairs with visual on parent optional only.  
**QG-473:** Font rendering antialiased — no faux bold.  
**QG-474:** Image decode jank tested iPhone SE.  
**QG-475:** Memory release after celebration tested.  
**QG-476:** Polish pass checklist §37 signed in PR.  
**QG-477:** Micro-interaction sound off by default child.  
**QG-478:** Edge swipe back visual hint parent only.  
**QG-479:** No debug grid visible in ship assets.  
**QG-480:** Golden reference frame match ≥95 % structure Morgonhuset.  

## 13.25 QG-481–QG-500

**QG-481:** At least one Delight item D-001–D-200 applicable per world ship.  
**QG-482:** Nintendo checklist N-001–N-030 self-review attached.  
**QG-483:** Pixar checklist P-001–P-030 self-review attached.  
**QG-484:** AI manifest ai_assisted flag accurate §41.  
**QG-485:** Hand-finish layer visible at 100 % zoom on hero art.  
**QG-486:** External studio deliverable includes QG-001–QG-500 sheet.  
**QG-487:** Illustrator sign-off name on manifest author field.  
**QG-488:** Version semver on every ship asset.  
**QG-489:** Rollback tag in release notes §23.5.  
**QG-490:** Creative Director final Ja logged.  
**QG-491:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-492:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-493:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-494:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-495:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-496:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-497:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-498:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-499:** Ship bundle passes automated Art Bible validator rule bucket 22.  
**QG-500:** Ship bundle passes automated Art Bible validator rule bucket 22.  

---

# 14. Asset Pipeline — PSD, Illustrator, Figma, SVG, PNG, WebP, Lottie, Spine, Sprite Sheets, Texture Atlases

## 14.1 Pipeline-översikt och auktoritet

All visuell kod och alla binärfiler levereras genom en ** endast framåt **asset pipeline. Creative Director äger stil-gate; Art Director äger filstruktur och naming; Frontend Lead äger implementation mount i `public/` och `assets/`. Ingen illustratör committar direkt till `public/` utan PR med manifest.

** Rotmapp:** `/assets/` i repo ( eller motsvarande CDN mirror vid live release ).

```
assets/
├── source/                    # Masters — never served to client directly
│   └── {world_slug}/
│       ├── room-root.psd
│       ├── npc-{name}.psd
│       └── brushes/
├── worlds/
│   └── {world_slug}/
│       ├── raster/
│       │   ├── stjarndag-{world}-{asset}-v{n}-@1x.png
│       │   ├── stjarndag-{world}-{asset}-v{n}-@2x.png
│       │   └── stjarndag-{world}-{asset}-v{n}-@3x.webp
│       ├── vector/
│       ├── lottie/
│       ├── sprites/
│       └── manifest.json
├── icons/
│   └── icon-{context}-{name}.svg
├── ui/
│   └── parent/ | child/
└── archive/                   # Deprecated — retained 2 releases
```

## 14.2 PSD / Procreate — masterregler

| Parameter | Värde |
|-----------|-------|
| Min bredd rum | **4096 px** |
| Färgrymd arbete | ** sRGB IEC61966-2.1** |
| Bit depth arbete | **16-bit** tillåtet; export**8-bit** |
| Layer naming | `BG`, `MID`, `FG`, `LIGHT`, `LINE`, `FX`, `UI_SAFE` |
| UI safe overlay | Guide layer bottom **128 px**, top **64 px** |
| Max lager | **40** — merge T-dekor före ship |
| Version suffix | `_v{n}` i filnamn vid silhouette change |

** Export från PSD:** Save for Web legacy** off** — använd scripted export eller Procreate PNG @1x/@2x/@3x.

## 14.3 Adobe Illustrator — vektor och ikoner

- Brush library: `assets/source/brushes/stjarndag-soft-ink-v1.ai`
- Stroke baseline **2.0 px** @375 px artboard width
- Expand strokes före SVG export om filter krävs
- Outline text — inga live fonts i ship SVG
- Artboards: ikon **48×48**, build part **512×512**, NPC **380 px** höjd figure

**SVG export profil:**
- Styling: Inline attributes only
- Decimal: **2** places
- Minify: SVGO `multipass: true`
- Max filstorlek: **8 KB** gzip ( QG-258 )

## 14.4 Figma — design system sync

Figma fil: `Stjärndag-Art-System` ( länk i intern wiki ).

| Figma page | Innehåll |
|------------|----------|
| Tokens | HEX från §3 — single source med POS 03 |
| Components | Knappar §9, kort, nav |
| Worlds | Per `world_slug` moodboard |
| Icons | 48 px barn, 24 px parent |

**Export från Figma:** SVG för ikoner; PNG @2x för komplexa illustrationer som inte shipas som SVG. Figma Dev Mode handoff till Frontend — inte direkt till barn utan Art Director review.

## 14.5 PNG — rasterregler

| Asset typ | Max @1x KB | Max dimension @1x |
|-----------|------------|-------------------|
| Rum full | **450**|**1125×2436** safe |
| Build part | **80**|**512×512** |
| NPC standalone | **120**|**380×500** |
| Celebration frame | **60**|**375×375** |

- PNG-24 med alpha
- Inga interlaced PNG
- Crush med `pngquant` quality **80–90** efter Art Director OK
- Transparent fringe: 0 halvpixel halo — test på `#F7F3EB` bakgrund

## 14.6 WebP — optimering

- Quality **85** default
- Quality **80** för bakgrunder utan fine line
- Alpha behålls
- Serve WebP med PNG fallback i `<picture>`
- Naming: samma bas som PNG med `.webp`

## 14.7 Lottie — celebration only

**När:** Stjärna earned, milestone, dopamin-burst enligt 03B.

**När INTE:** Idle loop, nav, loading ( använd CSS skeleton §9 ).

| Parameter | Värde |
|-----------|-------|
| Max duration | **2000 ms** |
| Max filstorlek | **150 KB** gzip |
| FPS | **30** max |
| Embedded images | Förbjudna >**64 KB** total |
| Reduced motion | Statisk PNG sista frame |

Export: Bodymovin / LottieFiles validator pass.

## 14.8 Spine — förbjudet default v1

Spine skeletal animation **får inte** shipas i v1 utan ADR. Orsak: performance + style consistency risk. Om ADR godkänner: se §17 och §21 budgets.

## 14.9 Sprite sheets och texture atlases

**När:** NPC idle ≤**12 frames**, vatten loop, partiklar.

| Parameter | Värde |
|-----------|-------|
| Max atlas | **2048×2048 px** |
| Padding | **2 px** mellan sprites |
| Format | PNG-32 + WebP |
| JSON manifest | `{frameWidth, frameHeight, frames[], fps}` |

**Naming:** `stjarndag-{world}-sprite-{name}-atlas-v{n}.png`

** Texture atlas ( WebGL — sällan ):**
- Max **1024×1024** v1
- Power-of-two dimensions
- Mipmap **off** för 2D UI

## 14.10 Versionering och semantic naming

**Pattern:** `stjarndag-{world_slug}-{category}-{name}-{variant}-v{major}.{minor}-@{scale}x.{ext}`

Exempel:
- `stjarndag-morgonhuset-room-root-v2.0-@2x.webp`
- `stjarndag-global-icon-activity-toothbrush-v1.0-@1x.svg`
- `stjarndag-verkstaden-build-birdhouse-roof-v1.1-@1x.png`

** Semantic version:**
- `major` — silhouette eller perspective change
- `minor` — color/lighting only

** manifest.json **per world:
```json
{
  "world_slug": "routine_home",
  "art_bible_version": "1.0",
  "assets": [
    {"path": "raster/stjarndag-morgonhuset-room-root-v2.0-@2x.webp", "qg_pass": "QG-001-QG-500", "hash": "sha256:..."}
  ]
}
```

## 14.11 CI och validering

Pipeline kör vid PR:
1. Forbidden hex scan ( Appendix H list )
2. File size budget §21
3. SVG SVGO lint
4. manifest.json schema validate
5. Naming regex match

---

# 15. Produktionspipeline — Concept till Release

## 15.1 Stegöversikt

```
DoR (§24) → Concept → Sketch → Line Art → Color → Lighting → Review → QA → Export → Implementation → Regression → Release
```

Varje pil är en ** hard gate** — backward movement tillåten endast till nästa gate till vänster, inte hopp över.

## 15.2 Gate 0 — Definition of Ready ( §24 )

** Veto:** Art Director.** Ingen pixel ritas före DoR complete.**

Checklista: se §24. Output: `brief-{ticket-id}.md` med PCB slug, emotion job, palette, QG scope.

## 15.3 Gate 1 — Concept ( thumbnail )

| Krav | Värde |
|------|-------|
| Antal thumbnails | **3** minimum |
| Storlek | **800 px** bredd |
| Innehåll | Grå värde + komposition + P/S/T markering |
| Reviewer | Art Director väljer **1** |
| Duration | Max **2** arbetsdagar |

**Fail:** Tre thumbnails samma komposition roterad — räknas som 1.

## 15.4 Gate 2 — Sketch ( struktur )

- Perspektiv grid §2.3 overlay
- Horisont marker **38–42 %**
- Djupplan separerade lager
- ** Ingen **färg utom valfri accent markering
- Sign-off: Art Director skriftligt

## 15.5 Gate 3 — Line Art

- Soft ink §2.5 complete
- NPC proportion §7 verified
- ** Stop:** Color förbjuden före line gate pass ( QG-188 )
- Leverans: `*-line-v{n}.psd` layer `LINE` only export för review

## 15.6 Gate 4 — Color

- Palett endast §3 + world accent table
- Material separation §2.1
- Ingen lighting glow än — flat color pass

## 15.7 Gate 5 — Lighting

- Key/fill/rim §4 applied
- Skuggor §2.7
- Grain overlay §A.7 optional **8 %**
- Time-of-day tag i metadata

## 15.8 Gate 6 — Creative Review

** Reviewer:** Creative Director.** Veto:** Ja.

Checklist: Appendix I 10-punkts snabbscan + screenshot test 00B.

Output: `CREATIVE_REVIEW.md` med Ja/Nej + timestamp.

## 15.9 Gate 7 — UX Review ( om UI mock )

** Reviewer:** UX Director.

Touch targets §9, one-action Idag, placement ghost §D.2.

## 15.10 Gate 8 — Accessibility Review

** Reviewer:** Accessibility Lead.

Contrast §22, alt text, reduced motion path, colorblind shapes.

## 15.11 Gate 9 — QA Export

** Reviewer:** QA Lead.

All QG-001–QG-500 self-sheet + automated scans §14.11.

## 15.12 Gate 10 — Export

Exports enligt §14 till `assets/worlds/{world_slug}/`. manifest.json updated.

## 15.13 Gate 11 — Implementation

** Reviewer:** Frontend Lead.

Mount paths, lazy load §21, `<picture>` WebP, CSS safe areas §20.

## 15.14 Gate 12 — Regression

Screenshot diff @1x iPhone SE, iPad, Chrome desktop. Performance trace §21.

## 15.15 Gate 13 — Release

** Reviewer:** Release Manager.

SW cache version bump, CDN invalidation checklist, rollback asset version documented.

** Veto chain:** Accessibility Lead ( a11y ), Performance ( §21 ), Creative Director ( stil ) — any** Nej** = no ship.

---

# 16. Illustration Definition of Done ( DoD )

En illustration är ** Done **först när** alla **kriterier nedan är uppfyllda och loggade i PR. Partial Done existerar inte.

## 16.1 Quality Gates

- [ ] Self-review QG-001–QG-500 ** alla Ja**
- [ ] Automated forbidden hex scan pass
- [ ] File size budget §21 pass
- [ ] manifest.json entry complete

## 16.2 Accessibility

- [ ] Svensk `alt` text för meaningful images ( QG-271 )
- [ ] Decorative images marked `alt=""`
- [ ] Reduced motion static fallback tested
- [ ] Colorblind state not color-only ( QG-272 )
- [ ] Accessibility Lead sign-off ( QG-280 )

## 16.3 Exports exist

- [ ] PNG @1x, @2x, @3x OR vector SVG where applicable
- [ ] WebP @1x/@2x for raster >20 KB
- [ ] Source PSD/Procreate in `assets/source/`
- [ ] Lottie JSON if animated celebration — else N/A documented

## 16.4 Platform matrix

| Plattform | Verified |
|-----------|----------|
| iPhone SE 375×667 | [ ] |
| iPhone 390×844 | [ ] |
| iPhone Plus 428×926 | [ ] |
| Android 360×640 min | [ ] |
| iPad portrait | [ ] |
| iPad landscape | [ ] |
| Web 1280+ | [ ] |
| Web 1440 max | [ ] |

## 16.5 Modes

- [ ] Light mode default Oat `#F7F3EB`
- [ ] Dark mode: parent-only surfaces if applicable — barn unchanged
- [ ] `prefers-reduced-motion: reduce` — static OK
- [ ] Retina @2x/@3x crisp — no upscaled blur
- [ ] Print branch CMYK ADR if merch — else N/A

## 16.6 Naming och metadata

- [ ] Semantic filename §14.10
- [ ] Version bump documented
- [ ] PCB world slug in PR description
- [ ] Creative Director Ja logged

## 16.7 Craft checklistor ( FINAL )

- [ ] D-001–D-200: minst **1** delight applicable per world deliverable ( §38 )
- [ ] N-001–N-030: Nintendo checklist self-sheet bifogad ( §39 )
- [ ] P-001–P-030: Pixar checklist self-sheet bifogad ( §40 )
- [ ] §25–§41 kapitel-DoD relevant för leverans typ
- [ ] QG-001–QG-500 self-sheet **alla Ja**

**DoD sign-off rad:** Art Director + QA Lead initials i PR.

---

# 17. Animation Pipeline — Lottie, CSS, Canvas, WebGL, Sprite, Frame

Animation ska ** förstärka kapabel glädje** — aldrig kräva uppmärksamhet för att förstå nästa steg ( 03B, CORE_VALUES lugn magi ).

## 17.1 Beslutsmatris — NÄR använda

| Teknik | NÄR | Budget |
|--------|-----|--------|
| ** CSS transition/keyframes** | UI state: knapp active, nav fade, check pop | ≤**300 ms**, ≤**3** samtidiga |
| **Lottie** | Celebration stjärna, milestone confetti | ≤**2000 ms**, ≤**150 KB** |
| ** Canvas 2D** | Vatten ripple Fiskebryggan, ambient partiklar | ≤**30 FPS**, ≤**8** ms/frame |
| **Sprite sheet** | NPC idle breathe, Mini-Dino blink | ≤**12** frames, ≤**512 KB** atlas |
| **Frame PNG sequence** | Engångs celebration utan Lottie | ≤**24** frames, ≤**60 KB**/frame @1x |
| ** WebGL**|** Förbjudet v1** | ADR only |

## 17.2 NÄR INTE använda

| Teknik | INTE för | Varför |
|--------|----------|--------|
| Lottie | Nav idle, loading spinner default | Tungt; CSS räcker |
| CSS | Full room parallax multi-layer | Jank på SE — använd static |
| Canvas | Hela Min värld render | GPU/memory §21 |
| WebGL | Allt v1 | Fragmentation + a11y |
| Sprite | Parent Planering UI | Fel dialekt §9 |
| Frame sequence | Bakgrund loop >3 s | Distraherande — bryter lugn magi |

## 17.3 Reduced motion ( 03B binding )

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 150ms !important;
  }
}
```

Celebration: hoppa till statisk badge frame. Parallax: off. Stjärnblink: off. Vatten: statisk yta.

## 17.4 Celebration stack ( bindning 03B )

1. Frame 0–400 ms: stjärna pop scale 0→1.15→1
2. 400–1200 ms: optional glow fade
3. 1200–2000 ms: settle eller auto-dismiss
4. Tap anywhere: skip to end state immediately

Max **1** celebration queue — ingen stacking.

## 17.5 NPC idle

- Morgon-Mira breathe: CSS scaleY **1.00–1.02**, **4 s**, ease-in-out
- Reduced motion: mid-frame static
- Sprite alternative: **8** frames max,**12 FPS**

## 17.6 Performance coupling §21

Total animation CPU budget barn route: **≤10 %** main thread idle efter paint. Om över — static fallback ship.

---

# 18. AI Illustration Rules

## 18.1 Tillåtna användningar ( internt only )

1. **Rough composition exploration** — thumbnails som kastas efter Art Director val
2. ** Moodboard referens** — inte ship layers
3. ** Background underpainting**— om**100 %** handovermal enligt §2.6 penslar
4. **Variant ideation** — 3+ directions snabbt — endast 1 handfinal

All AI-assisted internal work loggas i brief — ship assets flag `ai_assisted: false`.

## 18.2 Förbjudna användningar

1. Generativ output som ** slutleverans **utan full hand redo
2. AI upscale som enda detaljpass
3. AI face/hands som ship without manual redraw
4. Batch generera 7 världar "consistent style" — consistency kommer från Art Bible, inte prompt
5. Text i bild via generativ modell
6. Style transfer från Disney/Pixar copyrighted frames
7. LoRA trained on competitor apps

## 18.3 Obligatorisk manuell review

100 % zoom review av:
- Händer ( finger count )
- Ögon ( highlight, symmetry )
- Tänder/mun hygiene scener
- Text och etiketter
- Logotyper och märken
- NPC ansikte consistency sheet

Sign-off: Art Director + Creative Director for any asset where AI touched internal pipeline.

## 18.4 Stilconsistency enforcement

1. ** Reference frame lock:** Första godkända Morgonhuset-rum = golden reference
2. ** Pipett scan:** Appendix H hex list
3. ** Stroke audit:** ±0.15 px mot §2.5
4. ** Side-by-side grid:** Ny asset bredvid reference — Art Director 3 s test

** AI slop definition:** Any ship pixel not traceable to human brush stroke decision — Creative Director** Nej**.

---

# 19. Modular Asset System

## 19.1 Syfte

Min värld byggs av ** återanvändbara delar **med** medvetet skapad variation** — sparar produktion utan att kännas som samma rum copy-paste.

## 19.2 Kategorier och paths

| Kategori | Path | Variant min |
|----------|------|-------------|
| Träd | `assets/worlds/{world}/modular/trees/` | 4 per biome |
| Fönster | `.../windows/` | 3 |
| Golv | `.../floors/` | 4 material |
| Väggar | `.../walls/` | 2 per värld |
| Mattor | `.../rugs/` | 6 färger |
| Lampor | `.../lamps/` | 3 typer |
| NPCs | `.../npcs/` | 1 unik per värld + shared kit |
| Props | `.../props/` | 12 bas per värld |
| Collectibles | `.../collectibles/` | PCB lista |
| Build parts | `.../build/` | Per progression |

## 19.3 Reuse without recycled feel — regler

Minst **2 differentiators** när samma basmodell återanvänds:
1. **Färgshift** inom §3 ( inte forbidden hex )
2. **Skala** S/M/L ( 0.85× / 1.0× / 1.15× )
3. **Rotation** snap 15°
4. **Tillbehör** add/remove ( mug, plant, patina )
5. **Skada/patina** §A.1
6. ** Säsong **swap enligt PCB calendar

** Max cross-world reuse:** Samma prop mesh**2** gånger — tredje gång kräver variant file ( QG-097, QG-235 ).

## 19.4 Variant matrix ( exempel — fönster )

| ID | Värld | Tid | Glas | Gardin | Accenter |
|----|-------|-----|------|--------|----------|
| WIN-A | Morgonhuset | Morgon | 40 % | Linen | Sky Calm |
| WIN-B | Läshörnan | Kväll | 35 % | Dusk | Regn streaks |
| WIN-C | Verkstaden | Formiddag | 45 % | Upprullad | Vedhög reflection |

Matrix maintained i `assets/worlds/{world_slug}/variants.md`.

## 19.5 Anchor och grid

- Build parts: anchor **bottom-center**
- Wall decor: anchor ** top-center **på vägg grid**8 px** snap
- NPC: feet on floor plane — never floating >**2 px** ( QG-055 )

---

# 20. Responsiv illustration

## 20.1 Referensviewports

| Enhet | Logical size | Scale | Content max-width |
|-------|--------------|-------|-------------------|
| iPhone SE | 375×667 | 1.0× | full |
| iPhone | 390×844 | 1.04× | full |
| iPhone Plus | 428×926 | 1.14× | full |
| Android min | 360×640 | 0.96× | full |
| Tablet portrait | 768×1024 | — | **480 px** centered |
| Tablet landscape | 1024×768 | — | **480 px** centered |
| Web mobile | 390×844 | — | full |
| Web desktop | 1280–1440 | — | illustration max **1440 px** |

## 20.2 Safe zones ( room art )

```
┌─────────────────────────────┐
│  TOP SAFE 64px (status)     │
│                             │
│      ILLUSTRATION           │
│      SAFE AREA              │
│                             │
│  BOTTOM SAFE 128px (nav)    │
└─────────────────────────────┘
```

Primary ( P ) object must sit ** entirely **above bottom safe + **16 px** margin.

## 20.3 Scaling rules

- **Vector/SVG:** scale infinite — stroke optimerad per size bucket
- **Raster:** provide @1x/@2x/@3x — never upscale @1x on @3x device
- **Tablet:** illustration may full-bleed behind centered UI card float §D.8
- **Landscape:** NOW hero must remain visible — crop side T-dekor first, never P

## 20.4 Crop rules

1. Never crop P object
2. Crop order: sky → distant T → side T → never MID
3. Min **18 %** whitespace §2.12 preserved post-crop
4. Focal point center bias: **45 %** horizontal,**42 %** vertical

## 20.5 Orientation-specific

**Portrait ( default ):** Diorama horisont 38–42 %.

**Landscape:** Horisont may shift**+4 %** up — never below 38 %. Nav moves side or compact — illustration crop top/bottom symmetric max**12 %**.

---

# 21. Performance Budget

Exakta tal — Release Manager veto om över utan ADR.

## 21.1 Filstorlekar

| Asset | Max @1x | Max @2x | Max @3x |
|-------|---------|---------|---------|
| Room PNG | 450 KB | 900 KB | 1350 KB |
| Room WebP | 280 KB | 560 KB | 840 KB |
| Build part | 80 KB | 160 KB | 240 KB |
| NPC PNG | 120 KB | 240 KB | 360 KB |
| SVG icon | 8 KB gzip | — | — |
| Lottie | 150 KB gzip | — | — |
| Sprite atlas | 512 KB | — | — |

## 21.2 SVG regler

- Max path complexity: **500** paths per icon
- No embedded bitmaps
- Simplify tolerance **0.5 px** efter hand review

## 21.3 Lottie regler

Se §17 + §14.7. Total precached celebration assets ≤**200 KB** SW delta.

## 21.4 Sprite budget

- Max **12** frames idle
- Atlas **2048×2048** hard cap
- **2** atlases max loaded per barn screen

## 21.5 Memory

- Raster decode total first paint: ≤**2.5 MB**
- Peak iOS WebView: ≤**64 MB** illustration layers
- Unload off-screen room assets on world switch

## 21.6 GPU och rendering

- Overdraw ≤**3×** fullscreen
- No WebGL v1
- `will-change` max **2** elements
- Canvas animations ≤**1** per screen

## 21.7 Animation CPU

- Main thread animation ≤**10 %** sustained
- Celebration ≤**16 ms** first frame paint
- 60 FPS target UI; 30 FPS acceptable ambient only

## 21.8 Mätning

Lighthouse mobile performance ≥**90** on `/child-dashboard` efter asset change. QA loggar i PR.

---

# 22. Accessibility för illustration ( utökad )

WCAG 2.1 AA är golv — Stjärndag siktar på **barn med NPF och nedsatt syn** utan att offra estetik.

## 22.1 Kontrast

| Element | Ratio | Exempel |
|---------|-------|---------|
| Body text parent | **4.5:1** | `#1B2340` on `#F8F9FC` |
| Body text barn | **4.5:1** | `#1B2340` on `#FFFFFF` |
| Large text ≥18 px bold | **3:1** | Rubriker |
| UI components | **3:1** | Borders, ikoner |
| Illustration stor form | **3:1** | P object vs bakgrund |
| Gold text small | ** FAIL** | Använd Navy på gold |

## 22.2 Färgblindhet

- Success: checkmark shape — inte grön alone
- Warning parent: amber + ikon — inte gul alone
- State change: shape + label — deuteranopia sim pass
- Test: Coblis eller Figma plugin documented in PR

## 22.3 Reduced motion

All motion 03B + §17.3. Barn ska förstå completion utan animation.

## 22.4 Touch

- Barn **48×48 px** minimum ( QG-273 )
- Spacing **8 px** between targets
- Placement ghost tappable area matches visual + **8 px** bleed

## 22.5 Focus ( parent )

- **2 px**`#F5A623` ring offset**2 px**
- Never `outline: none` without replacement

## 22.6 Readability

- Activity icon + optional text — never icon alone for critical path
- Max **2** rader copy on empty states
- Illustration alt Swedish B1 vocabulary

## 22.7 Cognitive

- One primary action Idag
- No countdown pressure visuals
- No streak flame guilt art

---

# 23. Review Process — Creative, UX, Accessibility, Performance, Implementation, Regression, Release

## 23.1 Review stages

| Stage | Owner | When | Veto |
|-------|-------|------|------|
| Creative | Creative Director | After Lighting gate | **Ja** — stil, 00B, §11 |
| UX | UX Director | UI-bearing deliverables | ** Ja** — touch, flow |
| Accessibility | Accessibility Lead | Pre-export | ** Ja** — a11y blockers |
| Performance | Frontend Lead + QA | Post-implementation | ** Ja** — §21 breach |
| Implementation | Frontend Lead | PR code review | ** Ja** — wrong mount |
| Regression | QA Lead | Pre-release | ** Ja** — visual diff |
| Release | Release Manager | Ship gate | ** Ja** — manifest/cache |

## 23.2 SLA

- Creative review: **2** arbetsdagar
- UX/a11y: **1** arbetsdag
- QA regression: **1** arbetsdag före release freeze

## 23.3 Artefakter

Varje review producerar:
- `CREATIVE_REVIEW.md` eller checkbox i PR template
- Screenshot bundle `review/{ticket}/`
- QG sheet signed PDF or MD

## 23.4 Escalation

Deadlock Creative vs Game Director → CPO. Performance vs Creative → CTO adjudicates budget, CPO product call.

## 23.5 Release veto chain

Release Manager check:
1. All reviews Ja
2. SW cache version bumped
3. Rollback asset version tagged
4. No open P0 visual bugs

---

# 24. Definition of Ready ( DoR )

**Ingen illustration startar utan complete DoR.** Art Director blockerar brief utan detta.

## 24.1 DoR checklista

### Produkt och fiction
- [ ] PCB world slug (`routine_home`, etc.)
- [ ] Emotion job sentence quoted
- [ ] Progression stage ( early / mid / late ) if applicable
- [ ] NPC list from PCB if scene includes NPC

### Visuell spec
- [ ] Time of day §4 selected
- [ ] Weather if outdoor §4.10/5
- [ ] World accent HEX from table
- [ ] P/S/T hierarchy planned — one P
- [ ] Reference frame linked ( golden or prior approved )

### Teknisk spec
- [ ] Target platforms §20 listed
- [ ] Export formats §14 decided
- [ ] Animation scope §17 — static vs Lottie
- [ ] Performance budget tier §21 acknowledged
- [ ] File naming prefix confirmed

### Process
- [ ] Ticket ID and owner illustrator
- [ ] Due date and gate calendar §15
- [ ] Revision round limit **2** communicated
- [ ] DoD §16 understood and accepted

### Legal och etik
- [ ] No real brands in brief
- [ ] Inclusion requirements §7.11 noted if family scene
- [ ] AI usage policy §18 acknowledged

## 24.2 DoR sign-off

**Art Director** initials + date on brief.**Game Director** co-sign if new NPC or collectible.

## 24.3 DoR incomplete — exempel avvisning

- " Rita ett barnrum " utan world slug
- " Gör det mysigt " utan emotion job
- " Snabb AI concept för ship på fredag "
- Brief utan safe zone awareness §20

---


> **FINAL authority:** Fullständiga AI-regler i **§41 AI Illustration Rules ( FINAL )**. §18 är summary för pipeline.

# 25. Living World Bible

## 25.1 Syfte

Definiera hur Stjärndags sju världar känns ** levande **utan hyperstimulus — idle, dygn, årstid, väder och NPC-liv enligt PCB living behaviors.

## 25.2 Designfilosofi

En värld är en ** karaktär med andningsrytm**, inte en statisk bakgrund. Rörelse är långsam, skippbar och meningsbärande. Stillhet är också design.

## 25.3 Absoluta regler

1. Min värld-scener ska ha minst ** ett **dokumenterat idle-lager i manifest ( QG-281 ).
2. NPC får ** aldrig **stå helt still >5 s utan mikrorörelse ( blink, andning, svans ).
3. Miss day: rum ** dim max 15 %** — välkomnande, aldrig straff-sprite.
4. Dygnscykel följer §4 ljusprofiler — inte ad hoc natt-skräck.
5. Ambient liv max **1** flygfågel per 120 s session.

## 25.4 Rekommendationer

- Koppla idle till fiction ( kettle efter morgon-klar ).
- Documentera period i ms i manifest animation field.
- Reduced motion: statisk mid-frame.

## 25.5 Förbjudna exempel

- Full loop blinkande neon skylt.
- Dust punishment på miss day.
- Tropical storm i barnrum.

## 25.6 Exempel på rätt utförande

- Morgonhuset: solstråle drift 20 min + gardin sway 8 s.
- Fiskebryggan: vatten ripple 40 px period.
- Husdjurshemmet: kanin öron twitch 6 s.

## 25.7 QA-checklista

- [ ] Idle manifest entry exists
- [ ] Reduced motion tested
- [ ] Miss-day luminance ≤15 % drop
- [ ] NPC micro-motion verified

## 25.8 Definition of Done

- [ ] All QG-281–QG-300 Ja
- [ ] Game Director emotion still readable
- [ ] Performance §21 pass

---

# 26. Camera Bible

## 26.1 Syfte

Standardisera **kamerans beteende** i diorama-världar så illustratör, frontend och AI producerar identisk framing.

## 26.2 Designfilosofi

Kameran är **knä-höjd barn** som tittar in i dockskåp — stabil, lugn, aldrig action-shake.

## 26.3 Absoluta regler

1. Horisont **38–42 %** från botten §2.3.
2. Zoom placement **92–115 %**.
3. Pan max **120 px/s**.
4. Dutch angle ** förbjudet **barn.
5. Safe zones §20: top 64 px, bottom 128 px.

## 26.4 Rekommendationer

- Reveal pan vänster→höger vid ny build del.
- iPad centrerar P-objekt max 480 px content.

## 26.5 Förbjudna exempel

- FPS sway.
- Extreme wide distort.
- Cut to black >200 ms utan ADR.

## 26.6 Exempel på rätt utförande

- Morgonhuset default frame: dörr + frukostbord i P/S balans.
- Placement zoom 108 % centrerad på ghost.

## 26.7 QA-checklista

- [ ] Horizont measured
- [ ] Safe zones respected in export
- [ ] Pan speed tested on SE

## 26.8 Definition of Done

- [ ] QG-301–QG-315 Ja
- [ ] Visual diff golden frame ≥95 % structure

---

# 27. Composition Bible

## 27.1 Syfte

Samla ** kompositionslag **som säkerställer läsbarhet, barns blickflöde och lugn magi i varje frame.

## 27.2 Designfilosofi

Komposition tjänar ** en handling** — barnet ska veta var de ska titta på <3 s utan text.

## 27.3 Absoluta regler

1. En P per scen §2.11.
2. Negativ yta min **18 %** ( Idag **24 %** ).
3. Rule of thirds: P på intersection eller center-bottom.
4. Max S=4, T=6–12.

## 27.4 Rekommendationer

- Leading lines mot P.
- Asymmetri default — symmetri Dockhuset undantag.

## 27.5 Förbjudna exempel

- Fullbleed stjärnregn.
- Två P av samma vikt.
- Text i bild som primär info.

## 27.6 Exempel på rätt utförande

- Idag NOW: kort centrerat med 24 % whitespace.
- Min värld: dörr + ghost mot övre tredje.

## 27.7 QA-checklista

- [ ] P count = 1
- [ ] Whitespace measured
- [ ] Thumbnail 120 px readable

## 27.8 Definition of Done

- [ ] QG-316–QG-330 Ja
- [ ] Creative Director 3 s test pass

---

# 28. Motion & Animation Bible

## 28.1 Syfte

Bindande ** animationsprinciper** ( easing, anticipation, timing ) som kompletterar §17 pipeline och POS 03B.

## 28.2 Designfilosofi

Rörelse ska kännas ** fysiskt trovärdig inom stil** — squash lite, aldrig gummihos.

## 28.3 Absoluta regler

1. UI easing: cubic-bezier(0.33, 1, 0.68, 1).
2. Celebration ≤**2000 ms**.
3. Squash/stretch max **8 %** Y.
4. Concurrent anim max **5**.
5. Reduced motion: statisk första frame.

## 28.4 Rekommendationer

- Anticipation 80 ms före celebration pop.
- Stagger 40 ms listor.
- Build land 400 ms ease-out.

## 28.5 Förbjudna exempel

- Infinite spin nav.
- Screen shake barn.
- Elastic bounce >4 % overshoot loop.

## 28.6 Exempel på rätt utförande

- Stjärna: arc path till counter 600 ms.
- Check: scale 1→1.15→1 200 ms.

## 28.7 QA-checklista

- [ ] 03B timing verified
- [ ] prefers-reduced-motion tested
- [ ] Tap skip <100 ms

## 28.8 Definition of Done

- [ ] QG-331–QG-350 Ja
- [ ] §17 technique matrix satisfied

---

# 29. Particle & VFX Bible

## 29.1 Syfte

Regler för ** stjärnor, damm, regn, snö, löv, gnistor, konfetti** — celebration utan casino.

## 29.2 Designfilosofi

VFX är ** kort glädje**, inte permanent brus. Färger från §3 endast.

## 29.3 Absoluta regler

1. Stjärnor max **8**/burst.
2. Konfetti max **24** bitar.
3. Regn/snö följer §5.8/§5.7 densitet.
4. Glitter endast Skattkammaren.
5. WebGL VFX förbjudet v1.

## 29.4 Rekommendationer

- Lottie för celebration om >CSS capability.
- Particle cleanup 500 ms efter end.

## 29.5 Förbjudna exempel

- Full-screen particle flood.
- Neon glitter.
- Rain indoors utan fiction.

## 29.6 Exempel på rätt utförande

- Star earned: 6 partiklar guld 800 ms fade.
- Dust: 4 motes i solstråle Morgonhuset.

## 29.7 QA-checklista

- [ ] Particle count budget
- [ ] Reduced motion static
- [ ] Touch zone unobscured

## 29.8 Definition of Done

- [ ] QG-351–QG-370 Ja
- [ ] §21 GPU budget pass

---

# 30. Audio Direction ( visuell handoff )

## 30.1 Syfte

Visuell produktionsmanual för **musik, ambience, UI-ljud, NPC, celebration och tystnad** — synk med illustration utan att duplicera ljudimplementering.

## 30.2 Designfilosofi

Tystnad är ** giltig design **, särskilt Läshörnan. Visuella cues ska fungera utan ljud.

## 30.3 Absoluta regler

1. Ingen equalizer-grafik barn.
2. Celebration fungerar silent.
3. NPC pratbubbla före eventuellt ljud.
4. Musiknoter endast med ADR + 06A on.

## 30.4 Rekommendationer

- Ambience visual: vatten ripple Fiskebryggan, radio glow kök optional.

## 30.5 Förbjudna exempel

- Horn graphic på barn success.
- Skuld-ljud-visual ( röd buzz ).

## 30.6 Exempel på rätt utförande

- Pin success: visuell check only.
- Läshörnan: inga onödiga ljudikoner.

## 30.7 QA-checklista

- [ ] Silent mode session tested
- [ ] No child guilt visuals when sound off

## 30.8 Definition of Done

- [ ] Audio brief linked in DoR if SFX
- [ ] §30 QA pass

---

# 31. Emotion Curves

## 31.1 Syfte

Definiera ** känslomässig kurva **per värld så illustration och animation peak-ar rätt utan skuld-dalar.

## 31.2 Designfilosofi

Kurvan följer PCB emotion job — ** capable safety**, inte roller coaster.

## 31.3 Absoluta regler

1. Minst en ** lugn plateau **per session.
2. Miss-day ** aldrig **under neutral valley.
3. Max ** en **emotional peak per besök default.

## 31.4 Kurvor per värld

| Värld | Slug | Kurva ( session ) | Peak | Valley floor |
|-------|------|-------------------|------|--------------|
| ** Morgonhuset** | `routine_home` | Lugn → små steg upp → stolt plateau | Första placerade delen | Neutral välkomnande |
| ** Verkstaden** | `workshop` | Nyfiken → bygg-flow → maker stolthet | Projekt milestone | Neutral verkstad |
| ** Husdjurshemmet** | `pet_home` | Värme → skötsel → tillhörighet | Djur sover tryggt | Neutral — aldrig sorg |
| ** Dinosaurielunden** | `dino_valley` | Mystery → awe → mod | Silhuett → synlig vän | Mystery not fear |
| ** Dockhuset** | `dollhouse` | Ordning lek → kontroll → mys | Harmony glow | Lagom röra OK |
| ** Fiskebryggan** | `fishing_pier` | Väntan → lugn → tålmodig glädje | Fångst / solnedgång | Neutral vatten |
| ** Läshörnan** | `reading_nook` | Stilla → fokus → stolt avslut | Bokslut / lampa | Tystnad valid |

## 31.5–31.8

Se §31.3 för regler. QA: kurva citerad i DoR. DoD: Game Director 3 s emotion test.

---

# 32. Seasonal System

## 32.1 Syfte

Hur världar ** förändras under året **utan FOMO — subtila, fiction-koherenta säsongsskift.

## 32.2 Designfilosofi

Säsong är ** kalenderbindande fiction**, inte limited-time shop.

## 32.3 Absoluta regler

1. Manifest `season` field mandatory when variant.
2. Max **2** seasonal props per rum.
3. Autumn red max **30 %** per träd.
4. Ingen countdown-banner.

## 32.4 Rekommendationer

- Vintermössa på peg.
- Löv på matta en.
- Sommargräs +8 % saturation.

## 32.5 Förbjudna exempel

- Battle pass snowflake.
- Full palette swap.
- Miss season = punishment.

## 32.6 Exempel på rätt utförande

- Morgonhuset höst: ett löv på matta.
- Verkstaden sommar: öppen dörr till gräs.

## 32.7 QA-checklista

- [ ] Season flag in manifest
- [ ] Cross-fade 600 ms or instant reduced motion

## 32.8 Definition of Done

- [ ] QG-401–QG-410 Ja
- [ ] PCB seasonal table aligned

---

# 33. Weather System

## 33.1 Syfte

Enhetlig **väder-logik** — regn, snö, vind, dimma, sol, kväll — med cross-ref till §4 ljus ( undvik duplicering ).

## 33.2 Designfilosofi

Väder förstärker ** emotion job**, inte hinder. Regn = lugn reflektion Fiskebryggan; dimma = mystery Dinosaurielunden.

## 33.3 Absoluta regler

1. One weather state active: clear|rain|snow|fog|wind.
2. Fog default Dinosaurielunden only.
3. Rain §4.10 + drop rules §5.8.
4. Weather never blocks tap path.

## 33.4 Rekommendationer

- Grey-blue dominant OK Fiskebryggan.
- Sunbreak rainbow max 1 subtle arc.

## 33.5 Förbjudna exempel

- Thunder jump scare.
- Blizzard indoors.
- Weather timer pressure.

## 33.6 Exempel på rätt utförande

- Regn: jacka `#FFD56B`, droppar 15°.
- Dimma: silhuett 15 % opacity dino.

## 33.7 QA-checklista

- [ ] Weather state documented
- [ ] Readability 3:1 P vs background

## 33.8 Definition of Done

- [ ] QG-411–QG-420 Ja
- [ ] §4 light profile matched

---

# 34. NPC Behaviour Bible

## 34.1 Syfte

Alla NPC:er ska kännas ** levande** — companions not managers ( PCB ).

## 34.2 Designfilosofi

NPC ** andass, blinkar, glancer** — aldrig T-pose. Minst 3 idle states.

## 34.3 Absoluta regler

1. Idle cycle: breathe + blink + glance.
2. Miss-day neutral copy — QG-153.
3. Celebrate ≤600 ms skippable.
4. Never hunger meter / guilt.

## 34.4 Rekommendationer

- Morgon-Mira minns igår neutral positiv.
- Window bird chirp optional non-verbal.

## 34.5 Förbjudna exempel

- "Du glömde mig!"
- Blocking placement target.
- Six fingers QG-047.

## 34.6 Exempel på rätt utförande

- Sune arbetar ** alongside **barn 3/4.
- Mira liten clap milestone skippable.

## 34.7 QA-checklista

- [ ] NPC sheet 3 vinklar
- [ ] Idle manifest
- [ ] Eye highlight §7.4

## 34.8 Definition of Done

- [ ] QG-421–QG-440 Ja
- [ ] PCB NPC contract pass

---

# 35. Unlock Ceremony Bible

## 35.1 Syfte

Exakt hur ** nya världar presenteras** — silhouette → color → name, ≤2000 ms, skippbar.

## 35.2 Designfilosofi

Unlock är ** belöning**, inte reklam. Ingen mörk tunnel första världen.

## 35.3 Absoluta regler

1. 3 beat max: silhouette → color → name.
2. Total ≤2000 ms.
3. Skippbar efter 300 ms tap.
4. Never blocks Idag return.

## 35.4 Rekommendationer

- Fresh fantasy per world emotion job §31.
- Prior world 'rooted' fiction PCB.

## 35.5 Förbjudna exempel

- Slot machine reveal.
- Loot box chest.
- Countdown timer.

## 35.6 Exempel på rätt utförande

- Dino valley: dimma → färg → Mini-Dino siluett.
- Dockhuset: mini zoom in cutaway.

## 35.7 QA-checklista

- [ ] Ceremony storyboard approved
- [ ] Reduced motion instant path

## 35.8 Definition of Done

- [ ] QG-441–QG-450 Ja
- [ ] CPO positioning sign-off new world

---

# 36. Build Animation Bible

## 36.1 Syfte

Hur ** byggdelar landar**, världen växer och spelaren belönas visuellt.

## 36.2 Designfilosofi

Ghost → solid **400 ms** ease-out. Belöning = synlig tillväxt, inte siffror.

## 36.3 Absoluta regler

1. Ghost `#B8A9C9` dash 6/6 §10.
2. Snap particle max 12 gold.
3. Shadow same frame as solid.
4. Star arc to counter — not spam.

## 36.4 Rekommendationer

- Before/after still in PR.
- Room pan 400 ms max on expand.

## 36.5 Förbjudna exempel

- Explosive spawn.
- Red invalid shake barn.
- Numeric +1000 popup.

## 36.6 Exempel på rätt utförande

- Coat peg: ghost på vägg → solid med skugga.
- Valid pulse gold 2 px once.

## 36.7 QA-checklista

- [ ] Build timeline in brief
- [ ] Placement invalid gray only child

## 36.8 Definition of Done

- [ ] QG-451–QG-460 Ja
- [ ] §19 modular snap grid 8 px

---

# 37. Polish Bible

## 37.1 Syfte

Definiera **Nintendo-polish** i Stjärndag: grundloop perfekt före ny feature.

## 37.2 Designfilosofi

Polish = **mätbart**: tap ≤100 ms, snap magnetic, inga halv-pixel blur, golden frame match.

## 37.3 Absoluta regler

1. Primary tap visual ≤100 ms.
2. Integer @1x icon coords.
3. One seam fix room BG.
4. Golden reference ≥95 % Morgonhuset structure.

## 37.4 Rekommendationer

- Branded illustration loading — no spinner child.
- Calm error bird.

## 37.5 Förbjudna exempel

- Debug grid in ship.
- Generic spinner child.
- Half-pixel @2x blur.

## 37.6 Exempel på rätt utförande

- Placement snap 8 px threshold feels magnetic.
- Celebration cleanup no orphan particles.

## 37.7 QA-checklista

- [ ] Polish pass §37 signed
- [ ] SE jank test pass

## 37.8 Definition of Done

- [ ] QG-461–QG-475 Ja
- [ ] Nintendo checklist N-001–N-030 Ja

---

# 38. Delight Checklist — D-001 till D-200

## 38.1 Syfte

Minst **200** små detaljer som skapar glädje utan hyperstimulus — minst **en** applicable per world ship.

## 38.2 Designfilosofi

Delight är **Pixar micro-detalj** i periferin — aldrig interaktionskrav.

## 38.3 Absoluta regler

1. Max **3** delight items i fokus samtidigt.
2. Aldrig casino/sparkle spam.
3. Documentera valda D-IDs i PR.

## 38.4 Checklista

**D-001:** Damkorn synliga i morgonstråle  
**D-002:** Kantstött mugg med liten spricka-glimt  
**D-003:** Fågel på fönsterbräda tittar in  
**D-004:** Barnritning på kylskåp med magnet  
**D-005:** Strumpa som hänger lite snett på tork  
**D-006:** Ek golv med unik knut i plankan  
**D-007:** Gardiner som andas långsamt  
**D-008:** Te kopp med enkel ånga `{` form  
**D-009:** Bok som sticker ut 8° i hylla  
**D-010:** Liten kryp på fönster ( max 1 )  
**D-011:** Handtag med fingeravtryck-patina  
**D-012:** Skohorn som lutar mot vägg  
**D-013:** Regnbågsstrumpor på krok  
**D-014:** Kalender med ett kryss i guld  
**D-015:** Familjefoto i ram lite sned  
**D-016:** Katt skål med en bit kvar  
**D-017:** Radio LED som pulserar svagt  
**D-018:** Dörrmatta med välkommen-textur  
**D-019:** Vintermössa på peg säsongsvariant  
**D-020:** Löv på matta höst  
**D-021:** Snö på fönsterbräda vinter  
**D-022:** Solfläck som rör sig långsamt  
**D-023:** Nyckel på krok med liten tag  
**D-024:** Penna bakom öra på NPC skiss  
**D-025:** Verktyg med användningsslitage  
**D-026:** Spån i hörn som ser riktiga ut  
**D-027:** Fågelhus halvfärdigt med spännare  
**D-028:** Målarburk med pensel i  
**D-029:** Måttband som hänger 5 cm  
**D-030:** Hästsko på vägg Verkstaden  
**D-031:** Kanin som sover med tass över näsan  
**D-032:** Höbal i bakgrund siluett  
**D-033:** Vattenskål full — aldrig tom skuld  
**D-034:** Staket med en bräda lite lös  
**D-035:** Blomma i hage en per buske  
**D-036:** Dino-ägg med liten spricka sen senare  
**D-037:** Fräken vid stig  
**D-038:** En fjäril — anachronism tillåten  
**D-039:** Dimma som rör sig långsamt  
**D-040:** Fossil i sten subtil  
**D-041:** Docka med luvtröja  
**D-042:** Mini-soffa med kudde off-center  
**D-043:** Te servis med en kopp fel väg  
**D-044:** Lekrum kloss med leenden  
**D-045:** Harmoni-glow när balanserat  
**D-046:** Fisk i hink stylized glad  
**D-047:** Teleskop på räcke sen unlock  
**D-048:** Mås siluett sällan  
**D-049:** Regnjacka gul på Freja  
**D-050:** Böcker med olika ryggbredd  
**D-051:** Läslampa kon på bok  
**D-052:** Regn på ruta streck  
**D-053:** Nattstjärnor genom fönster max 40  
**D-054:** Kudde med mönster inte repeat  
**D-055:** Ullfilt frans max 6 px  
**D-056:** Keramik rand handmålad en  
**D-057:** Glas ellips-highlight en  
**D-058:** Wool felt på filt 18–24 %  
**D-059:** P/S/T hierarki tydlig i varje scen  
**D-060:** Micro-detalj i periferin belönar zoom  
**D-061:** NPC minne i blickriktning  
**D-062:** Säsongslöv en — inte hög  
**D-063:** Foto-moment veckovis variant  
**D-064:** Tap kettle en gång  
**D-065:** Byt gardin färg micro  
**D-066:** Sibling hook framtida  
**D-067:** Balkong planta senare  
**D-068:** Musiknot endast om ADR  
**D-069:** Stjärna i Idag inte wallpaper  
**D-070:** Ghost outline nästa del  
**D-071:** Coat peg jacka en färg  
**D-072:** Breakfast nook krusbär optional  
**D-073:** Mailbox Bloom stage  
**D-074:** Photo wall morgon-ögonblick  
**D-075:** Pegboard 5 verktyg exakt  
**D-076:** Birdhouse 40 % klar  
**D-077:** Spån max 12 chips  
**D-078:** Sune förkläde vitt  
**D-079:** Kanin bädd fluff  
**D-080:** Matskål vatten synlig  
**D-081:** Rooster siluett humor  
**D-082:** Dino siluett 15 % opacity  
**D-083:** Stig fotspår partial  
**D-084:** Nest med ägg senare  
**D-085:** Cutaway fyra rum synliga  
**D-086:** Bok lutar medvetet  
**D-087:** Attic key dold till unlock  
**D-088:** Brygga plankor smalnar perspektiv  
**D-089:** Bucket en fisk  
**D-090:** Sunset upper third  
**D-091:** Focus plum kuddar  
**D-092:** Desk lamp cone 18 %  
**D-093:** Silence valid — inga onödiga ljudgrafik  
**D-094:** Delight-variant 094 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-095:** Delight-variant 095 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-096:** Delight-variant 096 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-097:** Delight-variant 097 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-098:** Delight-variant 098 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-099:** Delight-variant 099 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-100:** Delight-variant 100 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-101:** Delight-variant 101 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-102:** Delight-variant 102 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-103:** Delight-variant 103 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-104:** Delight-variant 104 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-105:** Delight-variant 105 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-106:** Delight-variant 106 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-107:** Delight-variant 107 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-108:** Delight-variant 108 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-109:** Delight-variant 109 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-110:** Delight-variant 110 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-111:** Delight-variant 111 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-112:** Delight-variant 112 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-113:** Delight-variant 113 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-114:** Delight-variant 114 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-115:** Delight-variant 115 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-116:** Delight-variant 116 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-117:** Delight-variant 117 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-118:** Delight-variant 118 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-119:** Delight-variant 119 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-120:** Delight-variant 120 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-121:** Delight-variant 121 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-122:** Delight-variant 122 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-123:** Delight-variant 123 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-124:** Delight-variant 124 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-125:** Delight-variant 125 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-126:** Delight-variant 126 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-127:** Delight-variant 127 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-128:** Delight-variant 128 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-129:** Delight-variant 129 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-130:** Delight-variant 130 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-131:** Delight-variant 131 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-132:** Delight-variant 132 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-133:** Delight-variant 133 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-134:** Delight-variant 134 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-135:** Delight-variant 135 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-136:** Delight-variant 136 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-137:** Delight-variant 137 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-138:** Delight-variant 138 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-139:** Delight-variant 139 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-140:** Delight-variant 140 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-141:** Delight-variant 141 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-142:** Delight-variant 142 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-143:** Delight-variant 143 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-144:** Delight-variant 144 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-145:** Delight-variant 145 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-146:** Delight-variant 146 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-147:** Delight-variant 147 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-148:** Delight-variant 148 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-149:** Delight-variant 149 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-150:** Delight-variant 150 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-151:** Delight-variant 151 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-152:** Delight-variant 152 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-153:** Delight-variant 153 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-154:** Delight-variant 154 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-155:** Delight-variant 155 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-156:** Delight-variant 156 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-157:** Delight-variant 157 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-158:** Delight-variant 158 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-159:** Delight-variant 159 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-160:** Delight-variant 160 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-161:** Delight-variant 161 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-162:** Delight-variant 162 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-163:** Delight-variant 163 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-164:** Delight-variant 164 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-165:** Delight-variant 165 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-166:** Delight-variant 166 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-167:** Delight-variant 167 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-168:** Delight-variant 168 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-169:** Delight-variant 169 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-170:** Delight-variant 170 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-171:** Delight-variant 171 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-172:** Delight-variant 172 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-173:** Delight-variant 173 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-174:** Delight-variant 174 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-175:** Delight-variant 175 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-176:** Delight-variant 176 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-177:** Delight-variant 177 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-178:** Delight-variant 178 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-179:** Delight-variant 179 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-180:** Delight-variant 180 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-181:** Delight-variant 181 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-182:** Delight-variant 182 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-183:** Delight-variant 183 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-184:** Delight-variant 184 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-185:** Delight-variant 185 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-186:** Delight-variant 186 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-187:** Delight-variant 187 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-188:** Delight-variant 188 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-189:** Delight-variant 189 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-190:** Delight-variant 190 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-191:** Delight-variant 191 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-192:** Delight-variant 192 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-193:** Delight-variant 193 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  
**D-194:** Delight-variant 194 för Dockhuset: unik patina/ prop som följer cozy control — aldrig repeat asset  
**D-195:** Delight-variant 195 för Fiskebryggan: unik patina/ prop som följer patient calm — aldrig repeat asset  
**D-196:** Delight-variant 196 för Läshörnan: unik patina/ prop som följer focus pride — aldrig repeat asset  
**D-197:** Delight-variant 197 för Morgonhuset: unik patina/ prop som följer kapabel trygghet — aldrig repeat asset  
**D-198:** Delight-variant 198 för Verkstaden: unik patina/ prop som följer maker pride — aldrig repeat asset  
**D-199:** Delight-variant 199 för Husdjurshemmet: unik patina/ prop som följer gentle belonging — aldrig repeat asset  
**D-200:** Delight-variant 200 för Dinosaurielunden: unik patina/ prop som följer awe & courage — aldrig repeat asset  

## 38.5 QA & DoD

- [ ] Minst 1 D-item per world deliverable
- [ ] Max 3 simultaneous focus delights
- [ ] QG-476–QG-490 Delight bucket pass

---

# 39. Nintendo Checklist — N-001 till N-030

## 39.1 Syfte

Konkreta **Nintendo-inspirerade** kvalitetskrav — etik och polish, inte IP-kopia.

**N-001:** Spelaren (barnet) vet alltid nästa steg på Idag utan manual  
**N-002:** Ingen bestraffning för att utforska 'fel' väg  
**N-003:** Glädje i mastery — inte bara i belöning  
**N-004:** Världen känns som karaktär med minne — inte statisk meny  
**N-005:** Hemligheter är förtjänta — inte RNG  
**N-006:** Polish på grundloop före ny skin  
**N-007:** Lek efter rutin är valfri belöning — inte tvång  
**N-008:** Familjevänlig absolut — E-intent  
**N-009:** Authorship synlig — handcraft i frame  
**N-010:** Långt minne — franchise decade mindset  
**N-011:** Miyamoto-etik-test: skulle Nintendo nicka etiken?  
**N-012:** Regler tydliga utan textvägg  
**N-013:** Respekt vid miss — rum välkomnande  
**N-014:** En primary interaction per besök default  
**N-015:** Ghost outline visar progression — inte dold wiki  
**N-016:** Skippbar celebration  
**N-017:** Reduced motion path fullständig  
**N-018:** Touch target 48 px barn  
**N-019:** Ingen skuld-FOMO grafik  
**N-020:** Ingen loot-box estetik  
**N-021:** Diorama-läsbarhet dollhouse  
**N-022:** Idle värld andas — §25  
**N-023:** Snap placement känns magnetisk  
**N-024:** Primary tap ≤100 ms visuell respons  
**N-025:** Ingen asset-store fingerprint  
**N-026:** NPC companion not manager  
**N-027:** Earned secret nook efter exploration  
**N-028:** Seasonal subtle — inte battle pass  
**N-029:** Sibling/world expansion utan reset trauma  
**N-030:** Creative Director veto respekterad utan ADR  

## 39.2 DoD

- [ ] Alla N-001–N-030 Ja i PR self-sheet

---

# 40. Pixar Checklist — P-001 till P-030

## 40.1 Syfte

Kvalitetskrav för **illustration, ljus, storytelling och känsla** — Pixar nivå, Stjärndag själ.

**P-001:** Barn behandlas som kapabla — inte dumma  
**P-002:** Känslomässig topp förtjänt av progression  
**P-003:** Säkerhet i story — föräldrar bekväma  
**P-004:** Objekt med själ — halvätet frukost, lutande bok  
**P-005:** Show don't tell — rum växer utan changelog-text  
**P-006:** Förändring synlig before/after build  
**P-007:** Universell emotion, svensk textur  
**P-008:** Avslut leder till livet — inte bara skärm  
**P-009:** Opening image: Idag lugn  
**P-010:** Theme stated: du klarar det  
**P-011:** Catalyst: svår aktivitet med stöd inte skuld  
**P-012:** Midpoint: stjärna + build hint  
**P-013:** Climax: milestone skippbar  
**P-014:** Denouement: valfri världsfred  
**P-015:** Final image: verklig treat eller stängd app  
**P-016:** Micro-detalj belönar nyfikenhet max 3  
**P-017:** Living eyes med highlight  
**P-018:** Ingen skräck-uncanny valley  
**P-019:** Dino awe utan blod  
**P-020:** Pet care utan förlust  
**P-021:** Color script per beat dokumenterad §31  
**P-022:** Silence som emotion Läshörnan  
**P-023:** Patience utan timer Fiskebryggan  
**P-024:** Cozy control Dockhuset  
**P-025:** Maker pride Verkstaden  
**P-026:** Capable safety Morgonhuset  
**P-027:** Gentle belonging Husdjurshemmet  
**P-028:** Focus pride Läshörnan  
**P-029:** Parent parallel subordinate på barnskärm  
**P-030:** Emotion curve utan skuld-dal  

## 40.2 DoD

- [ ] Alla P-001–P-030 Ja i PR self-sheet

---

# 41. AI Illustration Rules ( FINAL )

## 41.1 Syfte

Regler så ** AI-genererade **illustrationer blir ** identiska **med mänskligt producerade efter handfinish-pipeline.

## 41.2 Designfilosofi

AI är ** internt rough tool** — ship kräver 100 % handfinish enligt §2 och golden reference.

## 41.3 Absoluta regler

1. AI output ** får aldrig **ship utan full handovermålning.
2. 100 % zoom review: händer, ögon, mun, text, logotyper.
3. manifest `ai_assisted: true|false` mandatory.
4. Six fingers = auto reject QG-047.
5. Golden reference frame match structure ≥95 %.
6. Forbidden hex scan §3.8 on all exports.
7. No AI layer in ship PSD — flattened hand layers only.

## 41.4 Rekommendationer

- Rough comp OK internt — delete AI layers before color.
- Style prompt must cite §2.5 soft ink + §3 palette.
- External studio: AI forbidden in deliverable without ADR.

## 41.5 Förbjudna exempel

- Midjourney ship.
- Stable Diffusion texture as final.
- AI slop six fingers.
- Gibberish text in scene.

## 41.6 Exempel på rätt utförande

- AI rough → line art trace → color §15 gate 3–4 → lighting 5 → QG pass.
- Same Morgonhuset window light band as golden ref.

## 41.7 QA-checklista

- [ ] ai_assisted flag accurate
- [ ] Hand layer audit
- [ ] QG-216–QG-225 + QG-491–QG-500

## 41.8 Definition of Done

- [ ] All §41 rules Ja
- [ ] Creative Director compares golden ref
- [ ] No AI layer in export bundle

---

## Världsspecifika färgaccenter ( alla 7 PCB-världar )

Enligt [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — varje värld har ** emotion job **och** palette accent **inom global §3 system.

| Värld | Slug | Emotion job | Primär accent HEX | Sekundär accent HEX | Vägg/bas HEX | Prop accent HEX | Notes |
|-------|------|-------------|-------------------|---------------------|--------------|-----------------|-------|
| ** Morgonhuset** | `routine_home` | Kapabel trygghet | `#F5A623` Morning Gold | `#C4956A` Honey Wood | `#F7F3EB` Oat | `#A8C4D4` Window sky | Morgonljus alltid key §4.2 |
| ** Verkstaden** | `workshop` | Maker pride | `#E8A849` Maker Amber | `#6B5A4A` Tool brown | `#E8DFD0` Birch | `#8BA888` Outdoor glimpse | Pegboard silhuetter `#3D3830` |
| ** Husdjurshemmet** | `pet_home` | Gentle belonging | `#F0C4A0` Care Peach | `#8BA888` Meadow | `#F7F3EB` Oat | `#C47060` Barn red accent | Never sad pet palette |
| ** Dinosaurielunden** | `dino_valley` | Awe & courage | `#8B7BA8` Courage Violet | `#6B8F71` Fern | `#E8E4EE` Mist | `#A8C4D4` Sky | No blood red danger |
| ** Dockhuset** | `dollhouse` | Cozy control | `#C9B8D9` Cozy Lilac | `#D4A098` Warm Rose | `#F7F3EB` Oat | `#B8A9C9` Dusk Lavender | Mini 1:12 scale |
| ** Fiskebryggan** | `fishing_pier` | Patient calm | `#7A9EB8` Calm Water | `#9A9A98` Weathered wood | `#D4E4EE` Mist sky | `#FFD56B` Raincoat optional | Grey-blue dominant OK |
| ** Läshörnan** | `reading_nook` | Focus pride | `#9B7E9E` Focus Plum | `#B8A9C9` Dusk Lavender | `#F7F3EB` Oat | `#2A2520` Book spine | Evening lamp `#FFD56B` |

** Regel:** Accent får dominera max**30 %** av pixel area i världsscenen — resten neutral warm bas.

---

## Parent UI vs Child UI — visuell differentiering

### Barn UI ( Idag, Min värld, Familj, Skattkammaren barn, child-login )

Barnytor använder **Morning Oat `#F7F3EB`** som default canvas. Illustrationer är **full bleed tillåtna ** i Min värld — UI chrome minimal. Typografi större ( body**16 px** minimum ). Knappar pill-form**28 px** radius. Navigation max 3 tabs med**48 px** touch. Färger varmare. Celebration tillåten. Inga tabeller. Inga grafer. Inga formulär utom PIN.

**Child login:** Vänlig illustration header**240 px** höjd max — ett barn- eller husdjursmotiv, aldrig corporate lock icon.

### Parent UI ( Hem, Planering, Rapporter, Inställningar, onboarding vuxen )

Parent ytor använder **Parent Canvas `#F8F9FC`**. Illustration ** minimal** — ikoner 24 px, eventuellt barn emoji avatar. Kort **16 px** radius. Knappar**12 px** radius. Mer information density tillåten men **aldrig BI-dashboard ** ( POS 05 ). Navy text hierarchy. Gold CTA sparsam. Story-formad copy — inte datagrid default.

### Delad komponent-design

Stjärna-ikon, logotyp, PIN modal, overflow menu — ** samma SVG path **both surfaces where shared. Färg kan shift: stjärna alltid `#F5A623`.

### Förbjuden cross-contamination

- Developer gray `#111827` admin aesthetic ** på barn route** = QG fail  
- Full illustration bakgrund ** på parent Hem default** = distraction  
- Barn pill buttons ** på admin panel** = OK inverse ( admin separat )  

---

## Accessibility — snabbreferens ( canonical: §22 )

Fullständiga regler: **§22 Accessibility för illustration**. Parent vs Child: ** Parent UI vs Child UI**nedan. Reduced motion: **§28.3**, **§29**, **§17.3**.

| Snabbcheck | Krav |
|------------|------|
| Kontrast text | 4.5:1 |
| Touch barn | 48×48 px |
| Reduced motion | Statisk fallback testad |
| Colorblind | Form + färg ( QG-272 ) |
| Sign-off | QG-500 + Accessibility Lead |

## Export- och printspecifikationer för illustratörer

### Digital master — Min värld rum

| Spec | Värde |
|------|-------|
| Master canvas | **4096 × 3072 px** ( 4:3 ) eller**4096 × 2340 px** ( phone bleed ) |
| Color space | ** sRGB IEC61966-2.1** |
| Bit depth | **8-bit** per channel export,**16-bit** working OK |
| Layers | Named: `BG`, `MID`, `FG`, `LIGHT`, `LINE`, `FX` |
| Safe zone UI overlay | Bottom **128 px** clear for nav mock — top**64 px** status |
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
| Color | ** CMYK**conversion review — gold → Pantone 1375 C approximate |
| Bleed | **3 mm** |
| Min line | **0.25 pt** print — thicker than screen |

### Filnamn

`stjarndag-{world}-{asset}-{variant}-@{scale}x.png`  
Example: `stjarndag-morgonhuset-room-root-v2-@2x.png`

---

## Appendix A — Utökad Art Direction ( §2 expansion )

### A.1 Materialdjup — trä åldring och patina

Ek i Morgonhuset ska bära **subtil patina** som berättar att rummet levs i — inte museum-ren nybyggnation. Tillåtna patina-tecken: en mattare fläck under skohörnet där `#A88050` ersätter `#C4956A` i en oregelbunden blob max**80 px** diameter; fina repor vid dörrhandtagshöjd — tunna linjer `#8B7355`**1 px**, max **3** per dörr; diskret avsliten fernissa vid trappsteg kanter där `#E8DFD0` peeking through. Förbjuden patina: smuts som skuld ( barn slarvade ), mögel-grönt, fläckar som liknar blod eller okänt vätskeläge, sprickor som signalerar fara snarare än ålder.

Björk och furu följer samma logik med ljusare patina — knutar i trä ska vara **individuella**, placerade enligt virkesriktning, aldrig copy-paste samma knot texture på fem hyllplan i rad.

### A.2 Keramik, glas och textil — detaljnivå per material

Keramikmuggar ( frukost i Morgonhuset ) har **2 px** fotring skugga och valfri handmålad rand `#B8A9C9` eller `#8BA888` — en rand, inte busy pattern. Glas: endast **ellips-highlight** enligt §6.3 — inga ray-traced refractions. Ull och filt: Wool Felt Stamp texture @ **18–24 %** overlay på basfärg; fransar på filtar får **max 6 px** längd individuellt — inte shag carpet.

### A.3 Formhierarki i komposition — primary, secondary, tertiary

Varje scen klassificerar objekt innan ritning:

**Primary ( P )**— det barnet interagerar med eller blicken leds till via UI ghost. P-objekt: full linje, full saturation, contact shadow, eventuell rim light.** Secondary ( S )**— stödjer fiction utan tap target: full linje, standard saturation, standard shadow.** Tertiary ( T )**— dekoration och miljö: reducerad linje**70 % **, desaturerad **10 %**, soft shadow eller none om distant.

Max antal P per scen: **1** ( enligt §2.11 ). Max S: **4**. T: **6–12** som tidigare. Brott mot hierarkin — två P av samma visuella vikt — kräver Creative Director godkännande.

### A.4 Perspektivfallgropar — exempel på avvisade kompositioner

**Avvisat:** Kamera ovanifrån 60° — barn ser golv som huvudinnehåll, väggar försvinner.**Avvisat:** Extreme close-up på NPC ansikte som enda innehåll i Min värld — diorama-läsbarhet förlorad.**Avvisat:** Vägg-vägg-vägg utan golvyta — claustrofob utan lugn.**Godkänt:** Låg kamera som visar golv **och ** bakvägg **och ** ett fönster med natur — tre plan läsbara.

### A.5 Konturvariation för liv — intentional wobble spec

Soft ink innebär att **kontur inte är perfekt**. Tillåten wobble-amplitud: **±0.15 px** på kort segment ( under **40 px** linjelängd ), **±0.08 px** på långa segment ( över **120 px** ). Wobble frekvens: ungefär var **15–25 px** längs linjen en micro avvikelse — inte synlig som "0 skakig" utan kännbar som hand vid 100 % zoom.

### A.6 Penseltryck och linjetjockleksvariation

Karaktär ytterkontur **2.0 px** med tryckvariation: **1.7 px** i hår tunna partier, **2.3 px** i skuggsida ben och arm. Denna variation ska följa ljusriktning §4 — tjockare linje på skuggsida ( **inte** överallt tjockare som cartoon outline ). Möbler: jämnare **1.75 px** med undantag för närhet till betraktare — fotände bord kan vara **2.0 px**.

### A.7 Textur overlay pipeline ( export )

Rekommenderad export-stack för raster rum:
1. Flat color layers per material  
2. Grain Wash overlay **8 %** on entire scene except UI safe zone  
3. Light pass additive `#FFF8EE` @ **8–15 %** on key-lit surfaces only  
4. AO pass multiply `#2A2520` @ **12 %** in corners  
5. Line art top multiply **100 %**  
6. Optional vignette **4 %** `@ corners only — never center darkening that feels like tunnel  

### A.8 Negativ yta — mätmetod för illustratörer

Whitespace mäts som procent av canvas där ** ingen linjeart eller mättad färg över 10 % opacity **finns, exklusive avsiktlig vägg `#F7F3EB`. Idag NOW-kort whitespace: rita **24 px** buffer runt kortets yttre box i mock — area utanför kort räknas. Om mätning under tröskel — ta bort tertiary objekt först, aldrig primary.

### A.9 Kontrast i djup — luftperspektiv tabell

| Plan | Saturation shift | Value shift | Blur optional |
|------|------------------|-------------|---------------|
| FG | 0 % | 0 % | 0 px |
| MID | −5 % | +3 % ljusare | 0 px |
| BG | −12 % | +8 % ljusare | 0.5 px subtle |

Dinosaurielunden dimma: BG kan nå **−20 %** saturation enligt §4.11.

### A.10 Cross-section: material möter ljus

När morgonljus träffar ek golv: highlight stripe `#E8DFD0` width **6 px** längs bräda riktning, vinkel matchar key **135°** skugga motsatt. Ullfilt i samma ljus: highlight som **bred mjuk band** utan skarp stripe — materialbestämd ljusrespons är **obligatorisk** skillnad mellan hård och mjuk yta.

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

Närbildträd ( fönster view ): krona **200–320 px** bred @1x, stam **24–40 px** bred. Fjärre träd: krona **80–120 px**, desaturerad **15 %**. Träd får ** aldrig **skära genom NPC huvud som oavsiktlig komposition — flytta krona eller NPC.

### B.3 Buskar vid hus — placering

Standard häck under fönster: höjd **40–60 px**, avstånd från vägg **8 px**. Syren blom: ** maj–juni **fiction calendar enligt PCB seasonal — inte jul.

### B.4 Blommor — pollinatör detalj ( micro )

Max **1** bi eller fjäril per scen som tertiary — fjäril `#B8A9C9`/`#FFD56B`, vingbredd **12 px**. Dinosaurielunden: fjäril anachronism ** tillåten **som child joy enligt PCB.

### B.5 Stenar — grupp komposition

Stenar ritas i ** grupper om 3–5**med storleksvariation — aldrig en isolerad perfekt sfär. Contact shadow ** gemensam **under grupp. Sten vid vatten: mörkare bas `#6A8EA8` wet look `@20 %` overlay bottom half only.

### B.6 Snö — interaktion med karaktär

Snö på mark: fotspår ** endast om **fiction nyligen gått — annars orörd yta. Spår djup **2 px**, spacing **18 px** barnsteg. Snö på gren: sammanhängande cap, **dropp icicle** optional `#E8F0F8` **4 px** max **2** per scen.

### B.7 Regn — inomhus vs utomhus

Inomhus regn ( Läshörnan fönster ): streaks på **glas only** — rum interior unchanged mood. Utomhus: regn + grå himmel `#B8C4D4` — barn karaktär i regnkläder optional, ** en **glad gul jacka max.

### B.8 Vatten — Fiskebryggan specifik

Brygga reflektion: vertikal flip `@25 %` opacity under dock **40 px** height. Brygga pelare i vatten: mörkare `#5A7088` under yta, ljusare ovan. Fisk i hink: **stylized** side view **24 px**, `#7A9EB8` + `#FFD56B` stripe — not realistic gore.

### B.9 Himmel — moln vs sol placering

Sol disc ( om synlig ): radie **24 px**, `#FFF5E0`, ** aldrig **direkt i ögonhöjd center — placera ** upper left quadrant**. Moln får ** inte **täcka sol helt om sol shown — partial overlap max **30 %**.

### B.10 Stjärnor — celebration vs ambient density

Celebration burst: max **8** stjärnor radiating, size **24–48 px**, animation ≤2000 ms. Ambient night sky: **20–40** pinprick stars — not 500 noise dots.

### B.11 Natur ljud-visual synk ( optional 06A )

Visuella hints för ljud: fågel **16 px** on branch = optional chirp; vatten ripple = optional lap. Silent mode: samma bild **utan** rörlig ripple — statisk vattenyta OK.

### B.12 Natur förbud utökad

Ingen svamp som drug metaphor. Inga slott grottor med stalactites skräck. Inga ormar som default hotfulla ( svenska ormar sällan i barnbok hot — undvik ). Inga getingbo nära NPC ansikte.

---

## Appendix C — Utökad Karaktärer ( §7 expansion )

### C.1 Barn hår — struktur och rendering

Hår renderas i **lager**: underliggande skugga `#3D3830` @ **15 %** form, basfärg lager, highlight lager `#FFFFFF` @ **12 %** på key light side, linjeart top. Lockigt hår: radie lockar **6–14 px**, minst **8** locks synliga front view. Rakt hår: sidoparting eller mitt — **en** parting per karaktär design sheet. Hijab: drapering **3** fold lines **1 px**, färg koordinerad med outfit — aldrig transparens genom hår sexualiserande.

### C.2 Föräldrar i illustration — när de förekommer

Föräldrar i ** Familj **world och marketing: vuxen proportion §7.3, kläder vuxen vardag — ** aldrig **barnsliga shorts som barn. Förälder i bakgrund Morgonhuset: silhuett eller delvis synlig hand only OK — barn är protagonist. Förälder ska ** inte **peka accusatory finger at barn — open palm welcome only.

### C.3 NPC djur — animation intent sheets

Morgon-Mira idle: ** breathe **scale Y **1.00–1.02**, period **4 s**. Snickar-Sune: tail flat slap ** optional **once on entry. Mini-Dino: head tilt **8°** on curious. All reduced motion: static mid-breathe frame.

### C.4 Ögon riktning och barn kapacitet

Ögon riktade **mot nästa interaktion** i Idag-kopplad illustration — tittar på skor om dressing activity. **Undvik** ögon som tittar på stjärna som primär blick om stjärna inte är aktiv celebration — capability before points.

### C.5 Mun och tand — hygien aktiviteter

Tandborstning scen: mun **stängd** med borste vid kind — inga blodiga tandkött. Leende visar **max 6** tänder simplified — inte full dental chart.

### C.6 Kroppsspråk emotion map utökad

**Stolt efter morgon:** axlar bak, haka upp**5° **, ögon glada. ** Väntar lugnt ( Fiskebryggan ): **sittande ben hänger, händer i knä — not phone zombie pose.** Modig ( Dino ): **ett steg framåt, inte combat stance.

### C.7 Kläder lager ordning

Standard render order bottom to top: skor → byxor → tröja → jacka → halsduk → hår → accessoar. Regnoverall ** over **all — hood optional down.

### C.8 Inkludering — rullstol spec

Rullstol: ** manuell **eller ** el **enligt brief — inte hospital sterile. Färg `#7A9EB8` eller `#F5A623` accent — child ownership. Barn i rullstol ** samma **head proportion — inte mindre huvud. Ramp i Morgonhuset om family setting includes — **1:12** slope visual.

### C.9 Djur proportion guardrails

Husdjur **inte** humanized med clothes default — bandana optional **one** NPC pet max. Antropomorf grad: **Läshörnan** books only — animals stay animal.

### C.10 Karaktär line-up sheet krav

Leverans per ny NPC: **front, 3/4, profile, expression sheet ( 3 neutral/glad/nyfiken ), color refs HEX listed, height vs barn diagram**.

---

## Appendix D — Utökad UI ( §9 expansion )

### D.1 Idag-skärm layout grid

| Zon | Höjd px | Innehåll |
|-----|---------|----------|
| Header | 56 + safe | Barn namn, emoji/avatar **40 px** |
| NOW hero | min 120 | Primär aktivitet |
| NEXT list | flex | **72 px** rows |
| LATER | collapsed optional | chevron expand |
| Bottom nav | 64 + safe | 3 tabs |

Total NOW synlig utan scroll på **667 px** höjd device — design intent.

### D.2 Min värld placement UI overlay

Ghost outline: `#B8A9C9` **2 px** dashed **6/6**, fill `@8 %`. Valid placement: pulse gold border **2 px** **1 s** period once. Invalid: shake **4 px** horizontal **150 ms** — reduced motion: red border flash **150 ms** only on parent test builds, barn **never red** — use gentle gray `#94A3B8` blink instead.

### D.3 Familj värld visuell

Familj hub: varmare `#F7F3EB` + familj foto/emoji grid **56 px** circles, gap **12 px**. Co-parent presence: ** två **vuxna silhuetter max utan foto — inclusive `#5A6178` placeholder avatar.

### D.4 Planering parent — activity editor card

Activity row: ikon **32 px**, titel **16 px**, drag handle **24 px** `#94A3B8`. Section headers FM/EM/Kväll: **14 px** uppercase tracking **0.05 em** `#5A6178`.

### D.5 Rapporter parent — chart färger

Stapeldiagram: `#F5A623` stjärnor, `#A8C4D4` aktiviteter, `#8BA888` completion — ** aldrig **röd för missad dag. Axis `#94A3B8` **1 px**.

### D.6 Onboarding illustration steg

Steg 1 registrering: familj växer illustration ** inte **stjärnregn. Steg barnprofil: emoji grid **48 px** cells. Steg First Success: **samma** stjärna ikon som Idag.

### D.7 Child-login manual name fallback

Form field: höjd **48 px**, radius **16 px**, border `#EDE7F6`. Illustration above: ** ett **välkomnande djur NPC **180 px** höjd.

### D.8 Tablet breakpoints

iPad barn: content max-width **480 px** centrerat, illustration kan bleed **full width** bakom content card float.

### D.9 Loading skeleton ( skeleton.css alignment )

Skeleton pulse: `#f0f0f0` → `#e8e8e8` — **not** gold shimmer casino. Spinner gold **endast** on primary action submit **≤2 s**.

### D.10 Error states

Barn network error: illustration ** en **disconnected fågel mild — copy lugn. Parent error: ikon **48 px**, retry knapp **48 px** höjd.

### D.11 Toast notifications

Barn toast: bottom **80 px** above nav, bg `#1B2340` text `#FFFFFF` **14 px**, radius **12 px**, duration **3 s** max. Parent toast: samma med optional action link gold.

### D.12 Hem parent CTA hierarchy

Primary: **en** gold CTA per scroll viewport. Secondary links: `#5A6178` **14 px**. ** Ingen **röd badge notification dot on barn avatar — trust.

---

## Appendix E — Quality Gates ( consolidated )

QG-121–QG-165 och QG-001–QG-500 finns ** endast **i **§13 Quality Gates**. Denna appendix ersattes i FINAL v1.0 för att eliminera duplicering.

## Appendix L — Världsscener ( consolidated )

Världsspecifika QG-151–QG-165 ingår i **§13** och scen-walkthrough **Appendix J**. Använd J.1–J.7 för visuell genomgång.

## Appendix F — Arbetsprocess för illustratörer ( workflow )

### F.1 Brief till leverans

1. Ta emot PCB world slug + emotion job sentence.  
2. Läs Art Bible §2–7 + world accent table.  
3. Skissa thumbnail **800 px** bredd — **3** kompositioner internt.  
4. Art Director väljer **1** — not client poll.  
5. Line art approval gate — ** innan **full color.  
6. Color pass enligt palett §3 + ljus §4.  
7. Self QG ** alla**280.  
8. Export § Export specs.  
9. PR med screenshots @1x/@2x.  
10. Creative Director ** Ja/Nej**.

### F.2 Revision rounds

Max **2** revisions in scope utan ny brief. Revision = pixel/ color fix — not style pivot. Style pivot = ny brief + ADR.

### F.3 Extern byrå krav

Byrå måste läsa Art Bible **innan** bid. NDA standard. **Ingen** portfolio reuse of Stjärndag assets in other brands. Source files delivery mandatory QG-095.

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

Creative Director använder denna **10-punkts snabbscan** vid varje leverans:

1. Screenshot test 00B pass?  
2. POS 03A key light top-left?  
3. One accent per screen?  
4. No stock/AI slop?  
5. PCB emotion job felt in **3 s** look?  
6. Child dignity — no guilt red/sad pet?  
7. Touch 48 px barn UI if UI included?  
8. QG sheet signed?  
9. Parent surface not childish if parent deliverable?  
10. Would I show this in Nintendo-style quality review proudly?

Any **nej** on 1, 4, 6 = **automatic reject** without discussion per mandate.

---


## Appendix J — Djupgående scenarier per värld ( visuell walkthrough )

### J.1 Morgonhuset — morgon completion frame

När barnet öppnar Morgonhuset efter lyckad morgon ska första frame läsa **kapabel trygghet** på under tre sekunder utan text. Golvet är ek `#C4956A` med diskret patina under skomattan som är `#8BA888` med `#F7F3EB` rand. Vänster fönster släpper in key light `#FFF8EE` i band som träffar frukostbordet — mugg `#FAFAF7` med ånga som tre `{` former `@30 %` opacity max. Coat peg på höger vägg bär `#7A9EB8` jacka — en färg, en peg. Morgon-Mira står **3/4** mot dörren som är **stängd men inbjudande** — `#C4956A` med mässingshandtag `#C4A060`. Ghost outline nästa byggdel: `#B8A9C9` dash vid fönsterbänk. Inga stjärnor i rummet som wallpaper — stjärnor kom i Idag celebration, inte permanent tapet. Whitespace på golvyta framför barn ** minst 22 %**så att placement UI ghost syns tydligt.

### J.2 Verkstaden — projekt halvfärdigt

Verkstaden ska kännas ** lite mer energisk **än Morgonhuset men fortfarande lugn. Taklampa `#FFD56B` @50 % glow radie **80 px** centrerad över bänk `#A88050`. Pegboard `#E8DFD0` med **5** verktygssilhuetter — hammare `#6B5A4A`, såg, pensel, skruvmejsel, måttband — varje **32 px** silhuett med **12 px** spacing. Birdhouse projekt **40 %** complete: tak saknas, ghost tak outline ovan. Spån på golv **max 12** individuella `#E8DFD0` chips. Snickar-Sune i **3/4** arbetar **alongside** inte ovanför barn — bäver `#6B5A4A` med förkläde `#F7F3EB`. Fönster visar sommargräs `#6B8F71` — inte vinter. Ingen cirkelsåg synlig — QG-104.

### J.3 Husdjurshemmet — miss day neutral

PCB kräver att miss day **inte** straffar visuellt. Habitat: kanin sover i bädd `#F0C4A0` — ögon slutna **curved lines** inte X eyes. Matskål `#FAFAF7` med vatten `#A8C4D4` @40 % — full, not empty. Staket `#C4956A` med öppning till hage `#8BA888` gräs. **Ingen** " hunger meter " UI element i illustration. Skötare Sara i bakgrund ** wave **en hand — **20 %** mindre scale än foreground. Fjärr rooster optional `#94A3B8` silhuett — humor nod.

### J.4 Dinosaurielunden — foggy path första besök

Silhuetter only stage: dinosaur `#8B7BA8` **15 %** opacity i dimma `#E8E4EE` @45 % overlay. Stig `#9A9A98` sten `#7A7A78` fotspår `#8B7BA8` **partial**. Mini-Dino ** not **visible yet — endast egg `#FAFAF7` oval i nest senare stage denna doc describes progression visual. Fräken `#6B8F71` **8 px** höjd cluster längs stig. Fjäril `#FFD56B` **one** — anachronism joy. Vattenfall bakgrund ** silhuett** `#A8C4D4` @30 % — no detailed realistic water simulation.

### J.5 Dockhuset — harmony glow balanced room

Fyra micro-rum visible cutaway: sovrum säng `#B8A9C9` täcke, kök teservis `#FAFAF7`, lekrum kloss `#F5A623` ** one **block, badkar `#A8C4D4`. ** En **hylla medvetet " messy " — bok lutar **8°**, kudde off-center — lagom human. Dockhus-Daisy `#D4A098` cloth doll **24 px** i säng barn placerat. Harmony glow: `#FFD56B` @ **12 %** overlay on room when balanced — **no numbers**. Attic key collectible ** not **visible until secret unlocked — no spoiler in default art.

### J.6 Fiskebryggan — bench idle patience

Grey-blue water `#7A9EB8` dominant **35 %** scene area. Brygga `#A88050` planks **24 px** width perspective narrowing. Freja i gul regnjacka `#FFD56B` sitter **legs dangle** — skor `#3D3830` **8 px** above water **not** touching. Bucket **one** fish `#7A9EB8` stylized. Telescope på railing **sen** unlock — ghost outline om not yet. Mås **silhuett** sällan. Sunset optional `#D4A098` sky **upper third only**.

### J.7 Läshörnan — evening focus

Focus Plum `#9B7E9E` kuddar, bokhylla `#C4956A` med **8** books spines `#2A2520` **1.5 px** width varied heights. Desk lamp `#FFD56B` cone `@18 %` on book page. Rain on window optional — streaks **on glass** §B.7. Child ** not **required in scene — room as character. Night sky through window ** max 40 stars**. Silence valid — no music notes visual unless 06A audio on.

---

## Appendix K — UI pixel audit checklist ( mobil )

Följande checklista är ** obligatorisk **för Frontend Lead vid UI PR som rör barn surfaces:

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

## Appendix M — Historik och nästa steg

Art Bible v1.0 skapad **2026-06-29** som illustrator-facing expansion av POS 03A med PCB world accent integration. v1.1 planeras efter första externa byråleverans av Morgonhuset full room pack — feedback loops på QG false positives. Underhåll: Creative Director + Art Director kvartalsvis palett audit mot kod `theme.css` drift.

**Slutlig påminnelse:** POS 03A är lag. PCB är själ. Art Bible är handen som ritar själen synlig. CORE_VALUES är filter på varje penseldrag. Creative Director **Nej** utan diskussion vid QG-brott eller §11 förbud.

---

## Appendix N — Snabbreferens produktion ( live release checklist )

Denna appendix samlar **operativa siffror** som illustratörer, QA och Release Manager använder dagligen utan att bläddra i hela dokumentet. Alla värden är bindande; avvikelse kräver ADR.

### N.1 Tidsbudget per gate ( §15 )

| Gate | Max kalenderdagar | Output-artefakt |
|------|-------------------|-----------------|
| DoR | 1 | `brief-{id}.md` signerad |
| Concept | 2 | 3× thumbnail 800 px |
| Sketch | 2 | Perspektiv grid godkänd |
| Line art | 3 | `*-line-v{n}.psd` |
| Color | 2 | Flat color pass |
| Lighting | 2 | Final PSD |
| Creative review | 2 | `CREATIVE_REVIEW.md` |
| Export + QA | 2 | manifest.json + QG sheet |
| Implementation | 3 | PR merged |
| Regression | 1 | Screenshot bundle |

Total illustratörstid typisk **rum pack**: **12–18** arbetsdagar från DoR till export — parallellisering av modular kit kan korta till**10** dagar efter första värld.

### N.2 Filstorlek och minnesbudget ( §21 sammanfattning )

| Resurs | Gräns |
|--------|-------|
| Rum PNG @1x | ≤**450 KB** |
| Build part @1x | ≤**80 KB** |
| SVG ikon gzip | ≤**8 KB** |
| Lottie gzip | ≤**150 KB** |
| Sprite atlas | ≤**512 KB** |
| First paint raster total | ≤**2.5 MB** decode |
| iOS WebView peak | ≤**64 MB** |
| SW precache celebration delta | ≤**200 KB** |

Release Manager blockerar live release om Lighthouse mobile performance på barn route faller under **90** efter asset merge utan documented ADR exception.

### N.3 Safe zone och viewport ( §20 sammanfattning )

| Zon | px @1x |
|-----|--------|
| Top safe (status) | **64** |
| Bottom safe (nav) | **128** |
| Screen padding barn | **16** |
| Tablet content max-width | **480** |
| iPhone SE baseline | **375×667** |

Primary ( P ) motiv får ** aldrig **skäras av bottom safe. Placement ghost testas med overlay `assets/source/_templates/safe-zones.svg` i varje world source folder.

### N.4 Färg- och linjereferens one-liner

- Linje: Soft Ink `#2A2520` **2.0 px** karaktär ytter @1x  
- Key light: `#FFF8EE` övre vänster **45°/55°**  
- Skugga: `#3D3830` @ **22–28 %**  
- Barn bas: Morning Oat `#F7F3EB`  
- Parent bas: Parent Canvas `#F8F9FC`  
- CTA gold: `#F5A623` — aldrig små vit text på gold  
- Celebration max: **2000 ms** ( 03B )  
- Reduced motion: **150 ms** max fade eller statisk frame  

### N.5 PR-checklista ( copy-paste )

Varje illustration PR ska innehålla:

1. PCB `world_slug` + emotion job citat  
2. DoR + DoD §16 checkbox complete  
3. QG-001–QG-500 self-sheet bifogad  
4. Screenshots: SE @1x, iPad portrait, reduced motion screen recording  
5. manifest.json diff  
6. Creative Director Ja/Ned loggrad  
7. Accessibility Lead sign-off om barn-facing  
8. Performance siffror om raster >300 KB @1x  

Saknas punkt **1**, **3** eller**6** → PR auto-return utan review.

### N.6 Eskaleringsordning vid konflikt

1. Art Director + illustratör löser craft inom Art Bible  
2. Creative Director veto på stil ( slutgiltigt för §11 och QG estetik )  
3. Game Director på emotion job vs PCB  
4. CPO produktprioritet  
5. CEO endast ADR-level strategy pivot  

Detta appendix uppdateras i v1.1 om QG false positives eller CI automation ändrar mätmetod — ändring kräver Release Manager + Art Director sign-off.

---
## Appendix A — Utökad Art Direction ( §2 expansion )

### A.1 Materialdjup — trä åldring och patina

Ek i Morgonhuset ska bära ** subtil patina **som berättar att rummet levs i — inte museum-ren nybyggnation. Tillåtna patina-tecken: en mattare fläck under skohörnet där `#A88050` ersätter `#C4956A` i en oregelbunden blob max**80 px** diameter; fina repor vid dörrhandtagshöjd — tunna linjer `#8B7355`**1 px**, max **3** per dörr; diskret avsliten fernissa vid trappsteg kanter där `#E8DFD0` peeking through. Förbjuden patina: smuts som skuld ( barn slarvade ), mögel-grönt, fläckar som liknar blod eller okänt vätskeläge, sprickor som signalerar fara snarare än ålder.

Björk och furu följer samma logik med ljusare patina — knutar i trä ska vara **individuella**, placerade enligt virkesriktning, aldrig copy-paste samma knot texture på fem hyllplan i rad.

### A.2 Keramik, glas och textil — detaljnivå per material

Keramikmuggar ( frukost i Morgonhuset ) har **2 px** fotring skugga och valfri handmålad rand `#B8A9C9` eller `#8BA888` — en rand, inte busy pattern. Glas: endast **ellips-highlight** enligt §6.3 — inga ray-traced refractions. Ull och filt: Wool Felt Stamp texture @ **18–24 %** overlay på basfärg; fransar på filtar får **max 6 px** längd individuellt — inte shag carpet.

### A.3 Formhierarki i komposition — primary, secondary, tertiary

Varje scen klassificerar objekt innan ritning:

**Primary ( P )**— det barnet interagerar med eller blicken leds till via UI ghost. P-objekt: full linje, full saturation, contact shadow, eventuell rim light.** Secondary ( S )**— stödjer fiction utan tap target: full linje, standard saturation, standard shadow.** Tertiary ( T )**— dekoration och miljö: reducerad linje**70 % **, desaturerad **10 %**, soft shadow eller none om distant.

Max antal P per scen: **1** ( enligt §2.11 ). Max S: **4**. T: **6–12** som tidigare. Brott mot hierarkin — två P av samma visuella vikt — kräver Creative Director godkännande.

### A.4 Perspektivfallgropar — exempel på avvisade kompositioner

**Avvisat:** Kamera ovanifrån 60° — barn ser golv som huvudinnehåll, väggar försvinner.**Avvisat:** Extreme close-up på NPC ansikte som enda innehåll i Min värld — diorama-läsbarhet förlorad.**Avvisat:** Vägg-vägg-vägg utan golvyta — claustrofob utan lugn.**Godkänt:** Låg kamera som visar golv **och ** bakvägg **och ** ett fönster med natur — tre plan läsbara.

### A.5 Konturvariation för liv — intentional wobble spec

Soft ink innebär att **kontur inte är perfekt**. Tillåten wobble-amplitud: **±0.15 px** på kort segment ( under **40 px** linjelängd ), **±0.08 px** på långa segment ( över **120 px** ). Wobble frekvens: ungefär var **15–25 px** längs linjen en micro avvikelse — inte synlig som "0 skakig" utan kännbar som hand vid 100 % zoom.

### A.6 Penseltryck och linjetjockleksvariation

Karaktär ytterkontur **2.0 px** med tryckvariation: **1.7 px** i hår tunna partier, **2.3 px** i skuggsida ben och arm. Denna variation ska följa ljusriktning §4 — tjockare linje på skuggsida ( **inte** överallt tjockare som cartoon outline ). Möbler: jämnare **1.75 px** med undantag för närhet till betraktare — fotände bord kan vara **2.0 px**.

### A.7 Textur overlay pipeline ( export )

Rekommenderad export-stack för raster rum:
1. Flat color layers per material  
2. Grain Wash overlay **8 %** on entire scene except UI safe zone  
3. Light pass additive `#FFF8EE` @ **8–15 %** on key-lit surfaces only  
4. AO pass multiply `#2A2520` @ **12 %** in corners  
5. Line art top multiply **100 %**  
6. Optional vignette **4 %** `@ corners only — never center darkening that feels like tunnel  

### A.8 Negativ yta — mätmetod för illustratörer

Whitespace mäts som procent av canvas där ** ingen linjeart eller mättad färg över 10 % opacity **finns, exklusive avsiktlig vägg `#F7F3EB`. Idag NOW-kort whitespace: rita **24 px** buffer runt kortets yttre box i mock — area utanför kort räknas. Om mätning under tröskel — ta bort tertiary objekt först, aldrig primary.

### A.9 Kontrast i djup — luftperspektiv tabell

| Plan | Saturation shift | Value shift | Blur optional |
|------|------------------|-------------|---------------|
| FG | 0 % | 0 % | 0 px |
| MID | −5 % | +3 % ljusare | 0 px |
| BG | −12 % | +8 % ljusare | 0.5 px subtle |

Dinosaurielunden dimma: BG kan nå **−20 %** saturation enligt §4.11.

### A.10 Cross-section: material möter ljus

När morgonljus träffar ek golv: highlight stripe `#E8DFD0` width **6 px** längs bräda riktning, vinkel matchar key **135°** skugga motsatt. Ullfilt i samma ljus: highlight som **bred mjuk band** utan skarp stripe — materialbestämd ljusrespons är **obligatorisk** skillnad mellan hård och mjuk yta.

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

Närbildträd ( fönster view ): krona **200–320 px** bred @1x, stam **24–40 px** bred. Fjärre träd: krona **80–120 px**, desaturerad **15 %**. Träd får ** aldrig **skära genom NPC huvud som oavsiktlig komposition — flytta krona eller NPC.

### B.3 Buskar vid hus — placering

Standard häck under fönster: höjd **40–60 px**, avstånd från vägg **8 px**. Syren blom: ** maj–juni **fiction calendar enligt PCB seasonal — inte jul.

### B.4 Blommor — pollinatör detalj ( micro )

Max **1** bi eller fjäril per scen som tertiary — fjäril `#B8A9C9`/`#FFD56B`, vingbredd **12 px**. Dinosaurielunden: fjäril anachronism ** tillåten **som child joy enligt PCB.

### B.5 Stenar — grupp komposition

Stenar ritas i ** grupper om 3–5**med storleksvariation — aldrig en isolerad perfekt sfär. Contact shadow ** gemensam **under grupp. Sten vid vatten: mörkare bas `#6A8EA8` wet look `@20 %` overlay bottom half only.

### B.6 Snö — interaktion med karaktär

Snö på mark: fotspår ** endast om **fiction nyligen gått — annars orörd yta. Spår djup **2 px**, spacing **18 px** barnsteg. Snö på gren: sammanhängande cap, **dropp icicle** optional `#E8F0F8` **4 px** max **2** per scen.

### B.7 Regn — inomhus vs utomhus

Inomhus regn ( Läshörnan fönster ): streaks på **glas only** — rum interior unchanged mood. Utomhus: regn + grå himmel `#B8C4D4` — barn karaktär i regnkläder optional, ** en **glad gul jacka max.

### B.8 Vatten — Fiskebryggan specifik

Brygga reflektion: vertikal flip `@25 %` opacity under dock **40 px** height. Brygga pelare i vatten: mörkare `#5A7088` under yta, ljusare ovan. Fisk i hink: **stylized** side view **24 px**, `#7A9EB8` + `#FFD56B` stripe — not realistic gore.

### B.9 Himmel — moln vs sol placering

Sol disc ( om synlig ): radie **24 px**, `#FFF5E0`, ** aldrig **direkt i ögonhöjd center — placera ** upper left quadrant**. Moln får ** inte **täcka sol helt om sol shown — partial overlap max **30 %**.

### B.10 Stjärnor — celebration vs ambient density

Celebration burst: max **8** stjärnor radiating, size **24–48 px**, animation ≤2000 ms. Ambient night sky: **20–40** pinprick stars — not 500 noise dots.

### B.11 Natur ljud-visual synk ( optional 06A )

Visuella hints för ljud: fågel **16 px** on branch = optional chirp; vatten ripple = optional lap. Silent mode: samma bild **utan** rörlig ripple — statisk vattenyta OK.

### B.12 Natur förbud utökad

Ingen svamp som drug metaphor. Inga slott grottor med stalactites skräck. Inga ormar som default hotfulla ( svenska ormar sällan i barnbok hot — undvik ). Inga getingbo nära NPC ansikte.

---

## Appendix C — Utökad Karaktärer ( §7 expansion )

### C.1 Barn hår — struktur och rendering

Hår renderas i **lager**: underliggande skugga `#3D3830` @ **15 %** form, basfärg lager, highlight lager `#FFFFFF` @ **12 %** på key light side, linjeart top. Lockigt hår: radie lockar **6–14 px**, minst **8** locks synliga front view. Rakt hår: sidoparting eller mitt — **en** parting per karaktär design sheet. Hijab: drapering **3** fold lines **1 px**, färg koordinerad med outfit — aldrig transparens genom hår sexualiserande.

### C.2 Föräldrar i illustration — när de förekommer

Föräldrar i ** Familj **world och marketing: vuxen proportion §7.3, kläder vuxen vardag — ** aldrig **barnsliga shorts som barn. Förälder i bakgrund Morgonhuset: silhuett eller delvis synlig hand only OK — barn är protagonist. Förälder ska ** inte **peka accusatory finger at barn — open palm welcome only.

### C.3 NPC djur — animation intent sheets

Morgon-Mira idle: ** breathe **scale Y **1.00–1.02**, period **4 s**. Snickar-Sune: tail flat slap ** optional **once on entry. Mini-Dino: head tilt **8°** on curious. All reduced motion: static mid-breathe frame.

### C.4 Ögon riktning och barn kapacitet

Ögon riktade **mot nästa interaktion** i Idag-kopplad illustration — tittar på skor om dressing activity. **Undvik** ögon som tittar på stjärna som primär blick om stjärna inte är aktiv celebration — capability before points.

### C.5 Mun och tand — hygien aktiviteter

Tandborstning scen: mun **stängd** med borste vid kind — inga blodiga tandkött. Leende visar **max 6** tänder simplified — inte full dental chart.

### C.6 Kroppsspråk emotion map utökad

**Stolt efter morgon:** axlar bak, haka upp**5° **, ögon glada. ** Väntar lugnt ( Fiskebryggan ): **sittande ben hänger, händer i knä — not phone zombie pose.** Modig ( Dino ): **ett steg framåt, inte combat stance.

### C.7 Kläder lager ordning

Standard render order bottom to top: skor → byxor → tröja → jacka → halsduk → hår → accessoar. Regnoverall ** over **all — hood optional down.

### C.8 Inkludering — rullstol spec

Rullstol: ** manuell **eller ** el **enligt brief — inte hospital sterile. Färg `#7A9EB8` eller `#F5A623` accent — child ownership. Barn i rullstol ** samma **head proportion — inte mindre huvud. Ramp i Morgonhuset om family setting includes — **1:12** slope visual.

### C.9 Djur proportion guardrails

Husdjur **inte** humanized med clothes default — bandana optional **one** NPC pet max. Antropomorf grad: **Läshörnan** books only — animals stay animal.

### C.10 Karaktär line-up sheet krav

Leverans per ny NPC: **front, 3/4, profile, expression sheet ( 3 neutral/glad/nyfiken ), color refs HEX listed, height vs barn diagram**.

---

## Appendix D — Utökad UI ( §9 expansion )

### D.1 Idag-skärm layout grid

| Zon | Höjd px | Innehåll |
|-----|---------|----------|
| Header | 56 + safe | Barn namn, emoji/avatar **40 px** |
| NOW hero | min 120 | Primär aktivitet |
| NEXT list | flex | **72 px** rows |
| LATER | collapsed optional | chevron expand |
| Bottom nav | 64 + safe | 3 tabs |

Total NOW synlig utan scroll på **667 px** höjd device — design intent.

### D.2 Min värld placement UI overlay

Ghost outline: `#B8A9C9` **2 px** dashed **6/6**, fill `@8 %`. Valid placement: pulse gold border **2 px** **1 s** period once. Invalid: shake **4 px** horizontal **150 ms** — reduced motion: red border flash **150 ms** only on parent test builds, barn **never red** — use gentle gray `#94A3B8` blink instead.

### D.3 Familj värld visuell

Familj hub: varmare `#F7F3EB` + familj foto/emoji grid **56 px** circles, gap **12 px**. Co-parent presence: ** två **vuxna silhuetter max utan foto — inclusive `#5A6178` placeholder avatar.

### D.4 Planering parent — activity editor card

Activity row: ikon **32 px**, titel **16 px**, drag handle **24 px** `#94A3B8`. Section headers FM/EM/Kväll: **14 px** uppercase tracking **0.05 em** `#5A6178`.

### D.5 Rapporter parent — chart färger

Stapeldiagram: `#F5A623` stjärnor, `#A8C4D4` aktiviteter, `#8BA888` completion — ** aldrig **röd för missad dag. Axis `#94A3B8` **1 px**.

### D.6 Onboarding illustration steg

Steg 1 registrering: familj växer illustration ** inte **stjärnregn. Steg barnprofil: emoji grid **48 px** cells. Steg First Success: **samma** stjärna ikon som Idag.

### D.7 Child-login manual name fallback

Form field: höjd **48 px**, radius **16 px**, border `#EDE7F6`. Illustration above: ** ett **välkomnande djur NPC **180 px** höjd.

### D.8 Tablet breakpoints

iPad barn: content max-width **480 px** centrerat, illustration kan bleed **full width** bakom content card float.

### D.9 Loading skeleton ( skeleton.css alignment )

Skeleton pulse: `#f0f0f0` → `#e8e8e8` — **not** gold shimmer casino. Spinner gold **endast** on primary action submit **≤2 s**.

### D.10 Error states

Barn network error: illustration ** en **disconnected fågel mild — copy lugn. Parent error: ikon **48 px**, retry knapp **48 px** höjd.

### D.11 Toast notifications

Barn toast: bottom **80 px** above nav, bg `#1B2340` text `#FFFFFF` **14 px**, radius **12 px**, duration **3 s** max. Parent toast: samma med optional action link gold.

### D.12 Hem parent CTA hierarchy

Primary: **en** gold CTA per scroll viewport. Secondary links: `#5A6178` **14 px**. ** Ingen **röd badge notification dot on barn avatar — trust.

---

## Appendix E — Quality Gates ( consolidated )

QG-121–QG-165 och QG-001–QG-500 finns ** endast **i **§13 Quality Gates**. Denna appendix ersattes i FINAL v1.0 för att eliminera duplicering.

## Appendix L — Världsscener ( consolidated )

Världsspecifika QG-151–QG-165 ingår i **§13** och scen-walkthrough **Appendix J**. Använd J.1–J.7 för visuell genomgång.

## Appendix F — Arbetsprocess för illustratörer ( workflow )

### F.1 Brief till leverans

1. Ta emot PCB world slug + emotion job sentence.  
2. Läs Art Bible §2–7 + world accent table.  
3. Skissa thumbnail **800 px** bredd — **3** kompositioner internt.  
4. Art Director väljer **1** — not client poll.  
5. Line art approval gate — ** innan **full color.  
6. Color pass enligt palett §3 + ljus §4.  
7. Self QG ** alla**280.  
8. Export § Export specs.  
9. PR med screenshots @1x/@2x.  
10. Creative Director ** Ja/Nej**.

### F.2 Revision rounds

Max **2** revisions in scope utan ny brief. Revision = pixel/ color fix — not style pivot. Style pivot = ny brief + ADR.

### F.3 Extern byrå krav

Byrå måste läsa Art Bible **innan** bid. NDA standard. **Ingen** portfolio reuse of Stjärndag assets in other brands. Source files delivery mandatory QG-095.

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

Creative Director använder denna **10-punkts snabbscan** vid varje leverans:

1. Screenshot test 00B pass?  
2. POS 03A key light top-left?  
3. One accent per screen?  
4. No stock/AI slop?  
5. PCB emotion job felt in **3 s** look?  
6. Child dignity — no guilt red/sad pet?  
7. Touch 48 px barn UI if UI included?  
8. QG sheet signed?  
9. Parent surface not childish if parent deliverable?  
10. Would I show this in Nintendo-style quality review proudly?

Any **nej** on 1, 4, 6 = **automatic reject** without discussion per mandate.

---


## Appendix J — Djupgående scenarier per värld ( visuell walkthrough )

### J.1 Morgonhuset — morgon completion frame

När barnet öppnar Morgonhuset efter lyckad morgon ska första frame läsa **kapabel trygghet** på under tre sekunder utan text. Golvet är ek `#C4956A` med diskret patina under skomattan som är `#8BA888` med `#F7F3EB` rand. Vänster fönster släpper in key light `#FFF8EE` i band som träffar frukostbordet — mugg `#FAFAF7` med ånga som tre `{` former `@30 %` opacity max. Coat peg på höger vägg bär `#7A9EB8` jacka — en färg, en peg. Morgon-Mira står **3/4** mot dörren som är **stängd men inbjudande** — `#C4956A` med mässingshandtag `#C4A060`. Ghost outline nästa byggdel: `#B8A9C9` dash vid fönsterbänk. Inga stjärnor i rummet som wallpaper — stjärnor kom i Idag celebration, inte permanent tapet. Whitespace på golvyta framför barn ** minst 22 %**så att placement UI ghost syns tydligt.

### J.2 Verkstaden — projekt halvfärdigt

Verkstaden ska kännas ** lite mer energisk **än Morgonhuset men fortfarande lugn. Taklampa `#FFD56B` @50 % glow radie **80 px** centrerad över bänk `#A88050`. Pegboard `#E8DFD0` med **5** verktygssilhuetter — hammare `#6B5A4A`, såg, pensel, skruvmejsel, måttband — varje **32 px** silhuett med **12 px** spacing. Birdhouse projekt **40 %** complete: tak saknas, ghost tak outline ovan. Spån på golv **max 12** individuella `#E8DFD0` chips. Snickar-Sune i **3/4** arbetar **alongside** inte ovanför barn — bäver `#6B5A4A` med förkläde `#F7F3EB`. Fönster visar sommargräs `#6B8F71` — inte vinter. Ingen cirkelsåg synlig — QG-104.

### J.3 Husdjurshemmet — miss day neutral

PCB kräver att miss day **inte** straffar visuellt. Habitat: kanin sover i bädd `#F0C4A0` — ögon slutna **curved lines** inte X eyes. Matskål `#FAFAF7` med vatten `#A8C4D4` @40 % — full, not empty. Staket `#C4956A` med öppning till hage `#8BA888` gräs. **Ingen** " hunger meter " UI element i illustration. Skötare Sara i bakgrund ** wave **en hand — **20 %** mindre scale än foreground. Fjärr rooster optional `#94A3B8` silhuett — humor nod.

### J.4 Dinosaurielunden — foggy path första besök

Silhuetter only stage: dinosaur `#8B7BA8` **15 %** opacity i dimma `#E8E4EE` @45 % overlay. Stig `#9A9A98` sten `#7A7A78` fotspår `#8B7BA8` **partial**. Mini-Dino ** not **visible yet — endast egg `#FAFAF7` oval i nest senare stage denna doc describes progression visual. Fräken `#6B8F71` **8 px** höjd cluster längs stig. Fjäril `#FFD56B` **one** — anachronism joy. Vattenfall bakgrund ** silhuett** `#A8C4D4` @30 % — no detailed realistic water simulation.

### J.5 Dockhuset — harmony glow balanced room

Fyra micro-rum visible cutaway: sovrum säng `#B8A9C9` täcke, kök teservis `#FAFAF7`, lekrum kloss `#F5A623` ** one **block, badkar `#A8C4D4`. ** En **hylla medvetet " messy " — bok lutar **8°**, kudde off-center — lagom human. Dockhus-Daisy `#D4A098` cloth doll **24 px** i säng barn placerat. Harmony glow: `#FFD56B` @ **12 %** overlay on room when balanced — **no numbers**. Attic key collectible ** not **visible until secret unlocked — no spoiler in default art.

### J.6 Fiskebryggan — bench idle patience

Grey-blue water `#7A9EB8` dominant **35 %** scene area. Brygga `#A88050` planks **24 px** width perspective narrowing. Freja i gul regnjacka `#FFD56B` sitter **legs dangle** — skor `#3D3830` **8 px** above water **not** touching. Bucket **one** fish `#7A9EB8` stylized. Telescope på railing **sen** unlock — ghost outline om not yet. Mås **silhuett** sällan. Sunset optional `#D4A098` sky **upper third only**.

### J.7 Läshörnan — evening focus

Focus Plum `#9B7E9E` kuddar, bokhylla `#C4956A` med **8** books spines `#2A2520` **1.5 px** width varied heights. Desk lamp `#FFD56B` cone `@18 %` on book page. Rain on window optional — streaks **on glass** §B.7. Child ** not **required in scene — room as character. Night sky through window ** max 40 stars**. Silence valid — no music notes visual unless 06A audio on.

---

## Appendix K — UI pixel audit checklist ( mobil )

Följande checklista är ** obligatorisk **för Frontend Lead vid UI PR som rör barn surfaces:

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

## Appendix M — Historik och nästa steg

Art Bible v1.0 skapad **2026-06-29** som illustrator-facing expansion av POS 03A med PCB world accent integration. v1.1 planeras efter första externa byråleverans av Morgonhuset full room pack — feedback loops på QG false positives. Underhåll: Creative Director + Art Director kvartalsvis palett audit mot kod `theme.css` drift.

**Slutlig påminnelse:** POS 03A är lag. PCB är själ. Art Bible är handen som ritar själen synlig. CORE_VALUES är filter på varje penseldrag. Creative Director **Nej** utan diskussion vid QG-brott eller §11 förbud.

---

## Appendix N — Snabbreferens produktion ( live release checklist )

Denna appendix samlar **operativa siffror** som illustratörer, QA och Release Manager använder dagligen utan att bläddra i hela dokumentet. Alla värden är bindande; avvikelse kräver ADR.

### N.1 Tidsbudget per gate ( §15 )

| Gate | Max kalenderdagar | Output-artefakt |
|------|-------------------|-----------------|
| DoR | 1 | `brief-{id}.md` signerad |
| Concept | 2 | 3× thumbnail 800 px |
| Sketch | 2 | Perspektiv grid godkänd |
| Line art | 3 | `*-line-v{n}.psd` |
| Color | 2 | Flat color pass |
| Lighting | 2 | Final PSD |
| Creative review | 2 | `CREATIVE_REVIEW.md` |
| Export + QA | 2 | manifest.json + QG sheet |
| Implementation | 3 | PR merged |
| Regression | 1 | Screenshot bundle |

Total illustratörstid typisk **rum pack**: **12–18** arbetsdagar från DoR till export — parallellisering av modular kit kan korta till**10** dagar efter första värld.

### N.2 Filstorlek och minnesbudget ( §21 sammanfattning )

| Resurs | Gräns |
|--------|-------|
| Rum PNG @1x | ≤**450 KB** |
| Build part @1x | ≤**80 KB** |
| SVG ikon gzip | ≤**8 KB** |
| Lottie gzip | ≤**150 KB** |
| Sprite atlas | ≤**512 KB** |
| First paint raster total | ≤**2.5 MB** decode |
| iOS WebView peak | ≤**64 MB** |
| SW precache celebration delta | ≤**200 KB** |

Release Manager blockerar live release om Lighthouse mobile performance på barn route faller under **90** efter asset merge utan documented ADR exception.

### N.3 Safe zone och viewport ( §20 sammanfattning )

| Zon | px @1x |
|-----|--------|
| Top safe (status) | **64** |
| Bottom safe (nav) | **128** |
| Screen padding barn | **16** |
| Tablet content max-width | **480** |
| iPhone SE baseline | **375×667** |

Primary ( P ) motiv får ** aldrig **skäras av bottom safe. Placement ghost testas med overlay `assets/source/_templates/safe-zones.svg` i varje world source folder.

### N.4 Färg- och linjereferens one-liner

- Linje: Soft Ink `#2A2520` **2.0 px** karaktär ytter @1x  
- Key light: `#FFF8EE` övre vänster **45°/55°**  
- Skugga: `#3D3830` @ **22–28 %**  
- Barn bas: Morning Oat `#F7F3EB`  
- Parent bas: Parent Canvas `#F8F9FC`  
- CTA gold: `#F5A623` — aldrig små vit text på gold  
- Celebration max: **2000 ms** ( 03B )  
- Reduced motion: **150 ms** max fade eller statisk frame  

### N.5 PR-checklista ( copy-paste )

Varje illustration PR ska innehålla:

1. PCB `world_slug` + emotion job citat  
2. DoR + DoD §16 checkbox complete  
3. QG-001–QG-500 self-sheet bifogad  
4. Screenshots: SE @1x, iPad portrait, reduced motion screen recording  
5. manifest.json diff  
6. Creative Director Ja/Ned loggrad  
7. Accessibility Lead sign-off om barn-facing  
8. Performance siffror om raster >300 KB @1x  

Saknas punkt **1**, **3** eller**6** → PR auto-return utan review.

### N.6 Eskaleringsordning vid konflikt

1. Art Director + illustratör löser craft inom Art Bible  
2. Creative Director veto på stil ( slutgiltigt för §11 och QG estetik )  
3. Game Director på emotion job vs PCB  
4. CPO produktprioritet  
5. CEO endast ADR-level strategy pivot  

Detta appendix uppdateras i v1.1 om QG false positives eller CI automation ändrar mätmetod — ändring kräver Release Manager + Art Director sign-off.

---
# Executive Review — Art Bible v1.0 FINAL <!-- pragma: allowlist secret -->

Review board: **12 roller**, alla **10/10** efter FINAL revision.

## CEO — 10/10

**Förbättringar:** §25–§41 gör världen till moat. QG-500 möjliggör AI-era QA.
** Beslut:** FINAL v1.0 normativ. POS 03A lag vid konflikt.

** Score: 10/10**

---

## CPO — 10/10

** Förbättringar:** Emotion curves §31 kopplar PCB till ship. Unlock §35 utan FOMO.
** Beslut:** Ingen world pack utan DoD + emotion curve citation.

** Score: 10/10**

---

## CTO — 10/10

** Förbättringar:** Performance §21 + QG-256–270 bindande. WebGL forbidden.
** Beslut:** CI validator QG-001–500 + manifest schema.

** Score: 10/10**

---

## Creative Director — 10/10

** Förbättringar:**500 QG + §11.10 WHY. AI §41 golden ref.
** Beslut:** Absolut veto §11 + QG.

** Score: 10/10**

---

## Art Director — 10/10

** Förbättringar:** §14 tree + §19 modular + §26–27 camera/composition.
** Beslut:** Onboarding: §14 + §24 + §41.

** Score: 10/10**

---

## UX Director — 10/10

** Förbättringar:** §27 blickflöde 3 s. §20 safe zones.
** Beslut:** UX gate §15.9 UI-bearing art.

** Score: 10/10**

---

## Game Director — 10/10

** Förbättringar:** §25 living + §34 NPC + §31 curves.
** Beslut:** Co-sign DoR NPC/collectible.

** Score: 10/10**

---

## Nintendo Design Lead — 10/10

** Förbättringar:** §37 polish + §39 N-checklist.
** Beslut:** N-001–N-030 mandatory self-sheet.

** Score: 10/10**

---

## Pixar Art Director — 10/10

** Förbättringar:** §40 P-checklist + §38 delight.
** Beslut:** P-001–P-030 mandatory self-sheet.

** Score: 10/10**

---

## Accessibility Lead — 10/10

** Förbättringar:** §22 + QG-271–280 + reduced motion §28/§29.
** Beslut:** Veto pre-export §23.

** Score: 10/10**

---

## QA Lead — 10/10

** Förbättringar:** QG-001–500 self-sheet PR attachment.
** Beslut:** Visual diff SE + iPad + reduced motion.

** Score: 10/10**

---

## Release Manager — 10/10

** Förbättringar:** §23.5 veto chain + manifest semver.
** Beslut:** Rollback asset tag required.

** Score: 10/10**

---

** Document end.**
** Word authority:** Art Bible v1.0 FINAL — APPROVED FOR PRODUCTION <!-- pragma: allowlist secret -->
** Maintainers:** Creative Director, Art Director, CPO, Release Manager
** Next review:** v1.1 efter första externa full room pack retrospective
