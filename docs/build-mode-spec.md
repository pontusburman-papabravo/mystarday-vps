# BUILD MODE — Formell produktspec

> **⚠️ Authority:** [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) wins on any conflict. This file is technical detail / index for BUILD MODE. Product laws: [`01_PRODUCT_PRINCIPLES.md`](01_PRODUCT_PRINCIPLES.md). Engine: [`03_GAME_ENGINE.md`](03_GAME_ENGINE.md).

| | |
|---|---|
| **Status** | Godkänd produktvision (v1.1 — PixiJS-spellager) |
| **Senast uppdaterad** | 2026-06-29 |
| **Ägare** | Produkt / BUILD MODE |
| **Relaterade docs** | [`build-loop-mvp.md`](build-loop-mvp.md) (teknisk MVP), [`build-play-worlds-spec.md`](build-play-worlds-spec.md) (lek efter unlock) |

---

## 1. Sammanfattning

BUILD MODE är nästa stora funktion i appen. Den gör att barnet känner *"jag bygger något"* i stället för att bara samla abstrakta poäng — **utan** att appen blir ett spel eller att stjärnor/Skattkammaren försvagas.

**En mening:** Verklig rutin → stjärnor till föräldern + byggdel till barnet → världen växer synligt → vid 75 delar låses lekvärlden upp som belöning.

---

## 2. Produktidentitet

### 2.1 Vad appen är — och inte är

| | |
|---|---|
| **Är** | En vardagsapp som hjälper barn (4–10 år) klara dagliga rutiner: frukost, tänder, kläder, väska, läxor, läggdags. |
| **Är inte** | Ett fristående spel, en dashboard, ett formulär eller en klickfarm. |

BUILD MODE är **inte** en pivot mot spel. Det är ett **emotionellt lager** ovanpå befintlig schemaloggik.

### 2.2 Dubbel belöning från samma aktivitet

Varje avklarad aktivitet i schemat ger **två parallella utgångar**:

| | Loop 1 — Stjärnor | Loop 2 — Byggdelar |
|---|---|---|
| **Vem** | Föräldern (styr via Skattkammaren) | Barnet (emotionell motivation) |
| **Vad** | 1–5 ⭐ per aktivitet (oförändrat) | 1 byggdel per aktivitet |
| **Vart** | Skattkammaren → glass, film, Lego, Minecraft … | Byggscen → världen växer |
| **Kostnad** | Riktig belöning föräldern godkänner | Digital progression — kostar föräldern inget |
| **Barnets tanke** | (ofta indirekt) | *"Jag vill bygga klart mitt hem / få bilen färdig"* |

**Stjärnor = riktiga belöningar.** **Byggdelar = digital progression barnet älskar.** Byggdelen ska vara det emotionella dragplåstret; stjärnorna ska fortsätta vara förälderns verktyg.

> Byggvärlden **ersätter inte** stjärnor. Den **gör rutinerna mer värdefulla** för barnet utan att föräldern behöver ge mer.

---

## 3. Produktvägen (happy path)

Detta är den **vanliga vägen** i produktion. Preview/dev-lägen är undantag (se §8).

```
┌─────────────────────────────────────────────────────────────────┐
│  VERKLIGHETEN                                                    │
│  Barnet borstar tänderna, äter frukost, gör läxan …             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  SCHEMA (appens dagbok)                                          │
│  Aktivitet markeras klar i dagboken                              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
              ┌──────────────┴──────────────┐
              ▼                             ▼
     ┌─────────────────┐          ┌─────────────────┐
     │  +1–5 ⭐         │          │  +1 byggdel      │
     │  Skattkammaren  │          │  Byggscen        │
     └────────┬────────┘          └────────┬────────┘
              │                             ▼
              │                   Del monteras (animation)
              │                   Världen växer synligt
              │                             ▼
              │                   75 makrodelar samlade
              │                             ▼
              │                   UNLOCK — ceremoni
              │                             ▼
              │                   LEKVÄRLD (gate:ad, se §8)
              │                   drag, skrubba, kasta, måla …
              ▼
     Förälder godkänner → belöning i Skattkammaren
```

