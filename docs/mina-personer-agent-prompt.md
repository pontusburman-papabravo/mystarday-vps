# Mina personer 10/10 — Agent-uppdrag (implementation)

**Vision:** [mina-personer-vision.md](mina-personer-vision.md) — **enda sanningskälla.**

---

## Status: BLOCKERAD

**Implementera inte** förrän:

1. Produkt har godkänt `mina-personer-vision.md` (inkl. öppna frågor lösta eller explicit defer)
2. Idag + Skattkammaren 10/10 är shipped (✓ 2026-07)
3. Agent-uppdrag i denna fil är uppdaterat från *BLOCKERAD* till *GO*

---

## När GO (planerat — ej skrivet än)

Förväntad modell (samma som Idag/Skattkammaren):

1. `resolveFamilyState()` eller motsvarande — exklusiv tillståndsmaskin
2. Personkort först — `child-family-hall.js` putsas, inte ombyggs
3. Olle-test (4 frågor) på mobil utan scroll
4. `npm run test:gate` + konstitutionstester
5. Minimal diff — vision > kod

**Filer (preliminärt):** `child-family-hall.js`, `child-family-client.js`, `child-today-focus.css` (route guards finns)

---

## Förbjudet innan vision är låst

- Ny familje-ekonomi synlig för barn
- Checklistor eller primär CTA som konkurrerar med Idag
- Syskonleaderboard
- Mer-flik som enda ingång till relation (v2 kräver primärvärld)

---

*Senast uppdaterad: 2026-07-01 — vision only, ingen implementation*
