# Belöningar 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** `rewards`  
**Route:** `/rewards` (hub) → `/library#rewards`, `/skattkammaren`, barnprofil → Framsteg  
**Relaterat:** [beloningar-agent-prompt.md](beloningar-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §4

---

## Kompassen

> **Belöningar ska få föräldern att känna: "Jag ser vad som väntar — och vet var stjärnorna och belöningarna hör hemma."**

---

## Varför finns Belöningar?

Stjärnor är bränsle, inte poängjakt (G-01, R-02). Föräldern behöver:

1. **Hantera** belöningsutbudet (skapa, redigera, kosta stjärnor)
2. **Följa** vad barnen samlat och begärt
3. **Godkänna** undantag (pending redemptions)

Barnet upplever belöningar i **Skattkammaren**. Föräldern styr här.

---

## Problemet vi löser

> *"Olle har begärt en belöning — var godkänner jag? Och var ändrar jag vad som finns i kistan?"* — Jenny

Belöningar, stjärnor, rapporter och bibliotek **blandas** om hubben inte äger sin domän tydligt.

---

## Produktprincip

> **Belöningar = stjärnor + kista + väntande. Framsteg/rapporter = barnprofil (länkas, ägs inte här).**

| Belöningar är | Belöningar är inte |
|---------------|-------------------|
| Godkännande-UI (undantag) | Veckodiagram / analytics |
| Ingång till belöningsbibliotek | Schema |
| Överblick stjärnor per barn | Jämförelse syskon |
| Länk till utveckling | Ersättning av `/reports` |

**POS:** R-02 (stjärnor ej köpbara), G-01 (reality before celebration), PA-06 (godkännande = undantag).

---

## Framgångskriterium

> **När en förälder öppnar Belöningar ska hen omedelbart se om något kräver godkännande — och veta var belöningarna hanteras.**

---

## Den mentala modellen

```
Jag öppnar Belöningar
        ↓
Finns något att godkänna? → synligt överst
        ↓
Jag ser var jag hanterar belöningar (bibliotek)
        ↓
Jag ser barnens stjärnor/kista
        ↓
Vill jag följa utveckling? → länk till Familj → barnprofil
```

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Rätt | Fel |
|---|--------|------|-----|
| 1 | Väntar något på mig? | *Olle vill ha "Extra sagostund"* | Gömt under tre klick |
| 2 | Var hanterar jag belöningar? | *Hantera belöningar → biblioteket* | *Skattkammaren* som enda ingång |
| 3 | Hur ser stjärnorna ut? | *Stjärnor & kista — överblick per barn* | Aggregerad familjestatistik utan kontext |

**Designregel:** Godkännanden **ovanför** hub-länkar — samma mönster som Hem-undantag.

---

## Informationshierarki

```
1. Väntar på dig      →  Pending approvals (om några)
2. Hantera            →  Hantera belöningar (→ /library#rewards)
3. Följa              →  Stjärnor & kista (föräldervy)
4. Utveckling         →  Textlänk: Familj → barnprofil → Framsteg
5. Paket (reporting)  →  Endast om köpt — länk till /reports
```

### Hub-regel (låst)

Länka **aldrig** till `/skattkammaren` som primär CTA i hubben för inloggad förälder — använd föräldervy eller inbäddad överblick. `/skattkammaren` är barn/demo/universe.

---

## Jenny-test (Definition of Done)

En förälder som aldrig sett Belöningar ska inom **5 sekunder**, **utan scroll**, kunna svara:

1. **Väntar något på mig?**
2. **Var ändrar jag vilka belöningar som finns?**
3. **Var ser jag barnets stjärnor?**

### Jenny-test godkänt (målbild)

```
Belöningar

⚠️ Olle vill ha "Extra sagostund" (15 ⭐)     [Godkänn]

🎁 Hantera belöningar
   Skapa och redigera i biblioteket

⭐ Stjärnor & kista
   Överblick per barn
```

Om inget väntar: sektion 1 dold — inte "Inga väntande" som tar plats.

---

## Vad som ska bort

- `/skattkammaren` som hub-huvudingång (loop / barn-UI)
- Stjärnor som köpbara (R-02)
- Jämförande leaderboard syskon
- Rapporter som egen sektion utan `reporting`-feature
- Duplicerat godkännande på Hem **och** Belöningar utan synk (undantag ska synas på båda — samma data, inte dubbel logik)

---

## Nuläge vs mål

**Redan på plats:** `rewards-hub.js`, `PendingApprovals.mountHub`, länk till bibliotek, länk till föräldervy, capability för rapporter.

**Kvar för 10/10:**

- Godkännande alltid överst när pending finns
- Tydlig tom-state utan brus
- Konsekvent copy (inte "Skattkammaren" i föräldratext på hub)
- Verifiera att pending synkas med Hem-readiness

Se [beloningar-agent-prompt.md](beloningar-agent-prompt.md) för agent-uppdrag.
