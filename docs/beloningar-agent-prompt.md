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

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först
- POS: R-02, G-01, PA-06
- Commit + PR med Jenny-test-resultat

---

# Ditt mandat

Bygg **Belöningshubben** (`/rewards`) till 10/10.

**Vision > kod.** Ta bort förvirrande ingångar (särskilt `/skattkammaren` som hub-CTA).

---

# Scope

**Endast** `/rewards` hub + pending-approval presentation + copy.

Ändra inte barn-Skattkammare, bibliotekslogik eller Hem annat än synk av pending-state.

---

## Anti-patterns

- Skattkammaren som primär hub-länk för förälder
- Tom "inga väntande"-ruta
- Stjärn-IAP · syskonjämförelse
- Ny modal för godkännande om inline räcker

---

# Teknisk vägledning

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/rewards-hub.js` | Hub |
| `public/js/pending-approvals.js` | Godkännanden |
| `public/rewards.html` | Shell |
| `public/js/library.js` | Belöningsflik (`#rewards`) |

**Branch:** `cursor/for-dig-10-10-2c04`

---

# Sista instruktionen

Belöningar ska kännas som **brevlådan + verktygslådan** — först det som väntar, sedan var man sköter resten.
