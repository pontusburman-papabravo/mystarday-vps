# Handoff: Spelgranskning Min värld (för AI-agent)

**Syfte:** Ge en annan agent **implementationssanning** — inte vision. Läs denna fil först, sedan källkoden den pekar på.

**Repo:** Se `README.md` / `CLAUDE.md` (Express monolith, inte `apps/packages/`)  
**Prod-URL och VPS:** Se root `AGENTS.md` (avsnitt om deploy)  
**QA-barn:** Anna — `docs/qa-test-account.md` + PIN i `docs/app-store-demo-konto.md`  
**Feature flags (dev allowlist):** `morgonhus_playable`, `garden_playable`, `memory_hall_playable`

---

## Copy-paste: agent-prompt

```
Du gör en SPELGRANSKNING av Min värld — inte dokumentreview.

Läs FÖRST:
1. docs/handoff/spelgranskning-agent-brief.md (denna fil)
2. public/js/child-world-hub.js
3. public/js/child-garden.js
4. public/js/child-morgonhus.js
5. config/experience-packs/child_se/living-objects.json
6. src/lib/garden-loe.js

Läs INTE product-operating-system/ eller .ai/product/ förrän du behöver
avgöra om ett förslag bryter mot G-01/R-02.

Uppgift:
- Kartlägg vad som faktiskt renderas och vad som är död kod.
- Ge betyg per yta (Idag, Hub, Morgonhus, Trädgård, Skattkammaren).
- Lista "tre minsta ändringarna" per yta med uppskattad insats (timmar/dagar)
  och spelkänsla-effekt.
- Prioritera 10–20 ändringar med högst upplevelse/insats-ratio.
- Säg vad som kan strykas från backlog (ger 5% spelkänsla för 80% jobb).

Regler:
- POS: inga stjärn-IAP, inget ogräs-straff, firande ≤2s.
- Föreslå konkreta filer + funktioner — inte arkitekturritningar.
- Kör test:gate om du ändrar kod.

Output-format per yta:
  ⭐ X/10
  Problem (3–5 bullets)
  Tre minsta ändringarna (tid + effekt)
```

---

## 1. Projektstruktur (var saker faktiskt ligger)

```
repo-root/
├── public/
│   ├── child-dashboard.html          ← barn-SPA shell, script-ordning
│   ├── js/
│   │   ├── child-dashboard.js        ← flikar, showTab
│   │   ├── child-dashboard-rewards.js ← Min värld entry (loadRewards)
│   │   ├── child-dashboard-checkoff.js ← Idag bockning
│   │   ├── child-dashboard-celebrations.js ← confetti/haptic Idag
│   │   ├── child-world-hub.js        ← 3-knapps hub (NUVARANDE entry)
│   │   ├── child-world-wayfinder.js  ← chrome: tillbaka + action-knappar
│   │   ├── child-morgonhus.js        ← Morgonhuset scen
│   │   ├── child-garden.js           ← Trädgården scen + LOE
│   │   ├── child-memory-hall.js      ← Minnesrummet
│   │   ├── child-catalog-room.js     ← generiska rum (12 st, ej nåbara)
│   │   ├── child-living-world-transition.js ← dörr/portal-animationer
│   │   ├── garden-asset-pipeline.js  ← scene-bg srcset
│   │   └── living-world-scenes-catalog.js ← genererad från scenes.json
│   ├── css/
│   │   ├── child-garden.css
│   │   ├── child-morgonhus.css
│   │   ├── child-world-hub.css
│   │   └── child-world-wayfinder.css
│   └── images/child/world/garden/    ← scene-bg.webp + sunflower SVGs
├── src/
│   ├── routes/garden.js              ← GET/POST garden API
│   ├── routes/morgonhus.js
│   ├── routes/memory-hall.js
│   └── lib/
│       ├── garden-loe.js             ← plant gate + verb whitelist
│       ├── living-object-runtime.js  ← generisk LOE-motor
│       └── experience-pack/          ← laddar child_se JSON
├── config/experience-packs/child_se/
│   ├── living-objects.json           ← solros state machine
│   ├── worlds.json                   ← scenery/hotspots (server)
│   └── scenes.json                   ← catalog-rum
├── db/living-object.js
├── migrations/1809140000000_living_object_instance.js
└── test/
    ├── garden-loe-integration.test.js
    ├── garden-playable-scene.test.js
    └── child-world-hub.test.js
```

**Det finns INTE:** `interaction-runtime.js`, `/api/.../shop`, frö-inventarie, `water`-verb.

---

## 2. Nuvarande användarflöde (implementation)

