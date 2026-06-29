# Build-loop MVP — 7 äventyr

Barn väljer **ett äventyr** vid första besök. Varje avklarad aktivitet i schemat ger ⭐ + **en byggdel** (🧩) till det aktiva projektet. När alla delar är samlade låses en **värld** upp där barnet leker vidare.

## De 7 MVP-äventyren

| # | Slug | Namn | Delar | Värld efter klart | Lek efter unlock |
|---|------|------|-------|-------------------|------------------|
| 1 | `racerbil` | Mecka med bilen | 6 | Garaget | Verktygsvägg, byt däck, tvätta, tuta, kör |
| 2 | `husdjur` | Ta hand om husdjur | 8 | Husdjurshemmet | Välj hund/katt/hamster/häst — mata, borsta, promenera |
| 3 | `dinosaurie` | Forska om dinosaurier | 10 | Dino-dalen | Gräv, borsta ben, montera skelett, läs fakta |
| 4 | `dockhus` | Dockor & dockhus | 8 | Dockhuset | Bygg rum, måla, inred, bjud in gäster |
| 5 | `fiske` | Fiska & båtliv | 8 | Båtkajen | Bygg spö/båt, kasta, dra, hala upp fisk |
| 6 | `laxor` | Läxor & lärande | 6 | Läxbordet | Bokstäver, siffror, läsa, skriva, matte (lek) |
| 7 | `vardag` | Vardagsäventyr | 6 | Mitt rum | Speglar aktivitetslistan: bädda säng, klä på dig, frukost, borsta tänder… |

## Koppling till aktiviteter (vardag + alla)

- **`vardag`**-projektet är direkt kopplat till familjens `activity_template` / dagliga schema.
- Varje avklarad aktivitet → `POST /api/me/build/part` (idempotent per logg-post) ökar `parts_collected`.
- Toast i barnvy: *"Du fick en del till [projekt]! 🧩"*
- **`laxor`** kan triggas av pedagog-/läxrelaterade aktiviteter eller egna övningsmoment.

## Tekniskt (nuvarande + plan)

### Implementerat
- `build_project_catalog` + `child_build_project` (migration `180892…`)
- MVP-katalog med 7 rader + metadata (`180893…`)
- Garaget för `racerbil` (verkstad, däckbyte, tvätt)
- `GET /api/me/build` — katalog + pågående projekt
- `POST /api/me/build/start` — välj äventyr
- `/child/adventures` — äventyrsväljare (kort)

### Sprint 2 (nästa)
- Part-grant på aktivitet klar (`daily-logs` → build)
- Första-besök-flöde: tvinga val om inget aktivt projekt
- Completion-ritual + unlock per `world_slug`
- Världsspecifika lekytor (husdjur, dino, …) — en i taget efter garage-MVP

### Sprint 3+
- Säsonger / fler projekt inom samma äventyrstyp
- AI-följe (inte Fas A)

## Designprinciper

- **Ett aktivt projekt** per barn (`child_build_project_one_active_idx`)
- **Samma visuella stil** som stilankare (navy, gold, lavender, Outfit)
- **Verktyg före resultat** — barn ska *göra* saker (skruva, dra, skrubba), inte bara trycka en knapp
- **Stjärnor** förblir föräldragodkända belöningar i Skattkammaren; byggdelar är separat progression
