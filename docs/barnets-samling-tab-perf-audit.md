# Barnets samling — prestandagenomlysning flikbyten

**Datum:** 2026-07-12  
**Symptom:** Flikbyten tar 4–9 sekunder (Min dag 9s, Skatt 4s, tillbaka 6s, Personer 7s). Min samling visar ibland inga stjärnsiffror.  
**Metod:** Statisk kodanalys + mätinstrument (`child-tab-profiler.js`). **Inga optimeringar** i detta steg.

---

## Executive summary

Din huvudmisstanke stämmer: **varje flik beter sig som en egen app**, inte som vyer i en SPA.

Rotorsaken är inte en enskild stor bild utan **`window.location.href` vid varje flikbyte** mellan `/child/today`, `/child/collection`, `/child/treasure` och `/child/family`. Det utlöser:

1. Full HTML-laddning (network-first i SW)
2. ~76 JavaScript-filer parsas och körs om
3. Hela boot-kedjan (`/api/features` → `/api/auth/me` → `view-config` → flikspecifik data)
4. Flikmodulens `refresh()` med `force` / `invalidate` / `innerHTML = ''`

**Uppskattad tidsfördelning per flikbyte (mobil 5G, kall cache):**

| Kostnad | Uppskattning | Andel |
|--------|--------------|-------|
| Full sidladdning + JS parse/exec | 2–5 s | **50–70 %** |
| Boot-API (features, me, view-config) | 0,3–1,2 s | 10–15 % |
| Flik-API (daily-log / rewards / universe / family) | 0,2–1,5 s | 10–20 % |
| DOM-render (innerHTML, stora träd) | 0,1–0,5 s | 5–10 % |
| Typsnitt + temabakgrund | 0,2–0,8 s | 5–10 % |

Med mätning på riktig enhet (se nedan) kan siffrorna preciseras på minuter.

---

## Arkitektur idag vs önskat

### Önskat (en barnapp)

```
boot (en gång)
  → gemensam session + cache
  → byt vy (show/hide + diff-render)
```

### Faktiskt (fyra mini-appar)

```
Klick flik
  → navigateWorld() ser olika pathname
  → window.location.href = '/child/collection'  ← FULL RELOAD
  → samma child-dashboard.html servas igen
  → 76 script-taggar körs om
  → DOMContentLoaded → init → loadDay / refresh / mount
```

Alla fyra routes servar **samma HTML-fil**:

```127:129:src/routes/index.js
  app.get('/child/today', (req, res) => res.sendFile(childDashboardHtml));
  app.get('/child/collection', (req, res) => res.sendFile(childDashboardHtml));
```

Navigeringen som tvingar reload:

```149:168:public/js/child-worlds-nav.js
  function navigateWorld(worldId) {
    ...
    if (onChildShell && currentPath !== targetPath) {
      window.location.href = world.href;
      return;
    }
```

`showTab()` gör bara `classList.toggle('hidden')` — men **nås ofta inte** för samling-flikarna eftersom `navigateWorld` redan redirectat.

---

## Topp 10 flaskhalsar (sorterade efter förväntad tidskostnad)

### 1. Full sidladdning vid varje flikbyte (KRITISK)

**Var:** `child-worlds-nav.js` → `navigateWorld()`  
**Bevis:** Olika `href` per värld (`/child/today`, `/child/collection`, …) → `location.href` när pathname skiljer sig.  
**Kostnad:** 2–5+ s (hela dokumentet + alla script).  
**Mönster du såg:** 4–9 s mellan *alla* flikar — exakt vad man förväntar sig vid hard navigation, inte SPA.

### 2. ~76 synkrona script-taggar per laddning

