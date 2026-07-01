# Barnbilder — asset-register

**Syfte:** En sanningskälla för **filer + mapping** till barn-UI. Agenterna behöver denna lista — inte sex separata historiker.

**Repo-struktur:** `public/images/child/` (kanonisk för nya leveranser)  
**Art Bible naming (källa):** `stjarndag-{world}-{asset}-v{n}-@2x.webp` — vid export, döp om till kort runtime-namn i tabellen nedan eller behåll fullt namn i `source/`-mapp utanför `public/`.

**Deploy:** När binärfiler committas → bump `public/sw.js` + `config/cache-version.json`.

**Status:** `saknas` · `behöver iteration` · `godkänd`

---

## Register

| ID | Vy | Filnamn (runtime @2x) | Repo-sökväg | Var i appen | Status |
|----|-----|----------------------|-------------|-------------|--------|
| `today-bg` | Idag | `bg@2x.webp` | `public/images/child/today/bg@2x.webp` | Bakgrund Idag (planerad; idag CSS-gradient i `child-today-focus.css`) | saknas |
| `world-hub-castle` | Min värld | `hub-castle@2x.webp` | `public/images/child/world/hub-castle@2x.webp` | Skattkammaren hub (`child-skatt-house.js` — idag emoji-kort) | saknas |
| `world-room-chest` | Min värld / rum `chest` | `chest@2x.webp` | `public/images/child/world/rooms/chest@2x.webp` | Stjärnkistan (`child-skatt-house.js`) | saknas |
| `world-room-shop` | Min värld / rum `shop` | `shop@2x.webp` | `public/images/child/world/rooms/shop@2x.webp` | Butiken | saknas |
| `world-room-dreams` | Min värld / rum `dreams` | `dreams@2x.webp` | `public/images/child/world/rooms/dreams@2x.webp` | Drömvägg | saknas |
| `world-room-trophy` | Min värld / rum `trophy` | `trophy@2x.webp` | `public/images/child/world/rooms/trophy@2x.webp` | Troférum | saknas |
| `world-room-shelf` | Min värld / rum `shelf` | `shelf@2x.webp` | `public/images/child/world/rooms/shelf@2x.webp` | Belöningshylla | saknas |
| `world-room-collections` | Min värld / rum `collections` | `collections@2x.webp` | `public/images/child/world/rooms/collections@2x.webp` | Samlingar | saknas |
| `world-room-story` | Min värld / rum `story` | `story@2x.webp` | `public/images/child/world/rooms/story@2x.webp` | Historiebok | saknas |
| `world-room-avatar` | Min värld / rum `avatar` | `avatar@2x.webp` | `public/images/child/world/rooms/avatar@2x.webp` | Min avatar | saknas |
| `world-room-pet` | Min värld / rum `pet` | `pet@2x.webp` | `public/images/child/world/rooms/pet@2x.webp` | Husdjur | saknas |
| `world-room-museum` | Min värld / rum `museum` | `museum@2x.webp` | `public/images/child/world/rooms/museum@2x.webp` | Museum | saknas |
| `family-hall` | Mina personer | `hall@2x.webp` | `public/images/child/family/hall@2x.webp` | Familjehall V0 (`child-family-hall.js` — idag ren CSS) | saknas |
| `morgonhus-scene` | Morgonhus | `scene@2x.webp` | `public/images/child/morgonhus/scene@2x.webp` | Morgonhuset (`child-morgonhus.css` `.mh-scene-bg` — idag gradient) | saknas |
| `garden-scene-bg` | Morgonhus → Trädgården | `scene-bg.webp` (+ srcset) | **Legacy:** `public/assets/worlds/garden/` | `child-garden.js`, `garden-asset-pipeline.js`, SW precache | saknas |

### Rum-ID (Min värld)

Källa: `BASE_ROOMS` i `child-skatt-house.js` — `chest`, `dreams`, `trophy`, `shelf`, `collections`, `story`, `avatar`, `pet`, `museum`, `shop`.

---

## Export (leverans till repo)

1. **Format:** WebP föredras; PNG @2x om WebP inte går (konvertera vid commit).
2. **Upplösning:** @2x räcker ofta för mobil; lägg srcset-varianter endast när filen är stor (se garden-mönstret).
3. **Innan agent kodar:** Ladda ner från ChatGPT/illustratör → committa till sökväg i tabellen → uppdatera **Status** här.
4. **Efter commit:** SW-bump + ev. uppdatera CSS/JS `url()` eller asset-pipeline manifest.

---

## Legacy vs kanonisk sökväg

| Område | Kanonisk (ny) | Legacy (kod idag) |
|--------|---------------|-------------------|
| Trädgården | `public/images/child/world/garden/` (framtida) | `public/assets/worlds/garden/` |
| Övriga barnvyer | `public/images/child/{vy}/` | CSS-gradient / emoji |

Migrera legacy-sökvägar när filerna finns i `public/images/child/` — en PR per vy, minimal diff.

---

## Relaterat

- [child-worlds-index.md](child-worlds-index.md) — produktvisioner Idag / Skattkammaren / Mina personer
- [barnmeny-v2.md](barnmeny-v2.md) §5 — rum och vyer
- Art Bible §14 — `stjarndag-{world}-{asset}-v{n}-@2x` (källfilnamn)

*Senast uppdaterad: 2026-07-01*
