# Fas D — Minneskort + hylla + diplom (plan)

**Status:** Klar (PR pending merge)  
**Epic:** GitHub **#586**  
**Spec:** [barnets-samling-vision.md](barnets-samling-vision.md) § Minneskort · [npf-arkitektur-v1.md](npf-arkitektur-v1.md) § Minneskort  
**Förutsättning:** Fas A–C klar · Fas B Min samling · Fas C Skattkammaren

---

## Produktmål

Barnet öppnar **🏆 Min samling** och känner:

> **"Det här har jag klarat. Det här är mina minnen."**

### In scope (smal v1)

| Pillar | Känsla |
|--------|--------|
| **Minneskort** | Genomförda belöningar som varma kort |
| **Belöningshylla** | Visuell hylla — stolthet, inte shop |
| **Diplom** | Klientgenererade utmärkelser från befintlig data |

### Out of scope

- Årsbok/månadsbok (Fas E #587)
- Foto/upload
- Ny valuta, shop, loot
- DB-migration, ny minnesmotor
- Persistent Godkänd ≠ Genomförd (#631)
- Skattkammaren-ändringar
- `ChildCollections`

### Princip

**Befintlig data först.** Minneskort/hylla från `GET /api/me/rewards` → `redemptions` (`approved`/`auto`). Diplom från universe + minnen. **Visa inte `starBalance`** i Min samling.

---

## Ticket-breakdown

| Ticket | Scope |
|--------|--------|
| **D1** | Denna plan |
| **D2** | Minneskort (`child-samling-memory.js` + present) |
| **D3** | Belöningshylla (samma data, annan presentation) |
| **D4** | Diplom (klient-trösklar) |
| **D5** | NPF-copy + tomstatus |
| **D6** | `barnets-samling-memory.test.js` + QA |

---

## Datakällor

| Data | Källa | Användning |
|------|-------|------------|
| Genomförda belöningar | `redemptions` approved/auto | Minneskort + hylla |
| Achievements | `universe.achievements` | Diplom ”Trygg start” |
| Lifetime stars | `universe.stats.lifetime_stars` | Diplom 25/100 |
| Streak | `universe.stats.streak` | Diplom 7 dagar |

---

## Diplom (klient v1)

| Diplom | Villkor |
|--------|---------|
| Trygg start | ≥1 achievement |
| Jag klarade det | ≥1 genomförd belöning |
| Stjärnsamlare | ≥25 lifetime stars |
| Superstjärna | ≥100 lifetime stars |
| Rutinhjälte | ≥7 dagar streak |

---

## Definition of Done

- [x] D1–D6 acceptance
- [x] `npm run test:gate` grön
- [x] SW v546
- [x] Inga redeem/API/DB-ändringar
- [x] Gate OFF oförändrat