**Var:** `public/child-dashboard.html` (bottenblocket)  
**Bevis:** `grep -c 'script src='` → 76 filer; legacy-chunk (#653) tog bort ~20 för samling men **boot kostar fortfarande ~600+ KB JS** som måste parsas.  
**Kostnad:** 1–3 s CPU på mobil (parse + top-level exec), oberoende av nätverk.

### 3. Boot-API körs om vid varje flikbyte

**Var:** `child-dashboard.js` `DOMContentLoaded`  
**Kedja:**

| Anrop | När |
|-------|-----|
| `GET /api/features` | Varje reload |
| `GET /api/auth/me` | Varje reload |
| `GET /api/children/:id/view-config` | Varje reload |
| `GET /api/me/daily-log?date=…` | Idag-flik (boot) |
| `GET /api/me/goal` | Idag-flik (boot) |

**Kostnad:** 300–1200 ms nätverk (parallellt delvis efter #653).  
**SW hjälper inte:** `/api/*` är network-only i `public/sw.js` rad 709.

### 4. `rewardsLoaded = false` + `force: true` på Skattkammaren

**Var:** `child-dashboard.js` `showTab()` rad 230–235  

```223:240:public/js/child-dashboard.js
  if (isUniverse && ...) {
    ...
    window.rewardsLoaded = false;
    ...
    ChildTreasureView.refresh({ force: true });
```

**Var:** `child-dashboard-rewards.js` — `force` nollställer inflight och visar blocking loader.  
**Kostnad:** 3 parallella API (`/rewards`, `/goal`, `/manual-stars`) + full `innerHTML` render varje besök.  
**Förklarar:** Skatt ~4 s även utan “morgonhus”-detour.

### 5. Min samling: `ChildUniverse` saknas → tomma siffror (BUG + race)

**Var:** `child-samling-view.js`  

```56:70:public/js/child-samling-view.js
    if (window.ChildUniverse && typeof ChildUniverse.load === 'function') {
      ...
    }
    ...
    render(null, []);
```

`ChildUniverse` definieras i `child-universe-client.js`, som flyttades till **legacy-chunk** (#653) och **laddas inte** när `barnets_samling` är ON.

**Symptom:** Stjärnglas visar 0 / “fylls när du samlar” trots data i DB.  
**Race:** `mount.innerHTML = ''` direkt; om universe-path faller igenom renderas placeholder utan siffror — **ingen andra render**.

### 6. `ChildFamilyHall.refresh()` invalidarar cache varje gång

**Var:** `child-family-hall.js`  

```270:275:public/js/child-family-hall.js
  function refresh() {
    ...
    ChildFamily.invalidate();
    mount();
```

`ChildFamily.load()` har cache, men `invalidate()` töms **vid varje flikbesök** (+ `fetchFeatures()` igen).  
**Kostnad:** `/api/me/family` + `/api/features` + full `root.innerHTML` — förklarar Personer ~7 s.

### 7. Service Worker: HTML network-first, API network-only

**Var:** `public/sw.js`  
- HTML: network-first (väntar på server om nätverk finns)  
- `/api/*`: alltid `fetch`, ingen cache  
- JS/CSS: stale-while-revalidate (snabb andra gången, **inte** vid ny pathname-navigation om cache kall)

**Konsekvens:** Flikbyte = ny navigation entry → boot känns som “app start”, inte “vy-byte”.

### 8. Hel DOM-ersättning per flik (`innerHTML`)

| Modul | Beteende |
|-------|----------|
| `ChildSamlingView.refresh` | `mount.innerHTML = ''` → full render |
| `loadRewards` → `renderSkattkammaren` | `view.innerHTML = html` |
| `ChildFamilyHall.mount` | `root.innerHTML = renderLoading()` → `paint()` |

Ingen diff/patch. Stora HTML-strängar + reflow vid varje besök.

### 9. Idag: `loadDay` + N rating-anrop

**Var:** `child-dashboard-load-day.js`  
Efter `daily-log`: `loadRatingsForItems(unfetched)` — **ett GET per aktivitet** utan batch om rating saknas i loggen.  
**Kostnad:** 12 aktiviteter → upp till 12 extra requests vid kall Idag-boot.  
**Förklarar:** “Tillbaka till Min dag” 6–9 s om ratings inte cachas.

### 10. RenderBottomNav + temaresurser vid boot

**Var:** `child-worlds.js` `configureFromFeatures`, `ChildTheme.apply`  
- `renderBottomNav()` bygger om nav-DOM  
- Temabakgrund `background@2x.webp` (~680 KB) + 4 nav-ikoner  
**Kostnad:** 200–800 ms decode/network per cold boot (inte per soft tab — men **per full reload**).

---

## Flik-för-flik: vad som händer

### ☀️ Min dag (`/child/today`)

1. Full page load  
2. Boot API (features, me, view-config)  
3. `loadDay(today)` → daily-log + goal + ev. N× rating  
4. `renderActivities` → stort DOM  
5. `ChildTodayFocus.updateFromDailyLog`

### 🏆 Min samling (`/child/collection`)

1. Full page load (samma som ovan steg 1–3)  
2. `showTab('collection')` → `ChildSamlingView.refresh()`  
3. **ChildUniverse saknas** → `render(null, [])` → **saknade siffror**  
4. Om universe fanns: `GET /api/me/universe` + `GET /api/me/rewards`

### 🎁 Skattkammaren (`/child/treasure`)

1. Full page load  
2. Extra: treasure-path kan tvinga `location.href` även inom treasure (`child-worlds-nav.js` rad 151–155)  
3. `rewardsLoaded = false`, `loadRewards({ force: true })`  
4. 3 API + `renderSkattkammaren` innerHTML

### ❤️ Mina personer (`/child/family`)

1. Full page load  
2. `ChildFamilyHall.refresh()` → invalidate + `GET /api/me/family` + `GET /api/features`  
3. Full innerHTML paint

---

## Mätning på enhet (imorgon)

### Aktivera profiler

I Safari/Chrome konsol på barnsidan:

```js
localStorage.setItem('child_tab_profile', '1');
location.reload();
```

Byt flik som vanligt. I konsolen:

```js
console.table(window.__childTabProfile.summary());
```

Profiler loggar:

- `navigation_timing` (domContentLoaded, loadEventEnd)  
- Varje `Auth.api`-anrop med ms  
- `navigateWorld` med flaggan `fullPageReload: true`  
- `showTab`, `loadDay`, `ChildSamlingView.refresh`, etc.

**Förväntat i loggen:** `FULL PAGE RELOAD → /child/...` vid varje flikbyte.

### DevTools (komplement)

1. Network: filtrera `Doc` + `JS` + `Fetch` — räkna requests per flikbyte  
2. Performance: spela in ett flikbyte — leta efter `Parse HTML`, `Evaluate Script`, `fetch`  
3. Application → Service Workers: bekräfta att navigation inte återanvänder samma dokument

---

## Vad som INTE är huvudorsaken

| Misstanke | Bedömning |
|-----------|-----------|
| En enskild stor bild | Sekundär; tema ~680 KB men inte 9 s ensam |
| CSS-animationer | Irrelevant för flikbyte |
| SW cache på JS | Hjälper andra besök, inte ny navigation |
| Endast ett API | Flera API + full reload |

---

## Rekommenderad fixordning (nästa steg — ej gjort här)

1. **SPA-flikbyte:** Ta bort `location.href` i `navigateWorld` för samling — använd `history.pushState` + `showTab` (redan finns i `syncChildRoute`).  
2. **Boot en gång:** Session-cache i minnet (`window.__childBoot`) överlever inte reload — fix 1 löser det.  
3. **Flytta `child-universe-client.js` ur legacy-chunk** (eller samling-specifik loader) — fixar saknade siffror.  
4. **Sluta invalidate på family refresh** om data redan cachad.  
5. **Skatt:** behåll `_currentRewardsData`, `force` bara vid stale/event.  
6. **Rating-batch** i daily-log (redan delvis i API — utnyttja).  

**Förväntad effekt efter 1+3:** flikbyte **&lt; 500 ms** upplevt, boot **en gång** ~2–3 s.

---

## Filer i denna leverans

| Fil | Syfte |
|-----|--------|
| `docs/barnets-samling-tab-perf-audit.md` | Denna rapport |
| `public/js/child-tab-profiler.js` | Mätinstrument (inaktivt tills `child_tab_profile=1`) |

---

## Relaterade PR

- #653 — legacy-chunk (snabbare första Idag, men bröt `ChildUniverse` för samling)
