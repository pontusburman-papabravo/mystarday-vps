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

---

# Stop Rule

Om hubben kräver fler än ~8 grundlänkar för att täcka basic — **gruppera eller dölj**, lägg inte till fler rader.

Om en ändring kräver flytt av affärslogik från `/schedule` — dokumentera minimal arkitekturändring först.

---

# Scope

**Endast** `/planning` hub + copy/navigationsförbättringar som påverkar entrén.

Ändra inte Hem, Belöningar, Familj, För dig, eller schema-/bibliotekslogik annat än minimal copy/back-nav.

---

## Anti-patterns — bygg inte

- Fler länkar utan att ta bort någon
- Tekniska modulnamn i föräldratext
- Disabled "låsta" rader för opaketerade features
- Status/daglig överblick på hubben
- Ny route som duplicerar `/library`

**Om du lägger till en länk ska en annan grupperas bort eller flyttas till detaljer.**

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

**Branch:** `cursor/for-dig-10-10-2c04`

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Arbetsflöde

1. Läs vision + `planning-hub.js`
2. Jenny-test mot nuvarande hub (mobil viewport)
3. Förbättra copy, gruppering, tom-state
4. Verifiera back-nav från `/library` och `/schedule`
5. Jenny-test igen
6. `npm run test:gate`
7. PR med screenshots (iPhone portrait)

---

# Sista instruktionen

Planering ska kännas som **en reception med två skyltar** — inte ett kontrollrum.

Färre ord. Tydligare grupper. Jenny ska hitta veckoschemat på tre sekunder.
