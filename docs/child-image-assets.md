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
| `today-bg` | Idag | `bg@2x.webp` | `public/images/child/today/bg@2x.webp` | `child-world-bg.css` → `.cwb-today` | godkänd |
| `world-hub-bg` | Min värld | `hub@2x.webp` | `public/images/child/world/hub@2x.webp` | `child-world-bg.css` → `.cwb-world` | godkänd |
| `world-hub-castle` | Min värld / tema `castle` | `hub-castle@2x.webp` | `public/images/child/world/hub-castle@2x.webp` | `child-skatt-house.css` → `.skatt-theme-castle` | godkänd |
| `world-hub-treehouse` | Min värld / tema `treehouse` | `hub-treehouse@2x.webp` | `public/images/child/world/hub-treehouse@2x.webp` | `child-skatt-house.css` → `.skatt-theme-treehouse` | godkänd |
| `world-hub-space` | Min värld / tema `space` | `hub-space@2x.webp` | `public/images/child/world/hub-space@2x.webp` | `child-skatt-house.css` → `.skatt-theme-space` | godkänd |
| `world-room-chest` | Min värld / rum `chest` | `chest@2x.webp` | `public/images/child/world/rooms/chest@2x.webp` | `child-skatt-rooms.css` → Stjärnkistan | godkänd |
| `world-room-shop` | Min värld / rum `shop` | `shop@2x.webp` | `public/images/child/world/rooms/shop@2x.webp` | `child-skatt-rooms.css` → Butiken | godkänd |
| `world-room-dreams` | Min värld / rum `dreams` | `dreams@2x.webp` | `public/images/child/world/rooms/dreams@2x.webp` | `child-skatt-rooms.css` → Drömvägg | godkänd |
| `world-room-trophy` | Min värld / rum `trophy` | `trophy@2x.webp` | `public/images/child/world/rooms/trophy@2x.webp` | `child-skatt-rooms.css` → Troférum | godkänd |
| `world-room-shelf` | Min värld / rum `shelf` | `shelf@2x.webp` | `public/images/child/world/rooms/shelf@2x.webp` | `child-skatt-rooms.css` → Belöningshylla | godkänd |
| `world-room-collections` | Min värld / rum `collections` | `collections@2x.webp` | `public/images/child/world/rooms/collections@2x.webp` | `child-skatt-rooms.css` → Samlingar | godkänd |
| `world-room-story` | Min värld / rum `story` | `story@2x.webp` | `public/images/child/world/rooms/story@2x.webp` | `child-skatt-rooms.css` → Historiebok | godkänd |
| `world-room-avatar` | Min värld / rum `avatar` | `avatar@2x.webp` | `public/images/child/world/rooms/avatar@2x.webp` | `child-skatt-rooms.css` → Min avatar | godkänd |
| `world-room-pet` | Min värld / rum `pet` | `pet@2x.webp` | `public/images/child/world/rooms/pet@2x.webp` | `child-skatt-rooms.css` → Husdjur | godkänd |
| `world-room-museum` | Min värld / rum `museum` | `museum@2x.webp` | `public/images/child/world/rooms/museum@2x.webp` | `child-skatt-rooms.css` → Museum | godkänd |
| `family-hall` | Mina personer | `hall@2x.webp` | `public/images/child/family/hall@2x.webp` | `child-world-bg.css` → `.cwb-family` | godkänd |
| `morgonhus-scene` | Morgonhus | `scene@2x.webp` | `public/images/child/morgonhus/scene@2x.webp` | `child-morgonhus.css` → `.mh-scene.is-illustrated` | godkänd |
| `G1-today-empty` | Idag | `today-empty-v1@2x.webp` | `public/images/child/decals/today-empty-v1@2x.webp` | `child-today-focus.css` → `.ctf-empty-illus` | godkänd |
| `G2-celebration-frame` | Idag / firande | `today-celebration-frame-v1@2x.webp` | `public/images/child/decals/today-celebration-frame-v1@2x.webp` | Firande-overlay ≤2 s → `.ctf-celebration-frame` | godkänd |
| `garden-scene-bg` | Morgonhus → Trädgården | `scene-bg.webp` (+ srcset) | `public/images/child/world/garden/` | `garden-asset-pipeline.js`, `child-garden.js` | godkänd |
| `memory-hall-scene` | Minnesrummet | `scene@2x.webp` (+ srcset) | `public/images/child/world/memory-hall/` | `child-memory-hall.css` → `.mu-scene.is-illustrated` | saknas |
| `memory-hall-frame-empty` | Minnesrummet / tom ram | `frame-empty@2x.webp` | `public/images/child/world/memory-hall/` | Exhibit slot fallback | saknas |
| `memory-hall-frame-glow` | Minnesrummet / fylld ram | `frame-glow@2x.webp` | `public/images/child/world/memory-hall/` | Exhibit slot filled state | saknas |

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
| Trädgården | `public/images/child/world/garden/` | `public/assets/worlds/garden/` (fallback en deploy) |
| Övriga barnvyer | `public/images/child/{vy}/` | CSS-gradient / emoji |

Migrera legacy-sökvägar när filerna finns i `public/images/child/` — en PR per vy, minimal diff.

---

## Relaterat

- [child-worlds-index.md](child-worlds-index.md) — produktvisioner Idag / Skattkammaren / Mina personer
- [barnmeny-v2.md](barnmeny-v2.md) §5 — rum och vyer
- Art Bible §14 — `stjarndag-{world}-{asset}-v{n}-@2x` (källfilnamn)
- [art-specs/memory-hall-bl041.md](art-specs/memory-hall-bl041.md) — Minnesrummet scene spec (BL-041)

*Senast uppdaterad: 2026-07-03*
