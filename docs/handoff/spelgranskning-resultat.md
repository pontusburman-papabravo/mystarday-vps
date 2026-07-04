# Spelgranskning — barnapp Min värld

**Datum:** 2026-07-04  
**Granskare:** AI-agent (kodbaserad, ej live-skärminspelning)  
**Underlag:** `docs/handoff/spelgranskning-agent-brief.md` + källkod på `main`  
**Metod:** Läs implementation → betygsätt upplevelse → minsta ändringar med insats/effekt

---

## Sammanfattning

| Yta | Betyg | En rad |
|-----|-------|--------|
| ☀️ Idag | **7/10** | Rutinapp som fungerar — stjärnor, firande, tydlig NU-handling |
| 🌍 Min värld (hub) | **3/10** | Meny, inte värld — löser navigation, dödar spelkänsla |
| 🏠 Morgonhuset | **2/10** | Vacker tapet, noll agency |
| 🌻 Trädgården | **4/10** | En riktig loop finns — men chrome-knapp + overlay, inte lek |
| 💎 Skattkammaren | **6/10** | Tydlig belöningsdomän — inte spel men gör sitt jobb |
| **Helhet spelkänsla** | **3/10** | Infrastruktur utan sammanhängande lek |

**Kärnproblem:** ~60 % av navigation/gameplay-koden **finns redan** men är **avstängd eller oåtkomlig**. Ni har byggt motor och sedan lagt på hub + wayfinder som gömmer den.

---

## ☀️ Idag — 7/10

### Vad som fungerar (kod)

- `child-today-focus.js` — tillståndsmaskin NO_TASKS / ACTIVE / ALL_DONE
- `child-dashboard-checkoff.js` — bockning → `launchDopaminBurst`, toast
- `child-dashboard-celebrations.js` — confetti, haptic, milestone
- Firande ≤2s (`CELEBRATION_MS = 2000`)

### Problem

- Ingen synlig koppling till Min värld efter bockning ("nu kan du plantera" → bara om barnet själv går till hub)
- Stjärnor visas men **världen förändras inte** synligt av Idag

### Tre minsta ändringarna

| # | Ändring | Fil | Insats | Effekt |
|---|---------|-----|--------|--------|
| 1 | Efter första bock idag: kort toast *"Trädgården väntar på dig 🌻"* med valfri länk till Min värld | `child-dashboard-checkoff.js` | **2h** | Kopplar rutin → värld |
| 2 | `ChildEventBus` `ActivityCompleted` → uppdatera hub garden-lås live (redan lyssnar Morgonhus) | `child-world-hub.js` | **3h** | Mindre förvirring |
| 3 | Idag-firande: en rad *"Nästa: gå till din trädgård"* när `garden_playable` på | `child-today-focus.js` | **2h** | Spelloopens första steg tydlig |

---

## 🌍 Min värld (hub) — 3/10

### Vad som fungerar (kod)

- `child-world-hub.js` — tre stora knappar, garden gate via API
- Tydligare än osynliga hotspots (nödlösning som funkar)

### Problem

- **Meny, inte värld** — bryter mot WPC fysisk navigation
- Barnet **teleporterar** — ingen dörr, ingen stig, ingen orientering
- Hub + wayfinder = **dubbel chrome** ovanpå scener
- Skattkammaren och Min värld blandas i samma DOM (`#skattkammarView`)

### Tre minsta ändringarna

| # | Ändring | Fil | Insats | Effekt |
|---|---------|-----|--------|--------|
| 1 | **Tillfällig bro:** Hub kvar men copy *"Välj vart du går"* → planera bort när dörr funkar | copy only | **30min** | Ärligare UX |
| 2 | Entry = Morgonhuset (inte hub) när `morgonhus_playable`; hub endast fallback | `child-dashboard-rewards.js` | **4h** | Börjar kännas som hem |
| 3 | Ta bort wayfinder **tillbaka till hub** när man kom från dörr (behåll fysisk retur) | `child-morgonhus.js`, transitions | **1 dag** | Kontinuitet |

**Produktbeslut krävs:** Hub som permanent vs övergångslösning.

---

## 🏠 Morgonhuset — 2/10

### Vad som fungerar (kod)

- `GET /api/me/morgonhus` — props, `gate_to_garden` från server
- `scene@2x.webp` via asset pipeline
- **Död kod som redan finns:**
  - `enterGardenFromDoor()` — rad ~160
  - `enterHall()` — rad ~183
  - `applyUnlockedState()` — props renderas **inte** i `renderSceneInner`

### Problem

- `wayfinderConfig.actions: []` — inget att göra
- Inga `[data-prop]`-knappar i DOM trots server-data
- Dörren i bilden är **inte klickbar**
- Barnet kan inte påverka något

