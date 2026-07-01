# Agent-uppdrag: Bygg Skattkammaren (barn) till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/skattkammaren-agent-prompt.md`  
**Produktvision (teknikagnostisk):** [skattkammaren-vision.md](skattkammaren-vision.md)  
**Mockup:** [mockups/beloningar.html](mockups/beloningar.html)  
**Förälder (parallell):** [beloningar-vision.md](beloningar-vision.md)

> **Tillståndsmaskinen i visionen är enda sanningskällan.** Implementera genom att mappa API-data → exklusivt tillstånd → UI. Duplicera inte logik i pseudokod här.

---

# Definition of Done

## Olle-test

Inom **5 sekunder**, **utan scroll**:

1. Hur många stjärnor har jag?
2. Vad sparar jag till?
3. Kan jag göra något här?
4. Vad är nästa steg?

## Regler (från vision)

- **Filterregel** + processregel: inget ovanför hero utan PR-motivering
- **Beslutsregel:** max en primär handling
- **Tillståndsmaskin:** exklusivt tillstånd enligt vision § Prioritet
- **Sortering:** mål → snart råd → övriga
- **Tomma lägen:** enligt vision § Tomma lägen

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först (portrait, 44pt)
- POS: C-01, C-03, G-01, G-04, R-02
- PR med Olle-test + screenshots

---

# Ditt mandat

Bygg barnets Skattkammaren enligt [skattkammaren-vision.md](skattkammaren-vision.md).

**Vision > kod.** Tillståndsmaskinen styr allt — hero, primär knapp, status, lista.

---

# Scope

Barnets belöningsvy endast. Ändra inte förälder `/rewards` eller Idag.

**Routes:** `/child-dashboard#rewards` · framtida `/child/world` · demo `/skattkammaren?demo=1`

---

## Självgranskning

1. Ett exklusivt tillstånd? (vision § Tillståndsmaskin)
2. Rätt prioritet vid pending + råd? (överskott-stjärnor-scenariot)
3. Lista sorterad enligt vision?
4. Filterregeln för varje komponent ovanför fold?

---

# Implementation — härled från vision

**Steg:**

1. Läs inputs: `goal`, `starBalance`, `redemptions[]`, `rewards[]`
2. **Resolve state** med prioritetsordning i vision (Awaiting decision → … → No goal)
3. Rendera hero alltid (stjärnor + mål/progress)
4. Rendera primär knapp **endast** om tillståndet tillåter (No goal · Redeem available)
5. Sortera belöningslista: mål → snart råd → övriga
6. Statussektion för pending/denied — aldrig som primär CTA
7. Troféer endast om `trophies.length > 0`

**Edge cases att testa:**

- 0 stjärnor, inget mål (första gången)
- Collecting (mål, inte råd)
- Redeem available
- Pending på mål + saldo räcker till andra belöningar (ingen extra primär)
- Nekad nyligen
- Godkänd just nu (Completed ≤2s)
- Inga belöningar · offline · laddar · fel

---

# Teknisk vägledning

| Fil | Roll |
|-----|------|
| `public/js/child-dashboard-rewards.js` | Render, state → UI |
| `public/js/child-rewards-engine.js` | Goal progress, banners |
| `public/child-dashboard.html` | CSS |
| `docs/mockups/beloningar.html` | Målbild |
| `test/skattkammaren-10-10.test.js` | Konstitutionsgate |

**API:** `/api/me/rewards`, `/api/me/goal`, `POST /api/me/rewards/:id/redeem`

**Branch:** `cursor/skattkammaren-barn-10-10-87ba`

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Nuläge vs mål

**På plats:** hero, lista med progress, en primär CTA, tom trofé dold, pending/denied-copy.

**Kvar:** explicit `resolveSkattState()` enligt exklusiv maskin · sortering enligt vision · alla tomma lägen · Olle-test med barn.

---

# Arbetsflöde

1. Läs vision § Tillståndsmaskin + § Tomma lägen
2. Implementera state resolver (en funktion, en sanning)
3. Koppla UI till tillstånd — ta bort parallell logik
4. Edge cases ovan
5. `npm run test:gate` + screenshots

---

# Sista instruktionen

**Stjärnburken + mål i hero → ett tillstånd → en primär väg framåt.**
