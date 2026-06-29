# Build-loop MVP — 7 äventyr

> **⚠️ Authority:** [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md). Product: [`01_PRODUCT_PRINCIPLES.md`](01_PRODUCT_PRINCIPLES.md). Worlds: [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md).

> **Produktspec:** Se även [`build-mode-spec.md`](build-mode-spec.md) för BUILD MODE-teknisk index.

Barn väljer **ett äventyr** vid första besök. Varje avklarad aktivitet i schemat ger **både** ⭐ (Skattkammaren, föräldern) **och** **en byggdel** (🧩, barnets emotionella loop) till det aktiva projektet. När alla delar är samlade låses en **värld** upp där barnet leker vidare.

## De 7 MVP-äventyren

| # | Slug | Namn | Delar | Värld efter klart | Lek efter unlock |
|---|------|------|-------|-------------------|------------------|
| 1 | `racerbil` | Mecka med bilen | 75 | Garaget | Verktygsvägg, byt däck, tvätta, tuta, kör |
| 2 | `husdjur` | Ta hand om husdjur | 75 | Husdjurshemmet | Välj hund/katt/kanin/häst — mata, borsta, promenera |
| 3 | `dinosaurie` | Forska om dinosaurier | 75 | Dino-dalen | Gräv, borsta ben, montera skelett, läs fakta |
| 4 | `dockhus` | Dockor & dockhus | 75 | Dockhuset | Bygg rum, måla, inred, bjud in gäster |
| 5 | `fiske` | Fiska & båtliv | 75 | Båtkajen | Bygg spö/båt, kasta, dra, hala upp fisk |
| 6 | `laxor` | Läxor & lärande | 75 | Läxbordet | Bokstäver, siffror, läsa, skriva, matte (lek) |
| 7 | `vardag` | Vardagsäventyr | 75 | Mitt rum | Speglar aktivitetslistan: bädda säng, klä på dig, frukost, borsta tänder… |

## Koppling till aktiviteter (vardag + alla)

- **`vardag`**-projektet är direkt kopplat till familjens `activity_template` / dagliga schema.
- Varje avklarad aktivitet → `POST /api/me/build/part` (idempotent per logg-post) ökar `parts_collected`.
- Toast i barnvy: *"Du fick en del till [projekt]! 🧩"*
- **`laxor`** kan triggas av pedagog-/läxrelaterade aktiviteter eller egna övningsmoment.

## Tekniskt (nuvarande + plan)

### Implementerat
- `build_project_catalog` + `child_build_project` (migration `180892…`)
- MVP-katalog med 7 rader + metadata (`180893…`)
- **75 delar** per äventyr (`180895…`, `BUILD_PARTS_REQUIRED`)
- Garaget för `racerbil` (verkstad, däckbyte, tvätt)
- Delmål 15/30/45/60/75 + visuell byggscen på Idag (`src/lib/build-progress.js`, `child-build-hype.js`)
- Figur-guide + upplåsningsceremoni (`child-build-ceremony.js`)
- Världskarta i Min värld (`child-skatt-house.js` + `world_map` i API)
- `GET /api/me/build` — katalog + pågående projekt + world_map
- `POST /api/me/build/start` — välj äventyr
- `/child/adventures` — äventyrsväljare (kort)

### Sprint 2 (nästa)
- Part-grant på aktivitet klar (`daily-logs` → build)
- Första-besök-flöde: tvinga val om inget aktivt projekt
- Completion-ritual + unlock per `world_slug`
- **Handgjorda lek-världar** — en i taget, se [`build-play-worlds-spec.md`](build-play-worlds-spec.md). Husdjur (`/child/pet-home`) = pilot v2. Generisk `build-play-world` = shell för ej-byggda världar.

### Sprint 3+
- Säsonger / fler projekt inom samma äventyrstyp
- AI-följe (inte Fas A)

## Designprinciper

- **Dubbel belöningsloop** — stjärnor (förälder) + byggdelar (barn) från samma aktivitet; se [`build-mode-spec.md`](build-mode-spec.md)
- **Ett aktivt projekt** per barn (`child_build_project_one_active_idx`)
- **Samma visuella stil** som stilankare (navy, gold, lavender, Outfit)
- **Verktyg före resultat** — barn ska *göra* saker (skruva, dra, skrubba), inte bara trycka en knapp
- **Stjärnor** förblir föräldragodkända belöningar i Skattkammaren; byggdelar är separat progression