### Tre minsta ändringarna

| # | Ändring | Fil | Insats | Effekt |
|---|---------|-----|--------|--------|
| 1 | **Gör dörren klickbar** — absolut positionerad hotspot över dörr i scenen + `enterGardenFromDoor` | `child-morgonhus.js` + `child-morgonhus.css` | **4–6h** | **Stor** — första riktiga "gå in"-momentet |
| 2 | Rendera 1–2 props (`welcome_mat`, `first_light`) som tap → `triggerReaction` + ljud | `renderSceneInner` + befintlig `applyUnlockedState` | **1 dag** | Världen svarar |
| 3 | Ta bort hub-entry när dörr funkar; Morgonhus = default Min värld | `child-dashboard-rewards.js` | **4h** | Helhetskänsla |

---

## 🌻 Trädgården — 4/10

### Vad som fungerar (kod)

- Full LOE-loop: `plant` → 30s → `blooming` → `harvest`
- Plant gate kopplad till Idag (`garden-loe.js`)
- `LivingWorldTransition.enterGarden` — portal-animation finns
- SVG-solros per state (nyare)
- **Död kod:**
  - `outdoorNavHotspots()` — stigar till minnesrum/verkstad
  - `handleSceneryTap` / `handleOutdoorNav`
  - `updateBedVisual` sätter `gd-hotspot--bed` klass men **ingen bed-knapp i render**

### Problem

- Spel = tryck **"Blomsterbädd"** i header — inte tryck på jorden
- Solros = overlay på bakgrund — inte del av scenen
- Ingen `water`, inga frön, ingen butik
- Skörd = emoji-burst 2s — svag jämfört med Idag-confetti
- 30s timer osynlig för barnet (bara text "växer…")

### Tre minsta ändringarna

| # | Ändring | Fil | Insats | Effekt |
|---|---------|-----|--------|--------|
| 1 | **Flytta blomsterbädd in i scenen** — `<button class="gd-hotspot gd-hotspot--bed">` i `renderSceneInner` (CSS position höger ned), koppla `handleBedTap`; wayfinder-knapp sekundär eller bort | `child-garden.js` + CSS | **1 dag** | **Enorm** — direkt manipulation |
| 2 | Synlig växt-progress: liten ring/cirkel på bädden under `planted` (`scheduleTimerRefresh` finns) | `child-garden.js` + CSS | **4h** | Spänning, inte bara vänta |
| 3 | Plant/harvest: `Platform.haptics` + kort ljud (samma klass som Idag) | `child-garden.js` | **4h** | Känns som spel |

### Om `water` (din vision)

| Steg | Insats |
|------|--------|
| Pack: nytt verb `water` i `living-objects.json` | 1h |
| Server: lägg till i `ALLOWED_VERBS` (`garden-loe.js`) | 15min |
| Klient: `handleBedTap` eller separat tap-zon | 4h |
| **Totalt** | **~1 dag** — ingen ny DB-modell |

### Om fröbutik (din vision)

| | |
|--|--|
| **Finns idag** | Inget — ingen `/api/me/shop`, inget inventarie |
| **WPC idag** | Stjärnor spenderas inte i världsbutik (PRG-001) |
| **Kräver** | Produktbeslut + ADR innan kod |
| **Alternativ utan ADR** | Frön som **byggdelar** efter Idag-milestone (redan plant gate) eller verkstad-projekt "planteringslåda" (WDB) |

---

## 💎 Skattkammaren — 6/10

### Vad som fungerar (kod)

- `child-dashboard-rewards.js` — hero, mål, belöningslista, redeem
- Tydlig domän — inte spelhub (korrekt enligt vision)
- `child-skatt-house.js` — universum-rum inkl. "Butiken" (dekorativt)

### Problem

- Delar DOM med Min värld-scener — förvirrande arkitektur
- "Butiken" i universum ≠ fröbutik — namnkrock med din vision
- Ingen koppling visuell till trädgård

### Tre minsta ändringarna

| # | Ändring | Insats | Effekt |
|---|---------|--------|--------|
| 1 | Låt Skattkammaren vara — **ändra inte** till spelhub | 0 | Rätt fokus |
| 2 | Efter redeem: valfri *"Visa i min värld"* endast om trofé-rum finns | framtida | Låg prio |
| 3 | Byt copy på universum-"Butiken" till *"Belöningar"* om förvirrande | `child-skatt-house.js` | **1h** | Mindre namnkrock |

---

## Död kod — snabbvinster (återanvänd, bygg inte om)

