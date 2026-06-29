# BUILD MODE — Produktspec

> **Appen är inte ett spel.** Den hjälper barn klara vardagen. Bygg-läget gör rutinerna känslomässigt meningsfulla — utan att ersätta stjärnor eller Skattkammaren.

Senast uppdaterad: 2026-06-29 (dubbel belöningsloop, Nintendo-princip, levande världar).

---

## Kärnan

Barnet använder schemat för att äta frukost, borsta tänderna, klä på sig, packa väskan, göra läxan, gå och lägga sig.

Varje aktivitet i **verkligheten** är grunden för hela upplevelsen.

Stjärnor fungerar — men de känns abstrakta. Barnet ska istället känna:

> **"Jag bygger något."**

Barnet ska längta efter nästa aktivitet eftersom den ger en ny byggdel — inte för att farm:a poäng.

---

## Dubbel belöningsloop (viktigaste designbeslutet)

Byggvärlden **ersätter inte** stjärnor. Den **gör dem mer värdefulla** genom att ge barnet en parallell, emotionell motivation.

### Loop 1 — Förälderns belöning (oförändrad)

```
Borsta tänderna → +2 ⭐ → 30 ⭐ → Glass / Film / Lego / Minecraft …
```

- Styrs av föräldern via Skattkammaren.
- Exakt som idag.
- **Ska inte bort. Ska inte försvagas.**

### Loop 2 — Barnets belöning (ny, emotionell)

```
Borsta tänderna
  → "Du hittade en ny del!"
  → Hundkojan blev större!
  → Ny leksak!
  → "3 delar kvar tills stallet är klart!"
```

- Kostar inget för föräldern.
- Känns enormt för barnet.
- Barnet ska **nästan glömma stjärnorna** under byggfasen — men stjärnorna finns kvar för föräldern och för Skattkammaren.

### Samma aktivitet, två utgångar

| Händelse | Loop 1 | Loop 2 |
|----------|--------|--------|
| Aktivitet klar | +N ⭐ (föräldragodkänt) | +1 byggdel (automatisk) |
| Barnets tankar | (indirekt: glassen) | "Jag vill bygga klart mitt hem" |
| Förälderns tankar | "Rutinen fungerar" | "Barnet motiveras utan att jag ger mer" |

**Tekniskt:** `daily-logs` → `tryGrantBuildPart` (redan kopplat) + befintlig stjärnlogik. Två parallella system, samma trigger.

---

## Designprincip: Lek belönar vardagen

> **Lekvärlden är en belöning för genomförda rutiner — inte en konkurrerande aktivitet.**

| Regel | Betydelse |
|-------|-----------|
| Lek ersätter aldrig schemat | Barnet ska först leva, sedan leka |
| En aktivitet → 1–5 ⭐ + 1 byggdel | Samma händelse, dubbel utgång |
| Lek kan vara gate:ad | Efter dagens uppgifter, eller tidsbegränsat (förälder styr) |
| Inget "tjata-spel" | Om barnet bara vill spela utan rutiner har vi misslyckats |

**Mål för båda målgrupper:**

- **Föräldern:** färre konflikter, rutiner som faktiskt händer.
- **Barnet:** längtar efter att logga in och se vad som hänt i sin värld.

---

## Spel-loopen (hela kedjan)

```
Verkligheten
    ↓
Aktivitet markeras klar (schema)
    ↓
┌─────────────────┬─────────────────┐
│  +⭐ stjärnor   │  +1 byggdel     │
│  (Skattkammaren)│  (byggvärlden)  │
└─────────────────┴─────────────────┘
    ↓
Byggdelen monteras (animation, inte siffra)
    ↓
Världen växer synligt
    ↓
75 makrodelar klara → lekvärld låses upp
    ↓
Lek (drag, skrubba, kasta, måla …)
```

Belöningen är inte en siffra. Belöningen är en **ny plats** och en **relation** till den.

---

## Nintendo-principen

Nintendo ger sällan bara poäng. De ger:

- ett nytt svärd
- en ny figur
- en ny bana
- en ny animation
- en ny hatt
- ett nytt område

**Vi ska göra samma sak.**

### Makrodelar × mikroanimationer

`75` är antal **stora** delar per värld — men varje del ska vara en **liten upplevelse**, inte `+1 motor`.

Exempel — Garage, del "Motor":

```
skruvar → kolvar → avgassystem → turbo
(animeras in, ett i taget)
```

Barnet känner: *"Jag byggde motorn."* — inte *"+1 motor"*.

