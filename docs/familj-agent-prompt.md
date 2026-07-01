# Agent-uppdrag: Bygg Familj till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/familj-agent-prompt.md`  
**Produktvision:** [familj-vision.md](familj-vision.md)  
**Index (alla hubbar):** [parent-hubs-index.md](parent-hubs-index.md)

---

# Definition of Done

## Jenny-test

En förälder som aldrig sett Familj ska inom **5 sekunder**, **utan scroll**, svara:

1. **Vilka barn har vi i appen?**
2. **Hur bjuder jag in en annan vuxen?**
3. **Var klickar jag för att se Astrids detaljer?**

## Filterregel + beslutsregel

- **Filterregeln:** Varje komponent måste hjälpa hitta, administrera eller öppna en person inom 5 sek
- **Beslutsregeln:** Högst en primär åtgärd per sektion — inga konto-/appinställningar

## Exit Rule

Föräldern ska kunna lämna Familj och säga: *jag vet vilka som ingår · jag vet hur jag bjuder in · jag kan nå rätt barns detaljer med ett tryck*.

## Success Metrics (PR)

| Mål | Mått |
|-----|------|
| Jenny ser vilka som ingår | < 5 sek |
| Ingen scroll för orientering | Ja |
| Hub-sektioner synliga | ≤ 3 |
| Primär åtgärd per sektion | ≤ 1 |
| Barnprofil nåbar | 1 tryck |

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först
- POS: P-04, C-01
- Commit + PR med Jenny-test-resultat

---

# Ditt mandat

Bygg **Familjehubben** och **barnprofilen** till 10/10 — ren "vem är med"-yta.

**Vision > legacy drawer.**

Du ska kunna säga:

> *"Det här uppfyller inte filterregeln — det hjälper inte hitta, administrera eller öppna en person."*

---

# Stop Rule

Om barnprofil kräver ny backend — minimal route + redirect först. Bryt inte `test:gate`.

Om inställningar fortfarande bor på `/family` — flytta till `/settings` innan du lägger till nytt.

---

# Scope

`/family`, `/family/child/:id`, redirects från `/child-settings`.

Ändra inte Hem, Planering, Belöningar, För dig.

---

## Anti-patterns

- Push/GDPR/radera på Familj-sidan (→ Inställningar)
- Flera primära åtgärder i samma sektion (bryter beslutsregeln)
- Drawer som enda barn-UX utan profil-route
- Ny bottenflik för pedagog
- Barnformulär i barnläge (C-01)
- Museum eller familjekista ovanför barnlistan (bryter priority ladder)

## Självgranskning innan du är klar

Gå igenom **varje sektion** enligt priority ladder och fråga:

1. *"Hjälper detta hitta, administrera eller öppna en person?"* (filterregeln)
2. *"Hör detta hemma i Inställningar i stället?"* (beslutsregeln)

---

# Produktvision (läs [familj-vision.md](familj-vision.md) för full version)

## Kärnregler

| Regel | En mening |
|-------|-----------|
| **Filterregel** | Hjälper komponenten hitta, administrera eller öppna en person |
| **Beslutsregel** | Högst en primär åtgärd per sektion — inga appinställningar |
| **Copy-regel** | Familj = människor · Barnprofil = barnets värld · Inställningar = konto |

## Priority Ladder

`Barn → Vuxna → Pedagoger → Familjenivå → Museum`

---

# Teknisk vägledning

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/family.js` | Familjehub |
| `public/family.html` | Shell |
| `public/js/deep-link-router.js` | child-settings redirect |
| `public/js/nav-config.js` | Pedagog capability |
| `src/routes/family/members.js` | Inbjudan, barn |

**Branch:** `cursor/hem-vision-docs-6752` (eller aktuell feature-branch)

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Arbetsflöde

1. Läs vision + `family.js` + barnprofil-route
2. Jenny-test mot nuvarande hub
3. Flytta inställningsbrus till `/settings` om det finns kvar
4. Implementera barnprofil som kanonisk destination
5. Jenny-test + success metrics
6. `npm run test:gate`
7. PR med screenshots

---

# Sista instruktionen

Familj ska kännas som **klasslistan** — inte kontrollpanelen för hela appen.

Tre sektioner. Tydliga kort. Ett tryck till barnets värld.