**Lek ska inte konkurrera med vardagen.** Lek är belöningen **för** vardagen. Barnet ska först leva, sedan leka.

---

## 4. Designprinciper

### 4.1 Nintendo-principen

Ge sällan bara poäng. Ge något som **syns och känns**:

- ny figur, ny animation, ny del i scenen, nytt område, ny hatt

`75` är antal **makrodelar** per värld. Varje makrodel ska kunna bestå av **3–8 mikroanimationer** (mål, inte MVP-krav dag ett):

```
macro_part (t.ex. "Motor")
  └── micro_steps[]: skruvar → kolvar → avgassystem → turbo
```

Barnet ska känna *"jag byggde motorn"* — inte *"+1 motor"*.

### 4.2 Världen ska synas förändras

**Förbjudet som huvudupplevelse:** ensam progressbar, dashboard med siffror, statisk `32/75`-räknare utan scen.

**Krav:** barnet ser tom tomt → grund → väggar → tak → fönster → möbler → dekoration → färdig värld.

| Delar | Garage (exempel) | Husdjurshem (exempel) |
|------:|------------------|------------------------|
| 0 | Tom tomt | Tom hage |
| 10 | Grund | Staket |
| 20 | Väggar | Hundkoja påbörjad |
| 30 | Tak | Tak på kojan |
| 40 | Fönster/port | Matplats |
| 50 | Möbler/verktyg | Leksaker |
| 60 | Dekoration | Lekplats |
| 75 | Garaget klart → **lek** | Hemmet klart → **lek** |

### 4.3 Verktyg före resultat

Barnet ska **göra** saker: dra & släpp, skrubba, kasta, måla, bygga, flytta, montera.

Inte trycka på *"Mata djur"* och få `+8 Happiness`.

### 4.4 Relation och levande världar (mål)

| Funktion | Syfte |
|----------|--------|
| **Hälsningar** | Världen känner igen barnet: *"Hej Pontus! Jag saknade dig!"* |
| **Kontext** | *"Nu fick vi en bokhylla!"* efter läxa; *"WOW — riktigt hem!"* efter unlock |
| **Levande snapshot** | Vid återbesök: hunden flyttat bollen, katten i soffan, lampan tänd |
| **Sällsynta fynd** | 99 % vanlig stol; ibland ✨ gyllene lampa (1/200) — utan att sabotera progression |

Dessa förstärker relation, inte bara siffror.

### 4.5 Kvalitetsribba

En App Store-skärmdump ska se ut som ett **riktigt barnspel** (Toca Boca-nivå) — inte en React-applikation eller ett kort/dashboard.

**Tekniskt:** Belöningsvärldarna renderas i **PixiJS** (2D-canvas), inte i React/CSS/DOM. Se §6.

**Referenser i repot (stilankare + DOM-piloter att migrera):**

| Referens | Fil / route |
|----------|-------------|
| Garaget (lek, verktyg) | `/child/garage` — DOM-pilot, migreras till Pixi |
| Husdjurshemmet (lek) | `/child/pet-home` — DOM-pilot, migreras till Pixi |
| Stilankare bil | `public/img/build/style-anchor/build-car-hero.png` |
| Stilankare garage-scen | `build-garage-scene.png` |
| Stilankare husdjur | `build-pet-hero.png` |
| Granskning | `build-style-review.html` |

Varumärke: navy, gold, lavender, Outfit — världen får egen ljushet/temperatur inom samma familj.

---

## 5. Världar (7 MVP-äventyr)

Ett aktivt byggprojekt per barn. Exakt **75 makrodelar** per äventyr.