**Datamodell (mål):**

```
macro_part (1 av 75)
  └── micro_steps[] (3–8 animationer per del)
        └── asset_key, duration_ms, sfx, haptic
```

MVP kan börja med 1–2 mikrosteg per del; full Nintendo-känsla byggs ut per värld.

### Husdjurshem — exempel på EN byggdel

Del "Hundkoja" blir en sekvens:

```
Golv → Väggar → Tak → Måla → Namnskylt → Hundsäng → Matskål → Leksaker
```

En aktivitet i verkligheten → ett mikrosteg i sekvensen → synlig förändring i scenen.

---

## Progression — världen ska synas förändras

**Ingen ensam progressbar** som huvudupplevelse.

| Delar | Garage | Husdjurshem |
|-------|--------|-------------|
| 0 | Tom tomt | Tom hage |
| 10 | Grund | Staket |
| 20 | Väggar | Hundkoja (påbörjad) |
| 30 | Tak | Tak på kojan |
| 40 | Fönster/port | Matplats |
| 50 | Möbler/verktyg | Leksaker |
| 60 | Dekoration | Lekplats |
| 75 | Hela garaget → **lek** | Hela hemmet → **lek** |

Barnet ska tänka: **"Jag byggde det här."**

---

## Relation — världen känner igen barnet

Djuret / guiden / världen ska ha **minne och hälsningar** — inte bara statistik.

| Situation | Exempel |
|-----------|---------|
| Daglig inloggning | "Hej Pontus! Jag saknade dig! Titta — jag har väntat här." |
| Borta några dagar | "Jag har väntat på dig ❤️" |
| Nyligen byggt klart | "WOW! Nu har vi ett riktigt hem!" |
| Läxa gjord | "Nu fick vi en bokhylla!" |

**Tekniskt:** `last_seen_at`, `parts_since_visit`, `child.name`, `recent_build_events[]` → server genererar kontextmeddelande. Ingen generisk chatbot — korta, varma, världsspecifika repliker.

---

## Sällsynta fynd

99 % av gångerna:

> "Du fick: En stol."

Ibland (sällsynt, spårbar):

> ✨✨✨ "WOW!! Du hittade den gyllene lampan! 1 av 200"

- Överraskning utan att sabotera progression.
- Föräldern påverkas inte (ingen extra kostnad).
- `rarity` på deltyper i katalogen; pity/timer för att undvika frustration.

---

## Levande världar (offline-tillstånd)

När barnet kommer tillbaka ska platsen känts **levande** — inte fryst som en skärmdump.

| Värld | Exempel vid återbesök |
|-------|----------------------|
| Husdjurshem | Hunden flyttat bollen; katten i soffan |
| Garage | Lampan tänd; bilen lite dammig om länge borta |
| Dino | Dinosaurien somnat |
| Fiske | Fiskarna simmar |
| Trädgård | Blommorna vuxit |

**Tekniskt:** `world_snapshot` i `customization` — seedad slump vid `last_seen_at`, deterministisk per session så det känns konsekvent men levande.

---

## Världar (7 MVP)

| Slug | Bygger | Lek efter 75 |
|------|--------|--------------|
| `racerbil` | Bil + garage | Tvätta, måla, däck, tanka, tuta |
| `husdjur` | Hem för hund/katt/kanin/häst | Mata, borsta, boll, klappa, filt |
| `dinosaurie` | Museum/dal | Gräv, montera, kläck ägg |
| `dockhus` | Rum för rum | Möblera, måla, flytta dockor |
| `fiske` | Brygga, båt, liv | Kasta, dra in, hala upp |
| `laxor` | Mysigt studierum | Bokstäver, matte (lek) |
| `vardag` | Eget sovrum | Speglar schema |

Exakt **75 unika makrodelar** per värld. Mikrosteg definieras per del i världspaketet.

---

## Absolut förbjudet

- Dashboard med siffror som huvud-UI
- Formulär ("Mata djur"-knapp)
- Emoji-knappar som primär interaktion
- Adminpanel för barn
- Klickspel (`+8 Happiness`)
- Lek som ersätter eller konkurrerar med schemat

---

## Spelkänsla

Barnet ska **göra** saker:

- drag & drop
- skrubba
- kasta
- måla
- bygga
- flytta
- montera

**Kvalitetsmål:** En App Store-skärmdump ska se ut som ett riktigt barnspel — inte en React-applikation.

