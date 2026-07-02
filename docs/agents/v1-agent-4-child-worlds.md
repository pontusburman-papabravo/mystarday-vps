# Agent 4 — Child Worlds Completion

**Kopiera hela filen till en ny Cursor-agent.**  
**Program:** [v1-completion-program.md](../v1-completion-program.md)  
**Våg:** 1 (wiring) — **starta efter eller parallellt med Agent 6 assets**  
**Branch-prefix:** `cursor/v1-child-worlds-` + suffix `-ef46`

---

## Ditt mål

Barnvärldarna når **10/10** och index uppdateras till **Shipped** där klart.

---

## Beroende Agent 6

**Trädgården** (`garden-scene-bg`) och **decals** (`today-empty`, `celebration-frame`) måste finnas i `public/images/child/` innan du wire:ar Idag/Morgonhus.

Ordning: Agent 6 levererar binärer → du kopplar CSS/JS.

---

## Nuvarande läge (repo)

| Värld | Status i `child-worlds-index.md` | Kod |
|-------|----------------------------------|-----|
| Skattkammaren | Shipped | `resolveSkattState()` |
| Idag | GO | `resolveIdagState()`, `child-today-focus.js` |
| Mina personer | Tidig | `hall@2x` godkänd, ingen vision-implementation |

**Illustrationer:** `docs/child-image-assets.md` — decals *behöver iteration*, ej kopplade.

---

## Fil-ägarskap

```
public/js/child-today-focus.js
public/js/child-dashboard.js        (Idag-relaterat endast)
public/js/child-morgonhus.js
public/js/child-garden.js
public/js/child-skatt-house.js      (polish only)
public/css/child-*.css
public/child-dashboard.html
docs/child-worlds-index.md
docs/idag-vision.md                 (status-uppdatering)
test/idag-state.test.js
test/child-art-assets.test.js       (läs only — Agent 6 äger assets)
```

**Rör inte** (Agent 5):

- `public/js/child-first-star-mode.js`
- `public/js/onboarding.js`
- First Star gate-logik i `child-worlds-nav.js` (endast post-gate polish med koordination)

---

## PR-sekvens (3 PR)

### PR 1 — Idag decals + states

- Koppla `today-empty-v1@2x`, `today-celebration-frame-v1@2x` (efter Agent 6)
- Empty state + celebration ≤2s, skippbart (G-04, MO-03)
- Uppdatera `child-image-assets.md` status → `godkänd`
- Olle-test dokumenterat i PR

### PR 2 — Morgonhus garden

- Wire `garden-scene` från kanonisk path (migrera från `public/assets/worlds/garden/` om Agent 6 levererat)
- Lazy load via `child-world-bg-lazy.js` mönster
- Preload kritiska assets

### PR 3 — Mina personer minimum + index

- Skapa `docs/mina-personer-vision.md` (kort) om saknas
- Minimum UI: family hall + tom-state i barnmeny §3.5
- Uppdatera `child-worlds-index.md`: Idag + Skattkammaren → **Shipped**

---

## Olle-test (Idag)

Inom 5 sek, utan scroll:

1. Vad ska jag göra nu?
2. Vad får jag?
3. Vad är klart?
4. Vad händer sen?

Se `docs/idag-vision.md`.

---

## Definition of Done

- [ ] Idag decals kopplade och läsbara (reduced motion OK)
- [ ] Celebration ≤2s, blockerar inte exit
- [ ] Garden wired i Morgonhus
- [ ] Mina personer: vision + minimum implementation
- [ ] Index: Shipped markerat korrekt
- [ ] `npm run test:gate` grön
- [ ] Agent 7 child smoke sign-off

---

## Förbjudet

- Ny barnvärld utan godkänd vision
- Ändra First Star gate (Agent 5)
- Committa stora bilder utan Agent 6 registry-uppdatering

---

## Self-review

```
POS governed by: 03A, C-01, C-04, G-01, G-04
```
