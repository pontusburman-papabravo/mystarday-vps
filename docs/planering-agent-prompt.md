# Agent-uppdrag: Bygg Planering till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/planering-agent-prompt.md`  
**Produktvision:** [planering-vision.md](planering-vision.md)  
**Index (alla hubbar):** [parent-hubs-index.md](parent-hubs-index.md)

---

# Definition of Done

## Jenny-test

En förälder som aldrig sett Planering ska inom **5 sekunder**, **utan scroll**, svara:

1. **Vad kan jag göra här?**
2. **Var går jag för att ändra barnets vecka?**
3. **Var skapar jag en ny aktivitet?**

## Filterregel + beslutsregel

- **Filterregeln:** Varje länk/komponent måste hjälpa hitta rätt byggverktyg inom 5 sek
- **Beslutsregeln:** Högst en primär ingång per föräldrajobb — inget dagligt "nästa steg"

## Exit Rule

Föräldern ska kunna lämna Planering och säga: *jag vet vad jag kan göra här · jag vet vilken dörr som leder till mitt jobb · jag känner mig inte överväldigad*.

## Success Metrics (PR)

| Mål | Mått |
|-----|------|
| Jenny hittar rätt verktyg | < 5 sek |
| Ingen scroll för orientering | Ja |
| Synliga sektioner (basic) | ≤ 2 |
| Grundlänkar (basic) | ≤ ~8 |
| Tom-state | Alltid definierad |

## Ovanför-folden (iPhone SE)

Screenshot iPhone SE portrait (375×667) ska visa **utan scroll**:

- Sidrubrik + båda mentala gruppernas rubriker
- **Veckoschema**, **Bibliotek**, **Kalender** (med utfallscopy)

Se prioriteringsregeln i [planering-vision.md](planering-vision.md#ovanför-folden-iphone-se).


## Framgångskänsla

När föräldern lämnar Planering ska hen känna: *"Jag vet exakt vilken dörr jag ska gå igenom."*

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först
- Inga POS-brott
- Commit + PR med POS-citat och Jenny-test-resultat

---

# Ditt mandat

Bygg **Planeringshubben** (`/planning`) till 10/10 — inte omskriv hela `/schedule` eller `/library` om det inte behövs.

**Produktvisionen ([planering-vision.md](planering-vision.md)) är viktigare än befintlig länklista.**

Du ska kunna säga:

> *"Det här uppfyller inte filterregeln — det hjälper inte Jenny hitta rätt verktyg."*

---

# Stop Rule

Om hubben kräver fler än ~8 grundlänkar för att täcka basic — **gruppera eller dölj**, lägg inte till fler rader.

Nya funktioner: fråga *"Tillhör detta Bygg innehåll eller Planera vardagen?"* innan *"Var lägger vi en ny ruta?"*

Om en ändring kräver flytt av affärslogik från `/schedule` — dokumentera minimal arkitekturändring först.

---

# Scope

**Endast** `/planning` hub + copy/navigationsförbättringar som påverkar entrén.

Ändra inte Hem, Belöningar, Familj, För dig, eller schema-/bibliotekslogik annat än minimal copy/back-nav.

---

## Obligatoriska regler (från vision)

| Regel | Test |
|-------|------|
| **Filterregel** | Varje länk hjälper bygga innehåll eller planera vardagen |
| **Copy-regel** | Varje länk har underrad som svarar *"Vad händer när jag trycker?"* |
| **Prioriteringsregel** | Veckoschema → Bibliotek → Kalender → Bildarkiv → Övrigt |
| **Boendeschema-regel** | Sekundär/dold för enkelfamiljer utan växelvis boende |
| **Tom-state** | Ny familj ser *Kom igång* med Bibliotek + För dig |
| **Skalbarhetsregel** | Två mentala grupper — Övrigt tillåtet som tredje visuell sektion |

---

## Anti-patterns — bygg inte

- Fler länkar utan att ta bort någon (bryter beslutsregeln)
- Tekniska modulnamn i föräldratext
- Disabled "låsta" rader för opaketerade features
- Status/daglig överblick på hubben (→ Hem)
- Coachande språk (*"Testa …"*) — det hör hemma i För dig
- Ny route som duplicerar `/library`
- Boendeschema ovanför Veckoschema för enkelfamiljer

**Om du lägger till en länk ska en annan grupperas bort eller flyttas till detaljer.**

## Självgranskning innan du är klar

Gå igenom **varje länk** enligt priority ladder och fråga:

1. *"Vilket föräldrajobb hjälper denna ingång Jenny hitta?"* (filterregeln)
2. *"Finns det en dubbel ingång till samma jobb?"* (beslutsregeln)

---

# Produktvision (läs [planering-vision.md](planering-vision.md) för full version)

## Kärnregler

| Regel | En mening |
|-------|-----------|
| **Filterregel** | Hjälper komponenten hitta rätt byggverktyg inom 5 sek |
| **Beslutsregel** | Högst en primär ingång per föräldrajobb |
| **Copy-regel** | Planering = handlingar · Hem = läge · För dig = rekommendation |

## Priority Ladder

`Orientering → Bygg innehåll → Planera vardagen → Paket → Detaljer`

---

# Teknisk vägledning

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/planning-hub.js` | Hub-rendering |
| `public/js/planning-back-nav.js` | Tillbaka från undersidor |
| `public/js/nav-config.js` | Capabilities + placements |
| `public/planning.html` | Shell |
| `test/planning-back-nav.test.js` | Back-nav regression |
| `test/planning-hub-10-10.test.js` | Copy, order, custody, övrigt |

**Branch:** `cursor/hem-implementation-6752` (eller aktuell feature-branch)


**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Arbetsflöde

1. Läs vision + `planning-hub.js`
2. Jenny-test mot nuvarande hub (mobil viewport)
3. Märk länkar som bryter filterregel/beslutsregel
4. Verifiera filterregel + copy-regel på varje länk
5. Förbättra copy, gruppering, tom-state, boendeschema-placering
6. Screenshot iPhone SE — ovanför-folden-check
7. Verifiera back-nav från `/library` och `/schedule`
8. Jenny-test + success metrics
9. `npm run test:gate`
10. PR med screenshots (iPhone portrait)


---

# Sista instruktionen

Planering ska kännas som **en reception med två skyltar** — inte ett kontrollrum.

Färre ord. Tydligare grupper. Jenny ska hitta veckoschemat på tre sekunder.
