# Agent 6 — Illustration & Assets

**Kopiera hela filen till en ny Cursor-agent.**  
**Program:** [v1-completion-program.md](../v1-completion-program.md)  
**Våg:** 1.5 — **starta före eller parallellt med Agent 4**  
**Branch-prefix:** `cursor/v1-assets-` + suffix `-ef46`

---

## Ditt mål

**Assets Complete** — registry, binärer, preload, SW precache synkade.

Du levererar **filer och registry**. Agent 4 wire:ar in i UI.

---

## Nuvarande läge (`docs/child-image-assets.md`)

| ID | Status |
|----|--------|
| De flesta huvudvyer | `godkänd` |
| `G1-today-empty` | `behöver iteration` — ej kopplad |
| `G2-celebration-frame` | `behöver iteration` — ej kopplad |
| `garden-scene-bg` | `saknas` (legacy path `public/assets/worlds/garden/`) |

---

## Fil-ägarskap

```
public/images/child/**
public/images/child/manifest.json
docs/child-image-assets.md
public/sw.js                    (precache entries — koordinera SW-regel)
config/cache-version.json
test/child-art-assets.test.js
scripts/capture-child-backgrounds.mjs  (om finns)
```

**Rör inte** (Agent 4 wire:ar):

- `child-today-focus.js`, `child-morgonhus.js` CSS url() — utom om du endast uppdaterar sökväg i samma PR som asset

---

## PR-sekvens (2 PR)

### PR 1 — Saknade binärer

- `garden-scene-bg` → kanonisk: `public/images/child/world/garden/` (eller path i registry)
- Decals: `today-empty-v1@2x.webp`, `today-celebration-frame-v1@2x.webp`
- Format: WebP @2x; PNG endast om WebP omöjligt
- Uppdatera registry status

### PR 2 — Registry + precache

- `manifest.json` synkad med filer på disk
- `public/sw.js` precache för nya assets
- `config/cache-version.json` bump (**koordinera**: andra ägare i Våg 1)
- `test/child-art-assets.test.js` uppdaterad

---

## Checklista per asset

1. Fil på sökväg i registry-tabellen
2. Status → `godkänd` (eller `v1.1-defer` med motivering)
3. Manifest entry
4. SW precache om kritisk above-fold
5. Retina: @2x minimum; srcset endast om fil stor

---

## Definition of Done

- [ ] Inga `saknas` i registry utan defer-notering
- [ ] Garden + decals committade
- [ ] Manifest + SW synkade
- [ ] `test/child-art-assets.test.js` grön
- [ ] Agent 4 notifierad (assets redo för wiring)
- [ ] Dark mode: läsbarhet verifierad på magic/barn-teman där asset används

---

## Lazy loading

Följ befintligt mönster: `public/js/child-world-bg-lazy.js` — Agent 4 implementerar wiring; du säkerställer att filer finns och manifest är korrekt.

---

## Förbjudet

- Ändra produktlogik i barn-dashboard
- Nya världar utan registry-rad
- SW bump utan version sync

---

## Self-review

```
POS governed by: 03A, 060-mobile-first (preload, perceived <200ms)
```