```
Barn öppnar flik "Min värld"
  → loadRewards() [child-dashboard-rewards.js ~rad 47]
  → om morgonhus_playable: ChildWorldHub.tryShow() [child-world-hub.js]
      → 3 knappar: Trädgården | Morgonhuset | Skattkammaren

Trädgården:
  → LivingWorldTransition.enterGarden() ELLER ChildGarden.mount()
  → GET /api/me/garden + GET /api/me/garden/slots
  → renderScene(): wayfinder chrome + scene-bg + bed overlay
  → Primär action: wayfinder-knapp "Blomsterbädd" → handleBedTap()
  → POST /api/me/garden/slots/bed_1/verb { verb: "plant"|"harvest" }

Morgonhuset:
  → ChildMorgonhus.tryMountWorld()
  → GET /api/me/morgonhus
  → renderScene(): wayfinder (endast "← Min värld") + scene-bg
  → INGA hotspots, INGA props i DOM (applyUnlockedState har inget att binda)

Skattkammaren:
  → loadRewards({ skipHub: true })
  → GET /api/me/rewards, goal, etc. — klassisk belöningslista
```

**DOM-container:** Alla scener mountas i `#skattkammarView` (samma element som Skattkammaren).

---

## 3. API-kontrakt (barn, `/api/me`)

### Trädgården

| Method | Path | Response / body |
|--------|------|-----------------|
| GET | `/api/me/garden` | Ambient scenery från pack (`worlds.json`) |
| GET | `/api/me/garden/slots` | `{ plant_unlocked, plant_locked_message_sv, slots: [...] }` |
| POST | `/api/me/garden/slots/:slotId/verb` | Body: `{ "verb": "plant" \| "harvest" }` |

**GET slots — slot-objekt (typiskt):**
```json
{
  "slot_id": "bed_1",
  "state_key": "empty|planted|blooming|harvested",
  "visual_token": "garden_bed_empty|sunflower_seed|sunflower_bloom|sunflower_harvested",
  "available_verbs": [{ "verb": "plant", "child_message_sv": "..." }],
  "plant_locked": false,
  "timer_remaining_ms": 0,
  "label_state_sv": "..."
}
```

**POST verb — success:**
```json
{
  "ok": true,
  "slot": { /* uppdaterad slot */ },
  "child_message_sv": "Du planterade ett frö!"
}
```

**POST verb — errors:** `403 plant_locked`, `409 verb_not_allowed`, `404 slot_not_found`

**Verb-whitelist (server):** `src/lib/garden-loe.js` → `ALLOWED_VERBS = plant, harvest`  
**Pack-definition:** `config/experience-packs/child_se/living-objects.json`

**Lägga till `water`:** Ny rad i pack `verbs` + ta bort whitelist i `garden-loe.js` + klient `handleBedTap`. **Ingen ny DB-tabell** — `living_object_instance` finns redan.

### Morgonhuset

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/me/morgonhus` | `{ display_name, props[], gate_to_garden, ... }` |

Read-only. Inga POST.

### Minnesrummet

| Method | Path |
|--------|------|
| GET | `/api/me/memory-hall` |

Exhibits-pack tom (`exhibits.json` → `slots: []`).

### Skattkammaren (ej Min värld men samma flik)

| Method | Path |
|--------|------|
| GET | `/api/me/rewards` |
| POST | `/api/me/rewards/:id/redeem` |

**Ingen** `/api/me/shop` eller frö-köp.

---

## 4. Klient: nyckelfunktioner att granska

### Entry & navigation

| Fil | Funktion | Vad den gör |
|-----|----------|-------------|
| `child-dashboard-rewards.js` | `loadRewardsInner` | Hub vs Skatt gate |
| `child-world-hub.js` | `renderHub`, `bindHub` | 3 knappar |
| `child-world-wayfinder.js` | `render`, `bind` | Chrome ovanför scen |
| `child-living-world-transition.js` | `enterGarden`, `exitGarden` | Portal-zoom |

### Trädgården

| Fil | Funktion | Status |
|-----|----------|--------|
| `child-garden.js` | `renderSceneInner` | scene-bg + `#gdBedOverlay` |
| `child-garden.js` | `wayfinderConfig` | action `bed` → "Blomsterbädd" |
| `child-garden.js` | `handleBedTap` | **AKTIV** — plant/harvest via knapp |
| `child-garden.js` | `handleSceneryTap` | **DÖD** — inte anropad (inga scenery-knappar i render) |
| `child-garden.js` | `outdoorNavHotspots` | **DÖD** — inte i renderSceneInner |
| `child-garden.js` | `handleOutdoorNav` | **DÖD** — memory hall path finns i kod |
| `child-garden.js` | `launchHarvestCelebration` | Emoji-burst 2s |

### Morgonhuset

