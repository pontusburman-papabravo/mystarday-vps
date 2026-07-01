# Agent-uppdrag: Bygg Skattkammaren (barn) till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/skattkammaren-agent-prompt.md`  
**Produktvision (teknikagnostisk):** [skattkammaren-vision.md](skattkammaren-vision.md)  
**Mockup:** [mockups/beloningar.html](mockups/beloningar.html)  
**Förälder (parallell):** [beloningar-vision.md](beloningar-vision.md)

---

# Definition of Done

## Olle-test

Ett barn (eller testare i barnvy) som öppnar Skattkammaren ska inom **5 sekunder**, **utan scroll**, svara:

1. **Hur många stjärnor har jag?**
2. **Vad sparar jag till?**
3. **Kan jag göra något här?**
4. **Vad är nästa steg?**

## Filterregel + beslutsregel

- **Filterregeln:** Varje komponent ovanför fold måste hjälpa förstå stjärnor, mål eller belöningsläget inom 5 sek
- **Beslutsregeln:** Högst en primär handling synlig — möjligheten att lösa in eller välja mål prioriteras före utforskning

## Exit Rule

Barnet ska kunna lämna Skattkammaren och säga: *jag vet hur många stjärnor jag har · jag vet vad jag sparar till · jag vet om jag kan fråga om en belöning · jag vet vad nästa steg är*.

## Success Metrics (PR)

| Mål | Mått |
|-----|------|
| Olle ser stjärnor | < 5 sek |
| Olle ser mål | < 5 sek |
| Olle vet nästa steg | < 5 sek |
| Primära handlingar synliga | ≤ 1 |
| Tom-state utan brus | Ja (ingen tom trofésektion) |
| Pending synkad med förälder | Samma `reward_redemption` |
| Tillståndsmaskin följd | Tabell i vision § Tillståndsmaskin |

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först (portrait, 44pt barnmål)
- POS: C-01, C-03, G-01, G-04, R-02
- Commit + PR med Olle-test-resultat + screenshots

---

# Ditt mandat

Bygg **barnets Skattkammaren** till 10/10 enligt [skattkammaren-vision.md](skattkammaren-vision.md).

**Vision > kod.** Ta bort dubblerad UI (grid + *Du har råd nu!*-remsa, tom trofésektion).

Du ska kunna säga:

> *"Det här uppfyller inte filterregeln — det hjälper inte barnet med stjärnor, mål eller handling."*

---

# Scope

**Endast** barnets belöningsvy (se nyckelfiler nedan).

Ändra inte förälder `/rewards`, bibliotek eller Idag-fliken annat än delad pending-data.

**Routes idag:** `/child-dashboard#rewards` · framtida `/child/world` (barnmeny v2) · demo `/skattkammaren?demo=1`

---

## Anti-patterns

Se vision § *Vanliga felidéer* och § *Vad som ska bort*. Implementation:

- Flera *Fråga*-knappar synliga samtidigt
- Tom trofésektion med placeholder-text
- Schema eller checklist i Skattkammaren
- Syskonjämförelse · stjärn-IAP
- Skuldbeläggande vid nekad belöning
- Status som ser ut som primär CTA
- Firande som blockerar >2s (G-04)

## Självgranskning innan du är klar

1. *"Hjälper detta med stjärnor, mål eller handling?"* (filterregeln)
2. *"Är detta den enda primära knappen just nu?"* (beslutsregeln)
3. *"Matchar detta tillståndsmaskinen?"* (vision § Tillståndsmaskin)

---

# Tillståndsmaskin → kod

Implementera enligt visionens tabell. Pseudologik:

```
if (!goal)           → primary = "Välj mitt mål"
else if (canAfford && !pending) → primary = "Fråga om att lösa in"
else if (pending)    → status only, primary = none
else if (denied)     → status only, primary = none
else                 → collect hint, primary = none
```

Hero uppdateras alltid med `starBalance` + progress mot mål. Trofésektion: `if (trophies.length === 0) render nothing`.

---

# Produktvision (sammanfattning)

| Regel | En mening |
|-------|-----------|
| **Filterregel** | Stjärnor, mål eller belöningsläge |
| **Beslutsregel** | Max en primär handling |
| **Primär / sekundär / status** | Se vision § Primär handling |
| **Priority Ladder** | `Stjärnburken → Primär → Belöningar → Status → Utforskning` |

---

# Teknisk vägledning

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/child-dashboard-rewards.js` | `renderSkattkammaren`, inlösen, mål |
| `public/js/child-rewards-engine.js` | Goal progress, pending banner |
| `public/child-dashboard.html` | Skatt-CSS |
| `docs/mockups/beloningar.html` | Visuell målbild |
| `test/skattkammaren-10-10.test.js` | Konstitutions- och regressionsgate |

**API:** `/api/me/rewards`, `/api/me/goal`, `POST /api/me/rewards/:id/redeem`

**Branch:** `cursor/skattkammaren-barn-10-10-87ba`

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Nuläge vs mål (implementation)

**På plats:**

- `child-dashboard-rewards.js`, mål, inlösen, troféer, pending/denied-vänlig copy
- Universum via `child-skatt-house.js`, offline-cache
- Hero Stjärnburken + belöningslista med progress
- En primär CTA, tom trofésektion dold

**Kvar:**

- Verifiera tillståndsmaskin för alla edge cases (0 stjärnor, byter mål pending)
- Olle-test med riktiga barn (5-sekundersregeln)
- Barnmeny v2 `/child/world` route-migrering

---

# Arbetsflöde

1. Läs [skattkammaren-vision.md](skattkammaren-vision.md) (produkt) + mockup
2. Läs `child-dashboard-rewards.js` (implementation)
3. Olle-test: inget mål · sparar · har råd · pending · nekad · första gången
4. Verifiera tillståndsmaskin + priority ladder
5. Implementera — ta bort lika mycket som du lägger till
6. `npm run test:gate`
7. PR med screenshots (iPhone portrait)

---

# Sista instruktionen

Skattkammaren ska kännas som **stjärnburken + drömmen** — först hur många stjärnor, sedan hur nära målet, sedan en tydlig väg att fråga.