| # | Slug | Bygger | Lek efter unlock (75) |
|---|------|--------|------------------------|
| 1 | `racerbil` | Bil + garage | Tvätta, måla, däck, tanka, tuta |
| 2 | `husdjur` | Husdjurshem | Mata, borsta, boll, klappa, filt — hund/katt/kanin/häst |
| 3 | `dinosaurie` | Museum/dal | Gräv, montera skelett, kläck ägg |
| 4 | `dockhus` | Dockhus rum för rum | Möblera, måla, flytta dockor |
| 5 | `fiske` | Brygga, båt, fiskeliv | Kasta, dra in, hala upp |
| 6 | `laxor` | Mysigt studierum | Bokstäver, matte (lek) |
| 7 | `vardag` | Eget sovrum | Speglar familjens schema |

### 5.1 Första vertikalen: Husdjurshemmet

All ny BUILD MODE-utveckling ska bevisa hela kedjan här först:

```
Bygg 0 → 75 (synlig byggscen, del-landning, guide)
    → unlock-ceremoni
    → lek (/child/pet-home) med hund, katt, kanin, häst
    → facit-grafik (build-pet-hero.png + kommande scen-PNG)
```

Garaget förblir **kvalitetsreferens** för lek; husdjur är **referens** för hela bygg→unlock→lek-kedjan.

Exempel — EN makrodel "Hundkoja" med mikrosteg:

```
Golv → Väggar → Tak → Måla → Namnskylt → Hundsäng → Matskål → Leksaker
```

---

## 6. Arkitektur

### 6.0 Plattformsbeslut (99,9 % mobil)

| Beslut | Val |
|--------|-----|
| Distribution | **Web-first PWA** + **Capacitor**-wrapper (samma webbapp i App Store / Play) |
| Belöningsvärldar | **PixiJS** — mobiloptimerad 2D-canvas-runtime |
| App-skalet | Befintlig webbapp (login, schema, föräldervy, inställningar, Skattkammaren) |
| Backend | Befintlig Express API + PostgreSQL — **rör så lite som möjligt** |
| **Inte** | Unity, Godot, React/CSS/DOM för interaktiva barnvärldar |

Unity/Godot är för tunga: svårare integration med schema/stjärnor/login, onödiga för 2D-barnvärldar. Vanlig React/CSS ger dashboard/kort/knappar — det är exakt det vi ska undvika.

**Nuläge i repot:** Express + statiska sidor i `public/` + Capacitor iOS/Android. Spellagret införs som PixiJS-modul; app-skalet kan evolvera (TypeScript, komponentbibliotek) **utan** att belöningsvärldarna byggs i DOM.

### 6.1 Två lager — app-skål vs spellager

```text
App-skål (webb / PWA / Capacitor)
= login, schema, dagbok, föräldervy, inställningar, Skattkammaren, routing, auth

PixiJS spellager (BuildEngine)
= byggscener, belöningsvärldar, djur, garage, animationer, drag/drop, partiklar
```

App-skålet **monterar** Pixi-canvas och skickar in routing/auth/API-state. All barninteraktion i belöningsvärldar sker **inuti Pixi-runtime** med touch-first Pointer Events.

```text
┌─────────────────────────────────────────────┐
│  App-skål (HTML/JS, ej spellogik)           │
│  ┌───────────────────────────────────────┐  │
│  │  <canvas> PixiJS Application          │  │
│  │  · byggscen 0→75                      │  │
│  │  · lekvärld efter unlock              │  │
│  │  · drag, partiklar, ljud, haptics     │  │
│  └───────────────────────────────────────┘  │
│  API: /api/me/build, /api/auth/me, …        │
└─────────────────────────────────────────────┘
```

### 6.2 Teknikstack — spellager

