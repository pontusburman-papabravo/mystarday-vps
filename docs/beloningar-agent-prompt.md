# Agent-uppdrag: Bygg Belöningar till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/beloningar-agent-prompt.md`  
**Produktvision:** [beloningar-vision.md](beloningar-vision.md)  
**Index (alla hubbar):** [parent-hubs-index.md](parent-hubs-index.md)

---

# Kärnmetafor

> **Belöningar = brevlådan + verktygslådan.**

Först det som väntar (brevlådan). Sedan var man sköter resten (verktygslådan).

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

# Låsta regler (från vision)

## Prioritetsordning

```
1. Pending
2. Hantera
3. Stjärnor
4. Utveckling
```

Lägg aldrig statistik, tips eller rekommendationer ovanför pending.

## Pending

Räknas:

- belöning som väntar på godkännande (inlösen)
- målbyte som väntar på godkännande
- annat undantag som kräver manuellt vuxenbeslut

Räknas **inte**: nya stjärnor, statistik, tips, rekommendationer.

**Källa:** `GET /api/rewards/pending-requests` — samma data som Hem, inte duplicerad logik.  
**Tom state:** sektion dold — ingen "Inga väntande"-ruta.

## Överblick

Visa hur nära **varje barn** är sin nästa belöning. Ingen syskonjämförelse (R-02).

## Filterregel

En komponent hör hemma här bara om den hjälper föräldern att **godkänna**, **hantera** eller **förstå barnets belöningsläge**.

## Copy-regel

Beskriv vad som väntar, vad som finns, var du ändrar — **inte** hur duktigt barnet varit, motivation eller coachning.

## Hub-regel

Länka **aldrig** till `/skattkammaren` som primär CTA för inloggad förälder.

---

## Anti-patterns

- Skattkammaren som primär hub-länk för förälder
- Tom "inga väntande"-ruta
- Stjärn-IAP · syskonjämförelse
- Ny modal för godkännande om inline räcker
- Statistik/tips/rekommendation ovanför pending
- Motivations- eller coachningstext på hubben

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

Belöningar ska kännas som **brevlådan + verktygslådan** — först det som väntar, sedan var man sköter resten. Verifiera mot [beloningar-vision.md](beloningar-vision.md) § Prioritetsordning, Pending, Överblick, Filterregel och Copy-regel innan PR.