| Kod | Fil | Vad den gör | Varför stoppad |
|-----|-----|-------------|----------------|
| `enterGardenFromDoor` | `child-morgonhus.js` | Portal → trädgård | UI borttagen |
| `enterHall` | `child-morgonhus.js` | → catalog hall | UI borttagen |
| `outdoorNavHotspots` | `child-garden.js` | Stigar till andra rum | Ej i render |
| `handleOutdoorNav` | `child-garden.js` | Memory hall path | Hotspots dolda |
| `ChildCatalogRoom` | `child-catalog-room.js` | 12 rum navigera | Ingen ingång |
| `applyUnlockedState` | `child-morgonhus.js` | Props reagerar | Props ej i DOM |

**Slutsats:** Flera "veckors arbete" är i själva verket **återkoppling av befintlig kod** — timmar till dagar, inte greenfield.

---

## Prioriterad topplista (upplevelse ÷ insats)

Sorterad: högst ROI först.

| Prio | Ändring | Insats | Spelkänsla | Filer |
|------|---------|--------|------------|-------|
| **1** | Klickbar dörr Morgonhus → trädgård | 4–6h | ★★★★★ | `child-morgonhus.js`, CSS |
| **2** | Blomsterbädd som hotspot i scenen (inte bara wayfinder) | 1 dag | ★★★★★ | `child-garden.js`, CSS |
| **3** | Haptic + ljud plant/harvest | 4h | ★★★★ | `child-garden.js` |
| **4** | Synlig växt-timer på bädden | 4h | ★★★★ | `child-garden.js` |
| **5** | Idag → toast "trädgården väntar" efter bock | 2h | ★★★ | `child-dashboard-checkoff.js` |
| **6** | Morgonhus entry istället för hub | 4h | ★★★★ | `child-dashboard-rewards.js` |
| **7** | 1 tap-prop i Morgonhus (matta/ljus) | 1 dag | ★★★★ | `child-morgonhus.js` |
| **8** | `water`-verb (LOE v2) | 1 dag | ★★★★ | pack + `garden-loe.js` + client |
| **9** | Gräs-sway + fågel CSS (ambient) | ½ dag | ★★★ | `child-garden.css` |
| **10** | Återaktivera stig till minnesrum (en hotspot) | 4h | ★★★ | `child-garden.js` render |
| **11** | Skörde-firande = samma klass som Idag confetti | 4h | ★★★ | `child-garden.js` + celebrations |
| **12** | Hub → temporär, planera bort | produkt | ★★★★ | flera |

### Stryk eller pausa (80 % jobb, 5 % spelkänsla)

| Item | Varför |
|------|--------|
| `interaction-runtime.js` abstraktion nu | Bygg inte ramverk före första lekbara slice |
| 12 catalog-rum utan gameplay | Infrastruktur utan innehåll |
| Minnesrum exhibits (tomt pack) | Inget att uppleva |
| Full `scenes.json` för alla 14 rum | Spec-arbete |
| G9 parent warm_echo | Förälder, inte barnspel |
| Ny fröbutik med stjärnköp | ADR + bryter WPC tills beslut |

---

## Föreslagen sprint: "Garden Play v1" (1–2 veckor fokus)

**Mål:** Ett sammanhängande spelmoment barnet kan beskriva: *"Jag gick ut, planterade, vattnade, skördade."*

```
Dag 1–2:  Dörr klickbar (Morgonhus → trädgård), hub som fallback
Dag 3–4:  Bädd i scenen + timer-ring + haptic
Dag 5:    water-verb
Dag 6:    Idag-koppling (toast efter bock)
Dag 7:    QA mobil + test:gate + deploy
```

**Utanför denna sprint:** fröbutik, 12 rum, minnesrum-innehåll, verkstad.

---

## Roadmap-position (uppdaterad)

```
[████████░░░░░░░░░░░░░░░░░░░░░░] ~18%

KLART:
  v1 rutin + belöningar
  LOE-motor (plant/harvest)
  Transitions, packs, 12 rum assets
  Hub-navigation (nödlösning)

NÄSTA (högsta ROI):
  Fysisk dörr + touch i scen + juice

BLOCKERAT utan beslut:
  Fröbutik / stjärnköp i världen (ADR)
  World 3+ (BL-012 HRC)
```

---

## Rekommendation till nästa agent / utvecklare

1. **Börja inte** med dokument eller `interaction-runtime.js`.
2. **Börja** med prio 1–2 (dörr + bädd i scen) — det är befintlig kod att koppla in.
3. **Kör** `npm run test:gate` — tester assertar wayfinder-only; uppdatera vid hotspots.
4. **Spela in** före/efter 2-min video för stakeholder — mer övertygande än betyg.

---

*Relaterat: `docs/handoff/spelgranskning-agent-brief.md`*