| Fil | Funktion | Status |
|-----|----------|--------|
| `child-morgonhus.js` | `renderSceneInner` | Bara bild + toast — **inga hotspots** |
| `child-morgonhus.js` | `wayfinderConfig` | `actions: []` — bara tillbaka |
| `child-morgonhus.js` | `enterGardenFromDoor` | **DÖD** — finns, anropas inte |
| `child-morgonhus.js` | `enterHall` | **DÖD** |
| `child-morgonhus.js` | `applyUnlockedState` | Söker `[data-prop]` som **inte renderas** |

### Redan byggt men oåtkomligt

- `child-catalog-room.js` — 12 rum med hotspots + navigate
- `living-world-scenes-catalog.js` — genererad katalog
- Assets: `public/images/child/world/garden/scene-bg*.webp`

---

## 5. Skärminspelning (manuell QA)

Agent kan inte spela in — människa eller `computerUse`-agent:

1. Logga in barn: `/child-login` → Anna → PIN (`docs/app-store-demo-konto.md`)
2. **Idag:** bocka av en aktivitet → se stjärna/confetti
3. **Min värld:** ska visa hub (om flagga på) — annars Skattkammaren direkt
4. **Trädgården:** Blomsterbädd-knapp → plant → vänta 30s → harvest
5. **Skattkammaren:** stjärnor + belöningslista

**Känt:** Hub är meny, inte värld. Bed-knapp är chrome, inte touch i scenen.

---

## 6. Backlog — prioritera/spara (ur `.ai/knowledge/BACKLOG.md` + roadmap)

### Gör spelkänsla (föreslagen ordning)

| # | Vad | Var | Insats (grovt) |
|---|-----|-----|----------------|
| 1 | Gör blomsterbädd klickbar **i scenen** (inte wayfinder) | `child-garden.js` renderSceneInner + CSS zone | ~4–8h |
| 2 | Återkoppla dörr Morgonhus → trädgård (fysisk nav) | `child-morgonhus.js` render + bind | ~4h |
| 3 | `water` som LOE-verb (pack + garden-loe + klient) | pack + server + client | ~1 dag |
| 4 | Juice: ljud/haptic vid plant/harvest | child-garden + Platform.haptics | ~½ dag |
| 5 | Synlig växt-progress (timer UI i scenen) | child-garden scheduleTimerRefresh | ~4h |
| 6 | Hub bort / ersätt med Morgonhus som entry | child-dashboard-rewards + hub | produktbeslut |

### Ger lite spelkänsla för mycket jobb (överväg stryka/pausa)

| # | Vad | Varför |
|---|-----|--------|
| Minnesrum exhibits (tomt pack) | Inget innehåll att uppleva |
| 12 catalog-rum utan entry | Infrastruktur utan gameplay |
| `interaction-runtime.js` abstraktion | Bygg inte före andra slice funkar |
| Full LWES `scenes.json` för alla rum | Spec, inte spel |
| G9 warm_echo parent UI | Förälder, inte barnspel |

### Blockerad (människa)

| ID | Vad |
|----|-----|
| BL-012 | World 3+ kreativt beslut |
| Fröbutik / stjärnköp i världen | Bryter WPC PRG-001 — kräver ADR |

---

## 7. Roadmap-position (kort)

```
v1 Completion          STÄNGD 2026-07-02  ("Child Worlds Complete" = infrastruktur)
G0–G7 Minnesrum        STÄNGD              (teknisk gate 8/10, inte spelkänsla)
MO003 Garden LOE       SHIPPED             (plant/harvest only — det ni ser nu)
Hub-first navigation   SHIPPED 2026-07-04  (nödlösning, inte vision)
Garden Play slice      EJ PÅBÖRJAD         (touch, water, butik = produktbeslut)
14 rum catalog         3 delvis / 12 draft
```

**Uppskattning:** ~15–20% av visionens spelupplevelse implementerad.

---

## 8. Tester agent bör köra

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# Se AGENTS.md — kör test:gate med NODE_ENV=test och REQUIRE_EMAIL_VERIFICATION=false
npm run test:gate
```

Relevanta filer: `test/garden-loe-integration.test.js`, `test/garden-playable-scene.test.js`, `test/morgonhus-playable.test.js`

**Obs:** Tester assertar **wayfinder-only** (inga hotspots) — ändring till touch-i-scen kräver testuppdatering.

---

## 9. Vision vs implementation (en rad)

| Vision (dokument) | Kod idag |
|-------------------|----------|
| Gå genom dörrar | Hub-meny med 3 knappar |
| Tryck i scenen | Wayfinder-knappar i header |
| Köp frön i butik | Finns inte (ingen shop API) |
| Vattna, sköta | Finns inte (`water` ej i pack) |
| Rensa ogräs | Ej i vision (straff) och ej i kod |
| Världen växer | En solros-SVG på bakgrund |

---

*Skapad: 2026-07-04 — för agent-till-agent handoff. Uppdatera vid större arkitekturändring.*
