# Idag 10/10 — Produktvision (barn)

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** Barnets handlingsyta (☀️ Idag)  
**Relaterat:** [idag-agent-prompt.md](idag-agent-prompt.md) · [skattkammaren-vision.md](skattkammaren-vision.md) · [informationsarkitektur-barnapp.md](informationsarkitektur-barnapp.md) §4 · [barnmeny-v2.md](barnmeny-v2.md)

> **Teknikagnostiskt.** Implementation i [idag-agent-prompt.md](idag-agent-prompt.md).

---

## Kompassen

> **Idag ska få barnet att känna: "Jag vet vad jag ska göra nu — vad jag får — vad som är klart — och vad som händer sen."**

### Filterregel

> **Om en komponent inte hjälper barnet förstå dagens uppdrag inom fem sekunder, hör den inte hemma ovanför fold på Idag.**

Frågor innan ny UI ovanför fold:

1. *Vad ska jag göra nu?*
2. *Vad får jag när jag gör det?*
3. *Vad är klart?*
4. *Vad händer sen?*

Om svaret är *inget* → flytta under fold eller ta bort.

### Beslutsregel

> **På Idag får det aldrig finnas mer än en primär handling synlig åt gången — bocka av nuvarande uppdrag.**

Allt annat (mål, stjärnsaldo, vecka, historik, Skattkammaren) är sekundärt eller under fold.

---

## Varför finns Idag?

Barnet behöver **handling**, inte schema (POS: Idag = handling, Skattkammaren = mening).

| Idag är | Idag är inte |
|---------|--------------|
| NU-uppdrag + 3–5 uppdrag | Veckokalender |
| Progress idag (`3 av 5 klara`) | Stjärnburken / sparmål (→ Skattkammaren) |
| Belöning per rad (`+2 ⭐`) | Full historik ovanför fold |
| En primär handling (klarmarkera NU) | Dashboard / statistik |

**POS:** C-01, P-02, G-01, G-04.

---

## Olle-test (Definition of Done)

Inom **5 sekunder**, **utan scroll**:

| # | Fråga | Var i UI |
|---|--------|----------|
| 1 | Vad ska jag göra nu? | NU-kort / första uppdrag |
| 2 | Vad får jag när jag gör det? | `+X ⭐` på raden |
| 3 | Vad är klart? | `X av Y klara` |
| 4 | Vad händer sen? | Nästa-rad / status / firande |

---

## Tillståndsmaskin (exklusiv)

| Tillstånd | När | Primär handling | Status |
|-----------|-----|-----------------|--------|
| **No tasks** | Inga aktiviteter idag | Ingen | Vänlig tomtext |
| **All done** | Allt klart | Ingen (firande ≤2s) | *Alla klara!* |
| **Active** | Minst ett kvar | Bocka av **NU** | Progress + ev. *Sedan: …* |

### Prioritet

```
All done   (allt klart)
     ↓
Active     (NU-uppdrag finns)
     ↓
No tasks
```

**First Star Mode** är eget tillfälle av *Active* (ett uppdrag) — samma maskin, inga undantag i logik.

---

## Visuell prioritering

```
1. Progress idag     →  X av Y klara
        ↓
2. NU-uppdrag        →  tydligt, stort
        ↓
3. Nästa uppdrag     →  max 3–4 till (totalt ≤5 synliga)
        ↓
4. Sekundärt         →  Skattkammaren-länk, mål-teaser under fold
```

**Inte ovanför fold:** veckoflikar, progressring i header, mål/sparmål-kort, klar-historik, dagdels-schema.

---

## Gräns mot Skattkammaren (låst)

| Fråga | Idag | Skattkammaren |
|--------|------|---------------|
| Varför? | Nej | Ja |
| Vad nu? | Ja | Nej |
| Stjärnsaldo / mål | Sekundärt under fold | Hero |

---

## Tomma lägen

| Läge | Visas | Visas inte |
|------|-------|------------|
| Inga aktiviteter | Vänlig ledig-dag-text | Tomt schema |
| Allt klart | Kort firande, sedan lugn status | Ny checklist-reklam |
| Laddar | Skeleton | Vit yta |
| Offline | Sparad dag + etikett | Teknisk felkod |

---

## Animationer (G-04)

- Firande vid *All done* ≤2s, skippbart
- Blockerar inte skolutgång / nästa uppdrag

---

*Senast uppdaterad: 2026-07-01*
