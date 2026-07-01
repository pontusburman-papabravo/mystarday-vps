# Belöningar 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** `rewards`  
**Route:** `/rewards` (hub) → `/library#rewards`, `/skattkammaren`, barnprofil → Framsteg  
**Relaterat:** [beloningar-agent-prompt.md](beloningar-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §4

---

## Kompassen

> **Belöningar ska få föräldern att känna: "Jag ser vad som väntar — och vet var stjärnorna och belöningarna hör hemma."**

---

## Kärnmetafor

> **Belöningar = brevlådan + verktygslådan.**

| | Brevlådan | Verktygslådan |
|--|-----------|---------------|
| **Vad** | Det som väntar på mig | Var jag sköter belöningar och stjärnor |
| **När** | Först — alltid överst | Sedan — hantera, följa, fördjupa |
| **Exempel** | *Olle vill ha "Extra sagostund"* | *Hantera belöningar → biblioteket* |

Hubben ska kännas som att öppna brevlådan först, sedan verktygslådan — inte tvärtom.

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
| 3 | Hur ser stjärnorna ut? | *Stjärnor & kista — hur nära nästa belöning* | Aggregerad familjestatistik utan kontext |

**Designregel:** Godkännanden **ovanför** hub-länkar — samma mönster som Hem-undantag.

---

## Prioritetsordning (låst)

Allt på Belöningar följer denna ordning. Inget får bryta den:

```
1. Pending      →  Det som väntar på godkännande
        ↓
2. Hantera      →  Belöningsbiblioteket
        ↓
3. Stjärnor     →  Överblick per barn
        ↓
4. Utveckling   →  Länk till barnprofil → Framsteg
```

**Paket (reporting):** Endast om köpt — länk till `/reports`, under utveckling (aldrig ovanför pending).

---

## Vad räknas som Pending?

**Pending** = allt som kräver ett vuxenbeslut (godkänn eller neka) innan det händer.

```
Pending =
✓ belöning som väntar på godkännande (inlösen)
✓ målbyte som väntar på godkännande
✓ annat undantag som kräver manuellt vuxenbeslut

Inte pending:
✗ nya stjärnor (de är redan givna — inget beslut kvar)
✗ statistik
✗ tips
✗ rekommendationer
```

**Teknisk källa:** `GET /api/rewards/pending-requests` (`pending_redemptions`, `pending_goal_changes`). Samma data som Hem-readiness — inte separat logik.

**Presentation:** Om inget är pending → sektionen **dold**. Ingen tom "Inga väntande"-ruta.

---

## Överblick (Stjärnor & kista)

Överblicken ska visa **hur nära varje barn är sin nästa belöning** — inte skapa jämförelser mellan syskon.

| Rätt | Fel |
|------|-----|
| *Olle: 12 ⭐ — 3 kvar till "Extra sagostund"* | *Olle har flest stjärnor denna vecka* |
| Per barn, egen rad | Syskonranking eller leaderboard |
| Kontext: stjärnor + nästa mål | Aggregerad familjestatistik utan barn |

**POS:** R-02 — stjärnor är bränsle per barn, inte tävling.

---

## Filterregel

Om en komponent inte hjälper föräldern att:

- **godkänna** (pending),
- **hantera** (belöningsutbud), eller
- **förstå barnets belöningsläge** (stjärnor, kista, nästa belöning),

…hör den **inte** hemma på Belöningar.

Flytta till rätt hub: Hem (läge idag), För dig (rekommendation), Planering (schema), Familj (inställningar).

---

## Copy-regel

Belöningar beskriver:

- **vad som väntar**
- **vad som finns**
- **var du ändrar**

Belöningar beskriver **inte**:

- hur duktigt barnet varit
- motivation eller uppmuntran
- coachning eller nästa steg i rutinen

Det håller isär Hem, För dig och Belöningar.

---

## Informationshierarki

```
1. Väntar på dig      →  Pending approvals (om några)
2. Hantera            →  Hantera belöningar (→ /library#rewards)
3. Stjärnor           →  Stjärnor & kista (föräldervy)
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
   Olle: 12 ⭐ — 3 kvar till "Extra sagostund"
```

Om inget väntar: sektion 1 dold — inte "Inga väntande" som tar plats.

---

## Vad som ska bort

- `/skattkammaren` som hub-huvudingång (loop / barn-UI)
- Stjärnor som köpbara (R-02)
- Jämförande leaderboard syskon
- Rapporter som egen sektion utan `reporting`-feature
- Duplicerat godkännande på Hem **och** Belöningar utan synk (undantag ska synas på båda — samma data, inte dubbel logik)
- Motivation, coachning eller prestationstext på hubben (→ Hem / För dig)

---

## Nuläge vs mål

**Redan på plats:** `rewards-hub.js`, `PendingApprovals.mountHub`, länk till bibliotek, länk till föräldervy, capability för rapporter.

**Kvar för 10/10:**

- Godkännande alltid överst när pending finns
- Tydlig tom-state utan brus
- Konsekvent copy (inte "Skattkammaren" i föräldratext på hub)
- Överblick visar närhet till nästa belöning per barn — inte syskonjämförelse
- Verifiera att pending synkas med Hem-readiness

Se [beloningar-agent-prompt.md](beloningar-agent-prompt.md) för agent-uppdrag.
