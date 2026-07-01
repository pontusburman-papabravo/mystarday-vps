# Agent-uppdrag: Bygg Belöningar till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/beloningar-agent-prompt.md`  
**Produktvision:** [beloningar-vision.md](beloningar-vision.md)  
**Index (alla hubbar):** [parent-hubs-index.md](parent-hubs-index.md)

---

# Definition of Done

## Jenny-test

En förälder som aldrig sett Belöningar ska inom **5 sekunder**, **utan scroll**, svara:

1. **Väntar något på mig?**
2. **Var ändrar jag vilka belöningar som finns?**
3. **Var ser jag barnets stjärnor?**

## Filterregel + beslutsregel

- **Filterregeln:** Varje komponent måste hjälpa godkänna, hantera eller förstå belöningsläget inom 5 sek
- **Beslutsregeln:** Högst en primär handling synlig — godkännanden dominerar alltid

## Exit Rule

Föräldern ska kunna lämna Belöningar och säga: *jag vet om något väntar · jag vet var belöningar hanteras · jag vet hur barnets stjärnor ser ut*.

## Success Metrics (PR)

| Mål | Mått |
|-----|------|
| Jenny ser om något väntar | < 5 sek |
| Ingen scroll för beslut | Ja |
| Primära handlingar synliga | ≤ 1 |
| Tom-state utan brus | Ja |
| Pending synkad med Hem | Samma datakälla |

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först
- POS: R-02, G-01, PA-06
- Commit + PR med Jenny-test-resultat

---

# Ditt mandat

Bygg **Belöningshubben** (`/rewards`) till 10/10.

**Vision > kod.** Ta bort förvirrande ingångar (särskilt `/skattkammaren` som hub-CTA).

Du ska kunna säga:

> *"Det här uppfyller inte filterregeln — det hjälper inte med godkänna, hantera eller följa."*

---

# Scope

**Endast** `/rewards` hub + pending-approval presentation + copy.

Ändra inte barn-Skattkammare, bibliotekslogik eller Hem annat än synk av pending-state.

---

## Anti-patterns

- Skattkammaren som primär hub-länk för förälder
- Tom "inga väntande"-ruta (dölj sektionen i stället)
- Stjärn-IAP · syskonjämförelse
- Flera primära handlingar synliga (bryter beslutsregeln)
- Schema eller familjeadmin på hubben
- Ny modal för godkännande om inline räcker

## Självgranskning innan du är klar

Gå igenom **varje sektion** enligt priority ladder och fråga:

1. *"Hjälper detta godkänna, hantera eller följa?"* (filterregeln)
2. *"Är detta den enda primära handlingen just nu?"* (beslutsregeln)

---

# Produktvision (läs [beloningar-vision.md](beloningar-vision.md) för full version)

## Kärnregler

| Regel | En mening |
|-------|-----------|
| **Filterregel** | Hjälper komponenten godkänna, hantera eller förstå belöningsläget |
| **Beslutsregel** | Högst en primär handling — godkännanden först |
| **Undantag** | Pending redemption som kräver vuxenbeslut nu |
| **Copy-regel** | Belöningar = belöningsläge · inte Skattkammaren som hub-CTA |

## Priority Ladder

`Godkännanden → Hantera → Följa → Utveckling → Paket`

---

# Teknisk vägledning

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/rewards-hub.js` | Hub |
| `public/js/pending-approvals.js` | Godkännanden |
| `public/rewards.html` | Shell |
| `public/js/library.js` | Belöningsflik (`#rewards`) |
| `public/js/home-readiness.js` | Synk med Hem-undantag |

**Branch:** `cursor/hem-vision-docs-6752` (eller aktuell feature-branch)

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Arbetsflöde

1. Läs vision + `rewards-hub.js` + pending-flöde
2. Jenny-test (med och utan pending)
3. Verifiera priority ladder och synk med Hem
4. Implementera — ta bort lika mycket som du lägger till
5. Jenny-test + success metrics
6. `npm run test:gate`
7. PR med screenshots

---

# Sista instruktionen

Belöningar ska kännas som **brevlådan + verktygslådan** — först det som väntar, sedan var man sköter resten.
