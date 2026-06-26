# Vision 2030 — Executive summary

**Skapad:** 2026-06-26  
**Status:** Strategisk riktning — kompletterar [`architecture-platform.md`](./architecture-platform.md)

---

## En mening

Vi bygger en **motor för exekutiv funktion** — inte en barnapp. Generation 1 (barn 4–12 + föräldrar) är första kunden, inte slutprodukten.

---

## Arkitektur i tre rader

1. **Core Platform** — tasks, goals, rewards, progress, relationships, coach, permissions (delad logik).
2. **Presentation Profiles** — Child, Teen, Young Adult, Adult (samma data, annan nav/språk/design).
3. **Produkter** — olika upplevelser på samma motor.

Full spec: **[`architecture-platform.md`](./architecture-platform.md)**  
Use cases (människans resa): **[`USE_CASES_PLATFORM.md`](./USE_CASES_PLATFORM.md)**

---

## Beslutsgate

Innan varje större v2-beslut:

> *Kan samma motor presenteras för en 24-åring med ADHD utan arkitekturomskrivning?*

---

## Generationer

| Gen | Målgrupp | Status |
|-----|----------|--------|
| 1 | Barn 4–12, föräldrar, pedagoger | Live |
| 2 | Ungdomar 13–17 | Spec |
| 3 | Unga vuxna 18–30 | Horisont |
| 4 | Vuxna | Horisont |

**App v2 = Platform v1** — nav, domänmodell och config som gör Gen 2–4 möjliga.

---

## Tre engines (plattformsneutralt)

| Engine | Barn (Gen 1) | Tonåring | Vuxen |
|--------|--------------|----------|-------|
| Execution | Idag | Idag | Tasks / Idag |
| Progress | Min värld | Mitt space | Mål / Growth |
| Relationship | Mina personer | Mina personer | Network |

---

## Vad vi säljer (egentligen)

Inte *bildschema* — utan **mindre stress, bättre rutiner, fungerande vardag**. Gäller barn, studenter och vuxna med NPF/ADHD.

---

## Nästa dokument att läsa

| Dokument | Innehåll |
|----------|----------|
| [`architecture-platform.md`](./architecture-platform.md) | Full plattformsspec |
| [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md) | Platform v1 leveranskrav |
| [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) | Gen 1 implementation idag |
