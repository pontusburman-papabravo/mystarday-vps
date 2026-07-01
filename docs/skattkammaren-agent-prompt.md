# Agent-uppdrag: Bygg Skattkammaren (barn) till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/skattkammaren-agent-prompt.md`  
**Produktvision:** [skattkammaren-vision.md](skattkammaren-vision.md)  
**Mockup:** [mockups/beloningar.html](mockups/beloningar.html)  
**Förälder (parallell):** [beloningar-vision.md](beloningar-vision.md)

---

# Definition of Done

## Olle-test

Ett barn (eller testare i barnvy) som öppnar Skattkammaren ska inom **5 sekunder**, **utan scroll**, svara:

1. **Hur många stjärnor har jag?**
2. **Vad sparar jag till?**
3. **Kan jag göra något här?**

## Filterregel + beslutsregel

- **Filterregeln:** Varje komponent ovanför fold måste hjälpa förstå stjärnor, mål eller belöningsläget inom 5 sek
- **Beslutsregeln:** Högst en primär handling synlig — lösa in eller välj mål dominerar utforskning

## Exit Rule

Barnet ska kunna lämna Skattkammaren och säga: *jag vet hur många stjärnor jag har · jag vet vad jag sparar till · jag vet om jag kan fråga om en belöning*.

## Success Metrics (PR)

| Mål | Mått |
|-----|------|
| Olle ser stjärnor | < 5 sek |
| Olle ser mål | < 5 sek |
| Primära handlingar synliga | ≤ 1 |
| Tom-state utan brus | Ja |
| Pending synkad med förälder | Samma `reward_redemption` |

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först (portrait, 44pt barnmål)
- POS: C-01, C-03, G-01, G-04, R-02
- Commit + PR med Olle-test-resultat + screenshots

---

# Ditt mandat

Bygg **barnets Skattkammaren** (`renderSkattkammaren` / `#rewards`-fliken) till 10/10.

**Vision > kod.** Ta bort dubblerad UI (grid + *Du har råd nu!*-remsa, tom troféhylla).

Du ska kunna säga:

> *"Det här uppfyller inte filterregeln — det hjälper inte barnet med stjärnor, mål eller handling."*

---

# Scope

**Endast** barnets belöningsvy: `child-dashboard-rewards.js`, tillhörande CSS, `child-rewards-engine.js` banners.

Ändra inte förälder `/rewards`, bibliotek eller Idag-fliken annat än delad pending-data.

---

## Anti-patterns

- Flera *Fråga*-knappar synliga samtidigt
- Tom troféhylla med placeholder-text
- Schema eller checklist i Skattkammaren
- Syskonjämförelse · stjärn-IAP
- Skuldbeläggande vid nekad belöning
- Firande som blockerar >2s (G-04)

## Självgranskning innan du är klar

Gå igenom **varje sektion** enligt priority ladder och fråga:

1. *"Hjälper detta med stjärnor, mål eller handling?"* (filterregeln)
2. *"Är detta den enda primära knappen just nu?"* (beslutsregeln)

---

# Produktvision (läs [skattkammaren-vision.md](skattkammaren-vision.md) för full version)

## Kärnregler

| Regel | En mening |
|-------|-----------|
| **Filterregel** | Hjälper komponenten barnet förstå stjärnor, mål eller belöningsläget |
| **Beslutsregel** | Högst en primär handling — lösa in eller välj mål först |
| **Status** | Pending/denied är informativt, inte primär handling |
| **Copy-regel** | Stjärnburken + Belöningar — inte vuxenhubb-språk |

## Priority Ladder

`Primär handling → Stjärnburken → Belöningar → Status → Utforskning`

---

# Teknisk vägledning

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/child-dashboard-rewards.js` | Render, inlösen, mål |
| `public/js/child-rewards-engine.js` | Goal progress, pending banner |
| `public/child-dashboard.html` | Skatt-CSS |
| `docs/mockups/beloningar.html` | Visuell målbild |

**Branch:** `cursor/skattkammaren-barn-10-10-87ba` (eller aktuell feature-branch)

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Arbetsflöde

1. Läs vision + mockup + `child-dashboard-rewards.js`
2. Olle-test (med mål, utan mål, med pending)
3. Verifiera priority ladder och en primär knapp
4. Implementera — ta bort lika mycket som du lägger till
5. Olle-test + success metrics
6. `npm run test:gate`
7. PR med screenshots (iPhone portrait)

---

# Sista instruktionen

Skattkammaren ska kännas som **stjärnburken + drömmen** — först hur många stjärnor, sedan hur nära målet, sedan en tydlig väg att fråga.