**Stilankare:** `build-car-hero.png`, `build-pet-hero.png`, `build-garage-scene.png` (facit-nivå).

---

## Arkitektur

### Spelmotor (återanvändbar runtime)

Alla världar delar:

| Modul | Ansvar |
|-------|--------|
| Rendering | Lager, sprites, scen-tillstånd |
| Animation | Mikrosteg, del-landning, unlock |
| Drag & drop | `build-game-mobile.js` → utökas |
| Partiklar & haptics | Redan delvis finns |
| Ljud | Per värld, gemensam API |
| Sparning | `play-world-save.js`, `customization` JSONB |
| Collectibles | Makrodelar, sällsynta fynd |
| Progression hooks | `build-progress.js`, milestones |
| Hälsningar | `world_greeting` från server |
| Offline-levande | `world_snapshot` seed |

**Inte** samma som v1 `WorldEngine` (klick-UI-skal). Motorn är substrat — som Unity — inte ett generiskt "fyra stats + fyra knappar".

### Världspaket (unikt per äventyr)

Varje värld innehåller **bara:**

- grafik (PNG/SVG/CSS per facit)
- regler & state machine
- spelmekanik (efter unlock)
- animationer & ljud
- del-karta (75 makro × mikrosteg)
- guide-repliker

| Värld | Bygg (status) | Lek (status) |
|-------|---------------|--------------|
| Garage | CSS-scen, delmål | **live** — referens |
| Husdjur | CSS-scen, delmål | **live** — pilot |
| Övriga 5 | Planerade | Shell / planned |

Se även [`build-play-worlds-spec.md`](build-play-worlds-spec.md) för lek-världar.

---

## Föräldrakontroll (lek-gate)

Konfigurerbart per familj/barn (feature flag / inställning):

| Läge | Beteende |
|------|----------|
| `after_routine` | Lek öppen när dagens schema är klart |
| `time_limit` | X minuter lek per dag (förälder sätter) |
| `unlocked_only` | Lek bara om världen är färdigbyggd (75) |
| `preview` | `?preview=1` för dev/demo |

Standard: **bygg alltid tillgängligt** (belöning syns direkt), **lek gate:ad** tills 75 + ev. dagens rutiner klara.

---

## Implementationsfaser

### Fas 0 — Dokumentation & alignment ✅ (pågår)

Denna spec. Dubbel loop. Nintendo-princip. Föräldra-gate som princip.

### Fas 1 — Dubbel loop synlig i UI

- Toast vid aktivitet: **både** stjärna **och** byggdel (redan delvis)
- Byggdel-landning: animation i scen (inte bara `32/75`)
- Barnet ser mikrosteg när möjligt (enklast: 1 anim per del först)

### Fas 2 — BuildEngine (runtime)

- Extrahera från `build-game-mobile.js`
- Scen-renderer med lager per `build_stage`
- API: `onPartLanded(macro, micro, rarity)`

### Fas 3 — Första hela vertikalen (husdjur rekommenderat)

- Bygg 0→75 synligt med facit-grafik
- Unlock-ceremoni
- Lek med gate
- Hälsningar + levande snapshot (enkel version)

### Fas 4 — Mikrosteg & sällsynta fynd

- Del-definitioner med 3–8 steg
- `rarity` i katalog
- "Gyllene lampan"-ögonblick

### Fas 5 — Övriga världar

En i taget. Samma motor, nytt content pack.

---

## Definition of done (BUILD MODE)

- [ ] Barn motiveras av att **bygga**, inte bara samla stjärnor
- [ ] Stjärnor + Skattkammaren fungerar **oförändrat** för föräldern
- [ ] Varje aktivitet ger synlig förändring i byggvärlden
- [ ] 75 makrodelar → unlock → lek med drag/skrubb (inte klick)
- [ ] Världen hälsar barnet vid återbesök
- [ ] Förälder kan gate:a lek utan att döda byggmotivationen
- [ ] App Store-skärmdump kvalitet (facit-nivå grafik)

---

## Relaterade filer

| Fil | Roll |
|-----|------|
| `docs/build-loop-mvp.md` | Teknisk MVP-översikt |
| `docs/build-play-worlds-spec.md` | Lek-världar efter unlock |
| `src/lib/build-progress.js` | Milstolpar, guider, scener |
| `src/lib/build-part-grant.js` | Del vid aktivitet klar |
| `public/js/child-build-hype.js` | Bygg-UI på barnvyn |
| `public/js/build-game-mobile.js` | Motor-substrat idag |