| Del | Teknik | Roll |
|-----|--------|------|
| Rendering | **PixiJS** | 2D-scener, sprites, lager, partiklar |
| Animation | **GSAP** | Del-landning, mikrosteg, unlock-ceremoni |
| Ljud | **Howler.js** | SFX + ambient per värld |
| State (klient) | **Zustand** | Spelläge, synk mot API/customization |
| Touch / drag | **Pointer Events** + egen **DragManager** | Touch-first; ingen muse-only |
| Haptics | **Capacitor Haptics** (via `Platform`) | Tick, success, tool — redan delvis i `build-game-mobile.js` |
| Offline / cache | **PWA service worker** | Assets, spritesheets; befintlig `sw.js` |
| Assets | **WebP/AVIF** + **spritesheets** | Facit-PNG → atlas i produktion |
| Persistence | Befintlig API | `play-world-save.js` / `customization` JSONB |

### 6.3 BuildEngine vs världspaket

| | **BuildEngine** (PixiJS-runtime) | **Världspaket** (content) |
|---|----------------------------------|---------------------------|
| **Vad** | Återanvändbar motor alla världar delar | Unikt per äventyr |
| **Ansvar** | Pixi app lifecycle, rendering, GSAP-hooks, DragManager, partiklar, Howler, save-hooks, unlock, progression-hooks, collectibles | Spritesheets, scengraf, regler, state machine, del-karta (75×mikro), lekmekanik, guide-repliker |
| **Analogi** | Spelmotor-substrat (inte Unity) | Ett spel per värld |
| **Filer (mål)** | `public/js/build-engine/` | `public/js/worlds/pet-home/`, `…/garage/`, … |

### 6.4 Bygg inte GenericWorld — och inte React/CSS-världar

**Förbjudet mönster v1:** `build-play-world.html` + `WorldEngine { hero, stats, actions[], toast() }` — UI-skal, inte spel.

**Förbjudet mönster v2:** Belöningsvärldar som React-komponenter, CSS-layout, kort, knappar eller formulär. Det är därför DOM-piloterna (`build-garage.html`, `build-pet-home.html`) känns som dashboard trots bra mekanik — de ska **migreras** till Pixi, inte kopieras.

**BuildEngine ≠ GenericWorld.** Motorn är PixiJS-infrastruktur. Varje världspaket registrerar egna scener, sprites och interaktioner.

`build-play-world.html` får endast finnas som tillfällig shell tills Pixi-världspaket finns.

### 6.5 Cursor-agentregler (obligatoriska)

```text
Use PixiJS for all interactive child reward worlds.
Do not build reward worlds as React cards, buttons, forms or dashboards.
React/HTML may only mount the PixiJS canvas and provide routing/auth/API state.
All child-world interactions must happen inside the PixiJS runtime using touch-first pointer events.
```

**Det viktigaste beslutet:** PixiJS för barnens belöningsvärldar. App-skålet för resten av appen.

### 6.6 Målstruktur (filer)

```
public/js/
  build-engine/              ← PixiJS BuildEngine
    app.js                   ← Pixi Application bootstrap
    drag-manager.js          ← Pointer Events, touch-first
    particles.js
    audio.js                 ← Howler wrapper
    save-hooks.js            ← debounce → befintlig API
    unlock.js
    progression.js             ← hooks mot build-progress
  worlds/
    pet-home/                ← världspaket (första vertikalen)
      build-scene.js         ← bygg 0→75
      play-scene.js          ← lek efter unlock
      assets/                ← spritesheets, atlas JSON
    garage/                  ← migrera från build-garage.js
  play-world-save.js         ← delad persistence (behålls)

src/lib/                     ← oförändrat backend
  build-progress.js
  build-part-grant.js
  play/pet-home-state.js
```

Servern har **ingen** gemensam action-engine för lek. `child_build_project.customization` JSONB lagrar världsspecifikt state; server normaliserar/clampar.

### 6.7 Migration från nuläge

