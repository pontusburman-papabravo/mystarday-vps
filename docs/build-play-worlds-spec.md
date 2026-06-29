# Lek-världar — spelspec (v2)

> **⚠️ Authority:** [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md). Engine: [`03_GAME_ENGINE.md`](03_GAME_ENGINE.md). Worlds: [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md).

> **Produktspec:** [`01_PRODUCT_PRINCIPLES.md`](01_PRODUCT_PRINCIPLES.md) — lek är belöning *efter* vardagen. **PixiJS** för alla interaktiva belöningsvärldar.

> **Kvalitetsribba:** Garaget (`build-garage.html` + verkstad) — mekanikreferens; **mål:** samma känsla i PixiJS-canvas.

## Varför v1 (generisk play-sida) är fel

`build-play-world.html` + `WorldEngine { hero, stats, actions[], toast() }` är ett **UI-skal**, inte ett barnspel. Det märks direkt för 4–10 år.

**Slopas** för alla världar utom tillfällig placeholder tills en riktig värld finns.

## Designprinciper

| Princip | v1 (fel) | v2 (mål) |
|---------|----------|----------|
| Interaktion | Klicka på knapp | Dra, släpp, skrubba, måla, bygg |
| Feedback | `+8 Happiness` | Animation, haptics, partiklar, figur reagerar |
| Progress | Siffror | Världen **syns** förändras (smuts, mat i skål, möbler på plats) |
| Grafik | Generisk SVG | Egen illustrerad scen per värld (CSS/SVG/PNG) |
| Återspelbarhet | Samma knapp | Små variationer, slump, förändring över tid |

Från `build-loop-mvp.md` (behålls):

- **Verktyg före resultat** — barn ska *göra* saker innan belöningen syns
- **Samma varumärkesfärger** (navy, gold, lavender, Outfit) men världen får egen ljushet/temperatur
- **Ett aktivt byggprojekt** → unlock → lek-värld

## Arkitektur

> **PixiJS** för alla interaktiva belöningsvärldar. HTML/JS app-skål monterar `<canvas>` och skickar auth/API. Se [`build-mode-spec.md` §6](build-mode-spec.md).

```
public/js/
  build-engine/              ← PixiJS BuildEngine (mål)
  worlds/pet-home/           ← husdjur (första Pixi-paket)
  play-world-save.js         ← delad persistence

public/                      ← DOM-piloter (migreras)
  build-garage.html
  build-pet-home.html
```

**Gemensamt (återanvänd):**

- `play-world-save.js` — API mot `/api/me/build/play/:slug` eller garage-endpoint
- `build-game-mobile.js` — touch, drag, haptics, partiklar
- Navigation (`build-play-hrefs.js`), unlock via `child_build_project`
- Auth / preview (`?preview=1`)

**Unikt per värld:**

- HTML, CSS, JS, state machine, verktyg, sprites, ljud, animationer

### Världsstatus

| Slug | Route | Status | Mekanik |
|------|-------|--------|---------|
| `racerbil` | `/child/garage` | **live** | Verkstad, däck, tvätt |
| `husdjur` | `/child/pet-home` | **live** (v2) | Mat-skål, borsta, boll, filt |
| `dinosaurie` | — | planned | Gräv, borsta, skelett, ägg |
| `dockhus` | — | planned | Möbler, måla, dammsuga |
| `fiske` | — | planned | Kasta, dra in, båt |
| `laxor` | — | planned | Bokstäver, matte (lek) |
| `vardag` | — | planned | Rum speglar schema |
| `tradgard` | — | future | Plantera, vattna, skörda |

## Husdjurshemmet (pilot)

**Scen:** Mysigt rum (golv, fönster, korg).

**Verktyg & interaktion:**

1. **Matpåse → skål** — dra påsen till skålen, fyll skålen (synlig mat)
2. **Skål → djur** — dra skålen till djuret, ät-animation, hunger upp
3. **Borste** — välj borste, skrubba pälsen (dra fingret), smuts försvinner gradvis
4. **Boll** — dra och släpp mot djur, djuret hoppar/springer
5. **Klappa** — tryck på djuret, hjärtan + svans/vift
6. **Filt** — dra över tröttt djur, sov-animation (zzz)

**Djuret reagerar:** blink, hopp, spin, skäll/wow-ljud (haptics), blir smutsigt/hungrigt över tid.

**Djurval:** hund (`build-pet-hero.png` facit), katt, kanin, häst — SVG tills egna PNG-facit finns.

## Dino (nästa)

Gräv fossiler, borsta sand, montera skelett, kläck ägg, mata unge — **inte** «Mata dinosaurien»-knapp.

## Dockhus (nästa)

Dra möbler, häng tavlor, måla väggar, dammsuga — **inte** «Städa rum».

## Trädgård (framtida äventyr)

Plantera frön, gräv, vattna, ogräs, skörda.

## API

Befintlig `child_build_project.customization` JSONB lagrar världsspecifikt state per slug. Server normaliserar/clampar — **ingen** gemensam action-engine på servern för v2-världar.

```
GET  /api/me/build/play/husdjur
PATCH /api/me/build/play/husdjur  { ...petState }
```

## Definition of done (en värld)

- [ ] Barn 4–10 kan spela 3+ min utan att tröttna på «samma knapp»
- [ ] Minst 3 distinkta interaktionstyper (drag, skrubba, …)
- [ ] Världen ser annorlunda ut **innan** och **efter** omsorg
- [ ] Fungerar på mobil 390px + preview + sparad session
- [ ] Smoke-test eller manuell checklista i PR