| Nuvarande | Status | Mål |
|-----------|--------|-----|
| `build-game-mobile.js` | DOM haptics/scroll | Logik flyttas in i BuildEngine; Capacitor Haptics kvar |
| `build-garage.html` + CSS | DOM-pilot, bra mekanik | `worlds/garage/` Pixi |
| `build-pet-home.html` + CSS | DOM-pilot | `worlds/pet-home/` Pixi |
| `child-build-hype.js` | CSS byggscen på Idag | Pixi miniscen eller embed canvas på barnvyn |
| `build-play-world.html` | GenericWorld shell | Ta bort när Pixi-paket finns |

Mekanik och API-kontrakt från DOM-piloterna **återanvänds**; rendering och input **skrivs om** i Pixi.

---

## 7. Nuläge i kodbasen (2026-06-29)

### 7.1 Implementerat

| Område | Status | Nyckelfiler |
|--------|--------|-------------|
| Katalog 7 äventyr, 75 delar | ✅ | `build-adventures.js`, migrationer `180892–895` |
| Ett aktivt projekt/barn | ✅ | `child_build_project` |
| Del vid aktivitet klar | ✅ | `tryGrantBuildPart` ← `daily-logs` |
| API build | ✅ | `GET/POST /api/me/build`, `/start`, `/part` |
| Milstolpar 15/30/45/60/75 | ✅ | `build-progress.js` |
| Bygg-UI på barnvyn (CSS-scen) | ⚠️ delvis | `child-build-hype.js` — scen finns, ej facit-nivå |
| Äventyrsväljare | ✅ | `/child/adventures` |
| Unlock-ceremoni | ⚠️ delvis | `child-build-ceremony.js` |
| Garaget (lek) | ⚠️ DOM-pilot | `/child/garage` — mekanik referens, migrera Pixi |
| Husdjurshemmet (lek) | ⚠️ DOM-pilot | `/child/pet-home` — mekanik OK, migrera Pixi |
| Generisk play-shell | ⚠️ placeholder | `build-play-world.html` — ska ersättas |
| Stilankare | ✅ delvis | `build-car-hero`, `build-garage-scene`, `build-pet-hero` |
| Preview utan login | ✅ dev | `?preview=1` |

### 7.2 Gap mot denna spec

| Gap | Beskrivning |
|-----|-------------|
| **Byggscen facit-nivå** | Barnvyn visar CSS-lager, inte illustrerad scen som växer del för del |
| **Del-landning** | Ingen animation när del placeras efter aktivitet |
| **Dubbel-toast** | Stjärna + byggdel ska kännas lika tydliga för barnet |
| **Lek-gate** | Produktväg gate:ar inte lek bakom 75 + ev. rutin (preview undantagen) |
| **BuildEngine (PixiJS)** | Ej påbörjad; DOM-substrat `build-game-mobile.js` |
| **Pixi-migration** | Garage + pet-home är DOM/CSS — ska bli canvas |
| **Mikrosteg** | Datamodell och UI saknas |
| **Hälsningar / levande värld** | Ej implementerat |
| **Husdjur vertikal** | Bygg 0–75 → unlock → lek inte ihopsydd |

---

## 8. Lek-gate och preview

### 8.1 Produktväg (krav)

| Steg | Tillgängligt |
|------|--------------|
| Schema, aktiviteter, stjärnor | Alltid (oförändrat) |
| Byggscen, del-landning | När aktivt byggprojekt finns |
| **Lekvärld** | **Endast** när `parts_collected >= 75` och `garage_unlocked` / `status === 'completed'` |

Valfritt (föräldrakontroll, senare): lek även efter dagens rutiner klara, eller tidsbegränsning per dag.

### 8.2 Preview (utveckling)

| Läge | Syfte |
|------|--------|
| `?preview=1` | UI/demo utan barnlogin; sparar inte |
| Dev-bypass | `ALLOW_DEV_CHILD_SKIP` lokalt |

Preview **får** finnas. Den är **inte** produktvägen.

---

## 9. Absolut förbjudet

| Förbjudet | Varför |
|-----------|--------|
| Dashboard som huvud-UI | Känns som admin, inte barnspel |
| Formulär / statiska knappar | *"Mata djur"* + toast |
| Emoji-knappar som primär interaktion | Ser billigt ut; bryter facit |
| Statisk progressbar som huvudupplevelse | Barnet ska se världen, inte siffror |
| Klickspel (`+8 Happiness`) | Ingen fysisk interaktion |
| GenericWorld / v1 WorldEngine | Samma skal, annan bakgrund |
| Lek som ersätter schema | Motverkar appens syfte |
| React/CSS/DOM belöningsvärldar | Ger dashboard/kort/knappar — använd PixiJS |
| Unity / Godot | För tungt; fel integrationskostnad |
| Bygg som ersätter stjärnor | Förälderns loop måste leva kvar |

---

## 10. API och data (befintligt)

```
GET   /api/me/build                    — katalog, aktivt projekt, world_map
POST  /api/me/build/start              — välj äventyr
POST  /api/me/build/part               — idempotent del (via daily-log)
GET   /api/me/build/play/:slug         — lek-state (t.ex. husdjur)
PATCH /api/me/build/play/:slug         — spara lek-state
```

**Trigger dubbel loop:** `daily-logs` completion → stjärnlogik (befintlig) + `tryGrantBuildPart` (byggdel).

**Lagring:** `child_build_project.parts_collected`, `customization` JSONB, `garage_unlocked`.

---

## 11. Implementationsfaser (ingen kod före godkänd spec)

| Fas | Innehåll | Mål |
|-----|----------|-----|
| **0** | Denna spec + alignment | ✅ |
| **1** | Dubbel loop synlig: stjärna + byggdel-toast | Barnet känner båda looparna |
| **2** | PixiJS BuildEngine v1: app bootstrap, DragManager, GSAP, Howler, save-hooks | Återanvändbar canvas-motor |
| **3** | Husdjur Pixi-paket: byggscen 0→75 → unlock → lek med gate | Första hela referensen |
| **4** | Mikrosteg, hälsningar, levande snapshot | Nintendo-känsla |
| **5** | Sällsynta fynd, föräldrakontroll lek; migrera garage till Pixi | Djup + andra referensvärld |
| **6** | Övriga 5 världar | Ett Pixi-paket i taget |

---

## 12. Definition of done (BUILD MODE)

- [ ] Appen känns fortfarande som **vardagsapp**, inte spel först
- [ ] 1–5 ⭐ per aktivitet till Skattkammaren — **oförändrat**
- [ ] 1 byggdel per aktivitet — synlig i byggscen
- [ ] Barn motiveras av att **bygga**, inte bara stjärnor
- [ ] Ingen ensam progressbar som huvudupplevelse
- [ ] 75 delar → unlock → lek gate:ad i produktion
- [ ] Belöningsvärldar körs i **PixiJS** — inte React/CSS/DOM
- [ ] App-skålet monterar canvas; all barninteraktion i Pixi-runtime
- [ ] Husdjur: hela vertikalen (bygg + lek) i Pixi med facit-grafik/spritesheets
- [ ] Lek: drag/skrubba/kasta — minst 3 interaktionstyper, touch-first
- [ ] BuildEngine + världspaket separerade; GenericWorld + DOM-världar borta
- [ ] App Store / Toca Boca-ribba på skärmdump (canvas, inte kort-UI)

---

## 13. Relaterade filer

| Fil | Roll |
|-----|------|
| `docs/build-loop-mvp.md` | Teknisk MVP, migrationer, sprintlista |
| `docs/build-play-worlds-spec.md` | Lek-världar efter unlock |
| `src/lib/build-progress.js` | Milstolpar, scener, guider |
| `src/lib/build-part-grant.js` | Byggdel vid aktivitet |
| `public/js/child-build-hype.js` | Bygg-UI barnvy |
| `public/js/build-game-mobile.js` | Motor-substrat |
| `public/build-garage.html` | Lek-referens |
| `public/build-pet-home.html` | Lek-pilot husdjur |
